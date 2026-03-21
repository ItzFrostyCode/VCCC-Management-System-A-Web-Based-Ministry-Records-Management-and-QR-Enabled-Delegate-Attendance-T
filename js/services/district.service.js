const districtService = {
  async fetchAll() {
    const { data, error } = await db
      .from('districts')
      .select('id, name, created_at')
      .eq('is_deleted', false)
      .order('name')
    if (error) throw error
    return data
  },

  async create(name) {
    const { data, error } = await db
      .from('districts')
      .insert({ name: name.trim() })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, name) {
    const { data, error } = await db
      .from('districts')
      .update({ name: name.trim() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async remove(id) {
    const { error } = await db
      .from('districts')
      .update({ is_deleted: true })
      .eq('id', id)
    if (error) throw error
  }
}