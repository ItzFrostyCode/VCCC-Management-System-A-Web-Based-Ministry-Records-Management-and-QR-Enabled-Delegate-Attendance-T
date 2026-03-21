const churchService = {
  async fetchAll() {
    const { data, error } = await db
      .from('churches')
      .select('id, name, district_id, districts(id, name)')
      .eq('is_deleted', false)
      .order('name')
    if (error) throw error
    return data
  },

  async fetchByDistrict(districtId) {
    const { data, error } = await db
      .from('churches')
      .select('id, name, district_id')
      .eq('district_id', districtId)
      .eq('is_deleted', false)
      .order('name')
    if (error) throw error
    return data
  },

  async create(name, districtId) {
    const { data, error } = await db
      .from('churches')
      .insert({ name: name.trim(), district_id: districtId })
      .select('id, name, district_id, districts(id, name)')
      .single()
    if (error) throw error
    return data
  },

  async update(id, name, districtId) {
    const { data, error } = await db
      .from('churches')
      .update({ name: name.trim(), district_id: districtId })
      .eq('id', id)
      .select('id, name, district_id, districts(id, name)')
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await db
      .from('churches')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error
  }
}