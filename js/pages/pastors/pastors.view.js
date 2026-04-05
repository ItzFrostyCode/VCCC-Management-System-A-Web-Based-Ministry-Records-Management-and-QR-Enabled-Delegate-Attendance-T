import { esc, calculateAge } from '../../utils/helper.js';
import { ui } from '../../utils/ui.js';

export class PastorsView {
    constructor() {
        this.cacheElements();
    }

    cacheElements() {
        this.el = {
            tableBody: document.getElementById('table-body'),
            countLabel: document.getElementById('count-label'),
            searchInput: document.getElementById('search-input'),
            filterDist: document.getElementById('filter-district'),
            filterChurch: document.getElementById('filter-church'),
            checkAll: document.getElementById('check-all'),
            checkAllMobile: document.getElementById('check-all-mobile'),
            pagination: document.getElementById('pagination'),
            pageInfo: document.getElementById('page-info'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),
            
            // Templates
            gridTemplate: document.getElementById('pastor-grid-template'),
            cardTemplate: document.getElementById('pastor-card-template'),
            
            // Modals
            modalOverlay: document.getElementById('modal-form'),
            modalTitle: document.getElementById('modal-title'),
            addForm: document.getElementById('pastor-form'),
            btnSave: document.getElementById('btn-save'),
            btnCancel: document.getElementById('btn-cancel'),
            btnClose: document.getElementById('btn-close-modal'),
            
            // Export
            btnExport: document.getElementById('btn-export'),
            modalExport: document.getElementById('modal-export'),
            exportModeLabel: document.getElementById('export-mode-label'),
            // Modern Image Uploader
            uploaderPastor: document.getElementById('uploader-pastor'),
            uploaderWife: document.getElementById('uploader-wife'),
            previewPImg: document.getElementById('p-preview-img'),
            previewWImg: document.getElementById('w-preview-img'),
            placeholderP: document.getElementById('p-placeholder'),
            placeholderW: document.getElementById('w-placeholder'),
            btnRemovePPhoto: document.getElementById('btn-remove-p-photo'),
            btnRemoveWPhoto: document.getElementById('btn-remove-w-photo'),
            
            // Delete Confirmation
            deleteOverlay: document.getElementById('modal-delete'),
            deleteMsg: document.getElementById('delete-msg'),
            btnDeleteConfirm: document.getElementById('btn-delete-confirm')
        };
    }

    /**
     * Render the main table/card list
     */
    // Safe Helper for Template Operations
    _set(clone, selector, type, val, classname = null) {
        const el = clone.querySelector(selector);
        if (!el) return null;
        if (type === 'text') el.textContent = val;
        else if (type === 'html') el.innerHTML = val;
        if (classname) el.className = classname;
        return el;
    }

    renderTable(paginated, selectedIds, districtsData, isAdmin, isStaff) {
        const { items, total, start, end } = paginated;
        const body = this.el.tableBody;
        if (!body) return;
        
        if (this.el.countLabel) this.el.countLabel.textContent = `${total} total`;

        if (!items.length) {
            body.innerHTML = '<div class="empty-state">No pastors found.</div>';
            if (this.el.pagination) this.el.pagination.style.display = 'none';
            return;
        }

        if (this.el.pagination) this.el.pagination.style.display = 'flex';
        if (this.el.pageInfo) this.el.pageInfo.textContent = `Showing ${start + 1}-${Math.min(end, total)} of ${total}`;

        // Reset check-alls
        const allChecked = items.length > 0 && items.every(p => selectedIds.has(p.id));
        if (this.el.checkAll) this.el.checkAll.checked = allChecked;
        if (this.el.checkAllMobile) this.el.checkAllMobile.checked = allChecked;

        const isMobile = window.innerWidth <= 1024;
        body.innerHTML = '';
        
        items.forEach(p => {
            const row = isMobile ? this._renderCard(p, selectedIds, districtsData, isAdmin, isStaff) : this._renderRow(p, selectedIds, districtsData, isAdmin, isStaff);
            body.appendChild(row);
        });
    }

