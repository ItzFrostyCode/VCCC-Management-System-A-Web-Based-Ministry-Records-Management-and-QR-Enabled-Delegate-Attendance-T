import { initLayout } from '../layout.js';
import { requireAuth } from '../supabase.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { timelineService } from '../services/timeline.service.js';
import { esc, formatDate } from '../utils/helper.js';

class ChurchViewController {
    constructor() {
        this.currentChurchId = null;
        this.isMounted = false;
    }

    async init(params = {}) {
        try {
            initLayout('Churches');
            await requireAuth();

            this.currentChurchId = params.id || new URLSearchParams(window.location.search).get('id');
            if (!this.currentChurchId) {
                window.router.push('church.html');
                return;
            }

            const btnBack = document.getElementById('btn-back');
            if (btnBack) {
                btnBack.onclick = () => history.back();
            }

            await this.loadData(this.currentChurchId);
            this.setupModals();
        } catch (err) {
            console.error('Church View init failed:', err);
            alert('Failed to initialize page: ' + err.message);
        }
    }

    async loadData(id) {
        try {
            const [church, history, timeline, offspring] = await Promise.all([
                churchService.fetchById(id),
                assignmentService.fetchByChurch(id),
                timelineService.fetchChurchTimeline(id),
                churchService.fetchOffspring(id)
            ]);

            let district = null;
            if (church.district_id) {
                district = await districtService.fetchById(church.district_id);
            }

            this.renderChurchInfo(church, district);
            this.renderCurrentPastor(history);
            this.renderStats(church, history);
            this.renderTimeline(timeline);
            this.renderDistrictContext(district);
            this.renderChurchLineage(church, offspring);

            const loading = document.getElementById('loading-state');
            const content = document.getElementById('content-area');
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        } catch (err) {
            console.error('Data load failed:', err);
            const loadingState = document.getElementById('loading-state');
            if (loadingState) {
                loadingState.innerHTML = `
                    <div style="color:var(--red); padding:40px;">
                        <h3>Error Loading Data</h3>
                        <p>${esc(err.message)}</p>
                        <button class="btn btn-ghost" id="btn-retry-load">Retry</button>
                    </div>
                `;
                const btnRetry = document.getElementById('btn-retry-load');
                if (btnRetry) btnRetry.onclick = () => this.loadData(id);
            }
        }
    }

    renderChurchInfo(c, d) {
        const nameEl = document.getElementById('c-name');
        if (nameEl) nameEl.textContent = c.church_name;
        const avatarEl = document.getElementById('c-avatar');
        if (avatarEl) avatarEl.textContent = c.church_name.charAt(0).toUpperCase();
        const scopeEl = document.getElementById('c-scope');
        if (scopeEl) scopeEl.textContent = (c.church_scope || 'local').toUpperCase();
        const addressEl = document.getElementById('c-address');
        if (addressEl) addressEl.textContent = c.church_address || 'No address provided';
        
        const notesWrap = document.getElementById('c-notes-wrap');
        const notesEl = document.getElementById('c-notes');
        if (notesWrap && notesEl) {
            if (c.notes) {
                notesWrap.style.display = 'block';
                notesEl.textContent = c.notes;
            } else {
                notesWrap.style.display = 'none';
            }
        }
        
        if (d && d.theme_color) {
            document.documentElement.style.setProperty('--district-theme', d.theme_color);
        }
    }

