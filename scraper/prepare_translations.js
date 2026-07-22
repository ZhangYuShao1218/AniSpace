const fs = require('fs');
const path = require('path');

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
    let toTranslate = [];
    for (const anime of animeData) {
        const id = anime.id;
        const bgmRecord = mapping[id];
        if (!bgmRecord || !bgmRecord.bgmId) continue;
        
        const track = tracking[id];
        if (!track || !track.zh || !track.ja || !track.en) {
            toTranslate.push({ id, bgmId: bgmRecord.bgmId, titleZh: anime.titleZh });
        }
    }
    
    // Take at most 100 items
    toTranslate = toTranslate.slice(0, 100);
    console.log(`Found ${toTranslate.length} items to translate.`);
    
    if (toTranslate.length === 0) {
        console.log("No items to translate.");
        return;
    }

    console.log('Fetching summaries from Bangumi...');
    const results = [];
    for (let i = 0; i < toTranslate.length; i++) {
        const item = toTranslate[i];
        console.log(`[${i+1}/${toTranslate.length}] Fetching bgmId: ${item.bgmId} (${item.titleZh})...`);
        try {
            const data = await fetchWithRetry(`https://api.bgm.tv/v0/subjects/${item.bgmId}`);
            if (data && data.summary) {
                results.push({
                    id: item.id,
                    bgmId: item.bgmId,
                    bgmSummary: data.summary,
                    titleZh: item.titleZh
                });
            } else {
                console.log(`  No summary found for bgmId: ${item.bgmId}`);
            }
        } catch (e) {
            console.error(`  Error fetching bgmId: ${item.bgmId}`, e.message);
        }
        if (i < toTranslate.length - 1) {
            await delay(1000); // 1s delay
        }
    }
    
    console.log(`Successfully fetched ${results.length} summaries. Splitting into 10 chunks...`);
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
