import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { imageUrlToBase64, showExportProgress, hideExportProgress, lightenHex, safeValue, formatExcelDate } from './common-export.js'


/**
 * Multi-Sheet Matrix export for disciples:
 * EACH DISTRICT gets its own tab (sheet) at the bottom.
 * 
 * Row 1: District Name (Merged Header)
 * Row 2: Church Names (One per column)
 * Row 3: Pastor Images
 * Row 4: Pastor Names
 * Row 5+: List of Disciples
 */
export async function exportDisciplesHierarchical(districts, churches, pastors, disciples) {
  showExportProgress('Preparing Multi-Sheet Disciples export...')

  const workbook = new ExcelJS.Workbook()
  const sortedDistricts = [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name))

  for (const dist of sortedDistricts) {
    const distChurches = churches.filter(c => String(c.district_id) === String(dist.id))
      .sort((a, b) => a.church_name.localeCompare(b.church_name))
    
    if (distChurches.length === 0) continue

    // Add a new worksheet for each district (clamped to 31 chars as per Excel limit)
    // Also remove invalid sheet name characters: [ ] * ? / \
    const sheetName = (dist.district_name || 'District').substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '')
    const worksheet = workbook.addWorksheet(sheetName)

    let currentRow = 1
    const districtHeaderRow = currentRow
    const churchNameRow = currentRow + 1
    const pastorImageRow = currentRow + 2
    const pastorNameRow = currentRow + 3
    const disciplesStartRow = currentRow + 4

    // 1. District Merged Header
    const distRow = worksheet.getRow(districtHeaderRow)
    distRow.height = 22
    const distCell = distRow.getCell(1)
    distCell.value = dist.district_name
    
    // District-specific light coloring
    const bgColor = lightenHex(dist.theme_color, 92) // 92% light
    const textColor = 'FF000000' // Black text for better readability
    
    distCell.font = { bold: true, size: 16, color: { argb: textColor } }
    distCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: bgColor }
    }
    distCell.alignment = { vertical: 'middle', horizontal: 'center' }

    // Merge District cell across all its churches
    if (distChurches.length > 1) {
      worksheet.mergeCells(districtHeaderRow, 1, districtHeaderRow, distChurches.length)
    }

    // Set common row heights for this sheet
    worksheet.getRow(churchNameRow).height = 20
    worksheet.getRow(pastorImageRow).height = 100
    worksheet.getRow(pastorNameRow).height = 18

    // Iterate through each church to fill its column
    for (let i = 0; i < distChurches.length; i++) {
      const church = distChurches[i]
      const colIndex = i + 1 // 1-indexed for column
      
      // Ensure column is wide enough
      worksheet.getColumn(colIndex).width = 40

      const pastor = pastors.find(p => String(p.church_id) === String(church.id))
      const churchDisciples = disciples.filter(d => String(d.church_id) === String(church.id))
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
      
      // --- CHURCH NAME ---
      const cCell = worksheet.getRow(churchNameRow).getCell(colIndex)
      cCell.value = church.church_name
      cCell.font = { bold: true, size: 12 }
      cCell.alignment = { vertical: 'middle', horizontal: 'center' }
      cCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF0F0F0' }
      }

      // --- PASTOR IMAGE ---
      if (pastor && pastor.pastor_image_url) {
        try {
          const b64 = await imageUrlToBase64(pastor.pastor_image_url)
          if (b64) {
            const imageId = workbook.addImage({
              base64: b64,
              extension: 'png',
            })
            // Position image in the column
            worksheet.addImage(imageId, {
              tl: { col: colIndex - 1 + 0.15, row: pastorImageRow - 1 + 0.1 },
              ext: { width: 85, height: 85 },
              editAs: 'oneCell'
            })
          }
        } catch (err) {
          console.warn(`Failed image for ${church.church_name}:`, err)
        }
      }

      // --- PASTOR NAME ---
      const pCell = worksheet.getRow(pastorNameRow).getCell(colIndex)
      pCell.value = pastor ? `PASTOR: ${pastor.full_name}` : 'No Pastor assigned'
      pCell.font = { bold: true, color: { argb: 'FFC00000' } } // Red for pastor name emphasis
      pCell.alignment = { vertical: 'middle', horizontal: 'center' }

      // --- DISCIPLES LIST ---
      for (let j = 0; j < churchDisciples.length; j++) {
        const dRow = worksheet.getRow(disciplesStartRow + j)
        dRow.height = 15
        const dCell = dRow.getCell(colIndex)
        dCell.value = `• ${churchDisciples[j].full_name}`
        dCell.alignment = { horizontal: 'left' }
      }
    }

    // Apply borders to all filled cells in this worksheet
    worksheet.eachRow({ includeEmpty: false }, (row) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        // We only add borders if there's content or it's within our church range
        if (cell.value || (cell.row >= districtHeaderRow && cell.col <= distChurches.length)) {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
        }
      })
    })
  }

  // Trigger download
  showExportProgress('Generating Multi-Sheet file...')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `Disciples_Regional_Report_${new Date().toISOString().split('T')[0]}.xlsx`
  
  if (typeof saveAs !== 'undefined') {
    saveAs(blob, fileName)
  } else {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
  }
  
  showExportProgress('Export complete!')
  hideExportProgress(3000)
}
/**
 * Simple A-Z export of all disciples
 */
export async function exportDisciplesAll(disciples) {
  showExportProgress('Preparing All Disciples export...')

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('All Disciples')

  worksheet.columns = [
    { header: 'Full Name', key: 'name', width: 40 },
    { header: 'Church', key: 'church', width: 30 },
    { header: 'District', key: 'district', width: 25 }
  ]

  // Header Style
  const headRow = worksheet.getRow(1)
  headRow.height = 24
  headRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  headRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } }
  headRow.alignment = { vertical: 'middle', horizontal: 'center' }

  const sorted = [...disciples].sort((a, b) => a.full_name.localeCompare(b.full_name))
  
  sorted.forEach(d => {
    worksheet.addRow({
      name: (d.full_name || '').toUpperCase(),
      church: (d.church_name || '').toUpperCase(),
      district: (d.district_name || '').toUpperCase()
    })
  })

  // Borders
  worksheet.eachRow((row, i) => {
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
      if (i > 1) cell.alignment = { vertical: 'middle' }
    })
  })

  showExportProgress('Generating file...')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const fileName = `All_Disciples_${new Date().toISOString().split('T')[0]}.xlsx`

  if (typeof saveAs !== 'undefined') {
    saveAs(blob, fileName)
  } else {
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
    window.URL.revokeObjectURL(url)
  }

  showExportProgress('Export complete!')
  hideExportProgress(2000)
}
