<template>
  <div class="h-full flex flex-col relative p-6">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <p class="text-sm font-semibold text-gray-500 tracking-tight">Manage scheduled conferences, days, and attendance slots.</p>
      <div class="flex gap-3 shrink-0">
        <button @click="handleExport" class="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button @click="openModal()" class="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          New Conference
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="relative w-full mb-6">
      <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <div class="pl-4 flex items-center pointer-events-none shrink-0">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Search conference title..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">
      </div>
    </div>

    <!-- Conference List -->
    <div class="space-y-4">
      <template v-if="loading">
        <div v-for="i in 6" :key="i" class="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/80 animate-pulse flex flex-col">
          <div class="flex justify-between items-start mb-4">
          <div class="w-10 h-10 bg-gray-100 rounded-lg"></div>
          <div class="flex gap-2">
             <div class="w-7 h-7 bg-gray-50 rounded-lg"></div>
             <div class="w-7 h-7 bg-gray-50 rounded-lg"></div>
          </div>
        </div>
        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div class="h-3 bg-gray-100 rounded w-1/2 mb-4"></div>
        <div class="h-7 bg-gray-50 rounded-lg w-full mb-4"></div>
        <div class="flex gap-2 mt-auto pt-4 border-t border-gray-100">
           <div class="flex-1 h-9 bg-gray-50 rounded-lg"></div>
           <div class="w-12 h-9 bg-gray-50 rounded-lg"></div>
        </div>
        </div>
      </template>
      
      <template v-else-if="filteredConferences.length === 0">
        <div class="py-24 text-center">
          <div class="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-5 text-gray-300">
            <svg class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          </div>
          <h3 class="text-gray-900 font-bold text-lg tracking-tight">No Conferences</h3>
          <p class="text-gray-500 text-sm mt-1 font-medium">Start by creating your first scheduled event.</p>
        </div>
      </template>
      
      <template v-else>
        <template v-for="conf in filteredConferences" :key="conf.id">
          <div class="bg-white p-5 rounded-2xl shadow-sm border border-gray-200/60 hover:shadow-md transition-all group relative flex flex-col w-full">
            <div class="flex justify-between items-start mb-3">
              <div class="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100/50">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              </div>
              <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button @click="openModal(conf)" class="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button @click="deleteConference(conf)" class="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            
            <h3 class="text-base font-bold text-gray-900 mb-1 tracking-tight line-clamp-2 leading-tight">{{ conf.theme || conf.title }}</h3>
            <p class="text-[10px] font-black uppercase tracking-widest text-indigo-600 mb-4 line-clamp-2 leading-tight">{{ conf.location || 'No Location Set' }}</p>
            
            <div class="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-gray-500 bg-gray-50 px-2.5 py-2 rounded-lg border border-gray-100 mb-4 w-fit">
              <svg class="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              {{ formatDate(conf.start_date) }} - {{ formatDate(conf.end_date) }}
            </div>

            <div class="mt-auto pt-4 border-t border-gray-100/80 flex gap-2">
              <router-link :to="`/scanner?confId=${conf.id}`" class="flex-1 flex justify-center items-center gap-2 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-indigo-700 transition-colors shadow-sm">
                  <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v1m6 11h2m-6 0h-2m4-4V8m4 8a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Scan
              </router-link>
              <router-link :to="`/conferences/${conf.id}/report`" class="px-4 flex justify-center items-center gap-2 py-2 bg-white text-gray-600 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-gray-50 transition-colors border border-gray-200 shadow-sm" title="Report">
                  <svg class="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2"/></svg>
              </router-link>
            </div>
          </div>
        </template>
      </template>
    </div>

    <!-- Modal Form (Create/Edit) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Edit Conference' : 'New Conference' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-6 bg-gray-50/30">
          <form @submit.prevent="submitForm" class="space-y-5">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Title <span class="text-red-500">*</span></label>
              <input v-model="formData.title" required type="text" placeholder="e.g. Annual Pastoral Conference 2026" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
            </div>
            
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Theme (Optional)</label>
              <input v-model="formData.theme" type="text" placeholder="e.g. Arise and Shine" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Location</label>
              <input v-model="formData.location" type="text" placeholder="e.g. Victory Chapel Davao" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
            </div>

            <div class="grid grid-cols-2 gap-5">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Start Date <span class="text-red-500">*</span></label>
                <input v-model="formData.start_date" required type="date" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">End Date <span class="text-red-500">*</span></label>
                <input v-model="formData.end_date" required type="date" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
            </div>

            <div v-if="!isEditing && calculatedDays.length === 0" class="p-4 bg-amber-50/80 rounded-xl border border-amber-100/50 shadow-sm">
               <div class="flex gap-3 items-center">
                  <svg class="w-5 h-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  <p class="text-[10px] text-amber-700 font-bold leading-relaxed uppercase tracking-widest">Select dates to generate the meal slot configuration grid.</p>
               </div>
            </div>

            <div v-if="!isEditing && calculatedDays.length > 0" class="border border-gray-200/80 rounded-xl overflow-hidden bg-white shadow-sm">
               <div class="grid grid-cols-4 gap-2 bg-[#f1f5f9] p-3 text-[9px] font-black text-gray-500 uppercase tracking-widest border-b border-gray-200/80 text-center">
                  <div class="text-left pl-3">Day</div><div>Morning</div><div>Afternoon</div><div>Evening</div>
               </div>
               <div class="divide-y divide-gray-100/80 max-h-48 overflow-y-auto">
                  <div v-for="day in calculatedDays" :key="day.index" class="grid grid-cols-4 gap-2 p-3 items-center hover:bg-[#f8fafc] transition-colors">
                     <div class="text-[11px] font-black text-gray-800 pl-3 uppercase tracking-widest">Day {{ day.index }}</div>
                     <div v-for="slot in ['MORNING', 'AFTERNOON', 'EVENING']" :key="slot" class="flex justify-center">
                        <input type="checkbox" v-model="slotsMap[`day-${day.index}-${slot}`]" class="w-4 h-4 text-indigo-600 bg-white border-gray-300 rounded focus:ring-indigo-500 cursor-pointer shadow-sm">
                     </div>
                  </div>
               </div>
               <div class="p-3 bg-[#f8fafc] text-[9px] text-gray-500 font-bold uppercase tracking-widest text-center border-t border-gray-100/80">Uncheck slots to skip meal generation for that period.</div>
            </div>

            <div class="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-6">
              <button type="button" @click="closeModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                 {{ isSaving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Conference') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, onActivated } from 'vue'
