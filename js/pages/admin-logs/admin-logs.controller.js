import { db, requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { initGuide } from '../utils/guide.js';
import { esc } from '../utils/helper.js';
import { exportAuditLogs } from '../utils/export/admin_logs/export-logs.js';
import { initLayout } from '../layout.js';

class AdminLogsController {
    constructor() {
        this.allLogs = [];
        this.currentPage = 1;
        this.ITEMS_PER_PAGE = 10;
        this.isMounted = false;
    }

    async init() {
        try {
            const user = await requireAuth();
            if (user && user.role !== 'Admin') {
                window.router.push('index.html');
                return;
            }

            initLayout('Activity Logs');
            initGuide();
            this.initEventListeners();
            await this.loadLogs();
        } catch (err) {
            console.error('Logs controller init failed:', err);
        }
    }

    initEventListeners() {
        const btnRefresh = document.getElementById('btn-refresh');
        if (btnRefresh) btnRefresh.onclick = () => this.loadLogs();
        const btnPrev = document.getElementById('btn-prev');
        if (btnPrev) btnPrev.onclick = () => this.prevPage();
        const btnNext = document.getElementById('btn-next');
        if (btnNext) btnNext.onclick = () => this.nextPage();
        const btnExport = document.getElementById('btn-export-logs');
        if (btnExport) btnExport.onclick = () => this.handleExportLogs();
    }

    async handleExportLogs() {
        if (!this.allLogs.length) {
            alert('No logs to export. Please load logs first.');
            return;
        }
        const mapped = this.allLogs.map(log => ({
            actor: log.full_name || 'System',
            action: log.action || '—',
            details: log.details || '—',
            time: log.timestamp
        }));
        await exportAuditLogs(mapped);
    }

    async loadLogs() {
        const body = document.getElementById('table-body');
        if (body) body.innerHTML = '<div class="empty-state">Fetching logs...</div>';
        try {
            const { data, error } = await db.rpc('get_audit_logs_v3');
            if (error) throw error;
            this.allLogs = data || [];
            this.renderTable();
        } catch (err) {
            console.error(err);
            if (body) body.innerHTML = `<div class="empty-state" style="color:var(--red)">Failed to load logs: ${err.message}</div>`;
        }
    }

    renderTable() {
        const body = document.getElementById('table-body');
        const countLabel = document.getElementById('count-label');
        if (countLabel) countLabel.textContent = `${this.allLogs.length} logs`;

        if (!this.allLogs.length) {
            if (body) body.innerHTML = '<div class="empty-state">No activity logs found.</div>';
            const pagination = document.getElementById('pagination');
            if (pagination) pagination.style.display = 'none';
            return;
        }

        const totalPages = Math.ceil(this.allLogs.length / this.ITEMS_PER_PAGE);
        if (this.currentPage > totalPages) this.currentPage = totalPages;

        const startIndex = (this.currentPage - 1) * this.ITEMS_PER_PAGE;
        const endIndex = startIndex + this.ITEMS_PER_PAGE;
        const paginatedItems = this.allLogs.slice(startIndex, endIndex);

        if (body) {
            body.innerHTML = paginatedItems.map(log => {
                const action = (log.action || '').toLowerCase();
                const actionClass = action.includes('login') ? 'pill-login' : action.includes('logout') ? 'pill-logout' : 'pill-gray';
                let details = log.details || '—';
                if (details.includes('Mozilla/') && details.includes('AppleWebKit')) {
                    details = 'Browser session';
                }
                return `
                    <div class="data-table-row cols-logs">
                        <div class="log-time" data-label="Time">
                            ${new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            <span style="block; opacity:0.6; font-size:10px;">${new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div class="log-user" data-label="User">
                            <span class="log-user-name">${esc(log.full_name || 'System')}</span>
                            <span class="log-user-role">${log.role || ''}</span>
                        </div>
                        <div class="log-action" data-label="Action">
                            <span class="pill ${actionClass}">${log.action}</span>
                        </div>
                        <div class="log-details" data-label="Details" title="${esc(log.details)}">${esc(details)}</div>
                        <div class="log-device" data-label="Device" title="${esc(log.device_info)}">${esc(log.device_info || 'Unknown')}</div>
                    </div>
                `;
            }).join('');
        }

        const pagination = document.getElementById('pagination');
        if (pagination) pagination.style.display = 'flex';
        const pageInfo = document.getElementById('page-info');
        if (pageInfo) pageInfo.textContent = `Showing ${startIndex + 1}-${Math.min(endIndex, this.allLogs.length)} of ${this.allLogs.length}`;
        
        const btnPrev = document.getElementById('btn-prev');
        const btnNext = document.getElementById('btn-next');
        if (btnPrev) btnPrev.disabled = (this.currentPage === 1);
        if (btnNext) btnNext.disabled = (this.currentPage === totalPages);
    }

    prevPage() { if (this.currentPage > 1) { this.currentPage--; this.renderTable(); } }
    nextPage() { if (this.currentPage < Math.ceil(this.allLogs.length/this.ITEMS_PER_PAGE)) { this.currentPage++; this.renderTable(); } }
}

const instance = new AdminLogsController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    instance.isMounted = false;
    console.log("Admin Logs Controller Unmounted");
}

if (!window.router || !window.router.currentController) mount();
export default { mount, unmount };
