import pdfParse from 'pdf-parse';
import { createWorker } from 'tesseract.js';
import fs from 'fs';

// Extract text from PDF files using pdf-parse
export const extractTextFromPdf = async (filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text || '',
      pages: data.numpages || 1,
      info: data.info || {},
    };
  } catch (error) {
    console.error('[OCR/PDF] Error parsing PDF text:', error.message);
    return { text: '', pages: 0, error: error.message };
  }
};

// OCR extraction for images (jpg, jpeg, png) using Tesseract.js
export const extractTextFromImage = async (filePath) => {
  let worker = null;
  try {
    worker = await createWorker('eng');
    const ret = await worker.recognize(filePath);
    await worker.terminate();
    return {
      text: ret.data.text || '',
      confidence: ret.data.confidence || 0,
    };
  } catch (error) {
    if (worker) await worker.terminate();
    console.error('[OCR] Error running Tesseract OCR:', error.message);
    return { text: '', confidence: 0, error: error.message };
  }
};

// Smart heuristic entity extraction from raw text
export const parseExtractedAcademicData = (rawText) => {
  const result = {
    candidateName: '',
    rollNumber: '',
    board: '',
    passingYear: '',
    percentage: '',
    confidenceScore: 75,
  };

  if (!rawText || typeof rawText !== 'string') return result;

  const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);

  // Roll Number Match
  const rollRegex = /(?:roll\s*(?:no|number)|roll\s*:|rollno)\s*[:.-]?\s*([A-Za-z0-9_-]{5,15})/i;
  const rollMatch = rawText.match(rollRegex);
  if (rollMatch && rollMatch[1]) {
    result.rollNumber = rollMatch[1].trim();
  }

  // Passing Year Match (1990 - 2030)
  const yearRegex = /(?:year|passing\s*year|session|examination)\s*[:.-]?\s*(20[1-2][0-9]|19[8-9][0-9])/i;
  const yearMatch = rawText.match(yearRegex);
  if (yearMatch && yearMatch[1]) {
    result.passingYear = yearMatch[1].trim();
  } else {
    const genericYear = rawText.match(/\b(201[5-9]|202[0-6])\b/);
    if (genericYear) result.passingYear = genericYear[1];
  }

  // Board Detection
  if (/CBSE|Central\s+Board/i.test(rawText)) {
    result.board = 'CBSE';
  } else if (/ICSE|ISC|Council\s+for\s+the\s+Indian/i.test(rawText)) {
    result.board = 'ICSE/ISC';
  } else if (/Maharashtra/i.test(rawText)) {
    result.board = 'Maharashtra State Board';
  } else if (/Karnataka/i.test(rawText)) {
    result.board = 'Karnataka State Board';
  } else if (/Uttar\s+Pradesh|UP\s+Board/i.test(rawText)) {
    result.board = 'UP State Board';
  }

  // Percentage Match
  const pctRegex = /(?:percentage|aggregate)\s*[:.-]?\s*(100|\d{1,2})(\.\d{1,2})?\s*%?(?![\d.])/i;
  const pctMatch = rawText.match(pctRegex);
  if (pctMatch && pctMatch[1]) {
    result.percentage = pctMatch[1] + (pctMatch[2] || '');
  }

  // Candidate Name Match
  const nameRegex = /^(?:candidate[ \t]*name|student[ \t]*name|name[ \t]*of[ \t]*candidate|name)[ \t]*[:.-][ \t]*([\p{L} .'-]{3,70})$/iu;
  const nameMatch = lines.map((line) => line.match(nameRegex)).find(Boolean);
  if (nameMatch && nameMatch[1]) {
    const candidate = nameMatch[1].trim();
    if (!/board|school|institution|examination|marks|result/i.test(candidate)) {
      result.candidateName = candidate;
    }
  }

  return result;
};

// Compare extracted OCR data with form inputs to detect discrepancies
export const detectDataMismatches = (extracted, formDetails) => {
  const mismatches = [];

  if (extracted.rollNumber && formDetails.rollNumber) {
    if (extracted.rollNumber.trim().toLowerCase() !== String(formDetails.rollNumber).trim().toLowerCase()) {
      mismatches.push(`Roll Number mismatch: Document has "${extracted.rollNumber}", Form has "${formDetails.rollNumber}"`);
    }
  }

  if (extracted.passingYear && formDetails.passingYear) {
    if (String(extracted.passingYear) !== String(formDetails.passingYear)) {
      mismatches.push(`Passing Year mismatch: Document has "${extracted.passingYear}", Form has "${formDetails.passingYear}"`);
    }
  }

  if (extracted.percentage && formDetails.percentage != null && formDetails.percentage !== '' &&
      Math.abs(Number(extracted.percentage) - Number(formDetails.percentage)) > 0.05) {
    mismatches.push(`Percentage mismatch: Document has ${extracted.percentage}%, form has ${formDetails.percentage}%.`);
  }

  if (extracted.candidateName && formDetails.candidateName) {
    const normalizeName = (value) => String(value).normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{M}]/gu, '');
    const docName = normalizeName(extracted.candidateName);
    const formName = normalizeName(formDetails.candidateName);
    if (docName && formName && !docName.includes(formName) && !formName.includes(docName)) {
      mismatches.push(`Candidate Name discrepancy: Document says "${extracted.candidateName}", Form says "${formDetails.candidateName}"`);
    }
  }

  return mismatches;
};
