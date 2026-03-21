// ── Badge config (saved to localStorage) ──────────────────
const CONFIG_KEY = 'momentum_badge_config_v1'
const DEFAULT_CONFIG = {
  canvasWidth:  1050,
  canvasHeight: 750,
  templateUrl:  '../assets/2026%20Conf%20ID%20front.png',
  name:     { x:80, y:460, fontSize:72, fontWeight:'bold',   fontStyle:'normal', color:'#111111' }, 
  role:     { x:80, y:600, fontSize:75, fontWeight:'bold',   fontStyle:'italic', color:'#111111', shadow: false }, 
  district: { x:80, y:515, fontSize:34, fontWeight:'bold',   fontStyle:'normal', color:'#111111' }, 
  church:   { x:80, y:716, fontSize:26, fontWeight:'bold',   fontStyle:'italic', color:'#ffffff' }, 
  qr:       { x:780, y:490, size:200 }
}
const DISTRICT_COLORS = {
  'District 1': '#6FA4A1',
  'District 2': '#8A72A4',
  'District 3': '#E3A3A2',
  'District 4': '#DC8D38',
  'District 5': '#C0C0C0',
  'District 6': '#CF4A49',
  'District 7': '#406845',
  'District 8': '#3D539C',
  'District 9': '#E5DE5F',
  'Palawan':    '#DCDCDC'
}

function getConfig() {
  try { 
    const storedJson = localStorage.getItem(CONFIG_KEY)
    if (!storedJson) return { ...DEFAULT_CONFIG }
    
    const stored = JSON.parse(storedJson)
    // Create a fresh config from defaults
    const merged = { ...DEFAULT_CONFIG }
    
    // Merge top-level values
    if (stored.canvasWidth)  merged.canvasWidth = stored.canvasWidth
    if (stored.canvasHeight) merged.canvasHeight = stored.canvasHeight
    if (stored.templateUrl && !stored.templateUrl.includes('badge-template.png')) {
      merged.templateUrl = stored.templateUrl
    }
    
    // Merge nested objects (name, role, etc)
    const keys = ['name','role','district','church','qr']
    keys.forEach(k => {
      if (stored[k]) {
        merged[k] = { ...DEFAULT_CONFIG[k], ...stored[k] }
      }
    })
    
    return merged
  }
  catch { return { ...DEFAULT_CONFIG } }
}
function saveConfig() {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg))
}
function resetConfig() {
  if (confirm('Reset all layout settings to defaults?')) {
    localStorage.removeItem(CONFIG_KEY)
    cfg = { ...DEFAULT_CONFIG }
    renderTools()
    renderBadge()
  }
}

let cfg = getConfig()

// ── State ──────────────────────────────────────────────────
let allDelegates     = []
let filteredDelegates = []
let selectedDelegate = null
let filterDistVal    = null
let filterChurchVal  = null
let activeRoles      = new Set(['PASTOR','WIFE','DISCIPLE'])
let activeEditorTab  = 'preview'

