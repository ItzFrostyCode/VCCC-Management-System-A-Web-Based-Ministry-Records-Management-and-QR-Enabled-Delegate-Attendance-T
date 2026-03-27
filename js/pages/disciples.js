let allChurches = []
let allDistricts = []
let allDisciples = []
let currentPage = 1
const ITEMS_PER_PAGE = 20
let editingId = null
let deletingId = null
let selModalChurch = null
let selModalDistrictFilter = null
let selFilterDistrict = null
let selFilterPastor = null
let allPastors = []
let filteredCount = 0

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth()
        initUI()
        await initData()
        bindEvents()
    } catch (err) {
        console.error('Page init failed:', err)
        const body = document.getElementById('table-body')
        if (body) {
            body.innerHTML = `<div class="empty-state" style="color:var(--red); padding:40px; border:1px solid var(--red-light);">
                <div style="font-weight:800; margin-bottom:8px;">Load Error</div>
                <div style="font-size:13px; opacity:0.8;">${esc(err.message)}</div>
            </div>`
        }
    }
})

function initUI() {
    selModalChurch = createSearchSelect(
        document.getElementById('modal-church-sel'),
        [],
        'Select Church'
    )

    selModalDistrictFilter = createSearchSelect(
        document.getElementById('modal-district-filter'),
        [],
        'All Districts'
    )

    // When district filter changes, update church options
    selModalDistrictFilter.onChange = (distId) => {
        updateModalChurchOptions(distId)
    }

    selFilterDistrict = createSearchSelect(
        document.getElementById('filter-district'),
        [],
        'All Districts'
    )
    selFilterDistrict.onChange = () => { currentPage = 1; renderTable(); }

    selFilterPastor = createSearchSelect(
        document.getElementById('filter-pastor'),
        [],
        'All Pastors'
    )
    selFilterPastor.onChange = () => { currentPage = 1; renderTable(); }
}

function updateModalChurchOptions(districtId) {
    let filtered = allChurches
    if (districtId) {
        filtered = allChurches.filter(c => c.district_id === districtId)
    }
    selModalChurch.setOptions(filtered.map(c => ({ value: c.id, label: c.church_name })))
}

async function initData() {
    try {
        const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
        const userRole = user ? user.role : null;

        const [ch, dists, d, p] = await Promise.all([
            churchService.fetchAll(),
            districtService.fetchAll(),
            discipleService.fetchAll(),
            pastorService.fetchAll()
        ])

        allChurches = (ch || []).sort((a,b) => a.church_name.localeCompare(b.church_name))
        allDistricts = (dists || []).sort((a,b) => a.district_name.localeCompare(b.district_name))
        allDisciples = (d || []).sort((a,b) => a.full_name.localeCompare(b.full_name))
        allPastors = (p || []).sort((a,b) => a.full_name.localeCompare(b.full_name))

        selModalDistrictFilter.setOptions([
            { value: '', label: 'All Districts' },
            ...allDistricts.map(d => ({ value: d.id, label: d.district_name }))
        ])

        selFilterDistrict.setOptions([
            { value: '', label: 'All Districts' },
            ...allDistricts.map(d => ({ value: d.id, label: d.district_name }))
        ])

        selFilterPastor.setOptions([
            { value: '', label: 'All Pastors' },
            ...allPastors.map(p => ({ value: p.id, label: p.full_name }))
        ])
        
        updateModalChurchOptions('')
        renderTable()
    } catch(e) {
        console.error(e)
        const msg = e.message || 'Error loading data'
        alert(msg)
    }
}

