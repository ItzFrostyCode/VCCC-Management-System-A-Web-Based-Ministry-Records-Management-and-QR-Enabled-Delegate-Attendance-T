import { ui } from '../utils/ui.js';
import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { pastorService } from '../services/pastor.service.js';
import { discipleService } from '../services/disciple.service.js';
import { conferenceService } from '../services/conference.service.js';
import { mealService } from '../services/meal.service.js';
import { attendanceService } from '../services/attendance.service.js';
import { initGuide } from '../utils/guide.js';
import { esc, formatDate } from '../utils/helper.js';
import { exportConferences } from '../utils/export/conferences/export-conference.js';
import { initLayout } from '../layout.js';

class ConferencesController {
    constructor() {
        this.allConfs = [];
        this.daysMap = {};
        this.slotsMap = {};
        this.mealMap = {};
        this.editingConfId = null;
        this.deletingConfId = null;
        this.managingConfId = null;

        // Reporting state
        this.allDelegates = [];
        this.rawAttendance = [];
        this.conferenceDays = [];
        this.globalReportData = [];
        this.currentConference = null;
        this.currentMeals = [];
        this.currentTimeSlots = [];
        this.currentRoleFilter = 'ALL';
        this.refreshInterval = null;
        this.currentFetchId = 0;

        this.isMounted = false;
    }

    async init() {
        try {
            await requireAuth();
            initLayout('Conferences');
            initGuide();

            await this.initDelegateData();
            await this.reloadData();
            this.bindEvents();
        } catch (e) {
            console.error('Conferences init failed:', e);
            ui.toast('Failed to load conferences', 'error');
        }
    }

    async initDelegateData() {
        try {
            const [pastors, disciples] = await Promise.all([
                pastorService.fetchAll(),
                discipleService.fetchAll()
            ]);
            this.allDelegates = [];
            pastors.forEach(p => {
                this.allDelegates.push({
                    id: p.id, fullName: p.full_name, role: 'PASTOR', church: p.church_name || '', district: p.district_name || '', attendanceKey: `PASTOR_${p.id}`
                });
                if (p.wife_name && p.wife_name.trim()) {
                    this.allDelegates.push({
                        id: p.id, fullName: p.wife_name, role: 'WIFE', church: p.church_name || '', district: p.district_name || '', attendanceKey: `WIFE_${p.id}`
                    });
                }
            });
            disciples.forEach(d => {
                this.allDelegates.push({
                    id: d.id, fullName: d.full_name, role: 'DISCIPLE', church: d.church_name || '', district: d.district_name || '', attendanceKey: `DISCIPLE_${d.id}`
                });
            });
        } catch (err) { console.error('Failed to load delegates:', err); }
    }

    async reloadData() {
        this.allConfs = await conferenceService.fetchAll();
        const confIds = this.allConfs.map(c => c.id);

        if (confIds.length === 0) {
            this.renderList();
            return;
        }

        const [allDays, allSlots, allMeals] = await Promise.all([
            conferenceService.fetchDaysBulk(confIds),
            conferenceService.fetchTimeSlotsBulk(confIds),
            mealService.fetchByConferenceBulk(confIds)
        ]);

        this.daysMap = {};
        this.slotsMap = {};
        this.mealMap = {};

        confIds.forEach(id => {
            this.daysMap[id] = [];
            this.slotsMap[id] = [];
            this.mealMap[id] = [];
        });

        allDays.forEach(d => { if (this.daysMap[d.conference_id]) this.daysMap[d.conference_id].push(d); });
        allSlots.forEach(s => { if (this.slotsMap[s.conference_id]) this.slotsMap[s.conference_id].push(s); });
        allMeals.forEach(m => { if (this.mealMap[m.conference_id]) this.mealMap[m.conference_id].push(m); });

        this.renderList();
    }

