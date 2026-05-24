<template>
  <div v-if="loading" class="animate-pulse space-y-4 max-w-6xl mx-auto px-4 sm:px-6 mt-6">
    <div class="h-32 bg-gray-100 rounded-[1.5rem]"></div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="h-64 bg-gray-100 rounded-[1.5rem]"></div>
      <div class="lg:col-span-2 h-64 bg-gray-100 rounded-[1.5rem]"></div>
    </div>
  </div>

  <div v-else-if="!district" class="text-center py-20 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm max-w-xl mx-auto mt-10 px-4">
    <div class="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
    </div>
    <h2 class="text-xl font-black text-gray-900 tracking-tight">Record Not Found</h2>
    <p class="text-xs text-gray-500 mt-2">The district you are looking for might have been moved or the ID is incorrect.</p>
    <button @click="router.push('/districts')" class="mt-6 px-6 py-2.5 text-xs bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-sm active:scale-95">
      Return to Directory
    </button>
  </div>

  <div v-else class="max-w-6xl mx-auto pb-20 px-4 sm:px-6 mt-4 sm:mt-6 space-y-4">
    
    <!-- Top Action / Breadcrumb -->
    <div class="flex items-center justify-between">
      <button @click="router.push('/districts')" class="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Directory
      </button>
    </div>

    <!-- Header Card -->
    <div class="bg-white rounded-[1.5rem] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 p-5 sm:p-6">
      <div class="flex flex-col md:flex-row gap-5 items-start md:items-center">
        
        <!-- District Icon -->
        <div class="flex items-center shrink-0">
          <div class="relative z-10">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.25rem] shadow-sm overflow-hidden flex items-center justify-center border-4 border-white"
                 :style="{ backgroundColor: district.theme_color || '#3b82f6' }">
              <span class="text-4xl font-black text-white uppercase">{{ district.district_name.charAt(0) }}</span>
            </div>
            <!-- Pin Badge -->
            <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center text-white shadow-sm bg-gray-900">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight truncate">{{ district.district_name }}</h1>
            <span class="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 border border-blue-100">Regional Allocation</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
            <span v-if="district.leader" @click="router.push(`/pastors/${district.leader.id}`)" class="cursor-pointer hover:text-blue-600 transition-colors truncate">Leader: {{ district.leader.full_name }}</span>
            <span v-else class="text-gray-400">Unassigned Leader</span>
            <span v-if="district.notes" class="mx-1">•</span>
            <span v-if="district.notes" class="truncate italic font-medium text-gray-400">"{{ district.notes }}"</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 w-full md:w-auto pt-4 md:pt-0 border-t border-gray-100 md:border-0 mt-2 md:mt-0 shrink-0 relative group">
          <button class="w-full md:w-auto px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Add Station
          </button>
          
          <!-- Dropdown Choice -->
          <div class="absolute right-0 top-full mt-2 w-48 bg-white border border-gray-100 rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 overflow-hidden">
             <button @click="openSelectionModal" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col transition-colors border-b border-gray-50">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-900">Select Existing</span>
                <span class="text-[9px] font-bold text-gray-400 uppercase">Search unassigned</span>
             </button>
             <button @click="openAddChurchModal" class="w-full text-left px-4 py-3 hover:bg-gray-50 flex flex-col transition-colors">
                <span class="text-[10px] font-black uppercase tracking-widest text-gray-900">Register New</span>
                <span class="text-[9px] font-bold text-gray-400 uppercase">Create fresh record</span>
             </button>
          </div>
        </div>
        
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      <!-- Left Sidebar (Stats) -->
      <div class="lg:col-span-1 space-y-4">
        
        <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">District Metrics</h3>
          </div>
          <div class="p-5 grid grid-cols-2 gap-4">
            
            <div class="flex flex-col items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
               <div class="text-xl font-black text-gray-900 mb-1">{{ churches.length }}</div>
               <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest text-center">Stations</div>
            </div>
            
            <div class="flex flex-col items-center p-3 bg-emerald-50 rounded-xl border border-emerald-100">
               <div class="text-xl font-black text-emerald-600 mb-1">{{ churches.filter(c => c.pastor).length }}</div>
               <div class="text-[9px] font-black text-emerald-500 uppercase tracking-widest text-center">Occupied</div>
            </div>

            <div class="flex flex-col items-center p-3 bg-red-50 rounded-xl border border-red-100">
               <div class="text-xl font-black text-red-600 mb-1">{{ churches.filter(c => !c.pastor).length }}</div>
               <div class="text-[9px] font-black text-red-500 uppercase tracking-widest text-center">Vacant</div>
            </div>

            <div class="flex flex-col items-center p-3 bg-amber-50 rounded-xl border border-amber-100">
               <div class="text-xl font-black text-amber-600 mb-1">{{ churches.filter(c => c.pastor && c.pastor.current_status_code === 'active').length }}</div>
               <div class="text-[9px] font-black text-amber-500 uppercase tracking-widest text-center">Active Ptrs</div>
            </div>

          </div>
        </div>

        <div v-if="district.leader" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors" @click="router.push(`/pastors/${district.leader.id}`)">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">District Leader</h3>
          </div>
          <div class="p-5 flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg overflow-hidden bg-blue-50 border border-blue-100 shrink-0 flex items-center justify-center font-black text-blue-600 uppercase">
               <img v-if="district.leader.pastor_image_url" :src="district.leader.pastor_image_url" class="w-full h-full object-cover" />
               <span v-else>{{ district.leader.full_name.charAt(0) }}</span>
             </div>
             <div class="min-w-0">
               <h4 class="font-bold text-gray-900 text-xs uppercase truncate">{{ district.leader.full_name }}</h4>
               <p class="text-[10px] font-bold text-gray-500 uppercase truncate">District Leader</p>
             </div>
          </div>
        </div>

      </div>

      <!-- Right Column (Congregations List) -->
      <div class="lg:col-span-2 space-y-4">
        
        <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 sm:p-6 min-h-[400px]">
          
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-5">
            <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Assigned Stations</h3>
            <div class="relative w-full sm:w-64">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input v-model="searchQuery" type="text" placeholder="Search station..." class="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
            </div>
          </div>

          <div v-if="filteredChurches.length === 0" class="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p class="font-bold uppercase tracking-widest text-[10px]">No results found.</p>
          </div>
          
          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="church in filteredChurches" :key="church.id" @click="$router.push(`/churches/${church.id}`)" class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-sm hover:bg-gray-50/50 transition-all cursor-pointer group">
                  <div class="w-10 h-10 rounded-lg overflow-hidden shrink-0 flex items-center justify-center font-black text-xs uppercase"
                       :class="church.pastor ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-red-50 text-red-600 border border-red-100'">
                      {{ church.church_name.charAt(0) }}
                  </div>
                  <div class="flex-1 min-w-0">
                      <div class="font-bold text-gray-900 uppercase text-xs truncate group-hover:text-indigo-600">{{ church.church_name }}</div>
                      <div class="text-[9px] font-bold text-gray-400 uppercase truncate">
                          {{ church.pastor ? 'Ptr. ' + church.pastor.full_name : 'Vacant' }}
                      </div>
                  </div>
                  <svg class="w-3.5 h-3.5 text-gray-300 shrink-0 group-hover:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Selection Modal (Link Existing Church) -->
    <div v-if="isSelectionModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6 overflow-y-auto py-10">
      <div class="bg-white rounded-[1.5rem] shadow-xl w-full max-w-xl flex flex-col relative my-auto animate-in slide-in-from-bottom duration-300">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[1.5rem]">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Select Station</h3>
          <button @click="isSelectionModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5">
           <div class="relative mb-4">
              <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
              <input v-model="selectionSearch" type="text" placeholder="Search by name or address..." class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
           </div>

           <div class="overflow-y-auto max-h-[50vh]">
             <div v-if="filteredAvailable.length === 0" class="py-12 text-center text-gray-400 border border-dashed border-gray-200 rounded-xl">
                <p class="text-[10px] font-black uppercase tracking-widest">No unassigned churches found.</p>
             </div>
             
             <div v-else class="space-y-2">
                <button v-for="c in filteredAvailable" :key="c.id" 
                   @click="linkChurch(c)"
                   :disabled="isLinking === c.id"
                   class="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all group text-left disabled:opacity-50">
                   <div class="flex items-center gap-3 min-w-0">
                      <div class="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center font-black text-gray-400 text-xs border border-gray-100 shrink-0">{{ c.church_name.charAt(0) }}</div>
                      <div class="min-w-0">
                         <div class="font-bold text-gray-900 uppercase text-xs truncate">{{ c.church_name }}</div>
                         <div class="text-[9px] font-bold text-gray-400 uppercase truncate">{{ c.church_address || 'No address' }}</div>
                      </div>
                   </div>
                   <div class="shrink-0 ml-2">
                      <span class="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[9px] font-black text-gray-500 uppercase group-hover:border-indigo-300 group-hover:text-indigo-600 transition-all">{{ isLinking === c.id ? 'LINKING...' : 'SELECT' }}</span>
                   </div>
                </button>
             </div>
           </div>
        </div>
      </div>
    </div>

    <!-- Modal Refresh (Add Church) -->
    <div v-if="isAddChurchModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6 overflow-y-auto py-10">
      <div class="bg-white rounded-[1.5rem] shadow-xl w-full max-w-lg flex flex-col relative my-auto animate-in slide-in-from-bottom duration-300">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[1.5rem]">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">New Station</h3>
          <button @click="closeAddChurchModal" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5">
          <form @submit.prevent="submitChurchForm" class="space-y-4">
            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Station Name</label>
              <input v-model="churchFormData.church_name" type="text" placeholder="e.g. DAVAO MAIN" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all uppercase" required />
            </div>
            
            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Location Address</label>
              <textarea v-model="churchFormData.church_address" rows="3" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none" required></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100 mt-2">
              <button type="button" @click="closeAddChurchModal" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSavingChurch" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                 {{ isSavingChurch ? 'Processing...' : 'Register' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { DistrictService } from '../services/db/DistrictService'
