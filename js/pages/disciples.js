let allPastors = []
let allDisciples = []
let currentPage = 1
const ITEMS_PER_PAGE = 20
let editingId = null
let deletingId = null
let selModalPastor = null

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()
  initUI()
  await initData()
  bindEvents()
})

function initUI() {
  selModalPastor = new CustomSelect('modal-pastor-sel', 'Select Pastor')
}

async function initData() {
  try {
    const [p, d] = await Promise.all([
      pastorService.fetchAll(),
      discipleService.fetchAll()
    ])
    allPastors = p.sort((a,b) => a.full_name.localeCompare(b.full_name))
    allDisciples = d.sort((a,b) => a.full_name.localeCompare(b.full_name))
    
    // Map pastor names to disciples for display
    allDisciples = allDisciples.map(disc => {
      const pastor = allPastors.find(p => p.id === disc.pastor_id)
      return {
        ...disc,
        pastor_name: pastor ? pastor.full_name : 'Unknown',
        district_name: pastor ? pastor.district_name : '—',
        church_name: pastor ? pastor.church_name : '—'
      }
    })

    selModalPastor.setOptions(allPastors.map(p => ({ value: p.id, label: p.full_name })))
    renderTable()
  } catch(e) {
    console.error(e)
    alert('Error loading data')
  }
}

function renderTable() {
  const body = document.getElementById('table-body')
  const countEl = document.getElementById('count-label')
  const search = document.getElementById('search-input').value.toLowerCase()

  let filtered = allDisciples.filter(d => 
    d.full_name.toLowerCase().includes(search) ||
    d.pastor_name.toLowerCase().includes(search) ||
    d.church_name.toLowerCase().includes(search)
  )

  if (countEl) countEl.textContent = `${filtered.length} disciples`

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages || 1

  const start = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = filtered.slice(start, start + ITEMS_PER_PAGE)

  if (!paginated.length) {
    body.innerHTML = '<div class="empty-state">No disciples found.</div>'
    document.getElementById('pagination').style.display = 'none'
    return
  }

  const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
  const isStaff = user && user.role === 'Staff';

  body.innerHTML = paginated.map(d => `
    <div class="data-table-row cols-disciples">
      <div class="col-main">
        <div class="row-title">${esc(d.full_name)}</div>
        <div class="row-sub">Disciple</div>
      </div>
      <div class="col-info">
        <div class="info-label">Pastor</div>
        <div class="info-val">${esc(d.pastor_name)}</div>
      </div>
       <div class="col-info">
        <div class="info-label">District / Church</div>
        <div class="info-val">${esc(d.district_name)} / ${esc(d.church_name)}</div>
      </div>
      <div class="col-actions">
        <button class="btn-icon" data-tip="Edit" onclick="openEdit('${d.id}')">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${!isStaff ? `
        <button class="btn-icon btn-delete" data-tip="Delete" onclick="openDelete('${d.id}', '${esc(d.full_name)}')">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
        ` : ''}
      </div>
    </div>
  `).join('')

  document.getElementById('pagination').style.display = 'flex'
  document.getElementById('page-info').textContent = `Showing ${start + 1}-${Math.min(start + ITEMS_PER_PAGE, filtered.length)} of ${filtered.length}`
  document.getElementById('btn-prev').disabled = (currentPage === 1)
  document.getElementById('btn-next').disabled = (currentPage === totalPages || totalPages === 0)
}

function prevPage() { if (currentPage > 1) { currentPage--; renderTable() } }
function nextPage() { if (currentPage < Math.ceil(allDisciples.length/ITEMS_PER_PAGE)) { currentPage++; renderTable() } }

function openCreate() {
  editingId = null
  document.getElementById('item-id').value = ''
  document.getElementById('item-name').value = ''
  selModalPastor.setValue('')
  document.getElementById('modal-title').textContent = 'Add disciple'
  document.getElementById('modal-form').classList.add('open')
}

function openEdit(id) {
  const d = allDisciples.find(x => x.id === id)
  if (!d) return
  editingId = id
  document.getElementById('item-id').value = id
  document.getElementById('item-name').value = d.full_name
  selModalPastor.setValue(d.pastor_id)
  document.getElementById('modal-title').textContent = 'Edit disciple'
  document.getElementById('modal-form').classList.add('open')
}

function openDelete(id, name) {
  deletingId = id
  document.getElementById('delete-msg').textContent = `Remove "${name}"? Their attendance records will be preserved.`
  document.getElementById('modal-delete').classList.add('open')
}

function closeModal() { document.getElementById('modal-form').classList.remove('open') }

async function saveItem() {
  const id       = document.getElementById('item-id').value
  const name     = document.getElementById('item-name').value.trim()
  const pastorId = selModalPastor.getValue()

  if (!name || !pastorId) {
    alert('Please fill in both name and pastor.')
    return
  }

  const btn = document.getElementById('btn-save')
  btn.disabled = true
  btn.textContent = 'Saving...'

  try {
    const data = {
      full_name: name,
      pastor_id: pastorId
    }

    if (id) {
      await discipleService.update(id, data)
    } else {
      await discipleService.create(data)
    }

    closeModal()
    await initData()
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
       alert('This disciple already exists for this pastor.')
    } else {
       alert('Failed to save disciple: ' + err.message)
    }
  } finally {
    btn.disabled = false
    btn.textContent = 'Save disciple'
  }
}

async function deleteItem() {
  const btn = document.getElementById('btn-delete-confirm')
  btn.disabled = true; btn.textContent = 'Removing...'
  try {
    await discipleService.remove(deletingId)
    document.getElementById('modal-delete').classList.remove('open')
    await initData()
  } catch(e) {
    alert('Error: ' + e.message)
  } finally {
    btn.disabled = false; btn.textContent = 'Remove'
  }
}

function exportCSV() {
  downloadCSV('disciples.csv', allDisciples.map(d => ({
    'Full Name':    d.full_name,
    'Pastor':       d.pastor_name,
    'District':     d.district_name,
    'Church':       d.church_name
  })))
}

function bindEvents() {
  const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
  const isStaff = user && user.role === 'Staff';
  
  const btnExport = document.getElementById('btn-export');
  if (isStaff && btnExport) btnExport.style.display = 'none';

  document.getElementById('btn-add').onclick    = () => { openCreate() }
  document.getElementById('btn-export').onclick = () => { if(!isStaff) exportCSV() }
  document.getElementById('btn-save').onclick   = saveItem
  document.getElementById('btn-delete-confirm').onclick = deleteItem
  document.getElementById('search-input').addEventListener('input', () => { currentPage = 1; renderTable(); })
  document.querySelectorAll('.modal-overlay').forEach(el =>
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open') })
  )
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}