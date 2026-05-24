<template>
  <div class="h-screen flex flex-col bg-slate-50 overflow-hidden" style="min-width:0">

    <!-- ══ DESKTOP: Sidebar + Main ══ -->
    <div class="flex flex-1 overflow-hidden min-h-0">

      <!-- ══ DESKTOP SIDEBAR ══ -->
      <aside :class="[
          'hidden md:flex flex-col shrink-0 z-20 sidebar-root transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[88px] rounded-3xl m-4 mr-0 items-center' : 'w-64 lg:w-72 rounded-3xl m-4 mr-0'
        ]">

        <!-- ── Logo / Brand ── -->
        <div class="flex items-center gap-3 px-6 py-5 shrink-0 relative w-full h-[88px]" :class="isCollapsed ? 'justify-center px-0' : ''">
          <div class="w-10 h-10 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 p-1.5 shadow-inner shrink-0 transition-all duration-300">
            <img src="../assets/logo.png" alt="VCCC" class="w-full h-full object-contain" />
          </div>
          <div class="min-w-0 transition-opacity duration-300" :class="isCollapsed ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'">
            <div class="font-extrabold text-white text-base leading-tight tracking-tight truncate">VCCC System</div>
            <div class="text-[10px] text-indigo-200/70 font-semibold uppercase tracking-widest">Management Portal</div>
          </div>
          <!-- Collapse Toggle Button -->
          <button @click="isCollapsed = !isCollapsed" 
            class="absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-white border border-gray-200 rounded-full flex items-center justify-center text-indigo-600 shadow-md hover:scale-110 transition-transform z-30"
            title="Toggle Sidebar">
            <svg class="w-4 h-4 transition-transform duration-300" :class="isCollapsed ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
        </div>

        <!-- ── Divider ── -->
        <div class="mx-5 h-px bg-white/10 shrink-0 transition-all duration-300" :class="isCollapsed ? 'mx-2' : ''"></div>

        <!-- ── Navigation ── -->
        <nav class="flex-1 overflow-y-auto px-4 py-4 space-y-1 scrollbar-none w-full" :class="isCollapsed ? 'px-2' : ''">

          <!-- Section: Ministry -->
          <div class="px-2 pb-2 pt-1 transition-all duration-300" :class="isCollapsed ? 'text-center' : ''">
            <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50" :title="'Ministry'">
              {{ isCollapsed ? 'MIN' : 'Ministry' }}
            </span>
          </div>

          <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to"
            class="nav-link group flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
            :class="isCollapsed ? 'justify-center px-0' : 'px-3'"
            active-class="nav-link-active" :title="item.label">
            <!-- Active glow pill -->
            <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
            <span class="nav-icon-wrap w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
            </span>
            <span class="truncate transition-opacity duration-300" :class="isCollapsed ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'">{{ item.label }}</span>
          </router-link>

          <!-- Section: Events & QR -->
          <div class="px-2 pb-2 pt-5 transition-all duration-300" :class="isCollapsed ? 'text-center' : ''">
            <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50" :title="'Events & QR'">
              {{ isCollapsed ? 'EVT' : 'Events & QR' }}
            </span>
          </div>

          <router-link v-for="item in qrNavItems" :key="item.to" :to="item.to"
            class="nav-link group flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
            :class="isCollapsed ? 'justify-center px-0' : 'px-3'"
            active-class="nav-link-active" :title="item.label">
            <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
            <span class="nav-icon-wrap w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
            </span>
            <span class="truncate transition-opacity duration-300" :class="isCollapsed ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'">{{ item.label }}</span>
          </router-link>

          <!-- Section: Admin (Conditional) -->
          <template v-if="adminNavItems.length > 0">
            <div class="px-2 pb-2 pt-5 transition-all duration-300" :class="isCollapsed ? 'text-center' : ''">
              <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50" :title="'Admin'">
                {{ isCollapsed ? 'ADM' : 'Admin' }}
              </span>
            </div>

            <router-link v-for="item in adminNavItems" :key="item.to" :to="item.to"
              class="nav-link group flex items-center gap-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
              :class="isCollapsed ? 'justify-center px-0' : 'px-3'"
              active-class="nav-link-active" :title="item.label">
              <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
              <span class="nav-icon-wrap w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 shrink-0">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
              </span>
              <span class="truncate transition-opacity duration-300" :class="isCollapsed ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'">{{ item.label }}</span>
            </router-link>
          </template>
        </nav>

        <!-- ── Divider ── -->
        <div class="mx-5 h-px bg-white/10 shrink-0 transition-all duration-300" :class="isCollapsed ? 'mx-2' : ''"></div>

        <!-- ── User Profile + Logout ── -->
        <div class="py-4 shrink-0 w-full" :class="isCollapsed ? 'px-2' : 'px-4'">
          <div class="flex items-center p-2 rounded-xl bg-white/8 border border-white/10 hover:bg-white/12 transition-all cursor-default" :class="isCollapsed ? 'justify-center gap-0' : 'gap-3'">
            <router-link to="/profile" class="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 cursor-pointer hover:scale-105 transition-transform" title="Profile Settings">
              {{ profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U' }}
            </router-link>
            <div class="flex-1 min-w-0 transition-opacity duration-300" :class="isCollapsed ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'">
              <router-link to="/profile" class="text-white text-sm font-semibold truncate hover:text-indigo-200 transition-colors block">{{ profile?.full_name || 'User' }}</router-link>
              <div class="text-indigo-200/60 text-[10px] truncate">{{ profile?.role || 'Staff' }} • {{ profile?.username || '' }}</div>
            </div>
            <!-- If collapsed, clicking avatar logs out. If expanded, we show the logout button -->
            <button v-if="!isCollapsed" @click="handleLogout" title="Sign out"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-200/50 hover:text-red-300 hover:bg-red-500/15 transition-all duration-200 shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
          <!-- Logout Button when collapsed -->
          <button v-if="isCollapsed" @click="handleLogout" title="Sign out"
            class="mt-2 w-full h-10 flex items-center justify-center rounded-xl text-indigo-200/50 hover:text-red-300 hover:bg-red-500/15 transition-all duration-200 shrink-0">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </aside>

      <!-- ══ MAIN CONTENT ══ -->
      <div class="flex-1 flex flex-col min-w-0 overflow-hidden">

        <!-- Top Header -->
        <header v-if="$route.path !== '/scanner'"
          class="h-14 md:h-16 bg-transparent flex items-center justify-between shrink-0 z-10 px-3 md:px-6 lg:px-8 mt-2 md:mt-4"
          style="padding-top: env(safe-area-inset-top);">

          <div class="flex items-center gap-2.5 min-w-0">
            <!-- Hamburger (mobile) -->
            <button @click="drawerOpen = true"
              class="md:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-500 shrink-0">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>

            <!-- Logo mark (mobile) -->
            <div class="md:hidden w-7 h-7 rounded-md bg-white flex items-center justify-center shadow-sm border border-gray-100 p-0.5 shrink-0">
              <img src="../assets/logo.png" alt="" class="w-full h-full object-contain" />
            </div>

            <!-- Page title with breadcrumb feel -->
            <div class="min-w-0">
              <h2 class="text-base md:text-lg font-bold text-gray-800 tracking-tight truncate leading-tight">
                {{ currentPageTitle }}
              </h2>
              <p class="hidden md:block text-[11px] text-gray-400 font-medium leading-none mt-0.5">VCCC Management System</p>
            </div>
          </div>

          <!-- Right: Action area (currently empty without avatar) -->
          <div class="flex items-center gap-2 shrink-0">
          </div>
        </header>

        <!-- Page content -->
        <main
          :class="[
            'flex-1 overflow-auto relative min-w-0',
            $route.path === '/scanner' ? 'p-0' : 'p-3 md:p-6 lg:p-8'
          ]"
          :style="$route.path !== '/scanner' ? 'padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px) + 64px)' : ''"
          class="md:!pb-6">
          <router-view v-slot="{ Component, route }">
            <keep-alive include="PastorsView,ChurchesView,DistrictsView,DisciplesView,ConferencesView,UsersView">
              <component :is="Component" :key="route.path" />
            </keep-alive>
          </router-view>
        </main>
      </div>
    </div>

    <!-- ══ MOBILE: Bottom Tab Bar ══ -->
    <nav v-if="$route.path !== '/scanner'"
      class="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xl border-t border-gray-200/80 flex items-stretch"
      style="padding-bottom: env(safe-area-inset-bottom, 0px); height: calc(60px + env(safe-area-inset-bottom, 0px));">

      <template v-for="item in mobileTabItems" :key="item.to">
        <router-link :to="item.to"
          class="flex-1 flex flex-col items-center justify-center gap-1 text-gray-400 transition-colors min-w-0 relative"
          active-class="!text-indigo-600"
          @click="drawerOpen = false">
          <span class="tab-icon-wrap w-8 h-7 flex items-center justify-center rounded-lg transition-all duration-200">
            <svg class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
          </span>
          <span class="text-[9px] font-semibold leading-none truncate w-full text-center px-1">{{ item.label }}</span>
        </router-link>
      </template>

      <!-- More tab -->
      <button @click="drawerOpen = !drawerOpen"
        class="flex-1 flex flex-col items-center justify-center gap-1 min-w-0 transition-colors relative"
        :class="drawerOpen ? 'text-indigo-600' : 'text-gray-400'">
        <span class="w-8 h-7 flex items-center justify-center rounded-lg">
          <svg class="w-[18px] h-[18px] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8M4 18h16"/>
          </svg>
        </span>
        <span class="text-[9px] font-semibold leading-none">More</span>
      </button>
    </nav>

    <!-- ══ MOBILE: Drawer Backdrop ══ -->
    <Transition name="fade">
      <div v-if="drawerOpen"
        class="md:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        @click="drawerOpen = false" />
    </Transition>

    <!-- ══ MOBILE: Drawer Panel ══ -->
    <Transition name="slide-left">
      <aside v-if="drawerOpen"
        class="md:hidden fixed inset-y-0 left-0 z-50 flex flex-col shadow-2xl drawer-root"
        style="width: min(280px, 85vw);">

        <!-- Drawer Header -->
        <div class="flex items-center justify-between px-5 py-4 shrink-0">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center border border-white/20 p-1.5 shrink-0">
              <img src="../assets/logo.png" alt="VCCC" class="w-full h-full object-contain" />
            </div>
            <div class="min-w-0">
              <div class="font-extrabold text-white text-sm truncate">VCCC System</div>
              <div class="text-[9px] text-indigo-200/60 font-semibold uppercase tracking-widest">Management Portal</div>
            </div>
          </div>
          <button @click="drawerOpen = false"
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div class="mx-4 h-px bg-white/10 shrink-0"></div>

        <!-- Drawer Nav -->
        <nav class="flex-1 overflow-y-auto px-3 py-3 space-y-0.5 scrollbar-none">
          <div class="px-2 pb-2 pt-1">
            <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50">Ministry</span>
          </div>
          <router-link v-for="item in mainNavItems" :key="item.to" :to="item.to"
            class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
            active-class="nav-link-active"
            @click="drawerOpen = false">
            <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
            <span class="nav-icon-wrap w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0">
              <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
            </span>
            <span class="truncate">{{ item.label }}</span>
          </router-link>

          <div class="px-2 pb-2 pt-4">
            <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50">Events &amp; QR</span>
          </div>
          <router-link v-for="item in qrNavItems" :key="item.to" :to="item.to"
            class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
            active-class="nav-link-active"
            @click="drawerOpen = false">
            <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
            <span class="nav-icon-wrap w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0">
              <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
            </span>
            <span class="truncate">{{ item.label }}</span>
          </router-link>

          <template v-if="adminNavItems.length > 0">
            <div class="px-2 pb-2 pt-4">
              <span class="text-[9px] font-black uppercase tracking-[0.18em] text-indigo-200/50">Admin</span>
            </div>
            <router-link v-for="item in adminNavItems" :key="item.to" :to="item.to"
              class="nav-link flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 text-indigo-100/70 hover:text-white hover:bg-white/10 relative"
              active-class="nav-link-active"
              @click="drawerOpen = false">
              <span class="nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-white opacity-0 transition-opacity duration-200"></span>
              <span class="nav-icon-wrap w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-200 shrink-0">
                <svg class="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8" v-html="item.icon" />
              </span>
              <span class="truncate">{{ item.label }}</span>
            </router-link>
          </template>
        </nav>

        <div class="mx-4 h-px bg-white/10 shrink-0"></div>

        <!-- Drawer User -->
        <div class="px-3 py-3 shrink-0" style="padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0px));">
          <div class="flex items-center gap-3 p-3 rounded-xl bg-white/8 border border-white/10">
            <router-link to="/profile" @click="drawerOpen = false" class="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-md shrink-0 cursor-pointer">
              {{ profile?.full_name ? profile.full_name.charAt(0).toUpperCase() : 'U' }}
            </router-link>
            <div class="flex-1 min-w-0">
              <router-link to="/profile" @click="drawerOpen = false" class="text-white text-sm font-semibold truncate block">{{ profile?.full_name || 'User' }}</router-link>
              <div class="text-indigo-200/60 text-[10px] truncate">{{ profile?.role || 'Staff' }} • {{ profile?.username || '' }}</div>
            </div>
            <button @click="handleLogout"
              class="w-8 h-8 flex items-center justify-center rounded-lg text-indigo-200/50 hover:bg-red-500/15 hover:text-red-300 transition-colors shrink-0">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
              </svg>
            </button>
          </div>
        </div>
      </aside>
    </Transition>

  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useAuth } from '../composables/useAuth'

