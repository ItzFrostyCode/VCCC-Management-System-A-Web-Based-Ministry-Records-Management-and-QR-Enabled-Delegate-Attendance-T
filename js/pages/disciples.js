let allDisciples  = []
let allPastors    = []
let allDistricts  = []
let filterDistVal = null
let filterPastVal = null
let editingId     = null
let deletingId    = null
let selFilterDist, selFilterPast, selModalDistFilter, selModalPastor

let currentPage = 1
const ITEMS_PER_PAGE = 10

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()
  try {
    ;[allDistricts, allPastors, allDisciples] = await Promise.all([
      districtService.fetchAll(),
      pastorService.fetchAll(),
      discipleService.fetchAll()
    ])
    buildDropdowns()
    renderTable()
  } catch (e) {
    console.error('Initial load failed:', e)
    document.getElementById('table-body').innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--red); text-align:center;"><strong>Database Connection Error:</strong><br>${esc(e.message)}<br><small>Did you run the Supabase SQL script?</small></td></tr>`
  }
  bindEvents()
})

function buildDropdowns() {
  // Filter: district
  selFilterDist = createSearchSelect(
    document.getElementById('filter-district'),
    [{ value: '', label: 'All districts' }, ...allDistricts.map(d => ({ value: d.id, label: d.name }))],
    'All districts',
    (val) => {
      filterDistVal = val || null
      filterPastVal = null
      const pastOpts = [{ value: '', label: 'All pastors' },
        ...allPastors.filter(p => !filterDistVal || p.district_id === filterDistVal).map(p => ({ value: p.id, label: p.full_name }))
      ]
      selFilterPast.setOptions(pastOpts)
      selFilterPast.reset()
      currentPage = 1
      renderTable()
    }
  )

  // Filter: pastor
  selFilterPast = createSearchSelect(
    document.getElementById('filter-pastor'),
    [{ value: '', label: 'All pastors' }, ...allPastors.map(p => ({ value: p.id, label: p.full_name }))],
    'All pastors',
    (val) => { filterPastVal = val || null; currentPage = 1; renderTable() }
  )

  // Modal: district filter (narrows pastor list)
  selModalDistFilter = createSearchSelect(
    document.getElementById('modal-district-filter'),
    [{ value: '', label: 'All districts' }, ...allDistricts.map(d => ({ value: d.id, label: d.name }))],
    'All districts...',
    (val) => {
      const filtered = val ? allPastors.filter(p => p.district_id === val) : allPastors
      selModalPastor.setOptions(filtered.map(p => ({ value: p.id, label: p.full_name })))
      selModalPastor.reset()
      document.getElementById('pastor-hint').textContent = val
        ? `${filtered.length} pastor${filtered.length !== 1 ? 's' : ''} in this district`
        : 'All pastors shown'
    }
  )

  // Modal: pastor select
  selModalPastor = createSearchSelect(
    document.getElementById('modal-pastor-sel'),
    allPastors.map(p => ({ value: p.id, label: p.full_name })),
    'Select pastor...'
  )
}

function renderTable() {
  const q = document.getElementById('search-input').value.toLowerCase()
  let list = allDisciples.filter(d => {
    if (filterDistVal && d.district_id !== filterDistVal) return false
    if (filterPastVal && d.pastor_id   !== filterPastVal) return false
    if (q && !d.full_name.toLowerCase().includes(q) && !d.pastor_name.toLowerCase().includes(q)) return false
    return true
  })
  document.getElementById('count-label').textContent = `${list.length} records`
  const body = document.getElementById('table-body')
  if (!list.length) {
    body.innerHTML = `<div class="empty-state"><div class="empty-title">${q ? `No results for "${q}"` : 'No disciples yet'}</div><div class="empty-desc">${!allPastors.length ? 'Add pastors first' : 'Add the first disciple'}</div></div>`
    document.getElementById('pagination').style.display = 'none'
    return
  }

  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedItems = list.slice(startIndex, endIndex)

  body.innerHTML = paginatedItems.map(d => `
    <div class="data-table-row cols-disciples">
      <div class="cell-name-primary" data-label="Disciple">${esc(d.full_name)}</div>
      <div style="font-size:13px; color:var(--text); font-weight:500;" data-label="Pastor">${esc(d.pastor_name)}</div>
      <div style="font-size:12px; color:var(--text-2); opacity:0.8;" data-label="District">${esc(d.district_name)}</div>
      <div style="font-size:12px; color:var(--text-2); opacity:0.8;" data-label="Church">${esc(d.church_name)}</div>
      <div class="row-actions">
        <button class="btn btn-icon btn-sm" onclick="openEdit('${d.id}')" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="btn btn-icon btn-sm" onclick="openDelete('${d.id}','${esc(d.full_name)}')" title="Delete">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
      </div>
    </div>`
  ).join('')

  document.getElementById('pagination').style.display = 'flex'
  document.getElementById('page-info').textContent = `Showing ${startIndex + 1} to ${Math.min(endIndex, list.length)} of ${list.length}`
  
  const btnPrev = document.getElementById('btn-prev')
  const btnNext = document.getElementById('btn-next')
  if (currentPage === 1) { btnPrev.disabled = true; btnPrev.style.opacity = '0.5' } else { btnPrev.disabled = false; btnPrev.style.opacity = '1' }
  if (currentPage === totalPages) { btnNext.disabled = true; btnNext.style.opacity = '0.5' } else { btnNext.disabled = false; btnNext.style.opacity = '1' }
}

