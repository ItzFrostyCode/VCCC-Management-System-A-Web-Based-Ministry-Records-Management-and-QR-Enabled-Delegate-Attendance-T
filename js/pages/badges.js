// ── Global Functions (Hoisted & Attached to window) ──────────
window.openDownloadModal      = openDownloadModal
window.closeDownloadModal     = closeDownloadModal
window.switchModalTab         = switchModalTab
window.startExportFromModal   = startExportFromModal
window.toggleModalPick        = toggleModalPick
window.searchInModal          = searchInModal
window.resetConfig            = resetConfig
window.downloadSingle         = downloadSingle
window.printBadge             = printBadge
window.toggleRole             = toggleRole
window.applyFilters           = applyFilters
window.selectDelegate         = selectDelegate
window.switchTab              = switchTab
window.switchMobileView       = switchMobileView
window.startExport            = startExport

// ── State Variables ──────────────────────────────────────────
let allDelegates = [], filteredDelegates = [], selectedDelegate = null
let filterDistVal = null, filterChurchVal = null
let activeRoles = new Set(['PASTOR','WIFE','DISCIPLE'])
let activeFieldKey = 'name', selFieldEditor = null, selFilterDist, selFilterChurch
let badgeCanvas = null

// Modal State (NUCLEAR STABILITY VERSION)
let modalActiveTab = 'quick'
let modalPickedIds = new Set() 
let modalDistrictsMulti = [], modalChurchesMulti = []
let modalSearchQuery = ''
let modalSSDist = null, modalSSChur = null

// ── Modal UI Logic ───────────────────────────────────────────
function openDownloadModal(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  console.log('MDL: Nuclear Open...');
  try {
    const modal = document.getElementById('modal-download')
    if (!modal) { console.error('MDL: Element not found'); return }
    
    // Reset state
    modalActiveTab = 'quick'
    modalPickedIds.clear()
    modalSearchQuery = ''
    modalDistrictsMulti = []
    modalChurchesMulti = []
    
    modal.style.display = 'flex' // Using flex wrapper
    renderModalContent()
  } catch (err) {
    console.error('MDL: Init error:', err)
  }
}

function closeDownloadModal(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  console.log('MDL: Nuclear Close...');
  const modal = document.getElementById('modal-download')
  if (modal) {
    modal.style.display = 'none'
    cleanupModalSS()
  }
}

function cleanupModalSS() {
  try {
    if (modalSSDist) { modalSSDist.destroy(); modalSSDist = null }
    if (modalSSChur) { modalSSChur.destroy(); modalSSChur = null }
  } catch(e) {}
}

function switchModalTab(tab) {
  if (modalActiveTab === tab) return
  modalActiveTab = tab
  renderModalContent()
}

