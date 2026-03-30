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
  try {
    await requireAuth()
    await initData()
    initFilters()
    initEventListeners()
    renderTable()
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

// Re-render when orientation/size crosses the mobile breakpoint
let _lastIsMobile = window.innerWidth <= 768
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 768
  if (nowMobile !== _lastIsMobile) {
    _lastIsMobile = nowMobile
    renderTable()
  }
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
    document.getElementById('table-body').innerHTML = `<div style="padding:20px; color:var(--red); text-align:center;"><strong>Database Connection Error:</strong><br>${esc(e.message)}</div>`
  }
}

function initFilters() {
  selFilterDist = createSearchSelect(
    document.getElementById('filter-district'),
    [{ value: '', label: 'All districts' }, ...districtsData.map(d => ({ value: d.id, label: d.district_name }))],
    'All districts',
    (val) => {
      const churchOpts = [
        { value: '', label: 'All churches' },
        ...churchesData
          .filter(c => !val || String(c.district_id) === String(val))
          .map(c => ({ value: c.id, label: c.church_name }))
      ]
      selFilterChurch.setOptions(churchOpts)
      selFilterChurch.reset()
      applyFilters()
    }
  )

  selFilterChurch = createSearchSelect(
    document.getElementById('filter-church'),
    [{ value: '', label: 'All churches' }, ...churchesData.map(c => ({ value: c.id, label: c.church_name }))],
    'All churches',
    () => applyFilters()
  )

  // selModalDist and selModalChurch removed - District/Church assignment is now handled in Assignments page
}

function initEventListeners() {
  const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
  const isStaff = user && user.role === 'Staff'

  if (isStaff) {
    const btnExport = document.getElementById('btn-export')
    if (btnExport) btnExport.style.display = 'none'
  }

  document.getElementById('search-input').addEventListener('input', applyFilters)
  document.getElementById('btn-add').onclick = () => { openModal() }
  document.getElementById('btn-save').onclick = saveItem
  document.getElementById('btn-export').onclick = () => { if (!isStaff) exportCSV() }
}

