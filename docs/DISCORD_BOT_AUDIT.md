# Discord Bot vs Telegram Bot – Feature Audit

Deep dive of all Telegram bot features and commands, and their Discord parity status.

---

## 1. Slash commands (Discord) vs /commands (Telegram)

| Command | Telegram | Discord | Notes |
|--------|----------|---------|--------|
| **start** | ✅ handleStartCommand; raid deep link `/start raid_xxx` | ✅ handleStart | Discord: no raid deep link; use `/raids` + Complete button |
| **link** | ✅ handleLinkCommand | ✅ handleLink | Same: link Aquads username to platform |
| **help** | ✅ handleHelpCommand + 6 submenus | ✅ handleHelp + 6 submenus | Discord now has help_branding, help_quickstart |
| **twitter** | ✅ handleTwitterCommand | ✅ handleTwitter | Set/view Twitter username |
| **facebook** | ✅ handleFacebookCommand | ✅ handleFacebook | Set/view Facebook username |
| **raids** | ✅ handleRaidsCommand | ✅ handleRaids | List raids + Complete buttons → modal |
| **complete** | ✅ handleCompleteCommand + startRaidCompletion flow | ✅ handleCompleteSlash + modal | Discord: slash args or button → modal |
| **bubbles** | ✅ handleBubblesCommand → sendTopBubblesNotification | ✅ handleBubbles | Top 10 bubbles (text/embed) |
| **mybubble** | ✅ handleMyBubbleCommand (with vote buttons) | ✅ handleMyBubble | Discord: no vote buttons (vote on website) |
| **createraid** | ✅ handleCreateRaidCommand | ✅ handleCreateRaid | Same logic; Discord passes discordSource* for notifications |
| **cancelraid** | ✅ handleCancelRaidCommand | ✅ handleCancelRaid | Same |
| **raidin** | ✅ handleRaidInCommand (raidCrossPostingGroups) | ✅ handleRaidIn | Community opt-in only; no channel reg |
| **raidout** | ✅ handleRaidOutCommand | ✅ handleRaidOut | Community opt-out only; stays in discordRaidChannels |
| **setbranding** | ✅ + photo upload state | ✅ handleSetBranding | Discord: points to website (no upload in bot) |
| **removebranding** | ✅ handleRemoveBrandingCommand | ✅ handleRemoveBranding | Same |
| **boostvote** | ✅ full flow (packages → bubble → TG link → payment) | ✅ handleBoostVote | Discord: embed + link to website |
| **cancel** | ✅ clear conversation state | ✅ handleCancel | Same |

All 16 commands are present on Discord; a few are simplified (branding, boost) and direct users to the website where needed.

---

## 2. Help menu (callback buttons)

| Section | Telegram | Discord |
|---------|----------|---------|
| help_account | ✅ editHelpAccount | ✅ |
| help_raids | ✅ editHelpRaids | ✅ |
| help_bubbles | ✅ editHelpBubbles | ✅ |
| help_branding | ✅ editHelpBranding | ✅ (added) |
| help_quickstart | ✅ editHelpQuickStart → onboarding | ✅ (added, text-only) |
| help_all | ✅ editHelpAll | ✅ |
| help_menu (back) | ✅ editHelpMenu | ✅ |

Discord help menu now matches Telegram (all 6 sections + back).

---

## 3. Raid completion flow

| Step | Telegram | Discord |
|------|----------|---------|
| List raids | /raids → messages + “Complete in Private Chat” / callback | /raids → embed + “Complete” buttons |
| Start completion | /start raid_xxx or callback complete_raidId | Button → modal (username + post_url) |
| Username prompt | conversation state waiting_username | Modal fields (no separate message state) |
| Submit | completeRaidWithStoredUsername / handleUsernameInput | handleCompleteFromModal |
| Points/DB | Same (completion pushed, telegramService.sendRaidCompletionNotification) | Same + Discord notifications |

Discord uses modal in one step instead of multi-message flow; outcome is the same (completion stored, notifications sent).

---

## 4. Notifications

