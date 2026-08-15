import React, { useState, useEffect } from 'react';
import { TestData, Question, Option } from '../services/api';
import { storage } from '../services/storage';
import { Flag, ArrowLeft, ArrowRight, PlayCircle } from 'lucide-react';
import { ImageZoom } from './ImageZoom';

interface TestAnalysisProps {
  testData: TestData;
  selectedAnswers: Record<string, string>;
  statuses: Record<string, number>;
  timeTaken: number;
  timePerQuestion?: Record<string, number>;
  onExit: () => void;
}

export const TestAnalysis: React.FC<TestAnalysisProps> = ({ testData, selectedAnswers, timeTaken, timePerQuestion = {}, onExit }) => {
  const [view, setView] = useState<'summary' | 'review'>('summary');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if ((window as any).MathJax && (window as any).MathJax.typesetPromise) {
      (window as any).MathJax.typesetPromise().catch((err: any) => console.error(err));
    }
  }, [view, currentIndex]);

  const allQuestions: Question[] = [];
  testData.sections?.forEach(section => {
    if (section.questions) allQuestions.push(...section.questions);
  });

  let correct = 0;
  let incorrect = 0;
  
  allQuestions.forEach(q => {
    const selected = selectedAnswers[q._id];
    if (selected) {
      if (q.solutions?.includes(selected)) {
        correct++;
      } else {
        incorrect++;
      }
    }
  });

  const unattempted = allQuestions.length - correct - incorrect;
  const percentage = allQuestions.length > 0 ? Math.round((correct / allQuestions.length) * 100) : 0;
  const score = (correct * 4) - (incorrect * 1);
  const maxScore = allQuestions.length * 4;

  // Save score and mistakes on mount
  useEffect(() => {
    storage.saveScore({
      testId: testData._id, testName: testData.name,
      correct, incorrect, unattempted, total: allQuestions.length,
      percentage, score, maxScore, timeTaken,
      date: new Date().toISOString(),
    });

    // Log mistakes
    allQuestions.forEach(q => {
      const selected = selectedAnswers[q._id];
      if (selected && !q.solutions?.includes(selected)) {
        storage.logMistake({ questionId: q._id, testId: testData._id, testName: testData.name, questionData: q });
      }
    });
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
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

  const renderVideo = (videoUrl: string) => {
    if (!videoUrl) return null;
    let embedUrl = videoUrl;
    try {
      if (videoUrl.includes('youtube.com/watch')) {
        const urlObj = new URL(videoUrl);
        const v = urlObj.searchParams.get('v');
        if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
      } else if (videoUrl.includes('youtu.be/')) {
        const v = videoUrl.split('youtu.be/')[1]?.split('?')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
      } else if (videoUrl.includes('youtube.com/shorts/')) {
        const v = videoUrl.split('shorts/')[1]?.split('?')[0];
        if (v) embedUrl = `https://www.youtube.com/embed/${v}`;
      }
      if (videoUrl.toLowerCase().endsWith('.mp4')) {
        return <video src={videoUrl} controls style={{ width: '100%', maxHeight: '400px', borderRadius: '8px', background: '#000' }} />;
      }
    } catch(e) {}

    return <iframe src={embedUrl} title="Video Solution" allowFullScreen style={{ width: '100%', height: '400px', borderRadius: '8px', border: 'none' }} />;
  };

  if (view === 'summary') {
    return (
      <div className="test-container" style={{ maxWidth: '800px' }}>
        <div className="card" style={{ padding: '3rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '100px', height: '100px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', marginBottom: '2rem' }}>
            <Flag size={48} color="white" />
          </div>
          <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Exam Completed</h2>
          <p className="text-muted" style={{ marginBottom: '1rem' }}>{testData.name}</p>
          <div style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '1rem' }}>
            Time Taken: {formatTime(timeTaken)}
          </div>
          <div style={{ fontSize: 'clamp(1.1rem, 2vw, 1.5rem)', fontWeight: 800, color: score > 0 ? 'var(--primary)' : '#ef4444', marginBottom: '1.5rem' }}>
            Score: {score} / {maxScore}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: '0.5rem' }}>(+4 correct, -1 wrong)</span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1.5rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: 'var(--radius-lg)', color: 'var(--primary-hover)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{correct}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Correct</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: 'var(--radius-lg)', color: '#b91c1c' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{incorrect}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Incorrect</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: 'var(--radius-lg)', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>{unattempted}</div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Skipped</div>
            </div>
            <div style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: 'var(--radius-lg)', color: 'var(--secondary)' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800 }}>
                <span style={{ color: percentage > 75 ? 'var(--primary)' : percentage > 40 ? '#f59e0b' : '#ef4444' }}>{percentage}%</span>
              </div>
              <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>Accuracy</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <button onClick={onExit} className="btn btn-secondary">Back to Library</button>
            <button onClick={() => setView('review')} className="btn btn-primary">Review Solutions</button>
          </div>
        </div>
      </div>
    );
  }

  // Review View
  const currentQuestion = allQuestions[currentIndex];
  
  return (
    <div className="test-container">
      <div className="test-header">
        <div>
          <h2 className="page-title" style={{ fontSize: '1.5rem', marginBottom: 0 }}>Review Solutions</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
            <p className="text-muted" style={{ fontWeight: 600 }}>Question {currentIndex + 1} of {allQuestions.length}</p>
            {timePerQuestion[currentQuestion._id] !== undefined && (
              <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', background: timePerQuestion[currentQuestion._id] > 120 ? '#fee2e2' : '#f1f5f9', color: timePerQuestion[currentQuestion._id] > 120 ? '#ef4444' : 'var(--text-muted)', borderRadius: '4px', fontWeight: 600 }}>
                Time spent: {formatTime(timePerQuestion[currentQuestion._id])}
              </span>
            )}
          </div>
        </div>
        <button onClick={() => setView('summary')} className="btn btn-secondary">
          <ArrowLeft size={16} /> Back to Summary
        </button>
      </div>

      <div className="mt-8">
        <div className="question-card">
          <h3 className="question-text" style={{ display: 'flex', gap: '0.5rem' }}>
            <span style={{ color: 'var(--primary)', flexShrink: 0 }}>Q{currentIndex + 1}.</span>
            <div style={{ flex: 1 }}>{renderContent(currentQuestion, 'Question text missing')}</div>
          </h3>

          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <div className="options-list mt-4">
              {currentQuestion.options.map((opt: Option, optIndex: number) => {
                const isSelected = selectedAnswers[currentQuestion._id] === opt._id;
                const isCorrect = currentQuestion.solutions?.includes(opt._id);
                
                let optionClass = 'option-item disabled';
                if (isCorrect) optionClass = 'option-item correct';
                else if (isSelected) optionClass = 'option-item incorrect';

                return (
                  <div key={opt._id} className={optionClass}>
                    <div style={{ flex: 1 }}>{renderContent(opt, 'Option', optIndex)}</div>
                    {isSelected && !isCorrect && <span style={{ color: '#ef4444', fontWeight: 600, fontSize: '0.875rem' }}>(Your Answer)</span>}
                    {isCorrect && <span style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.875rem' }}>(Correct Answer)</span>}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted italic mt-4">Subjective question.</div>
          )}

          <div className="solution-card mt-8">
            <h4 className="solution-title">Solution Explanation</h4>
            {currentQuestion.solutionDescription && currentQuestion.solutionDescription.length > 0 ? (
              <>
                {renderContent(currentQuestion.solutionDescription[0], '')}
                {currentQuestion.solutionDescription[0].videos?.en && (
                  <div className="mt-4">
                    <h4 className="solution-title" style={{ color: 'var(--secondary)' }}><PlayCircle size={20} /> Video Solution</h4>
                    <div className="video-container" style={{ marginTop: '1rem' }}>
                      {renderVideo(currentQuestion.solutionDescription[0].videos.en.videoUrl)}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p style={{ color: 'var(--text-muted)' }}>Detailed text solution is not available.</p>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2rem', marginBottom: '4rem' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
          disabled={currentIndex === 0}
          style={{ visibility: currentIndex === 0 ? 'hidden' : 'visible' }}
        >
          <ArrowLeft size={20} /> Previous
        </button>
        {currentIndex < allQuestions.length - 1 && (
          <button className="btn btn-primary" onClick={() => setCurrentIndex(prev => Math.min(allQuestions.length - 1, prev + 1))}>
            Next <ArrowRight size={20} />
          </button>
        )}
      </div>
    </div>
  );
};
