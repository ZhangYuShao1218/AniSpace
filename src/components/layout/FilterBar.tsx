import React, { useState } from 'react';
import '@/components/layout/FilterBar.css';
import { Search, SlidersHorizontal, ArrowDownAZ, Plus } from 'lucide-react';
import { getRelativeSeasonString } from '@/utils/season';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAdMob } from '@/contexts/AdMobContext';
import AddAnimeModal from '@/components/modals/AddAnimeModal';


interface FilterBarProps {
  years: string[];
  genres: string[];
  selectedYear: string;
  selectedGenres: string[];
  searchQuery: string;
  sortBy: string;
  onSortChange: (sort: string) => void;
  onYearChange: (year: string) => void;
  onGenreChange: (genres: string[]) => void;
  onSearchChange: (search: string) => void;
}

const FilterBar: React.FC<FilterBarProps> = ({
  years,
  genres,
  selectedYear,
  selectedGenres,
  searchQuery,
  sortBy,
  onYearChange,
  onGenreChange,
  onSearchChange,
  onSortChange
}) => {
  const [isAddAnimeOpen, setIsAddAnimeOpen] = useState(false);
  const [isGenresModalOpen, setIsGenresModalOpen] = useState(false);
  const { t, tGenre, tYearSeason } = useLanguage();
  const { hideAd, showAd } = useAdMob();

  React.useEffect(() => {
    if (isAddAnimeOpen || isGenresModalOpen) {
      hideAd();
      return () => showAd();
    }
  }, [isAddAnimeOpen, isGenresModalOpen, hideAd, showAd]);

  const toggleGenre = (genre: string) => {
    if (selectedGenres.includes(genre)) {
      onGenreChange(selectedGenres.filter(g => g !== genre));
    } else {
      onGenreChange([...selectedGenres, genre]);
    }
  };

  const prevSeason = getRelativeSeasonString(-1);
  const currentSeason = getRelativeSeasonString(0);
  const nextSeason = getRelativeSeasonString(1);

  const handleYearSelect = (year: string) => {
    onYearChange(year);
  };

  const handleSeasonToggle = (target: string) => {
    if (selectedYear === target) {
      onYearChange(''); // Un-toggle
    } else {
      onYearChange(target);
    }
  };



  const [localSearch, setLocalSearch] = useState(searchQuery);
  const isComposing = React.useRef(false);
  const lastSentValue = React.useRef(searchQuery);

  React.useEffect(() => {
    if (!isComposing.current && searchQuery !== localSearch) {
      if (searchQuery !== lastSentValue.current) {
        setLocalSearch(searchQuery);
        lastSentValue.current = searchQuery;
      }
    }
  }, [searchQuery, localSearch]);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      if (!isComposing.current && localSearch !== searchQuery) {
        const trimmed = localSearch.trim();
        lastSentValue.current = trimmed;
        onSearchChange(trimmed);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, onSearchChange]);

  return (
    <div className="filter-bar-container">
      <div className="filter-section glass-panel fade-in">
        <div className="search-box">
          <Search size={20} className="search-icon" />
          <input 
            type="text" 
            placeholder={t('searchPlaceholder')} 
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onBlur={(e) => {
              const trimmed = e.target.value.trim();
              setLocalSearch(trimmed);
              if (trimmed !== searchQuery) {
                lastSentValue.current = trimmed;
                onSearchChange(trimmed);
              }
            }}
            onCompositionStart={() => { isComposing.current = true; }}
            onCompositionEnd={(e) => { 
              isComposing.current = false; 
              const finalVal = e.currentTarget.value;
              setLocalSearch(finalVal);
              const trimmedVal = finalVal.trim();
              if (trimmedVal !== searchQuery) {
                lastSentValue.current = trimmedVal;
                onSearchChange(trimmedVal);
              }
            }}
            className="search-input"
          />
          <button 
            className="online-search-trigger" 
            onClick={() => setIsAddAnimeOpen(true)}
            title={t('manualAddAnime')}
          >
            <Plus size={18} />
          </button>
        </div>
        
        <div className="filter-controls">
          <div className="filter-dropdowns-row">
            <div className="filter-group">
              <SlidersHorizontal size={18} className="filter-icon" />
              <select 
                value={years.includes(selectedYear) || selectedYear === '~ 2009' ? selectedYear : ""} 
                onChange={(e) => handleYearSelect(e.target.value)}
                className="filter-select"
              >
                <option value="">{t('allYears')}</option>
                {(() => {
                  const elements: React.JSX.Element[] = [];
                  let currentYear = '';
                  years.forEach((ys, index) => {
                    const y = ys.match(/\d+/)?.[0] || '';
                    if (currentYear !== '' && currentYear !== y) {
                      elements.push(<option key={`sep-${index}`} disabled>──────────</option>);
                    }
                    currentYear = y;
                    elements.push(<option key={ys} value={ys}>{tYearSeason(ys)}</option>);
                  });
                  return elements;
                })()}
                <option disabled>──────────</option>
                <option value="~ 2009">~ 2009</option>
                <option disabled>&nbsp;</option>
              </select>
            </div>

            <div className="quick-tabs">
              <button 
                className={`quick-tab ${selectedYear === prevSeason ? 'active' : ''}`} 
                onClick={() => handleSeasonToggle(prevSeason)}
              >
                {t('prevSeason')}
              </button>
              <button 
                className={`quick-tab ${selectedYear === currentSeason ? 'active' : ''}`} 
                onClick={() => handleSeasonToggle(currentSeason)}
              >
                {t('currentSeason')}
              </button>
              <button 
                className={`quick-tab ${selectedYear === nextSeason ? 'active' : ''}`} 
                onClick={() => handleSeasonToggle(nextSeason)}
              >
                {t('nextSeason')}
              </button>
              
              <button 
                className="quick-tab mobile-genres-btn"
                onClick={() => setIsGenresModalOpen(true)}
              >
                {t('genres')} {selectedGenres.length > 0 ? `(${selectedGenres.length})` : ''}
              </button>
            </div>

            <div className="filter-group right-aligned">
              <div className="vertical-divider" />
              <ArrowDownAZ size={18} className="filter-icon" />
              <select 
                value={sortBy} 
                onChange={(e) => onSortChange(e.target.value)}
                className="filter-select"
              >
                <option value="date_desc">{t('sortYearDesc')}</option>
                <option value="date_asc">{t('sortYearAsc')}</option>
                <option value="rating_desc">{t('sortRatingDesc')}</option>
                <option value="rating_asc">{t('sortRatingAsc')}</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div 
        className={`genres-modal-backdrop ${isGenresModalOpen ? 'show' : ''}`} 
        onClick={() => setIsGenresModalOpen(false)} 
      />

      <div className={`genres-section glass-panel ${isGenresModalOpen ? 'modal-open' : ''}`}>
        <div className="genres-header mobile-only">
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t('genres')}</span>
          <button onClick={() => setIsGenresModalOpen(false)} style={{ padding: '6px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', color: 'var(--text-primary)', border: '1px solid var(--border-glass)', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>完成</button>
        </div>
        <span className="genres-label desktop-only">{t('genres')}</span>
        <div className="genres-wrap">
          <button 
            className={`genre-tag ${selectedGenres.length === 0 ? 'active' : ''}`}
            onClick={() => onGenreChange([])}
          >
            {t('allGenres')}
          </button>
          {genres.map(genre => (
            <button
              key={genre}
              className={`genre-tag ${selectedGenres.includes(genre) ? 'active' : ''}`}
              onClick={() => toggleGenre(genre)}
            >
              {tGenre(genre)}
            </button>
          ))}
          <button
            className={`genre-tag nsfw ${selectedGenres.includes('福利') ? 'active' : ''}`}
            onClick={() => toggleGenre('福利')}
          >
            {t('genreEcchi')}
          </button>
        </div>
      </div>

      <AddAnimeModal 
        isOpen={isAddAnimeOpen} 
        onClose={() => setIsAddAnimeOpen(false)} 
      />
    </div>
  );
};

export default FilterBar;
