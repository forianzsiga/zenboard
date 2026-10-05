const DB_NAME = 'zenboard_db';
const DB_VERSION = 1;
const STORE_NAME = 'boards';
export class BoardStorage {
    db = null;
    readyPromise;
    constructor() {
        this.readyPromise = this.init();
    }
    init() {
        if (typeof indexedDB === 'undefined') {
            return Promise.resolve(null);
        }
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => {
                this.db = e.target.result;
                resolve(this.db);
            };
            request.onerror = (e) => {
                console.error('IndexedDB error, falling back to memory/localStorage', e);
                resolve(null);
            };
        });
    }
    async saveBoardState(state) {
        await this.readyPromise;
        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                store.put({ id: 'app_state', data: state, updatedAt: Date.now() });
                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        }
        else if (typeof localStorage !== 'undefined') {
            localStorage.setItem('zenboard_state', JSON.stringify(state));
        }
    }
    async loadBoardState() {
        await this.readyPromise;
        if (this.db) {
            return new Promise((resolve) => {
                const tx = this.db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const req = store.get('app_state');
                req.onsuccess = () => {
                    if (req.result && req.result.data) {
                        resolve(req.result.data);
                    }
                    else if (typeof localStorage !== 'undefined') {
                        const local = localStorage.getItem('zenboard_state') || localStorage.getItem('zen_moodboard_state');
                        resolve(local ? JSON.parse(local) : null);
                    }
                    else {
                        resolve(null);
                    }
                };
                req.onerror = () => resolve(null);
            });
        }
        else if (typeof localStorage !== 'undefined') {
            const local = localStorage.getItem('zenboard_state') || localStorage.getItem('zen_moodboard_state');
            return local ? JSON.parse(local) : null;
        }
        return null;
    }
}
export const boardStorage = new BoardStorage();
