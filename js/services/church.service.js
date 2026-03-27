const churchService = {
  async fetchAll() {
    const { data, error } = await db
      .from('churches')
      .select(`
        id,
        church_name,
        church_address,
        church_scope,
        district_id,
        notes,
        is_deleted,
        created_at,
        districts ( id, district_name )
      `)
      .eq('is_deleted', false)
      .order('church_name')
    if (error) throw error

    return data.map(c => ({
      id: c.id,
      church_name: c.church_name,
      church_address: c.church_address || '',
      church_scope: c.church_scope || 'local',
      district_id: c.district_id,
      district_name: c.districts?.district_name || '',
      notes: c.notes || '',
      created_at: c.created_at
    }))
  },

  async fetchByDistrict(districtId) {
    const { data, error } = await db
      .from('churches')
      .select('id, church_name, church_address, church_scope, district_id')
      .eq('district_id', districtId)
      .eq('is_deleted', false)
      .order('church_name')
    if (error) throw error
    return data
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('churches')
      .select(`
        id, church_name, church_address, church_scope, district_id, notes,
        districts ( id, district_name )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return {
      id: data.id,
      church_name: data.church_name,
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      district_id: data.district_id,
      district_name: data.districts?.district_name || '',
      notes: data.notes || ''
    }
  },

  async create(churchData) {
    const { church_name, church_address, church_scope, district_id, notes } = churchData
    const { data, error } = await db
      .from('churches')
      .insert({
        church_name: church_name.trim().toUpperCase(),
        church_address: (church_address || '').trim(),
        church_scope: church_scope || 'local',
        district_id: district_id || null,
        notes: (notes || '').trim() || null
      })
      .select(`
        id, church_name, church_address, church_scope, district_id, notes,
        districts ( id, district_name )
      `)
      .single()
    if (error) throw error
    return {
      id: data.id,
      church_name: data.church_name,
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      district_id: data.district_id,
      district_name: data.districts?.district_name || '',
      notes: data.notes || ''
    }
  },

  async update(id, churchData) {
    const { church_name, church_address, church_scope, district_id, notes } = churchData
    const { data, error } = await db
      .from('churches')
      .update({
        church_name: church_name.trim().toUpperCase(),
        church_address: (church_address || '').trim(),
        church_scope: church_scope || 'local',
        district_id: district_id || null,
        notes: (notes || '').trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        id, church_name, church_address, church_scope, district_id, notes,
        districts ( id, district_name )
      `)
      .single()
    if (error) throw error
    return {
      id: data.id,
      church_name: data.church_name,
      church_address: data.church_address || '',
      church_scope: data.church_scope || 'local',
      district_id: data.district_id,
      district_name: data.districts?.district_name || '',
      notes: data.notes || ''
    }
  },

  async remove(id) {
    const { error } = await db
      .from('churches')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
  }
}