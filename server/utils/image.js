const sharp = require('sharp');
const fs = require('fs');

function generateFooterSVG(name, designation, phone, email, textWidth, footerHeight, fontSize) {
  const spacing = fontSize + 2;
  const startX = 5;
  const startY = fontSize ;

  return `
    <svg width="${textWidth}" height="${footerHeight + 6}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .text { font-family: Arial, sans-serif; fill: #292d6c; font-weight: bold; }
        .normal { font-size: ${fontSize}px; }
      </style>
      <text x="${startX}" y="${startY + spacing}"  class="text normal">${name}</text>
      <text x="${startX}" y="${startY + 2.3 * spacing}" class="text normal">${designation} | WealthPlus</text>
      <text x="${startX}" y="${startY + 3.6 * spacing}" class="text normal">Phone: ${phone}</text>
      <text x="${startX}" y="${startY + 4.9 * spacing}" class="text normal">IRDAI  Certified Insurance Advisor</text>
    </svg>
  `;
}

async function processCircularImage(inputPath, outputPath, size) {
  const svgCircle = `
    <svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>
  `;
  await sharp(inputPath)
    .resize(size, size)
    .composite([{ input: Buffer.from(svgCircle), blend: 'dest-in' }])
    .jpeg()
    .toFile(outputPath);
}

async function createFinalPoster({ templatePath, person, logoPath, outputPath }) {
  const templateResized = await sharp(templatePath).resize({ width: 800 }).toBuffer();
  const templateMetadata = await sharp(templateResized).metadata();
  const width = templateMetadata.width;

  const photoSize = Math.floor(width * 0.15);
  const fontSize = Math.floor(photoSize * 0.14);
  const spacing = fontSize + 6;
  const textWidth = width - (photoSize * 2) - 100;

  const footerSVG = generateFooterSVG(
    person.name, person.designation, person.phone, person.email,
    textWidth, spacing * 5, fontSize
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

  const logoSize = Math.floor((photoSize + 10) * 1.15);

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

  const lineWidth = 4;
  const lineHeight = footerHeight - 20;
  const lineBuffer = await sharp({
    create: {
      width: lineWidth,
      height: lineHeight,
      channels: 3,
      background: '#1B75BB'
    }
  }).png().toBuffer();

  const logoLeft = width - logoSize - 60;

  const gradientFooterBuffer = await sharp({
    create: {
      width,
      height: footerHeight,
      channels: 3,
      background: { r: 240, g: 247, b: 255 },
    }
  })
    .composite([
      { input: circularPhoto, top: Math.floor((footerHeight - photoSize) / 2), left: 50 },
      { input: textBuffer, top: Math.floor((footerHeight - textMetadata.height) / 2), left: photoSize + 70 },
      { input: lineBuffer, top: Math.floor((footerHeight - lineHeight) / 2), left: logoLeft - 20 },
      { input: resizedLogo, top: Math.floor((footerHeight - logoSize) / 2), left: logoLeft }
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
  createFinalPoster,
  processCircularImage
};
