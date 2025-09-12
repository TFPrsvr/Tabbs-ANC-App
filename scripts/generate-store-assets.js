// Generate store-ready assets for Google Play Store deployment
const fs = require('fs');
const path = require('path');

// Store asset specifications
const storeAssets = {
  // Google Play Store requirements
  playStore: {
    icon: { size: 512, name: 'play-store-icon.svg' },
    featureGraphic: { width: 1024, height: 500, name: 'feature-graphic.svg' },
    screenshots: [
      { width: 1080, height: 1920, name: 'screenshot-1-phone.svg', type: 'phone' },
      { width: 1080, height: 1920, name: 'screenshot-2-phone.svg', type: 'phone' },
      { width: 1080, height: 1920, name: 'screenshot-3-phone.svg', type: 'phone' },
      { width: 1080, height: 1920, name: 'screenshot-4-phone.svg', type: 'phone' },
      { width: 2560, height: 1600, name: 'screenshot-1-tablet.svg', type: 'tablet' },
      { width: 2560, height: 1600, name: 'screenshot-2-tablet.svg', type: 'tablet' },
    ],
    promo: { width: 180, height: 120, name: 'promo-graphic.svg' }
  },
  
  // Additional marketing assets
  marketing: [
    { width: 1200, height: 630, name: 'social-media-banner.svg', type: 'social' },
    { width: 1920, height: 1080, name: 'hero-banner.svg', type: 'web' },
    { width: 400, height: 400, name: 'app-preview.svg', type: 'preview' }
  ]
};

// Create store assets directory
const assetsDir = path.join(__dirname, '..', 'store-assets');
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Brand colors and styling
const brandColors = {
  primary: '#7c3aed',
  secondary: '#3b82f6',
  accent: '#f59e0b',
  success: '#10b981',
  background: '#ffffff',
  text: '#1f2937'
};

// Generate main app icon for store
function generateStoreIcon(size) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${brandColors.secondary};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="waveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:0.95" />
      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:0.8" />
      <stop offset="100%" style="stop-color:#ffffff;stop-opacity:0.95" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.01}" flood-color="rgba(0,0,0,0.2)"/>
    </filter>
  </defs>
  
  <!-- Background with subtle shadow -->
  <rect width="${size}" height="${size}" rx="${size * 0.18}" fill="url(#bgGradient)" filter="url(#shadow)"/>
  
  <!-- Main sound wave pattern -->
  <g transform="translate(${size * 0.15}, ${size / 2})">
    <!-- Primary wave -->
    <path d="M 0,0 Q ${size * 0.175},${-size * 0.2} ${size * 0.35},0 T ${size * 0.7},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${size * 0.06}" 
          fill="none" 
          stroke-linecap="round"/>
    
    <!-- Secondary waves for depth -->
    <path d="M 0,0 Q ${size * 0.175},${-size * 0.1} ${size * 0.35},0 T ${size * 0.7},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${size * 0.03}" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.7"/>
    
    <path d="M 0,0 Q ${size * 0.175},${size * 0.1} ${size * 0.35},0 T ${size * 0.7},0" 
          stroke="url(#waveGradient)" 
          stroke-width="${size * 0.03}" 
          fill="none" 
          stroke-linecap="round"
          opacity="0.7"/>
  </g>
  
  <!-- AI/Tech indicator -->
  <g transform="translate(${size * 0.72}, ${size * 0.28})">
    <circle cx="0" cy="0" r="${size * 0.025}" fill="white" opacity="0.9"/>
    <circle cx="${size * 0.06}" cy="${size * 0.03}" r="${size * 0.015}" fill="white" opacity="0.7"/>
    <circle cx="${size * 0.03}" cy="${size * 0.06}" r="${size * 0.015}" fill="white" opacity="0.7"/>
    <circle cx="${size * 0.08}" cy="${size * 0.08}" r="${size * 0.01}" fill="white" opacity="0.5"/>
  </g>
