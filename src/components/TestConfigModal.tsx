import React, { useState } from 'react';
import { Clock, Play, BookOpen, Printer } from 'lucide-react';

export type TestMode = 'practice' | 'exam';

interface TestConfigModalProps {
  testName: string;
  onStart: (mode: TestMode, durationMinutes?: number) => void;
  onCancel: () => void;
  onPrint: () => void;
}

export const TestConfigModal: React.FC<TestConfigModalProps> = ({ testName, onStart, onCancel, onPrint }) => {
  const [mode, setMode] = useState<TestMode>('practice');
  const [duration, setDuration] = useState<number>(60);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="page-title" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Start Test</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem' }}>{testName}</p>

        <div className="mode-selector">
          <div 
            className={`mode-option ${mode === 'practice' ? 'selected' : ''}`}
            onClick={() => setMode('practice')}
          >
            <div className="mode-icon"><BookOpen size={24} /></div>
            <div className="mode-details">
              <h4>Practice Mode</h4>
              <p>Instant feedback and solutions after each question. Great for learning.</p>
            </div>
          </div>

          <div 
            className={`mode-option ${mode === 'exam' ? 'selected' : ''}`}
            onClick={() => setMode('exam')}
          >
            <div className="mode-icon"><Clock size={24} /></div>
            <div className="mode-details">
              <h4>Exam Mode</h4>
              <p>Timed environment with question palette & scoring. Solutions after submission.</p>
            </div>
          </div>
        </div>

        {mode === 'exam' && (
          <div className="duration-selector mt-4">
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Select Time Limit:</label>
            <select 
              value={duration} 
              onChange={(e) => setDuration(Number(e.target.value))}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', outline: 'none' }}
            >
              <option value={15}>15 Minutes</option>
              <option value={30}>30 Minutes</option>
              <option value={60}>60 Minutes (1 Hour)</option>
              <option value={120}>120 Minutes (2 Hours)</option>
              <option value={180}>180 Minutes (3 Hours)</option>
            </select>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Printer size={16} /> Download PDF
          </button>
          
          <div className="modal-secondary-actions">
            <button className="btn btn-secondary" onClick={onCancel}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={() => onStart(mode, mode === 'exam' ? duration : undefined)}
            >
              <Play size={18} /> Start Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