let selFilterDist, selFilterChurch

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  await requireAuth()

  try {
    const [districts, churches, pastors, disciples] = await Promise.all([
      districtService.fetchAll(),
      churchService.fetchAll(),
      pastorService.fetchAll(),
      discipleService.fetchAll()
    ])

    // Lookup maps for robust naming
    const distMap = {}
    districts.forEach(d => distMap[d.id] = d.name)
    const churchMap = {}
    churches.forEach(c => churchMap[c.id] = { name: c.name, distId: c.district_id })

    const pastorMap = {} 
    
    // Build flat delegate list
    allDelegates = []
    pastors.forEach(p => {
      const dn = distMap[p.district_id] || 'Unassigned'
      const cn = churchMap[p.church_id]?.name || 'No Church'
      pastorMap[p.id] = { districtId: p.district_id, districtName: dn, churchId: p.church_id, churchName: cn }
      allDelegates.push({ id:p.id, fullName:p.full_name, role:'PASTOR', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn })
      if (p.wife_name) {
        allDelegates.push({ id:p.id, fullName:p.wife_name, role:'WIFE', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn })
      }
    })
    
    disciples.forEach(d => {
      const parent = pastorMap[d.pastor_id] || {}
      const dn = parent.districtName || 'Unassigned'
      const cn = parent.churchName   || 'No Church'
      allDelegates.push({ id:d.id, fullName:d.full_name, role:'DISCIPLE', districtId:parent.districtId, districtName:dn, churchId:parent.churchId, churchName:cn })
    })

    // Filter dropdowns
    selFilterDist = createSearchSelect(
      document.getElementById('filter-district-badge'),
      [{ value:'', label:'All districts' }, ...districts.map(d => ({ value:d.id, label:d.name }))],
      'All districts',
      (val) => {
        filterDistVal   = val || null
        filterChurchVal = null
        const churchOpts = [{ value:'', label:'All churches' }, ...churches.filter(c => !filterDistVal || c.district_id === filterDistVal).map(c => ({ value:c.id, label:c.name }))]
        selFilterChurch.setOptions(churchOpts)
        selFilterChurch.reset()
        applyFilters()
      }
    )
    selFilterChurch = createSearchSelect(
      document.getElementById('filter-church-badge'),
      [{ value:'', label:'All churches' }, ...churches.map(c => ({ value:c.id, label:c.name }))],
      'All churches',
      (val) => { filterChurchVal = val || null; applyFilters() }
    )

    applyFilters()
    renderTools()
    
    const batchBtn = document.getElementById('btn-batch')
    if (batchBtn) {
      batchBtn.style.display = 'inline-flex'
      batchBtn.onclick = batchDownload
    }

    // Mobile/Tablet Default View
    if (window.innerWidth <= 1100) {
      switchMobileView('delegates')
    }
  } catch (err) {
    console.error('Initialization failed:', err)
    const body = document.getElementById('editor-fields-body')
    if (body) body.innerHTML = `<div style="padding:20px; color:var(--red); font-size:13px;">Error loading data: ${err.message}</div>`
  }
})

function switchMobileView(view) {
  document.querySelectorAll('.view-panel').forEach(p => p.classList.remove('active'))
  document.querySelectorAll('.switch-btn').forEach(b => b.classList.remove('active'))

  const targetPanel = document.getElementById(`view-${view}`)
  const activeBtn = document.querySelector(`.switch-btn[data-view="${view}"]`)

  if (targetPanel) targetPanel.classList.add('active')
  if (activeBtn) activeBtn.classList.add('active')
  
  // Re-render badge if switching to preview to ensure canvas sizes correctly
  if (view === 'preview') renderBadge()
}

function toggleRole(btn) {
  const role = btn.dataset.role
  if (activeRoles.has(role)) { activeRoles.delete(role); btn.classList.remove('on') }
  else { activeRoles.add(role); btn.classList.add('on') }
  applyFilters()
}

function applyFilters() {
  const qStr = document.getElementById('search-delegate')?.value.toLowerCase().trim() || ''
  const qTerms = qStr.split(/\s+/).filter(t => t.length > 0)

  filteredDelegates = allDelegates.filter(d => {
    // 1. Role Filter
    if (!activeRoles.has(d.role)) return false

    // 2. Dropdown Filters
    if (filterDistVal   && d.districtId !== filterDistVal)   return false
    if (filterChurchVal && d.churchId   !== filterChurchVal) return false

    // 3. Robust Search Filter (match all terms)
    if (qTerms.length > 0) {
      const full = d.fullName.toLowerCase()
      const matchAll = qTerms.every(term => full.includes(term))
      if (!matchAll) return false
    }

    return true
  })
  renderDelegateList()
}

