import type { ParsedData, ParsedColumn, ColumnType } from "./types"
import duckdb from "duckdb"
import path from "node:path"

/**
 * DuckDB-supported file types for this parser
 */
export type DuckDBFileType = "parquet" | "excel" | "arrow"

/**
 * Detect DuckDB file type from extension
 */
export function getDuckDBFileType(filePath: string): DuckDBFileType | null {
  const ext = path.extname(filePath).toLowerCase()
  switch (ext) {
    case ".parquet":
    case ".pq":
      return "parquet"
    case ".xlsx":
    case ".xls":
      return "excel"
    case ".arrow":
    case ".feather":
    case ".ipc":
      return "arrow"
    default:
      return null
  }
}

/**
 * Map DuckDB types to our column types
 */
function mapDuckDBType(duckdbType: string): ColumnType {
  const type = duckdbType?.toUpperCase() || ""

  // Integer types
  if (
    type.includes("INT") ||
    type.includes("BIGINT") ||
    type.includes("SMALLINT") ||
    type.includes("TINYINT") ||
    type.includes("HUGEINT")
  ) {
    return "number"
  }

  // Float types
  if (
    type.includes("FLOAT") ||
    type.includes("DOUBLE") ||
    type.includes("DECIMAL") ||
    type.includes("REAL")
  ) {
    return "number"
  }

  // Boolean
  if (type.includes("BOOL")) {
    return "boolean"
  }

  // Date/Time types
  if (
    type.includes("DATE") ||
    type.includes("TIME") ||
    type.includes("TIMESTAMP")
  ) {
    return "date"
  }

  // Default to string for everything else
  return "string"
}

/**
 * Process a row to handle BigInt and Date values for JSON serialization
 */
function processRow(row: Record<string, unknown>): Record<string, unknown> {
  const processed: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(row)) {
    if (typeof value === "bigint") {
      processed[key] = Number(value)
    } else if (value instanceof Date) {
      processed[key] = value.toISOString()
    } else if (Buffer.isBuffer(value)) {
      processed[key] = value.toString("utf-8")
    } else {
      processed[key] = value
    }
  }
  return processed
}

/**
 * Execute a DuckDB query and return results as a promise
 */
function queryDuckDB(
  db: duckdb.Database,
  sql: string
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) {
        reject(err)
      } else {
        resolve(rows as Record<string, unknown>[])
      }
    })
  })
}

/**
 * Get the DuckDB read function for a file type
 */
