interface Props {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  disabled?: boolean;
  label: string;
}

export function Stepper({ value, min, max, onChange, disabled, label }: Props) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={disabled || value <= min}
        aria-label="Menos"
      >
        −
      </button>
      <b className="num" aria-live="polite">
        {value}
      </b>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={disabled || value >= max}
        aria-label="Mais"
      >
        +
      </button>
      <small>máx. {max}</small>
    </div>
  );
}
