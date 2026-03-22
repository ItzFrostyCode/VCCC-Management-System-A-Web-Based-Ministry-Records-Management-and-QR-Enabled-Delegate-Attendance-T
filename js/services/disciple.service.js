const discipleService = {
  async fetchAll() {
    const { data, error } = await db
      .from('disciples')
      .select(`
        id,
        full_name,
        pastor_id,
        pastors (
          id,
          full_name,
          church_id,
          district_id,
          churches ( id, name ),
          districts ( id, name )
        )
      `)
      .eq('is_deleted', false)
      .order('full_name')
    if (error) throw error

    return data.map(d => ({
      id:            d.id,
      full_name:     d.full_name,
      pastor_id:     d.pastor_id,
      pastor_name:   d.pastors?.full_name         || '',
      church_id:     d.pastors?.church_id         || '',
      church_name:   d.pastors?.churches?.name    || '',
      district_id:   d.pastors?.district_id       || '',
      district_name: d.pastors?.districts?.name   || ''
    }))
  },

  async fetchByPastor(pastorId) {
    const { data, error } = await db
      .from('disciples')
      .select('id, full_name, pastor_id')
      .eq('pastor_id', pastorId)
      .eq('is_deleted', false)
      .order('full_name')
    if (error) throw error
    return data
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('disciples')
      .select(`
        id, full_name, pastor_id,
        pastors ( id, full_name )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return {
      id:          data.id,
      full_name:   data.full_name,
      pastor_id:   data.pastor_id,
      pastor_name: data.pastors?.full_name || ''
    }
  },

  async create(fullName, pastorId) {
    const { data, error } = await db
      .from('disciples')
      .insert({ full_name: fullName.trim().toUpperCase(), pastor_id: pastorId })
      .select(`
        id, full_name, pastor_id,
        pastors (
          id,
          full_name,
          church_id,
          district_id,
          churches ( id, name ),
          districts ( id, name )
        )
      `)
      .single()
    if (error) throw error
    
    const user = authService.getCurrentUser()
    if (user) await authService.logAudit(user.id, 'CREATE_DISCIPLE', `Added Disciple: ${data.full_name}`)

    return {
      id:            data.id,
      full_name:     data.full_name,
      pastor_id:     data.pastor_id,
      pastor_name:   data.pastors?.full_name         || '',
      church_id:     data.pastors?.church_id         || '',
      church_name:   data.pastors?.churches?.name    || '',
      district_id:   data.pastors?.district_id       || '',
      district_name: data.pastors?.districts?.name   || ''
    }
  },

  async update(id, fullName, pastorId) {
    const { data, error } = await db
      .from('disciples')
      .update({ full_name: fullName.trim().toUpperCase(), pastor_id: pastorId })
      .eq('id', id)
      .select(`
        id, full_name, pastor_id,
        pastors (
          id,
          full_name,
          church_id,
          district_id,
          churches ( id, name ),
          districts ( id, name )
        )
      `)
      .single()
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) await authService.logAudit(user.id, 'UPDATE_DISCIPLE', `Updated Disciple: ${data.full_name}`)

    return {
      id:            data.id,
      full_name:     data.full_name,
      pastor_id:     data.pastor_id,
      pastor_name:   data.pastors?.full_name         || '',
      church_id:     data.pastors?.church_id         || '',
      church_name:   data.pastors?.churches?.name    || '',
      district_id:   data.pastors?.district_id       || '',
      district_name: data.pastors?.districts?.name   || ''
    }
  },

  async remove(id) {
    // fetch name before deleting for audit
    const { data: d, error: fetchErr } = await db
      .from('disciples')
      .select('full_name')
      .eq('id', id)
      .single()
    if (fetchErr) throw fetchErr

    const { error } = await db
      .from('disciples')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error

    const user = authService.getCurrentUser()
    if (user && d) await authService.logAudit(user.id, 'DELETE_DISCIPLE', `Removed Disciple: ${d.full_name}`)

    return true
  }
}