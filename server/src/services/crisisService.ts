// Crisis detection service — ported from mobile crisisDetection.tsx

export interface CrisisDetectionResult {
  flagged: boolean;
  detectedPhrases: string[];
}

// Write every entry WITHOUT apostrophes. `normalize()` strips them from the
// transcript before matching, so "cant go on" matches "can't go on", "can’t go
// on" and "cant go on" alike. The old list wrote "can't go on" with an ASCII
// apostrophe and therefore silently missed any transcript using a typographic
// one, which is most of them.
//
// Dropped entries are commented out rather than deleted, so the reason a word
// stopped matching is still readable here.
const HARMFUL_KEYWORDS = [
  // ── Self-harm and suicide ────────────────────────────────────────────────
  'kill myself',
  'killing myself',                 // added
  'shoot myself',
  'shooting myself',                // added
  'end myself',
  'take my life',
  'taking my life',                 // added
  'end my life',
  'ending my life',                 // added
  'commit suicide',
  'committing suicide',             // added
  'suicide',
  'suicidal',                       // added
  'want to die',
  'wanna die',                      // added
  'wish i was dead',                // added
  'wish i were dead',               // added
  'better off dead',
  'better off without me',          // added
  'no reason to live',
  'nothing to live for',            // added
  'nothing left to live for',       // added
  'not worth living',               // added
  'no point in living',             // added
  'dont want to be here',           // added — the whole phrase is the keyword, so the negation guard below does not cancel it
  'dont want to live',              // added
  'dont want to wake up',           // added
  'cant go on',                     // changed from "can't go on" — see the apostrophe note above
  'cannot go on',                   // added
  'cant do this anymore',           // added
  'cannot do this anymore',         // added
  'cant take it anymore',           // added
  'cannot take it anymore',         // added
  // 'give up',                     // DROPPED — fired on "I give up on this crossword", "I didn't give up on physio"
  'ready to give up',               // added — replaces bare 'give up'
  'giving up on life',              // added — replaces bare 'give up'
  'end it all',
  'ending it all',                  // added
  'end things',                     // added
  'ending things',                  // added
  'take myself out',                // added
  'off myself',                     // added
  'offing myself',                  // added
  'hurt myself',
  'hurting myself',
  'harm myself',
  'harming myself',                 // added
  'cut myself',
  'cutting myself',
  'started cutting',                // added — "I started cutting again" was missed
  'cutting again',                  // added
  'self harm',
  'self-harm',
  'poison myself',
  'hang myself',
  'hanging myself',                 // added
  'overdose',                    
  'tried to overdose',              // added — replaces bare 'overdose'
  'want to overdose',               // added
  'took an overdose',               // added
  'overdose on purpose',            // added
  'over dose',                   
  // 'take pills',                  // DROPPED — the worst entry in the old list: "I take pills every morning for my blood pressure"
  'took all my pills',              // added — replaces 'take pills'
  'counting the pills',             // added
  'counting my pills',              // added
  'saving up my pills',             // added
  'whole bottle of pills',          // added
  // 'swallow pills',               // DROPPED — fired on "I have to swallow pills with food or my stomach turns"
  'swallowed the whole bottle',     // added — replaces 'swallow pills'
  'swallow the whole bottle',       // added
  // Means and planning — high specificity, all new
  'gun in my mouth',                // added
  'weapon in my mouth',             // added
  'pull the trigger',               // added — accepts the idiom risk ("pull the trigger on a new truck") for a phrasing that matters in this cohort
  'goodbye letter',                 // added
  'goodbye note',                   // added

  // ── Harm to others ──────────────────────────────────────────────────────
  'kill someone',
  'kill them',
  'kill him',                       // added
  'kill her',                       // added
  'kill people',                    // kept, but note: a veteran recounting service ("we were trained to kill people") will trip this
  'kill something',
  'hurt something',
  'hurt someone',
  'hurt them',
  'hurt people',
  'harm someone',
  'harm them',
  'harm people',
  'cut someone',
  'attack someone',
  'stab someone',                   // added
  'poison someone',
  'shoot someone',                  // kept, but note: same service-recollection risk as 'kill people'
  'shoot them',                     // added
  'make him pay',                   // added
  'make her pay',                   // added
  'make them pay',                  // added
  // 'pay for what he did',         // TRIED AND REVERTED — it caught "make my neighbour pay for what he did", but also
  // 'pay for what she did',        // "he should pay for what he did to my truck". Accepting that miss: the phrase is
  // 'pay for what they did',       // ambiguous (it reads as a lawsuit as often as a threat) and the 'make him/her/them
                                    // pay' entries above still catch the direct phrasings.
  'kill my pet',
  'kill my dog',
  'kill my cat',

  // ── Violence ────────────────────────────────────────────────────────────
  // 'assault',                     // DROPPED — fired on "charged with assault back in 98" and, far worse, on "sexual assault": an MST disclosure would have been flagged as harm-to-others risk
  'assault someone',                // added — replaces bare 'assault'
  'angry enough to',
  'want to hurt',
  'want to kill',                

  // ── Despair and hopelessness ────────────────────────────────────────────
  // Every entry in this group used to be a bare adjective, and this group
  // produced most of the false positives. Each is now bound to a first-person
  // feeling, which keeps "I feel useless" while dropping "my knee is useless".
  // 'hopeless',                    // DROPPED as a bare word — fired on "hopeless about this claim ever going through"
  'i feel hopeless',                // added — replaces bare 'hopeless'
  'feeling hopeless',               // added
  'im hopeless',                    // added
  // 'helpless',                    // DROPPED as a bare word
  'i feel helpless',                // added — replaces bare 'helpless'
  'feeling helpless',               // added
  // 'worthless',                   // DROPPED as a bare word
  'i feel worthless',               // added — replaces bare 'worthless'
  'feeling worthless',              // added
  'im worthless',                   // added
  // 'useless',                     // DROPPED as a bare word — fired on "my knee is useless in the cold", "this brace is pretty much useless"
  'i feel useless',                 // added — replaces bare 'useless'
  'feeling useless',                // added
  'im useless',                     // added
  // 'no point',                    // DROPPED — fired on "there is no point in the exercises if they make it worse"
  'whats the point anymore',        // added — replaces bare 'no point'
  // 'pointless',                   // DROPPED as a bare word — fired on "the paperwork feels pointless"
  'life feels pointless',           // added — replaces bare 'pointless'
  'it all feels pointless',         // added
  // 'meaningless',                 // DROPPED as a bare word
  'life is meaningless',            // added — replaces bare 'meaningless'
  'life feels meaningless',         // added
  // "don't matter",                // DROPPED — fired on "my buddies don't matter to the VA apparently"
  'i dont matter',                  // added — replaces "don't matter"
  'nothing matters anymore',        // added
  // 'no one cares',                // DROPPED — fired on "no one cares about the wait times"
  'no one cares about me',          // added — replaces 'no one cares'
  'nobody cares about me',          // added
  'no one would miss me',           // added
  // 'isolated',                    // DROPPED as a bare word — fired on "I isolated the variable", "I isolated the sore spot with my thumb"
  'feel isolated',                  // added — replaces bare 'isolated'; still catches the real "I'm feeling very isolated"
  'feeling isolated',               // added
  'so isolated',                    // added
  'very isolated',                  // added
  'feel so alone',                  // added
  'completely alone',               // added
  'feel like a burden',             // added
  'im a burden',                    // added
  'tired of living',                // added
  'sick of living',                 // added
  'no way out',
  'no escape',
];