| Type | Telegram | Discord | Logic |
|------|----------|---------|--------|
| **New raid (user)** | sendRaidNotification → source + raidCrossPostingGroups | sendRaidNotificationToChannel → discordSourceChannelId + getDiscordCommunityRaidChannelIds() | ✅ Same: creator’s server + opted-in only |
| **New raid (admin)** | sendRaidNotification → activeGroups | sendRaidNotificationToChannel → getDiscordRaidChannelIds() | ✅ All servers with bot |
| **Raid completion** | sendRaidCompletionNotificationInternal → activeGroups | sendRaidCompletionToChannel → getDiscordRaidChannelIds() | ✅ All servers |
| **Vote** | sendVoteNotificationToGroupInternal → project group + trending | sendVoteNotificationToChannel → DISCORD_VOTE_CHANNEL_ID | ✅ Optional single channel |
| **Top bubbles** | sendTopBubblesNotification (on /bubbles or admin) | sendTopBubblesToChannel → DISCORD_BUBBLES_CHANNEL_ID | ✅ Optional single channel |

Admin vs community raid logic is correctly mirrored (admin → all channels; user → source + community-only).

---

## 5. Channel / server registration

| Concept | Telegram | Discord |
|---------|----------|---------|
| **Who gets notifications** | activeGroups (any group with bot) + raidCrossPostingGroups (/raidin) | discordRaidChannels (bot added) + discordRaidInGuilds (/raidin) |
| **Register on add** | activeGroups when message in group | guildCreate → discordRaidChannels + discordRaidInGuilds |
| **Unregister on remove** | (manual / kick) | guildDelete → remove from both |
| **/raidin** | Add to raidCrossPostingGroups only | Add to discordRaidInGuilds only (no channel write) |
| **/raidout** | Remove from raidCrossPostingGroups only | Remove from discordRaidInGuilds only (stay in discordRaidChannels) |

Behavior matches: raidin/raidout only control community cross-posting; everyone with the bot gets completions and own raids.

---

## 6. Intentionally different or N/A on Discord

| Feature | Telegram | Discord | Reason |
|---------|----------|---------|--------|
| **Vote buttons (bullish/bearish)** | Buttons on /mybubble → processVote | No buttons | Voting on website; avoids duplicate logic and Discord rate limits |
| **Boost full flow** | Package → bubble → TG group link → payment/TX | Link to website | Payment flow lives on site; Discord links there |
| **Branding image upload** | Photo in chat → handleBrandingImageUpload | /setbranding points to website | Upload handled on aquads.xyz |
| **Auto-create raid from pasted URL** | Message without / → handleCreateRaidCommand | Not implemented | Would need Message Content intent and messageCreate handler |
| **Onboarding wizard** | onboard_* callbacks, multi-step | /start + /help quickstart | Simpler: link + help; no full wizard |
| **Daily engagement (message/reaction points)** | handleEngagementMessage, handleEngagementReaction | N/A | Telegram-specific; no Discord equivalent implemented |
| **/start raid_xxx deep link** | startRaidCompletion(chatId, userId, raidId) | N/A | Discord uses “Complete” button → modal instead |
| **Scheduled/cron (daily bubble summary, GM message, admin reminder)** | sendDailyBubbleSummary etc. | Not mirrored | Could add later if Discord channels are configured |

These are either simplified by design (branding, boost, onboarding) or platform-specific (engagement, deep links).

---

## 7. Checklist summary

- **Commands:** All 16 commands implemented on Discord (some simplified).
- **Help:** All 6 help sections + back (including branding and quickstart).
- **Raid flow:** Create, list, complete, cancel; community vs admin notification logic correct.
- **Notifications:** New raid (admin + user), completion, vote, top bubbles; Discord channels/env used correctly.
- **Registration:** Bot add/remove and raidin/raidout only affect community cross-posting; no conflict with channel registration.
- **Gaps (by design):** Vote in-chat, boost purchase, branding upload, auto-create from URL, full onboarding, daily engagement, raid deep link, scheduled messages.

Nothing critical is missing for parity where Discord can reasonably mirror Telegram; remaining gaps are either intentional simplifications or platform-specific features.
