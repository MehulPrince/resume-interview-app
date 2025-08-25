const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  transcript: {
    type: String,
    required: true
  },
  audioPath: {
    type: String
  },
  videoPath: {
    type: String
  },
  evaluation: {
    technicalDepth: {
      score: {
        type: Number,
        min: 0,
        max: 5
      },
      feedback: String
    },
    clarity: {
      score: {
        type: Number,
        min: 0,
        max: 5
      },
      feedback: String
    },
    confidence: {
      score: {
        type: Number,
        min: 0,
        max: 5
      },
      feedback: String
    },
    sentiment: {
      type: String,
      enum: ['positive', 'neutral', 'negative']
    },
    flags: {
      reading: {
        type: Boolean,
        default: false
      },
      silence: {
        type: Boolean,
        default: false
      },
      irrelevant: {
        type: Boolean,
        default: false
      }
    },
    overallScore: {
      type: Number,
      min: 0,
      max: 5
    }
  },
  duration: {
    type: Number // in seconds
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Response', responseSchema);

