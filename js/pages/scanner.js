// ══════════════════════════════════════════════════════════════
//  VCCC Scanner — Time-Driven State Machine (fixed)
//  2-Panel layout: Days (left) + Logs (right)
//  Slot states: active | disabled | closed | locked
// ══════════════════════════════════════════════════════════════

// ─── Camera & Scan Engine (html5-qrcode) ────────────────────
let html5QrCode = null
let isProcessing = false

// ─── Conference State ────────────────────────────────────────
let activeConf = null
let confDays = []
let confSlots = []

// ─── Session (currently scanning slot) ───────────────────────
let currentSession = null   // { day, slot }
let activeSlotId = null      // computed by tick

// ─── Anti-spam ───────────────────────────────────────────────
let lastQR = null
let lastQRTime = 0
let lastScannedId = null // Track last ID to prevent accidental double-taps
const LOCK_MS = 10000    // 10 second cooldown for the same QR

// ─── Test Mode ───────────────────────────────────────────────
let isTestMode = false

// ─── Log Panel ───────────────────────────────────────────────
let allLogs = []
let activeFilter = 'all'

// ─── Slot metadata ───────────────────────────────────────────
const SLOT_EMOJI = { MORNING: '🌅', AFTERNOON: '☀️', EVENING: '🌙' }

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  INIT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()

  video = document.getElementById('cam-video')
  canvas = document.createElement('canvas')
  ctx = canvas.getContext('2d', { willReadFrequently: true })

  updateClock()
  setInterval(updateClock, 1000)
  setInterval(tickStateMachine, 1000)

  // Initialize html5-qrcode instance
  html5QrCode = new Html5Qrcode("qr-reader")

  await loadConference()
  await refreshLogs()
})

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CLOCK
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function updateClock() {
  const now = new Date()
  const h = now.getHours()
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const el = document.getElementById('live-clock')
  if (el) el.textContent = `${h12}:${m}:${s} ${ampm}`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TIME HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function nowHHMM() {
  const n = new Date()
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`
}

function todayYMD() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function fmt12(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return ''
  const [h, m] = t.split(':').map(Number)
  const ap = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`
}

function timeToMinutes(t) {
  if (!t || typeof t !== 'string' || !t.includes(':')) return NaN
  const [h, m] = t.split(':').map(Number)
  return (h * 60) + m
}

function compareTime(a, b) {
  return timeToMinutes(a) - timeToMinutes(b)
}

function getDaysDiff(d1, d2) {
  const t1 = new Date(d1).getTime()
  const t2 = new Date(d2).getTime()
  return Math.ceil((t2 - t1) / (1000 * 60 * 60 * 24))
}

function getMinsDiff(t1, t2) {
  const m1 = timeToMinutes(t1)
  const m2 = timeToMinutes(t2)
  if (Number.isNaN(m1) || Number.isNaN(m2)) return 0
  return m2 - m1
}

function getTodayDay() {
  const today = todayYMD()
  return confDays.find(d => d.date === today) || null
}

function getSortedTodaySlots() {
  return [...confSlots].sort((a, b) => compareTime(a.start_time, b.start_time))
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SLOT STATE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * Returns:
 * - active   -> only the currently open slot
 * - disabled -> not yet available, or future slot within today's sequence
 * - closed   -> already finished
 * - locked   -> future conference day
 */
function getSlotState(day, slot) {
  if (!day || !slot) return 'locked'
  if (isTestMode) return 'active'

  const today = todayYMD()
  const todaySlots = getSortedTodaySlots()

  if (day.date > today) return 'locked'
  if (day.date < today) return 'closed'

  const now = nowHHMM()
  const nowMin = timeToMinutes(now)

  const slotIndex = todaySlots.findIndex(s => s.id === slot.id)
  if (slotIndex === -1) return 'locked'

  let activeIndex = -1
  for (let i = 0; i < todaySlots.length; i++) {
    const s = todaySlots[i]
    const start = timeToMinutes(s.start_time)
    const end = timeToMinutes(s.end_time)
    if (nowMin >= start && nowMin <= end) {
      activeIndex = i
      break
    }
  }

  // Before the first slot starts: everything is disabled
  if (activeIndex === -1 && nowMin < timeToMinutes(todaySlots[0].start_time)) {
    return 'disabled'
  }

  // After the last slot ends: everything is closed
  if (activeIndex === -1 && nowMin > timeToMinutes(todaySlots[todaySlots.length - 1].end_time)) {
    return 'closed'
  }

  // Between slots: earlier slots closed, next/current future slot disabled
  if (activeIndex === -1) {
    const nextIndex = todaySlots.findIndex(s => nowMin < timeToMinutes(s.start_time))
    if (slotIndex < nextIndex) return 'closed'
    if (slotIndex === nextIndex) return 'disabled'
    return 'disabled'
  }

  if (slotIndex < activeIndex) return 'closed'
  if (slotIndex === activeIndex) return 'active'
  return 'disabled'
}

function getOverallStatus() {
  if (!activeConf) return ''

  const todayY = todayYMD()
  const todayD = getTodayDay()
  const now = nowHHMM()
  const todaySlots = getSortedTodaySlots()

  if (!confDays.length || !todaySlots.length) {
    return `<div class="status-msg closed">No conference schedule available</div>`
  }

  if (!todayD) {
    const firstDay = confDays[0]
    if (firstDay && firstDay.date > todayY) {
      return `<div class="status-msg next">Conference starts in ${getDaysDiff(todayY, firstDay.date)} day(s)</div>`
    }
    return `<div class="status-msg closed">Conference has ended</div>`
  }

  const nowMin = timeToMinutes(now)

  let activeSlot = null
  for (const slot of todaySlots) {
    const start = timeToMinutes(slot.start_time)
    const end = timeToMinutes(slot.end_time)
    if (nowMin >= start && nowMin <= end) {
      activeSlot = slot
      break
    }
  }

  if (activeSlot) {
    return `<div class="status-msg active">Currently Scanning: <strong>${esc(activeSlot.name)}</strong></div>`
  }

  const firstStart = timeToMinutes(todaySlots[0].start_time)
  const lastEnd = timeToMinutes(todaySlots[todaySlots.length - 1].end_time)

  if (nowMin < firstStart) {
    const mins = getMinsDiff(now, todaySlots[0].start_time)
    const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
    return `<div class="status-msg next">Next Slot: <strong>${esc(todaySlots[0].name)}</strong> starts in ${timeStr}</div>`
  }

  if (nowMin > lastEnd) {
    const nextDay = confDays.find(d => d.day_index === todayD.day_index + 1)
    if (nextDay) {
      return `<div class="status-msg next">Day ${todayD.day_index} complete • Next: Day ${nextDay.day_index} Morning</div>`
    }
    return `<div class="status-msg closed">All Sessions Complete</div>`
  }

  // Between slots
  const nextSlot = todaySlots.find(s => nowMin < timeToMinutes(s.start_time))
  if (nextSlot) {
    const mins = getMinsDiff(now, nextSlot.start_time)
    const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`
    return `<div class="status-msg next">Next Slot: <strong>${esc(nextSlot.name)}</strong> starts in ${timeStr}</div>`
  }

  return `<div class="status-msg closed">All Sessions Complete</div>`
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOAD CONFERENCE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function loadConference() {
  try {
    const all = await conferenceService.fetchAll()
    const today = todayYMD()

    activeConf =
      all.find(c => c.start_date <= today && c.end_date >= today) ||
      all[0] ||
      null

    const nameEl = document.getElementById('active-conf-name')
    const scheduleBody = document.getElementById('schedule-body')

    if (!activeConf) {
      if (nameEl) nameEl.textContent = 'CONFERENCE QR ATTENDANCE'
      if (scheduleBody) {
        scheduleBody.innerHTML = `
          <div style="padding:40px 20px;text-align:center;color:rgba(255,255,255,0.35);font-size:13px;line-height:1.6;">
            No active conference found.<br>
            Create one in the Conferences section first.
          </div>`
      }
      confDays = []
      confSlots = []
      return
    }

    if (nameEl) nameEl.textContent = activeConf.title.toUpperCase()

    confDays = await conferenceService.fetchDays(activeConf.id)
    confSlots = await conferenceService.fetchTimeSlots(activeConf.id)
    confSlots.sort((a, b) => compareTime(a.start_time, b.start_time))

    renderSchedule()
    tickStateMachine()
  } catch (e) {
    console.error('loadConference:', e)
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  RENDER SCHEDULE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function renderSchedule() {
  const body = document.getElementById('schedule-body')
  if (!body) return

  const today = todayYMD()
  const statusHtml = getOverallStatus()

  if (!activeConf || !confDays.length || !confSlots.length) {
    body.innerHTML = `
      <div class="scanner-status-banner" id="scanner-status-banner">
        ${statusHtml}
      </div>
      <div style="padding:40px 20px;text-align:center;color:rgba(255,255,255,0.35);font-size:13px;line-height:1.6;">
        No schedule to display.
      </div>`
    return
  }

  body.innerHTML = `
    <div class="scanner-status-banner" id="scanner-status-banner">
      ${statusHtml}
    </div>
    ${confDays.map(day => {
      const isToday = day.date === today
      const isPast = day.date < today
      const isFuture = day.date > today

      const dateLabel = (() => {
        const [y, m, d] = day.date.split('-')
        return new Date(+y, +m - 1, +d).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      })()

      let badge = ''
      if (isToday) badge = `<span class="day-card-badge badge-today">Today</span>`
      else if (isPast) badge = `<span class="day-card-badge badge-done">Done</span>`
      else if (isFuture) badge = `<span class="day-card-badge badge-locked">🔒 Locked</span>`

      const slotsHtml = confSlots.map(slot => {
        const state = getSlotState(day, slot)
        const emoji = SLOT_EMOJI[slot.name] || '⏱'
        const isActive = state === 'active'
        const isScanning =
          currentSession &&
          currentSession.slot.id === slot.id &&
          currentSession.day.id === day.id

        let badgeHtml = ''
        if (state === 'active') {
          badgeHtml = isTestMode 
            ? `<span class="slot-state-badge state-active active">🧪 TEST MODE</span>` 
            : `<span class="slot-state-badge state-active">▶ Active</span>`
        }
        if (state === 'disabled') badgeHtml = `<span class="slot-state-badge state-disabled">Waiting</span>`
        if (state === 'closed') badgeHtml = `<span class="slot-state-badge state-closed">Closed: ${fmt12(slot.end_time)}</span>`
        if (state === 'locked') badgeHtml = `<span class="slot-state-badge state-locked">—</span>`

        const scanHint = isActive && !isScanning
          ? `<div class="slot-scan-hint">▶ Tap to scan</div>`
          : ''

        const clickAttr = isActive
          ? `onclick="selectSlot('${day.id}', '${slot.id}')" role="button" tabindex="0"`
          : ''

        const extraClass = isScanning ? ' scanning' : ''

        return `
          <div class="slot-cell ${state}${extraClass}" id="slot-${day.id}-${slot.id}" ${clickAttr}>
            <div class="slot-emoji">${emoji}</div>
            <div class="slot-name">${esc(slot.name)}</div>
            <div class="slot-time-range">${fmt12(slot.start_time)} – ${fmt12(slot.end_time)}</div>
            ${badgeHtml}
            ${scanHint}
          </div>`
      }).join('')

      return `
        <div class="day-card ${isToday ? 'today' : ''} ${isFuture ? 'locked' : ''}">
          <div class="day-card-head">
            <span class="day-card-label">Day ${day.day_index}</span>
            ${badge}
            <span class="day-card-date">${dateLabel}</span>
          </div>
          <div class="day-slots">${slotsHtml}</div>
        </div>`
    }).join('')}
  `
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  STATE MACHINE TICK (every second)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let _lastActiveSlotId = '__INIT__'

function tickStateMachine() {
  if (!confDays.length || !confSlots.length) return

  const todayDay = getTodayDay()
  let newActiveId = null

  if (todayDay) {
    for (const slot of getSortedTodaySlots()) {
      if (getSlotState(todayDay, slot) === 'active') {
        newActiveId = slot.id
        break
      }
    }
  }

  const banner = document.getElementById('scanner-status-banner')
  if (banner) banner.innerHTML = getOverallStatus()

  if (newActiveId !== _lastActiveSlotId) {
    _lastActiveSlotId = newActiveId
    activeSlotId = newActiveId

    renderSchedule()

    if (currentSession) {
      const stillActive =
        todayDay &&
        currentSession.day.id === todayDay.id &&
        currentSession.slot.id === activeSlotId

      if (!stillActive) {
        setStatus('Slot expired — select the next active slot', 'error')
        currentSession = null
        stopCamera()
      }
    }
  } else {
    updateSlotBadgesOnly()
  }
}

function updateSlotBadgesOnly() {
  confDays.forEach(day => {
    confSlots.forEach(slot => {
      const el = document.getElementById(`slot-${day.id}-${slot.id}`)
      if (!el) return

      const state = getSlotState(day, slot)
      const isScanning =
        currentSession &&
        currentSession.slot.id === slot.id &&
        currentSession.day.id === day.id

      el.className = `slot-cell ${state}${isScanning ? ' scanning' : ''}`

      const badge = el.querySelector('.slot-state-badge')
      if (badge) {
        if (state === 'active') {
          badge.className = isTestMode ? 'slot-state-badge state-active active' : 'slot-state-badge state-active'
          badge.textContent = isTestMode ? '🧪 TEST' : '▶ Active'
        } else if (state === 'disabled') {
          badge.className = 'slot-state-badge state-disabled'
          badge.textContent = 'Waiting'
        } else if (state === 'closed') {
          badge.className = 'slot-state-badge state-closed'
          badge.textContent = `Closed: ${fmt12(slot.end_time)}`
        } else if (state === 'locked') {
          badge.className = 'slot-state-badge state-locked'
          badge.textContent = '—'
        }
      }

      if (state === 'active') {
        el.setAttribute('onclick', `selectSlot('${day.id}', '${slot.id}')`)
        el.setAttribute('role', 'button')
        el.setAttribute('tabindex', '0')
      } else {
        el.removeAttribute('onclick')
        el.removeAttribute('role')
        el.removeAttribute('tabindex')
      }
    })
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SLOT SELECTION → Open Camera Card
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function selectSlot(dayId, slotId) {
  const day = confDays.find(d => d.id === dayId)
  const slot = confSlots.find(s => s.id === slotId)
  if (!day || !slot) return

  const state = getSlotState(day, slot)
  if (state !== 'active' && !isTestMode) {
    renderSchedule()
    return
  }

  currentSession = { day, slot }
  activeSlotId = slot.id
  renderSchedule()

  const indEl = document.getElementById('active-slot-indicator')
  const labEl = document.getElementById('asi-label')
  if (indEl) indEl.className = 'active-slot-indicator is-active'
  if (labEl) labEl.textContent = `${slot.name} — ${fmt12(slot.start_time)} to ${fmt12(slot.end_time)}`

  // SHOW CAMERA UI FIRST
  const camCard = document.getElementById('cam-card')
  if (camCard) {
    camCard.classList.remove('hidden')
    camCard.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ⚠️ IMPORTANT: Show "Start Camera" button, don't auto-start
  const startBtn = document.getElementById('btn-start-camera')
  if (startBtn) startBtn.classList.remove('hidden')

  const hintEl = document.getElementById('cam-hint')
  if (hintEl) hintEl.classList.add('hidden')

  setStatus('Tap "Start Camera" to scan', 'idle')
}

function closeScanner() {
  stopCamera()
  currentSession = null
  renderSchedule()

  const camCard = document.getElementById('cam-card')
  if (camCard) camCard.classList.add('hidden')

  setStatus('Scanner stopped', 'idle')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  CAMERA ENGINE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function startCamera() {
  try {
    if (!html5QrCode) {
      html5QrCode = new Html5Qrcode("qr-reader")
    }

    setStatus('Initializing camera...', 'idle')

    const config = { 
      fps: 15, 
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minSide = Math.min(viewfinderWidth, viewfinderHeight);
        const qrboxSize = Math.floor(minSide * 0.82); // Increased to 82% for better mobile visibility
        return { width: qrboxSize, height: qrboxSize };
      },
      aspectRatio: 1.777778
    };

    // ⚠️ IMPORTANT: Show the "Start Camera" button if we fail, but here we are in the start func
    await html5QrCode.start(
      { facingMode: "environment" }, 
      config, 
      (decodedText) => handleScan(decodedText),
      (errorMessage) => { /* quiet while scanning */ }
    )

    setStatus('✔ Camera ready — scan QR', 'success')

    // Hide start button once active
    const startBtn = document.getElementById('btn-start-camera')
    if (startBtn) startBtn.classList.add('hidden')

    const hintEl = document.getElementById('cam-hint')
    if (hintEl) hintEl.classList.remove('hidden')
  } catch (e) {
    console.error('Camera error:', e)
    
    // Check for secure context
    const isSecure = window.isSecureContext;
    let msg = 'Camera failed to start.';
    
    if (!isSecure) {
      msg = '🔴 SECURE CONTEXT REQUIRED. Use localhost or HTTPS.';
    } else if (e.name === 'NotAllowedError') {
      msg = '🚫 Permission denied. Enable camera in settings.';
    } else if (e.name === 'NotFoundError') {
      msg = '🔍 No camera device found.';
    } else {
      msg = '⚠️ Camera error: ' + (e.message || 'unknown');
    }
    
    setStatus(msg, 'error')
    
    // Force show simulate scan button so they can at least test logic
    const simBtn = document.getElementById('btn-simulate')
    if (simBtn) simBtn.classList.remove('hidden')
  }
}

async function stopCamera() {
  if (html5QrCode && html5QrCode.isScanning) {
    try {
      await html5QrCode.stop()
    } catch (e) {
      console.error('Stop error:', e)
    }
  }

  // Ensure button is visible again if we stop
  const startBtn = document.getElementById('btn-start-camera')
  if (startBtn) startBtn.classList.remove('hidden')

  const hintEl = document.getElementById('cam-hint')
  if (hintEl) hintEl.classList.add('hidden')
}

// (tick function removed as html5-qrcode handles the loop)

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  SCAN HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function handleScan(qrRaw) {
  const now = Date.now()
  if (qrRaw === lastQR && now - lastQRTime < LOCK_MS) return
  lastQR = qrRaw
  lastQRTime = now

  if (isProcessing) return
  isProcessing = true

  try {
    setStatus('Processing...', 'idle')

    if (!currentSession) return

    // Time gate
    if (getSlotState(currentSession.day, currentSession.slot) !== 'active' && !isTestMode) {
      await showResult('off-time', null, 'This slot has expired')
      setStatus('Slot expired', 'error')
      return
    }

    const payload = decodeQR(qrRaw)
    if (!payload || !payload.id) {
      await showResult('invalid', null, 'QR code not recognized')
      setStatus('Invalid QR code', 'error')
      return
    }

    // Prevent immediate re-scan of same person unless 10s passed or different payload
    if (payload.id === lastScannedId && now - lastQRTime < LOCK_MS) return
    lastScannedId = payload.id

    // Resolve Name from DB and VERIFY EXISTENCE
    let displayName = null
    try {
      if (payload.type === 'PASTOR') {
        const p = await pastorService.fetchById(payload.id)
        if (p) displayName = p.full_name
      } else if (payload.type === 'WIFE') {
        const p = await pastorService.fetchById(payload.id)
        if (p) {
          // Verify wife actually exists on the pastor record before accepting
          if (!p.wife_name) throw new Error("No wife registered")
          displayName = p.wife_name
        }
      } else if (payload.type === 'DISCIPLE') {
        const d = await discipleService.fetchById(payload.id)
        if (d) displayName = d.full_name
      }
    } catch (e) {
      console.warn('Lookup error:', e)
    }

    // CRITICAL FIX: Reject scan if delegate does not exist in Database!
    if (!displayName) {
      await showResult('invalid', null, 'Delegate not found in database')
      setStatus('⚠ Unregistered or deleted QR', 'error')
      return  // Abort check-in!
    }

    // Record attendance
    await attendanceService.insert(
      activeConf.id,
      currentSession.day.id,
      currentSession.slot.id,
      payload.id,
      payload.type
    )

    await scanLogService.insert(
      activeConf.id,
      currentSession.day.id,
      currentSession.slot.id,
      payload.id,
      displayName, // Log the Resolved Name, not the Type
      'SUCCESS'
    )

    await showResult('success', displayName, `${payload.type || 'Delegate'} scan recorded`)
    await refreshLogs()
    setStatus(`✔ Scan successful: ${displayName}`, 'success')
  } catch (err) {
    const isDup =
      err?.code === 'ALREADY_SCANNED' ||
      err?.message?.includes?.('ALREADY_SCANNED')

    if (isDup) {
      await showResult('duplicate', null, 'Already scanned for this slot')
      setStatus('⚠ Already scanned', 'warn')
    } else {
      console.error(err)
      setStatus('Scan error', 'error')
    }
  } finally {
    isProcessing = false
  }
}

// ── Status ───────────────────────────────────────────────────
function setStatus(msg, state = 'idle') {
  const el = document.getElementById('scan-status')
  if (el) {
    el.textContent = msg
    el.className = `scan-status ${state}`
  }
}

// ── Result Overlay ───────────────────────────────────────────
function showResult(type, delegateName, subtitle) {
  return new Promise(resolve => {
    const overlay = document.getElementById('result-overlay')
    const card = document.getElementById('result-card')
    const iconEl = document.getElementById('result-icon')
    const nameEl = document.getElementById('result-name')
    const statusEl = document.getElementById('result-status-text')
    const metaEl = document.getElementById('result-meta')

    if (!overlay || !card || !iconEl || !nameEl || !statusEl || !metaEl) {
      resolve()
      return
    }

    let iconClass = ''
    let iconSvg = ''
    let statusText = ''

    if (type === 'success') {
      iconClass = 'ri-success'
      statusText = 'Check-in Successful'
      card.className = 'result-card success'
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`
    } else if (type === 'duplicate') {
      iconClass = 'ri-dup'
      statusText = 'Already Scanned'
      card.className = 'result-card dup'
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
    } else if (type === 'off-time') {
      iconClass = 'ri-invalid'
      statusText = 'Slot Expired'
      card.className = 'result-card off-time'
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`
    } else {
      iconClass = 'ri-invalid'
      statusText = 'Invalid QR Code'
      card.className = 'result-card invalid'
      iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
    }

    iconEl.className = `result-icon ${iconClass}`
    iconEl.innerHTML = iconSvg
    nameEl.textContent = delegateName ? esc(delegateName) : '—'
    statusEl.textContent = statusText
    metaEl.textContent = subtitle || ''
    overlay.classList.remove('hidden')

    setTimeout(() => {
      overlay.classList.add('hidden')
      resolve()
    }, 1800)
  })
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function refreshLogs() {
  if (!activeConf) return
  try {
    allLogs = await scanLogService.fetchRecent(activeConf.id, 200)
    renderLogs()
    syncMobileLogs()
  } catch (e) {
    console.error('refreshLogs:', e)
  }
}

function setLogFilter(key, btn) {
  activeFilter = key
  document.querySelectorAll('#logs-filters .log-filter-btn').forEach(b => b.classList.remove('active'))
  if (btn) btn.classList.add('active')
  renderLogs()
}

function filterLogs() {
  renderLogs()
}

function renderLogs() {
  const search = (document.getElementById('logs-search')?.value || '').toLowerCase()
  const container = document.getElementById('logs-list')
  const countEl = document.getElementById('logs-count')

  const filtered = applyLogFilter(allLogs, activeFilter, search)

  if (countEl) countEl.textContent = `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`
  if (container) container.innerHTML = buildLogRows(filtered)
}

function applyLogFilter(logs, filter, search) {
  let out = [...logs]

  if (filter !== 'all') {
    if (['MORNING', 'AFTERNOON', 'EVENING'].includes(filter)) {
      out = out.filter(l => {
        const s = confSlots.find(x => x.id === l.slot_id)
        return s && s.name === filter
      })
    } else {
      out = out.filter(l => l.status === filter)
    }
  }

  if (search) {
    out = out.filter(l =>
      (l.delegate_type || '').toLowerCase().includes(search) ||
      (l.delegate_id || '').toLowerCase().includes(search)
    )
  }

  return out
}

function buildLogRows(list) {
  if (!list.length) {
    return `<div class="logs-empty">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      <p>${allLogs.length ? 'No matching records' : 'No scan records yet'}</p>
    </div>`
  }

  return list.map(log => {
    const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })

    const slot = confSlots.find(s => s.id === log.slot_id)
    const day = confDays.find(d => d.id === log.day_id)
    const slotEmoji = SLOT_EMOJI[slot?.name] || '⏱'
    const dayLabel = day ? `Day ${day.day_index}` : ''
    const nameLabel = log.delegate_type ? esc(log.delegate_type) : 'Unknown'
    const idShort = log.delegate_id ? String(log.delegate_id).slice(-5) : '?'

    let rowCls = ''
    let statusCls = ''
    let statusIcon = ''
    let statusLabel = ''

    if (log.status === 'SUCCESS') {
      rowCls = 'log-success'
      statusCls = 's-success'
      statusIcon = '✔'
      statusLabel = `SUCCESS ${slot?.name || ''}`.trim()
    } else {
      // Fallback for any leftovers
      rowCls = 'log-invalid'
      statusCls = 's-invalid'
      statusIcon = '✖'
      statusLabel = 'Invalid'
    }

    return `
      <div class="log-row ${rowCls}">
        <div class="log-time">${timeStr}</div>
        <div class="log-name-cell">
          <div class="log-name">${nameLabel}</div>
          <div class="log-sub">${slotEmoji} ${slot?.name || '?'} ${dayLabel ? '· ' + dayLabel : ''} · #${idShort}</div>
        </div>
        <div class="log-status-cell ${statusCls}">${statusIcon} ${statusLabel}</div>
      </div>`
  }).join('')
}

// ── esc ──────────────────────────────────────────────────────
function esc(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MOBILE LOGS DRAWER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
let mobLogsFilter = 'all'

function toggleMobileLogs() {
  const drawer = document.getElementById('mob-logs-drawer')
  const back = document.getElementById('mob-backdrop')
  if (!drawer || !back) return

  const isHidden = drawer.classList.contains('hidden')
  drawer.classList.toggle('hidden', !isHidden)
  back.classList.toggle('hidden', !isHidden)

  if (isHidden) syncMobileLogs()
}

function closeMobileLogs() {
  document.getElementById('mob-logs-drawer')?.classList.add('hidden')
  document.getElementById('mob-nav-drawer')?.classList.add('hidden')
  document.getElementById('mob-backdrop')?.classList.add('hidden')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  TEST MODE HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleTestMode() {
  isTestMode = !isTestMode
  
  const btn = document.getElementById('test-mode-btn')
  const simBtn = document.getElementById('btn-simulate')
  
  if (isTestMode) {
    btn?.classList.add('active')
    simBtn?.classList.remove('hidden')
    setStatus('Test Mode Active — Time restrictions bypassed', 'warn')
  } else {
    btn?.classList.remove('active')
    simBtn?.classList.add('hidden')
    setStatus('Test Mode Disabled', 'idle')
    if (currentSession) {
      // Check if current slot is actually active
      const state = getSlotState(currentSession.day, currentSession.slot)
      if (state !== 'active') closeScanner()
    }
  }
  
  renderSchedule()
  tickStateMachine()
}

async function simulateScan() {
  if (!currentSession) {
    setStatus('Select a slot first', 'error')
    return
  }
  
  // Create a dummy QR payload
  const testPayload = JSON.stringify({ t: 'PASTOR', id: '00000000-0000-0000-0000-000000000000' })
  
  console.log('Simulating scan with payload:', testPayload)
  await handleScan(testPayload)
}

function setLogFilterMob(key, btn) {
  mobLogsFilter = key
  document.querySelectorAll('#mob-logs-drawer .log-filter-btn').forEach(b => b.classList.remove('active'))
  if (btn) btn.classList.add('active')
  syncMobileLogs()
}

function filterLogsMob() {
  syncMobileLogs()
}

function syncMobileLogs() {
  const search = (document.getElementById('logs-search-mob')?.value || '').toLowerCase()
  const container = document.getElementById('logs-list-mob')
  if (!container) return
  container.innerHTML = buildLogRows(applyLogFilter(allLogs, mobLogsFilter, search))
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  MOBILE NAV DRAWER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function toggleMobileNav() {
  const drawer = document.getElementById('mob-nav-drawer')
  const back = document.getElementById('mob-backdrop')
  if (!drawer || !back) return

  const isHidden = drawer.classList.contains('hidden')
  drawer.classList.toggle('hidden', !isHidden)
  back.classList.toggle('hidden', !isHidden)
}

function closeMobileNav() {
  document.getElementById('mob-nav-drawer')?.classList.add('hidden')
  document.getElementById('mob-backdrop')?.classList.add('hidden')
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  LOG MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function clearLogs() {
  if (!activeConf) return
  if (!confirm('Are you sure you want to CLEAR ALL logs for this conference? This cannot be undone.')) return
  
  try {
    setStatus('Clearing logs & attendance...', 'idle')
    await scanLogService.clearAll(activeConf.id)
    await attendanceService.clearAll(activeConf.id)
    
    allLogs = []
    lastQR = null
    lastQRTime = 0
    lastScannedId = null
    
    renderLogs()
    syncMobileLogs()
    renderSchedule()
    
    setStatus('Logs and attendance reset', 'success')
  } catch (e) {
    console.error('clearLogs:', e)
    setStatus('Failed to clear logs', 'error')
  }
}