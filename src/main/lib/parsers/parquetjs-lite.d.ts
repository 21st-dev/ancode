declare module "parquetjs-lite" {
  export interface ParquetSchema {
    schema: Record<string, ParquetFieldDef>
  }

  export interface ParquetFieldDef {
    name?: string
    type?: string
    originalType?: string
    optional?: boolean
    repeated?: boolean
    fields?: Record<string, ParquetFieldDef>
  }

  export interface ParquetCursor {
    next(): Promise<Record<string, unknown> | null>
    rewind(): void
  }

  export class ParquetReader {
    static openFile(filePath: string): Promise<ParquetReader>
    getSchema(): ParquetSchema
    getRowCount(): bigint
    getCursor(): ParquetCursor
    close(): Promise<void>
  }
}
