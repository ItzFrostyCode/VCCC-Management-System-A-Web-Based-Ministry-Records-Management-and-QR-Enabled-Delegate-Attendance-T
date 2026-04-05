import { ui } from '../../utils/ui.js';
import { createSearchSelect } from '../../../components/search-select/search-select.js';

export class ChurchesView {
    constructor() {
        this.cacheElements();
        this.selModalDistrict = null;
        this.selModalPioneer = null;
        this.selModalMother = null;
        this.selModalHistPastor = null;
    }

    cacheElements() {
        this.el = {
            list: document.getElementById('church-table-body'),
            count: document.getElementById('church-count'),
            searchInput: document.getElementById('church-search'),
            filterDistrict: document.getElementById('filter-district'),
            filterScope: document.getElementById('filter-scope'),
            pagination: document.getElementById('pagination'),
            pageInfo: document.getElementById('page-info'),
            btnPrev: document.getElementById('btn-prev'),
            btnNext: document.getElementById('btn-next'),

            // Templates
            gridTemplate: document.getElementById('church-grid-template'),
            cardTemplate: document.getElementById('church-card-template'),

            // Main Edit Modal
            modalOverlay: document.getElementById('church-modal-overlay'),
            modalTitle: document.getElementById('modal-title'),
            churchForm: document.getElementById('church-form'),
            btnSave: document.getElementById('btn-save-church'),
            btnCancel: document.getElementById('btn-cancel-modal'),
            btnClose: document.getElementById('btn-close-modal'),

            // Details Modal (New)
            detOverlay: document.getElementById('church-details-overlay'),
            detBody: document.getElementById('church-details-body'),
            detTitle: document.getElementById('details-title'),
            btnCloseDet: document.getElementById('btn-close-det'),

            // Quick Add Disciple Modal -> REPLACED by Historical
            qdOverlay: document.getElementById('modal-historical'),
            qdForm: document.getElementById('form-historical'),
            qdChurchName: document.getElementById('hist-church-name'),
            qdChurchId: document.getElementById('hist-church-id'),
            btnCloseQd: document.getElementById('btn-close-hist'),
            btnCancelQd: document.getElementById('btn-cancel-hist'),

            // Export
            btnExport: document.getElementById('btn-export'),
            exportOverlay: document.getElementById('export-modal-overlay'),
            btnCloseExport: document.getElementById('btn-close-export'),
            btnCancelExport: document.getElementById('btn-cancel-export')
        };
    }

    initModalSelects(districts, pastors, churches) {
        const distEl = document.getElementById('f-district');
        const pioneerEl = document.getElementById('f-pioneer');
        const motherEl = document.getElementById('f-mother');

        if (distEl) {
            this.selModalDistrict = createSearchSelect(
                distEl, 
                [{ value: '', label: 'Select District' }, ...districts.map(d => ({ value: d.id, label: d.district_name }))], 
                'Select District'
            );
        }

        if (pioneerEl) {
            this.selModalPioneer = createSearchSelect(
                pioneerEl, 
                [{ value: '', label: 'Select Pastor' }, ...pastors.map(p => ({ value: p.id, label: p.full_name }))], 
                'Select Pastor'
            );
        }

        if (motherEl) {
            this.selModalMother = createSearchSelect(
                motherEl, 
                [{ value: '', label: 'Select Mother Church' }, ...churches.map(c => ({ value: c.id, label: c.church_name }))], 
                'Select Mother Church'
            );
        }

        const histPastorEl = document.getElementById('f-hist-pastor');
        if (histPastorEl) {
            this.selModalHistPastor = createSearchSelect(
                histPastorEl,
                [{ value: '', label: 'Select Pastor' }, ...pastors.map(p => ({ value: p.id, label: p.full_name }))],
                'Select Pastor'
            );
        }
    }

