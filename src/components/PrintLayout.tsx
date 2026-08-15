import React, { useEffect, useState } from 'react';
import { TestData } from '../services/api';
import { Printer, ArrowLeft } from 'lucide-react';

interface PrintLayoutProps {
  testData: TestData;
  onBack: () => void;
}

export const PrintLayout: React.FC<PrintLayoutProps> = ({ testData, onBack }) => {
  const [isReady, setIsReady] = useState(false);
  const allQuestions = testData.sections.flatMap(s => s.questions);

  // We need to wait a moment for MathJax to render the formulas
  useEffect(() => {
    const timer = setTimeout(() => {
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise().then(() => {
          setIsReady(true);
        }).catch(() => {
          setIsReady(true);
        });
      } else {
        setIsReady(true);
      }
    }, 1500); // Wait for DOM injection
    return () => clearTimeout(timer);
  }, []);

  const handlePrint = () => {
    window.print();
  };

  const renderContent = (content: any) => {
    if (!content) return null;
    let html = content.texts?.en || '';
    if (content.imageIds?.en?.key && content.imageIds?.en?.baseUrl) {
      html += `<br/><img src="${content.imageIds.en.baseUrl}${content.imageIds.en.key}" style="max-width:300px; max-height:200px" />`;
    }
    return <div dangerouslySetInnerHTML={{ __html: html }} style={{ display: 'inline' }} />;
  };

  return (
    <div className="print-container" style={{ background: 'white', minHeight: '100vh', padding: '2rem' }}>
      {/* Non-printable header controls */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem', padding: '1rem', background: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <button className="btn btn-secondary" onClick={onBack}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {!isReady && <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Preparing document...</span>}
          <button className="btn btn-primary" onClick={handlePrint} disabled={!isReady}>
            <Printer size={16} /> Print PDF
          </button>
        </div>
      </div>

      {/* Printable Document */}
      <div className="printable-document" style={{ color: 'black', fontFamily: 'serif', maxWidth: '800px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', borderBottom: '2px solid black', paddingBottom: '1rem' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{testData.name}</h1>
          <p style={{ fontSize: '14px', color: '#444' }}>PWX Tests - Practice Worksheet</p>
        </div>

        <div className="questions-section">
          {allQuestions.map((q, index) => {
            return (
              <div key={q._id} style={{ marginBottom: '2rem', pageBreakInside: 'avoid' }}>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <strong style={{ whiteSpace: 'nowrap' }}>Q.{index + 1}</strong>
                  <div>{renderContent(q)}</div>
                </div>


              </div>
            );
          })}
        </div>

        {/* Answer Key */}
        <div style={{ marginTop: '4rem', pageBreakBefore: 'always' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '1.5rem', borderBottom: '1px solid black', paddingBottom: '0.5rem' }}>Answer Key</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {allQuestions.map((q, index) => {
              // Find the correct option index
              let correctLetter = '?';
              if (q.solutions && q.solutions.length > 0) {
                const correctId = q.solutions[0];
                const optIndex = q.options?.findIndex(o => o._id === correctId);
                if (optIndex !== undefined && optIndex >= 0) {
                  correctLetter = String.fromCharCode(65 + optIndex);
                }
              }
              return (
                <div key={`ans-${q._id}`} style={{ fontSize: '14px' }}>
                  <strong>Q.{index + 1}:</strong> {correctLetter}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
