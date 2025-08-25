const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  text: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['technical', 'project', 'internship', 'behavioral'],
    required: true
  },
  order: {
    type: Number,
    required: true
  },
  timeLimit: {
    type: Number,
    default: 120 // 2 minutes in seconds
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', questionSchema);

