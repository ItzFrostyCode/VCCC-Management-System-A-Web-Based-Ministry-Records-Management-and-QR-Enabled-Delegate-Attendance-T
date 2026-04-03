/**
 * Common utilities for modular export system.
 */

// Load script helper
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

/**
 * Ensures ExcelJS and FileSaver are loaded.
 */
export async function ensureExcelJS() {
  await Promise.all([
    loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.3.0/dist/exceljs.min.js'),
    loadScript('https://cdn.jsdelivr.net/npm/file-saver@2.0.5/dist/FileSaver.min.js')
  ])
}

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