    renderList() {
        const el = document.getElementById('conf-list');
        if (!el) return;

        if (!this.allConfs.length) {
            el.innerHTML = `<div class="empty-state"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg><div class="empty-title">No conferences yet</div><div class="empty-desc">Create a conference to begin managing days and scanner tracking</div></div>`;
            return;
        }

        el.innerHTML = this.allConfs.map(c => {
            return `
            <div class="conf-card" data-id="${c.id}" data-title="${esc(c.title)}">
              <div class="conf-head">
                <div class="conf-info">
                  <div class="conf-title">${c.theme ? esc(c.theme) : esc(c.title)}</div>
                  <div class="conf-meta">
                    ${c.location ? esc(c.location) + ' &middot; ' : ''}
                    ${formatDate(c.start_date)} – ${formatDate(c.end_date)}
                  </div>
                </div>
                <div class="btn-action-group" style="display:flex; gap:8px; align-items:center;">
                  <button class="btn btn-ghost btn-report-action" title="View Report" style="height:32px; padding: 0 10px; border:1px solid var(--border);">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>
                    Report
                  </button>
                  <a href="/scanner.html?confId=${c.id}" class="btn btn-primary" style="height:32px; padding: 0 12px;">
                    <svg viewBox="0 0 24 24" width="16" height="16"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></svg>
                    Scan
                  </a>
                  ${(authService.getCurrentUser()?.role !== 'Staff') ? `
                  <button class="btn-icon btn-edit btn-edit-action" title="Edit">
                    <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button class="btn-icon btn-delete btn-delete-action" title="Delete">
                    <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                  </button>
                  ` : ''}
                </div>
              </div>
            </div>`;
        }).join('');

        el.querySelectorAll('.conf-card').forEach(card => {
            const id = card.dataset.id;
            const title = card.dataset.title;
            card.querySelector('.btn-report-action').onclick = () => this.openReport(id);
            const editBtn = card.querySelector('.btn-edit-action');
            if (editBtn) editBtn.onclick = () => this.openEditConf(id);
            const delBtn = card.querySelector('.btn-delete-action');
            if (delBtn) delBtn.onclick = () => this.openDeleteConf(id, title);
        });
    }

    openCreateConf() {
        this.editingConfId = null;
        document.getElementById('modal-title').textContent = 'New Conference';
        document.getElementById('conf-id').value = '';
        document.getElementById('conf-theme').value = '';
        document.getElementById('conf-location').value = '';
        document.getElementById('conf-start').value = '';
        document.getElementById('conf-end').value = '';
        document.getElementById('modal-conf').classList.add('open');
        document.getElementById('conf-start').focus();
    }

    openEditConf(id) {
        const c = this.allConfs.find(x => String(x.id) === String(id));
        if (!c) return;
        this.editingConfId = id;
        document.getElementById('modal-title').textContent = 'Edit Conference';
        document.getElementById('conf-id').value = id;
        document.getElementById('conf-theme').value = c.theme || '';
        document.getElementById('conf-location').value = c.location || '';
        document.getElementById('conf-start').value = c.start_date || '';
        document.getElementById('conf-end').value = c.end_date || '';
        document.getElementById('modal-conf').classList.add('open');
    }

    // Modal Helpers
    closeConfModal() { document.getElementById('modal-conf')?.classList.remove('open'); document.getElementById('conf-slot-preview')?.classList.add('hidden'); }
    closeDeleteModal() { document.getElementById('modal-delete')?.classList.remove('open'); }
    closeGridModal() { document.getElementById('modal-grid')?.classList.remove('open'); }

    async saveConf() {
        const theme = document.getElementById('conf-theme').value.trim();
        const location = document.getElementById('conf-location').value.trim();
        const start = document.getElementById('conf-start').value;
        const end = document.getElementById('conf-end').value;

        if (!start || !end) { ui.toast('Start and End dates are required', 'warning'); return; }

        const title = `Conference (${formatDate(start)})`;
        const d1 = new Date(start); const d2 = new Date(end);
        if (d1 > d2) { ui.toast('End date must be after start date', 'warning'); return; }
        if ((d2 - d1) / (1000 * 60 * 60 * 24) > 31) { ui.toast('Max 31 days allowed', 'warning'); return; }

        const btn = document.getElementById('btn-conf-save');
        btn.disabled = true; btn.textContent = 'Saving...';

        try {
            const slotsMap = {};
            if (!this.editingConfId && start && end) {
                const dates = conferenceService.getDaysBetween(start, end);
                dates.forEach((_, idx) => {
                    ['MORNING', 'AFTERNOON', 'EVENING'].forEach(slot => {
                        const cb = document.getElementById(`slot-cb-${idx + 1}-${slot}`);
                        if (cb) slotsMap[`day-${idx + 1}-${slot}`] = cb.checked;
                    });
                });
            }

            if (this.editingConfId) {
                await conferenceService.update(this.editingConfId, title, theme, location, start, end);
            } else {
                await conferenceService.create(title, theme, location, start, end, slotsMap);
            }

            this.closeConfModal();
            await this.reloadData();
            ui.toast('Conference saved successfully');
        } catch (e) {
            ui.toast('Error: ' + e.message, 'error');
        } finally {
            btn.disabled = false; btn.textContent = 'Save Conference';
        }
    }

