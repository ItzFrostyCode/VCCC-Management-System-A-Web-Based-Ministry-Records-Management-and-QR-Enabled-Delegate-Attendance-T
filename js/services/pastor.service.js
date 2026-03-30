const pastorService = {
  // Shared view model mapper to ensure identical shapes
  _mapPastorResponse(p) {
    const activeAssignment = (p.assignments || []).find(
      a => a.status_code === 'active' && !a.end_date
    )
    return {
      id: p.id,
      full_name: p.full_name,
      wife_name: p.wife_name || '',
      wife_birthdate: p.wife_birthdate || '',
      contact_number: p.contact_number || '',
      birthdate: p.birthdate || '',
      pastoring_start_date: p.pastoring_start_date || '',
      pastor_image_url: p.pastor_image_url || '',
      wife_image_url: p.wife_image_url || '',
      notes: p.notes || '',
      current_status_code: p.current_status_code || 'undeployed',
      created_at: p.created_at || null,
      updated_at: p.updated_at || null,
      assignment_id: activeAssignment?.id || null,
      church_id: activeAssignment?.church_id || null,
      church_name: activeAssignment?.churches?.church_name || '',
      church_address: activeAssignment?.churches?.church_address || '',
      district_id: activeAssignment?.churches?.district_id || null,
      district_name: activeAssignment?.churches?.districts?.district_name || ''
    }
  },
  // Returns pastors with their active assignment's church/district info
  async fetchAll() {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id,
        full_name,
        wife_name,
        wife_birthdate,
        contact_number,
        birthdate,
        pastoring_start_date,
        pastor_image_url,
        wife_image_url,
        notes,
        current_status_code,
        is_deleted,
        created_at,
        updated_at,
        assignments!assignments_pastor_id_fkey (
          id, church_id, role_code, event_type, status_code, start_date, end_date,
          churches (
            id, church_name, church_address, district_id,
            districts ( id, district_name )
          )
        )
      `)
      .eq('is_deleted', false)
      .order('full_name')

    if (error) throw error

    return data.map(p => pastorService._mapPastorResponse(p))
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id, full_name, wife_name, wife_birthdate, contact_number, birthdate,
        pastoring_start_date, pastor_image_url, wife_image_url, notes, current_status_code,
        created_at, updated_at,
        assignments!assignments_pastor_id_fkey (
          id, church_id, role_code, event_type, status_code, start_date, end_date,
          churches ( id, church_name, church_address, district_id, districts ( id, district_name ) )
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    return pastorService._mapPastorResponse(data)
  },

  async create(data) {
    const {
      full_name, wife_name, wife_birthdate, contact_number,
      birthdate, pastoring_start_date, pastor_image_url, wife_image_url,
      notes, current_status_code
    } = data

    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      throw new Error('full_name is required and must be a valid non-empty string.')
    }

    const { data: results, error } = await db
      .from('pastors')
      .insert({
        full_name: full_name.trim().toUpperCase(),
        wife_name: wife_name && typeof wife_name === 'string' && wife_name.trim() ? wife_name.trim().toUpperCase() : null,
        wife_birthdate: wife_birthdate || null,
        contact_number: contact_number && typeof contact_number === 'string' ? contact_number.trim() : null,
        birthdate: birthdate || null,
        pastoring_start_date: pastoring_start_date || null,
        pastor_image_url: pastor_image_url || null,
        wife_image_url: wife_image_url || null,
        notes: notes && typeof notes === 'string' ? notes.trim() : null,
        current_status_code: current_status_code || 'undeployed'
      })
      .select('id, full_name, wife_name, contact_number, current_status_code')

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Failed to create pastor record.')
    const result = results[0]

    if (result) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) {
        await authService.logAudit(user.id, 'CREATE_PASTOR', `Added Pastor: ${result.full_name}`)
      }
    }

    return {
      id: result.id,
      full_name: result.full_name,
      wife_name: result.wife_name || '',
      contact_number: result.contact_number || '',
      current_status_code: result.current_status_code,
      assignment_id: null,
      church_id: null,
      church_name: '',
      district_id: null,
      district_name: ''
    }
  },

  async update(id, data) {
    const updatePayload = {
      updated_at: new Date().toISOString()
    }

    if (data.full_name !== undefined) {
      if (!data.full_name || typeof data.full_name !== 'string' || !data.full_name.trim()) {
        throw new Error('full_name cannot be empty.')
      }
      updatePayload.full_name = data.full_name.trim().toUpperCase()
    }

    if (data.wife_name !== undefined) {
      updatePayload.wife_name = data.wife_name && typeof data.wife_name === 'string' && data.wife_name.trim() ? data.wife_name.trim().toUpperCase() : null
    }

    if (data.wife_birthdate !== undefined) updatePayload.wife_birthdate = data.wife_birthdate || null
    
    if (data.contact_number !== undefined) {
      updatePayload.contact_number = data.contact_number && typeof data.contact_number === 'string' ? data.contact_number.trim() : null
    }

    if (data.birthdate !== undefined) updatePayload.birthdate = data.birthdate || null
    if (data.pastoring_start_date !== undefined) updatePayload.pastoring_start_date = data.pastoring_start_date || null
    if (data.pastor_image_url !== undefined) updatePayload.pastor_image_url = data.pastor_image_url || null
    if (data.wife_image_url !== undefined) updatePayload.wife_image_url = data.wife_image_url || null
    
    if (data.notes !== undefined) {
      updatePayload.notes = data.notes && typeof data.notes === 'string' ? data.notes.trim() : null
    }

    if (data.current_status_code !== undefined) updatePayload.current_status_code = data.current_status_code || 'undeployed'

    if (Object.keys(updatePayload).length === 1) {
      throw new Error('No valid fields provided for update.')
    }

    const { data: results, error } = await db
      .from('pastors')
      .update(updatePayload)
      .eq('id', id)
      .select('id, full_name, wife_name, contact_number, current_status_code')

    if (error) throw error
    if (!results || results.length === 0) throw new Error('Record not found or update unauthorized.')
    const result = results[0]

    if (result) {
      const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
      if (user) {
        await authService.logAudit(user.id, 'UPDATE_PASTOR', `Updated Pastor: ${result.full_name}`)
      }
    }

    return {
      id: result.id,
      full_name: result.full_name,
      wife_name: result.wife_name || '',
      contact_number: result.contact_number || '',
      current_status_code: result.current_status_code
    }
  },

  async remove(id) {
    // 1. Fetch pastor name securely before deleting using RPC
    const { data: p, error: fetchErr } = await db
      .from('pastors')
      .select('full_name')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr

    // 2. Exploit completely atomic deletion RPC
    const { error: rpcErr } = await db.rpc('delete_pastor', { p_pastor_id: id })

    if (rpcErr) {
      console.error('Failed highly atomic pastor deletion via RPC:', rpcErr)
      throw new Error(`Failed to delete pastor: ${rpcErr.message || 'Server error'}`)
    }

    // 3. Log Audit
    const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
    if (user && p) {
      await authService.logAudit(user.id, 'DELETE_PASTOR', `Removed Pastor: ${p.full_name}`)
    }

    return true
  }
}