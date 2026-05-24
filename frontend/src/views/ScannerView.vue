<template>
<div class="h-full flex flex-col lg:flex-row bg-gray-50 overflow-y-auto lg:overflow-hidden font-sans relative">
  
  <!-- LEFT: MAIN SCANNER AREA -->
  <main class="w-full lg:flex-1 min-h-[60vh] lg:min-h-full flex flex-col relative shrink-0 border-b lg:border-b-0 lg:border-r border-gray-200 bg-white">
    
    <!-- HUD OVERLAY (TOP) -->
    <div class="absolute top-0 inset-x-0 z-20 p-4 md:p-6 flex justify-between items-start pointer-events-none">
       <div class="flex flex-col gap-3">
          <div class="flex gap-2">
             <button @click="$router.push('/conferences')" class="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-900 shadow-sm transition-all pointer-events-auto active:scale-95 shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
             </button>
             <div class="px-4 h-10 rounded-xl bg-white border border-gray-200 shadow-sm flex items-center justify-center min-w-0">
                <span class="text-xs font-black text-gray-900 uppercase font-mono tracking-tighter truncate">{{ currentTime }}</span>
             </div>
          </div>

          <!-- OFFLINE STATUS -->
          <transition name="toast">
             <div v-if="pendingCount > 0" class="px-4 py-2 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 shadow-sm flex items-center gap-2">
                <div class="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0"></div>
                <span class="text-[10px] font-bold uppercase tracking-widest">{{ pendingCount }} Pending Sync</span>
             </div>
          </transition>
       </div>

       <div class="flex flex-row items-center gap-2 pointer-events-auto shrink-0">
          <button 
             @click="fastMode = !fastMode"
             :class="['h-10 px-3 sm:px-4 rounded-xl border transition-all text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-sm', 
                      fastMode ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-gray-200 text-gray-400 hover:text-gray-900']"
          >
             Fast Mode: <span :class="fastMode ? 'text-indigo-600' : 'text-gray-900'">{{ fastMode ? 'ON' : 'OFF' }}</span>
          </button>
          
          <div v-if="scanning" class="px-3 sm:px-4 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 shadow-sm flex items-center justify-center gap-2">
             <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>
             <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-widest">Active</span>
          </div>
          <button v-else @click="startScanner" class="h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/20 flex items-center justify-center px-3 sm:px-4 text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all pointer-events-auto active:scale-95">
             Resume
          </button>
       </div>
    </div>

    <!-- SCANNER VIEWPORT (CENTERED & FIXED SIZE) -->
    <div class="flex-1 w-full flex items-center justify-center p-4 pt-24 pb-12 relative">
       <!-- Large fixed-size container for the camera that safely shrinks only on very small screens -->
       <div class="w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] shrink-0 rounded-[2.5rem] bg-gray-50 border-2 border-gray-100 shadow-xl relative overflow-hidden flex items-center justify-center group mx-auto">
          
          <div id="reader" class="w-full h-full object-cover rounded-[2.5rem] overflow-hidden"></div>

          <!-- SUCCESS OVERLAY (MODAL STYLE INSIDE SCANNER) -->
          <transition name="pop">
             <div v-if="successResult" class="absolute inset-0 flex items-center justify-center z-50 bg-white/95 backdrop-blur-md p-6 text-center">
                <div class="relative z-10 w-full flex flex-col items-center">
                   <div class="w-24 h-24 rounded-3xl bg-indigo-50 border-4 border-white shadow-xl mb-4 overflow-hidden flex-shrink-0">
                      <img v-if="successResult.image" :src="successResult.image" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center text-4xl font-black text-indigo-300 uppercase">{{ successResult.name.charAt(0) }}</div>
                   </div>

                   <h2 class="text-2xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-1">{{ successResult.name }}</h2>
                   <p v-if="successResult.isLookupOnly" class="text-[10px] font-bold text-amber-500 uppercase tracking-[0.2em] mb-4">Verified Badge</p>
                   <p v-else class="text-[10px] font-bold text-indigo-600 uppercase tracking-[0.2em] mb-4">Checked-In</p>

                   <div class="w-full bg-gray-50 rounded-xl p-3 border border-gray-100 mb-6">
                      <div class="text-[11px] font-black text-gray-900 uppercase truncate">{{ successResult.church }}</div>
                      <div class="text-[9px] font-bold text-gray-400 uppercase">{{ successResult.district }}</div>
                   </div>

                   <div :class="['w-12 h-12 rounded-full text-white flex items-center justify-center shadow-lg', successResult.isLookupOnly ? 'bg-amber-500' : 'bg-emerald-500']">
                      <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>
                   </div>
                </div>
             </div>
          </transition>
       </div>
    </div>

    <!-- ERROR / SUCCESS TOAST (BOTTOM OF SCANNER) -->
    <transition name="toast">
       <div v-if="errorMsg || (fastMode && successResult)" class="absolute bottom-8 inset-x-0 z-[60] flex justify-center px-4 pointer-events-none">
          <div :class="[
                'px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 border',
                errorMsg ? 'bg-red-50 text-red-600 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'
             ]">
             <svg v-if="errorMsg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
             <svg v-else class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
             <span class="text-[10px] font-black uppercase tracking-widest">{{ errorMsg || `${successResult.name} Accepted` }}</span>
          </div>
       </div>
    </transition>

  </main>

  <!-- RIGHT: DETAILS & HISTORY -->
  <aside class="w-full lg:w-[420px] bg-white flex flex-col shrink-0 lg:h-full z-30">
    
    <!-- Environment Config -->
    <div class="p-6 border-b border-gray-100 bg-white">
      <label class="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Event Environment</label>
      <div class="relative group">
        <select
          v-model="session.conferenceId"
          @change="fetchConfDetails"
          class="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-xs font-bold text-gray-900 cursor-pointer focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none outline-none"
        >
          <option v-for="c in conferences" :key="c.id" :value="c.id" v-text="c.theme || c.title" />
        </select>
        <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
        </div>
      </div>
    </div>

    <!-- Sessions (Scrollable) -->
    <div class="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 border-b border-gray-100 bg-white">
       <div v-for="day in days" :key="day.id" class="space-y-4">
          <div class="flex items-center justify-between">
             <h4 class="text-xs font-black text-gray-900 uppercase tracking-widest">Day {{ day.day_index }}</h4>
             <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ formatDateShort(day.date) }}</span>
          </div>
          
          <div class="grid grid-cols-1 gap-3">
             <button 
                v-for="slot in slots" 
                :key="slot.id"
                @click="selectSession(day, slot)"
                :disabled="!isSlotCurrent(day, slot)"
                :class="[
                   'flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                   session.dayId === day.id && session.slotId === slot.id 
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20 active:scale-95' 
                      : 'bg-white border-gray-100 text-gray-500 hover:border-indigo-100 hover:bg-gray-50 active:scale-95',
                   !isSlotCurrent(day, slot) ? 'opacity-50 grayscale cursor-not-allowed hover:border-gray-100 hover:bg-white active:scale-100' : ''
                ]"
             >
                <div class="flex flex-col items-start text-left">
                   <span class="text-[11px] font-black uppercase tracking-widest mb-1">{{ slot.name }}</span>
                   <span class="text-[9px] font-bold opacity-70">{{ getSlotTimeRange(slot) }}</span>
                </div>
                
                <div v-if="isSlotCurrent(day, slot)" class="flex items-center gap-2">
                   <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                   <span class="text-[9px] font-black uppercase tracking-widest" :class="session.dayId === day.id && session.slotId === slot.id ? 'text-indigo-100' : 'text-emerald-500'">Active</span>
                </div>
             </button>
          </div>
       </div>
    </div>

    <!-- Live Activity Log -->
    <div class="h-[300px] flex flex-col overflow-hidden bg-white shrink-0 border-t border-gray-100">
       <div class="px-6 py-4 flex justify-between items-center bg-gray-50 border-b border-gray-100">
          <span class="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Live Activity Log</span>
          <span class="text-[10px] font-black text-indigo-600 tracking-widest">{{ scanLogs.length }} Scans</span>
       </div>

       <!-- ADMIN TEST TOOLS -->
       <div v-if="currentUser?.role === 'Admin'" class="px-6 py-3 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <span class="text-[9px] font-black text-amber-600 uppercase tracking-widest">Admin Override Mode</span>
          <label class="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" v-model="bypassEnabled" class="sr-only peer">
            <div class="w-8 h-4 bg-white border border-amber-200 rounded-full peer peer-checked:bg-amber-500 peer-checked:border-amber-500 after:content-[''] after:absolute after:top-[3px] after:left-[3px] after:bg-gray-300 peer-checked:after:bg-white after:rounded-full after:h-2.5 after:w-2.5 after:transition-all peer-checked:after:translate-x-full"></div>
          </label>
       </div>
       
       <div class="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2 bg-gray-50/30">
          <transition-group name="list">
             <div v-for="log in sortedLogs" :key="log.id" class="flex items-center gap-4 p-3 bg-white border border-gray-100 rounded-xl group hover:border-indigo-100 shadow-sm transition-all">
                <div class="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center font-black text-gray-500 text-xs shrink-0">
                   {{ log.name.charAt(0) }}
                </div>
                <div class="flex-1 min-w-0">
                   <div class="text-[11px] font-black text-gray-900 uppercase tracking-tight truncate">{{ log.name }}</div>
                   <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{{ log.type }} • {{ formatTime(log.time) }}</div>
                </div>
                <div class="w-6 h-6 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                   <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                </div>
             </div>
          </transition-group>
          
          <div v-if="scanLogs.length === 0" class="py-12 text-center text-gray-300">
             <svg class="w-8 h-8 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
             <p class="text-[10px] font-black uppercase tracking-widest">Waiting for scans...</p>
          </div>
       </div>
    </div>
  </aside>

