const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

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

// PNG to ICO conversion
async function pngToIco(pngPaths) {
  const images = [];
  
  for (const pngPath of pngPaths) {
    const data = fs.readFileSync(pngPath);
    const metadata = await sharp(pngPath).metadata();
    images.push({
      data,
      width: metadata.width,
      height: metadata.height
    });
  }
  
  // ICO header
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);           // Reserved
  header.writeUInt16LE(1, 2);           // Type: 1 = ICO
  header.writeUInt16LE(images.length, 4); // Number of images
  
  // Calculate offsets
  let offset = 6 + (images.length * 16); // Header + directory entries
  const entries = [];
  
  for (const img of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);   // Width
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1); // Height
    entry.writeUInt8(0, 2);             // Color palette
    entry.writeUInt8(0, 3);             // Reserved
    entry.writeUInt16LE(1, 4);          // Color planes
    entry.writeUInt16LE(32, 6);         // Bits per pixel
    entry.writeUInt32LE(img.data.length, 8);  // Size of image data
    entry.writeUInt32LE(offset, 12);    // Offset to image data
    
    entries.push(entry);
    offset += img.data.length;
  }
  
  // Combine all parts
  return Buffer.concat([header, ...entries, ...images.map(img => img.data)]);
}

const iconsDir = path.join(__dirname, '..', 'src-tauri', 'icons');
const sourceImage = path.join(iconsDir, 'ChatGPT Image Dec 13, 2025, 09_16_03 PM.png');

async function generateIco() {
  console.log('🪟 Generating Windows ICO files...');
  
  // Generate PNGs at required sizes for ICO with rounded corners
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const tempPngs = [];
  
  for (const size of sizes) {
    const tempPath = path.join(iconsDir, `temp_${size}.png`);
    const resizedBuffer = await sharp(sourceImage)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    
    const roundedBuffer = await applyRoundedCorners(resizedBuffer, size);
    await sharp(roundedBuffer).toFile(tempPath);
    tempPngs.push(tempPath);
  }
  
  // Create ICO from PNGs
  const icoBuffer = await pngToIco(tempPngs);
  
  // Write ICO files
  fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);
  console.log('  ✅ icon.ico');
  
  fs.writeFileSync(path.join(iconsDir, 'app_icon.ico'), icoBuffer);
  console.log('  ✅ app_icon.ico');
  
  // Cleanup temp files
  for (const tempPath of tempPngs) {
    fs.unlinkSync(tempPath);
  }
  
  // Remove the .png versions we created earlier
  const pngIcoFiles = ['icon.ico.png', 'app_icon.ico.png'];
  for (const file of pngIcoFiles) {
    const filePath = path.join(iconsDir, file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  
  console.log('\n✨ ICO generation complete!');
}

generateIco().catch(console.error);
