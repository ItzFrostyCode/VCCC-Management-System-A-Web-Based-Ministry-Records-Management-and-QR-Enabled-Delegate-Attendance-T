// ── State ─────────────────────────────────────────────────────────────────
let allDelegates    = []
let rawAttendance   = []
let conferenceDays  = []
let globalReportData = []
let allConferences  = []
let currentConference = null
let currentMeals    = []
let currentTimeSlots = []
let refreshInterval   = null
let currentFetchId     = 0
let confSearchSelect   = null

// ── Bootstrap ─────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()
  try {
    await initDelegateData()
    await initConferences()
  } catch (e) {
    console.error('Initial load failed:', e)
    document.getElementById('conf-select').innerHTML = `<option value="">Error connecting to Database: ${esc(e.message)}</option>`
    alert(`Database Connection Error:\n\n${e.message}\n\nDid you execute the Supabase SQL script?`)
  }
})

// ── Load delegates (pastors + wives + disciples) ─────────────────────────
async function initDelegateData() {
  try {
    const [pastors, disciples] = await Promise.all([
      pastorService.fetchAll(),
      discipleService.fetchAll()
    ])

    allDelegates = []

    pastors.forEach(p => {
      // PASTOR entry — keyed by pastor ID
      allDelegates.push({
        id:       p.id,
        fullName: p.full_name,
        role:     'PASTOR',
        church:   p.church_name   || '',
        district: p.district_name || '',
        // Attendance records for pastors use delegate_type='PASTOR', delegate_id=p.id
        attendanceKey: `PASTOR_${p.id}`
      })
      // WIFE entry — shares the SAME pastor ID, delegate_type='WIFE'
      if (p.wife_name && p.wife_name.trim()) {
        allDelegates.push({
          id:       p.id,       // BUG FIX: wife shares pastor's id in attendance table
          fullName: p.wife_name,
          role:     'WIFE',
          church:   p.church_name   || '',
          district: p.district_name || '',
          attendanceKey: `WIFE_${p.id}`
        })
      }
    })

    disciples.forEach(d => {
      allDelegates.push({
        id:       d.id,
        fullName: d.full_name,
        role:     'DISCIPLE',
        church:   d.church_name   || '',
        district: d.district_name || '',
        attendanceKey: `DISCIPLE_${d.id}`
      })
    })
  } catch (err) {
    console.error('Failed to load delegates:', err)
  }
}

// ── Load conference dropdown ───────────────────────────────────────────────
async function initConferences() {
  const container = document.getElementById('conf-select-container')
  try {
    const conferences = await conferenceService.fetchAll()
    allConferences = conferences

    const opts = conferences.map(c => ({ value: c.id, label: c.title }))
    
    confSearchSelect = createSearchSelect(
      container, 
      opts, 
      'Select a conference to view report...', 
      (val) => loadGlobalReport(val)
    )
  } catch (err) {
    console.error('Failed to load conferences:', err)
    container.innerHTML = '<div style="color:var(--red); font-size:12px;">Error loading conferences</div>'
  }
}