function getReadFunction(
  fileType: DuckDBFileType,
  escapedPath: string,
  sheetName?: string
): string {
  switch (fileType) {
    case "parquet":
      return `read_parquet('${escapedPath}')`
    case "excel":
      // If a sheet name is provided, use it
      if (sheetName) {
        const escapedSheet = sheetName.replace(/'/g, "''")
        return `read_xlsx('${escapedPath}', sheet='${escapedSheet}')`
      }
      return `read_xlsx('${escapedPath}')`
    case "arrow":
      return `read_parquet('${escapedPath}')` // DuckDB uses read_parquet for Arrow IPC files too
    default:
      throw new Error(`Unsupported file type: ${fileType}`)
  }
}

/**
 * Install required DuckDB extensions for file type
 */
async function installExtensions(
  db: duckdb.Database,
  fileType: DuckDBFileType
): Promise<void> {
  if (fileType === "excel") {
    // DuckDB 1.2+ has native excel extension for xlsx files
    await queryDuckDB(db, "INSTALL excel")
    await queryDuckDB(db, "LOAD excel")
  }
}

export interface DuckDBParseOptions {
  limit?: number
  offset?: number
  sheetName?: string // For Excel files
}

/**
 * Parse a file using DuckDB and return structured data
 */
export async function parseDuckDBFile(
  filePath: string,
  options: DuckDBParseOptions = {}
): Promise<ParsedData> {
  const { limit = 1000, offset = 0, sheetName } = options

  const fileType = getDuckDBFileType(filePath)
  if (!fileType) {
    throw new Error(`Unsupported file type for DuckDB parser: ${filePath}`)
  }

  // Escape single quotes in file path for SQL
  const escapedPath = filePath.replace(/'/g, "''")
  const readFn = getReadFunction(fileType, escapedPath, sheetName)

  const db = new duckdb.Database(":memory:")

  try {
    // Install extensions if needed
    await installExtensions(db, fileType)

    // Get column info using DESCRIBE
    const describeResult = await queryDuckDB(
      db,
      `DESCRIBE SELECT * FROM ${readFn}`
    )

    const columns: ParsedColumn[] = describeResult.map((row) => ({
      name: String(row.column_name || row.name || ""),
      type: mapDuckDBType(String(row.column_type || row.type || "")),
    }))

    // Get total row count
    const countResult = await queryDuckDB(
      db,
      `SELECT COUNT(*) as cnt FROM ${readFn}`
    )
    const totalRows = Number(countResult[0]?.cnt || 0)

    // Get rows with pagination
    const dataResult = await queryDuckDB(
      db,
      `SELECT * FROM ${readFn} LIMIT ${limit} OFFSET ${offset}`
    )

    const rows = dataResult.map(processRow)

    db.close()

    return {
      columns,
      rows,
      totalRows,
      truncated: offset + rows.length < totalRows,
    }
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Get row count from a file without reading all data
 */
export async function getDuckDBRowCount(filePath: string): Promise<number> {
  const fileType = getDuckDBFileType(filePath)
  if (!fileType) {
    throw new Error(`Unsupported file type for DuckDB parser: ${filePath}`)
  }

  const escapedPath = filePath.replace(/'/g, "''")
  const readFn = getReadFunction(fileType, escapedPath)
  const db = new duckdb.Database(":memory:")

  try {
    await installExtensions(db, fileType)

    const result = await queryDuckDB(
      db,
      `SELECT COUNT(*) as cnt FROM ${readFn}`
    )
    const count = Number(result[0]?.cnt || 0)
    db.close()
    return count
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Get column info from a file without reading data
 */
export async function getDuckDBColumns(
  filePath: string
): Promise<ParsedColumn[]> {
  const fileType = getDuckDBFileType(filePath)
  if (!fileType) {
    throw new Error(`Unsupported file type for DuckDB parser: ${filePath}`)
  }

  const escapedPath = filePath.replace(/'/g, "''")
  const readFn = getReadFunction(fileType, escapedPath)
  const db = new duckdb.Database(":memory:")

  try {
    await installExtensions(db, fileType)

    const result = await queryDuckDB(
      db,
      `DESCRIBE SELECT * FROM ${readFn}`
    )

    const columns: ParsedColumn[] = result.map((row) => ({
      name: String(row.column_name || row.name || ""),
      type: mapDuckDBType(String(row.column_type || row.type || "")),
    }))

    db.close()
    return columns
  } catch (error) {
    db.close()
    throw error
  }
}

/**
 * Validate SQL query to prevent dangerous operations
 * Only allows SELECT statements for security
 */
function validateSqlQuery(sql: string): void {
  const trimmedSql = sql.trim().toUpperCase()

  // Only allow SELECT statements
  if (!trimmedSql.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed")
  }

  // Block dangerous keywords that could modify data or execute system commands
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "COPY",
    "EXPORT",
    "IMPORT",
    "INSTALL",
    "LOAD",
    "ATTACH",
    "DETACH",
    "CALL",
    "EXECUTE",
    "SET",
    "PRAGMA",
  ]

  for (const keyword of dangerousKeywords) {
    // Check for keyword as a separate word (not part of column name)
    const regex = new RegExp(`\\b${keyword}\\b`, "i")
    if (regex.test(sql)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}`)
    }
  }
}

/**
 * Execute an arbitrary SQL query against a data file
 * The file is available as the 'data' table in the query
 */
export async function queryDataFile(
  filePath: string,
  sql: string,
  options: { sheetName?: string } = {}
): Promise<ParsedData> {
  const { sheetName } = options

  // Validate SQL query for security - only SELECT allowed
  validateSqlQuery(sql)

  // Detect file type - support CSV in addition to DuckDB native types
  const ext = path.extname(filePath).toLowerCase()
  let readFn: string

  // Escape single quotes in file path for SQL
  const escapedPath = filePath.replace(/'/g, "''")

  // Determine the read function based on file type
  if (ext === ".csv" || ext === ".tsv") {
    readFn = `read_csv('${escapedPath}', auto_detect=true)`
  } else if (ext === ".json" || ext === ".jsonl") {
    readFn = `read_json('${escapedPath}', auto_detect=true)`
  } else {
    const fileType = getDuckDBFileType(filePath)
    if (!fileType) {
      throw new Error(`Unsupported file type for SQL queries: ${filePath}`)
    }
    readFn = getReadFunction(fileType, escapedPath, sheetName)
  }

  const db = new duckdb.Database(":memory:")

  try {
    // Install extensions if needed (for Excel)
    const fileType = getDuckDBFileType(filePath)
    if (fileType) {
      await installExtensions(db, fileType)
    }

    // Create a view named 'data' for the file
    await queryDuckDB(db, `CREATE VIEW data AS SELECT * FROM ${readFn}`)

    // Execute the user's SQL query (already validated above)
    const dataResult = await queryDuckDB(db, sql)

    if (dataResult.length === 0) {
      db.close()
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        truncated: false,
      }
    }

    // Infer columns from the first row
    const columns: ParsedColumn[] = Object.keys(dataResult[0]).map((name) => {
      const value = dataResult[0][name]
      let colType: ColumnType = "string"
      if (typeof value === "number") colType = "number"
      else if (typeof value === "boolean") colType = "boolean"
      else if (value instanceof Date) colType = "date"
      return { name, type: colType }
    })

    const rows = dataResult.map(processRow)

    db.close()

    return {
      columns,
      rows,
      totalRows: rows.length,
      truncated: false,
    }
  } catch (error) {
    db.close()
    throw error
  }
}

