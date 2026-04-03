import { ensureExcelJS, showExportProgress, hideExportProgress } from '../common-export.js'

/**
 * Lighten a hex color for Excel ARGB
 */
function lightenHex(hex, percent = 90) {
  if (!hex || !hex.startsWith('#')) return 'FFF8F8F8'
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  
  let r = parseInt(h.substring(0, 2), 16)
  let g = parseInt(h.substring(2, 4), 16)
  let b = parseInt(h.substring(4, 6), 16)
  
  r = Math.floor(r + (255 - r) * (percent / 100))
  g = Math.floor(g + (255 - g) * (percent / 100))
  b = Math.floor(b + (255 - b) * (percent / 100))

  return 'FF' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase()
}

/**
 * Export Church List to Excel (Single Sheet)
 * @param {string} mode - 'all' or 'district'
 * @param {Array} districts - List of districts
 * @param {Array} churches - List of churches
 * @param {Array} pastors - List of pastors (optional)
 * @param {Array} assignments - List of assignments
 */
export async function exportChurches(mode, districts, churches, pastors, assignments) {
  const msg = mode === 'all' ? 'Exporting All Churches (A-Z)...' : 'Exporting Churches by District...'
  showExportProgress(msg)
  await ensureExcelJS()

  const workbook = new ExcelJS.Workbook()

  // ── Mode 1: ALL CHURCH (A to Z) ───────────────────────────────────────────
  if (mode === 'all') {
    const worksheet = workbook.addWorksheet('All Churches')
    worksheet.columns = [
      { header: 'CHURCHES', key: 'name', width: 60 }
    ]

    // Style Header Row
    const headRow = worksheet.getRow(1)
    headRow.height = 20
    headRow.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
    headRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF333333' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
    })

    const sorted = [...churches].sort((a, b) => a.church_name.localeCompare(b.church_name))
    sorted.forEach(c => {
      const row = worksheet.addRow({ name: c.church_name })
      row.height = 15
    })

    // Final Styling (Mode 1)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      row.eachCell({ includeEmpty: false }, cell => {
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
    })

  } 
  // ── Mode 2: CHURCH INFO (Multi-Sheet by District) ────────────────────────
  else if (mode === 'info') {
    const sortedDists = [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name))
    
    // Active Pastor Map (church_id -> pastor object)
    const activePastorMap = {}
    ;(assignments || []).forEach(a => {
      if (a.status_code === 'active' && !a.end_date) {
        activePastorMap[a.church_id] = (pastors || []).find(p => String(p.id) === String(a.pastor_id))
      }
    })

    sortedDists.forEach(dist => {
      const distChurches = churches.filter(c => String(c.district_id) === String(dist.id))
        .sort((a, b) => a.church_name.localeCompare(b.church_name))
      
      if (distChurches.length === 0) return

      // Sanitize sheet name (Max 31 chars, no invalid chars)
      let sheetName = dist.district_name.substring(0, 31).replace(/[\[\]\*\?\/\\]/g, '') || 'District'
      const ws = workbook.addWorksheet(sheetName)

      ws.columns = [
        { header: 'CHURCH NAME', key: 'name', width: 35 },
        { header: 'CHURCH ADDRESS', key: 'address', width: 50 },
        { header: 'PASTOR’S NAME', key: 'pastor', width: 30 },
        { header: 'WIFE’S NAME', key: 'wife', width: 25 },
        { header: 'CONTACT NUMBER', key: 'contact', width: 25 }
      ]

      // Style Sheet Header
      const hRow = ws.getRow(1)
      hRow.height = 20
      hRow.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
      hRow.eachCell(c => {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF444444' } }
        c.alignment = { vertical: 'middle', horizontal: 'center' }
      })

      distChurches.forEach(c => {
        const pastor = activePastorMap[c.id]
        const row = ws.addRow({
          name: c.church_name,
          address: c.church_address || '',
          pastor: pastor ? pastor.full_name : 'Vacant',
          wife: pastor ? (pastor.wife_name || '') : '',
          contact: pastor ? (pastor.contact_number || '') : ''
        })
        row.height = 15
      })

      // Final Sheet Styling
      ws.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (rowNum === 1) return
        row.eachCell({ includeEmpty: false }, cell => {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
          cell.alignment = { vertical: 'middle', horizontal: 'left' }
        })
      })
    })

  }
  // ── Mode 3: BY DISTRICT (Horizontal Layout for District Page) ────────────
  else {
    const worksheet = workbook.addWorksheet('District Report')
    const sortedDists = [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name))
    
    // 1. Group churches by district_id
    const churchesByDist = {}
    sortedDists.forEach(d => churchesByDist[d.id] = [])
    churches.forEach(c => {
      if (churchesByDist[c.district_id]) churchesByDist[c.district_id].push(c)
    })
    Object.values(churchesByDist).forEach(list => list.sort((a, b) => a.church_name.localeCompare(b.church_name)))

    // 2. Identify District Leader Church Assignments
    const leaderToChurchIds = {}
    sortedDists.forEach(d => {
      if (!d.leader_pastor_id) return
      const leaderAssign = (assignments || []).find(a => 
        String(a.pastor_id) === String(d.leader_pastor_id) && 
        a.status_code === 'active' && !a.end_date
      )
      if (leaderAssign) leaderToChurchIds[d.id] = leaderAssign.church_id
    })

    // 3. Setup Columns dynamically (Districts as Headers)
    worksheet.columns = sortedDists.map(d => ({
      header: d.district_name.toUpperCase(),
      key: d.id,
      width: 35
    }))

    // 4. Style the District Header Row (Top Row)
    const headRow = worksheet.getRow(1)
    headRow.height = 20
    headRow.font = { bold: true, size: 13, color: { argb: 'FF000000' } }
    headRow.eachCell(cell => {
      cell.fill = { type: 'pattern', pattern: 'none' } // Plain white
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = { bottom: { style: 'medium' } }
    })

    // 5. Fill Church Names vertically under district columns
    const maxChurches = Math.max(...Object.values(churchesByDist).map(l => l.length), 0)
    for (let i = 0; i < maxChurches; i++) {
      const rowData = {}
      sortedDists.forEach(d => {
        const church = churchesByDist[d.id][i]
        rowData[d.id] = church ? church.church_name : ''
      })
      
      const row = worksheet.addRow(rowData)
      row.height = 15
      
      // Highlight Leader's Church Name (Bold)
      sortedDists.forEach((d, colIdx) => {
        const church = churchesByDist[d.id][i]
        if (church && leaderToChurchIds[d.id] === church.id) {
          row.getCell(colIdx + 1).font = { bold: true, size: 12 }
        }
      })
    }

    // Styling for District Page layout (Mode 3)
    worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      row.eachCell({ includeEmpty: false }, (cell) => {
        if (cell.value) {
          cell.border = {
            top: { style: 'thin' }, left: { style: 'thin' },
            bottom: { style: 'thin' }, right: { style: 'thin' }
          }
        }
        cell.alignment = { vertical: 'middle', horizontal: 'left' }
      })
    })
  }

  // Trigger Download
  showExportProgress('Generating file...')
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const suffix = mode === 'all' ? 'All_List' : 'By_District'
  const fileName = `VCCC_Church_List_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`
  
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