import { ChurchService } from '../services/db/ChurchService'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'

const route = useRoute()
const router = useRouter()
const district = ref(null)
const churches = ref([])
const loading = ref(true)

const searchQuery = ref('')

const filteredChurches = computed(() => {
    let result = churches.value
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(c => 
            c.church_name?.toLowerCase().includes(q) || 
            (c.church_address && c.church_address.toLowerCase().includes(q))
        )
    }
    return result
})

// Selection Modal State (Existing Churches)
const isSelectionModalOpen = ref(false)
const availableChurches = ref([])
const selectionSearch = ref('')
const isLinking = ref(null)

const filteredAvailable = computed(() => {
    let result = availableChurches.value
    if (selectionSearch.value) {
        const q = selectionSearch.value.toLowerCase()
        result = result.filter(c => 
            c.church_name?.toLowerCase().includes(q) || 
            (c.church_address && c.church_address.toLowerCase().includes(q))
        )
    }
    return result
})

const openSelectionModal = async () => {
    isSelectionModalOpen.value = true
    try {
        const res = await ChurchService.getAll()
        // Client-side filter for unassigned churches
        availableChurches.value = res.filter(c => !c.district_id)
    } catch (e) {
        console.error("Failed to load unassigned churches")
    }
}

const linkChurch = async (church) => {
    isLinking.value = church.id
    try {
        await ChurchService.update(church.id, {
            church_name: church.church_name,
            church_address: church.church_address,
            church_scope: church.church_scope,
            district_id: district.value.id
        })
        isSelectionModalOpen.value = false
        await fetchDistrict() // refresh
    } catch (e) {
        alert("Failed to link station")
    } finally {
        isLinking.value = null
    }
}