</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { Html5Qrcode } from 'html5-qrcode'
import ScannerQueue from '../services/scanner-queue'
import { ConferenceService } from '../services/db/ConferenceService'
import { PastorService } from '../services/db/PastorService'
import { DiscipleService } from '../services/db/DiscipleService'
import { AttendanceService } from '../services/db/AttendanceService'
import { supabase } from '../services/supabase'
import { useAuth } from '../composables/useAuth'

// --- STATE ---
const { user: authUser } = useAuth()
const currentUser = ref(null)
const conferences = ref([])
const days = ref([])
const slots = ref([])
const session = ref({ conferenceId: '', dayId: '', slotId: '' })
const scanning = ref(false)
const scanLogs = ref([])
const currentTime = ref('')
const successResult = ref(null)
const errorMsg = ref('')
const hlink = ref(null)
const fastMode = ref(false)
const bypassEnabled = ref(false)
const pendingCount = ref(0)
const cooldowns = new Map() // Payload -> Timestamp
let clockInterval = null
let syncInterval = null

// --- COMPUTED: AUTO-SESSION ---
const activeSession = computed(() => {
    if (!days.value.length || !slots.value.length) return null
    const todayStr = new Date().toISOString().split('T')[0]
    const today = days.value.find(d => d.date.split('T')[0] === todayStr)
    if (!today) return null

    const currentSlot = slots.value.find(s => isSlotCurrent(today, s))
    if (!currentSlot) return null

    return { day: today, slot: currentSlot, day_index: today.day_index }
})