</svg>`;
}

// Generate feature graphic for Play Store
function generateFeatureGraphic(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:1" />
      <stop offset="50%" style="stop-color:${brandColors.secondary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${brandColors.accent};stop-opacity:1" />
    </linearGradient>
    <linearGradient id="textGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:0.9" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
  
  <!-- Main title -->
  <text x="${width * 0.05}" y="${height * 0.3}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.15}" 
        font-weight="bold" 
        fill="url(#textGradient)">ANC Audio Pro</text>
  
  <!-- Tagline -->
  <text x="${width * 0.05}" y="${height * 0.5}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.08}" 
        fill="white" 
        opacity="0.9">AI-Powered Audio Processing</text>
  
  <!-- Feature highlights -->
  <text x="${width * 0.05}" y="${height * 0.65}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.05}" 
        fill="white" 
        opacity="0.8">🎵 Smart Audio Separation • 🎤 Voice Recognition • 📱 Works Offline</text>
  
  <!-- App icon on the right -->
  <g transform="translate(${width * 0.78}, ${height * 0.1})">
    ${generateStoreIcon(height * 0.8).replace(/^<\?xml.*?\n/, '').replace(/^<svg.*?>/, '').replace(/<\/svg>$/, '')}
  </g>
  
  <!-- Decorative wave pattern -->
  <g opacity="0.1">
    <path d="M 0,${height * 0.8} Q ${width * 0.25},${height * 0.6} ${width * 0.5},${height * 0.8} T ${width},${height * 0.8}" 
          stroke="white" 
          stroke-width="2" 
          fill="none"/>
    <path d="M 0,${height * 0.85} Q ${width * 0.25},${height * 0.65} ${width * 0.5},${height * 0.85} T ${width},${height * 0.85}" 
          stroke="white" 
          stroke-width="2" 
          fill="none"/>
  </g>
</svg>`;
}

