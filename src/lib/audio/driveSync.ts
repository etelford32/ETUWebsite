/**
 * AUDIO-02: bring the library in line with a Google Drive folder of audio.
 * Server only. The Drive counterpart of sync.ts; the two sources never touch
 * each other's rows.
 *
 * Files are copied into the private game-audio bucket, so playback, sign-in
 * gating and the game's downloads work exactly as for the repository's
 * audio, and nothing depends on Drive being reachable afterwards.
 *
 *   new file            copied, listed as catalog.ts classifies its folder
 *   changed bytes       copied again; title and visibility stay as they are
 *   renamed             same track; takes the new title
 *   moved to a folder   same track; takes that folder's station
 *   trashed or removed  row marked 'removed', stored copy deleted
 *   back again          copied again, listed as before
 *
 * A track is the Drive file (its id), not its path, so renames and moves
 * keep players' favourites and stations intact.
 *
 * Like the repository sync, one call does a bounded amount of work and
 * reports how many files are still waiting.
 */

import { classifyDrivePath, driveStoragePath } from './catalog'
import { AUDIO_FORMATS, GAME_AUDIO_BUCKET, MAX_CATALOG_UPLOAD_BYTES } from './config'
import { DriveAudioFile, DriveConfig, fetchDriveFile, listDriveAudio } from './drive'
import { audioDurationSeconds, SNIFF_BYTES, sniffAudioFormat } from './inspect'
import { audioDb } from './server'
import { DEFAULT_SYNC_BUDGET, SyncBudget } from './sync'

export interface DriveSyncReport {
  /** Audio files found in the Drive folder. */
  in_source: number
  unchanged: number
  uploaded: string[]
  /** Renamed or moved in Drive; no bytes copied. */
  updated: string[]
  removed: string[]
  skipped: { path: string; reason: string }[]
  remaining: number
}

interface ExistingRow {
  id: string
  drive_file_id: string
  drive_path: string | null
  git_sha: string | null
  storage_path: string
  status: string
}

const fileName = (path: string) => path.split('/').pop() ?? path
const folderOf = (path: string) => path.split('/').slice(0, -1).join('/')

/** What a rename or a move in Drive changes on an existing track. */
function moveChanges(row: ExistingRow, file: DriveAudioFile, track: NonNullable<ReturnType<typeof classifyDrivePath>>) {
  const changes: Record<string, unknown> = {}
  if (row.drive_path === file.path) return changes
  changes.drive_path = file.path
  if (row.drive_path === null) return changes
  if (fileName(row.drive_path) !== fileName(file.path)) changes.title = track.title
  if (folderOf(row.drive_path) !== folderOf(file.path)) {
    changes.kind = track.kind
    changes.category = track.category
  }
  return changes
}

