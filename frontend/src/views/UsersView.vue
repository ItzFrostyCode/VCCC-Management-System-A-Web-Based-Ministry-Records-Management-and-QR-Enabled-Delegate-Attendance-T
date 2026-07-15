<template>
  <div class="h-full flex flex-col bg-gray-50/50">
    <div class="flex-1 overflow-auto">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        
        <!-- Header Section -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              User Management
            </h1>
            <p class="mt-1.5 text-sm text-gray-500 font-medium">Manage system access, roles, and accounts.</p>
          </div>
          
          <button @click="openCreateModal" class="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-800 shadow-sm transition-all active:scale-95">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Add New User
          </button>
        </div>

        <!-- Search and Filter Bar -->
        <div class="relative z-40 w-full">
          <div class="flex items-center w-full bg-white/80 backdrop-blur-xl border border-gray-200/60 rounded-2xl shadow-sm transition-all focus-within:bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10">
            <div class="pl-4 flex items-center pointer-events-none shrink-0">
              <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            </div>
            <input v-model="searchQuery" type="text" placeholder="Search users..." class="flex-1 w-full pl-3 pr-2 py-3.5 bg-transparent text-sm font-semibold text-gray-900 outline-none placeholder-gray-400">

            <div class="flex items-center pr-2 shrink-0 relative">
              <div class="w-[1.5px] h-6 bg-gray-200 mx-1.5 rounded-full hidden sm:block"></div>

              <!-- Mobile Filter Icon -->
              <div class="sm:hidden p-2 text-gray-400 relative">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
                <div v-if="statusFilter" class="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full"></div>
              </div>

              <!-- Select (Hidden text on mobile, fully visible on desktop) -->
              <select v-model="statusFilter" class="absolute inset-0 opacity-0 sm:relative sm:opacity-100 bg-transparent border-0 text-[10px] font-black uppercase tracking-widest text-gray-600 py-2 sm:pl-3 sm:pr-8 hover:bg-gray-50 focus:ring-0 cursor-pointer outline-none rounded-lg w-full sm:w-auto z-10">
                <option value="">ALL STATUS</option>
                <option value="active">ACTIVE</option>
                <option value="deactivated">DEACTIVATED</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Table Section (Desktop) -->
        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hidden md:block">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse">
              <thead>
                <tr class="bg-gray-50/50 border-b border-gray-100">
                  <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">User</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Username</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100/80">
                <template v-if="loading">
                  <tr v-for="i in 5" :key="i">
                    <td class="px-6 py-4"><div class="h-10 bg-gray-100 rounded-lg animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-4 bg-gray-100 rounded animate-pulse w-24"></div></td>
                    <td class="px-6 py-4"><div class="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div></td>
                    <td class="px-6 py-4"><div class="h-8 w-8 bg-gray-100 rounded-lg animate-pulse ml-auto"></div></td>
                  </tr>
                </template>
                <template v-else-if="filteredUsers.length === 0">
                  <tr class="bg-white">
                    <td colspan="5" class="py-20 text-center">
                      <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                         <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
                      </div>
                      <p class="text-sm font-semibold text-gray-500">No users found matching your criteria.</p>
                    </td>
                  </tr>
                </template>
                <template v-else>
                  <tr v-for="u in filteredUsers" :key="u.id" class="hover:bg-blue-50/30 transition-colors group">
                    <td class="px-6 py-4">
                      <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {{ u.full_name.charAt(0).toUpperCase() }}
                        </div>
                        <div>
                          <div class="font-semibold text-gray-900">{{ u.full_name }}</div>
                          <div class="text-xs text-gray-400">Added: {{ formatDate(u.created_at) }}</div>
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4">
                      <span class="text-sm text-gray-600 font-medium">{{ u.username.split('@')[0] }}</span>
                    </td>
                    <td class="px-6 py-4">
                      <span :class="roleClass(u.role)" class="px-2.5 py-1 text-[11px] uppercase tracking-wider font-bold rounded-full">
                        {{ u.role }}
                      </span>
                    </td>
                    <td class="px-6 py-4">
                      <span :class="u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-2.5 py-1 text-xs font-semibold rounded-md border flex items-center gap-1.5 w-fit">
                        <span class="w-1.5 h-1.5 rounded-full" :class="u.is_active ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                        {{ u.is_active ? 'Active' : 'Deactivated' }}
                      </span>
                    </td>
                    <td class="px-6 py-4 text-right flex items-center justify-end gap-2">
                      <button @click="openEditModal(u)" class="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all" title="Edit User">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button @click="deleteUser(u)" class="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Delete User">
                        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Cards Section (Mobile) -->
        <div class="md:hidden space-y-4">
          <template v-if="loading">
            <div v-for="i in 5" :key="i" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gray-100 rounded-full animate-pulse shrink-0"></div>
                <div class="flex-1 space-y-2">
                  <div class="h-4 bg-gray-100 rounded animate-pulse w-3/4"></div>
                  <div class="h-3 bg-gray-100 rounded animate-pulse w-1/2"></div>
                </div>
              </div>
              <div class="flex justify-between items-center mt-2">
                <div class="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
                <div class="h-6 w-16 bg-gray-100 rounded-full animate-pulse"></div>
              </div>
            </div>
          </template>
          <template v-else-if="filteredUsers.length === 0">
            <div class="bg-white p-8 text-center rounded-2xl shadow-sm border border-gray-100">
              <div class="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                 <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4v16m8-8H4"/></svg>
              </div>
              <p class="text-sm font-semibold text-gray-500">No users found matching your criteria.</p>
            </div>
          </template>
          <template v-else>
            <div v-for="u in filteredUsers" :key="'mob-'+u.id" class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-3">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                    {{ u.full_name.charAt(0).toUpperCase() }}
                  </div>
                  <div>
                    <div class="font-bold text-gray-900 text-sm">{{ u.full_name }}</div>
                    <div class="text-xs text-gray-500 font-medium">@{{ u.username.split('@')[0] }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-1">
                  <button @click="openEditModal(u)" class="p-2 text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-xl transition-all" title="Edit User">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                  </button>
                  <button @click="deleteUser(u)" class="p-2 text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-xl transition-all" title="Delete User">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
              </div>
              
              <div class="flex items-center justify-between mt-1 pt-3 border-t border-gray-50">
                <span :class="roleClass(u.role)" class="px-2.5 py-1 text-[10px] uppercase tracking-wider font-bold rounded-full">
                  {{ u.role }}
                </span>
                <span :class="u.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'" class="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full" :class="u.is_active ? 'bg-emerald-500' : 'bg-rose-500'"></span>
                  {{ u.is_active ? 'Active' : 'Deactivated' }}
                </span>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Modal Form (Create/Edit) -->
    <Transition name="modal">
      <Teleport to="body">
        <div v-if="showModal" class="fixed inset-0 z-[9999] flex flex-col items-center justify-center py-20 px-4 md:px-10 bg-gray-900/80 backdrop-blur-sm">
          <div class="absolute inset-0" @click="closeModal"></div>
          
          <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-full">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
            <h3 class="text-lg font-bold text-gray-900">{{ isEditing ? 'Edit User Account' : 'Create New User' }}</h3>
            <button @click="closeModal" class="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto">
            <form @submit.prevent="saveUser" class="space-y-5">
              
              <div v-if="modalError" class="p-3 bg-red-50 text-red-700 text-sm rounded-xl border border-red-100">
                {{ modalError }}
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Full Name <span class="text-red-500">*</span></label>
                <input v-model="form.full_name" type="text" required class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="e.g. John Doe">
              </div>
              
              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Username <span class="text-red-500">*</span></label>
                <input v-model="form.username" type="text" required :disabled="isEditing" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors disabled:opacity-50" placeholder="e.g. johndoe">
                <p v-if="!isEditing" class="text-xs text-gray-500 mt-1">This will be used to log in.</p>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Password {{ isEditing ? '(Leave blank to keep current)' : '*' }}</label>
                <input v-model="form.password" type="text" :required="!isEditing" class="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors" placeholder="••••••••">
                <p v-if="!isEditing" class="text-xs text-gray-500 mt-1">Default password is '123456' if left blank.</p>
              </div>

              <div>
                <label class="block text-sm font-semibold text-gray-700 mb-1.5">Role <span class="text-red-500">*</span></label>
                <SearchableSelect
                  v-model="form.role"
                  :options="[{value: 'Admin', label: 'Admin'}, {value: 'Owner', label: 'Owner'}, {value: 'Staff', label: 'Staff'}, {value: 'Scanner', label: 'Scanner'}]"
                  label-key="label"
                  value-key="value"
                  placeholder="Select Role"
                  clear-placeholder="None"
                />
              </div>

              <div v-if="isEditing" class="flex items-center gap-3 pt-2">
                <label class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" v-model="form.is_active" class="sr-only peer">
                  <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span class="ml-3 text-sm font-semibold text-gray-700">Account Active</span>
                </label>
              </div>

              <div class="pt-4 flex gap-3">
                <button type="button" @click="closeModal" class="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all">Cancel</button>
                <button type="submit" :disabled="saving" class="flex-1 px-4 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                  <svg v-if="saving" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  {{ saving ? 'Saving...' : 'Save User' }}
                </button>
              </div>
            </form>
          </div>
        </div>
        </div>
      </Teleport>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { supabase } from '../services/supabase'
import SearchableSelect from '../components/SearchableSelect.vue'
import Swal from 'sweetalert2'

const users = ref([])
const loading = ref(true)
const searchQuery = ref('')
const statusFilter = ref('')

const showModal = ref(false)
const isEditing = ref(false)
const saving = ref(false)
const modalError = ref('')

const form = ref({
  id: null,
  full_name: '',
  username: '',
  password: '',
  role: 'Staff',
  is_active: true
})

const fetchUsers = async (silent = false) => {
  if (!silent) loading.value = true
  try {
    const { data, error } = await supabase.from('profiles').select('*')
    if (error) throw error
    users.value = data
  } catch (error) {
    console.error('Error fetching users:', error)
    if (!silent) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Failed to load users.'
      })
    }
  } finally {
    if (!silent) loading.value = false
  }
}

