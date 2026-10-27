import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Book, Chapter, TestData, api } from './api';
import { pwxStorage } from './pwxStorage';

export interface PwxManifest {
  format: 'PWX_BOOK_PACKAGE';
  version: string;
  exportedAt: string;
  book: Book;
  chapters: Chapter[];
  totalExercises: number;
}

export const pwxPackageManager = {
  /**
   * Export a complete Book and its exercises into a single .pwx package file
   */
  async exportBookAsPwx(
    book: Book,
    chapters: Chapter[],
    onProgress?: (percent: number, status: string) => void
  ): Promise<void> {
    try {
      onProgress?.(5, 'Preparing book data...');
      const zip = new JSZip();

      // Collect all exercise IDs from chapters
      const exerciseIds = new Set<string>();
      chapters.forEach((chap) => {
        (chap.combinedTestsWithType || []).forEach(t => t.testId && exerciseIds.add(t.testId));
        (chap.nonPyqQuestionsWithType || []).forEach(t => t.testId && exerciseIds.add(t.testId));
        (chap.customPracticeSet || []).forEach(t => t.testId && exerciseIds.add(t.testId));
        (chap.testList || []).forEach(t => t && exerciseIds.add(t));
      });

      const total = exerciseIds.size;
      const manifest: PwxManifest = {
        format: 'PWX_BOOK_PACKAGE',
        version: '1.0',
        exportedAt: new Date().toISOString(),
        book,
        chapters,
        totalExercises: total
      };

      zip.file('pwx-manifest.json', JSON.stringify(manifest, null, 2));
      const exercisesFolder = zip.folder('exercises');

      let completed = 0;
      for (const testId of exerciseIds) {
        onProgress?.(
          Math.round(10 + (completed / (total || 1)) * 75),
          `Packing exercise ${completed + 1} of ${total}...`
        );

        // Fetch exercise data from local IndexedDB -> static /data -> live API
        let testData: TestData | null = await pwxStorage.getExercise(testId);
        if (!testData) {
          testData = await api.startTest(testId, false);
          if (!testData) {
            testData = await api.startTest(testId, true);
          }
        }

        if (testData) {
          exercisesFolder?.file(`${testId}.json`, JSON.stringify(testData));
        }
        completed++;
      }

      onProgress?.(90, 'Compressing .pwx package...');
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      });

      const safeTitle = (book.title || `book_${book._id}`).replace(/[/\\?%*:|"<>]/g, '_');
      saveAs(blob, `${safeTitle}.pwx`);
      onProgress?.(100, 'Download complete!');
    } catch (err: any) {
      console.error('Failed to export .pwx package:', err);
      throw new Error(err.message || 'Error exporting .pwx package');
    }
  },

  /**
   * Import a .pwx file into local IndexedDB storage
   */
  async importPwxFile(
    file: File,
    onProgress?: (percent: number, status: string) => void
  ): Promise<{ success: boolean; book: Book; exercisesCount: number }> {
    try {
      onProgress?.(10, 'Reading .pwx file...');

      let book: Book | null = null;
      let chapters: Chapter[] = [];
      const exercises: Record<string, TestData> = {};

      // Check if file is ZIP or JSON based on header bytes
      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer.slice(0, 4));
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b; // 'PK' header

      if (isZip) {
        onProgress?.(25, 'Unpacking .pwx package...');
        const zip = await JSZip.loadAsync(arrayBuffer);

        const manifestFile = zip.file('pwx-manifest.json');
        if (!manifestFile) {
          throw new Error('Invalid .pwx file: Missing pwx-manifest.json');
        }

        const manifestText = await manifestFile.async('text');
        const manifest: PwxManifest = JSON.parse(manifestText);
        book = manifest.book;
        chapters = manifest.chapters || [];

        const exerciseFiles = zip.folder('exercises')?.file(/.+\.json$/) || [];
        let parsed = 0;
        for (const f of exerciseFiles) {
          const testId = f.name.replace(/^exercises\//, '').replace(/\.json$/, '');
          const content = await f.async('text');
          try {
            const parsedData = JSON.parse(content);
            exercises[testId] = parsedData;
          } catch (e) {}
          parsed++;
          if (parsed % 5 === 0) {
            onProgress?.(
              Math.round(30 + (parsed / (exerciseFiles.length || 1)) * 50),
              `Extracting exercises [${parsed}/${exerciseFiles.length}]...`
            );
          }
        }
      } else {
        // Plain JSON format packaged with .pwx extension
        onProgress?.(40, 'Parsing .pwx JSON bundle...');
        const textDecoder = new TextDecoder('utf-8');
        const jsonText = textDecoder.decode(arrayBuffer);
        const data = JSON.parse(jsonText);

        book = data.book || data.manifest?.book;
        chapters = data.chapters || data.manifest?.chapters || [];
        const rawExercises = data.exercises || {};
        for (const [id, exData] of Object.entries(rawExercises)) {
          exercises[id] = exData as TestData;
        }
      }

      if (!book || !book._id) {
        throw new Error('Invalid .pwx file: Book metadata is missing.');
      }

      onProgress?.(85, 'Saving book and exercises to offline storage...');
      await pwxStorage.saveBookPackage(book, chapters, exercises, file.name);

      onProgress?.(100, 'Import completed successfully!');
      return {
        success: true,
        book,
        exercisesCount: Object.keys(exercises).length
      };
    } catch (err: any) {
      console.error('Failed to import .pwx package:', err);
      throw new Error(err.message || 'Failed to import .pwx file.');
    }
  }
};
