<template>
  <div class="h-full flex flex-col">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <p class="text-sm font-semibold text-gray-500 tracking-tight">Manage congregations, locations, and lead assignments.</p>
      <div class="flex gap-3 shrink-0">
        <button @click="handleExport" class="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button @click="openModal()" class="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add Church
        </button>
      </div>
    </div>

    <!-- Search and Filter Bar -->
    <div class="relative z-40 w-full mb-6">
      <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <div class="pl-4 flex items-center pointer-events-none shrink-0">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Search church name or address..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">
        
        <div class="flex items-center pr-2 shrink-0">
          <div class="w-[1.5px] h-6 bg-gray-200 mx-1.5 rounded-full hidden sm:block"></div>
          <select v-model="districtFilter" class="bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-gray-600 py-2 pl-3 pr-8 hover:bg-gray-50 focus:ring-0 cursor-pointer outline-none rounded-lg max-w-[150px] sm:max-w-none truncate">
            <option value="">ALL DISTRICTS</option>
            <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.district_name }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- ══ MOBILE CARD LIST (hidden on md+) ══ -->
    <div class="md:hidden flex-1 flex flex-col">
      <!-- Skeleton -->
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 6" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] animate-pulse flex items-center gap-4">
          <div class="w-12 h-12 rounded-xl bg-gray-200 shrink-0"></div>
          <div class="flex-1 space-y-2">
            <div class="h-4 bg-gray-200 rounded w-3/4"></div>
            <div class="h-3 bg-gray-100 rounded w-1/2"></div>
          </div>
        </div>
      </div>
      <!-- Empty -->
      <div v-else-if="paginatedChurches.length === 0" class="py-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No churches found matching your criteria.</p>
      </div>
      <!-- Cards -->
      <div v-else class="space-y-4">
        <div v-for="church in paginatedChurches" :key="church.id"
          class="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <!-- Top: Icon + Info -->
          <div class="flex items-start gap-4 p-5">
            <div class="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100/50 shrink-0 text-2xl shadow-sm uppercase">
              {{ church.church_name ? church.church_name.charAt(0) : 'C' }}
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="font-bold text-gray-900 text-base truncate tracking-tight">{{ church.church_name || 'Unnamed Church' }}</div>
              <div class="text-[9px] font-black uppercase tracking-widest text-indigo-600 mt-1 mb-1.5">{{ church.district_name || 'No District' }}</div>
              <div class="text-[11px] font-medium text-gray-500 truncate">{{ church.church_address }}</div>
              <div class="flex items-center gap-2 mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border"
                  :class="church.church_scope === 'international' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'">
                  {{ church.church_scope }}
                </span>
                <span v-if="church.current_pastor_name" class="text-[10px] font-bold text-gray-500 truncate flex items-center gap-1"><span class="text-xs">👤</span> {{ church.current_pastor_name }}</span>
                <span v-else class="text-[10px] font-bold text-gray-400 italic">Vacant</span>
              </div>
            </div>
          </div>
          <!-- Bottom: Actions justified -->
          <div class="bg-gray-50/50 flex border-t border-gray-100/80">
            <button @click="$router.push(`/churches/${church.id}`)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">View</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="openModal(church)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Edit</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="confirmDelete(church)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-rose-600 hover:bg-rose-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Delete</span>
            </button>
          </div>
        </div>
      </div>
      <!-- Mobile Pagination -->
      <div v-if="!loading" class="mt-6 flex items-center justify-between pb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ paginatedChurches.length }} of {{ filteredChurches.length }}</span>
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
              <th class="py-5 px-6 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Church Info</th>
              <th class="py-5 px-6 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Location & District</th>
              <th class="py-5 px-6 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Current Pastor</th>
              <th class="py-5 px-6 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Type</th>
              <th class="py-5 px-6 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 text-right">Actions</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100/80">
            <template v-if="loading">
              <tr v-for="i in 8" :key="i" class="animate-pulse bg-white">
                <td class="py-4 px-6">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gray-200"></div>
                  <div class="h-4 bg-gray-200 rounded w-40"></div>
                </div>
              </td>
              <td class="py-4 px-6">
                <div class="h-3 bg-gray-100 rounded w-48 mb-2"></div>
                <div class="h-2 bg-gray-50 rounded w-24"></div>
              </td>
              <td class="py-4 px-6">
                <div class="h-3 bg-gray-100 rounded w-32"></div>
              </td>
              <td class="py-4 px-6">
                <div class="h-6 bg-gray-100 rounded w-16"></div>
              </td>
              <td class="py-4 px-6 text-right">
                <div class="flex justify-end gap-2">
                  <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                  <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                </div>
              </td>
            </tr>
            </template>
            <template v-else-if="paginatedChurches.length === 0">
              <tr class="bg-white">
                <td colspan="5" class="py-20 text-center">
                  <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                    <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
                  </div>
                  <p class="text-sm font-semibold text-gray-500">No churches found matching your criteria.</p>
                </td>
              </tr>
            </template>
            <template v-else>
              <tr v-for="church in paginatedChurches" :key="church.id" class="hover:bg-indigo-50/30 transition-colors group">
                <td class="py-4 px-6 align-middle">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center text-indigo-600 font-black border border-indigo-100/50 shadow-sm text-sm uppercase">
                    {{ church.church_name ? church.church_name.charAt(0) : 'C' }}
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 tracking-tight leading-tight">{{ church.church_name || 'Unnamed Church' }}</div>
                  </div>
                </div>
              </td>
              <td class="py-4 px-6 align-middle">
                 <div class="text-sm font-semibold text-gray-700 truncate max-w-[200px]">{{ church.church_address }}</div>
                 <div class="text-[9px] uppercase tracking-widest text-indigo-600 font-bold mt-1">{{ church.district_name || 'No District' }}</div>
              </td>
              <td class="py-4 px-6 align-middle">
                 <div class="text-sm text-gray-900 font-semibold">{{ church.current_pastor_name || 'Vacant' }}</div>
              </td>
              <td class="py-4 px-6 align-middle">
                 <span class="inline-flex items-center px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest border"
                       :class="church.church_scope === 'international' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'">
                    {{ church.church_scope }}
                 </span>
              </td>
              <td class="py-4 px-6 text-right align-middle">
                <div class="flex items-center justify-end gap-1.5">
                  <button @click="$router.push(`/churches/${church.id}`)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="View Profile">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                  </button>
                  <button @click="openModal(church)" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                  </button>
                  <button @click="confirmDelete(church)" class="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors" title="Delete">
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
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Showing <span class="text-indigo-600">{{ paginatedChurches.length }}</span> of <span class="text-gray-700">{{ filteredChurches.length }}</span> results</span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Prev</button>
          <span class="px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shadow-inner">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
        </div>
      </div>
    </div><!-- end desktop table -->

    <!-- Modal Form: Add / Edit -->
    <div v-if="isModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Edit Church' : 'Add New Church' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="overflow-y-auto p-6 bg-gray-50/30">
          <form @submit.prevent="submitForm" class="space-y-6">
            <div class="grid grid-cols-2 gap-5">
              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Church Name <span class="text-red-500">*</span></label>
                <input v-model="formData.church_name" required type="text" placeholder="e.g. VCCC Central Station" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" />
              </div>
              
              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Address <span class="text-red-500">*</span></label>
                <textarea v-model="formData.church_address" required rows="2" placeholder="Complete address..." class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none"></textarea>
              </div>

              <div class="col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">District</label>
                <select v-model="formData.district_id" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                   <option value="">None</option>
                   <option v-for="d in districts" :key="d.id" :value="d.id">{{ d.district_name }}</option>
                </select>
              </div>

              <div class="col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Pioneer Pastor</label>
                <select v-model="formData.pioneer_pastor_id" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                   <option value="">None</option>
                   <option v-for="p in pastors" :key="p.id" :value="p.id">{{ p.full_name }}</option>
                </select>
              </div>

              <div class="col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Mother Church</label>
                <select v-model="formData.mother_church_id" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                   <option value="">None</option>
                   <option v-for="c in churches" :key="c.id" :value="c.id">{{ c.church_name }}</option>
                </select>
              </div>

              <div class="col-span-1">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Location Scope <span class="text-red-500">*</span></label>
                <div class="flex gap-4 mt-3">
                   <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                     <input type="radio" v-model="formData.church_scope" value="local" class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"> Local
                   </label>
                   <label class="flex items-center gap-2 cursor-pointer text-sm font-semibold text-gray-700">
                     <input type="radio" v-model="formData.church_scope" value="international" class="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"> International
                   </label>
                </div>
              </div>

              <div class="col-span-2">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Notes</label>
                <textarea v-model="formData.notes" rows="2" placeholder="Any additional details..." class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none"></textarea>
              </div>
            </div>

            <div class="pt-6 flex justify-end gap-3 border-t border-gray-100">
              <button type="button" @click="closeModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50">
                {{ isSaving ? 'Saving...' : 'Save Church' }}
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
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>
        </div>
        <h3 class="text-xl font-black text-gray-900 mb-2 tracking-tight">Delete Record</h3>
        <p class="text-sm font-medium text-gray-500 mb-6 leading-relaxed">Are you sure you want to delete <span class="font-bold text-gray-900">{{ churchToDelete?.church_name }}</span>? This action cannot be undone.</p>
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
          <h3 class="text-lg font-black text-gray-900 tracking-tight">Export Church List</h3>
          <button @click="isExportModalOpen = false" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div class="p-6 bg-gray-50/30">
          <div class="flex flex-col gap-3">
            <button @click="executeExport('all')" class="flex items-center justify-start gap-4 p-4 border border-gray-200/80 bg-white rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left group shadow-sm hover:shadow">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:bg-indigo-100 transition-colors">1</div>
              <div>
                <div class="font-black text-gray-900 text-sm tracking-tight mb-0.5">ALL CHURCH (A to Z)</div>
                <div class="text-xs font-medium text-gray-500">A simple vertical list of all churches</div>
              </div>
            </button>
            <button @click="executeExport('info')" class="flex items-center justify-start gap-4 p-4 border border-gray-200/80 bg-white rounded-2xl hover:bg-indigo-50/50 hover:border-indigo-200 transition-all text-left group shadow-sm hover:shadow">
              <div class="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black group-hover:bg-indigo-100 transition-colors">2</div>
              <div>
                <div class="font-black text-gray-900 text-sm tracking-tight mb-0.5">CHURCH INFO</div>
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
import { ChurchService } from '../services/db/ChurchService'
import { PastorService } from '../services/db/PastorService'
import { DistrictService } from '../services/db/DistrictService'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'
import { exportChurches } from '../services/export/church-export'

