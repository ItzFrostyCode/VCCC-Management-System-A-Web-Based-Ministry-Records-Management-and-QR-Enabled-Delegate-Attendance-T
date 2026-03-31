import { requireAuth } from '../supabase.js';
import { authService } from '../services/auth.service.js';
import { districtService } from '../services/district.service.js';
import { churchService } from '../services/church.service.js';
import { pastorService } from '../services/pastor.service.js';
import { discipleService } from '../services/disciple.service.js';
import { highlightNav, injectMobileNav } from '../router.js';
import { initGuide } from '../utils/guide.js';
import { esc, createSearchSelect, encodeQR } from '../utils/helper.js';

// State Variables
let allDelegates = [], filteredDelegates = [], selectedDelegate = null
let filterDistVal = null, filterChurchVal = null
let activeRoles = new Set(['PASTOR','WIFE','DISCIPLE'])
let activeFieldKey = 'name', selFieldEditor = null, selFilterDist, selFilterChurch
let badgeCanvas = null
let districts = [], churches = []
let DISTRICT_COLORS = {}

// Modal State
let modalPickedIds = new Set() 
let modalDistrictsMulti = [], modalChurchesMulti = []
let modalSearchQuery = ''

// Config
const CONFIG_KEY = 'momentum_badge_config_v1'
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

let cfg = getConfig(); 
function getConfig(){ try{ let s=JSON.parse(localStorage.getItem(CONFIG_KEY))||{}, m={...DEFAULT_CONFIG}; Object.keys(DEFAULT_CONFIG).forEach(k=>{ if(s[k]) m[k]=typeof s[k]==='object'?{...DEFAULT_CONFIG[k],...s[k]}:s[k] }); return m }catch{ return {...DEFAULT_CONFIG} } }
function saveConfig(){ localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)) }

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Badges: DOMContentLoaded start')
    // Global error handler for UI
    window.onerror = function(msg, url, line) {
        console.error('GLOBAL ERROR:', msg, 'at', url, ':', line)
        const status = document.getElementById('delegate-count-status')
        if (status) status.innerHTML = `<span style="color:var(--red);"><strong>Script Error:</strong> ${msg}</span>`
    }

    try {
        console.log('Badges: auth check...')
        await requireAuth()
        console.log('Badges: nav/guide init...')
        highlightNav()
        injectMobileNav()
        initGuide()

        console.log('Badges: fetching data...')
        const [dRes, cRes, pastors, disciples] = await Promise.all([ 
            districtService.fetchAll(), 
            churchService.fetchAll(), 
            pastorService.fetchAll(), 
            discipleService.fetchAll() 
        ])
        console.log('Badges: fetch success', { d: !!dRes, c: !!cRes, p: !!pastors, ds: !!disciples })
        districts = dRes || []; churches = cRes || []
        
        districts.forEach(d => {
            if (d.theme_color) DISTRICT_COLORS[d.district_name?.trim().toUpperCase()] = d.theme_color
        })

        const distMap = {}, churchMap = {}
        districts.forEach(d => distMap[d.id] = d.district_name)
        churches.forEach(c => churchMap[c.id] = { name: c.church_name, distId: c.district_id })

        allDelegates = []
        if (pastors) {
          pastors.forEach(p => {
             try {
                // V3 RPC (get_pastors_v3) already provides denormalized names
                const dn = p.district_name || 'No District'
                const cn = p.church_name || 'No Church'
                
                allDelegates.push({ 
                    id: p.id, 
                    fullName: p.full_name, 
                    role: 'PASTOR', 
                    districtId: p.district_id, 
                    districtName: dn, 
                    churchId: p.church_id, 
                    churchName: cn, 
                    imageUrl: p.pastor_image_url 
                })
                
                if (p.wife_name) {
                    allDelegates.push({ 
                        id: p.id, 
                        fullName: p.wife_name, 
                        role: 'WIFE', 
                        districtId: p.district_id, 
                        districtName: dn, 
                        churchId: p.church_id, 
                        churchName: cn, 
                        pastorName: p.full_name, 
                        imageUrl: p.wife_image_url 
                    })
                }
             } catch (e) { console.error('Error mapping pastor for badge:', p.id, e) }
          })
        }
        
        if (disciples) {
          disciples.forEach(d => {
             try {
                // V3 RPC (get_disciples_v3) already provides denormalized names
                allDelegates.push({ 
                    id: d.id, 
                    fullName: d.full_name, 
                    role: 'DISCIPLE', 
                    districtId: d.district_id, 
                    districtName: d.district_name || 'No District', 
                    churchId: d.church_id, 
                    churchName: d.church_name || 'No Church', 
                    imageUrl: d.disciple_image_url || null 
                })
             } catch (e) { console.error('Error mapping disciple for badge:', d.id, e) }
          })
        }

        const distEl = document.getElementById('filter-district-badge'), churchEl = document.getElementById('filter-church-badge')
        if (distEl) selFilterDist = createSearchSelect(distEl, districts.map(d => ({ value:d.id, label:d.district_name })), 'District', (v) => { 
            filterDistVal = v||null; filterChurchVal = null; 
            const fc = churches.filter(c => !filterDistVal || c.district_id === filterDistVal); 
            if(selFilterChurch){ 
                selFilterChurch.setOptions([{value:'',label:'All churches'}, ...fc.map(c=>({value:c.id,label:c.church_name}))]); 
                selFilterChurch.reset() 
            } 
            applyFilters() 
        })
        if (churchEl) selFilterChurch = createSearchSelect(churchEl, [{ value:'', label:'All churches' }, ...churches.map(c => ({ value:c.id, label:c.church_name }))], 'All churches', (v) => { 
            filterChurchVal = v||null; 
            applyFilters() 
        })

        applyFilters(); 
        renderTools();
        bindEvents();
        if (window.innerWidth <= 640) switchTab('delegates')
    } catch (err) { 
        console.error('Init failed:', err)
        const status = document.getElementById('delegate-count-status')
        if (status) status.innerHTML = `<span style="color:var(--red);"><strong>Initialization Error:</strong> ${esc(err.message)}</span>`
        const wrap = document.getElementById('badge-preview-wrap')
        if (wrap) wrap.innerHTML = `<div class="no-selection"><p style="color:red; max-width:400px; text-align:center;">Init Error: ${esc(err.stack || err.message)}</p></div>`
    }
})

