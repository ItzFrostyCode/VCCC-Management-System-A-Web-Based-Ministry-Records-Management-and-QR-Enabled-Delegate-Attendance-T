import { requireAuth } from '../supabase.js';
import { dashboardService } from '../services/dashboard.service.js';
import { conferenceService } from '../services/conference.service.js';
import { initLayout } from '../layout.js';
import { initGuide } from '../utils/guide.js';

class DashboardController {
    constructor() {
        this.pollInterval = null;
        this.isMounted = false;
    }

    async init() {
        try {
            const user = await requireAuth();
            if (!user) return;

            initLayout('Dashboard');
            initGuide();

            await this.loadDashboardAll();
            
            // Polling every 10 seconds
            this.pollInterval = setInterval(() => this.loadDashboardAll(), 10000);
        } catch (err) {
            console.error("Dashboard init failed:", err);
        }
    }

    async loadDashboardAll() {
        try {
            await Promise.all([
                this.loadKpis(),
                this.loadChurchStatus(),
                this.loadPastorDeployment(),
                this.loadConferenceLive(),
                this.loadScanFeed(),
                this.loadAlerts(),
                this.loadUserActivity(),
                this.renderCalendar()
            ]);
        } catch (err) {
            console.error("Dashboard Load Error: ", err);
        }
    }

    async loadKpis() {
        try {
            const kpis = await dashboardService.getKpis();
            const c = document.getElementById('kpi-container');
            if (!c) return;
            
            c.innerHTML = `
                <div class="kpi-card">
                    <div class="kpi-icon si-red"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><polyline points="9 9 9 9"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.districts}</div><div class="kpi-label">Districts</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-blue"><svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.churches}</div><div class="kpi-label">Churches</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-purple"><svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.pastors}</div><div class="kpi-label">Active Pastors</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-green"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.disciples}</div><div class="kpi-label">Total Disciples</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-purple"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.activeAssignments}</div><div class="kpi-label">Active Assignments</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-blue"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.conferences}</div><div class="kpi-label">Total Conferences</div></div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-icon si-green"><svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.todayAttendance}</div><div class="kpi-label">Today Attendance</div></div>
                </div>
                <div class="kpi-card" style="${kpis.scanErrors > 0 ? 'border-color:var(--red); box-shadow:0 0 0 2px var(--red-light);' : ''}">
                    <div class="kpi-icon si-red"><svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
                    <div class="kpi-info"><div class="kpi-val">${kpis.scanErrors}</div><div class="kpi-label" style="color:${kpis.scanErrors>0 ? 'var(--red)' : ''}">Scan Errors (Today)</div></div>
                </div>
            `;
        } catch (e) {
            console.error(e);
        }
    }

    // ... (rest of the methods: loadChurchStatus, loadPastorDeployment, etc.)
    // For brevity, I'll assume they are copied from dashboard.js but with 'this.' prepended where necessary.
    // I'll include them in the final file.

