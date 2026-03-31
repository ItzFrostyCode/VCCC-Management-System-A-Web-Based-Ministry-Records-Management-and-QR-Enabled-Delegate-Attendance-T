import { db, requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc, calculateAge, createSearchSelect, downloadCSV, hexToRgba } from '../utils/helper.js';

let allPastors = []
let filteredPastors = []
let editingId = null
let currentPage = 1
const ITEMS_PER_PAGE = 10

let selFilterDist, selFilterChurch
let selModalParent = null
let _selectedParentId = null
let districtsData = []
let churchesData  = []

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    highlightNav()
    injectMobileNav()
    initGuide()

    await initData()
    initFilters()
    initEventListeners()
    renderTable()

    // Pre-open add modal from "Add Fruit" link in pastor profile
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('add') === '1' && urlParams.get('parent_id')) {
      const parentId = urlParams.get('parent_id')
      const parentName = decodeURIComponent(urlParams.get('parent_name') || '')
      openModal()
      // Pre-select parent after modal opens
      setTimeout(() => {
        _selectedParentId = parentId
        if (selModalParent) selModalParent.setValue(parentId, parentName)
      }, 50)
    }

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
let _lastIsMobile = window.innerWidth <= 1024
window.addEventListener('resize', () => {
  const nowMobile = window.innerWidth <= 1024
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

  // Parent pastor select (inside modal)
  initParentSelect()
  initRecordStatusToggle()
}

function initParentSelect() {
  const container = document.getElementById('parent-pastor-select-container')
  if (!container) return

  const options = [
    { value: '', label: 'None (root / unknown origin)' },
    ...allPastors.map(p => ({
      value: p.id,
      label: p.full_name + (p.record_status === 'draft' ? ' [Draft]' : '')
    }))
  ]

  selModalParent = createSearchSelect(
    container,
    options,
    'None (root / unknown origin)',
    (val, label) => {
      _selectedParentId = val || null
      // Show "+ Draft parent" only when user typed something not found
      const btn = document.getElementById('btn-create-draft-parent')
      if (btn) btn.setAttribute('data-typed-name', label || '')
    }
  )

  // "+ Draft parent" button handler
  const btnDraftParent = document.getElementById('btn-create-draft-parent')
  if (btnDraftParent) {
    btnDraftParent.addEventListener('click', async () => {
      const typedName = btnDraftParent.getAttribute('data-typed-name') || ''
      const name = prompt(`Create a draft parent pastor with name:`, typedName)
      if (!name || !name.trim()) return

      btnDraftParent.disabled = true
      btnDraftParent.textContent = 'Creating...'
      try {
        const draft = await pastorService.createDraft(name.trim())
        // Add to options and select it
        allPastors.push({ ...draft, record_status: 'draft' })
        selModalParent.setOptions([
          { value: '', label: 'None (root / unknown origin)' },
          ...allPastors.map(p => ({
            value: p.id,
            label: p.full_name + (p.record_status === 'draft' ? ' [Draft]' : '')
          }))
        ])
        selModalParent.setValue(draft.id, `${draft.full_name} [Draft]`)
        _selectedParentId = draft.id

        const preview = document.getElementById('parent-draft-preview')
        if (preview) {
          preview.style.display = 'block'
          preview.textContent = `Draft parent "${draft.full_name}" created and linked. You can complete their record later.`
        }
      } catch (err) {
        alert('Failed to create draft parent: ' + err.message)
      } finally {
        btnDraftParent.disabled = false
        btnDraftParent.textContent = '+ Draft parent'
      }
    })
  }
}

function initRecordStatusToggle() {
  const radios = document.querySelectorAll('input[name="record-status"]')
  radios.forEach(r => r.addEventListener('change', updateRecordStatusUI))
  updateRecordStatusUI()
}

function updateRecordStatusUI() {
  const isDraft = document.getElementById('rec-draft')?.checked
  const hint = document.getElementById('draft-hint')
  const activeLbl = document.getElementById('rec-status-active-lbl')
  const draftLbl = document.getElementById('rec-status-draft-lbl')

  if (hint) hint.style.display = isDraft ? 'block' : 'none'
  if (activeLbl) {
    activeLbl.style.border = isDraft ? '1.5px solid var(--border)' : '1.5px solid var(--red)'
    activeLbl.style.background = isDraft ? 'transparent' : 'var(--red-light)'
    activeLbl.style.color = isDraft ? 'var(--text-2)' : 'var(--red)'
  }
  if (draftLbl) {
    draftLbl.style.border = isDraft ? '1.5px solid var(--text-2)' : '1.5px solid var(--border)'
    draftLbl.style.color = isDraft ? 'var(--text)' : 'var(--text-2)'
  }
}

function initEventListeners() {
  const user = authService.getCurrentUser()
  const isStaff = user && user.role === 'Staff'

  if (isStaff) {
    const btnExport = document.getElementById('btn-export')
    if (btnExport) btnExport.style.display = 'none'
  }

  document.getElementById('search-input').addEventListener('input', applyFilters)
  document.getElementById('btn-add').addEventListener('click', () => { openModal() })
  document.getElementById('btn-save').addEventListener('click', saveItem)
  document.getElementById('btn-export').addEventListener('click', () => { if (!isStaff) exportCSV() })

  // Pagination Events
  document.getElementById('btn-prev').addEventListener('click', prevPage)
  document.getElementById('btn-next').addEventListener('click', nextPage)

  // Logout Button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      await authService.signOut()
      window.location.href = '/login.html'
    })
  }

  // Bind close buttons for modals
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modal = e.target.closest('.modal-overlay')
      if (modal) {
        modal.classList.remove('open')
        // Special cleanup for image viewer
        if (modal.id === 'modal-image-viewer') {
          setTimeout(() => {
            document.getElementById('full-image-display').src = ''
          }, 300)
        }
      }
    })
  })
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

  const user = authService.getCurrentUser()
  const isStaff = user && user.role === 'Staff'
  const isMobile = window.innerWidth <= 1024

  // Clear previous rows
  body.innerHTML = '';
  
  const gridTemplate = document.getElementById('pastor-grid-template');
  const cardTemplate = document.getElementById('pastor-card-template');

  paginatedItems.forEach(p => {
    const isUndeployed = p.current_status_code === 'undeployed'
    
    // Status text mapping
    let statusFormatted = p.current_status_code || 'NA';
    let statusClass = 'status-default';
    if (statusFormatted === 'active') { statusFormatted = 'Active'; statusClass = 'status-active'; }
    else if (statusFormatted === 'undeployed') { statusFormatted = 'Undeployed'; statusClass = 'status-critical'; }
    else if (statusFormatted === 'transferred') { statusFormatted = 'Transferred'; statusClass = 'status-warning'; }
    
    const pAge = p.birthdate ? calculateAge(p.birthdate) : '—'
    const wAge = p.wife_birthdate ? calculateAge(p.wife_birthdate) : '—'
    const ageDisplay = p.wife_name ? `${pAge} / ${wAge}` : pAge
    
    const pDistrict = districtsData.find(d => String(d.id) === String(p.district_id))
    const themeColor = pDistrict ? pDistrict.theme_color : null

    if (isMobile) {
      // ── SAFE DOM RENDER FOR MOBILE CARD ──
      const clone = cardTemplate.content.cloneNode(true);
      const pastName = clone.querySelector('.pcm-name');
      const wifeName = clone.querySelector('.pcm-wife-name');
      const churchText = clone.querySelector('.church-text');
      const statusWrap = clone.querySelector('.pcm-status-wrap');
      const contactVal = clone.querySelector('.contact-val');
      const ageVal = clone.querySelector('.age-val');
      const sinceVal = clone.querySelector('.since-val');
      const pastAvaWrap = clone.querySelector('.pcm-avatar-pastor');
      const wifeAvaWrap = clone.querySelector('.pcm-avatar-wife');
      
      pastName.textContent = p.full_name;
      if (p.wife_name) wifeName.textContent = `w/ ${p.wife_name}`;
      churchText.textContent = p.church_name || '—';
      
      statusWrap.innerHTML = `<span class="status-badge ${statusClass}">${statusFormatted}</span>`;
      contactVal.textContent = p.contact_number || '—';
      ageVal.textContent = ageDisplay;
      sinceVal.textContent = p.pastoring_start_date || '—';
      
      pastAvaWrap.innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name, themeColor);
      pastAvaWrap.addEventListener('click', () => openImageViewer(p.pastor_image_url || '', p.full_name));
      
      if (p.wife_name) {
        wifeAvaWrap.innerHTML = getAvatarHtml(p.wife_image_url, p.wife_name, themeColor);
        wifeAvaWrap.addEventListener('click', () => openImageViewer(p.wife_image_url || '', p.wife_name));
      } else {
        wifeAvaWrap.style.display = 'none';
      }

      const actions = clone.querySelector('.pcm-actions');
      actions.innerHTML = `
        <button class="pcm-action-btn pcm-view" title="View Profile">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          View
        </button>
        <button class="pcm-action-btn pcm-edit" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit
        </button>
        ${!isStaff ? `<button class="pcm-action-btn pcm-delete" title="Remove">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          Delete
        </button>` : ''}
      `;
      
      actions.querySelector('.pcm-view').addEventListener('click', () => window.location.href = `pastor-view.html?id=${p.id}`);
      actions.querySelector('.pcm-edit').addEventListener('click', () => openModal(p.id));
      if (!isStaff) actions.querySelector('.pcm-delete').addEventListener('click', () => confirmDelete(p.id));

      body.appendChild(clone);

    } else {
      // ── SAFE DOM RENDER FOR DESKTOP GRID ──
      const clone = gridTemplate.content.cloneNode(true);
      
      clone.querySelector('.col-pastor .name').textContent = p.full_name;
      clone.querySelector('.col-pastor .church').textContent = p.church_name || '—';
      clone.querySelector('.col-wife .name').textContent = p.wife_name || '—';
      
      const pastAva = clone.querySelector('.col-pastor .avatar-container');
      pastAva.innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name, themeColor);
      pastAva.addEventListener('click', () => openImageViewer(p.pastor_image_url || '', p.full_name));

      const wifeAva = clone.querySelector('.col-wife .avatar-container');
      if (p.wife_name) {
        wifeAva.innerHTML = getAvatarHtml(p.wife_image_url, p.wife_name, themeColor);
        wifeAva.addEventListener('click', () => openImageViewer(p.wife_image_url || '', p.wife_name));
      } else {
        wifeAva.style.display = 'none';
      }

      clone.querySelector('.col-contact').textContent = p.contact_number || '—';
      clone.querySelector('.badge').outerHTML = `<span class="status-badge ${statusClass}">${statusFormatted}</span>`;
      clone.querySelector('.col-bdate').textContent = p.birthdate || '—';
      clone.querySelector('.col-age').textContent = ageDisplay;
      clone.querySelector('.col-since').textContent = p.pastoring_start_date || '—';

      const actions = clone.querySelector('.col-actions');
      actions.innerHTML = `
        <button class="btn-icon btn-view" title="View Profile">
          <svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="btn-icon btn-edit" title="Edit">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        ${!isStaff ? `<button class="btn-icon btn-delete" title="Remove">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        </button>` : ''}
      `;

      actions.querySelector('button[title="View Profile"]').addEventListener('click', () => window.location.href = `pastor-view.html?id=${p.id}`);
      actions.querySelector('.btn-edit').addEventListener('click', () => openModal(p.id));
      if (!isStaff) actions.querySelector('.btn-delete').addEventListener('click', () => confirmDelete(p.id));

      body.appendChild(clone);
    }
  });

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
    document.getElementById('pastor-image').value = ''
    document.getElementById('wife-image').value = ''
    document.getElementById('contact-number').value = p.contact_number || ''
    document.getElementById('birthdate').value = p.birthdate || ''
    document.getElementById('wife-birthdate').value = p.wife_birthdate || ''
    document.getElementById('pastoring-start').value = p.pastoring_start_date || ''
    document.getElementById('status-code').value = p.current_status_code || 'undeployed'

    // Record status
    const isD = (p.record_status || 'active') === 'draft'
    document.getElementById('rec-draft').checked = isD
    document.getElementById('rec-active').checked = !isD
    updateRecordStatusUI()

    // Parent pastor
    _selectedParentId = p.parent_id || null
    if (selModalParent) {
      selModalParent.setValue(
        p.parent_id || '',
        p.parent_id ? (p.parent_name || 'Unknown') : 'None (root / unknown origin)'
      )
    }
    document.getElementById('parent-draft-preview').style.display = 'none'

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

    // Reset record status to active
    document.getElementById('rec-active').checked = true
    document.getElementById('rec-draft').checked = false
    updateRecordStatusUI()

    // Reset parent
    _selectedParentId = null
    if (selModalParent) selModalParent.reset()
    document.getElementById('parent-draft-preview').style.display = 'none'

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
      current_status_code: status,
      record_status: document.querySelector('input[name="record-status"]:checked')?.value || 'active',
      parent_id: _selectedParentId || null
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

  // If pastor has children, block immediately with a friendly message
  if (p.child_count && Number(p.child_count) > 0) {
    const count = Number(p.child_count)
    const msg = `Cannot delete ${p.full_name}: they have ${count} fruit${count > 1 ? 's' : ''}/disciple${count > 1 ? 's' : ''} linked. Unlink or reassign them first.`
    document.getElementById('delete-msg').textContent = msg
    const modal = document.getElementById('modal-delete')
    modal.classList.add('open')
    // Hide the confirm button — this is info-only
    const confirmBtn = document.getElementById('btn-delete-confirm')
    if (confirmBtn) confirmBtn.style.display = 'none'
    return
  }

  document.getElementById('delete-msg').textContent =
    `Are you sure you want to remove Pastor ${p.full_name}?`
  const confirmBtn = document.getElementById('btn-delete-confirm')
  if (confirmBtn) confirmBtn.style.display = ''

  const modal = document.getElementById('modal-delete')
  modal.classList.add('open')

  document.getElementById('btn-delete-confirm').onclick = async () => {
    try {
      await pastorService.remove(id)
      await initData()
      applyFilters()
      modal.classList.remove('open')
    } catch (err) {
      alert(err.message)
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

function getAvatarHtml(imageUrl, name, themeColor) {
  if (imageUrl) {
    return `<img src="${imageUrl}" class="avatar-img" />`
  }
  const initials = String(name || '?').charAt(0).toUpperCase()
  if (themeColor && themeColor.startsWith('#')) {
    const bg = hexToRgba(themeColor, 0.15)
    return `<div class="avatar-initials" style="background-color: ${bg}; color: ${themeColor}; border: 1px solid ${themeColor};">${initials}</div>`
  }
  return `<div class="avatar-initials" style="background-color: #f0f0f0; color: #222; border: 1px solid #888;">${initials}</div>`
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
  
  const pDistrict = districtsData.find(d => String(d.id) === String(p.district_id))
  const themeColor = pDistrict ? pDistrict.theme_color : null

  // Header
  const avatarContainer = document.getElementById('view-avatar-container')
  avatarContainer.innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name, themeColor)
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