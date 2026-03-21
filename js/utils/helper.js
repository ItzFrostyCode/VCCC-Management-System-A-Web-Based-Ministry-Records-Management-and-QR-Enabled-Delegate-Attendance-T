// ── Formatters ────────────────────────────────────────────
function formatPartOfDay(part) {
  return { morning: 'Morning', afternoon: 'Afternoon', evening: 'Evening' }[part] || part
}

function formatMealLabel(dayNumber, partOfDay) {
  return `Day ${dayNumber} · ${formatPartOfDay(partOfDay)}`
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

function formatDateTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}

// ── QR Payload ────────────────────────────────────────────
// Format: {"t":"PASTOR","id":"uuid"}
// t = delegate type, id = uuid (for WIFE, id = pastor's uuid)

function encodeQR(delegateType, delegateId) {
  return JSON.stringify({ t: delegateType, id: delegateId })
}

function decodeQR(raw) {
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
function arrayToCSV(rows) {
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

function downloadCSV(filename, rows) {
  const csv  = arrayToCSV(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Searchable Select ─────────────────────────────────────
// Usage:
//   const sel = createSearchSelect(container, options, placeholder, onChange)
//   sel.setValue(id)     — set selected value programmatically
//   sel.getValue()       — get current selected value
//   sel.setOptions(opts) — replace option list
//   sel.reset()          — clear selection

function createSearchSelect(container, options = [], placeholder = 'Select...', onChange = null) {
  let selectedValue = null
  let selectedLabel = null
  let currentOptions = [...options]
  let isOpen = false

  container.innerHTML = `
    <div class="ss-wrap">
      <div class="ss-trigger" tabindex="0">
        <span class="ss-display placeholder">${placeholder}</span>
        <svg class="ss-arrow" viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
      </div>
      <div class="ss-dropdown hidden">
        <div class="ss-search-wrap">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input class="ss-search" placeholder="Search..." autocomplete="off" />
        </div>
        <div class="ss-list"></div>
      </div>
    </div>
  `

  const trigger  = container.querySelector('.ss-trigger')
  const dropdown = container.querySelector('.ss-dropdown')
  const display  = container.querySelector('.ss-display')
  const search   = container.querySelector('.ss-search')
  const list     = container.querySelector('.ss-list')

  function renderList(opts) {
    if (!opts.length) {
      list.innerHTML = `<div class="ss-empty">No results</div>`
      return
    }
    list.innerHTML = opts.map(o => `
      <div class="ss-option ${o.value === selectedValue ? 'active' : ''}" data-value="${o.value}">
        ${highlight(o.label, search.value)}
        ${o.value === selectedValue ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
      </div>
    `).join('')

    list.querySelectorAll('.ss-option').forEach(el => {
      el.addEventListener('mousedown', e => {
        e.preventDefault()
        selectOption(el.dataset.value, currentOptions.find(o => o.value === el.dataset.value)?.label)
      })
    })
  }

  function highlight(label, q) {
    if (!q) return label
    const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
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
  }

  function open() {
    isOpen = true
    dropdown.classList.remove('hidden')
    trigger.classList.add('open')
    search.value = ''
    renderList(currentOptions)
    search.focus()
  }

  function close() {
    isOpen = false
    dropdown.classList.add('hidden')
    trigger.classList.remove('open')
  }

  trigger.addEventListener('click', () => isOpen ? close() : open())
  trigger.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? close() : open() } })

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
    if (!container.contains(e.target)) close()
  })

  // Public API
  return {
    getValue: ()     => selectedValue,
    setValue: (val)  => {
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
      // If current selection no longer valid, reset
      if (selectedValue && !currentOptions.find(o => o.value === selectedValue)) {
        selectedValue = null
        selectedLabel = null
        display.textContent = placeholder
        display.classList.add('placeholder')
        trigger.classList.remove('filled')
      }
    },
    disable: () => { trigger.style.opacity = '.5'; trigger.style.pointerEvents = 'none' },
    enable:  () => { trigger.style.opacity = '';   trigger.style.pointerEvents = '' }
  }
}