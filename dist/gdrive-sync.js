export const GOOGLE_CLIENT_ID = '232347947087-3vnnpug12437l3bs0cnrc2bkprmja848.apps.googleusercontent.com';
export const DRIVE_FILE_NAME = 'zenboard_backup.json';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export class GoogleDriveSync {
    accessToken = null;
    tokenClient = null;
    fileId = null;
    isDirty = false;
    isSaving = false;
    debounceTimer = null;
    maxTimer = null;
    firstDirtyTime = null;
    onStatusChange = null;
    getStateFn = null;
    constructor() {
        this.accessToken = localStorage.getItem('gdrive_access_token');
        this.fileId = localStorage.getItem('gdrive_file_id');
    }
    init(getStateFn) {
        this.getStateFn = getStateFn;
        this.loadGsiScript();
    }
    loadGsiScript() {
        if (document.getElementById('google-gsi-client'))
            return;
        const script = document.createElement('script');
        script.id = 'google-gsi-client';
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            this.initClient();
        };
        document.head.appendChild(script);
    }
    initClient() {
        if (!window.google?.accounts?.oauth2)
            return;
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: DRIVE_SCOPE,
            callback: (resp) => {
                if (resp.error) {
                    console.error('Google Auth Error:', resp);
                    this.onStatusChange?.('error', 'Auth Failed');
                    return;
                }
                if (resp.access_token) {
                    this.accessToken = resp.access_token;
                    localStorage.setItem('gdrive_access_token', resp.access_token);
                    this.onStatusChange?.('synced', 'Connected');
                    // Perform initial backup if dirty
                    if (this.isDirty) {
                        this.forceSave();
                    }
                }
            }
        });
    }
    connect() {
        if (!this.tokenClient) {
            this.initClient();
        }
        if (this.tokenClient) {
            this.tokenClient.requestAccessToken();
        }
        else {
            alert('Google Auth SDK is loading. Please try again in a few seconds.');
        }
    }
    get isConnected() {
        return Boolean(this.accessToken);
    }
    /**
     * Called whenever user modifies canvas, tabs, notes, cards, or drawings.
     * Enforces:
     *  - 10 seconds of inactivity autosaves (debounce)
     *  - STRICT 60 seconds max timer: forces save once 60s expires since first dirty change
     *  - If state is clean, nothing happens.
     */
    markDirty() {
        this.isDirty = true;
        this.onStatusChange?.('dirty', 'Unsaved changes');
        const now = Date.now();
        if (!this.firstDirtyTime) {
            this.firstDirtyTime = now;
        }
        // 1. Reset 10s inactivity debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        this.debounceTimer = setTimeout(() => {
            this.forceSave();
        }, 10000);
        // 2. Strict 60s max timer (never reset by subsequent keystrokes)
        if (!this.maxTimer) {
            this.maxTimer = setTimeout(() => {
                this.forceSave();
            }, 60000);
        }
    }
    async forceSave() {
        if (!this.isDirty || this.isSaving)
            return;
        if (!this.accessToken || !this.getStateFn) {
            this.clearTimers();
            return;
        }
        this.isSaving = true;
        this.clearTimers();
        this.onStatusChange?.('saving', 'Syncing to Drive...');
        try {
            const state = this.getStateFn();
            const content = JSON.stringify(state, null, 2);
            if (!this.fileId) {
                await this.findOrCreateDriveFile(content);
            }
            else {
                await this.updateDriveFile(this.fileId, content);
            }
            this.isDirty = false;
            this.firstDirtyTime = null;
            this.onStatusChange?.('synced', 'Saved to Drive');
        }
        catch (err) {
            console.error('Google Drive save error:', err);
            // If token expired, clear and notify
            if (err?.status === 401) {
                this.accessToken = null;
                localStorage.removeItem('gdrive_access_token');
                this.onStatusChange?.('error', 'Token expired. Reconnect.');
            }
            else {
                this.onStatusChange?.('error', 'Sync error');
            }
        }
        finally {
            this.isSaving = false;
        }
    }
    clearTimers() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
        if (this.maxTimer) {
            clearTimeout(this.maxTimer);
            this.maxTimer = null;
        }
    }
    async findOrCreateDriveFile(content) {
        // Search if file already exists in user's Drive
        const query = encodeURIComponent(`name = '${DRIVE_FILE_NAME}' and trashed = false`);
        const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, { headers: { Authorization: `Bearer ${this.accessToken}` } });
        if (searchRes.status === 401)
            throw { status: 401 };
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
            this.fileId = searchData.files[0].id;
            localStorage.setItem('gdrive_file_id', this.fileId);
            await this.updateDriveFile(this.fileId, content);
            return;
        }
        // Create new file with multipart upload
        const metadata = {
            name: DRIVE_FILE_NAME,
            mimeType: 'application/json'
        };
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;
        const multipartRequestBody = delimiter +
            'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            content +
            closeDelimiter;
        const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
        });
        if (createRes.status === 401)
            throw { status: 401 };
        const createData = await createRes.json();
        this.fileId = createData.id;
        localStorage.setItem('gdrive_file_id', this.fileId);
    }
    async updateDriveFile(fileId, content) {
        const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
                Authorization: `Bearer ${this.accessToken}`,
                'Content-Type': 'application/json'
            },
            body: content
        });
        if (res.status === 401)
            throw { status: 401 };
        if (!res.ok) {
            // If file was deleted remotely, re-create
            if (res.status === 404) {
                this.fileId = null;
                localStorage.removeItem('gdrive_file_id');
                await this.findOrCreateDriveFile(content);
                return;
            }
            throw new Error(`Drive update failed: ${res.statusText}`);
        }
    }
    onStatus(cb) {
        this.onStatusChange = cb;
    }
}
export const googleDriveSync = new GoogleDriveSync();