function renderDelegateList() {
  const el = document.getElementById('delegate-list')
  if (!filteredDelegates.length) {
    el.innerHTML = `<div style="padding:20px 14px;font-size:12px;color:var(--text-3);text-align:center;opacity:0.6;">No delegates match your filters.</div>`
    return
  }

  // Grouping logic: District -> Church -> DelegateRole
  const groups = {}
  filteredDelegates.forEach(d => {
    const dn = d.districtName || 'Unassigned'
    const cn = d.churchName   || 'No Church'
    if (!groups[dn]) groups[dn] = {}
    if (!groups[dn][cn]) groups[dn][cn] = { pastors:[], wives:[], disciples:[], all:[] }
    
    groups[dn][cn].all.push(d)
    if (d.role === 'PASTOR')   groups[dn][cn].pastors.push(d)
    else if (d.role === 'WIFE') groups[dn][cn].wives.push(d)
    else groups[dn][cn].disciples.push(d)
  })

  let html = ''
  for (const [dist, churches] of Object.entries(groups)) {
    const distColor = getDistColor(dist)
    const distDelegates = Object.values(churches).flatMap(c => c.all)
    
    html += `
      <div class="dist-group" style="border-left-color:${distColor}">
        <div class="dist-head">
          <div class="dist-bar" style="background:${distColor}"></div>
          <span style="flex:1;">${dist}</span>
          <button class="head-btn" title="Download District Badges" data-type="district" data-key="${esc(dist)}" onclick="batchDownloadRef(event)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </button>
        </div>
        ${Object.entries(churches).map(([chName, data]) => {
          const familyRows = []
          const maxLoop = Math.max(data.pastors.length, data.wives.length)
          for (let i=0; i<maxLoop; i++) {
            familyRows.push({ p: data.pastors[i], w: data.wives[i] })
          }
          
          return `
            <div class="church-group">
              <div class="church-head">
                <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10"/></svg>
                <span style="flex:1;">${chName}</span>
                <button class="head-btn" title="Download Church Badges" data-type="church" data-key="${esc(chName)}" onclick="batchDownloadRef(event)">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </div>
              
              ${familyRows.map(f => `
                <div class="family-row">
                  ${f.p ? renderDelBtn(f.p, distColor) : '<div></div>'}
                  ${f.w ? renderDelBtn(f.w, distColor) : '<div></div>'}
                </div>
              `).join('')}
              
              ${data.disciples.length ? `
                <div class="disciple-grid">
                  ${data.disciples.map(ds => renderDelBtn(ds, distColor, true)).join('')}
                </div>
              ` : ''}
            </div>
          `
        }).join('')}
      </div>`
  }
  el.innerHTML = html
}

function getDistColor(name) {
  if (!name) return '#888'
  const norm = name.trim().toLowerCase()
  if (norm.includes('palawan')) return DISTRICT_COLORS['Palawan']
  
  // Try to find "District X" or "X"
  const match = norm.match(/(\d+)/)
  if (match) {
    const num = match[1]
    const key = `District ${num}`
    if (DISTRICT_COLORS[key]) return DISTRICT_COLORS[key]
  }
  
  // Fallback to direct key match
  return DISTRICT_COLORS[name] || '#888'
}

function renderDelBtn(d, color, isSmall = false) {
  const isSelected = selectedDelegate?.id === d.id && selectedDelegate?.role === d.role
  const initials = (d.fullName || '?').charAt(0).toUpperCase()
  const rgb = hexToRgb(color)
  const selBg = `rgba(${rgb}, 0.1)`
  
  const selStyle = isSelected ? `border-color:${color}; background:${selBg};` : ''
  return `
    <button class="del-btn ${isSmall ? 'disc-btn' : ''} ${isSelected ? 'sel' : ''}" 
      style="${selStyle}"
      data-id="${d.id}" data-role="${d.role}" data-color="${color}" data-selbg="${selBg}"
      onclick="selectDelegate('${d.id}','${d.role}')">
      <div class="av" style="background:${color}">${initials}</div>
      <div class="info">
        <div class="name">${esc(d.fullName)}</div>
        <div class="role-tag">${d.role}</div>
      </div>
    </button>`
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0,0,0';
}

