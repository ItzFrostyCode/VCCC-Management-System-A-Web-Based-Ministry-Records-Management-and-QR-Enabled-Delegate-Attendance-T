// Attendance → attendance table

const attendanceService = {

  async checkDuplicate(conferenceId, dayId, slotId, delegateId) {
    const { data, error } = await db
      .from('attendance')
      .select('id, scanned_at')
      .eq('conference_id', conferenceId)
      .eq('day_id', dayId)
      .eq('slot_id', slotId)
      .eq('delegate_id', delegateId)
      .maybeSingle()

    if (error) throw error
    return data
  },

  async insert(conferenceId, dayId, slotId, delegateId, delegateType = null) {
    // 1. Manually check for duplicates
    const existing = await this.checkDuplicate(conferenceId, dayId, slotId, delegateId)
    if (existing) {
      const err = new Error('ALREADY_SCANNED')
      err.code = 'ALREADY_SCANNED'
      throw err
    }

    const { data, error } = await db
      .from('attendance')
      .insert({
        conference_id: conferenceId,
        day_id: dayId,
        slot_id: slotId,
        delegate_id: delegateId,
        delegate_type: delegateType, // Retained purely for local JS lookups
        scanned_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505' || error.message?.includes('duplicate')) {
        const err = new Error('ALREADY_SCANNED')
        err.code = 'ALREADY_SCANNED'
        throw err
      }
      throw error
    }

    return data
  },

  async countBySlot(dayId, slotId) {
    
    const { data, error } = await db
      .from('attendance')
      .select('id')
      .eq('day_id', dayId)

    if (error) throw error

    // Secondary filter — slot_id (needed because mock   only supports single .eq() for selects)
    const matches = (data || []).filter(a => a.slot_id === slotId)
    return matches.length
  },

  async countByConference(conferenceId) {
    const { data, error } = await db
      .from('attendance')
      .select('id')
      .eq('conference_id', conferenceId)

    if (error) throw error
    return data ? data.length : 0
  },

  async clearAll(conferenceId) {
    const { error } = await db
      .from('attendance')
      .delete()
      .eq('conference_id', conferenceId)
    if (error) throw error
  },

  async fetchByMeal(mealId) {
    // 1. Get meal info to find matching day/slot
    const { data: meal, error: mealErr } = await db
      .from('meals')
      .select('day_id, slot_id, conference_id')
      .eq('id', mealId)
      .maybeSingle()

    if (mealErr) throw mealErr
    if (!meal) return []

    // 2. Get attendance for that specific day+slot
    const { data, error } = await db
      .from('attendance')
      .select('*')
      .eq('conference_id', meal.conference_id)
      .eq('day_id', meal.day_id)
      .eq('slot_id', meal.slot_id)
    
    if (error) throw error
    return data || []
  },

  async fetchByConference(conferenceId) {
    const { data, error } = await db
      .from('attendance')
      .select('*')
      .eq('conference_id', conferenceId)

    if (error) throw error
    return data || []
  }
}
