import * as React from "react";
import { Input } from "@/components/ui/input";

const DateInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ onChange, onKeyDown, ...props }, ref) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const val = input.value;

    // Block numeric keys when year already has 4 digits
    // Date format: YYYY-MM-DD — year is chars 0-3
    if (/^[0-9]$/.test(e.key) && val.length >= 10) {
      // If cursor is in the year section (0-4) and year is full, block
      const pos = input.selectionStart ?? 0;
      if (pos <= 4 && val.slice(0, 4).length === 4 && input.selectionStart === input.selectionEnd) {
        e.preventDefault();
        return;
      }
    }

    onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Extra safety: if year part exceeds 4 digits, truncate
    if (val && val.length > 10) {
      const parts = val.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
        e.target.value = parts.join('-');
      }
    }
    onChange?.(e);
  };

  return (
    <Input
      type="date"
      ref={ref}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      {...props}
    />
  );
});
DateInput.displayName = "DateInput";

export { DateInput };
