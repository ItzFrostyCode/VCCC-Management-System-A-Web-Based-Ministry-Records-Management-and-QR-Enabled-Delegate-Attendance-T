/**
 * Assignments Page - Controller (Entry Point)
 */
import { initLayout } from '../../layout.js';
import { EventMap } from '../../utils/events.map.js';
import { assignmentDomain } from '../../domain/assignment.domain.js';
import { ui } from '../../utils/ui.js';
import { events } from '../../utils/events.js';
import { exportAssignments } from '../../utils/export/assignment/export-assignment.js';

import { AssignmentsState } from './assignments.state.js';
import { AssignmentsView } from './assignments.view.js';

class AssignmentsController {
    constructor() {
        this.state = new AssignmentsState();
        this.view = new AssignmentsView();
        this.lastIsMobile = window.innerWidth <= 1024;
        this.isMounted = false;

        this._boundReload = this.reloadData.bind(this);
        this._boundTableClick = this.handleTableClick.bind(this);
        this._boundResize = this.handleResize.bind(this);
    }

    async init() {
        initLayout('Assignments');
        this.view.cacheElements(); // Ensure DOM references are captured correctly
        ui.showLoader();
        try {
            await this.state.loadData();
            
            this.view.initSearchSelects({
                pastors: this.state.pastors,
                churches: this.state.churches
            });

            this.bindEvents();
            this.handleDeepLink();
            this.refreshView();
            
            // Sync with other pages
            events.on(EventMap.ASSIGNMENT.UPDATED, this._boundReload);
            events.on(EventMap.PASTOR.UPDATED, this._boundReload);
            events.on(EventMap.CHURCH.UPDATED, this._boundReload);

        } catch (err) {
            console.error('Assignments Page Init Failed:', err);
            ui.toast('Failed to load assignment records.', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    bindEvents() {
        // Search & Filter
        const searchInput = document.getElementById('assign-search');
        if (searchInput) {
            searchInput.oninput = (e) => {
                this.state.applyFilters({ query: e.target.value });
                this.refreshView();
            };
        }

        if (this.view.selStatus) {
            this.view.selStatus.onChange = (val) => {
                this.state.applyFilters({ statusCode: val });
                this.refreshView();
            };
        }

        if (this.view.selType) {
            this.view.selType.onChange = (val) => {
                this.state.applyFilters({ roleCode: val });
                this.refreshView();
            };
        }

        // Pagination
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        if (btnPrev) btnPrev.onclick = () => { this.state.currentPage--; this.refreshView(true); };
        if (btnNext) btnNext.onclick = () => { this.state.currentPage++; this.refreshView(true); };

        // Modals - Open
        const btnAdd = document.getElementById('btn-add-assignment');
        if (btnAdd) btnAdd.onclick = () => this.view.showEditModal();

        // Modals - Close
        document.querySelectorAll('.modal-close, .btn-ghost').forEach(btn => {
            if (['btn-close-edit', 'btn-close-update', 'btn-cancel-edit', 'btn-cancel-update'].includes(btn.id)) {
                btn.onclick = () => this.view.closeModals();
            }
        });

        // Form Submissions
        if (this.view.formEdit) {
            this.view.formEdit.onsubmit = (e) => this.handleSave(e, {}, 'assignment-form-edit');
        }
        if (this.view.formUpdate) {
            this.view.formUpdate.onsubmit = (e) => this.handleSave(e, {}, 'assignment-form-update');
        }

        // Global Event Delegation (Edits)
        if (this.view.list) {
            this.view.list.addEventListener('click', this._boundTableClick);
        }

        // Export
        const btnExport = document.getElementById('btn-export');
        if (btnExport) {
            btnExport.onclick = async () => {
                const records = this.state.filteredAssignments;
                if (!records.length) { ui.toast('No assignment records to export.', 'warn'); return; }
                await exportAssignments(records);
            };
        }

        // Layout Responsiveness
        window.addEventListener('resize', this._boundResize);
    }

    handleResize() {
        const nowMobile = window.innerWidth <= 1024;
        if (nowMobile !== this.lastIsMobile) {
            this.lastIsMobile = nowMobile;
            this.refreshView();
        }
    }

    destroyGlobalListeners() {
        events.off(EventMap.ASSIGNMENT.UPDATED, this._boundReload);
        events.off(EventMap.PASTOR.UPDATED, this._boundReload);
        events.off(EventMap.CHURCH.UPDATED, this._boundReload);
        window.removeEventListener('resize', this._boundResize);
        if (this.view.list) {
            this.view.list.removeEventListener('click', this._boundTableClick);
        }
    }

    handleDeepLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const pastorId = urlParams.get('pastor_id');
        const churchId = urlParams.get('church_id');

        if (pastorId || churchId) {
            this.state.applyFilters({ 
                pastorId: pastorId || '', 
                churchId: churchId || '' 
            });
            
            // Sync SearchSelects if they are ready
            if (this.view.selPastor && pastorId) this.view.selPastor.setValue(pastorId);
            if (this.view.selChurch && churchId) this.view.selChurch.setValue(churchId);
        }
    }

    async reloadData() {
        await this.state.loadData();
        this.refreshView();
    }

    refreshView(scrollToTop = false) {
        const pData = this.state.getPaginatedData();
        this.view.renderList(pData, this.state.pastors);

        if (scrollToTop) {
            const table = document.querySelector('.data-table');
            if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * CRUD & Business Logic
     */
    async handleSave(e = null, confirmOptions = {}, formId) {
        if (e) e.preventDefault();
        
        let data = this.view.getFormData(formId);
        
        // If this is an UPDATE (Closing an assignment), merge the historical data 
        // to bypass Domain validation which expects pastor_id, church_id, and start_date.
        if (formId === 'assignment-form-update') {
            const original = this.state.allAssignments.find(x => String(x.id) === String(data.id));
            if (!original) {
                ui.toast('Original record not found.', 'error');
                return;
            }
            data = { ...original, ...data }; // Overwrite original with the new status/end_date
        }

        const btn = document.getElementById(formId).querySelector('[type="submit"]');

        btn.disabled = true;
        const originalText = btn.textContent;
        btn.textContent = 'Saving...';

        try {
            const result = await assignmentDomain.processSave(data, confirmOptions);
            
            if (result.require_confirmation) {
                if (result.confirmation_type === 'CORRECTION_OR_TRANSFER') {
                    // Modernized conflict resolution using the premium ui.confirm
                    btn.disabled = false;
                    btn.textContent = 'Save Record';
                    
                    const msg = `This pastor is already active at <b>${result.existing_church_name}</b>.<br><br>• Click <b>YES (Correction)</b> if this is a mistake fix for that same assignment.<br>• Click <b>NO (Transfer)</b> to perform a regular transfer (this will close the old record).`;

                    ui.confirm(msg, 
                        () => this.handleSave(null, { forceCorrection: true, forceTransfer: false }, formId), 
                        { 
                            title: 'Active Assignment Conflict', 
                            confirmText: 'YES (Correction)', 
                            cancelText: 'NO (Transfer)',
                            type: 'info',
                            onCancel: () => this.handleSave(null, { forceCorrection: false, forceTransfer: true }, formId)
                        }
                    );
                    return;
                }
            }

            ui.toast(result.message);
            this.view.closeModals();
            await this.reloadData();

        } catch (err) {
            console.error('Save failed:', err);
            if (err.code === '23505') {
                ui.toast('This pastor already has an active assignment.', 'error');
            } else {
                ui.toast(err.message || 'Failed to save record', 'error');
            }
        } finally {
            btn.disabled = false;
            btn.textContent = originalText;
        }
    }

    handleTableClick(e) {
        const target = e.target.closest('button.btn-edit, button.pcm-edit, button.pcm-update');
        if (!target) return;

        const row = target.closest('[data-id]');
        const id = row?.dataset.id;
        if (!id) return;

        const assignment = this.state.allAssignments.find(x => String(x.id) === String(id));

        if (target.classList.contains('btn-edit') || target.classList.contains('pcm-edit')) {
            this.view.showEditModal(assignment);
        } else if (target.classList.contains('pcm-update')) {
            this.view.showUpdateModal(assignment);
        }
    }
}

// Module Lifecycle Hook Implementation
const instance = new AssignmentsController();

export async function mount(stateParams = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    instance.destroyGlobalListeners();
    instance.isMounted = false;
    console.log("Assignments Controller Unmounted Cleanly");
}

if (!window.router || !window.router.currentController) {
    mount(window.router ? window.router.getState() : {});
}

// Fallback legacy support
window.assignmentsCtrl = instance;
export default { mount, unmount };
