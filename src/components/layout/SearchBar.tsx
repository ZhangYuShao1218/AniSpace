import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxWidth?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder, value, onChange, maxWidth = '400px' }) => {
  const [localValue, setLocalValue] = useState(value);
  const isComposing = useRef(false);
  const lastSentValue = useRef(value);

  // 1. 從外部傳來新值時，只有在「非組字狀態」且「確定不是我們自己送出的回音」時才同步到本地
  useEffect(() => {
    if (!isComposing.current && value !== localValue) {
      if (value !== lastSentValue.current) {
        // 這是真正的外部變更（例如點擊其他地方的清空按鈕）
        setLocalValue(value);
        lastSentValue.current = value;
      }
    }
  }, [value, localValue]);

  // 2. Debounce 機制：當使用者打字後 300ms，且不在組字狀態時，才送出 onChange 改變 URL
  useEffect(() => {
    const handler = setTimeout(() => {
      if (!isComposing.current && localValue !== value) {
        lastSentValue.current = localValue;
        onChange(localValue);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localValue, value, onChange]);

  return (
    <div className="search-box" style={{ flex: '1', maxWidth, position: 'relative', padding: '0', background: 'transparent', border: 'none' }}>
      <Search 
        size={20} 
        className="search-icon" 
        style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} 
      />
      <input 
        type="text" 
        placeholder={placeholder}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onCompositionStart={() => { isComposing.current = true; }}
        onCompositionEnd={(e) => { 
          isComposing.current = false; 
          const finalVal = e.currentTarget.value;
          setLocalValue(finalVal);
          // 確保選字完畢後立刻送出搜尋
          if (finalVal !== value) {
            lastSentValue.current = finalVal;
            onChange(finalVal);
          }
        }}
        className="search-input glass-panel"
        style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
      />
    </div>
  );
};

export default SearchBar;
