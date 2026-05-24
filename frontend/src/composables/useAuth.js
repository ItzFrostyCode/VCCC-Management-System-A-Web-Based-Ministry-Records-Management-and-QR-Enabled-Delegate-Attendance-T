import { ref, computed } from 'vue'
import { supabase } from '../services/supabase'
import { useRouter } from 'vue-router'

const user = ref(null)
const profile = ref(null)
const loading = ref(true)

export function useAuth() {
  const router = useRouter()

  const loadSession = async () => {
    loading.value = true
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      user.value = session.user
      await fetchProfile(session.user.id)
    } else {
      user.value = null
      profile.value = null
    }
    loading.value = false
  }

  const fetchProfile = async (userId) => {
    // Fetch profile from supabase directly since we need it instantly for UI
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
      
    if (!error && data) {
      profile.value = data
    }
  }

  const login = async (username, password) => {
    // Convert username to email format if it's not an email
    const email = username.includes('@') ? username : `${username}@vccc.local`
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) throw error
    
    user.value = data.user
    
    await fetchProfile(data.user.id)
    
    if (profile.value && !profile.value.is_active) {
       await logout()
       throw new Error("Your account has been deactivated. Please contact the administrator.")
    }

    return data
  }

  const logout = async () => {
    await supabase.auth.signOut()
    user.value = null
    profile.value = null
    router.push({ name: 'login' })
  }

  return {
    user,
    profile,
    loading,
    isAuthenticated: computed(() => !!user.value),
    userRole: computed(() => profile.value?.role || ''),
    loadSession,
    login,
    logout
  }
}
