/**
 * Public link to the Explore the Universe 2175 Discord server — the single
 * source for every "Join Discord" link on the site and for the /discord
 * redirect (src/app/discord/route.ts). To change where the site sends
 * people, change it here only. See docs/discord.md.
 *
 * This is a channel link (discord.com/channels/<server>/<channel>): it opens
 * the server for people who are already members, but it does not let a new
 * visitor join. Swap in a permanent invite (https://discord.gg/<code>) when
 * one exists.
 *
 * This is NOT the webhook. The webhook URL is a secret that lives only in
 * the DISCORD_WEBHOOK_URL environment variable and must never appear in
 * client code or in this file.
 */
export const DISCORD_URL =
  'https://discord.com/channels/1425837514635083881/1445823752360296538'