// A negator sitting DIRECTLY before a phrase cancels it, so "I do not want to
// die" and "I would never hurt myself" no longer flag.
const NEGATORS = ['not', 'never', 'dont', 'didnt', 'wouldnt', 'wont', 'isnt', 'arent'];

export const CRISIS_RESOURCES = {
  crisis_services_canada: {
    name: 'Crisis Services Canada',
    phone: '1-833-456-4566',
    text: '45645',
    description: '24/7 free and confidential support for people in distress',
  },
  kids_help_phone: {
    name: 'Kids Help Phone',
    phone: '1-800-668-6868',
    text: '686868',
    description: '24/7 support for young people under 20',
  },
  emergency: {
    name: 'Emergency Services',
    phone: '911',
    description: 'Call 911 for immediate emergency assistance',
  },
  wellness_together_canada: {
    name: 'Wellness Together Canada',
    phone: '1-866-585-0445',
    description: 'Free mental health and substance use support',
  },
  hope_for_wellness: {
    name: 'Hope for Wellness Helpline',
    phone: '1-855-242-3310',
    description: '24/7 support for Indigenous peoples',
  },
};

export const CRISIS_RESOURCES_TEXT = `CRISIS RESOURCES (ONTARIO & VETERANS):

Veterans:
Veterans Affairs Canada Assistance Service: 1-800-268-7708 | TTY: 1-800-567-5803
Available 24/7 for Veterans, Canadian Armed Forces members, RCMP, and their families.

City of Toronto:
Gerstein Crisis Centre: 416-929-5200
24/7 crisis line for adults in the City of Toronto.

Ontario-Wide:
Talk Suicide Canada: 1-833-456-4566 | Text: 45645
Mental Health Helpline (Ontario): 1-866-531-2600
Available 24/7. Free, confidential, and available across Ontario.`;

// Lowercase, remove every apostrophe variant, collapse whitespace. Removing
// apostrophes rather than converting them means can't / can’t / cant all
// become "cant", so one keyword covers all three spellings.
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’'`]/g, '')
    .replace(/\s+/g, ' ');
}

// True when a negation word sits immediately before the match. The window is
// deliberately narrow: 12 characters plus up to four trailing words. Wide
// enough for "do not want to die", too narrow to swallow "cant stop thinking
// about killing myself", which must still flag.
function isNegated(text: string, matchStart: number): boolean {
  const before = text.slice(Math.max(0, matchStart - 12), matchStart);
  return NEGATORS.some(n => new RegExp(`\\b${n}\\b[\\s\\w]{0,4}$`).test(before));
}

export function detectCrisisContent(transcript: string): CrisisDetectionResult {
  if (!transcript || transcript.trim() === '') {
    return { flagged: false, detectedPhrases: [] };
  }

  const text = normalize(transcript);
  const detectedPhrases: string[] = [];

  for (const keyword of HARMFUL_KEYWORDS) {
    const at = text.indexOf(normalize(keyword));
    if (at !== -1 && !isNegated(text, at)) {
      detectedPhrases.push(keyword);
    }
  }

  return {
    flagged: detectedPhrases.length > 0,
    detectedPhrases: [...new Set(detectedPhrases)],
  };
}
