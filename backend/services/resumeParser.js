const pdfParse = require('pdf-parse');
const docx = require('docx');
const fs = require('fs-extra');
const path = require('path');

class ResumeParser {
  async parseFile(filePath, fileType) {
    try {
      let text = '';
      
      if (fileType === 'application/pdf') {
        const dataBuffer = await fs.readFile(filePath);
        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const dataBuffer = await fs.readFile(filePath);
        const doc = new docx.Document({ sections: [] });
        // Note: This is a simplified version. For production, you might want to use a more robust DOCX parser
        text = await this.extractTextFromDocx(dataBuffer);
      } else {
        throw new Error('Unsupported file type');
      }

      return this.cleanText(text);
    } catch (error) {
      console.error('Error parsing file:', error);
      throw new Error('Failed to parse resume file');
    }
  }

  async extractTextFromDocx(buffer) {
    // Simplified DOCX text extraction
    // In production, you might want to use a library like mammoth or docx4js
    try {
      const zip = new docx.Pack();
      const doc = await zip.load(buffer);
      let text = '';
      
      // Extract text from paragraphs
      doc.sections.forEach(section => {
        section.children.forEach(paragraph => {
          paragraph.children.forEach(run => {
            text += run.text + ' ';
          });
          text += '\n';
        });
      });
      
      return text;
    } catch (error) {
      // Fallback: try to extract as plain text
      return buffer.toString('utf8');
    }
  }

  cleanText(text) {
    // Remove extra whitespace and normalize text
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .trim();
  }

  validateFile(file) {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Only PDF and DOCX files are allowed');
    }
    
    if (file.size > maxSize) {
      throw new Error('File size must be less than 10MB');
    }
    
    return true;
  }

  // Heuristic fallback extraction from plain text to reduce generic output
  extractStructuredFallback(text) {
    const out = {
      skills: [],
      projects: [],
      internships: [],
      education: [],
      experience: []
    };

    const lower = text.toLowerCase();
    const lines = text.split(/\n|\r|\t|\s{2,}/g).map(l => l.trim()).filter(Boolean);

    // Skills: look for technical skills in the text
    const skillPatterns = [
      /skills[:\-]/i,
      /technologies[:\-]/i,
      /tech stack[:\-]/i,
      /programming languages[:\-]/i,
      /tools[:\-]/i
    ];
    
    let skillsLine = null;
    for (const pattern of skillPatterns) {
      skillsLine = lines.find(l => pattern.test(l));
      if (skillsLine) break;
    }
    
    if (skillsLine) {
      const afterColon = skillsLine.split(/skills[:\-]|technologies[:\-]|tech stack[:\-]|programming languages[:\-]|tools[:\-]/i).pop() || skillsLine;
      const parts = afterColon.split(/[,•]|\s{2,}/).map(s => s.trim()).filter(s => s && s.length < 40);
      out.skills = Array.from(new Set(parts.map(s => s.replace(/^[•\-]\s*/, '')))).slice(0, 15);
    } else {
      // Extract skills from common tech keywords found in text
      const techKeywords = [
        'javascript', 'react', 'node.js', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
        'html', 'css', 'typescript', 'angular', 'vue', 'express', 'django', 'flask', 'spring',
        'mongodb', 'postgresql', 'mysql', 'redis', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
        'git', 'jenkins', 'jira', 'figma', 'adobe', 'photoshop', 'illustrator', 'sketch',
        'machine learning', 'ai', 'data science', 'sql', 'nosql', 'api', 'rest', 'graphql'
      ];
      
      const foundSkills = techKeywords.filter(skill => lower.includes(skill));
      out.skills = foundSkills.slice(0, 10);
    }

    // Projects: look for project sections
    const projectKeywords = ['project', 'portfolio', 'application', 'app', 'website', 'system'];
    const projectLines = lines.filter(l => 
      projectKeywords.some(keyword => l.toLowerCase().includes(keyword))
    );
    
    projectLines.slice(0, 3).forEach(line => {
      const title = line;
      const desc = line.length > 50 ? line : `${line} - A technical project`;
      const tech = (desc.match(/react|node|express|mongo|postgres|redis|aws|gcp|azure|docker|kubernetes|python|java|go|ts|typescript|javascript|html|css/gi) || []).slice(0, 5);
      out.projects.push({ 
        title, 
        description: desc, 
        techStack: Array.from(new Set(tech)), 
        duration: '3-6 months', 
        role: 'Developer' 
      });
    });

    // Experience: look for job/company patterns
    const expPatterns = [
      /(engineer|developer|intern|software|sde|programmer|analyst)/i,
      /(company|inc\.|llc|solutions|technologies|corp|enterprises)/i
    ];
    
    const expLines = lines.filter(l => 
      expPatterns.some(pattern => pattern.test(l))
    );
    
    expLines.slice(0, 3).forEach(line => {
      const companyMatch = line.match(/(.+?)(?: at | - |, |\()/i);
      const roleMatch = line.match(/(engineer|developer|intern|software|sde|programmer|analyst)/i);
      
      out.experience.push({ 
        company: companyMatch ? companyMatch[1].trim() : line, 
        role: roleMatch ? roleMatch[1] : 'Developer', 
        duration: '1-2 years', 
        responsibilities: ['Developed features', 'Fixed bugs', 'Code review'], 
        technologies: out.skills.slice(0, 3) 
      });
    });

    // Education: look for degree/university patterns
    const eduPatterns = [
      /(b\.?tech|btech|b\.e\.|be|bsc|m\.tech|mtech|msc|bachelor|master|phd)/i,
      /(university|college|institute|school)/i
    ];
    
    const eduLines = lines.filter(l => 
      eduPatterns.some(pattern => pattern.test(l))
    );
    
    eduLines.slice(0, 2).forEach(line => {
      const degreeMatch = line.match(/(b\.?tech|btech|b\.e\.|be|bsc|m\.tech|mtech|msc|bachelor|master|phd)/i);
      const institutionMatch = line.match(/(university|college|institute|school)/i);
      
      out.education.push({ 
        degree: degreeMatch ? degreeMatch[1] : 'Bachelor\'s Degree', 
        institution: institutionMatch ? line : 'University', 
        years: '2020-2024', 
        gpa: '3.5' 
      });
    });

    return out;
  }
}

module.exports = new ResumeParser();