    _renderRow(p, selectedIds, districtsData, isAdmin, isStaff) {
        const { statusFormatted, statusClass } = this._formatStatus(p.current_status_code);
        const pAge = p.birthdate ? calculateAge(p.birthdate) : '—';
        const wAge = p.wife_birthdate ? calculateAge(p.wife_birthdate) : '—';
        const ageDisplay = p.wife_name ? `${pAge} / ${wAge}` : pAge;
        
        // Priority to pre-joined color, fallback to district find
        let themeColor = p.district_theme_color;
        if (!themeColor && p.district_id && districtsData) {
            const pDistrict = districtsData.find(d => String(d.id) === String(p.district_id));
            themeColor = pDistrict ? pDistrict.theme_color : null;
        }

        const clone = this.el.gridTemplate.content.cloneNode(true);
        const row = clone.querySelector('.data-table-row');
        if (row) row.dataset.id = p.id;
        
        this._set(clone, '.col-pastor .name', 'text', p.full_name);
        this._set(clone, '.col-pastor .church', 'text', p.church_name || '—');
        this._set(clone, '.col-wife .name', 'text', p.wife_name || '—');
        
        const pastAva = clone.querySelector('.col-pastor .avatar-container');
        if (pastAva) {
            pastAva.innerHTML = ui.getAvatarHtml(p.pastor_image_url, p.full_name, themeColor);
            pastAva.classList.add('avatar-clickable');
            pastAva.dataset.type = 'pastor';
        }

        const wifeAva = clone.querySelector('.col-wife .avatar-container');
        if (wifeAva) {
            if (p.wife_name) {
                wifeAva.innerHTML = ui.getAvatarHtml(p.wife_image_url, p.wife_name, themeColor);
                wifeAva.classList.add('avatar-clickable');
                wifeAva.dataset.type = 'wife';
            } else {
                wifeAva.style.display = 'none';
            }
        }

        this._set(clone, '.col-contact', 'text', p.contact_number || '—');
        this._set(clone, '.badge', 'text', statusFormatted, `status-badge ${statusClass}`);
        this._set(clone, '.col-bdate', 'text', p.birthdate || '—');
        this._set(clone, '.col-age', 'text', ageDisplay);
        this._set(clone, '.col-since', 'text', p.pastoring_start_date || '—');

        const actions = clone.querySelector('.row-actions');
        if (actions) {
            actions.dataset.id = p.id;
            // Native UI actions (icon-only for management grid)
            actions.appendChild(ui.createActionBtn('view', null, false));
            actions.appendChild(ui.createActionBtn('edit', null, false));
            
            // Secretary lifecycle actions (icon-only)
            actions.appendChild(this._createLifecycleBtn('assign', `<svg viewBox="0 0 24 24"><path d="M12 2L3 9h3v11h12V9h3L12 2zm0 2.8L18.2 9H5.8L12 4.8zm-2 14.2v-6h4v6h-4z"/></svg>`, 'Assign to Church', p.current_status_code));
            actions.appendChild(this._createLifecycleBtn('transfer', `<svg viewBox="0 0 24 24"><path d="M19 12l-7 7-1.41-1.41L15.17 13H5v-2h10.17l-4.58-4.59L12 5l7 7z"/></svg>`, 'Transfer Pastor', p.current_status_code));
            actions.appendChild(this._createLifecycleBtn('transition', `<svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`, 'Update Status / Movement', p.current_status_code));
            actions.appendChild(this._createLifecycleBtn('deceased', `<svg viewBox="0 0 24 24"><path d="M13 3v4h4v2h-4v12h-2V9H7V7h4V3h2z"/></svg>`, 'Mark Deceased', p.current_status_code));
            
            if (!isStaff) actions.appendChild(ui.createActionBtn('delete', null, false));
        }

        const rowCheck = clone.querySelector('.row-check');
        if (rowCheck) {
            rowCheck.checked = selectedIds.has(p.id);
            rowCheck.dataset.id = p.id;
        }

        return clone;
    }

