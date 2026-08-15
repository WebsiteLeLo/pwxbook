import React, { useState, useEffect } from 'react';
import { storage, SpacedEntry } from '../services/storage';
import { Question, Option } from '../services/api';
import { BrainCircuit, ArrowLeft, PlayCircle, Check, X, ArrowRight } from 'lucide-react';

interface ReviewPageProps {
  onBack: () => void;
}

export const ReviewPage: React.FC<ReviewPageProps> = ({ onBack }) => {
  const [dueItems, setDueItems] = useState<SpacedEntry[]>(storage.getDueReviews());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).MathJax?.typesetPromise) {
      (window as any).MathJax.typesetPromise().catch(() => {});
    }
  }, [currentIndex, showAnswer]);

  if (dueItems.length === 0) {
    return (
      <div className="container py-8">
        <button onClick={onBack} className="btn btn-secondary mb-8">
          <ArrowLeft size={18} /> Back
        </button>
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(16,185,129,0.1)', borderRadius: '50%' }}>
              <BrainCircuit size={48} color="var(--primary)" />
            </div>
          </div>
          <h2 className="page-title">You're all caught up!</h2>
          <p className="text-muted" style={{ maxWidth: '400px', margin: '0 auto' }}>
            There are no questions due for review today. Keep practicing tests and any mistakes will appear here based on spaced repetition.
          </p>
        </div>
      </div>
    );
  }

  const currentItem = dueItems[currentIndex];
  const q: Question = currentItem.questionData;

  const handleReveal = () => {
    setShowAnswer(true);
  };

  const handleNext = (wasCorrect: boolean) => {
    storage.updateSpaced(currentItem.questionId, wasCorrect);
    
    // Remove from local list so it doesn't show again today
    const newItems = dueItems.filter((_, idx) => idx !== currentIndex);
    setDueItems(newItems);
    
    // Reset state
    setShowAnswer(false);
    setSelectedOption(null);
    if (currentIndex >= newItems.length) {
      setCurrentIndex(Math.max(0, newItems.length - 1));
    }
  };

  const renderContent = (item: { texts?: { en?: string }, imageIds?: { en?: { baseUrl: string, key: string } } }, fallback: string, index?: number) => {
    const hasText = item.texts?.en && typeof item.texts.en === 'string' && item.texts.en.trim().length > 0;
    const hasImage = !!item.imageIds?.en;
    if (!hasText && !hasImage) {
      if (typeof index === 'number') return <span style={{ fontWeight: 600 }}>{String.fromCharCode(65 + index)}</span>;
      return <span>{fallback}</span>;
    }
    return (
      <div>
        {hasText && <div dangerouslySetInnerHTML={{ __html: item.texts!.en! }} />}
        {hasImage && <img src={`${item.imageIds!.en!.baseUrl}${item.imageIds!.en!.key}`} alt="" style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px', marginTop: '0.5rem' }} />}
      </div>
    );
  };

  const renderVideo = (videoUrl: string) => {
    if (!videoUrl) return null;
    let embedUrl = videoUrl;
    try {
      if (videoUrl.includes('youtube.com/watch')) { const v = new URL(videoUrl).searchParams.get('v'); if (v) embedUrl = `https://www.youtube.com/embed/${v}`; }
      else if (videoUrl.includes('youtu.be/')) { const v = videoUrl.split('youtu.be/')[1]?.split('?')[0]; if (v) embedUrl = `https://www.youtube.com/embed/${v}`; }
    } catch {}
    return <iframe src={embedUrl} title="Video" allowFullScreen style={{ width: '100%', height: '350px', borderRadius: '8px', border: 'none', marginTop: '1rem' }} />;
  };

  return (
    <div className="container py-8">
      <div className="test-header">
        <div>
          <h2 className="page-title" style={{ fontSize: '1.5rem', marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BrainCircuit size={24} color="var(--primary)" /> Spaced Repetition Review
          </h2>
          <p className="text-muted" style={{ fontWeight: 600, marginTop: '0.5rem' }}>
            {dueItems.length} question{dueItems.length !== 1 ? 's' : ''} due today
          </p>
        </div>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={16} /> Exit
        </button>
      </div>

      <div className="mt-8">
        <div className="question-card">
          <div style={{ fontSize: '0.85rem', color: 'var(--secondary)', fontWeight: 600, marginBottom: '1rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>From: {currentItem.testName}</span>
            <span>Repetitions: {currentItem.repetitions}</span>
          </div>

          <h3 className="question-text">
            {renderContent(q, 'Question')}
          </h3>

          <div className="options-list mt-4">
            {q.options?.map((opt: Option, i: number) => {
              const isSelected = selectedOption === opt._id;
              let optionClass = 'option-item';
              
              if (showAnswer) {
                const isCorrect = q.solutions?.includes(opt._id);
                if (isCorrect) optionClass += ' correct';
                else if (isSelected) optionClass += ' incorrect';
                else optionClass += ' disabled';
              } else if (isSelected) {
                optionClass += ' selected';
              }

              return (
                <div 
                  key={opt._id} 
                  className={optionClass}
                  onClick={() => !showAnswer && setSelectedOption(opt._id)}
                  style={{ cursor: showAnswer ? 'default' : 'pointer' }}
                >
                  <div style={{ flex: 1 }}>{renderContent(opt, 'Option', i)}</div>
                </div>
              );
            })}
          </div>

          {!showAnswer ? (
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
              <button 
                className="btn btn-primary" 
                onClick={handleReveal}
                disabled={!selectedOption}
              >
                Reveal Answer
              </button>
            </div>
          ) : (
            <div className="mt-8" style={{ animation: 'fadeIn 0.5s ease-out' }}>
              <div className="solution-card mb-6">
                <h4 className="solution-title">Solution Explanation</h4>
                {q.solutionDescription?.[0] ? (
                  <>
                    {renderContent(q.solutionDescription[0], '')}
                    {q.solutionDescription[0].videos?.en && renderVideo(q.solutionDescription[0].videos.en.videoUrl)}
                  </>
                ) : (
                  <p className="text-muted">No detailed solution available.</p>
                )}
              </div>

              <div style={{ padding: '1.5rem', background: 'var(--bg-light)', borderRadius: 'var(--radius-lg)', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                <h4 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>How did you do?</h4>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button 
                    className="btn"
                    style={{ background: '#fee2e2', color: '#b91c1c', flex: 1, maxWidth: '200px', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleNext(false)}
                  >
                    <X size={18} /> Got it Wrong
                  </button>
                  <button 
                    className="btn"
                    style={{ background: '#d1fae5', color: '#059669', flex: 1, maxWidth: '200px', display: 'flex', justifyContent: 'center', gap: '0.5rem' }}
                    onClick={() => handleNext(true)}
                  >
                    <Check size={18} /> Got it Right
                  </button>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
                  Based on your response, we'll schedule this question for optimal review intervals using SM-2 algorithm.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
