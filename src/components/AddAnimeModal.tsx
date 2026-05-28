import React, { useState } from 'react';
import { Plus, X, Image as ImageIcon, Minus } from 'lucide-react';
import { useAnime } from '../contexts/AnimeContext';
import './AddAnimeModal.css';

interface AddAnimeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddAnimeModal: React.FC<AddAnimeModalProps> = ({ isOpen, onClose }) => {
  const { handleAddCustomAnime, handlePlanToWatchToggle } = useAnime();
  
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear; y >= 2010; y--) {
    yearOptions.push(y.toString());
  }
  yearOptions.push('~ 2009');
  
  const seasonOptions = ['春', '夏', '秋', '冬'];

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
      alert('名稱為必填欄位');
      return;
    }

    const yearSeason = `${selectedYear} ${selectedSeason}`;

    const newAnime = {
      id: `custom_${Date.now()}`,
      titleZh: titleZh.trim(),
      yearSeason: yearSeason,
      coverImage: coverImage.trim() || 'https://via.placeholder.com/225x318?text=No+Image',
      genres: genres.length > 0 ? genres : []
    };

    handleAddCustomAnime(newAnime);
    
    if(window.confirm(`已成功新增「${newAnime.titleZh}」至資料庫！\n是否直接將它加入您的「待看清單」？`)) {
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
          <h2>新增動畫</h2>
          <button className="close-button" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <form className="add-anime-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>動畫名稱 *</label>
            <input
              type="text"
              required
              placeholder="例如: 葬送的芙莉蓮"
              value={titleZh}
              onChange={e => setTitleZh(e.target.value)}
            />
          </div>
          
          <div className="form-group">
            <label>年份 *</label>
            <div className="year-season-group">
              <select 
                value={selectedYear} 
                onChange={e => setSelectedYear(e.target.value)}
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year === '~ 2009' ? '~ 2009 年' : `${year} 年`}</option>
                ))}
              </select>
              <select 
                value={selectedSeason} 
                onChange={e => setSelectedSeason(e.target.value)}
              >
                {seasonOptions.map(season => (
                  <option key={season} value={season}>{season}季</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>封面圖片網址</label>
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
                    <img src={coverImage} alt="預覽" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
            )}
          </div>

          <div className="form-group">
            <label>分類標籤</label>
            <div className="genre-input-group">
              <input
                type="text"
                placeholder="輸入標籤名稱..."
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
            新增至資料庫
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAnimeModal;
