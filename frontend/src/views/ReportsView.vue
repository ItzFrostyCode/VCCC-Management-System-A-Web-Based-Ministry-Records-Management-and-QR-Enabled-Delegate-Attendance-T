<template>
  <div class="h-full flex flex-col bg-white overflow-hidden">
    <!-- Controls -->
    <div class="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 shrink-0">
      <div class="w-full sm:w-64">
         <SearchableSelect
            flat
            v-model="selectedConferenceId"
            :options="conferenceOptions"
            label-key="displayName"
            value-key="id"
            placeholder="Select a conference..."
            :show-clear-option="false"
            required
         />
      </div>

      <div class="w-full sm:w-48">
         <SearchableSelect
            flat
            v-model="districtFilter"
            :options="districtOptions"
            label-key="name"
            value-key="name"
            placeholder="All Districts"
            clear-placeholder="All Districts"
         />
      </div>

      <div class="w-full sm:w-48">
         <SearchableSelect
            flat
            v-model="churchFilter"
            :options="churchOptions"
            label-key="name"
            value-key="name"
            placeholder="All Churches"
            clear-placeholder="All Churches"
         />
      </div>

      <input v-model="searchQuery" type="text" placeholder="Search delegate..." class="flex-1 bg-white border border-gray-300 px-3 py-2 text-xs font-bold text-black placeholder-gray-400 outline-none w-full" />

      <button v-if="conference" @click="exportToExcel" class="px-4 py-2 border border-black bg-black text-white text-xs font-bold uppercase tracking-wide shrink-0">
         Export
      </button>
    </div>

    <!-- Empty State (no conference selected yet) -->
    <div v-if="!selectedConferenceId" class="flex-1 flex items-center justify-center px-4">
       <p class="text-sm font-bold text-gray-500">Select a conference to view its attendance report.</p>
    </div>

    <div v-else class="flex-1 overflow-y-auto">
       <!-- Summary -->
       <div class="px-4 sm:px-6 py-3 border-b border-gray-200 flex flex-wrap gap-x-8 gap-y-1 text-xs font-bold text-black">
          <span>Total Delegates: {{ reportData.totalDelegates }}</span>
          <span>Scanned: {{ reportData.activeAttendees }}</span>
          <span>Not Scanned: {{ reportData.inactiveAttendees }}</span>
          <span>Scan Rate: {{ reportData.engagementRate }}%</span>
          <span>Total Scans: {{ reportData.totalScans }}</span>
       </div>

       <!-- Data Table -->
       <div class="overflow-x-auto">
          <table class="border-collapse">
              <thead>
                <tr class="text-[10px] font-bold text-black uppercase">
                   <th class="border border-gray-300 px-3 py-2 whitespace-nowrap">Delegate</th>
                   <th v-for="slot in reportData.columns" :key="slot.id" class="border border-gray-300 px-3 py-2 text-center whitespace-nowrap">{{ slot.label }}</th>
                </tr>
             </thead>
             <tbody>
                <template v-for="dgroup in groupedMatrix" :key="dgroup.district">
                   <tr>
                      <td :colspan="1 + reportData.columns.length" class="border border-gray-300 px-3 py-1.5 bg-gray-200 text-[10px] font-black text-black uppercase whitespace-nowrap">{{ dgroup.district }}</td>
                   </tr>
                   <template v-for="cgroup in dgroup.churches" :key="cgroup.church">
                      <tr>
                         <td :colspan="1 + reportData.columns.length" class="border border-gray-300 px-3 py-1 pl-6 bg-gray-50 text-[10px] font-bold text-black uppercase whitespace-nowrap">{{ cgroup.church }}</td>
                      </tr>
                      <tr v-for="person in cgroup.people" :key="person.id" class="text-xs text-black">
                         <td class="border border-gray-300 px-3 py-2 pl-8 font-bold whitespace-nowrap">{{ person.name }} <span class="text-gray-500 font-normal">({{ roleAbbrev(person.role) }})</span></td>
                         <td v-for="slot in reportData.columns" :key="slot.id" class="border border-gray-300 px-3 py-2 text-center">
                            {{ person.attendance[slot.id] ? '✓' : '—' }}
                         </td>
                      </tr>
                   </template>
                </template>
             </tbody>
          </table>
          <div v-if="filteredMatrix.length === 0" class="p-10 text-center text-xs font-bold text-gray-500">
             No matching delegates.
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { ConferenceService } from '../services/db/ConferenceService'
import { PastorService } from '../services/db/PastorService'
import { DiscipleService } from '../services/db/DiscipleService'
import { AttendanceService } from '../services/db/AttendanceService'
import { exportAttendanceMatrix } from '../services/export/attendance-export'
import SearchableSelect from '../components/SearchableSelect.vue'

const conferences = ref([])
const selectedConferenceId = ref('')
const conference = ref(null)
const searchQuery = ref('')
const districtFilter = ref('')
const churchFilter = ref('') // '' (all) | <specific church name>

const conferenceOptions = computed(() =>
   conferences.value.map(c => ({ id: c.id, displayName: c.theme || c.title }))
)
const reportData = ref({
   totalDelegates: 0,
   activeAttendees: 0,
   inactiveAttendees: 0,
   engagementRate: 0,
   totalScans: 0,
   columns: [],
   matrix: []
})

