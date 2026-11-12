# Discord

The site touches Discord in two unrelated ways. They are easy to confuse, and
confusing them is how a secret ended up in a public page once.

| | Community link | Webhook |
|---|---|---|
| What it is | Public URL that sends players to the server | Secret URL the site posts staff notifications to |
| Direction | Site → Discord (people click it) | Site → Discord (server posts to a channel) |
| Where it lives | `DISCORD_URL` in `src/lib/discord.ts` | `DISCORD_WEBHOOK_URL` environment variable |
| Secret? | No | **Yes** — anyone holding it can post to the channel |
| Looks like | `discord.com/channels/…` or `discord.gg/…` | `discord.com/api/webhooks/<id>/<token>` |

## Community link

`DISCORD_URL` in `src/lib/discord.ts` is the only place the link is written.
Everything else imports it:

| Where | What |
|---|---|
| `src/components/Footer.tsx` | "Discord" under Community, on every page |
| `src/app/faq/page.tsx` | "Discord" in the page intro and the "Join Discord" button at the bottom |
| `src/app/alpha-testing/page.tsx` | Link under the Discord username field |
| `src/app/discord/route.ts` | `/discord` → redirects (307) to `DISCORD_URL` |

`https://www.exploretheuniverse2175.com/discord` is the link to hand out
off-site (Steam page, devlogs, social posts, emails): it stays valid when the
target changes.

On-site links use a plain `<a href={DISCORD_URL}>`, not `next/link` to
`/discord`. `next/link` prefetches its target, and prefetching a redirect to
another origin fails.

### Known limitation: it is a channel link, not an invite

The current value is a channel link (`discord.com/channels/<server>/<channel>`).
It opens that channel for people who are **already members**. Someone who has
not joined gets no way in: Discord shows them an empty or "no access" screen.

To let new players join, create an invite that never expires (Discord: Invite
People → Edit invite link → Expire after: Never, Max uses: No limit) and put
the `https://discord.gg/<code>` URL in `DISCORD_URL`. No other file changes.

## Webhook

### What it does

One thing: when someone submits the alpha testing form,
`src/app/api/alpha-testing/submit/route.ts` posts an embed to the webhook's
channel.

- **Contents:** username, email, Discord handle, testing interests, experience
  level, availability, and the free-text answers (each cut to 200 characters).
- **Link back to the site:** the embed title links to `/admin/applications`,
  where staff review and approve the application.
- **The channel must be staff-only.** The embed includes the applicant's email
  address.

The application is saved to the `alpha_applications` table before the webhook
is called, and the webhook can never fail the request:

| Situation | Result |
|---|---|
| `DISCORD_WEBHOOK_URL` not set | Notification skipped, warning in the server log |
| Discord rejects the post (deleted or rotated webhook) | Error in the server log |
| Either of the above | Application still saved; applicant still sees success |

So a broken webhook is silent to users. If applications show up in
`/admin/applications` but not in Discord, check the environment variable first.

### Setting it up

1. Discord: Server Settings → Integrations → Webhooks → New Webhook. Pick the
   staff channel and copy the webhook URL.
2. Vercel: Project → Settings → Environment Variables → add
   `DISCORD_WEBHOOK_URL` for Production (and Preview, if previews should
   notify too).
3. Redeploy. Environment variable changes only apply to new deployments.
4. Local development: put it in `.env.local` (see `.env.example`), or leave it
   out to skip notifications.

### Rotating it

Do this whenever the URL may have been seen by anyone outside the team.

1. Discord: delete the old webhook and create a new one (or regenerate its
   URL). The old URL stops working immediately.
2. Vercel: replace the value of `DISCORD_WEBHOOK_URL`.
3. Redeploy. Until the new deployment is live, notifications fail silently.
4. Test it.

### Testing it

Post directly to the webhook from a shell that has the variable set:

```bash
curl -H "Content-Type: application/json" -d '{"content":"ETU website webhook test"}' "$DISCORD_WEBHOOK_URL"
```

A message appears in the channel and Discord returns `204`. To test the whole
path, submit the form at `/alpha-testing` on the deployed site; this creates a
real row, so remove it from `/admin/applications` afterwards.

### Rules

- The webhook URL goes in the environment variable and nowhere else: not in
  source, not in docs, not in commit messages or PR text.
- Never use it as a link. A page once linked "join our Discord" to the webhook
  URL, which published the token in the client bundle and in git history; that
  webhook has since been replaced.
- It is server-only. Do not give it a `NEXT_PUBLIC_` name.

## Not built yet

Planned work is described in `docs/auth-flow.md` §10: notifications for other
events (signups, approvals, verified Steam owners), Discord sign-in that adds
the player to the server, and role sync for alpha testers and verified owners.
The Discord username on the alpha form is free text; nothing verifies it.
