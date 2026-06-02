export const seasonWeight: Record<string, number> = { '秋': 4, '夏': 3, '春': 2, '冬': 1 };

export const parseSeason = (ys: string) => {
  if (!ys) return 0;
  const parts = ys.split(' ');
  const year = parseInt(parts[0]) || 0;
  const seasonValue = seasonWeight[parts[1]] || 0;
  return year * 10 + seasonValue;
};

// Chronological order within a single year: Winter (Q1) -> Spring (Q2) -> Summer (Q3) -> Fall (Q4)
const SEASONS_ZH = ['冬', '春', '夏', '秋'];
const SEASONS_ENG = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];

function getAdjustedSeasonIndex(date: Date) {
  const month = date.getMonth();
  // 0 (Jan-Mar) = Winter, 1 (Apr-Jun) = Spring, 2 (Jul-Sep) = Summer, 3 (Oct-Dec) = Fall
  return Math.floor(month / 3);
}

export function getSeasonInfo(offset: number = 0) {
  const date = new Date();
  let finalYear = date.getFullYear();
  let finalIndex = getAdjustedSeasonIndex(date) + offset;
  
  while (finalIndex < 0) {
    finalIndex += 4;
    finalYear--;
  }
  while (finalIndex > 3) {
    finalIndex -= 4;
    finalYear++;
  }

  return {
    year: finalYear,
    seasonZh: SEASONS_ZH[finalIndex],
    seasonEng: SEASONS_ENG[finalIndex]
  };
}

export function getCurrentSeasonInfo() {
  return getSeasonInfo(0);
}

export function getRelativeSeasonString(offset: number) {
  const date = new Date();
  let year = date.getFullYear();
  let newIndex = getAdjustedSeasonIndex(date) + offset;
  
  while (newIndex > 3) { newIndex -= 4; year++; }
  while (newIndex < 0) { newIndex += 4; year--; }
  
  return `${year} ${SEASONS_ZH[newIndex]}`;
}