// Generate app screenshot mockups
function generateScreenshot(width, height, type, screenNumber) {
  const isPhone = type === 'phone';
  const statusBarHeight = isPhone ? height * 0.06 : height * 0.04;
  const navBarHeight = isPhone ? height * 0.08 : height * 0.06;
  
  const screenshots = {
    1: {
      title: 'Upload & Process Audio Files',
      description: 'Drag and drop audio files for instant AI processing',
      content: 'upload-interface'
    },
    2: {
      title: 'Smart Audio Separation',
      description: 'Separate vocals, music, and background sounds',
      content: 'processing-interface'
    },
    3: {
      title: 'Voice Recognition & Search',
      description: 'Find specific speakers and moments in your audio',
      content: 'search-interface'
    },
    4: {
      title: 'Works Offline',
      description: 'Process audio files without internet connection',
      content: 'offline-interface'
    }
  };
  
  const screen = screenshots[screenNumber] || screenshots[1];
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="headerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${brandColors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Phone/tablet frame -->
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="${isPhone ? width * 0.05 : width * 0.02}"/>
  
  <!-- Status bar -->
  <rect width="${width}" height="${statusBarHeight}" fill="#000000" opacity="0.8" rx="${isPhone ? width * 0.05 : width * 0.02}"/>
  <text x="${width * 0.05}" y="${statusBarHeight * 0.6}" 
        font-family="Arial, sans-serif" 
        font-size="${statusBarHeight * 0.3}" 
        fill="white">9:41</text>
  <text x="${width * 0.85}" y="${statusBarHeight * 0.6}" 
        font-family="Arial, sans-serif" 
        font-size="${statusBarHeight * 0.25}" 
        fill="white">100%</text>
  
  <!-- Header -->
  <rect y="${statusBarHeight}" width="${width}" height="${statusBarHeight * 1.2}" fill="url(#headerGradient)"/>
  <text x="${width * 0.05}" y="${statusBarHeight * 1.8}" 
        font-family="Arial, sans-serif" 
        font-size="${statusBarHeight * 0.4}" 
        font-weight="bold"
        fill="white">🎵 ${screen.title}</text>
  
  <!-- Content area based on screen type -->
  <g transform="translate(${width * 0.05}, ${statusBarHeight * 2.5})">
    ${generateScreenContent(width * 0.9, height - statusBarHeight * 4, screen.content, isPhone)}
  </g>
  
  <!-- Bottom navigation (mobile) -->
  ${isPhone ? `
  <rect y="${height - navBarHeight}" width="${width}" height="${navBarHeight}" fill="white" opacity="0.95"/>
  <g transform="translate(${width * 0.1}, ${height - navBarHeight * 0.7})">
    <text x="0" y="0" font-family="Arial, sans-serif" font-size="${navBarHeight * 0.25}" fill="${brandColors.primary}">📁 Upload</text>
    <text x="${width * 0.25}" y="0" font-family="Arial, sans-serif" font-size="${navBarHeight * 0.25}" fill="#666">⚡ Process</text>
    <text x="${width * 0.5}" y="0" font-family="Arial, sans-serif" font-size="${navBarHeight * 0.25}" fill="#666">🔍 Search</text>
    <text x="${width * 0.7}" y="0" font-family="Arial, sans-serif" font-size="${navBarHeight * 0.25}" fill="#666">📂 Files</text>
  </g>
  ` : ''}
  
  <!-- Screen description overlay -->
  <rect y="${height * 0.85}" width="${width}" height="${height * 0.15}" fill="rgba(0,0,0,0.8)"/>
  <text x="${width * 0.05}" y="${height * 0.91}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.025}" 
        font-weight="bold"
        fill="white">${screen.description}</text>
</svg>`;
}

// Generate content for different screen types
function generateScreenContent(width, height, contentType, isPhone) {
  const cardHeight = isPhone ? height * 0.25 : height * 0.2;
  
  switch (contentType) {
    case 'upload-interface':
      return `
        <!-- Upload area -->
        <rect x="0" y="${height * 0.1}" width="${width}" height="${cardHeight}" 
              fill="white" stroke="${brandColors.primary}" stroke-width="2" 
              stroke-dasharray="8,4" rx="12" opacity="0.9"/>
        <text x="${width * 0.5}" y="${height * 0.2}" 
              font-family="Arial, sans-serif" 
              font-size="${height * 0.04}" 
              text-anchor="middle" 
              fill="${brandColors.text}">📁 Drag audio files here</text>
        <text x="${width * 0.5}" y="${height * 0.25}" 
              font-family="Arial, sans-serif" 
              font-size="${height * 0.025}" 
              text-anchor="middle" 
              fill="#666">MP3, WAV, M4A, and more</text>
        
        <!-- Feature icons -->
        <g transform="translate(0, ${height * 0.5})">
          <rect x="0" y="0" width="${width * 0.3}" height="${cardHeight * 0.8}" fill="white" rx="8"/>
          <text x="${width * 0.15}" y="${cardHeight * 0.3}" text-anchor="middle" font-size="${height * 0.03}">🎤</text>
          <text x="${width * 0.15}" y="${cardHeight * 0.6}" text-anchor="middle" font-size="${height * 0.02}" fill="#666">Voice</text>
          
          <rect x="${width * 0.35}" y="0" width="${width * 0.3}" height="${cardHeight * 0.8}" fill="white" rx="8"/>
          <text x="${width * 0.5}" y="${cardHeight * 0.3}" text-anchor="middle" font-size="${height * 0.03}">🎵</text>
          <text x="${width * 0.5}" y="${cardHeight * 0.6}" text-anchor="middle" font-size="${height * 0.02}" fill="#666">Music</text>
          
          <rect x="${width * 0.7}" y="0" width="${width * 0.3}" height="${cardHeight * 0.8}" fill="white" rx="8"/>
          <text x="${width * 0.85}" y="${cardHeight * 0.3}" text-anchor="middle" font-size="${height * 0.03}">🔍</text>
          <text x="${width * 0.85}" y="${cardHeight * 0.6}" text-anchor="middle" font-size="${height * 0.02}" fill="#666">Search</text>
        </g>
      `;
      
    case 'processing-interface':
      return `
        <!-- Audio waveform -->
        <rect x="0" y="${height * 0.1}" width="${width}" height="${height * 0.15}" fill="white" rx="8"/>
        <path d="M ${width * 0.05},${height * 0.175} Q ${width * 0.25},${height * 0.12} ${width * 0.5},${height * 0.175} T ${width * 0.95},${height * 0.175}" 
              stroke="${brandColors.primary}" stroke-width="3" fill="none"/>
        
        <!-- Processing controls -->
        <g transform="translate(0, ${height * 0.35})">
          <rect x="0" y="0" width="${width}" height="${cardHeight}" fill="white" rx="8"/>
          <text x="${width * 0.05}" y="${cardHeight * 0.3}" font-size="${height * 0.03}" font-weight="bold">🎯 Smart Separation</text>
          
          <!-- Volume sliders -->
          <g transform="translate(${width * 0.05}, ${cardHeight * 0.5})">
            <text x="0" y="0" font-size="${height * 0.02}" fill="#666">Vocals</text>
            <rect x="${width * 0.15}" y="-5" width="${width * 0.6}" height="10" fill="#e5e7eb" rx="5"/>
            <rect x="${width * 0.15}" y="-5" width="${width * 0.4}" height="10" fill="${brandColors.primary}" rx="5"/>
            
            <text x="0" y="${cardHeight * 0.15}" font-size="${height * 0.02}" fill="#666">Music</text>
            <rect x="${width * 0.15}" y="${cardHeight * 0.15 - 5}" width="${width * 0.6}" height="10" fill="#e5e7eb" rx="5"/>
            <rect x="${width * 0.15}" y="${cardHeight * 0.15 - 5}" width="${width * 0.3}" height="10" fill="${brandColors.secondary}" rx="5"/>
          </g>
        </g>
      `;
      
    case 'search-interface':
      return `
        <!-- Search bar -->
        <rect x="0" y="${height * 0.05}" width="${width}" height="${height * 0.08}" fill="white" rx="25"/>
        <text x="${width * 0.05}" y="${height * 0.1}" font-size="${height * 0.025}" fill="#666">🔍 Search for "meeting notes"</text>
        
        <!-- Search results -->
        <g transform="translate(0, ${height * 0.2})">
          <rect x="0" y="0" width="${width}" height="${cardHeight * 0.8}" fill="white" rx="8"/>
          <text x="${width * 0.05}" y="${cardHeight * 0.2}" font-size="${height * 0.025}" font-weight="bold">👤 Speaker 1 (2:31)</text>
          <text x="${width * 0.05}" y="${cardHeight * 0.4}" font-size="${height * 0.02}" fill="#666">"Let's review the meeting notes from yesterday..."</text>
          
          <rect x="0" y="${cardHeight * 0.9}" width="${width}" height="${cardHeight * 0.8}" fill="white" rx="8"/>
          <text x="${width * 0.05}" y="${cardHeight * 1.1}" font-size="${height * 0.025}" font-weight="bold">👤 Speaker 2 (5:17)</text>
          <text x="${width * 0.05}" y="${cardHeight * 1.3}" font-size="${height * 0.02}" fill="#666">"The action items from our notes include..."</text>
        </g>
      `;
      
    case 'offline-interface':
      return `
        <!-- Offline status -->
        <rect x="0" y="${height * 0.05}" width="${width}" height="${height * 0.08}" fill="#dbeafe" rx="8"/>
        <text x="${width * 0.05}" y="${height * 0.1}" font-size="${height * 0.025}" fill="#1e40af">📡 Offline Mode Active</text>
        
        <!-- Offline features -->
        <g transform="translate(0, ${height * 0.2})">
          <rect x="0" y="0" width="${width}" height="${cardHeight}" fill="white" rx="8"/>
          <text x="${width * 0.05}" y="${cardHeight * 0.25}" font-size="${height * 0.03}" font-weight="bold">🔄 Processing Locally</text>
          <text x="${width * 0.05}" y="${cardHeight * 0.45}" font-size="${height * 0.02}" fill="#666">• Basic audio separation</text>
          <text x="${width * 0.05}" y="${cardHeight * 0.6}" font-size="${height * 0.02}" fill="#666">• Voice activity detection</text>
          <text x="${width * 0.05}" y="${cardHeight * 0.75}" font-size="${height * 0.02}" fill="#666">• Local file storage</text>
        </g>
        
        <!-- Sync when online -->
        <rect x="0" y="${height * 0.7}" width="${width}" height="${height * 0.06}" fill="#f0fdf4" rx="8"/>
        <text x="${width * 0.05}" y="${height * 0.74}" font-size="${height * 0.02}" fill="#15803d">✅ Will sync when connection restored</text>
      `;
      
    default:
      return '';
  }
}

// Generate promo graphic
function generatePromoGraphic(width, height) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${brandColors.primary};stop-opacity:1" />
      <stop offset="100%" style="stop-color:${brandColors.secondary};stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <rect width="${width}" height="${height}" fill="url(#bgGradient)" rx="${width * 0.05}"/>
  
  <!-- App icon -->
  <g transform="translate(${width * 0.05}, ${height * 0.1})">
    ${generateStoreIcon(height * 0.4).replace(/^<\?xml.*?\n/, '').replace(/^<svg.*?>/, '').replace(/<\/svg>$/, '')}
  </g>
  
  <!-- Text content -->
  <text x="${width * 0.55}" y="${height * 0.35}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.12}" 
        font-weight="bold" 
        fill="white">ANC</text>
  <text x="${width * 0.55}" y="${height * 0.5}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.12}" 
        font-weight="bold" 
        fill="white">Audio</text>
  <text x="${width * 0.55}" y="${height * 0.75}" 
        font-family="Arial, sans-serif" 
        font-size="${height * 0.08}" 
        fill="white" 
        opacity="0.9">AI Processing</text>
</svg>`;
}

