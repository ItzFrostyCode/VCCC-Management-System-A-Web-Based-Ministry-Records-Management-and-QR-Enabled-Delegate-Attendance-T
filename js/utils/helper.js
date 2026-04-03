// ── Formatters ──────────────────────────────────────────── 
export function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatPartOfDay(part) {
  return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }[part] || part
}

export function formatMealLabel(dayNumber, partOfDay) {
  return `Day ${dayNumber} · ${formatPartOfDay(partOfDay)}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function calculateAge(birthdate) {
  if (!birthdate) return 0
  const birthDate = new Date(birthdate)
  if (isNaN(birthDate.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

export function hexToRgba(hex, alpha = 0.15) {
  if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return `rgba(150, 150, 150, ${alpha})`;
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return `rgba(150, 150, 150, ${alpha})`;
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}


// ── QR Payload ────────────────────────────────────────────
// Format: {"t":"PASTOR","id":"uuid"}
// t = delegate type, id = uuid (for WIFE, id = pastor's uuid)

export function encodeQR(delegateType, delegateId) {
  return JSON.stringify({ t: delegateType, id: delegateId })
}

export function decodeQR(raw) {
  try {
    const obj = JSON.parse(raw)
    if (!obj || !obj.t || !obj.id) return null
    if (!['PASTOR', 'WIFE', 'DISCIPLE'].includes(obj.t)) return null
    return { type: obj.t, id: obj.id }
  } catch {
    return null
  }
}