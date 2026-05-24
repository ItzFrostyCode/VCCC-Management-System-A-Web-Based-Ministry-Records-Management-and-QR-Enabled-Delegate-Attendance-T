import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { showExportProgress, hideExportProgress, lightenHex, safeValue, formatExcelDate } from './common-export.js'

/**
 * Convert a hex color to a full ARGB string (e.g. '#b71c1c' → 'FFB71C1C').
 */
function hexToArgb(hex) {
  if (!hex || !hex.startsWith('#')) return 'FF333333';
  return 'FF' + hex.replace('#', '').toUpperCase().padStart(6, '0');
}


export async function exportDistricts(districts = [], churches = [], assignments = [], pastors = [], options = {}) {
  const { includeVacantInfo = true } = options;
  showExportProgress('Preparing district export…');

  const workbook       = new ExcelJS.Workbook();
  const worksheet      = workbook.addWorksheet('Districts');
  const sortedDistricts = [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name));
  
  // ── Calculate Max Column Widths ──────────────────────────────────────────
  let maxChurchWidth = 25; // Minimum width
  let maxPastorWidth = 20; // Minimum width
  
  (churches || []).forEach(c => {
    if (c.church_name && c.church_name.length > maxChurchWidth) {
      maxChurchWidth = Math.min(c.church_name.length + 5, 50); // Cap at 50
    }
  });

  (pastors || []).forEach(p => {
    if (p.full_name && p.full_name.length > maxPastorWidth) {
      maxPastorWidth = Math.min(p.full_name.length + 5, 40); // Cap at 40
    }
  });

  // Build active pastor map: church_id → pastor full_name
  const activePastorMap = {};
  (assignments || []).forEach(a => {
    if (a.status_code === 'active' && !a.end_date) {
      const pastor = (pastors || []).find(p => String(p.id) === String(a.pastor_id));
      if (pastor) activePastorMap[a.church_id] = pastor.full_name;
    }
  });

  let currentRow = 1;

  for (const district of sortedDistricts) {
    const color     = district.theme_color || '#cccccc';
    const argbBold  = hexToArgb(color);
    const argbLight = lightenHex(color);

    // Group churches for this district
    const distChurches = (churches || [])
      .filter(c => String(c.district_id) === String(district.id))
      .sort((a, b) => a.church_name.localeCompare(b.church_name));

    // ── District header row ────────────────────────────────────────────────
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const distHeaderCell = worksheet.getCell(`A${currentRow}`);
    distHeaderCell.value     = district.district_name.toUpperCase();
    distHeaderCell.font      = { bold: true, size: 13, color: { argb: 'FFFFFFFF' } };
    distHeaderCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbBold } };
    distHeaderCell.alignment = { vertical: 'middle', horizontal: 'center' };
    distHeaderCell.border    = { bottom: { style: 'medium' } };
    worksheet.getRow(currentRow).height = 24;
    currentRow++;

    // Column sub-headers
    const colHeaders = ['#', 'CHURCH NAME', 'CURRENT PASTOR', 'ADDRESS'];
    const colWidths  = [6, maxChurchWidth, maxPastorWidth, 45];

    colHeaders.forEach((h, ci) => {
      const col = worksheet.getColumn(ci + 1);
      if (col.width < colWidths[ci]) col.width = colWidths[ci];

      const cell = worksheet.getCell(currentRow, ci + 1);
      cell.value     = h;
      cell.font      = { bold: true, size: 10, color: { argb: 'FF333333' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbLight } };
      cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'center' : 'left' };
      cell.border    = { bottom: { style: 'thin' }, top: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    });
    worksheet.getRow(currentRow).height = 18;
    currentRow++;

    // ── Church data rows ───────────────────────────────────────────────────
    if (distChurches.length === 0) {
      worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
      const emptyCell = worksheet.getCell(`A${currentRow}`);
      emptyCell.value     = 'No churches in this district.';
      emptyCell.font      = { italic: true, color: { argb: 'FF888888' } };
      emptyCell.alignment = { vertical: 'middle', horizontal: 'center' };
      worksheet.getRow(currentRow).height = 16;
      currentRow++;
    } else {
      distChurches.forEach((church, idx) => {
        const rowBg = idx % 2 === 0 ? 'FFFFFFFF' : 'FFF9F9F9';
        const values = [
          idx + 1,
          church.church_name || '—',
          activePastorMap[church.id] || 'Vacant',
          church.church_address   || '—',
        ];

        values.forEach((val, ci) => {
          const cell = worksheet.getCell(currentRow, ci + 1);
          cell.value     = val;
          cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
          cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
          cell.alignment = { vertical: 'middle', horizontal: ci === 0 ? 'center' : 'left', wrapText: false };
        });

        // Highlight "Vacant" in red if option is enabled
        const pastorCell = worksheet.getCell(currentRow, 3);
        if (includeVacantInfo && pastorCell.value === 'Vacant') {
          pastorCell.font = { italic: true, color: { argb: 'FFCC0000' } };
        }

        worksheet.getRow(currentRow).height = 15;
        currentRow++;
      });
    }

    // ── Summary row ────────────────────────────────────────────────────────
    worksheet.mergeCells(`A${currentRow}:D${currentRow}`);
    const summaryCell = worksheet.getCell(`A${currentRow}`);
    summaryCell.value     = `Total churches: ${distChurches.length}   |   Vacant: ${distChurches.filter(c => !activePastorMap[c.id]).length}`;
    summaryCell.font      = { bold: true, size: 10, color: { argb: 'FF555555' } };
    summaryCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbLight } };
    summaryCell.alignment = { vertical: 'middle', horizontal: 'right' };
    worksheet.getRow(currentRow).height = 16;
    currentRow++;

    // Spacer row between districts
    currentRow++;
  }

  // ── Download ──────────────────────────────────────────────────────────────
  showExportProgress('Generating file…');
  const buffer   = await workbook.xlsx.writeBuffer();
  const blob     = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const fileName = `VCCC_Districts_${new Date().toISOString().split('T')[0]}.xlsx`;

  if (typeof saveAs !== 'undefined') {
    saveAs(blob, fileName);
  } else {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);
  }

  showExportProgress('Export complete!');
  hideExportProgress(3000);
}
