// Conference service — conferences, conference_days, and time_slots tables
const conferenceService = {
  getDaysBetween(start, end) {
    const dates = []
    const current = new Date(start)
    const endDate = new Date(end)

    // Strip time to avoid timezone drift in calculation
    current.setHours(0, 0, 0, 0)
    endDate.setHours(0, 0, 0, 0)

    while (current <= endDate) {
      const year = current.getFullYear()
      const month = String(current.getMonth() + 1).padStart(2, '0')
      const day = String(current.getDate()).padStart(2, '0')
      dates.push(`${year}-${month}-${day}`)
      current.setDate(current.getDate() + 1)
    }

    return dates
  },

  async fetchAll() {
    const { data, error } = await db
      .from('conferences')
      .select('id, title, theme, location, start_date, end_date')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data
  },

  async fetchDays(conferenceId) {
    const { data, error } = await db
      .from('conference_days')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('day_index', { ascending: true })

    if (error) throw error
    return data
  },

  async fetchTimeSlots(conferenceId) {
    const { data, error } = await db
      .from('time_slots')
      .select('*')
      .eq('conference_id', conferenceId)

    if (error) throw error
    return data
  },

  async create(title, theme, location, startDate, endDate, slotsMap = null) {
    const { data, error } = await db
      .from('conferences')
      .insert({
        title: title.trim(),
        theme: theme?.trim() ? theme.trim().toUpperCase() : null,
        location: location?.trim() ? location.trim().toUpperCase() : null,
        start_date: startDate || null,
        end_date: endDate || null
      })
      .select()
      .single()

    if (error) throw error
    const conf = data

    if (startDate && endDate) {
      const dates = this.getDaysBetween(startDate, endDate)

      const daysPayload = dates.map((dateStr, idx) => ({
        conference_id: conf.id,
        day_index: idx + 1,
        date: dateStr
      }))

      await db.from('conference_days').insert(daysPayload)

      const slotsPayload = [
        {
          id: crypto.randomUUID(),
          conference_id: conf.id,
          name: 'MORNING',
          start_time: '06:00',
          end_time: '09:30'
        },
        {
          id: crypto.randomUUID(),
          conference_id: conf.id,
          name: 'AFTERNOON',
          start_time: '11:00',
          end_time: '14:30'
        },
        {
          id: crypto.randomUUID(),
          conference_id: conf.id,
          name: 'EVENING',
          start_time: '16:30',
          end_time: '21:30'
        }
      ]

      await db.from('time_slots').insert(slotsPayload)

      const { data: dbDays } = await db
        .from('conference_days')
        .select('id, day_index')
        .eq('conference_id', conf.id)

      const { data: dbSlots } = await db
        .from('time_slots')
        .select('id, name')
        .eq('conference_id', conf.id)

      const mealsPayload = []

      if (dbDays && dbSlots) {
        dbDays.forEach((d) => {
          dbSlots.forEach((s) => {
            const key = `day-${d.day_index}-${s.name}`
            const isSelected = slotsMap ? (slotsMap[key] !== false) : true

            if (isSelected) {
              mealsPayload.push({
                conference_id: conf.id,
                day_id: d.id,
                slot_id: s.id,
                name: s.name,
                notes: ''
              })
            }
          })
        })

        if (mealsPayload.length > 0) {
          await db.from('meals').insert(mealsPayload)
        }
      }
    }

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(
        user.id,
        'CREATE_CONFERENCE',
        `Created Conference: ${conf.title}`
      )
    }

    return conf
  },

  async update(id, title, theme, location, startDate, endDate) {
    const { data, error } = await db
      .from('conferences')
      .update({
        title: title.trim(),
        theme: theme?.trim() ? theme.trim().toUpperCase() : null,
        location: location?.trim() ? location.trim().toUpperCase() : null,
        start_date: startDate,
        end_date: endDate
      })
      .eq('id', id)
      .select('id, title, theme, location, start_date, end_date')
      .single()

    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(
        user.id,
        'UPDATE_CONFERENCE',
        `Updated Conference settings: ${data.title}`
      )
    }

    return data
  },

  async remove(id) {
    const { data: attData, error: countErr } = await db
      .from('attendance')
      .select('id')
      .eq('conference_id', id)

    if (countErr) throw countErr
    if (attData && attData.length > 0) {
      const err = new Error('DELETE_PROTECTED')
      err.count = attData.length
      throw err
    }

    await db.from('meals').delete().eq('conference_id', id)
    await db.from('time_slots').delete().eq('conference_id', id)
    await db.from('conference_days').delete().eq('conference_id', id)

    const { error } = await db
      .from('conferences')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error

    const user = authService.getCurrentUser()
    if (user) {
      await authService.logAudit(
        user.id,
        'DELETE_CONFERENCE',
        `Soft-deleted Conference ID: ${id}`
      )
    }

    return true
  },

  async forceRemove(id) {
    await db.from('attendance').delete().eq('conference_id', id)
    await db.from('meals').delete().eq('conference_id', id)
    await db.from('time_slots').delete().eq('conference_id', id)
    await db.from('conference_days').delete().eq('conference_id', id)

    const { error } = await db
      .from('conferences')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) throw error
    return true
  }
}