function renderModalContent() {
  const container = document.getElementById('modal-download-content')
  if (!container) return

  const dQuery = (window.modalDistQuery || '').toLowerCase()
  const cQuery = (window.modalChurQuery || '').toLowerCase()
  const iQuery = (modalSearchQuery || '').toLowerCase()
  
  const distList = districts.filter(d => !dQuery || (d.district_name||'').toLowerCase().includes(dQuery))
  const churList = churches.filter(c => !cQuery || (c.church_name||'').toLowerCase().includes(cQuery))
  const indList = allDelegates.filter(d => !iQuery || (d.fullName||'').toLowerCase().includes(iQuery)).slice(0, 30)


  let html = `
    <div class="modal-unified-wrap">
      
      <!-- Part 1: Quick Actions -->
      <div class="modal-section" style="margin-top:0;">
        <div class="modal-section-title">Quick Export</div>
        <div class="modal-grid-btns">
          <div class="modal-action-card mini" onclick="startExport('all')">
            <div class="modal-action-title">All Badges (${allDelegates.length})</div>
          </div>
          <div class="modal-action-card mini" onclick="startExport('filtered')">
            <div class="modal-action-title">Current Filters (${filteredDelegates.length})</div>
          </div>
        </div>
      </div>

      <div style="margin: 24px 0; border-top: 1.5px solid var(--border); position:relative;">
        <span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); background:#fff; padding:0 12px; font-size:11px; color:var(--text-4); font-weight:800;">OR FILTER SPECIFICALLY</span>
      </div>

      <!-- Part 2: Districts -->
      <div class="modal-section">
        <div class="modal-section-title">Select Districts (${modalDistrictsMulti.length} picked)</div>
        <div class="modal-search-box">
          <input type="text" placeholder="Search districts..." value="${esc(window.modalDistQuery)}" oninput="window.modalDistQuery=this.value;renderModalContent()" />
        </div>
        <div class="modal-picker-list" style="max-height:120px;">
          ${distList.map(d => {
            const isSel = modalDistrictsMulti.includes(d.id)
            return `<div class="modal-picker-item" onclick="toggleAdvancedPick('dist','${d.id}')">
              <input type="checkbox" class="modal-picker-cb" ${isSel?'checked':''} />
              <div class="modal-picker-name">${esc(d.district_name)}</div>
            </div>`
          }).join('')}
        </div>

      </div>

      <!-- Part 3: Churches -->
      <div class="modal-section">
        <div class="modal-section-title">Select Churches (${modalChurchesMulti.length} picked)</div>
        <div class="modal-search-box">
          <input type="text" placeholder="Search churches..." value="${esc(window.modalChurQuery)}" oninput="window.modalChurQuery=this.value;renderModalContent()" />
        </div>
        <div class="modal-picker-list" style="max-height:160px;">
          ${churList.map(c => {
            const isSel = modalChurchesMulti.includes(c.id)
            return `<div class="modal-picker-item" onclick="toggleAdvancedPick('chur','${c.id}')">
              <input type="checkbox" class="modal-picker-cb" ${isSel?'checked':''} />
              <div class="modal-picker-name">${esc(c.church_name)}</div>
            </div>`
          }).join('')}
        </div>

      </div>

      <!-- Part 4: Individual Pick -->
      <div class="modal-section" style="margin-bottom:0;">
        <div class="modal-section-title">Pick Individuals (${modalPickedIds.size} picked)</div>
        <div class="modal-search-box">
          <input type="text" placeholder="Search by name..." value="${esc(modalSearchQuery)}" oninput="searchInModal(this.value)" />
        </div>
        <div class="modal-picker-list" style="max-height:160px;">
          ${indList.map(d => {
            const pk = `${d.role}_${d.id}`, isPicked = modalPickedIds.has(pk)
            return `<div class="modal-picker-item" onclick="toggleModalPick('${d.id}','${d.role}')">
              <input type="checkbox" class="modal-picker-cb" ${isPicked?'checked':''} />
              <div class="modal-picker-info">
                <div class="modal-picker-name" style="font-size:13px;">${esc(d.fullName)}</div>
                <div class="modal-picker-sub">${d.role} • ${d.districtName}</div>
              </div>
            </div>`
          }).join('')}
        </div>
      </div>

    </div>
  `
  container.innerHTML = html
}

window.toggleAdvancedPick = (type, id) => {
  if (type === 'dist') {
    if (modalDistrictsMulti.includes(id)) modalDistrictsMulti = modalDistrictsMulti.filter(x => x !== id)
    else modalDistrictsMulti.push(id)
  } else {
    if (modalChurchesMulti.includes(id)) modalChurchesMulti = modalChurchesMulti.filter(x => x !== id)
    else modalChurchesMulti.push(id)
  }
  renderModalContent()
}
window.modalDistQuery = ''
window.modalChurQuery = ''

let districts = [], churches = [] 

function searchInModal(q) { modalSearchQuery = q; renderModalContent() }
function toggleModalPick(id, role) {
  const k = `${role}_${id}`; if (modalPickedIds.has(k)) modalPickedIds.delete(k); else modalPickedIds.add(k)
  renderModalContent()
}

