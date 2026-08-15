import React, { useState, useEffect } from 'react';
import { storage, BookmarkEntry } from '../services/storage';
import { Question, Option } from '../services/api';
import { Bookmark, ArrowLeft, Trash2, StickyNote, PlayCircle } from 'lucide-react';

interface BookmarksPageProps {
  onBack: () => void;
}

export const BookmarksPage: React.FC<BookmarksPageProps> = ({ onBack }) => {
  const [bookmarks, setBookmarks] = useState<BookmarkEntry[]>(storage.getBookmarks());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if ((window as any).MathJax?.typesetPromise) {
      (window as any).MathJax.typesetPromise().catch(() => {});
    }
  }, [expandedId]);

  const handleRemove = (questionId: string) => {
    storage.toggleBookmark(questionId, '', '', null);
    setBookmarks(storage.getBookmarks());
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
      if (videoUrl.toLowerCase().endsWith('.mp4')) return <video src={videoUrl} controls style={{ width: '100%', maxHeight: '350px', borderRadius: '8px' }} />;
    } catch {}
    return <iframe src={embedUrl} title="Video" allowFullScreen style={{ width: '100%', height: '350px', borderRadius: '8px', border: 'none' }} />;
  };

  return (
    <div className="container py-8">
      <button onClick={onBack} className="btn btn-secondary mb-8">
        <ArrowLeft size={18} /> Back
      </button>

      <div className="page-header">
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Bookmark size={24} /> Bookmarked Questions
        </h2>
        <p className="page-subtitle">{bookmarks.length} question{bookmarks.length !== 1 ? 's' : ''} saved</p>
      </div>

      {bookmarks.length === 0 ? (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)' }}>No bookmarked questions yet. Tap the bookmark icon on any question to save it here.</p>
        </div>
      ) : (
        <div className="mt-4">
          {bookmarks.map((bm) => {
            const q: Question = bm.questionData;
            const isExpanded = expandedId === bm.questionId;
            const note = storage.getNote(bm.questionId);

            return (
              <div key={bm.questionId} className="chapter-item" style={{ marginBottom: '0.75rem' }}>
                <div
                  className="chapter-header"
                  onClick={() => setExpandedId(isExpanded ? null : bm.questionId)}
                  style={{ gap: '0.75rem' }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 'clamp(0.75rem, 1.1vw, 0.85rem)', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                      {bm.testName}
                    </div>
                    <div style={{ fontWeight: 600, fontSize: 'clamp(0.85rem, 1.2vw, 0.95rem)' }}>
                      {renderContent(q, 'Question')}
                    </div>
                    {note && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.25rem', color: 'var(--secondary)', fontSize: '0.75rem' }}>
                        <StickyNote size={12} /> Has note
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRemove(bm.questionId); }}
                    style={{ color: '#ef4444', padding: '0.25rem' }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {isExpanded && (
                  <div className="chapter-content">
                    {/* Options */}
                    {q.options && q.options.length > 0 && (
                      <div className="options-list" style={{ marginBottom: '1rem' }}>
                        {q.options.map((opt: Option, i: number) => {
                          const isCorrect = q.solutions?.includes(opt._id);
                          return (
                            <div key={opt._id} className={`option-item ${isCorrect ? 'correct' : 'disabled'}`}>
                              {renderContent(opt, 'Option', i)}
                              {isCorrect && <span style={{ color: 'var(--primary)', fontSize: '0.75rem', fontWeight: 600 }}>✓</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Solution */}
                    {q.solutionDescription?.[0] && (
                      <div className="solution-card">
                        <h4 className="solution-title">Solution</h4>
                        {renderContent(q.solutionDescription[0], '')}
                        {q.solutionDescription[0].videos?.en && (
                          <div className="mt-4">
                            <h4 className="solution-title" style={{ color: 'var(--secondary)' }}><PlayCircle size={18} /> Video</h4>
                            <div className="video-container" style={{ marginTop: '0.5rem' }}>
                              {renderVideo(q.solutionDescription[0].videos.en.videoUrl)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Note */}
                    {note && (
                      <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--secondary)' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <StickyNote size={14} /> Your Note
                        </div>
                        <p style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>{note}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