    calculateDays() {
        const start = document.getElementById('conf-start').value;
        const end = document.getElementById('conf-end').value;
        const preview = document.getElementById('conf-slot-preview');
        const body = document.getElementById('preview-grid-body');

        if (!start || !end || !body || !preview) return;
        const d1 = new Date(start); const d2 = new Date(end);
        if (d1 > d2) { preview.classList.add('hidden'); return; }

        const dates = conferenceService.getDaysBetween(start, end);
        if (dates.length > 31) {
            body.innerHTML = `<div style="color:var(--red); font-size:12px; font-weight:600;">Maximum 31 days allowed.</div>`;
            preview.classList.remove('hidden');
            return;
        }

        preview.classList.remove('hidden');
        let html = `<div style="display:grid; grid-template-columns: 80px 1fr 1fr 1fr; gap:10px; font-size:10px; font-weight:800; text-transform:uppercase; color:var(--text-3); padding-bottom:5px; border-bottom:1px solid var(--border);"><div>Day</div><div>Morning</div><div>Afternoon</div><div>Evening</div></div>`;
        dates.forEach((dateStr, idx) => {
            const dayNum = idx + 1;
            html += `<div style="display:grid; grid-template-columns: 80px 1fr 1fr 1fr; gap:10px; align-items:center; padding:8px 0; border-bottom:1px dotted var(--border);"><div style="font-size:11px; font-weight:700; color:var(--text-2);">Day ${dayNum}</div><div style="display:flex; align-items:center; justify-content:center;"><input type="checkbox" id="slot-cb-${dayNum}-MORNING" checked style="-webkit-appearance:checkbox; appearance:checkbox; width:18px; height:18px; cursor:pointer; accent-color:var(--red);" /></div><div style="display:flex; align-items:center; justify-content:center;"><input type="checkbox" id="slot-cb-${dayNum}-AFTERNOON" checked style="-webkit-appearance:checkbox; appearance:checkbox; width:18px; height:18px; cursor:pointer; accent-color:var(--red);" /></div><div style="display:flex; align-items:center; justify-content:center;"><input type="checkbox" id="slot-cb-${dayNum}-EVENING" checked style="-webkit-appearance:checkbox; appearance:checkbox; width:18px; height:18px; cursor:pointer; accent-color:var(--red);" /></div></div>`;
        });
        body.innerHTML = html + `<p style="font-size:11px; color:var(--text-3); margin-top:12px;">Attendance slots are checked by default. Uncheck any slot you wish to skip.</p>`;
    }

