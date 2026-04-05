import { esc } from '../utils/helper.js';
import { timelineService } from '../services/timeline.service.js';

/**
 * Profile Presenter Utility
 * Centralizes all semantic labeling and display logic (Thin Presentation Layer)
 */
export const ProfilePresenter = {
    getMetricLabel(type, value) {
        if (type === 'disciples') return value === 0 ? "Starting Ministry Journey" : `${value} Disciples`;
        if (type === 'years') return value < 1 ? "Newly Ordained" : `${value} Years in Ministry`;
        if (type === 'churches') return value === 1 ? `1 Church Pioneered` : `${value} Churches Pioneered`;
        return '';
    },
    getCoverGradient(themeColor) {
        const color = themeColor || '#475569';
        return `linear-gradient(135deg, ${color} 0%, #111827 100%)`;
    },
    formatDateLong(dateStr) {
        if (!dateStr) return 'Joined Recently';
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? 'Joined Recently' : d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    },
    getInitialsAvatar(name, themeColor) {
        const firstLetter = (name || 'P').charAt(0).toUpperCase();
        if (themeColor && themeColor.length === 7) {
            return `<div class="avatar-initials local-theme-avatar" style="background: linear-gradient(135deg, ${themeColor}88, ${themeColor}CC);">${firstLetter}</div>`;
        }
        const colorIndex = ((name || '').length % 8) + 1;
        return `<div class="avatar-initials bg-avatar-${colorIndex}">${firstLetter}</div>`;
    }
};

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

export class PastorViewView {
    constructor() {
        this.data = null;
    }

    renderAll(data) {
        this.data = data;
        this.renderProfile(data.pastor);
        this.renderMasterTimeline(data.history);
        this.renderDisciples(data.disciples);
        this.renderAssignmentHistory(data.assignmentHistory);
        this.renderCredentials(data.ranks);
    }

    renderProfile(p) {
        if (!p) return;

        if (document.getElementById('p-name')) document.getElementById('p-name').textContent = p.full_name;
        
        // Rank: derive from this.data.ranks history (senior rank by most recent date), fallback to 'Pastor'
        const rankLabel = document.getElementById('p-rank-label');
        if (rankLabel) {
            const latestRank = (this.data.ranks && this.data.ranks.length > 0)
                ? [...this.data.ranks].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0].rank_code
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

        const churchEl = document.getElementById('p-church-val');
        const districtEl = document.getElementById('p-district-val');
        const joinedEl = document.getElementById('p-joined-val');
        const phoneEl = document.getElementById('p-phone-val');
        const phoneAboutEl = document.getElementById('p-phone-about');

        if (churchEl)   churchEl.textContent   = p.church_name   || p.current_church || 'No church assigned';
        if (districtEl) districtEl.textContent = p.district_name || 'No district assigned';
        if (joinedEl) joinedEl.textContent = ProfilePresenter.formatDateLong(p.created_at);
        if (phoneEl) phoneEl.textContent = p.contact_number || 'No contact provided';
        if (phoneAboutEl) phoneAboutEl.textContent = p.contact_number || 'No contact provided';

        this.renderMetrics(p);
        this.renderSpouseCard(p);
        this.renderAboutSection(p);
    }

    renderMetrics(p) {
        const mount = document.getElementById('metrics-mount');
        if (!mount) return;

        const years = this.calculateYears(p.pastoring_start_date || p.created_at);
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

    calculateYears(date) {
        if (!date) return 0;
        const startTime = new Date(date).getTime();
        if (isNaN(startTime)) return 0;
        const diffMs = Date.now() - startTime;
        return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 365.25)));
    }

    renderSpouseCard(p) {
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

    renderAboutSection(p) {
        const content = document.getElementById('about-details-content');
        if (!content) return;

        const latestRankCode = (this.data.ranks && this.data.ranks.length > 0)
            ? [...this.data.ranks].sort((a, b) => new Date(b.effective_date) - new Date(a.effective_date))[0].rank_code
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

    renderMasterTimeline(timeline) {
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

    renderAssignmentHistory(assignments) {
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
                    <div style="width:36px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;">
                        <div style="width:14px; height:14px; border-radius:50%; background:${isActive ? 'var(--red)' : 'var(--border)'}; border:3px solid ${isActive ? '#fca5a5' : '#e2e8f0'}; margin-top:4px;"></div>
                        ${i < sorted.length - 1 ? `<div style="flex:1; width:2px; background:var(--border); margin-top:4px; min-height:20px;"></div>` : ''}
                    </div>
                    <div style="flex:1; min-width:0;">
                        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:6px;">
                            ${isActive ? `<span style="background:var(--red); color:#fff; font-size:10px; font-weight:800; padding:2px 8px; border-radius:20px; letter-spacing:.05em;">NOW</span>` : ''}
                            <span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; background:${typeCfg.bg}; color:${typeCfg.color}; border:1px solid ${typeCfg.border};">${typeCfg.label}</span>
                            ${reasonCfg ? `<span style="font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px; background:${reasonCfg.bg}; color:${reasonCfg.color}; border:1px solid ${reasonCfg.border};">${reasonCfg.label}</span>` : ''}
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

        const badge = document.getElementById('assignment-count-badge');
        if (badge) badge.textContent = `(${assignments.length})`;
    }

    renderDisciples(disciples) {
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

        const previewFn = (list) => list.map(d => `
            <a href="pastor-view.html?id=${d.id}" class="fb-friend-item" title="${esc(d.full_name)}">
                ${d.pastor_image_url 
                    ? `<img src="${esc(d.pastor_image_url)}" alt="${esc(d.full_name)}">`
                    : ProfilePresenter.getInitialsAvatar(d.full_name)
                }
                <div class="fb-friend-name">${esc(d.full_name.split(' ')[0])}</div>
            </a>
        `).join('');

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

    renderCredentials(ranks) {
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
                    <div style="width:36px; flex-shrink:0; display:flex; flex-direction:column; align-items:center;">
                        <div style="width:14px; height:14px; border-radius:50%; background:${i === 0 ? '#0284c7' : 'var(--border)'}; border:3px solid ${i === 0 ? '#e0f2fe' : '#e2e8f0'}; margin-top:4px;"></div>
                        ${i < ranks.length - 1 ? `<div style="flex:1; width:2px; background:var(--border); margin-top:4px; min-height:20px;"></div>` : ''}
                    </div>
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
}
