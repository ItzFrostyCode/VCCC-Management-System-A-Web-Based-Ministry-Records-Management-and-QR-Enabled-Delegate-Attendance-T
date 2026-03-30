// js/services/timeline.service.js
// Specialized service for the Ministry Timeline Engine

import { db } from '../db.js';

export const timelineService = {
  
  // Fetches and interleaves assignments, ranks, and training into a single timeline feed
  async fetchPastorTimeline(pastorId) {
    // 1. Fetch data from secure RPCs
    const [assignmentsRes, ranksRes, trainingRes] = await Promise.all([
      db.rpc('get_assignments_v3'),
      db.rpc('get_ranks_v3'),
      db.rpc('get_training_v3')
    ]);

    // 2. Comprehensive error checking
    if (assignmentsRes.error) throw assignmentsRes.error;
    if (ranksRes.error) throw ranksRes.error;
    if (trainingRes.error) throw trainingRes.error;

    // 3. Filter by pastor
    // (Note: If your RPCs accept params, passing { p_pastor_id: pastorId } directly to db.rpc is much faster)
    const assignments = (assignmentsRes.data || []).filter(a => a.pastor_id === pastorId);
    const ranks       = (ranksRes.data || []).filter(r => r.pastor_id === pastorId);
    const training    = (trainingRes.data || []).filter(t => t.pastor_id === pastorId);

    // 4. Combine events safely
    const timeline = [];

    // Helper function to prevent NaN errors during sorting if dates are null
    const getSortTime = (dateStr) => dateStr ? new Date(dateStr).getTime() : 0;

    // Map Assignments
    assignments.forEach(a => {
      // Event 1: Assignment Started
      timeline.push({
        type: 'ASSIGNMENT_START',
        id: a.id,
        date: a.start_date,
        precision: a.precision_flag || 'exact',
        is_primary: a.is_primary,
        title: `Assigned to ${a.churches?.church_name || 'Unknown Church'}`,
        subtitle: `${a.role_code || 'Role'} · ${a.event_type || 'Event'} · ${a.churches?.districts?.district_name || 'No'} District`,
        notes: a.notes,
        raw_data: a,
        sort_date: getSortTime(a.start_date)
      });

      // Event 2: Assignment Ended (if applicable)
      if (a.end_date) {
        timeline.push({
          type: 'ASSIGNMENT_END',
          id: `${a.id}_end`,
          date: a.end_date,
          precision: a.precision_flag || 'exact',
          title: `End of term at ${a.churches?.church_name || 'Unknown Church'}`,
          subtitle: `Status: ${a.status_code || 'N/A'}`,
          notes: null, // usually no separate end notes unless added
          raw_data: a,
          sort_date: getSortTime(a.end_date)
        });
      }
    });

    // Map Ranks
    ranks.forEach(r => {
      timeline.push({
        type: 'RANK_CHANGE',
        id: r.id,
        date: r.effective_date,
        precision: r.precision_flag || 'exact',
        title: `Promoted to ${r.rank_code || 'Unknown Rank'}`,
        subtitle: r.source ? `Source: ${r.source}` : 'Rank Update',
        notes: r.notes,
        raw_data: r,
        sort_date: getSortTime(r.effective_date)
      });
    });

    // Map Training
    training.forEach(t => {
      timeline.push({
        type: t.status_code === 'Failed' ? 'TRAINING_FAILED' : 'TRAINING_LOG',
        id: t.id,
        date: t.completion_date,
        precision: t.precision_flag || 'exact',
        title: `${t.course_name || 'Unknown Course'} — ${t.status_code || 'Completed'}`,
        subtitle: t.blocker_flag ? 'Deployment Blocker' : 'Formation',
        notes: t.notes,
        is_blocker: t.blocker_flag,
        raw_data: t,
        sort_date: getSortTime(t.completion_date)
      });
    });

    // 5. Sort heavily descending (newest first)
    timeline.sort((a, b) => b.sort_date - a.sort_date);

    return timeline;
  },

  // Fetches and interleaves assignments, ranks, and training into a church's timeline feed
  async fetchChurchTimeline(churchId) {
    const [assignmentsRes, ranksRes, trainingRes] = await Promise.all([
      db.rpc('get_assignments_v3'),
      db.rpc('get_ranks_v3'),
      db.rpc('get_training_v3')
    ]);

    if (assignmentsRes.error) throw assignmentsRes.error;
    if (ranksRes.error) throw ranksRes.error;
    if (trainingRes.error) throw trainingRes.error;

    // Filter assignments by churchId
    const assignments = (assignmentsRes.data || []).filter(a => a.church_id === churchId);

    // Get the pastor UUIDs that were assigned here
    const pastorIds = new Set(assignments.map(a => a.pastor_id));

    // Filter ranks and training for those pastors
    const ranks = (ranksRes.data || []).filter(r => pastorIds.has(r.pastor_id));
    const training = (trainingRes.data || []).filter(t => pastorIds.has(t.pastor_id));

    const timeline = [];
    const getSortTime = (dateStr) => dateStr ? new Date(dateStr).getTime() : 0;

    // Track injected IDs to prevent duplicates from overlapping dates
    const injectedRanks = new Set();
    const injectedTrainings = new Set();

    // Map Assignments
    assignments.forEach(a => {
      const startMs = getSortTime(a.start_date);
      const endMs = a.end_date ? getSortTime(a.end_date) : Date.now() + 100000000000; // Infinity for active

      // Event 1: Pastor Assigned
      timeline.push({
        type: 'PASTOR_ASSIGNED',
        id: `start_${a.id}`,
        date: a.start_date,
        precision: a.precision_flag || 'exact',
        title: `${a.pastor_name || 'Pastor'} Assigned`,
        subtitle: `Role: ${a.role_code || 'N/A'} · Event: ${a.event_type || 'N/A'}`,
        notes: a.notes,
        raw_data: a,
        sort_date: startMs,
        is_primary: a.is_primary,
      });

      // Event 2: Pastor Left / Pulled out
      if (a.end_date) {
        timeline.push({
          type: 'PASTOR_LEFT',
          id: `end_${a.id}`,
          date: a.end_date,
          precision: a.precision_flag || 'exact',
          title: `${a.pastor_name || 'Pastor'} Departed`,
          subtitle: `Status: ${a.status_code || 'N/A'}`,
          notes: null,
          raw_data: a,
          sort_date: getSortTime(a.end_date)
        });
      }

      // Map Ranks that occurred *during* this assignment
      ranks.filter(r => r.pastor_id === a.pastor_id).forEach(r => {
        const rMs = getSortTime(r.effective_date);
        if (rMs >= startMs && rMs <= endMs && !injectedRanks.has(r.id)) {
          injectedRanks.add(r.id);
          timeline.push({
            type: 'RANK_ACHIEVED',
            id: `rank_${r.id}`,
            pastor_id: a.pastor_id,
            date: r.effective_date,
            precision: r.precision_flag || 'exact',
            title: `${a.pastor_name} Promoted to ${r.rank_code}`,
            subtitle: `Source: ${r.source || 'N/A'}`,
            notes: r.notes,
            raw_data: r,
            sort_date: rMs
          });
        }
      });

      // Map Trainings that occurred *during* this assignment
      training.filter(t => t.pastor_id === a.pastor_id).forEach(t => {
        const tMs = getSortTime(t.completion_date);
        if (tMs >= startMs && tMs <= endMs && !injectedTrainings.has(t.id)) {
          injectedTrainings.add(t.id);
          timeline.push({
            type: t.status_code === 'Failed' ? 'TRAINING_FAILED' : 'TRAINING_COMPLETED',
            id: `train_${t.id}`,
            pastor_id: a.pastor_id,
            date: t.completion_date,
            precision: t.precision_flag || 'exact',
            title: `${a.pastor_name} — ${t.course_name}`,
            subtitle: t.status_code || 'Completed',
            notes: t.notes,
            raw_data: t,
            sort_date: tMs
          });
        }
      });
    });

    // Sort heavily descending (newest first)
    timeline.sort((a, b) => b.sort_date - a.sort_date);

    return timeline;
  },

  // Formatting helper for precision dates
  formatPrecisionDate(dateString, precision) {
    if (!dateString) return 'Unknown Date';
    
    const d = new Date(dateString);
    
    // Catch invalid date strings
    if (isNaN(d.getTime())) return 'Invalid Date';

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