    renderList(pData, districts) {
        const body = this.el.list;
        if (!body) return;

        const { items, total, start, end } = pData;
        if (this.el.count) this.el.count.textContent = `${total} total`;

        const isMobile = window.innerWidth <= 1024;
        body.innerHTML = '';

        if (!items || !items.length) {
            body.innerHTML = '<div style="padding:40px; text-align:center; color:var(--text-3); font-size:14px;">No churches found.</div>';
            if (this.el.pagination) this.el.pagination.style.display = 'none';
            return;
        }

        if (this.el.pagination) this.el.pagination.style.display = 'flex';
        if (this.el.pageInfo) this.el.pageInfo.textContent = `Showing ${start + 1}-${end} of ${total}`;

        items.forEach(c => {
            const district = districts.find(d => String(d.id) === String(c.district_id));
            const themeColor = district ? district.theme_color : '#64748b';
            
            if (isMobile) {
                body.appendChild(this._createMobileCardItem(c, themeColor));
            } else {
                body.appendChild(this._createGridRowItem(c, themeColor));
            }
        });
    }

    _createGridRowItem(c, themeColor) {
        if (!this.el.gridTemplate) return document.createElement('div');
        const clone = this.el.gridTemplate.content.cloneNode(true);
        
        const nameEl = clone.querySelector('.c-name');
        if (nameEl) nameEl.textContent = c.church_name;
        
        const addrEl = clone.querySelector('.c-address');
        if (addrEl) addrEl.textContent = c.church_address || '—';

        const distEl = clone.querySelector('.c-district');
        if (distEl) distEl.textContent = c.district_name || '—';

        const typeEl = clone.querySelector('.c-type');
        if (typeEl) {
            const scope = (c.church_scope || 'local').toUpperCase();
            typeEl.textContent = scope;
            typeEl.style.color = themeColor;
        }

        const pastorEl = clone.querySelector('.c-pastor');
        if (pastorEl) pastorEl.textContent = c.current_pastor_name || '—';

        const statusWrap = clone.querySelector('.pcm-status-wrap');
        if (statusWrap) {
            statusWrap.innerHTML = `<div style="width:10px; height:10px; border-radius:50%; background:${themeColor};"></div>`;
        }

        const actions = clone.querySelector('.row-actions');
        if (actions) {
            actions.dataset.id = c.id;
            actions.appendChild(ui.createActionBtn('plus', null, true));
            actions.appendChild(ui.createActionBtn('view', null, true));
            actions.appendChild(ui.createActionBtn('edit', null, true));
            actions.appendChild(ui.createActionBtn('delete', null, true));
        }

        const row = clone.querySelector('.data-table-row');
        if (row) row.dataset.id = c.id;

        return clone;
    }

    _createMobileCardItem(c, themeColor) {
        if (!this.el.cardTemplate) return document.createElement('div');
        const clone = this.el.cardTemplate.content.cloneNode(true);
        
        const nameEl = clone.querySelector('.pcm-name');
        if (nameEl) nameEl.textContent = c.church_name;

        const pastorEl = clone.querySelector('.pastor-text');
        if (pastorEl) pastorEl.textContent = c.current_pastor_name || '—';

        const distEl = clone.querySelector('.district-val');
        if (distEl) distEl.textContent = c.district_name || '—';

        const addrEl = clone.querySelector('.address-val');
        if (addrEl) addrEl.textContent = c.church_address || '—';

        const statusWrap = clone.querySelector('.pcm-status-wrap');
        if (statusWrap) {
            statusWrap.innerHTML = `<div style="width:12px; height:12px; border-radius:50%; background:${themeColor};"></div>`;
        }

        const actions = clone.querySelector('.pcm-actions');
        if (actions) {
            actions.dataset.id = c.id;
            actions.appendChild(ui.createActionBtn('plus', null, true));
            actions.appendChild(ui.createActionBtn('view', null, true));
            actions.appendChild(ui.createActionBtn('edit', null, true));
            actions.appendChild(ui.createActionBtn('delete', null, true));
        }

        const card = clone.querySelector('.pastor-card-mobile');
        if (card) card.dataset.id = c.id;

        return clone;
    }

