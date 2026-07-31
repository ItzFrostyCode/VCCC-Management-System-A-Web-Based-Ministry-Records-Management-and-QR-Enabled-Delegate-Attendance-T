import { supabase } from '../supabase'

export const PastorService = {
  async getAll(searchQuery = '') {
    let query = supabase
      .from('pastors')
      .select(`
        *,
        assignments(
          status_code,
          church:churches(id, church_name, district:districts(id, district_name))
        )
      `)
      .eq('is_deleted', false)
      .order('full_name')

    if (searchQuery) {
      query = query.or(`full_name.ilike.%${searchQuery}%,wife_name.ilike.%${searchQuery}%`)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('pastors')
      .select(`
        *,
        mentor:parent_id(id, full_name),
        disciples:pastors!parent_id(id, full_name)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()

    if (error) throw error
    return data
  },

  async create(payload, pastorImageFile, wifeImageFile) {
    const dataToInsert = { ...payload, is_deleted: false }
    delete dataToInsert.id
    if (!dataToInsert.parent_id) dataToInsert.parent_id = null
    if (!dataToInsert.district_id) dataToInsert.district_id = null
    
    if (pastorImageFile) {
        dataToInsert.pastor_image_url = await this.uploadImage(pastorImageFile, 'pastors')
    }
    if (wifeImageFile) {
        dataToInsert.wife_image_url = await this.uploadImage(wifeImageFile, 'wives')
    }

    const { data, error } = await supabase
      .from('pastors')
      .insert([dataToInsert])
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async update(id, payload, pastorImageFile, wifeImageFile) {
    const dataToUpdate = { ...payload }
    delete dataToUpdate.id
    if (!dataToUpdate.parent_id) dataToUpdate.parent_id = null
    if (!dataToUpdate.district_id) dataToUpdate.district_id = null
    
    if (pastorImageFile) {
        dataToUpdate.pastor_image_url = await this.uploadImage(pastorImageFile, 'pastors')
    }
    if (wifeImageFile) {
        dataToUpdate.wife_image_url = await this.uploadImage(wifeImageFile, 'wives')
    }

    const { data, error } = await supabase
      .from('pastors')
      .update(dataToUpdate)
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('pastors')
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
