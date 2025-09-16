interface ColumnDefinition {
  id: string;
  name: string;
  displayName: string;
  type: string;
  required: boolean;
  hidden: boolean;
  sourceSpecific?: boolean;
}

interface SourceColumn extends ColumnDefinition {
  sourceId: string;
  sourceName: string;
}

interface UnionSchemaColumn extends ColumnDefinition {
  sources: string[];
  coverage: number; // 0-100 percentage
  typeConflicts: { sourceId: string; type: string }[];
}

interface UnionSchema {
  columns: UnionSchemaColumn[];
  totalSources: number;
  totalColumns: number;
  coverageMatrix: CoverageMatrix;
}

interface CoverageMatrix {
  columns: string[];
  sources: string[];
  matrix: boolean[][]; // matrix[columnIndex][sourceIndex] = hasColumn
}

export class SchemaService {
  static buildUnionSchema(sources: SourceColumn[]): UnionSchema {
    // Group columns by internal name (primary) or display name (fallback)
    const columnGroups = new Map<string, SourceColumn[]>();
    
    sources.forEach(col => {
      const key = col.name || col.displayName;
      if (!columnGroups.has(key)) {
        columnGroups.set(key, []);
      }
      columnGroups.get(key)!.push(col);
    });

    // Get unique source IDs
    const uniqueSourceIds = Array.from(new Set(sources.map(col => col.sourceId)));
    const totalSources = uniqueSourceIds.length;

    // Build union columns
    const unionColumns: UnionSchemaColumn[] = [];
    const coverageMatrix: boolean[][] = [];

    columnGroups.forEach((columns, columnKey) => {
      const firstColumn = columns[0];
      const sourcesWithColumn = Array.from(new Set(columns.map(col => col.sourceId)));
      const coverage = Math.round((sourcesWithColumn.length / totalSources) * 100);

      // Detect type conflicts
      const typeConflicts: { sourceId: string; type: string }[] = [];
      const primaryType = firstColumn.type;
      
      columns.forEach(col => {
        if (col.type !== primaryType) {
          typeConflicts.push({
            sourceId: col.sourceId,
            type: col.type,
          });
        }
      });

      const unionColumn: UnionSchemaColumn = {
        id: firstColumn.id,
        name: firstColumn.name,
        displayName: firstColumn.displayName,
        type: primaryType,
        required: columns.some(col => col.required),
        hidden: columns.every(col => col.hidden),
        sources: sourcesWithColumn,
        coverage,
        typeConflicts,
      };

      unionColumns.push(unionColumn);

      // Build coverage matrix row
      const matrixRow = uniqueSourceIds.map(sourceId => 
        sourcesWithColumn.includes(sourceId)
      );
      coverageMatrix.push(matrixRow);
    });

    // Sort columns by coverage (descending) then by name
    unionColumns.sort((a, b) => {
      if (b.coverage !== a.coverage) {
        return b.coverage - a.coverage;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    const schema: UnionSchema = {
      columns: unionColumns,
      totalSources,
      totalColumns: unionColumns.length,
      coverageMatrix: {
        columns: unionColumns.map(col => col.displayName),
        sources: uniqueSourceIds,
        matrix: coverageMatrix,
      },
    };

    return schema;
  }

  static validateColumnTypes(unionSchema: UnionSchema): {
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    unionSchema.columns.forEach(column => {
      // Check for type conflicts
      if (column.typeConflicts.length > 0) {
        warnings.push(
          `Column "${column.displayName}" has type conflicts: ${column.typeConflicts
            .map(tc => `${tc.sourceId}:${tc.type}`)
            .join(", ")}`
        );
      }

      // Check for low coverage
      if (column.coverage < 50) {
        warnings.push(
          `Column "${column.displayName}" has low coverage (${column.coverage}%)`
        );
      }

      // Check for required columns with low coverage
      if (column.required && column.coverage < 100) {
        errors.push(
          `Required column "${column.displayName}" is missing from some sources (${column.coverage}% coverage)`
        );
      }
    });

    return { warnings, errors };
  }

  static normalizeDataRow(
    row: Record<string, any>,
    unionSchema: UnionSchema,
    sourceMetadata: {
      sourceId: string;
      siteUrl: string;
      siteTitle: string;
      listTitle: string;
      listId: string;
    }
  ): Record<string, any> {
    const normalizedRow: Record<string, any> = {
      // Add source metadata columns
      _source_id: sourceMetadata.sourceId,
      _site_url: sourceMetadata.siteUrl,
      _site_title: sourceMetadata.siteTitle,
      _list_title: sourceMetadata.listTitle,
      _list_id: sourceMetadata.listId,
      _item_url: row.webUrl || null,
    };

    // Process each union schema column
    unionSchema.columns.forEach(column => {
      const value = row[column.name] || row[column.displayName];
      normalizedRow[column.displayName] = this.coerceValue(value, column.type);
    });

    return normalizedRow;
  }

  private static coerceValue(value: any, targetType: string): any {
    if (value === null || value === undefined) {
      return null;
    }

    try {
      switch (targetType) {
        case "text":
          return String(value);

        case "number":
          const num = Number(value);
          return isNaN(num) ? null : num;

        case "currency":
          const currency = Number(value);
          return isNaN(currency) ? null : currency;

        case "dateTime":
          const date = new Date(value);
          return isNaN(date.getTime()) ? null : date.toISOString();

        case "boolean":
          if (typeof value === "boolean") return value;
          if (typeof value === "string") {
            const lower = value.toLowerCase();
            return lower === "true" || lower === "yes" || lower === "1";
          }
          return Boolean(value);

        case "choice":
          if (Array.isArray(value)) {
            return value.map(v => String(v));
          }
          return [String(value)];

        case "lookup":
          if (typeof value === "object" && value !== null) {
            return {
              id: value.id || value.Id || null,
              title: value.title || value.Title || String(value),
            };
          }
          return { id: null, title: String(value) };

        case "person":
          if (typeof value === "object" && value !== null) {
            return {
              id: value.id || value.Id || null,
              displayName: value.displayName || value.Title || String(value),
              email: value.email || value.EMail || null,
            };
          }
          return { id: null, displayName: String(value), email: null };

        case "taxonomy":
          if (typeof value === "object" && value !== null) {
            return {
              label: value.label || value.Label || String(value),
              termGuid: value.termGuid || value.TermGuid || null,
            };
          }
          return { label: String(value), termGuid: null };

        case "url":
          if (typeof value === "object" && value !== null) {
            return {
              url: value.url || value.Url || String(value),
              description: value.description || value.Description || null,
            };
          }
          return { url: String(value), description: null };

        default:
          return value;
      }
    } catch (error) {
      console.warn(`Failed to coerce value for type ${targetType}:`, error);
      return value;
    }
  }
}
