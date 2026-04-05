import { ui } from '../utils/ui.js';
import { db, requireAuth } from '../supabase.js';
import { pastorService } from '../services/pastor.service.js';
import { timelineService } from '../services/timeline.service.js';
import { discipleService } from '../services/disciple.service.js';
import { rankService } from '../services/rank.service.js';
import { trainingService } from '../services/training.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { churchService } from '../services/church.service.js';
import { esc, formatDate } from '../utils/helper.js';
import { exportPastorHistoryPDF } from '../utils/export/pastors/pastor-history-pdf.js';

/**
 * Profile Presenter Utility
 * Centralizes all semantic labeling and display logic (Thin Presentation Layer)
 */
const ProfilePresenter = {
    getMetricLabel(type, value) {
        if (type === 'disciples') return value === 0 ? "Starting Ministry Journey" : `${value} Disciples`;
        if (type === 'years') return value < 1 ? "Newly Ordained" : `${value} Years in Ministry`;
        if (type === 'churches') return value === 1 ? `1 Church Pioneered` : `${value} Churches Pioneered`;
        return '';
    },
    getCoverGradient(themeColor) {
        // Generates the Social Profile dynamic cover
        const color = themeColor || '#475569'; // Default to a sophisticated slate if no district color
        return `linear-gradient(135deg, ${color} 0%, #111827 100%)`;
    },
    formatDateLong(dateStr) {
        if (!dateStr) return 'Joined Recently';
        const d = new Date(dateStr);
        // Prevent "Invalid Date" UI errors
        return isNaN(d.getTime()) ? 'Joined Recently' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },
    getInitialsAvatar(name, themeColor) {
        const firstLetter = (name || 'P').charAt(0).toUpperCase();
        if (themeColor && themeColor.length === 7) {
            // Using hex alpha channels (88 = ~53%, CC = 80%) over the white card background creates a 'lighter' premium theme color.
            return `<div class="avatar-initials local-theme-avatar" style="background: linear-gradient(135deg, ${themeColor}88, ${themeColor}CC);">${firstLetter}</div>`;
        }
        // Hash length to grab a preset color 1-8
        const colorIndex = ((name || '').length % 8) + 1;
        return `<div class="avatar-initials bg-avatar-${colorIndex}">${firstLetter}</div>`;
    }
};

let globalPastorId = null;
let pageData = {
  pastor: null,
  history: [],
  disciples: [],
  ranks: [],
  trainings: [],
  pioneered: [],
  assignmentHistory: [] // ← NEW: church term history
};

// ─── Initialization ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await requireAuth();
        const { initLayout } = await import('../layout.js');
        initLayout('Pastors');

        const urlParams = new URLSearchParams(window.location.search);
        const pastorId = urlParams.get('id');
        
        if (!pastorId) { 
            window.location.href = 'pastors.html'; 
            return; 
        }

        globalPastorId = pastorId;
        await loadData(pastorId);
        
        initGlobalHooks();
        initTabSystem();
        initQuickEdit();
        initCommandBar();
    } catch (err) {
        console.error('Pastor View init failed:', err);
        ui.toast('Failed to load profile. Please refresh.', 'error');
    }
});

function initGlobalHooks() {
    // Attach to window object for inline HTML onclick handlers
    window.handleEditProfile = handleEditProfile;
    window.openImageViewer = openImageViewer;
    window.switchTab = switchTab;
    window.openModal = (id) => document.getElementById(id)?.classList.add('open');
    window.closeModal = (id) => document.getElementById(id)?.classList.remove('open');

    // Secretary lifecycle quick-actions from pastor profile
    window.handleProfileAssign = () => {
        if (!pageData.pastor) return;
        window.location.href = `pastors.html?add=1&pastor_id=${pageData.pastor.id}`;
    };
    window.handleProfileTransfer = () => {
        if (!pageData.pastor) return;
        window.location.href = `pastors.html?transfer=${pageData.pastor.id}`;
    };

    // Credentials logic
    window.handleAddRank = () => {
        const form = document.getElementById('rank-form');
        if (form) {
            form.reset();
            document.getElementById('fr-effective-date').value = new Date().toISOString().split('T')[0];
        }
        window.openModal('modal-rank');
    };
}

