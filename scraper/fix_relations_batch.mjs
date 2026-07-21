import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataPath = path.join(__dirname, '..', 'public', 'anime_data.json');
const metaDir = path.join(__dirname, '..', 'public', 'anime_meta');

const delay = ms => new Promise(res => setTimeout(res, ms));

async function main() {
  if (!fs.existsSync(metaDir)) {
    fs.mkdirSync(metaDir, { recursive: true });
  }
  const allAnime = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
  const ids = allAnime.map(a => parseInt(a.id.replace('anilist-', ''), 10)).filter(id => !isNaN(id));

  console.log(`Found ${ids.length} anime IDs to process.`);

  const batchSize = 50;
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize);
    console.log(`Processing batch ${i / batchSize + 1} of ${Math.ceil(ids.length / batchSize)}`);
    
    const query = `
      query ($ids: [Int]) {
        Page(page: 1, perPage: 50) {
          media(id_in: $ids, type: ANIME) {
            id
            relations {
              edges {
                relationType
                node {
                  id
                  startDate { year month day }
                }
              }
            }
          }
        }
      }
    `;

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables: { ids: batch } })
      });
      if (!res.ok) {
        console.error(`Error fetching batch ${i / batchSize + 1}: ${res.status}`);
        await delay(5000);
        i -= batchSize; // Retry
        continue;
      }

      const json = await res.json();
      const mediaList = json.data.Page.media;

      const ALLOWED_RELATIONS = ['PREQUEL', 'SEQUEL', 'PARENT', 'SIDE_STORY', 'SPIN_OFF', 'ALTERNATIVE', 'COMPILATION', 'SUMMARY'];

      for (const media of mediaList) {
        const fileId = `anilist-${media.id}`;
        const filePath = path.join(metaDir, `${fileId}.json`);
        let meta = {};
        if (fs.existsSync(filePath)) {
          try {
            meta = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
          } catch(e) {}
        }

        let relatedAnimeIds = [];
        if (media.relations && media.relations.edges) {
          const validEdges = media.relations.edges.filter(e => e.node && e.node.id && ALLOWED_RELATIONS.includes(e.relationType));
          validEdges.sort((a, b) => {
            const dateA = (a.node.startDate?.year || 9999) * 10000 + (a.node.startDate?.month || 12) * 100 + (a.node.startDate?.day || 31);
            const dateB = (b.node.startDate?.year || 9999) * 10000 + (b.node.startDate?.month || 12) * 100 + (b.node.startDate?.day || 31);
            return dateA - dateB;
          });
          relatedAnimeIds = validEdges.map(e => `anilist-${e.node.id}`);
          relatedAnimeIds = [...new Set(relatedAnimeIds)];
        }

        meta.relatedAnimeIds = relatedAnimeIds;
        fs.writeFileSync(filePath, JSON.stringify(meta, null, 2), 'utf-8');
      }

      await delay(1000); // rate limiting
    } catch (e) {
      console.error(e);
      await delay(5000);
      i -= batchSize;
    }
  }

  console.log('✅ Done fetching relations. Now running buildFranchises...');
  
  // Re-run build franchises logic directly here
  const { buildFranchiseRelations } = await import('./build_franchises.mjs');
  buildFranchiseRelations();
}

main();
