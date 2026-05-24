import { ui } from '../utils/ui.js';
import { requireAuth } from '../supabase.js';
import { initLayout } from '../layout.js';
import { exportPastorHistoryPDF } from '../utils/export/pastors/pastor-history-pdf.js';
import { pastorService } from '../services/pastor.service.js';
import { rankService } from '../services/rank.service.js';

import { PastorViewState } from './pastor-view.state.js';
import { PastorViewView } from './pastor-view.view.js';

class PastorViewController {
    constructor() {
        this.state = new PastorViewState();
        this.view = new PastorViewView();
        this.isMounted = false;
        
        // Save bindings for unmounting
        this._boundHandleEditProfile = this.handleEditProfile.bind(this);
        this._boundOpenImageViewer = this.openImageViewer.bind(this);
        this._boundSwitchTab = this.switchTab.bind(this);
        this._boundHandleProfileAssign = () => {
            if (!this.state.pastorId) return;
            window.router ? window.router.push(`pastors.html?add=1&pastor_id=${this.state.pastorId}`) : window.location.href = `pastors.html?add=1&pastor_id=${this.state.pastorId}`;
        };
        this._boundHandleProfileTransfer = () => {
            if (!this.state.pastorId) return;
            window.router ? window.router.push(`pastors.html?transfer=${this.state.pastorId}`) : window.location.href = `pastors.html?transfer=${this.state.pastorId}`;
        };
        this._boundHandleAddRank = () => {
            const form = document.getElementById('rank-form');
            if (form) {
                form.reset();
                document.getElementById('fr-effective-date').value = new Date().toISOString().split('T')[0];
            }
            this.openModal('modal-rank');
        };
    }

    async init() {
        try {
            await requireAuth();
            initLayout('Pastors');

            const urlParams = new URLSearchParams(window.location.search);
            const pastorId = urlParams.get('id');
            
            if (!pastorId) { 
                window.location.href = 'pastors.html'; 
                return; 
            }

            ui.showLoader('Loading profile...');
            
            await this.loadAndRender(pastorId);
            
            this.initGlobalHooks();
            this.initTabSystem();
            this.initQuickEdit();
            this.initCommandBar();
            
        } catch (err) {
            console.error('Pastor View init failed:', err);
            ui.toast('Failed to load profile. Please refresh.', 'error');
        } finally {
            ui.hideLoader();
        }
    }

    async loadAndRender(id) {
        const data = await this.state.loadData(id);
        this.view.renderAll(data);
    }

    initGlobalHooks() {
        // Attach to window object for inline HTML onclick handlers
        // This is a legacy pattern but necessary if the HTML uses inline onclick="window.xxx"
        window.handleEditProfile = this._boundHandleEditProfile;
        window.openImageViewer = this._boundOpenImageViewer;
        window.switchTab = this._boundSwitchTab;
        window.openModal = this.openModal;
        window.closeModal = this.closeModal;

        window.handleProfileAssign = this._boundHandleProfileAssign;
        window.handleProfileTransfer = this._boundHandleProfileTransfer;
        window.handleAddRank = this._boundHandleAddRank;
    }

    clearGlobalHooks() {
        delete window.handleEditProfile;
        delete window.openImageViewer;
        delete window.switchTab;
        delete window.openModal;
        delete window.closeModal;
        delete window.handleProfileAssign;
        delete window.handleProfileTransfer;
        delete window.handleAddRank;
    }

    openModal(id) {
        document.getElementById(id)?.classList.add('open');
    }

    closeModal(id) {
        document.getElementById(id)?.classList.remove('open');
    }

