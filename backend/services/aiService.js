const OpenAI = require('openai');
const fs = require('fs');

// Use GitHub Models API with the provided key
const openai = new OpenAI({
  apiKey: process.env.GITHUB_MODELS_API_KEY,
  baseURL: 'https://models.inference.ai.azure.com'
});

class AIService {
  // Safely parse JSON from LLM output (handles ```json fences and extra prose)
  extractJSON(content) {
    if (!content) return null;
    try {
      // Strip code fences if present
      content = String(content)
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim();
      // Try direct parse first
      return JSON.parse(content);
    } catch (_) {
      // Fallback: find first JSON object/array block
      const objMatch = content.match(/\{[\s\S]*\}/);
      const arrMatch = content.match(/\[[\s\S]*\]/);
      const candidate = (arrMatch && arrMatch[0]) || (objMatch && objMatch[0]) || '';
      if (!candidate) return null;
      try { return JSON.parse(candidate); } catch { return null; }
    }
  }

  // Resume parsing with structured data extraction
  async parseResume(resumeText) {
    try {
      const prompt = `Extract structured data from this resume. Return ONLY valid JSON with this exact structure:

{
  "skills": ["skill1", "skill2"],
  "projects": [{"title": "Project Name", "description": "Brief description", "techStack": ["tech1", "tech2"], "duration": "3 months", "role": "Developer"}],
  "internships": [{"company": "Company Name", "role": "Intern Role", "tasks": ["task1", "task2"], "technologies": ["tech1"], "duration": "6 months"}],
  "education": [{"degree": "Degree Name", "institution": "University Name", "years": "2020-2024", "gpa": "3.8"}],
  "experience": [{"company": "Company Name", "role": "Job Title", "duration": "1 year", "responsibilities": ["resp1", "resp2"], "technologies": ["tech1", "tech2"]}]
}

Resume text:
${resumeText.substring(0, 3000)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 800
      });

      const parsedData = this.extractJSON(response.choices[0].message.content);
      if (!parsedData) throw new Error('LLM returned non-JSON');
      return parsedData;
    } catch (error) {
      console.error('Error parsing resume:', error);
      throw error; // Let the route handle fallback
    }
  }

  // Generate interview questions based on parsed resume
  async generateQuestions(parsedResume) {
    try {
      const prompt = `Create 10 specific interview questions based on this resume data. Return ONLY a JSON array:

[
  {"category": "technical", "question": "Specific question about listed skills"},
  {"category": "project", "question": "Question about specific project"},
  {"category": "experience", "question": "Question about work experience"},
  {"category": "internship", "question": "Question about internship"},
  {"category": "behavioral", "question": "Behavioral question"}
]

Resume data: ${JSON.stringify(parsedResume)}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 600
      });

      const questions = this.extractJSON(response.choices[0].message.content);
      if (!Array.isArray(questions)) throw new Error('LLM returned non-array');
      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error; // Let the route handle fallback
    }
  }

  // Evaluate response with rubric scoring
  async evaluateResponse(transcript, question) {
    try {
      const prompt = `Evaluate this interview response. Return ONLY valid JSON:

{
  "technicalDepth": {"score": 4, "feedback": "Good technical knowledge"},
  "clarity": {"score": 3, "feedback": "Clear explanation"},
  "confidence": {"score": 4, "feedback": "Spoke with confidence"},
  "sentiment": "positive",
  "flags": {"reading": false, "silence": false, "irrelevant": false},
  "overallScore": 3.7
}

Question: ${question}
Response: ${transcript}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 400
      });

      const evaluation = this.extractJSON(response.choices[0].message.content);
      if (!evaluation) throw new Error('LLM returned non-JSON');
      return evaluation;
    } catch (error) {
      console.error('Error evaluating response:', error);
      throw error; // Let the route handle fallback
    }
  }

  // Generate final report summary
  async generateReport(responses, questions) {
    try {
      const paired = questions.map((q, i) => ({ q, a: responses[i] || 'No response' }));
      const prompt = `Create an interview report. Return ONLY valid JSON:

{
  "summary": "Overall performance summary",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "recommendations": ["rec1", "rec2"],
  "hireability": 75,
  "perQuestion": [{"question": "Q1", "assessment": "Assessment"}]
}

Q/A pairs:
${paired.map((p, i) => `Q${i+1}: ${p.q}\nA${i+1}: ${p.a}`).join('\n\n')}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 600
      });

      const report = this.extractJSON(response.choices[0].message.content);
      if (!report) throw new Error('LLM returned non-JSON');
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      throw error; // Let the route handle fallback
    }
  }

  // Audio transcription
  async transcribeAudio(audioFile) {
    try {
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(audioFile),
        model: "whisper-1",
      });
      return transcription.text;
    } catch (error) {
      console.error('Error transcribing audio:', error);
      return 'Transcription failed due to AI service error.';
    }
  }
}

module.exports = new AIService();
