const discipleService = {
  // Correct Supabase join:
  // disciples → pastors → churches (name)
  // disciples → pastors → districts (name)
  // Result is flattened so pages do: d.pastor_name, d.church_name, d.district_name
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
      .insert({ full_name: fullName.trim(), pastor_id: pastorId })
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
      .update({ full_name: fullName.trim(), pastor_id: pastorId })
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
    const { error } = await db
      .from('disciples')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error
  }
}