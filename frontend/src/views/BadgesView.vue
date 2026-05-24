<template>
  <div class="h-full flex flex-col bg-[#f8fafc] overflow-hidden font-ui">
    
    <!-- ══ MAIN SCROLLABLE AREA ══ -->
    <div class="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 relative">
      <div class="max-w-7xl mx-auto flex flex-col min-[1290px]:flex-row gap-6 min-[1290px]:gap-8">
        
        <!-- LEFT COLUMN: Search & Canvas -->
        <div class="flex-1 flex flex-col gap-8 min-w-0">
          
          <!-- SEARCH AUTOCOMPLETE -->
          <div class="relative z-50 w-full">
            <!-- Search Input Container -->
            <div class="flex items-center w-full bg-[#f1f5f9] border border-gray-200/60 rounded-xl transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-sm">
               <div class="pl-4 flex items-center pointer-events-none shrink-0">
                 <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
               </div>
               <input 
                 v-model="search" 
                 @focus="searchFocused = true" 
                 @blur="handleSearchBlur"
                 type="text" 
                 placeholder="Search and Select a Pastor/Wife/Discple" 
                 class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400"
               >
               
               <!-- Divider and Filter Button -->
               <div class="flex items-center pr-2 shrink-0">
                  <div class="w-[1.5px] h-6 bg-gray-300 mx-1.5 rounded-full"></div>
                  <button @mousedown.prevent="filterMenuOpen = !filterMenuOpen" class="flex items-center gap-1.5 px-3 py-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200/50 rounded-lg transition-colors">
                     <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                     <span class="text-[10px] font-black uppercase tracking-widest text-gray-600">{{ filterRole === 'ALL' ? 'FILTER' : filterRole }}</span>
                  </button>
               </div>
            </div>
            
            <!-- Autocomplete Dropdown -->
            <transition name="fade">
              <div v-if="searchFocused && filteredDelegates.length > 0" class="absolute top-full mt-2 inset-x-0 bg-white border border-gray-100 shadow-xl rounded-xl max-h-[40vh] overflow-y-auto py-2 z-50">
                <button 
                  v-for="d in filteredDelegates.slice(0, 50)" :key="d.uniqueId" 
                  @mousedown.prevent="selectDelegate(d)" 
                  class="w-full text-left px-5 py-3 hover:bg-indigo-50 transition-colors flex flex-col border-b border-gray-50 last:border-0"
                >
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-black text-gray-900 uppercase tracking-tight">{{ d.fullName }}</span>
                    <span :class="['text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter', roleClass(d.role)]">{{ d.role }}</span>
                  </div>
                  <span class="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1 truncate">{{ d.churchName || 'No Church' }}</span>
                </button>
              </div>
            </transition>

            <!-- Filter Dropdown Menu -->
            <transition name="fade">
               <div v-if="filterMenuOpen" class="absolute top-full mt-2 right-0 w-48 bg-white border border-gray-100 shadow-2xl rounded-xl py-2 z-[60]">
                  <button @mousedown.prevent="filterRole = 'ALL'; filterMenuOpen = false" class="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-gray-700 flex justify-between">
                     All Roles <span v-if="filterRole === 'ALL'" class="text-indigo-600">✓</span>
                  </button>
                  <button @mousedown.prevent="filterRole = 'PASTOR'; filterMenuOpen = false" class="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-gray-700 flex justify-between">
                     Pastors <span v-if="filterRole === 'PASTOR'" class="text-indigo-600">✓</span>
                  </button>
                  <button @mousedown.prevent="filterRole = 'DISCIPLE'; filterMenuOpen = false" class="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-gray-700 flex justify-between">
                     Disciples <span v-if="filterRole === 'DISCIPLE'" class="text-indigo-600">✓</span>
                  </button>
                  <button @mousedown.prevent="filterRole = 'WIFE'; filterMenuOpen = false" class="w-full text-left px-4 py-2.5 hover:bg-indigo-50 text-[10px] font-black uppercase tracking-widest text-gray-700 flex justify-between">
                     Wives <span v-if="filterRole === 'WIFE'" class="text-indigo-600">✓</span>
                  </button>
               </div>
            </transition>
          </div>

          <!-- CANVAS CARD -->
          <div class="relative flex flex-col items-center w-full">
             <div class="w-full max-w-[800px] mx-auto flex items-center justify-center">
               <div ref="mainContainer" class="w-full relative max-w-full" :style="{ aspectRatio: `${cfg.badge.width} / ${cfg.badge.height}` }">
                  <div :style="scalerStyle" class="absolute top-0 left-0">
                    <div id="badge-target" class="id-card-landscape bg-white shadow-xl relative overflow-hidden" :style="getBadgeStyle()">
                      <div v-if="selectedDelegate" class="absolute inset-0 z-20">
                        <div v-if="cfg.profile.enabled && selectedDelegate.imageUrl" class="absolute overflow-hidden bg-gray-100 border-2 border-white shadow-lg" :style="getProfileStyle()">
                          <img :src="selectedDelegate.imageUrl" class="w-full h-full object-cover">
                        </div>
                        <div v-if="cfg.name.enabled" class="absolute uppercase leading-tight whitespace-nowrap" :style="getFieldStyle('name', (overrides.fullName || selectedDelegate.fullName))">
                          {{ overrides.fullName || selectedDelegate.fullName }}
                        </div>
                        <div v-if="cfg.role.enabled" class="absolute uppercase leading-tight whitespace-nowrap" :style="getFieldStyle('role', selectedDelegate.role)">
                          {{ selectedDelegate.role }}
                        </div>
                        <div v-if="cfg.district.enabled" class="absolute uppercase leading-tight whitespace-nowrap" :style="getFieldStyle('district', selectedDelegate.districtName)">
                          {{ selectedDelegate.districtName || 'VCCC DAVAO' }}
                        </div>
                        <div v-if="cfg.church.enabled" class="absolute uppercase leading-tight whitespace-nowrap" :style="getFieldStyle('church', (overrides.churchName || selectedDelegate.churchName))">
                          {{ overrides.churchName || selectedDelegate.churchName }}
                        </div>
                        <div v-if="cfg.qr.enabled" class="absolute bg-white p-2 rounded-2xl flex items-center justify-center z-10 shadow-sm" :style="getQRStyle()">
                          <qrcode-vue :value="qrValue" :size="cfg.qr.size - 16" level="H" :render-as="'svg'"/>
                        </div>
                      </div>
                      <div v-if="templateImg" class="absolute inset-0 z-0 bg-[length:100%_100%] bg-no-repeat bg-center" :style="{ backgroundImage: `url(${templateImg})` }"></div>
                      <div v-if="!selectedDelegate && !templateImg" class="absolute inset-0 z-30 flex flex-col items-center justify-center text-center p-12 bg-white/80 backdrop-blur-sm">
                        <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                          <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/></svg>
                        </div>
                        <h3 class="text-gray-400 font-black uppercase tracking-widest text-xs">Ready to Preview</h3>
                        <p class="text-[10px] text-gray-300 mt-2 max-w-[200px] font-bold uppercase">Search and select a delegate</p>
                      </div>
                    </div>
                  </div>
               </div>
             </div>
          </div>
        </div>

        <!-- RIGHT COLUMN (or Bottom on Mobile): Settings -->
        <div class="w-full min-[1290px]:w-[420px] shrink-0 flex flex-col gap-4 z-10 relative pb-12 min-[1290px]:pb-0">
          
          <!-- SETTINGS CARD -->
          <div class="bg-white border border-[#e2e8f0] rounded-2xl p-4 md:p-6 shadow-sm relative overflow-hidden">
             
             <!-- Header & Toggle -->
             <div class="flex justify-between items-center mb-4">
               <h3 class="text-[11px] font-black text-gray-900 uppercase tracking-[0.1em]">{{ activeField === 'templates' ? 'BACKGROUND' : activeField }} SETTINGS</h3>
               <label v-if="activeField !== 'badge' && activeField !== 'templates'" class="relative inline-flex items-center cursor-pointer">
                 <input type="checkbox" v-model="cfg[activeField].enabled" class="sr-only peer">
                 <div class="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0038FF]"></div>
               </label>
             </div>

             <!-- Inner Tab Bar -->
             <div class="flex overflow-x-auto no-scrollbar gap-5 border-b border-[#e2e8f0] mb-5">
                <button v-for="key in ['badge', 'templates', 'name', 'role', 'district', 'church', 'qr', 'profile']" :key="key"
                        @click="activeField = key"
                        :class="['pb-2 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border-b-2',
                                 activeField === key ? 'border-[#0038FF] text-[#0038FF]' : 'border-transparent text-gray-400 hover:text-gray-600']">
                  {{ key === 'profile' ? 'Photo' : key === 'templates' ? 'Background' : key }}
                </button>
             </div>

             <!-- FIELD SETTINGS CONTENT -->
             <div v-if="activeField === 'badge'" class="space-y-4">
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex-1">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">WIDTH (PX)</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg.badge.width -= 10" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg.badge.width" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg.badge.width += 10" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                  </div>
                  <div class="flex-1">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">HEIGHT (PX)</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg.badge.height -= 10" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg.badge.height" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg.badge.height += 10" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                  </div>
                </div>
             </div>

             <div v-else-if="activeField === 'templates'" class="space-y-4">
                <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">BACKGROUND IMAGE</label>
                <div @click="$refs.fileInput.click()" class="group relative cursor-pointer border-2 border-dashed border-[#cbd5e1] rounded-2xl p-6 transition-all hover:border-[#0038FF] hover:bg-indigo-50/30 text-center">
                  <input type="file" ref="fileInput" @change="handleTemplateUpload" class="hidden" accept="image/*">
                  <div v-if="!templateImg" class="space-y-2">
                    <svg class="mx-auto w-6 h-6 text-[#94a3b8] group-hover:text-[#0038FF] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <p class="text-[9px] font-bold text-[#64748b] uppercase tracking-widest">TAP TO BROWSE FILE</p>
                  </div>
                  <div v-else class="relative aspect-[1.4] w-full rounded-lg overflow-hidden border border-gray-200 shadow-sm mx-auto">
                    <img :src="templateImg" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <span class="text-[9px] font-black uppercase tracking-widest">CHANGE BACKGROUND</span>
                    </div>
                  </div>
                </div>
                <button v-if="templateImg" @click="templateImg = ''; localStorage.removeItem('vccc_badge_template')" class="w-full py-2.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-all uppercase tracking-widest">Remove Image</button>
             </div>

             <div v-else-if="cfg[activeField].enabled" class="space-y-5">
                <!-- DISPLAY OVERRIDE -->
                <div v-if="activeField === 'name' || activeField === 'church'">
                  <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">DISPLAY OVERRIDE</label>
                  <input v-if="activeField === 'name'" v-model="overrides.fullName" type="text" class="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#0038FF] focus:ring-1 focus:ring-[#0038FF] rounded-lg text-sm font-semibold outline-none transition-all">
                  <input v-if="activeField === 'church'" v-model="overrides.churchName" type="text" class="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#0038FF] focus:ring-1 focus:ring-[#0038FF] rounded-lg text-sm font-semibold outline-none transition-all">
                </div>

                <!-- X and Y -->
                <div class="grid grid-cols-2 gap-3">
                  <div class="flex-1">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">X (PX)</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg[activeField].x -= 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg[activeField].x" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg[activeField].x += 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                  </div>
                  <div class="flex-1">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">Y (PX)</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg[activeField].y -= 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg[activeField].y" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg[activeField].y += 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                  </div>
                </div>

                <!-- TEXT SETTINGS -->
                <div v-if="activeField !== 'qr' && activeField !== 'profile'">
                   <!-- Font Size -->
                   <div class="w-1/2 pr-1.5 mb-4">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">FONT SIZE</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg[activeField].fontSize -= 2" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg[activeField].fontSize" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg[activeField].fontSize += 2" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                   </div>

                   <!-- Secondary Text Settings -->
                   <div class="pt-4 border-t border-gray-100 space-y-4">
                      <div class="grid grid-cols-2 gap-3">
                         <div>
                            <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">MAX WIDTH</label>
                            <input v-model.number="cfg[activeField].maxWidth" type="number" class="w-full px-3 py-2.5 bg-white border border-[#e2e8f0] focus:border-[#0038FF] rounded-lg text-sm font-semibold outline-none transition-all">
                         </div>
                         <div>
                            <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">ALIGNMENT</label>
                            <select v-model="cfg[activeField].textAlign" class="w-full px-3 py-2 bg-white border border-[#e2e8f0] focus:border-[#0038FF] rounded-lg text-sm font-semibold outline-none transition-all appearance-none cursor-pointer">
                               <option value="left">Left</option>
                               <option value="center">Center</option>
                               <option value="right">Right</option>
                            </select>
                         </div>
                      </div>

                      <div class="flex items-center gap-4">
                        <div class="flex-1">
                           <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">COLOR</label>
                           <div class="flex items-center gap-2 px-3 py-1.5 border border-[#e2e8f0] rounded-lg">
                              <input type="color" v-model="cfg[activeField].color" class="w-6 h-6 rounded border-0 bg-transparent cursor-pointer p-0">
                              <span class="text-[10px] font-mono font-bold text-gray-600 uppercase">{{ cfg[activeField].color }}</span>
                           </div>
                        </div>
                        <div class="flex items-center gap-1.5 mt-5">
                           <button @click="toggleBold(activeField)" :class="['w-9 h-9 rounded-lg flex items-center justify-center transition-all', cfg[activeField].fontWeight === 'bold' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"><span class="font-black text-xs">B</span></button>
                           <button @click="toggleItalic(activeField)" :class="['w-9 h-9 rounded-lg flex items-center justify-center transition-all', cfg[activeField].fontStyle === 'italic' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200']"><span class="italic text-xs font-serif font-bold">I</span></button>
                        </div>
                      </div>
                   </div>
                </div>

                <!-- QR & PROFILE SIZE -->
                <div v-else>
                   <div class="w-1/2 pr-1.5">
                     <label class="block text-[9px] font-bold text-[#475569] uppercase tracking-widest mb-1.5">{{ activeField === 'qr' ? 'QR SIZE' : 'PHOTO SIZE' }}</label>
                     <div class="flex items-center border border-[#e2e8f0] rounded-lg bg-white overflow-hidden focus-within:border-[#0038FF] transition-all">
                        <button @click="cfg[activeField].size -= 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-r border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4"/></svg>
                        </button>
                        <input v-model.number="cfg[activeField].size" type="number" class="flex-1 w-0 text-center text-sm font-semibold text-gray-900 border-0 p-0 focus:ring-0 appearance-none m-0">
                        <button @click="cfg[activeField].size += 5" class="w-9 h-9 flex items-center justify-center text-gray-500 hover:bg-gray-50 border-l border-[#e2e8f0] active:bg-gray-100 transition-colors">
                           <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                        </button>
                     </div>
                   </div>
                </div>

             </div>

             <!-- FIELD DISABLED -->
             <div v-else class="py-10 text-center text-gray-400">
               <svg class="w-6 h-6 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
               <p class="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">FIELD IS DISABLED</p>
               <p class="text-[9px] mt-1.5 font-semibold">Toggle the switch above to enable it.</p>
             </div>

          </div>
          
          <!-- Restore & Export Buttons -->
          <div class="px-2 flex flex-col gap-2">
            <button @click="downloadCurrentBadge" :disabled="!selectedDelegate" class="w-full py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              DOWNLOAD SINGLE BADGE
            </button>
            <button @click="openExportWizard" class="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:from-indigo-700 hover:to-violet-700 transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              BATCH EXPORT BADGES (ZIP)
            </button>
            <button @click="resetConfig" class="w-full py-3 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors">Reset to Default Settings</button>
          </div>
        </div>
        
      </div>
    </div>
    
    <!-- ══ EXPORT WIZARD MODAL ══ -->
    <transition name="fade">
      <div v-if="isExportWizardOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="!isExporting && (isExportWizardOpen = false)"></div>
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden relative z-10 flex flex-col max-h-[90vh]">
          
          <!-- Header -->
          <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white shrink-0">
            <div>
              <h2 class="text-lg font-black text-gray-900 uppercase tracking-tight">Batch Export Badges</h2>
              <p class="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">Generate physical ID images into a ZIP file</p>
            </div>
            <button v-if="!isExporting" @click="isExportWizardOpen = false" class="text-gray-400 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100 p-2 rounded-full">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Wizard Content -->
          <div v-if="!isExporting" class="p-6 overflow-y-auto space-y-6 bg-gray-50/50 flex-1">
            
            <!-- Roles -->
            <div>
              <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3">1. Select Roles to Export</label>
              <div class="grid grid-cols-3 gap-3">
                <label class="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all" :class="exportRoles.PASTOR ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300'">
                  <input type="checkbox" v-model="exportRoles.PASTOR" class="sr-only">
                  <span class="text-xs font-black uppercase tracking-widest" :class="exportRoles.PASTOR ? 'text-indigo-700' : 'text-gray-500'">Pastors</span>
                </label>
                <label class="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all" :class="exportRoles.WIFE ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300'">
                  <input type="checkbox" v-model="exportRoles.WIFE" class="sr-only">
                  <span class="text-xs font-black uppercase tracking-widest" :class="exportRoles.WIFE ? 'text-indigo-700' : 'text-gray-500'">Wives</span>
                </label>
                <label class="flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all" :class="exportRoles.DISCIPLE ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-200 bg-white hover:border-gray-300'">
                  <input type="checkbox" v-model="exportRoles.DISCIPLE" class="sr-only">
                  <span class="text-xs font-black uppercase tracking-widest" :class="exportRoles.DISCIPLE ? 'text-indigo-700' : 'text-gray-500'">Disciples</span>
                </label>
              </div>
            </div>

            <!-- Districts -->
            <div>
              <div class="flex items-center justify-between mb-3">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500">2. Select Districts <span class="text-gray-400 font-semibold lowercase tracking-normal">(Leave empty for all)</span></label>
                <button @click="toggleSelectAllDistricts" class="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                  {{ exportDistricts.length === availableDistricts.length ? 'Deselect All' : 'Select All' }}
                </button>
              </div>
              <div class="bg-white border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-100 shadow-inner">
                <label v-for="dist in availableDistricts" :key="dist" class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" :value="dist" v-model="exportDistricts" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500">
                  <span class="text-xs font-bold text-gray-700">{{ dist || 'Unassigned District' }}</span>
                </label>
              </div>
            </div>

            <!-- Churches -->
            <div v-if="exportDistricts.length > 0">
              <div class="flex items-center justify-between mb-3">
                <label class="block text-[10px] font-black uppercase tracking-widest text-gray-500">3. Select Churches <span class="text-gray-400 font-semibold lowercase tracking-normal">(Leave empty for all in selected districts)</span></label>
                <button @click="toggleSelectAllChurches" class="text-[9px] font-bold text-indigo-600 hover:text-indigo-800 uppercase tracking-widest bg-indigo-50 px-2 py-1 rounded">
                  {{ exportChurches.length === availableChurches.length ? 'Deselect All' : 'Select All' }}
                </button>
              </div>
              <div class="bg-white border border-gray-200 rounded-xl max-h-40 overflow-y-auto divide-y divide-gray-100 shadow-inner">
                <label v-for="church in availableChurches" :key="church" class="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input type="checkbox" :value="church" v-model="exportChurches" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500">
                  <span class="text-xs font-bold text-gray-700">{{ church || 'Unassigned Church' }}</span>
                </label>
              </div>
            </div>
            
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex items-center justify-between">
               <div>
                 <p class="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Total Delegates Selected</p>
                 <p class="text-2xl font-black text-indigo-600">{{ filteredExportDelegates.length }}</p>
               </div>
               <div class="text-right">
                 <p class="text-[10px] font-black text-indigo-800 uppercase tracking-widest">Estimated Time</p>
                 <p class="text-sm font-bold text-indigo-600">{{ exportEstimatedTimeText }}</p>
               </div>
            </div>

          </div>

          <!-- Progress Content -->
          <div v-else class="p-10 flex flex-col items-center justify-center bg-white space-y-6">
             <div class="relative w-24 h-24">
                <svg class="w-full h-full animate-spin text-gray-100" viewBox="0 0 100 100">
                   <circle cx="50" cy="50" r="45" fill="none" stroke-width="8"></circle>
                </svg>
                <svg class="w-full h-full absolute inset-0 text-indigo-600 transition-all duration-300" viewBox="0 0 100 100" style="transform: rotate(-90deg);">
                   <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="8" stroke-linecap="round" :stroke-dasharray="283" :stroke-dashoffset="283 - (283 * exportProgressPercent / 100)"></circle>
                </svg>
                <div class="absolute inset-0 flex items-center justify-center">
                   <span class="text-xl font-black text-indigo-600">{{ exportProgressPercent }}%</span>
                </div>
             </div>
             
             <div class="text-center space-y-1">
                <h3 class="text-sm font-black text-gray-900 uppercase tracking-widest">Rendering Badges...</h3>
                <p class="text-xs font-bold text-gray-500">Please do not close this tab</p>
             </div>
             
             <div class="w-full max-w-sm bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-2 gap-4 divide-x divide-gray-200">
                <div class="text-center">
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Images Generated</p>
                   <p class="text-sm font-bold text-gray-800 mt-1">{{ exportProgress }} <span class="text-gray-400">/ {{ exportTotal }}</span></p>
                </div>
                <div class="text-center pl-4">
                   <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">Total Size</p>
                   <p class="text-sm font-bold text-gray-800 mt-1">{{ exportSizeMb.toFixed(2) }} <span class="text-gray-400">MB</span></p>
                </div>
             </div>
          </div>

          <!-- Footer -->
          <div v-if="!isExporting" class="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
            <button @click="isExportWizardOpen = false" class="px-5 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-widest">Cancel</button>
            <button @click="runExport" :disabled="filteredExportDelegates.length === 0" class="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-500/30 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"/></svg>
              START EXPORT
            </button>
          </div>

        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, onUnmounted, nextTick } from 'vue'
