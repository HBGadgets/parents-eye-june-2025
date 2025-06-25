import { toast } from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
  }
}
import * as ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'

interface ExportColumn {
  key: string
  header: string
  width?: number
  formatter?: (value: any) => string
}

interface ExportConfig {
  filename?: string
  title?: string
  companyName?: string
  metadata?: Record<string, string>
  colors?: {
    primary?: number[]
    secondary?: number[]
    background?: number[]
  }
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
    company: { name: 'Parents Eye' },
    fonts: { primary: 'helvetica' },
    layout: { margin: 15, lineHeight: 6 },
  }

  const formatDate = (date: Date) => date.toLocaleDateString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(',', '')

  const exportToPDF = async (
    data: any[], 
    columns: ExportColumn[], 
    config: ExportConfig = {}
  ) => {
    try {
      if (!data?.length) throw new Error('No data available for PDF export')

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const companyName = config.companyName || CONFIG.company.name
      const title = config.title || 'Data Report'
      const filename = config.filename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`

      // Header
      doc.setFillColor(...CONFIG.colors.primary)
      doc.rect(15, 15, 8, 8, 'F')
      doc.setFont(CONFIG.fonts.primary, 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...CONFIG.colors.tertiary)
      doc.text(companyName, 28, 21)

      doc.setDrawColor(...CONFIG.colors.primary)
      doc.setLineWidth(0.5)
      doc.line(15, 25, doc.internal.pageSize.width - 15, 25)

      // Title and date
      doc.setFontSize(20)
      doc.text(title, 15, 35)
      
      const currentDate = formatDate(new Date())
      doc.setTextColor(...CONFIG.colors.tertiary)
      doc.setFontSize(10)
      const dateText = `Generated: ${currentDate}`
      doc.text(dateText, doc.internal.pageSize.width - 15 - doc.getTextWidth(dateText), 21)

      // Metadata
      if (config.metadata) {
        let yPos = 45
        doc.setFontSize(10)
        doc.setFont(CONFIG.fonts.primary, 'bold')
        Object.entries(config.metadata).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 15, yPos)
          yPos += 6
        })
      }

      // Table data
      const tableHeaders = columns.map(col => col.header)
      const tableRows = data.map(item => 
        columns.map(col => {
          const value = col.key.includes('.') 
            ? col.key.split('.').reduce((obj, key) => obj?.[key], item)
            : item[col.key]
          return col.formatter ? col.formatter(value) : (value?.toString() || '--')
        })
      )

      // Generate table
      autoTable(doc, {
  startY: config.metadata ? 65 : 45,
  head: [tableHeaders],
  body: tableRows,
  theme: 'grid',
  styles: {
    fontSize: 8,
    cellPadding: 2,
    halign: 'center',
    lineColor: CONFIG.colors.border,
    lineWidth: 0.1,
  },
  headStyles: {
    fillColor: CONFIG.colors.primary,
    textColor: 255,
    fontStyle: 'bold',
  },
  alternateRowStyles: {
    fillColor: CONFIG.colors.background,
  },
  // columnStyles: columns.reduce((acc, col, idx) => {
  //   if (col.width) acc[idx] = { cellWidth: col.width }
  //   return acc
  // }, {} as any),

  tableWidth: 'auto', 

  margin: { left: 15, right: 15 },
  didDrawPage: () => {
    if (doc.getCurrentPageInfo().pageNumber > 1) {
      doc.setFontSize(12)
      doc.setFont(CONFIG.fonts.primary, 'bold')
      doc.setTextColor(...CONFIG.colors.tertiary)
      doc.text(title, 15, 10)
    }
  },
})

      // Footer with page numbers
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setDrawColor(...CONFIG.colors.border)
        doc.setLineWidth(0.5)
        doc.line(15, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 15, doc.internal.pageSize.height - 15)
        
        doc.setFontSize(9)
        doc.setFont(CONFIG.fonts.primary, 'normal'); 
        doc.setTextColor(150, 150, 150);
        doc.text(`© ${companyName}`, 15, doc.internal.pageSize.height - 10)
        
        const pageText = `Page ${i} of ${pageCount}`
        const pageWidth = doc.getTextWidth(pageText)
        doc.text(pageText, doc.internal.pageSize.width - 15 - pageWidth, doc.internal.pageSize.height - 10)
      }

      doc.save(filename)
      toast.success('PDF downloaded successfully')
    } catch (error) {
      console.error('PDF Export Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export PDF')
    }
  }

  const exportToExcel = async (
    data: any[], 
    columns: ExportColumn[], 
    config: ExportConfig = {}
  ) => {
    try {
      if (!data?.length) throw new Error('No data available for Excel export')

      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet('Data Report')
      const companyName = config.companyName || CONFIG.company.name
      const title = config.title || 'Data Report'
      const filename = config.filename || `${title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

      // Company title
      const titleRow = worksheet.addRow([companyName])
      titleRow.font = { bold: true, size: 16, color: { argb: '000000' } }
      titleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0B100' } }
      titleRow.alignment = { horizontal: 'center' }
      worksheet.mergeCells(`A1:${String.fromCharCode(64 + columns.length)}1`)

      // Report title
      const subtitleRow = worksheet.addRow([title])
      subtitleRow.font = { bold: true, size: 14, color: { argb: '000000' } }
      subtitleRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE58A' } }
      subtitleRow.alignment = { horizontal: 'center' }
      worksheet.mergeCells(`A2:${String.fromCharCode(64 + columns.length)}2`)

      // Metadata
      if (config.metadata) {
        Object.entries(config.metadata).forEach(([key, value]) => {
          worksheet.addRow([`${key}: ${value}`])
        })
      }
      worksheet.addRow([`Generated: ${formatDate(new Date())}`])
      worksheet.addRow([]) // Spacer

      // Headers
      const headerRow = worksheet.addRow(columns.map(col => col.header))
      headerRow.eachCell(cell => {
        cell.font = { bold: true, size: 12, color: { argb: '000000' } }
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F0B100' } }
        cell.alignment = { vertical: 'middle', horizontal: 'center' }
        cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
      })

      // Data rows
      data.forEach(item => {
        const rowData = columns.map(col => {
          const value = col.key.includes('.') 
            ? col.key.split('.').reduce((obj, key) => obj?.[key], item)
            : item[col.key]
          return col.formatter ? col.formatter(value) : (value?.toString() || '--')
        })
        
        const dataRow = worksheet.addRow(rowData)
        dataRow.eachCell(cell => {
          cell.font = { size: 11 }
          cell.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } }
        })
      })

      // Column widths
      worksheet.columns = columns.map(col => ({ width: col.width || 20 }))

      // Footer
      worksheet.addRow([])
      const footerRow = worksheet.addRow([`© ${new Date().getFullYear()} ${companyName}`])
      footerRow.font = { italic: true }
      worksheet.mergeCells(`A${footerRow.number}:${String.fromCharCode(64 + columns.length)}${footerRow.number}`)

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      })
      saveAs(blob, filename)
      toast.success('Excel file downloaded successfully')
    } catch (error) {
      console.error('Excel Export Error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to export Excel file')
    }
  }

  return { exportToPDF, exportToExcel }
}