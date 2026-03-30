const assignmentService = {
  // Fetch all assignments, joining pastor, church, and district names
  async fetchAll() {
    const { data, error } = await db
      .from('assignments')
      .select(`
        id,
        pastor_id,
        church_id,
        role_code,
        event_type,
        status_code,
        start_date,
        end_date,
        notes,
        created_at,
        updated_at,
        pastors!inner ( id, full_name, wife_name, contact_number, is_deleted ),
        churches (
          id,
          church_name,
          church_address,
          church_scope,
          district_id,
          districts ( id, district_name )
        )
      `)
      .eq('pastors.is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) throw error

    return data.map(a => ({
      id: a.id,
      pastor_id: a.pastor_id,
      church_id: a.church_id,
      role_code: a.role_code || 'Regular',
      event_type: a.event_type || 'Legacy',
      status_code: a.status_code || 'active',
      start_date: a.start_date,
      end_date: a.end_date,
      notes: a.notes || '',
      created_at: a.created_at,
      // Joined fields
      pastor_name: a.pastors?.full_name || '',
      wife_name: a.pastors?.wife_name || '',
      church_name: a.churches?.church_name || '',
      church_address: a.churches?.church_address || '',
      district_id: a.churches?.district_id || '',
      district_name: a.churches?.districts?.district_name || ''
    }))
  },

  // Fetch only active (open-ended) assignment for a given pastor
  async fetchActiveByPastor(pastorId) {
    const { data, error } = await db
      .from('assignments')
      .select(`
        id, pastor_id, church_id, role_code, event_type, status_code, start_date, end_date, notes,
        pastors!inner ( is_deleted ),
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)
      .eq('pastor_id', pastorId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .eq('pastors.is_deleted', false)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      pastor_id: data.pastor_id,
      church_id: data.church_id,
      role_code: data.role_code,
      event_type: data.event_type,
      status_code: data.status_code,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes || '',
      church_name: data.churches?.church_name || '',
      district_id: data.churches?.district_id || '',
      district_name: data.churches?.districts?.district_name || ''
    }
  },

  // Fetch active assignment for a given church
  async fetchActiveByChurch(churchId) {
    const { data, error } = await db
      .from('assignments')
      .select(`
        id, pastor_id, church_id, role_code, event_type, status_code, start_date, end_date,
        pastors!inner ( id, full_name, is_deleted )
      `)
      .eq('church_id', churchId)
      .eq('status_code', 'active')
      .is('end_date', null)
      .eq('pastors.is_deleted', false)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    return {
      id: data.id,
      pastor_id: data.pastor_id,
      pastor_name: data.pastors?.full_name || '',
      church_id: data.church_id,
      role_code: data.role_code,
      event_type: data.event_type,
      status_code: data.status_code,
      start_date: data.start_date,
      end_date: data.end_date
    }
  },

  async create(assignmentData) {
    const {
      pastor_id, church_id, role_code, event_type,
      status_code, start_date, end_date, notes
    } = assignmentData

    const { data, error } = await db
      .from('assignments')
      .insert({
        pastor_id,
        church_id,
        role_code: role_code || 'Regular',
        event_type: event_type || 'Legacy',
        status_code: status_code || 'active',
        start_date,
        end_date: end_date || null,
        notes: (notes || '').trim() || null
      })
      .select(`
        id, pastor_id, church_id, role_code, event_type, status_code, start_date, end_date, notes,
        pastors ( id, full_name ),
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)
      .single()
    if (error) throw error

    if (data) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) {
        await authService.logAudit(
          user.id,
          'CREATE_ASSIGNMENT',
          `Assigned Pastor ${data.pastors?.full_name || ''} to ${data.churches?.church_name || ''}`
        )
      }
    }

    return {
      id: data.id,
      pastor_id: data.pastor_id,
      church_id: data.church_id,
      role_code: data.role_code,
      event_type: data.event_type,
      status_code: data.status_code,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes || '',
      pastor_name: data.pastors?.full_name || '',
      church_name: data.churches?.church_name || '',
      district_id: data.churches?.district_id || '',
      district_name: data.churches?.districts?.district_name || ''
    }
  },

  async update(id, assignmentData) {
    const {
      pastor_id, church_id, role_code, event_type,
      status_code, start_date, end_date, notes
    } = assignmentData

    const { data, error } = await db
      .from('assignments')
      .update({
        pastor_id,
        church_id,
        role_code: role_code || 'Regular',
        event_type: event_type || 'Legacy',
        status_code: status_code || 'active',
        start_date,
        end_date: end_date || null,
        notes: (notes || '').trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, pastor_id, church_id, role_code, event_type, status_code, start_date, end_date, notes,
        pastors ( id, full_name ),
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)
      .single()
    if (error) throw error

    if (data) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) {
        await authService.logAudit(
          user.id,
          'UPDATE_ASSIGNMENT',
          `Updated assignment for ${data.pastors?.full_name || ''}`
        )
      }
    }

    return {
      id: data.id,
      pastor_id: data.pastor_id,
      church_id: data.church_id,
      role_code: data.role_code,
      event_type: data.event_type,
      status_code: data.status_code,
      start_date: data.start_date,
      end_date: data.end_date,
      notes: data.notes || '',
      pastor_name: data.pastors?.full_name || '',
      church_name: data.churches?.church_name || '',
      district_id: data.churches?.district_id || '',
      district_name: data.churches?.districts?.district_name || ''
    }
  },

  // Atomic Timeline Transfer (RPC wrapper)
  async transferPastor(transferData) {
    const {
      pastor_id, church_id, transfer_date, role_code, event_type,
      notes, is_primary, precision_flag
    } = transferData;

    try {
      const { data, error } = await db.rpc('transfer_pastor', {
        p_pastor_id: pastor_id,
        p_new_church_id: church_id,
        p_transfer_date: transfer_date,
        p_role_code: role_code || 'Lead Pastor',
        p_event_type: event_type || 'Transfer',
        p_notes: (notes || '').trim() || null,
        p_is_primary: is_primary !== undefined ? is_primary : true,
        p_precision_flag: precision_flag || 'exact'
      });
      
      if (error) throw error;
      
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
      if (user) {
        await authService.logAudit(
          user.id,
          'TRANSFER_PASTOR',
          `Transferred Pastor ID ${pastor_id} to Church ID ${church_id}`
        );
      }
      
      return data; // Returns the new assignment ID
    } catch (e) {
      // Graceful fallback if RPC isn't available yet
      console.warn("RPC transfer_pastor failed or not found.", e);
      throw e;
    }
  },

  // Atomic Pullout (RPC wrapper)
  async pulloutPastor(pulloutData) {
    const {
      pastor_id, pullout_date, notes
    } = pulloutData;

    try {
      const { data, error } = await db.rpc('pullout_pastor', {
        p_pastor_id: pastor_id,
        p_pullout_date: pullout_date,
        p_notes: (notes || '').trim() || null
      });

      if (error) throw error;

      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null;
      if (user) {
        await authService.logAudit(
          user.id,
          'PULLOUT_PASTOR',
          `Pulled out Pastor ID ${pastor_id} from active primary assignment`
        );
      }

      return data;
    } catch (e) {
      console.error("RPC pullout_pastor failed", e);
      throw e;
    }
  },

  // Close an active assignment (set end_date and status_code)
  async close(id, endDate, newStatus = 'ended') {
    const { data, error } = await db
      .from('assignments')
      .update({
        status_code: newStatus,
        end_date: endDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, status_code, end_date')
      .single()
    if (error) throw error
    return data
  },

  // Fetch all assignments for a specific pastor (history)
  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('assignments')
      .select(`
        id,
        pastor_id,
        church_id,
        role_code,
        event_type,
        status_code,
        start_date,
        end_date,
        notes,
        created_at,
        churches ( id, church_name, district_id, districts ( id, district_name ) )
      `)
      .eq('pastor_id', pastorId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data.map(a => ({
      ...a,
      church_name: a.churches?.church_name || '',
      district_name: a.churches?.districts?.district_name || ''
    }))
  },

  // Fetch all assignments for a specific church (history)
  async fetchByChurch(churchId) {
    const { data, error } = await db
      .from('assignments')
      .select(`
        id,
        pastor_id,
        church_id,
        role_code,
        event_type,
        status_code,
        start_date,
        end_date,
        notes,
        created_at,
        pastors ( id, full_name )
      `)
      .eq('church_id', churchId)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data.map(a => ({
      ...a,
      pastor_name: a.pastors?.full_name || ''
    }))
  }
}
