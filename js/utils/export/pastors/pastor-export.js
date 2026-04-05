import {
  ensureExcelJS,
  imageUrlToBase64,
  showExportProgress,
  hideExportProgress,
} from '../common-export.js'

/**
 * Exports pastor information to an .xlsx file with embedded images.
 * Images are anchored to the cell area, which is the Excel-native way to place images in a sheet.
 *
 * @param {Array} pastors - List of pastor objects.
 * @param {Object} options - Options for inclusion/exclusion.
 */
export async function exportPastorInfo(pastors, options = {}) {
  const {
    includePastorImage = true,
    includeWifeImage = true,
    includeBirthdates = true,
    includeImageSourceData = false, // optional: store image URL in a hidden helper column
  } = options

  showExportProgress('Preparing Excel export...')
  await ensureExcelJS()

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'VCCC Management System'
  workbook.lastModifiedBy = 'VCCC Management System'
  workbook.created = new Date()
  workbook.modified = new Date()

  const worksheet = workbook.addWorksheet('Pastors Information', {
    views: [{ state: 'frozen', ySplit: 1 }],
  })

  const columns = []

  if (includePastorImage) {
    columns.push({ header: 'Pastor Image', key: 'p_img', width: 22 })
    if (includeImageSourceData) {
      columns.push({ header: 'Pastor Image Source', key: 'p_img_src', width: 30, hidden: true })
    }
  }

  columns.push({ header: 'Pastor Name', key: 'p_name', width: 35 })

  if (includeBirthdates) {
    columns.push({ header: 'Pastor Birthdate', key: 'p_bday', width: 18 })
  }

  if (includeWifeImage) {
    columns.push({ header: 'Wife Image', key: 'w_img', width: 22 })
    if (includeImageSourceData) {
      columns.push({ header: 'Wife Image Source', key: 'w_img_src', width: 30, hidden: true })
    }
  }

  columns.push({ header: 'Wife Name', key: 'w_name', width: 35 })

  if (includeBirthdates) {
    columns.push({ header: 'Wife Birthdate', key: 'w_bday', width: 18 })
  }

  columns.push({ header: 'Contact', key: 'contact', width: 22 })

  worksheet.columns = columns

  // Header style
  const headRow = worksheet.getRow(1)
  headRow.height = 28
  headRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  headRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' },
  }
  headRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }

  // Helper: find column index by key
  const getColIndex = (key) => columns.findIndex((c) => c.key === key)

  // Helper: format row text
  const safeText = (v) => {
    if (v === null || v === undefined || v === '') return 'NA'
    return String(v)
  }

  // Helper: add border/alignment to all cells in a row
  const styleDataRow = (row) => {
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.alignment = {
        vertical: 'middle',
        horizontal: 'center',
        wrapText: true,
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      }
    })
  }

  // Add Data
  let rowIndex = 2

  for (const p of pastors) {
    showExportProgress(`Processing ${p.full_name || 'Unknown pastor'}...`)

    const rowData = {
      p_name: safeText(p.full_name).toUpperCase(),
      w_name: safeText(p.wife_name).toUpperCase(),
      contact: safeText(p.contact_number),
    }

    if (includeBirthdates) {
      rowData.p_bday = safeText(p.birthdate)
      rowData.w_bday = safeText(p.wife_birthdate)
    }

    if (includeImageSourceData) {
      if (includePastorImage) rowData.p_img_src = safeText(p.pastor_image_url)
      if (includeWifeImage) rowData.w_img_src = safeText(p.wife_image_url)
    }

    const row = worksheet.addRow(rowData)

    // Make the row tall enough for images
    row.height = (includePastorImage || includeWifeImage) ? 112.5 : 24
    styleDataRow(row)

    // Embed pastor image
    if (includePastorImage && p.pastor_image_url) {
      try {
        const b64 = await imageUrlToBase64(p.pastor_image_url)
        if (b64) {
          const imageId = workbook.addImage({
            base64: b64,
            extension: 'png',
          })

          const colIdx = getColIndex('p_img')
          if (colIdx !== -1) {
            worksheet.addImage(imageId, {
              tl: { col: colIdx, row: rowIndex - 1 },
              br: { col: colIdx + 1, row: rowIndex },
              editAs: 'twoCell',
            })
          }
        }
      } catch (err) {
        console.warn(`Could not add pastor image for ${p.full_name}`, err)
      }
    }

    // Embed wife image
    if (includeWifeImage && p.wife_image_url) {
      try {
        const b64 = await imageUrlToBase64(p.wife_image_url)
        if (b64) {
          const imageId = workbook.addImage({
            base64: b64,
            extension: 'png',
          })

          const colIdx = getColIndex('w_img')
          if (colIdx !== -1) {
            worksheet.addImage(imageId, {
              tl: { col: colIdx, row: rowIndex - 1 },
              br: { col: colIdx + 1, row: rowIndex },
              editAs: 'twoCell',
            })
          }
        }
      } catch (err) {
        console.warn(`Could not add wife image for ${p.full_name}`, err)
      }
    }

    rowIndex++
  }

  // Improve readability
  worksheet.eachRow((row, number) => {
    if (number > 1) {
      row.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    }
  })

  // Optional: make the sheet print nicely
  worksheet.properties.defaultRowHeight = 24
  worksheet.pageSetup.orientation = 'landscape'
  worksheet.pageSetup.fitToPage = true
  worksheet.pageSetup.fitToWidth = 1
  worksheet.pageSetup.fitToHeight = 0

  showExportProgress('Generating file...')
  const buffer = await workbook.xlsx.writeBuffer()

  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })

  // Using global saveAs from common-export.js/script tag
  saveAs(blob, `Pastor_Information_${new Date().toISOString().split('T')[0]}.xlsx`)
  showExportProgress('Export complete!')
  hideExportProgress(3000)
}
