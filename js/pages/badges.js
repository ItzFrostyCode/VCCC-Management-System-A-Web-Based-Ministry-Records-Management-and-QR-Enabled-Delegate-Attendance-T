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
  
  const distList = districts.filter(d => !dQuery || d.name.toLowerCase().includes(dQuery))
  const churList = churches.filter(c => !cQuery || c.name.toLowerCase().includes(cQuery))
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
              <div class="modal-picker-name">${esc(d.name)}</div>
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
              <div class="modal-picker-name">${esc(c.name)}</div>
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

// ── Export Engine (Legacy Stable) ───────────────────────────
async function executeBatchDownload(targets, zipName) {
  const fill = document.getElementById('batch-fill'), lab = document.getElementById('batch-label'), prog = document.getElementById('batch-progress')
  if (prog) prog.style.display='block'; const zip = new JSZip(), safe = s => (s||'').replace(/[/\\?%*:|"<>]/g, '_').trim()
  try {
    for (let i=0; i<targets.length; i++) {
      const d = targets[i], canvas = document.createElement('canvas')
      canvas.width = cfg.canvasWidth; canvas.height = cfg.canvasHeight
      await drawBadge(canvas, d)
      const path = `${safe(d.districtName)}/${safe(d.churchName)}/${d.role==='DISCIPLE'?'Disciples/':''}${d.role}_${safe(d.fullName)}.jpg`
      zip.file(path, canvas.toDataURL('image/jpeg', 0.92).split(',')[1], {base64:true})
      if (fill) fill.style.width = ((i+1)/targets.length*100)+'%'
      if (lab) lab.textContent = `Rendering ${i+1}/${targets.length}: ${d.fullName}`
      if (i%10===0) await new Promise(r=>setTimeout(r, 0))
    }
    const blob = await zip.generateAsync({type:'blob'}), a = document.createElement('a')
    a.href=URL.createObjectURL(blob); a.download=zipName; a.click()
  } catch (err) { console.error('Export Error', err); alert('Export Failed') }
  finally { if(prog) prog.style.display='none' }
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
  if (shouldJump) { const tb = document.querySelector('.mobile-tabbar'); if (tb && getComputedStyle(tb).display!=='none') switchTab('preview') }
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
const CONFIG_KEY = 'momentum_badge_config_v1', DEFAULT_CONFIG = { canvasWidth:1050, canvasHeight:750, thumbnailUrl:'../assets/2026%20Conf%20ID%20front.png', templateUrl:'../assets/2026%20Conf%20ID%20front.png', name:{x:20,y:350,fontSize:45,fontWeight:'bold',fontStyle:'normal',color:'#111111'}, role:{x:20,y:440,fontSize:75,fontWeight:'bold',fontStyle:'normal',color:'#111111'}, district:{x:20,y:500,fontSize:34,fontWeight:'bold',fontStyle:'normal',color:'#111111'}, church:{x:600,y:700,fontSize:52,fontWeight:'bold',fontStyle:'italic',color:'#ffffff'}, qr:{x:735,y:300,size:293} }
let cfg = getConfig(); function getConfig(){ try{ let s=JSON.parse(localStorage.getItem(CONFIG_KEY))||{}, m={...DEFAULT_CONFIG}; Object.keys(DEFAULT_CONFIG).forEach(k=>{ if(s[k]) m[k]=typeof s[k]==='object'?{...DEFAULT_CONFIG[k],...s[k]}:s[k] }); return m }catch{ return {...DEFAULT_CONFIG} } }
function saveConfig(){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)) }
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
    const distMap = {}, churchMap = {}, pastorMap = {}
    districts.forEach(d => distMap[d.id] = d.name)
    churches.forEach(c => churchMap[c.id] = { name: c.name, distId: c.district_id })
    allDelegates = []
    pastors.forEach(p => {
      const dn = distMap[p.district_id]||'Unknown', cn = churchMap[p.church_id]?.name||'No Church'
      pastorMap[p.id] = { districtId: p.district_id, districtName: dn, churchId: p.church_id, churchName: cn, fullName: p.full_name }
      allDelegates.push({ id:p.id, fullName:p.full_name, role:'PASTOR', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn })
      if(p.wife_name) allDelegates.push({ id:p.id, fullName:p.wife_name, role:'WIFE', districtId:p.district_id, districtName:dn, churchId:p.church_id, churchName:cn, pastorName:p.full_name })
    })
    disciples.forEach(d => {
      const p = pastorMap[d.pastor_id]||{}, dn = p.districtName||'Unknown', cn = p.churchName||'No Church'
      allDelegates.push({ id:d.id, fullName:d.full_name, role:'DISCIPLE', districtId:p.districtId, districtName:dn, churchId:p.churchId, churchName:cn, pastorName:p.fullName||null })
    })

    const distEl = document.getElementById('filter-district-badge'), churchEl = document.getElementById('filter-church-badge')
    if (distEl) selFilterDist = createSearchSelect(distEl, districts.map(d => ({ value:d.id, label:d.name })), 'District', (v) => { filterDistVal = v||null; filterChurchVal = null; const fc = churches.filter(c => !filterDistVal || c.district_id === filterDistVal); if(selFilterChurch){ selFilterChurch.setOptions([{value:'',label:'All churches'}, ...fc.map(c=>({value:c.id,label:c.name}))]); selFilterChurch.reset() } applyFilters() })
    if (churchEl) selFilterChurch = createSearchSelect(churchEl, [{ value:'', label:'All churches' }, ...churches.map(c => ({ value:c.id, label:c.name }))], 'All churches', (v) => { filterChurchVal = v||null; applyFilters() })
    applyFilters(); renderTools()
  } catch (err) { console.error('Init failed:', err) }
})

