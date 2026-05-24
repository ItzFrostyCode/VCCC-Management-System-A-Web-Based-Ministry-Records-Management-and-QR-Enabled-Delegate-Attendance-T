import { ref } from 'vue'

const isExporting = ref(false)
const exportMessage = ref('')

export function useExportProgress() {
  const showExportProgress = (message) => {
    exportMessage.value = message
    isExporting.value = true
  }

  const hideExportProgress = (delay = 3000) => {
    setTimeout(() => {
      isExporting.value = false
    }, delay)
  }

  return {
    isExporting,
    exportMessage,
    showExportProgress,
    hideExportProgress
  }
}