function applyFilters() {
  const query = (document.getElementById('search-input').value || '').toLowerCase()
  const distId = selFilterDist.getValue()
  const churchId = selFilterChurch.getValue()

  filteredPastors = allPastors.filter(p => {
    const matchesQuery =
      (p.full_name || '').toLowerCase().includes(query) ||
      (p.wife_name || '').toLowerCase().includes(query) ||
      (p.contact_number || '').toLowerCase().includes(query) ||
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

  const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
  const isStaff = user && user.role === 'Staff'
  const isMobile = window.innerWidth <= 768

  body.innerHTML = paginatedItems.map(p => {
    const deleteBtn = !isStaff
      ? `<button class="btn-icon btn-delete" onclick="confirmDelete('${p.id}')" title="Remove">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>`
      : ''
    let statusBadge = ''
    if (p.current_status_code === 'active') statusBadge = '<span class="status-badge" style="background:#e8f5e9;color:#2e7d32;">Active</span>'
    else if (p.current_status_code === 'undeployed') statusBadge = '<span class="status-badge" style="background:#f5f5f5;color:#757575;">Undeployed</span>'
    else if (p.current_status_code === 'transferred') statusBadge = '<span class="status-badge" style="background:#e3f2fd;color:#1565c0;">Transferred</span>'
    else if (p.current_status_code === 'redirection') statusBadge = '<span class="status-badge" style="background:#fff3e0;color:#ef6c00;">Redirection</span>'
    else if (p.current_status_code === 'pullout') statusBadge = '<span class="status-badge" style="background:#ffebee;color:#c62828;">Pullout</span>'
    else statusBadge = `<span class="status-badge" style="background:#f5f5f5;color:#757575;">${esc(p.current_status_code)}</span>`

    const pastorAvatar = `
      <div class="avatar-container" onclick="openImageViewer('${p.pastor_image_url || ''}', 'Pastor ${esc(p.full_name)}')">
        ${getAvatarHtml(p.pastor_image_url, p.full_name)}
        <div class="avatar-hover-overlay">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
      </div>`
    
    const wifeAvatar = p.wife_name ? `
      <div class="avatar-container" onclick="openImageViewer('${p.wife_image_url || ''}', 'Wife ${esc(p.wife_name)}')">
        ${getAvatarHtml(p.wife_image_url, p.wife_name)}
        <div class="avatar-hover-overlay">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
      </div>` : ''

    const pAge = p.birthdate ? calculateAge(p.birthdate) : '—'
    const wAge = p.wife_birthdate ? calculateAge(p.wife_birthdate) : '—'
    const ageDisplay = p.wife_name ? `${pAge} / ${wAge}` : pAge

    // ─── Mobile Card Layout ───────────────────────────────────────────
    if (isMobile) {
      return `
      <div class="pastor-card-mobile">
        <div class="pcm-header">
          <div class="pcm-avatars">
            <div class="pcm-avatar-wrap" onclick="openImageViewer('${p.pastor_image_url || ''}', 'Pastor ${esc(p.full_name)}')">
              ${getAvatarHtml(p.pastor_image_url, p.full_name)}
            </div>
            ${p.wife_name ? `<div class="pcm-avatar-wrap pcm-avatar-wife" onclick="openImageViewer('${p.wife_image_url || ''}', 'Wife ${esc(p.wife_name)}')">
              ${getAvatarHtml(p.wife_image_url, p.wife_name)}
            </div>` : ''}
          </div>
          <div class="pcm-title-area">
            <div class="pcm-name">${esc(p.full_name)}</div>
            ${p.wife_name ? `<div class="pcm-wife-name">w/ ${esc(p.wife_name)}</div>` : ''}
          </div>
          ${statusBadge}
        </div>

        <div class="pcm-info-grid">
          <div class="pcm-info-item">
            <span class="pcm-info-label">Contact</span>
            <span class="pcm-info-value">${esc(p.contact_number) || '—'}</span>
          </div>
          <div class="pcm-info-item">
            <span class="pcm-info-label">Age</span>
            <span class="pcm-info-value">${ageDisplay}</span>
          </div>
          <div class="pcm-info-item">
            <span class="pcm-info-label">Since</span>
            <span class="pcm-info-value">${esc(p.pastoring_start_date) || '—'}</span>
          </div>
          <div class="pcm-info-item">
            <span class="pcm-info-label">Church</span>
            <span class="pcm-info-value" style="font-size:11px;">${esc(p.church_name) || '—'}</span>
          </div>
        </div>

        <div class="pcm-actions">
          <button class="pcm-action-btn pcm-view" onclick="window.location.href='pastor-view.html?id=${p.id}'" title="View Profile">
            <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button class="pcm-action-btn pcm-edit" onclick="openModal('${p.id}')" title="Edit">
            <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Edit
          </button>
          ${!isStaff ? `<button class="pcm-action-btn pcm-delete" onclick="confirmDelete('${p.id}')" title="Remove">
            <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            Delete
          </button>` : ''}
        </div>
      </div>`
    }

    // ─── Desktop Grid Layout ──────────────────────────────────────────
    return `
    <div class="data-table-row cols-pastors">
      <div class="cell-name-primary" data-label="Pastor" title="${esc(p.full_name)}" style="display:flex;align-items:center;">
        ${pastorAvatar}${esc(p.full_name)}
      </div>
      <div style="color:var(--text); font-weight:500; display:flex; align-items:center;" data-label="Wife" title="${esc(p.wife_name)}">
        ${wifeAvatar}${esc(p.wife_name) || '—'}
      </div>
      <div style="color:var(--text); font-weight:600;" data-label="Contact" title="${esc(p.contact_number)}">${esc(p.contact_number) || '—'}</div>
      <div data-label="Status">${statusBadge}</div>
      <div style="color:var(--text-2); opacity:0.8;" data-label="Birthdate" title="${esc(p.birthdate)}">${esc(p.birthdate) || '—'}</div>
      <div style="color:var(--text); font-weight:600;" data-label="Age">${ageDisplay}</div>
      <div style="color:var(--text-2); opacity:0.8;" data-label="Since" title="${esc(p.pastoring_start_date)}">${esc(p.pastoring_start_date) || '—'}</div>
      <div class="row-actions">
        <button class="btn-icon" onclick="window.location.href='pastor-view.html?id=${p.id}'" title="View Profile" style="background:hsla(150, 100%, 97%, 1); color:hsl(150, 80%, 35%); border-color:hsla(150, 100%, 90%, 1);">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-icon btn-edit" onclick="openModal('${p.id}')" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${deleteBtn}
      </div>
    </div>`
  }).join('')

  const pagination = document.getElementById('pagination')
  if (pagination) {
    pagination.style.display = 'flex'
    document.getElementById('page-info').textContent = `Showing ${startIndex + 1} to ${Math.min(endIndex, filteredPastors.length)} of ${filteredPastors.length}`
  }

  const btnPrev = document.getElementById('btn-prev')
  const btnNext = document.getElementById('btn-next')

  if (currentPage === 1) { btnPrev.disabled = true; btnPrev.style.opacity = '0.5' } else { btnPrev.disabled = false; btnPrev.style.opacity = '1' }
  if (currentPage === totalPages) { btnNext.disabled = true; btnNext.style.opacity = '0.5' } else { btnNext.disabled = false; btnNext.style.opacity = '1' }
}


function prevPage() {
  if (currentPage > 1) {
    currentPage--
    renderTable()
    scrollToTableTop()
  }
}

function nextPage() {
  const totalPages = Math.ceil(filteredPastors.length / ITEMS_PER_PAGE)
  if (currentPage < totalPages) {
    currentPage++
    renderTable()
    scrollToTableTop()
  }
}

function scrollToTableTop() {
  const el = document.querySelector('.data-table')
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
    // Cannot set value to file inputs due to browser security, so leave empty. 
    // We already have their current URLs in the database.
    document.getElementById('pastor-image').value = ''
    document.getElementById('wife-image').value = ''
    document.getElementById('contact-number').value = p.contact_number || ''
    document.getElementById('birthdate').value = p.birthdate || ''
    document.getElementById('wife-birthdate').value = p.wife_birthdate || ''
    document.getElementById('pastoring-start').value = p.pastoring_start_date || ''
    document.getElementById('status-code').value = p.current_status_code || 'undeployed'

    // Show removal options if images exist
    const pRemoveWrap = document.getElementById('p-img-remove-wrap')
    const wRemoveWrap = document.getElementById('w-img-remove-wrap')
    const pRemoveChk  = document.getElementById('remove-p-img')
    const wRemoveChk  = document.getElementById('remove-w-img')

    pRemoveChk.checked = false
    wRemoveChk.checked = false

    if (p.pastor_image_url) pRemoveWrap.style.display = 'block'
    else pRemoveWrap.style.display = 'none'

    if (p.wife_image_url) wRemoveWrap.style.display = 'block'
    else wRemoveWrap.style.display = 'none'

  } else {
    title.textContent = 'Add pastor'
    btnSave.textContent = 'Save pastor'

    document.getElementById('item-name').value = ''
    document.getElementById('wife-name').value = ''
    document.getElementById('pastor-image').value = ''
    document.getElementById('wife-image').value = ''
    document.getElementById('contact-number').value = ''
    document.getElementById('birthdate').value = ''
    document.getElementById('wife-birthdate').value = ''
    document.getElementById('pastoring-start').value = ''
    document.getElementById('status-code').value = 'undeployed'

    document.getElementById('p-img-remove-wrap').style.display = 'none'
    document.getElementById('w-img-remove-wrap').style.display = 'none'
    document.getElementById('remove-p-img').checked = false
    document.getElementById('remove-w-img').checked = false
  }

  modal.classList.add('open')
}

function closeModal() {
  document.getElementById('modal-form').classList.remove('open')
}

async function saveItem() {
  const id       = editingId
  const name     = document.getElementById('item-name').value.trim()
  const wife     = document.getElementById('wife-name').value.trim()
  const pFile    = document.getElementById('pastor-image').files[0]
  const wFile    = document.getElementById('wife-image').files[0]
  const contact  = document.getElementById('contact-number').value.trim()
  const bdate    = document.getElementById('birthdate').value.trim()
  const wdate    = document.getElementById('wife-birthdate').value.trim()
  const start    = document.getElementById('pastoring-start').value.trim()
  const status   = document.getElementById('status-code').value

  if (!name) {
    alert('Please fill in the pastor name.')
    return
  }

  const btn = document.getElementById('btn-save')
  btn.disabled = true
  btn.textContent = 'Saving...'

  try {
    let finalPastorImageUrl = null
    let finalWifeImageUrl = null

    // If editing, keep old images by default unless a new file is chosen
    if (id) {
      const existingPastor = allPastors.find(x => String(x.id) === String(id))
      if (existingPastor) {
        finalPastorImageUrl = existingPastor.pastor_image_url
        finalWifeImageUrl = existingPastor.wife_image_url
      }
    }
    // Check removal options
    const pRemove = document.getElementById('remove-p-img').checked
    const wRemove = document.getElementById('remove-w-img').checked

    if (pRemove) finalPastorImageUrl = null
    if (wRemove) finalWifeImageUrl = null

    // Helper function to upload an image to Supabase Storage
    const uploadFileToSupabase = async (file, folder) => {
      const fileExt = file.name.split('.').pop()
      const fileName = `${folder}/${Math.random()}.${fileExt}`
      const { data, error } = await db.storage.from('avatars').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (error) throw error
      const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(fileName)
      return publicUrl
    }

    if (pFile) {
      btn.textContent = 'Uploading Pastor Image...'
      finalPastorImageUrl = await uploadFileToSupabase(pFile, 'pastors')
    }
    
    if (wFile) {
      btn.textContent = 'Uploading Wife Image...'
      finalWifeImageUrl = await uploadFileToSupabase(wFile, 'wives')
    }

    btn.textContent = 'Saving Record...'

    const data = {
      full_name: name,
      wife_name: wife || null,
      pastor_image_url: finalPastorImageUrl,
      wife_image_url: finalWifeImageUrl,
      contact_number: contact || null,
      birthdate: bdate || null,
      wife_birthdate: wdate || null,
      pastoring_start_date: start || null,
      current_status_code: status
    }

    const isUpdate = id && id !== 'null' && id !== 'undefined'
    await (isUpdate ? pastorService.update(id, data) : pastorService.create(data))

    closeModal()
    await initData()
    applyFilters()
  } catch (err) {
    console.error('SAVE_ERROR_DETAILS:', err)
    if (err.code === '23505') {
      alert('This pastor already exists.')
    } else {
      alert(`Failed to save pastor: ${err.message || 'Unknown error'}. Check console for details.`)
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
    Contact: p.contact_number,
    Status: p.current_status_code,
    Birthdate: p.birthdate,
    Since: p.pastoring_start_date
  })))
}

