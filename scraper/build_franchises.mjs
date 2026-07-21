import fs from 'fs';
import path from 'path';

export function buildFranchiseRelations() {
  console.log('🔄 正在建構全系列關聯圖 (Franchise Graph)...');
  const metaDir = path.join(process.cwd(), 'public', 'anime_meta');
  if (!fs.existsSync(metaDir)) return;

  const files = fs.readdirSync(metaDir).filter(f => f.endsWith('.json'));
  
  // graph adjacency list
  const adjList = new Map();

  const addEdge = (u, v) => {
    if (!adjList.has(u)) adjList.set(u, new Set());
    if (!adjList.has(v)) adjList.set(v, new Set());
    adjList.get(u).add(v);
    adjList.get(v).add(u);
  };

  // 1. Build edges
  files.forEach(file => {
    const filePath = path.join(metaDir, file);
    try {
      const id = file.replace('.json', '');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (data.relatedAnimeIds && Array.isArray(data.relatedAnimeIds)) {
        data.relatedAnimeIds.forEach(relatedId => {
          addEdge(id, relatedId);
        });
      }
    } catch(e) {}
  });

  // 2. Find connected components
  const visited = new Set();
  const components = [];

  for (const node of adjList.keys()) {
    if (!visited.has(node)) {
      const comp = [];
      const queue = [node];
      visited.add(node);

      while(queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        for (const neighbor of adjList.get(curr)) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      if (comp.length > 1) {
        components.push(comp);
      }
    }
  }

  // 2.5 Read allAnime to get sort order
  const dataPath = path.join(process.cwd(), 'public', 'anime_data.json');
  let animeMap = new Map();
  try {
    const allAnime = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    allAnime.forEach(a => {
      let score = 99999999;
      if (a.startDate && a.startDate.year) {
        score = a.startDate.year * 10000 + (a.startDate.month || 12) * 100 + (a.startDate.day || 31);
      }
      animeMap.set(a.id, score);
    });
  } catch(e) {}

  // 3. Map each node to its component and rewrite files
  const nodeToComponent = new Map();
  components.forEach(comp => {
    // sort component by date
    comp.sort((a, b) => (animeMap.get(a) || 99999999) - (animeMap.get(b) || 99999999));
    comp.forEach(node => {
      nodeToComponent.set(node, comp);
    });
  });

  let updatedCount = 0;
  files.forEach(file => {
    const filePath = path.join(metaDir, file);
    try {
      const id = file.replace('.json', '');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      const comp = nodeToComponent.get(id);
      if (comp) {
        // Remove self from the component for relatedAnimeIds
        const franchiseIds = comp.filter(n => n !== id);
        
        // If there are changes, save it
        if (JSON.stringify(data.relatedAnimeIds || []) !== JSON.stringify(franchiseIds)) {
          data.relatedAnimeIds = franchiseIds;
          fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
          updatedCount++;
        }
      }
    } catch(e) {}
  });

  console.log(`✅ 建構完成！共整理出 ${components.length} 個系列，更新了 ${updatedCount} 筆 Metadata 關聯檔案。`);
}
