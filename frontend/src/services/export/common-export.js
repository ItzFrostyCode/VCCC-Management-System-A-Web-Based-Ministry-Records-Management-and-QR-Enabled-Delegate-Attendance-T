/**
 * Common utilities for modular export system.
 */

/**
 * Fetches an image URL and converts it to a Base64 string for Excel embedding.
 */
export async function imageUrlToBase64(url) {
  if (!url) return null
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (err) {
    console.error('Failed to convert image to base64:', err)
    return null
  }
}

/**
 * Standard progress notification.
 * Dynamically creates the toast UI if it doesn't exist.
 */
export function showExportProgress(message) {
  let toast = document.getElementById('export-toast')
  
  if (!toast) {
    // 1. Create Style if not exists
    if (!document.getElementById('export-toast-style')) {
      const style = document.createElement('style')
      style.id = 'export-toast-style'
      style.textContent = `
        #export-toast { 
          display:none; position:fixed; bottom:24px; right:24px; 
          background:var(--bg-card, #fff); border:1px solid var(--border, #eee); 
          padding:12px 20px; border-radius:12px; box-shadow:var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.12)); 
          z-index:10000; align-items:center; gap:12px; 
          animation: exportSlideUp 0.3s ease-out;
        }
        @keyframes exportSlideUp { from { transform: translateY(20px); opacity:0; } to { transform: translateY(0); opacity:1; } }
        @keyframes exportSpin { to { transform: rotate(360deg); } }
        #export-toast .loader { 
          width:18px; height:18px; border:2px solid var(--border, #eee); 
          border-top-color:var(--blue, #007bff); border-radius:50%; 
          animation: exportSpin 0.8s linear infinite; 
        }
        #export-toast .msg { font-size:14px; font-weight:500; color:var(--text, #333); }
      `
      document.head.appendChild(style)
    }

    // 2. Create Element
    toast = document.createElement('div')
    toast.id = 'export-toast'
    toast.innerHTML = `
      <div class="loader"></div>
      <span class="msg" id="export-msg"></span>
    `
    document.body.appendChild(toast)
  }

  const msgEl = document.getElementById('export-msg')
  if (msgEl) msgEl.textContent = message
  
  toast.style.display = 'flex'
}

/**
 * Hides the progress notification after a delay.
 */
export function hideExportProgress(delay = 3000) {
  setTimeout(() => {
    const toast = document.getElementById('export-toast')
    if (toast) toast.style.display = 'none'
  }, delay)
}

/**
 * Formats a date string into a human-readable format for Excel.
 * Handles ISO strings and nulls.
 * @param {string|Date} dateVal - The date to format
 * @param {boolean} includeTime - Whether to include time in the output
 */
export function formatExcelDate(dateVal, includeTime = false) {
  if (!dateVal) return '—'
  try {
    const date = new Date(dateVal)
    if (isNaN(date.getTime())) return '—'
    
    const options = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    }
    
    if (includeTime) {
      options.hour = '2-digit'
      options.minute = '2-digit'
    }
    
    return date.toLocaleDateString('en-US', options)
  } catch (err) {
    return '—'
  }
}

/**
 * Ensures a value is safe for Excel (no nulls, consistent fallback).
 */
export function safeValue(val, fallback = '—') {
  if (val === null || val === undefined || val === '') return fallback
  return val
}

/**
 * Lighten a hex color for Excel ARGB background.
 */
export function lightenHex(hex, percent = 92) {
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
