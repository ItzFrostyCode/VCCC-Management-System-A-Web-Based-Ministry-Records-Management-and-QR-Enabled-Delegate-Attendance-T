import { requireAuth } from '../supabase.js';
import { pastorService } from '../services/pastor.service.js';
import { timelineService } from '../services/timeline.service.js';
import { discipleService } from '../services/disciple.service.js';
import { rankService } from '../services/rank.service.js';
import { trainingService } from '../services/training.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { churchService } from '../services/church.service.js';
import { esc, calculateAge, formatDate } from '../utils/helper.js';

// pastor-view.js
let globalPastorId = null;

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    const urlParams = new URLSearchParams(window.location.search)
    const pastorId = urlParams.get('id')

    if (!pastorId) {
      window.location.href = 'pastors.html'
      return
    }

    globalPastorId = pastorId;

    await loadData(pastorId)
  } catch (err) {
    console.error('Pastor View init failed:', err)
    alert('Failed to initialize page: ' + err.message)
  }
})

async function loadData(id) {
  try {
    const [pastor, history, disciples, ranks, trainings, children, pioneered] = await Promise.all([
      pastorService.fetchById(id),
      timelineService.fetchPastorTimeline(id),
      discipleService.fetchByPastor(id),
      rankService.fetchByPastor(id),
      trainingService.fetchByPastor(id),
      pastorService.getChildren(id),
      pastorService.fetchPioneeredChurches(id)
    ])

    renderProfile(pastor)
    renderStats(pastor, history, disciples, ranks, trainings, pioneered)
    renderMasterTimeline(history)
    renderDisciples(disciples)
    renderLineage(pastor, children)
    renderFoundations(pioneered)

    document.getElementById('loading-state').style.display = 'none'
    document.getElementById('content-area').style.display = 'block'

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
  const mainAvatarEl = document.getElementById('p-avatar-main')
  mainAvatarEl.innerHTML = getAvatarHtml(p.pastor_image_url, p.full_name)
  if (p.pastor_image_url) {
    mainAvatarEl.style.cursor = 'pointer'
    mainAvatarEl.onclick = () => openImageViewer(p.pastor_image_url, 'Pastor ' + p.full_name)
  }

  const wifeAvatarEl = document.getElementById('p-avatar-wife')
  if (p.wife_name) {
    wifeAvatarEl.innerHTML = getAvatarHtml(p.wife_image_url, p.wife_name)
    wifeAvatarEl.style.display = 'block'
    if (p.wife_image_url) {
      wifeAvatarEl.style.cursor = 'pointer'
      wifeAvatarEl.onclick = () => openImageViewer(p.wife_image_url, 'Wife ' + p.wife_name)
    }
  } else {
    wifeAvatarEl.style.display = 'none'
  }

  const statusMap = {
    active: { label: 'Active', color: '#2e7d32', bg: '#e8f5e9' },
    undeployed: { label: 'Undeployed', color: '#757575', bg: '#f5f5f5' },
    transferred: { label: 'Transferred', color: '#1565c0', bg: '#e3f2fd' },
    redirection: { label: 'Redirection', color: '#ef6c00', bg: '#fff3e0' },
    pullout: { label: 'Pullout', color: '#c62828', bg: '#ffebee' }
  }
  
  const st = statusMap[p.current_status_code] || { label: p.current_status_code, color: '#757575', bg: '#f5f5f5' }
  document.getElementById('p-status').innerHTML = `<span class="status-badge" style="background:${st.bg}; color:${st.color}; font-size:12px; font-weight:700;">${st.label}</span>`
  
  // Append text node after the SVG icon in the pill spans
  const phoneEl = document.getElementById('p-phone')
  phoneEl.appendChild(document.createTextNode(p.contact_number || 'No contact'))
  
  const pAge = p.birthdate ? ` (${calculateAge(p.birthdate)} yrs)` : ''
  const bdayEl = document.getElementById('p-bday')
  bdayEl.appendChild(document.createTextNode(p.birthdate ? formatDate(p.birthdate) + pAge : 'Birthdate unknown'))
  
  let notesHtml = p.notes || ''
  if (p.wife_name) {
    const wAge = p.wife_birthdate ? ` (${calculateAge(p.wife_birthdate)} yrs)` : ''
    const wBday = p.wife_birthdate ? formatDate(p.wife_birthdate) : 'unknown'
    notesHtml = `<strong>Wife:</strong> ${p.wife_name} (Born ${wBday}${wAge})<br><br>${notesHtml}`
  }
  document.getElementById('p-notes').innerHTML = notesHtml
}

function renderStats(p, history, disciples, ranks, trainings, pioneered) {
  // Years of Service
  if (p.pastoring_start_date) {
    const start = new Date(p.pastoring_start_date)
    const now = new Date()
    let diff = now.getFullYear() - start.getFullYear()
    if (diff < 0) diff = 0
    document.getElementById('stat-years').textContent = diff + (diff === 1 ? ' Year' : ' Years')
  }

  // Churches served
  const churchCount = new Set(history.filter(h => h.church_id).map(h => h.church_id)).size
  document.getElementById('stat-churches').textContent = churchCount

  // Disciples
  document.getElementById('stat-disciples').textContent = disciples.length

  // Pioneered
  if (document.getElementById('stat-pioneered')) {
    document.getElementById('stat-pioneered').textContent = (pioneered ? pioneered.length : 0)
  }

  // Current Rank
  if (ranks && ranks.length > 0) {
      document.getElementById('stat-rank').textContent = ranks[0].rank_code;
  } else {
      document.getElementById('stat-rank').textContent = 'Worker';
  }

  // Training
  document.getElementById('stat-training').textContent = (trainings ? trainings.length : 0) + ' Courses';

  // Current Role from Timeline (First ASSIGNMENT_START that is active)
  const active = history.find(h => h.type === 'ASSIGNMENT_START' && h.raw_data.status_code === 'active' && !h.raw_data.end_date)
  if (active) {
    document.getElementById('stat-role').textContent = active.raw_data.churches?.church_name || 'Assigned'
  } else {
    document.getElementById('stat-role').textContent = 'Unassigned'
  }
}

function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.remove('active');
    b.style.borderBottom = 'none';
    b.style.color = 'var(--text-2)';
  });
  const activeBtn = document.querySelector(`.tab-btn[onclick="switchTab('${tabId}')"]`);
  if(activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.style.borderBottom = '2px solid var(--red)';
    activeBtn.style.color = 'var(--red)';
  }

  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  const target = document.getElementById('tab-' + tabId);
  if(target) target.style.display = 'block';
}

