export interface ColumnDefinition {
  id: string;
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  hidden: boolean;
  sourceSpecific?: boolean;
}

export interface UnionSchemaColumn extends ColumnDefinition {
  sources: string[];
  coverage: number; // 0-100 percentage
  typeConflicts: { sourceId: string; type: string }[];
}

export interface UnionSchema {
  columns: UnionSchemaColumn[];
  totalSources: number;
  totalColumns: number;
  coverageMatrix: CoverageMatrix;
}

export interface CoverageMatrix {
  columns: string[];
  sources: string[];
  matrix: boolean[][]; // matrix[columnIndex][sourceIndex] = hasColumn
}

export interface SchemaValidation {
  warnings: string[];
  errors: string[];
}

export interface ReportConfig {
  sources: string[];
  columns?: string[];
  filters?: Record<string, any>;
  sorts?: Array<{ column: string; direction: "asc" | "desc" }>;
}

export interface PreviewData {
  data: Record<string, any>[];
  schema: UnionSchema;
  totalRows: number;
  hasMore: boolean;
}
