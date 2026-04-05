import { db, requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { initGuide } from '../utils/guide.js';
import { esc } from '../utils/helper.js';
import { exportAuditLogs } from '../utils/export/admin_logs/export-logs.js';

let allLogs = []
let currentPage = 1
const ITEMS_PER_PAGE = 10

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const user = await requireAuth()
        if (user && user.role !== 'Admin') {
            window.location.href = '/index.html'
            return
        }

        // Initialize Layout
        const { initLayout } = await import('../layout.js');
        initLayout('Activity Logs');

        initGuide()
        initEventListeners()
        await loadLogs()
    } catch (err) { console.error('Logs init failed:', err) }
})

function initEventListeners() {
    document.getElementById('btn-refresh').onclick = loadLogs
    document.getElementById('btn-prev').onclick = prevPage
    document.getElementById('btn-next').onclick = nextPage
    document.getElementById('btn-export-logs').onclick = handleExportLogs
}

async function handleExportLogs() {
  if (!allLogs.length) {
    alert('No logs to export. Please load logs first.');
    return;
  }
  const mapped = allLogs.map(log => ({
    actor:   log.full_name || 'System',
    action:  log.action   || '—',
    details: log.details  || '—',
    time:    log.timestamp
  }));
  await exportAuditLogs(mapped);
}
async function loadLogs() {
  const body = document.getElementById('table-body')
  if (body) body.innerHTML = '<div class="empty-state">Fetching logs...</div>'

  try {
    const { data, error } = await db.rpc('get_audit_logs_v3');

    if (error) throw error
    allLogs = data || []
    renderTable()
  } catch (err) {
    console.error(err)
    if (body) body.innerHTML = `<div class="empty-state" style="color:var(--red)">Failed to load logs: ${err.message}</div>`
  }
}

function renderTable() {
  const body = document.getElementById('table-body')
  const countLabel = document.getElementById('count-label');
  if (countLabel) countLabel.textContent = `${allLogs.length} logs`

  if (!allLogs.length) {
    if (body) body.innerHTML = '<div class="empty-state">No activity logs found.</div>'
    const pagination = document.getElementById('pagination');
    if (pagination) pagination.style.display = 'none'
    return
  }

  const totalPages = Math.ceil(allLogs.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedItems = allLogs.slice(startIndex, endIndex)

  if (body) {
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
              <span class="log-user-name">${esc(log.full_name || 'System')}</span>
              <span class="log-user-role">${log.role || ''}</span>
            </div>
            <div class="log-action" data-label="Action">
              <span class="pill ${actionClass}">${log.action}</span>
            </div>
            <div class="log-details" data-label="Details" title="${esc(log.details)}">${esc(details)}</div>
            <div class="log-device" data-label="Device" title="${esc(log.device_info)}">${esc(log.device_info || 'Unknown')}</div>
          </div>
        `;
      }).join('');
  }

  const pagination = document.getElementById('pagination');
  if (pagination) pagination.style.display = 'flex'
  const pageInfo = document.getElementById('page-info');
  if (pageInfo) pageInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, allLogs.length)} of ${allLogs.length}`
  
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  if (btnPrev) btnPrev.disabled = (currentPage === 1)
  if (btnNext) btnNext.disabled = (currentPage === totalPages)
}

function prevPage() { if (currentPage > 1) { currentPage--; renderTable() } }
function nextPage() { if (currentPage < Math.ceil(allLogs.length/ITEMS_PER_PAGE)) { currentPage++; renderTable() } }
