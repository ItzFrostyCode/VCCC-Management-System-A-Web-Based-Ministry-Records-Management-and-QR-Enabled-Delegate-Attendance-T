/**
 * Assignments Page - View Management
 */
import { ui } from '../../utils/ui.js';
import { esc } from '../../utils/helper.js';
import { createSearchSelect } from '../../../components/search-select/search-select.js';

export class AssignmentsView {
    constructor() {
        this.cacheElements();
        
        this.statusConfig = {
            active:      { label: 'Active',      class: 'pill-disciple' },
            ended:       { label: 'Ended',       class: 'pill-ghost'    }
        };

        this.typeLabel = {
            'pioneering': '🌱 Pioneering',
            'takeover':   '🤝 Takeover',
            'legacy':     '📜 Legacy'
        };

        this.endReasonLabel = {
            'transferred': 'Transferred',
            'pullout':     'Pullout',
            'redirection': 'Redirection',
            'ended':       'Ended',
            'deceased':    'Deceased'
        };

        this.endReasonClass = {
            'transferred': 'pill-wife',
            'pullout':     'pill-danger',
            'redirection': 'pill-visitor',
            'ended':       'pill-ghost',
            'deceased':    'pill-danger'
        };
    }

    cacheElements() {
        this.list = document.getElementById('assignment-table-body');
        this.count = document.getElementById('assignment-count');
        this.pagination = document.getElementById('pagination');
        this.pageInfo = document.getElementById('page-info');

        // Modal Elements (Edit)
        this.modalEdit = document.getElementById('modal-edit');
        this.modalEditTitle = document.getElementById('modal-title-edit');
        this.formEdit = document.getElementById('assignment-form-edit');

        // Modal Elements (Update)
        this.modalUpdate = document.getElementById('modal-update');
        this.formUpdate = document.getElementById('assignment-form-update');

        // Search Select instances
        this.selPastor = null;
        this.selChurch = null;
        this.selType = null;
        this.selStatus = null;

        this.cardTemplate = document.getElementById('assignment-card-template');
        this.btnExport = document.getElementById('btn-export');
    }

    /**
     * Initialize search-select components
     */
    initSearchSelects({ pastors, churches }) {
        const pWrap = document.getElementById('fe-pastor-sel');
        if (pWrap) {
            this.selPastor = createSearchSelect(
                pWrap, 
                [{ value: '', label: '-- Select Pastor --' }, ...pastors.map(p => ({ value: p.id, label: p.full_name }))], 
                '-- Select Pastor --'
            );
        }

        const cWrap = document.getElementById('fe-church-sel');
        if (cWrap) {
            this.selChurch = createSearchSelect(
                cWrap, 
                [{ value: '', label: '-- Select Church --' }, ...churches.map(c => ({ value: c.id, label: c.church_name }))], 
                '-- Select Church --'
            );
        }

        const filterTypeWrap = document.getElementById('filter-type');
        if (filterTypeWrap) {
            this.selType = createSearchSelect(filterTypeWrap, [
                { value: '', label: 'All Roles' },
                { value: 'Lead Pastor', label: 'Lead Pastor' },
                { value: 'Assistant Pastor', label: 'Assistant Pastor' },
                { value: 'District Presbyter', label: 'District Presbyter' },
                { value: 'Interim Setup', label: 'Interim Setup' },
                { value: 'Worker', label: 'Worker' }
            ], 'All Roles');
        }

        const filterStatusWrap = document.getElementById('filter-status');
        if (filterStatusWrap) {
            this.selStatus = createSearchSelect(filterStatusWrap, [
                { value: '', label: 'All Status' },
                { value: 'active', label: '🟢 Active' },
                { value: 'ended',  label: '⬛ Ended' }
            ], 'All Status');
        }
    }

