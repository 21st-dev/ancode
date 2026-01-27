import * as XLSX from "xlsx"
import type { ParsedData, ParsedColumn, ColumnType } from "./types"

/**
 * Detect column type from a sample of values
 */
function detectColumnType(values: unknown[]): ColumnType {
  // Filter out null/undefined values
  const validValues = values.filter((v) => v !== null && v !== undefined && v !== "")

  if (validValues.length === 0) return "string"

  // Check the first few non-null values
  const sample = validValues.slice(0, 10)

  // Check if all values are numbers
  if (sample.every((v) => typeof v === "number")) {
    return "number"
  }

  // Check if all values are booleans
  if (sample.every((v) => typeof v === "boolean")) {
    return "boolean"
  }

  // Check if values look like dates
  if (
    sample.every((v) => {
      if (v instanceof Date) return true
      if (typeof v === "number" && v > 25569 && v < 100000) {
        // Excel date serial numbers (days since 1900-01-01)
        return true
      }
      return false
    })
  ) {
    return "date"
  }

  return "string"
}

/**
 * Convert Excel date serial number to ISO string
 */
function excelDateToISO(serial: number): string {
  // Excel date serial: days since 1900-01-01 (with bug: 1900 is treated as leap year)
  const utcDays = Math.floor(serial - 25569)
  const utcValue = utcDays * 86400 * 1000
  return new Date(utcValue).toISOString()
}

/**
 * Process a cell value for output
 */
function processValue(value: unknown, colType: ColumnType): unknown {
  if (value === null || value === undefined) return null

  // Handle Date objects
  if (value instanceof Date) {
    return value.toISOString()
  }

  // Handle Excel date serial numbers when column is detected as date
  if (colType === "date" && typeof value === "number") {
    try {
      return excelDateToISO(value)
    } catch {
      return value
    }
  }

  return value
}

export interface ExcelParseOptions {
  limit?: number
  offset?: number
  sheetName?: string
}

/**
 * List all sheet names in an Excel file
 * Supports both .xls and .xlsx formats
 */
export function listExcelSheets(filePath: string): string[] {
  try {
    // Read workbook with minimal parsing (just enough to get sheet names)
    const workbook = XLSX.readFile(filePath, {
      type: "file",
      bookSheets: true, // Only read sheet names, not data
    })

    return workbook.SheetNames
  } catch (error) {
    console.error("[excel-parser] Failed to list sheets:", error)
    return []
  }
}

/**
 * Parse an Excel file and return structured data
 * Supports both .xls and .xlsx formats
 */
export function parseExcelFile(
  filePath: string,
  options: ExcelParseOptions = {}
): ParsedData {
  const { limit = 1000, offset = 0, sheetName } = options

  try {
    // Read the workbook
    const workbook = XLSX.readFile(filePath, {
      type: "file",
      cellDates: true, // Parse dates as Date objects
      cellNF: false, // Don't parse number formats
      cellText: false, // Don't generate text
    })

    // Get the sheet to read - validate the requested sheet exists, otherwise fall back to first sheet
    let targetSheet = sheetName
    if (targetSheet && !workbook.SheetNames.includes(targetSheet)) {
      console.warn(`[excel-parser] Requested sheet "${targetSheet}" not found, falling back to first sheet`)
      targetSheet = undefined
    }
    targetSheet = targetSheet || workbook.SheetNames[0]

    if (!targetSheet) {
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        truncated: false,
      }
    }

    const worksheet = workbook.Sheets[targetSheet]
    if (!worksheet) {
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        truncated: false,
      }
    }

    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      header: 1, // Use array format first to get all rows including header
      defval: null, // Default value for empty cells
      blankrows: false, // Skip blank rows
    }) as unknown[][]

    if (jsonData.length === 0) {
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        truncated: false,
      }
    }

    // First row is headers
    const headerRow = jsonData[0] as unknown[]
    const headers = headerRow.map((h, i) => (h != null ? String(h) : `Column${i + 1}`))

    // Data rows (skip header)
    const dataRows = jsonData.slice(1)
    const totalRows = dataRows.length

    // Detect column types from sample data
    const columnTypes: ColumnType[] = headers.map((_, colIndex) => {
      const sampleValues = dataRows.slice(0, 100).map((row) => (row as unknown[])[colIndex])
      return detectColumnType(sampleValues)
    })

    // Build columns array
    const columns: ParsedColumn[] = headers.map((name, i) => ({
      name,
      type: columnTypes[i],
    }))

    // Apply pagination
    const paginatedRows = dataRows.slice(offset, offset + limit)

    // Convert to objects with processed values
    const rows = paginatedRows.map((row) => {
      const rowArray = row as unknown[]
      const obj: Record<string, unknown> = {}
      headers.forEach((header, i) => {
        obj[header] = processValue(rowArray[i], columnTypes[i])
      })
      return obj
    })

    return {
      columns,
      rows,
      totalRows,
      truncated: offset + rows.length < totalRows,
    }
  } catch (error) {
    console.error("[excel-parser] Failed to parse Excel file:", error)
    throw error
  }
}

/**
 * Execute a SQL-like query on an Excel file
 * Note: For full SQL support, this should be combined with DuckDB
 * This function converts the Excel data to a format DuckDB can use
 */
export function getExcelDataForDuckDB(
  filePath: string,
  sheetName?: string
): { columns: ParsedColumn[]; rows: Record<string, unknown>[] } {
  const result = parseExcelFile(filePath, {
    sheetName,
    limit: Number.MAX_SAFE_INTEGER, // Get all rows for SQL queries
    offset: 0,
  })

  return {
    columns: result.columns,
    rows: result.rows,
  }
}
