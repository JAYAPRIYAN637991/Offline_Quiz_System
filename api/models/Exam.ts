import mongoose from 'mongoose';
import { QuestionSchema } from './QuestionBank.js';

const ExamSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  timeLimit: { type: Number, required: true }, // in minutes
  questions: { type: [QuestionSchema], default: [] },
  integrityHash: { type: String, required: true },
  createdAt: { type: Number, default: Date.now },
  isAdaptive: { type: Boolean },
  questionBankId: { type: String },
  questionPool: { type: [QuestionSchema] },
  totalQuestionsCount: { type: Number },
  requireScreenCapture: { type: Boolean },
  assignedCandidateEmail: { type: String },
  isUnlocked: { type: Boolean },
  isStarted: { type: Boolean },
  passkey: { type: String },
  parentExamId: { type: String }
});

export const Exam = mongoose.model('Exam', ExamSchema);