// Add Church Modal State
const isAddChurchModalOpen = ref(false)
const isSavingChurch = ref(false)
const churchFormData = ref({ church_name: '', church_address: '' })

const openAddChurchModal = () => {
    churchFormData.value = { church_name: '', church_address: '' }
    isAddChurchModalOpen.value = true
}

const closeAddChurchModal = () => {
    isAddChurchModalOpen.value = false
}

const submitChurchForm = async () => {
    const summaryHtml = generateSummaryHtml(churchFormData.value)
    
    const result = await Swal.fire({
        title: 'Register Station?',
        text: 'Please review the station details before registering:',
        html: summaryHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, register it'
    })
    
    if (!result.isConfirmed) return;

    isSavingChurch.value = true
    try {
        await ChurchService.create({
           ...churchFormData.value,
           district_id: route.params.id,
           church_scope: 'local'
        })
        closeAddChurchModal()
        await fetchDistrict() // refresh
    } catch (e) {
        alert(e.response?.data?.message || "Failed to add church")
    } finally {
        isSavingChurch.value = false
    }
}

const fetchDistrict = async () => {
    loading.value = true
    try {
        district.value = await DistrictService.getById(route.params.id)
        // Because backend injects churches array inside the district object
        churches.value = district.value.churches || [] 
    } catch (e) {
        console.error("Failed to load district data:", e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchDistrict()
})
</script>

<style scoped>
/* Mobile adjustments for dropdown if needed */
</style>
