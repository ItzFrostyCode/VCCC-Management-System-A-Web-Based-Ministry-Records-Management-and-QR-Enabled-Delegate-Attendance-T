import { ensureExcelJS, imageUrlToBase64, showExportProgress, hideExportProgress } from '../common-export.js'

/**
 * Exports pastor information to an .xlsx file.
 * @param {Array} pastors - List of pastor objects.
 * @param {Object} options - Options for inclusion/exclusion.
 */
export async function exportPastorInfo(pastors, options = {}) {
  const {
    includePastorImage = true,
    includeWifeImage = true,
    includeBirthdates = true
  } = options

  showExportProgress('Preparing Excel export...')
  await ensureExcelJS()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Pastors Information')

  // Define Columns
  const columns = []
  if (includePastorImage) columns.push({ header: 'Pastor Image', key: 'p_img', width: 15 })
  columns.push({ header: 'Pastor Name', key: 'p_name', width: 30 })
  if (includeBirthdates) columns.push({ header: 'Pastor Birthdate', key: 'p_bday', width: 15 })
  
  if (includeWifeImage) columns.push({ header: 'Wife Image', key: 'w_img', width: 15 })
  columns.push({ header: 'Wife Name', key: 'w_name', width: 30 })
  if (includeBirthdates) columns.push({ header: 'Wife Birthdate', key: 'w_bday', width: 15 })
  
  columns.push({ header: 'Contact', key: 'contact', width: 20 })

  worksheet.columns = columns

  const headRow = worksheet.getRow(1)
  headRow.height = 20
  headRow.font = { bold: true, size: 12 }
  headRow.alignment = { vertical: 'middle', horizontal: 'center' }

  // Add Data
  let rowIndex = 2
  for (const p of pastors) {
    showExportProgress(`Processing ${p.full_name}...`);
    
    // Build row data dynamically based on active columns
    const rowData = {};
    rowData.p_name = p.full_name;
    rowData.w_name = p.wife_name || 'NA';
    rowData.contact = p.contact_number || 'NA';

    if (includeBirthdates) {
      rowData.p_bday = p.birthdate || 'NA';
      rowData.w_bday = p.wife_birthdate || 'NA';
    }
    
    const row = worksheet.addRow(rowData)
    row.height = (includePastorImage || includeWifeImage) ? 60 : 15
    row.eachCell({ includeEmpty: false }, cell => {
      cell.alignment = { vertical: 'middle', horizontal: 'left' }
      cell.border = {
        top: { style: 'thin' }, left: { style: 'thin' },
        bottom: { style: 'thin' }, right: { style: 'thin' }
      }
    })

    // Embed Images (Only if columns exist)
    if (includePastorImage && p.pastor_image_url) {
      const b64 = await imageUrlToBase64(p.pastor_image_url)
      if (b64) {
        const imageId = workbook.addImage({
          base64: b64,
          extension: 'png',
        })
        worksheet.addImage(imageId, {
          tl: { col: columns.findIndex(c => c.key === 'p_img'), row: rowIndex - 1 },
          ext: { width: 60, height: 60 },
          editAs: 'oneCell'
        })
      }
    }

    if (includeWifeImage && p.wife_image_url) {
      const b64 = await imageUrlToBase64(p.wife_image_url)
      if (b64) {
        const imageId = workbook.addImage({
          base64: b64,
          extension: 'png',
        })
        worksheet.addImage(imageId, {
          tl: { col: columns.findIndex(c => c.key === 'w_img'), row: rowIndex - 1 },
          ext: { width: 60, height: 60 },
          editAs: 'oneCell'
        })
      }
    }

    rowIndex++
  }

  showExportProgress('Generating file...')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  saveAs(blob, `Pastor_Information_${new Date().toISOString().split('T')[0]}.xlsx`)
  showExportProgress('Export complete!')
  hideExportProgress(3000)
}
