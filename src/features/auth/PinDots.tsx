import { PIN_LENGTH } from "./constants";

interface PinDotsProps {
  value: string;
}

export function PinDots({ value }: PinDotsProps) {
  return (
    <div className="pin-dots" aria-label={`PIN entry, ${value.length} of ${PIN_LENGTH} digits`}>
      {Array.from({ length: PIN_LENGTH }).map((_, index) => (
        <span
          className={`pin-dot${index < value.length ? " is-filled" : ""}`}
          key={index}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
