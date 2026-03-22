let allLogs = []
let currentPage = 1
const ITEMS_PER_PAGE = 10

document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth()
  if (user && user.role !== 'Admin') {
    window.location.href = '/index.html'
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

  body.innerHTML = paginatedItems.map(log => {
    const action = (log.action || '').toLowerCase();
    const actionClass = action.includes('login') ? 'pill-login' : action.includes('logout') ? 'pill-logout' : 'pill-gray';
    
    // Clean up details if it's just the User Agent string
    let details = log.details || '—';
    if (details.includes('Mozilla/') && details.includes('AppleWebKit')) {
      details = 'Browser session';
    }

    return `
      <div class="data-table-row cols-logs">
        <div class="log-time" data-label="Time">
          ${new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          <span style="display:block; opacity:0.6; font-size:10px;">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div class="log-user" data-label="User">
          <span class="log-user-name">${esc(log.users?.full_name || 'System')}</span>
          <span class="log-user-role">${log.users?.role || ''}</span>
        </div>
        <div class="log-action" data-label="Action">
          <span class="pill ${actionClass}">${log.action}</span>
        </div>
        <div class="log-details" data-label="Details" title="${esc(log.details)}">${esc(details)}</div>
        <div class="log-device" data-label="Device" title="${esc(log.device_info)}">${esc(log.device_info || 'Unknown')}</div>
      </div>
    `;
  }).join('');

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
