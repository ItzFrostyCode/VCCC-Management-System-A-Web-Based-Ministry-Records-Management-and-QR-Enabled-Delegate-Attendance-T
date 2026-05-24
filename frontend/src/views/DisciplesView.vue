<template>
  <div class="h-full flex flex-col relative">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <p class="text-sm font-semibold text-gray-500 tracking-tight">Manage church members, delegates, and local leaders.</p>
      <div class="flex items-center gap-3 shrink-0">
        <button @click="handleExport" class="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button @click="openAddModal" class="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add Disciple
        </button>
      </div>
    </div>

    <!-- Search and Filter Bar -->
    <div class="relative z-40 w-full mb-6">
      <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <div class="pl-4 flex items-center pointer-events-none shrink-0">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Search disciple name..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">
        
        <div class="flex items-center pr-2 shrink-0">
          <div class="w-[1.5px] h-6 bg-gray-200 mx-1.5 rounded-full hidden sm:block"></div>
          <select v-model="churchFilter" class="bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-gray-600 py-2 pl-3 pr-8 hover:bg-gray-50 focus:ring-0 cursor-pointer outline-none rounded-lg max-w-[150px] sm:max-w-none truncate">
            <option value="">ALL CHURCHES</option>
            <option v-for="church in churches" :key="church.id" :value="church.id">{{ church.church_name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ══ MOBILE CARD LIST (hidden on md+) ══ -->
    <div class="md:hidden flex-1 flex flex-col">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] animate-pulse flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gray-200 shrink-0"></div>
          <div class="flex-1 space-y-2"><div class="h-4 bg-gray-200 rounded w-2/3"></div><div class="h-3 bg-gray-100 rounded w-1/2"></div></div>
        </div>
      </div>
      <div v-else-if="filteredDisciples.length === 0" class="py-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No disciples found.</p>
      </div>
      <div v-else class="space-y-4">
        <div v-for="disciple in paginatedDisciples" :key="disciple.id"
          class="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <!-- Top: Avatar + Info -->
          <div class="flex items-start gap-4 p-5">
            <div v-if="disciple.disciple_image_url"
              class="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden bg-cover bg-center shrink-0 shadow-sm"
              :style="{ backgroundImage: `url(${disciple.disciple_image_url})` }"></div>
            <div v-else
              class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100/50 shrink-0 text-xl shadow-sm uppercase">
              {{ disciple.full_name?.charAt(0) }}
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="font-bold text-gray-900 text-base truncate tracking-tight">{{ disciple.full_name }}</div>
              <div class="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-1 mb-1.5">VCCC Disciple</div>
              <div class="text-[11px] font-medium text-gray-500 truncate flex items-center gap-1.5"><span class="text-xs">🏠</span> {{ disciple.church?.church_name || 'Unassigned' }}</div>
            </div>
          </div>
          <!-- Bottom: Actions justified -->
          <div class="bg-gray-50/50 flex border-t border-gray-100/80">
            <button @click="openEditModal(disciple)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Edit</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="confirmDelete(disciple)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Delete</span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="!loading" class="mt-6 flex items-center justify-between pb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ paginatedDisciples.length }} of {{ filteredDisciples.length }}</span>
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
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Disciple Name</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Local Church</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100/80">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i" class="animate-pulse">
              <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gray-200"></div>
                  <div>
                    <div class="h-4 bg-gray-200 rounded w-40 mb-2"></div>
                    <div class="h-2 bg-gray-50 rounded w-20"></div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="h-3 bg-gray-100 rounded w-32 mb-1.5"></div>
                <div class="h-2 bg-gray-50 rounded w-48"></div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex justify-end gap-2">
                   <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                   <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                </div>
              </td>
            </tr>
            </template>
            <template v-else-if="filteredDisciples.length === 0">
              <tr class="bg-white">
                <td colspan="3" class="py-20 text-center">
                  <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                  </div>
                  <p class="text-sm font-semibold text-gray-500">No disciples found in this directory.</p>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="disciple in paginatedDisciples" :key="disciple.id" class="hover:bg-indigo-50/30 transition-colors group">
                <td class="px-6 py-4">
                <div class="flex items-center gap-4">
                  <div class="relative">
                    <div v-if="disciple.disciple_image_url" class="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-cover bg-center shadow-sm" :style="{ backgroundImage: `url(${disciple.disciple_image_url})` }"></div>
                    <div v-else class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100/50 shadow-sm text-sm uppercase">{{ disciple.full_name?.charAt(0) }}</div>
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 tracking-tight">{{ disciple.full_name }}</div>
                    <div class="text-[9px] uppercase tracking-widest text-indigo-600 font-bold mt-0.5">VCCC Disciple</div>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="flex flex-col">
                  <span class="text-sm font-semibold text-gray-700">{{ disciple.church?.church_name || 'Unassigned' }}</span>
                  <span class="text-xs font-medium text-gray-400 truncate max-w-[200px] mt-0.5">{{ disciple.church?.church_address || 'No Location' }}</span>
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-1.5">
                  <button @click="openEditModal(disciple)" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button @click="confirmDelete(disciple)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </div>
              </td>
            </tr>
            </template>
          </tbody>
        </table>
      </div>
      <!-- Pagination -->
      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing <span class="text-indigo-600">{{ paginatedDisciples.length }}</span> of <span class="text-gray-700">{{ filteredDisciples.length }}</span> results</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Prev</button>
          <span class="px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shadow-inner">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
        </div>
      </div>
    </div><!-- end desktop table -->

    <!-- Modal Form (Add/Edit) -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Edit Disciple' : 'New Disciple' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-6 overflow-y-auto bg-gray-50/30">
          <form @submit.prevent="submitForm" class="space-y-6">
            
            <!-- Image Upload -->
            <div class="flex flex-col items-center">
               <div class="relative group cursor-pointer" @click="$refs.imgInput.click()">
                 <div class="w-24 h-24 rounded-2xl border-2 border-gray-200 border-dashed flex items-center justify-center bg-white overflow-hidden transition-all hover:border-indigo-400 shadow-sm">
                   <div v-if="formPreview" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${formPreview})`}"></div>
                   <div v-else class="text-gray-400 group-hover:text-indigo-500 transition-colors">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                   </div>
                 </div>
                 <div class="absolute -bottom-2 -right-2 w-8 h-8 bg-white border border-gray-200/80 rounded-xl flex items-center justify-center text-gray-400 shadow-sm group-hover:text-indigo-600 group-hover:-translate-y-0.5 group-hover:shadow transition-all">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                 </div>
                 <input type="file" ref="imgInput" class="hidden" accept="image/*" @change="onFileChange" />
               </div>
               <span class="text-[10px] font-black text-gray-400 mt-4 uppercase tracking-widest">Profile Photo</span>
            </div>

            <div class="grid grid-cols-1 gap-5">
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Full Name <span class="text-red-500">*</span></label>
                <input v-model="formData.full_name" required type="text" placeholder="Enter full name" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              
              <div>
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Assign Local Church <span class="text-red-500">*</span></label>
                <select v-model="formData.church_id" required class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                  <option value="" disabled>Select a church...</option>
                  <option v-for="church in churches" :key="church.id" :value="church.id">{{ church.church_name }}</option>
                </select>
              </div>
            </div>

            <!-- Footer -->
            <div class="pt-6 border-t border-gray-100 flex justify-end gap-3">
              <button type="button" @click="closeModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                 <svg v-if="isSaving" class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path></svg>
                 {{ isSaving ? 'Processing...' : (isEditing ? 'Save Changes' : 'Save Record') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Modal Delete Confirm -->
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
        <div class="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center mb-5">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2 tracking-tight">Delete Record?</h3>
        <p class="text-sm font-medium text-gray-500 mb-6 leading-relaxed">Are you sure you want to delete <span class="font-bold text-gray-900">{{ discipleToDelete?.full_name }}</span>? This action cannot be undone.</p>
        <div class="flex gap-3">
          <button @click="isDeleteModalOpen = false" class="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Cancel</button>
          <button @click="executeDelete" :disabled="isSaving" class="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-red-500 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors">
            {{ isSaving ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Export Options Modal -->
    <div v-if="isExportModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">Export Disciples List</h3>
          <button @click="isExportModalOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 bg-gray-50/30">
          <div class="flex flex-col gap-3">
            <button @click="executeExport('all')" class="flex items-center justify-start gap-4 p-4 border border-gray-200/80 bg-white rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left group shadow-sm hover:shadow">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:bg-indigo-100 transition-colors">1</div>
              <div>
                <div class="font-black text-gray-900 text-sm tracking-tight mb-0.5">ALL DISCIPLES (A to Z)</div>
                <div class="text-xs font-medium text-gray-500">A simple vertical list of all disciples</div>
              </div>
            </button>
            <button @click="executeExport('hierarchical')" class="flex items-center justify-start gap-4 p-4 border border-gray-200/80 bg-white rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left group shadow-sm hover:shadow">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:bg-indigo-100 transition-colors">2</div>
              <div>
                <div class="font-black text-gray-900 text-sm tracking-tight mb-0.5">REGIONAL REPORT</div>
                <div class="text-xs font-medium text-gray-500">Separated into tabs by district</div>
              </div>
            </button>
          </div>
          <div class="mt-6 pt-6 border-t border-gray-100 flex justify-end">
             <button type="button" @click="isExportModalOpen = false" class="w-full px-4 py-3 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors shadow-sm">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, computed, watch } from 'vue'
import api from '../services/api'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'
import { exportDisciplesAll, exportDisciplesHierarchical } from '../services/export/disciple-export'

// Data State
const disciples = ref([])
const churches = ref([])
const districts = ref([])
const pastors = ref([])
const loading = ref(true)
const searchQuery = ref('')
const churchFilter = ref('')

// Modal State
const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const isDeleteModalOpen = ref(false)
const discipleToDelete = ref(null)
const isExportModalOpen = ref(false)

// Form State
const formData = ref({
    id: null,
    full_name: '',
    church_id: ''
})
const formFile = ref(null)
const formPreview = ref(null)

// Pagination
const currentPage = ref(1)
const itemsPerPage = 12

// Computed
const filteredDisciples = computed(() => {
    let result = disciples.value
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(d => d.full_name?.toLowerCase().includes(q))
    }
    if (churchFilter.value) {
        result = result.filter(d => d.church_id === churchFilter.value)
    }
    return result
})

const totalPages = computed(() => Math.ceil(filteredDisciples.value.length / itemsPerPage))
const paginatedDisciples = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredDisciples.value.slice(start, end)
})

// Navigation
const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }

watch([searchQuery, churchFilter], () => { currentPage.value = 1 })

// Actions
const fetchData = async (silent = false) => {
    if (!silent) loading.value = true
    try {
        const [dRes, cRes, distRes, pRes] = await Promise.all([
            api.get('/disciples'),
            api.get('/churches'),
            api.get('/districts'),
            api.get('/pastors')
        ])
        disciples.value = dRes.data.data
        churches.value = cRes.data.data
        districts.value = distRes.data.data
        pastors.value = pRes.data.data
    } catch (error) {
        console.error("Failed to load disciples:", error)
    } finally {
        if (!silent) loading.value = false
    }
}

onMounted(() => fetchData())
onActivated(() => fetchData(true))

const handleExport = () => {
    isExportModalOpen.value = true
}

const executeExport = (mode) => {
    isExportModalOpen.value = false
    if (mode === 'all') {
        exportDisciplesAll(filteredDisciples.value)
    } else {
        exportDisciplesHierarchical(districts.value, churches.value, pastors.value, filteredDisciples.value)
    }
}

const openAddModal = () => {
    isEditing.value = false
    formData.value = { id: null, full_name: '', church_id: '' }
    formFile.value = null
    formPreview.value = null
    isModalOpen.value = true
}

const openEditModal = (d) => {
    isEditing.value = true
    formData.value = { 
        id: d.id, 
        full_name: d.full_name, 
        church_id: d.church_id 
    }
    formFile.value = null
    formPreview.value = d.disciple_image_url || null
    isModalOpen.value = true
}

const closeModal = () => { isModalOpen.value = false }

const onFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
        formFile.value = file
        formPreview.value = URL.createObjectURL(file)
    }
}

const submitForm = async () => {
    const summaryHtml = generateSummaryHtml(formData.value)
    
    const result = await Swal.fire({
        title: 'Save Disciple?',
        text: 'Please review the disciple details before saving:',
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
        if (key !== 'id' && formData.value[key]) {
            payload.append(key, formData.value[key])
        }
    })
    if (formFile.value) payload.append('disciple_image', formFile.value)

    try {
        if (isEditing.value) {
            payload.append('_method', 'PUT')
            await api.post(`/disciples/${formData.value.id}`, payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
        } else {
            await api.post('/disciples', payload, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
        }
        closeModal()
        fetchData()
    } catch (err) {
        console.error(err)
        alert("Failed to save disciple record")
    } finally {
        isSaving.value = false
    }
}

const confirmDelete = (d) => {
    discipleToDelete.value = d
    isDeleteModalOpen.value = true
}

const executeDelete = async () => {
    if (!discipleToDelete.value) return
    isSaving.value = true
    try {
        await api.delete(`/disciples/${discipleToDelete.value.id}`)
        isDeleteModalOpen.value = false
        fetchData()
    } catch (err) {
        console.error(err)
        alert('Failed to delete record')
    } finally {
        isSaving.value = false
    }
}

onMounted(fetchData)
</script>
