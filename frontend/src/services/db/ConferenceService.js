import { supabase } from '../supabase'

export const ConferenceService = {
  async getAll() {
    const { data, error } = await supabase
      .from('conferences')
      .select('*')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('conferences')
      .select(`
        *,
        days:conference_days(*),
        timeSlots:time_slots(*)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single()
      
    if (error) throw error
    return data
  },

  async create(payload, slotsMap) {
    // 1. Create Conference
    const { data: conf, error: confError } = await supabase
      .from('conferences')
      .insert([{ 
          title: payload.title, 
          theme: payload.theme?.toUpperCase() || '', 
          location: payload.location?.toUpperCase() || '', 
          start_date: payload.start_date, 
          end_date: payload.end_date,
          is_deleted: false 
      }])
      .select()
      .single()
      
    if (confError) throw confError

    // 2. Generate Days
    const startDate = new Date(payload.start_date)
    const endDate = new Date(payload.end_date)
    const daysData = []
    let index = 1
    
    for (let d = startDate; d <= endDate; d.setDate(d.getDate() + 1)) {
        daysData.push({
            conference_id: conf.id,
            day_index: index++,
            date: d.toISOString().split('T')[0]
        })
    }
    
    const { data: dbDays, error: daysError } = await supabase
      .from('conference_days')
      .insert(daysData)
      .select()
      
    if (daysError) throw daysError

    // 3. Generate Time Slots
    const slots = [
        { name: 'MORNING', start_time: '06:00:00', end_time: '09:30:00' },
        { name: 'AFTERNOON', start_time: '11:00:00', end_time: '13:00:00' },
        { name: 'EVENING', start_time: '16:00:00', end_time: '20:30:00' },
    ]
    
    const slotsData = slots.map(s => ({
        conference_id: conf.id,
        name: s.name,
        start_time: s.start_time,
        end_time: s.end_time
    }))

    const { data: dbSlots, error: slotsError } = await supabase
      .from('time_slots')
      .insert(slotsData)
      .select()
      
    if (slotsError) throw slotsError

    // 4. Generate Meals based on slotsMap
    const mealsData = []
    for (const day of dbDays) {
        for (const slot of dbSlots) {
            const key = `day-${day.day_index}-${slot.name}`
            const allowed = slotsMap[key] !== undefined ? slotsMap[key] : true
            
            if (allowed) {
                mealsData.push({
                    conference_id: conf.id,
                    day_id: day.id,
                    slot_id: slot.id,
                    name: slot.name,
                    notes: ''
                })
            }
        }
    }
    
    if (mealsData.length > 0) {
        const { error: mealsError } = await supabase.from('meals').insert(mealsData)
        if (mealsError) throw mealsError
    }

    return conf
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from('conferences')
      .update({
          title: payload.title,
          theme: payload.theme?.toUpperCase() || '',
          location: payload.location?.toUpperCase() || '',
          start_date: payload.start_date,
          end_date: payload.end_date
      })
      .eq('id', id)
      .select()
      .single()
      
    if (error) throw error
    return data
  },

  async softDelete(id) {
    const { error } = await supabase
      .from('conferences')
      .update({ is_deleted: true })
      .eq('id', id)
      
    if (error) throw error
    return true
  }
}
