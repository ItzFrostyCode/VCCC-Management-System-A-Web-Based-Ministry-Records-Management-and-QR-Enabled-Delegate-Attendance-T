/**
 * UI State
 * Global UI state elements (active modal states, generic flags, mobile breakpoints).
 */
class UIState {
    constructor() {
        this.isMobile = window.innerWidth <= 1024;
        this.activeModals = new Set();
        
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth <= 1024;
        });
    }

    setModalOpen(modalId) {
        this.activeModals.add(modalId);
    }

    setModalClosed(modalId) {
        this.activeModals.delete(modalId);
    }

    isModalOpen(modalId) {
        return this.activeModals.has(modalId);
    }
}

export const uiState = new UIState();
