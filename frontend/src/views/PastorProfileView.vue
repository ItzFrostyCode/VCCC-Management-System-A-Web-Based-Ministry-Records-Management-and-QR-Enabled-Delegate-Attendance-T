<template>
  <div v-if="loading" class="animate-pulse space-y-4 max-w-6xl mx-auto px-4 sm:px-6 mt-6">
    <div class="h-32 bg-gray-100 rounded-lg"></div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="h-64 bg-gray-100 rounded-lg"></div>
      <div class="lg:col-span-2 h-64 bg-gray-100 rounded-lg"></div>
    </div>
  </div>

  <div v-else-if="!pastor" class="text-center py-20 bg-white rounded-lg border border-gray-100 shadow-sm max-w-xl mx-auto mt-10 px-4">
    <div class="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    </div>
    <h2 class="text-xl font-black text-gray-900 tracking-tight">Record Not Found</h2>
    <p class="text-xs text-gray-500 mt-2">The minister you are looking for might have been moved or the ID is incorrect.</p>
    <button @click="router.push('/pastors')" class="mt-6 px-6 py-2.5 text-xs bg-gray-900 text-white font-bold rounded-md hover:bg-black transition-all shadow-sm active:scale-95">
      Return to Directory
    </button>
  </div>

  <div v-else class="max-w-6xl mx-auto pb-20 px-4 sm:px-6 mt-4 sm:mt-6 space-y-4">
    
    <!-- Top Action / Breadcrumb -->
    <div class="flex items-center justify-between">
      <button @click="router.push('/pastors')" class="flex items-center gap-1.5 text-xs font-black text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
        Directory
      </button>
    </div>

    <!-- Header Card -->
    <div class="bg-white rounded-lg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 p-5 sm:p-6">
      <div class="flex flex-col md:flex-row gap-4 items-start md:items-center">

        <!-- Photo -->
        <div class="relative shrink-0 group cursor-pointer" @click="viewingAvatar = { url: pastor.pastor_image_url, text: pastor.full_name.charAt(0), bgClass: 'bg-indigo-50', textClass: 'text-indigo-600' }">
          <div class="w-16 h-16 rounded-md border border-gray-200 overflow-hidden bg-white relative">
            <img v-if="pastor.pastor_image_url" :src="pastor.pastor_image_url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full bg-indigo-50 flex items-center justify-center text-2xl font-black text-indigo-600 uppercase">
              {{ pastor.full_name.charAt(0) }}
            </div>
            <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
               <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight truncate">{{ pastor.full_name }}</h1>
            <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest shrink-0 flex items-center gap-1"
                  :class="pastor.current_status_code === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-600'">
              <span class="w-1.5 h-1.5 rounded-full" :class="pastor.current_status_code === 'active' ? 'bg-emerald-500' : 'bg-gray-400'"></span>
              {{ pastor.current_status_code }}
            </span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span v-if="pastor.mentor" class="cursor-pointer hover:text-indigo-600 transition-colors" @click="router.push(`/pastors/${pastor.mentor.id}`)">Mentor: {{ pastor.mentor.full_name }}</span>
            <span v-else class="text-gray-400">Root Leader</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 w-full md:w-auto pt-4 md:pt-0 border-t border-gray-100 md:border-0 mt-2 md:mt-0 shrink-0">
          <button @click="openEditModal" class="flex-1 md:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-md transition-all flex items-center justify-center gap-2 active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            Edit
          </button>
          <button @click="openAssignModal" class="w-full md:w-auto px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-md transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Assign
          </button>
        </div>

      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
      
      <!-- Left Sidebar (Details & Wife) -->
      <div class="lg:col-span-1 space-y-4 lg:sticky lg:top-4">
        
        <div class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Details</h3>
          </div>
          <div class="p-5 space-y-4">
            <div class="flex items-start gap-3">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-gray-400 uppercase">Contact</p>
                <p class="text-xs font-bold text-gray-900 truncate">{{ pastor.contact_number || 'Not provided' }}</p>
              </div>
            </div>
            
            <div v-if="pastor.birthdate" class="flex items-start gap-3">
              <svg class="w-4 h-4 text-gray-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
              <div class="min-w-0">
                <p class="text-[10px] font-bold text-gray-400 uppercase">Birthdate</p>
                <p class="text-xs font-bold text-gray-900 truncate">{{ new Date(pastor.birthdate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}</p>
              </div>
            </div>

            <div v-if="pastor.pastoring_start_date" class="flex items-start gap-3">
               <svg class="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
               <div class="min-w-0">
                  <div class="flex items-center gap-2 mb-0.5">
                    <p class="text-[10px] font-bold text-emerald-600 uppercase">Ordained</p>
                    <span v-if="yearsInMinistry !== null" class="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[9px] font-black tracking-widest border border-emerald-100 shadow-sm">{{ yearsInMinistry }} {{ yearsInMinistry === 1 ? 'Year' : 'Years' }} in Ministry</span>
                  </div>
                  <p class="text-xs font-bold text-gray-900 truncate">{{ new Date(pastor.pastoring_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}</p>
               </div>
            </div>
          </div>
        </div>

        <div v-if="pastor.wife_name" class="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spouse</h3>
          </div>
          <div class="p-5 flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg overflow-hidden bg-pink-50 border border-gray-100 shrink-0 cursor-pointer" @click="viewingAvatar = { url: pastor.wife_image_url, text: pastor.wife_name.charAt(0), bgClass: 'bg-pink-50', textClass: 'text-pink-600' }">
               <img v-if="pastor.wife_image_url" :src="pastor.wife_image_url" class="w-full h-full object-cover" />
               <div v-else class="w-full h-full flex items-center justify-center font-black text-pink-600 text-sm uppercase">{{ pastor.wife_name.charAt(0) }}</div>
             </div>
             <div class="min-w-0">
               <h4 class="font-bold text-gray-900 text-xs uppercase truncate">{{ pastor.wife_name }}</h4>
               <p class="text-[10px] font-bold text-gray-500 uppercase truncate">{{ pastor.wife_birthdate ? 'Born ' + new Date(pastor.wife_birthdate).toLocaleDateString() : 'Minister\'s Wife' }}</p>
             </div>
          </div>
        </div>

      </div>

      <!-- Right Column (Tabs & Content) -->
      <div class="lg:col-span-2 space-y-4">
        
        <!-- Tabs Segmented Control -->
        <div class="bg-gray-100 p-1 rounded-md flex overflow-x-auto no-scrollbar shadow-inner">
          <button @click="activeTab = 'overview'" :class="activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Overview</button>
          <button @click="activeTab = 'history'" :class="activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">History</button>
          <button @click="activeTab = 'family'" :class="activeTab === 'family' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Spiritual Family</button>
        </div>

        <!-- Tab: Overview -->
        <div v-if="activeTab === 'overview'" class="space-y-4">
          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-3">
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
              <div class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{{ yearsInMinistry ?? '—' }}</div>
              <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{{ yearsInMinistry === 1 ? 'Year' : 'Years' }} in Ministry</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
              <div class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{{ assignments.length }}</div>
              <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Assignment{{ assignments.length === 1 ? '' : 's' }}</div>
            </div>
            <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-4 text-center">
              <div class="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">{{ pastor.disciples?.length || 0 }}</div>
              <div class="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">Spiritual Sons</div>
            </div>
          </div>

          <div class="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6">
            <h3 class="text-xs font-black text-gray-900 mb-4 uppercase tracking-widest">Notes</h3>
            <div v-if="pastor.notes" class="text-xs text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{{ pastor.notes }}</div>
            <div v-else class="flex flex-col items-center justify-center py-12 text-gray-300">
               <svg class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
               <p class="font-bold text-xs">No notes provided.</p>
            </div>
          </div>
        </div>

        <!-- Tab: History -->
        <div v-else-if="activeTab === 'history'" class="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <div class="flex items-center gap-2">
              <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Assignments</h3>
              <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black tracking-widest">{{ assignments.length }}</span>
            </div>
            <button @click="openAddAssignModal" class="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-[10px] uppercase tracking-widest rounded-md transition-all active:scale-95">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"/></svg>
              Add Record
            </button>
          </div>
          
          <div v-if="assignments.length === 0" class="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-md">
            <p class="font-bold uppercase tracking-widest text-[10px]">No assignment history.</p>
          </div>
          
          <div v-else class="relative border-l-2 border-gray-100 ml-2 space-y-6">
             <div v-for="assign in assignments" :key="assign.id" class="relative pl-5 group">
                <div class="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2" :class="assign.status_code === 'active' ? 'border-emerald-500' : 'border-gray-300'"></div>
                <div>
                  <div class="flex items-start justify-between gap-2">
                    <div class="text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-widest">
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
                  <h4 class="text-sm font-black text-gray-900 uppercase tracking-tight mb-1">{{ assign.church?.church_name || 'Unknown Church' }}</h4>
                  <div class="flex flex-wrap gap-1 mb-2">
                      <span class="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[9px] font-bold uppercase tracking-widest">{{ assign.assignment_type }}</span>
                      <span class="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest" :class="assign.status_code === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-600'">{{ assign.status_code }}</span>
                  </div>
                  <p v-if="assign.notes" class="text-[10px] sm:text-xs font-medium text-gray-500 bg-gray-50 p-2 sm:p-3 rounded-lg border border-gray-100">{{ assign.notes }}</p>
                </div>
             </div>
          </div>
        </div>

        <!-- Tab: Spiritual Family -->
        <div v-else-if="activeTab === 'family'" class="bg-white rounded-lg shadow-sm border border-gray-100 p-5 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Disciples</h3>
            <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black tracking-widest">{{ pastor.disciples?.length || 0 }}</span>
          </div>
          
          <div v-if="pastor.disciples && pastor.disciples.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="son in pastor.disciples" :key="son.id" @click="router.push(`/pastors/${son.id}`)" class="flex items-center gap-3 p-3 rounded-md border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-indigo-50 overflow-hidden shrink-0 relative group/avatar" @click.stop="viewingAvatar = { url: son.pastor_image_url, text: son.full_name.charAt(0), bgClass: 'bg-indigo-50', textClass: 'text-indigo-600' }">
                      <img v-if="son.pastor_image_url" :src="son.pastor_image_url" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center font-black text-indigo-600 text-xs uppercase">{{ son.full_name.charAt(0) }}</div>
                      <div class="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </div>
                  </div>
                  <div class="flex-1 min-w-0">
                      <div class="font-bold text-gray-900 uppercase text-xs truncate">{{ son.full_name }}</div>
                      <div class="text-[9px] font-bold text-gray-400 uppercase">{{ son.current_status_code }}</div>
                  </div>
                  <svg class="w-3.5 h-3.5 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
              </div>
          </div>
          <div v-else class="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] border border-dashed border-gray-200 rounded-md">
              No spiritual sons recorded.
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Modal -->
    <Teleport to="body">
    <div v-if="isEditModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col relative my-auto">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Profile</h3>
          <button @click="isEditModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <form @submit.prevent="submitEdit" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <!-- Images Section -->
              <div class="col-span-2 sm:col-span-1 flex flex-col items-center p-4 border border-gray-200 border-dashed rounded-md bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors" @click="$refs.pImgInput.click()">
                 <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Pastor Photo</div>
                 <div class="relative w-16 h-16 rounded-md border-2 border-white shadow-sm flex items-center justify-center bg-white overflow-hidden">
                   <div v-if="editPreviews.pastor" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${editPreviews.pastor})`}"></div>
                   <div v-else class="text-gray-300"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></div>
                 </div>
                 <input type="file" ref="pImgInput" class="hidden" accept="image/*" @change="e => onFileChange(e, 'pastor')" />
              </div>

              <div class="col-span-2 sm:col-span-1 flex flex-col items-center p-4 border border-gray-200 border-dashed rounded-md bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors" @click="$refs.wImgInput.click()">
                 <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Wife Photo</div>
                 <div class="relative w-16 h-16 rounded-md border-2 border-white shadow-sm flex items-center justify-center bg-white overflow-hidden">
                   <div v-if="editPreviews.wife" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${editPreviews.wife})`}"></div>
                   <div v-else class="text-gray-300"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></div>
                 </div>
                 <input type="file" ref="wImgInput" class="hidden" accept="image/*" @change="e => onFileChange(e, 'wife')" />
              </div>
            </div>

            <!-- Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="sm:col-span-2">
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Full Name</label>
                <input v-model="editData.full_name" required type="text" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
              
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Contact</label>
                <input v-model="editData.contact_number" type="text" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Birthdate</label>
                <input v-model="editData.birthdate" type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>

              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Spouse Name</label>
                <input v-model="editData.wife_name" type="text" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Spouse Birthdate</label>
                <input v-model="editData.wife_birthdate" type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Mentor</label>
                <SearchableSelect
                  v-model="editData.parent_id"
                  :options="allPastors"
                  label-key="full_name"
                  value-key="id"
                  placeholder="None (Root Leader)"
                  clear-placeholder="None (Root Leader)"
                />
              </div>

              <div class="sm:col-span-2">
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
                <textarea v-model="editData.notes" rows="3" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold"></textarea>
              </div>
            </div>

            <!-- Footer -->
            <div class="flex justify-end gap-2 pt-2">
              <button type="button" @click="isEditModalOpen = false" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSaving" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                {{ isSaving ? 'Saving...' : 'Update' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Assign Modal -->
    <Teleport to="body">
    <div v-if="isAssignModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-xl flex flex-col relative my-auto animate-in slide-in-from-bottom duration-300">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-lg">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Assign Role / Transfer</h3>
          <button @click="isAssignModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <form @submit.prevent="submitAssign" class="space-y-4">
            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Transition Type</label>
              <SearchableSelect
                v-model="assignData.transition_type"
                :options="transitionTypes"
                label-key="label"
                value-key="value"
                placeholder="Select transition type..."
                clear-placeholder="None"
              />
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Effective Date</label>
              <input v-model="assignData.effective_date" type="date" required class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
            </div>

            <div v-if="assignData.transition_type === 'takeover'">
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Select Church</label>
              <SearchableSelect
                v-model="assignData.church_id"
                :options="allChurches"
                label-key="church_name"
                value-key="id"
                placeholder="Select a church..."
                clear-placeholder="None"
              />
            </div>

            <div v-if="['pioneer', 'international'].includes(assignData.transition_type)">
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">New Church Name</label>
              <input v-model="assignData.new_church_name" type="text" required class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
            </div>

            <div v-if="assignData.transition_type === 'undeploy'">
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Reason Code</label>
              <SearchableSelect
                v-model="assignData.reason"
                :options="undeployReasons"
                label-key="label"
                value-key="value"
                placeholder="Select reason..."
                clear-placeholder="None"
              />
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes (Optional)</label>
              <textarea v-model="assignData.notes" rows="2" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold"></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" @click="isAssignModalOpen = false" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isAssigning" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                {{ isAssigning ? 'Processing...' : 'Confirm' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Add Assignment Modal (explicit historical/backfill entry - full control over dates & status) -->
    <Teleport to="body">
    <div v-if="isAddAssignModalOpen" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-xl flex flex-col relative my-auto">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Add Assignment Record</h3>
          <button @click="isAddAssignModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-md border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 leading-relaxed">Use this to backfill a past assignment. Set an End Date and Status "Ended" for old records so only the pastor's true current assignment stays marked Active.</p>
          <form @submit.prevent="submitAddAssign" class="space-y-4">
            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Church</label>
              <SearchableSelect
                v-model="addAssignData.church_id"
                :options="allChurches"
                label-key="church_name"
                value-key="id"
                placeholder="Select a church..."
                clear-placeholder="None"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Start Date</label>
                <input v-model="addAssignData.start_date" required type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
              <div>
                <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">End Date</label>
                <input v-model="addAssignData.end_date" type="date" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
              </div>
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Status</label>
              <select v-model="addAssignData.status_code" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold">
                <option value="ended">Ended (past assignment)</option>
                <option value="active">Active (current assignment)</option>
              </select>
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Assignment Type</label>
              <input v-model="addAssignData.assignment_type" type="text" placeholder="e.g. legacy, pioneer, takeover" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold" />
            </div>

            <div>
              <label class="block text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Notes</label>
              <textarea v-model="addAssignData.notes" rows="2" class="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs font-bold"></textarea>
            </div>

            <div class="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button type="button" @click="isAddAssignModalOpen = false" class="px-4 py-2 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-gray-800 transition-colors">Cancel</button>
              <button type="submit" :disabled="isSavingNewAssign" class="px-6 py-2 bg-gray-900 text-white text-xs font-black uppercase tracking-widest rounded-lg hover:bg-black shadow-sm active:scale-95 transition-all disabled:opacity-50">
                {{ isSavingNewAssign ? 'Saving...' : 'Add Record' }}
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

    <!-- Avatar Viewer Modal -->
    <div v-if="viewingAvatar" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-200" @click="viewingAvatar = null">
      <button class="absolute top-4 right-4 sm:top-8 sm:right-8 text-white/50 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-md transition-all" @click="viewingAvatar = null">
         <svg class="w-6 h-6 sm:w-8 sm:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
      
      <div class="w-full max-w-2xl flex items-center justify-center" @click.stop>
        <div v-if="viewingAvatar.url" class="relative">
          <img :src="viewingAvatar.url" class="max-w-full max-h-[85vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-300" />
        </div>
        <div v-else :class="[`w-64 h-64 sm:w-96 sm:h-96 flex items-center justify-center text-[8rem] sm:text-[12rem] font-black uppercase shadow-2xl animate-in zoom-in-95 duration-300`, viewingAvatar.bgClass, viewingAvatar.textClass, viewingAvatar.isRounded ? 'rounded-full' : 'rounded-lg']">
          {{ viewingAvatar.text }}
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SearchableSelect from '../components/SearchableSelect.vue'
import { PastorService } from '../services/db/PastorService'
import { ChurchService } from '../services/db/ChurchService'
import { AssignmentService } from '../services/db/AssignmentService'

import Swal from 'sweetalert2'
import { generateSummaryHtml } from '../utils/swal-helper'

const route = useRoute()
const router = useRouter()
const pastor = ref(null)
const assignments = ref([])
const allPastors = ref([])
const activeTab = ref('overview')
const loading = ref(true)
const viewingAvatar = ref(null)

const yearsInMinistry = computed(() => {
    if (!pastor.value || !pastor.value.pastoring_start_date) return null
    const start = new Date(pastor.value.pastoring_start_date)
    const now = new Date()
    let years = now.getFullYear() - start.getFullYear()
    const m = now.getMonth() - start.getMonth()
    if (m < 0 || (m === 0 && now.getDate() < start.getDate())) {
        years--
    }
    return years >= 0 ? years : 0
})

// Edit Modal State
const isEditModalOpen = ref(false)
const isSaving = ref(false)
const editData = ref({})
const editFiles = ref({ pastor: null, wife: null })
const editPreviews = ref({ pastor: null, wife: null })

const transitionTypes = [
  { value: 'pioneer', label: 'Pioneer New Church' },
  { value: 'takeover', label: 'Takeover Existing Church' },
  { value: 'international', label: 'International Mission' },
  { value: 'undeploy', label: 'Undeploy / Pullout' },
  { value: 'legacy', label: 'Legacy (Deceased/Ended)' }
]

const undeployReasons = [
  { value: 'pullout', label: 'Pullout' },
  { value: 'redirection', label: 'Redirection' },
  { value: 'transferred', label: 'Transferred' }
]

// Assign Modal State
const allChurches = ref([])
const isAssignModalOpen = ref(false)
const isAssigning = ref(false)
const assignData = ref({
  transition_type: 'pioneer',
  effective_date: new Date().toISOString().split('T')[0],
  church_id: null,
  new_church_name: '',
  reason: 'pullout',
  notes: ''
})

const fetchData = async () => {
    try {
        const id = route.params.id
        
        // Single pastor with relationships
        pastor.value = await PastorService.getById(id)
        
        // Fetch assignments
        assignments.value = await AssignmentService.getByPastor(id)
        
        // Fetch ALL pastors (for mentor dropdown)
        const allRes = await PastorService.getAll()
        allPastors.value = allRes.filter(p => p.id !== id) // exclude self
    } catch (err) {
        console.error(err)
    } finally {
        loading.value = false
    }
}

const openAssignModal = async () => {
    isAssignModalOpen.value = true
    assignData.value = {
        transition_type: 'pioneer',
        effective_date: new Date().toISOString().split('T')[0],
        church_id: null,
        new_church_name: '',
        reason: 'pullout',
        notes: ''
    }
    if (allChurches.value.length === 0) {
        try {
            allChurches.value = await ChurchService.getAll()
        } catch (err) {
            console.error(err)
        }
    }
}

const submitAssign = async () => {
    const displayMap = { transition_type: 'TYPE', effective_date: 'DATE', new_church_name: 'NEW CHURCH', reason: 'REASON' };
    const summaryHtml = generateSummaryHtml(assignData.value, displayMap);
    
    const result = await Swal.fire({
        title: 'Confirm Assignment',
        text: 'Please review the transition details before confirming:',
        html: summaryHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, confirm it'
    })
    
    if (!result.isConfirmed) return;

    isAssigning.value = true
    try {
        await AssignmentService.create({
            pastor_id: route.params.id,
            ...assignData.value
        })
        isAssignModalOpen.value = false
        fetchData() // Refresh assignments and pastor status
    } catch (err) {
        console.error(err)
        alert('Failed to assign role')
    } finally {
        isAssigning.value = false
    }
}

// Add Assignment State (explicit backfill/historical entry)
const isAddAssignModalOpen = ref(false)
const isSavingNewAssign = ref(false)
const addAssignData = ref({})

const openAddAssignModal = async () => {
    addAssignData.value = {
        church_id: null,
        start_date: '',
        end_date: '',
        status_code: 'ended',
        assignment_type: 'legacy',
        notes: ''
    }
    if (allChurches.value.length === 0) {
        try {
            allChurches.value = await ChurchService.getAll()
        } catch (err) {
            console.error(err)
        }
    }
    isAddAssignModalOpen.value = true
}

const submitAddAssign = async () => {
    isSavingNewAssign.value = true
    try {
        await AssignmentService.create({
            pastor_id: route.params.id,
            church_id: addAssignData.value.church_id,
            start_date: addAssignData.value.start_date,
            end_date: addAssignData.value.end_date || null,
            status_code: addAssignData.value.status_code,
            assignment_type: addAssignData.value.assignment_type,
            notes: addAssignData.value.notes
        })
        isAddAssignModalOpen.value = false
        fetchData()
    } catch (err) {
        console.error(err)
        alert('Failed to add assignment record')
    } finally {
        isSavingNewAssign.value = false
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
        fetchData()
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
        text: `Remove the record for "${assign.church?.church_name || 'this church'}"? This cannot be undone.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc2626',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, delete it'
    })
    if (!result.isConfirmed) return

    try {
        await AssignmentService.delete(assign.id)
        fetchData()
    } catch (err) {
        console.error(err)
        alert('Failed to delete assignment')
    }
}

const openEditModal = () => {
    editData.value = {
        full_name: pastor.value.full_name,
        contact_number: pastor.value.contact_number,
        birthdate: pastor.value.birthdate ? pastor.value.birthdate.split('T')[0] : '',
        wife_name: pastor.value.wife_name,
        wife_birthdate: pastor.value.wife_birthdate ? pastor.value.wife_birthdate.split('T')[0] : '',
        current_status_code: pastor.value.current_status_code,
        record_status: pastor.value.record_status,
        notes: pastor.value.notes,
        parent_id: pastor.value.parent_id
    }
    editPreviews.value = {
        pastor: pastor.value.pastor_image_url,
        wife: pastor.value.wife_image_url
    }
    editFiles.value = { pastor: null, wife: null }
    isEditModalOpen.value = true
}

const onFileChange = (e, target) => {
    const file = e.target.files[0]
    if (file) {
        editFiles.value[target] = file
        editPreviews.value[target] = URL.createObjectURL(file)
    }
}

const submitEdit = async () => {
    const summaryHtml = generateSummaryHtml(editData.value);
    
    const result = await Swal.fire({
        title: 'Save Changes?',
        text: 'Please review your profile updates before saving:',
        html: summaryHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#111827',
        cancelButtonColor: '#9ca3af',
        confirmButtonText: 'Yes, save changes'
    })
    
    if (!result.isConfirmed) return;

    isSaving.value = true
    try {
        await PastorService.update(route.params.id, editData.value, editFiles.value.pastor, editFiles.value.wife)
        isEditModalOpen.value = false
        fetchData() // Refresh
    } catch (err) {
        console.error(err)
        alert('Failed to update pastor')
    } finally {
        isSaving.value = false
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