function selectDelegate(id, role) {
  selectedDelegate = filteredDelegates.find(d => d.id === id && d.role === role)
  
  // Update selection visually without rebuilding the entire list
  document.querySelectorAll('.del-btn').forEach(btn => {
    if (btn.dataset.id === id && btn.dataset.role === role) {
      btn.classList.add('sel')
      btn.style.borderColor = btn.dataset.color || ''
      btn.style.background = btn.dataset.selbg || ''
    } else {
      btn.classList.remove('sel')
      btn.style.borderColor = ''
      btn.style.background = ''
    }
  })
  
  document.getElementById('btn-download').disabled = false
  document.getElementById('btn-print').disabled    = false
  renderBadge()
  
  // Instant preview mode switch for mobile/tablet users
  if (window.innerWidth <= 1100) {
    switchMobileView('preview')
  }
}

// ── Canvas render ──────────────────────────────────────────
let badgeCanvas = null

async function renderBadge() {
  if (!selectedDelegate) return
  const wrap = document.getElementById('badge-preview-wrap')
  wrap.innerHTML = '<div style="font-size:13px;color:var(--text-3);">Rendering...</div>'

  try {
    const canvas = document.createElement('canvas')
    canvas.id     = 'badge-canvas'
    canvas.width  = cfg.canvasWidth
    canvas.height = cfg.canvasHeight
    canvas.style.maxWidth  = '100%'
    canvas.style.maxHeight = window.innerWidth < 600 ? '500px' : '380px'
    canvas.style.height    = 'auto'
    canvas.style.display   = 'block'
    canvas.style.margin    = '0 auto'
    await drawBadge(canvas, selectedDelegate)
    wrap.innerHTML = ''
    wrap.appendChild(canvas)
    badgeCanvas = canvas
  } catch(e) {
    wrap.innerHTML = `<div style="color:#E24B4A;font-size:13px;">Render error: ${e.message}</div>`
  }
}

async function drawBadge(canvas, delegate) {
  const ctx = canvas.getContext('2d')

  // Always start with a solid white background (for JPEG compliance and "bondpaper" effect)
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // 1. Template background (if it has transparency, white will show behind it)
  try {
    const img = await loadImg(cfg.templateUrl)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  } catch (err) {
    console.error('Template image load failed, using plain white background', err)
  }

  // 2. Text fields
  drawText(ctx, delegate.fullName,    cfg.name,  800)
  drawText(ctx, delegate.role,        cfg.role,  null)
  drawText(ctx, delegate.districtName, cfg.district, 800)
  drawText(ctx, delegate.churchName,   cfg.church,   500)

  // 3. QR code
  const qrPayload = encodeQR(delegate.role, delegate.id)
  const qrCanvas  = document.createElement('canvas')
  const qrLib = window.QRCode || window.qrcode
  if (!qrLib) {
    console.error('QR library not found.')
    throw new Error('QRCode generator not loaded')
  }
  await qrLib.toCanvas(qrCanvas, qrPayload, { width: cfg.qr.size, margin:1, color:{ dark:'#000000', light:'#ffffff' } })
  
  ctx.drawImage(qrCanvas, cfg.qr.x, cfg.qr.y, cfg.qr.size, cfg.qr.size)
}

function drawText(ctx, text, field, maxWidth) {
  ctx.save()
  const weight = field.fontWeight === 'bold' ? '700' : '400'
  const style  = field.fontStyle  === 'italic' ? 'italic ' : ''
  const fontName = '"Public Sans", system-ui, Arial, sans-serif'
  
  let fontSize = field.fontSize
  ctx.font = `${style}${weight} ${fontSize}px ${fontName}`
  
  if (maxWidth) {
    while (ctx.measureText(text || '').width > maxWidth && fontSize > 14) {
      fontSize--
      ctx.font = `${style}${weight} ${fontSize}px ${fontName}`
    }
  }

  ctx.fillStyle = field.color
  if (field.shadow) {
    ctx.shadowColor = 'rgba(0,0,0,0.3)'; ctx.shadowBlur = 4; ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2
  }

  ctx.fillText(text || '', field.x, field.y)
  ctx.restore()
  return ctx.measureText(text || '').width
}