// ── Helpers ──────────────────────────────────────────────────
async function renderBadge() {
  if (!selectedDelegate) return
  const wrap = document.getElementById('badge-preview-wrap'); wrap.innerHTML = '<div style="font-size:13px;color:var(--text-3);">Rendering...</div>'
  try {
    const canvas = document.createElement('canvas'); canvas.width = cfg.canvasWidth; canvas.height = cfg.canvasHeight; canvas.style.maxWidth = '100%'; canvas.style.maxHeight = window.innerWidth<600?'500px':'380px'; canvas.style.height='auto'; canvas.style.display='block'; canvas.style.margin='0 auto'
    await drawBadge(canvas, selectedDelegate); wrap.innerHTML = ''; wrap.appendChild(canvas); badgeCanvas = canvas
  } catch(e) { wrap.innerHTML=`<div style="color:red;font-size:13px;">Error: ${e.message}</div>` }
}
async function drawBadge(canvas, d) {
  const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
  try { const img = await loadImg(cfg.templateUrl); ctx.drawImage(img,0,0,canvas.width,canvas.height) } catch(e){}
  drawText(ctx, d.fullName, cfg.name); drawText(ctx, d.role, cfg.role); drawText(ctx, d.districtName, cfg.district); drawText(ctx, d.churchName, cfg.church)
  const qrc = document.createElement('canvas'), lib = window.QRCode||window.qrcode; await lib.toCanvas(qrc, encodeQR(d.role, d.id), {width:cfg.qr.size, margin:1}); ctx.drawImage(qrc, cfg.qr.x, cfg.qr.y, cfg.qr.size, cfg.qr.size)
}
function drawText(ctx, t='', f) { ctx.save(); const w=f.fontWeight==='bold'?700:400, s=f.fontStyle==='italic'?'italic ':''; ctx.font=`${s}${w} ${f.fontSize}px "Public Sans", Arial, sans-serif`; ctx.fillStyle=f.color; ctx.fillText(t, f.x, f.y); ctx.restore() }
function loadImg(src) { return new Promise((res, rej) => { const img = new Image(); img.crossOrigin='anonymous'; img.onload=()=>res(img); img.onerror=rej; img.src=src }) }
function renderDelegateList() {
  const el = document.getElementById('delegate-list'), cnt = document.getElementById('delegate-count'); if(cnt) cnt.textContent = `${filteredDelegates.length} results`
  if(!el) return; if(!filteredDelegates.length){ el.innerHTML=`<div style="padding:40px 10px;text-align:center;color:var(--text-4)">No matches.</div>`; return }
  el.innerHTML = filteredDelegates.map(d => renderDelCard(d)).join('')
}
function renderDelCard(d) {
  const c = getDistColor(d.districtName), sel = selectedDelegate?.id===d.id && selectedDelegate?.role===d.role
  const ini = (d.fullName||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  let sub = d.districtName||''; if(d.role==='WIFE') sub=`Spouse of ${d.pastorName||'Pastor'}`; if(d.role==='DISCIPLE') sub=`Under ${d.pastorName||'Pastor'}`
  return `<button type="button" class="del-card ${sel?'sel':''}" data-id="${d.id}" data-role="${d.role}" style="--district-color:${c}" onclick="selectDelegate('${d.id}','${d.role}')"><div class="del-av" style="background:${c}">${ini}</div><div class="del-info"><div class="del-name">${esc(d.fullName)}</div><div class="del-sub">${esc(sub)}</div></div><span class="del-role-tag tag-${d.role.toLowerCase()}">${d.role}</span></button>`
}
function getDistColor(n) { const nm=(n||'').trim().toLowerCase(), m=nm.match(/(\d+)/); if(nm.includes('palawan')) return DISTRICT_COLORS['Palawan']; if(m && DISTRICT_COLORS[`District ${m[1]}`]) return DISTRICT_COLORS[`District ${m[1]}`]; return DISTRICT_COLORS[n]||'#94a3b8' }
const DISTRICT_COLORS = { 'District 1':'#6FA4A1', 'District 2':'#8A72A4', 'District 3':'#E3A3A2', 'District 4':'#DC8D38', 'District 5':'#C0C0C0', 'District 6':'#CF4A49', 'District 7':'#406845', 'District 8':'#3D539C', 'District 9':'#E5DE5F', 'Palawan':'#DCDCDC' }
function renderTools() {
  const b = document.getElementById('editor-fields-body'); if(!b) return
  if(!b.querySelector('.editor-toolbar')){ b.innerHTML=`<div class="editor-toolbar"><div class="editor-sel-wrap" id="f-sel-box"></div><div class="editor-prop-wrap" id="editor-properties-body"></div></div>`; selFieldEditor = createSearchSelect(document.getElementById('f-sel-box'), [{value:'name',label:'Name'},{value:'role',label:'Role'},{value:'district',label:'District'},{value:'church',label:'Church'},{value:'qr',label:'QR'}], 'Select...', (v)=>{ if(v){activeFieldKey=v;renderTools()} }); selFieldEditor.setValue(activeFieldKey) }
  const p = document.getElementById('editor-properties-body'), f = cfg[activeFieldKey]
  if(activeFieldKey==='qr') p.innerHTML = `<div class="prop-item"><div class="prop-label">X</div><input type="number" value="${f.x}" oninput="cfg.qr.x=+this.value;saveConfig();renderBadge()" /></div><div class="prop-item"><div class="prop-label">Y</div><input type="number" value="${f.y}" oninput="cfg.qr.y=+this.value;saveConfig();renderBadge()" /></div><div class="prop-item"><div class="prop-label">Size</div><input type="number" value="${f.size}" oninput="cfg.qr.size=+this.value;saveConfig();renderBadge()" /></div>`
  else p.innerHTML=`<div class="prop-item"><div class="prop-label">X</div><input type="number" value="${f.x}" oninput="cfg.${activeFieldKey}.x=+this.value;saveConfig();renderBadge()" /></div><div class="prop-item"><div class="prop-label">Y</div><input type="number" value="${f.y}" oninput="cfg.${activeFieldKey}.y=+this.value;saveConfig();renderBadge()" /></div><div class="prop-item"><div class="prop-label">Size</div><input type="number" value="${f.fontSize}" oninput="cfg.${activeFieldKey}.fontSize=+this.value;saveConfig();renderBadge()" /></div><div class="prop-item"><div class="prop-label">Color</div><input type="color" value="${f.color}" onchange="cfg.${activeFieldKey}.color=this.value;saveConfig();renderBadge()" /></div>`
}
function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') }