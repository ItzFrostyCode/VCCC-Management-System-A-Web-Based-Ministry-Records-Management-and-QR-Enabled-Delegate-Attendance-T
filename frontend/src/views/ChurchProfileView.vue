<template>
  <div v-if="loading" class="animate-pulse space-y-4 max-w-6xl mx-auto px-4 sm:px-6 mt-6">
    <div class="h-32 bg-gray-100 rounded-lg"></div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="h-64 bg-gray-100 rounded-lg"></div>
      <div class="lg:col-span-2 h-64 bg-gray-100 rounded-lg"></div>
    </div>
  </div>

  <div v-else-if="!church" class="text-center py-20 bg-white rounded-lg border border-gray-100 shadow-sm max-w-xl mx-auto mt-10 px-4">
    <div class="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
    </div>
    <h2 class="text-xl font-black text-gray-900 tracking-tight">Record Not Found</h2>
    <p class="text-xs text-gray-500 mt-2">The church you are looking for might have been moved or the ID is incorrect.</p>
    <div v-if="debugError" class="mt-4 p-4 bg-red-50 text-red-600 rounded-md text-xs font-mono text-left overflow-auto">
      Error: {{ debugError }}
    </div>
    <button @click="goBack" class="mt-6 px-6 py-2.5 text-xs bg-gray-900 text-white font-bold rounded-md hover:bg-black transition-all shadow-sm active:scale-95">
      Return to Directory
    </button>
  </div>

  <div v-else class="max-w-6xl mx-auto pb-20 px-4 sm:px-6 mt-4 sm:mt-6 space-y-4">
    
    <!-- Top Action / Breadcrumb -->
    <div class="flex items-center justify-between">
      <button @click="goBack" class="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Directory
      </button>
    </div>

    <!-- Header Card -->
    <div class="bg-white rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 p-5 sm:p-6">
      <div class="flex flex-col md:flex-row gap-5 items-start md:items-center">
        
        <!-- Logo -->
        <div class="shrink-0">
          <div class="w-16 h-16 rounded-md border border-gray-200 overflow-hidden bg-gray-50 flex items-center justify-center p-2">
            <img src="/victory_chappel_logo-removebg-preview.png" class="w-full h-full object-contain" alt="Church Logo" />
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight truncate">{{ church.church_name }}</h1>
            <span class="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold uppercase tracking-widest shrink-0">{{ church.church_scope || 'Local' }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider truncate">
            <span v-if="church.district_id" @click="router.push(`/districts/${church.district_id}`)" class="cursor-pointer hover:text-indigo-600 transition-colors">Dist: {{ church.district?.district_name || 'Unknown' }}</span>
            <span v-else class="text-gray-400">Unassigned District</span>
            <span v-if="church.mother_church_id" class="mx-1">•</span>
            <span v-if="church.mother_church_id" class="truncate">Mother: {{ church.mother_church?.church_name || 'Unknown' }}</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 w-full md:w-auto pt-4 md:pt-0 border-t border-gray-100 md:border-0 mt-2 md:mt-0 shrink-0">
          <button @click="openModal" class="w-full md:w-auto px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-md transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            Record Entry
          </button>
        </div>
        
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      
      <!-- Left Sidebar (Details) -->
      <div class="lg:col-span-1 space-y-4 lg:sticky lg:top-4">
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</h3>
          </div>
          <div class="p-5 space-y-4">
            
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-gray-400 uppercase">Primary Location</p>
                <p class="text-xs font-bold text-gray-900 line-clamp-2">{{ church.church_address || 'No address provided' }}</p>
              </div>
            </div>

            <div class="flex items-start gap-3 border-t border-gray-50 pt-4">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-gray-400 uppercase">Total History Records</p>
                <p class="text-xs font-bold text-gray-900 truncate">{{ assignments.length }} Assignment(s)</p>
              </div>
            </div>

          </div>
        </div>

        <div v-if="church.pioneer_pastor_id" class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pioneer / Founder</h3>
          </div>
          <div class="p-5 flex items-center gap-3">
             <div class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
             </div>
             <div class="min-w-0">
               <p class="text-[10px] font-bold text-gray-400 uppercase">Founded By</p>
               <p @click="router.push(`/pastors/${church.pioneer_pastor_id}`)" class="text-xs font-black text-indigo-600 uppercase hover:text-indigo-900 cursor-pointer truncate">Ptr. {{ church.pioneer_pastor?.full_name || 'Unknown' }}</p>
             </div>
          </div>
        </div>

      </div>

      <!-- Right Column (Tabs & Content) -->
      <div class="lg:col-span-2 space-y-4">
        
        <!-- Tabs Segmented Control -->
        <div class="bg-gray-100 p-1 rounded-md flex overflow-x-auto no-scrollbar shadow-inner">
          <button @click="activeTab = 'timeline'" :class="activeTab === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Timeline</button>
          <button @click="activeTab = 'notes'" :class="activeTab === 'notes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Notes</button>
        </div>

        <!-- Tab: Timeline -->
        <div v-if="activeTab === 'timeline'" class="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6 min-h-[250px]">
          
          <div v-if="assignments.length === 0" class="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-md">
            <p class="font-bold uppercase tracking-widest text-[10px]">No historical data.</p>
          </div>
          
          <div v-else class="relative border-l-2 border-gray-100 ml-2 space-y-6">
             <div v-for="assign in assignments" :key="assign.id" class="relative pl-5 group">
                <div class="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2" :class="!assign.end_date ? 'border-indigo-600 scale-125' : 'border-gray-300'"></div>
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="text-[9px] font-black mb-0.5 uppercase tracking-widest" :class="!assign.end_date ? 'text-indigo-500' : 'text-gray-400'">
                      {{ new Date(assign.start_date).getFullYear() }} — {{ assign.end_date ? new Date(assign.end_date).getFullYear() : 'Present' }}
                    </div>
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button @click="openEditAssignModal(assign)" title="Edit" class="p-1 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button @click="deleteAssignment(assign)" title="Delete" class="p-1 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors">
                        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>

                  <div class="flex justify-between items-start mb-1">
                      <h4 class="text-sm font-black text-gray-900 uppercase tracking-tight">Ptr. {{ assign.pastor?.full_name || 'Unknown Pastor' }}</h4>
                      <button @click="$router.push(`/pastors/${assign.pastor_id}`)" class="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-900 flex-shrink-0">Profile</button>
                  </div>

                  <div class="flex flex-wrap gap-1 mb-2">
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest" :class="!assign.end_date ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'">{{ assign.status_code }}</span>
                      <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-widest">{{ assign.assignment_type }}</span>
                  </div>
                  
                  <p v-if="assign.notes" class="text-[10px] sm:text-xs font-medium text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100">{{ assign.notes }}</p>
                </div>
             </div>
          </div>
        </div>

        <!-- Tab: Notes -->
        <div v-else-if="activeTab === 'notes'" class="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6 min-h-[250px]">
          <h3 class="text-xs font-black text-gray-900 mb-4 uppercase tracking-widest">Station Notes</h3>
          <div class="flex flex-col items-center justify-center py-12 text-gray-300 border border-dashed border-gray-200 rounded-md">
             <svg class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
             <p class="font-bold text-xs">No notes provided for this station.</p>
          </div>
        </div>

      </div>
    </div>

    <!-- Record Entry Modal -->
    <Teleport to="body">
    <div v-if="isModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-xl flex flex-col relative my-auto animate-in slide-in-from-bottom duration-300">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Archive Deployment</h3>
          <button @click="isModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <form @submit.prevent="submitHistoricalRecord" class="space-y-4">
            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assigned Pastor</label>
              <SearchableSelect
                v-model="formData.pastor_id"
                :options="allPastors"
                label-key="full_name"
                value-key="id"
                placeholder="Select assigned pastor..."
                clear-placeholder="None"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Entry Type</label>
                <select v-model="formData.transition_type" required class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold">
                   <option value="legacy">Legacy Assignment</option>
                   <option value="pioneer">Pioneering</option>
                   <option value="takeover">Takeover</option>
                </select>
              </div>
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Effective Date</label>
                <input v-model="formData.effective_date" required type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Entry Description</label>
              <textarea v-model="formData.notes" rows="2" placeholder="Describe the entry source or context..." class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold resize-none"></textarea>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" @click="isModalOpen = false" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                {{ isSaving ? 'Processing...' : 'Archive Entry' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Edit Assignment Modal -->
    <Teleport to="body">
    <div v-if="isEditAssignModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-xl flex flex-col relative my-auto">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Assignment</h3>
          <button @click="isEditAssignModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <form @submit.prevent="submitEditAssign" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                <input v-model="editAssignData.start_date" required type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                <input v-model="editAssignData.end_date" type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select v-model="editAssignData.status_code" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold">
                <option value="active">Active</option>
                <option value="ended">Ended</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assignment Type</label>
              <input v-model="editAssignData.assignment_type" type="text" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
              <textarea v-model="editAssignData.notes" rows="2" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold"></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" @click="isEditAssignModalOpen = false" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSavingAssign" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                {{ isSavingAssign ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchableSelect from '../components/SearchableSelect.vue'
import { ChurchService } from '../services/db/ChurchService'
import { AssignmentService } from '../services/db/AssignmentService'
import { PastorService } from '../services/db/PastorService'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'

const route = useRoute()
const router = useRouter()
const activeTab = ref('timeline')

const church = ref(null)
const assignments = ref([])
const allPastors = ref([])
const loading = ref(true)

const isModalOpen = ref(false)
const isSaving = ref(false)
const formData = ref({
    pastor_id: '',
    transition_type: 'legacy',
    effective_date: new Date().toISOString().split('T')[0],
    notes: '',
    church_id: route.params.id
})

const goBack = () => {
    if (church.value?.district_id) {
        router.push(`/districts/${church.value.district_id}`)
    } else {
        router.push('/churches')
    }
}

const debugError = ref(null)

const fetchData = async () => {
    loading.value = true
    debugError.value = null
    try {
        const id = route.params.id
        
        // Parallel fetching
        const [cRes, aRes, pRes] = await Promise.all([
             ChurchService.getById(id),
             AssignmentService.getByChurch(id),
             PastorService.getAll() // for dropdown
        ])
        
        church.value = cRes
        assignments.value = aRes
        allPastors.value = pRes
    } catch (err) {
        console.error(err)
        debugError.value = String(err.message || err)
    } finally {
        loading.value = false
    }
}

const openModal = () => {
    formData.value = {
        pastor_id: '',
        transition_type: 'legacy',
        effective_date: new Date().toISOString().split('T')[0],
        notes: '',
        church_id: route.params.id
    }
    isModalOpen.value = true
}

const submitHistoricalRecord = async () => {
    isSaving.value = true
    try {
        await AssignmentService.create(formData.value)
        isModalOpen.value = false
        // Refresh Timeline
        assignments.value = await AssignmentService.getByChurch(route.params.id)
    } catch(err) {
        console.error(err)
        alert('Failed to save historical record')
    } finally {
        isSaving.value = false
    }
}

// Edit Assignment State
const isEditAssignModalOpen = ref(false)
const isSavingAssign = ref(false)
const editingAssignId = ref(null)
const editAssignData = ref({})

const openEditAssignModal = (assign) => {
    editingAssignId.value = assign.id
    editAssignData.value = {
        start_date: assign.start_date ? assign.start_date.split('T')[0] : '',
        end_date: assign.end_date ? assign.end_date.split('T')[0] : '',
        status_code: assign.status_code,
        assignment_type: assign.assignment_type,
        notes: assign.notes || ''
    }
    isEditAssignModalOpen.value = true
}

const submitEditAssign = async () => {
    isSavingAssign.value = true
    try {
        await AssignmentService.update(editingAssignId.value, {
            ...editAssignData.value,
            end_date: editAssignData.value.end_date || null
        })
        isEditAssignModalOpen.value = false
        assignments.value = await AssignmentService.getByChurch(route.params.id)
    } catch (err) {
        console.error(err)
        alert('Failed to update assignment')
    } finally {
        isSavingAssign.value = false
    }
}

const deleteAssignment = async (assign) => {
    const result = await Swal.fire({
        title: 'Delete Assignment?',
        text: `Remove the record for "Ptr. ${assign.pastor?.full_name || 'this pastor'}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, delete it'
    })
    if (!result.isConfirmed) return

    try {
        await AssignmentService.delete(assign.id)
        assignments.value = await AssignmentService.getByChurch(route.params.id)
    } catch (err) {
        console.error(err)
        alert('Failed to delete assignment')
    }
}

onMounted(() => {
    fetchData()
})
</script>

<style scoped>
/* Hide scrollbar for tabs on mobile but allow scrolling */
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;  /* IE and Edge */
  scrollbar-width: none;  /* Firefox */
}
</style>