// ── Load global report for a conference ────────────────────────────────────
async function loadGlobalReport(confId) {
  const results   = document.getElementById('results-section')
  const prompt    = document.getElementById('empty-prompt')
  const btnExport = document.getElementById('btn-export')

  // Increment fetch ID to ignore previous pending requests
  const fetchId = ++currentFetchId
  
  // Clear old interval immediately when switching
  if (refreshInterval) {
    clearInterval(refreshInterval)
    refreshInterval = null
  }

  if (!confId) {
    results.style.display   = 'none'
    prompt.style.display    = 'block'
    btnExport.style.display = 'none'
    currentConference = null
    currentMeals      = []
    currentTimeSlots  = []
    globalReportData  = []
    
    // Clear timestamp
    const timeLabel = document.getElementById('last-updated')
    if (timeLabel) timeLabel.textContent = ''
    return
  }

  // Update currentConference immediately
  currentConference = allConferences.find(c => c.id === confId) || null

  const btnRefresh = document.getElementById('btn-refresh')
  if (btnRefresh) btnRefresh.style.display = confId ? 'inline-flex' : 'none'

  // Show "Loading..." state in results
  if (confId) {
    results.style.display = 'block'
    prompt.style.display  = 'none'
    // Clear old data displays to avoid confusion
    document.getElementById('summary-cards').innerHTML = `
      <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-3);">
        <div class="spinning" style="margin-bottom: 12px;"><svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"></path><path d="M1 20v-6h6"></path><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg></div>
        Fetching report data...
      </div>`
    document.getElementById('global-list-body').innerHTML = `<tr><td colspan="3" style="padding: 40px; text-align: center; color: var(--text-3);">Loading delegate status...</td></tr>`
  }

  try {
    // Fetch all data in parallel
    const [days, attendance, meals, timeSlots] = await Promise.all([
      conferenceService.fetchDays(confId),
      attendanceService.fetchByConference(confId),
      mealService.fetchByConference(confId),
      conferenceService.fetchTimeSlots(confId)
    ])

    // If a newer request has started, ignore this one
    if (fetchId !== currentFetchId) return

    conferenceDays   = days        || []
    rawAttendance    = attendance  || []
    currentMeals     = meals       || []
    currentTimeSlots = timeSlots   || []

    // Build a lookup: slot_id → time_slot record (has .name = 'MORNING' / 'AFTERNOON' / 'EVENING')
    const slotLookup = {}
    currentTimeSlots.forEach(s => { slotLookup[s.id] = s })

    // Build a lookup: day_id → conference_day record (has .day_index)
    const dayLookup = {}
    conferenceDays.forEach(d => { dayLookup[d.id] = d })

    // Enrich meals with resolved day_number + slot_name
    currentMeals = currentMeals.map(m => ({
      ...m,
      day_number: dayLookup[m.day_id]?.day_index ?? '?',
      slot_name:  slotLookup[m.slot_id]?.name    ?? m.name ?? 'Slot'
    }))

    // Build unified report map keyed by attendanceKey (role_delegateId)
    const reportMap = new Map()

    allDelegates.forEach(d => {
      reportMap.set(d.attendanceKey, {
        delegate:    d,
        scans:       {},   // scanKey: "day_id-slot_id" → attendance record
        totalScans:  0
      })
    })

    // Populate scans — attendance.delegate_type matches role, delegate_id matches id
    rawAttendance.forEach(a => {
      const key = `${a.delegate_type}_${a.delegate_id}`
      if (reportMap.has(key)) {
        const record   = reportMap.get(key)
        const scanKey  = `${a.day_id}_${a.slot_id}`
        // Guard: only count each slot once (avoid duplicate entries)
        if (!record.scans[scanKey]) {
          record.scans[scanKey] = a
          record.totalScans++
        }
      }
    })

    globalReportData = Array.from(reportMap.values())

    results.style.display   = 'block'
    prompt.style.display    = 'none'
    btnExport.style.display = 'flex'

    renderSummaryCards()
    renderGlobalList()

    // Update timestamp
    const now = new Date()
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    const timeLabel = document.getElementById('last-updated')
    if (timeLabel) timeLabel.textContent = `Last updated: ${timeStr}`

    // Setup refresh interval ONLY after successful load and if it's still the active request
    if (confId && !refreshInterval && fetchId === currentFetchId) {
      refreshInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          console.log('🔄 Auto-refreshing report...')
          refreshReport(true)
        }
      }, 60000)
    }

  } catch (err) {
    console.error('loadGlobalReport error:', err)
    alert('Error loading global report: ' + err.message)
  }
}

