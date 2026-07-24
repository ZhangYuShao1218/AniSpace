import fs from 'fs';

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, { headers: { 'User-Agent': 'AniSpace-App' } });
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
    const trackingPath = 'scraper/synopsis_tracking.json';
    let tracking = {};
    if (fs.existsSync(trackingPath)) {
        const content = fs.readFileSync(trackingPath, 'utf8').trim();
        if (content) tracking = JSON.parse(content);
    }

    console.log('Filtering items...');
    let toFetch = [];
    let currentBatchFailures = []; // Track failures in this run
    
    // Find up to 100 items to fetch, skip those without bgmId directly
    for (const anime of animeData) {
        const id = anime.id;
        const track = tracking[id];
        
        // Already successfully translated or marked as failed previously
        if (track && (track.failed || (track.zh && track.ja && track.en))) {
            continue;
        }

        const bgmRecord = mapping[id];
        if (!bgmRecord || !bgmRecord.bgmId) {
            // Directly mark as failed in tracking and skip
            tracking[id] = { zh: false, ja: false, en: false, failed: true, reason: 'no_bgm_id' };
            currentBatchFailures.push({ title: anime.titleZh, reason: '找不到 bangumi_data 對應資料' });
            continue;
        }

        toFetch.push(anime);
        if (toFetch.length >= 150) break;
    }
    
    console.log(`Found ${toFetch.length} valid items to fetch in this batch.`);
    
    if (toFetch.length === 0 && currentBatchFailures.length === 0) {
        console.log("No items to translate. Database complete!");
        // Update tracking to save the skipped ones
        fs.writeFileSync(trackingPath, JSON.stringify(tracking, null, 2));
        
        // Calculate total stats
        let total = animeData.length;
        let withSynopsis = 0;
        for (const anime of animeData) {
            const track = tracking[anime.id];
            if (track && track.zh && !track.failed) {
                withSynopsis++;
            }
        }
        console.log(`\nSTATS: ${withSynopsis}/${total}`);
        return;
    }

    console.log('Fetching summaries from Bangumi...');
    const results = [];
    const failures = []; // Console log simple failures
    
    for (let i = 0; i < toFetch.length; i++) {
        const anime = toFetch[i];
        const id = anime.id;
        const bgmRecord = mapping[id];

        console.log(`[${i+1}/${toFetch.length}] Fetching bgmId: ${bgmRecord.bgmId} (${anime.titleZh})...`);
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
                console.log(`  No summary found.`);
                tracking[id] = { zh: false, ja: false, en: false, failed: true, reason: 'no_summary' };
                failures.push(anime.titleZh);
                currentBatchFailures.push({ title: anime.titleZh, reason: '沒有 summary 為空' });
            }
        } catch (e) {
            console.error(`  Error fetching: ${e.message}`);
            tracking[id] = { zh: false, ja: false, en: false, failed: true, reason: 'fetch_error' };
            failures.push(anime.titleZh);
            currentBatchFailures.push({ title: anime.titleZh, reason: 'API 抓取失敗或錯誤' });
        }
        if (i < toFetch.length - 1) {
            await delay(1000); // 1s delay to be nice to API
        }
    }
    
    console.log(`Successfully fetched ${results.length} summaries. ${failures.length} fetch failures.`);
    fs.writeFileSync(trackingPath, JSON.stringify(tracking, null, 2));
    fs.writeFileSync('scraper/synopsis_failures.json', JSON.stringify(currentBatchFailures, null, 2));

    const numChunks = 4;
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
    
    // Total stats
    let total = animeData.length;
    let withSynopsis = 0;
    for (const anime of animeData) {
        const track = tracking[anime.id];
        if (track && track.zh && !track.failed) {
            withSynopsis++;
        }
    }
    console.log(`\nSTATS: ${withSynopsis}/${total}`);
}

main().catch(console.error);
