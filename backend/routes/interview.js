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

    // Generate questions using AI
    const questionsData = await aiService.generateQuestions(resume.parsedData);

    // Create interview
    const interview = new Interview({
      userId: req.user._id,
      resumeId: resumeId,
      totalQuestions: questionsData.length,
      status: 'pending'
    });

    await interview.save();

    // Create questions
    const questions = [];
    for (let i = 0; i < questionsData.length; i++) {
      const question = new Question({
        interviewId: interview._id,
        text: questionsData[i].question,
        category: questionsData[i].category,
        order: i + 1
      });
      await question.save();
      questions.push(question);
    }

    // Update interview with questions
    interview.questions = questions.map(q => q._id);
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
    const interview = await Interview.findOne({
      _id: req.params.id,
      userId: req.user._id
    }).populate('questions');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.currentQuestionIndex >= interview.questions.length) {
      return res.json({ message: 'Interview completed', completed: true });
    }

    const currentQuestion = interview.questions[interview.currentQuestionIndex];
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

    // Evaluate response using AI
    const evaluation = await aiService.evaluateResponse(transcript, question.text);

    // Create response
    const response = new Response({
      questionId: questionId,
      transcript: transcript,
      audioPath: req.files?.audio?.[0]?.path,
      videoPath: req.files?.video?.[0]?.path,
      evaluation: evaluation,
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