const sortedLogs = computed(() => [...scanLogs.value].slice(0, 10))

// --- WATCHERS ---
watch(activeSession, (newVal) => {
    if (newVal) {
        session.value.dayId = newVal.day.id
        session.value.slotId = newVal.slot.id
    }
}, { immediate: true })

// --- CLOCK & LOGIC ---
const updateClock = () => {
    const now = new Date()
    currentTime.value = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })
}

const formatTime = (dateObj) => {
    return dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

const isToday = (dateStr) => new Date(dateStr).toISOString().split('T')[0] === new Date().toISOString().split('T')[0]

const isSlotCurrent = (day, slot) => {
    // ADMIN BYPASS: If bypass is on and user is admin, everything is "current" for testing
    if (bypassEnabled.value && currentUser.value?.role === 'Admin') return true
    
    if (!isToday(day.date)) return false
    const now = new Date()
    const nowMin = (now.getHours() * 60) + now.getMinutes()
    const name = slot.name.toUpperCase()
    
    let startMin, endMin
    if (name.includes('MORNING')) { startMin = 6 * 60; endMin = 9 * 60 + 30 }
    else if (name.includes('AFTERNOON')) { startMin = 11 * 60; endMin = 13 * 60 + 30 }
    else if (name.includes('EVENING')) { startMin = 16 * 60; endMin = 21 * 60 }
    else return false
    
    return nowMin >= startMin && nowMin <= endMin
}

const selectSession = (day, slot) => {
    session.value.dayId = day.id
    session.value.slotId = slot.id
    if (!scanning.value) startScanner()
}

const formatDateShort = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

const getSlotTimeRange = (slot) => {
   const name = slot.name.toUpperCase()
   if (name.includes('MORNING')) return '6:00 AM - 9:30 AM'
   if (name.includes('AFTERNOON')) return '11:00 AM - 1:30 PM'
   if (name.includes('EVENING')) return '4:00 PM - 9:00 PM'
   return 'Flexible'
}

// --- API ACTIONS ---
const fetchUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser.value = { email: user?.email, role: 'Admin' }
  } catch (err) {
    console.warn("Could not fetch user profile", err)
  }
}

