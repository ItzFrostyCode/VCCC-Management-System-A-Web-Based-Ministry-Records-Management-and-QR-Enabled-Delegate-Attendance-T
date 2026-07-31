import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import AppLayout from '../layouts/AppLayout.vue'
import PastorsView from '../views/PastorsView.vue'
import DistrictsView from '../views/DistrictsView.vue'
import DistrictProfileView from '../views/DistrictProfileView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/',
      redirect: '/pastors',
      component: AppLayout,
      children: [
        {
           path: '/pastors',
           name: 'pastors',
           component: PastorsView
        },
        {
           path: '/pastors/:id',
           name: 'pastor-profile',
           component: () => import('../views/PastorProfileView.vue')
        },
        {
           path: '/churches',
           name: 'churches',
           component: () => import('../views/ChurchesView.vue')
        },
        {
           path: '/churches/:id',
           name: 'church-profile',
           component: () => import('../views/ChurchProfileView.vue')
        },
        {
           path: '/districts',
           name: 'districts',
           component: DistrictsView
        },
        {
           path: '/districts/:id',
           name: 'district-profile',
           component: DistrictProfileView
        },
        {
           path: '/disciples',
           name: 'disciples',
           component: () => import('../views/DisciplesView.vue')
        },
        {
           path: '/conferences',
           name: 'conferences',
           component: () => import('../views/ConferencesView.vue')
        },
        {
           path: '/badges',
           name: 'badges',
           component: () => import('../views/BadgesView.vue')
        },
        {
           path: '/scanner',
           name: 'scanner',
           component: () => import('../views/ScannerView.vue')
        },
        {
           path: '/reports',
           name: 'reports',
           component: () => import('../views/ReportsView.vue')
        },
        {
           path: '/users',
           name: 'users',
           component: () => import('../views/UsersView.vue'),
           meta: { requiresAdmin: true }
        },
        {
           path: '/profile',
           name: 'profile',
           component: () => import('../views/ProfileSettingsView.vue')
        }
      ]
    }
  ]
})

import { useAuth } from '../composables/useAuth'
import { supabase } from '../services/supabase'

router.beforeEach(async (to, from, next) => {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.warn('Supabase auth session error:', error)
    }
    const session = data?.session || null
    const isAuthenticated = !!session

    if (to.name !== 'login' && !isAuthenticated) {
      return next({ name: 'login' })
    } else if (to.name === 'login' && isAuthenticated) {
      return next({ name: 'pastors' })
    } else if (to.meta.requiresAdmin && session?.user) {
      // Check if user is Admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (profile?.role === 'Admin') {
        return next()
      } else {
        return next({ name: 'pastors' })
      }
    } else {
      return next()
    }
  } catch (err) {
    console.error('Error in router navigation guard:', err)
    if (to.name !== 'login') {
      return next({ name: 'login' })
    }
    return next()
  }
})

export default router
