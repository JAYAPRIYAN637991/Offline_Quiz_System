import mongoose from 'mongoose';
import { QuestionSchema } from './QuestionBank.js';

const TamperEventSchema = new mongoose.Schema({
  id: { type: String },
  attemptId: { type: String },
  type: { type: String },
  timestamp: { type: Number },
  description: { type: String }
}, { _id: false });

const CheatingAnalysisSchema = new mongoose.Schema({
  riskLevel: { type: String, enum: ['Low', 'Medium', 'High'] },
  confidenceScore: { type: Number },
  flaggedPatterns: { type: [String] },
  explanation: { type: String },
  verdict: { type: String, enum: ['Suspicious', 'Clear', 'Needs Review'] }
}, { _id: false });

const ExamAttemptSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  examId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  status: { type: String, enum: ['started', 'paused', 'completed', 'interrupted'], required: true },
  startTime: { type: Number, required: true },
  timeRemaining: { type: Number, required: true },
  lastUpdated: { type: Number, required: true },
  answers: { type: Map, of: Number, default: {} },
  tamperLogs: { type: [TamperEventSchema], default: [] },
  isSynchronized: { type: Boolean, default: false },
  score: { type: Number },
  cheatingAnalysis: { type: CheatingAnalysisSchema },
  adaptiveQuestions: { type: [QuestionSchema] },
  screenCaptures: [{ timestamp: Number, dataUrl: String }]
});

export const ExamAttempt = mongoose.model('ExamAttempt', ExamAttemptSchema);
