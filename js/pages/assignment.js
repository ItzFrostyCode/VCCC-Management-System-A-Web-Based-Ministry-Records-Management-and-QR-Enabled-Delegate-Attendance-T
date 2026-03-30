// assignment.js — Supabase-backed Assignment Management (new.sql schema)

let allAssignments = []
let filteredAssignments = []
let allPastors     = []
let allChurches    = []
let editingId      = null
let currentPage    = 1
const ITEMS_PER_PAGE = 10

let selPastor, selChurch

// ── Status / Type Config ───────────────────────────────────────
const statusConfig = {
  active:      { label: 'Active',      class: 'pill-disciple' },
  ended:       { label: 'Ended',       class: 'pill-ghost'    },
  transferred: { label: 'Transferred', class: 'pill-wife'     },
  redirection: { label: 'Redirection', class: 'pill-visitor'  },
  pullout:     { label: 'Pullout',     class: 'pill-danger'   }
}

const roleLabel = {
  'Lead Pastor': 'Lead Pastor',
  'Assistant Pastor': 'Assistant Pastor',
  'District Presbyter': 'District Presbyter',
  'Interim Setup': 'Interim Setup',
  'Worker': 'Worker',
  'Regular': 'Regular'
}

// ── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    await initData()
    initSearchSelects()
    bindEvents()
    handleFilter() // Initial render with filters
  } catch (err) {
    console.error('Assignment page init failed:', err)
    const list = document.getElementById('assignment-list')
    if (list) list.innerHTML = `<div class="empty-state" style="color:var(--red)">Error: ${esc(err.message)}</div>`
  }
})

async function initData() {
  const [assignments, pastors, churches] = await Promise.all([
    assignmentService.fetchAll(),
    pastorService.fetchAll(),
    churchService.fetchAll()
  ])
  allAssignments = assignments || []
  allPastors     = pastors    || []
  allChurches    = churches   || []
}

// ── Populate dropdowns ─────────────────────────────────────────
function initSearchSelects() {
  const pWrap = document.getElementById('f-pastor-sel')
  const cWrap = document.getElementById('f-church-sel')
  
  const pOpts = [{ value: '', label: '-- Select Pastor --' }, ...allPastors.map(p => ({ value: p.id, label: p.full_name }))]
  const cOpts = [{ value: '', label: '-- Select Church --' }, ...allChurches.map(c => ({ value: c.id, label: c.church_name }))]

  if (selPastor) {
    selPastor.setOptions(pOpts)
  } else if (pWrap) {
    selPastor = createSearchSelect(pWrap, pOpts, '-- Select Pastor --')
  }

  if (selChurch) {
    selChurch.setOptions(cOpts)
  } else if (cWrap) {
    selChurch = createSearchSelect(cWrap, cOpts, '-- Select Church --')
  }
}

