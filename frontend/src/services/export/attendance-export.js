import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { showExportProgress, hideExportProgress, safeValue } from './common-export.js'

/**
 * Exports the Attendance Matrix to a professional Excel report.
 * @param {Object} conference - The conference details
 * @param {Array} columns - The matrix columns (slots)
 * @param {Array} matrix - The matrix data (people and their attendance)
 */
export async function exportAttendanceMatrix(conference, columns, matrix) {
  showExportProgress('Preparing Attendance Matrix export...')

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'VCCC Management System'
  const worksheet = workbook.addWorksheet('Attendance Matrix', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }]
  })

  // 1. Define Columns
  const excelCols = [
    { header: 'ROLE', key: 'role', width: 12 },
    { header: 'DELEGATE NAME', key: 'name', width: 35 },
    { header: 'CHURCH', key: 'church', width: 35 }
  ]

  columns.forEach(col => {
    excelCols.push({
      header: col.label.toUpperCase(),
      key: col.id,
      width: 12
    })
  })

  worksheet.columns = excelCols

  // 2. Style Header
  const headRow = worksheet.getRow(1)
  headRow.height = 28
  headRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  headRow.eachCell((cell, colNum) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colNum <= 3 ? 'FF1E293B' : 'FF334155' } // Slate 800 for name info, 700 for slots
    }
    cell.border = {
      bottom: { style: 'medium', color: { argb: 'FF000000' } },
      right: { style: 'thin', color: { argb: 'FF475569' } }
    }
  })

  // 3. Add Data Rows
  matrix.forEach((person, idx) => {
    const rowData = {
      role: person.role,
      name: person.name.toUpperCase(),
      church: person.church.toUpperCase()
    }

    columns.forEach(col => {
      rowData[col.id] = person.attendance[col.id] ? 'PRESENT' : '—'
    })

    const row = worksheet.addRow(rowData)
    row.height = 20

    // Style the row
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      cell.alignment = { vertical: 'middle', horizontal: colNum <= 3 ? 'left' : 'center' }
      
      // Zebra striping
      if (idx % 2 !== 0) {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAFB' }
        }
      }

      // Borders
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      }

      // Conditional formatting for Attendance
      if (colNum > 3) {
        if (cell.value === 'PRESENT') {
          cell.font = { bold: true, color: { argb: 'FF059669' } } // Emerald 600
        } else {
          cell.font = { color: { argb: 'FFA1A1AA' } } // Zinc 400
        }
      }

      // Highlight Role
      if (colNum === 1) {
        cell.font = { bold: true, size: 9 }
        if (cell.value === 'PASTOR') cell.font.color = { argb: 'FF4F46E5' } // Indigo 600
        if (cell.value === 'WIFE') cell.font.color = { argb: 'FFE11D48' } // Rose 600
      }
    })
  })

  // 4. Page Setup
  worksheet.pageSetup.orientation = 'landscape'
  worksheet.pageSetup.fitToPage = true
  worksheet.pageSetup.fitToWidth = 1
  worksheet.pageSetup.fitToHeight = 0

  // 5. Save
  showExportProgress('Generating Attendance File...')
  const buffer = await workbook.xlsx.writeBuffer()
  const fileName = `Attendance_Matrix_${conference?.title || 'Report'}_${new Date().toISOString().split('T')[0]}.xlsx`
  
  saveAs(new Blob([buffer]), fileName)
  showExportProgress('Export complete!')
  hideExportProgress(3000)
}
