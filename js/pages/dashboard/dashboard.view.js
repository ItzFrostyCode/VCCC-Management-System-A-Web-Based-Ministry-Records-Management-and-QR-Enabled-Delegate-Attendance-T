export class DashboardView {
    constructor() {
        this.kpiContainer = document.getElementById('kpi-container');
        this.churchPanel = document.getElementById('church-panel');
        this.pastorPanel = document.getElementById('pastor-panel');
        this.calLivePanel = document.getElementById('cal-live-panel');
        this.scanPanel = document.getElementById('scan-panel');
        this.alertsPanel = document.getElementById('alerts-panel');
        this.activityPanel = document.getElementById('activity-panel');
        this.calendarWidget = document.getElementById('calendar-widget');
    }

    renderKpis(kpis) {
        if (!this.kpiContainer) return;
        
        const cardStyle = `background: #ffffff; border: 1px solid #e5e4e0; padding: 12px; display: flex; flex-direction: column; justify-content: center; min-height: 85px; transition: all 0.2s;`;
        const labelStyle = `font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #a0a09a; margin-top: 2px; line-height: 1.2;`;
        const iconStyle = `width: 18px; height: 18px; margin-bottom: 6px; stroke-width: 2.5; fill: none;`;

        this.kpiContainer.innerHTML = [
            { label: 'Districts', val: kpis.districts, color: '#e83820', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>' },
            { label: 'Churches', val: kpis.churches, color: '#185FA5', icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' },
            { label: 'Active Pastors', val: kpis.pastors, color: '#534AB7', icon: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>' },
            { label: 'Total Disciples', val: kpis.disciples, color: '#3B6D11', icon: '<circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/>' },
            { label: 'Active Assignments', val: kpis.activeAssignments, color: '#534AB7', icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>' },
            { label: 'Conferences', val: kpis.conferences, color: '#185FA5', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/>' },
            { label: 'Today Attendance', val: kpis.todayAttendance, color: '#3B6D11', icon: '<rect x="3" y="4" width="18" height="18" rx="2"/>' },
            { label: 'Scan Errors', val: kpis.scanErrors, color: '#e83820', icon: '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>' }
        ].map(item => {
            const valStr = String(item.val || 0);
            let fontSize = "24px";
            if (valStr.length > 5) fontSize = "18px";

            return `
                <div style="${cardStyle} display: flex; flex-direction: column; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <svg style="width: 24px; height: 24px; stroke: ${item.color}; fill: none; stroke-width: 2.5; flex-shrink: 0;">${item.icon}</svg>
                        <div style="${labelStyle} margin-top: 0; color: ${item.color}; opacity: 0.8; font-size: 10px;">${item.label}</div>
                    </div>
                    <div style="font-size: ${fontSize}; font-weight: 800; color: #1a1a18; margin-top: 10px; line-height: 1;">${item.val}</div>
                </div>
            `;
        }).join('');
    }

    renderChurchStatus(data) {
        if (!this.churchPanel) return;
        if (!data.length) {
            this.churchPanel.innerHTML = `<tr><td colspan="3" style="padding: 24px; text-align: center; color: #a0a09a;">No churches found.</td></tr>`;
            return;
        }

        const tdBase = `padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e5e4e0; color: #1a1a18;`;

        this.churchPanel.innerHTML = data.slice(0, 8).map(c => `
            <tr style="border-bottom: 1px solid #e5e4e0;">
                <td style="${tdBase} font-weight: 700;">${c.name}</td>
                <td style="${tdBase}">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: ${c.color || '#e5e4e0'};"></span>
                        <span style="color: #6b6b66; font-size: 11px; font-weight: 600;">${c.district}</span>
                    </div>
                </td>
                <td style="${tdBase} color: #6b6b66;">${c.pastor || '—'}</td>
            </tr>
        `).join('');
    }

    renderPastorDeployment(data) {
        if (!this.pastorPanel) return;
        if (!data.length) {
            this.pastorPanel.innerHTML = `<tr><td colspan="3" style="padding: 24px; text-align: center; color: #a0a09a;">No pastors found.</td></tr>`;
            return;
        }

        const tdBase = `padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #e5e4e0; color: #1a1a18;`;

        this.pastorPanel.innerHTML = data.slice(0, 8).map(p => {
            let statusColor = '#6b6b66';
            let statusBg = '#f5f5f4';
            if (p.status === 'active') { statusColor = '#3B6D11'; statusBg = '#EAF3DE'; }
            else if (p.status === 'undeployed') { statusColor = '#e83820'; statusBg = '#fff5f5'; }
            
            return `
            <tr>
                <td style="${tdBase} font-weight: 700;">${p.name}</td>
                <td style="${tdBase} color: #6b6b66;">${p.church || '—'}</td>
                <td style="${tdBase}">
                    <span style="display: inline-block; font-size: 10px; font-weight: 800; text-transform: uppercase; padding: 2px 8px; background: ${statusBg}; color: ${statusColor}; border-radius: 0px;">${p.status}</span>
                </td>
            </tr>
        `}).join('');
    }

    renderConferenceLive(data) {
        if (!this.calLivePanel) return;
        if (!data) {
            this.calLivePanel.innerHTML = `<div style="text-align: center; color: #a0a09a; padding: 20px;">No active conference found.</div>`;
            return;
        }

        let statsHTML = `
            <div style="margin-bottom: 16px;">
                <div style="font-size: 9px; font-weight: 800; color: #e83820; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 4px;">ACTIVE EVENT</div>
                <div style="font-size: 16px; font-weight: 800; color: #1a1a18;">${data.title}</div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 8px;">
        `;

        if (Object.keys(data.slots).length === 0) {
            statsHTML += `<div style="color: #a0a09a; font-size: 12px;">Waiting for scan data...</div>`;
        } else {
            for (const [slot, count] of Object.entries(data.slots)) {
                statsHTML += `
                    <div style="display: flex; justify-content: space-between; align-items: center; background: #f8f8f8; padding: 10px 14px; border: 1px solid #e5e4e0;">
                        <span style="font-size: 11px; font-weight: 700; color: #6b6b66; text-transform: uppercase;">${slot}</span>
                        <div style="display: flex; align-items: baseline; gap: 4px;">
                            <span style="font-size: 18px; font-weight: 800; color: #1a1a18;">${count}</span>
                            <span style="font-size: 10px; font-weight: 600; color: #a0a09a;">SCANS</span>
                        </div>
                    </div>
                `;
            }
        }
        statsHTML += `</div>`;
        this.calLivePanel.innerHTML = statsHTML;
    }

    renderScanFeed(data, formatterFn) {
        if (!this.scanPanel) return;
        if (!data.length) {
            this.scanPanel.innerHTML = `<div style="text-align: center; color: #a0a09a; padding: 32px;">No recent scans.</div>`;
            return;
        }

        this.scanPanel.innerHTML = data.map(s => {
            const isSuccess = s.status === 'SUCCESS';
            const color = isSuccess ? '#3B6D11' : '#e83820';
            const bg = isSuccess ? '#EAF3DE' : '#fff5f5';

            return `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 11px; color: #6b6b66;">${s.delegate_role || 'No Role'}</span>
                        <span style="font-size: 10px; font-weight: 600; color: #a0a09a;">${formatterFn(s.timestamp)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderAlerts(alerts, formatterFn) {
        if (!this.alertsPanel) return;
        if (!alerts.length) {
            this.alertsPanel.innerHTML = `<div style="padding: 24px; text-align: center; color: #3B6D11; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em;">✓ System is Healthy</div>`;
            return;
        }

        this.alertsPanel.innerHTML = alerts.map(a => `
            <div style="padding: 12px 16px; border-bottom: 1px solid #e5e4e0; display: flex; gap: 12px; align-items: flex-start; background: #fff5f5;">
                <div style="width: 16px; height: 16px; stroke: #e83820; fill: none; stroke-width: 2.5; margin-top: 2px;">
                    <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                </div>
                <div style="flex: 1;">
                    <div style="font-size: 13px; font-weight: 700; color: #1a1a18; line-height: 1.4;">${a.message}</div>
                    <div style="font-size: 10px; font-weight: 600; color: #e83820; margin-top: 4px; text-transform: uppercase;">${formatterFn(a.time)}</div>
                </div>
            </div>
        `).join('');
    }

    renderUserActivity(acts, formatterFn) {
        if (!this.activityPanel) return;
        if (!acts.length) {
            this.activityPanel.innerHTML = `<div style="text-align: center; color: #a0a09a; padding: 32px;">No recent logs.</div>`;
            return;
        }

        const simplifyDetails = (details) => {
            if (!details) return '';
            // If it's a User Agent string (Mozilla/5.0...)
            if (details.includes('Mozilla/5.0')) {
                let os = 'Device';
                if (details.includes('Macintosh')) os = 'Mac';
                else if (details.includes('Windows')) os = 'Windows';
                else if (details.includes('iPhone')) os = 'iPhone';
                else if (details.includes('Android')) os = 'Android';

                let browser = 'Browser';
                if (details.includes('Chrome')) browser = 'Chrome';
                else if (details.includes('Safari') && !details.includes('Chrome')) browser = 'Safari';
                else if (details.includes('Firefox')) browser = 'Firefox';
                else if (details.includes('Edg')) browser = 'Edge';

                return `Logged in via ${browser} on ${os}`;
            }
            return details;
        };

        this.activityPanel.innerHTML = acts.map(a => `
            <div style="padding: 12px 16px; border-bottom: 1px solid #e5e4e0; display: flex; gap: 12px; align-items: flex-start; overflow-x: hidden;">
                <div style="width: 6px; height: 6px; border-radius: 50%; background: #e5e4e0; flex-shrink: 0; margin-top: 6px;"></div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 13px; color: #1a1a18; line-height: 1.4; word-break: break-word;">
                        <span style="font-weight: 800;">${a.actor}</span> 
                        <span style="color: #6b6b66; font-weight: 500;">${simplifyDetails(a.details || a.action)}</span>
                    </div>
                    <div style="font-size: 10px; font-weight: 700; color: #a0a09a; margin-top: 2px; text-transform: uppercase;">${formatterFn(a.time)}</div>
                </div>
            </div>
        `).join('');
    }

    renderCalendarWidget(today, confs) {
        if (!this.calendarWidget) return;
        
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth();
        const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        
        const isConf = (d) => {
            const t = new Date(currentYear, currentMonth, d).getTime();
            return confs.some(c => {
                if (!c.start_date || !c.end_date) return false;
                const start = new Date(c.start_date).getTime();
                const end = new Date(c.end_date).getTime();
                return t >= start && t <= end;
            });
        };

        const firstDay = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        let html = `
            <div style="text-align: center; margin-bottom: 12px;">
                <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.1em; color: #1a1a18;">${monthNames[currentMonth]} ${currentYear}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;">
                ${['S','M','T','W','T','F','S'].map(d => `<div style="text-align: center; font-size: 9px; font-weight: 900; color: #a0a09a; padding-bottom: 4px;">${d}</div>`).join('')}
        `;
        
        for (let i = 0; i < firstDay; i++) html += `<div></div>`;
        for (let d = 1; d <= daysInMonth; d++) {
            const active = d === today.getDate();
            const conference = isConf(d);
            let style = `aspect-ratio: 1; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 1px solid #e5e4e0;`;
            
            if (active) style += `background: #1a1a18; color: #ffffff; border-color: #1a1a18; font-weight: 900;`;
            else if (conference) style += `background: #fff5f5; color: #e83820; border-color: #e83820;`;
            else style += `background: #ffffff; color: #6b6b66;`;

            html += `<div style="${style}">${d}</div>`;
        }
        html += `</div>`;
        this.calendarWidget.innerHTML = html;
    }

    renderNetworkError(panelId, message) {
        const el = document.getElementById(panelId);
        if (el) el.innerHTML = `<div style="padding: 24px; text-align: center; color: #a0a09a; font-size: 12px;">${message}</div>`;
    }
}

