import mongoose from 'mongoose';

const PortalSettingsSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // We'll just use 'default'
  candidatePortalEnabled: { type: Boolean, default: true }
});

export const PortalSettings = mongoose.model('PortalSettings', PortalSettingsSchema);
