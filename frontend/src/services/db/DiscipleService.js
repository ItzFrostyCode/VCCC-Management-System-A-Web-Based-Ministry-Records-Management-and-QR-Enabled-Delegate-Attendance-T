import { supabase } from '../supabase'

export const DiscipleService = {
  async getAll(searchQuery = '') {
    let query = supabase
      .from('disciples')
      .select(`
        *,
        church:churches(id, church_name, church_address, district:districts(id, district_name))
      `)
      .eq('is_deleted', false)
      .order('full_name')

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('disciples')
      .select(`
        *,
        church:churches(id, church_name, church_address, district:districts(id, district_name)),
        mentor:pastors(id, full_name)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
      
    if (error) throw error
    return data
  },

  async create(payload, discipleImageFile) {
    const dataToInsert = { ...payload, is_deleted: false }
    delete dataToInsert.id
    if (!dataToInsert.church_id) dataToInsert.church_id = null
    
    if (discipleImageFile) {
        dataToInsert.disciple_image_url = await this.uploadImage(discipleImageFile, 'disciples')
    }

    const { data, error } = await supabase
      .from('disciples')
      .insert([dataToInsert])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload, discipleImageFile) {
    const dataToUpdate = { ...payload }
    delete dataToUpdate.id
    if (!dataToUpdate.church_id) dataToUpdate.church_id = null
    
    if (discipleImageFile) {
        dataToUpdate.disciple_image_url = await this.uploadImage(discipleImageFile, 'disciples')
    }

    const { data, error } = await supabase
      .from('disciples')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('disciples')
      .update({ is_deleted: true })
      .eq('id', id)
      
    if (error) throw error
    return true
  },

  async uploadImage(file, bucket) {
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random()}.${fileExt}`
    const filePath = `${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
    return data.publicUrl
  }
}
