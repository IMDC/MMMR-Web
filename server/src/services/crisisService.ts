// Crisis detection service — ported from mobile crisisDetection.tsx

export interface CrisisDetectionResult {
  flagged: boolean;
  detectedPhrases: string[];
}

const HARMFUL_KEYWORDS = [
  'kill myself', 'shoot myself', 'end myself', 'take my life', 'end my life',
  'commit suicide', 'suicide', 'want to die', 'better off dead', 'no reason to live',
  "can't go on", 'give up', 'end it all', 'hurt myself', 'hurting myself',
  'cut myself', 'cutting myself', 'self harm', 'self-harm', 'harm myself',
  'poison myself', 'overdose', 'over dose', 'take pills', 'swallow pills', 'hang myself',
  'kill someone', 'hurt someone', 'harm someone', 'cut someone', 'attack someone',
  'hurt them', 'kill them', 'harm them', 'poison someone', 'hurt people',
  'kill people', 'harm people', 'shoot someone', 'kill my pet', 'kill my dog', 'kill my cat',
  'assault', 'angry enough to', 'want to hurt', 'want to kill',
  'hopeless', 'helpless', 'worthless', 'useless', 'no point', 'pointless',
  'meaningless', "don't matter", 'no one cares', 'isolated', 'no way out', 'no escape',
];

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

export function detectCrisisContent(transcript: string): CrisisDetectionResult {
  if (!transcript || transcript.trim() === '') {
    return { flagged: false, detectedPhrases: [] };
  }

  const lower = transcript.toLowerCase();
  const detectedPhrases: string[] = [];

  for (const keyword of HARMFUL_KEYWORDS) {
    if (lower.includes(keyword.toLowerCase())) {
      detectedPhrases.push(keyword);
    }
  }

  return {
    flagged: detectedPhrases.length > 0,
    detectedPhrases: [...new Set(detectedPhrases)],
  };
}
