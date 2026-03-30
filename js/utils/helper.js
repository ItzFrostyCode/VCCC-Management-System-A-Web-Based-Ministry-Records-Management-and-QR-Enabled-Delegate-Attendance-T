// ── Formatters ──────────────────────────────────────────── 
export function esc(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatPartOfDay(part) {
  return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }[part] || part
}

export function formatMealLabel(dayNumber, partOfDay) {
  return `Day ${dayNumber} · ${formatPartOfDay(partOfDay)}`
}

export function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

export function calculateAge(birthdate) {
  if (!birthdate) return 0
  const birthDate = new Date(birthdate)
  if (isNaN(birthDate.getTime())) return 0
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const m = today.getMonth() - birthDate.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// ── QR Payload ────────────────────────────────────────────
// Format: {"t":"PASTOR","id":"uuid"}
// t = delegate type, id = uuid (for WIFE, id = pastor's uuid)

export function encodeQR(delegateType, delegateId) {
  return JSON.stringify({ t: delegateType, id: delegateId })
}

export function decodeQR(raw) {
  try {
    const obj = JSON.parse(raw)
    if (!obj || !obj.t || !obj.id) return null
    if (!['PASTOR', 'WIFE', 'DISCIPLE'].includes(obj.t)) return null
    return { type: obj.t, id: obj.id }
  } catch {
    return null
  }
}

// ── CSV Export ────────────────────────────────────────────
export function arrayToCSV(rows) {
  if (!rows.length) return ''
  const headers = Object.keys(rows[0])
  const escape  = v => {
    const s = String(v ?? '')
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => escape(r[h])).join(','))
  ].join('\n')
}

