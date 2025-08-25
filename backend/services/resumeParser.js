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
}

module.exports = new ResumeParser();

