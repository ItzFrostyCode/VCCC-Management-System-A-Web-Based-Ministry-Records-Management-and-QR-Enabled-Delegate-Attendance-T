/**
 * Scanner Queue Manager
 * Uses Raw IndexedDB for production-grade reliability and offline persistence.
 */
class ScannerQueue {
    constructor() {
        this.dbName = 'vccc_scanner_db';
        this.storeName = 'pending_scans';
        this.db = null;
    }

    async init() {
        if (this.db) return;
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'scan_uuid' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve();
            };
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async push(scanData) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.put({
                ...scanData,
                queued_at: new Date().toISOString(),
                attempts: 0
            });
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async getAll() {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async remove(scanUuid) {
        await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(scanUuid);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async incrementAttempt(scanUuid) {
        await this.init();
        const all = await this.getAll();
        const item = all.find(i => i.scan_uuid === scanUuid);
        if (item) {
            item.attempts++;
            await this.push(item);
        }
    }
}

export default new ScannerQueue();
