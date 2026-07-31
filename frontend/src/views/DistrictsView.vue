<template>
  <div class="h-full flex flex-col relative">
    <!-- Header & Actions -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
      <p class="text-sm font-semibold text-gray-500 tracking-tight">Manage district allocations, theme colors, and District Leaders.</p>
      <div class="flex gap-3 shrink-0">
        <button @click="handleExport" class="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-gray-200/80 hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-widest rounded-xl shadow-sm transition-all hover:shadow hover:-translate-y-0.5">
          <svg class="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12"/></svg>
          <span class="hidden sm:inline">Export</span>
        </button>
        <button @click="openAddModal" class="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold uppercase tracking-widest rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] hover:shadow-indigo-500/40 active:scale-[0.98]">
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
          Add District
        </button>
      </div>
    </div>

    <!-- Export Options Modal -->
    <Teleport to="body">
    <div v-if="isExportModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
        <div class="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-lg font-semibold text-gray-900">Export District Report</h3>
          <button @click="isExportModalOpen = false" class="text-gray-400 hover:text-gray-600 p-1">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="p-6 md:px-10">
          <div class="space-y-4">
            <button
              @click="executeExport"
              class="w-full flex items-center gap-4 p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group"
            >
              <div class="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold group-hover:bg-indigo-100 transition-colors">Σ</div>
              <div>
                <div class="font-bold text-gray-900">DISTRICT SUMMARY</div>
                <div class="text-xs text-gray-500 text-balance">A horizontal layout showing all churches under their districts</div>
              </div>
            </button>

            <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="checkbox"
                v-model="exportOptions.includeVacantInfo"
                class="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              >
              <span class="text-xs font-bold text-gray-700 uppercase tracking-widest leading-none">Highlight Vacant Churches</span>
            </label>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <div class="relative z-40 w-full mb-6">
      <div v-if="debugError" class="bg-red-50 text-red-600 p-4 rounded-xl mb-4 text-xs font-mono">
        {{ debugError }}
      </div>
      <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
        <div class="pl-4 flex items-center pointer-events-none shrink-0">
          <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
        </div>
        <input v-model="searchQuery" type="text" placeholder="Search district name..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">
      </div>
    </div>

    <!-- ══ MOBILE CARD LIST (hidden on md+) ══ -->
    <div class="md:hidden flex-1 flex flex-col">
      <div v-if="loading" class="space-y-4">
        <div v-for="i in 5" :key="i" class="bg-white rounded-2xl p-5 border border-gray-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] animate-pulse flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gray-200 shrink-0"></div>
          <div class="flex-1 space-y-2"><div class="h-4 bg-gray-200 rounded w-2/3"></div><div class="h-3 bg-gray-100 rounded w-1/2"></div></div>
        </div>
      </div>
      <!-- Empty -->
      <div v-else-if="filteredDistricts.length === 0" class="py-16 flex flex-col items-center justify-center text-center">
        <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
        </div>
        <p class="text-sm font-semibold text-gray-500">No districts found matching your criteria.</p>
      </div>
      <div v-else class="space-y-4">
        <div v-for="district in paginatedDistricts" :key="district.id"
          class="bg-white rounded-2xl border border-gray-100/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden transition-all">
          <!-- Top: Color dot + Info -->
          <div class="flex items-start gap-4 p-5">
            <div class="w-14 h-14 rounded-full border-[3px] flex items-center justify-center shrink-0 shadow-sm"
              :style="{ backgroundColor: (district.theme_color || '#e5e7eb') + '22', borderColor: district.theme_color || '#e5e7eb' }">
              <div class="w-5 h-5 rounded-full shadow-inner" :style="{ backgroundColor: district.theme_color || '#e5e7eb' }"></div>
            </div>
            <div class="flex-1 min-w-0 pt-0.5">
              <div class="font-bold text-gray-900 text-base truncate cursor-pointer hover:text-indigo-600 tracking-tight"
                @click="$router.push(`/districts/${district.id}`)">{{ district.district_name }}</div>
              <div v-if="district.leader" class="text-[10px] font-bold text-gray-500 truncate flex items-center gap-1 mt-1"><span class="text-xs">👤</span> {{ district.leader.full_name }}</div>
              <div v-else class="text-[10px] font-bold text-gray-400 italic mt-1">No leader assigned</div>
              <div class="mt-2">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest bg-gray-100 text-gray-600 border border-gray-200/80 shadow-sm">
                  {{ district.churches_count || 0 }} Churches
                </span>
              </div>
            </div>
          </div>
          <!-- Bottom: Actions justified -->
          <div class="bg-gray-50/50 flex border-t border-gray-100/80">
            <button @click="openAddChurchModal(district)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Add Church</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="$router.push(`/districts/${district.id}`)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">View</span>
            </button>
            <div class="w-px bg-gray-200/50 my-2"></div>
            <button @click="openEditModal(district)" class="flex-1 flex flex-col items-center justify-center gap-1 py-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50/50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
              <span class="text-[9px] font-bold uppercase tracking-widest">Edit</span>
            </button>
          </div>
        </div>
      </div>
      <div v-if="!loading" class="mt-6 flex items-center justify-between pb-4">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{{ paginatedDistricts.length }} of {{ filteredDistricts.length }}</span>
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
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">District Name</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Leader Pastor</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100">Churches Count</th>
              <th class="px-6 py-5 sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-100 text-right">Actions</th>
            </tr>
          </thead>

          <tbody class="divide-y divide-gray-100/80">
            <template v-if="loading">
              <tr v-for="i in 6" :key="i" class="animate-pulse bg-white">
                <td class="py-4 px-6">
                  <div class="flex items-center gap-4">
                    <div class="w-5 h-5 rounded-full bg-gray-200"></div>
                    <div class="h-4 bg-gray-200 rounded w-48"></div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gray-100"></div>
                    <div>
                      <div class="h-3 bg-gray-100 rounded w-32 mb-1.5"></div>
                      <div class="h-2 bg-gray-50 rounded w-20"></div>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="h-6 bg-gray-100 rounded-md w-24"></div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex justify-end gap-2">
                    <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                    <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                    <div class="w-8 h-8 bg-gray-50 rounded-lg"></div>
                  </div>
                </td>
              </tr>
            </template>

            <template v-else-if="filteredDistricts.length === 0">
              <tr class="bg-white">
                <td colspan="4" class="py-20 text-center">
                  <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                     <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9"/></svg>
                  </div>
                  <p class="text-sm font-semibold text-gray-500">No districts found matching your criteria.</p>
                </td>
              </tr>
            </template>

            <template v-else>
              <tr
                v-for="district in paginatedDistricts"
                :key="district.id"
                class="hover:bg-indigo-50/30 transition-colors group"
              >
              <td class="py-4 px-6 align-middle">
                <div class="flex items-center gap-3">
                  <div class="w-5 h-5 rounded-full border border-gray-200/50 shadow-sm" :style="{ backgroundColor: district.theme_color || '#e5e7eb' }"></div>
                  <div class="font-bold text-gray-900 tracking-tight leading-tight cursor-pointer hover:text-indigo-600 transition" @click="$router.push(`/districts/${district.id}`)">
                    {{ district.district_name }}
                  </div>
                </div>
              </td>

              <td class="px-6 py-4 align-middle">
                <div v-if="district.leader" class="flex items-center gap-4">
                  <div
                    v-if="district.leader.pastor_image_url"
                    class="w-10 h-10 rounded-full border border-gray-200 bg-cover bg-center shrink-0 shadow-sm"
                    :style="{ backgroundImage: `url(${district.leader.pastor_image_url})` }"
                  ></div>
                  <div v-else class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 border border-indigo-100 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0 shadow-sm uppercase">
                    {{ district.leader.full_name?.charAt(0) }}
                  </div>
                  <div>
                    <div class="text-sm font-bold text-gray-900">{{ district.leader.full_name }}</div>
                    <div class="text-[9px] uppercase tracking-widest font-black text-indigo-600 mt-0.5">District Leader</div>
                  </div>
                </div>
                <span v-else class="text-[10px] font-bold uppercase tracking-widest text-gray-400 italic">No Leader Assigned</span>
              </td>

              <td class="px-6 py-4 align-middle">
                <span class="inline-flex items-center px-2 py-1 rounded text-[9px] font-black uppercase tracking-widest bg-gray-50 text-gray-600 border border-gray-200 shadow-sm">
                  {{ district.churches_count || 0 }} Churches
                </span>
              </td>

              <td class="py-4 px-6 text-right align-middle">
                <div class="flex items-center justify-end gap-1.5">
                  <button @click="openAddChurchModal(district)" class="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors" title="Add Church to District">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                  <button @click="$router.push(`/districts/${district.id}`)" class="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="View Dashboard">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button @click="openEditModal(district)" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors" title="Edit Properties">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>

      <div class="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
        <span class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Showing <span class="text-indigo-600">{{ paginatedDistricts.length }}</span> of <span class="text-gray-700">{{ filteredDistricts.length }}</span> results
        </span>
        <div class="flex gap-2">
          <button @click="prevPage" :disabled="currentPage === 1" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Prev</button>
          <span class="px-4 py-2 text-xs font-bold bg-gray-50 border border-gray-100 rounded-xl text-gray-500 shadow-inner">Page {{ currentPage }} of {{ totalPages || 1 }}</span>
          <button @click="nextPage" :disabled="currentPage >= totalPages" class="px-4 py-2 text-xs font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-40 transition-all shadow-sm">Next</button>
        </div>
      </div>
    </div><!-- end desktop table -->

    <!-- Edit / Add District Modal -->
    <Teleport to="body">
    <div v-if="isModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">{{ isEditing ? 'Manage District' : 'Add New District' }}</h3>
          <button @click="closeModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 md:px-10 bg-gray-50/30">
          <form @submit.prevent="submitForm" class="space-y-5">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">District Name <span class="text-red-500">*</span></label>
              <input v-model="formData.district_name" type="text" placeholder="e.g., DISTRICT 32" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" required />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Theme Color</label>
              <div class="flex items-center gap-3">
                <input v-model="formData.theme_color" type="color" class="h-10 w-14 rounded-lg cursor-pointer border-0 p-0 shadow-sm" />
                <span class="text-xs font-black tracking-widest text-gray-500 uppercase">{{ formData.theme_color || '#000000' }}</span>
              </div>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Leader Pastor (District Leader)</label>
              <SearchableSelect
                v-model="formData.leader_pastor_id"
                :options="pastors"
                label-key="full_name"
                value-key="id"
                placeholder="-- Select Leader Pastor --"
                clear-placeholder="-- No Leader Assigned --"
              />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">General Notes</label>
              <textarea v-model="formData.notes" rows="2" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none" placeholder="District specific notes..."></textarea>
            </div>

            <div class="pt-6 border-t border-gray-100 flex justify-between gap-3 mt-6">
              <button
                v-if="isEditing"
                type="button"
                @click="confirmDelete"
                class="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-50 border border-rose-100 rounded-xl hover:bg-rose-100 transition-colors"
              >
                Delete
              </button>
              <div v-else></div>

              <div class="flex gap-3">
                <button type="button" @click="closeModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" :disabled="isSaving" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                  <svg v-if="isSaving" class="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                  </svg>
                  {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Quick Add Church Modal -->
    <Teleport to="body">
    <div v-if="isAddChurchModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
        <div class="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-white">
          <h3 class="text-lg font-black text-gray-900 tracking-tight">Add Church to <span class="text-indigo-600">{{ selectedDistrictName }}</span></h3>
          <button @click="closeAddChurchModal" class="w-8 h-8 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-6 md:px-10 bg-gray-50/30">
          <form @submit.prevent="submitChurchForm" class="space-y-5">
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Church Name <span class="text-red-500">*</span></label>
              <input v-model="churchFormData.church_name" type="text" placeholder="e.g. DAVAO MAIN" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none" required />
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Address <span class="text-red-500">*</span></label>
              <textarea v-model="churchFormData.church_address" rows="2" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none resize-none" required></textarea>
            </div>

            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">Scope</label>
              <select v-model="churchFormData.church_scope" class="w-full px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer">
                <option value="local">Local</option>
                <option value="international">International</option>
              </select>
            </div>

            <div class="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-4">
              <button type="button" @click="closeAddChurchModal" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-gray-600 bg-white border border-gray-200/80 rounded-xl hover:bg-gray-50 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSavingChurch" class="px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 rounded-xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 flex items-center gap-2">
                {{ isSavingChurch ? 'Saving...' : 'Add Church' }}
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
import { ref, onMounted, onActivated, computed, watch } from 'vue'
import SearchableSelect from '../components/SearchableSelect.vue'
import { DistrictService } from '../services/db/DistrictService'
import { PastorService } from '../services/db/PastorService'
import { ChurchService } from '../services/db/ChurchService'
import { AssignmentService } from '../services/db/AssignmentService'
import { exportDistricts } from '../services/export/district-export'
import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'

const districts = ref([])
const pastors = ref([])
const churches = ref([])
const assignments = ref([])
const loading = ref(true)

const isExportModalOpen = ref(false)
const exportOptions = ref({
  includeVacantInfo: true
})

const searchQuery = ref('')

const filteredDistricts = computed(() => {
  let result = districts.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(d => d.district_name?.toLowerCase().includes(q))
  }
  return result
})