function renderMasterTimeline(timeline) {
  const container = document.getElementById('master-timeline')
  if (!timeline || !timeline.length) {
    container.innerHTML = '<div class="empty-state">No ministry history recorded yet.</div>'
    return
  }

  container.innerHTML = timeline.map(event => {
    const isBlocker = event.type === 'TRAINING_FAILED';
    const isActiveAss = event.type === 'ASSIGNMENT_START' && event.raw_data.status_code === 'active' && !event.raw_data.end_date;
    
    let dotColor = 'var(--surface)';
    let dotBorder = 'var(--red)';
    if (isActiveAss) dotColor = 'var(--red)';
    if (isBlocker) dotBorder = 'var(--red-dark)';

    let typePill = '';
    if (event.type === 'ASSIGNMENT_START') typePill = `<span class="pill" style="font-size:11px; background:var(--red-light); color:var(--red); border:none;">Assignment</span>`;
    else if (event.type === 'RANK_CHANGE') typePill = `<span class="pill" style="font-size:11px; background:#e3f2fd; color:#1565c0; border:none;">Promotion</span>`;
    else if (event.type === 'TRAINING_LOG') typePill = `<span class="pill" style="font-size:11px; background:#e8f5e9; color:#2e7d32; border:none;">Training</span>`;
    else if (event.type === 'TRAINING_FAILED') typePill = `<span class="pill" style="font-size:11px; background:#ffebee; color:#c62828; border:none;">Blocker</span>`;
    else if (event.type === 'ASSIGNMENT_END') typePill = `<span class="pill" style="font-size:11px; background:#f5f5f5; color:#757575; border:none;">Conclusion</span>`;
    else if (event.type === 'PIONEERED_CHURCH') typePill = `<span class="pill" style="font-size:11px; background:#e0f2f1; color:#00796b; border:none;">Foundation</span>`;

    if (event.type === 'PIONEERED_CHURCH') { dotColor = '#00796b'; dotBorder = '#00796b'; }

    return `
      <div class="timeline-item ${isActiveAss ? 'active' : ''}">
        <div class="timeline-dot" style="background:${dotColor}; border-color:${dotBorder};"></div>
        <div class="timeline-content" style="${isBlocker ? 'border-color:var(--red-dark);' : ''}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
            <div style="font-weight:700; color:${isBlocker ? 'var(--red-dark)' : 'var(--text)'};">${esc(event.title)}</div>
            <span class="pill pill-ghost" style="font-size:11px;">${timelineService.formatPrecisionDate(event.date, event.precision)}</span>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${typePill}
            <span style="font-size:12px; color:var(--text-3); font-weight:500;">${esc(event.subtitle)}</span>
          </div>
          ${event.notes ? `<div style="margin-top:10px; font-size:12px; color:var(--text-2); border-top:1px solid var(--border); padding-top:8px;">${esc(event.notes)}</div>` : ''}
        </div>
      </div>
    `
  }).join('')
}

