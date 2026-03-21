const pastorService = {
  // Returns flat rows — no nested object access needed in pages
  async fetchAll() {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id,
        full_name,
        wife_name,
        church_id,
        district_id,
        churches ( id, name ),
        districts ( id, name )
      `)
      .eq('is_deleted', false)
      .order('full_name')
    if (error) throw error

    return data.map(p => ({
      id:            p.id,
      full_name:     p.full_name,
      wife_name:     p.wife_name || '',
      church_id:     p.church_id,
      district_id:   p.district_id,
      church_name:   p.churches?.name   || '',
      district_name: p.districts?.name  || ''
    }))
  },

  async fetchById(id) {
    const { data, error } = await db
      .from('pastors')
      .select(`
        id, full_name, wife_name, church_id, district_id,
        churches ( id, name ),
        districts ( id, name )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
    if (error) throw error
    return {
      id:            data.id,
      full_name:     data.full_name,
      wife_name:     data.wife_name || '',
      church_id:     data.church_id,
      district_id:   data.district_id,
      church_name:   data.churches?.name  || '',
      district_name: data.districts?.name || ''
    }
  },

  async create(fullName, wifeName, churchId, districtId) {
    const { data, error } = await db
      .from('pastors')
      .insert({
        full_name:   fullName.trim(),
        wife_name:   wifeName.trim() || null,
        church_id:   churchId,
        district_id: districtId
      })
      .select(`
        id, full_name, wife_name, church_id, district_id,
        churches(id,name), districts(id,name)
      `)
      .single()
    if (error) throw error
    return {
      id:            data.id,
      full_name:     data.full_name,
      wife_name:     data.wife_name || '',
      church_id:     data.church_id,
      district_id:   data.district_id,
      church_name:   data.churches?.name  || '',
      district_name: data.districts?.name || ''
    }
  },

  async update(id, fullName, wifeName, churchId, districtId) {
    const { data, error } = await db
      .from('pastors')
      .update({
        full_name:   fullName.trim(),
        wife_name:   wifeName.trim() || null,
        church_id:   churchId,
        district_id: districtId
      })
      .eq('id', id)
      .select(`
        id, full_name, wife_name, church_id, district_id,
        churches(id,name), districts(id,name)
      `)
      .single()
    if (error) throw error
    return {
      id:            data.id,
      full_name:     data.full_name,
      wife_name:     data.wife_name || '',
      church_id:     data.church_id,
      district_id:   data.district_id,
      church_name:   data.churches?.name  || '',
      district_name: data.districts?.name || ''
    }
  },

  async remove(id) {
    const { error } = await db
      .from('pastors')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error
  }
}