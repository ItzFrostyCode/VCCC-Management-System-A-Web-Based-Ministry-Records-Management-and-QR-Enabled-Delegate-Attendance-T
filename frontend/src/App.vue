<script setup>
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useAuth } from './composables/useAuth'

const { loadSession } = useAuth()

onMounted(async () => {
  await loadSession()
})
</script>

<template>
  <RouterView />
</template>

<style>
/* Base overrides injected automatically via style.css/tailwind */
</style>
