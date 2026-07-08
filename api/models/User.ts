import mongoose from 'mongoose';

const CandidateUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Number, default: Date.now }
});

export const CandidateUser = mongoose.model('CandidateUser', CandidateUserSchema);

const AdminUserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Number, default: Date.now }
});

export const AdminUser = mongoose.model('AdminUser', AdminUserSchema);
