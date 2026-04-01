import { db } from '../db.js';
import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { districtService } from '../services/district.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { discipleService } from '../services/disciple.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc } from '../utils/helper.js';
import { createSearchSelect } from '../../components/search-select/search-select.js';

let allChurches   = []
let allDistricts  = []
let allPastors    = []
let allPastorAssignments = {} // church_id -> pastor_name  (active only)
let editingId     = null
let currentPage   = 1
let filteredCount = 0
const ITEMS_PER_PAGE = 10

// Custom search-select
let selModalDistrict = null
let selModalPioneer  = null
let selModalMother    = null
let selFilterDistrict = null
let selFilterScope    = null

// Re-render when orientation/size crosses the mobile breakpoint
let _lastIsMobile = window.innerWidth <= 1024
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 1024
  if (nowMobile !== _lastIsMobile) {
    _lastIsMobile = nowMobile
    renderChurches()
  }
})

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Church: DOMContentLoaded start')
  // Global error handler for UI
  window.onerror = function(msg, url, line) {
    console.error('GLOBAL ERROR:', msg, 'at', url, ':', line)
    const list = document.getElementById('church-list')
    if (list) list.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Script Error:</strong><br>${msg}<br><small>Line: ${line}</small></div>`
  }

  try {
    console.log('Church: auth check...')
    await requireAuth()
    console.log('Church: nav/guide init...')
    highlightNav()
    injectMobileNav()
    initGuide()

    console.log('Church: fetching data...')
    await initData()
    console.log('Church: init search/selects...')
    initSearchSelect()
    console.log('Church: binding events...')
    bindEvents()
    console.log('Church: rendering...')
    renderChurches()
    console.log('Church: init complete')
  } catch (err) {
    console.error('Church page init failed:', err)
    const list = document.getElementById('church-list')
    if (list) list.innerHTML = `<div class="empty-state" style="color:var(--red)"><strong>Initialization Error:</strong><br>${esc(err.message)}</div>`
  }
})

async function initData() {
  try {
    console.log('initData: Starting Promise.all...')
    const [churches, districts, assignments, pastors] = await Promise.all([
      churchService.fetchAll(),
      districtService.fetchAll(),
      assignmentService.fetchAll(),
      pastorService.fetchAll()
    ])
    console.log('initData: Promise.all success', { c: !!churches, d: !!districts, a: !!assignments, p: !!pastors })

    allChurches  = churches  || []
    allDistricts = districts || []
    allPastors   = pastors   || []

    // Build active pastor lookup keyed by church_id
    allPastorAssignments = {}
    ;(assignments || []).forEach(a => {
      if (a.status_code === 'active' && !a.end_date) {
        allPastorAssignments[a.church_id] = a.pastor_name
      }
    })
  } catch (e) {
    console.error('initData failed:', e)
    const list = document.getElementById('church-list')
    if (list) list.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Database Error:</strong><br>${esc(e.message)}</div>`
  }
}

// ── Search-select for district ─────────────────────────────────
function initSearchSelect() {
  const wrap = document.getElementById('f-district')
  if (wrap) {
    selModalDistrict = createSearchSelect(
      wrap,
      [{ value: '', label: '-- Select District --' }, ...allDistricts.map(d => ({ value: d.id, label: d.district_name }))],
      '-- Select District --'
    )
  }

  const pWrap = document.getElementById('f-pioneer')
  if (pWrap) {
    selModalPioneer = createSearchSelect(
      pWrap,
      [{ value: '', label: '-- Select Pioneer --' }, ...allPastors.map(p => ({ value: p.id, label: p.full_name }))],
      '-- Select Pioneer --'
    )
  }

  const mWrap = document.getElementById('f-mother')
  if (mWrap) {
    selModalMother = createSearchSelect(
      mWrap,
      [{ value: '', label: '-- Select Mother Church --' }, ...allChurches.map(c => ({ value: c.id, label: c.church_name }))],
      '-- Select Mother Church --'
    )
  }

  const fDist = document.getElementById('filter-district')
  if (fDist) {
    selFilterDistrict = createSearchSelect(
      fDist,
      [{ value: '', label: 'All Districts' }, ...allDistricts.map(d => ({ value: d.id, label: d.district_name }))],
      'All Districts'
    )
    selFilterDistrict.onChange = () => { currentPage = 1; renderChurches(); }
  }

  const fScope = document.getElementById('filter-scope')
  if (fScope) {
    selFilterScope = createSearchSelect(
      fScope,
      [
        { value: '', label: 'All Scopes' },
        { value: 'local', label: 'Local' },
        { value: 'international', label: 'International' }
      ],
      'All Scopes'
    )
    selFilterScope.onChange = () => { currentPage = 1; renderChurches(); }
  }
}

