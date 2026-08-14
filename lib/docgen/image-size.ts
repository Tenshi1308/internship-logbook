export type ImageDimensions = {
  width: number;
  height: number;
  format: "png" | "jpg";
};

export function getImageDimensions(data: Buffer): ImageDimensions {
  if (data.length >= 24 && data[0] === 0x89 && data[1] === 0x50) {
    return {
      width: data.readUInt32BE(16),
      height: data.readUInt32BE(20),
      format: "png",
    };
  }
  if (data[0] === 0xff && data[1] === 0xd8) {
    return readJpegDimensions(data);
  }
  throw new Error("Unsupported image format for DOCX export");
}

function readJpegDimensions(data: Buffer): ImageDimensions {
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = data[offset + 1];
    if (marker === 0xd8 || marker === 0xd9) {
      offset += 2;
      continue;
    }
    const length = data.readUInt16BE(offset + 2);
    if (
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf)
    ) {
      return {
        width: data.readUInt16BE(offset + 7),
        height: data.readUInt16BE(offset + 5),
        format: "jpg",
      };
    }
    offset += 2 + length;
  }
  throw new Error("Could not read JPEG dimensions for DOCX export");
}

export function scaleToWidth(
  width: number,
  height: number,
  maxWidth: number
): { width: number; height: number } {
  const ratio = maxWidth / width;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