const fetchConferences = async (forceRefresh = false) => {
  // Skip fetching if we already have data and not forcing a refresh
  if (!forceRefresh && conferences.value.length > 0) {
    fetchConfDetails()
    return
  }
  conferences.value = await ConferenceService.getAll()
  const params = new URLSearchParams(window.location.search)
  if (params.has('confId')) {
     session.value.conferenceId = params.get('confId')
  } else if (conferences.value.length && !session.value.conferenceId) {
     session.value.conferenceId = conferences.value[0].id
  }
  fetchConfDetails()
}

const fetchConfDetails = async () => {
  if (!session.value.conferenceId) return
  const data = await ConferenceService.getById(session.value.conferenceId)
  days.value = data.days || []
  slots.value = data.timeSlots || []
}

// --- SCANNER ACTIONS ---
const startScanner = async () => {
  if (hlink.value) {
     try { await hlink.value.stop() } catch(e){}
     try { hlink.value.clear() } catch(e){}
  }
  
  hlink.value = new Html5Qrcode("reader")
  scanning.value = true
  
  // We adjust the qrbox dynamically. If the screen is very small (like an iPhone SE), we drop the box size to 250 so it safely fits.
  const isSmallScreen = window.innerWidth < 350
  const boxSize = isSmallScreen ? 250 : 290
  const config = { fps: 10, qrbox: { width: boxSize, height: boxSize }, aspectRatio: 1.0 }

  try {
     await hlink.value.start({ facingMode: "environment" }, config, onScanSuccess)
  } catch (err) {
     console.warn("Environment camera failed, trying fallback...", err)
     try {
       const devices = await Html5Qrcode.getCameras()
       if (devices && devices.length > 0) {
         // Fallback to the first available camera
         await hlink.value.start(devices[0].id, config, onScanSuccess)
       } else {
         throw new Error("No cameras detected on this device.")
       }
     } catch (fallbackErr) {
       console.error("Scanner start failed:", fallbackErr)
       scanning.value = false
       errorMsg.value = "Camera access denied or not found."
       setTimeout(() => { errorMsg.value = '' }, 4000)
     }
  }
}

