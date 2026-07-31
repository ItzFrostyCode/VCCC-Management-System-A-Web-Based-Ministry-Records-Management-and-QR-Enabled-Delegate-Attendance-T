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
        
        <div class="flex items-center pr-2 shrink-0 relative">
          <div class="w-[1.5px] h-6 bg-gray-200 mx-1.5 rounded-full hidden sm:block"></div>

          <!-- Mobile Filter Icon -->
          <div class="sm:hidden p-2 text-gray-400 relative">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
            <div v-if="churchFilter" class="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></div>
          </div>

          <select v-model="churchFilter" class="absolute inset-0 opacity-0 sm:relative sm:opacity-100 bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-gray-900 py-2 sm:pl-3 sm:pr-8 hover:bg-gray-50 focus:ring-0 cursor-pointer outline-none rounded-lg w-full sm:w-auto z-10">
            <option value="">ALL CHURCHES</option>
            <option v-for="c in churches" :key="c.id" :value="c.id">{{ (c.church_name || '').toUpperCase() }}</option>
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
            <div class="relative group/avatar cursor-pointer shrink-0" @click.stop="viewingAvatar = { url: disciple.disciple_image_url, text: disciple.full_name?.charAt(0), bgClass: 'bg-indigo-50', textClass: 'text-indigo-300' }">
              <div v-if="disciple.disciple_image_url"
                class="w-14 h-14 rounded-xl border border-gray-100 overflow-hidden bg-cover bg-center shadow-sm"
                :style="{ backgroundImage: `url(${disciple.disciple_image_url})` }"></div>
              <div v-else
                class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100/50 text-xl shadow-sm uppercase">
                {{ disciple.full_name?.charAt(0) }}
              </div>
              <div class="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                 <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
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
                  <div class="relative group/avatar cursor-pointer" @click.stop="viewingAvatar = { url: disciple.disciple_image_url, text: disciple.full_name?.charAt(0), bgClass: 'bg-indigo-50', textClass: 'text-indigo-300' }">
                    <div v-if="disciple.disciple_image_url" class="w-10 h-10 rounded-xl border border-gray-100 overflow-hidden bg-cover bg-center shadow-sm" :style="{ backgroundImage: `url(${disciple.disciple_image_url})` }"></div>
                    <div v-else class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 text-indigo-600 font-black flex items-center justify-center border border-indigo-100/50 shadow-sm text-sm uppercase">{{ disciple.full_name?.charAt(0) }}</div>
                    <div class="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                       <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                    </div>
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
    <Teleport to="body">
    <div v-if="isModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-full">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Edit Disciple' : 'New Disciple' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-6 md:px-10 overflow-y-auto bg-gray-50/30">
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
                <SearchableSelect
                  v-model="formData.church_id"
                  :options="churches"
                  label-key="church_name"
                  value-key="id"
                  placeholder="-- Select a church --"
                  clear-placeholder="None"
                />
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
    </Teleport>

    <!-- Modal Delete Confirm -->
    <Teleport to="body">
    <div v-if="isDeleteModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden p-6 md:px-10 text-center">
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
    </Teleport>

    <!-- Export Options Modal -->
    <Teleport to="body">
    <div v-if="isExportModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">Export Disciples List</h3>
          <button @click="isExportModalOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 md:px-10 bg-gray-50/30">
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
    </Teleport>
    <!-- Avatar Viewer Modal -->
    <div v-if="viewingAvatar" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" @click="viewingAvatar = null">
      <button class="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-all" @click="viewingAvatar = null">
         <svg class="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      
      <div class="w-full max-w-2xl flex items-center justify-center" @click.stop>
        <div v-if="viewingAvatar.url" class="relative">
          <img :src="viewingAvatar.url" class="max-w-full max-h-[85vh] rounded-[2rem] shadow-2xl object-contain animate-in zoom-in-95 duration-300" />
        </div>
        <div v-else :class="[`w-64 h-64 sm:w-96 sm:h-96 flex items-center justify-center text-[8rem] sm:text-[12rem] font-black uppercase shadow-2xl animate-in zoom-in-95 duration-300`, viewingAvatar.bgClass, viewingAvatar.textClass, viewingAvatar.isRounded ? 'rounded-full' : 'rounded-[3rem]']">
          {{ viewingAvatar.text }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, onActivated, computed, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { DiscipleService } from '../services/db/DiscipleService'
import { ChurchService } from '../services/db/ChurchService'
import { DistrictService } from '../services/db/DistrictService'
import { PastorService } from '../services/db/PastorService'
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
const filterRole = ref('')

const viewingAvatar = ref(null)
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
            DiscipleService.getAll(),
            ChurchService.getAll(),
            DistrictService.getAll(),
            PastorService.getAll()
        ])
        
        disciples.value = dRes.map(d => {
            const myChurch = cRes.find(c => c.id === d.church_id);
            return {
                ...d,
                church: myChurch || d.church
            };
        })
        churches.value = cRes
        districts.value = distRes
        pastors.value = pRes
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
    if (!formData.value.full_name || !formData.value.full_name.trim()) {
        Swal.fire({
            title: 'Required Field',
            text: 'Please enter the disciple\'s full name.',
            icon: 'warning',
            confirmButtonColor: '#4f46e5'
        })
        return
    }

    if (!formData.value.church_id) {
        Swal.fire({
            title: 'Required Field',
            text: 'Please select a local church for the disciple.',
            icon: 'warning',
            confirmButtonColor: '#4f46e5'
        })
        return
    }

    isSaving.value = true

    // Clean payload for backend
    const payload = {
        full_name: formData.value.full_name.trim(),
        church_id: formData.value.church_id || null
    }

    try {
        if (isEditing.value) {
            await DiscipleService.update(formData.value.id, payload, formFile.value)
        } else {
            await DiscipleService.create(payload, formFile.value)
        }
        closeModal()
        await fetchData()
        Swal.fire({
            title: 'Success!',
            text: `Disciple record ${isEditing.value ? 'updated' : 'saved'} successfully.`,
            icon: 'success',
            confirmButtonColor: '#4f46e5',
            timer: 2000
        })
    } catch (err) {
        console.error("Save disciple error:", err)
        Swal.fire({
            title: 'Error',
            text: err.message || 'Failed to save disciple record.',
            icon: 'error',
            confirmButtonColor: '#ef4444'
        })
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
        await DiscipleService.softDelete(discipleToDelete.value.id)
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
