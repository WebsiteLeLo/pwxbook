import React, { useState, useEffect } from 'react';
import { storage, MistakeEntry } from '../services/storage';
import { ArrowLeft, CheckCircle2, AlertTriangle } from 'lucide-react';
import { ImageZoom } from './ImageZoom';

interface MistakesPageProps {
  onBack: () => void;
}

export const MistakesPage: React.FC<MistakesPageProps> = ({ onBack }) => {
  const [mistakes, setMistakes] = useState<MistakeEntry[]>([]);

  useEffect(() => {
    setMistakes(storage.getMistakes());
  }, []);

  const handleResolve = (questionId: string) => {
    storage.resolveMistake(questionId);
    setMistakes(prev => prev.filter(m => m.questionId !== questionId));
  };

  const renderContent = (content: any) => {
    if (!content) return null;
    let html = content.texts?.en || '';
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-start' }}>
        {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
        {content.imageIds?.en?.key && content.imageIds?.en?.baseUrl && (
          <ImageZoom src={`${content.imageIds.en.baseUrl}${content.imageIds.en.key}`} />
        )}
      </div>
    );
  };

  return (
    <div className="container py-8" style={{ maxWidth: '900px' }}>
      <button onClick={onBack} className="btn btn-secondary mb-6">
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <AlertTriangle size={28} color="#ef4444" /> Error Log Book (Mistakes Gallery)
        </h2>
        <p className="page-subtitle">Review the questions you answered incorrectly. Mark them as resolved once you've mastered them.</p>
      </div>

      {mistakes.length === 0 ? (
        <div className="card text-center" style={{ padding: '4rem 2rem' }}>
          <CheckCircle2 size={48} color="var(--primary)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>No mistakes logged!</h3>
          <p className="text-muted">You either haven't made any mistakes yet or you've resolved them all. Keep it up!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {mistakes.map(entry => (
            <div key={entry.questionId} className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #ef4444' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {entry.testName}
                  </span>
                  <div style={{ fontSize: '0.85rem', color: '#ef4444', fontWeight: 600, marginTop: '0.25rem' }}>
                    Got it wrong {entry.count} time{entry.count > 1 ? 's' : ''}
                  </div>
                </div>
                <div>
                  <button onClick={() => handleResolve(entry.questionId)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CheckCircle2 size={16} /> Mark as Resolved
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: '1rem', fontWeight: 500 }}>
                {renderContent(entry.questionData)}
              </div>

              <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.5rem', color: 'var(--primary-hover)' }}>Correct Answer / Solution:</div>
                {/* Find correct option text */}
                {entry.questionData.options?.map((opt: any, index: number) => {
                  if (entry.questionData.solutions?.includes(opt._id)) {
                    return (
                      <div key={opt._id} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                        <strong style={{ whiteSpace: 'nowrap' }}>Option {String.fromCharCode(65 + index)}:</strong>
                        <div>{renderContent(opt)}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
