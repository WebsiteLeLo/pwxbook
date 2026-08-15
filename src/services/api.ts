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

export const api = {
  async getBooks(): Promise<Book[]> {
    try {
      const response = await fetch(`${BASE_URL}/pw/engagement/ai-ncert/v1/books`);
      if (!response.ok) throw new Error('Failed to fetch books');
      const data = await response.json();
      return data.data || [];
    } catch (error) {
      console.error(error);
      return [];
    }
  },

  async getChapters(bookId: string): Promise<Chapter[]> {
    try {
      const response = await fetch(`${BASE_URL}/pw/engagement/ai-ncert/v1/books/${bookId}/all-chapters`);
      if (!response.ok) throw new Error('Failed to fetch chapters');
      const data = await response.json();
      // The chapters are returned in data.chapterDetails array based on previous tests
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
      const response = await fetch(url, { method: 'GET' });
      if (!response.ok) throw new Error(`Failed to ${type.toLowerCase()} test`);
      const data = await response.json();
      if (data.data) {
        data.data._id = exerciseId;
        return data.data;
      }
      return null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }
};
