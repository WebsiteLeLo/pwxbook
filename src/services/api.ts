const BASE_URL = 'https://pwsecure.gourav23032009.workers.dev/api/pw';

export interface Book {
  _id: string;
  title: string;
  author: string;
  coverImage?: {
    fullUrl: string;
    baseUrl: string;
    key: string;
  };
  displayClass: string;
  description?: string[];
  subjects?: string[];
  isImported?: boolean;
}

export interface Chapter {
  _id: string;
  title: string;
  combinedTestsWithType?: {
    testId: string;
    type: string;
  }[];
  nonPyqQuestionsWithType?: {
    testId: string;
    type: string;
  }[];
  customPracticeSet?: {
    testId: string;
    name: string;
  }[];
  testList?: string[];
}

export interface TestSummary {
  _id: string;
  name: string;
}

export interface Option {
  _id: string;
  texts?: { en?: string };
  imageIds?: { en?: { baseUrl: string; key: string } };
}

export interface Question {
  _id: string;
  type: string;
  texts?: { en?: string };
  imageIds?: { en?: { baseUrl: string; key: string } };
  options: Option[];
  solutions?: string[]; // Array of correct option IDs
  solutionDescription?: any[]; // Array containing solution details (image, text, video)
}

export interface TestSection {
  _id: string;
  name: string;
  questions: Question[];
}

export interface TestData {
  _id: string;
  name: string;
  sections: TestSection[];
}

const cache = new Map<string, any>();

async function fetchWithCache(url: string) {
  // 1. Check RAM Cache (fastest)
  if (cache.has(url)) return cache.get(url);

  // 2. Check SessionStorage Cache (persists across reloads during the session)
  try {
    const stored = sessionStorage.getItem(`pwx_api_${url}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      cache.set(url, parsed); // sync to RAM
      return parsed;
    }
  } catch(e) {
    console.warn('SessionStorage error:', e);
  }

  // 3. Network Fetch
  console.log(`📡 Fetching from API: ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();

  // Save to Cache
  cache.set(url, data);
  try {
    sessionStorage.setItem(`pwx_api_${url}`, JSON.stringify(data));
  } catch(e) {
    console.warn('SessionStorage full or unavailable');
  }

  return data;
}

async function fetchLocalOrApi<T>(localUrl: string, apiCall: () => Promise<T>): Promise<T> {
  try {
    const res = await fetch(localUrl);
    if (res.ok) {
      const data = await res.json();
      if (data) {
        console.log(`📦 Loaded from local static data: ${localUrl}`);
        return data as T;
      }
    }
  } catch (e) {
    // Local data not found or failed, continue to API
  }
  return await apiCall();
}

import { pwxStorage } from './pwxStorage';

export const api = {
  async getBooks(): Promise<Book[]> {
    // 1. Get imported books from IndexedDB
    const importedBooks = await pwxStorage.getAllImportedBooks().catch(() => []);
    const importedMap = new Map(importedBooks.map(b => [b._id, { ...b, isImported: true }]));

    // 2. Get local static or API books
    const standardBooks = await fetchLocalOrApi<Book[]>('/data/books.json', async () => {
      try {
        const data = await fetchWithCache(`${BASE_URL}/engagement/ai-ncert/v1/books`);
        return data.data || [];
      } catch (error) {
        console.error(error);
        return [];
      }
    });

    // 3. Merge: Mark imported books and prepend custom ones
    const mergedList: Book[] = standardBooks.map(b => {
      if (importedMap.has(b._id)) {
        return { ...b, isImported: true };
      }
      return b;
    });

    importedMap.forEach((impBook, id) => {
      if (!mergedList.some(b => b._id === id)) {
        mergedList.unshift(impBook);
      }
    });

    return mergedList;
  },

  async getChapters(bookId: string): Promise<Chapter[]> {
    // 1. Check IndexedDB
    const dbChapters = await pwxStorage.getChapters(bookId).catch(() => null);
    if (dbChapters && dbChapters.length > 0) {
      console.log(`📦 Loaded chapters from IndexedDB: book ${bookId}`);
      return dbChapters;
    }

    // 2. Check local static /data or API
    return fetchLocalOrApi(`/data/chapters/${bookId}.json`, async () => {
      try {
        const data = await fetchWithCache(`${BASE_URL}/engagement/ai-ncert/v1/books/${bookId}/all-chapters`);
        return data.data?.chapterDetails || [];
      } catch (error) {
        console.error(error);
        return [];
      }
    });
  },

  async startTest(exerciseId: string, isResume = false): Promise<TestData | null> {
    // 1. Check IndexedDB
    const dbExercise = await pwxStorage.getExercise(exerciseId).catch(() => null);
    if (dbExercise && dbExercise.sections) {
      console.log(`📦 Loaded exercise from IndexedDB: ${exerciseId}`);
      return dbExercise;
    }

    // 2. Check local static /data or API
    return fetchLocalOrApi(`/data/exercises/${exerciseId}.json`, async () => {
      const batchId = '676e4dee1ec923bc192f38c9';
      const cohortId = '6a397587774de0a53b5bb862';
      const type = isResume ? 'Resume' : 'Start';
      const url = `${BASE_URL}/v3/test-service/tests/${exerciseId}/start-test?batchId=${batchId}&cohortId=${cohortId}&exerciseId=${exerciseId}&testSource=BOOKS_EXERCISE&type=${type}`;
      
      try {
        // Test data is large, but static. We cache it to save massive API costs when users reload.
        const data = await fetchWithCache(url);
        if (data.data) {
          // Deep clone so multiple opens don't mutate the cached object by accident
          const testData = JSON.parse(JSON.stringify(data.data));
          testData._id = exerciseId;
          return testData;
        }
        return null;
      } catch (error) {
        console.error(error);
        return null;
      }
    });
  },

  async getChapterRequestId(bookId: string, chapterId: string, page: number): Promise<string | null> {
    try {
      const data = await fetchWithCache(`${BASE_URL}/engagement/ai-ncert/v1/chapters/requestId/${bookId}/${chapterId}/${page}`);
      return data?.data?.requestId || null;
    } catch {
      return null;
    }
  },

  async getChapterSecureDetails(bookId: string, chapterId: string, page: number, requestId: string): Promise<any> {
    try {
      const res = await fetch(`${BASE_URL}/engagement/ai-ncert/v1/chapters/secure-details/v2/${bookId}/${chapterId}/${page}`, {
        headers: { requestId }
      });
      return await res.json();
    } catch {
      return null;
    }
  },

  async getChapterPdfInteract(docId: string, page: number): Promise<any> {
    try {
      const data = await fetchWithCache(`${BASE_URL}/engagement/ai-ncert/v1/chapters/pdf-interact/${docId}/${page}`);
      return data;
    } catch {
      return null;
    }
  }
};