onMounted(() => fetchUsers())
onActivated(() => fetchUsers(true))

const filteredUsers = computed(() => {
  let result = users.value
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(u => 
      u.full_name.toLowerCase().includes(q) || 
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  }
  if (statusFilter.value) {
    result = result.filter(u => (statusFilter.value === 'active' ? u.is_active : !u.is_active))
  }
  return result
})

const openCreateModal = () => {
  isEditing.value = false
  form.value = {
    id: null,
    full_name: '',
    username: '',
    password: '',
    role: 'Staff',
    is_active: true
  }
  modalError.value = ''
  showModal.value = true
}

const openEditModal = (user) => {
  isEditing.value = true
  form.value = {
    id: user.id,
    full_name: user.full_name,
    username: user.username.split('@')[0], // Extract username part
    password: '',
    role: user.role,
    is_active: user.is_active
  }
  modalError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
}

const deleteUser = async (user) => {
  const result = await Swal.fire({
    title: 'Are you sure?',
    text: `Do you really want to permanently delete the account for ${user.username}? This cannot be undone.`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#ef4444',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Yes, delete it!'
  })

  if (result.isConfirmed) {
    loading.value = true
    try {
      const { error } = await supabase.rpc('delete_user_account', { target_user_id: user.id })
      if (error) throw error
      
      Swal.fire({ icon: 'success', title: 'Deleted!', text: 'User account has been permanently deleted.', timer: 1500, showConfirmButton: false })
      await fetchUsers()
    } catch (err) {
      console.error(err)
      Swal.fire({ icon: 'error', title: 'Deletion Failed', text: err.message || 'An error occurred while deleting the user.' })
    } finally {
      loading.value = false
    }
  }
}