import { ConferenceService } from '../services/db/ConferenceService'
import { exportConferences } from '../services/export/conference-export'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'

const conferences = ref([])
const loading = ref(true)
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const editingId = ref(null)
const searchQuery = ref('')

const filteredConferences = computed(() => {
  if (!searchQuery.value) return conferences.value
  const q = searchQuery.value.toLowerCase()
  return conferences.value.filter(c => 
    c.title?.toLowerCase().includes(q) || 
    c.theme?.toLowerCase().includes(q)
  )
})

const formData = ref({
  title: '',
  theme: '',
  location: '',
  start_date: '',
  end_date: ''
})

const slotsMap = ref({})

const calculatedDays = computed(() => {
  if (!formData.value.start_date || !formData.value.end_date) return []
  const d1 = new Date(formData.value.start_date)
  const d2 = new Date(formData.value.end_date)
  d1.setHours(0,0,0,0)
  d2.setHours(0,0,0,0)
  if (d1 > d2) return []
  
  const diffTime = Math.abs(d2 - d1)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays > 31) return [] // Max days
  
  const days = []
  for (let i = 0; i <= diffDays; i++) {
     days.push({ index: i + 1 })
  }
  return days
})

watch(calculatedDays, (days) => {
  if(!isEditing.value) {
    const newMap = {}
    days.forEach(d => {
       ['MORNING', 'AFTERNOON', 'EVENING'].forEach(slot => {
           newMap[`day-${d.index}-${slot}`] = true
       })
    })
    slotsMap.value = newMap
  }
})

const fetchData = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    conferences.value = await ConferenceService.getAll()
  } catch (error) {
    console.error(error)
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => fetchData())
onActivated(() => fetchData(true))

const handleExport = () => {
  exportConferences(conferences.value)
}

const openModal = (conf = null) => {
  if (conf) {
    isEditing.value = true
    editingId.value = conf.id
    formData.value = {
      title: conf.title,
      theme: conf.theme,
      location: conf.location,
      start_date: conf.start_date?.split('T')[0], // Extract date only
      end_date: conf.end_date?.split('T')[0]
    }
  } else {
    isEditing.value = false
    editingId.value = null
    formData.value = { title: '', theme: '', location: '', start_date: '', end_date: '' }
  }
  isModalOpen.value = true
}

const closeModal = () => { isModalOpen.value = false }

const submitForm = async () => {
  const summaryHtml = generateSummaryHtml(formData.value)
  
  const result = await Swal.fire({
      title: 'Save Conference?',
      text: 'Please review the conference details before saving:',
      html: summaryHtml,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#111827',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, save it'
  })
  
  if (!result.isConfirmed) return;

  isSaving.value = true
  try {
    const payload = { ...formData.value, slots_map: slotsMap.value }
    if (isEditing.value) {
      await ConferenceService.update(editingId.value, payload)
    } else {
      await ConferenceService.create(payload, slotsMap.value)
    }
    closeModal()
    fetchData()
  } catch (error) {
    alert(error.response?.data?.message || "Failed to save conference")
  } finally {
    isSaving.value = false
  }
}

const deleteConference = async (conf) => {
  const result = await Swal.fire({
      title: 'Delete Conference?',
      text: `Are you sure you want to remove "${conf.title}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#9ca3af',
      confirmButtonText: 'Yes, delete it'
  })
  
  if (result.isConfirmed) {
    try {
      await ConferenceService.softDelete(conf.id)
      fetchData()
    } catch (error) {
      alert("Failed to delete conference. Check if there are active attendance records.")
    }
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString()
}

</script>