// ── Render ─────────────────────────────────────────────────────
function renderChurches() {
  const list  = document.getElementById('church-list')
  const count = document.getElementById('church-count')
  if (!list) return

  const searchEl = document.getElementById('church-search')
  const q = (searchEl ? searchEl.value : '').toLowerCase().trim()
  const distId = selFilterDistrict ? selFilterDistrict.getValue() : ''
  const scope  = selFilterScope ? selFilterScope.getValue() : ''

  const filtered = allChurches.filter(c => {
    const matchesSearch = !q ||
      (c.church_name || '').toLowerCase().includes(q) ||
      (c.church_address || '').toLowerCase().includes(q) ||
      (c.district_name || '').toLowerCase().includes(q)
    
    const matchesDistrict = !distId || c.district_id === distId
    const matchesScope = !scope || (c.church_scope || 'local') === scope

    return matchesSearch && matchesDistrict && matchesScope
  })

  filteredCount = filtered.length
  if (count) count.textContent = `${filteredCount} total`

  const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages || 1
  const start = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE)

  const paginationEl = document.getElementById('pagination')
  const pageInfoEl   = document.getElementById('page-info')
  const btnPrev      = document.getElementById('btn-prev')
  const btnNext      = document.getElementById('btn-next')

  const user    = authService.getCurrentUser()
  const isStaff = user && user.role === 'Staff'
  const isMobile = window.innerWidth <= 1024

  list.innerHTML = ''
  
  const cardTemplate = document.getElementById('church-card-template');

  if (!paginated.length) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:48px;height:48px;opacity:0.2;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <div class="empty-title">No churches found</div>
        <div class="empty-desc">Try adjusting your search or add a new church.</div>
      </div>`
    if (paginationEl) paginationEl.style.display = 'none'
    return
  }

  if (paginationEl) paginationEl.style.display = 'flex'
  if (pageInfoEl) pageInfoEl.textContent = `Showing ${start + 1}-${Math.min(start + ITEMS_PER_PAGE, filteredCount)} of ${filteredCount}`
  if (btnPrev) btnPrev.disabled = (currentPage === 1)
  if (btnNext) btnNext.disabled = (currentPage === totalPages || totalPages === 0)

  paginated.forEach(c => {
    const currentPastor = allPastorAssignments[c.id]
    
    if (isMobile) {
      const clone = cardTemplate.content.cloneNode(true);
      const nameEl = clone.querySelector('.pcm-name');
      const pastorText = clone.querySelector('.pastor-text');
      const districtVal = clone.querySelector('.district-val');
      const addressVal = clone.querySelector('.address-val');
      const statusWrap = clone.querySelector('.pcm-status-wrap');
      
      nameEl.textContent = c.church_name;
      pastorText.textContent = currentPastor ? `Pastor: ${currentPastor}` : 'Vacant';
      districtVal.textContent = c.district_name || 'Unassigned';
      addressVal.textContent = c.church_address || '—';
      
      const scope = (c.church_scope || 'local').toLowerCase();
      const statusClass = scope === 'international' ? 'status-warning' : 'status-active';
      statusWrap.innerHTML = `<span class="status-badge ${statusClass}">${scope}</span>`;

      const actions = clone.querySelector('.pcm-actions');
      actions.innerHTML = `
        <button class="pcm-action-btn pcm-view" title="View Profile">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
        <button class="pcm-action-btn" id="pcm-quick-add-${c.id}" title="Quick Add" style="color:var(--blue);">
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          Add
        </button>
        <button class="pcm-action-btn pcm-edit" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        ${!isStaff ? `<button class="pcm-action-btn pcm-delete" title="Remove">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          Del
        </button>` : ''}
      `;
      
      actions.querySelector('.pcm-view').onclick = () => window.location.href = `church-view.html?id=${c.id}`;
      actions.querySelector(`#pcm-quick-add-${c.id}`).onclick = () => openQuickAdd(c.id, c.church_name);
      actions.querySelector('.pcm-edit').onclick = () => openModal(c);
      if (!isStaff) actions.querySelector('.pcm-delete').onclick = () => deleteChurch(c.id);
      
      list.appendChild(clone);

    } else {
      const row = document.createElement('div')
      row.className = 'data-table-row cols-church'
      row.dataset.id = c.id
      
      let actionsHtml = `
        <button class="btn-icon btn-view" title="View Profile">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-icon btn-quick-add" title="Add Disciple">
          <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        </button>
        <button class="btn-icon btn-edit" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        </button>
      `
      if (!isStaff) {
        actionsHtml += `
          <button class="btn-icon btn-delete" title="Delete">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        `
      }

      row.innerHTML = `
        <div data-label="Church Name">
          <div class="cell-name-primary">${esc(c.church_name)}</div>
        </div>
        <div data-label="Address">
          <div class="cell-name-sub">${esc(c.church_address) || '—'}</div>
        </div>
        <div data-label="District">
          <span class="pill pill-disciple" style="background:var(--bg-card); border:1px solid var(--border); color:var(--text-2); font-size:11px;">
            ${esc(c.district_name) || 'Unassigned'}
          </span>
        </div>
        <div data-label="Type">
          <span class="pill" style="text-transform: capitalize; background:var(--bg-card); border:1px solid var(--border); color:var(--text-2); font-size:11px; padding: 2px 8px; border-radius: 4px;">
            ${esc(c.church_scope) || 'local'}
          </span>
        </div>
        <div data-label="Current Pastor">
          ${currentPastor
            ? `<div class="cell-name-primary" style="font-size:13px;">${esc(currentPastor)}</div>`
            : `<span class="vacant-badge">Vacant</span>`
          }
        </div>
        <div class="row-actions">${actionsHtml}</div>
      `

      // Bind events
      row.querySelector('.btn-view').onclick = () => window.location.href = `church-view.html?id=${c.id}`
      row.querySelector('.btn-quick-add').onclick = () => openQuickAdd(c.id, c.church_name)
      row.querySelector('.btn-edit').onclick = () => openModal(c)
      const delBtn = row.querySelector('.btn-delete')
      if (delBtn) delBtn.onclick = () => deleteChurch(c.id)

      list.appendChild(row)
    }
  })
}

