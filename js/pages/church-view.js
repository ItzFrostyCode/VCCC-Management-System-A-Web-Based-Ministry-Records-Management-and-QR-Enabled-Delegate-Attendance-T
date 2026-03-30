import { requireAuth } from '../supabase.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc, formatDate } from '../utils/helper.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    highlightNav()
    injectMobileNav()
    initGuide()

    const urlParams = new URLSearchParams(window.location.search)
    const churchId = urlParams.get('id')

    if (!churchId) {
      window.location.href = 'church.html'
      return
    }

    const btnBack = document.getElementById('btn-back')
    if (btnBack) {
      btnBack.addEventListener('click', () => history.back())
    }

    await loadData(churchId)
  } catch (err) {
    console.error('Church View init failed:', err)
    alert('Failed to initialize page: ' + err.message)
  }
})

async function loadData(id) {
  try {
    const [church, history] = await Promise.all([
      churchService.fetchById(id),
      assignmentService.fetchByChurch(id)
    ])

    // Fetch district info for leader name
    let district = null
    if (church.district_id) {
       district = await districtService.fetchById(church.district_id)
    }

    renderChurchInfo(church, district)
    renderCurrentPastor(history)
    renderStats(church, history)
    renderHistory(history)
    renderDistrictContext(district)

    document.getElementById('loading-state').style.display = 'none'
    document.getElementById('content-area').style.display = 'block'

  } catch (err) {
    console.error('Data load failed:', err)
    const loadingState = document.getElementById('loading-state')
    if (loadingState) {
      loadingState.innerHTML = `
        <div style="color:var(--red); padding:40px;">
          <h3>Error Loading Data</h3>
          <p>${esc(err.message)}</p>
          <button class="btn btn-ghost" id="btn-retry-load">Retry</button>
        </div>
      `
      const btnRetry = document.getElementById('btn-retry-load')
      if (btnRetry) btnRetry.onclick = () => location.reload()
    }
  }
}

function renderChurchInfo(c, d) {
  document.getElementById('c-name').textContent = c.church_name
  document.getElementById('c-scope').textContent = (c.church_scope || 'local').toUpperCase()
  document.getElementById('c-address').textContent = c.church_address || 'No address provided'
  document.getElementById('c-notes').textContent = c.notes || ''
  
  if (d && d.theme_color) {
    document.documentElement.style.setProperty('--district-theme', d.theme_color)
  }
}

function renderCurrentPastor(history) {
  const container = document.getElementById('current-pastor-container')
  const active = history.find(a => a.status_code === 'active' && !a.end_date)

  if (!active) {
    container.innerHTML = `
      <div class="pastor-card vacant">
        <div style="width:48px; height:48px; border-radius:50%; background:var(--red-light); color:var(--red); display:flex; align-items:center; justify-content:center;">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="pastor-info">
          <h4 style="color:var(--red);">VACANT / NEEDS ASSIGNMENT</h4>
          <p>No active pastor is currently assigned to this church.</p>
        </div>
        <div style="margin-left:auto;">
          <button class="btn btn-primary" id="btn-assign-now">Assign Pastor</button>
        </div>
      </div>
    `
    const btn = document.getElementById('btn-assign-now')
    if (btn) btn.onclick = () => window.location.href = 'assignment.html'
    return
  }

  container.innerHTML = `
    <div class="pastor-card">
      <div style="width:48px; height:48px; border-radius:50%; background:var(--red-light); color:var(--red); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:18px;">
        ${active.pastor_name.charAt(0)}
      </div>
      <div class="pastor-info">
        <h4>${esc(active.pastor_name)}</h4>
        <p>Current ${esc(active.role_code)} (${esc(active.event_type)}) since ${formatDate(active.start_date)}</p>
      </div>
      <div style="margin-left:auto;">
        <button class="btn btn-ghost" id="btn-view-active-profile">View Profile</button>
      </div>
    </div>
  `
  const btnView = document.getElementById('btn-view-active-profile')
  if (btnView) btnView.onclick = () => window.location.href = `pastor-view.html?id=${active.pastor_id}`
}

function renderStats(c, history) {
  const active = history.find(a => a.status_code === 'active' && !a.end_date)
  
  document.getElementById('stat-status').textContent = active ? 'Occupied' : 'Vacant'
  document.getElementById('stat-status').style.color = active ? '#2e7d32' : 'var(--red)'
  
  document.getElementById('stat-pastors').textContent = new Set(history.map(h => h.pastor_id)).size
  
  // Years Active (Since first assignment or created_at)
  if (history.length) {
    const sorted = [...history].sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
    const first = new Date(sorted[0].start_date)
    const diff = new Date().getFullYear() - first.getFullYear()
    document.getElementById('stat-years').textContent = diff + (diff === 1 ? ' Year' : ' Years')
  }

  document.getElementById('stat-district').textContent = c.district_name || 'N/A'
}

function renderDistrictContext(d) {
  if (!d) return
  document.getElementById('d-name').textContent = d.district_name
  document.getElementById('d-leader').querySelector('span').textContent = d.leader_name || 'No leader assigned'
  document.getElementById('d-notes').textContent = d.notes || ''
}

function renderHistory(history) {
  const tbody = document.getElementById('pastor-history')
  if (!history.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-3); padding:32px;">No pastoral history recorded.</td></tr>'
    return
  }

  tbody.innerHTML = history.map(h => `
    <tr>
      <td><a href="pastor-view.html?id=${h.pastor_id}" style="color:var(--red); font-weight:600; text-decoration:none;">${esc(h.pastor_name)}</a></td>
      <td>
        <div style="font-weight:500;">${formatDate(h.start_date)} — ${h.end_date ? formatDate(h.end_date) : 'Present'}</div>
      </td>
      <td>
        <span class="pill pill-ghost" style="font-size:11px;">${esc(h.role_code)}</span>
        <span class="pill pill-ghost" style="font-size:11px;">${esc(h.event_type)}</span>
      </td>
      <td style="color:var(--text-2); max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${esc(h.notes)}">${esc(h.notes)}</td>
    </tr>
  `).join('')
}