const churches = ref([])
const pastors = ref([])
const districts = ref([])
const loading = ref(true)
const searchQuery = ref('')
const districtFilter = ref('')

const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const formData = ref({
    church_name: '',
    church_address: '',
    district_id: '',
    pioneer_pastor_id: '',
    mother_church_id: '',
    church_scope: 'local',
    notes: ''
})

const isDeleteModalOpen = ref(false)
const churchToDelete = ref(null)

const isExportModalOpen = ref(false)

const filteredChurches = computed(() => {
    let result = churches.value
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase()
        result = result.filter(c => 
            c.church_name?.toLowerCase().includes(q) || 
            (c.church_address && c.church_address.toLowerCase().includes(q))
        )
    }
    if (districtFilter.value) {
        result = result.filter(c => c.district_id === districtFilter.value)
    }
    return result
})

const currentPage = ref(1)
const itemsPerPage = 15

watch([searchQuery, districtFilter], () => {
    currentPage.value = 1
})

const totalPages = computed(() => Math.ceil(filteredChurches.value.length / itemsPerPage))

const paginatedChurches = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    return filteredChurches.value.slice(start, end)
})

const nextPage = () => { if (currentPage.value < totalPages.value) currentPage.value++ }
const prevPage = () => { if (currentPage.value > 1) currentPage.value-- }

