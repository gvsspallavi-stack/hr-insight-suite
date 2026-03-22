import * as React from "react";
import { Input } from "@/components/ui/input";

const DateInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ onChange, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // If year part exceeds 4 digits, truncate it
    if (val) {
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
      max="9999-12-31"
      {...props}
    />
  );
});
DateInput.displayName = "DateInput";

export { DateInput };