async function loadData(id) {
    try {
        // Parallel data fetching for performance
        const [pastor, history, disciples, ranks, trainings, pioneered, assignmentHistory] = await Promise.all([
            pastorService.fetchById(id),
            timelineService.fetchPastorTimeline(id),
            discipleService.fetchByPastor(id),
            rankService.fetchByPastor(id),
            trainingService.fetchByPastor(id),
            pastorService.fetchPioneeredChurches(id),
            assignmentService.fetchByPastor(id)  // ← fetch full assignment history
        ]);

        pageData = { pastor, history, disciples, ranks, trainings, pioneered, assignmentHistory };

        renderProfile(pastor);
        renderMasterTimeline(history);
        renderDisciples(disciples);
        renderAssignmentHistory(assignmentHistory);
        renderCredentials(ranks); // Render the new history section
        
    } catch (err) {
        console.error('Data load failed:', err);
        ui.toast('Error fetching profile data.', 'error');
    }
}

// ─────────────────────────────────────────────────────────────
// RENDERING ENGINES
// ─────────────────────────────────────────────────────────────

function renderProfile(p) {
    if (!p) return;

    if (document.getElementById('p-name')) document.getElementById('p-name').textContent = p.full_name;
    // Rank: derive from pageData.ranks history (senior rank by most recent date), fallback to 'Pastor'
    const rankLabel = document.getElementById('p-rank-label');
    if (rankLabel) {
        const latestRank = (pageData.ranks && pageData.ranks.length > 0)
            ? [...pageData.ranks].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0].rank_code
            : null;
        rankLabel.textContent = latestRank || p.rank_code || 'Pastor';
    }
    
    const coverEl = document.getElementById('profile-cover');
    if (coverEl) coverEl.style.background = ProfilePresenter.getCoverGradient(p.district_theme_color);

    const avatarEl = document.getElementById('p-avatar-main');
    if (avatarEl) {
        if (p.pastor_image_url) {
            avatarEl.innerHTML = `<img src="${p.pastor_image_url}" alt="${esc(p.full_name)}">`;
            avatarEl.onclick = () => window.openImageViewer(p.pastor_image_url, 'Pastor ' + p.full_name);
            avatarEl.style.cursor = 'pointer';
        } else {
            avatarEl.innerHTML = ProfilePresenter.getInitialsAvatar(p.full_name, p.district_theme_color);
            avatarEl.onclick = null;
            avatarEl.style.cursor = 'default';
        }
    }

    // District + Church + Contact
    const churchEl = document.getElementById('p-church-val');
    const districtEl = document.getElementById('p-district-val');
    const joinedEl = document.getElementById('p-joined-val');
    const phoneEl = document.getElementById('p-phone-val');
    const phoneAboutEl = document.getElementById('p-phone-about');

    // church_name and district_name are now mapped to top-level by pastorService.fetchById()
    if (churchEl)   churchEl.textContent   = p.church_name   || p.current_church || 'No church assigned';
    if (districtEl) districtEl.textContent = p.district_name || 'No district assigned';
    if (joinedEl) joinedEl.textContent = ProfilePresenter.formatDateLong(p.created_at);
    if (phoneEl) phoneEl.textContent = p.contact_number || 'No contact provided';
    if (phoneAboutEl) phoneAboutEl.textContent = p.contact_number || 'No contact provided';

    renderMetrics(p);
    renderSpouseCard(p);
    renderAboutSection(p);
}

function renderMetrics(p) {
    const mount = document.getElementById('metrics-mount');
    if (!mount) return;

    const years = calculateYears(p.pastoring_start_date || p.created_at);
    const metrics = [
        { type: 'disciples', val: p.disciple_count || 0 },
        { type: 'churches',  val: p.pioneered_count || 0 },
        { type: 'years',     val: years }
    ];

    mount.innerHTML = metrics
        .filter(m => !(m.type === 'churches' && m.val === 0))
        .map(m => `
            <div class="fb-metric">
                <span class="val">${m.val || '0'}</span>
                <span class="lbl">${ProfilePresenter.getMetricLabel(m.type, m.val)}</span>
            </div>
        `).join('');
}