import QrcodeVue from 'qrcode.vue'
import { PastorService } from '../services/db/PastorService'
import { DiscipleService } from '../services/db/DiscipleService'
import Swal from 'sweetalert2'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import html2canvas from 'html2canvas'

const DEFAULT_CONFIG = {
  badge: { width: 1050, height: 750 },
  name: { x: 20, y: 350, fontSize: 55, fontWeight: 'bold', fontStyle: 'normal', color: '#111111', textAlign: 'left', maxWidth: 700, enabled: true },
  role: { x: 20, y: 410, fontSize: 80, fontWeight: 'bold', fontStyle: 'normal', color: '#111111', textAlign: 'left', maxWidth: 850, enabled: true },
  district: { x: 20, y: 500, fontSize: 34, fontWeight: 'bold', fontStyle: 'normal', color: '#333333', textAlign: 'left', maxWidth: 850, enabled: false },
  church: { x: 570, y: 655, fontSize: 52, fontWeight: 'bold', fontStyle: 'italic', color: '#ffffff', textAlign: 'left', maxWidth: 460, enabled: true },
  qr: { x: 735, y: 300, size: 293, enabled: true },
  profile: { x: 50, y: 50, size: 250, enabled: false },
  templates: { url: '' }
}

const delegates = ref([])
const search = ref('')
const searchFocused = ref(false)
const filterMenuOpen = ref(false)
const filterRole = ref('ALL')
const selectedDelegate = ref(null)
const activeField = ref('name')
const templateImg = ref(localStorage.getItem('vccc_badge_template') || '')