// ── Modal ──────────────────────────────────────────────────────
function openModal(church = null) {
  editingId = church ? church.id : null
  const overlay = document.getElementById('church-modal-overlay')
  const title   = document.getElementById('modal-title')
  const form    = document.getElementById('church-form')
  if (!overlay) return

  form.reset()
  document.getElementById('church-id').value = ''

  if (church) {
    title.textContent = 'Update Church'
    document.getElementById('church-id').value = church.id
    document.getElementById('f-name').value    = church.church_name || ''
    document.getElementById('f-address').value = church.church_address || ''
    document.getElementById('f-notes').value   = church.notes || ''

    // Set scope radio
    const radios = document.getElementsByName('f-type')
    radios.forEach(r => { r.checked = r.value === (church.church_scope || 'local') })

    // Set district
    if (selModalDistrict) selModalDistrict.setValue(church.district_id || '')
    // Set pioneer
    if (selModalPioneer) selModalPioneer.setValue(church.pioneer_pastor_id || '')
    // Set mother
    if (selModalMother) {
      // Filter out self to prevent circular ref
      const motherOptions = [{ value: '', label: '-- Select Mother Church --' }, ...allChurches.filter(c => c.id !== church.id).map(c => ({ value: c.id, label: c.church_name }))]
      selModalMother.updateOptions(motherOptions)
      selModalMother.setValue(church.mother_church_id || '')
    }
  } else {
    title.textContent = 'Add New Church'
    if (selModalDistrict) selModalDistrict.reset()
    if (selModalPioneer) selModalPioneer.reset()
    if (selModalMother) {
      selModalMother.updateOptions([{ value: '', label: '-- Select Mother Church --' }, ...allChurches.map(c => ({ value: c.id, label: c.church_name }))])
      selModalMother.reset()
    }
    const radios = document.getElementsByName('f-type')
    if (radios.length) radios[0].checked = true
  }

  overlay.classList.add('open')
}

async function deleteChurch(id) {
  const church = allChurches.find(c => c.id === id)
  if (!church) return
  if (!confirm(`Remove "${church.church_name}"? This is a soft delete and can be restored.`)) return
  try {
    await churchService.remove(id)
    await initData()
    renderChurches()
  } catch (err) {
    alert('Error deleting church: ' + err.message)
  }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--
    renderChurches()
    scrollToTableTop()
  }
}

function nextPage() {
  if (currentPage < Math.ceil(filteredCount / ITEMS_PER_PAGE)) {
    currentPage++
    renderChurches()
    scrollToTableTop()
  }
}

