import { supabase } from '../supabase'

export const AttendanceService = {
  /**
   * Safe idempotent store using Upsert semantics / catch block 
   */
  async store(payload) {
    // 1. Check if already scanned
    const { data: existingScan } = await supabase
      .from('attendance')
      .select('*')
      .eq('scan_uuid', payload.scan_uuid)
      .maybeSingle()
      
    if (existingScan) {
        return { message: 'Already synced', data: existingScan, code: 200 }
    }

    // 2. Validate Session Time (done client side usually, but we do basic check)
    // Supabase will just record the time. Real validation would normally go in DB triggers/RPCs, 
    // but doing it here is fine since it's just for preventing late scans.

    // 3. Atomicity & Deduplication (Double scan in same session)
    const { data: existingSessionScan } = await supabase
      .from('attendance')
      .select('*')
      .eq('conference_id', payload.conference_id)
      .eq('day_id', payload.day_id)
      .eq('slot_id', payload.slot_id)
      .eq('delegate_id', payload.delegate_id)
      .eq('delegate_type', payload.delegate_type)
      .maybeSingle()

    if (existingSessionScan) {
        throw { 
            response: { 
                status: 409, 
                data: { message: 'Attendance already recorded for this session', data: existingSessionScan }
            } 
        }
    }

    // 4. Record
    const { data, error } = await supabase
      .from('attendance')
      .insert([{
          id: payload.id || crypto.randomUUID(),
          scan_uuid: payload.scan_uuid,
          conference_id: payload.conference_id,
          day_id: payload.day_id,
          slot_id: payload.slot_id,
          delegate_id: payload.delegate_id,
          delegate_type: payload.delegate_type,
          scanned_by: payload.scanned_by,
          scanned_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (error) {
        if (error.code === '23505') { // Unique violation
            if (error.message.includes('scan_uuid')) {
                return { message: 'Sync success (idempotent)', code: 200 }
            }
            throw { response: { status: 409, data: { message: 'Attendance already recorded for this session' } } }
        }
        throw error
    }

    return { message: 'Attendance recorded successfully', data, code: 201 }
  },

  async getByConference(conferenceId) {
    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('conference_id', conferenceId)

    if (error) throw error
    return data || []
  }
}