const mainContainer = ref(null)
const containerDims = ref({ w: 800, h: 400 })

const cfg = ref(JSON.parse(JSON.stringify(DEFAULT_CONFIG)))
const overrides = ref({ fullName: '', churchName: '' })

const printBadge = () => { window.print() }

const canvasContext = document.createElement('canvas').getContext('2d')

const getFieldStyle = (key, text) => {
  const f = cfg.value[key]
  let effectiveFontSize = f.fontSize
  if (text && key !== 'qr' && key !== 'profile') {
    canvasContext.font = `${f.fontStyle} normal ${f.fontWeight} ${effectiveFontSize}px Inter, sans-serif`
    while (canvasContext.measureText(text).width > f.maxWidth && effectiveFontSize > 8) {
      effectiveFontSize -= 1
      canvasContext.font = `${f.fontStyle} normal ${f.fontWeight} ${effectiveFontSize}px Inter, sans-serif`
    }
  }
  return {
    left: `${f.x}px`, top: `${f.y}px`, fontSize: `${effectiveFontSize}px`,
    fontWeight: f.fontWeight, fontStyle: f.fontStyle, color: f.color,
    textAlign: f.textAlign, width: `${f.maxWidth}px`,
    transform: f.textAlign === 'center' ? 'translateX(-50%)' : f.textAlign === 'right' ? 'translateX(-100%)' : 'none'
  }
}

