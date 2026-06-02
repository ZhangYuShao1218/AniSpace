import React from 'react';
import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  maxWidth?: string;
}

const SearchBar: React.FC<SearchBarProps> = ({ placeholder, value, onChange, maxWidth = '400px' }) => {
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="search-input glass-panel"
        style={{ width: '100%', paddingLeft: '40px', boxSizing: 'border-box' }}
      />
    </div>
  );
};

export default SearchBar;