function loadImg(src) {
  return new Promise((res, rej) => {
    const img = new Image(); img.crossOrigin = 'anonymous'
    img.onload = () => res(img); img.onerror = rej; img.src = src
  })
}

async function downloadSingle() {
  if (!selectedDelegate || !badgeCanvas) return
  const name = (selectedDelegate.fullName || 'badge').replace(/\s+/g,'_')
  const a = document.createElement('a')
  a.href     = badgeCanvas.toDataURL('image/jpeg', 0.9)
  a.download = `${selectedDelegate.role}-${name}.jpg`
  a.click()
}

function printBadge() {
  if (!badgeCanvas) return
  const dataUrl = badgeCanvas.toDataURL('image/jpeg', 0.9)
  const win = window.open('','_blank')
  win.document.write(`<html><head><title>Print Badge</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;}img{width:8.89cm;height:6.35cm;}@media print{body{margin:0;}}</style></head><body><img src="${dataUrl}" onload="window.print();window.close();"/></body></html>`)
}

// ── Batch download ─────────────────────────────────────────
async function batchDownload() {
  await batchDownloadRef(null, 'all_filtered', 'all')
}

async function batchDownloadRef(event, forceKey, forceType) {
  if (event) event.stopPropagation()
  
  let key = forceKey
  let type = forceType

  // Resolve dataset attributes if triggered from button
  if (event && event.currentTarget && event.currentTarget.dataset) {
    if (event.currentTarget.dataset.key) key = event.currentTarget.dataset.key
    if (event.currentTarget.dataset.type) type = event.currentTarget.dataset.type
  }
  
  let targets = []
  let zipName = 'badges.zip'
  
  if (type === 'all') {
    targets = filteredDelegates
    zipName = 'all_badges.zip'
  } else if (type === 'district') {
    targets = filteredDelegates.filter(d => d.districtName === key)
    zipName = `district_${key.replace(/\s+/g,'_')}.zip`
  } else if (type === 'church') {
    targets = filteredDelegates.filter(d => d.churchName === key)
    zipName = `church_${key.replace(/\s+/g,'_')}.zip`
  } else if (type === 'church-disciples') {
    targets = filteredDelegates.filter(d => d.churchName === key && d.role === 'DISCIPLE')
    zipName = `church_${key.replace(/\s+/g,'_')}_disciples.zip`
  }
  
  if (!targets.length) { alert('No delegates to export.'); return }
  
  document.getElementById('batch-progress').style.display = 'block'
  const fill  = document.getElementById('batch-fill')
  const label = document.getElementById('batch-label')
  const zip   = new JSZip()
  const folder = zip.folder('badges')

  for (let i = 0; i < targets.length; i++) {
    const d = targets[i]
    const canvas = document.createElement('canvas')
    canvas.width  = cfg.canvasWidth
    canvas.height = cfg.canvasHeight
    await drawBadge(canvas, d)
    const b64  = canvas.toDataURL('image/jpeg', 0.9).split(',')[1]
    const name = `${d.role}-${(d.fullName||'badge').replace(/[^a-zA-Z0-9]/g,'_')}-${d.id.slice(0,8)}.jpg`
    folder.file(name, b64, { base64:true })
    fill.style.width  = Math.round((i+1)/targets.length*100) + '%'
    label.textContent = `Rendering ${i+1} / ${targets.length}...`
    if (i % 5 === 0) await new Promise(r => setTimeout(r, 0))
  }

  const blob = await zip.generateAsync({ type:'blob' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = zipName; a.click()
  URL.revokeObjectURL(url)
  document.getElementById('batch-progress').style.display = 'none'
  label.textContent = 'Rendering badges...'
  fill.style.width  = '0%'
}

function renderTools() {
  const body = document.getElementById('editor-fields-body')
  if (!body) return
  
  body.innerHTML = ''
  
  const groups = [
    { key: 'name',     label: 'Delegate Name', icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2C1 22.1 22.1 23 2 23h10c.9 0 1-.9 1-2zM12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z' },
    { key: 'role',     label: 'Role Label',   icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
    { key: 'district', label: 'District',     icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0zM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
    { key: 'church',   label: 'Church Name',  icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10' },
    { key: 'qr',       label: 'QR Code',     icon: 'M3 3h7v7H3zm11 0h7v7h-7zm0 11h7v7h-7zm-11 0h7v7H3z' }
  ]

  groups.forEach(g => {
    const div = document.createElement('div')
    div.className = 'tool-group'
    
    if (g.key === 'qr') {
      const f = cfg.qr
      div.innerHTML = `
        <div class="tool-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${g.icon}"/></svg>${g.label}</div>
        <div class="ctrl-row-3">
          <div><div class="ctrl-label">X pos</div><input type="number" value="${f.x}" onchange="cfg.qr.x = +this.value; saveConfig(); renderBadge()" /></div>
          <div><div class="ctrl-label">Y pos</div><input type="number" value="${f.y}" onchange="cfg.qr.y = +this.value; saveConfig(); renderBadge()" /></div>
        </div>
        <div class="ctrl-row-3" style="margin-top:8px;">
          <div><div class="ctrl-label">Size</div> <input type="number" value="${f.size}" onchange="cfg.qr.size = +this.value; saveConfig(); renderBadge()" /></div>
        </div>
      `
    } else {
      const f = cfg[g.key]
      div.innerHTML = `
        <div class="tool-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="${g.icon}"/></svg>${g.label}</div>
        <div class="ctrl-row-3">
          <div><div class="ctrl-label">X pos</div><input type="number" value="${f.x}" onchange="cfg.${g.key}.x = +this.value; saveConfig(); renderBadge()" /></div>
          <div><div class="ctrl-label">Y pos</div><input type="number" value="${f.y}" onchange="cfg.${g.key}.y = +this.value; saveConfig(); renderBadge()" /></div>
          <div><div class="ctrl-label">Size</div> <input type="number" value="${f.fontSize}" onchange="cfg.${g.key}.fontSize = +this.value; saveConfig(); renderBadge()" /></div>
        </div>
        <div class="ctrl-row-3" style="margin-top:8px;">
          <div>
            <div class="ctrl-label">Weight</div>
            <select onchange="cfg.${g.key}.fontWeight = this.value; saveConfig(); renderBadge()">
              <option value="normal" ${f.fontWeight === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="bold"   ${f.fontWeight === 'bold'   ? 'selected' : ''}>Bold</option>
            </select>
          </div>
          <div>
            <div class="ctrl-label">Style</div>
            <select onchange="cfg.${g.key}.fontStyle = this.value; saveConfig(); renderBadge()">
              <option value="normal" ${f.fontStyle === 'normal' ? 'selected' : ''}>Normal</option>
              <option value="italic" ${f.fontStyle === 'italic' ? 'selected' : ''}>Italic</option>
            </select>
          </div>
          <div>
            <div class="ctrl-label">Color</div>
            <input type="color" value="${f.color}" onchange="cfg.${g.key}.color = this.value; saveConfig(); renderBadge()" style="padding:0;height:30px;cursor:pointer;" />
          </div>
        </div>
      `
    }
    body.appendChild(div)
  })
}

// ── Helpers ────────────────────────────────────────────────
function avClass(role) {
  if (role === 'PASTOR')   return 'di-av-p'
  if (role === 'WIFE')     return 'di-av-w'
  if (role === 'DISCIPLE') return 'di-av-d'
  return ''
}
function pillClass(role) {
  if (role === 'PASTOR')   return 'pill-pastor'
  if (role === 'WIFE')     return 'pill-wife'
  if (role === 'DISCIPLE') return 'pill-disciple'
  return 'pill-gray'
}
function esc(str) {
  return String(str||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}