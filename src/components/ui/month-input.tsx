import * as React from "react";
import { cn } from "@/lib/utils";

const MonthInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ onChange, className, ...props }, ref) => {
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

  const handleInput = React.useCallback((e: Event) => {
    const input = e.target as HTMLInputElement;
    const truncated = truncateYear(input.value);
    if (truncated !== input.value) {
      input.value = truncated;
    }
  }, []);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [handleInput]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const truncated = truncateYear(e.target.value);
    if (truncated !== e.target.value) {
      e.target.value = truncated;
    }
    onChange?.(e);
  };

  return (
    <input
      type="month"
      ref={setRefs}
      onChange={handleChange}
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
