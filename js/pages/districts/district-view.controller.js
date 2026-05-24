import { initLayout } from '../layout.js';
import { requireAuth } from '../supabase.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { assignmentService } from '../services/assignment.service.js';
import { esc } from '../utils/helper.js';

class DistrictViewController {
    constructor() {
        this.allChurches = [];
        this.allAssignments = [];
        this.currentDistrict = null;
        this.isMounted = false;
    }

    async init(params = {}) {
        try {
            initLayout('District');
            await requireAuth();
            
            const id = params.id || new URLSearchParams(window.location.search).get('id');
            if (!id) {
                window.router.push('district.html');
                return;
            }

            await this.loadData(id);
            this.initListeners();
        } catch (e) {
            console.error('Init failed:', e);
            alert('Init failed: ' + e.message);
        }
    }

    async loadData(id) {
        try {
            const [district, churches, assignments] = await Promise.all([
                districtService.fetchById(id),
                churchService.fetchAll(),
                assignmentService.fetchAll()
            ]);

            this.currentDistrict = district;
            this.allChurches = churches.filter(c => c.district_id === id);
            this.allAssignments = (assignments || []).filter(a => a.status_code === 'active' && !a.end_date);

            this.renderHeader();
            this.renderStats();
            this.renderList();

            const loading = document.getElementById('loading-state');
            const content = document.getElementById('main-content');
            if (loading) loading.style.display = 'none';
            if (content) content.style.display = 'block';
        } catch (e) {
            console.error('Data load failed:', e);
            const loading = document.getElementById('loading-state');
            if (loading) {
                loading.innerHTML = `
                    <div style="color:var(--red); padding:40px;">
                        <h3>Error Loading Dashboard</h3>
                        <p>${e.message}</p>
                        <button class="btn btn-ghost" onclick="location.reload()">Retry</button>
                    </div>
                `;
            }
        }
    }

    renderHeader() {
        const d = this.currentDistrict;
        const hero = document.getElementById('district-hero');
        if (d && d.theme_color && hero) {
            hero.style.background = d.theme_color;
        }
        const nameHero = document.getElementById('d-name-hero');
        if (nameHero) nameHero.textContent = d.district_name;
        const leaderName = document.getElementById('leader-name');
        if (leaderName) leaderName.textContent = d.leader_name || 'No leader assigned';
        const leaderAvatar = document.getElementById('leader-avatar');
        if (leaderAvatar) leaderAvatar.textContent = (d.leader_name || '?')[0].toUpperCase();
        const dNotes = document.getElementById('d-notes');
        if (dNotes) dNotes.textContent = d.notes || '';
    }

    renderStats() {
        const total = this.allChurches.length;
        const activeChurchIds = new Set(this.allAssignments.map(a => a.church_id));
        const occupied = this.allChurches.filter(c => activeChurchIds.has(c.id)).length;
        const vacant = total - occupied;
        const activePastors = this.allAssignments.filter(a => this.allChurches.some(c => c.id === a.church_id)).length;

        const statTotal = document.getElementById('stat-total');
        if (statTotal) statTotal.textContent = total;
        const statOccupied = document.getElementById('stat-occupied');
        if (statOccupied) statOccupied.textContent = occupied;
        const statVacant = document.getElementById('stat-vacant');
        if (statVacant) statVacant.textContent = vacant;
        const statPastors = document.getElementById('stat-pastors');
        if (statPastors) statPastors.textContent = activePastors;
    }

    renderList() {
        const container = document.getElementById('church-list');
        const searchInput = document.getElementById('search-input');
        const statusFilterEl = document.getElementById('filter-status');
        if (!container || !searchInput || !statusFilterEl) return;

        const search = searchInput.value.toLowerCase().trim();
        const statusFilter = statusFilterEl.value;

        const activeChurchMap = {};
        this.allAssignments.forEach(a => {
            activeChurchMap[a.church_id] = a.pastor_name;
        });

        const filtered = this.allChurches.filter(c => {
            const pastor = activeChurchMap[c.id] || '';
            const matchesSearch = c.church_name.toLowerCase().includes(search) || pastor.toLowerCase().includes(search);
            const isOccupied = !!activeChurchMap[c.id];
            let matchesStatus = true;
            if (statusFilter === 'occupied') matchesStatus = isOccupied;
            if (statusFilter === 'vacant') matchesStatus = !isOccupied;
            return matchesSearch && matchesStatus;
        });

        if (!filtered.length) {
            container.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-3); font-weight:500; background:var(--bg-input); border-radius:12px; border:2px dashed var(--border);">No churches found matching criteria.</div>`;
            return;
        }

        container.innerHTML = filtered.map(c => {
            const pastor = activeChurchMap[c.id];
            return `
                <div class="church-card" data-id="${c.id}">
                    <div class="church-info">
                        <div class="church-icon">
                            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
                        </div>
                        <div>
                            <div class="church-name">${esc(c.church_name)}</div>
                            <div class="church-pastor">${pastor ? pastor : 'No active pastor'}</div>
                        </div>
                    </div>
                    <span class="status-badge ${pastor ? 'status-occupied' : 'status-vacant'}">
                        ${pastor ? 'Occupied' : 'Vacant'}
                    </span>
                </div>
            `;
        }).join('');

        container.querySelectorAll('.church-card').forEach(card => {
            card.onclick = () => window.router.push(`church-view.html?id=${card.dataset.id}`);
        });
    }

    initListeners() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) searchInput.oninput = () => this.renderList();
        const statusFilter = document.getElementById('filter-status');
        if (statusFilter) statusFilter.onchange = () => this.renderList();
    }
}

const instance = new DistrictViewController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init(params);
    instance.isMounted = true;
}

export function unmount() {
    instance.isMounted = false;
    console.log("District View Controller Unmounted");
}

if (!window.router || !window.router.currentController) mount();
export default { mount, unmount };