function getAvatarHtml(imageUrl, name) {
  if (imageUrl) {
    return `<img src="${imageUrl}" class="avatar-img" />`
  }
  const initials = String(name || '?').charAt(0).toUpperCase()
  const charCode = initials.charCodeAt(0)
  const bgIndex = (charCode % 5) + 1
  return `<div class="avatar-initials bg-avatar-${bgIndex}">${initials}</div>`
}

/* Image Viewer Functions */
function openImageViewer(url, title) {
  if (!url) return
  const modal = document.getElementById('modal-image-viewer')
  const img = document.getElementById('full-image-display')
  const titleEl = document.getElementById('image-viewer-title')
  
  img.src = url
  titleEl.textContent = title || 'View Image'
  modal.classList.add('open')
}

function closeImageViewer() {
  const modal = document.getElementById('modal-image-viewer')
  modal.classList.remove('open')
  setTimeout(() => {
    document.getElementById('full-image-display').src = ''
  }, 300)
}

/* View Details Modal Function */
async function openViewModal(id) {
  const p = allPastors.find(x => String(x.id) === String(id))
  if (!p) return

  const modal = document.getElementById('modal-view-details')
  
  // Header
  const avatarContainer = document.getElementById('view-avatar-container')
  avatarContainer.innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name)
  avatarContainer.onclick = () => openImageViewer(p.pastor_image_url, 'Pastor ' + p.full_name)
  
  document.getElementById('view-pastor-name').textContent = p.full_name
  
  // Status Badge
  const statusBadge = document.getElementById('view-status-badge')
  if (p.current_status_code === 'active') statusBadge.innerHTML = '<span class="status-badge" style="background:#e8f5e9;color:#2e7d32;">Active</span>'
  else if (p.current_status_code === 'undeployed') statusBadge.innerHTML = '<span class="status-badge" style="background:#f5f5f5;color:#757575;">Undeployed</span>'
  else if (p.current_status_code === 'transferred') statusBadge.innerHTML = '<span class="status-badge" style="background:#e3f2fd;color:#1565c0;">Transferred</span>'
  else if (p.current_status_code === 'redirection') statusBadge.innerHTML = '<span class="status-badge" style="background:#fff3e0;color:#ef6c00;">Redirection</span>'
  else if (p.current_status_code === 'pullout') statusBadge.innerHTML = '<span class="status-badge" style="background:#ffebee;color:#c62828;">Pullout</span>'
  else statusBadge.innerHTML = `<span class="status-badge" style="background:#f5f5f5;color:#757575;">${esc(p.current_status_code)}</span>`

  // Grid Details
  document.getElementById('view-contact').textContent = p.contact_number || '—'
  document.getElementById('view-birthdate').textContent = p.birthdate ? `${p.birthdate} (${calculateAge(p.birthdate)} yrs)` : '—'
  document.getElementById('view-wife').textContent = p.wife_name || '—'
  document.getElementById('view-wife-birthdate').textContent = p.wife_birthdate ? `${p.wife_birthdate} (${calculateAge(p.wife_birthdate)} yrs)` : '—'
  document.getElementById('view-since').textContent = p.pastoring_start_date || '—'
  document.getElementById('view-district').textContent = p.district_name || '—'
  document.getElementById('view-church').textContent = p.church_name || '—'

  // Footer Edit Button
  const editBtn = document.getElementById('btn-view-edit')
  editBtn.onclick = () => {
    modal.classList.remove('open')
    openModal(id)
  }

  modal.classList.add('open')
}