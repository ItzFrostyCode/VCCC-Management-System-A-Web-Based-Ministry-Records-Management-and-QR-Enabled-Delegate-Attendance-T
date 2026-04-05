/**
 * Global Event Bus (Pub/Sub)
 * Enables decoupled communication between components and pages.
 */
class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Function to run when event occurs
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);

        // Return unsubscribe function
        return () => {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        };
    }

    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {any} data - Data to pass to listeners
     */
    emit(event, data) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (err) {
                console.error(`Error in event listener for ${event}:`, err);
            }
        });
    }

    /**
     * Subscribe once
     */
    once(event, callback) {
        const unbind = this.on(event, (data) => {
            unbind();
            callback(data);
        });
    }
}

export const events = new EventBus();
window.__vccc_events = events; // Debug access
