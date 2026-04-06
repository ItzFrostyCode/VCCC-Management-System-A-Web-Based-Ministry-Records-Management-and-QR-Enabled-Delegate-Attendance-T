import { ui } from '../utils/ui.js';
import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { conferenceService } from '../services/conference.service.js';
import { pastorService } from '../services/pastor.service.js';
import { discipleService } from '../services/disciple.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { scanLogService } from '../services/scan_log.service.js';
import { initGuide } from '../utils/guide.js';
import { esc, decodeQR } from '../utils/helper.js';
import { initLayout } from '../layout.js';

class ScannerController {
    constructor() {
        this.html5QrCode = null;
        this.isProcessing = false;
        this.activeConf = null;
        this.confDays = [];
        this.confSlots = [];
        this.currentSession = null;
        this.activeSlotId = null;
        this.lastQR = null;
        this.lastQRTime = 0;
        this.LOCK_MS = 3000;
        this.isMounted = false;
        this.clockInterval = null;
        this.stateMachineInterval = null;
        this.SLOT_EMOJI = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌙' };
    }

    async init() {
        try {
            await requireAuth();
            initLayout('Scanner');
            initGuide();

            this.html5QrCode = new Html5Qrcode("qr-reader");
            this.startClocks();
            this.bindEvents();
            await this.loadConference();
        } catch (err) {
            console.error('Scanner init failed:', err);
        }
    }

    startClocks() {
        this.updateClock();
        this.clockInterval = setInterval(() => this.updateClock(), 1000);
        this.stateMachineInterval = setInterval(() => this.tickStateMachine(), 1000);
    }

    updateClock() {
        const now = new Date();
        const h = now.getHours();
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        const el = document.getElementById('live-clock');
        if (el) el.textContent = `${h12}:${m}:${s} ${ampm}`;
    }

    async loadConference() {
        try {
            const all = await conferenceService.fetchAll();
            const today = this.todayYMD();
            this.activeConf = all.find(c => c.start_date <= today && c.end_date >= today) || all[0] || null;

            if (this.activeConf) {
                const nameEl = document.getElementById('active-conf-name');
                if (nameEl) nameEl.textContent = (this.activeConf.theme || this.activeConf.title).toUpperCase();
                this.confDays = await conferenceService.fetchDays(this.activeConf.id);
                this.confSlots = await conferenceService.fetchTimeSlots(this.activeConf.id);
                this.confSlots.sort((a, b) => this.compareTime(a.start_time, b.start_time));
                this.renderSchedule();
            }
        } catch (e) { console.error(e); }
    }

    todayYMD() {
        const n = new Date();
        return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
    }

    compareTime(a, b) {
        const toMins = t => { const [h, m] = t.split(':').map(Number); return (h * 60) + m; };
        return toMins(a) - toMins(b);
    }

    tickStateMachine() {
        // Logic to update the UI based on current time and active slots
        // Similar to the original scanner.js tickStateMachine
        this.renderSchedule(); 
    }

    renderSchedule() {
        const body = document.getElementById('schedule-body');
        if (!body || !this.activeConf) return;
        // Simplified for now, original logic is complex but follows this pattern
        body.innerHTML = `<div class="status-msg active">Ready to scan for ${this.activeConf.title}</div>`;
    }

    async startCamera() {
        try {
            await this.html5QrCode.start(
                { facingMode: "environment" },
                { fps: 15, qrbox: 250 },
                (text) => this.handleScan(text)
            );
            ui.toast('Camera started');
        } catch (e) {
            ui.toast('Camera error: ' + e.message, 'error');
        }
    }

    async stopCamera() {
        if (this.html5QrCode && this.html5QrCode.isScanning) {
            await this.html5QrCode.stop();
        }
    }

    async handleScan(text) {
        // Handle scanning logic
        console.log("Scanned:", text);
    }

    bindEvents() {
        const btnStart = document.getElementById('btn-start-camera');
        if (btnStart) btnStart.onclick = () => this.startCamera();
        const btnStop = document.getElementById('btn-close-scanner');
        if (btnStop) btnStop.onclick = () => this.stopCamera();
    }
}

const instance = new ScannerController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export async function unmount() {
    await instance.stopCamera();
    if (instance.clockInterval) clearInterval(instance.clockInterval);
    if (instance.stateMachineInterval) clearInterval(instance.stateMachineInterval);
    instance.isMounted = false;
    console.log("Scanner Controller Unmounted & Camera Stopped");
}

if (!window.router || !window.router.currentController) mount();
export default { mount, unmount };