const router = useRouter()
const route  = useRoute()
const drawerOpen = ref(false)

const { user, profile, userRole, logout } = useAuth()

// Read collapse state from localStorage or default to false
const isCollapsed = ref(false)
onMounted(() => {
  const savedState = localStorage.getItem('vccc_sidebar_collapsed')
  if (savedState !== null) {
    isCollapsed.value = savedState === 'true'
  }
})
watch(isCollapsed, (newVal) => {
  localStorage.setItem('vccc_sidebar_collapsed', newVal.toString())
})

const ICONS = {
  pastors:     `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>`,
  churches:    `<path stroke-linecap="round" stroke-linejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>`,
  districts:   `<path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>`,
  disciples:   `<path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>`,
  conferences: `<path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>`,
  badges:      `<path stroke-linecap="round" stroke-linejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"/>`,
  scanner:     `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"/>`,
  users:       `<path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />`, // users icon (same as pastors for now)
}

const mainNavItems = [
  { to: '/pastors',   label: 'Pastors',   icon: ICONS.pastors   },
  { to: '/churches',  label: 'Churches',  icon: ICONS.churches  },
  { to: '/districts', label: 'Districts', icon: ICONS.districts  },
  { to: '/disciples', label: 'Disciples', icon: ICONS.disciples  },
]

