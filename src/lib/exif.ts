export async function extractGpsFromFile(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const buffer = await file.arrayBuffer()
    const view = new DataView(buffer)

    if (view.getUint16(0) !== 0xffd8) return null // Not JPEG

    let offset = 2
    while (offset < view.byteLength) {
      const marker = view.getUint16(offset)
      if (marker === 0xffe1) {
        // APP1 (Exif)
        const length = view.getUint16(offset + 2)
        const exifData = buffer.slice(offset + 4, offset + 2 + length)
        return parseExifGps(exifData)
      }
      offset += 2 + view.getUint16(offset + 2)
    }
  } catch {
    // ignore parse errors
  }
  return null
}

function parseExifGps(data: ArrayBuffer): { lat: number; lng: number } | null {
  const view = new DataView(data)

  // Check "Exif\0\0"
  const exifHeader = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3))
  if (exifHeader !== 'Exif') return null

  const tiffOffset = 6
  const littleEndian = view.getUint16(tiffOffset) === 0x4949

  const ifdOffset = view.getUint32(tiffOffset + 4, littleEndian) + tiffOffset
  const ifdCount = view.getUint16(ifdOffset, littleEndian)

  let gpsOffset: number | null = null

  for (let i = 0; i < ifdCount; i++) {
    const entryOffset = ifdOffset + 2 + i * 12
    const tag = view.getUint16(entryOffset, littleEndian)
    if (tag === 0x8825) {
      // GPS IFD pointer
      gpsOffset = view.getUint32(entryOffset + 8, littleEndian) + tiffOffset
      break
    }
  }

  if (gpsOffset === null) return null

  const gpsCount = view.getUint16(gpsOffset, littleEndian)
  let latRef = '', lngRef = ''
  let latValues: number[] = [], lngValues: number[] = []

  for (let i = 0; i < gpsCount; i++) {
    const entryOffset = gpsOffset + 2 + i * 12
    const tag = view.getUint16(entryOffset, littleEndian)
    const valueOffset = view.getUint32(entryOffset + 8, littleEndian) + tiffOffset

    if (tag === 1) {
      latRef = String.fromCharCode(view.getUint8(entryOffset + 8))
    } else if (tag === 2) {
      latValues = readRationals(view, valueOffset, 3, littleEndian)
    } else if (tag === 3) {
      lngRef = String.fromCharCode(view.getUint8(entryOffset + 8))
    } else if (tag === 4) {
      lngValues = readRationals(view, valueOffset, 3, littleEndian)
    }
  }

  if (latValues.length < 3 || lngValues.length < 3) return null

  let lat = latValues[0] + latValues[1] / 60 + latValues[2] / 3600
  let lng = lngValues[0] + lngValues[1] / 60 + lngValues[2] / 3600

  if (latRef === 'S') lat = -lat
  if (lngRef === 'W') lng = -lng

  return { lat, lng }
}

function readRationals(view: DataView, offset: number, count: number, littleEndian: boolean): number[] {
  const values: number[] = []
  for (let i = 0; i < count; i++) {
    const num = view.getUint32(offset + i * 8, littleEndian)
    const den = view.getUint32(offset + i * 8 + 4, littleEndian)
    values.push(den ? num / den : 0)
  }
  return values
}
