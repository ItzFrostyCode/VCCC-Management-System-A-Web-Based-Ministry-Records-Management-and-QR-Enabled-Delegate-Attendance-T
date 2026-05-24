<template>
  <div class="h-full flex flex-col relative">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <p class="text-sm font-semibold text-gray-500 tracking-tight">Manage ordained ministers, assignments, and records.</p>
      <div class="flex items-center gap-3 shrink-0">
        <button @click="handleExport" class="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button @click="openAddModal" class="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add Pastor
        </button>
      </div>
    </div>

    <!-- Search and Filter Bar -->
    <div class="relative z-40 w-full mb-6">
      <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <div class="pl-4 flex items-center pointer-events-none shrink-0">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Search pastor name..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">
        
        <div class="flex items-center pr-2 shrink-0">
          <div class="w-[1.5px] h-6 bg-gray-200 mx-1.5 rounded-full hidden sm:block"></div>
          <select v-model="statusFilter" class="bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-gray-600 py-2 pl-3 pr-8 hover:bg-gray-50 focus:ring-0 cursor-pointer outline-none rounded-lg">
            <option value="">ALL STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="undeployed">UNDEPLOYED</option>
            <option value="deceased">DECEASED</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ══ MOBILE CARD LIST (hidden on md+) ══ -->
    <div class="md:hidden flex-1 flex flex-col">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] animate-pulse flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gray-200 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <!-- Empty -->
      <div v-else-if="paginatedPastors.length === 0" class="py-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No pastors found.</p>
      </div>
      <!-- Cards -->
      <div v-else class="space-y-4">
        <div v-for="pastor in paginatedPastors" :key="pastor.id"
          class="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <!-- Top: Avatar + Info -->
          <div class="flex items-start gap-4 p-5">
            <!-- Avatar -->
            <div v-if="pastor.pastor_image_url"
              class="w-14 h-14 rounded-full border border-gray-100 overflow-hidden bg-cover bg-center shrink-0 shadow-sm"
              :style="{ backgroundImage: `url(${pastor.pastor_image_url})` }"></div>
            <div v-else
              class="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100/50 shrink-0 text-xl shadow-sm">
              {{ pastor.full_name?.charAt(0) }}
            </div>
            <!-- Info -->
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="font-bold text-gray-900 text-base truncate tracking-tight">{{ pastor.full_name }}</div>
              <div class="text-[11px] font-medium text-gray-500 truncate mt-1">{{ pastor.contact_number || 'No contact' }}</div>
              <div v-if="pastor.wife_name" class="flex items-center gap-1.5 mt-1.5">
                <div class="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center text-[8px]">👩</div>
                <span class="text-[11px] font-semibold text-pink-600 truncate">{{ pastor.wife_name }}</span>
              </div>
              <div class="mt-2.5">
                <span class="inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest"
                  :class="{'bg-emerald-50 text-emerald-600': pastor.current_status_code === 'active', 'bg-slate-100 text-slate-500': pastor.current_status_code === 'undeployed', 'bg-rose-50 text-rose-600': pastor.current_status_code === 'deceased'}">
                  {{ pastor.current_status_code || 'undeployed' }}
                </span>
              </div>
            </div>
          </div>
          <!-- Bottom: Actions justified -->
          <div class="bg-gray-50/50 flex border-t border-gray-100/80">
            <button @click="$router.push(`/pastors/${pastor.id}`)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">View</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="openEditModal(pastor)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Edit</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="confirmDelete(pastor)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Delete</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Mobile Pagination -->
      <div v-if="!loading" class="mt-6 flex items-center justify-between pb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ paginatedPastors.length }} of {{ filteredPastors.length }}</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Prev</button>
          <span class="px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shadow-inner">{{ currentPage }}/{{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
        </div>
      </div>
    </div>

    <!-- ══ DESKTOP TABLE (hidden on mobile) ══ -->
    <div class="hidden md:flex flex-1 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-gray-200/60 overflow-hidden flex-col">
      <div class="overflow-x-auto flex-1">
        <table class="w-full text-left border-collapse">
          <thead>
            <tr class="text-[10px] uppercase tracking-widest text-gray-400 font-black">
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Pastor</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Wife</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Contact</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Status</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100/80">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i" class="animate-pulse">
                <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-full bg-gray-200"></div>
                  <div class="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div class="w-8 h-8 rounded-full bg-gray-100"></div>
                  <div class="h-3 bg-gray-100 rounded w-24"></div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 bg-gray-100 rounded w-28"></div>
              </td>
              <td class="px-6 py-4">
                <div class="h-6 bg-gray-100 rounded-lg w-20"></div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                  <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                  <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                </div>
              </td>
            </tr>
            </template>
            <template v-else-if="paginatedPastors.length === 0">
              <tr class="bg-white">
                <td colspan="5" class="py-20 text-center">
                  <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <p class="text-sm font-semibold text-gray-500">No pastors found matching your criteria.</p>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="pastor in paginatedPastors" :key="pastor.id" class="hover:bg-indigo-50/30 transition-colors group">
                <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div v-if="pastor.pastor_image_url" class="w-10 h-10 rounded-full border border-gray-100 overflow-hidden bg-cover bg-center shadow-sm" :style="{ backgroundImage: `url(${pastor.pastor_image_url})` }"></div>
                  <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-bold flex items-center justify-center border border-indigo-100/50 shadow-sm">{{ pastor.full_name?.charAt(0) }}</div>
                  <div>
                    <div class="font-bold text-gray-900 tracking-tight">{{ pastor.full_name }}</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div v-if="pastor.wife_name" class="flex items-center gap-3">
                   <div v-if="pastor.wife_image_url" class="w-8 h-8 rounded-full border border-gray-100 overflow-hidden bg-cover bg-center shadow-sm" :style="{ backgroundImage: `url(${pastor.wife_image_url})` }"></div>
                   <div v-else class="w-8 h-8 rounded-full bg-pink-50 text-pink-600 font-bold flex items-center justify-center text-xs border border-pink-100/50 shadow-sm">{{ pastor.wife_name.charAt(0) }}</div>
                   <span class="text-sm font-semibold text-gray-700">{{ pastor.wife_name }}</span>
                </div>
                <span v-else class="text-xs font-semibold text-gray-400">None</span>
              </td>
              <td class="px-6 py-4 text-sm font-medium text-gray-600">{{ pastor.contact_number || '-' }}</td>
              <td class="px-6 py-4">
                <span class="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest"
                      :class="{'bg-emerald-50 text-emerald-600': pastor.current_status_code === 'active', 'bg-slate-100 text-slate-500': pastor.current_status_code === 'undeployed', 'bg-rose-50 text-rose-600': pastor.current_status_code === 'deceased'}">
                  {{ pastor.current_status_code || 'undeployed' }}
                </span>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button @click="$router.push(`/pastors/${pastor.id}`)" class="text-gray-400 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-colors" title="View Profile">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                  <button @click="openEditModal(pastor)" class="text-gray-400 hover:text-blue-600 p-2 rounded-xl hover:bg-blue-50 transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button @click="confirmDelete(pastor)" class="text-gray-400 hover:text-rose-600 p-2 rounded-xl hover:bg-rose-50 transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing <span class="text-indigo-600">{{ paginatedPastors.length }}</span> of <span class="text-gray-700">{{ filteredPastors.length }}</span> results</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Prev</button>
          <span class="px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shadow-inner">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
        </div>
      </div>
    </div><!-- end desktop table -->

    <!-- Modal Form (Add/Edit) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Edit Pastor' : 'New Pastor' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto bg-gray-50/30">
          <form @submit.prevent="submitForm" class="space-y-6">
            
            <div class="grid grid-cols-2 gap-6">
              <!-- Pastor Image Column -->
              <div class="flex flex-col items-center p-5 border border-gray-200/60 rounded-2xl bg-white shadow-sm">
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Pastor Photo</div>
                 <div class="relative w-24 h-24 rounded-full border-2 border-gray-200 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden group cursor-pointer transition-colors hover:border-indigo-400 hover:bg-indigo-50" @click="$refs.pImgInput.click()">
                   <div v-if="formPreviews.pastor" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${formPreviews.pastor})`}"></div>
                   <div v-else class="text-gray-400 group-hover:text-indigo-500 transition-colors">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                   </div>
                   <input type="file" ref="pImgInput" class="hidden" accept="image/*" @change="e => onFileChange(e, 'pastor')" />
                 </div>
              </div>

              <!-- Wife Image Column -->
              <div class="flex flex-col items-center p-5 border border-gray-200/60 rounded-2xl bg-white shadow-sm">
                 <div class="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">Wife Photo</div>
                 <div class="relative w-24 h-24 rounded-full border-2 border-gray-200 border-dashed flex items-center justify-center bg-gray-50 overflow-hidden group cursor-pointer transition-colors hover:border-pink-400 hover:bg-pink-50" @click="$refs.wImgInput.click()">
                   <div v-if="formPreviews.wife" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${formPreviews.wife})`}"></div>
                   <div v-else class="text-gray-400 group-hover:text-pink-500 transition-colors">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                   </div>
                   <input type="file" ref="wImgInput" class="hidden" accept="image/*" @change="e => onFileChange(e, 'wife')" />
                 </div>
              </div>
            </div>

            <!-- Fields -->
            <div class="grid grid-cols-2 gap-5">
              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Full Name</label>
                <input v-model="formData.full_name" required type="text" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Contact Number</label>
                <input v-model="formData.contact_number" type="text" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Birthdate</label>
                <input v-model="formData.birthdate" type="date" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>

              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Wife's Name</label>
                <input v-model="formData.wife_name" type="text" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Wife's Birthdate</label>
                <input v-model="formData.wife_birthdate" type="date" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>

              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Pastoring Start Date</label>
                <input v-model="formData.pastoring_start_date" type="date" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>

              <div class="col-span-2 sm:col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Status</label>
                <select v-model="formData.current_status_code" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                  <option value="active">Active (Serving)</option>
                  <option value="undeployed">Undeployed (No Church)</option>
                  <option value="deceased">Deceased</option>
                </select>
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Spiritual Father / Mentor</label>
                <select v-model="formData.parent_id" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                  <option :value="null">None (Root/Senior)</option>
                  <option v-for="p in pastors.filter(p => !isEditing || p.id !== formData.id)" :key="p.id" :value="p.id">
                    {{ p.full_name }}
                  </option>
                </select>
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Record Type</label>
                <select v-model="formData.record_status" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                  <option value="active">Active Complete Record</option>
                  <option value="draft">Draft / Placeholder Record</option>
                </select>
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Notes</label>
                <textarea v-model="formData.notes" rows="2" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" placeholder="Optional notes..."></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="pt-6 border-t border-gray-100 flex justify-end gap-3 pb-2">
              <button type="button" @click="closeModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                 <svg v-if="isSaving" class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                 {{ isSaving ? 'Saving...' : 'Save Pastor' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Delete Confirm -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
        <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center mb-4">
          <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h3 class="text-lg font-bold text-gray-900 mb-2">Delete Record</h3>
        <p class="text-sm text-gray-500 mb-6">Are you sure you want to delete <span class="font-bold text-gray-900">{{ pastorToDelete?.full_name }}</span>? This action cannot be undone.</p>
        <div class="flex gap-3">
          <button @click="isDeleteModalOpen = false" class="flex-1 px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button @click="executeDelete" :disabled="isSaving" class="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
            {{ isSaving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Export Options Modal -->
    <div v-if="isExportModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-lg font-semibold text-gray-900">Export Options</h3>
          <button @click="isExportModalOpen = false" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6">
          <div class="space-y-4">
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="exportOptions.includePastorImage" class="w-5 h-5 text-indigo-600 rounded border-gray-300" />
              <span class="text-sm text-gray-700 font-medium">Include Pastor Image</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="exportOptions.includeWifeImage" class="w-5 h-5 text-indigo-600 rounded border-gray-300" />
              <span class="text-sm text-gray-700 font-medium">Include Wife Image</span>
            </label>
            <label class="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" v-model="exportOptions.includeBirthdates" class="w-5 h-5 text-indigo-600 rounded border-gray-300" />
              <span class="text-sm text-gray-700 font-medium">Include Birthdates</span>
            </label>
          </div>
          <div class="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
             <button type="button" @click="isExportModalOpen = false" class="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
             <button @click="executeExport" class="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">Download Excel</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Pastoral Transition Wizard (Sequence) -->
    <div v-if="isWizardOpen" class="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
          <div>
            <h3 class="text-lg font-bold text-indigo-900">Pastor Transition Wizard</h3>
            <p class="text-xs text-indigo-600 mt-0.5">Step 2: Assign deployment for the newly created pastor.</p>
          </div>
        </div>
        
        <div class="p-6">
          <form @submit.prevent="submitWizard" class="space-y-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="col-span-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Effective Date <span class="text-red-500">*</span></label>
                <input v-model="wizardData.effective_date" required type="date" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">Next Step (Transition Type) <span class="text-red-500">*</span></label>
              <div class="grid grid-cols-2 gap-3">
                <label :class="{'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200': wizardData.transition_type === 'pioneer', 'border-gray-200 hover:bg-gray-50': wizardData.transition_type !== 'pioneer'}" class="cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all relative">
                   <input type="radio" v-model="wizardData.transition_type" value="pioneer" class="hidden" />
                   <div class="text-2xl">🌱</div>
                   <div>
                     <div class="font-bold text-gray-900 text-sm">Pioneer</div>
                     <div class="text-xs text-gray-500 mt-0.5">Start new church</div>
                   </div>
                </label>
                <label :class="{'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200': wizardData.transition_type === 'takeover', 'border-gray-200 hover:bg-gray-50': wizardData.transition_type !== 'takeover'}" class="cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all relative">
                   <input type="radio" v-model="wizardData.transition_type" value="takeover" class="hidden" />
                   <div class="text-2xl">🤝</div>
                   <div>
                     <div class="font-bold text-gray-900 text-sm">Takeover</div>
                     <div class="text-xs text-gray-500 mt-0.5">Replace existing</div>
                   </div>
                </label>
                <label :class="{'ring-2 ring-indigo-500 bg-indigo-50 border-indigo-200': wizardData.transition_type === 'international', 'border-gray-200 hover:bg-gray-50': wizardData.transition_type !== 'international'}" class="cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all relative">
                   <input type="radio" v-model="wizardData.transition_type" value="international" class="hidden" />
                   <div class="text-2xl">🌍</div>
                   <div>
                     <div class="font-bold text-gray-900 text-sm">International</div>
                     <div class="text-xs text-gray-500 mt-0.5">Foreign mission</div>
                   </div>
                </label>
                <label :class="{'ring-2 ring-red-500 bg-red-50 border-red-200': wizardData.transition_type === 'legacy', 'border-gray-200 hover:bg-gray-50': wizardData.transition_type !== 'legacy'}" class="cursor-pointer border rounded-xl p-3 flex items-start gap-3 transition-all relative">
                   <input type="radio" v-model="wizardData.transition_type" value="legacy" class="hidden" />
                   <div class="text-2xl">🛑</div>
                   <div>
                     <div class="font-bold text-gray-900 text-sm">Legacy/Deceased</div>
                     <div class="text-xs text-gray-500 mt-0.5">Past data only</div>
                   </div>
                </label>
              </div>
            </div>

            <!-- Dynamic Contextual Fields -->
            <div class="bg-gray-50 rounded-xl p-4 border border-gray-200">
               <div v-if="wizardData.transition_type === 'pioneer'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">New Church Name <span class="text-red-500">*</span></label>
                  <input v-model="wizardData.new_church_name" required type="text" placeholder="e.g. VCCC Central Station" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
               </div>
               
               <div v-if="wizardData.transition_type === 'takeover'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Target Station <span class="text-red-500">*</span></label>
                  <select v-model="wizardData.church_id" required class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none">
                     <option value="" disabled>Select church to takeover...</option>
                     <option v-for="church in availableChurches" :key="church.id" :value="church.id">{{ church.church_name }}</option>
                  </select>
               </div>

               <div v-if="wizardData.transition_type === 'international'">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Mission / Location Details <span class="text-red-500">*</span></label>
                  <input v-model="wizardData.new_church_name" required type="text" placeholder="e.g. UK - London Fellowship" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
               </div>

               <div v-if="wizardData.transition_type === 'undeploy' || wizardData.transition_type === 'legacy'">
                  <p class="text-sm text-gray-600">This pastor will be saved but won't be assigned to an active church.</p>
               </div>
            </div>

            <!-- Footer -->
            <div class="pt-2 flex justify-between gap-3">
              <button type="button" @click="isWizardOpen = false" class="px-5 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Setup Later</button>
              <button type="submit" :disabled="isSavingWizard" class="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                 {{ isSavingWizard ? 'Executing...' : 'Execute Transition' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, computed, watch } from 'vue'
import { PastorService } from '../services/db/PastorService'
import { ChurchService } from '../services/db/ChurchService'
import { AssignmentService } from '../services/db/AssignmentService'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'
import { exportPastorInfo } from '../services/export/pastor-export'

// Table State
const pastors = ref([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')

// Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

// Delete State
const isDeleteModalOpen = ref(false)
const pastorToDelete = ref(null)

// Export State
const isExportModalOpen = ref(false)
const exportOptions = ref({
    includePastorImage: true,
    includeWifeImage: true,
    includeBirthdates: true
})

// Form State
const formData = ref({
    id: null,
    full_name: '',
    contact_number: '',
    birthdate: '',
    pastoring_start_date: '',
    wife_name: '',
    wife_birthdate: '',
    current_status_code: 'active',
    record_status: 'active',
    notes: '',
    parent_id: null
})
const formFiles = ref({ pastor: null, wife: null })
const formPreviews = ref({ pastor: null, wife: null })

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ''

// Data Fetching
const filteredPastors = computed(() => {
    let result = pastors.value
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(p => p.full_name?.toLowerCase().includes(q))
    }
    if (statusFilter.value) {
        result = result.filter(p => p.current_status_code === statusFilter.value)
    }
    return result
})

const currentPage = ref(1)
const itemsPerPage = 15

watch([searchQuery, statusFilter], () => {
    currentPage.value = 1
})

const totalPages = computed(() => Math.ceil(filteredPastors.value.length / itemsPerPage))

const paginatedPastors = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredPastors.value.slice(start, end)
})

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }

