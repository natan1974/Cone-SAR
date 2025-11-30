import { SavedReport, StoredImage } from './types';

const DB_NAME = 'SAR_Database';
const DB_VERSION = 1;
const STORE_NAME = 'reports';

class SARDatabase {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onerror = () => {
        console.error("Database error:", request.error);
        reject(request.error);
      };
    });
  }

  async saveReport(report: SavedReport): Promise<number> {
    const db = await this.connect();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // If updating an existing report with an ID, use put, otherwise add
      const request = report.id ? store.put(report) : store.add(report);

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as number);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  async getAllReports(): Promise<SavedReport[]> {
    const db = await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as SavedReport[]);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }
}

export const dbService = new SARDatabase();