import * as pdfjsLib from 'pdfjs-dist';
// Vite: resolve the worker as a URL asset and point pdf.js at it.
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Extracts plain text from a PDF file using pdf.js.
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    pageTexts.push(pageText);
  }

  const text = pageTexts.join('\n').replace(/\s+\n/g, '\n').trim();

  if (!text) {
    throw new Error(
      'No selectable text found in this PDF. It may be a scanned image — try pasting the resume text instead.'
    );
  }

  return text;
}

/**
 * Extracts plain text from a DOCX file using mammoth.
 */
export async function extractTextFromDocx(file: File): Promise<string> {
  const mammoth = await import('mammoth');
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });

  const text = value.trim();
  if (!text) {
    throw new Error('No text could be extracted from this DOCX file.');
  }

  return text;
}

/**
 * Detects file type by extension/MIME type and extracts plain text accordingly.
 * Throws a descriptive error for unsupported types so the UI can surface it.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPDF(file);
  }

  if (
    name.endsWith('.docx') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    return extractTextFromDocx(file);
  }

  if (name.endsWith('.txt') || file.type === 'text/plain') {
    return (await file.text()).trim();
  }

  throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
}
