import { supabase } from '../supabase'

export const ChurchService = {
  async getAll() {
    const { data, error } = await supabase
      .from('churches')
      .select(`
        *,
        district:districts(id, district_name),
        pastors(id, full_name, is_deleted)
      `)
      .eq('is_deleted', false)
      .order('church_name')

    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('churches')
      .select(`
        *,
        district:districts(id, district_name),
        pastors(id, full_name, role_title, current_status_code, pastor_image_url, is_deleted)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
      
    if (error) throw error
    
    if (data && data.pastors) {
        data.pastors = data.pastors.filter(p => !p.is_deleted)
    }
    
    return data
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('churches')
      .insert([{ ...payload, is_deleted: false }])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('churches')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('churches')
      .update({ is_deleted: true })
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
