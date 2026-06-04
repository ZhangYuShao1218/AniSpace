import React, { useState } from 'react';
import { Plus, X, Image as ImageIcon, Minus } from 'lucide-react';
import { useAnime } from '../contexts/AnimeContext';
import { useLanguage } from '../contexts/LanguageContext';
import './AddAnimeModal.css';

interface AddAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddAnimeModal: React.FC<AddAnimeModalProps> = ({ isOpen, onClose }) => {
  const { handleAddCustomAnime, handlePlanToWatchToggle } = useAnime();
  const { t, language } = useLanguage();
  
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 2010; y--) {
    yearOptions.push(y.toString());
  }
  yearOptions.push('~ 2009');
  
  const [titleZh, setTitleZh] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedSeason, setSelectedSeason] = useState('春');
  const [coverImage, setCoverImage] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [genres, setGenres] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleAddGenre = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    const newGenre = genreInput.trim();
    if (newGenre && !genres.includes(newGenre)) {
      setGenres([...genres, newGenre]);
    }
    setGenreInput('');
  };

  const handleGenreKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddGenre(e);
    }
  };

  const handleRemoveGenre = (genreToRemove: string) => {
    setGenres(genres.filter(g => g !== genreToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleZh.trim()) {
      alert(t('nameRequiredAlert'));
      return;
    }

    const seasonLabel = {
      '春': t('seasonSpring'),
      '夏': t('seasonSummer'),
      '秋': t('seasonAutumn'),
      '冬': t('seasonWinter')
    }[selectedSeason] || selectedSeason;

    const yearLabel = language === 'en' ? selectedYear : `${selectedYear} 年`;
    const yearSeason = selectedYear === '~ 2009' ? '~ 2009' : `${yearLabel} ${seasonLabel}`;

    const newAnime = {
      id: `custom_${Date.now()}`,
      titleZh: titleZh.trim(),
      yearSeason: yearSeason,
      coverImage: coverImage.trim() || 'https://via.placeholder.com/225x318?text=No+Image',
      genres: genres.length > 0 ? genres : []
    };

    handleAddCustomAnime(newAnime);
    
    const confirmMsg = t('addCustomSuccess').replace('{title}', newAnime.titleZh);
    if(window.confirm(confirmMsg)) {
        handlePlanToWatchToggle(newAnime);
    }
    
    // reset form
    setTitleZh('');
    setSelectedYear(currentYear.toString());
    setSelectedSeason('春');
    setCoverImage('');
    setGenres([]);
    setGenreInput('');
    onClose();
  };

  return (
    <div className="add-anime-modal-overlay" onClick={onClose}>
      <div className="add-anime-modal glass-panel" onClick={e => e.stopPropagation()}>
        <div className="add-anime-header">
          <h2>{t('addAnimeTitle')}</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className="add-anime-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>{t('animeNameLabel')}</label>
            <input
              type="text"
              required
              placeholder={t('animeNamePlaceholder')}
              value={titleZh}
              onChange={e => setTitleZh(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>{t('yearLabel')}</label>
            <div className="year-season-group">
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(e.target.value)}
              >
                {yearOptions.map(year => {
                  const label = year === '~ 2009' ? '~ 2009' : (language === 'en' ? year : `${year} 年`);
                  return <option key={year} value={year}>{label}</option>;
                })}
              </select>
              <select 
                value={selectedSeason} 
                onChange={e => setSelectedSeason(e.target.value)}
              >
                <option value="春">{t('seasonSpring')}</option>
                <option value="夏">{t('seasonSummer')}</option>
                <option value="秋">{t('seasonAutumn')}</option>
                <option value="冬">{t('seasonWinter')}</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>{t('coverUrl')}</label>
            <div className="input-with-icon">
              <ImageIcon size={18} />
              <input
                type="url"
                placeholder="https://..."
                value={coverImage}
                onChange={e => setCoverImage(e.target.value)}
              />
            </div>
            {coverImage && (
                <div className="image-preview">
                    <img src={coverImage} alt={t('preview')} onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
            )}
          </div>

          <div className="form-group">
            <label>{t('genreLabel')}</label>
            <div className="genre-input-group">
              <input
                type="text"
                placeholder={t('genreInputPlaceholder')}
                value={genreInput}
                onChange={e => setGenreInput(e.target.value)}
                onKeyDown={handleGenreKeyDown}
              />
              <button 
                type="button" 
                className="add-genre-btn" 
                onClick={handleAddGenre}
                disabled={!genreInput.trim()}
              >
                <Plus size={20} />
              </button>
            </div>
            {genres.length > 0 && (
              <div className="genres-list">
                {genres.map(g => (
                  <div key={g} className="genre-tag-item">
                    <span>{g}</span>
                    <button 
                      type="button" 
                      className="remove-genre-btn" 
                      onClick={() => handleRemoveGenre(g)}
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button type="submit" className="submit-btn btn-glass">
            <Plus size={18} />
            {t('addToDatabase')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAnimeModal;
