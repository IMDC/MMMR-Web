// Frequency calculation service — ported from mobile frequencyCalculation.ts and ngramExtractor.tsx
// Runs server-side so the client never needs the heavy computation

export interface FrequencyMap {
  [key: string]: number;
}

export interface FrequencyData {
  map: FrequencyMap;
  datetime: string;
  videoID: string;
}

// ── Stop words (condensed from mobile assets/util/words.tsx) ──────────────────
const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're",
  "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 'him',
  'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', "it's", 'its',
  'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who',
  'whom', 'this', 'that', "that'll", 'these', 'those', 'am', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did',
  'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until',
  'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
  'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here',
  'there', 'when', 'where', 'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most',
  'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
  'too', 'very', 's', 't', 'can', 'will', 'just', 'don', "don't", 'should', "should've",
  'now', 'd', 'll', 'm', 'o', 're', 've', 'y', 'ain', 'aren', "aren't", 'couldn',
  "couldn't", 'didn', "didn't", 'doesn', "doesn't", 'hadn', "hadn't", 'hasn', "hasn't",
  'haven', "haven't", 'isn', "isn't", 'ma', 'mightn', "mightn't", 'mustn', "mustn't",
  'needn', "needn't", 'shan', "shan't", 'shouldn', "shouldn't", 'wasn', "wasn't",
  'weren', "weren't", 'won', "won't", 'wouldn', "wouldn't", 'um', 'uh', 'like',
  'okay', 'ok', 'yeah', 'yes', 'no', 'well', 'also', 'hesitation', 'got', 'get',
  'going', 'go', 'went', 'come', 'came', 'know', 'think', 'say', 'said', 'really',
  'little', 'bit', 'kind', 'lot', 'things', 'thing', 'way', 'much',
]);

// ── Medical terms (condensed from mobile medicalTerms.tsx) ────────────────────
const MEDICAL_SYMPTOMS = [
  'pain', 'ache', 'aching', 'headache', 'migraine', 'fatigue', 'tiredness', 'exhaustion',
  'nausea', 'dizziness', 'vertigo', 'anxiety', 'depression', 'stress', 'insomnia',
  'fever', 'chills', 'shortness of breath', 'chest pain', 'back pain', 'joint pain',
  'muscle pain', 'stomach pain', 'abdominal pain', 'cramps', 'vomiting', 'diarrhea',
  'constipation', 'bloating', 'swelling', 'inflammation', 'rash', 'itching', 'numbness',
  'tingling', 'weakness', 'tremor', 'seizure', 'memory loss', 'confusion', 'disorientation',
  'mood swings', 'irritability', 'sadness', 'hopelessness', 'panic', 'fear', 'worry',
  'sleep', 'sleeping', 'rest', 'energy', 'appetite', 'weight', 'breathing',
];

const INTENSITY_MODIFIERS = {
  high: ['severe', 'extreme', 'intense', 'horrible', 'terrible', 'unbearable', 'excruciating',
         'a lot of', 'lots of', 'significant', 'substantial', 'excessive',
         'really', 'very', 'super', 'totally', 'absolutely', 'overwhelming',
         'quite a bit', 'pretty bad', 'in so much'],
  moderate: ['moderate', 'noticeable', 'fair amount of', 'pretty', 'quite', 'fairly',
             'rather', 'kind of', 'kinda', 'somewhat'],
  low: ['a little', 'a bit', 'small amount of', 'barely any', 'hardly any',
        'slight', 'mild', 'minor', 'minimal'],
};

// ── N-gram extraction ─────────────────────────────────────────────────────────
function getIntensityCategory(modifier: string): 'high' | 'moderate' | 'low' | null {
  if (INTENSITY_MODIFIERS.high.includes(modifier)) return 'high';
  if (INTENSITY_MODIFIERS.moderate.includes(modifier)) return 'moderate';
  if (INTENSITY_MODIFIERS.low.includes(modifier)) return 'low';
  return null;
}