// ── Summary Cards ─────────────────────────────────────────────────────────
function renderSummaryCards() {
  const container     = document.getElementById('summary-cards')
  const totalDelegates = allDelegates.length

  let totalActive  = 0
  let totalMissing = 0
  let pastScans    = 0
  let wifeScans    = 0
  let discScans    = 0

  globalReportData.forEach(row => {
    if (row.totalScans > 0) {
      totalActive++
      if (row.delegate.role === 'PASTOR')   pastScans++
      if (row.delegate.role === 'WIFE')     wifeScans++
      if (row.delegate.role === 'DISCIPLE') discScans++
    } else {
      totalMissing++
    }
  })

  const pct = totalDelegates ? Math.round((totalActive / totalDelegates) * 100) : 0

  container.innerHTML = `
    <div class="card" style="padding:20px; border-left:4px solid var(--red);">
      <div style="font-size:12px; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:8px;">Total Active Attendees</div>
      <div style="font-size:32px; font-weight:800; color:var(--text); line-height:1;">${totalActive} <span style="font-size:14px; font-weight:500; color:var(--text-3);">/ ${totalDelegates}</span></div>
      <div style="margin-top:12px; height:6px; background:var(--bg-input); border-radius:3px; overflow:hidden;">
        <div style="width:${pct}%; height:100%; background:var(--red); border-radius:3px;"></div>
      </div>
      <div style="font-size:12px; color:var(--red); font-weight:600; margin-top:4px;">${pct}% Engagement</div>
    </div>

    <div class="card" style="padding:20px; border-left:4px solid #e2e8f0;">
      <div style="font-size:12px; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:8px;">Missing Delegates</div>
      <div style="font-size:32px; font-weight:800; color:var(--text-2); line-height:1;">${totalMissing}</div>
      <div style="font-size:12px; color:var(--text-3); margin-top:12px;">Have not scanned at all during this conference.</div>
    </div>

    <div class="card" style="padding:20px; border-left:4px solid var(--blue);">
      <div style="font-size:12px; color:var(--text-3); font-weight:600; text-transform:uppercase; margin-bottom:8px;">Active Breakdown</div>
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
        <div style="display:flex; justify-content:space-between; font-size:13px;"><span><span class="l-avatar la-p" style="display:inline-flex; width:16px; height:16px; font-size:10px; margin-right:6px;">P</span>Pastors</span> <strong>${pastScans}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:13px;"><span><span class="l-avatar la-w" style="display:inline-flex; width:16px; height:16px; font-size:10px; margin-right:6px;">W</span>Wives</span> <strong>${wifeScans}</strong></div>
        <div style="display:flex; justify-content:space-between; font-size:13px;"><span><span class="l-avatar la-d" style="display:inline-flex; width:16px; height:16px; font-size:10px; margin-right:6px;">D</span>Disciples</span> <strong>${discScans}</strong></div>
      </div>
    </div>
  `
}

// ── Global Delegate List ──────────────────────────────────────────────────
function renderGlobalList() {
  const container   = document.getElementById('global-list-body')
  const searchInput = document.getElementById('log-search')
  const search      = searchInput ? searchInput.value.toLowerCase().trim() : ''

  // BUG FIX: Do NOT sort globalReportData in-place; work on a copy
  let list = [...globalReportData]

  if (search) {
    list = list.filter(row => {
      const d = row.delegate
      // BUG FIX: null-guard church and district before calling .toLowerCase()
      return (
        (d.fullName || '').toLowerCase().includes(search) ||
        (d.church   || '').toLowerCase().includes(search) ||
        (d.district || '').toLowerCase().includes(search) ||
        (d.role     || '').toLowerCase().includes(search)
      )
    })
  }

  // Sort: Missing at top, then alphabetical
  list.sort((a, b) => {
    if (a.totalScans === 0 && b.totalScans > 0) return -1
    if (a.totalScans > 0 && b.totalScans === 0) return 1
    return (a.delegate.fullName || '').localeCompare(b.delegate.fullName || '')
  })

  if (!list.length) {
    container.innerHTML = `<tr><td colspan="3" style="padding:40px;text-align:center;color:var(--text-3);font-size:13px;">No delegates found matching criteria.</td></tr>`
    return
  }

  container.innerHTML = list.map(row => {
    const d = row.delegate
    const statusPill = row.totalScans > 0
      ? `<span style="display:inline-block; padding:4px 10px; background:var(--green-bg); color:var(--green); border-radius:12px; font-size:11px; font-weight:700;">Active (${row.totalScans} scans)</span>`
      : `<span style="display:inline-block; padding:4px 10px; background:var(--bg-input); color:var(--text-3); border-radius:12px; font-size:11px; font-weight:600;">Missing</span>`

    return `
    <tr style="border-bottom:1px solid var(--border-light);">
      <td style="padding:12px 16px;">
        <div style="display:flex; align-items:center; gap:10px;">
          <div class="l-avatar ${avClass(d.role)}">${(d.role || 'X')[0]}</div>
          <div>
            <div style="font-size:13px; font-weight:600; color:var(--text);">${esc(d.fullName)}</div>
            <span class="pill ${pillClass(d.role)}" style="font-size:9px; margin-top:4px;">${d.role}</span>
          </div>
        </div>
      </td>
      <td style="padding:12px 16px; font-size:12px; color:var(--text-2);">
        <div style="font-weight:500;">${esc(d.church)}</div>
        <div style="color:var(--text-3); font-size:11px;">${esc(d.district)}</div>
      </td>
      <td style="padding:12px 16px;">${statusPill}</td>
    </tr>`
  }).join('')
}