const scalerStyle = computed(() => {
  if (!mainContainer.value) return { transform: `scale(1)`, transformOrigin: 'top left' }
  const availW = Math.max(100, containerDims.value.w)
  const factor = availW / cfg.value.badge.width
  return { transform: `scale(${factor})`, transformOrigin: 'top left' }
})

let resizeObserver = null
onMounted(() => {
  fetchData()
  if (mainContainer.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        containerDims.value = { w: entry.contentRect.width, h: entry.contentRect.height }
      }
    })
    resizeObserver.observe(mainContainer.value)
  }
})
onUnmounted(() => { if (resizeObserver) resizeObserver.disconnect() })

const handleSearchBlur = () => {
   setTimeout(() => { searchFocused.value = false; filterMenuOpen.value = false }, 200)
}

const handleTemplateUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (event) => {
    templateImg.value = event.target.result
    localStorage.setItem('vccc_badge_template', templateImg.value)
  }
  reader.readAsDataURL(file)
}

const fetchData = async () => {
  try {
    const [pRes, dRes] = await Promise.all([PastorService.getAll(), DiscipleService.getAll()])
    const all = []

    if (pRes) {
      pRes.forEach(p => {
        const churchData = p.church || {}
        const districtData = churchData.district || {}
        const payload = {
          id: p.id, fullName: p.full_name, role: 'PASTOR',
          churchName: churchData.church_name || p.church_name || '',
          districtName: districtData.district_name || p.district_name || '',
          imageUrl: p.pastor_image_url, uniqueId: `PASTOR-${p.id}`
        }
        all.push(payload)
        if (p.wife_name) all.push({ ...payload, fullName: p.wife_name, role: 'WIFE', imageUrl: p.wife_image_url, uniqueId: `WIFE-${p.id}` })
      })
    }

    if (dRes) {
      dRes.forEach(d => {
        const churchData = d.church || {}
        const districtData = churchData.district || {}
        all.push({
          id: d.id, fullName: d.full_name, role: 'DISCIPLE',
          churchName: churchData.church_name || d.church_name || '',
          districtName: districtData.district_name || d.district_name || '',
          imageUrl: d.disciple_image_url, uniqueId: `DISCIPLE-${d.id}`
        })
      })
    }

    delegates.value = all
  } catch (err) {
    console.error('API Error in BadgesView:', err)
  }
}

