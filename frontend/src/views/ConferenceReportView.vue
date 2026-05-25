<template>
  <div class="h-full flex flex-col bg-gray-50 overflow-hidden">
    <!-- Header -->
    <div class="px-4 py-3 sm:px-8 sm:py-6 bg-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shrink-0 z-10 relative">
      <div class="flex items-start sm:items-center gap-3 min-w-0">
        <router-link to="/conferences" class="p-2 sm:p-2.5 bg-transparent hover:bg-gray-100/50 rounded-lg sm:rounded-xl text-gray-500 transition-colors border border-gray-200/60 shadow-sm shrink-0 mt-0.5 sm:mt-0">
           <svg class="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        </router-link>
        <div class="min-w-0 flex-1">
           <div class="flex items-center gap-2 mb-0.5 sm:mb-1.5">
              <h1 class="text-sm sm:text-xl font-black text-gray-900 leading-tight tracking-tight truncate">{{ conference?.theme || conference?.title || 'Loading Report...' }}</h1>
              <span class="hidden sm:inline-block px-2.5 py-1 bg-indigo-50/80 text-indigo-600 text-[9px] font-black rounded-lg uppercase tracking-widest border border-indigo-100/50 shrink-0">Analytics</span>
           </div>
           <p class="text-[8px] sm:text-[10px] text-indigo-600 font-black uppercase tracking-widest truncate">{{ conference?.location || 'General Report' }}</p>
        </div>
      </div>

      <div class="flex items-center gap-3 self-end sm:self-auto shrink-0">
         <button @click="exportToExcel" class="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-1.5 sm:py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-[9px] sm:text-[10px] font-black rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] uppercase tracking-widest">
            <svg class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            <span class="hidden sm:inline">Export to Excel</span>
         </button>
      </div>
    </div>

    <!-- Analytics Dashboard -->
    <div class="flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-8">
       <!-- Summary Row -->
       <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-transform">
             <div class="text-[8px] sm:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 sm:mb-3 truncate">Total Delegates</div>
             <div class="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">{{ reportData.totalDelegates }}</div>
             <div class="mt-1 sm:mt-3 text-[8px] sm:text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50/80 inline-block px-1.5 sm:px-2 py-1 rounded-md truncate max-w-full">Registered in DB</div>
          </div>
          <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-emerald-500 hover:-translate-y-1 transition-transform">
             <div class="text-[8px] sm:text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 sm:mb-3 truncate">Engaged Delegates</div>
             <div class="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">{{ reportData.activeAttendees }}</div>
             <div class="mt-1 sm:mt-3 text-[8px] sm:text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50/80 inline-block px-1.5 sm:px-2 py-1 rounded-md truncate max-w-full">{{ reportData.engagementRate }}% Engagement Rate</div>
          </div>
          <div class="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border-l-4 border-l-rose-500 hover:-translate-y-1 transition-transform">
             <div class="text-[8px] sm:text-[9px] font-black text-rose-500 uppercase tracking-widest mb-1 sm:mb-3 truncate">Inactive / Absent</div>
             <div class="text-2xl sm:text-4xl font-black text-gray-900 tracking-tight">{{ reportData.inactiveAttendees }}</div>
             <div class="mt-1 sm:mt-3 text-[8px] sm:text-[9px] font-bold text-rose-500 uppercase tracking-widest bg-rose-50/80 inline-block px-1.5 sm:px-2 py-1 rounded-md truncate max-w-full">No Scans Recorded</div>
          </div>
          <div class="bg-gradient-to-br from-indigo-600 to-violet-600 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl shadow-indigo-500/20 text-white hover:-translate-y-1 transition-transform">
             <div class="text-[8px] sm:text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-1 sm:mb-3 truncate">Total Scans</div>
             <div class="text-2xl sm:text-4xl font-black tracking-tight">{{ reportData.totalScans }}</div>
             <div class="mt-1 sm:mt-3 text-[8px] sm:text-[9px] font-bold text-white uppercase tracking-widest bg-white/10 inline-block px-1.5 sm:px-2 py-1 rounded-md backdrop-blur-sm truncate max-w-full">Across All Slots</div>
          </div>
       </div>

       <!-- Main Matrix -->
       <div class="bg-white border border-gray-100/80 rounded-3xl overflow-hidden shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] flex flex-col">
          <div class="px-8 py-6 border-b border-gray-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
             <h2 class="text-[10px] font-black text-gray-900 uppercase tracking-widest">Attendance Matrix</h2>
             <div class="relative w-full sm:w-72">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                </div>
                <input v-model="searchQuery" type="text" placeholder="Search Delegate..." class="w-full bg-white border border-gray-200/80 pl-10 pr-4 py-3 rounded-xl text-xs font-bold text-gray-700 placeholder-gray-400 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all shadow-sm" />
             </div>
          </div>

          <div class="overflow-x-auto">
             <table class="w-full text-left">
                 <thead>
                   <tr class="bg-gray-50/50 text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100/80">
                      <th class="px-8 py-5 min-w-[250px]">Delegate Details</th>
                      <th v-for="slot in reportData.columns" :key="slot.id" class="px-4 py-5 text-center border-l border-gray-100/50">
                         <div class="truncate max-w-[80px] text-gray-500" :title="slot.label">{{ slot.label }}</div>
                      </th>
                   </tr>
                </thead>
                <tbody class="divide-y divide-gray-100/50">
                   <tr v-for="person in filteredMatrix" :key="person.id" class="hover:bg-indigo-50/30 transition-colors group">
                      <td class="px-8 py-4">
                         <div class="flex items-center gap-4">
                            <div :class="['w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shadow-sm border border-white/50', person.role === 'PASTOR' ? 'bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 border-indigo-100/50' : (person.role === 'WIFE' ? 'bg-gradient-to-br from-rose-100 to-rose-50 text-rose-600 border-rose-100/50' : 'bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 border-emerald-100/50')]">
                               {{ person.role.charAt(0) }}
                            </div>
                             <div class="min-w-0">
                                <div class="text-sm font-black text-gray-900 tracking-tight truncate">{{ person.name }}</div>
                                <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5 truncate">
                                  {{ person.church }} <span v-if="person.district !== 'No District'">• {{ person.district }}</span>
                                </div>
                             </div>
                         </div>
                      </td>
                      <td v-for="slot in reportData.columns" :key="slot.id" class="px-4 py-4 border-l border-gray-100/30 text-center">
                         <div v-if="person.attendance[slot.id]" class="flex justify-center">
                            <div class="w-6 h-6 bg-gradient-to-br from-emerald-400 to-emerald-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 transition-transform cursor-default">
                               <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="4"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
                            </div>
                         </div>
                         <div v-else class="text-gray-200 font-black tracking-widest">—</div>v>
                      </td>
                   </tr>
                </tbody>
             </table>
             <div v-if="filteredMatrix.length === 0" class="p-20 text-center">
                <div class="text-gray-300 font-black uppercase tracking-widest text-[10px]">No Matching Delegates</div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { ConferenceService } from '../services/db/ConferenceService'