// ── Excel Export ──────────────────────────────────────────────────────────
function exportToExcel() {
  if (!globalReportData.length || !currentConference) {
    alert('No data to export.')
    return
  }

  const aoa = []

  // Conference header rows
  aoa.push([`Conference Report: ${currentConference.title || ''}`])
  aoa.push([
    `Start Date: ${currentConference.start_date || 'N/A'}`,
    '',
    `End Date: ${currentConference.end_date || 'N/A'}`
  ])
  aoa.push([]) // spacer

  // BUG FIX: Sort by day_number (resolved) then slot order
  const slotOrder = { 'MORNING': 1, 'AFTERNOON': 2, 'EVENING': 3 }
  const sortedMeals = [...currentMeals].sort((a, b) => {
    if (a.day_number !== b.day_number) return (a.day_number || 0) - (b.day_number || 0)
    return (slotOrder[a.slot_name] || 99) - (slotOrder[b.slot_name] || 99)
  })

  // Column headers — BUG FIX: use resolved slot_name not missing part_of_day
  const colHeaders = ['Role', 'Full Name', 'District', 'Church', 'Overall Status', 'Total Scans']
  sortedMeals.forEach(m => {
    const label = m.slot_name
      ? (m.slot_name.charAt(0).toUpperCase() + m.slot_name.slice(1).toLowerCase())
      : 'Slot'
    colHeaders.push(`Day ${m.day_number} - ${label}`)
  })
  aoa.push(colHeaders)

  // Data rows
  globalReportData.forEach(row => {
    const d = row.delegate
    const dataRow = [
      d.role,
      d.fullName,
      d.district,
      d.church,
      row.totalScans > 0 ? 'Active' : 'Missing',
      row.totalScans
    ]

    sortedMeals.forEach(m => {
      const scanKey    = `${m.day_id}_${m.slot_id}`
      const scanRecord = row.scans[scanKey]

      if (scanRecord && scanRecord.scanned_at) {
        const t = new Date(scanRecord.scanned_at)
        dataRow.push(`Scanned ${t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
      } else if (scanRecord) {
        dataRow.push('Scanned')
      } else {
        dataRow.push('--')
      }
    })

    aoa.push(dataRow)
  })

  try {
    const worksheet = XLSX.utils.aoa_to_sheet(aoa)
    const workbook  = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Global Report')

    const colWidths = [
      { wch: 12 }, // Role
      { wch: 32 }, // Full Name
      { wch: 22 }, // District
      { wch: 26 }, // Church
      { wch: 15 }, // Status
      { wch: 12 }, // Total Scans
    ]
    sortedMeals.forEach(() => colWidths.push({ wch: 20 }))
    worksheet['!cols'] = colWidths

    const safeName = (currentConference.title || 'Report').replace(/[^a-z0-9]/gi, '_')
    const date     = new Date().toISOString().split('T')[0]
    XLSX.writeFile(workbook, `VCCC_Report_${safeName}_${date}.xlsx`)
  } catch (err) {
    console.error('Export failed:', err)
    alert('Export failed. Ensure the SheetJS library is loaded correctly.')
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function avClass(role) {
  if (role === 'PASTOR')   return 'la-p'
  if (role === 'WIFE')     return 'la-w'
  if (role === 'DISCIPLE') return 'la-d'
  return ''
}
function pillClass(role) {
  if (role === 'PASTOR')   return 'pill-pastor'
  if (role === 'WIFE')     return 'pill-wife'
  if (role === 'DISCIPLE') return 'pill-disciple'
  return 'pill-gray'
}
function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── Manual Refresh ────────────────────────────────────────────────────────
async function refreshReport(isAuto = false) {
  if (!currentConference) return
  
  const btn = document.getElementById('btn-refresh')
  if (btn && !isAuto) {
    btn.disabled = true
    btn.classList.add('spinning')
    btn.style.opacity = '0.5'
  }

  try {
    // Re-fetch all delegate metadata in case new pastors/disciples were added
    await initDelegateData()
    // Re-run the report logic
    await loadGlobalReport(currentConference.id)
  } catch (e) {
    console.error('Refresh failed:', e)
  } finally {
    if (btn && !isAuto) {
      btn.disabled = false
      btn.classList.remove('spinning')
      btn.style.opacity = '1'
    }
  }
}