// ── UI Events ──────────────────────────────────────────────
function bindEvents() {
    const btnLogout = document.getElementById('btn-logout')
    if (btnLogout) {
        btnLogout.onclick = async () => {
            await authService.signOut()
            window.location.href = '/login.html'
        }
    }

    document.getElementById('search-delegate').oninput = applyFilters
    
    document.getElementById('chip-pastor').onclick = (e) => toggleRole(e.currentTarget)
    document.getElementById('chip-wife').onclick = (e) => toggleRole(e.currentTarget)
    document.getElementById('chip-disciple').onclick = (e) => toggleRole(e.currentTarget)

    document.getElementById('btn-export-all').onclick = openDownloadModal
    document.getElementById('btn-close-download-modal').onclick = closeDownloadModal
    document.getElementById('btn-close-backdrop').onclick = closeDownloadModal
    document.getElementById('btn-cancel-download').onclick = closeDownloadModal
    document.getElementById('btn-modal-generate').onclick = startExportFromModal

    document.getElementById('btn-download-jpg').onclick = downloadSingle
    document.getElementById('btn-print-badge').onclick = printBadge

    document.getElementById('btn-tab-delegates').onclick = () => switchTab('delegates')
    document.getElementById('btn-tab-preview').onclick = () => switchTab('preview')
    
    document.getElementById('export-modal-cancel').onclick = cancelExport
}

// ── Modal UI Logic ───────────────────────────────────────────
function openDownloadModal(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const modal = document.getElementById('modal-download')
  if (!modal) return
  
  modalPickedIds.clear()
  modalSearchQuery = ''
  modalDistrictsMulti = []
  modalChurchesMulti = []
  
  modal.style.display = 'flex'
  renderModalContent()
}

