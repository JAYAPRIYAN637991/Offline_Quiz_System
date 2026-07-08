import mongoose from 'mongoose';

const SentEmailSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  timestamp: { type: Number, required: true },
  recipient: { type: String, required: true },
  subject: { type: String, required: true },
  body: { type: String, required: true },
  attemptId: { type: String, required: true },
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  riskLevel: { type: String },
  confidenceScore: { type: Number }
});

export const SentEmail = mongoose.model('SentEmail', SentEmailSchema);
