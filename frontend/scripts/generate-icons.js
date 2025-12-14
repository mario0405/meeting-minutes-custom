const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const inputImage = path.join(__dirname, 'app-icon-source.png');
const tauriIconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');

// Tauri required icon sizes
const iconSizes = [
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  { name: 'icon.png', size: 512 },
];

// Windows ICO sizes (embedded in icon.ico)
const icoSizes = [16, 24, 32, 48, 64, 128, 256];

async function generateIcons() {
  console.log('Starting icon generation...');
  
  // Check if source image exists
  if (!fs.existsSync(inputImage)) {
    console.error(`Source image not found at: ${inputImage}`);
    console.log('Please save the app icon as "app-icon-source.png" in the scripts folder.');
    process.exit(1);
  }

  // Ensure icons directory exists
  if (!fs.existsSync(tauriIconsDir)) {
    fs.mkdirSync(tauriIconsDir, { recursive: true });
  }

  // Generate PNG icons
  for (const icon of iconSizes) {
    const outputPath = path.join(tauriIconsDir, icon.name);
    await sharp(inputImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate ICO file (Windows)
  // Sharp doesn't support ICO directly, so we'll create individual PNGs
  // and use a workaround - create the largest size as icon.ico placeholder
  // For proper ICO, we need to use png-to-ico or similar
  
  // Generate Square150x150Logo and other Windows assets
  const windowsSizes = [
    { name: 'Square30x30Logo.png', size: 30 },
    { name: 'Square44x44Logo.png', size: 44 },
    { name: 'Square71x71Logo.png', size: 71 },
    { name: 'Square89x89Logo.png', size: 89 },
    { name: 'Square107x107Logo.png', size: 107 },
    { name: 'Square142x142Logo.png', size: 142 },
    { name: 'Square150x150Logo.png', size: 150 },
    { name: 'Square284x284Logo.png', size: 284 },
    { name: 'Square310x310Logo.png', size: 310 },
    { name: 'StoreLogo.png', size: 50 },
  ];

  for (const icon of windowsSizes) {
    const outputPath = path.join(tauriIconsDir, icon.name);
    await sharp(inputImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated: ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate ICNS components for macOS (individual sizes)
  // macOS icns needs specific sizes
  const macSizes = [
    { name: 'icon_16x16.png', size: 16 },
    { name: 'icon_16x16@2x.png', size: 32 },
    { name: 'icon_32x32.png', size: 32 },
    { name: 'icon_32x32@2x.png', size: 64 },
    { name: 'icon_128x128.png', size: 128 },
    { name: 'icon_128x128@2x.png', size: 256 },
    { name: 'icon_256x256.png', size: 256 },
    { name: 'icon_256x256@2x.png', size: 512 },
    { name: 'icon_512x512.png', size: 512 },
    { name: 'icon_512x512@2x.png', size: 1024 },
  ];

  // Create a mac-icons subfolder for icns generation
  const macIconsDir = path.join(tauriIconsDir, 'mac-icons');
  if (!fs.existsSync(macIconsDir)) {
    fs.mkdirSync(macIconsDir, { recursive: true });
  }

  for (const icon of macSizes) {
    const outputPath = path.join(macIconsDir, icon.name);
    await sharp(inputImage)
      .resize(icon.size, icon.size, {
        fit: 'contain',
        background: { r: 0, g: 0, b: 0, alpha: 0 }
      })
      .png()
      .toFile(outputPath);
    console.log(`Generated (macOS): ${icon.name} (${icon.size}x${icon.size})`);
  }

  console.log('\n✅ Icon generation complete!');
  console.log('\nNote: For Windows .ico file, you may need to use an online converter');
  console.log('or install png-to-ico: npm install -g png-to-ico');
  console.log('Then run: png-to-ico src-tauri/icons/icon.png > src-tauri/icons/icon.ico');
}

generateIcons().catch(console.error);