async function startExportFromModal() {
  let targets = [], zipName = 'Badges.zip'
  
  if (modalDistrictsMulti.length || modalChurchesMulti.length) {
    targets = allDelegates.filter(d => modalDistrictsMulti.includes(d.districtId) || modalChurchesMulti.includes(d.churchId))
    zipName = 'Groups_Badges.zip'
  } else if (modalPickedIds.size) {
    targets = allDelegates.filter(d => modalPickedIds.has(`${d.role}_${d.id}`))
    zipName = 'Selected_Badges.zip'
  } else {
    alert('Please select Districts, Churches, or Individuals first. (Or use the Quick Export buttons above)')
    return
  }
  
  if (!targets.length) { alert('Selection resulted in 0 delegates.'); return }
  closeDownloadModal(); await executeBatchDownload(targets, zipName)
}

async function startExport(type) {
  closeDownloadModal()
  if (type === 'all') await executeBatchDownload(allDelegates, 'VCCC_All_Badges.zip')
  else await executeBatchDownload(filteredDelegates, 'VCCC_Filtered.zip')
}

// ── Export Engine (Optimized) ───────────────────────────────
async function executeBatchDownload(targets, zipName) {
  const fill = document.getElementById('batch-fill'), lab = document.getElementById('batch-label'), prog = document.getElementById('batch-progress')
  if (prog) prog.style.display='block'; 
  const zip = new JSZip(), safe = s => (s||'').replace(/[/\\?%*:|"<>]/g, '_').trim()
  
  try {
    // Pre-load template image once to optimize
    const templateImg = await loadImg(cfg.templateUrl)
    
    for (let i=0; i<targets.length; i++) {
        const d = targets[i], canvas = document.createElement('canvas')
        canvas.width = cfg.canvasWidth; canvas.height = cfg.canvasHeight
        await drawBadge(canvas, d, templateImg)
        
        const path = `${safe(d.districtName)}/${safe(d.churchName)}/${d.role==='DISCIPLE'?'Disciples/':''}${d.role}_${safe(d.fullName)}.jpg`
        zip.file(path, canvas.toDataURL('image/jpeg', 0.92).split(',')[1], {base64:true})
        
        if (fill) fill.style.width = ((i+1)/targets.length*100)+'%'
        if (lab) lab.textContent = `Rendering ${i+1}/${targets.length}: ${d.fullName}`
        if (i%10===0) await new Promise(r=>setTimeout(r, 0))
    }
    const blob = await zip.generateAsync({type:'blob'}), a = document.createElement('a')
    a.href=URL.createObjectURL(blob); a.download=zipName; a.click()
  } catch (err) { 
    console.error('Export Error', err); 
    alert('Export Failed: ' + err.message) 
  } finally { 
    if(prog) prog.style.display='none' 
  }
}


// ── Filtering Logic ──────────────────────────────────────────
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
    if (!activeRoles.has(d.role)) return false
    if (filterDistVal && d.districtId !== filterDistVal) return false
    if (filterChurchVal && d.churchId !== filterChurchVal) return false
    if (qTerms.length > 0) {
      const full = (d.fullName||'').toLowerCase()
      if (!qTerms.every(term => full.includes(term))) return false
    }
    return true
  })
  renderDelegateList()

  if (filteredDelegates.length > 0) {
    const first = filteredDelegates[0]; selectDelegate(first.id, first.role, false) 
  } else {
    selectedDelegate = null
    const wrap = document.getElementById('badge-preview-wrap')
    if (wrap) wrap.innerHTML = `<div class="no-selection"><p>No delegates found</p></div>`
  }
}

function selectDelegate(id, role, shouldJump = true) {
  selectedDelegate = filteredDelegates.find(d => d.id === id && d.role === role)
  document.querySelectorAll('.del-card').forEach(c => c.classList.toggle('sel', c.dataset.id===id && c.dataset.role===role))
  if (document.getElementById('canvas-actions')) document.getElementById('canvas-actions').style.display = 'flex'
  if (document.getElementById('no-selection-msg')) document.getElementById('no-selection-msg').style.display = 'none'
  renderBadge()
  if (shouldJump) { const tb = document.querySelector('.mobile-tabbar'); if (tb && getComputedStyle(tb).display!=='none' && window.innerWidth <= 640) switchTab('preview') }
}

