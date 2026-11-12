/**
 * AUDIO-01: read the game repository's audio folder through the GitHub API.
 * Server only.
 *
 * The game repository is private, so this needs a token with read access to
 * its contents (a fine-grained personal access token scoped to that one
 * repository, "Contents: Read-only"). Nothing is ever written to GitHub.
 */

const API = 'https://api.github.com'

export interface GameRepoConfig {
  /** `owner/name`. */
  repo: string
  branch: string
  /** Folder that holds the game's audio, e.g. `assets/audio`. */
  audioPath: string
  token: string
}

export interface RepoAudioFile {
  /** Path relative to the audio folder. */
  path: string
  /** Git blob sha: changes exactly when the file's bytes change. */
  sha: string
  size: number
}

export class GameRepoError extends Error {
  constructor(
    public code: 'not_configured' | 'unauthorized' | 'not_found' | 'rate_limited' | 'too_large' | 'unavailable',
    message: string
  ) {
    super(message)
  }
}

export function getGameRepoConfig(): GameRepoConfig | null {
  const token = (process.env.GAME_REPO_TOKEN || '').trim()
  if (!token) return null
  const repo = (process.env.GAME_REPO || 'etelford32/ETU').trim()
  const branch = (process.env.GAME_REPO_BRANCH || 'main').trim()
  const audioPath = (process.env.GAME_REPO_AUDIO_PATH || 'assets/audio').trim().replace(/^\/+|\/+$/g, '')
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo) || !branch || !audioPath) return null
  return { repo, branch, audioPath, token }
}

async function github(config: GameRepoConfig, path: string, accept: string): Promise<Response> {
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      headers: {
        Accept: accept,
        Authorization: `Bearer ${config.token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'etu-website-audio-sync',
      },
      cache: 'no-store',
    })
  } catch {
    throw new GameRepoError('unavailable', 'Could not reach GitHub.')
  }
  if (response.ok) return response
  if (response.status === 401) throw new GameRepoError('unauthorized', 'GitHub rejected GAME_REPO_TOKEN.')
  if (response.status === 403 || response.status === 429) {
    const limited = response.headers.get('x-ratelimit-remaining') === '0' || response.status === 429
    throw new GameRepoError(
      limited ? 'rate_limited' : 'unauthorized',
      limited ? 'GitHub rate limit reached; try again later.' : 'GAME_REPO_TOKEN may not read this repository.'
    )
  }
  if (response.status === 404) {
    // GitHub answers 404, not 403, for a private repository the token can't see.
    throw new GameRepoError('not_found', `Not found on GitHub: ${config.repo} (${path.split('?')[0]}).`)
  }
  throw new GameRepoError('unavailable', `GitHub answered ${response.status}.`)
}

function encodePath(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/')
}

/** Every file under the audio folder, at the tip of the configured branch. */
export async function listRepoAudio(config: GameRepoConfig): Promise<RepoAudioFile[]> {
  // The audio folder's tree sha comes from its parent's listing.
  const parts = config.audioPath.split('/')
  const name = parts.pop() as string
  const parent = parts.join('/')
  const listing = await github(
    config,
    `/repos/${config.repo}/contents/${encodePath(parent)}?ref=${encodeURIComponent(config.branch)}`,
    'application/vnd.github+json'
  )
  const entries = await listing.json()
  const folder = Array.isArray(entries) ? entries.find((e: any) => e?.name === name && e?.type === 'dir') : null
  if (!folder?.sha) {
    throw new GameRepoError('not_found', `No folder ${config.audioPath} on ${config.repo}@${config.branch}.`)
  }

  const treeResponse = await github(
    config,
    `/repos/${config.repo}/git/trees/${folder.sha}?recursive=1`,
    'application/vnd.github+json'
  )
  const tree = await treeResponse.json()
  if (tree?.truncated) {
    throw new GameRepoError('too_large', 'The audio folder is too large for one GitHub tree listing.')
  }
  return (Array.isArray(tree?.tree) ? tree.tree : [])
    .filter((e: any) => e?.type === 'blob' && typeof e.path === 'string' && typeof e.sha === 'string')
    .map((e: any) => ({ path: e.path as string, sha: e.sha as string, size: Number(e.size ?? 0) }))
}

/** The bytes of one blob, pinned by sha. */
export async function fetchRepoBlob(config: GameRepoConfig, sha: string): Promise<Uint8Array> {
  if (!/^[0-9a-f]{40,64}$/.test(sha)) throw new GameRepoError('not_found', 'Bad blob sha.')
  const response = await github(config, `/repos/${config.repo}/git/blobs/${sha}`, 'application/vnd.github.raw+json')
  return new Uint8Array(await response.arrayBuffer())
}