const onScanSuccess = async (text) => {
   // 1. Cooldown & Lock Check
   const lastScan = cooldowns.get(text)
   if (lastScan && (Date.now() - lastScan < 2000)) return // 2s payload cooldown
   if (successResult.value && !fastMode.value) return 

   try {
      const data = JSON.parse(text)
      if (!data.id) throw new Error("Invalid QR Badge")
      
      cooldowns.set(text, Date.now())

      // 2. Fetch Metadata (immediate feedback)
      let d = null
      try {
         if (data.t === 'PASTOR' || data.t === 'WIFE') {
             d = await PastorService.getById(data.id)
         } else {
             d = await DiscipleService.getById(data.id)
         }
      } catch (e) {
         throw new Error("Delegate record not found")
      }
      
      const metadata = {
         name: (data.t==='WIFE' ? d.wife_name : d.full_name) || 'Unknown',
         role: data.t || 'Delegate',
         church: d.church?.church_name || 'No Station',
         district: d.church?.district?.district_name || 'VCCC',
         image: data.t === 'WIFE' ? d.wife_image_url : (data.t === 'DISCIPLE' ? d.disciple_image_url : d.pastor_image_url),
         isLookupOnly: !session.value.dayId // Flag for UI
      }

      // 3. Show Result UI (Works even without conference selection)
      successResult.value = metadata
      
      // If we have a session, proceed with recording attendance
      if (session.value.dayId && session.value.conferenceId && session.value.slotId) {
         // Queue Offline First (Retry Protection / Sync)
         const scanPayload = {
            scan_uuid: crypto.randomUUID(),
            conference_id: session.value.conferenceId,
            day_id: session.value.dayId,
            slot_id: session.value.slotId,
            delegate_id: data.id,
            delegate_type: data.t,
            scanned_by: authUser.value?.id,
            metadata: metadata 
         }
         
         await ScannerQueue.push(scanPayload)
         updatePendingCount()
         
         scanLogs.value.unshift({ id: Date.now(), name: metadata.name, type: metadata.role, time: new Date() })
         
         // Trigger background sync
         processSyncQueue()
      } else {
         console.log("Lookup-only scan performed (No active session selected)")
      }
      
      const delay = fastMode.value ? 2000 : 3000
      setTimeout(() => { successResult.value = null }, delay)

   } catch (err) {
      errorMsg.value = err.message
      setTimeout(() => { errorMsg.value = '' }, 4000)
   }
}

// --- SYNC ENGINE ---
const updatePendingCount = async () => {
   const pending = await ScannerQueue.getAll()
   pendingCount.value = pending.length
}

const processSyncQueue = async () => {
   const pending = await ScannerQueue.getAll()
   if (pending.length === 0) return

    for (const scan of pending) {
      try {
         await AttendanceService.store(scan)
         await ScannerQueue.remove(scan.scan_uuid) // Only remove on explicit success
      } catch (err) {
         // If it's a conflict (Already Scanned), we should remove it from queue too
         if (err.response?.status === 409 || err.response?.status === 200) {
            await ScannerQueue.remove(scan.scan_uuid)
         } else {
            console.warn("Sync failed for", scan.scan_uuid, "Retrying later...")
            break; // Stop loop on generic network/server error to avoid spamming
         }
      }
   }
   updatePendingCount()
}

onMounted(() => {
    updateClock()
    clockInterval = setInterval(updateClock, 1000)
    
    // Sync Interval
    updatePendingCount()
    syncInterval = setInterval(processSyncQueue, 15000) // Heartbeat sync every 15s

    fetchUser()
    
    // Start scanner IMMEDIATELY — don't wait for conference list to load
    setTimeout(() => {
       if (!scanning.value) startScanner()
    }, 300)
    
    // Fetch conferences in background (non-blocking)
    fetchConferences()
})

onUnmounted(async () => {
   if (clockInterval) clearInterval(clockInterval)
   if (syncInterval) clearInterval(syncInterval)
   if (hlink.value) {
      try { await hlink.value.stop() } catch(e){}
      try { hlink.value.clear() } catch(e){}
   }
})
</script>

<style scoped>
#reader { border: none !important; }

/* Override html5-qrcode styles to hide its ugly UI borders */
#reader video {
    object-fit: cover !important;
}
#reader__dashboard_section_csr { display: none !important; }
#reader__dashboard_section_swaplink { display: none !important; }
/* Attempt to hide default square boundary */
#reader__scan_region img { display: none !important; }

.no-scrollbar::-webkit-scrollbar { display: none; }

.list-enter-active, .list-leave-active { transition: all 0.5s ease; }
.list-enter-from, .list-leave-to { opacity: 0; transform: translateX(-30px); }

.pop-enter-active { animation: pop-in 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
.pop-leave-active { animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) reverse; }
@keyframes pop-in { 0% { opacity: 0; transform: scale(0.8); } 100% { opacity: 1; transform: scale(1); } }

.toast-enter-active { animation: toast-in 0.4s ease-out; }
.toast-leave-active { animation: toast-in 0.3s ease-in reverse; }
@keyframes toast-in { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
</style>
