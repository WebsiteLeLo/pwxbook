import { Book, Chapter, TestData } from './api';

const DB_NAME = 'PWX_BOOKS_DATABASE';
const DB_VERSION = 1;

export interface ImportedBookMeta {
  bookId: string;
  importedAt: string;
  filename: string;
  exerciseCount: number;
  bookTitle: string;
}

class PwxStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains('books')) {
          db.createObjectStore('books', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('chapters')) {
          db.createObjectStore('chapters', { keyPath: 'bookId' });
        }
        if (!db.objectStoreNames.contains('exercises')) {
          db.createObjectStore('exercises', { keyPath: '_id' });
        }
        if (!db.objectStoreNames.contains('imported_meta')) {
          db.createObjectStore('imported_meta', { keyPath: 'bookId' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- SAVE BOOK & EXERCISES ---
  async saveBookPackage(
    book: Book,
    chapters: Chapter[],
    exercises: Record<string, TestData>,
    filename = 'imported.pwx'
  ): Promise<void> {
    const db = await this.getDB();
    const tx = db.transaction(['books', 'chapters', 'exercises', 'imported_meta'], 'readwrite');

    // 1. Save Book
    const booksStore = tx.objectStore('books');
    booksStore.put(book);

    // 2. Save Chapters
    const chaptersStore = tx.objectStore('chapters');
    chaptersStore.put({ bookId: book._id, chapters });

    // 3. Save Exercises
    const exercisesStore = tx.objectStore('exercises');
    for (const [id, data] of Object.entries(exercises)) {
      if (data) {
        exercisesStore.put({ ...data, _id: id });
      }
    }

    // 4. Save Import Meta
    const metaStore = tx.objectStore('imported_meta');
    metaStore.put({
      bookId: book._id,
      importedAt: new Date().toISOString(),
      filename,
      exerciseCount: Object.keys(exercises).length,
      bookTitle: book.title || 'Untitled Book'
    });

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- RETRIEVE DATA ---
  async getBook(bookId: string): Promise<Book | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('books', 'readonly');
      const req = tx.objectStore('books').get(bookId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async getAllImportedBooks(): Promise<Book[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('books', 'readonly');
      const req = tx.objectStore('books').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async getChapters(bookId: string): Promise<Chapter[] | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('chapters', 'readonly');
      const req = tx.objectStore('chapters').get(bookId);
      req.onsuccess = () => resolve(req.result?.chapters || null);
      req.onerror = () => resolve(null);
    });
  }

  async getExercise(exerciseId: string): Promise<TestData | null> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('exercises', 'readonly');
      const req = tx.objectStore('exercises').get(exerciseId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  async hasExercise(exerciseId: string): Promise<boolean> {
    const ex = await this.getExercise(exerciseId);
    return ex !== null;
  }

  async getImportedMetaList(): Promise<ImportedBookMeta[]> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('imported_meta', 'readonly');
      const req = tx.objectStore('imported_meta').getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  }

  async isBookImported(bookId: string): Promise<boolean> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('imported_meta', 'readonly');
      const req = tx.objectStore('imported_meta').get(bookId);
      req.onsuccess = () => resolve(!!req.result);
      req.onerror = () => resolve(false);
    });
  }

  // --- DELETE IMPORTED BOOK ---
  async deleteImportedBook(bookId: string): Promise<void> {
    const db = await this.getDB();
    const chaps = await this.getChapters(bookId);

    const tx = db.transaction(['books', 'chapters', 'exercises', 'imported_meta'], 'readwrite');
    tx.objectStore('books').delete(bookId);
    tx.objectStore('chapters').delete(bookId);
    tx.objectStore('imported_meta').delete(bookId);

    // Delete associated exercises
    if (chaps) {
      const exStore = tx.objectStore('exercises');
      for (const chap of chaps) {
        const tests = [
          ...(chap.combinedTestsWithType || []).map(t => t.testId),
          ...(chap.nonPyqQuestionsWithType || []).map(t => t.testId),
          ...(chap.customPracticeSet || []).map(t => t.testId),
          ...(chap.testList || [])
        ];
        tests.forEach(tid => { if (tid) exStore.delete(tid); });
      }
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const pwxStorage = new PwxStorageService();
