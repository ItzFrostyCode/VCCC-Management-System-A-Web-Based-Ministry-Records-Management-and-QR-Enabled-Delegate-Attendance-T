import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { showExportProgress, hideExportProgress, formatExcelDate, safeValue } from './common-export.js'

/**
 * Export Conferences list to Excel.
 * @param {Array} conferences - Array of conference objects:
 *   { id, title, theme, location, start_date, end_date }
 */
export async function exportConferences(conferences = []) {
  showExportProgress('Preparing conference export…')

  const workbook  = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Conferences')

  // ── Column definitions ──────────────────────────────────────────────────
  worksheet.columns = [
    { header: '#',          key: 'no',         width: 6  },
    { header: 'TITLE',      key: 'title',       width: 40 },
    { header: 'THEME',      key: 'theme',       width: 32 },
    { header: 'LOCATION',   key: 'location',    width: 32 },
    { header: 'START DATE', key: 'start_date',  width: 16 },
    { header: 'END DATE',   key: 'end_date',    width: 16 },
    { header: 'DAYS',       key: 'days',        width: 8  },
  ]

  // ── Header row styling ───────────────────────────────────────────────────
  const headerRow = worksheet.getRow(1)
  headerRow.height = 22
  headerRow.font   = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
  headerRow.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } } // slate-800
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF0F172A' } } }
  })

  // ── Helper: compute conference duration in days ──────────────────────────
  const getDays = (start, end) => {
    if (!start || !end) return '—'
    const s = new Date(start)
    const e = new Date(end)
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
    return diff > 0 ? diff : '—'
  }


  // ── Data rows ─────────────────────────────────────────────────────────────
  // Sort newest first
  const sorted = [...conferences].sort((a, b) => {
    const da = a.start_date ? new Date(a.start_date).getTime() : 0
    const db = b.start_date ? new Date(b.start_date).getTime() : 0
    return db - da
  })

  sorted.forEach((conf, i) => {
    const bgColor = i % 2 === 0 ? 'FFFAFAFA' : 'FFFFFFFF'
    const row = worksheet.addRow({
      no:         i + 1,
      title:      conf.title    || '—',
      theme:      conf.theme    || '—',
      location:   safeValue(conf.location),
      start_date: formatExcelDate(conf.start_date),
      end_date:   formatExcelDate(conf.end_date),
      days:       getDays(conf.start_date, conf.end_date),
    })

    row.height = 17

    row.eachCell({ includeEmpty: false }, cell => {
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgColor } }
      cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
    })

    // Center # and DAYS columns
    row.getCell('no').alignment   = { vertical: 'middle', horizontal: 'center' }
    row.getCell('days').alignment = { vertical: 'middle', horizontal: 'center' }
  })

  // ── Total row ─────────────────────────────────────────────────────────────
  const totalRow = worksheet.addRow({
    no: '', title: `Total: ${conferences.length} conference(s)`,
    theme: '', location: '', start_date: '', end_date: '', days: ''
  })
  totalRow.height = 18
  totalRow.font   = { bold: true, italic: true, color: { argb: 'FF555555' } }
  worksheet.mergeCells(`B${totalRow.number}:G${totalRow.number}`)
  totalRow.eachCell({ includeEmpty: false }, cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } }
  })

  // ── Download ─────────────────────────────────────────────────────────────
  showExportProgress('Generating file…')
  const buffer   = await workbook.xlsx.writeBuffer()
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `VCCC_Conferences_${new Date().toISOString().split('T')[0]}.xlsx`

  saveAs(blob, fileName)

  showExportProgress('Export complete!')
  hideExportProgress(3000)
}
