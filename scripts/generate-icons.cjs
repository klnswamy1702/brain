// Generate simple placeholder icons for the extension
const { writeFileSync } = require("fs");
const { join } = require("path");

function createPNG(size) {
  // Minimal valid PNG with a colored square
  // PNG header + IHDR + IDAT + IEND
  const width = size;
  const height = size;

  // Create raw pixel data (RGBA)
  const rawData = [];
  for (let y = 0; y < height; y++) {
    rawData.push(0); // filter byte
    for (let x = 0; x < width; x++) {
      // Purple/indigo gradient (#6366f1)
      rawData.push(99);  // R
      rawData.push(102); // G
      rawData.push(241); // B
      rawData.push(255); // A
    }
  }

  // Use zlib to deflate
  const zlib = require("zlib");
  const deflated = zlib.deflateSync(Buffer.from(rawData));

  // Build PNG
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function createChunk(type, data) {
    const typeBuffer = Buffer.from(type, "ascii");
    const lengthBuffer = Buffer.alloc(4);
    lengthBuffer.writeUInt32BE(data.length, 0);
    const combined = Buffer.concat([typeBuffer, data]);
    const crc = crc32(combined);
    const crcBuffer = Buffer.alloc(4);
    crcBuffer.writeUInt32BE(crc, 0);
    return Buffer.concat([lengthBuffer, combined, crcBuffer]);
  }

  // CRC32
  function crc32(buf) {
    let crc = 0xFFFFFFFF;
    const table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    for (let i = 0; i < buf.length; i++) {
      crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const ihdr = createChunk("IHDR", ihdrData);
  const idat = createChunk("IDAT", deflated);
  const iend = createChunk("IEND", Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

const sizes = [16, 48, 128];
const outDir = join(__dirname, "..", "extension", "public", "icons");

for (const size of sizes) {
  const png = createPNG(size);
  writeFileSync(join(outDir, `icon-${size}.png`), png);
  console.log(`Created icon-${size}.png`);
}
