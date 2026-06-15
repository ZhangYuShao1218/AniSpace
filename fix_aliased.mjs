import fs from 'fs/promises';
import path from 'path';

async function walk(dir) {
  let results = [];
  const list = await fs.readdir(dir, { withFileTypes: true });
  for (let file of list) {
    if (file.isDirectory()) {
      results = results.concat(await walk(path.join(dir, file.name)));
    } else if (file.name.endsWith('.tsx') || file.name.endsWith('.ts')) {
      results.push(path.join(dir, file.name));
    }
  }
  return results;
}

async function run() {
  const allFiles = await walk('./src');
  for (const file of allFiles) {
    let content = await fs.readFile(file, 'utf8');
    let original = content;
    
    // Replace relative outward paths with absolute aliases
    // For single quote
    content = content.replace(/from\s+'\.\.\/\.\.\/contexts\//g, "from '@/contexts/");
    content = content.replace(/from\s+'\.\.\/contexts\//g, "from '@/contexts/");
    content = content.replace(/from\s+'\.\.\/\.\.\/hooks\//g, "from '@/hooks/");
    content = content.replace(/from\s+'\.\.\/hooks\//g, "from '@/hooks/");
    content = content.replace(/from\s+'\.\.\/\.\.\/utils\//g, "from '@/utils/");
    content = content.replace(/from\s+'\.\.\/utils\//g, "from '@/utils/");
    content = content.replace(/from\s+'\.\.\/\.\.\/types'/g, "from '@/types'");
    content = content.replace(/from\s+'\.\.\/types'/g, "from '@/types'");
    
    // For double quote
    content = content.replace(/from\s+"\.\.\/\.\.\/contexts\//g, "from \"@/contexts/");
    content = content.replace(/from\s+"\.\.\/contexts\//g, "from \"@/contexts/");
    content = content.replace(/from\s+"\.\.\/\.\.\/hooks\//g, "from \"@/hooks/");
    content = content.replace(/from\s+"\.\.\/hooks\//g, "from \"@/hooks/");
    content = content.replace(/from\s+"\.\.\/\.\.\/utils\//g, "from \"@/utils/");
    content = content.replace(/from\s+"\.\.\/utils\//g, "from \"@/utils/");
    content = content.replace(/from\s+"\.\.\/\.\.\/types"/g, "from \"@/types\"");
    content = content.replace(/from\s+"\.\.\/types"/g, "from \"@/types\"");

    // Fix moved component specific internal imports (like SettingsDropdown in BottomNavBar)
    // If a file is in src/components/layout/ (like BottomNavBar) and it imports './SettingsDropdown',
    // It should now import '../SettingsDropdown' or '@/components/SettingsDropdown'.
    content = content.replace(/from\s+'\.\/SettingsDropdown'/g, "from '@/components/SettingsDropdown'");
    content = content.replace(/from\s+"\.\/SettingsDropdown"/g, "from \"@/components/SettingsDropdown\"");

    if (content !== original) {
       await fs.writeFile(file, content, 'utf8');
       console.log('Fixed aliases in', file);
    }
  }
}

run();
