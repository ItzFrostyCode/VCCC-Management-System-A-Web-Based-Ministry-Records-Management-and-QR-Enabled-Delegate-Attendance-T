/**
 * Pastors Page - Controller
 * Orchestrates State, View, and Services.
 */
import { requireAuth } from '../../supabase.js';
import { ui } from '../../utils/ui.js';
import { EventMap } from '../../utils/events.map.js';
import { pastorDomain } from '../../domain/pastor.domain.js';
import { pastoralLifecycleDomain } from '../../domain/pastoral-lifecycle.domain.js';

import { PastorsState } from './pastors.state.js';
import { PastorsView } from './pastors.view.js?v=3';
import { db } from '../../db.js';
import { initLayout } from '../../layout.js';
import { initGuide } from '../../utils/guide.js';
import { events } from '../../utils/events.js';
import { createSearchSelect } from '../../../components/search-select/search-select.js';
import { exportPastorInfo } from '../../utils/export/pastors/pastor-export.js';

class PastorsController {
    constructor() {
        this.state = new PastorsState();
        this.view = new PastorsView();
        
        this.selFilterDist = null;
        this.selFilterChurch = null;
        this.selModalParent = null;
        this.selAssignChurch = null;   // SearchSelect for Assign modal
        this.selTransferChurch = null; // SearchSelect for Transfer modal

        this.removedPhotos = new Set();
        this.isMounted = false;

        // Bound Handlers for Global Events to enable unmounting
        this._boundReload = this.reloadData.bind(this);
        this._boundTableClick = this.handleTableClick.bind(this);
        this._boundResize = this.handleResize.bind(this);
    }

