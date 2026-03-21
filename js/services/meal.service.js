// Meal service for new schema: meals table connects day_id and slot_id

const mealService = {

  async fetchByConference(conferenceId) {
    const { data, error } = await db
      .from('meals')
      .select('*')
      .eq('conference_id', conferenceId)

    if (error) throw error
    return data
  },

  async create(conferenceId, dayId, slotId, name, notes) {
    const { data, error } = await db
      .from('meals')
      .insert({
        conference_id: conferenceId,
        day_id: dayId,
        slot_id: slotId,
        name: name || null,
        notes: notes || null
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async createBulk(meals) {
    const { data, error } = await db
      .from('meals')
      .insert(meals)
      .select()

    if (error) throw error
    return data
  },

  async remove(id, dayId, slotId) {
    // Delete Protection
    const { data: attData, error: countErr } = await db
      .from('attendance')
      .select('id')
      .eq('day_id', dayId)

    if (countErr) throw countErr

    // Filtering manually here to support simplified local mock limitations
    const matches = (attData || []).filter(a => a.slot_id === slotId)
    if (matches.length > 0) {
      throw new Error(`Cannot delete: This meal slot has ${matches.length} scan records.`)
    }

    const { error } = await db
      .from('meals')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}