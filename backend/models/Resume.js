const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  originalText: {
    type: String,
    required: true
  },
  parsedData: {
    skills: [{
      type: String,
      trim: true
    }],
    projects: [{
      title: String,
      description: String,
      techStack: [String],
      duration: String,
      role: String
    }],
    internships: [{
      company: String,
      role: String,
      tasks: [String],
      technologies: [String],
      duration: String
    }],
    education: [{
      degree: String,
      institution: String,
      years: String,
      gpa: String
    }],
    experience: [{
      company: String,
      role: String,
      duration: String,
      responsibilities: [String],
      technologies: [String]
    }]
  },
  filePath: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Resume', resumeSchema);

