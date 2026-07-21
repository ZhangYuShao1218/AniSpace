import { get, set, del } from 'idb-keyval';
import { LOCAL_STORAGE_KEY, PLAN_TO_WATCH_KEY, CACHED_DATA_KEY, CUSTOM_ANIME_KEY, CACHED_DATA_VERSION_KEY, LAST_SYNC_TIME_KEY } from './constants';

export const getDbData = async <T>(key: string): Promise<T | undefined> => {
  try {
    const data = await get<any>(key);
    if (typeof data === 'string') {
      try {
        return JSON.parse(data);
      } catch {
        return data as unknown as T;
      }
    }
    return data as T;
  } catch (error) {
    console.error(`Failed to get data from IndexedDB for key ${key}`, error);
    return undefined;
  }
};

export const setDbData = async <T>(key: string, value: T): Promise<void> => {
  try {
    const dataToStore = typeof value === 'string' ? value : JSON.stringify(value);
    await set(key, dataToStore);
  } catch (error) {
    console.error(`Failed to set data in IndexedDB for key ${key}`, error);
  }
};

export const removeDbData = async (key: string): Promise<void> => {
  try {
    await del(key);
  } catch (error) {
    console.error(`Failed to remove data in IndexedDB for key ${key}`, error);
  }
};

export const migrateLocalStorageToIndexedDB = async (): Promise<void> => {
  const keysToMigrate = [
    LOCAL_STORAGE_KEY,
    PLAN_TO_WATCH_KEY,
    CACHED_DATA_KEY,
    CUSTOM_ANIME_KEY,
    CACHED_DATA_VERSION_KEY,
    LAST_SYNC_TIME_KEY
  ];

  const migrationPromises = keysToMigrate.map(async (key) => {
    const localValue = localStorage.getItem(key);
    if (localValue !== null) {
      // 檢查 IndexedDB 是否已有資料 (避免覆蓋較新的 DB 資料)
      const dbValue = await get(key);
      if (dbValue === undefined) {
        try {
          // 嘗試解析 JSON (除了版本號等純字串)
          let parsedValue = localValue;
          await setDbData(key, parsedValue);
          console.log(`Migrated ${key} to IndexedDB`);
        } catch (error) {
          console.error(`Error migrating ${key}`, error);
        }
      }
      
      // 清除 LocalStorage 以釋放空間
      localStorage.removeItem(key);
      console.log(`Removed ${key} from LocalStorage to free up space.`);
    }
  });

  await Promise.all(migrationPromises);
};
