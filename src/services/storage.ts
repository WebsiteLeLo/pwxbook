// Centralized localStorage service for all app features

const KEYS = {
  SCORES: 'pw_scores',
  BOOKMARKS: 'pw_bookmarks',
  PROGRESS: 'pw_progress',
  NOTES: 'pw_notes',
  SPACED: 'pw_spaced',
  TEST_SESSIONS: 'pw_test_sessions',
  SHELF: 'pw_shelf',
  ACTIVITY: 'pw_activity',
  PROFILE: 'pw_profile',
  MISTAKES: 'pw_mistakes',
} as const;

export interface ScoreEntry {
  testId: string;
  testName: string;
  correct: number;
  incorrect: number;
  unattempted: number;
  total: number;
  percentage: number;
  score: number;       // +4/-1 scoring
  maxScore: number;    // total * 4
  timeTaken: number;
  date: string;
}

export interface BookmarkEntry {
  questionId: string;
  testId: string;
  testName: string;
  questionData: any;
  date: string;
}

export interface MistakeEntry {
  questionId: string;
  testId: string;
  testName: string;
  questionData: any;
  date: string;
  count: number; // How many times they got it wrong
}

export interface NoteEntry {
  questionId: string;
  note: string;
  date: string;
}

export interface SpacedEntry {
  questionId: string;
  questionData: any;
  testName: string;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
  repetitions: number;
}

export type ProgressData = Record<string, Record<string, { done: string[]; total: number }>>;

export interface TestSession {
  currentIndex: number;
  selectedAnswers: Record<string, string>;
  answeredQuestions: Record<string, boolean>;
}

export interface UserProfile {
  dailyGoal: number;
  currentStreak: number;
  lastActiveDate: string | null;
}

export interface DailyActivity {
  date: string;
  questionsSolved: number;
}

function getItem<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}

function setItem(key: string, value: any) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { console.warn('localStorage full', e); }
}

