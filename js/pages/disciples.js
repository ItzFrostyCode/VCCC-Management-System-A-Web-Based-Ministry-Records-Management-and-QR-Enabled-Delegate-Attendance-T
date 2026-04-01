import { db } from '../db.js';
import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { discipleService } from '../services/disciple.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc, downloadCSV, hexToRgba } from '../utils/helper.js';
import { createSearchSelect } from '../../components/search-select/search-select.js';

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

// Re-render when orientation/size crosses the mobile breakpoint
let _lastIsMobile = window.innerWidth <= 1024
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 1024
  if (nowMobile !== _lastIsMobile) {
    _lastIsMobile = nowMobile
    renderTable()
  }
})

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Disciples: DOMContentLoaded start')
    // Global error handler for UI that overwrites skeletons
    window.onerror = function(msg, url, line) {
        console.error('GLOBAL ERROR:', msg, 'at', url, ':', line)
        const body = document.getElementById('table-body')
        if (body) body.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Script Error:</strong><br>${msg}<br><small>Line: ${line}</small></div>`
    }

    try {
        console.log('Disciples: auth check...')
        await requireAuth()
        console.log('Disciples: nav/guide init...')
        highlightNav()
        injectMobileNav()
        initGuide()

        console.log('Disciples: init UI...')
        initUI()
        console.log('Disciples: fetching data...')
        await initData()
        console.log('Disciples: binding events...')
        bindEvents()
        console.log('Disciples: init complete')
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
    const modalChurchEl = document.getElementById('modal-church-sel')
    const modalDistFilterEl = document.getElementById('modal-district-filter')
    const filterDistEl = document.getElementById('filter-district')
    const filterPastorEl = document.getElementById('filter-pastor')

    if (modalChurchEl) {
        selModalChurch = createSearchSelect(modalChurchEl, [], 'Select Church')
    }
    if (modalDistFilterEl) {
        selModalDistrictFilter = createSearchSelect(modalDistFilterEl, [], 'All Districts')
        selModalDistrictFilter.onChange = (distId) => updateModalChurchOptions(distId)
    }
    if (filterDistEl) {
        selFilterDistrict = createSearchSelect(filterDistEl, [], 'All Districts')
        selFilterDistrict.onChange = () => { currentPage = 1; renderTable(); }
    }
    if (filterPastorEl) {
        selFilterPastor = createSearchSelect(filterPastorEl, [], 'All Pastors')
        selFilterPastor.onChange = () => { currentPage = 1; renderTable(); }
    }
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
        console.log('initData: Starting Promise.all...')
        const [ch, dists, d, p] = await Promise.all([
            churchService.fetchAll(),
            districtService.fetchAll(),
            discipleService.fetchAll(),
            pastorService.fetchAll()
        ])
        console.log('initData: Promise.all success', { ch: !!ch, dists: !!dists, d: !!d, p: !!p })

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
        console.error('initData failed:', e)
        const body = document.getElementById('table-body')
        if (body) {
            body.innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Data Load Error:</strong><br>${esc(e.message)}</div>`
        }
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
        if (body) body.innerHTML = '<div class="empty-state">No disciples found.</div>'
        const pagination = document.getElementById('pagination')
        if (pagination) pagination.style.display = 'none'
        return
    }

    const user = authService.getCurrentUser()
    const isStaff = user && user.role === 'Staff'
    const isMobile = window.innerWidth <= 1024

    // Clear previous rows
    body.innerHTML = '';
    
    const gridTemplate = document.getElementById('disciple-grid-template');
    const cardTemplate = document.getElementById('disciple-card-template');

    paginated.forEach(d => {
        const safeName = esc(d.full_name).replace(/'/g, '&#39;')
        const dDistrict = allDistricts.find(x => String(x.id) === String(d.district_id))
        const themeColor = dDistrict ? dDistrict.theme_color : null
        
        if (isMobile) {
            const clone = cardTemplate.content.cloneNode(true);
            const nameEl = clone.querySelector('.pcm-name');
            const churchSub = clone.querySelector('.d-church-sub');
            const distVal = clone.querySelector('.d-district-val');
            const churchVal = clone.querySelector('.d-church-val');
            const avaWrap = clone.querySelector('.pcm-avatar-pastor');
            
            nameEl.textContent = d.full_name;
            churchSub.textContent = d.church_name || '—';
            distVal.textContent = d.district_name || '—';
            churchVal.textContent = d.church_name || '—';
            
            avaWrap.innerHTML = getAvatarHtml(d.disciple_image_url, d.full_name, themeColor);
            avaWrap.style.cursor = 'pointer';
            avaWrap.onclick = () => openImageViewer(d.disciple_image_url || '', d.full_name);

            const actions = clone.querySelector('.pcm-actions');
            actions.innerHTML = `
                <button class="pcm-action-btn pcm-edit" title="Edit">
                  <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Edit
                </button>
                ${!isStaff ? `<button class="pcm-action-btn pcm-delete" title="Remove">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                  Delete
                </button>` : ''}
            `;
            
            actions.querySelector('.pcm-edit').onclick = () => openEdit(d.id);
            if (!isStaff) actions.querySelector('.pcm-delete').onclick = () => openDelete(d.id, safeName);
            
            body.appendChild(clone);

        } else {
            const clone = gridTemplate.content.cloneNode(true);
            const nameEl = clone.querySelector('.d-name');
            const churchEl = clone.querySelector('.d-church');
            const distEl = clone.querySelector('.d-district');
            const avaContainer = clone.querySelector('.avatar-container');
            
            nameEl.textContent = d.full_name;
            churchEl.textContent = d.church_name || '—';
            distEl.textContent = d.district_name || '—';
            avaContainer.innerHTML = getAvatarHtml(d.disciple_image_url, d.full_name, themeColor);
            avaContainer.style.cursor = 'pointer';
            avaContainer.onclick = () => openImageViewer(d.disciple_image_url || '', d.full_name);

            const actions = clone.querySelector('.row-actions');
            actions.innerHTML = `
                <button class="btn-icon btn-edit btn-edit-action" title="Edit">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                </button>
                ${!isStaff ? `
                <button class="btn-icon btn-delete btn-delete-action" title="Remove">
                  <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
                ` : ''}
            `;
            
            actions.querySelector('.btn-edit-action').onclick = () => openEdit(d.id);
            const delBtn = actions.querySelector('.btn-delete-action');
            if (delBtn) delBtn.onclick = () => openDelete(d.id, safeName);
            
            body.appendChild(clone);
        }
    });

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
    document.getElementById('disciple-image').value = ''
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
    document.getElementById('disciple-image').value = ''
    
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

function closeDeleteModal() {
    document.getElementById('modal-delete').classList.remove('open')
}

// Helper function to upload an image to Supabase Storage
async function uploadFileToSupabase(file, folder) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${folder}/${Math.random()}.${fileExt}`
    const { data, error } = await db.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true })
    if (error) throw error
    const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(fileName)
    return publicUrl
}

async function saveItem() {
    const id = document.getElementById('item-id').value
    const name = document.getElementById('item-name').value.trim()
    const churchId = selModalChurch.getValue()
    const imgFile = document.getElementById('disciple-image').files[0]

    if (!name || !churchId) {
        alert('Please fill in both name and church.')
        return
    }

    const btn = document.getElementById('btn-save')
    btn.disabled = true
    btn.textContent = 'Saving...'

    try {
        let finalImageUrl = null
        if (id) {
            const existing = allDisciples.find(x => x.id === id)
            if (existing) finalImageUrl = existing.disciple_image_url
        }

        if (imgFile) {
            btn.textContent = 'Uploading image...'
            finalImageUrl = await uploadFileToSupabase(imgFile, 'disciples')
        }

        const data = { 
            full_name: name, 
            church_id: churchId,
            disciple_image_url: finalImageUrl
        }

        const isUpdate = id && id !== 'null' && id !== 'undefined'
        if (isUpdate) {
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
    const btnLogout = document.getElementById('btn-logout')
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await authService.signOut()
            window.location.href = '/login.html'
        })
    }

    const user = authService.getCurrentUser();
    const isStaff = user && user.role === 'Staff';
    const btnExport = document.getElementById('btn-export');
    if (isStaff && btnExport) btnExport.style.display = 'none';

    document.getElementById('btn-add').onclick = () => { openCreate() }
    const expBtn = document.getElementById('btn-export')
    if (expBtn) expBtn.onclick = () => { if(!isStaff) exportCSV() }
    
    document.getElementById('btn-save').onclick = saveItem
    document.getElementById('btn-delete-confirm').onclick = deleteItem
    document.getElementById('btn-prev').onclick = prevPage
    document.getElementById('btn-next').onclick = nextPage
    
    document.getElementById('search-input').addEventListener('input', () => { currentPage = 1; renderTable(); })
    
    // Close modal clicks
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modal = e.target.closest('.modal-overlay')
            if (modal) {
                if (modal.id === 'modal-form') closeModal()
                else if (modal.id === 'modal-delete') closeDeleteModal()
                // image-viewer closes via inline onclick or its own logic anyway,
                // so we do not call anything else.
            }
        })
    })

    document.querySelectorAll('.modal-overlay').forEach(el => el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open') }))
}

function getAvatarHtml(imageUrl, name, themeColor) {
    if (imageUrl) {
        return `<img src="${imageUrl}" class="avatar-img" style="width:100%;height:100%;object-fit:cover;" />`
    }
    const initials = String(name || '?').charAt(0).toUpperCase()
    if (themeColor && themeColor.startsWith('#')) {
        // hexToRgba function is already imported at the top
        const bg = hexToRgba(themeColor, 0.15)
        return `<div class="avatar-initials" style="background-color: ${bg}; color: ${themeColor}; border: 1px solid ${themeColor}; width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;">${initials}</div>`
    }
    
    // Fallback if no theme color exists
    const charCode = initials.charCodeAt(0)
    const bgIndex = (charCode % 5) + 1
    return `<div class="avatar-initials bg-avatar-${bgIndex}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;">${initials}</div>`
}

function openImageViewer(url, title) {
  const modal = document.getElementById('modal-image-viewer')
  if (!modal) return
  
  const img = document.getElementById('full-image-display')
  const initEl = document.getElementById('full-initials-display')
  const titleEl = document.getElementById('image-viewer-title')
  
  titleEl.textContent = title || 'View Profile'
  
  if (url) {
    img.src = url
    img.style.display = 'block'
    if (initEl) initEl.style.display = 'none'
  } else {
    img.style.display = 'none'
    if (initEl) {
      initEl.style.display = 'flex'
      let nameStr = (title || '?').trim()
      if (!nameStr) nameStr = '?'
      initEl.textContent = nameStr.charAt(0).toUpperCase()
    }
  }
  
  modal.classList.add('open')
}

function closeImageViewer() {
  const modal = document.getElementById('modal-image-viewer')
  if (modal) modal.classList.remove('open')
  setTimeout(() => {
    const img = document.getElementById('full-image-display')
    if (img) img.src = ''
  }, 300)
}

// Ensure globally accessible for inline handlers
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;