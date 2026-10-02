import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

interface ChapterReaderProps {
  bookId: string;
  chapterId: string;
  onBack: () => void;
}

export const ChapterReader: React.FC<ChapterReaderProps> = ({ bookId, chapterId, onBack }) => {
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [secureData, setSecureData] = useState<any>(null);
  const [pdfInteractData, setPdfInteractData] = useState<any>(null);

  useEffect(() => {
    loadPage(page);
  }, [page, bookId, chapterId]);

  const loadPage = async (pageNumber: number) => {
    setLoading(true);
    setError(null);
    setSecureData(null);
    setPdfInteractData(null);

    try {
      // 1. Get Request ID
      const requestId = await api.getChapterRequestId(bookId, chapterId, pageNumber);
      if (!requestId) {
        throw new Error("Could not fetch Request ID for this page.");
      }

      // 2. Get Secure Details
      const secureRes = await api.getChapterSecureDetails(bookId, chapterId, pageNumber, requestId);
      if (!secureRes || !secureRes.success) {
        throw new Error(secureRes?.message || "Failed to load secure details. (Might require auth/referer headers)");
      }
      
      setSecureData(secureRes.data);

      // Attempt to extract documentId if it exists in the payload
      const possibleDocId = secureRes.data?.documentId || secureRes.data?.docId || null;
      if (possibleDocId) {
        // 3. Get PDF Interact (Optional, only if documentId is found)
        const pdfRes = await api.getChapterPdfInteract(possibleDocId, pageNumber);
        if (pdfRes && pdfRes.success) {
          setPdfInteractData(pdfRes.data);
        }
      }

    } catch (err: any) {
      setError(err.message || "An error occurred while loading content.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => setPage(p => p + 1);
  const handlePrevPage = () => setPage(p => Math.max(1, p - 1));

  // Helper to render any images found in the data payload
  const renderContentImages = (data: any) => {
    if (!data) return null;
    const strData = JSON.stringify(data);
    // Find basic image URLs in the payload for naive rendering
    const urls = strData.match(/https?:\/\/[^"']*\.(?:png|jpg|jpeg|gif|webp)/gi);
    
    if (urls && urls.length > 0) {
      const uniqueUrls = Array.from(new Set(urls));
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', marginTop: '2rem' }}>
          {uniqueUrls.map((url, i) => (
            <img key={i} src={url} alt={`Content ${i}`} style={{ maxWidth: '100%', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <button onClick={onBack} className="btn btn-secondary">
          <ArrowLeft size={20} /> Back
        </button>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Chapter Reader</h2>
        <div style={{ width: '80px' }}></div> {/* spacer */}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2rem', padding: '1rem', background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <button onClick={handlePrevPage} disabled={page === 1 || loading} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ fontWeight: 600 }}>Page {page}</span>
        <button onClick={handleNextPage} disabled={loading} className="btn btn-secondary" style={{ padding: '0.5rem' }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {loading && <div className="spinner" style={{ margin: '3rem auto' }}></div>}

      {error && (
        <div style={{ padding: '1rem', background: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && secureData && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 600 }}>Raw Data Payload (Secure Details)</h3>
          
          {/* Attempt to show images if any exist */}
          {renderContentImages(secureData)}

          <div style={{ marginTop: '2rem', background: '#f8fafc', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
            <pre style={{ fontSize: '0.85rem', color: '#334155' }}>
              {JSON.stringify(secureData, null, 2)}
            </pre>
          </div>

          {pdfInteractData && (
             <div style={{ marginTop: '2rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', color: 'var(--primary)', fontWeight: 600 }}>PDF Interact Data</h3>
                <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', overflowX: 'auto' }}>
                  <pre style={{ fontSize: '0.85rem', color: '#334155' }}>
                    {JSON.stringify(pdfInteractData, null, 2)}
                  </pre>
                </div>
             </div>
          )}
        </div>
      )}
    </div>
  );
};
