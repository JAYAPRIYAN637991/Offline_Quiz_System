/**
 * Types representing the data model of the Secure Offline Quiz System.
 */

export interface Question {
  id: string;
  text: string;
  options: string[];
  // If present, correct answer index. Removed or encrypted for student downloads.
  correctOptionIndex?: number;
  subject?: string;
  topic?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  correctOptionHash?: string;
}

export interface QuestionBank {
  id: string;
  name: string;
  subject: string;
  topic?: string;
  questions: Question[];
  createdAt: number;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  timeLimit: number; // in minutes
  questions: Question[];
  integrityHash: string; // SHA-256 check of the exam content to ensure it hasn't been tampered with
  createdAt: number;
  isAdaptive?: boolean;
  questionBankId?: string;
  questionPool?: Question[];
  totalQuestionsCount?: number;
  requireScreenCapture?: boolean;
  assignedCandidateEmail?: string | null;
  isUnlocked?: boolean;
  isStarted?: boolean;
  passkey?: string;
  parentExamId?: string;
}

export interface TamperEvent {
  id: string;
  attemptId: string;
  type: 'tab-blur' | 'fullscreen-exit' | 'copy-paste' | 'right-click' | 'focus-gain' | 'resize' | 'keyboard-shortcut' | 'network-reconnect';
  timestamp: number;
  description: string;
}

export interface ExamAttempt {
  id: string;
  examId: string;
  studentName: string;
  studentEmail: string;
  status: 'started' | 'paused' | 'completed' | 'interrupted';
  startTime: number;
  timeRemaining: number; // in seconds
  lastUpdated: number;
  answers: Record<string, number>; // questionId -> selectedOptionIndex
  tamperLogs: TamperEvent[];
  isSynchronized: boolean;
  score?: number; // Graded score
  cheatingAnalysis?: CheatingAnalysis;
  adaptiveQuestions?: Question[];
  screenCaptures?: Array<{ timestamp: number; dataUrl: string }>;
}

export interface CheatingAnalysis {
  riskLevel: 'Low' | 'Medium' | 'High';
  confidenceScore: number; // 0 to 100
  flaggedPatterns: string[];
  explanation: string;
  verdict: 'Suspicious' | 'Clear' | 'Needs Review';
}

/**
 * Representing database records in our local virtual "SQLite" store
 */
export interface LocalDbRow {
  tableName: string;
  id: string;
  data: string; // AES-encrypted or standard JSON payload
  updatedAt: number;
}
