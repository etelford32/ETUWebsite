/**
 * AUDIO-01: recognise an audio file from its bytes and read its length.
 * Pure functions over a byte buffer; no dependencies.
 *
 * `sniffAudioFormat` needs only the first 16 bytes and is what decides
 * whether an upload is kept: the file name and the browser's content type
 * are both claims, the header is not. `audioDurationSeconds` wants the whole
 * file (OGG keeps its length at the end) and returns null when it can't tell.
 */

import type { AudioExtension } from './config'

/** Bytes of the header `sniffAudioFormat` reads. */
export const SNIFF_BYTES = 16

function ascii(bytes: Uint8Array, offset: number, length: number): string {
  if (offset + length > bytes.length) return ''
  let out = ''
  for (let i = 0; i < length; i++) out += String.fromCharCode(bytes[offset + i])
  return out
}

function u32le(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0
}

function u32be(b: Uint8Array, o: number): number {
  return ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0
}

function u16le(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8)
}

/** An ID3v2 tag's total size including its 10-byte header, or 0. */
function id3v2Size(b: Uint8Array): number {
  if (b.length < 10 || ascii(b, 0, 3) !== 'ID3') return 0
  const size = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f)
  return 10 + size + (b[5] & 0x10 ? 10 : 0)
}

/** True when `b[o..]` starts an MPEG audio frame (layer III). */
function isMp3FrameHeader(b: Uint8Array, o: number): boolean {
  if (o + 4 > b.length) return false
  if (b[o] !== 0xff || (b[o + 1] & 0xe0) !== 0xe0) return false
  const version = (b[o + 1] >> 3) & 0x03
  const layer = (b[o + 1] >> 1) & 0x03
  const bitrate = (b[o + 2] >> 4) & 0x0f
  const rate = (b[o + 2] >> 2) & 0x03
  return version !== 1 && layer === 1 && bitrate !== 0 && bitrate !== 15 && rate !== 3
}

/** The format the bytes are, from their header; null if not one we play. */
export function sniffAudioFormat(bytes: Uint8Array): AudioExtension | null {
  if (bytes.length < 12) return null
  if (ascii(bytes, 0, 4) === 'OggS') return 'ogg'
  if (ascii(bytes, 0, 4) === 'fLaC') return 'flac'
  if (ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 4) === 'WAVE') return 'wav'
  if (ascii(bytes, 0, 3) === 'ID3') return 'mp3'
  if (isMp3FrameHeader(bytes, 0)) return 'mp3'
  return null
}

function wavDuration(b: Uint8Array): number | null {
  let offset = 12
  let byteRate = 0
  while (offset + 8 <= b.length) {
    const id = ascii(b, offset, 4)
    const size = u32le(b, offset + 4)
    if (id === 'fmt ' && offset + 20 <= b.length) {
      byteRate = u32le(b, offset + 16)
    } else if (id === 'data') {
      if (!byteRate) return null
      // A streamed WAV may declare 0 or 0xFFFFFFFF; use what is there.
      const available = b.length - (offset + 8)
      const dataBytes = size === 0 || size > available ? available : size
      return dataBytes / byteRate
    }
    offset += 8 + size + (size % 2)
  }
  return null
}

function flacDuration(b: Uint8Array): number | null {
  // STREAMINFO is always the first metadata block, right after 'fLaC'.
  if (b.length < 4 + 4 + 18 || (b[4] & 0x7f) !== 0) return null
  const o = 8
  const sampleRate = (b[o + 10] << 12) | (b[o + 11] << 4) | (b[o + 12] >> 4)
  const totalSamples = (b[o + 13] & 0x0f) * 2 ** 32 + u32be(b, o + 14)
  if (!sampleRate || !totalSamples) return null
  return totalSamples / sampleRate
}

function oggDuration(b: Uint8Array): number | null {
  // Sample rate: the first packet is the Vorbis or Opus identification header.
  const segments = b[26]
  const first = 27 + segments
  let sampleRate = 0
  let preSkip = 0
  if (ascii(b, first + 1, 6) === 'vorbis') {
    sampleRate = u32le(b, first + 12)
  } else if (ascii(b, first, 8) === 'OpusHead') {
    sampleRate = 48000 // Opus granules are always 48 kHz
    preSkip = u16le(b, first + 10)
  }
  if (!sampleRate) return null
  // Length: the granule position of the last page.
  for (let i = b.length - 27; i >= 0; i--) {
    if (b[i] === 0x4f && b[i + 1] === 0x67 && b[i + 2] === 0x67 && b[i + 3] === 0x53) {
      const low = u32le(b, i + 6)
      const high = u32le(b, i + 10)
      if (low === 0xffffffff && high === 0xffffffff) continue // page ends no packet
      const granule = high * 2 ** 32 + low
      return Math.max(0, granule - preSkip) / sampleRate
    }
  }
  return null
}

const MP3_BITRATES_V1 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const MP3_BITRATES_V2 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160]
const MP3_RATES = [44100, 48000, 32000]

function mp3Duration(b: Uint8Array): number | null {
  let offset = id3v2Size(b)
  const limit = Math.min(b.length - 4, offset + 64 * 1024)
  while (offset < limit && !isMp3FrameHeader(b, offset)) offset++
  if (offset >= limit) return null

  const version = (b[offset + 1] >> 3) & 0x03 // 3 = MPEG1, 2 = MPEG2, 0 = MPEG2.5
  const mpeg1 = version === 3
  const bitrate = (mpeg1 ? MP3_BITRATES_V1 : MP3_BITRATES_V2)[(b[offset + 2] >> 4) & 0x0f]
  const baseRate = MP3_RATES[(b[offset + 2] >> 2) & 0x03]
  const sampleRate = version === 3 ? baseRate : version === 2 ? baseRate / 2 : baseRate / 4
  const mono = ((b[offset + 3] >> 6) & 0x03) === 3
  const samplesPerFrame = mpeg1 ? 1152 : 576

  // A VBR file says how many frames it has in a Xing/Info or VBRI header.
  const side = mpeg1 ? (mono ? 17 : 32) : mono ? 9 : 17
  const xing = offset + 4 + side
  const tag = ascii(b, xing, 4)
  if ((tag === 'Xing' || tag === 'Info') && u32be(b, xing + 4) & 0x01) {
    const frames = u32be(b, xing + 8)
    if (frames) return (frames * samplesPerFrame) / sampleRate
  }
  if (ascii(b, offset + 36, 4) === 'VBRI') {
    const frames = u32be(b, offset + 36 + 14)
    if (frames) return (frames * samplesPerFrame) / sampleRate
  }

  // Constant bitrate: the audio bytes over the rate.
  if (!bitrate) return null
  const id3v1 = b.length >= 128 && ascii(b, b.length - 128, 3) === 'TAG' ? 128 : 0
  return ((b.length - offset - id3v1) * 8) / (bitrate * 1000)
}

/** Length of a whole audio file in seconds, to the millisecond; null if unknown. */
export function audioDurationSeconds(bytes: Uint8Array): number | null {
  let seconds: number | null = null
  try {
    switch (sniffAudioFormat(bytes)) {
      case 'wav':
        seconds = wavDuration(bytes)
        break
      case 'flac':
        seconds = flacDuration(bytes)
        break
      case 'ogg':
        seconds = oggDuration(bytes)
        break
      case 'mp3':
        seconds = mp3Duration(bytes)
        break
    }
  } catch {
    seconds = null
  }
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0 || seconds > 24 * 3600) return null
  return Math.round(seconds * 1000) / 1000
}
