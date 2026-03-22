let allLogs = []
let currentPage = 1
const ITEMS_PER_PAGE = 20

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth()
  if (user && user.role !== 'Admin') {
    window.location.href = '../index.html'
    return
  }

  initEventListeners()
  await loadLogs()
})

function initEventListeners() {
  document.getElementById('btn-refresh').onclick = loadLogs
  document.getElementById('btn-prev').onclick = prevPage
  document.getElementById('btn-next').onclick = nextPage
}

async function loadLogs() {
  const body = document.getElementById('table-body')
  body.innerHTML = '<div class="empty-state">Fetching logs...</div>'

  try {
    const { data, error } = await db
      .from('audit_logs')
      .select(`
        *,
        users ( full_name, role )
      `)
      .order('timestamp', { ascending: false })
      .limit(200)

    if (error) throw error
    allLogs = data || []
    renderTable()
  } catch (err) {
    console.error(err)
    body.innerHTML = `<div class="empty-state" style="color:var(--red)">Failed to load logs: ${err.message}</div>`
  }
}

function renderTable() {
  const body = document.getElementById('table-body')
  document.getElementById('count-label').textContent = `${allLogs.length} logs`

  if (!allLogs.length) {
    body.innerHTML = '<div class="empty-state">No activity logs found.</div>'
    document.getElementById('pagination').style.display = 'none'
    return
  }

  const totalPages = Math.ceil(allLogs.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedItems = allLogs.slice(startIndex, endIndex)

  body.innerHTML = paginatedItems.map(log => `
    <div class="data-table-row" style="grid-template-columns: 180px 140px 140px 1fr 140px; font-size: 13px;">
      <div style="color:var(--text-2);" data-label="Time">${new Date(log.timestamp).toLocaleString()}</div>
      <div style="font-weight:600;" data-label="User">${esc(log.users?.full_name || 'System')} <small style="display:block; font-weight:400; color:var(--text-3);">${log.users?.role || ''}</small></div>
      <div style="color:var(--red); font-weight:700; font-size:11px;" data-label="Action">${log.action}</div>
      <div style="color:var(--text);" data-label="Details">${esc(log.details || '—')}</div>
      <div style="color:var(--text-3); font-size:11px;" data-label="Device">${esc(log.device_info || 'Unknown')}</div>
    </div>
  `).join('')

  document.getElementById('pagination').style.display = 'flex'
  document.getElementById('page-info').textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, allLogs.length)} of ${allLogs.length}`
  
  document.getElementById('btn-prev').disabled = (currentPage === 1)
  document.getElementById('btn-next').disabled = (currentPage === totalPages)
}

function prevPage() { if (currentPage > 1) { currentPage--; renderTable() } }
function nextPage() { if (currentPage < Math.ceil(allLogs.length/ITEMS_PER_PAGE)) { currentPage++; renderTable() } }

function esc(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}