const qrNavItems = [
  { to: '/conferences', label: 'Conferences', icon: ICONS.conferences },
  { to: '/badges',      label: 'Badges',      icon: ICONS.badges      },
  { to: '/scanner',     label: 'Scanner',     icon: ICONS.scanner     },
]

// Computed to dynamically show Users tab only to Admins
const adminNavItems = computed(() => {
  if (userRole.value === 'Admin') {
    return [
      { to: '/users', label: 'User Mgt.', icon: ICONS.users },
    ]
  }
  return []
})

const mobileTabItems = computed(() => {
  const items = [
    { to: '/pastors',     label: 'Pastors',   icon: ICONS.pastors      },
    { to: '/churches',    label: 'Churches',  icon: ICONS.churches     },
    { to: '/districts',   label: 'Districts', icon: ICONS.districts    },
    { to: '/conferences', label: 'Events',    icon: ICONS.conferences  },
    { to: '/scanner',     label: 'Scanner',   icon: ICONS.scanner      },
  ]
  if (userRole.value === 'Admin') {
    items.push({ to: '/users', label: 'Users', icon: ICONS.users })
  }
  return items
})

const PAGE_TITLES = {
  '/pastors':    'Pastors',
  '/churches':   'Churches',
  '/districts':  'Districts',
  '/disciples':  'Disciples',
  '/conferences':'Conferences',
  '/badges':     'Badges',
  '/scanner':    'QR Scanner',
  '/users':      'User Management',
  '/profile':    'My Profile',
}
const currentPageTitle = computed(() => {
  const match = Object.keys(PAGE_TITLES).find(k => route.path === k || route.path.startsWith(k + '/'))
  return match ? PAGE_TITLES[match] : 'Dashboard'
})