// Generate all store assets
console.log('🏪 Generating Google Play Store assets...');

// Main store icon
const storeIcon = generateStoreIcon(storeAssets.playStore.icon.size);
fs.writeFileSync(path.join(assetsDir, storeAssets.playStore.icon.name), storeIcon);
console.log(`✅ Generated ${storeAssets.playStore.icon.name}`);

// Feature graphic
const featureGraphic = generateFeatureGraphic(
  storeAssets.playStore.featureGraphic.width, 
  storeAssets.playStore.featureGraphic.height
);
fs.writeFileSync(path.join(assetsDir, storeAssets.playStore.featureGraphic.name), featureGraphic);
console.log(`✅ Generated ${storeAssets.playStore.featureGraphic.name}`);

// Screenshots
storeAssets.playStore.screenshots.forEach((screenshot, index) => {
  const screenNum = Math.floor(index / 2) + 1; // Group phone/tablet pairs
  const svg = generateScreenshot(screenshot.width, screenshot.height, screenshot.type, screenNum);
  fs.writeFileSync(path.join(assetsDir, screenshot.name), svg);
  console.log(`✅ Generated ${screenshot.name} (${screenshot.type})`);
});

// Promo graphic
const promoGraphic = generatePromoGraphic(
  storeAssets.playStore.promo.width, 
  storeAssets.playStore.promo.height
);
fs.writeFileSync(path.join(assetsDir, storeAssets.playStore.promo.name), promoGraphic);
console.log(`✅ Generated ${storeAssets.playStore.promo.name}`);

