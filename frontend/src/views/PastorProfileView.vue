<template>
  <div v-if="loading" class="animate-pulse space-y-4 max-w-6xl mx-auto px-4 sm:px-6 mt-6">
    <div class="h-32 bg-gray-100 rounded-[1.5rem]"></div>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="h-64 bg-gray-100 rounded-[1.5rem]"></div>
      <div class="lg:col-span-2 h-64 bg-gray-100 rounded-[1.5rem]"></div>
    </div>
  </div>

  <div v-else-if="!pastor" class="text-center py-20 bg-white rounded-[1.5rem] border border-gray-100 shadow-sm max-w-xl mx-auto mt-10 px-4">
    <div class="w-16 h-16 bg-gray-50 text-gray-300 rounded-full flex items-center justify-center mx-auto mb-4">
      <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
    </div>
    <h2 class="text-xl font-black text-gray-900 tracking-tight">Record Not Found</h2>
    <p class="text-xs text-gray-500 mt-2">The minister you are looking for might have been moved or the ID is incorrect.</p>
    <button @click="router.push('/pastors')" class="mt-6 px-6 py-2.5 text-xs bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all shadow-sm active:scale-95">
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
    <div class="bg-white rounded-[1.5rem] shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] border border-gray-100 p-5 sm:p-6">
      <div class="flex flex-col md:flex-row gap-5 items-start md:items-center">
        
        <!-- Avatars -->
        <div class="flex items-center shrink-0">
          <div class="relative z-10 group cursor-pointer" @click="viewingAvatar = { url: pastor.pastor_image_url, text: pastor.full_name.charAt(0), bgClass: 'bg-slate-50', textClass: 'text-slate-300' }">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-[1.25rem] border border-gray-100 shadow-sm overflow-hidden bg-white relative">
              <img v-if="pastor.pastor_image_url" :src="pastor.pastor_image_url" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full bg-slate-50 flex items-center justify-center text-3xl sm:text-4xl font-black text-slate-300 uppercase">
                {{ pastor.full_name.charAt(0) }}
              </div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
            </div>
            <!-- Status Badge -->
            <div class="absolute -bottom-2 -right-2 w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center text-white shadow-sm"
                 :class="pastor.current_status_code === 'active' ? 'bg-emerald-500' : 'bg-gray-400'">
              <svg v-if="pastor.current_status_code === 'active'" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
              <div v-else class="w-2.5 h-2.5 bg-white rounded-full"></div>
            </div>
          </div>
          
          <div v-if="pastor.wife_name" class="relative -ml-6 sm:-ml-8 z-0 group cursor-pointer" @click="viewingAvatar = { url: pastor.wife_image_url, text: pastor.wife_name.charAt(0), bgClass: 'bg-pink-50', textClass: 'text-pink-300', isRounded: true }">
            <div class="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-[3px] border-white shadow-sm overflow-hidden bg-pink-50 relative">
              <img v-if="pastor.wife_image_url" :src="pastor.wife_image_url" class="w-full h-full object-cover" />
              <div v-else class="w-full h-full flex items-center justify-center text-xl sm:text-2xl font-black text-pink-300 uppercase">
                {{ pastor.wife_name.charAt(0) }}
              </div>
              <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                 <svg class="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </div>
            </div>
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <div class="flex flex-wrap items-center gap-2 mb-1.5">
            <h1 class="text-xl sm:text-2xl font-black text-gray-900 uppercase tracking-tight truncate">{{ pastor.full_name }}</h1>
            <span class="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] font-bold uppercase tracking-widest shrink-0">{{ pastor.current_status_code }}</span>
          </div>
          <div class="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span v-if="pastor.mentor" class="cursor-pointer hover:text-indigo-600 transition-colors" @click="router.push(`/pastors/${pastor.mentor.id}`)">Mentor: {{ pastor.mentor.full_name }}</span>
            <span v-else class="text-gray-400">Root Leader</span>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex flex-wrap gap-2 w-full md:w-auto pt-4 md:pt-0 border-t border-gray-100 md:border-0 mt-2 md:mt-0 shrink-0">
          <button @click="openEditModal" class="flex-1 md:flex-none px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            Edit
          </button>
          <button @click="openAssignModal" class="w-full md:w-auto px-4 py-2 bg-gray-900 hover:bg-black text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Assign
          </button>
        </div>
        
      </div>
    </div>

    <!-- Main Content Layout -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      
      <!-- Left Sidebar (Details & Wife) -->
      <div class="lg:col-span-1 space-y-4">
        
        <div class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
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
                  <p class="text-[10px] font-bold text-emerald-600 uppercase">Ordained</p>
                  <p class="text-xs font-bold text-gray-900 truncate">{{ new Date(pastor.pastoring_start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) }}</p>
               </div>
            </div>
          </div>
        </div>

        <div v-if="pastor.wife_name" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <div class="px-5 py-3.5 border-b border-gray-50 bg-gray-50/30">
             <h3 class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Spouse</h3>
          </div>
          <div class="p-5 flex items-center gap-3">
             <div class="w-10 h-10 rounded-lg overflow-hidden bg-pink-50 border border-gray-100 shrink-0">
               <img v-if="pastor.wife_image_url" :src="pastor.wife_image_url" class="w-full h-full object-cover" />
               <div v-else class="w-full h-full flex items-center justify-center font-black text-pink-300 text-sm uppercase">{{ pastor.wife_name.charAt(0) }}</div>
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
        <div class="bg-gray-100 p-1 rounded-xl flex overflow-x-auto no-scrollbar shadow-inner">
          <button @click="activeTab = 'overview'" :class="activeTab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Overview</button>
          <button @click="activeTab = 'history'" :class="activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">History</button>
          <button @click="activeTab = 'family'" :class="activeTab === 'family' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'" class="px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all whitespace-nowrap flex-1 text-center">Spiritual Family</button>
        </div>

        <!-- Tab: Overview -->
        <div v-if="activeTab === 'overview'" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 sm:p-6 min-h-[250px]">
          <h3 class="text-xs font-black text-gray-900 mb-4 uppercase tracking-widest">Notes</h3>
          <div v-if="pastor.notes" class="text-xs text-gray-600 leading-relaxed font-medium whitespace-pre-wrap">{{ pastor.notes }}</div>
          <div v-else class="flex flex-col items-center justify-center py-12 text-gray-300">
             <svg class="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
             <p class="font-bold text-xs">No notes provided.</p>
          </div>
        </div>

        <!-- Tab: History -->
        <div v-else-if="activeTab === 'history'" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Assignments</h3>
            <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black tracking-widest">{{ assignments.length }}</span>
          </div>
          
          <div v-if="assignments.length === 0" class="text-center py-12 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <p class="font-bold uppercase tracking-widest text-[10px]">No assignment history.</p>
          </div>
          
          <div v-else class="relative border-l-2 border-gray-100 ml-2 space-y-6">
             <div v-for="assign in assignments" :key="assign.id" class="relative pl-5">
                <div class="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-white border-2" :class="assign.status_code === 'active' ? 'border-emerald-500' : 'border-gray-300'"></div>
                <div>
                  <div class="text-[9px] font-black text-gray-400 mb-0.5 uppercase tracking-widest">
                    {{ new Date(assign.start_date).getFullYear() }} — {{ assign.end_date ? new Date(assign.end_date).getFullYear() : 'Present' }}
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
        <div v-else-if="activeTab === 'family'" class="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-5 sm:p-6">
          <div class="flex justify-between items-center mb-5">
            <h3 class="text-xs font-black text-gray-900 uppercase tracking-widest">Disciples</h3>
            <span class="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[9px] font-black tracking-widest">{{ pastor.disciples?.length || 0 }}</span>
          </div>
          
          <div v-if="pastor.disciples && pastor.disciples.length > 0" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div v-for="son in pastor.disciples" :key="son.id" @click="router.push(`/pastors/${son.id}`)" class="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden shrink-0 relative group/avatar" @click.stop="viewingAvatar = { url: son.pastor_image_url, text: son.full_name.charAt(0), bgClass: 'bg-gray-100', textClass: 'text-gray-300' }">
                      <img v-if="son.pastor_image_url" :src="son.pastor_image_url" class="w-full h-full object-cover" />
                      <div v-else class="w-full h-full flex items-center justify-center font-black text-gray-300 text-xs uppercase">{{ son.full_name.charAt(0) }}</div>
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
          <div v-else class="py-12 text-center text-gray-400 font-bold uppercase tracking-widest text-[10px] border border-dashed border-gray-200 rounded-xl">
              No spiritual sons recorded.
          </div>
        </div>

      </div>
    </div>

    <!-- Edit Modal -->
    <div v-if="isEditModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6 overflow-y-auto py-10">
      <div class="bg-white rounded-[1.5rem] shadow-xl w-full max-w-2xl flex flex-col relative my-auto">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[1.5rem]">
          <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Edit Profile</h3>
          <button @click="isEditModalOpen = false" class="text-gray-400 hover:text-gray-600 bg-white p-1.5 rounded-lg border border-gray-200 active:scale-95 shadow-sm">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        
        <div class="p-5 overflow-y-auto max-h-[75vh]">
          <form @submit.prevent="submitEdit" class="space-y-5">
            <div class="grid grid-cols-2 gap-4">
              <!-- Images Section -->
              <div class="col-span-2 sm:col-span-1 flex flex-col items-center p-4 border border-gray-200 border-dashed rounded-xl bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors" @click="$refs.pImgInput.click()">
                 <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Pastor Photo</div>
                 <div class="relative w-16 h-16 rounded-xl border-2 border-white shadow-sm flex items-center justify-center bg-white overflow-hidden">
                   <div v-if="editPreviews.pastor" class="absolute inset-0 bg-cover bg-center" :style="{backgroundImage: `url(${editPreviews.pastor})`}"></div>
                   <div v-else class="text-gray-300"><svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg></div>
                 </div>
                 <input type="file" ref="pImgInput" class="hidden" accept="image/*" @change="e => onFileChange(e, 'pastor')" />
              </div>

              <div class="col-span-2 sm:col-span-1 flex flex-col items-center p-4 border border-gray-200 border-dashed rounded-xl bg-gray-50 relative cursor-pointer hover:bg-gray-100 transition-colors" @click="$refs.wImgInput.click()">
                 <div class="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Wife Photo</div>
                 <div class="relative w-16 h-16 rounded-full border-2 border-white shadow-sm flex items-center justify-center bg-white overflow-hidden">
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

    <!-- Assign Modal -->
    <div v-if="isAssignModalOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/40 backdrop-blur-sm sm:p-6 overflow-y-auto py-10">
      <div class="bg-white rounded-[1.5rem] shadow-xl w-full max-w-xl flex flex-col relative my-auto animate-in slide-in-from-bottom duration-300">
        <div class="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-[1.5rem]">
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
import { ref, onMounted } from 'vue'
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
