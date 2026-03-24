import * as React from "react";
import { cn } from "@/lib/utils";

const MonthInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ onChange, onBlur, className, ...props }, ref) => {
  const innerRef = React.useRef<HTMLInputElement | null>(null);

  const setRefs = React.useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
    },
    [ref]
  );

  const truncateYear = (val: string) => {
    if (!val) return val;
    const parts = val.split('-');
    if (parts[0] && parts[0].length > 4) {
      parts[0] = parts[0].slice(0, 4);
      return parts.join('-');
    }
    return val;
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const truncated = truncateYear(e.target.value);
    if (truncated !== e.target.value) {
      e.target.value = truncated;
      onChange?.(e as unknown as React.ChangeEvent<HTMLInputElement>);
    }
    onBlur?.(e);
  };

  return (
    <input
      type="month"
      ref={setRefs}
      onChange={onChange}
      onBlur={handleBlur}
      max="9999-12"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
});
MonthInput.displayName = "MonthInput";

export { MonthInput };
