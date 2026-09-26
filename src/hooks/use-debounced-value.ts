import { useEffect, useState } from "react";

/** Holds a value back until it stops changing, so a read is not fired per keystroke. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delayMs);

    return () => clearTimeout(handler);
  }, [value, delayMs]);

  return debounced;
}
