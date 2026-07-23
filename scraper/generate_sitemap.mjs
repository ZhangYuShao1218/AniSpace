import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://anispace.zhangyushao.dev';
const DATA_PATH = path.join(__dirname, '..', 'public', 'anime_data.json');
const SITEMAP_PATH = path.join(__dirname, '..', 'public', 'sitemap.xml');

try {
  // Read anime data
  const rawData = fs.readFileSync(DATA_PATH, 'utf-8');
  const animeData = JSON.parse(rawData);
  const animeIds = Object.keys(animeData);

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Static Pages -->
  <url>
    <loc>${SITE_URL}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${SITE_URL}/about</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/faq</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${SITE_URL}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>

  <!-- Anime Detail Pages -->
`;

  const today = new Date().toISOString().split('T')[0];

  animeIds.forEach((id) => {
    xml += `  <url>
    <loc>${SITE_URL}/anime/${id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
  });

  xml += `</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, xml, 'utf-8');
  console.log(`Successfully generated sitemap.xml with ${animeIds.length + 4} URLs.`);
} catch (error) {
  console.error('Error generating sitemap:', error);
}