const currentPage = ref(1)
const itemsPerPage = 10

watch(searchQuery, () => {
  currentPage.value = 1
})

const totalPages = computed(() => Math.ceil(filteredDistricts.value.length / itemsPerPage))

const paginatedDistricts = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredDistricts.value.slice(start, end)
})

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++
}

const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--
}

const isModalOpen = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)

const formData = ref({
  id: null,
  district_name: '',
  theme_color: '#000000',
  leader_pastor_id: '',
  notes: ''
})

const isAddChurchModalOpen = ref(false)
const isSavingChurch = ref(false)
const selectedDistrictName = ref('')
const churchFormData = ref({
  district_id: null,
  church_name: '',
  church_address: '',
  church_scope: 'local'
})

const debugError = ref(null)

const fetchData = async (silent = false) => {
  if (!silent) loading.value = true
  debugError.value = null
  try {
    const [dRes, pRes, cRes, aRes] = await Promise.all([
      DistrictService.getAll(),
      PastorService.getAll(),
      ChurchService.getAll(),
      AssignmentService.getAll()
    ])
    pastors.value = pRes
    churches.value = cRes
    assignments.value = aRes

    districts.value = dRes.map(district => ({
      ...district,
      churches_count: cRes.filter(church => church.district_id === district.id).length
    }))
  } catch (error) {
    console.error(error)
    debugError.value = String(error.message || error)
  } finally {
    if (!silent) loading.value = false
  }
}

