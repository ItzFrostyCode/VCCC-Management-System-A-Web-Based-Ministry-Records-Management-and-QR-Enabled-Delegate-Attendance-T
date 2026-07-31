import { supabase } from '../supabase'

export const AssignmentService = {
  async getAll() {
    const { data, error } = await supabase
      .from('assignments')
      .select(`
        *,
        pastor:pastors(id, full_name),
        church:churches(id, church_name)
      `)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getByPastor(pastorId) {
    const { data, error } = await supabase
      .from('assignments')
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
      .from('assignments')
      .select(`
        *,
        pastor:pastors(id, full_name, current_status_code)
      `)
      .eq('church_id', churchId)
      .order('start_date', { ascending: false })
      
    if (error) throw error
    return data || []
  },

  async create(payload) {
    const dataToInsert = { ...payload }
    delete dataToInsert.id
    if (!dataToInsert.pastor_id) dataToInsert.pastor_id = null
    if (!dataToInsert.church_id) dataToInsert.church_id = null
    if (!dataToInsert.end_date) dataToInsert.end_date = null

    const { data, error } = await supabase
      .from('assignments')
      .insert([dataToInsert])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const dataToUpdate = { ...payload }
    delete dataToUpdate.id
    if (!dataToUpdate.pastor_id) dataToUpdate.pastor_id = null
    if (!dataToUpdate.church_id) dataToUpdate.church_id = null
    if (!dataToUpdate.end_date) dataToUpdate.end_date = null

    const { data, error } = await supabase
      .from('assignments')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async delete(id) {
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