function switchTab(view) {
  document.querySelector('.slides-panel')?.classList.remove('active')
  document.querySelector('.canvas-workspace')?.classList.remove('active')
  document.querySelector('.props-panel')?.classList.remove('active')
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view))
  if(view==='delegates') document.querySelector('.slides-panel')?.classList.add('active')
  else if(view==='preview') document.querySelector('.canvas-workspace')?.classList.add('active')
  else if(view==='editor'){ document.querySelector('.props-panel')?.classList.add('active'); renderTools() }
}
function switchMobileView(v){ switchTab(v==='delegates'?'delegates':'editor') }

// ── Config ───────────────────────────────────────────────────
const CONFIG_KEY = 'momentum_badge_config_v1'
const TEMPLATES_KEY = 'momentum_badge_templates_v1'
const DEFAULT_CONFIG = {
  canvasWidth: 1050,
  canvasHeight: 750,
  templateUrl: 'assets/2026%20Conf%20ID%20front.png',
  name:     { x: 20, y: 350, fontSize: 45, fontWeight: 'bold', fontStyle: 'normal', color: '#111111', textAlign: 'left', maxWidth: 850, enabled: true },
  role:     { x: 20, y: 410, fontSize: 75, fontWeight: 'bold', fontStyle: 'normal', color: '#111111', textAlign: 'left', maxWidth: 850, enabled: true },
  district: { x: 20, y: 500, fontSize: 34, fontWeight: 'bold', fontStyle: 'normal', color: '#333333', textAlign: 'left', maxWidth: 850, enabled: true },
  church:   { x: 570, y: 665, fontSize: 52, fontWeight: 'bold', fontStyle: 'italic', color: '#ffffff', textAlign: 'left', maxWidth: 460, enabled: true },
  qr:       { x: 735, y: 300, size: 293, enabled: true },
  profile:  { x: 50, y: 50, size: 250, enabled: false }
}

let cfg = getConfig(); function getConfig(){ try{ let s=JSON.parse(localStorage.getItem(CONFIG_KEY))||{}, m={...DEFAULT_CONFIG}; Object.keys(DEFAULT_CONFIG).forEach(k=>{ if(s[k]) m[k]=typeof s[k]==='object'?{...DEFAULT_CONFIG[k],...s[k]}:s[k] }); return m }catch{ return {...DEFAULT_CONFIG} } }
function saveConfig(){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)) }

function getLocalTemplates() { try{ return JSON.parse(localStorage.getItem(TEMPLATES_KEY))||[] }catch{ return [] } }
function saveLocalTemplates(t) { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(t)) }
function addLocalTemplate(dataUrl) { const t = getLocalTemplates(); t.push({ id: Date.now(), url: dataUrl }); saveLocalTemplates(t); renderTools() }
function deleteLocalTemplate(id) { if(confirm('Delete template?')){ const t = getLocalTemplates().filter(x => x.id !== id); saveLocalTemplates(t); renderTools() } }
function applyLocalTemplate(url) { cfg.templateUrl = url; saveConfig(); renderBadge(); renderTools() }

function resetConfig(){ if(confirm('Reset layout?')){ localStorage.removeItem(CONFIG_KEY); cfg={...DEFAULT_CONFIG}; renderTools(); renderBadge() } }

function downloadSingle() {
  if (!selectedDelegate || !badgeCanvas) return
  const a = document.createElement('a'); a.href = badgeCanvas.toDataURL('image/jpeg', 0.9); a.download = `${selectedDelegate.role}-${selectedDelegate.fullName.replace(/\s+/g,'_')}.jpg`; a.click()
}
function printBadge() {
  if (!badgeCanvas) return
  const url = badgeCanvas.toDataURL('image/jpeg', 0.9), w = window.open('','_blank'); if(!w){alert('Pop-up blocked!'); return}
  w.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${url}" style="width:8.89cm;height:6.35cm;" onload="window.print();window.close();"/></body></html>`)
}

// ── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  try {
    await requireAuth()
    const [dRes, cRes, pastors, disciples] = await Promise.all([ districtService.fetchAll(), churchService.fetchAll(), pastorService.fetchAll(), discipleService.fetchAll() ])
    districts = dRes; churches = cRes
    
    districts.forEach(d => {
      if (d.theme_color) DISTRICT_COLORS[d.district_name.trim().toUpperCase()] = d.theme_color
    })

    const distMap = {}, churchMap = {}, pastorMap = {}
    districts.forEach(d => distMap[d.id] = d.district_name)
    churches.forEach(c => churchMap[c.id] = { name: c.church_name, distId: c.district_id })

    allDelegates = []
    pastors.forEach(p => {
      const dn = p.district_name || distMap[p.district_id] || ''
      const cn = p.church_name || churchMap[p.church_id]?.name || ''
      pastorMap[p.id] = { districtId: p.district_id, districtName: dn, churchId: p.church_id, churchName: cn, fullName: p.full_name, imageUrl: p.pastor_image_url }
      allDelegates.push({ id:p.id, fullName:p.full_name, role:'PASTOR', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn, imageUrl: p.pastor_image_url })
      if(p.wife_name) {
        allDelegates.push({ id:p.id, fullName:p.wife_name, role:'WIFE', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn, pastorName:p.full_name, imageUrl: p.wife_image_url })
      }
    })
    disciples.forEach(d => {
      allDelegates.push({ id: d.id, fullName: d.full_name, role: 'DISCIPLE', districtId: d.district_id, districtName: d.district_name || '', churchId: d.church_id, churchName: d.church_name || '', imageUrl: d.disciple_image_url || null })
    })

    const distEl = document.getElementById('filter-district-badge'), churchEl = document.getElementById('filter-church-badge')
    if (distEl) selFilterDist = createSearchSelect(distEl, districts.map(d => ({ value:d.id, label:d.district_name })), 'District', (v) => { filterDistVal = v||null; filterChurchVal = null; const fc = churches.filter(c => !filterDistVal || c.district_id === filterDistVal); if(selFilterChurch){ selFilterChurch.setOptions([{value:'',label:'All churches'}, ...fc.map(c=>({value:c.id,label:c.church_name}))]); selFilterChurch.reset() } applyFilters() })
    if (churchEl) selFilterChurch = createSearchSelect(churchEl, [{ value:'', label:'All churches' }, ...churches.map(c => ({ value:c.id, label:c.church_name }))], 'All churches', (v) => { filterChurchVal = v||null; applyFilters() })

    applyFilters(); renderTools()
    if (window.innerWidth <= 640) switchTab('delegates')
  } catch (err) { console.error('Init failed:', err) }
})

// ── Helpers ──────────────────────────────────────────────────
async function renderBadge() {
  if (!selectedDelegate) return
  const wrap = document.getElementById('badge-preview-wrap'); wrap.innerHTML = '<div style="font-size:13px;color:var(--text-3);">Rendering...</div>'
  try {
    const isMobile = window.innerWidth <= 640;
    const isTablet = window.innerWidth > 640 && window.innerWidth <= 1100;
    let maxH = '380px';
    if (isMobile) maxH = '500px';
    else if (isTablet) maxH = '320px';

    const canvas = document.createElement('canvas'); 
    canvas.width = cfg.canvasWidth; 
    canvas.height = cfg.canvasHeight; 
    canvas.style.maxWidth = '100%'; 
    canvas.style.maxHeight = maxH; 
    canvas.style.height='auto'; 
    canvas.style.display='block'; 
    canvas.style.margin='0 auto'
    await drawBadge(canvas, selectedDelegate); 
    wrap.innerHTML = ''; 
    wrap.appendChild(canvas); 
    badgeCanvas = canvas
  } catch(e) { wrap.innerHTML=`<div style="color:red;font-size:13px;">Error: ${e.message}</div>` }
}

