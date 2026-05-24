import { supabase } from '../supabase'

export const AssignmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('pastoral_assignments')
      .select(`
        *,
        pastor:pastors(id, full_name, role_title),
        church:churches(id, church_name)
      `)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByPastor(pastorId) {
    const { data, error } = await supabase
      .from('pastoral_assignments')
      .select(`
        *,
        church:churches(id, church_name)
      `)
      .eq('pastor_id', pastorId)
      .order('start_date', { ascending: false })
      
    if (error) throw error
    return data || []
  },

  async getByChurch(churchId) {
    const { data, error } = await supabase
      .from('pastoral_assignments')
      .select(`
        *,
        pastor:pastors(id, full_name, role_title, current_status_code)
      `)
      .eq('church_id', churchId)
      .order('start_date', { ascending: false })
      
    if (error) throw error
    return data || []
  },

  async create(payload) {
    const { data, error } = await supabase
      .from('pastoral_assignments')
      .insert([payload])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('pastoral_assignments')
      .update(payload)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('pastoral_assignments')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
