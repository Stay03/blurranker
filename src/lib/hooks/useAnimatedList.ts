'use client';

import { useRef, useEffect, useCallback } from 'react';

/**
 * Hook to track which items in a list are newly added
 * Returns a function to check if an item should be animated
 */
export function useAnimatedList<T>(
  items: T[],
  getKey: (item: T) => string
): (item: T) => boolean {
  const previousKeysRef = useRef<Set<string>>(new Set());
  const newKeysRef = useRef<Set<string>>(new Set());
  const isFirstRender = useRef(true);

  useEffect(() => {
    const currentKeys = new Set(items.map(getKey));

    if (isFirstRender.current) {
      // On first render, don't animate anything - just record the keys
      previousKeysRef.current = currentKeys;
      newKeysRef.current = new Set();
      isFirstRender.current = false;
      return;
    }

    // Find new items (keys that weren't in the previous set)
    const newKeys = new Set<string>();
    for (const key of currentKeys) {
      if (!previousKeysRef.current.has(key)) {
        newKeys.add(key);
      }
    }

    newKeysRef.current = newKeys;
    previousKeysRef.current = currentKeys;

    // Clear new keys after animation completes
    if (newKeys.size > 0) {
      const timer = setTimeout(() => {
        newKeysRef.current = new Set();
      }, 500); // Animation duration + buffer
      return () => clearTimeout(timer);
    }
  }, [items, getKey]);

  const isNewItem = useCallback(
    (item: T): boolean => {
      return newKeysRef.current.has(getKey(item));
    },
    [getKey]
  );

  return isNewItem;
}