// ── Render ─────────────────────────────────────────────────────
function renderAssignments() {
  const list  = document.getElementById('assignment-list')
  const count = document.getElementById('assignment-count')
  if (!list) return

  if (!filteredAssignments.length) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-title">No records found</div>
        <div class="empty-desc">Try adjusting your filters or record a new assignment.</div>
      </div>`
    if (count) count.textContent = '0 total records'
    document.getElementById('pagination').style.display = 'none'
    return
  }

  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages || 1

  const start = (currentPage - 1) * ITEMS_PER_PAGE
  const end = start + ITEMS_PER_PAGE
  const paginated = filteredAssignments.slice(start, end)

  list.innerHTML = paginated.map(a => {
    const status = statusConfig[a.status_code] || { label: a.status_code, class: 'pill-ghost' }
    return `
      <div class="data-table-row cols-assign" data-id="${a.id}">
        <div class="cell-double">
          <div class="cell-name-primary">${esc(a.pastor_name) || 'Unknown Pastor'}</div>
          <div style="font-size:11px; color:var(--text-3);">${esc(a.church_name) || 'Unknown Church'}</div>
        </div>
        <div data-label="Role/Event">
          <span style="font-weight:500; color:var(--text-2); font-size:13px;">${roleLabel[a.role_code] || a.role_code} (${a.event_type})</span>
        </div>
        <div data-label="Status">
          <span class="pill ${status.class}">${status.label}</span>
        </div>
        <div data-label="Duration">
          <div style="font-size:12px; color:var(--text-2); font-weight:500;">
            ${a.start_date || 'N/A'} ${a.end_date ? '— ' + a.end_date : '— Present'}
          </div>
        </div>
        <div class="row-actions">
          <button class="btn-icon btn-edit" title="Edit" onclick="editRecord('${a.id}')">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
        </div>
      </div>`
  }).join('')

  if (count) count.textContent = `${filteredAssignments.length} total records`

  // Pagination UI
  const pagin = document.getElementById('pagination')
  pagin.style.display = 'flex'
  document.getElementById('page-info').textContent = `Showing ${start + 1}-${Math.min(end, filteredAssignments.length)} of ${filteredAssignments.length}`
  
  const bPrev = document.getElementById('btn-prev')
  const bNext = document.getElementById('btn-next')
  bPrev.disabled = (currentPage === 1)
  bNext.disabled = (currentPage === totalPages || totalPages === 0)
  bPrev.style.opacity = bPrev.disabled ? '0.5' : '1'
  bNext.style.opacity = bNext.disabled ? '0.5' : '1'
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--
    renderAssignments()
    scrollToTableTop()
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredAssignments.length / ITEMS_PER_PAGE)
  if (currentPage < totalPages) {
    currentPage++
    renderAssignments()
    scrollToTableTop()
  }
}

function scrollToTableTop() {
  const el = document.querySelector('.data-table')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Actions ────────────────────────────────────────────────────
window.editRecord = function(id) {
  const a = allAssignments.find(x => x.id === id)
  if (!a) return
  editingId = id
  document.getElementById('modal-title').textContent = 'Edit Record'
  document.getElementById('f-id').value         = a.id
  if (selPastor) selPastor.setValue(a.pastor_id || '')
  if (selChurch) selChurch.setValue(a.church_id || '')
  document.getElementById('f-type').value       = a.role_code || 'Lead Pastor'
  document.getElementById('f-event').value      = a.event_type || 'Transfer'
  document.getElementById('f-status').value     = a.status_code || 'active'
  document.getElementById('f-start').value      = a.start_date  || ''
  document.getElementById('f-end').value        = a.end_date    || ''
  document.getElementById('f-notes').value      = a.notes       || ''
  document.getElementById('assign-modal-overlay').classList.add('open')
}

function closeModal() {
  const overlay = document.getElementById('assign-modal-overlay')
  if (overlay) overlay.classList.remove('open')
  const form = document.getElementById('assign-form')
  if (form) form.reset()
  if (selPastor) selPastor.reset()
  if (selChurch) selChurch.reset()
  document.getElementById('f-id').value = ''
  editingId = null
}

// ── Filter ─────────────────────────────────────────────────────
function handleFilter() {
  const q      = (document.getElementById('assign-search')?.value  || '').toLowerCase().trim()
  const type   = document.getElementById('filter-type')?.value   || ''
  const status = document.getElementById('filter-status')?.value || ''

  filteredAssignments = allAssignments.filter(a => {
    const matchQ      = !q || (a.pastor_name || '').toLowerCase().includes(q) || (a.church_name || '').toLowerCase().includes(q)
    const matchType   = !type   || a.role_code === type || a.event_type === type
    const matchStatus = !status || a.status_code    === status
    return matchQ && matchType && matchStatus
  })
  currentPage = 1
  renderAssignments()
}

// ── Form Submit ────────────────────────────────────────────────
async function handleFormSubmit(e) {
  e.preventDefault()
  const id = document.getElementById('f-id').value

  const payload = {
    pastor_id:       selPastor ? selPastor.getValue() : '',
    church_id:       selChurch ? selChurch.getValue() : '',
    role_code:       document.getElementById('f-type').value,
    event_type:      document.getElementById('f-event')?.value || 'Transfer',
    status_code:     document.getElementById('f-status').value,
    start_date:      document.getElementById('f-start').value,
    end_date:        document.getElementById('f-end').value || null,
    notes:           document.getElementById('f-notes').value.trim()
  }

  if (!payload.pastor_id || !payload.church_id || !payload.start_date) {
    alert('Pastor, Church, and Start Date are required.')
    return
  }

  const btn = document.getElementById('btn-save-assign') || document.querySelector('#assign-form [type="submit"]')
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...' }

  try {
    // If NEW active assignment: auto-close old active assignment for this pastor
    if (!id && payload.status_code === 'active') {
      const existing = await assignmentService.fetchActiveByPastor(payload.pastor_id)
      if (existing) {
        await assignmentService.close(existing.id, payload.start_date, 'transferred')
      }
    }

    if (id) {
      await assignmentService.update(id, payload)
    } else {
      await assignmentService.create(payload)
    }

    closeModal()
    await initData()
    handleFilter()
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      alert('This pastor or church already has an active assignment.')
    } else {
      alert('Failed to save assignment: ' + err.message)
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save' }
  }
}

// ── Events ─────────────────────────────────────────────────────
function bindEvents() {
  const btnAdd = document.getElementById('btn-add-assignment')
  if (btnAdd) {
    btnAdd.onclick = () => {
      editingId = null
      document.getElementById('modal-title').textContent = 'New Assignment Record'
      document.getElementById('f-id').value = ''
      document.getElementById('assign-form').reset()
      if (selPastor) selPastor.reset()
      if (selChurch) selChurch.reset()
      document.getElementById('f-start').value = new Date().toISOString().split('T')[0]
      document.getElementById('assign-modal-overlay').classList.add('open')
    }
  }

  const btnClose  = document.getElementById('btn-close-modal')
  const btnCancel = document.getElementById('btn-cancel-modal')
  if (btnClose)  btnClose.onclick  = closeModal
  if (btnCancel) btnCancel.onclick = closeModal

  const form = document.getElementById('assign-form')
  if (form) form.onsubmit = handleFormSubmit

  ;['assign-search', 'filter-type', 'filter-status'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.oninput = handleFilter
  })

  const overlay = document.getElementById('assign-modal-overlay')
  if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal() })
}
