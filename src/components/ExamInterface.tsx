import React, { useState, useEffect } from 'react';
import { TestData, Question, Option } from '../services/api';
import { User, Clock, Bookmark } from 'lucide-react';
import { storage } from '../services/storage';
import { ImageZoom } from './ImageZoom';

interface ExamInterfaceProps {
  testData: TestData;
  durationMinutes: number;
  onFinish: (selectedAnswers: Record<string, string>, statuses: Record<string, number>, timeTaken: number, timePerQuestion?: Record<string, number>) => void;
}

// 0: Not Visited (Gray)
// 1: Not Answered (Red)
// 2: Answered (Green)
// 3: Marked for Review (Purple)
// 4: Answered & Marked for Review (Purple with Green Check)

declare global {
  interface Window {
    MathJax: any;
  }
}

export const ExamInterface: React.FC<ExamInterfaceProps> = ({ testData, durationMinutes, onFinish }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState(durationMinutes * 60);
  const [timePerQuestion, setTimePerQuestion] = useState<Record<string, number>>({});
  const [questionStart, setQuestionStart] = useState(Date.now());
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  
  // Proctor Mode State
  const [warnings, setWarnings] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [isForceSubmitting, setIsForceSubmitting] = useState(false);

  const allQuestions: Question[] = [];
  testData.sections?.forEach(section => {
    if (section.questions) allQuestions.push(...section.questions);
  });

  // Proctor Mode Logic
  useEffect(() => {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => console.log('Fullscreen error:', err));
    }
    
    const handleViolation = () => {
      setWarnings(prev => {
        const newWarnings = prev + 1;
        if (newWarnings >= 3) setIsForceSubmitting(true);
        else setShowWarning(true);
        return newWarnings;
      });
    };

    const handleVisibilityChange = () => { if (document.hidden) handleViolation(); };
    const handleFullscreenChange = () => { if (!document.fullscreenElement) handleViolation(); };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (isForceSubmitting && currentQuestion) {
      alert("Proctor Warning: You have violated exam rules 3 times. The test is being auto-submitted.");
      const elapsed = Math.round((Date.now() - questionStart) / 1000);
      const finalTpq = { ...timePerQuestion, [currentQuestion._id]: (timePerQuestion[currentQuestion._id] || 0) + elapsed };
      onFinish(selectedAnswers, statuses, (durationMinutes * 60) - timeLeft, finalTpq);
    }
  }, [isForceSubmitting]);

  // Initialize first question as Not Answered (1)
  useEffect(() => {
    if (allQuestions.length > 0 && statuses[allQuestions[0]._id] === undefined) {
      setStatuses({ [allQuestions[0]._id]: 1 });
    }
  }, []);

  // Timer
  useEffect(() => {
    if (timeLeft <= 0) {
      handleAutoSubmit();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleAutoSubmit = () => {
    alert("Time is up! Submitting test automatically.");
    onFinish(selectedAnswers, statuses, durationMinutes * 60, timePerQuestion);
  };

  useEffect(() => {
    if (window.MathJax && window.MathJax.typesetPromise) {
      window.MathJax.typesetPromise().catch((err: any) => console.error(err));
    }
  }, [currentIndex]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQuestion = allQuestions[currentIndex];

  const navigateToQuestion = (index: number) => {
    // Record time spent on current question
    const elapsed = Math.round((Date.now() - questionStart) / 1000);
    setTimePerQuestion(prev => ({
      ...prev,
      [currentQuestion._id]: (prev[currentQuestion._id] || 0) + elapsed
    }));
    setQuestionStart(Date.now());

    if (!statuses[currentQuestion._id] || statuses[currentQuestion._id] === 0) {
      setStatuses(prev => ({ ...prev, [currentQuestion._id]: 1 }));
    }
    if (statuses[allQuestions[index]._id] === undefined || statuses[allQuestions[index]._id] === 0) {
      setStatuses(prev => ({ ...prev, [allQuestions[index]._id]: 1 }));
    }
    setCurrentIndex(index);
  };

  const handleOptionSelect = (optionId: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQuestion._id]: optionId }));
  };

  const handleClearResponse = () => {
    const newAnswers = { ...selectedAnswers };
    delete newAnswers[currentQuestion._id];
    setSelectedAnswers(newAnswers);
  };

  const handleSaveAndNext = () => {
    const hasAnswer = !!selectedAnswers[currentQuestion._id];
    setStatuses(prev => ({
      ...prev,
      [currentQuestion._id]: hasAnswer ? 2 : 1
    }));
    
    if (currentIndex < allQuestions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    }
  };

  const handleMarkForReviewAndNext = () => {
    const hasAnswer = !!selectedAnswers[currentQuestion._id];
    setStatuses(prev => ({
      ...prev,
      [currentQuestion._id]: hasAnswer ? 4 : 3
    }));
    
    if (currentIndex < allQuestions.length - 1) {
      navigateToQuestion(currentIndex + 1);
    }
  };

  const renderContent = (item: { texts?: { en?: string }, imageIds?: { en?: { baseUrl: string, key: string } } }, fallback: string, index?: number) => {
    const hasText = item.texts?.en && typeof item.texts.en === 'string' && item.texts.en.trim().length > 0;
    const hasImage = !!item.imageIds?.en;
    
    if (!hasText && !hasImage) {
      if (typeof index === 'number') {
        return <span style={{ fontWeight: 600, fontSize: '1.25rem' }}>{String.fromCharCode(65 + index)}</span>;
      }
      return <span>{fallback}</span>;
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
        {hasText && <div dangerouslySetInnerHTML={{ __html: item.texts!.en! }} />}
        {hasImage && <ImageZoom src={`${item.imageIds!.en!.baseUrl}${item.imageIds!.en!.key}`} />}
      </div>
    );
  };

  if (!currentQuestion) return null;

  // Counts
  const getCount = (status: number) => Object.values(statuses).filter(s => s === status).length;
  const notVisitedCount = allQuestions.length - Object.keys(statuses).length;
  const notAnsweredCount = getCount(1);
  const answeredCount = getCount(2);
  const markedCount = getCount(3);
  const _answeredMarkedCount = getCount(4);

  return (
    <div className="exam-layout">
      {/* Top Navbar */}
      <div className="exam-header" style={{ justifyContent: 'space-between' }}>
        <div>{testData.name || 'Practice Exam'}</div>
        <button
          onClick={() => {
            const q = currentQuestion;
            const isNow = storage.toggleBookmark(q._id, testData._id, testData.name, q);
            setBookmarked(prev => ({ ...prev, [q._id]: isNow }));
          }}
          style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: '0.25rem' }}
          title="Bookmark"
        >
          <Bookmark size={20} fill={bookmarked[currentQuestion?._id] ? '#fbbf24' : 'none'} />
        </button>
      </div>

      <div className="exam-body">
        {/* Main Content Area */}
        <div className="exam-main">
          <div className="exam-question-header">
            <span style={{ fontWeight: 700 }}>Question {currentIndex + 1}</span>
            <span style={{ color: 'var(--text-muted)' }}>Single Choice Type</span>
          </div>

          <div className="exam-question-content">
            <div className="mb-4">
              {renderContent(currentQuestion, 'Question text missing')}
            </div>
            
            <hr style={{ margin: '1rem 0', borderColor: 'var(--border-color)' }} />
            
            <div className="exam-options">
              {currentQuestion.options && currentQuestion.options.length > 0 ? (
                currentQuestion.options.map((opt: Option, i: number) => {
                  const isSelected = selectedAnswers[currentQuestion._id] === opt._id;
                  return (
                    <div 
                      key={opt._id} 
                      className={`exam-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(opt._id)}
                    >
                      <div style={{ flex: 1, fontWeight: 600 }}>
                        {renderContent(opt, 'Option', i)}
                      </div>
                    </div>
                  );
                })
              ) : (
                // Fallback for when options are baked into the question text
                ['A', 'B', 'C', 'D'].map((letter, i) => {
                  // Use the letter as ID for selection
                  const fallbackId = `fallback_${letter}`;
                  const isSelected = selectedAnswers[currentQuestion._id] === fallbackId;
                  return (
                    <div 
                      key={fallbackId} 
                      className={`exam-option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleOptionSelect(fallbackId)}
                    >
                      <div style={{ flex: 1, fontWeight: 600 }}>
                        Option {letter}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="exam-action-bar">
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="exam-btn exam-btn-secondary" onClick={handleMarkForReviewAndNext}>
                Mark for Review & Next
              </button>
              <button className="exam-btn exam-btn-secondary" onClick={handleClearResponse}>
                Clear Response
              </button>
            </div>
            <button className="exam-btn exam-btn-primary" onClick={handleSaveAndNext}>
              Save & Next
            </button>
          </div>
        </div>

        {/* Right Sidebar Palette */}
        <div className="exam-sidebar">
          <div className="exam-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', borderBottom: '1px solid var(--border-color)' }}>
              <div style={{ background: '#e2e8f0', padding: '0.5rem', borderRadius: '50%' }}>
                <User size={32} color="#64748b" />
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>Candidate</div>
                <div style={{ color: '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={16} /> {formatTime(timeLeft)}
                </div>
              </div>
            </div>

            <div className="exam-legend">
              <div className="exam-legend-item"><div className="exam-bubble bg-gray">{notVisitedCount}</div> Not Visited</div>
              <div className="exam-legend-item"><div className="exam-bubble bg-red">{notAnsweredCount}</div> Not Answered</div>
              <div className="exam-legend-item"><div className="exam-bubble bg-green">{answeredCount}</div> Answered</div>
              <div className="exam-legend-item"><div className="exam-bubble bg-purple">{markedCount}</div> Marked for Review</div>
              <div className="exam-legend-item" style={{ width: '100%' }}>
                <div className="exam-bubble bg-purple-checked">
                  <span className="dot"></span>
                </div>
                Answered & Marked for Review (will be considered for evaluation)
              </div>
            </div>
          </div>

          <div className="exam-palette">
            <h4 style={{ padding: '0.5rem', background: 'var(--bg-light)' }}>Question Palette:</h4>
            <div className="exam-palette-grid">
              {allQuestions.map((q, i) => {
                const s = statuses[q._id] || 0;
                let bgClass = 'bg-gray';
                if (s === 1) bgClass = 'bg-red';
                else if (s === 2) bgClass = 'bg-green';
                else if (s === 3) bgClass = 'bg-purple';
                else if (s === 4) bgClass = 'bg-purple-checked';

                return (
                  <button 
                    key={q._id} 
                    className={`exam-palette-btn ${bgClass}`}
                    onClick={() => navigateToQuestion(i)}
                  >
                    {s === 4 && <span className="dot"></span>}
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%' }}
              onClick={() => {
                if(window.confirm('Are you sure you want to submit the test?')) {
                  // Record final question time
                  const elapsed = Math.round((Date.now() - questionStart) / 1000);
                  const finalTpq = { ...timePerQuestion, [currentQuestion._id]: (timePerQuestion[currentQuestion._id] || 0) + elapsed };
                  onFinish(selectedAnswers, statuses, (durationMinutes * 60) - timeLeft, finalTpq);
                }
              }}
            >
              Submit Test
            </button>
          </div>
        </div>
      </div>

      {showWarning && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content text-center">
            <h2 style={{ color: '#ef4444', marginBottom: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>⚠️ Proctor Warning</h2>
            <p style={{ marginBottom: '1rem', color: 'var(--text-main)', fontSize: '1.1rem' }}>
              You have switched tabs or exited fullscreen. This is a strict exam environment.
              <br/><br/>
              <strong style={{ fontSize: '1.25rem', color: '#f59e0b' }}>Warning {warnings} of 3</strong>
              <br/><br/>
              If you receive 3 warnings, your exam will be automatically submitted.
            </p>
            <button className="btn btn-primary" onClick={() => {
              setShowWarning(false);
              document.documentElement.requestFullscreen().catch(() => {});
            }}>
              Return to Exam
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
