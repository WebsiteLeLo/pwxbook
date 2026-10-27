import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'public', 'data');
const PWX_OUT_DIR = path.join(ROOT_DIR, 'public', 'pwx_books');

fs.mkdirSync(PWX_OUT_DIR, { recursive: true });

async function generateAllPwx() {
  const books = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'books.json'), 'utf-8'));
  const exercisesDir = path.join(DATA_DIR, 'exercises');
  const availableExercises = new Set(fs.readdirSync(exercisesDir).map(f => f.replace('.json', '')));

  console.log(`Checking ${books.length} books for complete exercise sets...`);
  let generatedCount = 0;

  for (const book of books) {
    const chapPath = path.join(DATA_DIR, 'chapters', `${book._id}.json`);
    if (!fs.existsSync(chapPath)) continue;

    const chapters = JSON.parse(fs.readFileSync(chapPath, 'utf-8'));
    const bookTestIds = [];
    chapters.forEach(c => {
      (c.combinedTestsWithType || []).forEach(t => t.testId && bookTestIds.push(t.testId));
      (c.nonPyqQuestionsWithType || []).forEach(t => t.testId && bookTestIds.push(t.testId));
      (c.customPracticeSet || []).forEach(t => t.testId && bookTestIds.push(t.testId));
      (c.testList || []).forEach(t => t && bookTestIds.push(t));
    });

    const uniqueTestIds = Array.from(new Set(bookTestIds));
    if (uniqueTestIds.length === 0) continue;

    // Check if at least 1 exercise is available (we include all available exercises for the book)
    const existingTestIds = uniqueTestIds.filter(id => availableExercises.has(id));
    if (existingTestIds.length === 0) continue;

    const zip = new JSZip();
    const manifest = {
      format: 'PWX_BOOK_PACKAGE',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      book,
      chapters,
      totalExercises: existingTestIds.length
    };

    zip.file('pwx-manifest.json', JSON.stringify(manifest, null, 2));
    const exFolder = zip.folder('exercises');

    for (const tid of existingTestIds) {
      const exFile = path.join(exercisesDir, `${tid}.json`);
      if (fs.existsSync(exFile)) {
        exFolder.file(`${tid}.json`, fs.readFileSync(exFile, 'utf-8'));
      }
    }

    const safeTitle = (book.title || `book_${book._id}`).replace(/[/\\?%*:|"<>]/g, '_');
    const outPath = path.join(PWX_OUT_DIR, `${safeTitle}.pwx`);

    const buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    fs.writeFileSync(outPath, buffer);
    generatedCount++;
    console.log(`[${generatedCount}] Generated .pwx: ${safeTitle}.pwx (${(buffer.length / 1024).toFixed(1)} KB) - ${existingTestIds.length}/${uniqueTestIds.length} exercises`);
  }

  console.log(`\n🎉 Generated ${generatedCount} .pwx packages in public/pwx_books/!`);
}

generateAllPwx().catch(console.error);
