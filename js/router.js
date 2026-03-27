function highlightNav() {
  const path = window.location.pathname
  // Sidebar items
  document.querySelectorAll('.nav-item[data-page], .mob-nav-link[data-page]').forEach(el => {
    const page = el.getAttribute('data-page')
    const isActive =
      (page === 'dashboard' && (path === '/' || path.endsWith('index.html') || path === '')) ||
      (page !== 'dashboard' && path.includes(page))
    el.classList.toggle('active', isActive)
  })
}

function injectMobileNav() {
  const topbar = document.querySelector('.topbar')
  if (!topbar) return // Only for standard layout pages

  // 1. Add hamburger to topbar
  const hamburger = document.createElement('button')
  hamburger.className = 'topbar-hamburger'
  hamburger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`
  hamburger.onclick = () => {
    document.getElementById('mob-nav-overlay').classList.add('open')
    document.getElementById('mob-nav-drawer').classList.add('open')
  }
  topbar.prepend(hamburger)

  // 2. Create Drawer HTML
  const drawerHtml = `
    <div class="mob-nav-overlay" id="mob-nav-overlay"></div>
    <div class="mob-nav-drawer" id="mob-nav-drawer">
      <div class="mob-nav-head">
        <img src="/assets/VCCC-Logo.png" class="mob-nav-logo" alt="Logo">
        <button class="mob-nav-close" id="mob-nav-close">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div class="mob-nav-body">

        <!-- People -->
        <a href="/index.html" class="mob-nav-link" data-page="dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
          Dashboard
        </a>
        <a href="/pastors.html" class="mob-nav-link" data-page="pastors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
          Pastors
        </a>
        <a href="/disciples.html" class="mob-nav-link" data-page="disciples">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/></svg>
          Disciples
        </a>

        <!-- Church Org -->
        <div style="height:1px; background:var(--border); margin:6px 8px; opacity:0.6;"></div>
        <div style="padding:4px 16px 2px; font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.06em;">Church Org</div>
        <a href="/church.html" class="mob-nav-link" data-page="church">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          Church
        </a>
        <a href="/assignment.html" class="mob-nav-link" data-page="assignment">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/></svg>
          Assignment
        </a>
        <a href="/district.html" class="mob-nav-link" data-page="district">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          District
        </a>

        <!-- Events -->
        <div style="height:1px; background:var(--border); margin:6px 8px; opacity:0.6;"></div>
        <div style="padding:4px 16px 2px; font-size:10px; font-weight:700; color:var(--text-3); text-transform:uppercase; letter-spacing:.06em;">Events</div>
        <a href="/conferences.html" class="mob-nav-link" data-page="conferences">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Conferences
        </a>
        <a href="/badges.html" class="mob-nav-link" data-page="badges">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>
          Badges
        </a>
        <a href="/scanner.html" class="mob-nav-link" data-page="scanner">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
          Scanner
        </a>

        <!-- Data -->
        <div style="height:1px; background:var(--border); margin:6px 8px; opacity:0.6;"></div>
        <a href="/admin_logs.html" class="mob-nav-link admin-only" data-page="logs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          Activity Logs
        </a>

      </div>
      <div class="mob-nav-foot">
        <button class="mob-nav-link" style="width:100%; border:none; background:none; cursor:pointer; color:var(--text-2);" onclick="if(typeof authService !== 'undefined') authService.signOut().then(() => window.location.href='/login.html')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign Out
        </button>
      </div>
    </div>
  `
  document.body.insertAdjacentHTML('beforeend', drawerHtml)

  // 3. Bind Close events
  const close = () => {
    document.getElementById('mob-nav-overlay').classList.remove('open')
    document.getElementById('mob-nav-drawer').classList.remove('open')
  }
  document.getElementById('mob-nav-close').onclick = close
  document.getElementById('mob-nav-overlay').onclick = close

  // Re-run highlight to catch the new mobile links
  highlightNav()
}

document.addEventListener('DOMContentLoaded', () => {
  highlightNav()
  injectMobileNav()
})