const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const sourceImage = path.join(iconsDir, 'ChatGPT Image Dec 13, 2025, 09_16_03 PM.png');

// Function to create a rounded rectangle mask
function createRoundedMask(width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  const svg = `
    <svg width="${width}" height="${height}">
      <rect x="0" y="0" width="${width}" height="${height}" rx="${r}" ry="${r}" fill="white"/>
    </svg>
  `;
  return Buffer.from(svg);
}

// Function to apply rounded corners to an image
async function applyRoundedCorners(inputBuffer, size, cornerRadiusPercent = 20) {
  const radius = Math.floor(size * (cornerRadiusPercent / 100));
  const mask = createRoundedMask(size, size, radius);
  
  return sharp(inputBuffer)
    .composite([{
      input: mask,
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();
}

// All required icon sizes for Tauri
const iconSizes = [
  // Standard icons
  { name: 'icon.png', size: 512 },
  { name: '32x32.png', size: 32 },
  { name: '128x128.png', size: 128 },
  { name: '128x128@2x.png', size: 256 },
  
  // macOS icons
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
  
  // Windows Store logos
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

// Android icon sizes
const androidSizes = [
  { folder: 'mipmap-hdpi', size: 72 },
  { folder: 'mipmap-mdpi', size: 48 },
  { folder: 'mipmap-xhdpi', size: 96 },
  { folder: 'mipmap-xxhdpi', size: 144 },
  { folder: 'mipmap-xxxhdpi', size: 192 },
];

// iOS icon sizes  
const iosSizes = [
  { name: 'AppIcon-20x20@1x.png', size: 20 },
  { name: 'AppIcon-20x20@2x.png', size: 40 },
  { name: 'AppIcon-20x20@2x-1.png', size: 40 },
  { name: 'AppIcon-20x20@3x.png', size: 60 },
  { name: 'AppIcon-29x29@1x.png', size: 29 },
  { name: 'AppIcon-29x29@2x.png', size: 58 },
  { name: 'AppIcon-29x29@2x-1.png', size: 58 },
  { name: 'AppIcon-29x29@3x.png', size: 87 },
  { name: 'AppIcon-40x40@1x.png', size: 40 },
  { name: 'AppIcon-40x40@2x.png', size: 80 },
  { name: 'AppIcon-40x40@2x-1.png', size: 80 },
  { name: 'AppIcon-40x40@3x.png', size: 120 },
  { name: 'AppIcon-60x60@2x.png', size: 120 },
  { name: 'AppIcon-60x60@3x.png', size: 180 },
  { name: 'AppIcon-76x76@1x.png', size: 76 },
  { name: 'AppIcon-76x76@2x.png', size: 152 },
  { name: 'AppIcon-83.5x83.5@2x.png', size: 167 },
  { name: 'AppIcon-512@2x.png', size: 1024 },
];

async function generateIcons() {
  console.log('🎨 Generating icons from:', sourceImage);
  
  if (!fs.existsSync(sourceImage)) {
    console.error('❌ Source image not found!');
    process.exit(1);
  }

  // Generate main icons
  console.log('\n📦 Generating main icons...');
  for (const icon of iconSizes) {
    const outputPath = path.join(iconsDir, icon.name);
    const resizedBuffer = await sharp(sourceImage)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const roundedBuffer = await applyRoundedCorners(resizedBuffer, icon.size);
    await sharp(roundedBuffer).toFile(outputPath);
    console.log(`  ✅ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Generate Android icons
  console.log('\n🤖 Generating Android icons...');
  const androidDir = path.join(iconsDir, 'android');
  if (!fs.existsSync(androidDir)) fs.mkdirSync(androidDir, { recursive: true });
  
  for (const icon of androidSizes) {
    const folderPath = path.join(androidDir, icon.folder);
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    
    const resizedBuffer = await sharp(sourceImage)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const roundedBuffer = await applyRoundedCorners(resizedBuffer, icon.size);
    
    const outputPath = path.join(folderPath, 'ic_launcher.png');
    await sharp(roundedBuffer).toFile(outputPath);
    console.log(`  ✅ ${icon.folder}/ic_launcher.png (${icon.size}x${icon.size})`);
    
    // Also generate round icons (extra rounded for Android adaptive icons)
    const extraRoundedBuffer = await applyRoundedCorners(resizedBuffer, icon.size, 50);
    const roundOutputPath = path.join(folderPath, 'ic_launcher_round.png');
    await sharp(extraRoundedBuffer).toFile(roundOutputPath);
    console.log(`  ✅ ${icon.folder}/ic_launcher_round.png (${icon.size}x${icon.size})`);
    
    // Foreground icons
    const fgOutputPath = path.join(folderPath, 'ic_launcher_foreground.png');
    await sharp(roundedBuffer).toFile(fgOutputPath);
    console.log(`  ✅ ${icon.folder}/ic_launcher_foreground.png (${icon.size}x${icon.size})`);
  }

  // Generate iOS icons
  console.log('\n🍎 Generating iOS icons...');
  const iosDir = path.join(iconsDir, 'ios');
  if (!fs.existsSync(iosDir)) fs.mkdirSync(iosDir, { recursive: true });
  
  for (const icon of iosSizes) {
    const outputPath = path.join(iosDir, icon.name);
    const resizedBuffer = await sharp(sourceImage)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const roundedBuffer = await applyRoundedCorners(resizedBuffer, icon.size, 22);
    await sharp(roundedBuffer).toFile(outputPath);
    console.log(`  ✅ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Note: Windows ICO will be generated by separate script with rounded corners

  console.log('\n✨ Icon generation complete!');
  console.log('\n⚠️  Note: Run generate-ico.cjs next to create Windows .ico files');
}

generateIcons().catch(console.error);
