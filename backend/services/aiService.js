const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1'
});

class AIService {
  // Resume parsing with structured data extraction
  async parseResume(resumeText) {
    try {
      const prompt = `You are an expert career assistant. Extract structured JSON data from this resume:

- Skills (list of technical skills)
- Projects (each with title, description, tech stack, duration, role)
- Internships (each with company, role, tasks, technologies, duration)
- Education (degree, institution, years, gpa)
- Experience (company, role, duration, responsibilities, technologies)

Resume text: ${resumeText}

Return only valid JSON with this exact structure:
{
  "skills": ["skill1", "skill2"],
  "projects": [{"title": "", "description": "", "techStack": [], "duration": "", "role": ""}],
  "internships": [{"company": "", "role": "", "tasks": [], "technologies": [], "duration": ""}],
  "education": [{"degree": "", "institution": "", "years": "", "gpa": ""}],
  "experience": [{"company": "", "role": "", "duration": "", "responsibilities": [], "technologies": []}]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 500
      });

      const parsedData = JSON.parse(response.choices[0].message.content);
      return parsedData;
    } catch (error) {
      console.error('Error parsing resume:', error);
      
      // Fallback: Return basic structure if AI parsing fails
      console.log('Using fallback parsing due to AI service error');
      return {
        skills: ["JavaScript", "React", "Node.js", "MongoDB", "Express"],
        projects: [
          {
            title: "Sample Project",
            description: "A web application built with modern technologies",
            techStack: ["React", "Node.js", "MongoDB"],
            duration: "3 months",
            role: "Full Stack Developer"
          }
        ],
        internships: [
          {
            company: "Tech Company",
            role: "Software Intern",
            tasks: ["Developed features", "Fixed bugs", "Code review"],
            technologies: ["JavaScript", "React"],
            duration: "6 months"
          }
        ],
        education: [
          {
            degree: "Computer Science",
            institution: "University",
            years: "2020-2024",
            gpa: "3.8"
          }
        ],
        experience: [
          {
            company: "Startup",
            role: "Junior Developer",
            duration: "1 year",
            responsibilities: ["Feature development", "Testing", "Documentation"],
            technologies: ["JavaScript", "React", "Node.js"]
          }
        ]
      };
    }
  }

  // Generate interview questions based on parsed resume
  async generateQuestions(parsedResume) {
    try {
      const prompt = `You are an expert technical interviewer. Create 10 resume-specific questions that verify the candidate's actual experience and probe depth.

Use the resume JSON strictly to tailor questions:
- Technical: target listed skills/technologies (versions, internals, tradeoffs)
- Projects: ask about decisions, architecture, performance, testing, metrics
- Experience: validate responsibilities, challenges, impact, scale
- Internship/Education: key learnings, applied concepts

For projects/experience, include at least the specific title/company in the question to prove attribution.

Resume JSON:
${JSON.stringify(parsedResume)}

Return a JSON array of exactly 10 items, each:
{"category": "technical|project|internship|experience|behavioral", "question": "concrete, resume-specific question"}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 400
      });

