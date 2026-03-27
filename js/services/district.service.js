const districtService = {
  async fetchAll() {
    const { data, error } = await db
      .from('districts')
      .select(`
        id, district_name, theme_color, leader_pastor_id, notes, created_at,
        pastors ( id, full_name )
      `)
      .eq('is_deleted', false)
      .order('district_name')
    if (error) throw error
    return data.map(d => ({
      ...d,
      leader_name: d.pastors?.full_name || ''
    }))
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('districts')
      .select(`
        id, district_name, theme_color, leader_pastor_id, notes, created_at,
        pastors ( id, full_name )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return {
      ...data,
      leader_name: data.pastors?.full_name || ''
    }
  },

  async create(districtData) {
    const { district_name, theme_color, leader_pastor_id, notes } = districtData
    const { data, error } = await db
      .from('districts')
      .insert({
        district_name: district_name.trim().toUpperCase(),
        theme_color: theme_color || null,
        leader_pastor_id: leader_pastor_id || null,
        notes: notes || null
      })
      .select('id, district_name, theme_color, leader_pastor_id, notes, created_at')
      .single()
    if (error) throw error
    return data
  },

  async update(id, districtData) {
    const { district_name, theme_color, leader_pastor_id, notes } = districtData
    const { data, error } = await db
      .from('districts')
      .update({
        district_name: district_name.trim().toUpperCase(),
        theme_color: theme_color || null,
        leader_pastor_id: leader_pastor_id || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('id, district_name, theme_color, leader_pastor_id, notes, created_at')
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await db
      .from('districts')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}