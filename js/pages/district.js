import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc } from '../utils/helper.js';
import { createSearchSelect } from '../../components/search-select/search-select.js';

let allDistricts = []
let allChurches  = []
let allPastors   = []
let allActiveAssignments = {} // church_id -> { pastor_id, pastor_name }
let openDistrictIds = new Set()
let selLeader = null

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('District: DOMContentLoaded start')
  // Global error handler for UI
  window.onerror = function(msg, url, line) {
    console.error('GLOBAL ERROR:', msg, 'at', url, ':', line)
    const tree = document.getElementById('district-tree')
    if (tree) tree.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Script Error:</strong><br>${msg}<br><small>Line: ${line}</small></div>`
  }

  try {
    console.log('District: auth check...')
    await requireAuth()
    console.log('District: nav/guide init...')
    highlightNav()
    injectMobileNav()
    initGuide()

    console.log('District: fetching data...')
    await initData()
    console.log('District: init selects...')
    initLeaderSelect()
    initAssignPastorSelect()
    console.log('District: binding events...')
    bindEvents()
    console.log('District: rendering...')
    renderDistricts()
    console.log('District: init complete')
  } catch (err) {
    console.error('District page init failed:', err)
    const tree = document.getElementById('district-tree')
    if (tree) tree.innerHTML = `<div class="empty-state" style="color:var(--red)"><strong>Initialization Error:</strong><br>${esc(err.message)}</div>`
  }
})

async function initData() {
  try {
    console.log('initData: Starting Promise.all...')
    const [districts, churches, pastors, assignments] = await Promise.all([
      districtService.fetchAll(),
      churchService.fetchAll(),
      pastorService.fetchAll(),
      assignmentService.fetchAll()
    ])
    console.log('initData: Promise.all success', { d: !!districts, c: !!churches, p: !!pastors, a: !!assignments })
    
    allDistricts = districts  || []
    allChurches  = churches   || []
    allPastors   = pastors    || []

    allActiveAssignments = {}
    ;(assignments || []).forEach(a => {
      if (a.status_code === 'active' && !a.end_date) {
        allActiveAssignments[a.church_id] = { pastor_id: a.pastor_id, pastor_name: a.pastor_name, assignment_id: a.id }
      }
    })
  } catch (e) {
    console.error('initData failed:', e)
    const tree = document.getElementById('district-tree')
    if (tree) tree.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Database Error:</strong><br>${esc(e.message)}</div>`
  }
}

function initLeaderSelect() {
  const wrap = document.getElementById('f-leader-sel')
  if (!wrap) return
  
  const options = [{ value: '', label: '-- Select Pastor --' }, ...allPastors.map(p => ({
    value: p.id,
    label: p.full_name
  }))]

  if (selLeader) {
    selLeader.setOptions(options)
  } else {
    selLeader = createSearchSelect(wrap, options, '-- Select Pastor --')
  }
}

function initAssignPastorSelect() {
  const sel = document.getElementById('assign-pastor-select')
  if (!sel) return
  sel.innerHTML = '<option value="">-- Select Pastor --</option>' +
    allPastors.map(p => `<option value="${p.id}">${esc(p.full_name)}</option>`).join('')
}

// ── Toggle ─────────────────────────────────────────────────────
function toggleDistrict(id) {
  if (openDistrictIds.has(id)) openDistrictIds.delete(id)
  else openDistrictIds.add(id)
  renderDistricts()
}