const fetchPastors = async (silent = false) => {
    if (!silent) loading.value = true
    try {
        pastors.value = await PastorService.getAll()
    } catch (error) {
        console.error("Failed to load pastors:", error)
        if (!silent) alert("Failed to load records from database")
    } finally {
        if (!silent) loading.value = false
    }
}

onMounted(() => fetchPastors())
onActivated(() => fetchPastors(true))

// Export 
const handleExport = () => {
    isExportModalOpen.value = true
}

const executeExport = () => {
    isExportModalOpen.value = false
    exportPastorInfo(filteredPastors.value, exportOptions.value)
}

// Modal Hands
const openAddModal = () => {
    isEditing.value = false
    formData.value = { 
        id: null, full_name: '', contact_number: '', birthdate: '', pastoring_start_date: '',
        wife_name: '', wife_birthdate: '', current_status_code: 'active', record_status: 'active', notes: '', parent_id: null
    }
    formFiles.value = { pastor: null, wife: null }
    formPreviews.value = { pastor: null, wife: null }
    isModalOpen.value = true
}

const openEditModal = (p) => {
    isEditing.value = true
    formData.value = { 
        id: p.id, 
        full_name: p.full_name, 
        contact_number: p.contact_number, 
        birthdate: p.birthdate ? p.birthdate.split('T')[0] : '', 
        pastoring_start_date: p.pastoring_start_date ? p.pastoring_start_date.split('T')[0] : '',
        wife_name: p.wife_name, 
        wife_birthdate: p.wife_birthdate ? p.wife_birthdate.split('T')[0] : '', 
        current_status_code: p.current_status_code || 'active',
        record_status: p.record_status || 'active',
        notes: p.notes || '',
        parent_id: p.parent_id || null
    }
    formFiles.value = { pastor: null, wife: null }
    formPreviews.value = { pastor: p.pastor_image_url || null, wife: p.wife_image_url || null }
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
}

