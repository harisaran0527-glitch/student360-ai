import * as XLSX from "xlsx";
import { ReportQueryResult } from "./reportTypes";

export function generateCSVReport(queryResult: ReportQueryResult): string {
  const lines: string[] = [];

  // Header metadata banner
  lines.push(`"STUDENT360 AI INSTITUTIONAL REPORT: ${queryResult.reportName.toUpperCase()}"`);
  lines.push(`"Generated Date: ${new Date(queryResult.generatedAt).toLocaleString()}"`);
  lines.push(`"Applied Filters: ${JSON.stringify(queryResult.appliedFilters)}"\n`);

  // Table Column Headers
  const headers = queryResult.columns.map((c) => `"${c.label.replace(/"/g, '""')}"`).join(",");
  lines.push(headers);

  // Table Rows
  queryResult.rows.forEach((row) => {
    const rowValues = queryResult.columns.map((col) => {
      const val = row[col.key] ?? "";
      return `"${String(val).replace(/"/g, '""')}"`;
    });
    lines.push(rowValues.join(","));
  });

  return lines.join("\n");
}

export function generateExcelReportBuffer(queryResult: ReportQueryResult): Buffer {
  // Format metadata header rows
  const metadataRows = [
    ["STUDENT360 AI INSTITUTIONAL REPORT", queryResult.reportName],
    ["Generated Timestamp", new Date(queryResult.generatedAt).toLocaleString()],
    ["Applied Filters", JSON.stringify(queryResult.appliedFilters)],
    [], // Empty separator row
  ];

  // Column headers
  const columnHeaders = queryResult.columns.map((c) => c.label);

  // Row data
  const dataRows = queryResult.rows.map((row) =>
    queryResult.columns.map((col) => row[col.key] ?? "")
  );

  const fullSheetData = [...metadataRows, columnHeaders, ...dataRows];

  const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Set column widths based on maximum string lengths
  const colWidths = queryResult.columns.map((col, colIdx) => {
    const headerLen = col.label.length;
    const maxDataLen = Math.max(
      ...queryResult.rows.map((r) => String(r[col.key] ?? "").length)
    );
    return { wch: Math.max(headerLen, maxDataLen, 12) + 2 };
  });

  worksheet["!cols"] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Institutional Report");

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  return buffer;
}
