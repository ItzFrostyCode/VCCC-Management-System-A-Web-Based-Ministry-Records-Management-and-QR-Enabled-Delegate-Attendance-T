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
      id: p.id,
      full_name: p.full_name,
      wife_name: p.wife_name || '',
      church_id: p.church_id,
      district_id: p.district_id,
      church_name: p.churches?.name || '',
      district_name: p.districts?.name || ''
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
      id: data.id,
      full_name: data.full_name,
      wife_name: data.wife_name || '',
      church_id: data.church_id,
      district_id: data.district_id,
      church_name: data.churches?.name || '',
      district_name: data.districts?.name || ''
    }
  },

  async create(fullName, wifeName, churchId, districtId) {
    const { data, error } = await db
      .from('pastors')
      .insert({
        full_name: fullName.trim().toUpperCase(),
        wife_name: wifeName.trim() ? wifeName.trim().toUpperCase() : null,
        church_id: churchId,
        district_id: districtId
      })
      .select(`
        id, full_name, wife_name, church_id, district_id,
        churches ( id, name ),
        districts ( id, name )
      `)
      .single()

    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(
        user.id,
        'CREATE_PASTOR',
        `Added Pastor: ${data.full_name}`
      )
    }

    return {
      id: data.id,
      full_name: data.full_name,
      wife_name: data.wife_name || '',
      church_id: data.church_id,
      district_id: data.district_id,
      church_name: data.churches?.name || '',
      district_name: data.districts?.name || ''
    }
  },

  async update(id, fullName, wifeName, churchId, districtId) {
    const { data, error } = await db
      .from('pastors')
      .update({
        full_name: fullName.trim().toUpperCase(),
        wife_name: wifeName.trim() ? wifeName.trim().toUpperCase() : null,
        church_id: churchId,
        district_id: districtId
      })
      .eq('id', id)
      .select(`
        id, full_name, wife_name, church_id, district_id,
        churches ( id, name ),
        districts ( id, name )
      `)
      .single()

    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(
        user.id,
        'UPDATE_PASTOR',
        `Updated Pastor: ${data.full_name}`
      )
    }

    return {
      id: data.id,
      full_name: data.full_name,
      wife_name: data.wife_name || '',
      church_id: data.church_id,
      district_id: data.district_id,
      church_name: data.churches?.name || '',
      district_name: data.districts?.name || ''
    }
  },

  async remove(id) {
    const { data: p, error: fetchErr } = await db
      .from('pastors')
      .select('full_name')
      .eq('id', id)
      .single()

    if (fetchErr) throw fetchErr

    const { error } = await db
      .from('pastors')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error

    const user = authService.getCurrentUser()
    if (user && p) {
      await authService.logAudit(
        user.id,
        'DELETE_PASTOR',
        `Removed Pastor: ${p.full_name}`
      )
    }

    return true
  }
}