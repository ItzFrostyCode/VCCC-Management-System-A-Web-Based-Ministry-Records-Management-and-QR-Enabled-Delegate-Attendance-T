/**
 * Disciples Page - Controller (Entry Point)
 */
import { db } from '../../db.js';
import { initLayout } from '../../layout.js';
import { authService } from '../../services/auth.service.js';
import { discipleService } from '../../services/disciple.service.js';
import { exportDisciplesHierarchical, exportDisciplesAll } from '../../utils/export/disciples/export-disciple.js';
import { initGuide } from '../../utils/guide.js';
import { ui } from '../../utils/ui.js';
import { events } from '../../utils/events.js';
import { EventMap } from '../../utils/events.map.js';

import { DisciplesState } from './disciples.state.js';
import { DisciplesView } from './disciples.view.js';

class DisciplesController {
    constructor() {
        this.state = new DisciplesState();
        this.view = new DisciplesView();
        this.lastWidth = window.innerWidth;
        this.isMounted = false;
        this._boundReload = this.reloadData.bind(this);
        this._boundResize = this.handleResize.bind(this);
    }

    async init() {
        console.log("Disciples Init Started");
        
        // 1. Core Layout Binding
        initLayout('Disciples');
        
        // 2. Re-cache for new DOM state
        this.view.cacheElements();
        
        // 3. Optional Features
        try { initGuide(); } catch (e) { console.warn("Guide failed", e); }

        ui.showLoader('Loading disciples...');
        try {
            await this.state.loadData();
            
            // 4. Initialize Modal Components
            this.view.initModalSelects(
                this.state.districts, 
                this.state.churches, 
                this.state.pastors
            );

            this.view.initPageFilters(
                this.state.districts,
                this.state.pastors,
                (val) => { this.state.applyFilters({ districtId: val }); this.refresh(); },
                (val) => { this.state.applyFilters({ pastorId: val }); this.refresh(); }
            );

            this.bindEvents();
            this.refresh();
            
            events.on(EventMap.DISCIPLE.UPDATED, this._boundReload);
            events.on(EventMap.CHURCH.UPDATED, this._boundReload);

            console.log("Disciples Init Completed Successfully");
        } catch (err) {
            console.error('Disciples Page Init Failed:', err);
            ui.toast('Initialization failed: ' + err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    bindEvents() {
        const { el } = this.view;

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
        if (el.btnAdd) {
            el.btnAdd.onclick = (e) => {
                e.preventDefault();
                this.view.showDiscipleModal(null, this.state.churches);
            };
        }

        if (el.discipleForm) {
            el.discipleForm.onsubmit = (e) => this.handleSave(e);
        }

        // Modal Close/Cancel
        if (el.btnCancel) el.btnCancel.onclick = () => this.view.closeModals();
        if (el.btnClose) el.btnClose.onclick = () => this.view.closeModals();

        // Additional Modals
        if (el.btnCancelDelete) el.btnCancelDelete.onclick = () => this.view.closeModals();
        if (el.btnCloseDelete) el.btnCloseDelete.onclick = () => this.view.closeModals();
        if (el.btnConfirmDelete) el.btnConfirmDelete.onclick = () => this.handleDelete();
        if (el.btnCloseImage) el.btnCloseImage.onclick = () => this.view.closeModals();

        // Standard direct bindings only. Delegation removed for reliability.

        if (el.btnExport) {
            el.btnExport.onclick = () => {
                if (el.modalExport) el.modalExport.classList.add('open');
            };
        }

        if (el.btnCloseExport) el.btnCloseExport.onclick = () => el.modalExport.classList.remove('open');
        if (el.btnCancelExport) el.btnCancelExport.onclick = () => el.modalExport.classList.remove('open');

        if (el.btnExportAll) {
            el.btnExportAll.onclick = () => {
                el.modalExport.classList.remove('open');
                this.handleExport('all');
            };
        }

        if (el.btnExportByChurch) {
            el.btnExportByChurch.onclick = () => {
                el.modalExport.classList.remove('open');
                this.handleExport('church');
            };
        }

        window.addEventListener('resize', this._boundResize);
    }

    handleResize() {
        if (Math.abs(window.innerWidth - this.lastWidth) > 50) {
            this.lastWidth = window.innerWidth;
            this.refresh();
        }
    }

    destroyGlobalListeners() {
        events.off(EventMap.DISCIPLE.UPDATED, this._boundReload);
        events.off(EventMap.CHURCH.UPDATED, this._boundReload);
        window.removeEventListener('resize', this._boundResize);
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
        if (!this.view) return;
        const isStaff = authService.getCurrentUser()?.role === 'Staff';
        const pData = this.state.getPaginatedData();
        this.view.renderList(
            pData, 
            this.state.districts, 
            isStaff,
            (id) => {
                const d = this.state.allDisciples.find(x => String(x.id) === String(id));
                if (d) this.view.showDiscipleModal(d, this.state.churches);
            },
            (id) => {
                const d = this.state.allDisciples.find(x => String(x.id) === String(id));
                if (d) this.view.showDeleteConfirm(d);
            },
            (id) => {
                const d = this.state.allDisciples.find(x => String(x.id) === String(id));
                if (d) ui.showImage(d.disciple_image_url, d.full_name, async (file) => {
                    const result = await discipleService.updatePhoto(id, file);
                    d.disciple_image_url = result.publicUrl;
                    this.refresh();
                });
            }
        );

        if (scrollToTop) {
            const table = document.querySelector('.data-table');
            if (table) table.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    async handleSave(e) {
        e.preventDefault();
        const data = this.view.getFormData();
        const btn = this.view.el.btnSave;
        const fileInput = document.getElementById('disciple-image');
        const imageFile = fileInput?.files[0];

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            let finalImageUrl = data.id 
                ? this.state.allDisciples.find(d => String(d.id) === String(data.id))?.disciple_image_url 
                : null;

            if (imageFile) {
                btn.textContent = 'Uploading...';
                finalImageUrl = await this.uploadProfilePicture(imageFile);
            }

            const payload = {
                full_name: data.full_name,
                church_id: data.church_id,
                disciple_image_url: finalImageUrl
            };

            if (data.id) {
                await discipleService.update(data.id, payload);
                ui.toast('Disciple updated');
            } else {
                await discipleService.create(payload);
                ui.toast('Disciple created');
            }
            
            this.view.closeModals();
            await this.reloadData();
            events.emit(EventMap.DISCIPLE.UPDATED);

        } catch (err) {
            ui.toast(err.message || 'Save failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save disciple';
        }
    }

    async uploadProfilePicture(file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `disciples/${Date.now()}.${fileExt}`;
        const { data, error } = await db.storage.from('avatars').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = db.storage.from('avatars').getPublicUrl(fileName);
        return publicUrl;
    }

    async handleDelete() {
        const id = this.view.el.deleteOverlay.dataset.id;
        if (!id) return;

        try {
            await discipleService.remove(id);
            ui.toast('Disciple removed');
            this.view.closeModals();
            await this.reloadData();
            events.emit(EventMap.DISCIPLE.UPDATED);
        } catch (err) {
            ui.toast(err.message, 'error');
        }
    }

    // Note: handleTableClick removed in favor of direct binding in renderList for 100% reliability.

    async handleExport(mode = 'all') {
        ui.showLoader('Exporting...');
        try {
            if (mode === 'all') {
                await exportDisciplesAll(this.state.allDisciples);
            } else {
                await exportDisciplesHierarchical(this.state.districts, this.state.churches, this.state.pastors, this.state.allDisciples);
            }
            ui.toast('Exported');
        } catch (err) {
            console.error('Export error:', err);
            ui.toast('Export failed', 'error');
        } finally {
            ui.hideLoader();
        }
    }
}

// Module Lifecycle
const instance = new DisciplesController();

export async function mount(stateParams = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    instance.destroyGlobalListeners();
    instance.isMounted = false;
    console.log("Disciples Controller Unmounted Cleanly");
}

if (!window.router || !window.router.currentController) {
    mount(window.router ? window.router.getState() : {});
}

// Global initialization override for legacy support if needed
window.discipleCtrl = instance;
export default { mount, unmount };
