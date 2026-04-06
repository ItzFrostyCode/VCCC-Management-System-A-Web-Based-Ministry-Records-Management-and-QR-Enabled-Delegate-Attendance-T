/**
 * Application Router & Module Lifecycle Manager
 * Implements PJAX functionality and memory state caching.
 */

class Router {
    constructor() {
        this.memoryState = {};
        this.currentController = null;
        this.initPJAX();
    }

    /**
     * Store temporary data (e.g. pre-filled IDs) across page loads 
     * without cluttering the URL bar.
     */
    setState(newState) {
        this.memoryState = { ...this.memoryState, ...newState };
    }

    getState() {
        return this.memoryState;
    }

    clearState() {
        this.memoryState = {};
    }

    /**
     * Programmatic Navigation with Optional State
     * @param {string} url 
     * @param {Object} state - Optional state to pass to the next module
     */
    push(url, state = null) {
        if (state) this.setState(state);
        window.history.pushState({}, '', url);
        this.handleRoute(url);
    }

    initPJAX() {
        // Intercept clicks on internal links
        document.body.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (!link) return;
            
            const href = link.getAttribute('href');
            if (!href || href.startsWith('http') || href.startsWith('#') || link.target === '_blank') return;
            
            // Allow explicit bypass
            if (link.classList.contains('no-pjax')) return;

            e.preventDefault();
            this.push(href);
        });

        // Handle Browser Back/Forward navigation
        window.addEventListener('popstate', () => {
            this.handleRoute(window.location.pathname + window.location.search);
        });
    }

    async handleRoute(url) {
        if (window.__vccc_ui) window.__vccc_ui.showLoader('Loading...');
        try {
            // 1. Unmount Current Lifecycle
            if (this.currentController && typeof this.currentController.unmount === 'function') {
                await this.currentController.unmount();
            }
            this.currentController = null;

            // 2. Fetch the target HTML
            const response = await fetch(url);
            const htmlString = await response.text();

            // 3. Parse Document
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // 4. Swap Main Content Area
            const newMain = doc.querySelector('#main-content');
            const currentMain = document.querySelector('#main-content');
            if (newMain && currentMain) {
                currentMain.innerHTML = newMain.innerHTML;
            }

            // 5. Update Shell (Title, Highlights)
            const newTitle = doc.querySelector('.topbar-title');
            const currentTitle = document.querySelector('.topbar-title');
            if (newTitle && currentTitle) currentTitle.innerHTML = newTitle.innerHTML;
            
            document.title = doc.title;
            
            if (window._highlightNavFunc) window._highlightNavFunc(); // Call layout's highlight function
            
            // 5b. Dyn-inject Page Styles (CSS)
            const newLinks = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
            newLinks.forEach(link => {
                const href = link.getAttribute('href');
                if (!document.querySelector(`link[href="${href}"]`)) {
                    const cloned = document.createElement('link');
                    cloned.rel = 'stylesheet';
                    cloned.href = href;
                    document.head.appendChild(cloned);
                }
            });

            // 6. Bootstrap New Module
            const moduleScript = doc.querySelector('script[type="module"][src*="pages/"]');
            if (moduleScript) {
                const src = moduleScript.getAttribute('src');
                // Dynamically import module. Because ES modules cache, 
                // we rely on the mount() contract being invoked.
                const absoluteSrc = new URL(src, window.location.origin).href;
                const module = await import(absoluteSrc);
                
                this.currentController = module.default || module;
                
                if (this.currentController && typeof this.currentController.mount === 'function') {
                    // Pass current memory cache to the new module 
                    await this.currentController.mount(this.getState());
                } else {
                    console.warn(`[Router] Module at ${src} does not export mount()`);
                }
            }

            // Optional: clear state after successful route if it's considered "consumed"
            // this.clearState();

        } catch (err) {
            console.error('[PJAX Error]', err);
            // Fallback: hard reload on failure
            window.location.href = url;
        } finally {
            if (window.__vccc_ui) window.__vccc_ui.hideLoader();
        }
    }
}

// Instantiate globally
export const router = new Router();
window.router = router;
