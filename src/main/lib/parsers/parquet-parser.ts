import type { ParsedData, ParsedColumn, ColumnType } from "./types"

/**
 * Map Parquet types to our column types
 */
function mapParquetType(parquetType: string): ColumnType {
  const type = parquetType?.toUpperCase() || ""

  // Integer types
  if (
    type.includes("INT") ||
    type.includes("LONG") ||
    type.includes("SHORT") ||
    type.includes("BYTE")
  ) {
    return "number"
  }

  // Float types
  if (type.includes("FLOAT") || type.includes("DOUBLE") || type.includes("DECIMAL")) {
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

  // Default to string for everything else (UTF8, BYTE_ARRAY, etc.)
  return "string"
}

/**
 * Extract column info from Parquet schema
 */
function extractColumnsFromSchema(schema: any): ParsedColumn[] {
  const columns: ParsedColumn[] = []

  if (!schema || !schema.schema) {
    return columns
  }

  // The schema object has a 'schema' property with field definitions
  const fields = schema.schema
  for (const [fieldName, fieldDef] of Object.entries(fields)) {
    if (fieldName === "root" || !fieldDef) continue

    const field = fieldDef as any
    const parquetType = field.type || field.originalType || "UTF8"

    columns.push({
      name: fieldName,
      type: mapParquetType(parquetType),
    })
  }

  return columns
}

/**
 * Parse a Parquet file and return structured data
 */
export async function parseParquetFile(
  filePath: string,
  options: { limit?: number; offset?: number } = {}
): Promise<ParsedData> {
  const { limit = 1000, offset = 0 } = options

  // Dynamic require to handle CommonJS module
  const parquetModule = await import("parquetjs-lite")
  const parquet = parquetModule.default || parquetModule
  const ParquetReader = parquet.ParquetReader

  const reader = await ParquetReader.openFile(filePath)

  try {
    // Get schema info
    const schema = reader.getSchema()
    const columns = extractColumnsFromSchema(schema)

    // Get total row count
    const totalRows = Number(reader.getRowCount())

    // Read rows with cursor
    const cursor = reader.getCursor()
    const rows: Record<string, unknown>[] = []

    let currentRow = 0
    let record: Record<string, unknown> | null = null

    // Skip to offset
    while (currentRow < offset && (record = await cursor.next())) {
      currentRow++
    }

    // Read rows up to limit
    while (rows.length < limit && (record = await cursor.next())) {
      // Convert any BigInt values to numbers for JSON serialization
      const processedRecord: Record<string, unknown> = {}
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === "bigint") {
          processedRecord[key] = Number(value)
        } else if (value instanceof Date) {
          processedRecord[key] = value.toISOString()
        } else if (Buffer.isBuffer(value)) {
          // Handle binary data
          processedRecord[key] = value.toString("utf-8")
        } else {
          processedRecord[key] = value
        }
      }
      rows.push(processedRecord)
      currentRow++
    }

    await reader.close()

    return {
      columns,
      rows,
      totalRows,
      truncated: offset + rows.length < totalRows,
    }
  } catch (error) {
    await reader.close()
    throw error
  }
}

/**
 * Get row count from a Parquet file without reading all data
 */
export async function getParquetRowCount(filePath: string): Promise<number> {
  const parquetModule = await import("parquetjs-lite")
  const parquet = parquetModule.default || parquetModule
  const ParquetReader = parquet.ParquetReader

  const reader = await ParquetReader.openFile(filePath)

  try {
    const rowCount = Number(reader.getRowCount())
    await reader.close()
    return rowCount
  } catch (error) {
    await reader.close()
    throw error
  }
}

/**
 * Get column info from a Parquet file without reading data
 */
export async function getParquetColumns(filePath: string): Promise<ParsedColumn[]> {
  const parquetModule = await import("parquetjs-lite")
  const parquet = parquetModule.default || parquetModule
  const ParquetReader = parquet.ParquetReader

  const reader = await ParquetReader.openFile(filePath)

  try {
    const schema = reader.getSchema()
    const columns = extractColumnsFromSchema(schema)
    await reader.close()
    return columns
  } catch (error) {
    await reader.close()
    throw error
  }
}
