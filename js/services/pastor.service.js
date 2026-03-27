const pastorService = {
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
          id, church_id, assignment_type, status_code, start_date, end_date,
          churches (
            id, church_name, church_address, district_id,
            districts ( id, district_name )
          )
        )
      `)
      .eq('is_deleted', false)
      .order('full_name')

    if (error) throw error

    return data.map(p => {
      // Find earliest active assignment (the unique index guarantees at most 1)
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
        created_at: p.created_at,
        updated_at: p.updated_at,
        // Active assignment info
        assignment_id: activeAssignment?.id || null,
        church_id: activeAssignment?.church_id || null,
        church_name: activeAssignment?.churches?.church_name || '',
        church_address: activeAssignment?.churches?.church_address || '',
        district_id: activeAssignment?.churches?.district_id || null,
        district_name: activeAssignment?.churches?.districts?.district_name || ''
      }
    })
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id, full_name, wife_name, wife_birthdate, contact_number, birthdate,
        pastoring_start_date, pastor_image_url, wife_image_url, notes, current_status_code,
        assignments!assignments_pastor_id_fkey (
          id, church_id, assignment_type, status_code, start_date, end_date,
          churches ( id, church_name, district_id, districts ( id, district_name ) )
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error

    const activeAssignment = (data.assignments || []).find(
      a => a.status_code === 'active' && !a.end_date
    )

    return {
      id: data.id,
      full_name: data.full_name,
      wife_name: data.wife_name || '',
      wife_birthdate: data.wife_birthdate || '',
      contact_number: data.contact_number || '',
      birthdate: data.birthdate || '',
      pastoring_start_date: data.pastoring_start_date || '',
      pastor_image_url: data.pastor_image_url || '',
      wife_image_url: data.wife_image_url || '',
      notes: data.notes || '',
      current_status_code: data.current_status_code || 'undeployed',
      assignment_id: activeAssignment?.id || null,
      church_id: activeAssignment?.church_id || null,
      church_name: activeAssignment?.churches?.church_name || '',
      district_id: activeAssignment?.churches?.district_id || null,
      district_name: activeAssignment?.churches?.districts?.district_name || ''
    }
  },

  async create(data) {
    const {
      full_name, wife_name, wife_birthdate, contact_number,
      birthdate, pastoring_start_date, pastor_image_url, wife_image_url,
      notes, current_status_code
    } = data

    const { data: results, error } = await db
      .from('pastors')
      .insert({
        full_name: full_name.trim().toUpperCase(),
        wife_name: wife_name && wife_name.trim() ? wife_name.trim().toUpperCase() : null,
        wife_birthdate: wife_birthdate || null,
        contact_number: contact_number ? contact_number.trim() : null,
        birthdate: birthdate || null,
        pastoring_start_date: pastoring_start_date || null,
        pastor_image_url: pastor_image_url || null,
        wife_image_url: wife_image_url || null,
        notes: notes ? notes.trim() : null,
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
    const {
      full_name, wife_name, wife_birthdate, contact_number,
      birthdate, pastoring_start_date, pastor_image_url, wife_image_url,
      notes, current_status_code
    } = data

    const { data: results, error } = await db
      .from('pastors')
      .update({
        full_name: full_name.trim().toUpperCase(),
        wife_name: wife_name && wife_name.trim() ? wife_name.trim().toUpperCase() : null,
        wife_birthdate: wife_birthdate || null,
        contact_number: contact_number ? contact_number.trim() : null,
        birthdate: birthdate || null,
        pastoring_start_date: pastoring_start_date || null,
        pastor_image_url: pastor_image_url || null,
        wife_image_url: wife_image_url || null,
        notes: notes ? notes.trim() : null,
        current_status_code: current_status_code || 'undeployed',
        updated_at: new Date().toISOString()
      })
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
    // 1. Fetch pastor info and any active assignment
    const { data: p, error: fetchErr } = await db
      .from('pastors')
      .select('full_name, assignments ( id, status_code, end_date )')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr

    // 2. Identify active assignment to close
    const activeAssignment = (p.assignments || []).find(
      a => a.status_code === 'active' && !a.end_date
    )

    // 3. Mark pastor as deleted
    const { error: delErr } = await db
      .from('pastors')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (delErr) throw delErr

    // 4. If active assignment exists, close it (end it)
    if (activeAssignment && typeof assignmentService !== 'undefined') {
      try {
        await assignmentService.close(activeAssignment.id, new Date().toISOString().split('T')[0], 'ended')
      } catch (e) {
        console.warn('Failed to auto-close assignment during pastor deletion:', e)
      }
    }

    const user = typeof authService !== 'undefined' ? authService.getCurrentUser() : null
    if (user && p) {
      await authService.logAudit(user.id, 'DELETE_PASTOR', `Removed Pastor: ${p.full_name}`)
    }

    return true
  }
}