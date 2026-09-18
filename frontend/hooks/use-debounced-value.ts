'use client';

import { useEffect, useState } from 'react';

/**
 * Trails `value` by `delay` ms. Used to keep the live chart preview from
 * re-tweening on every keystroke across the 72 scenario inputs.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