function renderTable() {
    const body = document.getElementById('table-body')
    const countEl = document.getElementById('count-label')
    const search = document.getElementById('search-input').value.toLowerCase()
    const distId = selFilterDistrict ? selFilterDistrict.getValue() : ''
    const pastorId = selFilterPastor ? selFilterPastor.getValue() : ''

    let filtered = allDisciples.filter(d => {
        const matchesSearch = d.full_name.toLowerCase().includes(search) || 
                              d.church_name.toLowerCase().includes(search) || 
                              d.district_name.toLowerCase().includes(search)
        
        const matchesDistrict = !distId || d.district_id === distId

        let matchesPastor = true
        if (pastorId) {
            const pastor = allPastors.find(p => p.id === pastorId)
            matchesPastor = pastor && d.church_id === pastor.church_id
        }

        return matchesSearch && matchesDistrict && matchesPastor
    })

    filteredCount = filtered.length
    if (countEl) countEl.textContent = `${filteredCount} disciples`

    const totalPages = Math.ceil(filteredCount / ITEMS_PER_PAGE)
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

    body.innerHTML = paginated.map(d => {
        const safeName = esc(d.full_name).replace(/'/g, '&#39;')
        return `
        <div class="data-table-row cols-disciples">
            <div class="cell-name-primary" data-label="Disciple">${esc(d.full_name)}</div>
            <div style="font-size:13px; color:var(--text); font-weight:500;" data-label="Church">${esc(d.church_name) || '—'}</div>
            <div style="font-size:12px; color:var(--text-2); opacity:0.8;" data-label="District">${esc(d.district_name)}</div>
            <div class="row-actions">
                <button class="btn-icon btn-edit" onclick="openEdit('${d.id}')" title="Edit">
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                ${!isStaff ? `
                <button class="btn-icon btn-delete" onclick="openDelete('${d.id}', '${safeName}')" title="Remove">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
                ` : ''}
            </div>
        </div>
`}).join('')

    document.getElementById('pagination').style.display = 'flex'
    document.getElementById('page-info').textContent = `Showing ${start + 1}-${Math.min(start + ITEMS_PER_PAGE, filteredCount)} of ${filteredCount}`
    document.getElementById('btn-prev').disabled = (currentPage === 1)
    document.getElementById('btn-next').disabled = (currentPage === totalPages || totalPages === 0)
}

function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        renderTable()
        scrollToTableTop()
    }
}

function nextPage() {
    if (currentPage < Math.ceil(filteredCount / ITEMS_PER_PAGE)) {
        currentPage++;
        renderTable()
        scrollToTableTop()
    }
}

function scrollToTableTop() {
    const el = document.querySelector('.data-table')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openCreate() {
    editingId = null
    document.getElementById('item-id').value = ''
    document.getElementById('item-name').value = ''
    selModalDistrictFilter.setValue('')
    updateModalChurchOptions('')
    selModalChurch.setValue('')
    document.getElementById('modal-title').textContent = 'Add disciple'
    document.getElementById('modal-form').classList.add('open')
}

function openEdit(id) {
    const d = allDisciples.find(x => x.id === id)
    if (!d) return
    editingId = id
    document.getElementById('item-id').value = id
    document.getElementById('item-name').value = d.full_name
    
    // Set district filter first to ensure the church is available in options
    selModalDistrictFilter.setValue(d.district_id || '')
    updateModalChurchOptions(d.district_id || '')
    selModalChurch.setValue(d.church_id)
    
    document.getElementById('modal-title').textContent = 'Edit disciple'
    document.getElementById('modal-form').classList.add('open')
}

function openDelete(id, name) {
    deletingId = id
    document.getElementById('delete-msg').textContent = `Remove "${name}"? Their attendance records will be preserved.`
    document.getElementById('modal-delete').classList.add('open')
}

function closeModal() {
    document.getElementById('modal-form').classList.remove('open')
}

async function saveItem() {
    const id = document.getElementById('item-id').value
    const name = document.getElementById('item-name').value.trim()
    const churchId = selModalChurch.getValue()

    if (!name || !churchId) {
        alert('Please fill in both name and church.')
        return
    }

    const btn = document.getElementById('btn-save')
    btn.disabled = true
    btn.textContent = 'Saving...'

    try {
        const data = { full_name: name, church_id: churchId }
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
            alert('This disciple already exists for this church.')
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
        'Full Name': d.full_name,
        'Church': d.church_name,
        'District': d.district_name
    })))
}

function bindEvents() {
    const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
    const isStaff = user && user.role === 'Staff';
    const btnExport = document.getElementById('btn-export');
    if (isStaff && btnExport) btnExport.style.display = 'none';

    document.getElementById('btn-add').onclick = () => { openCreate() }
    document.getElementById('btn-export').onclick = () => { if(!isStaff) exportCSV() }
    document.getElementById('btn-save').onclick = saveItem
    document.getElementById('btn-delete-confirm').onclick = deleteItem
    document.getElementById('search-input').addEventListener('input', () => { currentPage = 1; renderTable(); })
    document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open') }))
}

function esc(str) {
    return String(str||'')
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;')
}