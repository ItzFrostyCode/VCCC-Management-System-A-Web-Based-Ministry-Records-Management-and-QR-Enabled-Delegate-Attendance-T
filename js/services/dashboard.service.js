// js/services/dashboard.service.js
// Dashboard aggregation service

const dashboardService = {
  // 1. KPI Bar
  async getKpis() {
    const [
      { count: districts },
      { count: churches },
      { count: pastors },
      { count: disciples },
      { count: activeAssignments },
      { count: conferences },
      { count: todayAttendance },
      { count: scanErrors }
    ] = await Promise.all([
      db.from('districts').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      db.from('churches').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      db.from('pastors').select('*', { count: 'exact', head: true }).eq('is_deleted', false).eq('current_status_code', 'active'),
      db.from('disciples').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      db.from('assignments').select('*', { count: 'exact', head: true }).eq('status_code', 'active').is('end_date', null),
      db.from('conferences').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
      // Today Attendance
      db.from('attendance')
        .select('*', { count: 'exact', head: true })
        .gte('scanned_at', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
        .lte('scanned_at', new Date().toISOString().split('T')[0] + 'T23:59:59Z'),
      // Scan errors today
      db.from('scan_logs')
        .select('*', { count: 'exact', head: true })
        .neq('status', 'SUCCESS')
        .gte('timestamp', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
        .lte('timestamp', new Date().toISOString().split('T')[0] + 'T23:59:59Z')
    ]);

    return {
      districts: districts || 0,
      churches: churches || 0,
      pastors: pastors || 0,
      disciples: disciples || 0,
      activeAssignments: activeAssignments || 0,
      conferences: conferences || 0,
      todayAttendance: todayAttendance || 0,
      scanErrors: scanErrors || 0
    };
  },

  // 2. District Performance
  async getDistrictPerformance() {
    const { data: districts, error } = await db
      .from('districts')
      .select(`
        id, 
        district_name, 
        theme_color,
        churches ( id, assignments ( pastor_id, status_code, end_date ) ),
        disciples ( id )
      `)
      .eq('is_deleted', false)
      .order('district_name');

    if (error) throw error;

    return districts.map(d => {
      let activePastorsCount = 0;
      let emptyChurches = 0;

      d.churches.forEach(c => {
        const activeAss = c.assignments.find(a => a.status_code === 'active' && !a.end_date);
        if (activeAss) activePastorsCount++;
        else emptyChurches++;
      });

      return {
        id: d.id,
        name: d.district_name,
        color: d.theme_color || '#cccccc',
        churchesCount: d.churches.length,
        pastorsCount: activePastorsCount,
        emptyChurches: emptyChurches,
        disciplesCount: d.disciples.length
      };
    });
  },

  // 3. Church Status Board
  async getChurchStatus() {
    const { data, error } = await db
      .from('churches')
      .select(`
        id,
        church_name,
        districts ( district_name, theme_color ),
        assignments ( status_code, end_date, pastors ( full_name ) )
      `)
      .eq('is_deleted', false)
      .order('church_name');
    if (error) throw error;

    return data.map(c => {
      const activeAss = c.assignments.find(a => a.status_code === 'active' && !a.end_date);
      return {
        id: c.id,
        name: c.church_name,
        district: c.districts?.district_name || 'No District',
        color: c.districts?.theme_color || '#ccc',
        pastor: activeAss?.pastors?.full_name || '—',
        status: activeAss ? 'Active' : 'No Pastor',
        statusCode: activeAss ? 'active' : 'critical'
      };
    });
  },

  // 4. Pastor Deployment Tracker
  async getPastorDeployment() {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id, 
        full_name, 
        current_status_code,
        assignments ( start_date, status_code, end_date, churches ( church_name ) )
      `)
      .eq('is_deleted', false)
      .order('full_name');
    
    if (error) throw error;

    return data.map(p => {
      const activeAss = p.assignments.find(a => a.status_code === 'active' && !a.end_date);
      return {
        id: p.id,
        name: p.full_name,
        status: p.current_status_code || 'undeployed',
        church: activeAss?.churches?.church_name || '—',
        startDate: activeAss?.start_date || '—'
      };
    });
  },

  // 5. Conference Live Panel (Latest Conference)
  async getConferenceLive() {
    const { data: confs, error: confErr } = await db
      .from('conferences')
      .select('id, title, start_date, end_date')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false })
      .limit(1);

    if (confErr || !confs.length) return null;

    const conf = confs[0];
    
    const [ {data: slots}, {data: attendance} ] = await Promise.all([
      db.from('time_slots').select('id, name').eq('conference_id', conf.id),
      db.from('attendance').select('slot_id').eq('conference_id', conf.id)
    ]);

    const slotCounts = {};
    if (slots) {
      slots.forEach(s => slotCounts[s.name] = 0);
      if (attendance) {
        attendance.forEach(a => {
          const slot = slots.find(s => s.id === a.slot_id);
          if (slot) slotCounts[slot.name]++;
        });
      }
    }

    return {
      title: conf.title,
      startDate: conf.start_date,
      endDate: conf.end_date,
      slots: slotCounts
    };
  },

  // 6. Scan Logs Feed
  async getScanFeed() {
    const { data, error } = await db
      .from('scan_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },

  // 7. Alerts Panel (Churches without pastors + Pastors without assignments + Scan Errors)
  async getAlerts() {
    const alerts = [];
    
    // Scan errors today
    const { data: scanErrors } = await db
      .from('scan_logs')
      .select('delegate_name, status, timestamp')
      .neq('status', 'SUCCESS')
      .gte('timestamp', new Date().toISOString().split('T')[0] + 'T00:00:00Z')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (scanErrors) {
      scanErrors.forEach(e => {
        alerts.push({
          type: 'scan_error',
          message: `Scan failed for ${e.delegate_name || 'Unknown'}: ${e.status}`,
          time: e.timestamp
        });
      });
    }

    // Churches no pastor
    const { data: churches } = await db
      .from('churches')
      .select('church_name, assignments ( status_code, end_date )')
      .eq('is_deleted', false);
    
    if (churches) {
      churches.forEach(c => {
        const active = c.assignments.find(a => a.status_code === 'active' && !a.end_date);
        if (!active) {
          alerts.push({
            type: 'no_pastor',
            message: `Church "${c.church_name}" currently has no assigned pastor.`,
            time: new Date().toISOString()
          });
        }
      });
    }

    // Pastors undeployed
    const { data: pastors } = await db
      .from('pastors')
      .select('full_name, current_status_code')
      .eq('is_deleted', false)
      .eq('current_status_code', 'undeployed');
    
    if (pastors) {
      pastors.forEach(p => {
        alerts.push({
          type: 'undeployed_pastor',
          message: `Pastor "${p.full_name}" is currently undeployed.`,
          time: new Date().toISOString()
        });
      });
    }

    // Sort by time
    alerts.sort((a,b) => new Date(b.time) - new Date(a.time));
    return alerts;
  },

  // 8. User Activity Logs
  async getUserActivity() {
    const { data, error } = await db
      .from('audit_logs')
      .select(`
        action, details, created_at,
        users ( full_name )
      `)
      .order('created_at', { ascending: false })
      .limit(15);
    
    if (error) throw error;
    return data.map(d => ({
      actor: d.users?.full_name || 'System',
      action: d.action,
      details: d.details,
      time: d.created_at
    }));
  }
};
