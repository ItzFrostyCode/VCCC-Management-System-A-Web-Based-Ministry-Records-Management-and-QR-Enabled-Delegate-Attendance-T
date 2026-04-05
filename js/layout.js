import { authService } from './services/auth.service.js';
import { ui } from './utils/ui.js';
import { events } from './utils/events.js';

/**
 * Layout Manager
 * Centralizes the application shell (Sidebar, Topbar, Mobile Nav)
 * to eliminate HTML duplication.
 */

const SIDEBAR_TEMPLATE = `
  <aside class="sidebar" id="app-sidebar">
    <div class="sidebar-top">
      <a href="/index.html" class="sidebar-logo">
        <img src="assets/VCCC-Logo.png" class="sidebar-logo-img" alt="VCCC Logo" />
      </a>
    </div>
    


    <nav class="sidebar-nav">
      <!-- People -->
      <a href="/index.html"       class="nav-item" data-page="dashboard"   data-tip="Dashboard"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg></a>
      <a href="/pastors.html"     class="nav-item" data-page="pastors"     data-tip="Pastors"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/><path d="M21 21v-2a4 4 0 0 0-3-3.87"/></svg></a>
      <a href="/disciples.html"   class="nav-item" data-page="disciples"   data-tip="Disciples"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20v-2a8 8 0 0 1 16 0v2"/></svg></a>
      
      <!-- Church Org -->
      <div class="sidebar-divider"></div>
      <a href="/church.html"      class="nav-item" data-page="church"      data-tip="Churches"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></a>
      <a href="/district.html"    class="nav-item" data-page="district"    data-tip="Districts"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></a>
      
      <!-- Events -->
      <div class="sidebar-divider"></div>
      <a href="/conferences.html" class="nav-item" data-page="conferences" data-tip="Conferences"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></a>
      <a href="/badges.html"      class="nav-item" data-page="badges"      data-tip="Badges"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg></a>
      <a href="/scanner.html"     class="nav-item" data-page="scanner"     data-tip="Scanner"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg></a>
      
      <!-- Data -->
      <div class="sidebar-divider"></div>
      <a href="/admin_logs.html"  class="nav-item admin-only" data-page="logs" data-tip="Activity Logs"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg></a>
    </nav>
    <div class="sidebar-bottom">
      <div class="sidebar-divider"></div>
      <button class="nav-item" id="btn-logout-sidebar" data-tip="Sign Out" style="cursor:pointer; background:none; border:none; width:100%; text-align:left;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
      </button>
    </div>
  </aside>
`;

const TOPBAR_TEMPLATE = (title) => `
  <div class="topbar-hamburger-mount"></div>
  <div class="topbar-title">${title}</div>
  <div class="topbar-actions-mount" style="margin-left: auto;"></div>
`;

const MOBILE_DRAWER_TEMPLATE = `
  <div class="mob-nav-overlay" id="mob-nav-overlay"></div>
  <div class="mob-nav-drawer" id="mob-nav-drawer">
    <div class="mob-nav-head">
      <img src="/assets/VCCC-Logo.png" class="mob-nav-logo" alt="Logo">
      <button class="mob-nav-close" id="mob-nav-close">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="mob-nav-body">
      <!-- Injected by initLayout -->
      <div id="mob-nav-links-mount"></div>
    </div>
    <div class="mob-nav-foot">
      <button class="mob-nav-link" id="mob-logout-btn" style="width:100%; border:none; background:none; cursor:pointer; color:var(--text-2);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Sign Out
      </button>
    </div>
  </div>
`;

const BOTTOM_NAV_TEMPLATE = `
  <nav class="bottom-nav">
    <a href="/index.html"   class="bottom-nav-item" data-page="dashboard">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      <span>Home</span>
    </a>
    <a href="/pastors.html" class="bottom-nav-item" data-page="pastors">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
      <span>Pastors</span>
    </a>
    <a href="/church.html"  class="bottom-nav-item" data-page="church">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Churches</span>
    </a>
    <a href="/scanner.html" class="bottom-nav-item" data-page="scanner">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
      <span>Scan</span>
    </a>
  </nav>
`;

