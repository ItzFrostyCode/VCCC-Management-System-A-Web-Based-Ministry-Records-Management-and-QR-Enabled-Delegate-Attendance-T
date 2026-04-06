import { requireAuth } from '../../supabase.js';
import { dashboardService } from '../../services/dashboard.service.js';
import { conferenceService } from '../../services/conference.service.js';
import { initLayout } from '../../layout.js';
import { initGuide } from '../../utils/guide.js';
import { DashboardView } from './dashboard.view.js';

class DashboardController {
    constructor() {
        this.pollInterval = null;
        this.isMounted = false;
        this.view = new DashboardView();
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
            this.view.renderKpis(kpis);
        } catch (e) {
            console.error(e);
        }
    }

    async loadChurchStatus() {
        try {
            const data = await dashboardService.getChurchStatus();
            this.view.renderChurchStatus(data);
        } catch (e) {
            this.view.renderNetworkError('church-panel', 'Error loading churches.');
        }
    }

    async loadPastorDeployment() {
        try {
            const data = await dashboardService.getPastorDeployment();
            this.view.renderPastorDeployment(data);
        } catch (e) {
            this.view.renderNetworkError('pastor-panel', 'Error loading pastors.');
        }
    }

    async loadConferenceLive() {
        try {
            const data = await dashboardService.getConferenceLive();
            this.view.renderConferenceLive(data);
        } catch(e) {
            this.view.renderNetworkError('cal-live-panel', 'Error loading config.');
        }
    }

    async loadScanFeed() {
        try {
            const data = await dashboardService.getScanFeed();
            this.view.renderScanFeed(data, this.formatTimeOnly.bind(this));
        } catch(e) {
            this.view.renderNetworkError('scan-panel', 'Feed error.');
        }
    }

    async loadAlerts() {
        try {
            const alerts = await dashboardService.getAlerts();
            this.view.renderAlerts(alerts, this.formatDateTimeRelative.bind(this));
        } catch (e) {
            this.view.renderNetworkError('alerts-panel', 'Error loading alerts.');
        }
    }

    async loadUserActivity() {
        try {
            const acts = await dashboardService.getUserActivity();
            this.view.renderUserActivity(acts, this.formatDateTimeRelative.bind(this));
        } catch(e) {
            this.view.renderNetworkError('activity-panel', 'Error loading logs.');
        }
    }

    async renderCalendar() {
        try {
            const today = new Date();
            const confs = await conferenceService.fetchAll();
            this.view.renderCalendarWidget(today, confs);
        } catch (e) {
            this.view.renderNetworkError('calendar-widget', 'Error loading calendar.');
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
        const diff = Math.max(0, Math.floor((now - d) / 1000));
        
        if (diff < 10) return 'Just now';
        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
        if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
        return d.toLocaleDateString();
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
