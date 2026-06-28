/**
 * Utility to clean AI-generated or copy-pasted citations from text content.
 * e.g., removes [cite_start], [cite_end], [cite: 123, 456], etc.
 */
export function cleanCitations(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/\[cite_start\]/gi, '')
    .replace(/\[cite_end\]/gi, '')
    .replace(/\[cite:[^\]]*\]/gi, '')
    .replace(/\[cite\s+[^\]]*\]/gi, '');
}
