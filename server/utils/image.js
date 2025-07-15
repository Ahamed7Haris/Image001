const sharp = require('sharp');
const fs = require('fs');

/**
 * Generates an SVG containing text information.
 *
 * Changes:
 * - Text is now left-aligned ('text-anchor: start').
 * - Text remains vertically centered within the footer area.
 * - Adjusted vertical spacing for the text block to have equal space above and below.
 */
function generateFooterSVG(name, designation, phone, textWidth, footerHeight, fontSize) {
  const spacing = fontSize + 6;
  const totalHeight = spacing * 4; // Total height occupied by the 4 lines of text

  // Calculate the vertical space available above and below the text block
  const verticalPadding = (footerHeight - totalHeight) / 2;

  // The new startY for the first line, ensuring equal padding
  const startY = verticalPadding + fontSize; // Start from the calculated padding + font size for baseline

  return `
    <svg width="${textWidth}" height="${footerHeight}" xmlns="http://www.w3.org/2000/svg">
      <style>
        .text {
          font-family: Arial, sans-serif;
          fill: #292d6c;
          font-weight: bold;
          text-anchor: start; /* Text is left-aligned */
        }
        .normal { font-size: ${fontSize}px; }
      </style>
      <text x="0" y="${startY}" class="text normal">${name}</text>
      <text x="0" y="${startY + spacing}" class="text normal">${designation} | WealthPlus</text>
      <text x="0" y="${startY + 2 * spacing}" class="text normal">Phone: ${phone}</text>
      <text x="0" y="${startY + 3 * spacing}" class="text normal">IRDAI Certified Insurance Advisor</text>
    </svg>
  `;
}

/**
 * Crops an image into a circle.
 */
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

/**
 * Creates the final composite poster.
 */
async function createFinalPoster({ templatePath, person, logoPath, outputPath }) {
  const templateResized = await sharp(templatePath).resize({ width: 800 }).toBuffer();
  const templateMetadata = await sharp(templateResized).metadata();
  const width = templateMetadata.width;

  const photoSize = Math.floor(width * 0.18);
  const fontSize = Math.floor(photoSize * 0.14); // Font size remains slightly larger
  const textWidth = width * 0.40;
  const logoSize = Math.floor(width * 0.15); // Logo size from previous adjustment

  // Ensure footerHeight is sufficiently large to accommodate content
  const requiredTextHeight = (fontSize + 6) * 4; // 4 lines of text with (fontSize + 6) spacing
  const footerHeight = Math.max(photoSize, requiredTextHeight, logoSize) + 20;

  const footerSVG = generateFooterSVG(
    person.name,
    person.designation,
    person.phone,
    textWidth,
    footerHeight, // Pass the calculated footerHeight to generateFooterSVG
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

  const photoLeft = 40;
  const textLeft = photoLeft + photoSize + 20;

  const lineWidth = 4;
  const lineGap = 40;

  const rightSectionStart = textLeft + textMetadata.width;
  const lineX = rightSectionStart + lineGap;

  const spaceAfterLine = width - (lineX + lineWidth);
  const logoXCentered = lineX + lineWidth + (spaceAfterLine - logoSize) / 2;

  const lineY = Math.floor((footerHeight - logoSize) / 2);
  const lineHeight = logoSize; // Keep line height same as logo height for visual alignment

  const lineSVG = `<svg width="${lineWidth}" height="${lineHeight}" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${lineWidth}" height="${lineHeight}" fill="#1B75BB"/></svg>`;
  const lineBuffer = await sharp(Buffer.from(lineSVG)).png().toBuffer();

  const gradientFooterBuffer = await sharp({
    create: {
      width,
      height: footerHeight,
      channels: 3,
      background: { r: 240, g: 247, b: 255 },
    }
  })
    .composite([
      { input: circularPhoto, top: Math.floor((footerHeight - photoSize) / 2), left: photoLeft },
      { input: textBuffer, top: Math.floor((footerHeight - textMetadata.height) / 2), left: textLeft },
      { input: lineBuffer, top: lineY, left: lineX },
      { input: resizedLogo, top: Math.floor((footerHeight - logoSize) / 2), left: logoXCentered },
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