import { HelpCircle, Video, BarChart2, Share2, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import Header from '../components/layout/Header';

interface FaqItem {
  q: string;
  a: string;
}

const sections = [
  {
    icon: Video,
    title: 'Recording & Videos',
    color: 'bg-blue-50 text-blue-600',
    faqs: [
      {
        q: 'How do I record a video?',
        a: 'Tap "Record Video" on the Home page. Grant camera and microphone permissions when prompted. Press the red button to start recording, and press it again to stop. You can then save or discard the recording.',
      },
      {
        q: 'Can I upload an existing video?',
        a: 'Yes. On the Record page, scroll down to find the "Upload a video file" section. Select a video file from your computer.',
      },
      {
        q: 'How do I transcribe a video?',
        a: 'Open any video from Manage Videos, then tap "Transcribe Video" in the transcript section. Transcription uses AI speech recognition and may take a minute. A progress bar shows each stage.',
      },
      {
        q: 'What annotations can I add?',
        a: 'Open a video and use the 5 tabs: Keywords (symptom tags), Locations (where you feel symptoms), Emotions (how you feel), Pain Scale (severity), and Comments (free text notes).',
      },
    ] as FaqItem[],
  },
  {
    icon: BarChart2,
    title: 'Data Analysis',
    color: 'bg-green-50 text-green-600',
    faqs: [
      {
        q: 'What is a Video Set?',
        a: 'A Video Set is a group of related videos you want to analyze together — for example, videos from the past month. Create sets in Video Sets, then run analysis on the set.',
      },
      {
        q: 'What does the Bar Graph show?',
        a: 'The bar graph shows how frequently each word or symptom appears across all videos in a set. Use the frequency slider to filter out uncommon words. Click any bar to see how that word trends over time.',
      },
      {
        q: 'What does the Line Graph show?',
        a: 'The line graph tracks how often a specific word appears across each individual video recording over time. Each data point is one video.',
      },
      {
        q: 'How is sentiment calculated?',
        a: 'Sentiment is calculated by combining: the GPT-4o AI analysis of your transcripts, your emotion sticker selections (weighted), and your pain scale entries (weighted). These are blended into an overall sentiment score from Very Negative to Very Positive.',
      },
      {
        q: 'What is the AI Text Report?',
        a: 'When you enable AI Text Reports and click Generate, the app sends your transcripts to GPT-4o which creates bullet-point summaries and an overall summary sentence. Each bullet is also given an individual sentiment score.',
      },
    ] as FaqItem[],
  },
  {
    icon: Share2,
    title: 'Sharing',
    color: 'bg-purple-50 text-purple-600',
    faqs: [
      {
        q: 'How do I share data with my doctor?',
        a: 'Go to the Sharing page and add your care team member as a Contact. Sharing records track who you have shared data with and what permissions were granted.',
      },
      {
        q: 'Can I revoke access?',
        a: 'Yes. On the Sharing page, expand any share record and tap "Deactivate" to disable access without deleting the record.',
      },
    ] as FaqItem[],
  },
  {
    icon: AlertTriangle,
    title: 'Crisis & Safety',
    color: 'bg-red-50 text-red-600',
    faqs: [
      {
        q: 'What happens if I mention self-harm?',
        a: 'The app automatically scans transcripts for crisis keywords. If detected, a crisis support alert will appear with Canadian mental health resources and crisis line numbers. Your data is not automatically shared with anyone.',
      },
      {
        q: 'Crisis Resources',
        a: 'Crisis Services Canada: 1-833-456-4566 (24/7)\nSuicide Prevention Lifeline: 1-800-273-8255\nKids Help Phone: 1-800-668-6868\nText HOME to 741741 (Crisis Text Line)',
      },
    ] as FaqItem[],
  },
];

function FaqAccordion({ faq }: { faq: FaqItem }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start justify-between gap-3 py-3 text-left"
      >
        <span className="text-sm font-medium text-gray-800">{faq.q}</span>
        {open ? <ChevronUp size={16} className="text-gray-400 shrink-0 mt-0.5" /> : <ChevronDown size={16} className="text-gray-400 shrink-0 mt-0.5" />}
      </button>
      {open && (
        <p className="text-sm text-gray-600 pb-3 leading-relaxed whitespace-pre-line">{faq.a}</p>
      )}
    </div>
  );
}

export default function HelpPage() {
  return (
    <div className="flex flex-col h-full">
      <Header title="Help" subtitle="Frequently asked questions" />

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="card bg-mhmr-olive/5 border border-mhmr-olive/20">
          <div className="flex items-center gap-3">
            <HelpCircle size={24} className="text-mhmr-olive shrink-0" />
            <div>
              <p className="font-semibold text-gray-800 text-sm">MyMissionMyRecord</p>
              <p className="text-xs text-gray-500 mt-0.5">
                A personal health journaling app for tracking symptoms, emotions, and wellbeing over time.
              </p>
            </div>
          </div>
        </div>

        {sections.map(({ icon: Icon, title, color, faqs }) => (
          <div key={title} className="card">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <h2 className="font-semibold text-gray-800">{title}</h2>
            </div>
            {faqs.map(faq => (
              <FaqAccordion key={faq.q} faq={faq} />
            ))}
          </div>
        ))}

        <div className="card text-center py-6">
          <p className="text-sm text-gray-500">
            This app is intended to help you track your health journey.
            It is not a substitute for professional medical advice.
          </p>
          <p className="text-xs text-gray-400 mt-2">MyMissionMyRecord v1.0</p>
        </div>
      </div>
    </div>
  );
}
