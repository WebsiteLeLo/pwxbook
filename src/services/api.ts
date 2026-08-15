const BASE_URL = 'https://pwsecure.gourav23032009.workers.dev/api';

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

export const api = {
  async getBooks(): Promise<Book[]> {
    try {
      const data = await fetchWithCache(`${BASE_URL}/pw/engagement/ai-ncert/v1/books`);
      return data.data || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async getChapters(bookId: string): Promise<Chapter[]> {
    try {
      const data = await fetchWithCache(`${BASE_URL}/pw/engagement/ai-ncert/v1/books/${bookId}/all-chapters`);
      return data.data?.chapterDetails || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async startTest(exerciseId: string, isResume = false): Promise<TestData | null> {
    const batchId = '676e4dee1ec923bc192f38c9';
    const cohortId = '6a397587774de0a53b5bb862';
    const type = isResume ? 'Resume' : 'Start';
    const url = `${BASE_URL}/pw/v3/test-service/tests/${exerciseId}/start-test?batchId=${batchId}&cohortId=${cohortId}&exerciseId=${exerciseId}&testSource=BOOKS_EXERCISE&type=${type}`;
    
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
  }
};
