import { db } from '../db.js';
import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc } from '../utils/helper.js';

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

        highlightNav()
        injectMobileNav()
        initGuide()

        initEventListeners()
        await loadLogs()
    } catch (err) { console.error('Logs init failed:', err) }
})

function initEventListeners() {
    const btnLogout = document.getElementById('btn-logout')
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await authService.signOut()
            window.location.href = '/login.html'
        })
    }

    document.getElementById('btn-refresh').onclick = loadLogs
    document.getElementById('btn-prev').onclick = prevPage
    document.getElementById('btn-next').onclick = nextPage

    document.getElementById('btn-create-user').onclick = () => {
        document.getElementById('create-user-modal').classList.add('open')
    }
    const closeModal = () => {
        document.getElementById('create-user-modal').classList.remove('open')
        document.getElementById('create-user-form').reset()
    }
    document.getElementById('btn-close-modal').onclick = closeModal
    document.getElementById('btn-close-modal-x').onclick = closeModal
    
    document.getElementById('create-user-form').onsubmit = handleCreateUser
}

async function handleCreateUser(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-user');
  const originalText = btn.textContent;
  btn.textContent = 'Creating...';
  btn.disabled = true;

  try {
    const payload = {
      p_full_name: document.getElementById('user-fullname').value.trim(),
      p_username: document.getElementById('user-username').value.trim(),
      p_password: document.getElementById('user-password').value.trim(),
      p_role: document.getElementById('user-role').value,
      p_scope: document.getElementById('user-scope').value.trim()
    };

    if (payload.p_password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
    }

    const { data, error } = await db.rpc('create_user_account', payload);
    if (error) throw error;

    const currentUser = authService.getCurrentUser();
    if (currentUser) {
        await authService.logAudit(currentUser.id, 'CREATE_ACCOUNT', `Created ${payload.p_role} account for ${payload.p_username}`);
    }

    alert('Account created successfully!');
    document.getElementById('btn-close-modal').click();
    loadLogs();
  } catch (err) {
    console.error('Account creation error:', err);
    alert('Failed to create account: ' + (err.message || 'Unknown error. Check console.'));
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
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