export function initLayout(title) {
  const shell = document.querySelector('.app-shell');
  if (!shell) return;

  // Restore original sidebar logic without auto-collapse forcing
  if (shell) {
    shell.classList.remove('sidebar-collapsed');
    localStorage.removeItem('vccc_sidebar_collapsed');
  }

  const user = authService.getCurrentUser();
  const isAdmin = user && user.role === 'Admin';

  // 1. Clean up existing hardcoded layouts to prevent duplication
  const existingSidebar = document.querySelector('.sidebar');
  if (existingSidebar) existingSidebar.remove();

  const existingDrawer = document.querySelector('.mob-nav-drawer');
  const existingOverlay = document.querySelector('.mob-nav-overlay');
  const existingBottomNav = document.querySelector('.bottom-nav');
  if (existingDrawer) existingDrawer.remove();
  if (existingOverlay) existingOverlay.remove();
  if (existingBottomNav) existingBottomNav.remove();

  // 2. Inject Sidebar
  shell.insertAdjacentHTML('afterbegin', SIDEBAR_TEMPLATE);

  // 3. Inject Topbar
  const appMain = document.querySelector('.app-main');
  const existingTopbar = document.querySelector('.topbar');
  if (appMain) {
    if (existingTopbar) {
      existingTopbar.innerHTML = TOPBAR_TEMPLATE(title);
    } else {
      const header = document.createElement('header');
      header.className = 'topbar';
      header.innerHTML = TOPBAR_TEMPLATE(title);
      appMain.prepend(header);
    }
  }

  // 3. Setup Mobile Navigation
  document.body.insertAdjacentHTML('beforeend', MOBILE_DRAWER_TEMPLATE);
  document.body.insertAdjacentHTML('beforeend', BOTTOM_NAV_TEMPLATE);
  setupMobileMechanics();

  // 4. PWA Registration
  registerPWA();

  // 4. Highlight & Permissions
  highlightNav();
  window._highlightNavFunc = highlightNav;
  if (!isAdmin) {
    document.querySelectorAll('.admin-only').forEach(el => el.remove());
  }

  // 5. Global Utilities
  window.ui = ui;
  window.events = events;

  // 6. Inject UI CSS if missing
  if (!document.querySelector('link[href*="css/ui.css"]')) {
     const link = document.createElement('link');
     link.rel = 'stylesheet';
     link.href = 'css/ui.css';
     document.head.appendChild(link);
  }




  // 10. Bind Logout
  bindLogout();

}



function setupMobileMechanics() {
  const topbar = document.querySelector('.topbar');
  const mount = document.querySelector('.topbar-hamburger-mount');
  if (!mount) return;

  const hamburger = document.createElement('button');
  hamburger.className = 'topbar-hamburger';
  hamburger.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>`;
  
  hamburger.onclick = () => {
    document.getElementById('mob-nav-overlay').classList.add('open');
    document.getElementById('mob-nav-drawer').classList.add('open');
  };
  mount.appendChild(hamburger);

  // Sync mobile links with desktop sidebar links
  const mobMount = document.getElementById('mob-nav-links-mount');
  const sidebarLinks = document.querySelectorAll('.sidebar-nav .nav-item, .sidebar-nav .sidebar-divider, .sidebar-nav div[style*="font-size:10px"]');
  
  sidebarLinks.forEach(link => {
    if (link.classList.contains('sidebar-divider')) {
      mobMount.insertAdjacentHTML('beforeend', '<div style="height:1px; background:var(--border); margin:6px 8px; opacity:0.6;"></div>');
    } else if (link.tagName === 'A') {
      const mobLink = link.cloneNode(true);
      mobLink.className = 'mob-nav-link';
      
      const labelText = mobLink.getAttribute('data-tip');
      if (labelText) {
          const labelSpan = document.createElement('span');
          labelSpan.textContent = labelText;
          mobLink.appendChild(labelSpan);
      }
      
      mobMount.appendChild(mobLink);
    } else {
      // It's a text label
      const mobLabel = link.cloneNode(true);
      mobMount.appendChild(mobLabel);
    }
  });

  const close = () => {
    document.getElementById('mob-nav-overlay').classList.remove('open');
    document.getElementById('mob-nav-drawer').classList.remove('open');
  };
  document.getElementById('mob-nav-close').onclick = close;
  document.getElementById('mob-nav-overlay').onclick = close;
}

function highlightNav() {
  const path = window.location.pathname;
  document.querySelectorAll('.nav-item[data-page], .mob-nav-link[data-page], .bottom-nav-item[data-page]').forEach(el => {
    const page = el.getAttribute('data-page');
    const isActive =
      (page === 'dashboard' && (path === '/' || path.endsWith('index.html') || path === '')) ||
      (page !== 'dashboard' && page && path.includes(page));
    el.classList.toggle('active', isActive);
  });
}

function registerPWA() {
  // Inject manifest if missing
  if (!document.querySelector('link[rel="manifest"]')) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = '/manifest.json';
    document.head.appendChild(link);
  }

  // Register Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('VCCC-MS: Mobile Hub Active'))
      .catch(err => console.warn('VCCC-MS: SW registration failed', err));
  }
}

function bindLogout() {
  const handleLogout = async () => {
    await authService.signOut();
    window.location.href = '/login.html';
  };

  const btnSidebar = document.getElementById('btn-logout-sidebar');
  const btnMobile = document.getElementById('mob-logout-btn');
  
  if (btnSidebar) btnSidebar.onclick = handleLogout;
  if (btnMobile)  btnMobile.onclick  = handleLogout;
}