function prevPage() {
  if (currentPage > 1) {
    currentPage--
    renderTable()
  }
}

function nextPage() {
  const q = document.getElementById('search-input').value.toLowerCase()
  let list = allDisciples.filter(d => {
    if (filterDistVal && d.district_id !== filterDistVal) return false
    if (filterPastVal && d.pastor_id   !== filterPastVal) return false
    if (q && !d.full_name.toLowerCase().includes(q) && !d.pastor_name.toLowerCase().includes(q)) return false
    return true
  })
  
  const totalPages = Math.ceil(list.length / ITEMS_PER_PAGE)
  if (currentPage < totalPages) {
    currentPage++
    renderTable()
  }
}

function openCreate() {
  editingId = null
  document.getElementById('modal-title').textContent = 'Add disciple'
  document.getElementById('item-id').value   = ''
  document.getElementById('item-name').value = ''
  selModalDistFilter.reset()
  selModalPastor.setOptions(allPastors.map(p => ({ value: p.id, label: p.full_name })))
  selModalPastor.reset()
  document.getElementById('pastor-hint').textContent = 'All pastors shown'
  document.getElementById('modal-form').classList.add('open')
  document.getElementById('item-name').focus()
}

function openEdit(id) {
  const d = allDisciples.find(x => x.id === id)
  if (!d) return
  editingId = id
  document.getElementById('modal-title').textContent = 'Edit disciple'
  document.getElementById('item-id').value   = id
  document.getElementById('item-name').value = d.full_name
  selModalDistFilter.setValue(d.district_id)
  const filtered = allPastors.filter(p => p.district_id === d.district_id)
  selModalPastor.setOptions(filtered.map(p => ({ value: p.id, label: p.full_name })))
  selModalPastor.setValue(d.pastor_id)
  document.getElementById('pastor-hint').textContent = `${filtered.length} pastors in this district`
  document.getElementById('modal-form').classList.add('open')
}

function openDelete(id, name) {
  deletingId = id
  document.getElementById('delete-msg').textContent = `Remove "${name}"? Their attendance records will be preserved.`
  document.getElementById('modal-delete').classList.add('open')
}

function closeModal() { document.getElementById('modal-form').classList.remove('open') }

async function save() {
  const fullName = document.getElementById('item-name').value.trim()
  const pastorId = selModalPastor.getValue()
  if (!fullName || !pastorId) { alert('Full name and pastor are required.'); return }
  const btn = document.getElementById('btn-save')
  btn.disabled = true; btn.textContent = 'Saving...'
  try {
    const p = allPastors.find(x => x.id === pastorId)
    
    if (editingId) {
      const updated = await discipleService.update(editingId, fullName, pastorId)
      if (p) {
        updated.pastor_name = p.full_name
        updated.district_name = p.district_name
        updated.church_name = p.church_name
      }
      allDisciples = allDisciples.map(d => d.id === editingId ? updated : d)
    } else {
      const created = await discipleService.create(fullName, pastorId)
      if (p) {
        created.pastor_name = p.full_name
        created.district_name = p.district_name
        created.church_name = p.church_name
      }
      allDisciples = [...allDisciples, created].sort((a,b) => a.full_name.localeCompare(b.full_name))
    }
    closeModal()
    renderTable()
  } catch(e) {
    alert('Error: ' + e.message)
  } finally {
    btn.disabled = false; btn.textContent = 'Save disciple'
  }
}

async function deleteItem() {
  const btn = document.getElementById('btn-delete-confirm')
  btn.disabled = true; btn.textContent = 'Removing...'
  try {
    await discipleService.remove(deletingId)
    allDisciples = allDisciples.filter(d => d.id !== deletingId)
    document.getElementById('modal-delete').classList.remove('open')
    renderTable()
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
  document.getElementById('btn-add').onclick    = openCreate
  document.getElementById('btn-export').onclick = exportCSV
  document.getElementById('btn-save').onclick   = save
  document.getElementById('btn-delete-confirm').onclick = deleteItem
  document.getElementById('search-input').addEventListener('input', () => { currentPage = 1; renderTable(); })
  document.querySelectorAll('.modal-overlay').forEach(el =>
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open') })
  )
}

function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}