async function drawBadge(canvas, d, preLoadedTemplate = null) {
  const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
  try { 
    const img = preLoadedTemplate || await loadImg(cfg.templateUrl); 
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
  } catch(e){}

  // Draw Profile Picture if enabled and available
  if (cfg.profile && cfg.profile.enabled && d.imageUrl) {
    try {
      const pImg = await loadImg(d.imageUrl);
      ctx.save();
      // Draw image at specified coordinates and size
      ctx.drawImage(pImg, cfg.profile.x, cfg.profile.y, cfg.profile.size, cfg.profile.size);
      ctx.restore();
    } catch(err) { console.error('Profile image load failed', err); }
  }

  if (cfg.name.enabled !== false) drawText(ctx, d.fullName, cfg.name); 
  if (cfg.role.enabled !== false) drawText(ctx, d.role, cfg.role); 
  if (cfg.district.enabled !== false) drawText(ctx, d.districtName, cfg.district); 
  if (cfg.church.enabled !== false) drawText(ctx, d.churchName, cfg.church)
  
  if (cfg.qr.enabled !== false) {
    const qrc = document.createElement('canvas'), lib = window.QRCode||window.qrcode; 
    await lib.toCanvas(qrc, encodeQR(d.role, d.id), {width:cfg.qr.size, margin:1}); 
    ctx.drawImage(qrc, cfg.qr.x, cfg.qr.y, cfg.qr.size, cfg.qr.size)
  }
}

function drawText(ctx, t='', f) { 
  if (!t) return
  ctx.save(); 
  const weight = f.fontWeight==='bold'?700:400, style=f.fontStyle==='italic'?'italic ':''; 
  let fSize = f.fontSize;
  const maxWidth = f.maxWidth || 850;
  const align = f.textAlign || 'left';
  
  // Smart Auto-Resize: Limit maxWidth to canvas edge if left-aligned
  let effectiveMaxWidth = maxWidth;
  if (align === 'left' && (f.x + effectiveMaxWidth > 1030)) {
     effectiveMaxWidth = 1030 - f.x;
  }

  ctx.font = `${style}${weight} ${fSize}px "Public Sans", Arial, sans-serif`;
  while (ctx.measureText(t).width > effectiveMaxWidth && fSize > 8) {
    fSize--;
    ctx.font = `${style}${weight} ${fSize}px "Public Sans", Arial, sans-serif`;
  }

  const tw = ctx.measureText(t).width;
  let drawX = f.x;

  // Prevent negative overflow if centered/right-aligned at a low X coordinate
  if (align === 'center') {
    if (drawX - tw/2 < 10) drawX = tw/2 + 10; // Keep at least 10px margin from left
  } else if (align === 'right') {
    if (drawX - tw < 10) drawX = tw + 10;
  } else if (align === 'left') {
    if (drawX < 10) drawX = 10;
  }

  ctx.fillStyle = f.color; 
  ctx.textAlign = align;
  ctx.textBaseline = 'top'; 
  ctx.fillText(t, drawX, f.y); 
  ctx.restore() 
}

function loadImg(src) { return new Promise((res, rej) => { const img = new Image(); img.crossOrigin='anonymous'; img.onload=()=>res(img); img.onerror=rej; img.src=src }) }

function renderDelegateList() {
  const el = document.getElementById('delegate-list'), cnt = document.getElementById('delegate-count'); if(cnt) cnt.textContent = `${filteredDelegates.length} results`
  if(!el) return; if(!filteredDelegates.length){ el.innerHTML=`<div style="padding:40px 10px;text-align:center;color:var(--text-4)">No matches.</div>`; return }
  el.innerHTML = filteredDelegates.map(d => renderDelCard(d)).join('')
}

