// US → Canadian English spelling normalization.
//
// Whisper's `language` parameter takes bare ISO-639-1 codes ('en', not 'en-CA'),
// so there is no regional-dialect flag; output defaults to US orthography
// because that dominates the training data. The fix is toCanadianEnglish(): a
// deterministic word map applied to the transcript Whisper returns.
//
// Whisper's optional `prompt` parameter can also bias spelling, and is
// deliberately not used — see the note at its call site in
// transcriptionService. It is a soft bias that can leak its own words into a
// transcript, and every word it would name is already covered here.
//
// Canadian English is a genuine mix of British and American conventions, and
// getting that mix wrong is worse than leaving the text alone. The rules below
// are the ones Canada actually follows:
//
//   -our     behaviour, colour, favour, neighbour      (British)
//   -re      centre, metre, litre, fibre               (British)
//   -ce      defence, offence, pretence                (British)
//   -ll-     travelled, counselling, labelled          (British)
//   -ogue    catalogue, dialogue                       (British)
//   -ize     analyze, recognize, organize              (American — NOT -ise)
//   -ze      aluminum, program, tire, jail             (American)
//   ae/oe    anemia, edema, pediatric, esophagus       (American)
//
// The -ize/-yze and ae/oe rows are why a blanket "use British spelling"
// instruction is wrong: it would produce analyse, anaemia and paediatric, none
// of which are Canadian.

/**
 * Words deliberately left alone, because a word-level map cannot tell which
 * sense is meant and guessing wrong corrupts the transcript:
 *
 *   practice/practise, licence/license — Canadian splits these by part of
 *     speech (noun -ce, verb -se). Needs a parser, not a map.
 *   check/cheque — "cheque" is the Canadian bank instrument, but "check" as a
 *     verb is far more common in speech ("check in on me", "get it checked").
 *   meter/metre — "metre" is the unit, "meter" the device (parking meter, blood
 *     glucose meter). Prefixed forms are unambiguous, so kilometre/centimetre
 *     /millimetre are mapped and bare "meter" is not.
 *   storey/story, mould/mold, plough/plow, sulphur/sulfur — Canadian usage is
 *     genuinely split; the US form is in common Canadian use.
 *   enrolment, fulfilment, instalment — mixed in Canadian usage.
 *
 * Latin-derived -or derivatives keep the short form in Canadian English too:
 * humorous, vigorous, rigorous, glamorous, laborious, honorary, honorific.
 * That is why suffixes are expanded from an explicit list below rather than
 * matched as "anything after -our".
 */

// Bases taking -our in Canadian English, expanded over the suffixes that keep
// the u. 'ous', 'ific' and 'ary' are deliberately absent — see above.
const OUR_BASES = [
  'behavior', 'candor', 'clamor', 'color', 'demeanor', 'endeavor', 'favor',
  'flavor', 'harbor', 'honor', 'humor', 'labor', 'neighbor', 'odor', 'rumor',
  'savor', 'splendor', 'tumor', 'valor', 'vapor', 'vigor',
];
const OUR_SUFFIXES = ['', 's', 'ed', 'ing', 'ful', 'fully', 'less', 'able', 'ably', 'ite', 'ites', 'al', 'ally'];

function expandOurWords(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const base of OUR_BASES) {
    const ca = base.replace(/or$/, 'our');
    for (const suffix of OUR_SUFFIXES) {
      map[base + suffix] = ca + suffix;
    }
  }
  return map;
}

