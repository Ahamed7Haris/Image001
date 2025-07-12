const sharp = require('sharp');
const fs = require('fs');

// Generate SVG text near circular photo (on the left)
function generateFooterSVG(name, designation, phone, textWidth, footerHeight, fontSize) {
  const spacing = fontSize + 6;
  const totalHeight = spacing * 3;
  const centerY = footerHeight / 2 - totalHeight / 2;
  const startX = 0;
  console.log(name, designation, phone, textWidth, footerHeight, fontSize);

  return `
    <svg width="${textWidth}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradText" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#1B75BB; stop-opacity:1" />
          <stop offset="100%" style="stop-color:#252A78; stop-opacity:1" />
        </linearGradient>
      </defs>
      <style>
        .text { font-family: Arial, sans-serif; fill: url(#gradText); font-weight: bold; text-anchor: start; }
        .normal { font-size: ${fontSize}px; }
      </style>
      <text x="${startX}" y="${centerY + spacing * 0}" class="text normal">${name.toUpperCase()}</text>
      <text x="${startX}" y="${centerY + spacing * 1}" class="text normal">Designation: ${designation}</text>
      <text x="${startX}" y="${centerY + spacing * 2}" class="text normal">Phone No: ${phone}</text>
    </svg>
  `;
}

async function processCircularImage(inputPath, outputPath, size) {
  const circleMask = Buffer.from(
    `<svg width="${size}" height="${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/>
    </svg>`
  );

  const buffer = await sharp(inputPath)
    .resize(size, size)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .jpeg()
    .toBuffer();

  fs.writeFileSync(outputPath, buffer);
}

async function createFinalPoster({ templatePath, person, logoPath, outputPath }) {
  const templateResized = await sharp(templatePath).resize({ width: 800 }).toBuffer();
  const templateMetadata = await sharp(templateResized).metadata();
  const width = templateMetadata.width;

  const photoSize = Math.floor(width * 0.18); // Bigger user photo
  const fontSize = Math.floor(photoSize * 0.14);
  const spacing = fontSize + 6;
  const textWidth = width * 0.35;
  const logoSize = Math.floor(width * 0.13);

  const footerSVG = generateFooterSVG(
    person.name,
    person.designation,
    person.phone,
    textWidth,
    photoSize,
    fontSize
  );

  const textBuffer = await sharp(Buffer.from(footerSVG)).png().toBuffer();
  const textMetadata = await sharp(textBuffer).metadata();

  const circularPhoto = await sharp(person.photo)
    .resize(photoSize, photoSize)
    .composite([{
      input: Buffer.from(
        `<svg><circle cx="${photoSize / 2}" cy="${photoSize / 2}" r="${photoSize / 2}" fill="white"/></svg>`
      ),
      blend: 'dest-in'
    }])
    .png()
    .toBuffer();

  const resizedLogo = await sharp(logoPath)
    .resize({
      width: logoSize,
      height: logoSize,
      fit: 'contain',
      background: { r: 240, g: 247, b: 255 }
    })
    .flatten({ background: { r: 240, g: 247, b: 255 } })
    .jpeg()
    .toBuffer();

  const footerHeight = Math.max(photoSize, textMetadata.height, logoSize) + 20;

  const gradientFooterBuffer = await sharp({
    create: {
      width,
      height: footerHeight,
      channels: 3,
      background: { r: 240, g: 247, b: 255 },
    }
  })
    .composite([
      // Left circular photo
      { input: circularPhoto, top: Math.floor((footerHeight - photoSize) / 2), left: 40 },
      // Text beside circular photo
      { input: textBuffer, top: Math.floor((footerHeight - textMetadata.height) / 2), left: 40 + photoSize + 20 },
      // Right logo
      { input: resizedLogo, top: Math.floor((footerHeight - logoSize) / 2), left: width - logoSize - 40 },
    ])
    .jpeg()
    .toBuffer();

  const finalImageBuffer = await sharp({
    create: {
      width,
      height: templateMetadata.height + footerHeight,
      channels: 3,
      background: '#ffffff'
    }
  })
    .composite([
      { input: templateResized, top: 0, left: 0 },
      { input: gradientFooterBuffer, top: templateMetadata.height, left: 0 }
    ])
    .jpeg()
    .toBuffer();

  fs.writeFileSync(outputPath, finalImageBuffer);
}

module.exports = {
  generateFooterSVG,
  processCircularImage,
  createFinalPoster,
};