    showDetailsModal(ctx) {
        if (!this.el.detOverlay || !this.el.detBody) return;
        const { church, history, offspring } = ctx;

        if (this.el.detTitle) this.el.detTitle.textContent = church.church_name;

        this.el.detBody.innerHTML = `
            <div class="church-detail-grid">
                <div class="detail-section">
                    <h4>Primary Information</h4>
                    <p><b>Address:</b> ${church.church_address || '—'}</p>
                    <p><b>District:</b> ${church.district_name || '—'}</p>
                    <p><b>Type:</b> ${(church.church_scope || 'local').toUpperCase()}</p>
                    <p><b>Pioneer Pastor:</b> ${church.pioneer_pastor_name || '—'}</p>
                    ${church.notes ? `<p><b>Notes:</b> ${church.notes}</p>` : ''}
                </div>

                <div class="detail-section">
                    <h4>Current Leadership</h4>
                    <p><b>Pastor:</b> ${church.current_pastor_name || '—'}</p>
                </div>

                <div class="detail-section">
                    <h4>Pastors History</h4>
                    <div class="mini-table">
                        <div class="mini-head"><span>Pastor</span><span>Period</span><span>Status</span></div>
                        <div class="mini-body">
                            ${history.length ? history.map(h => `
                                <div class="mini-row">
                                    <span>${h.pastor_name}</span>
                                    <span>${h.start_date} ${h.end_date ? 'to ' + h.end_date : '(Current)'}</span>
                                    <span>${h.status_code || 'active'}</span>
                                </div>
                            `).join('') : '<div class="empty-mini">No history recorded.</div>'}
                        </div>
                    </div>
                </div>

                <div class="detail-section">
                    <h4>Daughter Churches (Offspring)</h4>
                    <ul class="detail-list">
                        ${offspring.length ? offspring.map(o => `<li>${o.church_name} (${o.church_address})</li>`).join('') : '<li>No daughter churches.</li>'}
                    </ul>
                </div>
            </div>
        `;

        this.el.detOverlay.classList.add('open');
    }

    showChurchModal(church = null) {
        if (!this.el.modalOverlay) return;
        if (this.el.churchForm) this.el.churchForm.reset();
        
        const idField = document.getElementById('f-id');
        const nameField = document.getElementById('f-name');
        const addrField = document.getElementById('f-address');
        const notesField = document.getElementById('f-notes');

        if (idField) idField.value = '';

        if (church) {
            if (this.el.modalTitle) this.el.modalTitle.textContent = 'Edit Church';
            if (idField) idField.value = church.id;
            if (nameField) nameField.value = church.church_name || '';
            if (addrField) addrField.value = church.church_address || '';
            if (notesField) notesField.value = church.notes || '';
            
            if (this.selModalDistrict) this.selModalDistrict.setValue(church.district_id || '');
            if (this.selModalPioneer) this.selModalPioneer.setValue(church.pioneer_pastor_id || '');
            if (this.selModalMother) this.selModalMother.setValue(church.mother_church_id || '');
            
            const radio = document.querySelector(`input[name="church_scope"][value="${church.church_scope || 'local'}"]`);
            if (radio) radio.checked = true;
        } else {
            if (this.el.modalTitle) this.el.modalTitle.textContent = 'Add New Church';
            if (this.selModalDistrict) this.selModalDistrict.reset();
            if (this.selModalPioneer) this.selModalPioneer.reset();
            if (this.selModalMother) this.selModalMother.reset();
        }

        this.el.modalOverlay.classList.add('open');
    }

    showHistoricalModal(churchId, churchName) {
        if (!this.el.qdOverlay) return;
        if (this.el.qdForm) this.el.qdForm.reset();
        
        if (this.el.qdChurchId) this.el.qdChurchId.value = churchId;
        if (this.el.qdChurchName) this.el.qdChurchName.textContent = churchName;
        
        if (this.selModalHistPastor) this.selModalHistPastor.reset();
        
        this.el.qdOverlay.classList.add('open');
    }

    closeModals() {
        const modals = document.querySelectorAll('.modal-overlay');
        modals.forEach(m => m.classList.remove('open'));
    }

    getFormData() {
        if (!this.el.churchForm) return {};
        const formData = new FormData(this.el.churchForm);
        const data = Object.fromEntries(formData.entries());
        
        // Explicitly capture SearchSelect values
        data.district_id = this.selModalDistrict ? this.selModalDistrict.getValue() : null;
        data.pioneer_pastor_id = this.selModalPioneer ? this.selModalPioneer.getValue() : null;
        data.mother_church_id = this.selModalMother ? this.selModalMother.getValue() : null;
        
        return data; 
    }
}