export function downloadCSV(filename, rows) {
  const csv  = arrayToCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Searchable Select (Portal Pattern) ───────────────────
// The dropdown is mounted on document.body with position:fixed.
// It is positioned via getBoundingClientRect() so it ALWAYS
// renders outside any overflow:hidden/auto ancestor (modals, cards, etc.)
//
// Usage:
//   const sel = createSearchSelect(container, options, placeholder, onChange)
//   sel.setValue(id)      — set selected value programmatically
//   sel.getValue()        — get current selected value
//   sel.setOptions(opts)  — replace option list
//   sel.reset()           — clear selection
//   sel.destroy()         — remove portal & listeners

export function createSearchSelect(container, options = [], placeholder = 'Select...', onChange = null) {
  let selectedValue = null
  let selectedLabel = null
  let currentOptions = [...options]
  let isOpen = false

  // Trigger stays inside the container as normal
  container.innerHTML = `
    <div class="ss-wrap">
      <div class="ss-trigger" tabindex="0">
        <span class="ss-display placeholder">${placeholder}</span>
        <svg class="ss-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
    </div>
  `

  // ── Build dropdown portal — mounted on document.body ─────
  const dropdown = document.createElement('div')
  dropdown.className = 'ss-dropdown hidden ss-portal'
  dropdown.innerHTML = `
    <div class="ss-search-wrap">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      <input class="ss-search" placeholder="Search..." autocomplete="off" />
    </div>
    <div class="ss-list"></div>
  `
  document.body.appendChild(dropdown)

  const trigger = container.querySelector('.ss-trigger')
  const display = container.querySelector('.ss-display')
  const search  = dropdown.querySelector('.ss-search')
  const list    = dropdown.querySelector('.ss-list')

  // ── Compute fixed position from trigger's screen rect ────
  function positionDropdown() {
    const rect       = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const maxH       = Math.min(280, window.innerHeight * 0.45)

    dropdown.style.position = 'fixed'
    dropdown.style.left     = rect.left + 'px'
    dropdown.style.width    = rect.width + 'px'
    dropdown.style.zIndex   = '99999'
    dropdown.style.border   = '1px solid var(--red)'

    if (spaceBelow >= 220 || spaceBelow >= spaceAbove) {
      // Drop downward
      dropdown.style.top          = (rect.bottom + 2) + 'px'
      dropdown.style.bottom       = ''
      dropdown.style.maxHeight    = Math.min(maxH, spaceBelow - 8) + 'px'
      dropdown.style.borderRadius = '0 0 10px 10px'
      dropdown.style.borderTop    = 'none'
      dropdown.style.borderBottom = '1px solid var(--red)'
    } else {
      // Flip upward
      dropdown.style.top          = ''
      dropdown.style.bottom       = (window.innerHeight - rect.top + 2) + 'px'
      dropdown.style.maxHeight    = Math.min(maxH, spaceAbove - 8) + 'px'
      dropdown.style.borderRadius = '10px 10px 0 0'
      dropdown.style.borderTop    = '1px solid var(--red)'
      dropdown.style.borderBottom = 'none'
    }
  }

  function renderList(opts) {
    if (!opts.length) {
      list.innerHTML = '<div class="ss-empty">No results</div>'
      return
    }
    list.innerHTML = opts.map(o => {
      const isActive = o.value === selectedValue
      return `<div class="ss-option ${isActive ? 'active' : ''}" data-value="${o.value}">
        ${highlight(o.label, search.value)}
        ${isActive ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>`
    }).join('')

    list.querySelectorAll('.ss-option').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault()
        selectOption(el.dataset.value, currentOptions.find(o => o.value === el.dataset.value)?.label)
      })
    })
  }

  function highlight(label, q) {
    if (!q) return label
    const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi')
    return label.replace(re, '<mark>$1</mark>')
  }

  function selectOption(value, label) {
    selectedValue = value
    selectedLabel = label
    display.textContent = label
    display.classList.remove('placeholder')
    trigger.classList.add('filled')
    close()
    if (onChange) onChange(value, label)
    if (api.onChange) api.onChange(value, label)
  }

  function open() {
    isOpen = true
    dropdown.classList.remove('hidden')
    trigger.classList.add('open')
    positionDropdown()
    search.value = ''
    renderList(currentOptions)
    search.focus()
  }

  function close() {
    isOpen = false
    dropdown.classList.add('hidden')
    trigger.classList.remove('open')
  }

  // Track trigger position live so dropdown follows on scroll/resize
  const reposition = () => { if (isOpen) positionDropdown() }
  window.addEventListener('scroll', reposition, true)
  window.addEventListener('resize', reposition)

  trigger.addEventListener('click', () => isOpen ? close() : open())
  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() }
  })

  search.addEventListener('input', () => {
    const q = search.value.toLowerCase()
    renderList(currentOptions.filter(o => o.label.toLowerCase().includes(q)))
  })

  search.addEventListener('keydown', e => {
    if (e.key === 'Escape') close()
    if (e.key === 'Enter') {
      const first = list.querySelector('.ss-option')
      if (first) first.dispatchEvent(new MouseEvent('mousedown'))
    }
  })

  document.addEventListener('click', e => {
    if (!container.contains(e.target) && !dropdown.contains(e.target)) close()
  })

  // Public API
  const api = {
    onChange: null,
    getValue: ()    => selectedValue,
    setValue: (val) => {
      const opt = currentOptions.find(o => o.value === val)
      if (opt) selectOption(opt.value, opt.label)
    },
    reset: () => {
      selectedValue = null
      selectedLabel = null
      display.textContent = placeholder
      display.classList.add('placeholder')
      trigger.classList.remove('filled')
      search.value = ''
    },
    setOptions: (opts) => {
      currentOptions = [...opts]
      if (isOpen) renderList(currentOptions)
      if (selectedValue && !currentOptions.find(o => o.value === selectedValue)) {
        selectedValue = null
        selectedLabel = null
        display.textContent = placeholder
        display.classList.add('placeholder')
        trigger.classList.remove('filled')
      }
    },
    disable: () => { trigger.style.opacity = '.5'; trigger.style.pointerEvents = 'none' },
    enable:  () => { trigger.style.opacity = '';   trigger.style.pointerEvents = '' },
    destroy: () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
      if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown)
    }
  }
  return api
}