const saveUser = async () => {
  saving.value = true
  modalError.value = ''
  
  try {
    const payload = { 
      full_name: form.value.full_name,
      username: form.value.username,
      role: form.value.role,
      is_active: form.value.is_active
    }

    if (isEditing.value) {
      const { error } = await supabase.from('profiles').update(payload).eq('id', form.value.id)
      if (error) throw error
      Swal.fire({ icon: 'success', title: 'User Updated', timer: 1500, showConfirmButton: false })
    } else {
      const email = form.value.username.includes('@') ? form.value.username : `${form.value.username}@vccc.local`
      const defaultPassword = form.value.password || '123456'

      const { data: userId, error } = await supabase.rpc('create_user_account', {
        new_email: email,
        new_password: defaultPassword,
        new_username: form.value.username,
        new_full_name: payload.full_name,
        new_role: payload.role,
        new_is_active: payload.is_active
      })

      if (error) {
        throw new Error(error.message || 'Failed to create user via database function.')
      }

      Swal.fire({ icon: 'success', title: 'User Created', text: 'User account has been securely created, bypassing all rate limits!', timer: 3000 })
    }
    
    closeModal()
    fetchUsers()
  } catch (err) {
    modalError.value = err.message || 'Failed to save user.'
  } finally {
    saving.value = false
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

const roleClass = (role) => {
  const map = {
    'Admin': 'bg-purple-100 text-purple-700 border border-purple-200',
    'Owner': 'bg-amber-100 text-amber-700 border border-amber-200',
    'Staff': 'bg-blue-100 text-blue-700 border border-blue-200',
    'Scanner': 'bg-gray-100 text-gray-700 border border-gray-200'
  }
  return map[role] || map['Staff']
}


</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.3s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
.modal-enter-active .bg-white { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.modal-leave-active .bg-white { transition: all 0.2s ease-in; }
.modal-enter-from .bg-white { opacity: 0; transform: scale(0.95) translateY(10px); }
.modal-leave-to .bg-white { opacity: 0; transform: scale(0.95) translateY(10px); }
</style>
