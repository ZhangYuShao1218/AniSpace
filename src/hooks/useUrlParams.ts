import { useSearchParams } from 'react-router-dom';
import { useMemo, useCallback } from 'react';

export function useUrlParams<T>(
  key: string,
  defaultValue: T,
  serialize?: (val: T) => string,
  deserialize?: (val: string) => T
): [T, (val: T) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const value = useMemo(() => {
    const param = searchParams.get(key);
    if (param === null) return defaultValue;
    if (deserialize) return deserialize(param);
    
    // Default fallback handling based on defaultValue type
    if (typeof defaultValue === 'number') return Number(param) as unknown as T;
    if (typeof defaultValue === 'boolean') return (param === 'true') as unknown as T;
    return param as unknown as T;
  }, [searchParams, key, defaultValue, deserialize]);

  const setValue = useCallback((newValue: T) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const strVal = serialize ? serialize(newValue) : String(newValue);
      
      const isDefault = Array.isArray(defaultValue) 
        ? JSON.stringify(newValue) === JSON.stringify(defaultValue)
        : newValue === defaultValue;

      if (strVal === '' || isDefault || (Array.isArray(newValue) && newValue.length === 0)) {
         next.delete(key);
      } else {
         next.set(key, strVal);
      }
      return next;
    }, { replace: true }); // 使用 replace 避免產生過多歷史紀錄
  }, [setSearchParams, key, serialize, defaultValue]);

  return [value, setValue];
}
