import { ensureExcelJS, showExportProgress, hideExportProgress } from '../common-export.js';

/**
 * Lighten a hex color for Excel ARGB background.
 */
function lightenHex(hex, percent = 92) {
  if (!hex || !hex.startsWith('#')) return 'FFF8F8F8';
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.floor(r + (255 - r) * (percent / 100));
  g = Math.floor(g + (255 - g) * (percent / 100));
  b = Math.floor(b + (255 - b) * (percent / 100));
  return 'FF' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Convert a hex color to a full ARGB string (e.g. '#b71c1c' → 'FFB71C1C').
 */
function hexToArgb(hex) {
  if (!hex || !hex.startsWith('#')) return 'FF333333';
  return 'FF' + hex.replace('#', '').toUpperCase().padStart(6, '0');
}

/**
 * Export Districts summary to Excel.
 * @param {Array} districts   - District objects: { id, district_name, theme_color, ... }
 * @param {Array} churches    - Church objects: { id, church_name, district_id, church_address }
 * @param {Array} assignments - Assignment objects (for active pastor lookup)
 * @param {Array} pastors     - Pastor objects: { id, full_name }
 */
export async function exportDistricts(districts = [], churches = [], assignments = [], pastors = []) {
  showExportProgress('Preparing district export…');
  await ensureExcelJS();

  const workbook       = new ExcelJS.Workbook();
  const worksheet      = workbook.addWorksheet('Districts');
  const sortedDistricts = [...districts].sort((a, b) => a.district_name.localeCompare(b.district_name));

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
    const colWidths  = [6, 36, 28, 45];

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

        // Highlight "Vacant" in red
        const pastorCell = worksheet.getCell(currentRow, 3);
        if (pastorCell.value === 'Vacant') {
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