function closeDownloadModal(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  const modal = document.getElementById('modal-download')
  if (modal) modal.style.display = 'none'
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
      <div class="modal-section" style="margin-top:0;">
        <div class="modal-section-title">Quick Export</div>
        <div class="modal-grid-btns">
          <div class="modal-action-card mini" id="btn-export-quick-all">
            <div class="modal-action-title">All Badges (${allDelegates.length})</div>
          </div>
          <div class="modal-action-card mini" id="btn-export-quick-filtered">
            <div class="modal-action-title">Current Filters (${filteredDelegates.length})</div>
          </div>
        </div>
      </div>

      <div style="margin: 24px 0; border-top: 1.5px solid var(--border); position:relative;">
        <span style="position:absolute; top:-10px; left:50%; transform:translateX(-50%); background:#fff; padding:0 12px; font-size:11px; color:var(--text-4); font-weight:800;">OR FILTER SPECIFICALLY</span>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Select Districts (${modalDistrictsMulti.length} picked)</div>
        <div class="modal-search-box">
          <input type="text" id="modal-search-dist" placeholder="Search districts..." value="${esc(window.modalDistQuery||'')}" />
        </div>
        <div class="modal-picker-list" id="modal-dist-list" style="max-height:120px;">
          ${distList.map(d => {
            const isSel = modalDistrictsMulti.includes(d.id)
            return `<div class="modal-picker-item" data-type="dist" data-id="${d.id}">
              <input type="checkbox" class="modal-picker-cb" ${isSel?'checked':''} />
              <div class="modal-picker-name">${esc(d.district_name)}</div>
            </div>`
          }).join('')}
        </div>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">Select Churches (${modalChurchesMulti.length} picked)</div>
        <div class="modal-search-box">
          <input type="text" id="modal-search-chur" placeholder="Search churches..." value="${esc(window.modalChurQuery||'')}" />
        </div>
        <div class="modal-picker-list" id="modal-chur-list" style="max-height:160px;">
          ${churList.map(c => {
            const isSel = modalChurchesMulti.includes(c.id)
            return `<div class="modal-picker-item" data-type="chur" data-id="${c.id}">
              <input type="checkbox" class="modal-picker-cb" ${isSel?'checked':''} />
              <div class="modal-picker-name">${esc(c.church_name)}</div>
            </div>`
          }).join('')}
        </div>
      </div>

      <div class="modal-section" style="margin-bottom:0;">
        <div class="modal-section-title">Pick Individuals (${modalPickedIds.size} picked)</div>
        <div class="modal-search-box">
          <input type="text" id="modal-search-ind" placeholder="Search by name..." value="${esc(modalSearchQuery)}" />
        </div>
        <div class="modal-picker-list" id="modal-ind-list" style="max-height:160px;">
          ${indList.map(d => {
            const pk = `${d.role}_${d.id}`, isPicked = modalPickedIds.has(pk)
            return `<div class="modal-picker-item" data-id="${d.id}" data-role="${d.role}">
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

  document.getElementById('btn-export-quick-all').onclick = () => startExport('all')
  document.getElementById('btn-export-quick-filtered').onclick = () => startExport('filtered')
  
  const distInp = document.getElementById('modal-search-dist')
  distInp.oninput = () => { window.modalDistQuery = distInp.value; renderModalContent() }
  
  const churInp = document.getElementById('modal-search-chur')
  churInp.oninput = () => { window.modalChurQuery = churInp.value; renderModalContent() }

  const indInp = document.getElementById('modal-search-ind')
  indInp.oninput = () => { modalSearchQuery = indInp.value; renderModalContent() }

  document.querySelectorAll('#modal-dist-list .modal-picker-item').forEach(item => {
      item.onclick = () => toggleAdvancedPick('dist', item.dataset.id)
  })
  document.querySelectorAll('#modal-chur-list .modal-picker-item').forEach(item => {
      item.onclick = () => toggleAdvancedPick('chur', item.dataset.id)
  })
  document.querySelectorAll('#modal-ind-list .modal-picker-item').forEach(item => {
      item.onclick = () => toggleModalPick(item.dataset.id, item.dataset.role)
  })
}

function toggleAdvancedPick(type, id) {
  if (type === 'dist') {
    if (modalDistrictsMulti.includes(id)) modalDistrictsMulti = modalDistrictsMulti.filter(x => x !== id)
    else modalDistrictsMulti.push(id)
  } else {
    if (modalChurchesMulti.includes(id)) modalChurchesMulti = modalChurchesMulti.filter(x => x !== id)
    else modalChurchesMulti.push(id)
  }
  renderModalContent()
}

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

// ── Export Engine (Cancellable) ─────────────────────────────
let _exportCancelled = false;
function cancelExport() { _exportCancelled = true; const lab = document.getElementById('export-modal-label'); if (lab) lab.textContent = 'Cancelling...'; }

async function executeBatchDownload(targets, zipName) {
  _exportCancelled = false;
  const modal    = document.getElementById('modal-export-progress');
  const fill     = document.getElementById('export-modal-fill');
  const lab      = document.getElementById('export-modal-label');
  const per      = document.getElementById('export-modal-percent');
  const footer   = document.getElementById('export-modal-footer');
  const cancelBtn= document.getElementById('export-modal-cancel');
  const spinner  = document.getElementById('export-modal-spinner');
  const titleEl  = document.getElementById('export-modal-title');
  
  if (modal) {
    modal.style.display = 'flex';
    if (footer) footer.style.display = 'none';
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';
    if (fill) fill.style.width = '0%';
    if (per) per.textContent = '0%';
    if (lab) lab.textContent = 'Initializing...';
    if (spinner) spinner.style.animation = 'spin 2s linear infinite';
    if (titleEl) titleEl.textContent = 'Generating Badges';
  }

  const zip = new window.JSZip();
  const safe = s => (s||'').replace(/[/\\?%*:|"<>]/g, '_').trim();
  
  try {
    const templateImg = await loadImg(cfg.templateUrl);
    for (let i = 0; i < targets.length; i++) {
      if (_exportCancelled) {
        if (spinner) spinner.style.animation = 'none';
        if (titleEl) titleEl.textContent = 'Export Cancelled';
        if (lab) lab.textContent = 'No files were downloaded.';
        if (per) per.textContent = '';
        if (cancelBtn) cancelBtn.style.display = 'none';
        if (footer) footer.style.display = 'flex';
        return;
      }
      const d = targets[i];
      const canvas = document.createElement('canvas');
      canvas.width = cfg.canvasWidth;
      canvas.height = cfg.canvasHeight;
      await drawBadge(canvas, d, templateImg);
      const path = `${safe(d.districtName)}/${safe(d.churchName)}/${d.role==='DISCIPLE'?'Disciples/':''}${d.role}_${safe(d.fullName)}.jpg`;
      zip.file(path, canvas.toDataURL('image/jpeg', 0.92).split(',')[1], {base64:true});
      const pct = Math.round(((i+1)/targets.length) * 100);
      if (fill) fill.style.width = pct + '%';
      if (per) per.textContent = pct + '%';
      if (lab) lab.textContent = `Rendering ${i+1}/${targets.length}: ${d.fullName}`;
      if (i % 8 === 0) await new Promise(r => setTimeout(r, 0));
    }
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (lab) lab.textContent = 'Finalizing ZIP...';
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = zipName;
    a.click();
    if (spinner) spinner.style.animation = 'none';
    if (titleEl) titleEl.textContent = 'Export Complete ✓';
    if (lab) lab.textContent = 'Your ZIP file has been downloaded.';
    if (per) per.textContent = '100%';
    if (footer) footer.style.display = 'flex';
  } catch (err) { 
    console.error('Export Error', err);
    alert('Export Failed: ' + err.message);
    if (modal) modal.style.display = 'none';
  }
}

// ── Rendering & Drawing ──────────────────────────────────────
async function renderBadge() {
  if (!selectedDelegate) return
  const wrap = document.getElementById('badge-preview-wrap'); 
  wrap.innerHTML = '<div style="font-size:13px;color:var(--text-3);">Rendering...</div>'
  try {
    if (document.fonts) await document.fonts.ready;
    
    const canvas = document.createElement('canvas'); 
    canvas.width = cfg.canvasWidth; 
    canvas.height = cfg.canvasHeight; 
    
    // Responsive styling for the preview canvas
    canvas.style.maxWidth = '100%'; 
    canvas.style.height = 'auto'; 
    canvas.style.display = 'block'; 
    canvas.style.margin = '0 auto';
    canvas.style.boxShadow = '0 10px 40px rgba(0,0,0,0.2)';
    
    await drawBadge(canvas, selectedDelegate); 
    wrap.innerHTML = ''; 
    wrap.appendChild(canvas); 
    badgeCanvas = canvas
  } catch(e) { 
    console.error('renderBadge failed:', e);
    wrap.innerHTML=`<div style="color:red;font-size:13px;">Error: ${e.message}</div>` 
  }
}

async function drawBadge(canvas, d, preLoadedTemplate = null) {
  const ctx = canvas.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height)
  try { 
    const img = preLoadedTemplate || await loadImg(cfg.templateUrl); 
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
  } catch(e){}

  if (cfg.profile && cfg.profile.enabled && d.imageUrl) {
    try {
      const pImg = await loadImg(d.imageUrl);
      ctx.drawImage(pImg, cfg.profile.x, cfg.profile.y, cfg.profile.size, cfg.profile.size);
    } catch(err) { console.error('Profile image load failed', err); }
  }

  if (cfg.name.enabled !== false) drawText(ctx, d.fullName, cfg.name); 
  if (cfg.role.enabled !== false) drawText(ctx, d.role, cfg.role); 
  if (cfg.district.enabled !== false) drawText(ctx, d.districtName, cfg.district); 
  if (cfg.church.enabled !== false) drawText(ctx, d.churchName, cfg.church)
  
  if (cfg.qr.enabled !== false) {
    const qrc = document.createElement('canvas')
    const lib = window.QRCode || window.qrcode

    if (!lib) throw new Error('QR Code library not loaded')

    await lib.toCanvas(qrc, encodeQR(d.role, d.id), {
      width: cfg.qr.size,
      margin: 1
    })

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
  let effectiveMaxWidth = maxWidth;
  if (align === 'left' && (f.x + effectiveMaxWidth > 1030)) effectiveMaxWidth = 1030 - f.x;

  ctx.font = `${style}${weight} ${fSize}px "Public Sans", Arial, sans-serif`;
  while (ctx.measureText(t).width > effectiveMaxWidth && fSize > 8) {
    fSize--;
    ctx.font = `${style}${weight} ${fSize}px "Public Sans", Arial, sans-serif`;
  }

  const tw = ctx.measureText(t).width;
  let drawX = f.x;
  if (align === 'center') { if (drawX - tw/2 < 10) drawX = tw/2 + 10; } 
  else if (align === 'right') { if (drawX - tw < 10) drawX = tw + 10; } 
  else if (align === 'left') { if (drawX < 10) drawX = 10; }

  ctx.fillStyle = f.color; ctx.textAlign = align; ctx.textBaseline = 'top'; 
  ctx.fillText(t, drawX, f.y); ctx.restore() 
}

function loadImg(src) {
  return new Promise((res, rej) => {
    if (!src) return rej(new Error('No image source'))

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => res(img)
    img.onerror = rej
    img.src = src
  })
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

function renderDelegateList() {
  const el = document.getElementById('delegate-list'), cnt = document.getElementById('delegate-count'); 
  if(cnt) cnt.textContent = `${filteredDelegates.length} results`
  if(!el) return; 
  if(!filteredDelegates.length){ el.innerHTML=`<div style="padding:40px 10px;text-align:center;color:var(--text-4)">No matches.</div>`; return }
  el.innerHTML = filteredDelegates.map(d => renderDelCard(d)).join('')
  el.querySelectorAll('.del-card').forEach(card => {
      card.onclick = () => selectDelegate(card.dataset.id, card.dataset.role)
  })
}

function renderDelCard(d) {
  const c = getDistColor(d.districtName), sel = selectedDelegate?.id===d.id && selectedDelegate?.role===d.role
  const ini = (d.fullName||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  let sub = d.districtName||''; 
  if(d.role==='WIFE') sub=`Spouse of ${d.pastorName||'Pastor'}`; 
  if(d.role==='DISCIPLE') sub=d.churchName || 'No Church';
  const avImg = d.imageUrl ? `<img src="${d.imageUrl}" class="del-av-img" />` : `<div class="del-av-fallback">${ini}</div>`
  
  return `
    <button type="button" class="del-card ${sel?'sel':''}" data-id="${d.id}" data-role="${d.role}" style="--district-color:${c}">
      <div class="del-av" style="background:${c}">${avImg}</div>
      <div class="del-info">
        <div class="del-name">${esc(d.fullName)}</div>
        <div class="del-sub">${esc(sub)}</div>
      </div>
      <span class="del-role-tag tag-${d.role.toLowerCase()}">${d.role}</span>
    </button>`
}

function selectDelegate(id, role, scroll = true) {
  selectedDelegate = allDelegates.find(d => d.id === id && d.role === role)
  document.querySelectorAll('.del-card').forEach(c => c.classList.toggle('sel', c.dataset.id === id && c.dataset.role === role))
  if (scroll) {
    const el = document.querySelector(`.del-card.sel`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }
  document.getElementById('canvas-actions').style.display = 'flex'
  renderBadge()
  
  // Auto-switch to preview tab on mobile if user explicitly clicked a card
  if (scroll && window.innerWidth <= 640) {
    switchTab('preview')
  }
}

function getDistColor(n) { 
  const nm = (n || '').trim().toUpperCase()

  if (DISTRICT_COLORS[nm]) return DISTRICT_COLORS[nm]

  const m = nm.match(/(\d+)/)
  if (m) {
    const key1 = `DISTRICT ${m[1]}`
    const key2 = `DIST ${m[1]}`

    if (DISTRICT_COLORS[key1]) return DISTRICT_COLORS[key1]
    if (DISTRICT_COLORS[key2]) return DISTRICT_COLORS[key2]
  }

  return '#94a3b8'
}

// ── Editor Tools ─────────────────────────────────────────────
function renderTools() {
  const b = document.getElementById('editor-fields-body'); if(!b) return
  if(!b.querySelector('.editor-toolbar')){ 
    b.innerHTML=`<div class="editor-toolbar"><div class="editor-sel-wrap" id="f-sel-box"></div><div class="editor-prop-wrap" id="editor-properties-body"></div></div>`; 
    selFieldEditor = createSearchSelect(document.getElementById('f-sel-box'), [
      {value:'name',label:'Name'}, {value:'role',label:'Role'}, {value:'district',label:'District'}, {value:'church',label:'Church'}, {value:'qr',label:'QR'}, {value:'profile',label:'Photo'}, {value:'templates',label:'Bkgd'}
    ], 'Select...', (v)=>{ if(v){activeFieldKey=v;renderTools()} }); 
    if(activeFieldKey) selFieldEditor.setValue(activeFieldKey) 
  }

  const p = document.getElementById('editor-properties-body')
  let propsHtml = '';
  if (activeFieldKey === 'templates') {
    propsHtml = `
      <div class="prop-section-title" style="margin-top:0;">Background Templates</div>
      <div style="margin-bottom:15px;">
        <button class="btn btn-ghost" style="width:100%; height:36px; border:1px dashed var(--border); font-size:12px;" id="btn-tpl-upload-trigger">
          <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Upload Template
        </button>
        <input type="file" id="tpl-upload" accept="image/*" style="display:none;" />
      </div>
      <div class="tpl-grid">
        <div class="tpl-card ${cfg.templateUrl === DEFAULT_CONFIG.templateUrl ? 'active' : ''}" data-url="${DEFAULT_CONFIG.templateUrl}">
           <div class="tpl-thumb" style="background-image:url('${DEFAULT_CONFIG.templateUrl}')"></div>
           <div class="tpl-footer"><span class="tpl-tag">Default</span></div>
        </div>
      </div>`;
  } else {
    const f = cfg[activeFieldKey]
    updateCoordsLabel(f.x, f.y)
    const visibilityHtml = `<div class="prop-item"><div class="prop-label">Visible</div><input type="checkbox" id="field-enabled" ${f.enabled!==false?'checked':''} /></div>`
    if(activeFieldKey==='qr' || activeFieldKey==='profile') {
      propsHtml = visibilityHtml + `
        <div class="prop-item"><div class="prop-label">X</div><input type="number" id="field-x" value="${f.x}" /></div>
        <div class="prop-item"><div class="prop-label">Y</div><input type="number" id="field-y" value="${f.y}" /></div>
        <div class="prop-item"><div class="prop-label">Size</div><input type="number" id="field-size" value="${f.size}" /></div>`
    } else {
      propsHtml = visibilityHtml + `
        <div class="prop-item"><div class="prop-label">X</div><input type="number" id="field-x" value="${f.x}" /></div>
        <div class="prop-item"><div class="prop-label">Y</div><input type="number" id="field-y" value="${f.y}" /></div>
        <div class="prop-item"><div class="prop-label">Size</div><input type="number" id="field-fsize" value="${f.fontSize}" /></div>
        <div class="prop-item"><div class="prop-label">Max Width</div><input type="number" id="field-mw" value="${f.maxWidth||800}" /></div>
        <div class="prop-item"><div class="prop-label">Align</div>
          <select class="input" id="field-align">
            <option value="left" ${f.textAlign==='left'?'selected':''}>Left</option>
            <option value="center" ${f.textAlign==='center'?'selected':''}>Center</option>
            <option value="right" ${f.textAlign==='right'?'selected':''}>Right</option>
          </select>
        </div>
        <div class="prop-item"><div class="prop-label">Color</div><input type="color" id="field-color" value="${f.color}" /></div>`
    }
  }
  if (p) p.innerHTML = propsHtml;
  bindToolEvents()
  renderMobileTools()
}

function bindToolEvents() {
    const p = document.getElementById('editor-properties-body')
    if (!p) return
    
    // Templates
    const tplTrigger = document.getElementById('btn-tpl-upload-trigger')
    if (tplTrigger) tplTrigger.onclick = () => document.getElementById('tpl-upload').click()
    const tplUpload = document.getElementById('tpl-upload')
    if (tplUpload) tplUpload.onchange = (e) => handleTemplateUpload(e.target)
    
    p.querySelectorAll('.tpl-card').forEach(card => {
        card.onclick = () => { cfg.templateUrl = card.dataset.url; saveConfig(); renderBadge(); renderTools(); }
    })

    // Properties
    const f = cfg[activeFieldKey]
    if (!f) return

    const elEnabled = document.getElementById('field-enabled'); if (elEnabled) elEnabled.onchange = (e) => { f.enabled = e.target.checked; saveConfig(); renderBadge(); }
    const elX = document.getElementById('field-x'); if (elX) elX.oninput = (e) => { f.x = +e.target.value; updateCoordsLabel(f.x, f.y); saveConfig(); renderBadge(); }
    const elY = document.getElementById('field-y'); if (elY) elY.oninput = (e) => { f.y = +e.target.value; updateCoordsLabel(f.x, f.y); saveConfig(); renderBadge(); }
    const elSize = document.getElementById('field-size'); if (elSize) elSize.oninput = (e) => { f.size = +e.target.value; saveConfig(); renderBadge(); }
    const elFSize = document.getElementById('field-fsize'); if (elFSize) elFSize.oninput = (e) => { f.fontSize = +e.target.value; saveConfig(); renderBadge(); }
    const elMW = document.getElementById('field-mw'); if (elMW) elMW.oninput = (e) => { f.maxWidth = +e.target.value; saveConfig(); renderBadge(); }
    const elAlign = document.getElementById('field-align'); if (elAlign) elAlign.onchange = (e) => { f.textAlign = e.target.value; saveConfig(); renderBadge(); }
    const elColor = document.getElementById('field-color'); if (elColor) elColor.onchange = (e) => { f.color = e.target.value; saveConfig(); renderBadge(); }
}

function renderMobileTools() {
    const mob = document.getElementById('mobile-mini-editor'); if (!mob) return
    const FIELDS = [
        {value:'name',label:'Name'}, {value:'role',label:'Role'}, {value:'district',label:'Dist'}, {value:'church',label:'Chur'}, {value:'qr',label:'QR'}, {value:'profile',label:'Photo'}, {value:'templates',label:'Bkgd'}
    ]
    const chipBar = FIELDS.map(f => `<button class="qe-chip ${activeFieldKey === f.value ? 'active' : ''}" data-key="${f.value}">${f.label}</button>`).join('')
    
    let bodyHtml = ''
    if (activeFieldKey === 'templates') {
       bodyHtml = `
         <div class="qe-body">
           <div class="qe-templates-note">
             <button class="btn btn-ghost" id="btn-tpl-upload-trigger-mob" style="width:100%; height:36px; border:1px dashed var(--border); font-size:12px;">
               <svg viewBox="0 0 24 24" style="width:14px;height:14px;margin-right:6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
               Upload Background Template
             </button>
           </div>
           <div class="tpl-grid" style="margin-top:0;">
             <div class="tpl-card ${cfg.templateUrl === DEFAULT_CONFIG.templateUrl ? 'active' : ''}" data-url="${DEFAULT_CONFIG.templateUrl}">
                <div class="tpl-thumb" style="background-image:url('${DEFAULT_CONFIG.templateUrl}')"></div>
                <div class="tpl-footer"><span class="tpl-tag">Default</span></div>
             </div>
           </div>
         </div>
       `
    } else {
       const f = cfg[activeFieldKey]
       bodyHtml = `
         <div class="qe-body">
           <div class="qe-toggle-row">
             <span class="qe-toggle-label">Visible</span>
             <label class="switch-mini"><input type="checkbox" id="field-enabled-mob" ${f.enabled!==false?'checked':''} /><span class="slider-mini"></span></label>
           </div>
           <div class="qe-grid">
             <div class="qe-cell"><span class="qe-label">X Pos</span><input type="number" class="qe-input" id="field-x-mob" value="${f.x}" /></div>
             <div class="qe-cell"><span class="qe-label">Y Pos</span><input type="number" class="qe-input" id="field-y-mob" value="${f.y}" /></div>
             ${ (activeFieldKey !== 'qr' && activeFieldKey !== 'profile') ? `
               <div class="qe-cell"><span class="qe-label">Font Size</span><input type="number" class="qe-input" id="field-fsize-mob" value="${f.fontSize}" /></div>
               <div class="qe-cell"><span class="qe-label">Color</span><input type="color" class="qe-input" style="padding:4px;height:38px;border-radius:8px;cursor:pointer;" id="field-color-mob" value="${f.color}" /></div>
               <div class="qe-cell" style="grid-column: 1 / -1;"><span class="qe-label">Align</span>
                 <div class="qe-seg-grp">
                   <button class="qe-seg ${f.textAlign==='left'?'active':''}" data-val="left">Left</button>
                   <button class="qe-seg ${f.textAlign==='center'?'active':''}" data-val="center">Center</button>
                   <button class="qe-seg ${f.textAlign==='right'?'active':''}" data-val="right">Right</button>
                 </div>
               </div>
             ` : `<div class="qe-cell" style="grid-column: 1 / -1;"><span class="qe-label">Scale Size</span><input type="number" class="qe-input" id="field-size-mob" value="${f.size}" /></div>` }
           </div>
         </div>
       `
    }

    mob.innerHTML = `<div class="quick-editor-wrap"><div class="qe-chip-bar">${chipBar}</div>${bodyHtml}</div>`
    
    mob.querySelectorAll('.qe-chip').forEach(btn => {
        btn.onclick = () => { activeFieldKey = btn.dataset.key; renderTools(); }
    })
    
    bindMobileToolEvents()
}

function bindMobileToolEvents() {
    const f = cfg[activeFieldKey]
    if (!f && activeFieldKey !== 'templates') return

    const elEnabled = document.getElementById('field-enabled-mob'); if (elEnabled) elEnabled.onchange = (e) => { f.enabled = e.target.checked; saveConfig(); renderBadge(); }
    const elX = document.getElementById('field-x-mob'); if (elX) elX.oninput = (e) => { f.x = +e.target.value; updateCoordsLabel(f.x, f.y); saveConfig(); renderBadge(); }
    const elY = document.getElementById('field-y-mob'); if (elY) elY.oninput = (e) => { f.y = +e.target.value; updateCoordsLabel(f.x, f.y); saveConfig(); renderBadge(); }
    
    const elFsize = document.getElementById('field-fsize-mob'); if (elFsize) elFsize.oninput = (e) => { f.fontSize = +e.target.value; saveConfig(); renderBadge(); }
    const elColor = document.getElementById('field-color-mob'); if (elColor) elColor.oninput = (e) => { f.color = e.target.value; saveConfig(); renderBadge(); }
    
    const elSize = document.getElementById('field-size-mob'); if (elSize) elSize.oninput = (e) => { f.size = +e.target.value; saveConfig(); renderBadge(); }
    
    document.querySelectorAll('.qe-seg').forEach(btn => {
       btn.onclick = () => { f.textAlign = btn.dataset.val; saveConfig(); renderBadge(); renderTools(); }
    })
    
    const tplTrigger = document.getElementById('btn-tpl-upload-trigger-mob')
    if (tplTrigger) tplTrigger.onclick = () => document.getElementById('tpl-upload').click()
    
    document.querySelectorAll('#mobile-mini-editor .tpl-card').forEach(card => {
        card.onclick = () => { cfg.templateUrl = card.dataset.url; saveConfig(); renderBadge(); renderTools(); }
    })
}

function updateCoordsLabel(x,y) {
  const el = document.getElementById('coords-label')
  if(el) el.textContent = `${activeFieldKey.toUpperCase()} X: ${x}, Y: ${y}`
}

function handleTemplateUpload(input) {
  const file = input.files[0]; if(!file) return
  const reader = new FileReader(); reader.onload = (e) => { cfg.templateUrl = e.target.result; saveConfig(); renderBadge(); renderTools(); }; reader.readAsDataURL(file)
}

// ── Shared Logic ─────────────────────────────────────────────
function switchTab(view) {
  document.querySelector('.slides-panel')?.classList.remove('active')
  document.querySelector('.canvas-workspace')?.classList.remove('active')
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === view))
  if (view === 'delegates') document.querySelector('.slides-panel')?.classList.add('active')
  else if (view === 'preview') { document.querySelector('.canvas-workspace')?.classList.add('active'); renderTools() }
}

function downloadSingle() {
  if (!selectedDelegate || !badgeCanvas) return
  const a = document.createElement('a'); a.href = badgeCanvas.toDataURL('image/jpeg', 0.9); a.download = `${selectedDelegate.role}-${selectedDelegate.fullName.replace(/\s+/g,'_')}.jpg`; a.click()
}

function printBadge() {
  if (!badgeCanvas) return
  const url = badgeCanvas.toDataURL('image/jpeg', 0.9), w = window.open('','_blank'); if(!w){alert('Pop-up blocked!'); return}
  w.document.write(`<html><body style="margin:0;display:flex;align-items:center;justify-content:center;"><img src="${url}" style="width:8.89cm;height:6.35cm;" onload="window.print();window.close();"/></body></html>`)
}