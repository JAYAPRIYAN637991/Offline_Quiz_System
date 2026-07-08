import mongoose from 'mongoose';

export const QuestionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  options: { type: [String], required: true },
  correctOptionIndex: { type: Number },
  subject: { type: String },
  topic: { type: String },
  difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard'] },
  correctOptionHash: { type: String }
}, { _id: false });

const QuestionBankSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  subject: { type: String, required: true },
  topic: { type: String },
  questions: { type: [QuestionSchema], default: [] },
  createdAt: { type: Number, default: Date.now }
});

export const QuestionBank = mongoose.model('QuestionBank', QuestionBankSchema);
