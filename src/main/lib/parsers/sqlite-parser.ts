import Database from "better-sqlite3"
import type { ParsedData, ParsedColumn, ColumnType } from "./types"

/**
 * Map SQLite type affinity to our column types
 */
function mapSqliteType(sqliteType: string | null): ColumnType {
  if (!sqliteType) return "mixed"

  const upperType = sqliteType.toUpperCase()

  if (
    upperType.includes("INT") ||
    upperType.includes("REAL") ||
    upperType.includes("FLOAT") ||
    upperType.includes("DOUBLE") ||
    upperType.includes("NUMERIC") ||
    upperType.includes("DECIMAL")
  ) {
    return "number"
  }

  if (upperType.includes("BOOL")) {
    return "boolean"
  }

  if (
    upperType.includes("DATE") ||
    upperType.includes("TIME") ||
    upperType.includes("TIMESTAMP")
  ) {
    return "date"
  }

  if (
    upperType.includes("TEXT") ||
    upperType.includes("CHAR") ||
    upperType.includes("CLOB") ||
    upperType.includes("VARCHAR")
  ) {
    return "string"
  }

  if (upperType.includes("BLOB")) {
    return "string" // Display as hex or base64
  }

  return "mixed"
}

/**
 * List all tables in a SQLite database
 */
export function listSqliteTables(filePath: string): string[] {
  const db = new Database(filePath, { readonly: true })

  try {
    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type='table' AND name NOT LIKE 'sqlite_%'
         ORDER BY name`
      )
      .all() as { name: string }[]

    return tables.map((t) => t.name)
  } finally {
    db.close()
  }
}

/**
 * Validate that a table name exists in the database
 * Prevents SQL injection by ensuring we only use valid table names
 */
function validateTableName(db: Database.Database, tableName: string): void {
  const result = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type='table' AND name = ?`
    )
    .get(tableName) as { name: string } | undefined

  if (!result) {
    throw new Error(`Table not found: ${tableName}`)
  }
}

/**
 * Escape a table name for use in SQL by wrapping in double quotes
 * and escaping any embedded double quotes
 */
function escapeTableName(tableName: string): string {
  return `"${tableName.replace(/"/g, '""')}"`
}

/**
 * Get column information for a table
 * Note: tableName must be validated before calling this function
 */
function getTableColumns(
  db: Database.Database,
  tableName: string
): ParsedColumn[] {
  // Use PRAGMA to get column info - table name is already validated
  const columns = db.prepare(`PRAGMA table_info(${escapeTableName(tableName)})`).all() as {
    cid: number
    name: string
    type: string
    notnull: number
    dflt_value: unknown
    pk: number
  }[]

  return columns.map((col) => ({
    name: col.name,
    type: mapSqliteType(col.type),
  }))
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

  // Block dangerous keywords that could modify data or schema
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "TRUNCATE",
    "REPLACE",
    "ATTACH",
    "DETACH",
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
 * Query a SQLite database and return parsed data
 */
export function querySqlite(
  filePath: string,
  sql: string,
  options: { limit?: number } = {}
): ParsedData {
  const { limit = 1000 } = options
  const db = new Database(filePath, { readonly: true })

  try {
    // Validate SQL query for security
    validateSqlQuery(sql)

    // Add LIMIT if not present (safety measure)
    let querySql = sql.trim()
    if (
      !querySql.toUpperCase().includes("LIMIT") &&
      querySql.toUpperCase().startsWith("SELECT")
    ) {
      querySql = `${querySql} LIMIT ${limit}`
    }

    const stmt = db.prepare(querySql)
    const rows = stmt.all() as Record<string, unknown>[]

    if (rows.length === 0) {
      return {
        columns: [],
        rows: [],
        totalRows: 0,
        truncated: false,
      }
    }

    // Get columns from first row
    const columnNames = Object.keys(rows[0])
    const columns: ParsedColumn[] = columnNames.map((name) => ({
      name,
      type: inferTypeFromValue(rows[0][name]),
    }))

    return {
      columns,
      rows,
      totalRows: rows.length,
      truncated: rows.length >= limit,
    }
  } finally {
    db.close()
  }
}

/**
 * Preview data from a specific table
 */
export function previewSqliteTable(
  filePath: string,
  tableName: string,
  options: { limit?: number; offset?: number } = {}
): ParsedData {
  const { limit = 1000, offset = 0 } = options
  const db = new Database(filePath, { readonly: true })

  try {
    // Validate table name exists to prevent SQL injection
    validateTableName(db, tableName)

    // Get column info (table name is now validated)
    const columns = getTableColumns(db, tableName)

    // Escape table name for SQL query
    const escapedTable = escapeTableName(tableName)

    // Get total row count
    const countResult = db
      .prepare(`SELECT COUNT(*) as count FROM ${escapedTable}`)
      .get() as { count: number }
    const totalRows = countResult.count

    // Get rows with pagination
    const rows = db
      .prepare(`SELECT * FROM ${escapedTable} LIMIT ? OFFSET ?`)
      .all(limit, offset) as Record<string, unknown>[]

    const truncated = offset + limit < totalRows

    return {
      columns,
      rows,
      totalRows,
      truncated,
    }
  } finally {
    db.close()
  }
}

/**
 * Infer type from a single value (fallback)
 */
function inferTypeFromValue(value: unknown): ColumnType {
  if (value === null || value === undefined) {
    return "null"
  }

  if (typeof value === "boolean") {
    return "boolean"
  }

  if (typeof value === "number") {
    return "number"
  }

  if (typeof value === "string") {
    // Check for date patterns
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      return "date"
    }
    return "string"
  }

  return "mixed"
}

/**
 * Get schema information for a SQLite database
 */
export function getSqliteSchema(
  filePath: string
): Map<string, ParsedColumn[]> {
  const db = new Database(filePath, { readonly: true })
  const schema = new Map<string, ParsedColumn[]>()

  try {
    const tables = listSqliteTables(filePath)

    for (const tableName of tables) {
      const columns = getTableColumns(db, tableName)
      schema.set(tableName, columns)
    }

    return schema
  } finally {
    db.close()
  }
}