function calculateYears(date) {
    if (!date) return 0;
    const startTime = new Date(date).getTime();
    if (isNaN(startTime)) return 0; // Prevent NaN calculations on bad dates
    
    const diffMs = Date.now() - startTime;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25))); // .25 accounts for leap years
}

function renderSpouseCard(p) {
    const container = document.getElementById('spouse-container');
    if (!container) return;

    if (!p.wife_name) {
        container.innerHTML = '';
        return;
    }

    container.innerHTML = `
        <div class="fb-spouse-card">
            <h3 class="fb-card-title">Ministry Partner</h3>
            <div class="fb-spouse-inner">
                <div class="fb-spouse-avatar" ${p.wife_image_url ? `onclick="window.openImageViewer('${esc(p.wife_image_url)}')" style="cursor:pointer;"` : ''}>
                    ${p.wife_image_url 
                        ? `<img src="${esc(p.wife_image_url)}" alt="${esc(p.wife_name)}">`
                        : ProfilePresenter.getInitialsAvatar(p.wife_name, p.district_theme_color)
                    }
                </div>
                <div class="fb-spouse-info">
                    <h4>${esc(p.wife_name)}</h4>
                    <p>Support & Ministry Partner</p>
                </div>
            </div>
        </div>
    `;
}

function renderAboutSection(p) {
    const content = document.getElementById('about-details-content');
    if (!content) return;

    // Derive rank from pageData.ranks history (most recent) — p.rank_code does not exist on the pastors table
    const latestRankCode = (pageData.ranks && pageData.ranks.length > 0)
        ? [...pageData.ranks].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0].rank_code
        : null;
    const rank    = latestRankCode || 'Pastor';
    const church  = p.church_name  || p.current_church || 'No church assigned';
    const district = p.district_name || 'No district';
    const joined = ProfilePresenter.formatDateLong(p.created_at);
    const startDate = p.pastoring_start_date ? ProfilePresenter.formatDateLong(p.pastoring_start_date) : null;
    const status = (p.current_status_code || 'active').charAt(0).toUpperCase() + (p.current_status_code || 'active').slice(1);

    content.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display:flex; gap:10px; align-items:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span><strong>Rank:</strong> ${esc(rank)}</span>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <span><strong>Church:</strong> ${esc(church)}</span>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>
                <span><strong>District:</strong> ${esc(district)}</span>
            </div>
            <div style="display:flex; gap:10px; align-items:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                <span><strong>Member since:</strong> ${joined}</span>
            </div>
            ${startDate ? `<div style="display:flex; gap:10px; align-items:center;"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span><strong>Pastoring since:</strong> ${startDate}</span></div>` : ''}
            <div style="display:flex; gap:10px; align-items:center;">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#65676B" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
                <span><strong>Status:</strong> ${esc(status)}</span>
            </div>
        </div>
    `;
}

function renderMasterTimeline(timeline) {
    const container = document.getElementById('master-timeline');
    if (!container) return;

    if (!timeline || timeline.length === 0) {
        container.innerHTML = `<div class="fb-event-card fb-empty-state">No timeline records yet.</div>`;
        return;
    }

    container.innerHTML = timeline.map(event => {
        const isSystem = event.category !== 'manual';
        const iconClass = isSystem ? '' : 'manual';
        const svgIcon = isSystem 
            ? `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`
            : `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.27 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`;

        return `
            <div class="fb-event-card">
                <div class="fb-event-header">
                    <div class="fb-event-icon ${iconClass}">${svgIcon}</div>
                    <div class="fb-event-meta">
                        <h4>${esc(event.title)}</h4>
                        <span class="fb-event-date">${timelineService.formatPrecisionDate(event.date, event.precision)}</span>
                    </div>
                </div>
                ${(event.subtitle || event.description) ? `
                <div class="fb-event-body">
                    ${event.subtitle ? `<p style="font-weight:600; margin-bottom:4px;">${esc(event.subtitle)}</p>` : ''}
                    ${event.description ? `<p>${esc(event.description)}</p>` : ''}
                </div>` : ''}
            </div>
        `;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// ASSIGNMENT HISTORY TIMELINE
// ─────────────────────────────────────────────────────────────
const TYPE_CONFIG = {
    pioneering: { label: '🌱 Pioneering', color: '#1b5e20', bg: '#e8f5e9', border: '#81c784' },
    takeover:   { label: '🤝 Takeover',   color: '#1a237e', bg: '#e8eaf6', border: '#9fa8da' },
    legacy:     { label: '📜 Legacy',     color: '#4e342e', bg: '#efebe9', border: '#bcaaa4' }
};
const REASON_CONFIG = {
    transferred: { label: 'Transferred', color: '#e65100', bg: '#fff3e0', border: '#ffcc80' },
    pullout:     { label: 'Pullout',     color: '#b71c1c', bg: '#ffebee', border: '#ef9a9a' },
    redirection: { label: 'Redirection', color: '#4a148c', bg: '#f3e5f5', border: '#ce93d8' },
    ended:       { label: 'Ended',       color: '#37474f', bg: '#eceff1', border: '#b0bec5' },
    deceased:    { label: 'Deceased',    color: '#212121', bg: '#f5f5f5', border: '#bdbdbd' }
};

function renderAssignmentHistory(assignments) {
    const container = document.getElementById('assignment-history-list');
    if (!container) return;

    if (!assignments || assignments.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-3);">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:.4;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                <div style="font-weight:600; margin-bottom:4px;">No assignment records yet</div>
                <div style="font-size:13px;">Use the Assign button to record a church assignment.</div>
            </div>`;
        return;
    }

    // Sort: active first, then by start_date desc
    const sorted = [...assignments].sort((a, b) => {
        if (a.status_code === 'active' && b.status_code !== 'active') return -1;
        if (b.status_code === 'active' && a.status_code !== 'active') return 1;
        return new Date(b.start_date) - new Date(a.start_date);
    });

    container.innerHTML = sorted.map((a, i) => {
        const isActive = a.status_code === 'active';
        const typeCfg = TYPE_CONFIG[a.assignment_type] || TYPE_CONFIG.legacy;
        const reasonCfg = a.end_reason ? REASON_CONFIG[a.end_reason] : null;

        const durationStr = (() => {
            const start = a.start_date ? new Date(a.start_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Unknown';
            const end   = a.end_date   ? new Date(a.end_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : null;
            return end ? `${start} – ${end}` : `${start} – <strong style="color:var(--red);">Present</strong>`;
        })();

        return `
            <div style="
                display:flex; gap:16px; padding:16px;
                border-radius:14px; margin-bottom:12px;
                background:${isActive ? 'linear-gradient(135deg,#fff8f8,#fff)' : 'var(--bg-card)'};
                border:2px solid ${isActive ? 'var(--red)' : 'var(--border)'};
                position:relative; transition: all .2s;
            ">
                <!-- Timeline connector dot -->
                <div style="
                    width:36px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;
                ">
                    <div style="
                        width:14px; height:14px; border-radius:50%;
                        background:${isActive ? 'var(--red)' : 'var(--border)'};
                        border:3px solid ${isActive ? '#fca5a5' : '#e2e8f0'};
                        margin-top:4px;
                    "></div>
                    ${i < sorted.length - 1 ? `<div style="flex:1; width:2px; background:var(--border); margin-top:4px; min-height:20px;"></div>` : ''}
                </div>
                <!-- Content -->
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                        ${isActive ? `<span style="background:var(--red); color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; letter-spacing:.05em;">NOW</span>` : ''}
                        <span style="
                            font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px;
                            background:${typeCfg.bg}; color:${typeCfg.color}; border:1px solid ${typeCfg.border};
                        ">${typeCfg.label}</span>
                        ${reasonCfg ? `<span style="
                            font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px;
                            background:${reasonCfg.bg}; color:${reasonCfg.color}; border:1px solid ${reasonCfg.border};
                        ">${reasonCfg.label}</span>` : ''}
                    </div>
                    <div style="font-size:16px; font-weight:800; color:var(--text); margin-bottom:2px;">
                        ${esc(a.church_name) || 'Unknown Church'}
                    </div>
                    <div style="font-size:12px; color:var(--text-3); font-weight:500;">${durationStr}</div>
                    ${a.notes ? `<div style="margin-top:6px; font-size:12px; color:var(--text-2); font-style:italic;">${esc(a.notes)}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Update summary badge
    const badge = document.getElementById('assignment-count-badge');
    if (badge) badge.textContent = `(${assignments.length})`;
}

function renderDisciples(disciples) {
    const mainContainer = document.getElementById('disciple-list');
    const previewContainer = document.getElementById('disciple-preview-list');
    const badge = document.getElementById('family-count-badge');

    if (badge && disciples) badge.textContent = `(${disciples.length})`;

    if (!disciples || disciples.length === 0) {
        const emptyMsg = `<div class="fb-empty-state">No spiritual family yet.</div>`;
        if (mainContainer) mainContainer.innerHTML = emptyMsg;
        if (previewContainer) previewContainer.innerHTML = emptyMsg;
        return;
    }

    // 9-grid preview for sidebar
    const previewFn = (list) => list.map(d => `
        <a href="pastor-view.html?id=${d.id}" class="fb-friend-item" title="${esc(d.full_name)}">
            ${d.pastor_image_url 
                ? `<img src="${esc(d.pastor_image_url)}" alt="${esc(d.full_name)}">`
                : ProfilePresenter.getInitialsAvatar(d.full_name)
            }
            <div class="fb-friend-name">${esc(d.full_name.split(' ')[0])}</div>
        </a>
    `).join('');

    // Full grid for Family tab
    const fullFn = (list) => list.map(d => `
        <a href="pastor-view.html?id=${d.id}" class="fb-family-item" title="${esc(d.full_name)}">
            ${d.pastor_image_url 
                ? `<img src="${esc(d.pastor_image_url)}" alt="${esc(d.full_name)}">`
                : ProfilePresenter.getInitialsAvatar(d.full_name)
            }
            <div class="fb-family-label">${esc(d.full_name)}</div>
        </a>
    `).join('');

    if (mainContainer) mainContainer.innerHTML = fullFn(disciples);
    if (previewContainer) previewContainer.innerHTML = previewFn(disciples.slice(0, 9));
}

function renderCredentials(ranks) {
    const container = document.getElementById('credentials-history-list');
    if (!container) return;

    if (!ranks || ranks.length === 0) {
        container.innerHTML = `
            <div style="text-align:center; padding:40px 20px; color:var(--text-3);">
                <svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom:12px; opacity:.4;"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>
                <div style="font-weight:600; margin-bottom:4px;">No credentials logged yet</div>
                <div style="font-size:13px;">Use the Log Status button to document official classifications.</div>
            </div>`;
        return;
    }

    container.innerHTML = ranks.map((r, i) => {
        return `
            <div style="
                display:flex; gap:16px; padding:16px;
                border-radius:14px; margin-bottom:12px;
                background:${i === 0 ? 'linear-gradient(135deg,#f0f9ff,#fff)' : 'var(--bg-card)'};
                border:2px solid ${i === 0 ? '#bae6fd' : 'var(--border)'};
                position:relative; transition: all .2s;
            ">
                <!-- Timeline dot -->
                <div style="width:36px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;">
                    <div style="
                        width:14px; height:14px; border-radius:50%;
                        background:${i === 0 ? '#0284c7' : 'var(--border)'};
                        border:3px solid ${i === 0 ? '#e0f2fe' : '#e2e8f0'};
                        margin-top:4px;
                    "></div>
                    ${i < ranks.length - 1 ? `<div style="flex:1; width:2px; background:var(--border); margin-top:4px; min-height:20px;"></div>` : ''}
                </div>
                <!-- Content -->
                <div style="flex:1; min-width:0;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        ${i === 0 ? `<span style="background:#0284c7; color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px;">CURRENT</span>` : ''}
                        <span style="font-size:12px; color:var(--text-3); font-weight:500;">
                            ${ProfilePresenter.formatDateLong(r.effective_date)}
                        </span>
                    </div>
                    <div style="font-size:16px; font-weight:800; color:var(--text);">
                        ${esc(r.rank_code)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ─────────────────────────────────────────────────────────────
// UI SYSTEMS
// ─────────────────────────────────────────────────────────────

function initTabSystem() {
    document.querySelectorAll('.fb-tab').forEach(btn => {
        btn.onclick = () => switchTab(btn.getAttribute('data-tab'));
    });
}

function switchTab(tabId) {
    document.querySelectorAll('.fb-tab').forEach(b => b.classList.remove('active'));
    document.querySelector(`.fb-tab[data-tab="${tabId}"]`)?.classList.add('active');
    
    document.querySelectorAll('.fb-section').forEach(s => s.classList.remove('active'));
    document.getElementById('section-' + tabId)?.classList.add('active');
}

function initQuickEdit() {
    const form = document.getElementById('pastor-form');
    if (!form) return;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            const getValue = (id) => document.getElementById(id)?.value || null;

            const updates = {
                full_name:           getValue('f-name'),
                wife_name:           getValue('f-wife-name'),
                contact_number:      getValue('f-contact-number'),
                birthdate:           getValue('f-birthdate')       || null,
                wife_birthdate:      getValue('f-wife-birthdate')  || null,
                pastoring_start_date:getValue('f-pastoring-start') || null,
                current_status_code: getValue('f-status-code')
            };

            // Remove null-string values so we don't accidentally blank out optional fields
            Object.keys(updates).forEach(k => { if (updates[k] === '') updates[k] = null; });
            
            await pastorService.update(globalPastorId, updates);
            ui.toast('Profile updated successfully');
            window.closeModal('modal-form');
            
            // Reload data to reflect changes
            await loadData(globalPastorId);
        } catch (err) { 
            console.error('Update failed:', err);
            ui.toast(err.message || 'Failed to update profile', 'error'); 
        }
    };

    // Rank History logic
    const rankForm = document.getElementById('rank-form');
    if (rankForm) {
        rankForm.onsubmit = async (e) => {
            e.preventDefault();
            try {
                const rankCode = document.getElementById('fr-rank-code')?.value;
                const effDate  = document.getElementById('fr-effective-date')?.value;
                
                if (!rankCode || !effDate) throw new Error('Missing required fields');

                // rankService is imported at the top of the file
                const btn = rankForm.querySelector('[type="submit"]');
                btn.disabled = true;
                btn.textContent = 'Saving...';

                await rankService.addRank({
                    pastor_id: globalPastorId,
                    rank_code: rankCode,
                    effective_date: effDate
                });

                ui.toast('Status logged successfully!');
                window.closeModal('modal-rank');
                await loadData(globalPastorId); // refresh
                btn.disabled = false;
                btn.textContent = 'Save Record';
                
            } catch (err) {
                console.error('Failed to log rank:', err);
                ui.toast(err.message || 'Error saving status record', 'error');
                const btn = rankForm.querySelector('[type="submit"]');
                if (btn) { btn.disabled = false; btn.textContent = 'Save Record'; }
            }
        };
    }
}

function handleEditProfile() {
    const p = pageData.pastor;
    if (!p) return;
    
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val || '';
    };

    setVal('f-name',           p.full_name);
    setVal('f-wife-name',      p.wife_name);
    setVal('f-contact-number', p.contact_number);
    setVal('f-status-code',    p.current_status_code || 'active');

    // Properly format date fields so they pre-fill in the <input type="date"> format
    const toDateInput = (val) => val ? new Date(val).toISOString().split('T')[0] : '';
    setVal('f-birthdate',       toDateInput(p.birthdate));
    setVal('f-wife-birthdate',  toDateInput(p.wife_birthdate));
    setVal('f-pastoring-start', toDateInput(p.pastoring_start_date));

    window.openModal('modal-form');
}

function initCommandBar() {
    // Hooks up the imported PDF export function to a UI button if it exists
    const exportBtn = document.getElementById('btn-export-pdf');
    if (exportBtn) {
        exportBtn.onclick = () => {
            if (pageData.pastor && pageData.history) {
                exportPastorHistoryPDF(pageData.pastor, pageData.history);
            } else {
                ui.toast('Data not ready for export', 'warning');
            }
        };
    }
}

function openImageViewer(url) {
    const img = document.getElementById('full-image-display');
    const modal = document.getElementById('modal-image-viewer');
    
    if (img && url && modal) {
        img.src = url;
        img.style.display = 'block';
        modal.classList.add('open');
    }
}