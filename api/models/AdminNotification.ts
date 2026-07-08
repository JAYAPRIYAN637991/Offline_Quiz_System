import mongoose from 'mongoose';

const AdminNotificationSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  message: { type: String, required: true },
  timestamp: { type: Number, required: true },
  read: { type: Boolean, default: false }
});

export const AdminNotification = mongoose.model('AdminNotification', AdminNotificationSchema);
