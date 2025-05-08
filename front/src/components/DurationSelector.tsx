import { humanReadableDurations, Duration } from '../types/duration';

interface DurationSelectorProps {
  className: string;
  options: Duration[];
  selected: Duration;
  onChange: (value: Duration) => void;
}

export const DurationSelector = ({
  className,
  options,
  selected,
  onChange
}: DurationSelectorProps) => (
  <div className={[className, 'flex-wrap', 'gap-n', 'button-multipill'].join(' ')}>
    {options.map((duration) => (
      <button
        key={duration}
        onClick={() => onChange(duration)}
        className={selected === duration ? 'active' : 'inactive'}
      >
        {humanReadableDurations[duration]}
      </button>
    ))}
  </div>
);
