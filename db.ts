
import { SavedReport, SavedSite } from './types';

const DB_NAME = 'SAR_Database';
const DB_VERSION = 2; // Incremented to 2 to add new table
const STORE_REPORTS = 'reports';
const STORE_SITES = 'sites';

class SARDatabase {
  private db: IDBDatabase | null = null;

  async connect(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = request.result;
        
        // Create reports store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_REPORTS)) {
          const store = db.createObjectStore(STORE_REPORTS, { keyPath: 'id', autoIncrement: true });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }

        // Create sites store if it doesn't exist (New in V2)
        if (!db.objectStoreNames.contains(STORE_SITES)) {
          const store = db.createObjectStore(STORE_SITES, { keyPath: 'id', autoIncrement: true });
          store.createIndex('city', 'data.city', { unique: false });
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

  // --- REPORT METHODS ---

  async saveReport(report: SavedReport): Promise<number> {
    const db = await this.connect();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_REPORTS], 'readwrite');
      const store = transaction.objectStore(STORE_REPORTS);
      
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
      const transaction = db.transaction([STORE_REPORTS], 'readonly');
      const store = transaction.objectStore(STORE_REPORTS);
      const request = store.getAll();

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as SavedReport[]);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }

  // --- SITE (SOI) METHODS ---

  async saveSite(site: SavedSite): Promise<number> {
    const db = await this.connect();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_SITES], 'readwrite');
      const store = transaction.objectStore(STORE_SITES);
      
      const request = site.id ? store.put(site) : store.add(site);

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as number);
      };

      request.onerror = (event) => {
        reject((event.target as IDBRequest).error);
      };
    });
  }
}

export const dbService = new SARDatabase();