    async openDeleteConf(id, title) {
        this.deletingConfId = id;
        const msgEl = document.getElementById('delete-msg');
        const confirmBtn = document.getElementById('btn-delete-confirm');
        if (!msgEl || !confirmBtn) return;

        msgEl.innerHTML = `<div style="text-align:center;padding:10px;"><div class="skeleton" style="height:20px;width:80%;margin:0 auto 10px;"></div><div class="skeleton" style="height:15px;width:60%;margin:0 auto;"></div></div>`;
        confirmBtn.disabled = true;
        document.getElementById('modal-delete').classList.add('open');

        try {
            const dataCount = await attendanceService.countByConference(id);
            if (dataCount > 0) {
                msgEl.innerHTML = `<div style="background:rgba(226,75,74,0.1); padding:20px; border-radius:12px; border:2px solid var(--red-light); margin-bottom:12px; text-align:center;"><div style="color:var(--red); margin-bottom:10px; display:flex; justify-content:center;"><svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div><div style="font-size:16px; font-weight:800; color:var(--red); margin-bottom:6px;">Protected Conference</div><p style="font-size:13px; font-weight:600; line-height:1.4; color:var(--text-2);">This conference has <strong>${dataCount} scans</strong>. Deleting it will permanently erase all attendance records.</p></div>`;
                confirmBtn.textContent = 'Force Delete (DANGER)';
                confirmBtn.className = 'btn btn-danger btn-lg';
                confirmBtn.disabled = false;
                confirmBtn.onclick = () => this.forceDeleteConf();
            } else {
                msgEl.innerHTML = `<div style="text-align:center; padding:10px;"><div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:12px;">Remove "${esc(title)}"?</div><p style="font-size:14px; color:var(--text-2); line-height:1.5;">This action cannot be undone.</p></div>`;
                confirmBtn.textContent = 'Yes, Remove';
                confirmBtn.className = 'btn btn-danger btn-lg';
                confirmBtn.classList.remove('hidden');
                confirmBtn.disabled = false;
                confirmBtn.onclick = () => this.deleteConf();
            }
        } catch (e) { msgEl.innerHTML = `<p style="color:var(--red);font-weight:700;">Error: ${e.message}</p>`; }
    }

    async deleteConf() {
        const btn = document.getElementById('btn-delete-confirm');
        btn.disabled = true; btn.textContent = 'Removing...';
        try {
            await conferenceService.remove(this.deletingConfId);
            this.closeDeleteModal();
            await this.reloadData();
            ui.toast('Conference removed');
        } catch (e) { ui.toast('Error: ' + e.message, 'error'); btn.disabled = false; btn.textContent = 'Yes, Remove'; }
    }

    async forceDeleteConf() {
        ui.confirm('EXTREME WARNING: This will PERMANENTLY delete all attendance records and scans for this conference. Are you absolutely sure?', async () => {
            const btn = document.getElementById('btn-delete-confirm');
            btn.disabled = true; btn.textContent = 'Force Removing...';
            try {
                await conferenceService.forceRemove(this.deletingConfId);
                this.closeDeleteModal();
                await this.reloadData();
                ui.toast('Conference and all scans erased');
            } catch (e) { 
                ui.toast('Error: ' + e.message, 'error');
                btn.disabled = false;
                btn.textContent = 'Force Delete (DANGER)'; 
            }
        }, { title: 'DANGER: Force Delete', confirmText: 'ERASE EVERYTHING' });
    }

