import ExcelJS from "exceljs";
import { Parser } from "json2csv";

interface ExportColumn {
  displayName: string;
  type: string;
  coverage: number;
}

interface ExportData {
  data: Record<string, any>[];
  schema: ExportColumn[];
  sources: string[];
  coverageMatrix: boolean[][];
}

export class ExportService {
  static async exportToCSV(exportData: ExportData): Promise<Buffer> {
    try {
      const fields = exportData.schema.map(col => ({
        label: col.displayName,
        value: col.displayName,
      }));

      const parser = new Parser({ fields });
      const csv = parser.parse(exportData.data);
      
      return Buffer.from(csv, "utf-8");
    } catch (error) {
      console.error("CSV export error:", error);
      throw new Error("Failed to export CSV");
    }
  }

  static async exportToXLSX(exportData: ExportData): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      
      // Sheet 1: Data
      await this.createDataSheet(workbook, exportData);
      
      // Sheet 2: Schema Map
      await this.createSchemaMapSheet(workbook, exportData);
      
      // Sheet 3: Source Coverage
      await this.createCoverageSheet(workbook, exportData);

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      console.error("XLSX export error:", error);
      throw new Error("Failed to export XLSX");
    }
  }

  private static async createDataSheet(workbook: ExcelJS.Workbook, exportData: ExportData) {
    const worksheet = workbook.addWorksheet("Data");
    
    // Add headers
    const headers = exportData.schema.map(col => col.displayName);
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF366EF0" }, // Primary blue
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    // Add data rows
    exportData.data.forEach(row => {
      const values = exportData.schema.map(col => {
        const value = row[col.displayName];
        return this.formatCellValue(value, col.type);
      });
      worksheet.addRow(values);
    });
    
    // Format columns
    exportData.schema.forEach((col, index) => {
      const column = worksheet.getColumn(index + 1);
      column.width = Math.min(Math.max(col.displayName.length, 10), 30);
      
      // Apply number formatting
      if (col.type === "number" || col.type === "currency") {
        column.numFmt = col.type === "currency" ? "$#,##0.00" : "#,##0.00";
      } else if (col.type === "dateTime") {
        column.numFmt = "yyyy-mm-dd hh:mm:ss";
      }
    });
    
    // Add auto-filter
    worksheet.autoFilter = {
      from: "A1",
      to: `${String.fromCharCode(64 + headers.length)}1`,
    };
    
    // Freeze header row
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
  }

  private static async createSchemaMapSheet(workbook: ExcelJS.Workbook, exportData: ExportData) {
    const worksheet = workbook.addWorksheet("Schema Map");
    
    // Headers
    const headers = ["Column Name", "Type", "Coverage %", "Sources Count", "Notes"];
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF366EF0" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    // Add schema data
    exportData.schema.forEach(col => {
      const sourcesCount = exportData.coverageMatrix[exportData.schema.indexOf(col)]?.filter(Boolean).length || 0;
      const notes = col.coverage < 100 ? "Partial coverage - may contain null values" : "";
      
      worksheet.addRow([
        col.displayName,
        col.type,
        col.coverage,
        sourcesCount,
        notes,
      ]);
    });
    
    // Format columns
    worksheet.getColumn(1).width = 25; // Column Name
    worksheet.getColumn(2).width = 15; // Type
    worksheet.getColumn(3).width = 12; // Coverage %
    worksheet.getColumn(4).width = 15; // Sources Count
    worksheet.getColumn(5).width = 40; // Notes
    
    // Add conditional formatting for coverage
    worksheet.addConditionalFormatting({
      ref: `C2:C${exportData.schema.length + 1}`,
      rules: [
        {
          type: "cellIs",
          operator: "lessThan",
          formulae: [50],
          style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } } },
          priority: 1,
        },
        {
          type: "cellIs",
          operator: "between",
          formulae: [50, 90],
          style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFD93D" } } },
          priority: 2,
        },
        {
          type: "cellIs",
          operator: "greaterThan",
          formulae: [89],
          style: { fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF6BCF7F" } } },
          priority: 3,
        },
      ],
    });
  }

  private static async createCoverageSheet(workbook: ExcelJS.Workbook, exportData: ExportData) {
    const worksheet = workbook.addWorksheet("Source Coverage");
    
    // Create matrix header
    const headers = ["Column Name", ...exportData.sources];
    worksheet.addRow(headers);
    
    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF366EF0" },
    };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    
    // Add matrix data
    exportData.schema.forEach((col, colIndex) => {
      const row = [col.displayName];
      exportData.sources.forEach((source, sourceIndex) => {
        const hasColumn = exportData.coverageMatrix[colIndex]?.[sourceIndex] || false;
        row.push(hasColumn ? "✓" : "✗");
      });
      worksheet.addRow(row);
    });
    
    // Format columns
    worksheet.getColumn(1).width = 25; // Column Name
    exportData.sources.forEach((source, index) => {
      worksheet.getColumn(index + 2).width = Math.min(Math.max(source.length, 8), 20);
    });
    
    // Add conditional formatting for presence indicators
    const range = `B2:${String.fromCharCode(64 + exportData.sources.length + 1)}${exportData.schema.length + 1}`;
    worksheet.addConditionalFormatting({
      ref: range,
      rules: [
        {
          type: "containsText",
          operator: "containsText",
          text: "✓",
          priority: 1,
          style: { 
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF6BCF7F" } },
            font: { color: { argb: "FF2D5A27" } }
          },
        },
        {
          type: "containsText",
          operator: "containsText",
          text: "✗",
          priority: 2,
          style: { 
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFF6B6B" } },
            font: { color: { argb: "FF8B0000" } }
          },
        },
      ],
    });
  }

  private static formatCellValue(value: any, type: string): any {
    if (value === null || value === undefined) {
      return "";
    }

    switch (type) {
      case "dateTime":
        return value instanceof Date ? value : new Date(value);
      
      case "boolean":
        return value ? "Yes" : "No";
      
      case "choice":
        return Array.isArray(value) ? value.join("; ") : String(value);
      
      case "lookup":
      case "person":
        if (typeof value === "object") {
          return value.title || value.displayName || "";
        }
        return String(value);
      
      case "taxonomy":
        if (typeof value === "object") {
          return value.label || "";
        }
        return String(value);
      
      case "url":
        if (typeof value === "object") {
          return value.url || "";
        }
        return String(value);
      
      default:
        return value;
    }
  }
}
