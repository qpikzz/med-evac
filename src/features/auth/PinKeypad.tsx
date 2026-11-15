import { Delete } from "lucide-react";

const KEYPAD_DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

interface PinKeypadProps {
  disabled?: boolean;
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear: () => void;
}

export function PinKeypad({
  disabled = false,
  onDigit,
  onBackspace,
  onClear,
}: PinKeypadProps) {
  return (
    <div className="pin-keypad" aria-label="PIN keypad">
      {KEYPAD_DIGITS.map((digit) => (
        <button
          className="pin-key"
          type="button"
          key={digit}
          disabled={disabled}
          onClick={() => onDigit(digit)}
        >
          {digit}
        </button>
      ))}
      <button
        className="pin-key pin-key-utility"
        type="button"
        disabled={disabled}
        onClick={onClear}
      >
        Clear
      </button>
      <button
        className="pin-key"
        type="button"
        disabled={disabled}
        onClick={() => onDigit("0")}
      >
        0
      </button>
      <button
        className="pin-key pin-key-utility"
        type="button"
        aria-label="Backspace"
        disabled={disabled}
        onClick={onBackspace}
      >
        <Delete size={18} aria-hidden="true" />
        <span className="visually-hidden">Backspace</span>
      </button>
    </div>
  );
}