    initTabSystem() {
        document.querySelectorAll('.fb-tab').forEach(btn => {
            btn.onclick = () => this.switchTab(btn.getAttribute('data-tab'));
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.fb-tab').forEach(b => b.classList.remove('active'));
        document.querySelector(`.fb-tab[data-tab="${tabId}"]`)?.classList.add('active');
        
        document.querySelectorAll('.fb-section').forEach(s => s.classList.remove('active'));
        document.getElementById('section-' + tabId)?.classList.add('active');
    }

    initQuickEdit() {
        const form = document.getElementById('pastor-form');
        if (form) {
            form.onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const getValue = (id) => document.getElementById(id)?.value || null;

                    const updates = {
                        full_name:           getValue('f-name'),
                        wife_name:           getValue('f-wife-name'),
                        contact_number:      getValue('f-contact-number'),
                        birthdate:           getValue('f-birthdate')       || null,
                        wife_birthdate:      getValue('f-wife-birthdate')  || null,
                        pastoring_start_date:getValue('f-pastoring-start') || null,
                        current_status_code: getValue('f-status-code')
                    };

                    Object.keys(updates).forEach(k => { if (updates[k] === '') updates[k] = null; });
                    
                    await pastorService.update(this.state.pastorId, updates);
                    ui.toast('Profile updated successfully');
                    this.closeModal('modal-form');
                    
                    await this.loadAndRender(this.state.pastorId);
                } catch (err) { 
                    console.error('Update failed:', err);
                    ui.toast(err.message || 'Failed to update profile', 'error'); 
                }
            };
        }

        const rankForm = document.getElementById('rank-form');
        if (rankForm) {
            rankForm.onsubmit = async (e) => {
                e.preventDefault();
                const btn = rankForm.querySelector('[type="submit"]');
                try {
                    const rankCode = document.getElementById('fr-rank-code')?.value;
                    const effDate  = document.getElementById('fr-effective-date')?.value;
                    
                    if (!rankCode || !effDate) throw new Error('Missing required fields');

                    if (btn) {
                        btn.disabled = true;
                        btn.textContent = 'Saving...';
                    }

                    await rankService.addRank({
                        pastor_id: this.state.pastorId,
                        rank_code: rankCode,
                        effective_date: effDate
                    });

                    ui.toast('Status logged successfully!');
                    this.closeModal('modal-rank');
                    await this.loadAndRender(this.state.pastorId);
                } catch (err) {
                    console.error('Failed to log rank:', err);
                    ui.toast(err.message || 'Error saving status record', 'error');
                } finally {
                    if (btn) { btn.disabled = false; btn.textContent = 'Save Record'; }
                }
            };
        }
    }

    handleEditProfile() {
        const p = this.state.data.pastor;
        if (!p) return;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('f-name',           p.full_name);
        setVal('f-wife-name',      p.wife_name);
        setVal('f-contact-number', p.contact_number);
        setVal('f-status-code',    p.current_status_code || 'active');

        const toDateInput = (val) => val ? new Date(val).toISOString().split('T')[0] : '';
        setVal('f-birthdate',       toDateInput(p.birthdate));
        setVal('f-wife-birthdate',  toDateInput(p.wife_birthdate));
        setVal('f-pastoring-start', toDateInput(p.pastoring_start_date));

        this.openModal('modal-form');
    }

    initCommandBar() {
        const exportBtn = document.getElementById('btn-export-pdf');
        if (exportBtn) {
            exportBtn.onclick = () => {
                if (this.state.data.pastor && this.state.data.history) {
                    exportPastorHistoryPDF(this.state.data.pastor, this.state.data.history);
                } else {
                    ui.toast('Data not ready for export', 'warning');
                }
            };
        }
    }

    openImageViewer(url) {
        const img = document.getElementById('full-image-display');
        const modal = document.getElementById('modal-image-viewer');
        
        if (img && url && modal) {
            img.src = url;
            img.style.display = 'block';
            modal.classList.add('open');
        }
    }
}

// Module Lifecycle Hook Implementation
const instance = new PastorViewController();

export async function mount(stateParams = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;

    // Check for Wizard States (from Action Sheets)
    if (stateParams.wizard === 'rank' && stateParams.pastorId) {
        console.log("Wizard: Auto-opening Rank modal for pastor", stateParams.pastorId);
        setTimeout(() => instance._boundHandleAddRank(), 600);
    }
}

export function unmount() {
    instance.clearGlobalHooks();
    instance.isMounted = false;
    console.log("Pastor View Controller Unmounted Cleanly");
}

if (!window.router || !window.router.currentController) {
    mount(window.router ? window.router.getState() : {});
}

export default { mount, unmount };