export const storage = {
  // ─── Scores ───
  getScores(): ScoreEntry[] {
    return getItem<ScoreEntry[]>(KEYS.SCORES, []);
  },
  saveScore(entry: ScoreEntry, skipActivityLog = false) {
    const scores = this.getScores();
    scores.unshift(entry); // newest first
    if (scores.length > 100) scores.pop();
    setItem(KEYS.SCORES, scores);

    // Also log activity
    if (!skipActivityLog) {
      const questionsAttempted = entry.correct + entry.incorrect;
      if (questionsAttempted > 0) {
        this.logActivity(questionsAttempted);
      }
    }
  },

  // ─── Bookmarks ───
  getBookmarks(): BookmarkEntry[] {
    return getItem<BookmarkEntry[]>(KEYS.BOOKMARKS, []);
  },
  isBookmarked(questionId: string): boolean {
    return this.getBookmarks().some(b => b.questionId === questionId);
  },
  toggleBookmark(questionId: string, testId: string, testName: string, questionData: any): boolean {
    const bookmarks = this.getBookmarks();
    const idx = bookmarks.findIndex(b => b.questionId === questionId);
    if (idx >= 0) {
      bookmarks.splice(idx, 1);
      setItem(KEYS.BOOKMARKS, bookmarks);
      return false; // removed
    } else {
      bookmarks.unshift({ questionId, testId, testName, questionData, date: new Date().toISOString() });
      setItem(KEYS.BOOKMARKS, bookmarks);
      return true; // added
    }
  },

  // ─── Progress ───
  getProgress(): ProgressData {
    return getItem<ProgressData>(KEYS.PROGRESS, {});
  },
  markExerciseDone(bookId: string, chapterId: string, exerciseId: string, totalExercises: number) {
    const progress = this.getProgress();
    if (!progress[bookId]) progress[bookId] = {};
    if (!progress[bookId][chapterId]) progress[bookId][chapterId] = { done: [], total: totalExercises };
    if (!progress[bookId][chapterId].done.includes(exerciseId)) {
      progress[bookId][chapterId].done.push(exerciseId);
    }
    progress[bookId][chapterId].total = totalExercises;
    setItem(KEYS.PROGRESS, progress);
  },
  getChapterProgress(bookId: string, chapterId: string): { done: number; total: number } {
    const progress = this.getProgress();
    const ch = progress[bookId]?.[chapterId];
    return ch ? { done: ch.done.length, total: ch.total } : { done: 0, total: 0 };
  },

  // ─── Notes ───
  getNotes(): NoteEntry[] {
    return getItem<NoteEntry[]>(KEYS.NOTES, []);
  },
  getNote(questionId: string): string {
    return this.getNotes().find(n => n.questionId === questionId)?.note || '';
  },
  saveNote(questionId: string, note: string) {
    const notes = this.getNotes().filter(n => n.questionId !== questionId);
    if (note.trim()) {
      notes.unshift({ questionId, note, date: new Date().toISOString() });
    }
    setItem(KEYS.NOTES, notes);
  },

  // ─── Spaced Repetition ───
  getSpacedItems(): SpacedEntry[] {
    return getItem<SpacedEntry[]>(KEYS.SPACED, []);
  },
  addToSpaced(questionId: string, questionData: any, testName: string) {
    const items = this.getSpacedItems();
    if (items.some(i => i.questionId === questionId)) return;
    items.push({
      questionId, questionData, testName,
      nextReviewDate: new Date().toISOString().split('T')[0], // today
      interval: 1, easeFactor: 2.5, repetitions: 0,
    });
    setItem(KEYS.SPACED, items);
  },
  updateSpaced(questionId: string, wasCorrect: boolean) {
    const items = this.getSpacedItems();
    const item = items.find(i => i.questionId === questionId);
    if (!item) return;
    if (wasCorrect) {
      item.repetitions++;
      if (item.repetitions === 1) item.interval = 1;
      else if (item.repetitions === 2) item.interval = 6;
      else item.interval = Math.round(item.interval * item.easeFactor);
      item.easeFactor = Math.max(1.3, item.easeFactor + 0.1);
    } else {
      item.repetitions = 0;
      item.interval = 1;
      item.easeFactor = Math.max(1.3, item.easeFactor - 0.2);
    }
    const next = new Date();
    next.setDate(next.getDate() + item.interval);
    item.nextReviewDate = next.toISOString().split('T')[0];
    setItem(KEYS.SPACED, items);
  },
  getDueReviews(): SpacedEntry[] {
    const today = new Date().toISOString().split('T')[0];
    return this.getSpacedItems().filter(i => i.nextReviewDate <= today);
  },
  removeFromSpaced(questionId: string) {
    const items = this.getSpacedItems().filter(i => i.questionId !== questionId);
    setItem(KEYS.SPACED, items);
  },
  removeBookmark(questionId: string) {
    const bms = this.getBookmarks().filter(b => b.questionId !== questionId);
    setItem(KEYS.BOOKMARKS, bms);
  },

  // ─── Mistakes (Error Log Book) ───
  getMistakes(): MistakeEntry[] {
    return getItem<MistakeEntry[]>(KEYS.MISTAKES, []);
  },
  logMistake(entry: Omit<MistakeEntry, 'date' | 'count'>) {
    const mistakes = this.getMistakes();
    const existing = mistakes.find(m => m.questionId === entry.questionId);
    if (existing) {
      existing.count += 1;
      existing.date = new Date().toISOString();
    } else {
      mistakes.unshift({
        ...entry,
        date: new Date().toISOString(),
        count: 1
      });
    }
    setItem(KEYS.MISTAKES, mistakes);
  },
  resolveMistake(questionId: string) {
    const mistakes = this.getMistakes().filter(m => m.questionId !== questionId);
    setItem(KEYS.MISTAKES, mistakes);
  },

  // ─── Test Sessions (Practice Mode) ───
  getTestSession(testId: string): TestSession | null {
    const sessions = getItem<Record<string, TestSession>>(KEYS.TEST_SESSIONS, {});
    return sessions[testId] || null;
  },
  saveTestSession(testId: string, session: TestSession) {
    const sessions = getItem<Record<string, TestSession>>(KEYS.TEST_SESSIONS, {});
    sessions[testId] = session;
    setItem(KEYS.TEST_SESSIONS, sessions);
  },
  clearTestSession(testId: string) {
    const sessions = getItem<Record<string, TestSession>>(KEYS.TEST_SESSIONS, {});
    delete sessions[testId];
    setItem(KEYS.TEST_SESSIONS, sessions);
  },

  // ─── Bookshelf ───
  getShelf(): string[] {
    return getItem<string[]>(KEYS.SHELF, []);
  },
  isBookInShelf(bookId: string): boolean {
    return this.getShelf().includes(bookId);
  },
  toggleShelf(bookId: string): boolean {
    const shelf = this.getShelf();
    const idx = shelf.indexOf(bookId);
    if (idx >= 0) {
      shelf.splice(idx, 1);
      setItem(KEYS.SHELF, shelf);
      return false; // removed
    } else {
      shelf.push(bookId);
      setItem(KEYS.SHELF, shelf);
      return true; // added
    }
  },

  // ─── Gamification & Analytics ───
  getProfile(): UserProfile {
    return getItem<UserProfile>(KEYS.PROFILE, { dailyGoal: 20, currentStreak: 0, lastActiveDate: null });
  },
  updateProfile(updates: Partial<UserProfile>) {
    const profile = this.getProfile();
    setItem(KEYS.PROFILE, { ...profile, ...updates });
  },
  getActivity(): Record<string, DailyActivity> {
    return getItem<Record<string, DailyActivity>>(KEYS.ACTIVITY, {});
  },
  logActivity(questionsSolved: number) {
    const today = new Date().toISOString().split('T')[0];
    const activity = this.getActivity();
    
    if (!activity[today]) {
      activity[today] = { date: today, questionsSolved: 0 };
    }
    
    const wasGoalMetBefore = activity[today].questionsSolved >= this.getProfile().dailyGoal;
    activity[today].questionsSolved += questionsSolved;
    const isGoalMetNow = activity[today].questionsSolved >= this.getProfile().dailyGoal;
    
    setItem(KEYS.ACTIVITY, activity);

    // Update streak
    const profile = this.getProfile();
    if (!profile.lastActiveDate) {
      // First time activity
      if (isGoalMetNow) {
        profile.currentStreak = 1;
        profile.lastActiveDate = today;
      }
    } else {
      const lastActive = new Date(profile.lastActiveDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate.getTime() - lastActive.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays === 1) {
        // Active yesterday
        if (!wasGoalMetBefore && isGoalMetNow) {
          profile.currentStreak += 1;
          profile.lastActiveDate = today;
        }
      } else if (diffDays > 1) {
        // Streak broken
        profile.currentStreak = isGoalMetNow ? 1 : 0;
        if (isGoalMetNow) profile.lastActiveDate = today;
      } else if (diffDays === 0) {
        // Active today again, update lastActiveDate just in case
        if (isGoalMetNow) profile.lastActiveDate = today;
      }
    }
    this.updateProfile(profile);
  }
};
