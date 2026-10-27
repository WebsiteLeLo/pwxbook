import React, { useState } from 'react';
import { Chapter, TestSummary, Book } from '../services/api';
import { storage } from '../services/storage';
import { ChevronDown, ChevronUp, BookOpen, PlayCircle, ArrowLeft, Download } from 'lucide-react';
import { pwxPackageManager } from '../services/pwxPackageManager';

interface ChapterListProps {
  chapters: Chapter[];
  bookId: string;
  bookName?: string;
  book?: Book;
  onSelectTest: (testId: string, chapterId: string, totalExercises: number) => void;
  onBack: () => void;
  isLoading: boolean;
}

export const ChapterList: React.FC<ChapterListProps> = ({ chapters, bookId, bookName, book, onSelectTest, onBack, isLoading }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

  if (isLoading) {
    return <div className="spinner"></div>;
  }

  const toggleChapter = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getExercises = (chapter: Chapter): TestSummary[] => {
    let exercises: TestSummary[] = [];
    const addedIds = new Set<string>();

    const addTest = (id: string, type: string) => {
      if (!addedIds.has(id)) {
        exercises.push({ _id: id, name: type });
        addedIds.add(id);
      }
    };

    if (chapter.combinedTestsWithType) {
      chapter.combinedTestsWithType.forEach(ct => {
        if (ct.testId) addTest(ct.testId, ct.type || 'Exercise');
      });
    }

    if (chapter.nonPyqQuestionsWithType) {
      chapter.nonPyqQuestionsWithType.forEach(ct => {
        if (ct.testId) addTest(ct.testId, ct.type || 'Exercise');
      });
    }

    if (chapter.customPracticeSet) {
      chapter.customPracticeSet.forEach(ct => {
        if (ct.testId) addTest(ct.testId, ct.name || 'Exercise');
      });
    }

    if (chapter.testList && chapter.testList.length > 0) {
      chapter.testList.forEach(testId => {
        addTest(testId, 'Exercise');
      });
    }
    
    return exercises;
  };

  const checkAdminAccess = () => {
    const accessKey = localStorage.getItem('pwx_admin_access');
    if (accessKey === 'granted') return true;

    const password = window.prompt("Enter admin password to download book data:");
    // Setting a default password "gourav@pwx"
    if (password === 'gourav@pwx') {
      localStorage.setItem('pwx_admin_access', 'granted');
      return true;
    }
    
    if (password !== null) {
      alert("Incorrect password! Access denied.");
    }
    return false;
  };

  const downloadBookData = async () => {
    if (!checkAdminAccess()) return;
    
    try {
      setIsDownloading(true);
      setDownloadProgress(0);
      setDownloadStatus('Starting download...');

      const currentBook: Book = book || {
        _id: bookId,
        title: bookName || 'Untitled Book',
        author: 'PW',
        displayClass: ''
      };

      await pwxPackageManager.exportBookAsPwx(
        currentBook,
        chapters,
        (percent, status) => {
          setDownloadProgress(percent);
          setDownloadStatus(status);
        }
      );
    } catch (err: any) {
      console.error('Failed to download .pwx book:', err);
      alert('Error downloading .pwx book: ' + (err.message || 'Unknown error'));
    } finally {
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadStatus('');
    }
  };

  return (
    <div>
      <button onClick={onBack} className="btn btn-secondary mb-8">
        <ArrowLeft size={20} /> Back to Library
      </button>

      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 className="page-title">Chapters & Exercises</h2>
          <p className="page-subtitle">Select a chapter to view its available exercises.</p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={downloadBookData}
          disabled={isDownloading}
          style={{ minWidth: '200px' }}
        >
          {isDownloading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} title={downloadStatus}>
              <span className="spinner" style={{ width: '16px', height: '16px', margin: 0, borderWidth: '2px', borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></span>
              Downloading {downloadProgress}%
            </span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={18} /> Download .pwx Book
            </span>
          )}
        </button>
      </div>

      {chapters.length === 0 && (
        <div className="text-center mt-8 text-muted">No chapters available for this book.</div>
      )}

      <div className="mt-4">
        {chapters.map((chapter) => {
          const exercises = getExercises(chapter);
          const isExpanded = expandedId === chapter._id;
          const progress = storage.getChapterProgress(bookId, chapter._id);

          return (
            <div key={chapter._id} className={`chapter-item ${isExpanded ? 'expanded' : ''}`}>
              <div 
                className="chapter-header"
                onClick={() => toggleChapter(chapter._id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  <BookOpen size={20} color="var(--primary)" />
                  <div style={{ flex: 1 }}>
                    <span className="chapter-title">{chapter.title || 'Untitled Chapter'}</span>
                    {exercises.length > 0 && (
                      <div className="progress-bar-wrap">
                        <div className="progress-bar-bg">
                          <div
                            className="progress-bar-fill"
                            style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : '0%' }}
                          />
                        </div>
                        <span className="progress-text">
                          {progress.done}/{exercises.length} done
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  {isExpanded ? <ChevronUp size={20} color="var(--text-muted)" /> : <ChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>
              
              {isExpanded && (
                <div className="chapter-content">
                  {exercises.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)' }}>No exercises available in this chapter.</p>
                  ) : (
                    <div className="exercise-list">
                      {exercises.map((exercise) => {
                        const isDone = storage.getChapterProgress(bookId, chapter._id).done > 0 &&
                          storage.getProgress()[bookId]?.[chapter._id]?.done.includes(exercise._id);
                        return (
                          <div
                            key={exercise._id}
                            className="exercise-item"
                            onClick={() => onSelectTest(exercise._id, chapter._id, exercises.length)}
                          >
                            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#334155' }}>
                              {isDone ? (
                                <span style={{ color: 'white', background: 'var(--primary)', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem' }}>✓</span>
                              ) : (
                                <span style={{ color: '#94a3b8', width: '18px', display: 'flex', justifyContent: 'center' }}>•</span>
                              )}
                              {exercise.name || 'Practice Exercise'}
                            </span>
                            <PlayCircle size={18} className="exercise-item-icon" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