const selectDelegate = (del) => { 
  selectedDelegate.value = del; 
  overrides.value.fullName = ''; 
  overrides.value.churchName = '';
  search.value = del.fullName;
  searchFocused.value = false;
  filterMenuOpen.value = false;
}

const resetConfig = () => { cfg.value = JSON.parse(JSON.stringify(DEFAULT_CONFIG)) }
const toggleBold = (key) => { cfg.value[key].fontWeight = cfg.value[key].fontWeight === 'bold' ? 'normal' : 'bold' }
const toggleItalic = (key) => { cfg.value[key].fontStyle = cfg.value[key].fontStyle === 'italic' ? 'normal' : 'italic' }

const filteredDelegates = computed(() => {
  let list = delegates.value
  if (filterRole.value !== 'ALL') {
    list = list.filter(d => d.role === filterRole.value)
  }
  if (!search.value) return list
  const q = search.value.toLowerCase()
  return list.filter(d => d.fullName.toLowerCase().includes(q) || (d.churchName && d.churchName.toLowerCase().includes(q)))
})

// === BATCH EXPORT LOGIC ===
const isExportWizardOpen = ref(false)
const isExporting = ref(false)
const exportDistricts = ref([])
const exportChurches = ref([])
const exportRoles = ref({ PASTOR: true, WIFE: false, DISCIPLE: false })
const exportProgress = ref(0)
const exportTotal = ref(0)
const exportSizeMb = ref(0)