    /**
     * Start the page
     */
    async init() {
        console.log("Pastors Controller Init Started");
        try {
            await requireAuth();
            initLayout('Pastors');
            
            // Re-cache elements immediately after layout injection
            this.view.cacheElements(); 
            
            if (typeof initGuide === 'function') {
                try {
                    initGuide();
                } catch (e) {
                    console.warn("Guide failed to init", e);
                }
            }

            ui.showLoader('Loading pastors...');
            await this.state.loadData();
            this.initFilters();
            this.initEvents();
            this.refresh();

            // Sync with other modules
            events.on(EventMap.CHURCH.UPDATED, this._boundReload);
            events.on(EventMap.ASSIGNMENT.UPDATED, this._boundReload);

            // Handle pre-open from URL
            this.handleDeepLink();

            console.log("Pastors Controller Init Completed Successfully");
        } catch (err) {
            console.error('Pastors Controller Init Failed:', err);
            ui.toast('Failed to initialize page: ' + err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    initFilters() {
        if (!this.view.el.filterDist || !this.view.el.filterChurch) {
            console.warn("Filter elements missing from DOM, skipping SearchSelect init");
            return;
        }

        // District Filter
        this.selFilterDist = createSearchSelect(
            this.view.el.filterDist,
            [{ value: '', label: 'All districts' }, ...this.state.districtsData.map(d => ({ value: d.id, label: d.district_name }))],
            'All districts',
            (val) => {
                const churchOpts = [
                    { value: '', label: 'All churches' },
                    ...this.state.churchesData
                        .filter(c => !val || String(c.district_id) === String(val))
                        .map(c => ({ value: c.id, label: c.church_name }))
                ];
                if (this.selFilterChurch) {
                    this.selFilterChurch.setOptions(churchOpts);
                    this.selFilterChurch.reset();
                }
                this.handleSearch();
            }
        );

        this.selFilterChurch = createSearchSelect(
            this.view.el.filterChurch,
            [{ value: '', label: 'All churches' }, ...this.state.churchesData.map(c => ({ value: c.id, label: c.church_name }))],
            'All churches',
            () => this.handleSearch()
        );

        // Modal Parent Select
        this.initModalSelects();
    }

    initModalSelects() {
        const container = document.getElementById('parent-pastor-select-container');
        if (!container) return;

        const options = [
            { value: '', label: 'None (root / unknown origin)' },
            ...this.state.allPastors.map(p => ({
                value: p.id,
                label: p.full_name + (p.record_status === 'draft' ? ' [Draft]' : '')
            }))
        ];

        this.selModalParent = createSearchSelect(
            container,
            options,
            'None (root / unknown origin)',
            (val) => { this.state.selectedParentId = val || null; }
        );
    }

    initEvents() {
        console.log("Binding Pastors Events");

        // Search Input
        if (this.view.el.searchInput) {
            this.view.el.searchInput.oninput = () => this.handleSearch();
        }
        
        // Add Button
        const btnAdd = document.getElementById('btn-add');
        if (btnAdd) {
            btnAdd.onclick = (e) => {
                e.preventDefault();
                this.removedPhotos.clear(); // Reset for new entry
                this.view.showModal('New Pastor');
            };
        }

        // Form Submit
        if (this.view.el.addForm) {
            this.view.el.addForm.onsubmit = (e) => this.handleSave(e);
        }

        // Photo Uploader Click Delegation
        const handleUploaderClick = (type) => {
            const input = document.getElementById(`${type}-image`);
            if (input) input.click();
        };
        if (this.view.el.uploaderPastor) this.view.el.uploaderPastor.onclick = () => handleUploaderClick('pastor');
        if (this.view.el.uploaderWife) this.view.el.uploaderWife.onclick = () => handleUploaderClick('wife');

        // Photo Preview Change
        const handleFileChange = (type, e) => {
            const file = e.target.files[0];
            if (file) {
                const url = URL.createObjectURL(file);
                this.view.setPhotoPreview(type, url);
                this.removedPhotos.delete(type); // Reset removal if new file picked
            }
        };
        const pInput = document.getElementById('pastor-image');
        const wInput = document.getElementById('wife-image');
        if (pInput) pInput.onchange = (e) => handleFileChange('pastor', e);
        if (wInput) wInput.onchange = (e) => handleFileChange('wife', e);

        // Photo Removal
        if (this.view.el.btnRemovePPhoto) {
            this.view.el.btnRemovePPhoto.onclick = (e) => {
                e.stopPropagation();
                this.view.setPhotoPreview('pastor', null);
                this.removedPhotos.add('pastor');
                if (pInput) pInput.value = ''; // Clear file selection
            };
        }
        if (this.view.el.btnRemoveWPhoto) {
            this.view.el.btnRemoveWPhoto.onclick = (e) => {
                e.stopPropagation();
                this.view.setPhotoPreview('wife', null);
                this.removedPhotos.add('wife');
                if (wInput) wInput.value = ''; // Clear file selection
            };
        }

        // Modal Close/Cancel
        if (this.view.el.btnCancel) this.view.el.btnCancel.onclick = () => this.view.closeModals();
        if (this.view.el.btnClose) this.view.el.btnClose.onclick = () => this.view.closeModals();

        // Additional Modals
        const btnCloseDel = document.getElementById('btn-close-delete');
        const btnCancelDel = document.getElementById('btn-cancel-delete');
        if (btnCloseDel) btnCloseDel.onclick = () => this.view.closeModals();
        if (btnCancelDel) btnCancelDel.onclick = () => this.view.closeModals();

        if (this.view.el.btnDeleteConfirm) {
            this.view.el.btnDeleteConfirm.onclick = () => this.handleDeleteConfirmed();
        }

        const btnCancelExport = document.getElementById('btn-cancel-export');
        if (btnCancelExport) btnCancelExport.onclick = () => {
            if (this.view.el.modalExport) this.view.el.modalExport.classList.remove('open');
        };

        if (this.view.el.btnExport) {
            this.view.el.btnExport.onclick = () => {
                const selectedCount = this.state.selectedIds.size;
                if (this.view.el.exportModeLabel) {
                    this.view.el.exportModeLabel.textContent = selectedCount > 0 
                        ? `SELECTED (${selectedCount})` 
                        : `ALL (${this.state.filteredPastors.length})`;
                }
                if (this.view.el.modalExport) this.view.el.modalExport.classList.add('open');
            };
        }

        // Pagination
        if (this.view.el.btnPrev) this.view.el.btnPrev.onclick = () => { this.state.currentPage--; this.refresh(); };
        if (this.view.el.btnNext) this.view.el.btnNext.onclick = () => { this.state.currentPage++; this.refresh(); };

        // Export
        const btnExport = document.getElementById('btn-export-confirm');
        if (btnExport) btnExport.onclick = () => this.handleExport();

        // Table Event Delegation (Critical for Actions)
        // Robust Table Delegation via saved bound handler
        document.addEventListener('click', this._boundTableClick);

        // Secretary Lifecycle Modal - Close buttons
        const closers = [
            ['btn-close-assign',      'modal-assign'],
            ['btn-cancel-assign',     'modal-assign'],
            ['btn-close-transfer',    'modal-transfer'],
            ['btn-cancel-transfer',   'modal-transfer'],
            ['btn-close-undeployed',  'modal-undeployed'],
            ['btn-cancel-undeployed', 'modal-undeployed']
        ];
        closers.forEach(([btnId, modalId]) => {
            const btn = document.getElementById(btnId);
            if (btn) btn.onclick = () => document.getElementById(modalId)?.classList.remove('open');
        });

        // Secretary Lifecycle - Form Submissions
        const assignForm = document.getElementById('assign-form');
        if (assignForm) {
            assignForm.onsubmit = (e) => { e.preventDefault(); this.handleSaveAssignment(); };
            
            // Watch for "Quick Add" pastor link
            const btnQuickAdd = document.getElementById('btn-quick-add-pastor');
            if (btnQuickAdd) {
                btnQuickAdd.onclick = () => {
                    const name = prompt("Enter new pastor's full name:");
                    if (name && name.trim()) {
                        this.handleQuickAddPastor(name.trim());
                    }
                };
            }
        }

        const transferForm = document.getElementById('transfer-form');
        if (transferForm) transferForm.onsubmit = (e) => { e.preventDefault(); this.handleSaveTransfer(); };

        const transitionForm = document.getElementById('transition-form');
        if (transitionForm) {
            transitionForm.onsubmit = (e) => { e.preventDefault(); this.handleSaveTransition(); };
            
            // Watch radio handles for dynamic field toggling
            const radios = transitionForm.querySelectorAll('input[name="tr-type"]');
            radios.forEach(r => {
                r.onchange = (e) => this.toggleTransitionFields(e.target.value);
            });
        }

        // Show/hide end reason when end date is filled
        const afEnd = document.getElementById('af-end');
        const afEndReasonField = document.getElementById('af-end-reason-field');
        if (afEnd && afEndReasonField) {
            afEnd.oninput = () => {
                afEndReasonField.style.display = afEnd.value ? 'block' : 'none';
            };
        }
        
        if (this.view.el.tableBody) {
            this.view.el.tableBody.onchange = (e) => this.handleTableChange(e);
        }

        // Check All
        const handleCheckAll = (e) => {
            const isChecked = e.target.checked;
            const paginated = this.state.getPaginatedData().items;
            paginated.forEach(p => this.state.toggleSelection(p.id, isChecked));
            this.refresh();
        };
        if (this.view.el.checkAll) this.view.el.checkAll.onchange = handleCheckAll;
        if (this.view.el.checkAllMobile) this.view.el.checkAllMobile.onchange = handleCheckAll;

        // Resize handler for table/card toggle via saved bound handler
        window.addEventListener('resize', this._boundResize);
    }

    handleResize() {
        const nowMobile = window.innerWidth <= 1024;
        if (nowMobile !== this.state.isMobile) {
            this.state.isMobile = nowMobile;
            this.refresh();
        }
    }

    destroyGlobalListeners() {
        events.off(EventMap.CHURCH.UPDATED, this._boundReload);
        events.off(EventMap.ASSIGNMENT.UPDATED, this._boundReload);
        document.removeEventListener('click', this._boundTableClick);
        window.removeEventListener('resize', this._boundResize);
        
        if (this.view.el.tableBody) this.view.el.tableBody.onchange = null;
    }

    handleSearch() {
        this.state.applyFilters({
            query: this.view.el.searchInput ? this.view.el.searchInput.value : '',
            districtId: this.selFilterDist ? this.selFilterDist.getValue() : '',
            churchId: this.selFilterChurch ? this.selFilterChurch.getValue() : ''
        });
        this.refresh();
    }

    handleTableClick(e) {
        const target = e.target.closest('button, .avatar-clickable');
        if (!target) return;

        // Ensure target is within our table or mobile cards
        const container = target.closest('#table-body, .pcm-wrap');
        if (!container) return;

        const row = target.closest('[data-id]');
        const id = row?.dataset.id;
        
        if (!id) {
            console.warn("Interaction target has no ID:", target);
            return;
        }

        const p = this.state.allPastors.find(x => String(x.id) === String(id));

        // View Action
        if (target.classList.contains('btn-view') || target.classList.contains('pcm-view')) {
            window.location.href = `pastor-view.html?id=${id}`;
            return;
        } 
        
        // Edit Action
        if (target.classList.contains('btn-edit') || target.classList.contains('pcm-edit')) {
            this.handleEdit(id);
            return;
        } 
        
        // Delete Action
        if (target.classList.contains('btn-delete') || target.classList.contains('pcm-delete')) {
            this.handleDelete(id);
            return;
        }

        // ── Secretary Lifecycle Actions ──────────────────────
        const lifecycleAction = target.dataset.lifecycle || target.closest('[data-lifecycle]')?.dataset.lifecycle;
        if (lifecycleAction && p) {
            switch (lifecycleAction) {
                case 'assign':     this.openAssignModal(p); break;
                case 'transfer':   this.openTransferModal(p); break;
                case 'transition': this.openTransitionWizard(p); break;
                case 'deceased':   this.handleMarkDeceased(p); break;
            }
            return;
        }
        
        // Avatar View/Quick Update
        if (target.classList.contains('avatar-clickable')) {
            if (!p) return;
            const type = target.dataset.type;
            const currentUrl = type === 'pastor' ? p.pastor_image_url : p.wife_image_url;
            const personName = type === 'pastor' ? p.full_name : p.wife_name;
            ui.showImage(currentUrl, personName, async (file) => {
                const newUrl = await this.uploadImage(file, type);
                const updateData = type === 'pastor' ? { pastor_image_url: newUrl } : { wife_image_url: newUrl };
                await pastorDomain.processSave(updateData, p.id);
                await this.reloadData();
            });
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // SECRETARY LIFECYCLE MODAL OPENERS
    // ─────────────────────────────────────────────────────────────────

    _getChurchOptions() {
        return [
            { value: '', label: '-- Select Church --' },
            ...this.state.churchesData.map(c => ({ value: c.id, label: c.church_name }))
        ];
    }

    async openAssignModal(pastor) {
        document.getElementById('af-pastor-id').value = pastor ? pastor.id : '';
        document.getElementById('af-pastor-name').textContent = pastor ? pastor.full_name : 'Select or Create Pastor';
        const quickAddBtn = document.getElementById('btn-quick-add-pastor');
        if (quickAddBtn) quickAddBtn.style.display = pastor ? 'none' : 'block';

        document.getElementById('af-start').value = new Date().toISOString().split('T')[0];
        document.getElementById('af-end').value = '';
        document.getElementById('af-end-reason-field').style.display = 'none';
        document.getElementById('af-notes').value = '';
        document.getElementById('af-type').value = 'takeover';

        // Clear warning banner
        const warning = document.getElementById('af-occupied-warning');
        if (warning) {
            warning.style.display = 'none';
            warning.innerHTML = '';
        }

        // Init or reinit church SearchSelect
        const wrap = document.getElementById('af-church-sel');
        if (wrap) {
            wrap.innerHTML = '';
            this.selAssignChurch = createSearchSelect(wrap, this._getChurchOptions(), '-- Select Church --', (cid) => {
                this.checkChurchOccupancy(cid);
            });
        }

        document.getElementById('modal-assign')?.classList.add('open');
    }

    async checkChurchOccupancy(churchId) {
        if (!churchId) return;
        const warning = document.getElementById('af-occupied-warning');
        if (!warning) return;

        try {
            const { data: activeAssignment, error } = await db
                .from('assignments')
                .select(`id, pastor_id, pastors(full_name)`)
                .eq('church_id', churchId)
                .eq('status_code', 'active')
                .is('end_date', null)
                .maybeSingle();

            if (activeAssignment && activeAssignment.pastors) {
                warning.innerHTML = `
                    <div class="occupied-banner">
                        <div class="occupied-icon">⚠️</div>
                        <div class="occupied-text">
                            <strong>Occupied:</strong> This church is currently pastored by <b>${activeAssignment.pastors.full_name}</b>. 
                            Proceeding will automatically end their assignment.
                        </div>
                    </div>
                `;
                warning.style.display = 'block';
                document.getElementById('af-type').value = 'takeover';
            } else {
                warning.style.display = 'none';
                warning.innerHTML = '';
                document.getElementById('af-type').value = 'pioneering';
            }
        } catch (err) {
            console.warn("Occupancy check failed", err);
        }
    }

    async handleQuickAddPastor(name) {
        try {
            ui.showLoader(`Creating record for ${name}...`);
            const { pastorService } = await import('../../services/pastor.service.js');
            const newPastor = await pastorService.createDraft(name);
            
            await this.reloadData(); // Refresh local list
            
            // Auto-select in the modal
            document.getElementById('af-pastor-id').value = newPastor.id;
            document.getElementById('af-pastor-name').textContent = newPastor.full_name;
            document.getElementById('btn-quick-add-pastor').style.display = 'none';
            
            ui.toast('Draft pastor created and selected.');
        } catch (err) {
            ui.toast(err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    openTransferModal(pastor) {
        document.getElementById('tf-pastor-id').value = pastor.id;
        document.getElementById('tf-pastor-name').textContent = pastor.full_name;
        document.getElementById('tf-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('tf-notes').value = '';
        document.getElementById('tf-type').value = 'takeover';

        // Show current church info
        const infoEl = document.getElementById('tf-current-church-info');
        if (infoEl) {
            infoEl.textContent = pastor.church_name
                ? `⚡ Currently at: ${pastor.church_name} — this assignment will be closed on transfer.`
                : 'No active assignment to close.';
        }

        const wrap = document.getElementById('tf-church-sel');
        if (wrap) {
            wrap.innerHTML = '';
            this.selTransferChurch = createSearchSelect(wrap, this._getChurchOptions(), '-- Select New Church --');
        }

        document.getElementById('modal-transfer')?.classList.add('open');
    }

    async openTransitionWizard(pastor) {
        if (!pastor) return;

        // Populate basic info
        document.getElementById('tr-pastor-id').value = pastor.id;
        document.getElementById('tr-pastor-name').textContent = pastor.full_name;
        document.getElementById('tr-date').value = new Date().toISOString().split('T')[0];
        document.getElementById('tr-notes').value = '';
        
        const avatar = document.getElementById('tr-pastor-avatar');
        if (avatar) avatar.textContent = pastor.full_name.charAt(0);
        
        const currentStatus = document.getElementById('tr-current-status');
        if (currentStatus) {
            currentStatus.textContent = pastor.church_name 
                ? `Active at ${pastor.church_name}` 
                : 'No active primary assignment';
        }

        // Reset fields
        this.toggleTransitionFields('pioneer');
        const defaultRadio = document.querySelector('input[name="tr-type"][value="pioneer"]');
        if (defaultRadio) defaultRadio.checked = true;

        // Init SearchSelects for the wizard
        const distWrap = document.getElementById('tr-new-church-dist-sel');
        if (distWrap) {
            distWrap.innerHTML = '';
            this.selPioneerDist = createSearchSelect(distWrap, this._getDistrictOptions(), '-- Select District --');
        }

        const churchWrap = document.getElementById('tr-takeover-church-sel');
        if (churchWrap) {
            churchWrap.innerHTML = '';
            const opts = this._getChurchOptions();
            this.selTakeoverChurch = createSearchSelect(churchWrap, opts, '-- Select Station --', (cid) => {
                this.checkTakeoverOccupancy(cid);
            });
        }

        document.getElementById('modal-transition')?.classList.add('open');
    }

    toggleTransitionFields(type) {
        const panels = document.querySelectorAll('.tr-panel');
        panels.forEach(p => {
            p.style.display = (p.dataset.type === type) ? 'block' : 'none';
        });
    }

    _getDistrictOptions() {
        return [
            { value: '', label: '-- Select District --' },
            ...this.state.districtsData.map(d => ({ value: d.id, label: d.district_name }))
        ];
    }

    toggleTransitionFields(type) {
        const panels = document.querySelectorAll('.tr-panel');
        panels.forEach(p => {
            p.style.display = (p.dataset.type === type) ? 'block' : 'none';
        });
    }

    async checkTakeoverOccupancy(churchId) {
        if (!churchId) return;
        const warning = document.getElementById('tr-occupied-warning');
        if (!warning) return;

        try {
            const { data: activeAssignment } = await db
                .from('assignments')
                .select(`id, pastors(full_name)`)
                .eq('church_id', churchId)
                .eq('status_code', 'active')
                .is('end_date', null)
                .maybeSingle();

            if (activeAssignment?.pastors) {
                warning.innerHTML = `
                    <div class="occupied-banner">
                        <div class="occupied-icon">⚠️</div>
                        <div class="occupied-text">
                            <strong>Occupied:</strong> Currently pastored by <b>${activeAssignment.pastors.full_name}</b>. 
                            Executing this transition will replace them.
                        </div>
                    </div>
                `;
            } else {
                warning.innerHTML = '';
            }
        } catch (err) { console.warn(err); }
    }

    async handleSaveTransition() {
        const btn = document.getElementById('btn-save-transition');
        btn.disabled = true;
        btn.textContent = 'Executing...';

        try {
            const type = document.querySelector('input[name="tr-type"]:checked').value;
            const payload = {
                pastor_id:       document.getElementById('tr-pastor-id').value,
                transition_type: type,
                effective_date:  document.getElementById('tr-date').value,
                notes:           document.getElementById('tr-notes').value,
                
                // Contextual
                new_church_name: document.getElementById('tr-new-church-name').value,
                district_id:     this.selPioneerDist?.getValue(),
                church_id:       this.selTakeoverChurch?.getValue(),
                intl_details:    document.getElementById('tr-intl-details').value,
                undeploy_reason: document.getElementById('tr-undeploy-reason').value
            };

            const result = await pastoralLifecycleDomain.executeTransition(payload);
            ui.toast(result.message);
            document.getElementById('modal-transition')?.classList.remove('open');
            await this.reloadData();
        } catch (err) {
            ui.toast(err.message || 'Transition failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Execute Transition';
        }
    }
    // ─────────────────────────────────────────────────────────────────
    // SECRETARY LIFECYCLE SAVE HANDLERS
    // ─────────────────────────────────────────────────────────────────

    async handleSaveAssignment() {
        const btn = document.getElementById('btn-save-assign');
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
            const pastorId  = document.getElementById('af-pastor-id').value;
            const churchId  = this.selAssignChurch?.getValue();
            const startDate = document.getElementById('af-start').value;
            const endDate   = document.getElementById('af-end').value || null;
            const type      = document.getElementById('af-type').value;
            const endReason = endDate ? document.getElementById('af-end-reason').value : null;
            const notes     = document.getElementById('af-notes').value;

            const result = await pastoralLifecycleDomain.addAssignment({
                pastor_id: pastorId,
                church_id: churchId,
                start_date: startDate,
                end_date: endDate,
                assignment_type: type,
                end_reason: endReason,
                notes
            });

            ui.toast(result.message);
            document.getElementById('modal-assign')?.classList.remove('open');
            await this.reloadData();
        } catch (err) {
            ui.toast(err.message || 'Failed to save assignment', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save Assignment';
        }
    }

    async handleSaveTransfer() {
        const btn = document.getElementById('btn-save-transfer');
        btn.disabled = true;
        btn.textContent = 'Transferring...';
        try {
            const pastorId    = document.getElementById('tf-pastor-id').value;
            const newChurchId = this.selTransferChurch?.getValue();
            const date        = document.getElementById('tf-date').value;
            const type        = document.getElementById('tf-type').value;
            const notes       = document.getElementById('tf-notes').value;

            const result = await pastoralLifecycleDomain.transferPastor({
                pastor_id:       pastorId,
                new_church_id:   newChurchId,
                transfer_date:   date,
                assignment_type: type,
                notes
            });

            ui.toast(result.message);
            document.getElementById('modal-transfer')?.classList.remove('open');
            await this.reloadData();
        } catch (err) {
            ui.toast(err.message || 'Transfer failed', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirm Transfer';
        }
    }

    handleMarkDeceased(pastor) {
        ui.confirm(
            `Mark <b>${pastor.full_name}</b> as deceased?<br><br>This will close all active assignments and cannot be easily undone.`,
            async () => {
                try {
                    ui.showLoader('Processing...');
                    const result = await pastoralLifecycleDomain.markDeceased(pastor.id);
                    ui.toast(result.message);
                    await this.reloadData();
                } catch (err) {
                    ui.toast(err.message || 'Failed', 'error');
                } finally {
                    ui.hideLoader();
                }
            },
            {
                title: 'Mark as Deceased',
                confirmText: 'Yes, Mark Deceased',
                type: 'danger'
            }
        );
    }

    handleTableChange(e) {
        if (e.target.classList.contains('row-check') || e.target.classList.contains('row-check-mobile')) {
            const id = e.target.dataset.id;
            this.state.toggleSelection(id, e.target.checked);
            this.refresh(); // To update check-all state
        }
    }

    async handleSave(e) {
        e.preventDefault();
        const formDataObj = this.view.getFormData();
        const id = document.getElementById('f-id')?.value;
        const btn = this.view.el.btnSave;

        // Extract files
        const pImgInput = document.getElementById('pastor-image');
        const wImgInput = document.getElementById('wife-image');

        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
            // 1. Determine existing images
            let currentPastorImg = null;
            let currentWifeImg = null;
            
            if (id) {
                const existing = this.state.allPastors.find(p => String(p.id) === String(id));
                if (existing) {
                    currentPastorImg = existing.pastor_image_url;
                    currentWifeImg = existing.wife_image_url;
                }
            }

            // 2. Handle Uploads
            let finalPastorImg = currentPastorImg;
            let finalWifeImg = currentWifeImg;

            if (this.removedPhotos.has('pastor')) finalPastorImg = null;
            if (this.removedPhotos.has('wife')) finalWifeImg = null;

            if (pImgInput?.files?.[0]) {
                btn.textContent = 'Uploading Photo...';
                finalPastorImg = await this.uploadImage(pImgInput.files[0], 'pastor');
            }
            if (wImgInput?.files?.[0]) {
                btn.textContent = 'Uploading Spouse Photo...';
                finalWifeImg = await this.uploadImage(wImgInput.files[0], 'wife');
            }

            // 3. Construct clean payload (only columns from DB)
            const payload = {
                full_name: formDataObj.full_name?.toUpperCase().trim(),
                contact_number: formDataObj.contact_number?.trim() || null,
                birthdate: formDataObj.birthdate || null,
                pastoring_start_date: formDataObj.pastoring_start_date || null,
                wife_name: formDataObj.wife_name?.trim() || null,
                wife_birthdate: formDataObj.wife_birthdate || null,
                notes: formDataObj.notes?.trim() || null,
                record_status: formDataObj.record_status || 'active',
                current_status_code: formDataObj.current_status_code || 'active',
                parent_id: this.state.selectedParentId,
                pastor_image_url: finalPastorImg,
                wife_image_url: finalWifeImg
            };

            const result = await pastorDomain.processSave(payload, id);
            
            this.view.closeModals();
            await this.reloadData();

            if (result.action === 'created') {
                ui.showPastorCreatedWizard(result.data);
            } else {
                ui.toast(result.message);
            }

        } catch (err) {
            console.error('Save failed:', err);
            ui.toast(err.message || 'Error occurred while saving', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Save pastor';
        }
    }

    /**
     * Upload an image to Supabase Storage
     * @param {File} file 
     * @param {string} prefix 
     */
    async uploadImage(file, prefix) {
        const fileExt = file.name.split('.').pop();
        const fileName = `pastors/${prefix}_${Date.now()}.${fileExt}`;
        
        const { error } = await db.storage
            .from('avatars')
            .upload(fileName, file);

        if (error) throw new Error(`Upload failed: ${error.message}`);

        const { data: { publicUrl } } = db.storage
            .from('avatars')
            .getPublicUrl(fileName);

        return publicUrl;
    }

    handleDelete(id) {
        const p = this.state.allPastors.find(x => String(x.id) === String(id));
        if (p) this.view.showDeleteConfirm(p);
    }

    async handleDeleteConfirmed() {
        const id = this.view.el.deleteOverlay?.dataset.id;
        if (!id) return;

        try {
            ui.showLoader('Deleting pastor...');
            const result = await pastorDomain.processDelete(id);
            ui.toast(result.message);
            this.view.closeModals();
            await this.reloadData();
        } catch (err) {
            ui.toast('Failed to delete: ' + err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async reloadData() {
        await this.state.loadData();
        this.refresh();
    }

    handleEdit(id) {
        const p = this.state.allPastors.find(x => String(x.id) === String(id));
        if (p) {
            this.removedPhotos.clear(); // Reset for this record
            this.view.showModal('Edit Pastor', p);
            if (this.selModalParent) {
                this.selModalParent.setValue(p.parent_id || '', p.parent_name || 'None');
                this.state.selectedParentId = p.parent_id;
            }
        }
    }

    async handleExport() {
        const toExport = this.state.selectedIds.size > 0 
            ? this.state.allPastors.filter(p => this.state.selectedIds.has(p.id))
            : this.state.filteredPastors;

        if (!toExport.length) return ui.toast('No pastors to export', 'warning');

        const options = {
            includePastorImage: document.getElementById('exp-pastor-img').checked,
            includeWifeImage: document.getElementById('exp-wife-img').checked,
            includeBirthdates: document.getElementById('exp-bdays').checked
        };

        try {
            ui.showLoader('Preparing export...');
            await exportPastorInfo(toExport, options);
            ui.toast('Export complete');
            const modalExport = document.getElementById('modal-export');
            if (modalExport) modalExport.classList.remove('open');
        } catch (err) {
            ui.toast('Export failed: ' + err.message, 'error');
        } finally {
            ui.hideLoader();
        }
    }

    handleDeepLink() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Deep link for auto-opening modal
        if (urlParams.get('add') === '1' && urlParams.get('parent_id')) {
            const parentId = urlParams.get('parent_id');
            const parentName = decodeURIComponent(urlParams.get('parent_name') || '');
            this.view.showModal('New Pastor');
            setTimeout(() => {
                if (this.selModalParent) this.selModalParent.setValue(parentId, parentName);
                this.state.selectedParentId = parentId;
            }, 500); // Give SearchSelect time to init
        }

        // Deep link for Global Topbar Search
        const searchParam = urlParams.get('search');
        if (searchParam && this.view.el.searchInput) {
            this.view.el.searchInput.value = searchParam;
            setTimeout(() => this.handleSearch(), 100);
        }

        // Deep link for Assignment Modal (from Pastor Profile)
        const openAssignId = urlParams.get('pastor_id');
        if (urlParams.get('add') === '1' && openAssignId) {
            const p = this.state.allPastors.find(x => String(x.id) === String(openAssignId));
            if (p) setTimeout(() => this.openAssignModal(p), 600);
        }

        // Deep link for Transfer Modal (from Pastor Profile)
        const openTransferId = urlParams.get('transfer');
        if (openTransferId) {
            const p = this.state.allPastors.find(x => String(x.id) === String(openTransferId));
            if (p) setTimeout(() => this.openTransferModal(p), 600);
        }
    }

    refresh() {
        const paginated = this.state.getPaginatedData();
        this.view.renderTable(
            paginated, 
            this.state.selectedIds, 
            this.state.districtsData, 
            true, // isAdmin (logic can be added)
            false // isStaff (logic can be added)
        );
    }
}

// Manage lifecycle securely
const instance = new PastorsController();

export async function mount(stateParams = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
    
    // Check for Wizard States (from Action Sheets)
    if (stateParams.wizard === 'assign') {
        const pid = stateParams.pastorId;
        const cid = stateParams.churchId;
        const cname = stateParams.churchName;

        if (pid) {
            // "Deploy to Church" flow
            const p = instance.state.allPastors.find(x => String(x.id) === String(pid));
            if (p) setTimeout(() => instance.openAssignModal(p), 400);
        } else if (cid) {
            // "Assign Pastor" flow (from church creation)
            if (instance.selFilterChurch) {
                instance.selFilterChurch.setValue(cid, cname);
                instance.handleSearch();
            }
            ui.toast(`Now searching for a pastor for ${cname}`, 'info');
        }
    }
}

export function unmount() {
    instance.destroyGlobalListeners();
    instance.isMounted = false;
    console.log("Pastors Controller Unmounted Cleanly");
}

// Initial Bootstrapper: If script executed organically (first load/hard reload)
if (!window.router || !window.router.currentController) {
    mount(window.router ? window.router.getState() : {});
}

// Fallback default export
export default { mount, unmount };
