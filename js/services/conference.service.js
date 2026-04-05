import { BaseService } from './base.service.js';
import { db } from '../db.js';

class ConferenceService extends BaseService {
  constructor() {
    super('conferences', 'id, title, theme, location, start_date, end_date');
  }

  // =========================
  // HELPERS
  // =========================
  _trim(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  _upperOrNull(value) {
    const v = this._trim(value);
    return v ? v.toUpperCase() : null;
  }

  _isValidDate(date) {
    return typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  _toDate(dateStr) {
    if (!this._isValidDate(dateStr)) return null;
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d));
  }

  getDaysBetween(start, end) {
    const s = this._toDate(start);
    const e = this._toDate(end);

    if (!s || !e) throw new Error('INVALID_DATE');
    if (s > e) throw new Error('START_AFTER_END');

    const dates = [];
    const current = new Date(s);

    while (current <= e) {
      const year = current.getUTCFullYear();
      const month = String(current.getUTCMonth() + 1).padStart(2, '0');
      const day = String(current.getUTCDate()).padStart(2, '0');
      dates.push(`${year}-${month}-${day}`);
      current.setUTCDate(current.getUTCDate() + 1);
    }

    return dates;
  }

  // =========================
  // FETCH
  // =========================
  async fetchAll() {
    const { data, error } = await db
      .from('conferences')
      .select('*')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async fetchDays(conferenceId) {
    const { data, error } = await db
      .from('conference_days')
      .select('*')
      .eq('conference_id', conferenceId)
      .order('day_index');

    if (error) throw error;
    return data || [];
  }

  async fetchTimeSlots(conferenceId) {
    const { data, error } = await db
      .from('time_slots')
      .select('*')
      .eq('conference_id', conferenceId);

    if (error) throw error;
    return data || [];
  }

  async fetchDaysBulk(ids) {
    if (!ids?.length) return [];

    const { data, error } = await db
      .from('conference_days')
      .select('*')
      .in('conference_id', ids)
      .order('day_index');

    if (error) throw error;
    return data || [];
  }

  async fetchTimeSlotsBulk(ids) {
    if (!ids?.length) return [];

    const { data, error } = await db
      .from('time_slots')
      .select('*')
      .in('conference_id', ids);

    if (error) throw error;
    return data || [];
  }

  // =========================
  // CREATE
  // =========================
  async create(title, theme, location, startDate, endDate, slotsMap = null) {
    const cleanTitle = this._trim(title);
    if (!cleanTitle) throw new Error('TITLE_REQUIRED');

    const conf = await super.create(
      {
        title: cleanTitle,
        theme: this._upperOrNull(theme),
        location: this._upperOrNull(location),
        start_date: startDate || null,
        end_date: endDate || null
      },
      'CREATE_CONFERENCE',
      `Created Conference: ${cleanTitle}`
    );

    if (!conf?.id) throw new Error('CREATE_FAILED');

    // =========================
    // CREATE DAYS + SLOTS
    // =========================
    if (startDate && endDate) {
      const dates = this.getDaysBetween(startDate, endDate);

      // DAYS
      const daysPayload = dates.map((d, i) => ({
        conference_id: conf.id,
        day_index: i + 1,
        date: d
      }));

      const { error: dayErr } = await db.from('conference_days').insert(daysPayload);
      if (dayErr) throw dayErr;

      // TIME SLOTS
      const slots = [
        { name: 'MORNING', start: '06:00', end: '09:30' },
        { name: 'AFTERNOON', start: '11:00', end: '14:30' },
        { name: 'EVENING', start: '16:30', end: '21:30' }
      ];

      const slotsPayload = slots.map(s => ({
        id: crypto.randomUUID(),
        conference_id: conf.id,
        name: s.name,
        start_time: s.start,
        end_time: s.end
      }));

      const { error: slotErr } = await db.from('time_slots').insert(slotsPayload);
      if (slotErr) throw slotErr;

      // FETCH BACK
      const { data: dbDays } = await db
        .from('conference_days')
        .select('id, day_index')
        .eq('conference_id', conf.id);

      const { data: dbSlots } = await db
        .from('time_slots')
        .select('id, name')
        .eq('conference_id', conf.id);

      // MEALS
      const meals = [];

      dbDays?.forEach(d => {
        dbSlots?.forEach(s => {
          const key = `day-${d.day_index}-${s.name}`;
          const allowed = slotsMap ? slotsMap[key] !== false : true;

          if (allowed) {
            meals.push({
              conference_id: conf.id,
              day_id: d.id,
              slot_id: s.id,
              name: s.name,
              notes: ''
            });
          }
        });
      });

      if (meals.length) {
        const { error } = await db.from('meals').insert(meals);
        if (error) throw error;
      }
    }

    return conf;
  }

  // =========================
  // UPDATE
  // =========================
  async update(id, title, theme, location, startDate, endDate) {
    const cleanTitle = this._trim(title);
    if (!cleanTitle) throw new Error('TITLE_REQUIRED');

    return super.update(
      id,
      {
        title: cleanTitle,
        theme: this._upperOrNull(theme),
        location: this._upperOrNull(location),
        start_date: startDate || null,
        end_date: endDate || null
      },
      'UPDATE_CONFERENCE',
      `Updated Conference: ${cleanTitle}`
    );
  }

  // =========================
  // DELETE (SAFE)
  // =========================
  async remove(id) {
    const { data } = await db
      .from('attendance')
      .select('id')
      .eq('conference_id', id);

    if (data?.length) {
      const err = new Error('DELETE_BLOCKED');
      err.count = data.length;
      throw err;
    }

    await db.from('meals').delete().eq('conference_id', id);
    await db.from('time_slots').delete().eq('conference_id', id);
    await db.from('conference_days').delete().eq('conference_id', id);

    return super.remove(id, 'DELETE_CONFERENCE', `Deleted Conference ${id}`);
  }

  // =========================
  // FORCE DELETE
  // =========================
  async forceRemove(id) {
    await db.from('attendance').delete().eq('conference_id', id);
    await db.from('meals').delete().eq('conference_id', id);
    await db.from('time_slots').delete().eq('conference_id', id);
    await db.from('conference_days').delete().eq('conference_id', id);

    const { error } = await db.from('conferences').delete().eq('id', id);
    if (error) throw error;

    return { id };
  }
}

export const conferenceService = new ConferenceService();