const availableDistricts = computed(() => {
  const dists = new Set()
  delegates.value.forEach(d => { if (d.districtName) dists.add(d.districtName) })
  return Array.from(dists).sort()
})

const availableChurches = computed(() => {
  const churches = new Set()
  delegates.value.forEach(d => {
    if (exportDistricts.value.length === 0 || exportDistricts.value.includes(d.districtName)) {
      if (d.churchName) churches.add(d.churchName)
    }
  })
  return Array.from(churches).sort()
})

const filteredExportDelegates = computed(() => {
  return delegates.value.filter(d => {
    const roleMatch = exportRoles.value[d.role]
    const distMatch = exportDistricts.value.length === 0 || exportDistricts.value.includes(d.districtName)
    const churchMatch = exportChurches.value.length === 0 || exportChurches.value.includes(d.churchName)
    return roleMatch && distMatch && churchMatch
  })
})

const exportProgressPercent = computed(() => {
  if (exportTotal.value === 0) return 0
  return Math.round((exportProgress.value / exportTotal.value) * 100)
})

const exportEstimatedTimeText = computed(() => {
  const totalSeconds = Math.ceil(filteredExportDelegates.value.length * 0.35)
  if (totalSeconds === 0) return "0 sec"
  
  if (totalSeconds < 60) {
    return `~${totalSeconds} sec`
  }
  
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  
  if (secs === 0) {
    return `~${mins} min`
  }
  return `~${mins} min ${secs} sec`
})

