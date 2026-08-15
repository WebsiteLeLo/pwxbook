import React, { useState, useMemo } from 'react';
import { storage } from '../services/storage';
import { ArrowLeft, Target, Flame, Activity, BrainCircuit } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid } from 'recharts';

interface DashboardPageProps {
  onBack: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onBack }) => {
  const profile = storage.getProfile();
  const activity = storage.getActivity();
  const scores = storage.getScores();

  const [dailyGoal, setDailyGoal] = useState(profile.dailyGoal);
  const [isEditingGoal, setIsEditingGoal] = useState(false);

  const handleSaveGoal = () => {
    storage.updateProfile({ dailyGoal });
    setIsEditingGoal(false);
  };

  // Process data for charts
  const today = new Date().toISOString().split('T')[0];
  const todaySolved = activity[today]?.questionsSolved || 0;
  
  // Last 7 days activity
  const activityData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const shortDate = d.toLocaleDateString('en-US', { weekday: 'short' });
      data.push({
        name: shortDate,
        questions: activity[dateStr]?.questionsSolved || 0
      });
    }
    return data;
  }, [activity]);

  // Overall Accuracy Pie Chart
  const accuracyData = useMemo(() => {
    let totalCorrect = 0;
    let totalIncorrect = 0;
    let totalSkipped = 0;
    
    scores.forEach(s => {
      totalCorrect += s.correct;
      totalIncorrect += s.incorrect;
      totalSkipped += s.unattempted;
    });

    return [
      { name: 'Correct', value: totalCorrect, color: '#10b981' },
      { name: 'Incorrect', value: totalIncorrect, color: '#ef4444' },
      { name: 'Skipped', value: totalSkipped, color: '#94a3b8' }
    ].filter(d => d.value > 0);
  }, [scores]);

  return (
    <div className="container py-8" style={{ maxWidth: '900px' }}>
      <button onClick={onBack} className="btn btn-secondary mb-6">
        <ArrowLeft size={16} /> Back to Library
      </button>

      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <Activity size={28} color="var(--primary)" /> Analytics Dashboard
        </h2>
        <p className="page-subtitle">Track your progress and stay consistent.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        
        {/* Streak Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '1px solid #fde68a' }}>
          <Flame size={48} color="#f59e0b" style={{ marginBottom: '1rem' }} />
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#d97706', lineHeight: 1 }}>{profile.currentStreak}</div>
          <div style={{ fontWeight: 600, color: '#b45309', marginTop: '0.5rem' }}>Day Streak</div>
          <p style={{ fontSize: '0.75rem', color: '#92400e', marginTop: '0.5rem', textAlign: 'center' }}>
            Reach your daily goal to increase your streak!
          </p>
        </div>

        {/* Daily Goal Card */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Target size={20} color="var(--primary)" /> Daily Goal
            </h3>
            {!isEditingGoal ? (
              <button className="btn btn-secondary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={() => setIsEditingGoal(true)}>Edit</button>
            ) : (
              <button className="btn btn-primary" style={{ padding: '0.2rem 0.5rem', fontSize: '0.75rem' }} onClick={handleSaveGoal}>Save</button>
            )}
          </div>
          
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            {isEditingGoal ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  value={dailyGoal} 
                  onChange={(e) => setDailyGoal(Number(e.target.value) || 0)} 
                  style={{ width: '80px', textAlign: 'center', padding: '0.4rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', outline: 'none', fontSize: '0.95rem' }}
                />
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>questions/day</span>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1 }}>{todaySolved}</div>
                  <div style={{ color: 'var(--text-muted)', fontWeight: 500 }}>/ {dailyGoal} solved today</div>
                </div>
                <div style={{ background: '#e2e8f0', height: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--primary)', height: '100%', width: `${Math.min(100, (todaySolved / profile.dailyGoal) * 100)}%`, transition: 'width 0.5s ease' }} />
                </div>
                {todaySolved >= profile.dailyGoal && (
                  <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Flame size={14} /> Goal reached! Streak updated.
                  </div>
                )}
              </>
            )}
          </div>
        </div>

      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Activity Chart */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1.5rem' }}>Activity (Last 7 Days)</h3>
          <div style={{ height: '200px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} width={30} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  labelStyle={{ fontWeight: 'bold', color: '#1e293b' }}
                />
                <Line type="monotone" dataKey="questions" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall Accuracy */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Overall Accuracy</h3>
          {accuracyData.length > 0 ? (
            <div style={{ height: '200px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={accuracyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {accuracyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                    itemStyle={{ fontWeight: 500 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                {accuracyData.map(d => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: d.color }} /> {d.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', textAlign: 'center', padding: '0 2rem' }}>
              <div>
                <BrainCircuit size={32} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                Take some tests to see your overall accuracy breakdown here!
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