    renderCurrentPastor(history) {
        const container = document.getElementById('current-pastor-container');
        if (!container) return;
        const active = history.find(a => a.status_code === 'active' && !a.end_date);

        if (!active) {
            container.innerHTML = `
                <div class="active-pastor-card vacant">
                    <div class="pastor-card-body">
                        <div class="pastor-c-avatar" style="background:var(--red-light); color:var(--red); border-color:var(--red-light);">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                        </div>
                        <div class="pastor-c-info">
                            <div class="pastor-c-name" style="color:var(--red);">VACANT / NEEDS ASSIGNMENT</div>
                            <div class="pastor-c-sub">No active pastor is currently assigned.</div>
                        </div>
                    </div>
                    <div class="pastor-c-foot">
                        <button class="pastor-c-btn" id="btn-assign-new" style="color:var(--red);">+ Assign Pastor</button>
                    </div>
                </div>
            `;
            const btn = document.getElementById('btn-assign-new');
            if (btn) btn.onclick = () => window.router.push(`/pastors.html`);
            return;
        }

        container.innerHTML = `
            <div class="active-pastor-card">
                <div class="pastor-card-body">
                    <div class="pastor-c-avatar" style="cursor:pointer;">${active.pastor_name.charAt(0)}</div>
                    <div class="pastor-c-info">
                        <div class="pastor-c-name">${esc(active.pastor_name)}</div>
                        <div class="pastor-c-sub">
                            <strong>${esc(active.role_code)}</strong> &bull; ${esc(active.event_type)} since ${formatDate(active.start_date)}
                        </div>
                    </div>
                </div>
                <div class="pastor-c-foot">
                    <button class="pastor-c-btn" id="btn-view-active-profile">View Profile</button>
                </div>
            </div>
        `;
        const btnView = document.getElementById('btn-view-active-profile');
        if (btnView) btnView.onclick = () => window.router.push(`pastor-view.html?id=${active.pastor_id}`);
        
        const avatar = container.querySelector('.pastor-c-avatar');
        if (avatar) {
            avatar.onclick = () => this.openImageViewer(active.pastor_image_url || '', active.pastor_name);
        }
    }

    renderStats(c, history) {
        const active = history.find(a => a.status_code === 'active' && !a.end_date);
        const statusEl = document.getElementById('stat-status');
        const statusWrap = document.getElementById('stat-status-wrap');
        if (statusEl && statusWrap) {
            if (active) {
                statusEl.textContent = 'Occupied';
                statusWrap.className = 'mini-stat-pill status-occupied';
            } else {
                statusEl.textContent = 'Vacant';
                statusWrap.className = 'mini-stat-pill status-vacant';
            }
        }
        const pastorsCountEl = document.getElementById('stat-pastors');
        if (pastorsCountEl) pastorsCountEl.textContent = new Set(history.map(h => h.pastor_id)).size;
        const yearsEl = document.getElementById('stat-years');
        if (yearsEl && history.length) {
            const sorted = [...history].sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            const first = new Date(sorted[0].start_date);
            const diff = new Date().getFullYear() - first.getFullYear();
            yearsEl.textContent = diff + (diff === 1 ? ' Year' : ' Years');
        }
        const distEl = document.getElementById('stat-district');
        if (distEl) distEl.textContent = c.district_name || 'N/A';
    }

    renderDistrictContext(d) {
        if (!d) return;
        const nameEl = document.getElementById('d-name');
        if (nameEl) nameEl.textContent = d.district_name;
        const leaderEl = document.getElementById('d-leader');
        if (leaderEl) {
            const span = leaderEl.querySelector('span');
            if (span) span.textContent = d.leader_name || 'No leader assigned';
        }
        const notesEl = document.getElementById('d-notes');
        if (notesEl) notesEl.textContent = d.notes || '';
    }