const fetchData = async (silent = false) => {
    if (!silent) loading.value = true
    try {
        const [cRes, pRes, dRes] = await Promise.all([
             ChurchService.getAll(),
             PastorService.getAll(),
             DistrictService.getAll()
        ])
        churches.value = cRes
        pastors.value = pRes
        districts.value = dRes
    } catch (e) {
        console.error(e)
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
    exportChurches(mode, districts.value, filteredChurches.value, pastors.value)
}

const openModal = (church = null) => {
    if (church) {
        isEditing.value = true
        formData.value = {
            id: church.id,
            church_name: church.church_name,
            church_address: church.church_address,
            district_id: church.district_id || '',
            pioneer_pastor_id: church.pioneer_pastor_id || '',
            mother_church_id: church.mother_church_id || '',
            church_scope: church.church_scope,
            notes: church.notes || ''
        }
    } else {
        isEditing.value = false
        formData.value = {
            church_name: '',
            church_address: '',
            district_id: '',
            pioneer_pastor_id: '',
            mother_church_id: '',
            church_scope: 'local',
            notes: ''
        }
    }
    isModalOpen.value = true
}

const closeModal = () => {
    isModalOpen.value = false
}

const submitForm = async () => {
    const summaryHtml = generateSummaryHtml(formData.value)
    
    const result = await Swal.fire({
        title: 'Save Station?',
        text: 'Please review the station details before saving:',
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
        // Strip out empty string IDs to null for backend
        const payload = {...formData.value}
        if(!payload.district_id) payload.district_id = null
        if(!payload.pioneer_pastor_id) payload.pioneer_pastor_id = null
        if(!payload.mother_church_id) payload.mother_church_id = null

        if (isEditing.value) {
            await ChurchService.update(payload.id, payload)
        } else {
            await ChurchService.create(payload)
        }
        closeModal()
        await fetchData()
    } catch (e) {
        console.error(e)
        alert('Failed to save church')
    } finally {
        isSaving.value = false
    }
}

const confirmDelete = (church) => {
    churchToDelete.value = church
    isDeleteModalOpen.value = true
}

const executeDelete = async () => {
    isSaving.value = true
    try {
        await ChurchService.softDelete(churchToDelete.value.id)
        isDeleteModalOpen.value = false
        await fetchData()
    } catch (e) {
        console.error(e)
        alert('Failed to delete church')
    } finally {
        isSaving.value = false
    }
}

onMounted(() => fetchData())
</script>
