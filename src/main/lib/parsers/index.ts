import path from "node:path"
import { stat } from "node:fs/promises"
import type { DataFileInfo, DataFileType, ParsedData } from "./types"
import { parseCsvFile } from "./csv-parser"
import { parseJsonFile } from "./json-parser"
import {
  listSqliteTables as listTables,
  previewSqliteTable,
  querySqlite as querySqliteDb,
} from "./sqlite-parser"
import {
  parseDuckDBFile,
  getDuckDBFileType,
  queryDataFile as queryDataFileDuckDB,
} from "./duckdb-parser"
import {
  listExcelSheets as listExcelSheetsFromXlsx,
  parseExcelFile,
} from "./excel-parser"

// Re-export types
export * from "./types"

/**
 * Map file extensions to data file types
 */
const DATA_EXTENSIONS: Record<string, DataFileType> = {
  ".csv": "csv",
  ".tsv": "csv",
  ".json": "json",
  ".jsonl": "json",
  ".db": "sqlite",
  ".sqlite": "sqlite",
  ".sqlite3": "sqlite",
  ".parquet": "parquet",
  ".pq": "parquet",
  ".xlsx": "excel",
  ".xls": "excel",
  ".arrow": "arrow",
  ".feather": "arrow",
  ".ipc": "arrow",
}

/**
 * Detect the data file type from the file path
 */
export function detectFileType(filePath: string): DataFileType {
  const ext = path.extname(filePath).toLowerCase()
  return DATA_EXTENSIONS[ext] || "unknown"
}

/**
 * Check if a file is a supported data file
 */
export function isDataFile(filePath: string): boolean {
  return detectFileType(filePath) !== "unknown"
}

/**
 * Get information about a data file
 */
export async function getDataFileInfo(filePath: string): Promise<DataFileInfo> {
  const fileType = detectFileType(filePath)
  const fileName = path.basename(filePath)

  try {
    const fileStat = await stat(filePath)

    const info: DataFileInfo = {
      path: filePath,
      name: fileName,
      type: fileType,
      size: fileStat.size,
    }

    // For SQLite files, list tables
    if (fileType === "sqlite") {
      try {
        info.tables = listTables(filePath)
      } catch (error) {
        console.warn("[parsers] Failed to list SQLite tables:", error)
        info.tables = []
      }
    }

    // For Excel files, list sheets (supports both .xls and .xlsx)
    if (fileType === "excel") {
      try {
        const sheets = listExcelSheetsFromXlsx(filePath)
        if (sheets.length > 0) {
          info.tables = sheets
        }
      } catch (error) {
        console.warn("[parsers] Failed to list Excel sheets:", error)
      }
    }

    return info
  } catch (error) {
    console.error("[parsers] Failed to get file info:", error)
    return {
      path: filePath,
      name: fileName,
      type: fileType,
      size: 0,
    }
  }
}

/**
 * Parse a data file and return structured data
 */
export async function parseDataFile(
  filePath: string,
  options: { limit?: number; offset?: number; tableName?: string } = {}
): Promise<ParsedData> {
  const fileType = detectFileType(filePath)
  const { limit = 1000, offset = 0, tableName } = options

  switch (fileType) {
    case "csv":
      return parseCsvFile(filePath, { limit, offset })

    case "json":
      return parseJsonFile(filePath, { limit, offset })

    case "parquet":
    case "arrow":
      // Use unified DuckDB parser for Parquet and Arrow files
      return parseDuckDBFile(filePath, { limit, offset })

    case "excel":
      // Use xlsx library for Excel files (supports both .xls and .xlsx)
      return parseExcelFile(filePath, { limit, offset, sheetName: tableName })

    case "sqlite": {
      // For SQLite, we need a table name
      if (tableName) {
        return previewSqliteTable(filePath, tableName, { limit, offset })
      }

      // If no table specified, get the first table
      const tables = listTables(filePath)
      if (tables.length === 0) {
        return {
          columns: [],
          rows: [],
          totalRows: 0,
          truncated: false,
        }
      }

      return previewSqliteTable(filePath, tables[0], { limit, offset })
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Execute a SQL query on a SQLite file
 */
export function querySqlite(filePath: string, sql: string): ParsedData {
  return querySqliteDb(filePath, sql)
}

/**
 * List tables in a SQLite file
 */
export function listSqliteTables(filePath: string): string[] {
  return listTables(filePath)
}

/**
 * List sheets in an Excel file (supports both .xls and .xlsx)
 */
export function listExcelSheets(filePath: string): string[] {
  return listExcelSheetsFromXlsx(filePath)
}

/**
 * Execute a SQL query against any supported data file (CSV, JSON, Parquet, Excel, Arrow)
 * The file is available as the 'data' table in the query
 * For SQLite files, use querySqlite instead
 */
export async function queryDataFile(
  filePath: string,
  sql: string,
  options: { sheetName?: string } = {}
): Promise<ParsedData> {
  const fileType = detectFileType(filePath)

  // For SQLite, use the SQLite-specific query function
  if (fileType === "sqlite") {
    return querySqliteDb(filePath, sql)
  }

  // For all other types, use DuckDB
  return queryDataFileDuckDB(filePath, sql, options)
}