// Marketing assets
storeAssets.marketing.forEach((asset) => {
  let svg;
  if (asset.type === 'social') {
    svg = generateFeatureGraphic(asset.width, asset.height);
  } else if (asset.type === 'web') {
    svg = generateFeatureGraphic(asset.width, asset.height);
  } else {
    svg = generateStoreIcon(asset.width);
  }
  
  fs.writeFileSync(path.join(assetsDir, asset.name), svg);
  console.log(`✅ Generated ${asset.name} (${asset.type})`);
});

console.log(`\n🎉 Generated ${1 + 1 + storeAssets.playStore.screenshots.length + 1 + storeAssets.marketing.length} store assets`);
console.log('\n📝 Store Assets Summary:');
console.log('   📱 App Icon (512x512) - Main store listing icon');
console.log('   🎨 Feature Graphic (1024x500) - Store banner');
console.log(`   📸 ${storeAssets.playStore.screenshots.length} Screenshots - Phone and tablet demos`);
console.log('   🎯 Promo Graphic (180x120) - Small promotional image');
console.log(`   📢 ${storeAssets.marketing.length} Marketing Assets - Social media and web`);
console.log('\n⚠️  Remember to convert SVGs to PNG/JPG for final submission');
console.log('   - Use online tools or design software');
console.log('   - Maintain exact dimensions for store compliance');