    async loadChurchStatus() {
        const tbody = document.getElementById('church-panel');
        if (!tbody) return;
        try {
            const data = await dashboardService.getChurchStatus();
            if (!data.length) {
                tbody.innerHTML = `<tr><td colspan="4" class="center text-3">No churches found.</td></tr>`;
                return;
            }
            tbody.innerHTML = data.slice(0, 7).map(c => `
                <tr>
                    <td class="col-church" style="font-weight:600;">${c.name}</td>
                    <td class="col-dist"><span class="dist-color-dot" style="background:${c.color}"></span>${c.district}</td>
                    <td class="col-pastor">${c.pastor}</td>
                    <td class="col-status"><span class="status-badge ${c.statusCode === 'active' ? 'status-active' : 'status-critical'}">${c.status}</span></td>
                </tr>
            `).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="4" class="center text-3">Error loading churches.</td></tr>`;
        }
    }

    async loadPastorDeployment() {
        const tbody = document.getElementById('pastor-panel');
        if (!tbody) return;
        try {
            const data = await dashboardService.getPastorDeployment();
            if (!data.length) {
                tbody.innerHTML = `<tr><td colspan="3" class="center text-3">No pastors found.</td></tr>`;
                return;
            }
            data.sort((a,b) => {
                if (a.status === 'undeployed' && b.status !== 'undeployed') return -1;
                if (b.status === 'undeployed' && a.status !== 'undeployed') return 1;
                return 0;
            });
            tbody.innerHTML = data.slice(0, 7).map(p => {
                let badgeCls = 'status-neutral';
                let statusFormat = p.status.toUpperCase();
                if (p.status === 'active') badgeCls = 'status-active';
                else if (p.status === 'undeployed') badgeCls = 'status-critical';
                else if (p.status === 'transferred') badgeCls = 'status-warning';
                return `
                <tr>
                    <td class="col-pastor" style="font-weight:600;">${p.name}</td>
                    <td class="col-church">${p.church}</td>
                    <td class="col-status"><span class="status-badge ${badgeCls}">${statusFormat}</span></td>
                </tr>
            `}).join('');
        } catch (e) {
            tbody.innerHTML = `<tr><td colspan="3" class="center text-3">Error loading pastors.</td></tr>`;
        }
    }

    async loadConferenceLive() {
        const el = document.getElementById('cal-live-panel');
        if (!el) return;
        try {
            const data = await dashboardService.getConferenceLive();
            if (!data) {
                el.innerHTML = `<div class="empty-state"><div class="empty-desc">No active conference found.</div></div>`;
                return;
            }
            let statsHTML = `<div style="margin-bottom: 12px; font-weight:600; font-size:15px; color:var(--red); display:flex; align-items:center; gap:8px;">
                <svg viewBox="0 0 24 24" style="width:18px;height:18px;stroke:currentColor;fill:none;stroke-width:2;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                ACTIVE: ${data.title}
            </div>`;
            if (Object.keys(data.slots).length === 0) {
                statsHTML += `<div class="text-3">No slots configured.</div>`;
            } else {
                statsHTML += `<div style="display:flex; flex-direction:column; gap:8px;">`;
                for (const [slot, count] of Object.entries(data.slots)) {
                    statsHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-input); padding:10px 14px; border-radius:8px;">
                            <span style="font-weight:600; font-size:13px; color:var(--text-2);">${slot}</span>
                            <span style="font-weight:700; font-size:16px;">${count} <span style="font-weight:400; font-size:12px; color:var(--text-3);">scans</span></span>
                        </div>
                    `;
                }
                statsHTML += `</div>`;
            }
            el.innerHTML = statsHTML;
        } catch(e) {
            el.innerHTML = `<div class="text-3 center">Error loading config.</div>`;
        }
    }

    async loadScanFeed() {
        const el = document.getElementById('scan-panel');
        if (!el) return;
        try {
            const data = await dashboardService.getScanFeed();
            if (!data.length) {
                el.innerHTML = `<div class="empty-state"><div class="empty-desc">No scans recorded yet.</div></div>`;
                return;
            }
            el.innerHTML = data.map(s => {
                const isSuccess = s.status === 'SUCCESS';
                const statusWrap = isSuccess ? 
                    `<span class="scan-status-ok"><span class="scan-status-icon"><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></span> ${s.status}</span>` :
                    `<span class="scan-status-err"><span class="scan-status-icon"><svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></span> ${s.status}</span>`;
                return `
                <div class="dash-list-row scan-feed-item">
                    <div class="scan-feed-header">
                        <div class="scan-time">[${this.formatTimeOnly(s.timestamp)}]</div>
                        ${statusWrap}
                    </div>
                    <div class="scan-delegate">${s.delegate_name || 'Unknown Delegate'} ${s.delegate_role ? `(${s.delegate_role})` : ''}</div>
                </div>
            `}).join('');
        } catch(e) {
            el.innerHTML = `<div class="text-3 center">Feed error.</div>`;
        }
    }

    async loadAlerts() {
        const el = document.getElementById('alerts-panel');
        if (!el) return;
        try {
            const alerts = await dashboardService.getAlerts();
            if (!alerts.length) {
                el.innerHTML = `<div class="empty-state"><svg viewBox="0 0 24 24" style="width:40px;height:40px;stroke:#4ade80;fill:none;stroke-width:2;"><polyline points="20 6 9 17 4 12"/></svg><div class="text-2 mt-8">System Healthy. No alerts.</div></div>`;
                return;
            }
            const iconMap = {
                scan_error: '<svg viewBox="0 0 24 24"><polyline points="3 7 12 18 21 7"/></svg>',
                no_pastor: '<svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="15" y2="22"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>',
                undeployed_pastor: '<svg viewBox="0 0 24 24"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="19" y1="18" x2="19.01" y2="18"/></svg>'
            };
            el.innerHTML = alerts.map(a => `
                <div class="alert-item">
                    <div class="alert-icon">${iconMap[a.type] || iconMap.scan_error}</div>
                    <div>
                        <div class="alert-content">${a.message}</div>
                        <div class="alert-time">${this.formatDateTimeRelative(a.time)}</div>
                    </div>
                </div>
            `).join('');
        } catch (e) {
            el.innerHTML = `<div class="text-3 center">Error loading alerts.</div>`;
        }
    }

    async loadUserActivity() {
        const el = document.getElementById('activity-panel');
        if (!el) return;
        try {
            const acts = await dashboardService.getUserActivity();
            if (!acts.length) {
                el.innerHTML = `<div class="empty-state"><div class="empty-desc">No recent activity.</div></div>`;
                return;
            }
            el.innerHTML = acts.map(a => `
                <div class="dash-list-row activity-item">
                    <div class="activity-dot"></div>
                    <div>
                        <div class="activity-text"><span class="activity-actor">${a.actor}</span>: ${a.details || a.action}</div>
                        <div class="activity-time">${this.formatDateTimeRelative(a.time)}</div>
                    </div>
                </div>
            `).join('');
        } catch(e) {
            el.innerHTML = `<div class="text-3 center">Error loading logs.</div>`;
        }
    }

    async renderCalendar() {
        const el = document.getElementById('calendar-widget');
        if (!el) return;
        try {
            const today = new Date();
            const currentYear = today.getFullYear();
            const currentMonth = today.getMonth();
            const confs = await conferenceService.fetchAll();
            const isConferenceDate = (dateObj) => {
                const time = dateObj.getTime();
                return confs.some(c => {
                    if (!c.start_date || !c.end_date) return false;
                    const start = new Date(c.start_date).getTime();
                    const end   = new Date(c.end_date).getTime();
                    return time >= start && time <= end;
                });
            };
            const firstDay    = new Date(currentYear, currentMonth, 1).getDay();
            const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
            const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
            let html = `<div class="cal-header"><div class="cal-month">${monthNames[currentMonth]} ${currentYear}</div></div><div class="cal-grid">
                <div class="cal-day-name">S</div><div class="cal-day-name">M</div><div class="cal-day-name">T</div>
                <div class="cal-day-name">W</div><div class="cal-day-name">T</div><div class="cal-day-name">F</div><div class="cal-day-name">S</div>`;
            for (let i = 0; i < firstDay; i++) { html += `<div class="cal-day empty"></div>`; }
            for (let d = 1; d <= daysInMonth; d++) {
                const cellDate = new Date(currentYear, currentMonth, d);
                const isToday  = d === today.getDate() ? 'today' : '';
                const isConf   = isConferenceDate(cellDate) ? 'conference' : '';
                html += `<div class="cal-day ${isToday} ${isConf}">${d}</div>`;
            }
            html += `</div>`;
            el.innerHTML = html;
        } catch (e) {
            el.innerHTML = `<div class="text-3 center">Error loading calendar.</div>`;
        }
    }

    formatTimeOnly(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    formatDateTimeRelative(isoStr) {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        const now = new Date();
        const diffSec = Math.floor((now - d) / 1000);
        if (diffSec < 60) return `Just now`;
        if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
        if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
        return `${Math.floor(diffSec / 86400)}d ago`;
    }
}

const instance = new DashboardController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    if (instance.pollInterval) clearInterval(instance.pollInterval);
    instance.isMounted = false;
    console.log("Dashboard Controller Unmounted");
}

if (!window.router || !window.router.currentController) mount();
export default { mount, unmount };