export async function syncDriveAudio(config: DriveConfig, budget: SyncBudget = DEFAULT_SYNC_BUDGET): Promise<DriveSyncReport> {
  const startedAt = Date.now()
  const db = audioDb()
  const report: DriveSyncReport = { in_source: 0, unchanged: 0, uploaded: [], updated: [], removed: [], skipped: [], remaining: 0 }

  const wanted = new Map<string, { file: DriveAudioFile; track: NonNullable<ReturnType<typeof classifyDrivePath>> }>()
  for (const file of await listDriveAudio(config)) {
    const track = classifyDrivePath(file.path)
    if (track) wanted.set(file.id, { file, track })
  }
  report.in_source = wanted.size

  const { data: rows, error } = await db
    .from('audio_tracks')
    .select('id, drive_file_id, drive_path, git_sha, storage_path, status')
    .eq('source', 'drive')
  if (error) throw error
  const existing = new Map<string, ExistingRow>()
  for (const row of (rows ?? []) as ExistingRow[]) existing.set(row.drive_file_id, row)

  // Renames and moves of files whose bytes are already here.
  const pending: { file: DriveAudioFile; track: NonNullable<ReturnType<typeof classifyDrivePath>> }[] = []
  for (const entry of Array.from(wanted.values())) {
    const row = existing.get(entry.file.id)
    if (!row || row.git_sha !== entry.file.md5) {
      pending.push(entry)
      continue
    }
    const changes = moveChanges(row, entry.file, entry.track)
    if (!Object.keys(changes).length) {
      report.unchanged++
      continue
    }
    const { error: moveError } = await db.from('audio_tracks').update(changes).eq('id', row.id)
    if (moveError) report.skipped.push({ path: entry.file.path, reason: `database: ${moveError.message}` })
    else report.updated.push(entry.file.path)
  }

  // Smallest first, so one oversized master can't hold up everything else.
  pending.sort((a, b) => a.file.size - b.file.size)
  let bytesDone = 0
  let waiting = 0
  for (const { file, track } of pending) {
    const path = file.path
    if (file.size > MAX_CATALOG_UPLOAD_BYTES) {
      report.skipped.push({ path, reason: 'larger than 50 MB; export it as MP3 or OGG' })
      continue
    }
    const overBudget =
      report.uploaded.length >= budget.maxFiles ||
      (report.uploaded.length > 0 && bytesDone + file.size > budget.maxBytes) ||
      Date.now() - startedAt > budget.deadlineMs
    if (overBudget) {
      waiting++
      continue
    }

    const bytes = await fetchDriveFile(config, file.id)
    const format = sniffAudioFormat(bytes.subarray(0, SNIFF_BYTES))
    if (!format) {
      report.skipped.push({ path, reason: 'not a readable OGG, WAV, MP3 or FLAC file' })
      continue
    }

    // Stored under what the bytes are, whatever the name says.
    const storagePath = driveStoragePath(file.id, `x.${format}`)
    const mimeType = AUDIO_FORMATS[format]
    const { error: uploadError } = await db.storage
      .from(GAME_AUDIO_BUCKET)
      .upload(storagePath, bytes, { contentType: mimeType, upsert: true, cacheControl: '3600' })
    if (uploadError) {
      report.skipped.push({ path, reason: `storage: ${uploadError.message}` })
      continue
    }

    const measured = {
      git_sha: file.md5,
      storage_path: storagePath,
      mime_type: mimeType,
      bytes: bytes.length,
      duration_seconds: audioDurationSeconds(bytes),
    }
    const row = existing.get(file.id)
    const write = row
      ? db
          .from('audio_tracks')
          .update({
            ...measured,
            ...moveChanges(row, file, track),
            ...(row.status === 'removed' ? { status: track.status } : {}),
          })
          .eq('id', row.id)
      : db.from('audio_tracks').insert({
          ...measured,
          source: 'drive',
          drive_file_id: file.id,
          drive_path: path,
          kind: track.kind,
          category: track.category,
          title: track.title,
          status: track.status,
        })
    const { error: writeError } = await write
    if (writeError) {
      report.skipped.push({ path, reason: `database: ${writeError.message}` })
      continue
    }
    // A file replaced by one of another format leaves its old copy behind.
    if (row && row.storage_path !== storagePath) await db.storage.from(GAME_AUDIO_BUCKET).remove([row.storage_path])
    bytesDone += bytes.length
    report.uploaded.push(path)
  }
  report.remaining = waiting

  // Files that left the folder. git_sha is cleared so a file that comes back
  // (restored from the trash, say) is copied again.
  const gone = Array.from(existing.values()).filter((row) => !wanted.has(row.drive_file_id) && row.status !== 'removed')
  if (gone.length) {
    const { data: goneRows, error: removeError } = await db
      .from('audio_tracks')
      .update({ status: 'removed', git_sha: null })
      .in('id', gone.map((row) => row.id))
      .select('storage_path')
    if (removeError) throw removeError
    await db.storage.from(GAME_AUDIO_BUCKET).remove((goneRows ?? []).map((r: any) => r.storage_path))
    report.removed = gone.map((row) => row.drive_path ?? row.drive_file_id)
  }

  return report
}