const toggleSelectAllDistricts = () => {
  if (exportDistricts.value.length === availableDistricts.value.length) {
    exportDistricts.value = []
  } else {
    exportDistricts.value = [...availableDistricts.value]
  }
}

const toggleSelectAllChurches = () => {
  if (exportChurches.value.length === availableChurches.value.length) {
    exportChurches.value = []
  } else {
    exportChurches.value = [...availableChurches.value]
  }
}

const openExportWizard = () => {
  exportDistricts.value = []
  exportChurches.value = []
  exportRoles.value = { PASTOR: true, WIFE: false, DISCIPLE: false }
  isExportWizardOpen.value = true
}

const runExport = async () => {
  const list = filteredExportDelegates.value
  if (list.length === 0) return

  isExporting.value = true
  exportProgress.value = 0
  exportTotal.value = list.length
  exportSizeMb.value = 0
  
  const zip = new JSZip()
  const badgeTarget = document.getElementById('badge-target')
  
  // Save current selection to restore later
  const originalDelegate = selectedDelegate.value
  
  for (let i = 0; i < list.length; i++) {
    const delegate = list[i]
    selectedDelegate.value = delegate
    
    // Give DOM time to update text and image src, then a slight delay to render
    await nextTick()
    await new Promise(r => setTimeout(r, 200)) // 200ms delay for image loading
    
    try {
      const canvas = await html2canvas(badgeTarget, {
        scale: 2, // 2x resolution for printing
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false
      })
      
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
      
      const distFolder = delegate.districtName || 'Unassigned District'
      const churchFolder = delegate.churchName || 'Unassigned Church'
      const fileName = `${delegate.role} - ${delegate.fullName}.jpg`
      
      zip.folder(distFolder).folder(churchFolder).file(fileName, blob)
      
      exportSizeMb.value += blob.size / (1024 * 1024)
      exportProgress.value = i + 1
    } catch (e) {
      console.error('Failed to render badge for', delegate.fullName, e)
    }
  }
  
  // Render ZIP
  exportProgress.value = exportTotal.value // Ensure 100%
  const content = await zip.generateAsync({ type: 'blob' })
  saveAs(content, 'VCCC_ID_Badges.zip')
  
  // Restore
  selectedDelegate.value = originalDelegate
  isExporting.value = false
  isExportWizardOpen.value = false
  
  Swal.fire({
    title: 'Export Complete!',
    text: `Successfully exported ${exportTotal.value} ID badges.`,
    icon: 'success',
    confirmButtonColor: '#111827',
  })
}