// --- Modal Handling & Actions ---

function openModal(modalId) {
  document.getElementById(modalId).classList.add('open');
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('open');
    const form = modal.querySelector('form');
    if (form) form.reset();
  }
}

function handleModalClickOutside(e, modalId) {
  if (e.target.id === modalId) closeModal(modalId);
}

// 1. Promote Rank
function openPromoteModal() {
  document.getElementById('promote-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-promote');
}

async function submitPromote(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-promote');
  btn.textContent = 'Saving...';
  btn.disabled = true;

  try {
    const data = {
      pastor_id: globalPastorId,
      rank_code: document.getElementById('promote-rank').value,
      effective_date: document.getElementById('promote-date').value,
      precision_flag: document.getElementById('promote-precision').value,
      source: document.getElementById('promote-source').value
    };
    
    await rankService.addRank(data);
    closeModal('modal-promote');
    loadData(globalPastorId); // Refresh timeline
  } catch (err) {
    console.error('Promotion failed:', err);
    alert('Failed to save rank: ' + err.message);
  } finally {
    btn.textContent = 'Save Rank';
    btn.disabled = false;
  }
}

// 2. Log Training
function openTrainingModal() {
  document.getElementById('training-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-training');
}

function toggleBlockerFlag() {
  const status = document.getElementById('training-status').value;
  const blocker = document.getElementById('training-blocker');
  if (status === 'Failed') {
    blocker.disabled = false;
    blocker.checked = true;
  } else {
    blocker.disabled = true;
    blocker.checked = false;
  }
}

async function submitTraining(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-training');
  btn.textContent = 'Logging...';
  btn.disabled = true;

  try {
    const data = {
      pastor_id: globalPastorId,
      course_name: document.getElementById('training-course').value,
      status_code: document.getElementById('training-status').value,
      completion_date: document.getElementById('training-date').value,
      precision_flag: document.getElementById('training-precision').value,
      blocker_flag: document.getElementById('training-blocker').checked,
      notes: document.getElementById('training-notes').value
    };
    
    await trainingService.addTrainingLog(data);
    closeModal('modal-training');
    loadData(globalPastorId); // Refresh timeline
  } catch (err) {
    console.error('Training log failed:', err);
    alert('Failed to log training: ' + err.message);
  } finally {
    btn.textContent = 'Log Training';
    btn.disabled = false;
  }
}

// 3. Transfer Pastor
async function openTransferModal() {
  try {
    // Populate dropdown with active churches
    const churches = await churchService.fetchAll();
    const select = document.getElementById('transfer-church');
    select.innerHTML = '<option value="" disabled selected>Select new assignment...</option>';
    churches.forEach(c => {
      select.innerHTML += `<option value="${c.id}">${c.church_name}</option>`;
    });

    document.getElementById('transfer-date').value = new Date().toISOString().split('T')[0];
    openModal('modal-transfer');
  } catch (e) {
    alert("Could not load churches: " + e.message);
  }
}

