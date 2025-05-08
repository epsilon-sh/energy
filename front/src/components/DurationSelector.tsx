import { humanReadableDurations, Duration } from '../types/duration';

interface DurationSelectorProps {
  options: Duration[];
  selected: Duration;
  onChange: (value: Duration) => void;
}

export const DurationSelector = ({
  options,
  selected,
  onChange,
}: DurationSelectorProps): JSX.Element => (
  <div className="flex-wrap">
    {options.map((duration) => (
      <button
        className="multipill"
        disabled={selected === duration}
        key={duration}
        onClick={() => onChange(duration)}
      >
        {humanReadableDurations[duration]}
      </button>
    ))}
  </div>
);
