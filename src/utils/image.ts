/**
 * Utility to convert Google Drive viewer / share URLs into direct image source URLs.
 * Works with viewer, open, uc, download, and standard share link formats.
 */
export function getDirectDriveUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Check if it's a Google Drive link
  if (trimmed.includes('drive.google.com') || trimmed.includes('docs.google.com')) {
    // 1. Try matching the standard /file/d/FILE_ID path
    const fileIdMatch1 = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileIdMatch1 && fileIdMatch1[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch1[1]}`;
    }
    
    // 2. Try matching query parameter id=FILE_ID (e.g. open?id=... or uc?id=...)
    const fileIdMatch2 = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (fileIdMatch2 && fileIdMatch2[1]) {
      return `https://lh3.googleusercontent.com/d/${fileIdMatch2[1]}`;
    }
  }
  
  // Return original URL if it's not a Google Drive link
  return trimmed;
}
