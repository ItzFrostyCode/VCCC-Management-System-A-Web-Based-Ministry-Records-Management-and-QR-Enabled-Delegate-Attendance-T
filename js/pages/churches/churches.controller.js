/**
 * Churches Page - Controller (Entry Point)
 */
import { initLayout } from '../../layout.js';
import { churchService } from '../../services/church.service.js';
import { assignmentService } from '../../services/assignment.service.js';
import { discipleService } from '../../services/disciple.service.js';
import { exportChurches } from '../../utils/export/church/export-church.js';
import { ui } from '../../utils/ui.js';
import { events } from '../../utils/events.js';
import { EventMap } from '../../utils/events.map.js';

import { ChurchesState } from './churches.state.js';
import { ChurchesView } from './churches.view.js';

class ChurchesController {
    constructor() {
        this.state = new ChurchesState();
        this.view = new ChurchesView();

        this.isMounted = false;
        this._boundReload = this.reloadData.bind(this);
        this._boundGlobalClose = this.handleGlobalClose.bind(this);
        this._boundTableClick = this.handleTableClick.bind(this);
    }

    async init() {
        try {
            // 1. Core Layout Binding
            initLayout('Churches');
            
            // 2. Cache elements for new DOM state
            this.view.cacheElements();

            ui.showLoader('Loading data...');
            
            // 3. Load Data with safety
            await this.state.loadData();

            // 4. Initialize Modal Components
            this.view.initModalSelects(
                this.state.districts || [], 
                this.state.pastors || [], 
                this.state.allChurches || []
            );

            this.bindEvents();
            this.handleDeepLink();
            this.refresh();
            
            // 5. Global Events
            events.on(EventMap.CHURCH.UPDATED, this._boundReload);
            events.on(EventMap.PASTOR.UPDATED, this._boundReload);

        } catch (err) {
            console.error('Churches Critical Failure:', err);
            ui.toast('Initialization failed: ' + err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    bindEvents() {
        const { el } = this.view;
        if (!el) return;

        // Search/Filters
        if (el.searchInput) {
            el.searchInput.oninput = (e) => {
                this.state.applyFilters({ query: e.target.value.trim() });
                this.refresh();
            };
        }

        // Pagination
        if (el.btnPrev) el.btnPrev.onclick = () => { if(this.state.currentPage > 1) { this.state.currentPage--; this.refresh(true); } };
        if (el.btnNext) el.btnNext.onclick = () => { this.state.currentPage++; this.refresh(true); };

        // CRUD Actions
        const btnAdd = document.getElementById('btn-add-church');
        if (btnAdd) btnAdd.onclick = () => this.view.showChurchModal(null);

        if (el.churchForm) {
            el.churchForm.onsubmit = (e) => this.handleSave(e);
        }

        if (el.qdForm) {
            el.qdForm.onsubmit = (e) => this.handleSaveHistorical(e);
        }

        // Global Close Button Delegation for Modals
        document.body.addEventListener('click', this._boundGlobalClose);

        // Export Modal
        const btnExport = document.getElementById('btn-export');
        if (btnExport && el.exportOverlay) {
            btnExport.onclick = () => el.exportOverlay.classList.add('open');
        }

        const btnExportAll = document.getElementById('btn-export-all');
        if (btnExportAll) btnExportAll.onclick = () => this.handleExport('all');
        
        const btnExportInfo = document.getElementById('btn-export-info');
        if (btnExportInfo) btnExportInfo.onclick = () => this.handleExport('info');

        // Safe Table Delegation
        if (el.list) {
            el.list.addEventListener('click', this._boundTableClick);
        }
    }

    handleGlobalClose(e) {
        const btn = e.target.closest('#btn-close-modal, #btn-cancel-modal, #btn-close-hist, #btn-cancel-hist, #btn-close-qd, #btn-cancel-qd, #btn-close-det, #btn-cancel-export, #btn-close-export');
        if (btn) this.view.closeModals();
    }

    destroyGlobalListeners() {
        events.off(EventMap.CHURCH.UPDATED, this._boundReload);
        events.off(EventMap.PASTOR.UPDATED, this._boundReload);
        document.body.removeEventListener('click', this._boundGlobalClose);
        if (this.view.el && this.view.el.list) {
            this.view.el.list.removeEventListener('click', this._boundTableClick);
        }
    }

    handleDeepLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const districtId = urlParams.get('district_id');
        if (districtId) {
            this.state.applyFilters({ districtId });
            // Sync filter dropdown if needed (future improvement)
        }
    }

    async reloadData() {
        try {
            await this.state.loadData();
            this.refresh();
        } catch (err) {
            console.error('Reload failed:', err);
        }
    }

    refresh(scrollToTop = false) {
        if (!this.view || !this.state) return;
        const pData = this.state.getPaginatedData();
        this.view.renderList(pData, this.state.districts);

        if (scrollToTop) {
            const table = document.querySelector('.data-table');
            if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleSave(e) {
        e.preventDefault();
        const data = this.view.getFormData();
        const btn = this.view.el.btnSave;
        if (!btn) return;

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            const payload = {
                church_name: data.church_name,
                church_address: data.church_address || data.address,
                district_id: data.district_id,
                pioneer_pastor_id: data.pioneer_pastor_id,
                mother_church_id: data.mother_church_id,
                church_scope: data.church_scope,
                notes: data.notes
            };

            if (data.id) {
                await churchService.update(data.id, payload);
                this.view.closeModals();
                await this.reloadData();
                ui.toast('Church updated');
            } else {
                const newChurch = await churchService.create(payload);
                this.view.closeModals();
                await this.reloadData();
                ui.showChurchCreatedWizard(newChurch);
            }
            
            events.emit(EventMap.CHURCH.UPDATED);

        } catch (err) {
            ui.toast(err.message || 'Save failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Church';
        }
    }

    async handleSaveHistorical(e) {
        e.preventDefault();
        const churchId = document.getElementById('hist-church-id')?.value;
        const pastorId = this.view.selModalHistPastor ? this.view.selModalHistPastor.getValue() : null;
        
        const startDate = document.getElementById('hist-start')?.value;
        const endDate = document.getElementById('hist-end')?.value;
        const role = document.getElementById('hist-role')?.value;
        const event = document.getElementById('hist-event')?.value;
        const notes = document.getElementById('hist-notes')?.value;

        if (!churchId || !pastorId || !startDate || !endDate) {
            ui.toast('Please fill all required fields', 'warn');
            return;
        }

        if (new Date(startDate) > new Date(endDate)) {
            ui.toast('Start date cannot be after end date', 'error');
            return;
        }

        const btn = document.getElementById('btn-submit-historical');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Saving...';
        }

        try {
            await assignmentService.create({
                church_id: churchId,
                pastor_id: pastorId,
                role_code: role,
                event_type: event,
                start_date: startDate,
                end_date: endDate,
                notes: notes || null,
                status_code: 'pulled_out', // Historical implies completed
                is_primary: false,
                precision_flag: 'exact'
            });

            ui.toast('Historical record saved');
            this.view.closeModals();
            await this.reloadData(); // Full refresh ensures everything is in sync
        } catch (err) {
            ui.toast(err.message, 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Save Record';
            }
        }
    }

    handleTableClick(e) {
        const target = e.target.closest('button.btn-view, button.pcm-view, button.btn-edit, button.pcm-edit, button.btn-delete, button.pcm-delete, button.btn-plus, button.pcm-plus');
        if (!target) return;

        const row = target.closest('[data-id]');
        const id = row?.dataset.id;
        if (!id) return;

        if (target.classList.contains('btn-view') || target.classList.contains('pcm-view')) {
            window.location.href = `./church-view.html?id=${id}`;
        } else if (target.classList.contains('btn-plus') || target.classList.contains('pcm-plus')) {
            const c = this.state.allChurches.find(x => String(x.id) === String(id));
            this.view.showHistoricalModal(id, c.church_name);
        } else if (target.classList.contains('btn-edit') || target.classList.contains('pcm-edit')) {
            const c = this.state.allChurches.find(x => String(x.id) === String(id));
            this.view.showChurchModal(c);
        } else if (target.classList.contains('btn-delete') || target.classList.contains('pcm-delete')) {
            const c = this.state.allChurches.find(x => String(x.id) === String(id));
            ui.confirm(`Remove ${c.church_name}? This action cannot be undone.`, async () => {
                await churchService.remove(id);
                ui.toast('Church removed');
                await this.reloadData();
                events.emit(EventMap.CHURCH.UPDATED);
            }, { title: 'Delete Church', confirmText: 'Delete' });
        }
    }

    async handleExport(type) {
        this.view.closeModals();
        ui.showLoader('Exporting...');
        try {
            await exportChurches(type, this.state.districts, this.state.allChurches, this.state.pastors, this.state.assignments);
            ui.toast('Export completed');
        } catch (err) {
            ui.toast('Export failed', 'error');
        } finally {
            ui.hideLoader();
        }
    }
}

// Module Lifecycle Hook Implementation
const instance = new ChurchesController();

export async function mount(stateParams = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    instance.destroyGlobalListeners();
    instance.isMounted = false;
    console.log("Churches Controller Unmounted Cleanly");
}

if (!window.router || !window.router.currentController) {
    mount(window.router ? window.router.getState() : {});
}

// Fallback for legacy
window.churchCtrl = instance;
export default { mount, unmount };
