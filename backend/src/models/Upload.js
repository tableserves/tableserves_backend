const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ownerType: {
    type: String,
    required: true,
    enum: ['restaurant', 'zone', 'shop'],
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'ownerType',
  },
  fileSize: {
    type: Number,
    required: true,
  },
  publicId: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Upload', UploadSchema);