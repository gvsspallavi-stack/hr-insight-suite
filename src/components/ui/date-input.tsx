import * as React from "react";
import { cn } from "@/lib/utils";

const DateInput = React.forwardRef<
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

  const handleInput = React.useCallback((e: Event) => {
    const input = e.target as HTMLInputElement;
    const val = input.value;
    if (val && val.length > 10) {
      const parts = val.split('-');
      if (parts[0] && parts[0].length > 4) {
        parts[0] = parts[0].slice(0, 4);
        input.value = parts.join('-');
      }
    }
  }, []);

  React.useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    el.addEventListener('input', handleInput);
    return () => el.removeEventListener('input', handleInput);
  }, [handleInput]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
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
    <input
      type="date"
      ref={setRefs}
      onChange={handleChange}
      max="9999-12-31"
      className={cn(
        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        className,
      )}
      {...props}
    />
  );
});
DateInput.displayName = "DateInput";

export { DateInput };
