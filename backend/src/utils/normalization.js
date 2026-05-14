/**
 * Normalizes a school name into a canonical format.
 * - Extracts branch (Paldi/Vasna). Defaults to Paldi.
 * - Standardizes base name by stripping noise like "school", dots, etc.
 * - Returns an object with canonical details.
 */
const normalizeSchoolName = (name = '') => {
  if (!name || String(name).trim() === '') {
    return { original: '', canonical: '', base: '', branch: 'Paldi' };
  }

  const raw = String(name).trim();
  let low = raw.toLowerCase();
  
  // 1. Identify Branch
  let branch = 'Paldi';
  if (low.includes('vasna')) branch = 'Vasna';

  // 2. Pre-process: Treat dots and spaces similarly, then merge isolated initials
  // e.g., "A.E.S. AG" -> "a e s ag" -> "aes ag"
  let processed = low
    .replace(/\(.*?\)/g, ' ')      // Remove content in parentheses
    .replace(/[\.\-,\/]/g, ' ')    // Dots/hyphens to spaces
    .replace(/\s+/g, ' ')          // Collapse spaces
    .trim();

  // Merge consecutive short letters/initials: "a e s ag school" -> "aes ag school", "ae s" -> "aes"
  processed = processed.replace(/\b([a-z]{1,2})\s+(?=[a-z]{1,2})\b/gi, (match) => match.replace(/\s+/g, ''));
  // Run again to catch triplets like "a e s" -> "ae s" -> "aes"
  processed = processed.replace(/\b([a-z]{1,2})\s+(?=[a-z]{1,2})\b/gi, (match) => match.replace(/\s+/g, ''));

  // Split known stuck-together words and handle aliases
  processed = processed
    .replace(/aesagschool/g, 'aes ag school')
    .replace(/agteachers/g, 'ag teachers')
    .replace(/agschool/g, 'ag school')
    .replace(/agprimary/g, 'ag primary')
    .replace(/davinternational/g, 'dav international')
    .replace(/\s+/g, ' ')
    .trim();

  // Alias 'aes' without 'ag' to 'aes ag' to unify the AES school variations
  if (processed.startsWith('aes') && !processed.includes('ag')) {
    processed = processed.replace('aes', 'aes ag');
  }

  // 3. Strip Noise Words
  const noiseWords = [
    'high', 'higher', 'primary', 'secondary', 'senior', 'public', 
    'teachers', 'international', 'school', 'vidyalaya', 'vidhyalay', 
    'academy', 'institute', 'college', 'excellence', 'for'
  ];
  
  // Also strip branch names from base
  const branches = ['paldi', 'vasna', 'vejalpur', 'makaraba'];

  let words = processed.split(' ');
  let filteredWords = words.filter(w => !noiseWords.includes(w) && !branches.includes(w));

  // If we filtered out everything (e.g., just "High School"), revert to raw words but without branch
  if (filteredWords.length === 0) {
    filteredWords = words.filter(w => !branches.includes(w));
  }

  // 4. Final Base Construction
  let base = filteredWords.join(' ').trim();

  // 5. Handle Abbreviations (AES, DAV, etc.) and Title Case
  const knownAbbreviations = ['aes', 'dav', 'ag'];
  let baseParts = base.split(' ').map(part => {
    if (knownAbbreviations.includes(part.toLowerCase())) return part.toUpperCase();
    if (part.length <= 3) return part.toUpperCase(); // Treat short words as abbreviations
    return part.charAt(0).toUpperCase() + part.slice(1);
  });
  
  let finalBase = baseParts.join(' ').trim();
  if (!finalBase) finalBase = 'Unknown School';

  // 6. Construct Canonical Name
  // ONLY Apollo school uses the branch suffix (Paldi/Vasna). Others use just the base name.
  let canonical = finalBase;
  if (finalBase.toLowerCase().includes('apollo')) {
    canonical = `${finalBase} (${branch})`;
  }

  return {
    original: raw,
    canonical: canonical,
    base: finalBase,
    branch: branch
  };
};

module.exports = { normalizeSchoolName };
