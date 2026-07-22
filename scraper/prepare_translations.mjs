import fs from 'fs';
import path from 'path';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'AniSpace-App (github.com/ZhangYuShao1218/AniSpace)' } });
            if (res.status === 404) return null;
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return await res.json();
        } catch (e) {
            if (i === retries - 1) throw e;
            await delay(2000);
        }
    }
}

async function main() {
    console.log('Loading data...');
    const animeData = JSON.parse(fs.readFileSync('public/anime_data.json', 'utf8'));
    const mapping = JSON.parse(fs.readFileSync('public/bangumi_mapping_record.json', 'utf8'));
    let tracking = {};
    if (fs.existsSync('scraper/synopsis_tracking.json')) {
        const content = fs.readFileSync('scraper/synopsis_tracking.json', 'utf8').trim();
        if (content) {
            tracking = JSON.parse(content);
        }
    }

    console.log('Filtering items...');
    let pending = [];
    for (const anime of animeData) {
        const id = anime.id;
        const track = tracking[id];
        if (!track || !track.zh || !track.ja || !track.en) {
            pending.push(anime);
        }
    }
    
    // Take at most 100 items for this batch
    pending = pending.slice(0, 100);
    console.log(`Found ${pending.length} items to process in this batch.`);
    
    if (pending.length === 0) {
        console.log("No items to translate.");
        return;
    }

    console.log('Fetching summaries from Bangumi...');
    const results = [];
    const failures = [];
    
    for (let i = 0; i < pending.length; i++) {
        const anime = pending[i];
        const id = anime.id;
        const bgmRecord = mapping[id];
        
        if (!bgmRecord || !bgmRecord.bgmId) {
            console.log(`[${i+1}/${pending.length}] Skipping ${anime.titleZh}: No bgmId`);
            failures.push({
                id: anime.id,
                title: anime.titleZh,
                bgmId: null,
                reason: '找不到 bangumi_data 對應資料 (無 bgmId)'
            });
            // Mark as tracked so we don't process it in the next batch infinitely
            // Or wait, if we mark it as tracked, it will be skipped. But the translation isn't done.
            // Let's just track it in failures. The merge script should mark it as failed in tracking to skip future attempts.
            continue;
        }

        console.log(`[${i+1}/${pending.length}] Fetching bgmId: ${bgmRecord.bgmId} (${anime.titleZh})...`);
        try {
            const data = await fetchWithRetry(`https://api.bgm.tv/v0/subjects/${bgmRecord.bgmId}`);
            if (data && data.summary) {
                results.push({
                    id: anime.id,
                    bgmId: bgmRecord.bgmId,
                    bgmSummary: data.summary,
                    titleZh: anime.titleZh
                });
            } else {
                console.log(`  No summary found for bgmId: ${bgmRecord.bgmId}`);
                failures.push({
                    id: anime.id,
                    title: anime.titleZh,
                    bgmId: bgmRecord.bgmId,
                    reason: 'Bangumi API 查無頁面或 summary 為空'
                });
            }
        } catch (e) {
            console.error(`  Error fetching bgmId: ${bgmRecord.bgmId}`, e.message);
            failures.push({
                id: anime.id,
                title: anime.titleZh,
                bgmId: bgmRecord.bgmId,
                reason: `Bangumi API 請求失敗: ${e.message}`
            });
        }
        if (i < pending.length - 1) {
            await delay(1000); // 1s delay
        }
    }
    
    console.log(`Successfully fetched ${results.length} summaries. ${failures.length} failures.`);
    fs.writeFileSync('scraper/synopsis_failures.json', JSON.stringify(failures, null, 2));

    const numChunks = 10;
    for (let i = 0; i < numChunks; i++) {
        fs.writeFileSync(`scraper/to_translate_${i}.json`, JSON.stringify([], null, 2));
    }
    
    // Distribute evenly
    for (let i = 0; i < results.length; i++) {
        const chunkIndex = i % numChunks;
        const filename = `scraper/to_translate_${chunkIndex}.json`;
        const chunk = JSON.parse(fs.readFileSync(filename, 'utf8'));
        chunk.push(results[i]);
        fs.writeFileSync(filename, JSON.stringify(chunk, null, 2));
    }
    
    console.log('Done creating to_translate_X.json files.');
}

main().catch(console.error);
