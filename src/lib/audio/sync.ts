/**
 * AUDIO-01: bring `audio_tracks` and the game-audio bucket in line with the
 * game repository's audio folder. Server only.
 *
 * The repository is the source of truth for the game's own audio, in the
 * same way it is for the in-game radio (AUDIOREPO-01, "the radio plays what
 * the repo carries"): commit a track under `assets/audio/music/<state>/`,
 * run a sync, and it is on the website.
 *
 *   new file            uploaded, listed as catalog.ts classifies it
 *   changed file        re-uploaded; its title, description and visibility
 *                       are left as an admin set them
 *   file gone           row marked 'removed', stored copy deleted
 *   file back           uploaded again, listed as before
 *
 * One call does a bounded amount of work (a serverless function has a time
 * limit) and reports how many files are still waiting; the caller repeats
 * until `remaining` is 0.
 */

import { classifyRepoPath, repoStoragePath } from './catalog'
import { GAME_AUDIO_BUCKET, MAX_CATALOG_UPLOAD_BYTES } from './config'
import { fetchRepoBlob, GameRepoConfig, listRepoAudio } from './gameRepo'
import { audioDurationSeconds, SNIFF_BYTES, sniffAudioFormat } from './inspect'
import { audioDb } from './server'

export interface SyncBudget {
  maxFiles: number
  maxBytes: number
  deadlineMs: number
}

export interface SyncReport {
  repo: string
  branch: string
  in_repo: number
  unchanged: number
  uploaded: string[]
  removed: string[]
  skipped: { path: string; reason: string }[]
  remaining: number
}

export const DEFAULT_SYNC_BUDGET: SyncBudget = {
  maxFiles: 30,
  maxBytes: 48 * 1024 * 1024,
  deadlineMs: 40_000,
}

export async function syncGameAudio(config: GameRepoConfig, budget: SyncBudget = DEFAULT_SYNC_BUDGET): Promise<SyncReport> {
  const startedAt = Date.now()
  const db = audioDb()
  const report: SyncReport = {
    repo: config.repo,
    branch: config.branch,
    in_repo: 0,
    unchanged: 0,
    uploaded: [],
    removed: [],
    skipped: [],
    remaining: 0,
  }

  const files = await listRepoAudio(config)
  const wanted = new Map<string, { sha: string; size: number; track: NonNullable<ReturnType<typeof classifyRepoPath>> }>()
  for (const file of files) {
    const track = classifyRepoPath(file.path)
    if (track) wanted.set(track.repo_path, { sha: file.sha, size: file.size, track })
  }
  report.in_repo = wanted.size

  const { data: rows, error } = await db
    .from('audio_tracks')
    .select('id, repo_path, git_sha, status')
    .eq('source', 'repo')
  if (error) throw error
  const existing = new Map<string, { id: string; git_sha: string | null; status: string }>()
  for (const row of rows ?? []) existing.set(row.repo_path, row)

  // Smallest first, so one oversized master can't hold up everything else.
  const pending = Array.from(wanted.entries())
    .filter(([path, file]) => existing.get(path)?.git_sha !== file.sha)
    .sort((a, b) => a[1].size - b[1].size)
  report.unchanged = wanted.size - pending.length

  let bytesDone = 0
  let waiting = 0
  for (const [path, file] of pending) {
    if (file.size > MAX_CATALOG_UPLOAD_BYTES) {
      report.skipped.push({ path, reason: 'larger than 50 MB; convert the master to OGG' })
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

    const bytes = await fetchRepoBlob(config, file.sha)
    const format = sniffAudioFormat(bytes.subarray(0, SNIFF_BYTES))
    if (!format) {
      report.skipped.push({ path, reason: 'not a readable OGG, WAV, MP3 or FLAC file' })
      continue
    }

    const storagePath = repoStoragePath(path)
    const { error: uploadError } = await db.storage
      .from(GAME_AUDIO_BUCKET)
      .upload(storagePath, bytes, { contentType: file.track.mime_type, upsert: true, cacheControl: '3600' })
    if (uploadError) {
      report.skipped.push({ path, reason: `storage: ${uploadError.message}` })
      continue
    }

    const measured = {
      git_sha: file.sha,
      storage_path: storagePath,
      mime_type: file.track.mime_type,
      bytes: bytes.length,
      duration_seconds: audioDurationSeconds(bytes),
    }
    const row = existing.get(path)
    const write = row
      ? db
          .from('audio_tracks')
          .update(row.status === 'removed' ? { ...measured, status: file.track.status } : measured)
          .eq('id', row.id)
      : db.from('audio_tracks').insert({
          ...measured,
          source: 'repo',
          repo_path: path,
          kind: file.track.kind,
          category: file.track.category,
          title: file.track.title,
          status: file.track.status,
        })
    const { error: writeError } = await write
    if (writeError) {
      report.skipped.push({ path, reason: `database: ${writeError.message}` })
      continue
    }
    bytesDone += bytes.length
    report.uploaded.push(path)
  }
  report.remaining = waiting

  // Files that left the repository. git_sha is cleared so a file that comes
  // back is uploaded again.
  const gone = Array.from(existing.entries()).filter(([path, row]) => !wanted.has(path) && row.status !== 'removed')
  if (gone.length) {
    const { error: removeError } = await db
      .from('audio_tracks')
      .update({ status: 'removed', git_sha: null })
      .in('id', gone.map(([, row]) => row.id))
    if (removeError) throw removeError
    await db.storage.from(GAME_AUDIO_BUCKET).remove(gone.map(([path]) => repoStoragePath(path)))
    report.removed = gone.map(([path]) => path)
  }

  return report
}