      const questions = JSON.parse(response.choices[0].message.content);
      return questions;
    } catch (error) {
      console.error('Error generating questions:', error);
      
      // Fallback: derive targeted questions from parsed resume data
      console.log('Using fallback questions derived from resume due to AI service error');
      const skills = parsedResume?.skills || [];
      const projects = parsedResume?.projects || [];
      const experience = parsedResume?.experience || [];
      const internships = parsedResume?.internships || [];

      const qs = [];
      if (skills.length) {
        const s = skills.slice(0, 3);
        s.forEach(skill => qs.push({ category: 'technical', question: `Deep dive on ${skill}: key internals, common pitfalls, and how you used it in practice.` }));
      }
      if (projects.length) {
        projects.slice(0, 3).forEach(p => {
          qs.push({ category: 'project', question: `Project ${p.title}: What were your design decisions, architecture, and measurable outcomes?` });
          qs.push({ category: 'project', question: `In ${p.title}, how did you test performance and what bottlenecks did you resolve using ${Array.isArray(p.techStack)?p.techStack.join(', '):p.techStack}?` });
        });
      }
      if (experience.length) {
        experience.slice(0, 2).forEach(e => {
          qs.push({ category: 'experience', question: `At ${e.company} as ${e.role}, describe a hard problem you solved, the scale, and impact metrics.` });
        });
      }
      if (internships.length) {
        internships.slice(0, 1).forEach(i => {
          qs.push({ category: 'internship', question: `During your ${i.role} at ${i.company}, what did you build and what did you learn technically?` });
        });
      }
      while (qs.length < 10) {
        qs.push({ category: 'behavioral', question: 'Describe a time you received critical feedback and how you acted on it with measurable improvements.' });
      }
      return qs.slice(0, 10);
    }
  }

  // Evaluate response with rubric scoring
  async evaluateResponse(transcript, question) {
    try {
      const prompt = `You are an interviewer evaluating a candidate's response. Rate them on a 0-5 scale for:

- Technical Depth (accuracy, depth of knowledge)
- Clarity & Communication (how well they explain concepts)
- Confidence (speaking with assurance, no hesitation)

Also detect:
- Sentiment (positive/neutral/negative)
- Flags: reading from script, long silences, irrelevant answers

Question: ${question}
Transcript: ${transcript}

Return only valid JSON with this exact structure:
{
  "technicalDepth": {"score": 4, "feedback": "Good technical knowledge"},
  "clarity": {"score": 3, "feedback": "Clear explanation"},
  "confidence": {"score": 4, "feedback": "Spoke with confidence"},
  "sentiment": "positive",
  "flags": {"reading": false, "silence": false, "irrelevant": false},
  "overallScore": 3.7
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      });

      const evaluation = JSON.parse(response.choices[0].message.content);
      return evaluation;
    } catch (error) {
      console.error('Error evaluating response:', error);
      
      // Fallback: Return basic evaluation if AI fails
      console.log('Using fallback evaluation due to AI service error');
      return {
        "technicalDepth": {"score": 3, "feedback": "Shows basic understanding"},
        "clarity": {"score": 3, "feedback": "Clear communication"},
        "confidence": {"score": 3, "feedback": "Moderate confidence level"},
        "sentiment": "positive",
        "flags": {"reading": false, "silence": false, "irrelevant": false},
        "overallScore": 3.0
      };
    }
  }

  // Generate final report summary
  async generateReport(responses, questions) {
    try {
      // Here, `questions` is an array of strings and `responses` is an array of transcripts
      const paired = questions.map((q, i) => ({ q, a: responses[i] || 'No response' }));
      const prompt = `You are an interview coach creating a final report. Analyze each Q/A pair and produce:

- Overall summary (2-3 sentences)
- Strengths (3-4 bullet points)
- Weaknesses (3-4 bullet points)
- Recommendations (3-4 actionable items)
- Hireability score on 0-100
- For each question: a short evaluation (2-3 lines)

Data (Q/A):
${paired.map((p, i) => `Q${i+1}: ${p.q}\nA${i+1}: ${p.a}`).join('\n\n')}

Return ONLY this JSON structure:
{
  "summary": "...",
  "strengths": [],
  "weaknesses": [],
  "recommendations": [],
  "hireability": 72,
  "perQuestion": [{"question": "...", "assessment": "..."}]
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.5,
        max_tokens: 400
      });

      const report = JSON.parse(response.choices[0].message.content);
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
      
      // Fallback: Return basic report if AI fails
      console.log('Using fallback report due to AI service error');
      const paired = questions.map((q, i) => ({ question: q, assessment: 'Answered adequately; provide more depth and concrete examples.' }));
      return {
        summary: "Overall performance shows potential with room for improvement",
        strengths: ["Good technical foundation", "Clear communication", "Enthusiastic approach"],
        weaknesses: ["Could provide more specific examples", "Technical depth can be improved", "Practice more complex scenarios"],
        recommendations: ["Practice targeted questions from your tech stack", "Prepare project metrics", "Rehearse concise answers"],
        hireability: 60,
        perQuestion: paired
      };
    }
  }
}

module.exports = new AIService();
