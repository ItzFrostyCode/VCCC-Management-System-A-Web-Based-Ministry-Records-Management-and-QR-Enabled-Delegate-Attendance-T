document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()
  loadStats()
  loadRecentScans()
  loadSlotAttendance()

  document.getElementById('global-search').addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.value.trim()) {
      window.location.href = `/pages/pastors.html?q=${encodeURIComponent(e.target.value.trim())}`
    }
  })
})

async function loadStats() {
  const [
    { count: pastorCount },
    { count: wifeCount   },
    { count: discCount   },
    { count: scanCount   },
    { count: confCount   }
  ] = await Promise.all([
    db.from('pastors').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    db.from('pastors').select('*', { count: 'exact', head: true }).eq('is_deleted', false).not('wife_name', 'is', null),
    db.from('disciples').select('*', { count: 'exact', head: true }).eq('is_deleted', false),
    db.from('attendance').select('*', { count: 'exact', head: true }),
    db.from('conferences').select('*', { count: 'exact', head: true }).eq('is_deleted', false)
  ])

  const total = (pastorCount || 0) + (wifeCount || 0) + (discCount || 0)

  const update = (id, val) => {
    const el = document.getElementById(id)
    if (el) {
      el.classList.remove('skeleton')
      el.style.height = 'auto'
      el.style.width = 'auto'
      el.textContent = val || 0
    }
  }

  update('stat-pastors',  pastorCount)
  update('stat-disciples', discCount)
  update('stat-total',    total)
  update('stat-scans',    scanCount)
  update('stat-confs',    confCount)

  const wifeEl = document.getElementById('stat-wife-count')
  if (wifeEl) wifeEl.textContent = `${wifeCount || 0} with wife registered`
}

async function loadRecentScans() {
  const el = document.getElementById('recent-scans-list')
  try {
    const rows = await attendanceService.fetchRecent(8)
    if (!rows.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-title">No scans yet</div></div>`
      return
    }
    el.innerHTML = rows.map(r => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border);">
        <div style="width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;${avatarStyle(r.delegate_type)}">${(r.delegate_type||'?')[0]}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:500;">ID: ${(r.delegate_id||'').slice(0,8)}...</div>
          <div style="font-size:11px;color:var(--text-3);">${formatDateTime(r.scanned_at)}</div>
        </div>
        <span class="pill ${pillClass(r.delegate_type)}">${r.delegate_type}</span>
      </div>
    `).join('')
  } catch(e) {
    el.innerHTML = `<div class="empty-state"><div class="empty-title">Could not load scans</div></div>`
  }
}

async function loadSlotAttendance() {
  const el = document.getElementById('meal-bars-list')
  try {
    // Get latest conference
    const { data: confs } = await db.from('conferences')
      .select('id,title')
      .eq('is_deleted', false)
      .order('start_date', { ascending: false })
      .limit(1)

    if (!confs || !confs.length) {
      el.innerHTML = `<div style="padding:16px;font-size:13px;color:var(--text-3)">No conferences yet. <a href="/pages/conferences.html" style="color:var(--red)">Add one</a></div>`
      return
    }

    // Fetch time_slots for this conference
    const slots = await conferenceService.fetchTimeSlots(confs[0].id)
    if (!slots || !slots.length) {
      el.innerHTML = `<div style="padding:16px;font-size:13px;color:var(--text-3)">No time slots configured for this conference.</div>`
      return
    }

    // Count attendance per slot
    const counts = await Promise.all(slots.map(async s => {
      const { count } = await db.from('attendance')
        .select('*', { count: 'exact', head: true })
        .eq('slot_id', s.id)
      return count || 0
    }))

    const max     = Math.max(...counts, 1)
    const EMOJI   = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌙' }

    el.innerHTML = slots.map((s, i) => {
      const label = `${EMOJI[s.name] || '⏱'} ${s.name}`
      const pct   = Math.round(counts[i] / max * 100)
      return `
        <div style="display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);">
          <div style="font-size:12px;color:var(--text-2);width:120px;flex-shrink:0;">${label}</div>
          <div style="flex:1;height:8px;background:var(--bg-input);border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:var(--red);border-radius:4px;transition:width .4s;"></div>
          </div>
          <div style="font-size:12px;font-weight:600;width:28px;text-align:right;">${counts[i]}</div>
        </div>`
    }).join('')
  } catch(e) {
    console.error('loadSlotAttendance:', e)
    el.innerHTML = `<div style="padding:16px;font-size:13px;color:var(--text-3)">Could not load attendance data.</div>`
  }
}

function avatarStyle(type) {
  if (type === 'PASTOR')   return 'background:var(--red-light);color:var(--red-dark);'
  if (type === 'WIFE')     return 'background:var(--blue-bg);color:var(--blue);'
  if (type === 'DISCIPLE') return 'background:var(--green-bg);color:var(--green);'
  return ''
}
function pillClass(type) {
  if (type === 'PASTOR')   return 'pill-pastor'
  if (type === 'WIFE')     return 'pill-wife'
  if (type === 'DISCIPLE') return 'pill-disciple'
  return 'pill-gray'
}