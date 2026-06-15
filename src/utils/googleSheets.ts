import Papa from 'papaparse';
import type { Anime, WatchedAnime } from '@/types';

export const exportToGoogleSheet = async (
  accessToken: string,
  animes: (Anime | WatchedAnime)[],
  isWatched: boolean
): Promise<string> => {
  // 1. Prepare CSV data
  const exportData = animes.map((item) => {
    const base = {
      封面: item.coverImage ? `=IMAGE("${item.coverImage}", 4, 150, 105)` : '',
      動畫名稱: item.titleZh,
      推出時間: item.yearSeason,
      分類: item.genres.join(', '),
    };
    
    if (isWatched) {
      const watched = item as WatchedAnime;
      return {
        ...base,
        使用者評分: watched.userRating,
        簡單評論: watched.userComment || '',
        觀看時間: new Date(watched.watchedDate).toLocaleDateString()
      };
    }
    
    return base;
  });

  const csvContent = Papa.unparse(exportData);
  // Add BOM for proper UTF-8 handling in case they download it later, though Drive converts it automatically
  const csvBlob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

  const dateObj = new Date();
  const today = `${dateObj.getFullYear()}${String(dateObj.getMonth() + 1).padStart(2, '0')}${String(dateObj.getDate()).padStart(2, '0')}`;
  
  // 2. Create an empty Google Sheet
  const metadata = {
    name: `AniSpace_${isWatched ? '動畫紀錄' : '期待動畫'}_${today}`,
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (!createRes.ok) {
    throw new Error('Failed to create spreadsheet');
  }

  const fileData = await createRes.json();
  const fileId = fileData.id;

  // 3. Try to use Google Sheets API to write data and set row heights
  const sheetsApiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${fileId}:batchUpdate`;
  
  const headers = Object.keys(exportData[0] || {});
  const rows = exportData.map(item => {
    return {
      values: Object.values(item).map(val => {
        if (typeof val === 'string' && val.startsWith('=')) {
          return { userEnteredValue: { formulaValue: val } };
        }
        return { userEnteredValue: { stringValue: String(val) } };
      })
    };
  });

  const headerRow = {
    values: headers.map(key => ({
      userEnteredValue: { stringValue: key },
      userEnteredFormat: { textFormat: { bold: true } }
    }))
  };
  
  const allRows = [headerRow, ...rows];

  const batchUpdateRequest = {
    requests: [
      {
        updateCells: {
          rows: allRows,
          fields: "userEnteredValue,userEnteredFormat.textFormat",
          start: { sheetId: 0, rowIndex: 0, columnIndex: 0 }
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId: 0, dimension: "ROWS", startIndex: 1, endIndex: allRows.length },
          properties: { pixelSize: 150 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId: 0, dimension: "COLUMNS", startIndex: 0, endIndex: 1 },
          properties: { pixelSize: 120 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId: 0, dimension: "COLUMNS", startIndex: 1, endIndex: 2 },
          properties: { pixelSize: 250 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId: 0, dimension: "COLUMNS", startIndex: 2, endIndex: 3 },
          properties: { pixelSize: 150 },
          fields: "pixelSize"
        }
      },
      {
        updateDimensionProperties: {
          range: { sheetId: 0, dimension: "COLUMNS", startIndex: 3, endIndex: 4 },
          properties: { pixelSize: 300 },
          fields: "pixelSize"
        }
      }
    ]
  };

  const updateRes = await fetch(sheetsApiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(batchUpdateRequest)
  });

  // 3.5 Fallback to CSV upload if Sheets API fails (e.g. API not enabled in GCP)
  if (!updateRes.ok) {
    console.warn('Sheets API batchUpdate failed, falling back to CSV upload (Formulas may be escaped).');
    const uploadRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'text/csv'
      },
      body: csvBlob
    });

    if (!uploadRes.ok) {
      throw new Error('Failed to upload data to spreadsheet');
    }
  }

  // 4. Update permissions to "Anyone with the link can view"
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/permissions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });

  // Return the shareable link
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
};
