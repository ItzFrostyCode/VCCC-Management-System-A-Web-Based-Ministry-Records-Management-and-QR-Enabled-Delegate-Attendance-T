// js/services/timeline.service.js
// Specialized service for the Ministry Timeline Engine

const timelineService = {
  
  // Fetches and interleaves assignments, ranks, and training into a single timeline feed
  async fetchPastorTimeline(pastorId) {
    // 1. Fetch Assignments
    const { data: assignments, error: errA } = await db
      .from('assignments')
      .select(`
        id,
        church_id,
        role_code,
        event_type,
        status_code,
        start_date,
        end_date,
        is_primary,
        precision_flag,
        notes,
        created_at,
        churches ( church_name, district_id, districts ( district_name ) )
      `)
      .eq('pastor_id', pastorId);

    if (errA) throw errA;

    // 2. Fetch Rank History (if table exists, handled safely)
    let ranks = [];
    try {
      const { data: rankData, error: errR } = await db
        .from('rank_history')
        .select(`id, rank_code, effective_date, precision_flag, notes, source, created_at`)
        .eq('pastor_id', pastorId);
      if (!errR && rankData) ranks = rankData;
    } catch (e) {
      console.warn("Rank history table not available yet.");
    }

    // 3. Fetch Training Log
    let training = [];
    try {
      const { data: trainData, error: errT } = await db
        .from('training_log')
        .select(`id, course_name, status_code, completion_date, precision_flag, blocker_flag, notes, created_at`)
        .eq('pastor_id', pastorId);
      if (!errT && trainData) training = trainData;
    } catch (e) {
      console.warn("Training log table not available yet.");
    }

    // Combine events
    const timeline = [];

    // Map Assignments
    if (assignments) {
      assignments.forEach(a => {
        // Event 1: Assignment Started
        timeline.push({
          type: 'ASSIGNMENT_START',
          id: a.id,
          date: a.start_date,
          precision: a.precision_flag || 'exact',
          is_primary: a.is_primary,
          title: `Assigned to ${a.churches?.church_name}`,
          subtitle: `${a.role_code} · ${a.event_type} · ${a.churches?.districts?.district_name || 'No'} District`,
          notes: a.notes,
          raw_data: a,
          sort_date: new Date(a.start_date).getTime()
        });

        // Event 2: Assignment Ended (if applicable)
        if (a.end_date) {
          timeline.push({
            type: 'ASSIGNMENT_END',
            id: a.id + '_end',
            date: a.end_date,
            precision: a.precision_flag || 'exact',
            title: `End of term at ${a.churches?.church_name}`,
            subtitle: `Status: ${a.status_code}`,
            notes: null, // usually no separate end notes unless added
            raw_data: a,
            sort_date: new Date(a.end_date).getTime()
          });
        }
      });
    }

    // Map Ranks
    ranks.forEach(r => {
      timeline.push({
        type: 'RANK_CHANGE',
        id: r.id,
        date: r.effective_date,
        precision: r.precision_flag || 'exact',
        title: `Promoted to ${r.rank_code}`,
        subtitle: r.source ? `Source: ${r.source}` : 'Rank Update',
        notes: r.notes,
        raw_data: r,
        sort_date: new Date(r.effective_date).getTime()
      });
    });

    // Map Training
    training.forEach(t => {
      timeline.push({
        type: t.status_code === 'Failed' ? 'TRAINING_FAILED' : 'TRAINING_LOG',
        id: t.id,
        date: t.completion_date,
        precision: t.precision_flag || 'exact',
        title: `${t.course_name} — ${t.status_code}`,
        subtitle: t.blocker_flag ? 'Deployment Blocker' : 'Formation',
        notes: t.notes,
        is_blocker: t.blocker_flag,
        raw_data: t,
        sort_date: new Date(t.completion_date).getTime()
      });
    });

    // Sort heavily heavily heavily descending (newest first)
    timeline.sort((a, b) => b.sort_date - a.sort_date);

    return timeline;
  },

  // Formatting helper for precision dates
  formatPrecisionDate(dateString, precision) {
    if (!dateString) return 'Unknown Date';
    const d = new Date(dateString);
    if (precision === 'year') {
        return d.getFullYear().toString();
    }
    if (precision === 'month') {
        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }
    // exact or unknown fallback
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
};
