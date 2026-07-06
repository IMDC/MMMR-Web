interface Props {
  progress: number;  // 0–100
  message?: string;
  showPercent?: boolean;
}

export default function ProgressBar({ progress, message, showPercent = true }: Props) {
  return (
    <div className="w-full">
      {(message || showPercent) && (
        <div className="flex justify-between items-center mb-1">
          {message && <span className="text-sm text-gray-600">{message}</span>}
          {showPercent && <span className="text-sm font-medium text-mhmr-olive">{Math.round(progress)}%</span>}
        </div>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
