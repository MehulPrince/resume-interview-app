const express = require('express');
const Interview = require('../models/Interview');
const Question = require('../models/Question');
const Response = require('../models/Response');
const Report = require('../models/Report');
const auth = require('../middleware/auth');
const aiService = require('../services/aiService');

const router = express.Router();

// Generate final report
router.post('/:interviewId/generate-report', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      userId: req.user._id
    }).populate('questions');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    if (interview.status !== 'completed') {
      return res.status(400).json({ message: 'Interview must be completed to generate report' });
    }

    // Get all responses for this interview
    const responses = await Response.find({
      questionId: { $in: interview.questions.map(q => q._id) }
    }).populate('questionId');

    if (responses.length === 0) {
      return res.status(400).json({ message: 'No responses found for this interview' });
    }

    // Calculate overall scores
    const totalScores = responses.reduce((acc, response) => {
      acc.technicalDepth += response.evaluation.technicalDepth.score;
      acc.clarity += response.evaluation.clarity.score;
      acc.confidence += response.evaluation.confidence.score;
      acc.overall += response.evaluation.overallScore;
      return acc;
    }, { technicalDepth: 0, clarity: 0, confidence: 0, overall: 0 });

    const numResponses = responses.length;
    const averageScores = {
      technicalDepth: totalScores.technicalDepth / numResponses,
      clarity: totalScores.clarity / numResponses,
      confidence: totalScores.confidence / numResponses,
      overall: totalScores.overall / numResponses
    };

    // Count flags
    const flags = responses.reduce((acc, response) => {
      acc.totalFlags += Object.values(response.evaluation.flags).filter(Boolean).length;
      acc.readingCount += response.evaluation.flags.reading ? 1 : 0;
      acc.silenceCount += response.evaluation.flags.silence ? 1 : 0;
      acc.irrelevantCount += response.evaluation.flags.irrelevant ? 1 : 0;
      return acc;
    }, { totalFlags: 0, readingCount: 0, silenceCount: 0, irrelevantCount: 0 });

    // Generate AI summary
    const questions = interview.questions.map(q => q.text);
    const transcripts = responses.map(r => r.transcript);
    const aiReport = await aiService.generateReport(transcripts, questions);

    // Create report
    const report = new Report({
      interviewId: interview._id,
      summary: {
        totalQuestions: interview.totalQuestions,
        averageScore: averageScores.overall,
        strengths: aiReport.strengths,
        weaknesses: aiReport.weaknesses,
        recommendations: aiReport.recommendations
      },
      scores: averageScores,
      flags: flags,
      transcript: transcripts.join('\n\n')
    });

    await report.save();

    // Update interview with report
    interview.reportId = report._id;
    await interview.save();

    res.json({
      message: 'Report generated successfully',
      report: {
        id: report._id,
        summary: {
          ...report.summary,
          ai: aiReport
        },
        scores: report.scores,
        flags: report.flags
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({ message: 'Failed to generate report' });
  }
});

// Get report
router.get('/report/:reportId', auth, async (req, res) => {
  try {
    const report = await Report.findById(req.params.reportId)
      .populate({
        path: 'interviewId',
        match: { userId: req.user._id },
        populate: {
          path: 'questions',
          populate: {
            path: 'responses',
            model: 'Response'
          }
        }
      });

    if (!report || !report.interviewId) {
      return res.status(404).json({ message: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get interview evaluation summary
router.get('/:interviewId/summary', auth, async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.interviewId,
      userId: req.user._id
    }).populate('questions');

    if (!interview) {
      return res.status(404).json({ message: 'Interview not found' });
    }

    const responses = await Response.find({
      questionId: { $in: interview.questions.map(q => q._id) }
    }).populate('questionId');

    const summary = {
      totalQuestions: interview.totalQuestions,
      completedQuestions: responses.length,
      averageScores: {
        technicalDepth: 0,
        clarity: 0,
        confidence: 0,
        overall: 0
      },
      flags: {
        total: 0,
        reading: 0,
        silence: 0,
        irrelevant: 0
      },
      responses: responses.map(response => ({
        question: response.questionId.text,
        category: response.questionId.category,
        transcript: response.transcript,
        evaluation: response.evaluation,
        duration: response.duration
      }))
    };

    if (responses.length > 0) {
      // Calculate averages
      const totals = responses.reduce((acc, response) => {
        acc.technicalDepth += response.evaluation.technicalDepth.score;
        acc.clarity += response.evaluation.clarity.score;
        acc.confidence += response.evaluation.confidence.score;
        acc.overall += response.evaluation.overallScore;
        return acc;
      }, { technicalDepth: 0, clarity: 0, confidence: 0, overall: 0 });

      summary.averageScores = {
        technicalDepth: totals.technicalDepth / responses.length,
        clarity: totals.clarity / responses.length,
        confidence: totals.confidence / responses.length,
        overall: totals.overall / responses.length
      };

      // Count flags
      summary.flags = responses.reduce((acc, response) => {
        acc.total += Object.values(response.evaluation.flags).filter(Boolean).length;
        acc.reading += response.evaluation.flags.reading ? 1 : 0;
        acc.silence += response.evaluation.flags.silence ? 1 : 0;
        acc.irrelevant += response.evaluation.flags.irrelevant ? 1 : 0;
        return acc;
      }, { total: 0, reading: 0, silence: 0, irrelevant: 0 });
    }

    res.json(summary);
  } catch (error) {
    console.error('Get evaluation summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get response details
router.get('/response/:responseId', auth, async (req, res) => {
  try {
    const response = await Response.findById(req.params.responseId)
      .populate({
        path: 'questionId',
        populate: {
          path: 'interviewId',
          match: { userId: req.user._id }
        }
      });

    if (!response || !response.questionId.interviewId) {
      return res.status(404).json({ message: 'Response not found' });
    }

    res.json(response);
  } catch (error) {
    console.error('Get response error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

