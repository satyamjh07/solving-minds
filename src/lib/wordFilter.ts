// A comprehensive list of explicit/abusive words in English, Hindi, and Hinglish.
const BAD_WORDS = new Set([
  // English Swear/Abusive Words
  'fuck', 'fucking', 'fucker', 'shit', 'shitting', 'asshole', 'bitch', 'bitching',
  'bastard', 'cunt', 'dick', 'pussy', 'whore', 'slut', 'faggot', 'motherfucker',
  'cocksucker', 'wanker', 'prick', 'bollocks', 'crap', 'garbage', 'dumbass',
  'nigga', 'nigger', 'rape', 'porn', 'xxx', 'sex',

  // Hinglish / Hindi Swear/Abusive Words (Latin Script)
  'chutiya', 'chutya', 'chutiye', 'chut', 'choote', 'bhenchod', 'behenchod', 'bhanchod',
  'madarchod', 'maderchod', 'gandu', 'gand', 'gaand', 'saala', 'sala', 'harami',
  'kamina', 'kamine', 'randi', 'rhandi', 'saale', 'sale', 'bhonsdike', 'bhosdike',
  'bhosadika', 'loda', 'lauda', 'lund', 'looda', 'maaderchod', 'chuda', 'chudai',
  'chudane', 'chudwa', 'mc', 'bc', 'bsdk', 'chod', 'lodu', 'chodu',

  // Hindi Swear/Abusive Words (Devanagari Script)
  'गांड', 'गाड', 'चूतिया', 'चूतया', 'चूत', 'लंड', 'लोड़ा', 'लोडा', 'लौड़ा', 'लौडा',
  'भेनचोद', 'बहनचोद', 'बहेनचोद', 'मादरचोद', 'मदरचोद', 'हरामी', 'कमीना', 'कमीने',
  'रंडी', 'रांडी', 'साला', 'साले', 'भोसड़ी', 'भोसड़ीके', 'भोसडीके', 'भोसडी',
  'चोद', 'चोदना', 'चोदाई', 'लोड़ू', 'लौड़ू', 'गांडू', 'गंडू'
]);

/**
 * Normalizes text to handle basic obfuscation and character substitutions.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Replace common character substitutions
    .replace(/[$5]/g, 's')
    .replace(/[@4]/g, 'a')
    .replace(/[1!|]/g, 'i')
    .replace(/0/g, 'o')
    .replace(/3/g, 'e')
    // Remove symbols/punctuation that might be used to split words (e.g. f*u*c*k -> fuck)
    .replace(/[*#._+\-]/g, '');
}

/**
 * Checks if the given title or content contains any explicit/abusive words.
 * Returns true if a violation is detected.
 */
export function hasExplicitContent(title: string, content: string): boolean {
  const combined = `${title} ${content}`;
  const normalized = normalizeText(combined);

  // Split by whitespace and common punctuation to get individual words
  const words = normalized.split(/[\s,.\/#!$%\^&\*;:{}=\-_`~()?"'’[\]]+/);

  for (const word of words) {
    if (word.length > 0 && BAD_WORDS.has(word)) {
      return true;
    }
  }

  // Also check if any of the bad words are present as substrings in a way that matches whole word boundaries,
  // particularly for Devanagari where tokenization might be tricky.
  for (const badWord of BAD_WORDS) {
    // For Devangari words, since word boundaries \b don't work reliably, we can search directly with boundary spacing.
    const isDevanagari = /[\u0900-\u097F]/.test(badWord);
    if (isDevanagari) {
      if (normalized.includes(badWord)) {
        return true;
      }
    } else {
      // For Latin characters, use word boundary regex to avoid false positives (e.g. "class" -> "ass")
      const regex = new RegExp(`\\b${badWord}\\b`, 'i');
      if (regex.test(normalized)) {
        return true;
      }
    }
  }

  return false;
}
