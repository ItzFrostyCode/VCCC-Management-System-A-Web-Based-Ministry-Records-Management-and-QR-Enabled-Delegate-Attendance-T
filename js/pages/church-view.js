import { requireAuth } from '../supabase.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { timelineService } from '../services/timeline.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc, formatDate } from '../utils/helper.js';

let currentChurchId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    highlightNav()
    injectMobileNav()
    initGuide()

    const urlParams = new URLSearchParams(window.location.search)
    currentChurchId = urlParams.get('id')

    if (!currentChurchId) {
      window.location.href = 'church.html'
      return
    }

    const btnBack = document.getElementById('btn-back')
    if (btnBack) {
      btnBack.addEventListener('click', () => history.back())
    }

    await loadData(currentChurchId)
    setupModals()
  } catch (err) {
    console.error('Church View init failed:', err)
    alert('Failed to initialize page: ' + err.message)
  }
})

async function loadData(id) {
  try {
    const [church, history, timeline, offspring] = await Promise.all([
      churchService.fetchById(id),
      assignmentService.fetchByChurch(id),
      timelineService.fetchChurchTimeline(id),
      churchService.fetchOffspring(id)
    ])

    // Fetch district info for leader name
    let district = null
    if (church.district_id) {
       district = await districtService.fetchById(church.district_id)
    }

    renderChurchInfo(church, district)
    renderCurrentPastor(history)
    renderStats(church, history)
    renderTimeline(timeline)
    renderDistrictContext(district)
    renderChurchLineage(church, offspring)

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

function renderChurchLineage(church, offspring) {
  const container = document.getElementById('church-lineage-tree')
  if (!container) return

  let html = ''

  // 1. Mother Church (Parent)
  html += `
    <div class="lineage-section-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      Mother Church
    </div>
  `
  if (church.mother_church_id) {
    html += `
      <a href="church-view.html?id=${church.mother_church_id}" class="lineage-node lineage-parent">
        <div class="lineage-avatar">${esc(church.mother_name.charAt(0))}</div>
        <div class="lineage-node-info">
          <div class="lineage-node-name">${esc(church.mother_name)}</div>
          <div class="lineage-node-sub">Source / Planting Church</div>
        </div>
        <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </a>
    `
  } else {
    html += `
      <div class="lineage-node lineage-empty">
        <div class="lineage-avatar" style="background:var(--bg-body); color:var(--text-3);"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <div class="lineage-node-info">
          <div class="lineage-node-name" style="color:var(--text-3);">Independent / Legacy</div>
          <div class="lineage-node-sub">No recorded mother church</div>
        </div>
      </div>
    `
  }

  // 2. Current Church (Central)
  html += `
    <div class="lineage-section-label" style="margin-top:24px;">Current Profile</div>
    <div class="lineage-node" style="border-color:var(--red); background:#fff5f5; cursor:default;">
      <div class="lineage-avatar" style="background:var(--red); color:white;">${esc(church.church_name.charAt(0))}</div>
      <div class="lineage-node-info">
        <div class="lineage-node-name" style="color:var(--red); font-weight:800;">${esc(church.church_name)}</div>
        <div class="lineage-node-sub">Pioneered by ${esc(church.pioneer_name || 'Unknown')}</div>
      </div>
    </div>
  `

  // 3. Daughter Churches (Children)
  html += `
    <div class="lineage-section-label" style="margin-top:24px;">Daughter Churches (${offspring.length})</div>
  `

  if (offspring.length > 0) {
    html += `
      <div class="lineage-tree-wrapper">
        <div class="lineage-tree-line"></div>
        ${offspring.map(child => `
          <div class="lineage-tree-item">
            <a href="church-view.html?id=${child.id}" class="lineage-node lineage-child">
              <div class="lineage-avatar">${esc(child.church_name.charAt(0))}</div>
              <div class="lineage-node-info">
                <div class="lineage-node-name">${esc(child.church_name)}</div>
                <div class="lineage-node-sub">${esc(child.district_name)} District</div>
              </div>
              <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
            </a>
          </div>
        `).join('')}
      </div>
    `
  } else {
    html += `
      <div class="lineage-node lineage-empty">
        <div class="lineage-avatar" style="background:var(--bg-body); color:var(--text-3);"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
        <div class="lineage-node-info">
          <div class="lineage-node-name" style="color:var(--text-3);">No Daughters Recorded</div>
          <div class="lineage-node-sub">This church hasn't pioneered other locations yet</div>
        </div>
      </div>
    `
  }

  container.innerHTML = html
}

function renderTimeline(timeline) {
  const container = document.getElementById('master-timeline')
  if (!timeline || timeline.length === 0) {
    container.innerHTML = '<div style="color:var(--text-3); font-size:14px; padding:16px;">No historical events recorded.</div>'
    return
  }

  container.innerHTML = timeline.map((item, index) => {
    let icon = ''
    let dateStr = timelineService.formatPrecisionDate(item.date, item.precision)
    
    if (item.type === 'PASTOR_ASSIGNED') {
      icon = '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
    } else if (item.type === 'PASTOR_LEFT') {
      icon = '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>'
    } else if (item.type === 'RANK_ACHIEVED') {
      icon = '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>'
    } else {
      icon = '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
    }

    const isActive = index === 0;

    return `
      <div class="timeline-item ${isActive ? 'active' : ''}">
        <div class="timeline-dot" style="display:flex;align-items:center;justify-content:center;color:var(--red);">
           <!-- Small dot, icon usually too big here but we can leave empty or tiny dot -->
        </div>
        <div class="timeline-content">
          <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
            <div style="font-weight:700; color:var(--text); font-size:14px; display:flex; align-items:center; gap:8px;">
               <div style="width:24px; height:24px; background:var(--red-light); color:var(--red); border-radius:4px; display:flex; align-items:center; justify-content:center;">
                  ${icon}
               </div>
               ${esc(item.title)}
            </div>
            <div style="font-size:12px; color:var(--text-3); font-weight:600;">${dateStr}</div>
          </div>
          <div style="font-size:13px; color:var(--text-2); margin-bottom:4px;">${esc(item.subtitle)}</div>
          ${item.notes ? `<div style="font-size:13px; color:var(--text); background:var(--bg-body); padding:8px 12px; border-radius:8px; margin-top:8px; border:1px solid var(--border);">${esc(item.notes)}</div>` : ''}
          ${item.pastor_id ? `<div style="margin-top:8px;"><a href="pastor-view.html?id=${item.pastor_id}" style="font-size:12px; color:var(--red); text-decoration:none; font-weight:600;">View Profile &rarr;</a></div>` : ''}
        </div>
      </div>
    `
  }).join('')
}

function setupModals() {
  window.openHistoricalModal = async () => {
    const modal = document.getElementById('modal-historical')
    modal.classList.add('open')
    
    // Load pastors into select
    try {
      const pastors = await pastorService.fetchAll()
      const select = document.getElementById('hist-pastor')
      select.innerHTML = '<option value="">-- Select Pastor --</option>' + 
        pastors.map(p => `<option value="${p.id}">${esc(p.last_name)}, ${esc(p.first_name)}</option>`).join('')
    } catch(err) {
      console.error(err)
    }
  }

  window.closeModal = (id) => {
    document.getElementById(id).classList.remove('open')
  }

  const histForm = document.getElementById('form-historical')
  if (histForm) {
    histForm.onsubmit = submitHistorical
  }
}

async function submitHistorical(e) {
  e.preventDefault()
  const btn = document.getElementById('btn-submit-historical')
  const originalText = btn.textContent

  try {
    btn.textContent = 'Saving...'
    btn.disabled = true

    const data = {
      church_id: currentChurchId,
      pastor_id: document.getElementById('hist-pastor').value,
      role_code: document.getElementById('hist-role').value,
      event_type: document.getElementById('hist-event').value,
      start_date: document.getElementById('hist-start').value,
      end_date: document.getElementById('hist-end').value,
      notes: document.getElementById('hist-notes').value || null,
      status_code: 'pulled_out', // Historical means it's finished
      is_primary: false,
      precision_flag: 'exact'
    }

    if (!data.pastor_id) throw new Error("Please select a pastor.");
    if (new Date(data.start_date) > new Date(data.end_date)) {
      throw new Error("Start date cannot be after End date.");
    }

    await assignmentService.create(data)

    window.closeModal('modal-historical')
    await loadData(currentChurchId)
    document.getElementById('form-historical').reset()

  } catch (err) {
    console.error(err)
    alert('Failed to save record: ' + err.message)
  } finally {
    btn.textContent = originalText
    btn.disabled = false
  }
}