const handleExport = () => {
  isExportModalOpen.value = true
}

const executeExport = () => {
  isExportModalOpen.value = false
  exportDistricts(
    filteredDistricts.value,
    churches.value,
    assignments.value,
    pastors.value,
    exportOptions.value
  )
}

const openAddModal = () => {
  isEditing.value = false
  formData.value = {
    id: null,
    district_name: '',
    theme_color: '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0'),
    leader_pastor_id: '',
    notes: ''
  }
  isModalOpen.value = true
}

const openEditModal = (d) => {
  isEditing.value = true
  formData.value = {
    id: d.id,
    district_name: d.district_name,
    theme_color: d.theme_color || '#e5e7eb',
    leader_pastor_id: d.leader_pastor_id || '',
    notes: d.notes || ''
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
}

const submitForm = async () => {
  isSaving.value = true
  try {
    const payload = {
      district_name: formData.value.district_name,
      theme_color: formData.value.theme_color,
      leader_pastor_id: formData.value.leader_pastor_id === '' ? null : formData.value.leader_pastor_id,
      notes: formData.value.notes
    }

    if (isEditing.value) {
      await DistrictService.update(formData.value.id, payload)
    } else {
      await DistrictService.create(payload)
    }

    closeModal()
    await fetchData()
  } catch (error) {
    console.error(error)
    alert(error.response?.data?.message || 'Failed to save district')
  } finally {
    isSaving.value = false
  }
}

const confirmDelete = async () => {
  if (confirm(`Are you sure you want to delete ${formData.value.district_name}? This action cannot be easily undone.`)) {
    try {
      await DistrictService.softDelete(formData.value.id)
      closeModal()
      await fetchData()
    } catch (error) {
      alert('Failed to delete district.')
    }
  }
}

const openAddChurchModal = (d) => {
  selectedDistrictName.value = d.district_name
  churchFormData.value = {
    district_id: d.id,
    church_name: '',
    church_address: '',
    church_scope: 'local'
  }
  isAddChurchModalOpen.value = true
}

const closeAddChurchModal = () => {
  isAddChurchModalOpen.value = false
}

const submitChurchForm = async () => {
  isSavingChurch.value = true
  try {
    await ChurchService.create(churchFormData.value)
    alert('Church added successfully! You can assign a Pastor from the Pastors tab.')
    closeAddChurchModal()
    await fetchData()
  } catch (e) {
    alert(e.response?.data?.message || 'Failed to add church')
  } finally {
    isSavingChurch.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>