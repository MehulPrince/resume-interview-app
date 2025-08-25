const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  resumeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
    required: true
  },
  questions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  }],
  responses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Response'
  }],
  reportId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed'],
    default: 'pending'
  },
  currentQuestionIndex: {
    type: Number,
    default: 0
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  startTime: {
    type: Date
  },
  endTime: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Interview', interviewSchema);

