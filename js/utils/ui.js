import { esc, hexToRgba } from './helper.js';

/**
 * Universal UI Manager
 * Handles global UI components: Toasts, Modals, Loading Spinners.
 */
class UIManager {
    constructor() {
        this.toastContainer = null;
    }

    /**
     * Show a "premium" Toast message
     */
    toast(message, type = 'success', duration = 3000) {
        if (!this.toastContainer) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'global-toast-container';
            this.toastContainer.style.cssText = `
                position: fixed;
                bottom: 24px;
                right: 24px;
                z-index: 9999;
                display: flex;
                flex-direction: column;
                gap: 8px;
                pointer-events: none;
            `;
            document.body.appendChild(this.toastContainer);
        }

        const icon = this._getToastIcon(type);
        const bg = this._getToastBg(type);
        
        const toast = document.createElement('div');
        toast.className = `toast-item toast-${type}`;
        toast.style.cssText = `
            background: #fff;
            color: #222;
            padding: 12px 16px;
            border-radius: 12px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.12);
            border-left: 4px solid ${bg};
            display: flex;
            align-items: center;
            gap: 12px;
            font-size: 14px;
            font-weight: 500;
            min-width: 250px;
            max-width: 400px;
            pointer-events: auto;
            transform: translateX(120%);
            transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
        `;

        toast.innerHTML = `
            <span style="color:${bg}; display:flex;">${icon}</span>
            <span style="flex:1;">${message}</span>
        `;

        this.toastContainer.appendChild(toast);

        requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });

        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 400);
        }, duration);
    }

    /**
     * Show a global Loading Loader
     */
    showLoader(message = 'Loading...') {
        let loader = document.getElementById('global-page-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-page-loader';
            loader.style.cssText = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(255,255,255,0.7);
                backdrop-filter: blur(4px);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
            `;
            loader.innerHTML = `
                <div class="spinner"></div>
                <div id="loader-message" style="font-size:14px; font-weight:600; color:var(--text-2);">${message}</div>
            `;
            document.body.appendChild(loader);
        } else {
            const msgEl = loader.querySelector('#loader-message');
            if (msgEl) msgEl.textContent = message;
        }
        loader.style.display = 'flex';
    }

    hideLoader() {
        const loader = document.getElementById('global-page-loader');
        if (loader) loader.style.display = 'none';
    }

    /**
     * Show Image Viewer
     */
    showImage(url, title = 'View Image', onUpdate = null) {
        const modal = document.getElementById('modal-image-viewer');
        const display = document.getElementById('full-image-display');
        const initEl = document.getElementById('full-initials-display');
        const titleEl = document.getElementById('image-viewer-title');
        const actionsWrap = document.getElementById('image-viewer-actions');
        const updateBtn = document.getElementById('btn-update-viewing-photo');
        const updateInput = document.getElementById('image-viewer-input');
        
        if (!modal || !display) return;
        
        if (titleEl) titleEl.textContent = title;
        
        if (url) {
            display.src = url;
            display.style.display = 'block';
            if (initEl) initEl.style.display = 'none';
        } else if (initEl) {
            display.style.display = 'none';
            initEl.style.display = 'flex';
            initEl.textContent = (title || '?').charAt(0).toUpperCase();
        }

        // Quick Update Feature
        if (actionsWrap && onUpdate) {
            actionsWrap.style.display = 'block';
            if (updateBtn && updateInput) {
                updateBtn.onclick = () => updateInput.click();
                updateInput.onchange = async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    
                    try {
                        this.showLoader('Updating photo...');
                        await onUpdate(file);
                        this.toast('Photo updated successfully');
                        modal.classList.remove('open');
                        updateInput.value = ''; // Reset
                    } catch (err) {
                        this.toast(err.message || 'Update failed', 'error');
                    } finally {
                        this.hideLoader();
                    }
                };
            }
        } else if (actionsWrap) {
            actionsWrap.style.display = 'none';
        }
        
        modal.classList.add('open');
        
        const close = () => {
            modal.classList.remove('open');
            setTimeout(() => { if(display) display.src = ''; }, 300);
        };
        
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.onclick = close;
        modal.onclick = (e) => { if(e.target === modal) close(); };
    }

    /**
     * Generate Action Button (Universal design)
     * @param {'view'|'edit'|'delete'|'plus'|'archive'} type 
     * @param {Function} onClick 
     * @param {boolean} labeled Default is true for boxed universal design
     */
    createActionBtn(type, onClick, labeled = true) {
        const btn = document.createElement('button');
        // Use pcm-action-btn for the universal labeled box design, otherwise use standard icon-btn
        btn.className = labeled ? `pcm-action-btn pcm-${type}` : `btn-icon btn-${type}`;
        btn.type = 'button';
        
        let label = (type === 'plus') ? 'Add' : type.charAt(0).toUpperCase() + type.slice(1);
        if (!labeled) btn.setAttribute('data-tip', label);
        
        let svg = '';
        if (type === 'view') {
            svg = '<svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
        } else if (type === 'plus') {
            svg = '<svg viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
        } else if (type === 'edit') {
            svg = '<svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
        } else if (type === 'delete') {
            svg = '<svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
        } else if (type === 'archive') {
            svg = '<svg viewBox="0 0 24 24"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>';
        }
        
        btn.innerHTML = labeled ? `${svg} ${label}` : svg;
        
        if (onClick) {
            btn.onclick = (e) => {
                e.stopPropagation();
                onClick(e);
            };
        }
        return btn;
    }

    /**
     * Premium Confirmation Modal
     * Replaces standard window.confirm with a high-fidelity modal.
     */
    confirm(message, onConfirm, options = {}) {
        const {
            title = 'Confirm Action',
            confirmText = 'Confirm',
            cancelText = 'Cancel',
            type = 'danger' // danger, primary, info
        } = options;

        let overlay = document.getElementById('global-confirm-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-confirm-overlay';
            overlay.className = 'modal-overlay'; // Reuses your modal-overlay styles
            document.body.appendChild(overlay);
        }

        const confirmBtnClass = type === 'danger' ? 'btn-primary' : 'btn-primary'; // Adjust based on your button.css
        const confirmBtnStyle = type === 'danger' ? 'background-color: var(--red); border-color: var(--red);' : '';

        overlay.innerHTML = `
            <div class="modal-box modal-sm" style="max-width:400px; transform: scale(0.9); opacity:0; transition: all 0.3s cubic-bezier(0.19, 1, 0.22, 1);">
                <div class="modal-head">
                    <h2 class="modal-title">${title}</h2>
                    <button class="modal-close" id="btn-close-confirm">&times;</button>
                </div>
                <div class="modal-body" style="padding: 24px; text-align: center;">
                    <div style="font-size:15px; color:var(--text-1); font-weight:500; line-height:1.5;">${message}</div>
                </div>
                <div class="modal-foot" style="justify-content: flex-end; gap: 12px; padding: 16px 20px;">
                    <button class="btn btn-ghost" id="btn-cancel-confirm">${cancelText}</button>
                    <button class="btn btn-primary" id="btn-do-confirm" style="${confirmBtnStyle}">${confirmText}</button>
                </div>
            </div>
        `;

        overlay.classList.add('open');
        const box = overlay.querySelector('.modal-box');
        requestAnimationFrame(() => {
            box.style.transform = 'scale(1)';
            box.style.opacity = '1';
        });

        const close = (isConfirmed) => {
            box.style.transform = 'scale(0.9)';
            box.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.remove('open');
                if (isConfirmed && onConfirm) {
                    onConfirm();
                } else if (!isConfirmed && options.onCancel) {
                    options.onCancel();
                }
            }, 200);
        };

        overlay.querySelector('#btn-close-confirm').onclick = () => close(false);
        overlay.querySelector('#btn-cancel-confirm').onclick = () => close(false);
        overlay.querySelector('#btn-do-confirm').onclick = () => close(true);
        overlay.onclick = (e) => { if (e.target === overlay) close(false); };
    }

    /**
     * Generate HTML for Avatar Component
     */
    getAvatarHtml(imageUrl, name, themeColor) {
        if (imageUrl) {
            return `<img src="${imageUrl}" class="avatar-img" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='./assets/VCCC-Logo.png'; this.onerror=null;" />`;
        }
        
        const initials = (name || '?').charAt(0).toUpperCase();
        
        // Use District Theme Color if available
        if (themeColor && themeColor.startsWith('#')) {
            const bg = hexToRgba(themeColor, 0.15);
            return `<div class="avatar-initials" style="background-color: ${bg}; color: ${themeColor}; border: 1.5px solid ${themeColor}; width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;">${initials}</div>`;
        }
        
        // Default: No District / Unassigned (Black Circle Stroke, Light Grey BG, Black Text)
        return `
            <div class="avatar-initials" style="
                width:100%; height:100%; 
                display:flex; align-items:center; justify-content:center; 
                background-color:#f1f5f9; 
                color:#000000; 
                border:1.5px solid #000000; 
                font-size:16px; font-weight:800; 
                border-radius:50%;
            ">${initials}</div>
        `;
    }

    _getToastIcon(type) {
        if (type === 'success') return '<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z"/></svg>';
        if (type === 'error') return '<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M11,15H13V17H11V15M11,7H13V13H11V7M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2Z"/></svg>';
        return '<svg style="width:20px;height:20px" viewBox="0 0 24 24"><path fill="currentColor" d="M11,9H13V11H11V9M11,13H13V17H11V13M12,2C6.47,2 2,6.47 2,12C2,17.53 6.47,22 12,22C17.53,22 22,17.53 22,12C22,6.47 17.53,2 12,2Z"/></svg>';
    }

    _getToastBg(type) {
        if (type === 'success') return '#10b981';
        if (type === 'error') return '#ef4444';
        if (type === 'warning') return '#f59e0b';
        return '#3b82f6';
    }

    /**
     * Progressive Disclosure Utility
     * Smoothly toggles visibility via max-height and opacity (defined in form.css)
     */
    toggleField(fieldContainerId, show) {
        const el = document.getElementById(fieldContainerId);
        if (!el) return;
        if (show) {
            el.classList.remove('field-hidden');
            el.classList.add('field-visible');
        } else {
            el.classList.remove('field-visible');
            el.classList.add('field-hidden');
        }
    }

    /**
     * Smart Action Sheet (What's Next? Wizard)
     * @param {Object} options 
     */
    showActionSheet(options) {
        const { title, subtitle, successMessage, actions } = options;

        let overlay = document.getElementById('global-action-sheet');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'global-action-sheet';
            overlay.className = 'action-sheet-overlay';
            document.body.appendChild(overlay);
        }

        const actionButtonsHtml = actions.map(act => `
            <button class="as-option-btn" data-route="${act.route}" data-state='${JSON.stringify(act.state || {})}'>
                <div class="as-option-icon-wrap ${act.colorClass || 'as-icon-blue'}">
                    ${act.iconSvg}
                </div>
                <div class="as-option-content">
                    <div class="as-option-title">${act.label}</div>
                    <div class="as-option-desc">${act.desc}</div>
                </div>
            </button>
        `).join('');

        overlay.innerHTML = `
            <div class="action-sheet-modal">
                <div class="as-drag-handle"></div>
                ${successMessage ? `
                <div class="as-success-banner">
                    <div class="as-success-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <div class="as-success-text">${successMessage}</div>
                </div>` : ''}
                <div class="as-header">
                    <div class="as-kicker">What's Next?</div>
                    <div class="as-title">${title}</div>
                    <div class="as-subtitle">${subtitle}</div>
                </div>
                <div class="as-options-list">
                    ${actionButtonsHtml}
                </div>
                <button class="as-skip-btn" id="btn-as-skip">Skip for now</button>
            </div>
        `;

        overlay.classList.add('open');

        const close = () => { overlay.classList.remove('open'); };
        overlay.querySelector('#btn-as-skip').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        overlay.querySelectorAll('.as-option-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.preventDefault();
                const route = btn.getAttribute('data-route');
                const state = JSON.parse(btn.getAttribute('data-state'));
                
                close();
                
                if (window.router) {
                    window.router.push(route, state);
                } else {
                    window.location.href = route;
                }
            };
        });
    }

    /**
     * Standardized Wizard: New Pastor Created
     */
    showPastorCreatedWizard(pastor) {
        this.showActionSheet({
            title: pastor.full_name,
            subtitle: "Successfully added to the VCCC records.",
            successMessage: "Pastor Saved!",
            actions: [
                {
                    label: "Deploy to Church",
                    desc: "Assign this pastor to a church or station.",
                    route: "/pastors.html",
                    state: { wizard: 'assign', pastorId: pastor.id },
                    colorClass: "as-icon-red",
                    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>'
                },
                {
                    label: "Set Rank & Status",
                    desc: "Define ministerial rank (e.g. Licenses, Ordained).",
                    route: `/pastor-view.html?id=${pastor.id}`,
                    state: { wizard: 'rank', pastorId: pastor.id },
                    colorClass: "as-icon-orange",
                    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>'
                },
                {
                    label: "View Profile",
                    desc: "Review demographic data and discipleship tree.",
                    route: `/pastor-view.html?id=${pastor.id}`,
                    colorClass: "as-icon-blue",
                    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
                }
            ]
        });
    }

    /**
     * Standardized Wizard: New Church Created
     */
    showChurchCreatedWizard(church) {
        this.showActionSheet({
            title: church.church_name,
            subtitle: "New local church / station registered.",
            successMessage: "Church Created!",
            actions: [
                {
                    label: "Assign Pastor",
                    desc: "Search for a pastor to lead this church.",
                    route: "/pastors.html",
                    state: { wizard: 'assign', churchId: church.id, churchName: church.church_name },
                    colorClass: "as-icon-red",
                    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="23 11 20 14 17 11"/></svg>'
                },
                {
                    label: "View Church",
                    desc: "Manage church stats and membership.",
                    route: `/church-view.html?id=${church.id}`,
                    colorClass: "as-icon-blue",
                    iconSvg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>'
                }
            ]
        });
    }
}

export const ui = new UIManager();
window.__vccc_ui = ui; // Debug access
