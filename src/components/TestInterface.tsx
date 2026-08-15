import React, { useState, useEffect } from 'react';
import { TestData, Question, Option } from '../services/api';
import { storage } from '../services/storage';
import { CheckCircle, XCircle, PlayCircle, ArrowLeft, ArrowRight, Send, Flag, Bookmark, StickyNote } from 'lucide-react';
import { ImageZoom } from './ImageZoom';

interface TestInterfaceProps {
  testData: TestData;
  onExit: (completed: boolean) => void;
}

export const TestInterface: React.FC<TestInterfaceProps> = ({ testData, onExit }) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>(() => storage.getTestSession(testData._id)?.selectedAnswers || {});
  const [answeredQuestions, setAnsweredQuestions] = useState<Record<string, boolean>>(() => storage.getTestSession(testData._id)?.answeredQuestions || {});
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(() => storage.getTestSession(testData._id)?.currentIndex || 0);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteText, setNoteText] = useState('');

  useEffect(() => {
    if ((window as any).MathJax?.typesetPromise) {
      (window as any).MathJax.typesetPromise().catch(() => {});
    }
  }, [currentIndex, isTestFinished, answeredQuestions]);

  // Save session state to localStorage
  useEffect(() => {
    if (!isTestFinished) {
      storage.saveTestSession(testData._id, { currentIndex, selectedAnswers, answeredQuestions });
    }
  }, [testData._id, currentIndex, selectedAnswers, answeredQuestions, isTestFinished]);

  const allQuestions: Question[] = [];
  testData.sections?.forEach(section => { if (section.questions) allQuestions.push(...section.questions); });

  // Load bookmark & note state for current question
  useEffect(() => {
    if (allQuestions[currentIndex]) {
      const qId = allQuestions[currentIndex]._id;
      setBookmarked(prev => ({ ...prev, [qId]: storage.isBookmarked(qId) }));
      setNoteText(storage.getNote(qId));
      setShowNoteInput(false);
    }
  }, [currentIndex]);

  if (allQuestions.length === 0) {
    return (
      <div className="test-container">
        <button onClick={() => onExit(false)} className="btn btn-secondary mb-8"><ArrowLeft size={20} /> Exit</button>
        <div className="card text-center py-8"><p className="page-subtitle">No questions found.</p></div>
      </div>
    );
  }

  const handleOptionSelect = (questionId: string, optionId: string) => {
    if (answeredQuestions[questionId]) return;
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    setAnsweredQuestions(prev => ({ ...prev, [questionId]: true }));

    // Log live activity for dashboard
    storage.logActivity(1);

    // Spaced repetition & Mistakes: add wrong answers
    const q = allQuestions.find(q => q._id === questionId);
    if (q && !q.solutions?.includes(optionId)) {
      storage.addToSpaced(questionId, q, testData.name);
      storage.logMistake({ questionId, testId: testData._id, testName: testData.name, questionData: q });
    }
  };

  const handleToggleBookmark = () => {
    const q = allQuestions[currentIndex];
    const isNowBookmarked = storage.toggleBookmark(q._id, testData._id, testData.name, q);
    setBookmarked(prev => ({ ...prev, [q._id]: isNowBookmarked }));
  };

  const handleSaveNote = () => {
    const q = allQuestions[currentIndex];
    storage.saveNote(q._id, noteText);
    setShowNoteInput(false);
  };

  const handleFinishTest = () => {
    if (window.confirm('Finish and view score?')) {
      setIsTestFinished(true);
      window.scrollTo(0, 0);
    }
  };

  const renderContent = (item: { texts?: { en?: string }, imageIds?: { en?: { baseUrl: string, key: string } } }, fallback: string, index?: number) => {
    const hasText = item.texts?.en && typeof item.texts.en === 'string' && item.texts.en.trim().length > 0;
    const hasImage = !!item.imageIds?.en;
    if (!hasText && !hasImage) {
      if (typeof index === 'number') return <span style={{ fontWeight: 600, fontSize: '1.1rem' }}>{String.fromCharCode(65 + index)}</span>;
      return <span>{fallback}</span>;
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
        {hasText && <div dangerouslySetInnerHTML={{ __html: item.texts!.en! }} />}
        {hasImage && <ImageZoom src={`${item.imageIds!.en!.baseUrl}${item.imageIds!.en!.key}`} />}
      </div>
    );
  };

  const renderVideo = (videoUrl: string) => {
    if (!videoUrl) return null;
    let embedUrl = videoUrl;
    try {
      if (videoUrl.includes('youtube.com/watch')) { const v = new URL(videoUrl).searchParams.get('v'); if (v) embedUrl = `https://www.youtube.com/embed/${v}`; }
      else if (videoUrl.includes('youtu.be/')) { const v = videoUrl.split('youtu.be/')[1]?.split('?')[0]; if (v) embedUrl = `https://www.youtube.com/embed/${v}`; }
      else if (videoUrl.includes('youtube.com/shorts/')) { const v = videoUrl.split('shorts/')[1]?.split('?')[0]; if (v) embedUrl = `https://www.youtube.com/embed/${v}`; }
      if (videoUrl.toLowerCase().endsWith('.mp4')) return <video src={videoUrl} controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', background: '#000' }} />;
    } catch {}
    return <iframe src={embedUrl} title="Video Solution" allowFullScreen style={{ width: '100%', height: '400px', borderRadius: '8px', border: 'none' }} />;
  };

  if (isTestFinished) {
    let correct = 0, incorrect = 0;
    allQuestions.forEach(q => {
      const sel = selectedAnswers[q._id];
      if (sel) { if (q.solutions?.includes(sel)) correct++; else incorrect++; }
    });
    const unattempted = allQuestions.length - correct - incorrect;
    const percentage = Math.round((correct / allQuestions.length) * 100);
    const score = (correct * 4) - (incorrect * 1);
    const maxScore = allQuestions.length * 4;

    // Save score (skip activity log since we logged it live per question)
    storage.saveScore({
      testId: testData._id, testName: testData.name,
      correct, incorrect, unattempted, total: allQuestions.length,
      percentage, score, maxScore, timeTaken: 0,
      date: new Date().toISOString(),
    }, true);

    // Clear session on finish
    storage.clearTestSession(testData._id);

    return (
      <div className="test-container" style={{ maxWidth: '600px' }}>
        <div className="card" style={{ padding: 'clamp(1.5rem, 3vw, 3rem)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', marginBottom: '1.5rem' }}>
            <Flag size={36} color="white" />
          </div>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Test Completed</h2>
          <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.4rem)', fontWeight: 800, color: score > 0 ? 'var(--primary)' : '#ef4444', marginBottom: '1rem' }}>
            Score: {score} / {maxScore}
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>(+4/-1)</span>
          </div>
          <div className="grid grid-cols-3" style={{ gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-lg)', color: 'var(--primary-hover)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{correct}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Correct</div>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-lg)', color: '#b91c1c' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{incorrect}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Incorrect</div>
            </div>
            <div style={{ padding: '1rem', background: 'var(--bg-light)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '1.8rem', fontWeight: 800 }}>{unattempted}</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600 }}>Skipped</div>
            </div>
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1.5rem' }}>
            Accuracy: <span style={{ color: percentage > 75 ? 'var(--primary)' : percentage > 40 ? '#f59e0b' : '#ef4444' }}>{percentage}%</span>
          </div>
          <button onClick={() => onExit(true)} className="btn btn-primary" style={{ width: '100%' }}>Back to Library</button>
        </div>
      </div>
    );
  }

  const currentQuestion = allQuestions[currentIndex];
  const isQuestionAnswered = answeredQuestions[currentQuestion._id];
  const isCurrentBookmarked = bookmarked[currentQuestion._id];

  return (
    <div className="test-container">
      <div className="test-header">
        <div>
          <h2 className="page-title" style={{ fontSize: 'clamp(1rem, 1.8vw, 1.3rem)', marginBottom: 0 }}>
            {testData.name || 'Practice Test'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem' }}>
            <p className="text-muted" style={{ fontWeight: 600 }}>Q {currentIndex + 1}/{allQuestions.length}</p>
            <div style={{ background: '#e2e8f0', height: '5px', width: '120px', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ background: 'var(--primary)', height: '100%', width: `${((currentIndex + 1) / allQuestions.length) * 100}%`, transition: 'var(--transition)' }} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleToggleBookmark}
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.6rem', color: isCurrentBookmarked ? '#f59e0b' : undefined }}
            title={isCurrentBookmarked ? 'Remove bookmark' : 'Bookmark this question'}
          >
            <Bookmark size={18} fill={isCurrentBookmarked ? '#f59e0b' : 'none'} />
          </button>
          <button onClick={() => onExit(false)} className="btn btn-secondary"><ArrowLeft size={16} /> Exit</button>
        </div>
      </div>

      <div className="mt-8">
        <div key={currentQuestion._id} className="question-card">
          <h3 className="question-text" style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)', flexShrink: 0 }}>Q{currentIndex + 1}.</span>
            <div style={{ flex: 1 }}>{renderContent(currentQuestion, 'Question text missing')}</div>
          </h3>

          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="options-list mt-4">
              {currentQuestion.options.map((opt: Option, optIndex: number) => {
                const isSelected = selectedAnswers[currentQuestion._id] === opt._id;
                let optionClass = 'option-item';
                if (isQuestionAnswered) {
                  const isCorrect = currentQuestion.solutions?.includes(opt._id);
                  if (isCorrect) optionClass += ' correct';
                  else if (isSelected) optionClass += ' incorrect';
                  else optionClass += ' disabled';
                } else if (isSelected) { optionClass += ' selected'; }
                return (
                  <div key={opt._id} className={optionClass} onClick={() => handleOptionSelect(currentQuestion._id, opt._id)}>
                    <div style={{ flex: 1 }}>{renderContent(opt, 'Option', optIndex)}</div>
                    {isQuestionAnswered && currentQuestion.solutions?.includes(opt._id) && <CheckCircle className="text-primary" size={18} />}
                    {isQuestionAnswered && isSelected && !currentQuestion.solutions?.includes(opt._id) && <XCircle style={{ color: '#ef4444' }} size={18} />}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="options-list mt-4">
              {['A', 'B', 'C', 'D'].map((letter) => {
                const fid = `fallback_${letter}`;
                const isSelected = selectedAnswers[currentQuestion._id] === fid;
                let cls = 'option-item';
                if (isQuestionAnswered) { cls += ' disabled'; }
                else if (isSelected) { cls += ' selected'; }
                return (
                  <div key={fid} className={cls} onClick={() => handleOptionSelect(currentQuestion._id, fid)}>
                    <div style={{ flex: 1, fontWeight: 600 }}>Option {letter}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem' }}>
            <button className="btn btn-secondary" onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))} disabled={currentIndex === 0} style={{ visibility: currentIndex === 0 ? 'hidden' : 'visible' }}>
              <ArrowLeft size={18} /> Prev
            </button>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 500 }}>Go to Q:</span>
              <input 
                type="number" 
                min={1} 
                max={allQuestions.length} 
                className="search-input" 
                style={{ width: '60px', padding: '0.35rem', textAlign: 'center', borderRadius: 'var(--radius-md)' }}
                placeholder="..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = parseInt(e.currentTarget.value);
                    if (!isNaN(val) && val >= 1 && val <= allQuestions.length) {
                      setCurrentIndex(val - 1);
                      e.currentTarget.value = '';
                      e.currentTarget.blur();
                    }
                  }
                }}
              />
            </div>

            {currentIndex < allQuestions.length - 1 ? (
              <button className="btn btn-primary" onClick={() => setCurrentIndex(prev => Math.min(allQuestions.length - 1, prev + 1))}>
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn-primary" onClick={handleFinishTest}><Send size={18} /> Finish</button>
            )}
          </div>

          {/* Solution */}
          {isQuestionAnswered && (
            <div className="solution-card mt-8" style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
              <h4 className="solution-title">Solution</h4>
              {currentQuestion.solutionDescription?.[0] ? (
                <>
                  {renderContent(currentQuestion.solutionDescription[0], '')}
                  {currentQuestion.solutionDescription[0].videos?.en && (
                    <div className="mt-4">
                      <h4 className="solution-title" style={{ color: 'var(--secondary)' }}><PlayCircle size={18} /> Video Solution</h4>
                      <div className="video-container" style={{ marginTop: '0.5rem' }}>{renderVideo(currentQuestion.solutionDescription[0].videos.en.videoUrl)}</div>
                    </div>
                  )}
                </>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Solution not available.</p>
              )}

              {/* Notes */}
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                {!showNoteInput ? (
                  <button onClick={() => setShowNoteInput(true)} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    <StickyNote size={14} /> {noteText ? 'Edit Note' : 'Add Note'}
                  </button>
                ) : (
                  <div>
                    <textarea
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      placeholder="Write your notes here..."
                      style={{ width: '100%', minHeight: '80px', padding: '0.6rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button onClick={handleSaveNote} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Save</button>
                      <button onClick={() => { setShowNoteInput(false); setNoteText(storage.getNote(currentQuestion._id)); }} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>Cancel</button>
                    </div>
                  </div>
                )}
                {noteText && !showNoteInput && (
                  <div style={{ marginTop: '0.5rem', padding: '0.6rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--secondary)', fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                    {noteText}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