    renderChurchLineage(church, offspring) {
        const container = document.getElementById('church-lineage-tree');
        if (!container) return;
        let html = '<div class="lineage-stack">';
        html += `<div class="lineage-group-title">Mother Church</div>`;
        if (church.mother_church_id) {
            html += `
                <div class="lineage-node" data-id="${church.mother_church_id}" style="cursor:pointer;">
                    <div class="lineage-ava">${esc(church.mother_name.charAt(0))}</div>
                    <div class="lineage-info">
                        <div class="lineage-name">${esc(church.mother_name)}</div>
                        <div class="lineage-sub">Source / Planting Church</div>
                    </div>
                    <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                </div>
            `;
        } else {
            html += `
                <div class="lineage-node lineage-empty">
                    <div class="lineage-ava" style="background:transparent; border-color:transparent;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
                    <div class="lineage-info">
                        <div class="lineage-name" style="color:var(--text-3);">Independent / Legacy</div>
                        <div class="lineage-sub">No recorded mother church</div>
                    </div>
                </div>
            `;
        }
        html += `<div class="lineage-group-title">Current Profile</div>
            <div class="lineage-node current-node">
                <div class="lineage-ava">${esc(church.church_name.charAt(0))}</div>
                <div class="lineage-info">
                    <div class="lineage-name" style="color:var(--text);">${esc(church.church_name)}</div>
                    <div class="lineage-sub">Pioneered by ${esc(church.pioneer_name || 'Unknown')}</div>
                </div>
            </div>
            <div class="lineage-group-title">Daughter Churches (${offspring.length})</div>`;
        if (offspring.length > 0) {
            offspring.forEach(child => {
                html += `
                    <div class="lineage-node" data-id="${child.id}" style="cursor:pointer;">
                        <div class="lineage-ava">${esc(child.church_name.charAt(0))}</div>
                        <div class="lineage-info">
                            <div class="lineage-name">${esc(child.church_name)}</div>
                            <div class="lineage-sub">${esc(child.district_name)} District</div>
                        </div>
                        <svg class="lineage-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
                    </div>
                `;
            });
        } else {
            html += `
                <div class="lineage-node lineage-empty">
                    <div class="lineage-ava" style="background:transparent; border-color:transparent;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></div>
                    <div class="lineage-info">
                        <div class="lineage-name" style="color:var(--text-3);">No Daughters Recorded</div>
                        <div class="lineage-sub">This church hasn't pioneered other locations yet</div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        container.innerHTML = html;
        container.querySelectorAll('.lineage-node[data-id]').forEach(node => {
            node.onclick = () => window.router.push(`church-view.html?id=${node.dataset.id}`);
        });
    }

    renderTimeline(timeline) {
        const container = document.getElementById('master-timeline');
        if (!container) return;
        if (!timeline || timeline.length === 0) {
            container.innerHTML = '<div style="color:var(--text-3); font-size:14px; padding:16px;">No historical events recorded.</div>';
            return;
        }
        container.innerHTML = timeline.map((item, index) => {
            let icon = '';
            let dateStr = timelineService.formatPrecisionDate(item.date, item.precision);
            if (item.type === 'PASTOR_ASSIGNED') icon = '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
            else if (item.type === 'PASTOR_LEFT') icon = '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="23" y1="11" x2="17" y2="11"/></svg>';
            else if (item.type === 'RANK_ACHIEVED') icon = '<svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>';
            else icon = '<svg viewBox="0 0 24 24"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>';
            const isActive = index === 0;
            return `
                <div class="timeline-item ${isActive ? 'active' : ''}">
                    <div class="timeline-dot"></div>
                    <div class="timeline-content">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                            <div style="font-weight:700; color:var(--text); font-size:14px; display:flex; align-items:center; gap:8px;">
                                <div style="width:24px; height:24px; background:var(--red-light); color:var(--red); border-radius:4px; display:flex; align-items:center; justify-content:center;">${icon}</div>
                                ${esc(item.title)}
                            </div>
                            <div style="font-size:12px; color:var(--text-3); font-weight:600;">${dateStr}</div>
                        </div>
                        <div style="font-size:13px; color:var(--text-2); margin-bottom:4px;">${esc(item.subtitle)}</div>
                        ${item.notes ? `<div style="font-size:13px; color:var(--text); background:var(--bg-body); padding:8px 12px; border-radius:8px; margin-top:8px; border:1px solid var(--border);">${esc(item.notes)}</div>` : ''}
                        ${item.pastor_id ? `<div style="margin-top:8px;" data-id="${item.pastor_id}" class="timeline-link"><span style="font-size:12px; color:var(--red); cursor:pointer; font-weight:600;">View Profile &rarr;</span></div>` : ''}
                    </div>
                </div>`;
        }).join('');

        container.querySelectorAll('.timeline-link').forEach(link => {
            link.onclick = () => window.router.push(`pastor-view.html?id=${link.dataset.id}`);
        });
    }

    setupModals() {
        const btnHist = document.getElementById('btn-add-historical');
        if (btnHist) {
            btnHist.onclick = async () => {
                const modal = document.getElementById('modal-historical');
                modal.classList.add('open');
                try {
                    const pastors = await pastorService.fetchAll();
                    const select = document.getElementById('hist-pastor');
                    select.innerHTML = '<option value="">-- Select Pastor --</option>' + 
                        pastors.map(p => `<option value="${p.id}">${esc(p.last_name)}, ${esc(p.first_name)}</option>`).join('');
                } catch(err) { console.error(err); }
            };
        }

        ;['btn-close-hist-modal', 'btn-cancel-hist-modal'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.onclick = () => this.closeModal('modal-historical');
        });

        const histForm = document.getElementById('form-historical');
        if (histForm) {
            histForm.onsubmit = (e) => this.submitHistorical(e);
        }

        const closeImgBtn = document.getElementById('btn-close-image-viewer');
        if (closeImgBtn) closeImgBtn.onclick = () => this.closeImageViewer();
    }

    async submitHistorical(e) {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-historical');
        const originalText = btn.textContent;
        try {
            btn.textContent = 'Saving...';
            btn.disabled = true;
            const data = {
                church_id: this.currentChurchId,
                pastor_id: document.getElementById('hist-pastor').value,
                role_code: document.getElementById('hist-role').value,
                event_type: document.getElementById('hist-event').value,
                start_date: document.getElementById('hist-start').value,
                end_date: document.getElementById('hist-end').value,
                notes: document.getElementById('hist-notes').value || null,
                status_code: 'pulled_out',
                is_primary: false,
                precision_flag: 'exact'
            };
            if (!data.pastor_id) throw new Error("Please select a pastor.");
            if (new Date(data.start_date) > new Date(data.end_date)) throw new Error("Start date cannot be after End date.");
            await assignmentService.create(data);
            this.closeModal('modal-historical');
            await this.loadData(this.currentChurchId);
            document.getElementById('form-historical').reset();
        } catch (err) {
            console.error(err);
            alert('Failed to save record: ' + err.message);
        } finally {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }

    closeModal(id) {
        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('open');
    }

    openImageViewer(url, title) {
        const modal = document.getElementById('modal-image-viewer');
        if (!modal) return;
        const img = document.getElementById('full-image-display');
        const initEl = document.getElementById('full-initials-display');
        const titleEl = document.getElementById('image-viewer-title');
        if (titleEl) titleEl.textContent = title || 'View Profile';
        if (url) {
            if (img) { img.src = url; img.style.display = 'block'; }
            if (initEl) initEl.style.display = 'none';
        } else {
            if (img) img.style.display = 'none';
            if (initEl) {
                initEl.style.display = 'flex';
                initEl.textContent = (title || '?').trim().charAt(0).toUpperCase();
            }
        }
        modal.classList.add('open');
    }

    closeImageViewer() {
        const modal = document.getElementById('modal-image-viewer');
        if (modal) modal.classList.remove('open');
        setTimeout(() => {
            const img = document.getElementById('full-image-display');
            if (img) img.src = '';
        }, 300);
    }
}

const instance = new ChurchViewController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init(params);
    instance.isMounted = true;
}

export function unmount() {
    instance.isMounted = false;
    console.log("Church View Controller Unmounted");
}

if (!window.router || !window.router.currentController) mount();
export default { mount, unmount };
