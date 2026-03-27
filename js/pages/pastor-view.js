// pastor-view.js

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    const urlParams = new URLSearchParams(window.location.search)
    const pastorId = urlParams.get('id')

    if (!pastorId) {
      window.location.href = 'pastors.html'
      return
    }

    await loadData(pastorId)
  } catch (err) {
    console.error('Pastor View init failed:', err)
    alert('Failed to initialize page: ' + err.message)
  }
})

async function loadData(id) {
  try {
    const [pastor, history, disciples] = await Promise.all([
      pastorService.fetchById(id),
      assignmentService.fetchByPastor(id),
      discipleService.fetchByPastor(id)
    ])

    renderProfile(pastor)
    renderStats(pastor, history, disciples)
    renderHistory(history)
    renderDisciples(disciples)

    document.getElementById('loading-state').style.display = 'none'
    document.getElementById('content-area').style.display = 'block'

    document.getElementById('btn-edit-pastor').onclick = () => {
      // For now, redirect back to pastors and open edit modal might be complex 
      // since it's a different page. Ideally, pastors.html could handle this with a URL param.
      // But let's just show an alert for now or implement a dedicated edit page later.
      alert('Edit functionality from this view is coming soon. Please edit from the Pastors list for now.')
    }

  } catch (err) {
    console.error('Data load failed:', err)
    document.getElementById('loading-state').innerHTML = `
      <div style="color:var(--red); padding:40px;">
        <h3>Error Loading Data</h3>
        <p>${esc(err.message)}</p>
        <button class="btn btn-ghost" onclick="location.reload()">Retry</button>
      </div>
    `
  }
}

function renderProfile(p) {
  document.getElementById('p-name').textContent = p.full_name
  document.getElementById('p-avatar-main').innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name)
  
  if (p.wife_name) {
    document.getElementById('p-avatar-wife').innerHTML = getAvatarHtml(p.wife_image_url, p.wife_name)
    document.getElementById('p-avatar-wife').style.display = 'block'
  } else {
    document.getElementById('p-avatar-wife').style.display = 'none'
  }

  const statusMap = {
    active: { label: 'Active', color: '#2e7d32', bg: '#e8f5e9' },
    undeployed: { label: 'Undeployed', color: '#757575', bg: '#f5f5f5' },
    transferred: { label: 'Transferred', color: '#1565c0', bg: '#e3f2fd' },
    redirection: { label: 'Redirection', color: '#ef6c00', bg: '#fff3e0' },
    pullout: { label: 'Pullout', color: '#c62828', bg: '#ffebee' }
  }
  
  const st = statusMap[p.current_status_code] || { label: p.current_status_code, color: '#757575', bg: '#f5f5f5' }
  document.getElementById('p-status').innerHTML = `<span class="status-badge" style="background:${st.bg}; color:${st.color};">${st.label}</span>`
  
  document.getElementById('p-phone').textContent = p.contact_number || 'No contact provided'
  document.getElementById('p-bday').textContent = p.birthdate ? 'Born ' + formatDate(p.birthdate) : 'Birthdate unknown'
  document.getElementById('p-notes').textContent = p.notes || ''
}

function renderStats(p, history, disciples) {
  // Years of Service
  if (p.pastoring_start_date) {
    const start = new Date(p.pastoring_start_date)
    const now = new Date()
    const diff = now.getFullYear() - start.getFullYear()
    document.getElementById('stat-years').textContent = diff + (diff === 1 ? ' Year' : ' Years')
  }

  // Churches served
  const churchCount = new Set(history.map(h => h.church_id)).size
  document.getElementById('stat-churches').textContent = churchCount

  // Disciples
  document.getElementById('stat-disciples').textContent = disciples.length

  // Current Role
  const active = history.find(h => h.status_code === 'active' && !h.end_date)
  if (active) {
    document.getElementById('stat-role').textContent = active.church_name
  } else {
    document.getElementById('stat-role').textContent = 'Unassigned'
  }
}

function renderHistory(history) {
  const container = document.getElementById('assignment-history')
  if (!history.length) {
    container.innerHTML = '<div class="empty-state">No assignment history found.</div>'
    return
  }

  container.innerHTML = history.map((h, i) => {
    const isActive = h.status_code === 'active' && !h.end_date
    return `
      <div class="timeline-item ${isActive ? 'active' : ''}">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="font-weight:700; color:var(--text);">${esc(h.church_name)}</div>
            <span class="pill pill-ghost" style="font-size:11px;">${formatTimelineDate(h.start_date)} — ${h.end_date ? formatTimelineDate(h.end_date) : 'Present'}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            <span class="pill" style="font-size:11px; background:var(--red-light); color:var(--red); border:none;">${esc(h.assignment_type)}</span>
            <span style="font-size:12px; color:var(--text-3); font-weight:500;">${esc(h.district_name)} District</span>
          </div>
          ${h.notes ? `<div style="margin-top:10px; font-size:12px; color:var(--text-2); border-top:1px solid var(--border); padding-top:8px;">${esc(h.notes)}</div>` : ''}
        </div>
      </div>
    `
  }).join('')
}

function renderDisciples(disciples) {
  const container = document.getElementById('disciple-list')
  if (!disciples.length) {
    container.innerHTML = '<div class="empty-state">No disciples recorded yet.</div>'
    return
  }

  container.innerHTML = disciples.map(d => `
    <div class="disciple-chip">
      <div style="width:24px; height:24px; border-radius:50%; background:var(--red-light); color:var(--red); display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800;">
        ${d.full_name.charAt(0)}
      </div>
      ${esc(d.full_name)}
    </div>
  `).join('')
}

function formatTimelineDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function getAvatarHtml(imageUrl, name) {
  if (imageUrl) {
    return `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" />`
  }
  const initials = String(name || '?').charAt(0).toUpperCase()
  return `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--red-light); color:var(--red); font-weight:800; font-size:1.5em;">${initials}</div>`
}
