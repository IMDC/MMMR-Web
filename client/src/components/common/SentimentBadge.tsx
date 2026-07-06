import { SentimentType } from '../../types';

const sentimentConfig: Record<string, { label: string; className: string }> = {
  'Very Positive': { label: 'Very Positive', className: 'sentiment-badge sentiment-very-positive' },
  'Positive': { label: 'Positive', className: 'sentiment-badge sentiment-positive' },
  'Neutral': { label: 'Neutral', className: 'sentiment-badge sentiment-neutral' },
  'Negative': { label: 'Negative', className: 'sentiment-badge sentiment-negative' },
  'Very Negative': { label: 'Very Negative', className: 'sentiment-badge sentiment-very-negative' },
};

interface Props {
  sentiment: string;
  size?: 'sm' | 'md';
}

export default function SentimentBadge({ sentiment, size = 'sm' }: Props) {
  const config = sentimentConfig[sentiment];
  if (!config) return null;

  return (
    <span className={`${config.className} ${size === 'md' ? 'text-sm px-3 py-1' : ''}`}>
      {config.label}
    </span>
  );
}