function renderDelCard(d) {
  const c = getDistColor(d.districtName), sel = selectedDelegate?.id===d.id && selectedDelegate?.role===d.role
  const ini = (d.fullName||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  let sub = d.districtName||''; 
  if(d.role==='WIFE') sub=`Spouse of ${d.pastorName||'Pastor'}`; 
  if(d.role==='DISCIPLE') sub=d.churchName || 'No Church';
  
  const avImg = d.imageUrl ? `<img src="${d.imageUrl}" class="del-av-img" />` : `<div class="del-av-fallback">${ini}</div>`
  
  return `
    <button type="button" class="del-card ${sel?'sel':''}" data-id="${d.id}" data-role="${d.role}" style="--district-color:${c}" onclick="selectDelegate('${d.id}','${d.role}')">
      <div class="del-av" style="background:${c}">${avImg}</div>
      <div class="del-info">
        <div class="del-name">${esc(d.fullName)}</div>
        <div class="del-sub">${esc(sub)}</div>
      </div>
      <span class="del-role-tag tag-${d.role.toLowerCase()}">${d.role}</span>
    </button>`
}

function getDistColor(n) { 
  const nm = (n||'').trim().toUpperCase()
  if (DISTRICT_COLORS[nm]) return DISTRICT_COLORS[nm]
  const m = nm.match(/(\d+)/); 
  if(m && DISTRICT_COLORS[`DISTRICT ${m[1]}`]) return DISTRICT_COLORS[`DISTRICT ${m[1]}`]
  return '#94a3b8' 
}
let DISTRICT_COLORS = {}

function renderTools() {
  const b = document.getElementById('editor-fields-body'); if(!b) return
  if(!b.querySelector('.editor-toolbar')){ 
    b.innerHTML=`<div class="editor-toolbar"><div class="editor-sel-wrap" id="f-sel-box"></div><div class="editor-prop-wrap" id="editor-properties-body"></div></div>`; 
    selFieldEditor = createSearchSelect(document.getElementById('f-sel-box'), [
      {value:'name',label:'Name'},
      {value:'role',label:'Role'},
      {value:'district',label:'District'},
      {value:'church',label:'Church'},
      {value:'qr',label:'QR'},
      {value:'profile',label:'Profile'},
      {value:'templates',label:'Templates'}
    ], 'Select...', (v)=>{ if(v){activeFieldKey=v;renderTools()} }); 
    selFieldEditor.setValue(activeFieldKey) 
  }
  const p = document.getElementById('editor-properties-body')
  
  if (activeFieldKey === 'templates') {
    const ts = getLocalTemplates()
    const isDefaultUsed = cfg.templateUrl === DEFAULT_CONFIG.templateUrl
    
    p.innerHTML = `
      <div class="prop-section-title" style="margin-top:0;">Background Templates</div>
      <div style="margin-bottom:15px;">
        <button class="btn btn-ghost" style="width:100%; height:36px; border:1px dashed var(--border); font-size:12px;" onclick="document.getElementById('tpl-upload').click()">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Template
        </button>
        <input type="file" id="tpl-upload" accept="image/*" style="display:none;" onchange="handleTemplateUpload(this)" />
      </div>
      
      <div class="tpl-grid">
        <!-- Default -->
        <div class="tpl-card ${isDefaultUsed?'active':''}">
           <div class="tpl-thumb" style="background-image:url('${DEFAULT_CONFIG.templateUrl}')" onclick="applyLocalTemplate('${DEFAULT_CONFIG.templateUrl}')"></div>
           <div class="tpl-footer">
             <span class="tpl-tag">Default</span>
           </div>
        </div>
        
        ${ts.map(t => {
          const isActive = cfg.templateUrl === t.url
          return `
            <div class="tpl-card ${isActive?'active':''}">
               <div class="tpl-thumb" style="background-image:url('${t.url}')" onclick="applyLocalTemplate('${t.url}')"></div>
               <div class="tpl-footer">
                 <span class="tpl-tag">Custom</span>
                 <button class="tpl-delete-btn" onclick="deleteLocalTemplate(${t.id})">
                   <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                 </button>
               </div>
            </div>
          `
        }).join('')}
      </div>
    `
    return
  }

  const f = cfg[activeFieldKey]
  
  updateCoordsLabel(f.x, f.y)

  const visibilityToggle = `
    <div class="prop-item" style="border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 12px;">
      <div style="display:flex; align-items:center; justify-content:space-between; width:100%;">
        <div class="prop-label" style="font-weight:700; color:var(--text-2);">Field Visible</div>
        <label class="switch-mini">
          <input type="checkbox" ${f.enabled!==false?'checked':''} onchange="cfg.${activeFieldKey}.enabled=this.checked;saveConfig();renderBadge()" />
          <span class="slider-mini"></span>
        </label>
      </div>
    </div>
  `;

  if(activeFieldKey==='qr') {
    p.innerHTML = visibilityToggle + `
      <div class="prop-item"><div class="prop-label">X</div><input type="number" value="${f.x}" oninput="cfg.qr.x=+this.value;updateCoordsLabel(+this.value, cfg.qr.y);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Y</div><input type="number" value="${f.y}" oninput="cfg.qr.y=+this.value;updateCoordsLabel(cfg.qr.x, +this.value);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Size</div><input type="number" value="${f.size}" oninput="cfg.qr.size=+this.value;saveConfig();renderBadge()" /></div>
    `
  } else if (activeFieldKey==='profile') {
    p.innerHTML = visibilityToggle + `
      <div class="prop-item"><div class="prop-label">X</div><input type="number" value="${f.x}" oninput="cfg.profile.x=+this.value;updateCoordsLabel(+this.value, cfg.profile.y);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Y</div><input type="number" value="${f.y}" oninput="cfg.profile.y=+this.value;updateCoordsLabel(cfg.profile.x, +this.value);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Size</div><input type="number" value="${f.size}" oninput="cfg.profile.size=+this.value;saveConfig();renderBadge()" /></div>
    `
  } else {
    p.innerHTML = visibilityToggle + `
      <div class="prop-item"><div class="prop-label">X</div><input type="number" value="${f.x}" oninput="cfg.${activeFieldKey}.x=+this.value;updateCoordsLabel(+this.value, cfg.${activeFieldKey}.y);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Y</div><input type="number" value="${f.y}" oninput="cfg.${activeFieldKey}.y=+this.value;updateCoordsLabel(cfg.${activeFieldKey}.x, +this.value);saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Size</div><input type="number" value="${f.fontSize}" oninput="cfg.${activeFieldKey}.fontSize=+this.value;saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Max Width</div><input type="number" value="${f.maxWidth||800}" oninput="cfg.${activeFieldKey}.maxWidth=+this.value;saveConfig();renderBadge()" /></div>
      <div class="prop-item"><div class="prop-label">Align</div>
        <select class="input" style="height:32px; padding:0 8px; font-size:12px;" onchange="cfg.${activeFieldKey}.textAlign=this.value;saveConfig();renderBadge()">
          <option value="left" ${f.textAlign==='left'?'selected':''}>Left</option>
          <option value="center" ${f.textAlign==='center'?'selected':''}>Center</option>
          <option value="right" ${f.textAlign==='right'?'selected':''}>Right</option>
        </select>
      </div>
      <div class="prop-item"><div class="prop-label">Color</div><input type="color" value="${f.color}" onchange="cfg.${activeFieldKey}.color=this.value;saveConfig();renderBadge()" /></div>
    `
  }
}

function updateCoordsLabel(x,y) {
  const el = document.getElementById('coords-label')
  if(el) el.textContent = `${activeFieldKey.toUpperCase()} X: ${x}, Y: ${y}`
}

function handleTemplateUpload(input) {
  const file = input.files[0]; if(!file) return
  const reader = new FileReader(); reader.onload = (e) => { addLocalTemplate(e.target.result) }; reader.readAsDataURL(file)
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }