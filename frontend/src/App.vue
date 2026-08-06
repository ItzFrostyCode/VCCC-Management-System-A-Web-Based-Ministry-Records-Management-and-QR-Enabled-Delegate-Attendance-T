<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuth } from './composables/useAuth'
import { Analytics } from '@vercel/analytics/vue'

const { loadSession } = useAuth()

onMounted(async () => {
  await loadSession()
})
</script>

<template>
  <RouterView />
  <Analytics />
</template>

<style>
/* Base overrides injected automatically via style.css/tailwind */
</style>
