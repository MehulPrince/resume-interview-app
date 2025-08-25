const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  interviewId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Interview',
    required: true
  },
  summary: {
    totalQuestions: Number,
    averageScore: Number,
    strengths: [String],
    weaknesses: [String],
    recommendations: [String]
  },
  scores: {
    technicalDepth: Number,
    clarity: Number,
    confidence: Number,
    overall: Number
  },
  flags: {
    totalFlags: Number,
    readingCount: Number,
    silenceCount: Number,
    irrelevantCount: Number
  },
  pdfPath: {
    type: String
  },
  transcript: {
    type: String
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);

