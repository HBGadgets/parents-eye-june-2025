"use client";

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { toast } from "sonner";

// Extend jsPDF type
declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}

interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown, row?: unknown) => string;
}

interface NestedTableConfig {
  dataKey: string;
  columns: ExportColumn[];
  title?: string;
}

interface ExportConfig {
  filename?: string;
  title?: string;
  companyName?: string;
  metadata?: Record<string, string>;
  colors?: {
    primary?: number[];
    secondary?: number[];
    background?: number[];
  };
  nestedTable?: NestedTableConfig;
}

export const useExport = () => {
  const CONFIG = {
    colors: {
      primary: [240, 177, 0] as [number, number, number],
      secondary: [255, 229, 138] as [number, number, number],
      tertiary: [0, 0, 0] as [number, number, number],
      background: [249, 250, 251] as [number, number, number],
      border: [220, 220, 220] as [number, number, number],
    },

    company: {
      name: "Parents Eye",
    },

    fonts: {
      primary: "helvetica",
    },

    layout: {
      margin: 10,
      lineHeight: 6,
    },
  };

  const formatDate = (date: Date) =>
    date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(",", "");

  // EXCEL COLUMN NAME FIX (supports > 26 columns)
  const getExcelColumnName = (colNumber: number) => {
    let dividend = colNumber;
    let columnName = "";

    while (dividend > 0) {
      const modulo = (dividend - 1) % 26;

      columnName =
        String.fromCharCode(65 + modulo) + columnName;

      dividend = Math.floor((dividend - modulo) / 26);
    }

    return columnName;
  };

  // ===========================
  // PDF EXPORT
  // ===========================

  const exportToPDF = async (
    data: any[],
    columns: ExportColumn[],
    config: ExportConfig = {}
  ) => {
    try {
      if (!data?.length) {
        toast.error("No data available for PDF export");
        return;
      }

      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3", // IMPORTANT FOR MANY COLUMNS
      });

      const companyName =
        config.companyName || CONFIG.company.name;

      const title = config.title || "Data Report";

      const filename =
        config.filename ||
        `${title.replace(/\s+/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.pdf`;

      // ===========================
      // HEADER
      // ===========================

      doc.setFillColor(...CONFIG.colors.primary);

      doc.rect(10, 10, 8, 8, "F");

      doc.setFont(CONFIG.fonts.primary, "bold");

      doc.setFontSize(16);

      doc.setTextColor(...CONFIG.colors.tertiary);

      doc.text(companyName, 22, 16);

      doc.setDrawColor(...CONFIG.colors.primary);

      doc.setLineWidth(0.5);

      doc.line(
        10,
        22,
        doc.internal.pageSize.width - 10,
        22
      );

      // TITLE

      doc.setFontSize(18);

      doc.text(title, 10, 32);

      const currentDate = formatDate(new Date());

      doc.setFontSize(10);

      const dateText = `Generated: ${currentDate}`;

      doc.text(
        dateText,
        doc.internal.pageSize.width -
          10 -
          doc.getTextWidth(dateText),
        16
      );

      // ===========================
      // METADATA
      // ===========================

      let startY = 40;

      if (config.metadata) {
        doc.setFontSize(10);

        doc.setFont(CONFIG.fonts.primary, "bold");

        Object.entries(config.metadata).forEach(
          ([key, value]) => {
            doc.text(`${key}: ${value}`, 10, startY);

            startY += 6;
          }
        );

        startY += 5;
      }

      // ===========================
      // TABLE DATA
      // ===========================

      const tableHeaders = columns.map(
        (col) => col.header
      );

      const tableRows = data.map((item) =>
        columns.map((col) => {
          const value = col.key.includes(".")
            ? col.key
                .split(".")
                .reduce(
                  (obj: any, key) => obj?.[key],
                  item
                )
            : item[col.key];

          return col.formatter
            ? col.formatter(value, item)
            : value?.toString() || "--";
        })
      );

      // ===========================
      // MAIN TABLE
      // ===========================

      autoTable(doc, {
        startY,

        head: [tableHeaders],

        body: tableRows,

        theme: "grid",

        tableWidth: "wrap",

        horizontalPageBreak: true,

        horizontalPageBreakRepeat: 0,

        styles: {
          fontSize: 5,
          cellPadding: 1,
          overflow: "linebreak",
          halign: "center",
          valign: "middle",
          lineColor: CONFIG.colors.border,
          lineWidth: 0.1,
        },

        headStyles: {
          fillColor: CONFIG.colors.primary,
          textColor: 255,
          fontStyle: "bold",
          fontSize: 6,
        },

        alternateRowStyles: {
          fillColor: CONFIG.colors.background,
        },

        margin: {
          left: 5,
          right: 5,
        },

        didDrawPage: () => {
          if (
            doc.getCurrentPageInfo().pageNumber > 1
          ) {
            doc.setFontSize(12);

            doc.setFont(
              CONFIG.fonts.primary,
              "bold"
            );

            doc.text(title, 10, 10);
          }
        },
      });

      // ===========================
      // FOOTER
      // ===========================

      const pageCount = doc.getNumberOfPages();

      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);

        doc.setDrawColor(...CONFIG.colors.border);

        doc.line(
          10,
          doc.internal.pageSize.height - 10,
          doc.internal.pageSize.width - 10,
          doc.internal.pageSize.height - 10
        );

        doc.setFontSize(8);

        doc.setTextColor(120, 120, 120);

        doc.text(
          `© ${companyName}`,
          10,
          doc.internal.pageSize.height - 5
        );

        const pageText = `Page ${i} of ${pageCount}`;

        doc.text(
          pageText,
          doc.internal.pageSize.width -
            10 -
            doc.getTextWidth(pageText),
          doc.internal.pageSize.height - 5
        );
      }

      doc.save(filename);

      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "PDF export failed"
      );
    }
  };

  // ===========================
  // EXCEL EXPORT
  // ===========================

  const exportToExcel = async (
    data: any[],
    columns: ExportColumn[],
    config: ExportConfig = {}
  ) => {
    try {
      if (!data?.length) {
        toast.error("No data available");

        return;
      }

      const workbook = new ExcelJS.Workbook();

      const worksheet =
        workbook.addWorksheet("Data Report");

      const companyName =
        config.companyName || CONFIG.company.name;

      const title = config.title || "Data Report";

      const filename =
        config.filename ||
        `${title.replace(/\s+/g, "_")}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`;

      const lastColumn =
        getExcelColumnName(columns.length);

      // ===========================
      // TITLE
      // ===========================

      worksheet.mergeCells(`A1:${lastColumn}1`);

      const titleRow = worksheet.getCell("A1");

      titleRow.value = companyName;

      titleRow.font = {
        bold: true,
        size: 16,
      };

      titleRow.alignment = {
        horizontal: "center",
      };

      titleRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "F0B100",
        },
      };

      worksheet.mergeCells(`A2:${lastColumn}2`);

      const subtitleRow = worksheet.getCell("A2");

      subtitleRow.value = title;

      subtitleRow.font = {
        bold: true,
        size: 14,
      };

      subtitleRow.alignment = {
        horizontal: "center",
      };

      subtitleRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: {
          argb: "FFE58A",
        },
      };

      let currentRow = 4;

      // ===========================
      // METADATA
      // ===========================

      if (config.metadata) {
        Object.entries(config.metadata).forEach(
          ([key, value]) => {
            worksheet.getCell(`A${currentRow}`).value =
              `${key}: ${value}`;

            currentRow++;
          }
        );
      }

      worksheet.getCell(`A${currentRow}`).value =
        `Generated: ${formatDate(new Date())}`;

      currentRow += 2;

      // ===========================
      // HEADERS
      // ===========================

      const headerRow = worksheet.addRow(
        columns.map((col) => col.header)
      );

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          size: 11,
        };

        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        };

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: {
            argb: "F0B100",
          },
        };

        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // ===========================
      // DATA
      // ===========================

      data.forEach((item) => {
        const rowData = columns.map((col) => {
          const value = col.key.includes(".")
            ? col.key
                .split(".")
                .reduce(
                  (obj: any, key) => obj?.[key],
                  item
                )
            : item[col.key];

          return col.formatter
            ? col.formatter(value, item)
            : value?.toString() || "--";
        });

        const row = worksheet.addRow(rowData);

        row.eachCell((cell) => {
          cell.font = {
            size: 10,
          };

          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
            wrapText: true,
          };

          cell.border = {
            top: { style: "thin" },
            bottom: { style: "thin" },
            left: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // ===========================
      // COLUMN WIDTHS
      // ===========================

      worksheet.columns = columns.map((col) => ({
        width: col.width || 20,
      }));

      // ===========================
      // FOOTER
      // ===========================

      const footerRow = worksheet.addRow([]);

      worksheet.mergeCells(
        `A${footerRow.number}:${lastColumn}${footerRow.number}`
      );

      const footerCell = worksheet.getCell(
        `A${footerRow.number}`
      );

      footerCell.value = `© ${new Date().getFullYear()} ${companyName}`;

      footerCell.font = {
        italic: true,
      };

      footerCell.alignment = {
        horizontal: "center",
      };

      // ===========================
      // DOWNLOAD
      // ===========================

      const buffer =
        await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      saveAs(blob, filename);

      toast.success(
        "Excel file downloaded successfully"
      );
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Excel export failed"
      );
    }
  };

  return {
    exportToPDF,
    exportToExcel,
  };
};