    _renderCard(p, selectedIds, districtsData, isAdmin, isStaff) {
        const { statusFormatted, statusClass } = this._formatStatus(p.current_status_code);
        const pAge = p.birthdate ? calculateAge(p.birthdate) : '—';
        const wAge = p.wife_birthdate ? calculateAge(p.wife_birthdate) : '—';
        const ageDisplay = p.wife_name ? `${pAge} / ${wAge}` : pAge;
        
        // Priority to pre-joined color, fallback to district find
        let themeColor = p.district_theme_color;
        if (!themeColor && p.district_id && districtsData) {
            const pDistrict = districtsData.find(d => String(d.id) === String(p.district_id));
            themeColor = pDistrict ? pDistrict.theme_color : null;
        }

        const clone = this.el.cardTemplate.content.cloneNode(true);
        const card = clone.querySelector('.pastor-card-mobile');
        if (card) card.dataset.id = p.id;
        
        this._set(clone, '.pcm-name', 'text', p.full_name);
        if (p.wife_name) {
            this._set(clone, '.pcm-wife-name', 'text', `w/ ${p.wife_name}`);
        } else {
            const el = clone.querySelector('.pcm-wife-name');
            if (el) el.remove();
        }

        this._set(clone, '.church-text', 'text', p.church_name || '—');
        const sWrap = clone.querySelector('.pcm-status-wrap');
        if (sWrap) sWrap.innerHTML = `<span class="status-badge ${statusClass}">${statusFormatted}</span>`;

        this._set(clone, '.contact-val', 'text', p.contact_number || '—');
        this._set(clone, '.age-val', 'text', ageDisplay);
        this._set(clone, '.since-val', 'text', p.pastoring_start_date || '—');
        
        const pAvaWrap = clone.querySelector('.pcm-avatar-pastor');
        if (pAvaWrap) {
            pAvaWrap.innerHTML = ui.getAvatarHtml(p.pastor_image_url, p.full_name, themeColor);
            pAvaWrap.classList.add('avatar-clickable');
            pAvaWrap.dataset.type = 'pastor';
        }

        const wifeAvaWrap = clone.querySelector('.pcm-avatar-wife');
        if (wifeAvaWrap) {
            if (p.wife_name) {
                wifeAvaWrap.innerHTML = ui.getAvatarHtml(p.wife_image_url, p.wife_name, themeColor);
                wifeAvaWrap.classList.add('avatar-clickable');
                wifeAvaWrap.dataset.type = 'wife';
            } else {
                wifeAvaWrap.style.display = 'none';
            }
        }

        const actions = clone.querySelector('.pcm-actions');
        if (actions) {
            actions.dataset.id = p.id;
            actions.appendChild(ui.createActionBtn('view', null, false));
            actions.appendChild(ui.createActionBtn('edit', null, false));
            
            // Secretary lifecycle actions (icon-only for mobile)
            // Color mapping integrated into CSS for better maintenance, passing through here for initialization
            actions.appendChild(this._createLifecycleBtn('assign', `<svg viewBox="0 0 24 24"><path d="M12 2L3 9h3v11h12V9h3L12 2zm0 2.8L18.2 9H5.8L12 4.8zm-2 14.2v-6h4v6h-4z"/></svg>`, 'Assign', p.current_status_code));
            actions.appendChild(this._createLifecycleBtn('transfer', `<svg viewBox="0 0 24 24"><path d="M19 12l-7 7-1.41-1.41L15.17 13H5v-2h10.17l-4.58-4.59L12 5l7 7z"/></svg>`, 'Transfer', p.current_status_code));
            actions.appendChild(this._createLifecycleBtn('transition', `<svg viewBox="0 0 24 24"><path d="M12 2A10 10 0 1 0 22 12 10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`, 'Movement', p.current_status_code));
            
            if (!isStaff) actions.appendChild(ui.createActionBtn('delete', null, false));
        }

        const rowCheck = clone.querySelector('.row-check-mobile');
        if (rowCheck && card) {
            rowCheck.checked = selectedIds.has(p.id);
            rowCheck.dataset.id = p.id;
            if (rowCheck.checked) card.classList.add('selected');
        }

        return clone;
    }

    _formatStatus(code) {
        const map = {
            active:     { label: 'Active',     cls: 'status-active'   },
            undeployed: { label: 'Undeployed', cls: 'status-critical'  },
            deceased:   { label: 'Deceased',   cls: 'status-danger'   },
            draft:      { label: 'Draft',      cls: 'status-default'  }
        };
        const found = map[code];
        return {
            statusFormatted: found ? found.label : (code || 'NA'),
            statusClass:     found ? found.cls   : 'status-default'
        };
    }

    /**
     * Create a compact secretary lifecycle action icon button
     * Uses the exact same design language as ui.createActionBtn(..., false)
     */
    _createLifecycleBtn(action, svgIcon, label, currentStatus) {
        const btn = document.createElement('button');
        btn.className = `btn-icon btn-${action}`;
        btn.type = 'button';
        btn.dataset.lifecycle = action;
        btn.setAttribute('data-tip', label); // Standard tooltip native to UI framework
        btn.innerHTML = svgIcon;

        // Apply native icon theming (mimics button.css .btn-icon)
        // Adjust icon colors specific to lifecycle severity
        const colorMap = {
            assign:     '#2e7d32', // green
            transfer:   '#1565c0', // blue
            undeployed: '#e65100', // orange
            deceased:   '#880e4f'  // dark pink
        };
        const bgMap = {
            assign:     '#e8f5e9',
            transfer:   '#e3f2fd',
            undeployed: '#fff8e1',
            deceased:   '#fce4ec'
        };

        btn.style.cssText = `
            fill: ${colorMap[action] || 'currentColor'};
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border-radius: 6px;
            border: none;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s;
        `;

        // Apply hover effects using native JS since we're using inline styles
        btn.onmouseover = () => { btn.style.background = bgMap[action] || '#f1f5f9'; };
        btn.onmouseout  = () => { btn.style.background = 'transparent'; };

        return btn;
    }


