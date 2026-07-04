import fs from 'fs';
import path from 'path';

const PUBLIC_DIR = path.resolve('public');
const DATA_FILE = path.join(PUBLIC_DIR, 'anime_data.json');
const OLD_DATA_FILE = path.join(PUBLIC_DIR, 'anime_data_old.json');
const OVERRIDE_FILE = path.join(PUBLIC_DIR, 'custom_override.json');

function getYYYYMMDD(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

async function run() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('No anime_data.json found. Exiting post_process.');
    return;
  }

  const newDataRaw = fs.readFileSync(DATA_FILE, 'utf-8');
  const newData = JSON.parse(newDataRaw);

  let overrideData = {};
  if (fs.existsSync(OVERRIDE_FILE)) {
    overrideData = JSON.parse(fs.readFileSync(OVERRIDE_FILE, 'utf-8'));
  }

  // 1. Compare and clean custom_override.json
  if (fs.existsSync(OLD_DATA_FILE)) {
    const oldData = JSON.parse(fs.readFileSync(OLD_DATA_FILE, 'utf-8'));
    const oldMap = new Map(oldData.map(item => [item.id, item]));

    let overrideChanged = false;

    for (const newItem of newData) {
      const oldItem = oldMap.get(newItem.id);
      if (oldItem && overrideData[newItem.id]) {
        const override = overrideData[newItem.id];
        // 絕對尊重最高優先度 manual，如果是手動修改的設定，絕對不可清除或觸發任何異動與日誌
        if (override.source === 'manual') {
          continue;
        }

        // 只有當新譯名已經「不是」使用 Override 的名稱（代表有其他官方來源提供了新譯名取代了舊 Override），才進行清除與紀錄
        if (newItem.titleZh !== oldItem.titleZh && override.titleZh !== undefined && newItem.titleZh !== override.titleZh) {
          console.log(`[Diff] 發現更官方譯名 ${newItem.id}: 舊譯名 "${oldItem.titleZh}" ➜ 新譯名 "${newItem.titleZh}"，清除過時的 Override: "${override.titleZh}"`);
          delete override.titleZh;
          overrideChanged = true;
        }
        if (newItem.titleEn !== oldItem.titleEn && override.titleEn !== undefined && newItem.titleEn !== override.titleEn) {
          console.log(`[Diff] 發現更官方英文名稱 ${newItem.id}: "${oldItem.titleEn}" ➜ "${newItem.titleEn}"，清除過時的 Override: "${override.titleEn}"`);
          delete override.titleEn;
          overrideChanged = true;
        }

        // Clean up empty objects
        if (Object.keys(overrideData[newItem.id]).length === 0) {
          delete overrideData[newItem.id];
        }
      }
    }

    if (overrideChanged) {
      fs.writeFileSync(OVERRIDE_FILE, JSON.stringify(overrideData, null, 2), 'utf-8');
      console.log('Updated custom_override.json based on translation diffs.');
    } else {
      console.log('No relevant translation changes detected.');
    }
  } else {
    console.log('No anime_data_old.json found. Skipping diff step this time.');
  }

  // 2. Overwrite old data for next time
  fs.writeFileSync(OLD_DATA_FILE, newDataRaw, 'utf-8');
  console.log('Overwrote anime_data_old.json with latest data.');

  // 3. Create Daily Backup
  const today = new Date();
  const dateStr = getYYYYMMDD(today);
  const backupFile = path.join(PUBLIC_DIR, `anime_data_backup_${dateStr}.json`);
  fs.writeFileSync(backupFile, newDataRaw, 'utf-8');
  console.log(`Created daily backup: anime_data_backup_${dateStr}.json`);

  // 4. Cleanup old backups (keep only last 7 days)
  const files = fs.readdirSync(PUBLIC_DIR);
  const backupRegex = /^anime_data_backup_(\d{8})\.json$/;
  const nowTime = today.getTime();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  for (const file of files) {
    const match = file.match(backupRegex);
    if (match) {
      const fileDateStr = match[1];
      const year = parseInt(fileDateStr.substring(0, 4), 10);
      const month = parseInt(fileDateStr.substring(4, 6), 10) - 1;
      const day = parseInt(fileDateStr.substring(6, 8), 10);
      const fileDate = new Date(year, month, day);

      if (nowTime - fileDate.getTime() > SEVEN_DAYS_MS) {
        fs.unlinkSync(path.join(PUBLIC_DIR, file));
        deletedCount++;
        console.log(`Deleted old backup: ${file}`);
      }
    }
  }

  if (deletedCount === 0) {
    console.log('No old backups required deletion.');
  }
}

run().catch(err => {
  console.error('Post processing error:', err);
});