async function submitTransfer(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-transfer');
  btn.textContent = 'Transferring...';
  btn.disabled = true;

  try {
    const isPrimary = document.getElementById('transfer-is-primary').checked;
    // Confirm hard block warning
    if (isPrimary) {
      if (!confirm("This will close the current Primary assignment (if any) and open a new one. Proceed?")) {
        btn.textContent = 'Confirm Transfer';
        btn.disabled = false;
        return;
      }
    }

    const data = {
      pastor_id: globalPastorId,
      church_id: document.getElementById('transfer-church').value,
      transfer_date: document.getElementById('transfer-date').value,
      role_code: document.getElementById('transfer-role').value,
      event_type: document.getElementById('transfer-event').value,
      precision_flag: document.getElementById('transfer-precision').value,
      is_primary: isPrimary,
      notes: document.getElementById('transfer-notes').value
    };
    
    await assignmentService.transferPastor(data);
    closeModal('modal-transfer');
    loadData(globalPastorId); // Refresh timeline
  } catch (err) {
    console.error('Transfer failed:', err);
    alert('Failed to transfer pastor: ' + err.message);
  } finally {
    btn.textContent = 'Confirm Transfer';
    btn.disabled = false;
  }
}

// 4. Pullout Pastor
function openPulloutModal() {
  document.getElementById('pullout-date').value = new Date().toISOString().split('T')[0];
  openModal('modal-pullout');
}