    /**
     * Main rendering
     */
    renderList(pData, pastors) {
        if (!this.list) return;
        
        const { items, total, start, end } = pData;
        if (this.count) this.count.textContent = `${total} total records`;

        const isMobile = window.innerWidth <= 1024;
        this.list.innerHTML = '';

        if (!items.length) {
            this.list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-title">No records found</div>
                    <div class="empty-desc">Try adjusting your filters or record a new assignment.</div>
                </div>`;
            if (this.pagination) this.pagination.style.display = 'none';
            return;
        }

        if (this.pagination) this.pagination.style.display = 'flex';
        if (this.pageInfo) this.pageInfo.textContent = `Showing ${start + 1}-${end} of ${total}`;

        items.forEach(a => {
            const pastor = pastors.find(p => String(p.id) === String(a.pastor_id));
            if (isMobile) {
                this.list.appendChild(this._createMobileCardItem(a, pastor));
            } else {
                this.list.appendChild(this._createGridRowItem(a));
            }
        });
    }

    _createGridRowItem(a) {
        const status = this.statusConfig[a.status_code] || { label: a.status_code, class: 'pill-ghost' };
        const typeLabel = this.typeLabel[a.assignment_type] || (a.assignment_type || '—');
        const endReasonLabel = a.end_reason ? (this.endReasonLabel[a.end_reason] || a.end_reason) : null;
        const endReasonClass = a.end_reason ? (this.endReasonClass[a.end_reason] || 'pill-ghost') : null;
        
        const row = document.createElement('div');
        row.className = 'data-table-row cols-assign';
        row.dataset.id = a.id;
        row.innerHTML = `
            <div class="cell-double">
                <div class="cell-name-primary">${esc(a.pastor_name) || 'Unknown Pastor'}</div>
                <div style="font-size:11px; color:var(--text-3);">${esc(a.church_name) || 'Unknown Church'}</div>
            </div>
            <div data-label="Type">
                <span style="font-weight:600; color:var(--text-2); font-size:12px;">${typeLabel}</span>
            </div>
            <div data-label="Status">
                <span class="pill ${status.class}">${status.label}</span>
                ${endReasonLabel ? `<span class="pill ${endReasonClass}" style="margin-left:4px; font-size:10px;">${endReasonLabel}</span>` : ''}
            </div>
            <div data-label="Duration">
                <div style="font-size:12px; color:var(--text-2); font-weight:500;">
                    ${a.start_date || '—'} ${a.end_date ? '→ ' + a.end_date : '→ Present'}
                </div>
            </div>
            <div class="row-actions" data-id="${a.id}"></div>`;
        
        const actions = row.querySelector('.row-actions');
        if (actions) {
            actions.dataset.id = a.id;
            actions.appendChild(ui.createActionBtn('edit', null, false));
            
            if (a.status_code === 'active') {
                const btnUpdate = document.createElement('button');
                btnUpdate.className = 'btn-icon pcm-update';
                btnUpdate.type = 'button';
                btnUpdate.setAttribute('data-tip', 'Update Status');
                btnUpdate.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
                btnUpdate.style.cssText = `fill:none; color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:6px; cursor:pointer; transition:all 0.2s;`;
                btnUpdate.onmouseover = () => btnUpdate.style.background = '#fffbeb';
                btnUpdate.onmouseout = () => btnUpdate.style.background = 'transparent';
                actions.appendChild(btnUpdate);
            }
        }
        return row;
    }

    _createMobileCardItem(a, pastor) {
        const status = this.statusConfig[a.status_code] || { label: a.status_code, class: 'pill-ghost' };
        const typeLabel = this.typeLabel[a.assignment_type] || (a.assignment_type || '—');
        const themeColor = a.district_theme_color || (pastor ? pastor.theme_color : null);

        const clone = this.cardTemplate.content.cloneNode(true);
        const nameEl = clone.querySelector('.pcm-name');
        const churchEl = clone.querySelector('.pcm-wife-name');
        const statusWrap = clone.querySelector('.pcm-status-wrap');
        const roleVal = clone.querySelector('.role-text');
        const eventVal = clone.querySelector('.event-text');
        const startVal = clone.querySelector('.start-val');
        const endVal = clone.querySelector('.end-val');
        const avaWrap = clone.querySelector('.pcm-avatar-pastor');
        
        nameEl.textContent = a.pastor_name || 'Unknown Pastor';
        churchEl.textContent = a.church_name || '—';
        statusWrap.innerHTML = `<span class="status-badge ${status.class.replace('pill-', 'status-')}">${status.label}</span>`;
        
        roleVal.textContent = typeLabel;
        eventVal.textContent = a.end_reason ? `End: ${this.endReasonLabel[a.end_reason] || a.end_reason}` : '—';
        startVal.textContent = a.start_date || '—';
        endVal.textContent = a.end_date || 'Present';
        
        avaWrap.innerHTML = ui.getAvatarHtml(pastor ? pastor.pastor_image_url : null, a.pastor_name, themeColor);
        
        const actions = clone.querySelector('.pcm-actions');
        if (actions) {
            actions.dataset.id = a.id;
            actions.appendChild(ui.createActionBtn('edit', null, false));
            
            if (a.status_code === 'active') {
                const btnUpdate = document.createElement('button');
                btnUpdate.className = 'btn-icon pcm-update';
                btnUpdate.type = 'button';
                btnUpdate.setAttribute('data-tip', 'Update Status');
                btnUpdate.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>`;
                btnUpdate.style.cssText = `fill:none; color:#f59e0b; display:inline-flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:6px; cursor:pointer; transition:all 0.2s;`;
                btnUpdate.onmouseover = () => btnUpdate.style.background = '#fffbeb';
                btnUpdate.onmouseout = () => btnUpdate.style.background = 'transparent';
                actions.appendChild(btnUpdate);
            }
        }
        
