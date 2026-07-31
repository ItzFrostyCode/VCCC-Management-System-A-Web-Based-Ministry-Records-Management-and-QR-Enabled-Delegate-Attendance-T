import { supabase } from '../supabase'

export const DistrictService = {
  async getAll() {
    const { data, error } = await supabase
      .from('districts')
      .select('*, leader:pastors(id, full_name, pastor_image_url)')
      .eq('is_deleted', false)
      .order('district_name')

    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('districts')
      .select(`
        *,
        leader:pastors(id, full_name, pastor_image_url),
        churches(
          id, church_name, is_deleted,
          assignments(status_code, pastor:pastors(id, full_name, is_deleted))
        )
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
      
    if (error) throw error
    
    // Filter out deleted relations
    if (data && data.churches) {
        data.churches = data.churches.filter(c => !c.is_deleted).map(c => {
            if (c.assignments) {
                c.assignments = c.assignments.filter(a => a.status_code === 'active' && a.pastor && !a.pastor.is_deleted)
            }
            return c
        })
    }
    
    return data
  },

  async create(payload) {
    const dataToInsert = { ...payload, is_deleted: false }
    delete dataToInsert.id
    if (!dataToInsert.leader_id) dataToInsert.leader_id = null

    const { data, error } = await supabase
      .from('districts')
      .insert([dataToInsert])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload) {
    const dataToUpdate = { ...payload }
    delete dataToUpdate.id
    if (!dataToUpdate.leader_id) dataToUpdate.leader_id = null

    const { data, error } = await supabase
      .from('districts')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('districts')
      .update({ is_deleted: true })
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