const handleLogout = async () => {
  drawerOpen.value = false
  await logout()
}
</script>

<style scoped>
/* ══ SIDEBAR GRADIENT BACKGROUND ══ */
.sidebar-root {
  background: linear-gradient(165deg, #1e1b4b 0%, #312e81 35%, #1e40af 70%, #1d4ed8 100%);
  box-shadow: 4px 0 24px rgba(30, 27, 75, 0.25);
}

/* ══ DRAWER same gradient ══ */
.drawer-root {
  background: linear-gradient(165deg, #1e1b4b 0%, #312e81 35%, #1e40af 70%, #1d4ed8 100%);
}

/* ══ NAV LINK ACTIVE STATE ══ */
.nav-link-active {
  background: rgba(255, 255, 255, 0.15) !important;
  color: white !important;
  backdrop-filter: blur(8px);
  box-shadow: 0 2px 12px rgba(99, 102, 241, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
}

.nav-link-active .nav-indicator {
  opacity: 1 !important;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.6);
}

.nav-link-active .nav-icon-wrap {
  background: rgba(255, 255, 255, 0.2) !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

/* ══ NAV LINK HOVER ICON ══ */
.nav-link:not(.nav-link-active):hover .nav-icon-wrap {
  background: rgba(255, 255, 255, 0.1);
}

/* ══ SCROLLBAR HIDE ══ */
.scrollbar-none { scrollbar-width: none; }
.scrollbar-none::-webkit-scrollbar { display: none; }

/* ══ MOBILE ACTIVE TAB PILL ══ */
.router-link-active .tab-icon-wrap {
  background: #eef2ff;
}

/* ══ DRAWER SLIDE ══ */
.slide-left-enter-active,
.slide-left-leave-active { transition: transform 0.28s cubic-bezier(0.4,0,0.2,1); }
.slide-left-enter-from,
.slide-left-leave-to     { transform: translateX(-100%); }

/* ══ BACKDROP FADE ══ */
.fade-enter-active,
.fade-leave-active { transition: opacity 0.25s ease; }
.fade-enter-from,
.fade-leave-to     { opacity: 0; }

/* ══ PREVENT BLEED ══ */
* { box-sizing: border-box; }
</style>
