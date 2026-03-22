let allPastors = []
let filteredPastors = []
let editingId = null
let currentPage = 1
const ITEMS_PER_PAGE = 10

let selFilterDist, selFilterChurch
let selModalDist, selModalChurch
let districtsData = []
let churchesData  = []

document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()
  await Promise.all([initData(), dataManager.load()])
  initFilters()
  initEventListeners()
  renderTable()
})

async function initData() {
  try {
    const [districts, churches, pastors] = await Promise.all([
      districtService.fetchAll(),
      churchService.fetchAll(),
      pastorService.fetchAll()
    ])
    districtsData = districts || []
    churchesData  = churches  || []
    allPastors    = pastors   || []
    filteredPastors = [...allPastors]
  } catch (e) {
    console.error('Initial load failed:', e)
    document.getElementById('table-body').innerHTML = `<tr><td colspan="5" style="padding:20px; color:var(--red); text-align:center;"><strong>Database Connection Error:</strong><br>${esc(e.message)}<br><small>Did you run the Supabase SQL script?</small></td></tr>`
  }
}

function initFilters() {
  selFilterDist = createSearchSelect(
    document.getElementById('filter-district'),
    [{ value: '', label: 'All districts' }, ...districtsData.map(d => ({ value: d.id, label: d.name }))],
    'All districts',
    (val) => {
      const churchOpts = [
        { value: '', label: 'All churches' },
        ...churchesData
          .filter(c => !val || String(c.district_id) === String(val))
          .map(c => ({ value: c.id, label: c.name }))
      ]
      selFilterChurch.setOptions(churchOpts)
      selFilterChurch.reset()
      applyFilters()
    }
  )

  selFilterChurch = createSearchSelect(
    document.getElementById('filter-church'),
    [{ value: '', label: 'All churches' }, ...churchesData.map(c => ({ value: c.id, label: c.name }))],
    'All churches',
    () => applyFilters()
  )

  selModalDist = createSearchSelect(
    document.getElementById('modal-district-sel'),
    dataManager.getDistricts().map(name => ({ value: name, label: name })),
    'Select district',
    (name) => {
      const churches = dataManager.getChurches(name)
      selModalChurch.setOptions(churches.map(c => ({ value: c, label: c })))
      selModalChurch.enable()
      document.getElementById('church-hint').style.display = 'none'
    }
  )

  selModalChurch = createSearchSelect(
    document.getElementById('modal-church-sel'),
    [],
    'Select church'
  )
  selModalChurch.disable()
}

function initEventListeners() {
  const isStaff = typeof authService !== 'undefined' && authService.getCurrentUser()?.role === 'Staff';
  if (isStaff) {
    const btnExport = document.getElementById('btn-export');
    if (btnExport) btnExport.style.display = 'none';
  }

  document.getElementById('search-input').addEventListener('input', applyFilters)
  document.getElementById('btn-add').onclick = () => { openModal() }
  document.getElementById('btn-save').onclick = saveItem
  document.getElementById('btn-export').onclick = () => { if(!isStaff) exportCSV() }
}

function applyFilters() {
  const query = (document.getElementById('search-input').value || '').toLowerCase()
  const distId = selFilterDist.getValue()
  const churchId = selFilterChurch.getValue()

  filteredPastors = allPastors.filter(p => {
    const matchesQuery =
      (p.full_name || '').toLowerCase().includes(query) ||
      (p.wife_name || '').toLowerCase().includes(query) ||
      (p.church_name || '').toLowerCase().includes(query)

    const matchesDist = !distId || String(p.district_id) === String(distId)
    const matchesChurch = !churchId || String(p.church_id) === String(churchId)

    return matchesQuery && matchesDist && matchesChurch
  })

  currentPage = 1
  renderTable()
}

