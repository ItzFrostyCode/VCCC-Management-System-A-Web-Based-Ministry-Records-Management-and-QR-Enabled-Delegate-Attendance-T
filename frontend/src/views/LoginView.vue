<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50/50 relative overflow-hidden">
    <!-- Decorative subtle gradients -->
    <div class="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

    <div class="w-full max-w-md p-8 bg-white/80 backdrop-blur-xl border border-gray-100 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-10 transition-all duration-300 hover:shadow-[0_8px_40px_rgb(0,0,0,0.08)]">
      
      <!-- Header -->
      <div class="text-center mb-10">
        <div class="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
          <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">Welcome Back</h1>
        <p class="text-sm text-gray-500 font-medium">Log in to the VCCC Management System</p>
      </div>

      <!-- Error Alert -->
      <div v-if="errorMsg" class="mb-6 p-4 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 flex items-center gap-3">
        <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        <span>{{ errorMsg }}</span>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleLogin" class="space-y-6">
        <div class="space-y-1.5">
          <label class="text-sm font-semibold text-gray-700 block transition-colors focus-within:text-blue-600">Username</label>
          <div class="relative">
            <input 
              v-model="username"
              type="text" 
              required
              class="w-full pl-4 pr-10 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              placeholder="Enter your username"
            />
          </div>
        </div>

        <div class="space-y-1.5">
          <label class="text-sm font-semibold text-gray-700 block transition-colors focus-within:text-blue-600">Password</label>
          <div class="relative">
            <input 
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              class="w-full pl-4 pr-12 py-3 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none"
              placeholder="••••••••"
            />
            <button 
              type="button" 
              @click="showPassword = !showPassword"
              class="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg v-if="!showPassword" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              <svg v-else class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
            </button>
          </div>
        </div>

        <button 
          type="submit"
          :disabled="isLoading"
          class="w-full py-3.5 px-4 bg-gray-900 border border-transparent text-white rounded-xl font-semibold shadow-md active:scale-[0.98] hover:bg-gray-800 disabled:opacity-70 disabled:active:scale-100 transition-all flex items-center justify-center gap-2"
        >
          <svg v-if="isLoading" class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ isLoading ? 'Signing in...' : 'Sign in to dashboard' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = useRouter()
const { login } = useAuth()

const username = ref('')
const password = ref('')
const showPassword = ref(false)
const isLoading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  if (!username.value || !password.value) return
  
  isLoading.value = true
  errorMsg.value = ''
  
  try {
    await login(username.value, password.value)
    router.push({ name: 'pastors' })
  } catch (err) {
    if (err.message === 'Invalid login credentials') {
        errorMsg.value = 'Invalid username or password.'
    } else {
        errorMsg.value = err.message || 'An unexpected error occurred. Please try again.'
    }
  } finally {
    isLoading.value = false
  }
}
</script>
