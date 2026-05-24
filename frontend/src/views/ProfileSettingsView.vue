<template>
  <div class="h-full flex flex-col bg-gray-50/50">
    <div class="flex-1 overflow-auto">
      <div class="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <!-- Header Section -->
        <div>
          <h1 class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600 shadow-sm border border-violet-100">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            My Profile
          </h1>
          <p class="mt-1.5 text-sm text-gray-500 font-medium">Manage your account settings and update your password.</p>
        </div>

        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div class="p-6 sm:p-8">
            <form @submit.prevent="updateProfile" class="space-y-6">
              
              <div v-if="successMsg" class="p-4 bg-emerald-50 text-emerald-700 text-sm rounded-xl border border-emerald-100 font-medium">
                {{ successMsg }}
              </div>
              <div v-if="errorMsg" class="p-4 bg-rose-50 text-rose-700 text-sm rounded-xl border border-rose-100 font-medium">
                {{ errorMsg }}
              </div>

              <!-- Profile Info -->
              <div>
                <h3 class="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Personal Information</h3>
                <div class="space-y-5">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Full Name</label>
                    <input v-model="form.full_name" type="text" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Username (Read Only)</label>
                    <input :value="profile?.username?.split('@')[0] || ''" type="text" disabled class="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Role</label>
                    <input :value="profile?.role || ''" type="text" disabled class="w-full px-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 font-bold uppercase tracking-wider text-sm cursor-not-allowed">
                  </div>
                </div>
              </div>

              <!-- Security -->
              <div class="pt-4">
                <h3 class="text-lg font-bold text-gray-900 mb-4 border-b pb-2">Security</h3>
                <div class="space-y-5">
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">New Password</label>
                    <input v-model="form.password" type="password" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" placeholder="Leave blank to keep current password">
                  </div>
                  <div>
                    <label class="block text-sm font-semibold text-gray-700 mb-1.5">Confirm New Password</label>
                    <input v-model="form.confirm_password" type="password" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-colors" placeholder="Confirm new password">
                  </div>
                </div>
              </div>

              <!-- Submit -->
              <div class="pt-6">
                <button type="submit" :disabled="saving" class="w-full sm:w-auto px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  <svg v-if="saving" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ saving ? 'Saving Changes...' : 'Save Changes' }}
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { supabase } from '../services/supabase'
import api from '../services/api'
import Swal from 'sweetalert2'

const { user, profile } = useAuth()

const form = ref({
  full_name: '',
  password: '',
  confirm_password: ''
})

const saving = ref(false)
const successMsg = ref('')
const errorMsg = ref('')

// Initialize form from profile
watch(profile, (newProfile) => {
  if (newProfile) {
    form.value.full_name = newProfile.full_name || ''
  }
}, { immediate: true })

const updateProfile = async () => {
  errorMsg.value = ''
  successMsg.value = ''
  
  if (form.value.password && form.value.password !== form.value.confirm_password) {
    errorMsg.value = 'Passwords do not match.'
    return
  }

  saving.value = true
  
  try {
    // 1. Update Profile DB
    if (form.value.full_name !== profile.value.full_name) {
       const { error: dbError } = await supabase
        .from('profiles')
        .update({ full_name: form.value.full_name })
        .eq('id', user.value.id)
       
       if (dbError) throw dbError
       
       // Update local profile copy manually for immediate UI update
       profile.value.full_name = form.value.full_name
    }

    // 2. Update Auth Password using backend if password provided
    if (form.value.password) {
       await api.put(`/users/${profile.value.id}`, { password: form.value.password })
       // Note: we're using the admin API to update password for simplicity
    }
    
    successMsg.value = 'Profile updated successfully.'
    form.value.password = ''
    form.value.confirm_password = ''
    
    Swal.fire({
      icon: 'success',
      title: 'Success!',
      text: 'Profile settings have been saved.',
      timer: 2000,
      showConfirmButton: false
    })

  } catch (err) {
    errorMsg.value = err.message || err.response?.data?.message || 'Failed to update profile.'
  } finally {
    saving.value = false
  }
}
</script>