import { PastorService } from '../services/db/PastorService'
import { DiscipleService } from '../services/db/DiscipleService'
import { AttendanceService } from '../services/db/AttendanceService'
import { exportAttendanceMatrix } from '../services/export/attendance-export'

const route = useRoute()
const conference = ref(null)
const searchQuery = ref('')
const reportData = ref({
   totalDelegates: 0,
   activeAttendees: 0,
   inactiveAttendees: 0,
   engagementRate: 0,
   totalScans: 0,
   columns: [],
   matrix: []
})

const filteredMatrix = computed(() => {
   if (!searchQuery.value) return reportData.value.matrix
   const q = searchQuery.value.toLowerCase()
   return reportData.value.matrix.filter(p => p.name.toLowerCase().includes(q) || p.church.toLowerCase().includes(q))
})

const fetchReport = async () => {
   const confId = route.params.id
   try {
      // 1. Fetch Conference & All Delegates
      const [confData, allPastors, allDisciples, attendees] = await Promise.all([
         ConferenceService.getById(confId),
         PastorService.getAll(),
         DiscipleService.getAll(),
         AttendanceService.getByConference(confId)
      ])

      conference.value = confData

      // 2. Build Columns (Day X - Slot)
      const cols = []
      conference.value.days.forEach(day => {
         conference.value.timeSlots.forEach(slot => {
            cols.push({
               id: `${day.id}_${slot.id}`,
               label: `D${day.day_index} ${slot.name.charAt(0)}${slot.name.slice(1).toLowerCase()}`,
               day_id: day.id,
               slot_id: slot.id
            })
         })
      })

      // 3. Build Person List (Master Matrix)
      const mat = []
      let totalP = 0
      
      const processPerson = (p, role, name) => {
         const attMap = {}
         let hasCheckedIn = false
         attendees.forEach(a => {
            if (a.delegate_id === p.id) {
               attMap[`${a.day_id}_${a.slot_id}`] = true
               hasCheckedIn = true
            }
         })
         mat.push({
            id: p.id,
            name: name,
            role: role,
            church: p.church?.church_name || 'No Church',
            district: p.church?.district?.district_name || 'No District',
            attendance: attMap,
            hasCheckedIn
         })
      }

      allPastors.forEach(p => {
         processPerson(p, 'PASTOR', p.full_name)
         if (p.wife_name) processPerson(p, 'WIFE', p.wife_name)
      })
      allDisciples.forEach(d => processPerson(d, 'DISCIPLE', d.full_name))

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
      reportData.value.matrix
   )
}

onMounted(fetchReport)
</script>

<style scoped>
.animate-pop-check { animation: popCheck 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
@keyframes popCheck {
   from { transform: scale(0.5); opacity: 0; }
   to { transform: scale(1); opacity: 1; }
}
</style>