function extractMedicalPhrases(text: string): { phrase: string; intensity?: string }[] {
  const words = text.toLowerCase().split(/\s+/);
  const results: { phrase: string; intensity?: string }[] = [];

  const allModifiers = [
    ...INTENSITY_MODIFIERS.high,
    ...INTENSITY_MODIFIERS.moderate,
    ...INTENSITY_MODIFIERS.low,
  ].sort((a, b) => b.split(' ').length - a.split(' ').length);

  const sortedSymptoms = [...MEDICAL_SYMPTOMS].sort(
    (a, b) => b.split(' ').length - a.split(' ').length,
  );

  for (let i = 0; i < words.length; i++) {
    let symptomMatch: string | null = null;
    let symptomEndIndex = i;

    for (const symptom of sortedSymptoms) {
      const symWords = symptom.split(' ');
      if (i + symWords.length <= words.length) {
        if (symWords.every((sw, idx) => words[i + idx] === sw)) {
          symptomMatch = symptom;
          symptomEndIndex = i + symWords.length - 1;
          break;
        }
      }
    }

    if (!symptomMatch) continue;

    const lookbackStart = Math.max(0, i - 5);
    const precedingWords = words.slice(lookbackStart, i);
    const foundModifiers: string[] = [];

    for (const modifier of allModifiers) {
      const modWords = modifier.split(' ');
      for (let j = 0; j <= precedingWords.length - modWords.length; j++) {
        if (modWords.every((mw, k) => precedingWords[j + k] === mw)) {
          foundModifiers.push(modifier);
          break;
        }
      }
    }

    const phrase = [...foundModifiers.flatMap(m => m.split(' ')), ...symptomMatch.split(' ')].join(' ');
    let intensity: string | undefined;
    for (const modifier of foundModifiers) {
      const cat = getIntensityCategory(modifier);
      if (cat) { intensity = cat; break; }
    }

    results.push({ phrase, intensity });

    if (intensity) {
      results.push({ phrase: `${intensity}_${symptomMatch}`, intensity });
    }

    i = symptomEndIndex;
  }

  return results;
}

// ── Core frequency processing ─────────────────────────────────────────────────

/**
 * Process a transcript into a frequency map.
 * Combines word frequency + medical n-gram extraction.
 */
export function processTranscriptToFrequency(transcript: string, minCount = 1): FrequencyMap {
  if (!transcript || transcript.trim() === '') return {};

  const freq: FrequencyMap = {};
  const words = transcript.toLowerCase().replace(/[^a-z0-9\s'-]/g, '').split(/\s+/);

  // Basic word frequency
  for (const word of words) {
    const cleaned = word.replace(/^['-]+|['-]+$/g, '');
    if (!cleaned || cleaned.length < 2 || STOP_WORDS.has(cleaned)) continue;
    freq[cleaned] = (freq[cleaned] || 0) + 1;
  }

  // Medical n-gram phrases
  const phrases = extractMedicalPhrases(transcript);
  for (const { phrase } of phrases) {
    if (phrase && !STOP_WORDS.has(phrase)) {
      freq[phrase] = (freq[phrase] || 0) + 1;
    }
  }

  // Filter by minimum count and remove 'hesitation'
  const filtered: FrequencyMap = {};
  for (const [word, count] of Object.entries(freq)) {
    if (count >= minCount && word.toLowerCase() !== 'hesitation') {
      filtered[word] = count;
    }
  }

  return filtered;
}

// ── Aggregation helpers ───────────────────────────────────────────────────────

export function combineFrequencyMaps(freqMaps: FrequencyData[]): Map<string, number> {
  const combined = new Map<string, number>();
  for (const item of freqMaps) {
    if (!item.map) continue;
    for (const [word, count] of Object.entries(item.map)) {
      combined.set(word, (combined.get(word) || 0) + count);
    }
  }
  return combined;
}

export function formatForBarGraph(freqMaps: FrequencyData[]): { data: Array<{ text: string; value: number }> } {
  const combined = combineFrequencyMaps(freqMaps);
  const data = Array.from(combined.entries())
    .map(([text, value]) => ({ text, value }))
    .filter(item => item.text && item.text.toLowerCase() !== 'hesitation')
    .sort((a, b) => b.value - a.value);
  return { data };
}

export function formatForWordCloud(freqMaps: FrequencyData[]): Array<{ text: string; value: number }> {
  const combined = combineFrequencyMaps(freqMaps);
  return Array.from(combined.entries())
    .map(([text, value]) => ({ text, value }))
    .filter(item => item.text && item.text.toLowerCase() !== 'hesitation')
    .sort((a, b) => b.value - a.value);
}

export function getWordListForDropdown(freqMaps: FrequencyData[]): Array<{ text: string; value: number }> {
  const combined = combineFrequencyMaps(freqMaps);
  return Array.from(combined.entries())
    .map(([text, value]) => ({ text, value }))
    .filter(item => item.text && item.text.toLowerCase() !== 'hesitation')
    .sort((a, b) => a.text.localeCompare(b.text));
}

export function calculateLineGraphData(freqMaps: FrequencyData[], word: string) {
  return {
    word,
    data: freqMaps.map(item => ({
      datetime: item.datetime,
      videoID: item.videoID,
      value: item.map[word] || 0,
    })),
  };
}
