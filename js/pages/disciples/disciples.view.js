import { esc } from '../../utils/helper.js';
import { ui } from '../../utils/ui.js';
import { createSearchSelect } from '../../../components/search-select/search-select.js';

export class DisciplesView {
    constructor() {
        this.cacheElements();
        
        // Main Page Filters
        this.selPageDistrict = null;
        this.selPagePastor = null;
        
        // Modal Selects
        this.selModalDistrictFilter = null;
        this.selModalChurch = null;
        this.selModalPastor = null;
    }

    cacheElements() {
        this.el = {
            list: document.getElementById('table-body'),
            count: document.getElementById('count-label'),
            searchInput: document.getElementById('search-input'),
            filterDistrict: document.getElementById('filter-district'),
            filterPastor: document.getElementById('filter-pastor'),
            pagination: document.getElementById('pagination'),
            pageInfo: document.getElementById('page-info'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            btnAdd: document.getElementById('btn-add'),
            btnExport: document.getElementById('btn-export'),
            modalExport: document.getElementById('export-modal-overlay'),
            btnExportAll: document.getElementById('btn-export-all'),
            btnExportByChurch: document.getElementById('btn-export-by-church'),
            btnCancelExport: document.getElementById('btn-cancel-export'),
            btnCloseExport: document.getElementById('btn-close-export'),
            
            // Templates
            gridTemplate: document.getElementById('disciple-grid-template'),
            cardTemplate: document.getElementById('disciple-card-template'),
            
            // Main Modal
            modalOverlay: document.getElementById('modal-form'),
            modalTitle: document.getElementById('modal-title'),
            discipleForm: document.getElementById('disciple-form'),
            btnSave: document.getElementById('btn-save'),
            btnCancel: document.getElementById('btn-cancel'),
            btnClose: document.getElementById('btn-close-modal'),

            // Delete Modal
            deleteOverlay: document.getElementById('modal-delete'),
            deleteMsg: document.getElementById('delete-msg'),
            btnConfirmDelete: document.getElementById('btn-delete-confirm'),
            btnCancelDelete: document.getElementById('btn-cancel-delete'),
            btnCloseDelete: document.getElementById('btn-close-delete'),

            // Image Modal
            imageOverlay: document.getElementById('modal-image-viewer'),
            btnCloseImage: document.getElementById('btn-close-image-viewer')
        };
    }

    // Safe Helper for UI updates
    _set(clone, selector, type, val, classname = null) {
        const el = clone.querySelector(selector);
        if (!el) return null;
        if (type === 'text') el.textContent = val;
        else if (type === 'html') el.innerHTML = val;
        if (classname) el.className = classname;
        return el;
    }

    initModalSelects(districts, churches, pastors) {
        const distEl = document.getElementById('f-district-filter');
        const churchEl = document.getElementById('f-church-select');
        
        if (distEl) {
            this.selModalDistrictFilter = createSearchSelect(
                distEl, 
                [{ value: '', label: 'Select District' }, ...districts.map(d => ({ value: d.id, label: d.district_name }))], 
                'Select District',
                (val) => this.updateModalChurchOptions(val, churches)
            );
        }

        if (churchEl) {
            this.selModalChurch = createSearchSelect(
                churchEl, 
                [{ value: '', label: 'Select Church' }], 
                'Select Church'
            );
        }

        const filterPastorEl = document.getElementById('f-pastor-filter');
        if (filterPastorEl) {
            this.selModalPastor = createSearchSelect(
                filterPastorEl, 
                [{ value: '', label: 'All Pastors' }, ...pastors.map(p => ({ value: p.id, label: p.full_name }))], 
                'All Pastors'
            );
        }
    }

    initPageFilters(districts, pastors, onDistrictChange, onPastorChange) {
        if (this.el.filterDistrict) {
            this.selPageDistrict = createSearchSelect(
                this.el.filterDistrict,
                [{ value: '', label: 'All Districts' }, ...districts.map(d => ({ value: d.id, label: d.district_name }))],
                'All Districts',
                onDistrictChange
            );
        }
        
        if (this.el.filterPastor) {
            this.selPagePastor = createSearchSelect(
                this.el.filterPastor,
                [{ value: '', label: 'All Pastors' }, ...pastors.map(p => ({ value: p.id, label: p.full_name }))],
                'All Pastors',
                onPastorChange
            );
        }
    }

    updateModalChurchOptions(districtId, allChurches) {
        if (!this.selModalChurch) return;
        let filtered = allChurches;
        if (districtId) {
            filtered = allChurches.filter(c => String(c.district_id) === String(districtId));
        }
        this.selModalChurch.setOptions(filtered.map(c => ({ value: c.id, label: c.church_name })));
    }

    renderList(pData, districts, isStaff, onEdit, onDelete, onAvatarClick) {
        const body = this.el.list;
        if (!body) return;
        
        const { items, total, start, end } = pData;
        if (this.el.count) this.el.count.textContent = `${total} disciples`;

        const isMobile = window.innerWidth <= 1024;
        body.innerHTML = '';

        if (!items.length) {
            body.innerHTML = '<div class="empty-state">No disciples found.</div>';
            if (this.el.pagination) this.el.pagination.style.display = 'none';
            return;
        }

        if (this.el.pagination) this.el.pagination.style.display = 'flex';
        if (this.el.pageInfo) this.el.pageInfo.textContent = `Showing ${start + 1}-${end} of ${total}`;

        items.forEach(d => {
            const themeColor = d.district_theme_color || null;
            
            if (isMobile) {
                body.appendChild(this._createMobileCardItem(d, themeColor, isStaff, onEdit, onDelete, onAvatarClick));
            } else {
                body.appendChild(this._createGridRowItem(d, themeColor, isStaff, onEdit, onDelete, onAvatarClick));
            }
        });
    }

    _createGridRowItem(d, themeColor, isStaff, onEdit, onDelete, onAvatarClick) {
        const clone = this.el.gridTemplate.content.cloneNode(true);
        
        this._set(clone, '.d-name', 'text', d.full_name);
        this._set(clone, '.d-church', 'text', d.church_name || '—');
        this._set(clone, '.d-district', 'text', d.district_name || '—');
        
        const avaContainer = clone.querySelector('.avatar-container');
        if (avaContainer) {
            avaContainer.innerHTML = ui.getAvatarHtml(d.disciple_image_url, d.full_name, themeColor);
            avaContainer.classList.add('avatar-clickable');
            avaContainer.onclick = () => onAvatarClick(d.id);
        }
        
        const actions = clone.querySelector('.row-actions');
        if (actions) {
            actions.appendChild(ui.createActionBtn('edit', () => onEdit(d.id)));
            if (!isStaff) {
                actions.appendChild(ui.createActionBtn('delete', () => onDelete(d.id)));
            }
        }
        
        return clone;
    }

    _createMobileCardItem(d, themeColor, isStaff, onEdit, onDelete, onAvatarClick) {
        const clone = this.el.cardTemplate.content.cloneNode(true);
        
        this._set(clone, '.pcm-name', 'text', d.full_name);
        this._set(clone, '.d-church-sub', 'text', d.church_name || '—');
        this._set(clone, '.d-district-val', 'text', d.district_name || '—');
        this._set(clone, '.d-church-val', 'text', d.church_name || '—');
        
        const avaWrap = clone.querySelector('.pcm-avatar-pastor');
        if (avaWrap) {
            avaWrap.innerHTML = ui.getAvatarHtml(d.disciple_image_url, d.full_name, themeColor);
            avaWrap.classList.add('avatar-clickable');
            avaWrap.onclick = () => onAvatarClick(d.id);
        }
 
        const actions = clone.querySelector('.pcm-actions');
        if (actions) {
            actions.appendChild(ui.createActionBtn('edit', () => onEdit(d.id)));
            if (!isStaff) {
                actions.appendChild(ui.createActionBtn('delete', () => onDelete(d.id)));
            }
        }
 
        return clone;
    }

    showDiscipleModal(disciple = null, allChurches = []) {
        console.log("Showing Disciple Modal", disciple ? "Edit" : "Add");
        if (!this.el.modalOverlay) {
            console.error("Modal Overlay (modal-form) NOT found!");
            return;
        }
        if (this.el.discipleForm) this.el.discipleForm.reset();
        
        const idField = document.getElementById('f-id');
        const nameField = document.getElementById('f-name');
        
        if (idField) idField.value = '';

        if (disciple) {
            if (this.el.modalTitle) this.el.modalTitle.textContent = 'Edit Disciple';
            if (idField) idField.value = disciple.id;
            if (nameField) nameField.value = disciple.full_name || '';
            
            if (this.selModalDistrictFilter) this.selModalDistrictFilter.setValue(disciple.district_id || '');
            this.updateModalChurchOptions(disciple.district_id, allChurches);
            if (this.selModalChurch) this.selModalChurch.setValue(disciple.church_id || '');
            if (this.selModalPastor) this.selModalPastor.setValue(disciple.pastor_id || '');
        } else {
            if (this.el.modalTitle) this.el.modalTitle.textContent = 'Add Disciple';
            if (this.selModalDistrictFilter) this.selModalDistrictFilter.reset();
            this.updateModalChurchOptions('', allChurches);
            if (this.selModalChurch) this.selModalChurch.reset();
            if (this.selModalPastor) this.selModalPastor.reset();
        }

        this.el.modalOverlay.classList.add('open');
    }

    showDeleteConfirm(d) {
        console.log("Showing Delete Confirm", d.full_name);
        if (!this.el.deleteOverlay) {
            console.error("Delete Overlay (modal-delete) NOT found!");
            return;
        }
        this.el.deleteOverlay.dataset.id = d.id;
        if (this.el.deleteMsg) this.el.deleteMsg.textContent = `Are you sure you want to remove ${d.full_name}? This cannot be undone.`;
        this.el.deleteOverlay.classList.add('open');
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.classList.remove('open'));
    }

    getFormData() {
        if (!this.el.discipleForm) return {};
        const formData = new FormData(this.el.discipleForm);
        return Object.fromEntries(formData.entries());
    }
}
