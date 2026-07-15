<template>
  <div class="relative w-full" ref="containerRef">
    <div
      class="flex items-center w-full transition-all cursor-text"
      :class="flat ? 'px-3 py-2 bg-white border border-gray-300 text-xs font-bold' : 'focus-within:ring-4 focus-within:ring-indigo-500/10 focus-within:border-indigo-500 ' + (iconOnlyOnMobile ? 'p-2 sm:px-4 sm:py-3 sm:bg-white sm:border sm:border-gray-200/60 sm:rounded-xl text-sm font-semibold' : 'px-4 py-3 bg-white border border-gray-200/60 rounded-xl text-sm font-semibold')"
      @click="openDropdown"
    >
      <!-- Filter Icon on Mobile -->
      <svg v-if="iconOnlyOnMobile" class="w-5 h-5 text-gray-400 sm:hidden shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
         <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/>
      </svg>
      <div v-if="iconOnlyOnMobile && modelValue" class="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full sm:hidden"></div>

      <input
        ref="inputRef"
        v-model="searchQuery"
        type="text"
        :placeholder="selectedLabel || placeholder"
        class="w-full bg-transparent outline-none placeholder-gray-400"
        :class="[iconOnlyOnMobile ? 'hidden sm:block' : '', flat ? 'text-black' : 'text-gray-900']"
        @focus="openDropdown"
        @input="onInput"
        :required="required && !modelValue"
      />
      <!-- chevron icon -->
      <svg class="w-4 h-4 text-gray-400 shrink-0 ml-2 cursor-pointer" :class="iconOnlyOnMobile ? 'hidden sm:block' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </div>

    <!-- Dropdown -->
    <div
      v-if="isOpen"
      class="absolute z-50 mt-2 bg-white border border-gray-100 rounded-xl shadow-2xl max-h-64 overflow-y-auto w-[250px] sm:w-full right-0 sm:right-auto"
    >
      <div v-if="filteredOptions.length === 0" class="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">
        No results found.
      </div>
      <ul v-else class="py-1.5">
        <li
          v-if="showClearOption"
          @click="selectItem(null)"
          class="px-4 py-3 text-xs font-bold text-gray-400 hover:bg-gray-50 hover:text-gray-600 cursor-pointer transition-colors uppercase tracking-widest border-b border-gray-50"
        >
          {{ clearPlaceholder || '-- Select --' }}
        </li>
        <li
          v-for="item in filteredOptions"
          :key="item[valueKey]"
          @click="selectItem(item)"
          class="px-4 py-3 text-sm font-bold text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-colors truncate flex items-center justify-between"
          :class="{ 'bg-indigo-50 text-indigo-700': item[valueKey] === modelValue }"
        >
          <span>{{ item[labelKey] }}</span>
          <svg v-if="item[valueKey] === modelValue" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" />
          </svg>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number, null],
    default: null
  },
  options: {
    type: Array,
    default: () => []
  },
  labelKey: {
    type: String,
    default: 'name'
  },
  valueKey: {
    type: String,
    default: 'id'
  },
  placeholder: {
    type: String,
    default: 'Select an option'
  },
  iconOnlyOnMobile: {
    type: Boolean,
    default: false
  },
  clearPlaceholder: {
    type: String,
    default: '-- Clear Selection --'
  },
  showClearOption: {
    type: Boolean,
    default: true
  },
  required: {
    type: Boolean,
    default: false
  },
  flat: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(false)
const searchQuery = ref('')
const containerRef = ref(null)
const inputRef = ref(null)

const selectedLabel = computed(() => {
  if (props.modelValue === null || props.modelValue === '') return ''
  const item = props.options.find(opt => opt[props.valueKey] === props.modelValue)
  return item ? item[props.labelKey] : ''
})

watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    searchQuery.value = selectedLabel.value
  } else {
    searchQuery.value = ''
  }
}, { immediate: true })

const filteredOptions = computed(() => {
  if (!searchQuery.value || searchQuery.value === selectedLabel.value) {
    return props.options
  }
  const q = searchQuery.value.toLowerCase()
  return props.options.filter(opt => 
    String(opt[props.labelKey]).toLowerCase().includes(q)
  )
})

const openDropdown = () => {
  isOpen.value = true
  // If clicking when an item is selected, clear text to show all options
  if (searchQuery.value === selectedLabel.value) {
    searchQuery.value = ''
  }
}

const onInput = () => {
  isOpen.value = true
}

const selectItem = (item) => {
  if (item === null) {
    emit('update:modelValue', '')
    searchQuery.value = ''
  } else {
    emit('update:modelValue', item[props.valueKey])
    searchQuery.value = item[props.labelKey]
  }
  isOpen.value = false
}

const handleClickOutside = (e) => {
  if (containerRef.value && !containerRef.value.contains(e.target)) {
    isOpen.value = false
    // Restore text to selected item if clicked outside
    if (props.modelValue) {
      searchQuery.value = selectedLabel.value
    } else {
      searchQuery.value = ''
    }
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
  document.addEventListener('touchstart', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
  document.removeEventListener('touchstart', handleClickOutside)
})
</script>
