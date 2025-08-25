import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIGMA_ACCESS_TOKEN = process.env.FIGMA_ACCESS_TOKEN;
const FIGMA_FILE_ID = process.env.FIGMA_FILE_ID;

if (!FIGMA_ACCESS_TOKEN || !FIGMA_FILE_ID) {
  console.error('Missing Figma credentials. Please set FIGMA_ACCESS_TOKEN and FIGMA_FILE_ID in your .env.local file');
  process.exit(1);
}

async function fetchFigmaFile() {
  const response = await fetch(`https://api.figma.com/v1/files/${FIGMA_FILE_ID}`, {
    headers: {
      'X-Figma-Token': FIGMA_ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function extractIcons(figmaData) {
  const icons = [];
  
  function traverse(node) {
    if (node.name && (node.name.includes('icon') || node.name.includes('Icon'))) {
      icons.push({
        id: node.id,
        name: node.name,
        type: node.type
      });
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(figmaData.document);
  return icons;
}

async function exportIcons(icons) {
  if (icons.length === 0) return;
  
  const nodeIds = icons.map(icon => icon.id).join(',');
  const response = await fetch(`https://api.figma.com/v1/images/${FIGMA_FILE_ID}?ids=${nodeIds}&format=svg`, {
    headers: {
      'X-Figma-Token': FIGMA_ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    throw new Error(`Figma images API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.images;
}

async function downloadAndSaveIcons(iconUrls, iconData) {
  const iconsDir = path.join(__dirname, '..', 'design', 'figma-assets', 'icons');
  
  try {
    await fs.access(iconsDir);
  } catch {
    await fs.mkdir(iconsDir, { recursive: true });
  }

  const downloadPromises = iconData.map(async (icon) => {
    const url = iconUrls[icon.id];
    if (!url) return;

    try {
      const response = await fetch(url);
      const svgContent = await response.text();
      
      const filename = `${icon.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}.svg`;
      const filepath = path.join(iconsDir, filename);
      
      await fs.writeFile(filepath, svgContent);
      console.log(`✓ Downloaded icon: ${filename}`);
    } catch (error) {
      console.error(`✗ Failed to download ${icon.name}:`, error.message);
    }
  });

  await Promise.all(downloadPromises);
}

async function generateIconIndex() {
  const iconsDir = path.join(__dirname, '..', 'design', 'figma-assets', 'icons');
  const indexPath = path.join(iconsDir, 'index.ts');
  
  try {
    const files = await fs.readdir(iconsDir);
    const svgFiles = files.filter(file => file.endsWith('.svg'));
    
    let indexContent = '// Auto-generated icon exports from Figma\n\n';
    
    svgFiles.forEach(file => {
      const name = file.replace('.svg', '');
      const componentName = name.split('_').map(part => 
        part.charAt(0).toUpperCase() + part.slice(1)
      ).join('');
      
      indexContent += `export { default as ${componentName}Icon } from './${file}';\n`;
    });
    
    await fs.writeFile(indexPath, indexContent);
    console.log('✓ Generated icon index file');
  } catch (error) {
    console.error('✗ Failed to generate icon index:', error.message);
  }
}

async function main() {
  try {
    console.log('🎨 Syncing assets from Figma...');
    
    const figmaData = await fetchFigmaFile();
    console.log('✓ Fetched Figma file data');
    
    const icons = await extractIcons(figmaData);
    console.log(`✓ Found ${icons.length} icons`);
    
    if (icons.length > 0) {
      const iconUrls = await exportIcons(icons);
      console.log('✓ Exported icon URLs');
      
      await downloadAndSaveIcons(iconUrls, icons);
      await generateIconIndex();
    }
    
    console.log('🎉 Figma sync completed successfully!');
  } catch (error) {
    console.error('❌ Figma sync failed:', error.message);
    process.exit(1);
  }
}

main();