const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const Interview = require('../models/Interview');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Resume = require('../models/Resume');
const auth = require('../middleware/auth');
const aiService = require('../services/aiService');

// Helper function to generate fallback questions from resume data
function generateFallbackQuestions(parsedData) {
  const fallbackQuestions = [];
  const { skills = [], projects = [], experience = [], internships = [] } = parsedData;

  // Technical questions based on skills
  if (skills.length > 0) {
    const topSkills = skills.slice(0, 3);
    topSkills.forEach(skill => {
      fallbackQuestions.push({
        category: 'technical',
        question: `Can you explain how you've used ${skill} in your projects? What were the challenges and how did you overcome them?`
      });
    });
  }

  // Project questions
  if (projects.length > 0) {
    projects.slice(0, 2).forEach(project => {
      fallbackQuestions.push({
        category: 'project',
        question: `Tell me about your project "${project.title}". What was your role, what technologies did you use, and what were the key outcomes?`
      });
    });
  }

  // Experience questions
  if (experience.length > 0) {
    experience.slice(0, 2).forEach(exp => {
      fallbackQuestions.push({
        category: 'experience',
        question: `At ${exp.company}, what were your main responsibilities as ${exp.role}? Can you describe a challenging problem you solved?`
      });
    });
  }

  // Internship questions
  if (internships.length > 0) {
    internships.slice(0, 1).forEach(intern => {
      fallbackQuestions.push({
        category: 'internship',
        question: `During your internship at ${intern.company}, what did you learn and what projects did you work on?`
      });
    });
  }

  // Add behavioral questions to reach 10 total
  while (fallbackQuestions.length < 10) {
    fallbackQuestions.push({
      category: 'behavioral',
      question: 'Describe a time when you had to work with a difficult team member. How did you handle the situation?'
    });
  }

  return fallbackQuestions.slice(0, 10);
}

const router = express.Router();

// Configure multer for audio/video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'audio/webm',
      'audio/mp4',
      'video/webm',
      'video/mp4',
      'audio/wav',
      'audio/mpeg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only audio and video files are allowed'), false);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Create new interview session
router.post('/create', auth, async (req, res) => {
  try {
    const { resumeId } = req.body;

    // Get resume data
    const resume = await Resume.findOne({
      _id: resumeId,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Generate questions based on resume
    let questions;
    try {
      questions = await aiService.generateQuestions(resume.parsedData);
    } catch (aiError) {
      console.error('AI question generation failed, using fallback:', aiError.message);
      questions = generateFallbackQuestions(resume.parsedData);
    }

    // Ensure we have valid questions
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      questions = generateFallbackQuestions(resume.parsedData);
    }

    // Create interview
    const interview = new Interview({
      userId: req.user._id,
      resumeId: resumeId,
      totalQuestions: questions.length,
      status: 'pending'
    });

    await interview.save();

    // Create questions
    const questionObjects = [];
    for (let i = 0; i < questions.length; i++) {
      const question = new Question({
        interviewId: interview._id,
        text: questions[i].question,
        category: questions[i].category,
        order: i + 1
      });
      await question.save();
      questionObjects.push(question);
    }

    // Update interview with questions
    interview.questions = questionObjects.map(q => q._id);
    await interview.save();

    res.status(201).json({
      message: 'Interview created successfully',
      interview: {
        id: interview._id,
        totalQuestions: interview.totalQuestions,
        status: interview.status
      }
    });
  } catch (error) {
    console.error('Create interview error:', error);
    res.status(500).json({ message: 'Failed to create interview' });
  }
});

// Get interview details
router.get('/:id', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('questions');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    res.json(interview);
  } catch (error) {
    console.error('Get interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current question
router.get('/:id/current-question', auth, async (req, res) => {
  try {
    console.log('Getting current question for interview:', req.params.id, 'user:', req.user._id);
    
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('questions');

    if (!interview) {
      console.log('Interview not found:', req.params.id);
      return res.status(404).json({ message: 'Interview not found' });
    }

    console.log('Interview found:', {
      id: interview._id,
      status: interview.status,
      currentQuestionIndex: interview.currentQuestionIndex,
      totalQuestions: interview.totalQuestions,
      questionsCount: interview.questions?.length || 0
    });

    if (interview.currentQuestionIndex >= interview.questions.length) {
      console.log('Interview completed');
      return res.json({ message: 'Interview completed', completed: true });
    }

    const currentQuestion = interview.questions[interview.currentQuestionIndex];
    console.log('Current question:', currentQuestion);
    
    res.json({
      question: currentQuestion,
      progress: {
        current: interview.currentQuestionIndex + 1,
        total: interview.questions.length
      }
    });
  } catch (error) {
    console.error('Get current question error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Submit answer
router.post('/:id/submit-answer', auth, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'video', maxCount: 1 }
]), async (req, res) => {
  try {
    const { transcript, questionId, duration } = req.body;

    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    // Validate question belongs to this interview
    const question = await Question.findOne({
      _id: questionId,
      interviewId: interview._id
    });

    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    // Build final transcript: prefer client transcript; otherwise transcribe audio server-side
    let finalTranscript = (transcript || '').trim();
    if (!finalTranscript && req.files?.audio?.[0]?.path) {
      try {
        finalTranscript = await aiService.transcribeAudio(req.files.audio[0].path);
      } catch {}
    }

    // Evaluate response using AI (with fallback)
    let evaluation;
    try {
      evaluation = await aiService.evaluateResponse(finalTranscript || '(transcript unavailable)', question.text);
    } catch (aiError) {
      console.error('AI evaluation failed, using fallback:', aiError.message);
      evaluation = {
        technicalDepth: { score: 3, feedback: "Basic understanding shown" },
        clarity: { score: 3, feedback: "Clear communication" },
        confidence: { score: 3, feedback: "Moderate confidence" },
        sentiment: "neutral",
        flags: { reading: false, silence: false, irrelevant: false },
        overallScore: 3.0
      };
    }

    // Basic video analysis placeholders (enhance later with real CV if needed)
    const videoAnalysis = {
      notes: 'Basic heuristic: ensure face visible and eyes on screen',
      attentionLostSeconds: 0,
      multipleFacesDetected: false,
      noFaceDetected: false
    };

    // Create response
    const response = new Response({
      questionId: questionId,
      transcript: finalTranscript || '(transcript unavailable)',
      audioPath: req.files?.audio?.[0]?.path,
      videoPath: req.files?.video?.[0]?.path,
      evaluation: evaluation,
      videoAnalysis: videoAnalysis,
      duration: duration
    });

    await response.save();

    // Update interview
    interview.responses.push(response._id);
    interview.currentQuestionIndex += 1;

    if (interview.currentQuestionIndex >= interview.totalQuestions) {
      interview.status = 'completed';
      interview.endTime = new Date();
    } else {
      interview.status = 'in-progress';
    }

    await interview.save();

    res.json({
      message: 'Answer submitted successfully',
      evaluation: evaluation,
      nextQuestion: interview.currentQuestionIndex < interview.totalQuestions,
      completed: interview.status === 'completed'
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ message: 'Failed to submit answer' });
  }
});

// Start interview
router.post('/:id/start', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    interview.status = 'in-progress';
    interview.startTime = new Date();
    await interview.save();

    res.json({ message: 'Interview started successfully' });
  } catch (error) {
    console.error('Start interview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user's interviews
router.get('/', auth, async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user._id })
      .populate('resumeId', 'fileName')
      .select('status totalQuestions currentQuestionIndex startTime endTime createdAt')
      .sort({ createdAt: -1 });

    res.json(interviews);
  } catch (error) {
    console.error('Get interviews error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

