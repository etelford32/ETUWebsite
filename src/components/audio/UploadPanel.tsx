"use client"

import { useCallback, useRef, useState } from 'react'
import { Loader2, Upload as UploadIcon, X } from 'lucide-react'
import { ApiError, apiSend, putFile } from './api'
import { formatBytes } from './format'
import { Limits, Upload } from './types'

interface Props {
  limits: Limits
  usage: { uploads: number; upload_bytes: number }
  onUploaded: (upload: Upload) => void
}

interface Job {
  id: number
  name: string
  progress: number
  state: 'uploading' | 'checking' | 'failed'
  message?: string
  abort?: () => void
}

const EXTENSIONS = ['mp3', 'ogg', 'wav', 'flac']
const ACCEPT = '.mp3,.ogg,.wav,.flac,audio/mpeg,audio/ogg,audio/wav,audio/flac'

/** How long a local file plays, measured by the browser; null if it can't say. */
function measureDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const probe = new Audio()
    const finish = (value: number | null) => {
      clearTimeout(timer)
      probe.removeAttribute('src')
      URL.revokeObjectURL(url)
      resolve(value)
    }
    const timer = setTimeout(() => finish(null), 6000)
    probe.preload = 'metadata'
    probe.onloadedmetadata = () => finish(Number.isFinite(probe.duration) && probe.duration > 0 ? probe.duration : null)
    probe.onerror = () => finish(null)
    probe.src = url
  })
}

let nextJobId = 1

export default function UploadPanel({ limits, usage, onUploaded }: Props) {
  const [jobs, setJobs] = useState<Job[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  // Uploads already under way count against the quota before the server
  // has seen them finish.
  const reserved = useRef({ count: 0, bytes: 0 })

  const update = useCallback((id: number, changes: Partial<Job>) => {
    setJobs((list) => list.map((job) => (job.id === id ? { ...job, ...changes } : job)))
  }, [])

  const uploadOne = useCallback(
    async (file: File) => {
      const id = nextJobId++
      const fail = (message: string) =>
        setJobs((list) => [...list.filter((j) => j.id !== id), { id, name: file.name, progress: 0, state: 'failed', message }])

      const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
      if (!EXTENSIONS.includes(ext)) return fail('Not an MP3, OGG, WAV or FLAC file.')
      if (file.size > limits.max_upload_bytes) return fail(`Over the ${formatBytes(limits.max_upload_bytes)} limit per track.`)
      if (usage.uploads + reserved.current.count >= limits.max_uploads) return fail(`You already have ${limits.max_uploads} uploads.`)
      if (usage.upload_bytes + reserved.current.bytes + file.size > limits.max_total_upload_bytes) {
        return fail('Not enough upload space left.')
      }

      reserved.current.count++
      reserved.current.bytes += file.size
      setJobs((list) => [...list, { id, name: file.name, progress: 0, state: 'uploading' }])
      let uploadId: string | null = null
      try {
        const duration = await measureDuration(file)
        const slot = await apiSend<{ upload_id: string; upload_url: string; content_type: string }>('POST', '/api/audio/uploads', {
          filename: file.name,
          size: file.size,
        })
        uploadId = slot.upload_id
        await putFile(
          slot.upload_url,
          file,
          slot.content_type,
          (progress) => update(id, { progress }),
          (abort) => update(id, { abort })
        )
        update(id, { state: 'checking', progress: 1, abort: undefined })
        const done = await apiSend<{ upload: Upload }>('POST', `/api/audio/uploads/${slot.upload_id}/complete`, {
          duration_seconds: duration,
        })
        uploadId = null
        setJobs((list) => list.filter((job) => job.id !== id))
        onUploaded(done.upload)
      } catch (error: any) {
        // Give the slot back; the server has already discarded a file it refused.
        if (uploadId) apiSend('DELETE', `/api/audio/uploads/${uploadId}`).catch(() => {})
        if (error instanceof ApiError && error.code === 'aborted') {
          setJobs((list) => list.filter((job) => job.id !== id))
        } else {
          update(id, { state: 'failed', abort: undefined, message: error instanceof ApiError ? error.message : 'The upload failed. Try again.' })
        }
      } finally {
        reserved.current.count--
        reserved.current.bytes -= file.size
      }
    },
    [limits, usage, onUploaded, update]
  )

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      // One at a time: steady progress, and the quota is checked in order.
      for (const file of Array.from(files)) await uploadOne(file)
    },
    [uploadOne]
  )

  const spaceLeft = Math.max(0, limits.max_total_upload_bytes - usage.upload_bytes)
  const full = usage.uploads >= limits.max_uploads || spaceLeft === 0
  const fraction = Math.min(1, usage.upload_bytes / limits.max_total_upload_bytes)
  const busy = jobs.some((job) => job.state !== 'failed')

  if (!limits.uploads_enabled) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5 text-sm text-slate-300">
        Uploads are switched off at the moment. Tracks you already uploaded still play.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          if (!full) setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          if (!full && e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
        }}
        className={`rounded-xl border border-dashed p-5 text-center transition-colors sm:p-6 ${
          dragging ? 'border-cyan-300 bg-cyan-400/10' : 'border-white/20 bg-white/[0.03]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={full || busy}
          className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-2.5 font-display text-xs font-bold uppercase tracking-[0.16em] text-deep-900 transition-transform hover:scale-[1.03] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
        >
          <UploadIcon className="h-4 w-4" /> Upload music
        </button>
        <p className="mt-3 text-sm text-slate-300">
          {full ? 'Your upload space is full. Delete a track to add another.' : 'or drop files here. MP3, OGG, WAV or FLAC, up to ' + formatBytes(limits.max_upload_bytes) + ' each.'}
        </p>

        <div className="mx-auto mt-4 max-w-sm">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-label="Upload space used"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(fraction * 100)}
          >
            <div className={`h-full rounded-full ${fraction > 0.9 ? 'bg-amber-400' : 'bg-cyan-400'}`} style={{ width: `${fraction * 100}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between font-mono text-[11px] text-slate-400">
            <span>
              {usage.uploads} of {limits.max_uploads} tracks
            </span>
            <span>
              {formatBytes(usage.upload_bytes)} of {formatBytes(limits.max_total_upload_bytes)}
            </span>
          </div>
        </div>
      </div>

      {jobs.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {jobs.map((job) => (
            <li key={job.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
              {job.state !== 'failed' && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-cyan-300" />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-slate-100">{job.name}</div>
                {job.state === 'failed' ? (
                  <div className="text-xs text-rose-300">{job.message}</div>
                ) : (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full bg-cyan-400 transition-[width]" style={{ width: `${Math.round(job.progress * 100)}%` }} />
                  </div>
                )}
              </div>
              <span className="shrink-0 font-mono text-xs text-slate-400">
                {job.state === 'uploading' ? `${Math.round(job.progress * 100)}%` : job.state === 'checking' ? 'Checking' : ''}
              </span>
              <button
                type="button"
                onClick={() => (job.abort ? job.abort() : setJobs((list) => list.filter((j) => j.id !== job.id)))}
                disabled={job.state === 'checking'}
                aria-label={job.state === 'failed' ? `Dismiss ${job.name}` : `Cancel ${job.name}`}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-slate-400">
        Uploads are private to your account: only you can play them, here and on your in-game radio. Upload only music you have the right to use.
      </p>
    </div>
  )
}