function renderTable() {
  const body = document.getElementById('table-body')
  document.getElementById('count-label').textContent = `${filteredPastors.length} total`

  if (!filteredPastors.length) {
    body.innerHTML = '<div class="empty-state">No pastors found.</div>'
    document.getElementById('pagination').style.display = 'none'
    return
  }

  const totalPages = Math.ceil(filteredPastors.length / ITEMS_PER_PAGE)
  if (currentPage > totalPages) currentPage = totalPages

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const paginatedItems = filteredPastors.slice(startIndex, endIndex)

  body.innerHTML = paginatedItems.map(p => `
    <div class="data-table-row cols-pastors">
      <div class="cell-name-primary" data-label="Pastor">${esc(p.full_name)}</div>
      <div style="font-size:13px; color:var(--text); font-weight:500;" data-label="Wife">${esc(p.wife_name) || '—'}</div>
      <div style="font-size:12px; color:var(--text-2); opacity:0.8;" data-label="District">${esc(p.district_name)}</div>
      <div style="font-size:12px; color:var(--text-2); opacity:0.8;" data-label="Church">${esc(p.church_name)}</div>
      <div class="row-actions">
        <button class="btn btn-icon btn-sm" onclick="openModal('${p.id}')" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${isStaff ? '' : `
        <button class="btn btn-icon btn-sm btn-icon-danger" onclick="confirmDelete('${p.id}')" title="Remove">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>
        `}
      </div>
    </div>
  `).join('')

  document.getElementById('pagination').style.display = 'flex'
  document.getElementById('page-info').textContent = `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredPastors.length)} of ${filteredPastors.length}`
  
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
  const totalPages = Math.ceil(filteredPastors.length / ITEMS_PER_PAGE)
  if (currentPage < totalPages) {
    currentPage++
    renderTable()
  }
}

function openModal(id = null) {
  editingId = id
  const modal = document.getElementById('modal-form')
  const title = document.getElementById('modal-title')
  const btnSave = document.getElementById('btn-save')

  if (id) {
    const p = allPastors.find(x => String(x.id) === String(id))
    if (!p) return

    title.textContent = 'Edit pastor'
    btnSave.textContent = 'Update pastor'

    document.getElementById('item-name').value = p.full_name || ''
    document.getElementById('wife-name').value = p.wife_name || ''

    selModalDist.setValue(p.district_name)

    const churches = dataManager.getChurches(p.district_name)
    selModalChurch.setOptions(churches.map(c => ({ value: c, label: c })))
    selModalChurch.enable()
    selModalChurch.setValue(p.church_name)

    document.getElementById('church-hint').style.display = 'none'
  } else {
    title.textContent = 'Add pastor'
    btnSave.textContent = 'Save pastor'

    document.getElementById('item-name').value = ''
    document.getElementById('wife-name').value = ''

    selModalDist.reset()
    selModalChurch.reset()
    selModalChurch.disable()

    document.getElementById('church-hint').style.display = 'block'
  }

  modal.classList.add('open')
}

function closeModal() {
  document.getElementById('modal-form').classList.remove('open')
}

/* ✅ FIXED MISSING FUNCTION */
async function saveItem() {
  const id      = editingId // Use the global editingId
  const name    = document.getElementById('item-name').value.trim()
  const wife    = document.getElementById('wife-name').value.trim()
  const districtId = selModalDist.getValue() // Use the select component's value
  const churchId   = selModalChurch.getValue() // Use the select component's value

  if (!name || !districtId || !churchId) {
    alert('Please fill in name, district, and church.')
    return
  }

  const btn = document.getElementById('btn-save')
  btn.disabled = true
  btn.textContent = 'Saving...'

  try {
    const data = {
      full_name: name,
      wife_name: wife || null,
      district_id: districtId,
      church_id: churchId
    }

    if (id) {
      await pastorService.update(id, data)
    } else {
      await pastorService.create(data)
    }

    closeModal()
    await initData() // Changed from loadData to initData to match existing pattern
    applyFilters() // Re-apply filters after data load
  } catch (err) {
    console.error(err)
    if (err.code === '23505') {
      alert('This pastor already exists in this church.')
    } else {
      alert('Failed to save pastor: ' + err.message)
    }
  } finally {
    btn.disabled = false
    btn.textContent = id ? 'Update pastor' : 'Save pastor'
  }
}

function confirmDelete(id) {
  const p = allPastors.find(x => String(x.id) === String(id))
  if (!p) return

  document.getElementById('delete-msg').textContent =
    `Are you sure you want to remove Pastor ${p.full_name}?`

  const modal = document.getElementById('modal-delete')
  modal.classList.add('open')

  document.getElementById('btn-delete-confirm').onclick = async () => {
    try {
      await pastorService.remove(id)
      await initData()
      applyFilters()
      modal.classList.remove('open')
    } catch (err) {
      alert('Error removing pastor: ' + err.message)
    }
  }
}

function exportCSV() {
  downloadCSV('pastors.csv', filteredPastors.map(p => ({
    Name: p.full_name,
    Wife: p.wife_name,
    District: p.district_name,
    Church: p.church_name
  })))
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}