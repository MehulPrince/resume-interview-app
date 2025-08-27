const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const Resume = require('../models/Resume');
const User = require('../models/User');
const auth = require('../middleware/auth');
const resumeParser = require('../services/resumeParser');
const aiService = require('../services/aiService');

const router = express.Router();

// Configure multer for file uploads
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
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF and DOCX files are allowed'), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// Upload and parse resume
router.post('/upload', auth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file
    resumeParser.validateFile(req.file);

    // Parse the file
    const resumeText = await resumeParser.parseFile(req.file.path, req.file.mimetype);

    // Use AI to extract structured data; if it fails, use heuristic parsing
    let parsedData;
    try {
      parsedData = await aiService.parseResume(resumeText);
    } catch (aiError) {
      console.error('AI parsing failed, using heuristic fallback:', aiError.message);
      parsedData = resumeParser.extractStructuredFallback(resumeText);
    }

    // Ensure we have valid data structure
    if (!parsedData || !parsedData.skills || !Array.isArray(parsedData.skills)) {
      parsedData = resumeParser.extractStructuredFallback(resumeText);
    }

    // Save to database
    const resume = new Resume({
      userId: req.user._id,
      originalText: resumeText,
      parsedData: parsedData,
      filePath: req.file.path,
      fileName: req.file.originalname
    });

    await resume.save();

    // Update user's resumes array
    await User.findByIdAndUpdate(
      req.user._id,
      { $push: { resumes: resume._id } }
    );

    res.status(201).json({
      message: 'Resume uploaded and parsed successfully',
      resume: {
        id: resume._id,
        fileName: resume.fileName,
        parsedData: resume.parsedData
      }
    });
  } catch (error) {
    console.error('Resume upload error:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.remove(req.file.path);
    }
    
    res.status(500).json({ message: error.message || 'Failed to upload resume' });
  }
});

// Get user's resumes
router.get('/', auth, async (req, res) => {
  try {
    const resumes = await Resume.find({ userId: req.user._id })
      .select('fileName parsedData createdAt')
      .sort({ createdAt: -1 });

    res.json(resumes);
  } catch (error) {
    console.error('Get resumes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get specific resume
router.get('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    res.json(resume);
  } catch (error) {
    console.error('Get resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete resume
router.delete('/:id', auth, async (req, res) => {
  try {
    const resume = await Resume.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!resume) {
      return res.status(404).json({ message: 'Resume not found' });
    }

    // Remove file from filesystem
    if (resume.filePath) {
      await fs.remove(resume.filePath);
    }

    // Remove from database
    await Resume.findByIdAndDelete(req.params.id);

    // Remove from user's resumes array
    await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { resumes: req.params.id } }
    );

    res.json({ message: 'Resume deleted successfully' });
  } catch (error) {
    console.error('Delete resume error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

