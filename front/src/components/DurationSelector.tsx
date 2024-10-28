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
  <div style={{ display: 'flex', gap: '10px' }}>
    {options.map((duration) => (
      <button
        key={duration}
        onClick={() => onChange(duration)}
        style={{
          padding: '8px 16px',
          borderRadius: '20px',
          border: 'none',
          background: selected === duration ? '#8884d8' : '#e0e0e0',
          color: selected === duration ? 'white' : 'black',
          cursor: 'pointer',
        }}
      >
        {humanReadableDurations[duration]}
      </button>
    ))}
  </div>
);
