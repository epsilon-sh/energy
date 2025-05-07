import { humanReadableDurations, Duration } from '../types/duration';

interface DurationSelectorProps {
  options: Duration[];
  selected: Duration;
  onChange: (value: Duration) => void;
}

export const DurationSelector = ({
  options,
  selected,
  onChange
}: DurationSelectorProps) => (
  <div className='flex-wrap gap-s space-between'>
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