    bindEvents() {
        const isStaff = authService.getCurrentUser()?.role === 'Staff';
        const btnAdd = document.getElementById('btn-add');
        if (isStaff && btnAdd) btnAdd.style.display = 'none';
        if (btnAdd) btnAdd.onclick = () => this.openCreateConf();

        document.getElementById('btn-conf-save').onclick = () => this.saveConf();
        document.getElementById('conf-start').onchange = () => this.calculateDays();
        document.getElementById('conf-end').onchange = () => this.calculateDays();

        // Reporting
        document.getElementById('btn-close-report').onclick = () => this.closeReport();
        document.getElementById('btn-refresh-report').onclick = () => this.refreshReport();
        document.getElementById('btn-export-excel').onclick = () => this.exportAttendanceToExcel();

        // Global search for delegates inside report
        const logSearch = document.getElementById('log-search');
        if (logSearch) logSearch.oninput = () => this.renderGlobalList();

        document.querySelectorAll('.role-chip').forEach(chip => {
            chip.onclick = () => this.filterByRole(chip.dataset.role);
        });

        // Modal close
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.onclick = () => { this.closeConfModal(); this.closeGridModal(); this.closeDeleteModal(); };
        });

        const btnExportConf = document.getElementById('btn-export-conf');
        if (btnExportConf) {
            btnExportConf.onclick = async () => {
                if (!this.allConfs.length) { ui.toast('No conferences to export', 'warning'); return; }
                await exportConferences(this.allConfs);
            };
        }
    }

    // Reporting Methods
    async openReport(id) {
        const conf = this.allConfs.find(c => c.id === id);
        if (!conf) return;
        this.currentConference = conf;
        document.getElementById('report-title').textContent = conf.theme || conf.title;
        document.getElementById('main-view').style.display = 'none';
        document.getElementById('report-view').style.display = 'flex';
        await this.loadGlobalReport(id);
    }

    closeReport() {
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        this.refreshInterval = null;
        document.getElementById('main-view').style.display = 'block';
        document.getElementById('report-view').style.display = 'none';
        this.currentConference = null;
    }

    async loadGlobalReport(confId) {
        const fetchId = ++this.currentFetchId;
        if (this.refreshInterval) clearInterval(this.refreshInterval);
        try {
            const [days, attendance, meals, timeSlots] = await Promise.all([
                conferenceService.fetchDays(confId),
                attendanceService.fetchByConference(confId),
                mealService.fetchByConference(confId),
                conferenceService.fetchTimeSlots(confId)
            ]);
            if (fetchId !== this.currentFetchId) return;
            this.conferenceDays = days || []; 
            this.rawAttendance = attendance || []; 
            this.currentMeals = meals || []; 
            this.currentTimeSlots = timeSlots || [];

            const slotLookup = {}; this.currentTimeSlots.forEach(s => slotLookup[s.id] = s);
            const dayLookup = {}; this.conferenceDays.forEach(d => dayLookup[d.id] = d);
            this.currentMeals = this.currentMeals.map(m => ({ ...m, day_number: dayLookup[m.day_id]?.day_index ?? '?', slot_name: slotLookup[m.slot_id]?.name ?? m.name ?? 'Slot' }));
            
            const reportMap = new Map();
            this.allDelegates.forEach(d => reportMap.set(d.attendanceKey, { delegate: d, scans: {}, totalScans: 0 }));
            this.rawAttendance.forEach(a => {
                const key = `${a.delegate_type}_${a.delegate_id}`;
                if (reportMap.has(key)) {
                    const record = reportMap.get(key); const scanKey = `${a.day_id}_${a.slot_id}`;
                    if (!record.scans[scanKey]) { record.scans[scanKey] = a; record.totalScans++; }
                }
            });
            this.globalReportData = Array.from(reportMap.values());
            this.renderSummaryCards(); 
            this.renderGlobalList();
            
            const now = new Date(); const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            document.getElementById('last-updated').textContent = `Last updated: ${timeStr}`;
            
            if (!this.refreshInterval && fetchId === this.currentFetchId) {
                this.refreshInterval = setInterval(() => { if (document.visibilityState === 'visible') this.refreshReport(true); }, 60000);
            }
        } catch (err) { ui.toast('Report error: ' + err.message, 'error'); }
    }

    renderSummaryCards() {
        const container = document.getElementById('summary-cards');
        if (!container) return;
        const total = this.allDelegates.length;
        let active = 0; let m = 0; let p = 0; let w = 0; let d = 0;
        this.globalReportData.forEach(row => {
            if (row.totalScans > 0) { active++; if (row.delegate.role === 'PASTOR') p++; if (row.delegate.role === 'WIFE') w++; if (row.delegate.role === 'DISCIPLE') d++; } else m++;
        });
        const pct = total ? Math.round((active / total) * 100) : 0;
        container.innerHTML = `<div class="stat-card accent"><div class="stat-val">${active} / ${total}</div><div class="stat-label">Active Attendees</div><div style="margin-top:10px; height:5px; background:var(--bg-input); border-radius:3px; overflow:hidden;"><div style="width:${pct}%; height:100%; background:var(--red);"></div></div><div class="stat-sub">${pct}% Engagement</div></div><div class="stat-card"><div class="stat-val">${m}</div><div class="stat-label">Not Checked In</div></div><div class="stat-card"><div class="stat-label" style="margin-bottom:8px;">Breakdown</div><div style="font-size:12px; display:flex; flex-direction:column; gap:4px;"><div>Pastors: ${p}</div><div>Wives: ${w}</div><div>Disciples: ${d}</div></div></div>`;
        this.updateChipCounts();
    }

    filterByRole(role) {
        this.currentRoleFilter = role;
        document.querySelectorAll('.role-chip').forEach(c => c.classList.toggle('active', c.dataset.role === role));
        this.renderGlobalList();
    }

    updateChipCounts() {
        const counts = { ALL: 0, PASTOR: 0, WIFE: 0, DISCIPLE: 0 };
        this.globalReportData.forEach(row => { counts.ALL++; if (counts.hasOwnProperty(row.delegate.role)) counts[row.delegate.role]++; });
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('count-all', counts.ALL); set('count-pastor', counts.PASTOR); set('count-wife', counts.WIFE); set('count-disciple', counts.DISCIPLE);
    }

    renderGlobalList() {
        const container = document.getElementById('global-list-body');
        if (!container) return;
        const search = document.getElementById('log-search').value.toLowerCase().trim();
        let list = [...this.globalReportData];
        if (this.currentRoleFilter !== 'ALL') list = list.filter(row => row.delegate.role === this.currentRoleFilter);
        if (search) list = list.filter(row => row.delegate.fullName.toLowerCase().includes(search) || row.delegate.church.toLowerCase().includes(search));
        list.sort((a,b) => (a.totalScans === 0 && b.totalScans > 0) ? -1 : (a.totalScans > 0 && b.totalScans === 0) ? 1 : a.delegate.fullName.localeCompare(b.delegate.fullName));
        if (!list.length) { container.innerHTML = '<tr><td colspan="3" style="padding:40px;text-align:center;">No results.</td></tr>'; return; }
        container.innerHTML = list.map(row => {
            const d = row.delegate; const active = row.totalScans > 0;
            return `<tr><td style="padding:12px 16px;"><strong>${esc(d.fullName)}</strong><br><small>${d.role}</small></td><td style="padding:12px 16px;">${esc(d.church)}<br><small>${esc(d.district)}</small></td><td style="padding:12px 16px;"><span class="pill ${active ? 'pill-green' : ''}">${active ? 'Active' : 'Missing'}</span></td></tr>`;
        }).join('');
    }

    async refreshReport(isAuto = false) {
        if (this.currentConference) await this.loadGlobalReport(this.currentConference.id);
    }

    exportAttendanceToExcel() {
        if (!this.globalReportData.length) return ui.toast('No data to export', 'warning');
        const aoa = [[`Conference: ${this.currentConference.title}`], []];
        const slotOrder = { 'MORNING': 1, 'AFTERNOON': 2, 'EVENING': 3 };
        const sortedMeals = [...this.currentMeals].sort((a, b) => {
            const aDayNum = parseInt(a.day_number) || 0;
            const bDayNum = parseInt(b.day_number) || 0;
            if (aDayNum !== bDayNum) return aDayNum - bDayNum;
            return (slotOrder[a.slot_name] || 0) - (slotOrder[b.slot_name] || 0);
        });
        const headers = ['Role', 'Name', 'Church', 'Status', 'Total'];
        sortedMeals.forEach(m => headers.push(`Day ${m.day_number} ${m.slot_name}`));
        aoa.push(headers);
        this.globalReportData.forEach(row => {
            const line = [row.delegate.role, row.delegate.fullName, row.delegate.church, row.totalScans > 0 ? 'Active' : 'Missing', row.totalScans];
            sortedMeals.forEach(m => line.push(row.scans[`${m.day_id}_${m.slot_id}`] ? 'Scanned' : '--'));
            aoa.push(line);
        });
        const csvContent = aoa.map(row => row.join('\t')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/tab-separated-values' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Attendance_${this.currentConference.theme || this.currentConference.title}.tsv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

const instance = new ConferencesController();
export async function mount(params = {}) {
    if (instance.isMounted) return;
    await instance.init();
    instance.isMounted = true;
}

export function unmount() {
    if (instance.refreshInterval) clearInterval(instance.refreshInterval);
    instance.isMounted = false;
    console.log("Conferences Controller Unmounted");
}

if (!window.router || !window.router.currentController) {
    mount();
}
export default { mount, unmount };