// File Pick & Preview
const onFileChange = (e, target) => {
    const file = e.target.files[0]
    if (file) {
        formFiles.value[target] = file
        formPreviews.value[target] = URL.createObjectURL(file)
    }
}

// Wizard State Data
const isWizardOpen = ref(false)
const isSavingWizard = ref(false)
const availableChurches = ref([])
const wizardData = ref({
    pastor_id: '',
    transition_type: 'pioneer',
    effective_date: new Date().toISOString().split('T')[0],
    church_id: '',
    new_church_name: '',
    notes: ''
})

const getChurches = async () => {
    try {
        availableChurches.value = await ChurchService.getAll()
    } catch (e) {
        console.error('Failed fetching churches dropdown', e)
    }
}

// Submitting Form
const submitForm = async () => {
    const summaryHtml = generateSummaryHtml(formData.value)
    
    const result = await Swal.fire({
        title: 'Save Details?',
        text: 'Please review the information below before saving:',
        html: summaryHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, save it'
    })
    
    if (!result.isConfirmed) return;

    isSaving.value = true
    
    const payload = new FormData()
    Object.keys(formData.value).forEach(key => {
        if(key !== 'id' && formData.value[key] !== null) {
            payload.append(key, formData.value[key])
        }
    })
    
    if (formFiles.value.pastor) payload.append('pastor_image', formFiles.value.pastor)
    if (formFiles.value.wife) payload.append('wife_image', formFiles.value.wife)

    try {
        if (isEditing.value) {
            await PastorService.update(formData.value.id, formData.value, formFiles.value.pastor, formFiles.value.wife)
            closeModal()
            fetchPastors() 
        } else {
            const data = await PastorService.create(formData.value, formFiles.value.pastor, formFiles.value.wife)
            closeModal()
            fetchPastors()
            
            // LAUNCH SEQUENCE: Deploy Wizard!
            if (data && data.id && formData.value.record_status === 'active') {
                wizardData.value.pastor_id = data.id
                wizardData.value.effective_date = new Date().toISOString().split('T')[0]
                isWizardOpen.value = true
            }
        }
    } catch (err) {
        console.error(err)
        alert("Failed to save pastor")
    } finally {
        isSaving.value = false
    }
}

const submitWizard = async () => {
    const summaryHtml = generateSummaryHtml(wizardData.value)
    
    const result = await Swal.fire({
        title: 'Register Pastor?',
        text: 'Please review the information below before registering:',
        html: summaryHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, register'
    })
    
    if (!result.isConfirmed) return;

    isSaving.value = true
    try {
        await AssignmentService.create(wizardData.value)
        isWizardOpen.value = false
        fetchPastors() // Refresh statuses
    } catch(err) {
        console.error(err)
        alert('Failed to execute transition')
    } finally {
        isSavingWizard.value = false
    }
}

// Deleting
const confirmDelete = (p) => {
    pastorToDelete.value = p
    isDeleteModalOpen.value = true
}

const executeDelete = async () => {
    if(!pastorToDelete.value) return;
    isSaving.value = true
    try {
        await PastorService.softDelete(pastorToDelete.value.id)
        isDeleteModalOpen.value = false
        fetchPastors()
    } catch (err) {
        console.error(err)
        alert('Failed to delete')
    } finally {
        isSaving.value = false
    }
}

onMounted(() => {
   fetchPastors()
   getChurches()
})
</script>