// Everything whose Canadian form is not a clean suffix expansion. -re words are
// irregular once inflected (centered → centred, centering → centring), so they
// are written out rather than generated.
const EXPLICIT: Record<string, string> = {
  // -er → -re
  center: 'centre', centers: 'centres', centered: 'centred', centering: 'centring',
  centerpiece: 'centrepiece', epicenter: 'epicentre',
  liter: 'litre', liters: 'litres', milliliter: 'millilitre', milliliters: 'millilitres',
  kilometer: 'kilometre', kilometers: 'kilometres',
  centimeter: 'centimetre', centimeters: 'centimetres',
  millimeter: 'millimetre', millimeters: 'millimetres',
  fiber: 'fibre', fibers: 'fibres', fiberglass: 'fibreglass',
  theater: 'theatre', theaters: 'theatres',
  caliber: 'calibre', somber: 'sombre', luster: 'lustre', specter: 'spectre',
  maneuver: 'manoeuvre', maneuvers: 'manoeuvres', maneuvering: 'manoeuvring',

  // -se → -ce (the noun forms, which have no verb homograph)
  defense: 'defence', defenses: 'defences', defenseless: 'defenceless',
  offense: 'offence', offenses: 'offences',
  pretense: 'pretence', pretenses: 'pretences',

  // Doubled final consonant before a suffix
  traveled: 'travelled', traveling: 'travelling', traveler: 'traveller', travelers: 'travellers',
  canceled: 'cancelled', canceling: 'cancelling',
  counseled: 'counselled', counseling: 'counselling', counselor: 'counsellor', counselors: 'counsellors',
  labeled: 'labelled', labeling: 'labelling',
  modeled: 'modelled', modeling: 'modelling',
  signaled: 'signalled', signaling: 'signalling',
  fueled: 'fuelled', fueling: 'fuelling',
  totaled: 'totalled', totaling: 'totalling',
  leveled: 'levelled', leveling: 'levelling',
  channeled: 'channelled', channeling: 'channelling',
  funneled: 'funnelled', funneling: 'funnelling',
  quarreled: 'quarrelled', quarreling: 'quarrelling',
  dialed: 'dialled', dialing: 'dialling',
  marveled: 'marvelled', marvelous: 'marvellous',
  jewelry: 'jewellery', woolen: 'woollen', woolens: 'woollens',

  // -og → -ogue
  catalog: 'catalogue', catalogs: 'catalogues',
  dialog: 'dialogue', dialogs: 'dialogues',
  analog: 'analogue', monolog: 'monologue',

  // One-offs
  gray: 'grey', grays: 'greys', grayish: 'greyish', grayer: 'greyer', grayest: 'greyest',
};

/** The full US → Canadian map. Exported for scripts and inspection. */
export const US_TO_CA: Readonly<Record<string, string>> = Object.freeze({
  ...expandOurWords(),
  ...EXPLICIT,
});

// One alternation over every key, longest first so that a longer key always
// wins over a shorter one that prefixes it (centerpiece before center). \b
// keeps it to whole words, so "Colorado" and "Decatur" are untouched.
const PATTERN = new RegExp(
  `\\b(${Object.keys(US_TO_CA).sort((a, b) => b.length - a.length).join('|')})\\b`,
  'gi',
);

/** Re-apply the casing of the matched word to its replacement. */
function matchCase(match: string, replacement: string): string {
  if (match === match.toUpperCase() && match.length > 1) return replacement.toUpperCase();
  if (match[0] === match[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1);
  return replacement;
}

/**
 * Rewrite US spellings as Canadian ones. Whole words only, case preserved.
 *
 * Safe to run over a JSON string: every key is an ordinary English word, and
 * none of the JSON keys this app stores ("bullets", "point", "sentiment",
 * "confidence") is in the map.
 */
export function toCanadianEnglish(text: string): string {
  if (!text) return text;
  return text.replace(PATTERN, m => matchCase(m, US_TO_CA[m.toLowerCase()]));
}

/**
 * Same rewrite, plus a count of each substitution made. Used by the
 * backfill script so a run reports what it actually changed.
 */
export function canadianizeWithChanges(text: string): { text: string; changes: Record<string, number> } {
  const changes: Record<string, number> = {};
  if (!text) return { text, changes };
  const out = text.replace(PATTERN, m => {
    const lower = m.toLowerCase();
    const replacement = US_TO_CA[lower];
    changes[`${lower}->${replacement}`] = (changes[`${lower}->${replacement}`] || 0) + 1;
    return matchCase(m, replacement);
  });
  return { text: out, changes };
}

/** Instruction line appended to the GPT system prompt. */
export const GPT_CANADIAN_INSTRUCTION =
  '- Write in Canadian English: -our endings (behaviour, colour, favour), -re endings (centre, litre, fibre), '
  + 'defence and offence, doubled consonants before suffixes (travelled, counselling, labelled), '
  + 'and -ize/-yze endings (analyze, recognize) — never -ise/-yse.';