const downloadCurrentBadge = async () => {
  if (!selectedDelegate.value) return
  
  const badgeTarget = document.getElementById('badge-target')
  try {
    const canvas = await html2canvas(badgeTarget, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })
    
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9))
    const fileName = `${selectedDelegate.value.role} - ${overrides.value.fullName || selectedDelegate.value.fullName}.jpg`
    saveAs(blob, fileName)
  } catch (e) {
    console.error('Failed to download badge', e)
    Swal.fire('Error', 'Failed to generate image.', 'error')
  }
}

const qrValue = computed(() => selectedDelegate.value ? JSON.stringify({ t: selectedDelegate.value.role, id: selectedDelegate.value.id }) : '')
const getBadgeStyle = () => ({ width: `${cfg.value.badge.width}px`, height: `${cfg.value.badge.height}px` })
const getQRStyle = () => ({ left: `${cfg.value.qr.x}px`, top: `${cfg.value.qr.y}px`, width: `${cfg.value.qr.size}px`, height: `${cfg.value.qr.size}px` })
const getProfileStyle = () => ({ left: `${cfg.value.profile.x}px`, top: `${cfg.value.profile.y}px`, width: `${cfg.value.profile.size}px`, height: `${cfg.value.profile.size}px`, borderRadius: '10%' })
const pxToCm = (px) => (Number(px) * (2.54 / 300)).toFixed(2)
const roleClass = (role) => role === 'PASTOR' ? 'bg-indigo-100 text-indigo-700' : role === 'WIFE' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
</script>

<style scoped>
.font-ui { font-family: 'Inter', system-ui, sans-serif; }
.id-card-landscape { flex-shrink: 0; }
.badge-scaler-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { scrollbar-width: none; }

/* Hide number input arrows */
input[type="number"]::-webkit-inner-spin-button,
input[type="number"]::-webkit-outer-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
input[type="number"] {
  -moz-appearance: textfield;
}

@media print {
  @page { size: landscape; margin: 0; }
  body * { visibility: hidden; }
  .badge-scaler-wrap { display: block !important; transform: none !important; margin: 0 !important; width: 100% !important; height: auto !important; }
  .id-card-landscape { position: absolute !important; left: 0 !important; top: 0 !important; width: 3.5in !important; height: 2.5in !important; visibility: visible !important; border: none !important; box-shadow: none !important; }
  .id-card-landscape * { visibility: visible !important; }
}
</style>
