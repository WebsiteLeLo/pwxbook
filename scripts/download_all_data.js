import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const CHAPTERS_DIR = path.join(DATA_DIR, 'chapters');
const EXERCISES_DIR = path.join(DATA_DIR, 'exercises');

fs.mkdirSync(CHAPTERS_DIR, { recursive: true });
fs.mkdirSync(EXERCISES_DIR, { recursive: true });

const BASE_URL = 'https://pwsecure.gourav23032009.workers.dev/api/pw';
const BATCH_ID = '676e4dee1ec923bc192f38c9';
const COHORT_ID = '6a397587774de0a53b5bb862';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'application/json'
};

async function fetchWithRetry(url, retries = 3, delayMs = 1000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { headers: HEADERS, signal: controller.signal });
      clearTimeout(timeout);

      if (res.status === 400 || res.status === 404) {
        // Client errors (e.g. Test not found) shouldn't be retried
        const errJson = await res.json().catch(() => ({}));
        return { ok: false, status: res.status, error: errJson };
      }

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      if (attempt === retries) {
        return { ok: false, error: err.message };
      }
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
}

async function fetchExerciseData(testId) {
  const filePath = path.join(EXERCISES_DIR, `${testId}.json`);
  if (fs.existsSync(filePath)) {
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (content && content.sections && content.sections.length > 0) {
        return { status: 'cached', testId };
      }
    } catch (e) {
      // Corrupt file, re-download
    }
  }

  // 1. Try type=Start
  const startUrl = `${BASE_URL}/v3/test-service/tests/${testId}/start-test?batchId=${BATCH_ID}&cohortId=${COHORT_ID}&exerciseId=${testId}&testSource=BOOKS_EXERCISE&type=Start`;
  let res = await fetchWithRetry(startUrl);

  // 2. If start failed, try type=Resume
  if (!res.ok || !res.data?.data) {
    const resumeUrl = `${BASE_URL}/v3/test-service/tests/${testId}/start-test?batchId=${BATCH_ID}&cohortId=${COHORT_ID}&exerciseId=${testId}&testSource=BOOKS_EXERCISE&type=Resume`;
    res = await fetchWithRetry(resumeUrl);
  }

  if (res.ok && res.data?.data) {
    const testData = res.data.data;
    testData._id = testId;
    fs.writeFileSync(filePath, JSON.stringify(testData));
    return { status: 'downloaded', testId };
  } else {
    return { status: 'failed', testId, error: res.error };
  }
}

async function run() {
  console.log('🚀 Starting PWX Books & Exercises Downloader...');

  // Step 1: Books
  console.log('\n📚 Step 1: Fetching Books...');
  const booksUrl = `${BASE_URL}/engagement/ai-ncert/v1/books`;
  const booksRes = await fetchWithRetry(booksUrl);
  if (!booksRes.ok || !booksRes.data?.data) {
    console.error('❌ Failed to fetch books:', booksRes.error);
    process.exit(1);
  }

  const books = booksRes.data.data;
  const booksFilePath = path.join(DATA_DIR, 'books.json');
  fs.writeFileSync(booksFilePath, JSON.stringify(books, null, 2));
  console.log(`✅ Saved ${books.length} books to public/data/books.json`);

  // Step 2: Chapters & Exercise IDs
  console.log('\n📖 Step 2: Fetching Chapters for all books...');
  const allTestIds = new Set();
  const testToBookMap = new Map();
  let totalChapters = 0;

  for (let i = 0; i < books.length; i++) {
    const book = books[i];
    const chapterFilePath = path.join(CHAPTERS_DIR, `${book._id}.json`);
    let chapters = null;

    if (fs.existsSync(chapterFilePath)) {
      try {
        chapters = JSON.parse(fs.readFileSync(chapterFilePath, 'utf-8'));
      } catch (e) {}
    }

    if (!chapters) {
      const chapUrl = `${BASE_URL}/engagement/ai-ncert/v1/books/${book._id}/all-chapters`;
      const chapRes = await fetchWithRetry(chapUrl);
      if (chapRes.ok && chapRes.data?.data?.chapterDetails) {
        chapters = chapRes.data.data.chapterDetails;
        fs.writeFileSync(chapterFilePath, JSON.stringify(chapters, null, 2));
      } else {
        chapters = [];
      }
    }

    totalChapters += chapters.length;

    for (const chap of chapters) {
      const testsInChap = [];
      (chap.combinedTestsWithType || []).forEach(t => t.testId && testsInChap.push(t.testId));
      (chap.nonPyqQuestionsWithType || []).forEach(t => t.testId && testsInChap.push(t.testId));
      (chap.customPracticeSet || []).forEach(t => t.testId && testsInChap.push(t.testId));
      (chap.testList || []).forEach(t => t && testsInChap.push(t));

      for (const tid of testsInChap) {
        allTestIds.add(tid);
        if (!testToBookMap.has(tid)) {
          testToBookMap.set(tid, { bookId: book._id, bookTitle: book.title, chapterTitle: chap.title });
        }
      }
    }

    if ((i + 1) % 25 === 0 || i === books.length - 1) {
      console.log(`   Processed [${i + 1}/${books.length}] books. Total unique exercises found so far: ${allTestIds.size}`);
    }
  }

  const testIdArray = Array.from(allTestIds);
  console.log(`\n🎯 Step 3: Downloading ${testIdArray.length} unique exercises...`);

  const CONCURRENCY = 8;
  let completed = 0;
  let cachedCount = 0;
  let downloadedCount = 0;
  let failedCount = 0;
  const failedList = [];

  const startTime = Date.now();

  async function worker(items) {
    for (const testId of items) {
      const res = await fetchExerciseData(testId);
      completed++;
      if (res.status === 'cached') {
        cachedCount++;
      } else if (res.status === 'downloaded') {
        downloadedCount++;
      } else {
        failedCount++;
        failedList.push({ testId, error: res.error, info: testToBookMap.get(testId) });
      }

      if (completed % 50 === 0 || completed === testIdArray.length) {
        const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
        const percent = ((completed / testIdArray.length) * 100).toFixed(1);
        console.log(`[${completed}/${testIdArray.length}] (${percent}%) in ${elapsedSec}s | Cached: ${cachedCount}, Downloaded: ${downloadedCount}, Failed: ${failedCount}`);
      }
    }
  }

  // Partition testIdArray among CONCURRENCY workers
  const workerChunks = Array.from({ length: CONCURRENCY }, () => []);
  testIdArray.forEach((id, idx) => {
    workerChunks[idx % CONCURRENCY].push(id);
  });

  await Promise.all(workerChunks.map(chunk => worker(chunk)));

  const summary = {
    updatedAt: new Date().toISOString(),
    totalBooks: books.length,
    totalChapters,
    totalExercises: testIdArray.length,
    cachedCount,
    downloadedCount,
    failedCount,
    failedList
  };

  fs.writeFileSync(path.join(DATA_DIR, 'summary.json'), JSON.stringify(summary, null, 2));

  console.log('\n=======================================');
  console.log('🎉 DOWNLOAD COMPLETED!');
  console.log(`Total Books:      ${books.length}`);
  console.log(`Total Chapters:   ${totalChapters}`);
  console.log(`Total Exercises:  ${testIdArray.length}`);
  console.log(`Cached/Existing:  ${cachedCount}`);
  console.log(`Downloaded:       ${downloadedCount}`);
  console.log(`Failed (Inactive):${failedCount}`);
  console.log('Summary saved to public/data/summary.json');
  console.log('=======================================');
}

run().catch(console.error);