const roleAbbrev = (role) => ({ PASTOR: 'P', WIFE: 'W', DISCIPLE: 'D' }[role] || role)

const districtOptions = computed(() => {
   const set = new Set(reportData.value.matrix.map(p => p.district).filter(d => d && d !== 'No District'))
   return [...set].sort().map(name => ({ name }))
})

const churchOptions = computed(() => {
   const set = new Set(reportData.value.matrix.map(p => p.church).filter(c => c && c !== 'No Church'))
   return [...set].sort((a, b) => a.localeCompare(b)).map(name => ({ name }))
})

const filteredMatrix = computed(() => {
   let result = reportData.value.matrix
   if (searchQuery.value) {
      const q = searchQuery.value.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.church.toLowerCase().includes(q))
   }
   if (districtFilter.value) {
      result = result.filter(p => p.district === districtFilter.value)
   }
   if (churchFilter.value) {
      result = result.filter(p => p.church === churchFilter.value)
   }
   return result
})

const ROLE_ORDER = { PASTOR: 0, WIFE: 1, DISCIPLE: 2 }
const byName = (a, b) => a === 'No District' || a === 'No Church' ? 1 : b === 'No District' || b === 'No Church' ? -1 : a.localeCompare(b)

const groupedMatrix = computed(() => {
   const districts = new Map()
   filteredMatrix.value.forEach(p => {
      if (!districts.has(p.district)) districts.set(p.district, new Map())
      const churches = districts.get(p.district)
      if (!churches.has(p.church)) churches.set(p.church, [])
      churches.get(p.church).push(p)
   })

   return [...districts.entries()]
      .sort(([a], [b]) => byName(a, b))
      .map(([district, churches]) => ({
         district,
         churches: [...churches.entries()]
            .sort(([a], [b]) => byName(a, b))
            .map(([church, people]) => ({
               church,
               people: [...people].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role])
            }))
      }))
})

const fetchConferences = async () => {
   conferences.value = await ConferenceService.getAll()
   if (conferences.value.length > 0 && !selectedConferenceId.value) {
      selectedConferenceId.value = conferences.value[0].id
   }
}

// A pastor's current church lives on their active assignment, not directly on the pastor record.
const getActiveChurch = (pastor) => {
   const active = pastor.assignments?.find(a => a.status_code === 'active')
   return active?.church || null
}

const fetchReport = async () => {
   const confId = selectedConferenceId.value
   if (!confId) {
      conference.value = null
      return
   }
   try {
      // 1. Fetch Conference & All Delegates
      const [confData, allPastors, allDisciples, attendees] = await Promise.all([
         ConferenceService.getById(confId),
         PastorService.getAll(),
         DiscipleService.getAll(),
         AttendanceService.getByConference(confId)
      ])

      conference.value = confData

      // 2. Build Columns (Day X - Slot), abbreviated (e.g. D1-M, D1-A, D1-E)
      const cols = []
      conference.value.days.forEach(day => {
         conference.value.timeSlots.forEach(slot => {
            cols.push({
               id: `${day.id}_${slot.id}`,
               label: `D${day.day_index}-${slot.name.charAt(0)}`,
               day_id: day.id,
               slot_id: slot.id
            })
         })
      })

      // 3. Build Person List (Master Matrix)
      const mat = []

      // Index attendance once (O(scans)) instead of rescanning it for every person (O(people x scans)).
      // Keyed by delegate_id + delegate_type because a pastor and his wife share the same delegate_id
      // (only delegate_type tells them apart) - keying by id alone would show the pastor as "scanned"
      // whenever only the wife scanned in, and vice versa.
      const attByDelegate = new Map()
      attendees.forEach(a => {
         const key = `${a.delegate_id}_${a.delegate_type}`
         if (!attByDelegate.has(key)) attByDelegate.set(key, [])
         attByDelegate.get(key).push(a)
      })

      const processPerson = (p, role, name, church) => {
         const attMap = {}
         let hasCheckedIn = false
         const records = attByDelegate.get(`${p.id}_${role}`)
         if (records) {
            hasCheckedIn = true
            records.forEach(a => { attMap[`${a.day_id}_${a.slot_id}`] = true })
         }
         mat.push({
            id: p.id,
            name: name,
            role: role,
            church: church?.church_name || 'No Church',
            district: church?.district?.district_name || 'No District',
            attendance: attMap,
            hasCheckedIn
         })
      }

      allPastors.forEach(p => {
         const church = getActiveChurch(p)
         processPerson(p, 'PASTOR', p.full_name, church)
         if (p.wife_name) processPerson(p, 'WIFE', p.wife_name, church)
      })
      allDisciples.forEach(d => processPerson(d, 'DISCIPLE', d.full_name, d.church))

      const active = mat.filter(p => p.hasCheckedIn).length

      reportData.value = {
         totalDelegates: mat.length,
         activeAttendees: active,
         inactiveAttendees: mat.length - active,
         engagementRate: mat.length ? Math.round((active / mat.length) * 100) : 0,
         totalScans: attendees.length,
         columns: cols,
         matrix: mat
      }
   } catch (e) {
      console.error("Report Load Error:", e)
   }
}

const exportToExcel = () => {
   exportAttendanceMatrix(
      conference.value,
      reportData.value.columns,
      groupedMatrix.value
   )
}

watch(selectedConferenceId, fetchReport)

onMounted(async () => {
   await fetchConferences()
   fetchReport()
})
</script>
