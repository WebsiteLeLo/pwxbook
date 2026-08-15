import { useState, useEffect } from 'react';
import { api, Book, Chapter, TestData } from './services/api';
import { storage } from './services/storage';
import { BookList } from './components/BookList';
import { ChapterList } from './components/ChapterList';
import { TestInterface } from './components/TestInterface';
import { ExamInterface } from './components/ExamInterface';
import { TestConfigModal, TestMode } from './components/TestConfigModal';
import { TestAnalysis } from './components/TestAnalysis';
import { BookmarksPage } from './components/BookmarksPage';
import { ReviewPage } from './components/ReviewPage';
import { DashboardPage } from './components/DashboardPage';
import { PrintLayout } from './components/PrintLayout';
import { MistakesPage } from './components/MistakesPage';
import { BookMarked, Bookmark, BrainCircuit, Activity, Flame, AlertTriangle } from 'lucide-react';


type AppState = 'BOOKS' | 'CHAPTERS' | 'TEST_CONFIG' | 'PRACTICE_TEST' | 'EXAM_TEST' | 'ANALYSIS' | 'BOOKMARKS' | 'REVIEW' | 'DASHBOARD' | 'PRINT_TEST' | 'MISTAKES';

function App() {
  const [currentState, setCurrentState] = useState<AppState>('BOOKS');
  const [books, setBooks] = useState<Book[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [selectedTotalExercises, setSelectedTotalExercises] = useState(0);
  const [selectedExerciseId, setSelectedExerciseId] = useState('');

  const [testDuration, setTestDuration] = useState(60);

  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({});
  const [examStatuses, setExamStatuses] = useState<Record<string, number>>({});
  const [examTimeTaken, setExamTimeTaken] = useState(0);
  const [examTimePerQ, setExamTimePerQ] = useState<Record<string, number>>({});

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadBooks(); }, []);

  const loadBooks = async () => {
    setIsLoading(true); setError(null);
    try { setBooks(await api.getBooks()); }
    catch { setError('Failed to load books.'); }
    finally { setIsLoading(false); }
  };

  const handleSelectBook = async (bookId: string) => {
    setSelectedBookId(bookId); setIsLoading(true); setError(null);
    try {
      setChapters(await api.getChapters(bookId));
      setCurrentState('CHAPTERS');
      window.scrollTo(0, 0);
    } catch { setError('Failed to load chapters.'); }
    finally { setIsLoading(false); }
  };

  const handleSelectTest = async (testId: string, chapterId: string, totalExercises: number) => {
    setSelectedChapterId(chapterId);
    setSelectedTotalExercises(totalExercises);
    setSelectedExerciseId(testId);
    setIsLoading(true); setError(null);
    try {
      let data = await api.startTest(testId, false);
      if (!data) data = await api.startTest(testId, true);
      if (data) { setTestData(data); setCurrentState('TEST_CONFIG'); }
      else { setError('Failed to load test data.'); }
    } catch { setError('Failed to load test.'); }
    finally { setIsLoading(false); }
  };

  const handleStartTest = (mode: TestMode, duration?: number) => {
    if (duration) setTestDuration(duration);
    setCurrentState(mode === 'practice' ? 'PRACTICE_TEST' : 'EXAM_TEST');
    window.scrollTo(0, 0);
  };

  const markProgress = () => {
    if (selectedBookId && selectedChapterId && selectedExerciseId) {
      storage.markExerciseDone(selectedBookId, selectedChapterId, selectedExerciseId, selectedTotalExercises);
    }
  };

  const handleTestComplete = (completed: boolean) => { 
    if (completed) markProgress(); 
    setTestData(null); 
    setCurrentState('CHAPTERS'); 
  };
  const handleCancelTest = () => { setTestData(null); setCurrentState('CHAPTERS'); };

  const handleExamFinish = (answers: Record<string, string>, statuses: Record<string, number>, timeTaken: number, timePerQuestion?: Record<string, number>) => {
    setExamAnswers(answers); setExamStatuses(statuses); setExamTimeTaken(timeTaken);
    setExamTimePerQ(timePerQuestion || {});
    markProgress();
    setCurrentState('ANALYSIS');
    window.scrollTo(0, 0);
  };

  const handleBackToBooks = () => { setCurrentState('BOOKS'); setSelectedBookId(''); setChapters([]); };

  const hideHeader = currentState === 'PRACTICE_TEST' || currentState === 'EXAM_TEST' || currentState === 'ANALYSIS';

  return (
    <div className="min-h-screen">
      {!hideHeader && (
        <header className="app-header">
          <div className="container header-content">
            <div className="logo" onClick={() => { if (!isLoading) handleBackToBooks(); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <img src="/pwx-logo.jpg" alt="PWX" style={{ width: '28px', height: '28px', borderRadius: '6px' }} /> PWX Books
            </div>
            <div className="header-actions">
              
              <div 
                className="streak-widget" 
                title="Daily Streak"
              >
                <Flame size={16} color="#f59e0b" fill="#f59e0b" /> <span className="streak-count">{storage.getProfile().currentStreak}</span>
              </div>

              <button onClick={() => setCurrentState('DASHBOARD')} className="btn btn-secondary nav-btn">
                <Activity size={16} /> <span className="nav-btn-text">Dashboard</span>
              </button>

              <button onClick={() => setCurrentState('REVIEW')} className="btn btn-secondary nav-btn" style={{ position: 'relative' }}>
                <BrainCircuit size={16} /> <span className="nav-btn-text">Review</span>
                {storage.getDueReviews().length > 0 && (
                  <span className="notification-badge">
                    {storage.getDueReviews().length}
                  </span>
                )}
              </button>
              <button onClick={() => setCurrentState('MISTAKES')} className="btn btn-secondary nav-btn">
                <AlertTriangle size={16} /> <span className="nav-btn-text">Mistakes</span>
              </button>
              <button onClick={() => setCurrentState('BOOKMARKS')} className="btn btn-secondary nav-btn">
                <Bookmark size={16} /> <span className="nav-btn-text">Saved</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <main className={hideHeader ? "py-4" : "container py-8"}>
        {error && (
          <div className="container" style={{ padding: '0.75rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {currentState === 'BOOKS' && <BookList books={books} onSelectBook={handleSelectBook} isLoading={isLoading} />}

        {currentState === 'CHAPTERS' && (
          <ChapterList chapters={chapters} bookId={selectedBookId} onSelectTest={handleSelectTest} onBack={handleBackToBooks} isLoading={isLoading} />
        )}

        {currentState === 'TEST_CONFIG' && testData && (
          <>
            <ChapterList chapters={chapters} bookId={selectedBookId} onSelectTest={handleSelectTest} onBack={handleBackToBooks} isLoading={false} />
            <TestConfigModal testName={testData.name} onStart={handleStartTest} onCancel={handleCancelTest} onPrint={() => setCurrentState('PRINT_TEST')} />
          </>
        )}

        {currentState === 'PRACTICE_TEST' && testData && (
          <div className="container"><TestInterface testData={testData} onExit={handleTestComplete} /></div>
        )}

        {currentState === 'EXAM_TEST' && testData && (
          <ExamInterface testData={testData} durationMinutes={testDuration} onFinish={handleExamFinish} />
        )}

        {currentState === 'ANALYSIS' && testData && (
          <div className="container">
            <TestAnalysis testData={testData} selectedAnswers={examAnswers} statuses={examStatuses} timeTaken={examTimeTaken} timePerQuestion={examTimePerQ} onExit={handleCancelTest} />
          </div>
        )}

        {currentState === 'BOOKMARKS' && (
          <BookmarksPage onBack={handleBackToBooks} />
        )}

        {currentState === 'REVIEW' && (
          <ReviewPage onBack={handleBackToBooks} />
        )}

        {currentState === 'DASHBOARD' && (
          <DashboardPage onBack={handleBackToBooks} />
        )}

        {currentState === 'PRINT_TEST' && testData && (
          <PrintLayout testData={testData} onBack={() => setCurrentState('TEST_CONFIG')} />
        )}
        {currentState === 'MISTAKES' && (
          <MistakesPage onBack={handleBackToBooks} />
        )}
      </main>
    </div>
  );
}

export default App;