async function submitPullout(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-submit-pullout');
  btn.textContent = 'Pulling out...';
  btn.disabled = true;

  try {
    if (!confirm("This will close the active Primary assignment immediately and leave the pastor Undeployed. Proceed?")) {
      btn.textContent = 'Confirm Pullout';
      btn.disabled = false;
      return;
    }

    const data = {
      pastor_id: globalPastorId,
      pullout_date: document.getElementById('pullout-date').value,
      notes: document.getElementById('pullout-notes').value
    };

    await assignmentService.pulloutPastor(data);
    closeModal('modal-pullout');
    loadData(globalPastorId); // Refresh timeline
  } catch (err) {
    console.error('Pullout failed:', err);
    alert('Failed to pull out pastor: ' + err.message);
  } finally {
    btn.textContent = 'Confirm Pullout';
    btn.disabled = false;
  }
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

// ─── Zone 3: Foundations ───────────────────────────────────────────────────
function renderFoundations(churches) {
  const section = document.getElementById('foundations-section')
  const container = document.getElementById('foundations-list')
  if (!section || !container) return

  if (!churches || churches.length === 0) {
    section.style.display = 'none'
    return
  }

  section.style.display = 'block'
  container.innerHTML = churches.map(c => `
    <a href="church-view.html?id=${esc(String(c.id))}" class="foundation-card">
      <div class="foundation-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:18px;height:18px;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      </div>
      <div style="flex:1;">
        <div style="font-size:14px; font-weight:600; color:var(--text);">${esc(c.church_name)}</div>
        <div style="font-size:12px; color:var(--text-3);">${esc(c.district_name || 'No District')}</div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;color:var(--text-3);"><polyline points="9 18 15 12 9 6"/></svg>
    </a>
  `).join('')
}

// ─── Zone 3: Ministry Lineage ─────────────────────────────────────────────────
function renderLineage(pastor, children) {
  const container = document.getElementById('lineage-tree')
  if (!container) return

  const isDraft = (pastor.record_status || 'active') === 'draft'

  let html = ''

  // 1. Mentor (Parent)
  html += `
    <div class="lineage-section-label">
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      Mentor / Spiritual Father
    </div>
  `

  if (pastor.parent_id && pastor.parent_name) {
    html += `
      <a href="pastor-view.html?id=${esc(String(pastor.parent_id))}" class="lineage-node lineage-parent">
        <div class="lineage-avatar">${pastor.parent_name.charAt(0)}</div>
        <div class="lineage-node-info">
          <div class="lineage-node-name">${esc(pastor.parent_name)}</div>
          <div class="lineage-node-sub">Source of Mentorship</div>
        </div>
        <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
      </a>`
  } else {
    html += `
      <div class="lineage-node lineage-empty">
        <div class="lineage-avatar" style="background:var(--bg-body); color:var(--text-3);"><svg viewBox="0 0 24 24" width="16" height="16"><path d="M12 2v20M2 12h20"/></svg></div>
        <div class="lineage-node-info">
          <div class="lineage-node-name" style="color:var(--text-3);">Origin Unknown</div>
          <div class="lineage-node-sub">No recorded mentor</div>
        </div>
      </div>`
  }

  // 2. Current Profile
  html += `
    <div class="lineage-section-label" style="margin-top:24px;">Current Profile</div>
    <div class="lineage-node" style="border-color:var(--red); background:#fff5f5; cursor:default;">
      <div class="lineage-avatar" style="background:var(--red); color:white;">${pastor.full_name.charAt(0)}</div>
      <div class="lineage-node-info">
        <div class="lineage-node-name" style="color:var(--red); font-weight:800;">${esc(pastor.full_name)}</div>
        <div class="lineage-node-sub">${esc(pastor.current_church || 'Unassigned')} · ${esc(pastor.rank_code || 'No Rank')}</div>
      </div>
      ${isDraft ? '<span class="lineage-draft-badge" style="margin-left:auto;">Draft</span>' : ''}
    </div>
  `

  // 3. Fruits (Children)
  html += `
    <div class="lineage-section-label" style="margin-top:24px; justify-content:space-between;">
      <div style="display:flex; align-items:center; gap:6px;">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
        Spiritual Fruit / Disciples (${children ? children.length : 0})
      </div>
      <a href="pastors.html?add=1&parent_id=${esc(String(pastor.id))}&parent_name=${encodeURIComponent(pastor.full_name)}" 
         class="btn" style="height:26px; padding:0 10px; font-size:11px; font-weight:700; background:var(--bg-body); color:var(--text); border:1px solid var(--border);">
        + Add Fruit
      </a>
    </div>
  `

  if (children && children.length > 0) {
    html += `
      <div class="lineage-tree-wrapper">
        <div class="lineage-tree-line"></div>
        ${children.map(ch => {
          const chDraft = (ch.record_status || 'active') === 'draft'
          return `
            <div class="lineage-tree-item">
              <a href="pastor-view.html?id=${esc(String(ch.id))}" class="lineage-node lineage-child${chDraft ? ' lineage-draft' : ''}">
                <div class="lineage-avatar" style="${chDraft ? 'opacity:0.5;' : ''}">${ch.full_name.charAt(0)}</div>
                <div class="lineage-node-info">
                  <div class="lineage-node-name">
                    ${esc(ch.full_name)}
                    ${chDraft ? '<span class="lineage-draft-badge">Draft</span>' : ''}
                  </div>
                  <div class="lineage-node-sub">${esc(ch.church_name || 'Unassigned')}</div>
                </div>
                <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
              </a>
            </div>`
        }).join('')}
      </div>`
  } else {
    html += `
      <div class="lineage-node lineage-empty">
        <div class="lineage-avatar" style="background:var(--bg-body); color:var(--text-3);"><svg viewBox="0 0 24 24" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
        <div class="lineage-node-info">
          <div class="lineage-node-name" style="color:var(--text-3);">No disciples yet</div>
          <div class="lineage-node-sub">This pastor has no recorded spiritual fruit</div>
        </div>
      </div>`
  }

  container.innerHTML = html
}

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

function formatTimelineDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function getAvatarHtml(imageUrl, name) {
  if (imageUrl) {
    return `<img src="${imageUrl}" style="width:100%; height:100%; object-fit:cover;" />`
  }
  const initials = String(name || '?').charAt(0).toUpperCase()
  return `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; background:var(--red-light); color:var(--red); font-weight:800; font-size:1.5em;">${initials}</div>`
}

// Global exposure for HTML onclick handlers
window.switchTab = switchTab;
window.openModal = openModal;
window.closeModal = closeModal;
window.handleModalClickOutside = handleModalClickOutside;
window.openPromoteModal = openPromoteModal;
window.submitPromote = submitPromote;
window.openTrainingModal = openTrainingModal;
window.toggleBlockerFlag = toggleBlockerFlag;
window.submitTraining = submitTraining;
window.openTransferModal = openTransferModal;
window.submitTransfer = submitTransfer;
window.openPulloutModal = openPulloutModal;
window.submitPullout = submitPullout;
window.openImageViewer = openImageViewer;
window.closeImageViewer = closeImageViewer;
