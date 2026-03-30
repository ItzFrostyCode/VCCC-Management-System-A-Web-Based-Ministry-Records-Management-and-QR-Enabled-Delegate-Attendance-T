// church.js — Supabase-backed Church Management (new.sql schema)

let allChurches   = []
let allDistricts  = []
let allPastorAssignments = {} // church_id -> pastor_name  (active only)
let editingId     = null
let currentPage   = 1
let filteredCount = 0
const ITEMS_PER_PAGE = 10

// Custom search-select
let selModalDistrict = null
let selFilterDistrict = null
let selFilterScope    = null

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    await initData()
    initSearchSelect()
    bindEvents()
    renderChurches()
  } catch (err) {
    console.error('Church page init failed:', err)
    const list = document.getElementById('church-list')
    if (list) list.innerHTML = `<div class="empty-state" style="color:var(--red)">Error: ${esc(err.message)}</div>`
  }
})

async function initData() {
  const [churches, districts, assignments] = await Promise.all([
    churchService.fetchAll(),
    districtService.fetchAll(),
    assignmentService.fetchAll()
  ])

  allChurches  = churches  || []
  allDistricts = districts || []

  // Build active pastor lookup keyed by church_id
  allPastorAssignments = {}
  ;(assignments || []).forEach(a => {
    if (a.status_code === 'active' && !a.end_date) {
      allPastorAssignments[a.church_id] = a.pastor_name
    }
  })
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

  const user    = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
  const isStaff = user && user.role === 'Staff'

  list.innerHTML = paginated.map(c => {
    const currentPastor = allPastorAssignments[c.id]
    const deleteBtn = !isStaff
      ? `<button class="btn-icon btn-delete" title="Delete" onclick="deleteChurch('${c.id}')">
           <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
         </button>`
      : ''
    return `
      <div class="data-table-row cols-church" data-id="${c.id}">
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
        <div class="row-actions">
          <button class="btn-icon" style="background:hsla(150, 100%, 97%, 1); color:hsl(150, 80%, 35%); border-color:hsla(150, 100%, 90%, 1);" title="View Profile" onclick="window.location.href='church-view.html?id=${c.id}'">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button class="btn-icon" style="background:var(--blue-bg); color:var(--blue); border-color:var(--blue-bg);" title="Add Disciple" onclick="openQuickAdd('${c.id}', '${esc(c.church_name)}')">
            <svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
          </button>
          <button class="btn-icon btn-edit" title="Edit" onclick="editChurch('${c.id}')">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          ${deleteBtn}
        </div>
      </div>`
  }).join('')
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
  } else {
    title.textContent = 'Add New Church'
    if (selModalDistrict) selModalDistrict.reset()
    const radios = document.getElementsByName('f-type')
    if (radios.length) radios[0].checked = true
  }

  overlay.classList.add('open')
}

window.editChurch = function(id) {
  const church = allChurches.find(c => c.id === id)
  if (!church) return
  openModal(church)
}

window.deleteChurch = async function(id) {
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

window.prevPage = function() {
  if (currentPage > 1) {
    currentPage--
    renderChurches()
    scrollToTableTop()
  }
}

window.nextPage = function() {
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

  if (!churchName) { alert('Church name is required.'); return }

  const btn = document.getElementById('btn-save-church') || document.querySelector('#church-form [type="submit"]')
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...' }

  try {
    const payload = {
      church_name:    churchName,
      church_address: address,
      church_scope:   scope,
      district_id:    districtId || null,
      notes:          notes
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
window.openQuickAdd = function(churchId, churchName) {
  const overlay = document.getElementById('quick-disciple-overlay')
  if (!overlay) return
  document.getElementById('qd-church-id').value = churchId
  document.getElementById('qd-church-name').textContent = churchName
  document.getElementById('qd-name').value = ''
  overlay.classList.add('open')
}

window.closeQuickAdd = function() {
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
}
