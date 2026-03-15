import { useSearchParams, useLocation } from 'react-router-dom';
import { useCallback, useMemo } from 'react';

/**
 * Like useState, but persists to URL search params so back navigation restores state.
 */
export function useSearchParamState(
  key: string,
  defaultValue: string
): [string, (value: string) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = searchParams.get(key) ?? defaultValue;

  const setValue = useCallback(
    (newValue: string) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (newValue === defaultValue) {
            next.delete(key);
          } else {
            next.set(key, newValue);
          }
          return next;
        },
        { replace: true }
      );
    },
    [key, defaultValue, setSearchParams]
  );

  return [value, setValue];
}

/**
 * Persist a YearMonthFilterValue ({year, month}) in URL params.
 */
export function useSearchParamYearMonth(
  keyPrefix: string
): [{ year: number | null; month: number | null }, (v: { year: number | null; month: number | null }) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    const y = searchParams.get(`${keyPrefix}_y`);
    const m = searchParams.get(`${keyPrefix}_m`);
    return {
      year: y ? parseInt(y, 10) : null,
      month: m ? parseInt(m, 10) : null,
    };
  }, [searchParams, keyPrefix]);

  const setValue = useCallback(
    (v: { year: number | null; month: number | null }) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (v.year != null) next.set(`${keyPrefix}_y`, v.year.toString());
          else next.delete(`${keyPrefix}_y`);
          if (v.month != null) next.set(`${keyPrefix}_m`, v.month.toString());
          else next.delete(`${keyPrefix}_m`);
          return next;
        },
        { replace: true }
      );
    },
    [keyPrefix, setSearchParams]
  );

  return [value, setValue];
}
