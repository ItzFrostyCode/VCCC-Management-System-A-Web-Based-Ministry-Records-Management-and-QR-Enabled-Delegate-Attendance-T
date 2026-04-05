/**
 * VCCC-MS Service Worker (PWA) — v31 (Modular Architecture Sync)
 * Expanded cache for the new MVC model, controllers, and services.
 */
const CACHE_NAME = 'vccc-ms-v31';

const ASSETS = [
    // Shell HTML
    '/',
    '/index.html',
    '/login.html',
    '/pastors.html',
    '/pastor-view.html',
    '/church.html',
    '/church-view.html',
    '/district.html',
    '/district-view.html',
    '/disciples.html',
    '/conferences.html',
    '/badges.html',
    '/scanner.html',
    '/admin_logs.html',

    // Branding
    '/assets/VCCC-Logo.png',

    // Core CSS
    '/css/app.css',
    '/css/layout.css',
    '/css/components.css',
    '/css/ui.css',
    '/css/pages/login.css',
    '/css/pages/pastor-view.css',

    // Global Utilities & Router
    '/js/supabase.js',
    '/js/layout.js',
    '/js/router.js',
    '/js/utils/ui.js',
    '/js/utils/helper.js',
    '/js/utils/guide.js',

    // Services (Business Logic)
    '/js/services/auth.service.js',
    '/js/services/pastor.service.js',
    '/js/services/district.service.js',
    '/js/services/church.service.js',
    '/js/services/assignment.service.js',
    '/js/services/rank.service.js',
    '/js/services/timeline.service.js',
    '/js/services/disciple.service.js',
    '/js/services/conference.service.js',
    '/js/services/scan_log.service.js',
    '/js/services/attendance.service.js',

    // Domain Logic
    '/js/domain/pastor.domain.js',
    '/js/domain/pastoral-lifecycle.domain.js',

    // Page Controllers & Components
    '/js/pages/login.controller.js',
    '/js/pages/dashboard.controller.js',
    '/js/pages/pastors/pastors.controller.js',
    '/js/pages/pastors/pastors.state.js',
    '/js/pages/pastors/pastors.view.js',
    '/js/pages/pastor-view.controller.js',
    '/js/pages/pastor-view.state.js',
    '/js/pages/pastor-view.view.js',
    '/js/pages/church-view.controller.js',
    '/js/pages/district.controller.js',
    '/js/pages/district-view.controller.js',
    '/js/pages/badges.controller.js',
    '/js/pages/scanner.controller.js',
    '/js/pages/admin-logs.controller.js',

    // Core Components
    '/components/action-sheet/action-sheet.css',
    '/components/button/button.css',
    '/components/form/form.css',
    '/components/modal/modal.css',
    '/components/avatar/avatar.css',
    '/components/search-select/search-select.js',
    '/components/search-select/search-select.css',

    // Manifest
    '/manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    const url = new URL(e.request.url);
    
    e.respondWith(
        fetch(e.request).then(response => {
            if (response && response.status === 200 && response.type === 'basic') {
                const toCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, toCache));
            }
            return response;
        }).catch(() => {
            return caches.match(e.request).then(cached => {
                if (cached) return cached;
                if (e.request.mode === 'navigate') {
                    return caches.match('/index.html');
                }
            });
        })
    );
});