        const wrapper = document.createElement('div');
        wrapper.className = 'pastor-card-mobile pcm-wrap';
        wrapper.dataset.id = a.id;
        wrapper.appendChild(clone);
        return wrapper;
    }

    /**
     * Modal Management
     */
    showEditModal(assignment = null) {
        if (!this.modalEdit) return;
        this.formEdit.reset();
        document.getElementById('fe-id').value = '';

        if (assignment) {
            this.modalEditTitle.textContent = 'Edit Assignment';
            document.getElementById('fe-id').value = assignment.id;
            
            if (this.selPastor) this.selPastor.setValue(assignment.pastor_id || '');
            if (this.selChurch) this.selChurch.setValue(assignment.church_id || '');
            
            document.getElementById('fe-assignment-type').value = assignment.assignment_type || 'legacy';
            document.getElementById('fe-start').value = assignment.start_date || '';
            document.getElementById('fe-notes').value = assignment.notes || '';
        } else {
            this.modalEditTitle.textContent = 'New Assignment';
            if (this.selPastor) this.selPastor.reset();
            if (this.selChurch) this.selChurch.reset();
            document.getElementById('fe-assignment-type').value = 'takeover';
            document.getElementById('fe-start').value = new Date().toISOString().split('T')[0];
        }

        this.modalEdit.classList.add('open');
    }

    showUpdateModal(assignment) {
        if (!this.modalUpdate || !assignment) return;
        this.formUpdate.reset();
        
        document.getElementById('fu-id').value = assignment.id;
        
        const contextEl = document.getElementById('fu-context-info');
        if (contextEl) {
            contextEl.innerHTML = `Pastor: <b>${esc(assignment.pastor_name)}</b><br>Currently at <b>${esc(assignment.church_name)}</b>`;
        }

        document.getElementById('fu-end').value = new Date().toISOString().split('T')[0];
        document.getElementById('fu-end-reason').value = 'ended';

        this.modalUpdate.classList.add('open');
    }

    closeModals() {
        if (this.modalEdit) this.modalEdit.classList.remove('open');
        if (this.modalUpdate) this.modalUpdate.classList.remove('open');
    }

    getFormData(formId) {
        const form = document.getElementById(formId);
        if (!form) return {};
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // If getting data from Edit form, append our custom SearchSelects
        if (formId === 'assignment-form-edit') {
            data.pastor_id = this.selPastor ? this.selPastor.getValue() : null;
            data.church_id = this.selChurch ? this.selChurch.getValue() : null;
            // Provide defaults for missing schema fields during creation/correction
            data.status_code = 'active'; 
            data.end_date = null;
            data.end_reason = null;
        }

        if (!data.assignment_type) data.assignment_type = 'legacy';
        
        return data;
    }
}