// ── Render ───────────────────────────────────────────────
function renderDistricts() {
  const tree  = document.getElementById('district-tree')
  const count = document.getElementById('district-count')
  if (!tree) return

  if (!allDistricts.length) {
    tree.innerHTML = `<div class="empty-state"><div class="empty-title">No districts found</div></div>`
    if (count) count.textContent = '0 total'
    return
  }

  tree.innerHTML = [...allDistricts]
    .sort((a, b) => a.district_name.localeCompare(b.district_name))
    .map(d => {
      const leader = allPastors.find(p => p.id === d.leader_pastor_id)
      const isOpen = openDistrictIds.has(d.id)
      const distChurches = allChurches
        .filter(c => c.district_id === d.id)
        .sort((a, b) => a.church_name.localeCompare(b.church_name))
      const color = d.theme_color || '#e83820'
      const churchCount = distChurches.length
      const vacantCount = distChurches.filter(c => !allActiveAssignments[c.id]).length
      const leaderInitial = leader ? leader.full_name.charAt(0).toUpperCase() : '?'

      return `
        <div class="dist-card ${isOpen ? 'open' : ''}" data-id="${d.id}" style="--dist-color: ${color};">
          <div class="dist-card-header btn-toggle-dist">

            <div class="dist-card-body">
              <div class="dist-card-top">
                <div class="dist-card-avatar" style="background:${color}20; color:${color}; border:1.5px solid ${color}40;">${leaderInitial}</div>
                <div class="dist-card-meta">
                  <div class="dist-card-name">${esc(d.district_name)}</div>
                  <div class="dist-card-leader">${leader ? esc(leader.full_name) : '<span style="opacity:0.5;font-style:italic;">No leader assigned</span>'}</div>
                </div>
                <svg class="dist-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              <div class="dist-card-stats">
                <div class="dist-stat"><span class="dist-stat-val" style="color:${color};">${churchCount}</span><span class="dist-stat-lbl">Churches</span></div>
                <div class="dist-stat-sep"></div>
                <div class="dist-stat"><span class="dist-stat-val ${vacantCount > 0 ? 'dist-stat-warn' : ''}">${vacantCount}</span><span class="dist-stat-lbl">Vacant</span></div>
                <div class="dist-stat-sep"></div>
                <div class="dist-stat"><span class="dist-stat-val">${churchCount - vacantCount}</span><span class="dist-stat-lbl">Occupied</span></div>
              </div>
            </div>
          </div>
          <div class="dist-card-actions">
            <button class="dist-action-btn btn-view-district" title="View Report">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
              View
            </button>
            <button class="dist-action-btn btn-add-church-dist" title="Add Church">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              Add Church
            </button>
            <button class="dist-action-btn btn-dist-settings" title="Edit">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              Edit
            </button>
          </div>
          <div class="dist-church-panel ${!isOpen ? 'collapsed' : ''}">
            ${churchCount === 0
              ? `<div class="dist-no-churches">No churches assigned to this district yet.</div>`
              : `<div class="dist-church-grid">
                  ${distChurches.map(c => {
                    const active = allActiveAssignments[c.id]
                    const isVacant = !active
                    return `
                      <div class="dist-church-chip ${isVacant ? 'vacant' : ''}">
                        <div class="dist-church-chip-dot" style="background:${isVacant ? '#e83820' : color};"></div>
                        <div class="dist-church-chip-body">
                          <div class="dist-church-chip-name">${esc(c.church_name)}</div>
                          <div class="dist-church-chip-pastor">
                            ${active
                              ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:10px;height:10px;flex-shrink:0;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>${esc(active.pastor_name)}`
                              : `<button class="dist-assign-btn btn-assign-pastor" data-id="${c.id}">+ Assign</button>`
                            }
                          </div>
                        </div>
                        <div class="dist-church-chip-foot">
                          <a href="church-view.html?id=${c.id}" class="dist-chip-link" title="View">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                          </a>
                          <button class="dist-chip-unlink btn-unlink-church-action" title="Remove" data-church="${c.id}" data-dist="${d.id}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        </div>
                      </div>`
                  }).join('')}
                </div>`
            }
          </div>
        </div>`
    }).join('')

  if (count) count.textContent = `${allDistricts.length} total`

  tree.querySelectorAll('.dist-card').forEach(card => {
    const id = card.dataset.id
    card.querySelector('.btn-toggle-dist').onclick = () => toggleDistrict(id)
    card.querySelector('.btn-view-district').onclick = (e) => { e.stopPropagation(); window.location.href = `district-view.html?id=${id}` }
    card.querySelector('.btn-add-church-dist').onclick = (e) => { e.stopPropagation(); openChurchModal(id) }
    card.querySelector('.btn-dist-settings').onclick = (e) => { e.stopPropagation(); openDistrictSettings(id) }

    card.querySelectorAll('.btn-assign-pastor').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); openAssignModal(btn.dataset.id) }
    })
    card.querySelectorAll('.btn-unlink-church-action').forEach(btn => {
      btn.onclick = (e) => { e.stopPropagation(); removeFromDistrict(btn.dataset.church, btn.dataset.dist) }
    })
  })
}



// ── District Modal ─────────────────────────────────────────────
function openDistrictSettings(id) {
  const d = allDistricts.find(x => x.id === id)
  if (!d) return
  document.getElementById('modal-title').textContent    = 'Update District'
  document.getElementById('district-id').value          = d.id
  document.getElementById('f-name').value               = d.district_name  || ''
  document.getElementById('f-color').value              = d.theme_color    || '#e83820'
  document.getElementById('color-hex').textContent      = (d.theme_color   || '#E83820').toUpperCase()
  if (selLeader) selLeader.setValue(d.leader_pastor_id || '')
  document.getElementById('f-notes').value              = d.notes          || ''
  const delBtn = document.getElementById('btn-delete-district')
  if (delBtn) delBtn.style.display = 'block'
  document.getElementById('district-modal-overlay').classList.add('open')
}

async function deleteDistrict() {
  const id   = document.getElementById('district-id').value
  const dist = allDistricts.find(d => d.id === id)
  if (!dist) return
  if (!confirm(`Delete "${dist.district_name}"? Churches will be unassigned.`)) return
  try {
    await districtService.remove(id)
    closeAllModals()
    await initData()
    renderDistricts()
  } catch (err) { alert('Error deleting district: ' + err.message) }
}

// ── Church Assign Modal ────────────────────────────────────────
function openChurchModal(distId) {
  document.getElementById('nested-church-form').reset()
  document.getElementById('n-f-dist-id').value = distId
  toggleChurchMode('select')
  const radios = document.getElementsByName('church-mode')
  if (radios.length) radios[0].checked = true

  const unassigned = allChurches.filter(c => !c.district_id)
  const sel = document.getElementById('n-f-select-church')
  if (sel) {
    sel.innerHTML = unassigned.length
      ? '<option value="">-- Choose Church --</option>' + unassigned.map(c => `<option value="${c.id}">${esc(c.church_name)}</option>`).join('')
      : '<option value="">-- No Unassigned Churches --</option>'
  }
  document.getElementById('nested-church-modal-overlay').classList.add('open')
}

function toggleChurchMode(val) {
  const panSelect = document.getElementById('mode-select-church')
  const panCreate = document.getElementById('mode-create-church')
  if (panSelect) panSelect.style.display = val === 'select' ? 'block' : 'none'
  if (panCreate) panCreate.style.display = val === 'create' ? 'block' : 'none'
}

// ── Pastor Assign Modal ────────────────────────────────────────
function openAssignModal(churchId) {
  document.getElementById('assign-church-id').value = churchId
  document.getElementById('assignment-modal-overlay').classList.add('open')
}

// ── Remove Church from District ────────────────────────────────
async function removeFromDistrict(churchId, distId) {
  const ch   = allChurches.find(c => c.id === churchId)
  const dist = allDistricts.find(d => d.id === distId)
  if (!ch || !dist) return
  if (!confirm(`Remove "${ch.church_name}" from "${dist.district_name}"?`)) return
  try {
    await churchService.update(churchId, { ...ch, district_id: null })
    await initData()
    renderDistricts()
  } catch (err) { alert('Error: ' + err.message) }
}

// ── Close Modals ───────────────────────────────────────────────
function closeAllModals() {
  ['district-modal-overlay', 'nested-church-modal-overlay', 'assignment-modal-overlay'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.classList.remove('open')
  })
}

// ── Bind Events ────────────────────────────────────────────────
function bindEvents() {
  const btnLogout = document.getElementById('btn-logout')
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await authService.signOut()
      window.location.href = '/login.html'
    })
  }

  const btnAddDist = document.getElementById('btn-add-district')
  if (btnAddDist) {
    btnAddDist.onclick = () => {
      document.getElementById('modal-title').textContent = 'Add New District'
      document.getElementById('district-id').value = ''
      document.getElementById('district-form').reset()
      if (selLeader) selLeader.reset()
      document.getElementById('color-hex').textContent = '#E83820'
      const delBtn = document.getElementById('btn-delete-district')
      if (delBtn) delBtn.style.display = 'none'
      document.getElementById('district-modal-overlay').classList.add('open')
    }
  }

  const churchModeControl = document.getElementById('church-mode-control')
  if (churchModeControl) {
    churchModeControl.addEventListener('change', (e) => {
      if (e.target.name === 'church-mode') toggleChurchMode(e.target.value)
    })
  }

  const colorInput = document.getElementById('f-color')
  if (colorInput) colorInput.oninput = e => {
    document.getElementById('color-hex').textContent = e.target.value.toUpperCase()
  }

  const delBtn = document.getElementById('btn-delete-district')
  if (delBtn) delBtn.onclick = deleteDistrict

  ;['btn-cancel-modal', 'btn-close-modal', 'btn-cancel-nested-modal', 'btn-close-nested-modal',
    'btn-cancel-assign-modal', 'btn-close-assign-modal'].forEach(id => {
    const btn = document.getElementById(id)
    if (btn) btn.onclick = closeAllModals
  })

  const distForm = document.getElementById('district-form')
  if (distForm) {
    distForm.onsubmit = async (e) => {
      e.preventDefault()
      const id = document.getElementById('district-id').value
      const payload = {
        district_name:    document.getElementById('f-name').value.trim(),
        theme_color:      document.getElementById('f-color').value,
        leader_pastor_id: selLeader ? selLeader.getValue() : null,
        notes:            document.getElementById('f-notes').value.trim()
      }
      if (!payload.district_name) return alert('District name is required.')
      try {
        if (id) await districtService.update(id, payload)
        else     await districtService.create(payload)
        closeAllModals()
        await initData()
        initLeaderSelect()
        renderDistricts()
      } catch (err) {
        if (err.code === '23505') alert('A district with this name already exists.')
        else alert('Error: ' + err.message)
      }
    }
  }

  const churchForm = document.getElementById('nested-church-form')
  if (churchForm) {
    churchForm.onsubmit = async (e) => {
      e.preventDefault()
      const distId = document.getElementById('n-f-dist-id').value
      const mode   = document.querySelector('input[name="church-mode"]:checked')?.value || 'select'
      try {
        if (mode === 'select') {
          const churchId = document.getElementById('n-f-select-church').value
          if (!churchId) return alert('Please select a church.')
          const church = allChurches.find(c => c.id === churchId)
          if (!church) return
          await churchService.update(churchId, { ...church, district_id: distId })
        } else {
          const cName = document.getElementById('n-f-name')?.value.trim()
          const cAddr = document.getElementById('n-f-address')?.value.trim()
          const cScope = document.querySelector('input[name="n-f-type"]:checked')?.value || 'local'
          const cNotes = document.getElementById('n-f-notes')?.value.trim()
          if (!cName) return alert('Church name is required.')
          await churchService.create({
            church_name: cName, church_address: cAddr,
            church_scope: cScope, district_id: distId, notes: cNotes
          })
        }
        closeAllModals()
        await initData()
        renderDistricts()
      } catch (err) {
        if (err.code === '23505') alert('Church already exists in this district.')
        else alert('Error: ' + err.message)
      }
    }
  }

  const assignForm = document.getElementById('assignment-form')
  if (assignForm) {
    assignForm.onsubmit = async (e) => {
      e.preventDefault()
      const churchId  = document.getElementById('assign-church-id').value
      const pastorId  = document.getElementById('assign-pastor-select').value
      if (!pastorId) return alert('Please select a pastor.')
      const startDate = new Date().toISOString().split('T')[0]
      try {
        const existing = await assignmentService.fetchActiveByPastor(pastorId)
        if (existing) await assignmentService.close(existing.id, startDate, 'transferred')
        await assignmentService.transferPastor({
          pastor_id: pastorId, church_id: churchId,
          role_code: 'Lead Pastor', event_type: 'Transfer',
          transfer_date: startDate, notes: 'Assigned via District Tree'
        })
        closeAllModals()
        await initData()
        renderDistricts()
      } catch (err) { alert('Error: ' + err.message) }
    }
  }
}
