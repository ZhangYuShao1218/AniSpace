import { useState, useMemo } from 'react';
import type { SortOption } from '../types';
import FilterBar from '../components/FilterBar';
import AnimeListLayout from '../components/AnimeListLayout';
import { useAnime } from '../contexts/AnimeContext';
import { NSFW_GENRES } from '../utils/constants';
import { parseSeason, getRelativeSeasonString } from '../utils/season';

const AllAnimePage = () => {
  const { allAnime } = useAnime();

  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('date_desc');

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    allAnime.forEach(a => {
      const yearMatch = a.yearSeason.match(/\d+/);
      if (yearMatch && parseInt(yearMatch[0], 10) <= 2009) {
        // Skip adding specific years 2009 and older because they will fall under the ~ 2009 category
      } else {
        years.add(a.yearSeason);
      }
    });
    return Array.from(years).sort((a, b) => parseSeason(b) - parseSeason(a));
  }, [allAnime]);

  const availableGenres = useMemo(() => {
    const genres = new Set<string>();
    allAnime.forEach(a => {
      a.genres.forEach(g => {
        if (!NSFW_GENRES.includes(g)) genres.add(g);
      });
    });
    return Array.from(genres).sort();
  }, [allAnime]);

  const filteredData = useMemo(() => {
    const nextSeason = getRelativeSeasonString(1);

    let result = allAnime.filter(anime => {
      // Hide next season anime by default UNLESS explicitly selected
      if (selectedYear !== nextSeason && anime.yearSeason === nextSeason) {
        return false;
      }

      let matchYear = true;
      if (selectedYear) {
        if (selectedYear === '~ 2009') {
          const yearMatch = anime.yearSeason.match(/\d+/);
          matchYear = yearMatch ? parseInt(yearMatch[0], 10) <= 2009 : false;
        } else {
          matchYear = anime.yearSeason === selectedYear;
        }
      }
      const matchGenre = selectedGenres.length === 0 ? true : selectedGenres.some(sg => {
        if (sg === '福利') return anime.genres.includes('福利') || anime.genres.includes('Hentai') || anime.genres.includes('Ecchi') || anime.genres.includes('紳士');
        return anime.genres.includes(sg);
      });
      const matchSearch = searchQuery ? anime.titleZh.toLowerCase().includes(searchQuery.toLowerCase()) : true;
      return matchYear && matchGenre && matchSearch;
    });

    result = [...result].sort((a, b) => {
      if (sortBy === 'date_desc') return parseSeason(b.yearSeason) - parseSeason(a.yearSeason);
      if (sortBy === 'date_asc') return parseSeason(a.yearSeason) - parseSeason(b.yearSeason);
      return 0;
    });

    return result;
  }, [allAnime, selectedYear, selectedGenres, searchQuery, sortBy]);

  const topBarContent = (
    <FilterBar
      years={availableYears}
      genres={availableGenres}
      selectedYear={selectedYear}
      selectedGenres={selectedGenres}
      searchQuery={searchQuery}
      sortBy={sortBy}
      onYearChange={setSelectedYear}
      onGenreChange={setSelectedGenres}
      onSearchChange={setSearchQuery}
      onSortChange={(s) => setSortBy(s as SortOption)}
    />
  );

  return (
    <AnimeListLayout
      title="所有動畫"
      totalCount={filteredData.length}
      filteredData={filteredData}
      topBarContent={topBarContent}
      emptyStateTitle="沒有找到符合的動畫"
      emptyStateMessage="請嘗試其他搜尋關鍵字或調整過濾條件。"
      shareData={[]} // No share logic heavily utilized here, just empty
      isWatchedShare={false}
    />
  );
};

export default AllAnimePage;
