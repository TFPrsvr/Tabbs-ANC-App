// Generate app icons for PWA (placeholder implementation)
// In production, use proper icon generation tools

const fs = require('fs');
const path = require('path');

// Icon sizes needed for PWA
const iconSizes = [
  { size: 72, name: 'icon-72x72.png' },
  { size: 96, name: 'icon-96x96.png' },
  { size: 128, name: 'icon-128x128.png' },
  { size: 144, name: 'icon-144x144.png' },
  { size: 152, name: 'icon-152x152.png' },
  { size: 192, name: 'icon-192x192.png' },
  { size: 384, name: 'icon-384x384.png' },
  { size: 512, name: 'icon-512x512.png' },
];

// Tile sizes for Windows
const tileSizes = [
  { size: 70, name: 'tile-70x70.png' },
  { size: 150, name: 'tile-150x150.png' },
  { size: 310, name: 'tile-310x310.png', width: 310, height: 150 }, // Wide tile
];

// Splash screen sizes for iOS
const splashSizes = [
  { width: 640, height: 1136, name: 'splash-640x1136.png' },
  { width: 750, height: 1334, name: 'splash-750x1334.png' },
  { width: 1242, height: 2208, name: 'splash-1242x2208.png' },
];

// Create icons directory
const iconsDir = path.join(__dirname, '..', 'public', 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Generate SVG icon template
function generateSVGIcon(size) {
  const iconSize = size;
  const padding = size * 0.1;
  const innerSize = iconSize - (padding * 2);
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${iconSize}" height="${iconSize}" viewBox="0 0 ${iconSize} ${iconSize}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.9" />
      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:0.7" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.9" />
    </linearGradient>
  </defs>
  
  <!-- Background with rounded corners -->
  <rect width="${iconSize}" height="${iconSize}" rx="${iconSize * 0.2}" fill="url(#bgGradient)"/>
  
  <!-- Sound wave pattern -->
  <g transform="translate(${padding}, ${iconSize / 2})">
    <!-- Main wave -->
    <path d="M 0,0 Q ${innerSize * 0.25},${-innerSize * 0.3} ${innerSize * 0.5},0 T ${innerSize},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${iconSize * 0.08}" 
          fill="none" 
          stroke-linecap="round"/>
    
    <!-- Secondary waves -->
    <path d="M 0,0 Q ${innerSize * 0.25},${-innerSize * 0.15} ${innerSize * 0.5},0 T ${innerSize},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${iconSize * 0.04}" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.6"/>
    
    <path d="M 0,0 Q ${innerSize * 0.25},${innerSize * 0.15} ${innerSize * 0.5},0 T ${innerSize},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${iconSize * 0.04}" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.6"/>
  </g>
  
  <!-- AI indicator (small dot pattern) -->
  <g transform="translate(${iconSize * 0.75}, ${iconSize * 0.25})">
    <circle cx="0" cy="0" r="${iconSize * 0.03}" fill="white" opacity="0.8"/>
    <circle cx="${iconSize * 0.08}" cy="${iconSize * 0.04}" r="${iconSize * 0.02}" fill="white" opacity="0.6"/>
    <circle cx="${iconSize * 0.04}" cy="${iconSize * 0.08}" r="${iconSize * 0.02}" fill="white" opacity="0.6"/>
  </g>
</svg>`;
}

// Generate splash screen SVG
function generateSplashSVG(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- App icon in center -->
  <g transform="translate(${width/2 - 64}, ${height/2 - 64})">
    ${generateSVGIcon(128).replace(/^<\?xml.*?\n/, '').replace(/^<svg.*?>/, '').replace(/<\/svg>$/, '')}
  </g>
  
  <!-- App name -->
  <text x="${width/2}" y="${height/2 + 120}" 
        font-family="Arial, sans-serif" 
        font-size="32" 
        font-weight="bold" 
        text-anchor="middle" 
        fill="white">ANC Audio Pro</text>
  
  <!-- Tagline -->
  <text x="${width/2}" y="${height/2 + 160}" 
        font-family="Arial, sans-serif" 
        font-size="18" 
        text-anchor="middle" 
        fill="white" 
        opacity="0.8">AI-Powered Audio Processing</text>
</svg>`;
}

// Generate all icons
console.log('🎨 Generating PWA icons...');

// App icons
iconSizes.forEach(({ size, name }) => {
  const svgContent = generateSVGIcon(size);
  fs.writeFileSync(path.join(iconsDir, name.replace('.png', '.svg')), svgContent);
  console.log(`✅ Generated ${name} (${size}x${size})`);
});

// Tiles
tileSizes.forEach(({ size, name, width, height }) => {
  const w = width || size;
  const h = height || size;
  const svgContent = generateSVGIcon(Math.min(w, h));
  fs.writeFileSync(path.join(iconsDir, name.replace('.png', '.svg')), svgContent);
  console.log(`✅ Generated ${name} (${w}x${h})`);
});

// Splash screens
splashSizes.forEach(({ width, height, name }) => {
  const svgContent = generateSplashSVG(width, height);
  fs.writeFileSync(path.join(iconsDir, name.replace('.png', '.svg')), svgContent);
  console.log(`✅ Generated ${name} (${width}x${height})`);
});

// Generate shortcut icons
const shortcutIcons = [
  { name: 'upload-shortcut.svg', icon: '📁' },
  { name: 'process-shortcut.svg', icon: '⚡' },
  { name: 'search-shortcut.svg', icon: '🔍' },
];

shortcutIcons.forEach(({ name, icon }) => {
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="96" height="96" viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">
  <rect width="96" height="96" rx="19" fill="#f3f4f6"/>
  <text x="48" y="58" font-family="Arial, sans-serif" font-size="32" text-anchor="middle">${icon}</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, name), svgContent);
  console.log(`✅ Generated ${name}`);
});

// Generate action icons
const actionIcons = [
  { name: 'open-action.svg', icon: '🚀' },
  { name: 'dismiss-action.svg', icon: '❌' },
  { name: 'badge-72x72.svg', icon: '🎵' },
];

actionIcons.forEach(({ name, icon }) => {
  const size = name.includes('badge') ? 72 : 48;
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#7c3aed"/>
  <text x="${size/2}" y="${size/2 + size * 0.1}" font-family="Arial, sans-serif" font-size="${size * 0.4}" text-anchor="middle" fill="white">${icon}</text>
</svg>`;
  
  fs.writeFileSync(path.join(iconsDir, name), svgContent);
  console.log(`✅ Generated ${name}`);
});

console.log(`\n🎉 Generated ${iconSizes.length + tileSizes.length + splashSizes.length + shortcutIcons.length + actionIcons.length} PWA assets`);
console.log('\n📝 Note: These are SVG placeholders. For production, convert to PNG using:');
console.log('   - Online tools like https://www.svgtopng.com/');
console.log('   - CLI tools like rsvg-convert or inkscape');
console.log('   - Design tools like Figma or Adobe Illustrator');