    showModal(title, initialData = {}) {
        if (this.el.modalTitle) this.el.modalTitle.textContent = title;
        if (this.el.addForm) {
            this.el.addForm.reset();
            // Clear selections in SearchSelects via parent reference if needed
        }
        
        // Populate if editing
        const idField = document.getElementById('f-id');
        if (idField) idField.value = initialData.id || '';
        
        const nameField = document.getElementById('f-name');
        if (nameField) nameField.value = initialData.full_name || '';
        
        const wifeField = document.getElementById('f-wife-name');
        if (wifeField) wifeField.value = initialData.wife_name || '';
        
        const contactField = document.getElementById('f-contact-number');
        if (contactField) contactField.value = initialData.contact_number || '';
        
        const bdateField = document.getElementById('f-birthdate');
        if (bdateField) bdateField.value = initialData.birthdate || '';
        
        const wbdateField = document.getElementById('f-wife-birthdate');
        if (wbdateField) wbdateField.value = initialData.wife_birthdate || '';
        
        const pstartField = document.getElementById('f-pastoring-start');
        if (pstartField) pstartField.value = initialData.pastoring_start_date || '';
        
        const statusCode = document.getElementById('f-status-code');
        const statusReadOnly = document.getElementById('f-status-readonly');
        const statusLabel = document.getElementById('f-status-label');
        
        if (statusCode && statusReadOnly) {
            const currentVal = initialData.current_status_code || 'active';
            statusCode.value = currentVal;
            
            // Logic: Draft records allow full status editing (for mistakes/initial setup)
            // Active/Undeployed/Deceased pastors must use the Transition Wizard for lifecycle changes
            const isDraft = initialData.record_status === 'draft';
            const isNew = !initialData.id;

            if (isDraft || isNew) {
                statusCode.style.display = 'block';
                statusReadOnly.style.display = 'none';
            } else {
                statusCode.style.display = 'none';
                statusReadOnly.style.display = 'block';
                const labels = { active: 'Active', undeployed: 'Undeployed', deceased: 'Deceased' };
                if (statusLabel) statusLabel.textContent = labels[currentVal] || currentVal.toUpperCase();
            }
        }
        
        // Record Status Radios
        const isDraftRec = initialData.record_status === 'draft';
        const draftRadio = document.getElementById('f-rec-draft');
        const activeRadio = document.getElementById('f-rec-active');
        if (isDraftRec && draftRadio) draftRadio.checked = true;
        else if (activeRadio) activeRadio.checked = true;

        // Modern Image UI Reset/Init
        this.setPhotoPreview('pastor', initialData.pastor_image_url);
        this.setPhotoPreview('wife', initialData.wife_image_url);

        if (this.el.modalOverlay) this.el.modalOverlay.classList.add('open');
    }

    /**
     * Update the uploader UI for a specific type
     * @param {'pastor'|'wife'} type 
     * @param {string|null} src 
     */
    setPhotoPreview(type, src) {
        const isPastor = type === 'pastor';
        const img = isPastor ? this.el.previewPImg : this.el.previewWImg;
        const placeholder = isPastor ? this.el.placeholderP : this.el.placeholderW;
        const btnRemove = isPastor ? this.el.btnRemovePPhoto : this.el.btnRemoveWPhoto;

        if (src) {
            img.src = src;
            img.style.display = 'block';
            placeholder.style.display = 'none';
            btnRemove.style.display = 'flex';
        } else {
            img.src = '';
            img.style.display = 'none';
            placeholder.style.display = 'flex';
            btnRemove.style.display = 'none';
        }
    }

    closeModals() {
        if (this.el.modalOverlay) this.el.modalOverlay.classList.remove('open');
        if (this.el.modalExport) this.el.modalExport.classList.remove('open');
        if (this.el.deleteOverlay) this.el.deleteOverlay.classList.remove('open');
        if (this.el.addForm) this.el.addForm.reset();
    }

    showDeleteConfirm(p) {
        if (!this.el.deleteOverlay) return;
        this.el.deleteOverlay.dataset.id = p.id;
        if (this.el.deleteMsg) {
            this.el.deleteMsg.textContent = `Are you sure you want to remove ${p.full_name}? This cannot be undone.`;
        }
        this.el.deleteOverlay.classList.add('open');
    }

    getFormData() {
        if (!this.el.addForm) return {};
        const formData = new FormData(this.el.addForm);
        return Object.fromEntries(formData.entries());
    }
}