function scrollToTableTop() {
  const el = document.querySelector('.data-table')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function closeModal() {
  const overlay = document.getElementById('church-modal-overlay')
  if (overlay) overlay.classList.remove('open')
  editingId = null
}

// ── Form Submit ────────────────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault()
  const id         = document.getElementById('church-id').value
  const churchName = document.getElementById('f-name').value.trim()
  const address    = document.getElementById('f-address').value.trim()
  const notes      = document.getElementById('f-notes').value.trim()
  const scopeEl    = document.querySelector('input[name="f-type"]:checked')
  const scope      = scopeEl ? scopeEl.value : 'local'
  const districtId = selModalDistrict ? selModalDistrict.getValue() : ''
  const pioneerId  = selModalPioneer ? selModalPioneer.getValue() : ''
  const motherId   = selModalMother ? selModalMother.getValue() : ''

  if (!churchName) { alert('Church name is required.'); return }

  const btn = document.getElementById('btn-save-church') || document.querySelector('#church-form [type="submit"]')
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...' }

  try {
    const payload = {
      church_name:    churchName,
      church_address:    address,
      church_scope:      scope,
      district_id:       districtId || null,
      pioneer_pastor_id: pioneerId || null,
      mother_church_id:  motherId || null,
      notes:             notes
    }
    if (id) {
      await churchService.update(id, payload)
    } else {
      await churchService.create(payload)
    }
    closeModal()
    await initData()
    renderChurches()
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      alert('A church with this name already exists in this district.')
    } else {
      alert('Failed to save church: ' + err.message)
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save' }
  }
}

// ── Quick Add Disciple ──────────────────────────────────────────
function openQuickAdd(churchId, churchName) {
  const overlay = document.getElementById('quick-disciple-overlay')
  if (!overlay) return
  document.getElementById('qd-church-id').value = churchId
  document.getElementById('qd-church-name').textContent = churchName
  document.getElementById('qd-name').value = ''
  overlay.classList.add('open')
}

function closeQuickAdd() {
  const overlay = document.getElementById('quick-disciple-overlay')
  if (overlay) overlay.classList.remove('open')
}

async function handleQuickAddSubmit(e) {
  e.preventDefault()
  const churchId = document.getElementById('qd-church-id').value
  const name     = document.getElementById('qd-name').value.trim()

  if (!name) return alert('Name is required.')

  const btn = e.target.querySelector('button[type="submit"]')
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...' }

  try {
    await discipleService.create({ full_name: name, church_id: churchId })
    closeQuickAdd()
    // Optional: show a toast or message. For now just close.
  } catch (err) {
    alert('Error adding disciple: ' + err.message)
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Add Disciple' }
  }
}

// ── Events ─────────────────────────────────────────────────────
function bindEvents() {
  // Logout
  const btnLogout = document.getElementById('btn-logout')
  if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
      await authService.signOut()
      window.location.href = '/login.html'
    })
  }

  // Pagination
  const btnPrev = document.getElementById('btn-prev')
  const btnNext = document.getElementById('btn-next')
  if (btnPrev) btnPrev.onclick = prevPage
  if (btnNext) btnNext.onclick = nextPage

  const qdForm = document.getElementById('quick-disciple-form')
  if (qdForm) qdForm.onsubmit = handleQuickAddSubmit

  const btnCloseQD = document.getElementById('btn-close-qd')
  const btnCancelQD = document.getElementById('btn-cancel-qd')
  if (btnCloseQD) btnCloseQD.onclick = closeQuickAdd
  if (btnCancelQD) btnCancelQD.onclick = closeQuickAdd
  const btnAdd = document.getElementById('btn-add-church')
  if (btnAdd) btnAdd.onclick = () => openModal()

  const btnClose  = document.getElementById('btn-close-modal')
  const btnCancel = document.getElementById('btn-cancel-modal')
  if (btnClose)  btnClose.onclick  = closeModal
  if (btnCancel) btnCancel.onclick = closeModal

  const form = document.getElementById('church-form')
  if (form) form.onsubmit = handleFormSubmit

  const search = document.getElementById('church-search')
  if (search) search.addEventListener('input', () => { currentPage = 1; renderChurches(); })

  // Close on overlay click
  const overlay = document.getElementById('church-modal-overlay')
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })
  
  const overlayQD = document.getElementById('quick-disciple-overlay')
  if (overlayQD) overlayQD.addEventListener('click', e => { if (e.target === overlayQD) closeQuickAdd() })
}
