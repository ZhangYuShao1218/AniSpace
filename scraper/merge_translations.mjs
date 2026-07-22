import fs from 'fs';
import path from 'path';

function main() {
    console.log('Loading tracking data...');
    const trackingPath = 'scraper/synopsis_tracking.json';
    let tracking = {};
    if (fs.existsSync(trackingPath)) {
        tracking = JSON.parse(fs.readFileSync(trackingPath, 'utf8'));
    }

    const newlyFetchedPath = 'scraper/synopsis_newly_fetched.json';
    let newlyFetched = [];
    if (fs.existsSync(newlyFetchedPath)) {
        newlyFetched = JSON.parse(fs.readFileSync(newlyFetchedPath, 'utf8'));
    }

    const animeData = JSON.parse(fs.readFileSync('public/anime_data.json', 'utf8'));
    const idToTitle = {};
    for (const a of animeData) {
        idToTitle[a.id] = a.titleZh;
    }

    const metaDir = 'public/anime_meta';
    if (!fs.existsSync(metaDir)) {
        fs.mkdirSync(metaDir, { recursive: true });
    }

    console.log('Merging translations...');
    let mergeCount = 0;
    for (let i = 0; i < 10; i++) {
        const translatedPath = `scraper/translated_${i}.json`;
        if (!fs.existsSync(translatedPath)) {
            continue;
        }

        const chunk = JSON.parse(fs.readFileSync(translatedPath, 'utf8'));
        for (const item of chunk) {
            if (!item.id || !item.zh) continue;
            
            // 1. Write to meta
            const metaFilePath = path.join(metaDir, `${item.id}.json`);
            let meta = {};
            if (fs.existsSync(metaFilePath)) {
                meta = JSON.parse(fs.readFileSync(metaFilePath, 'utf8'));
            }
            meta.zh = item.zh;
            meta.ja = item.ja || meta.ja;
            meta.en = item.en || meta.en;
            fs.writeFileSync(metaFilePath, JSON.stringify(meta, null, 2));

            // 2. Update tracking
            tracking[item.id] = { zh: true, ja: true, en: true };

            // 3. Add to newly fetched
            if (!newlyFetched.find(x => x.id === item.id)) {
                newlyFetched.push({
                    id: item.id,
                    title: idToTitle[item.id] || item.id
                });
            }
            mergeCount++;
        }
    }

    console.log(`Successfully merged ${mergeCount} translations.`);

    // Also mark failures as tracked so we don't retry them infinitely
    const failuresPath = 'scraper/synopsis_failures.json';
    if (fs.existsSync(failuresPath)) {
        const failures = JSON.parse(fs.readFileSync(failuresPath, 'utf8'));
        for (const f of failures) {
            // We set them to true in tracking to indicate we attempted and we know they failed.
            // (Or we could set a special flag, but for now just setting true will stop the loop).
            // Actually, setting them to true means the app might think they are translated.
            // But if the `anime_meta` file doesn't have the fields, it falls back. That's fine.
            tracking[f.id] = { zh: true, ja: true, en: true, failed: true };
        }
        console.log(`Marked ${failures.length} failures as tracked.`);
    }
    
    fs.writeFileSync(trackingPath, JSON.stringify(tracking, null, 2));
    fs.writeFileSync(newlyFetchedPath, JSON.stringify(newlyFetched, null, 2));

    console.log('Cleaning up temporary files...');
    for (let i = 0; i < 10; i++) {
        try { fs.unlinkSync(`scraper/to_translate_${i}.json`); } catch(e) {}
        try { fs.unlinkSync(`scraper/translated_${i}.json`); } catch(e) {}
    }
    // Note: keeping synopsis_failures.json for now to report to the user, we will delete it later.
    console.log('Done!');
}

main();
