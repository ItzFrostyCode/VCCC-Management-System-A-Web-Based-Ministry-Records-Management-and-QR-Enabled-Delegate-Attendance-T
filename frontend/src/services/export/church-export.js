import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { showExportProgress, hideExportProgress, safeValue } from './common-export.js'

/**
 * Export Church List to Excel
 * Modes:
 * - 'all'     : one sheet, all churches sorted A-Z
 * - 'district': one sheet, grouped by district
 * - 'info'    : multiple sheets, one per district
 *
 * @param {string} mode - 'all' | 'district' | 'info'
 * @param {Array} districts - List of districts
 * @param {Array} churches - List of churches
 * @param {Array} pastors - List of pastors (optional)
 */
export async function exportChurches(mode, districts = [], churches = [], pastors = []) {
  const msg =
    mode === 'all'
      ? 'Exporting All Churches (A-Z)...'
      : mode === 'info'
        ? 'Exporting Church Info by District...'
        : 'Exporting Churches by District...'

  showExportProgress(msg)

  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'VCCC'
  workbook.created = new Date()

  const headerFill = 'FF334155'
  const borderColor = 'FFE2E8F0'

  const applyHeaderStyle = (row) => {
    row.height = 20
    row.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' } }
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: headerFill }
      }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: borderColor } },
        left: { style: 'thin', color: { argb: borderColor } },
        bottom: { style: 'thin', color: { argb: borderColor } },
        right: { style: 'thin', color: { argb: borderColor } }
      }
    })
  }

  const applyBodyStyle = (ws) => {
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return
      row.height = 18
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true }
        cell.border = {
          top: { style: 'thin', color: { argb: borderColor } },
          left: { style: 'thin', color: { argb: borderColor } },
          bottom: { style: 'thin', color: { argb: borderColor } },
          right: { style: 'thin', color: { argb: borderColor } }
        }
      })
    })
  }

  const sanitizeSheetName = (name, fallback = 'Sheet') => {
    const cleaned = String(name || fallback)
      .replace(/[\[\]\*\?\/\\:]/g, '')
      .trim()
    return cleaned.substring(0, 31) || fallback
  }

  const makeUniqueSheetName = (baseName) => {
    let name = sanitizeSheetName(baseName)
    if (!workbook.getWorksheet(name)) return name

    let i = 2
    while (workbook.getWorksheet(sanitizeSheetName(`${name}-${i}`))) i++
    return sanitizeSheetName(`${name}-${i}`)
  }

  const getPastorInfo = (church) => {
    const pastorName = safeValue(
      church.current_pastor_name ||
      church.pastor_name ||
      church.pastor ||
      'Vacant'
    )

    const pObj = pastors.find((p) =>
      String(p.id) === String(church.current_pastor_id) ||
      String(p.full_name || '').trim() === String(pastorName).trim()
    )

    return {
      pastorName,
      wifeName: pObj ? safeValue(pObj.wife_name) : '',
      contactNumber: pObj ? safeValue(pObj.contact_number) : ''
    }
  }

  try {
    // MODE 1: ALL CHURCHES
    if (mode === 'all') {
      const ws = workbook.addWorksheet('All Churches')
      ws.columns = [
        { header: 'CHURCHES', key: 'name', width: 60 }
      ]

      applyHeaderStyle(ws.getRow(1))

      const sorted = [...churches].sort((a, b) =>
        String(a.church_name || '').localeCompare(String(b.church_name || ''))
      )

      sorted.forEach((c) => {
        ws.addRow({ name: safeValue(c.church_name) })
      })

      applyBodyStyle(ws)
    }

    // MODE 2: BY DISTRICT (single sheet)
    else if (mode === 'district') {
      const ws = workbook.addWorksheet('By District')
      ws.columns = [
        { header: 'DISTRICT', key: 'district', width: 28 },
        { header: 'CHURCH NAME', key: 'name', width: 35 },
        { header: 'CHURCH ADDRESS', key: 'address', width: 50 },
        { header: 'PASTOR\'S NAME', key: 'pastor', width: 30 },
        { header: 'WIFE\'S NAME', key: 'wife', width: 25 },
        { header: 'CONTACT NUMBER', key: 'contact', width: 25 }
      ]

      applyHeaderStyle(ws.getRow(1))

      const districtMap = new Map()
      districts
        .slice()
        .sort((a, b) =>
          String(a.district_name || '').localeCompare(String(b.district_name || ''))
        )
        .forEach((d) => districtMap.set(String(d.id), d.district_name || 'Unknown District'))

      const sortedChurches = [...churches].sort((a, b) => {
        const da = districtMap.get(String(a.district_id)) || ''
        const db = districtMap.get(String(b.district_id)) || ''
        const dcmp = String(da).localeCompare(String(db))
        if (dcmp !== 0) return dcmp
        return String(a.church_name || '').localeCompare(String(b.church_name || ''))
      })

      sortedChurches.forEach((c) => {
        const pastorInfo = getPastorInfo(c)
        ws.addRow({
          district: safeValue(districtMap.get(String(c.district_id)) || 'Unknown District'),
          name: safeValue(c.church_name),
          address: safeValue(c.church_address),
          pastor: pastorInfo.pastorName,
          wife: pastorInfo.wifeName,
          contact: pastorInfo.contactNumber
        })
      })

      applyBodyStyle(ws)
    }

    // MODE 3: INFO (one sheet per district)
    else if (mode === 'info') {
      const sortedDists = [...districts].sort((a, b) =>
        String(a.district_name || '').localeCompare(String(b.district_name || ''))
      )

      sortedDists.forEach((dist) => {
        const distChurches = churches
          .filter((c) => String(c.district_id) === String(dist.id))
          .sort((a, b) =>
            String(a.church_name || '').localeCompare(String(b.church_name || ''))
          )

        if (distChurches.length === 0) return

        const ws = workbook.addWorksheet(makeUniqueSheetName(dist.district_name || 'District'))

        ws.columns = [
          { header: 'CHURCH NAME', key: 'name', width: 35 },
          { header: 'CHURCH ADDRESS', key: 'address', width: 50 },
          { header: 'PASTOR\'S NAME', key: 'pastor', width: 30 },
          { header: 'WIFE\'S NAME', key: 'wife', width: 25 },
          { header: 'CONTACT NUMBER', key: 'contact', width: 25 }
        ]

        applyHeaderStyle(ws.getRow(1))

        distChurches.forEach((c) => {
          const pastorInfo = getPastorInfo(c)
          ws.addRow({
            name: safeValue(c.church_name),
            address: safeValue(c.church_address),
            pastor: pastorInfo.pastorName,
            wife: pastorInfo.wifeName,
            contact: pastorInfo.contactNumber
          })
        })

        applyBodyStyle(ws)
      })
    }

    // fallback
    else {
      throw new Error(`Unknown export mode: ${mode}`)
    }

    showExportProgress('Generating file...')
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    })

    const suffix =
      mode === 'all' ? 'All_List' : mode === 'info' ? 'By_District_Info' : 'By_District'

    const fileName = `VCCC_Church_List_${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`

    saveAs(blob, fileName)

    showExportProgress('Export complete!')
    hideExportProgress(3000)
  } catch (error) {
    console.error('Export failed:', error)
    hideExportProgress(0)
    throw error
  }
}