# Delta Air Lines PTFS Bot

The main Discord bot for Delta Air Lines PTFS. One command safely previews and creates the server's role and channel layout.

## Proposed role hierarchy

Running `/setup mode:Preview only section:Roles and categories/channels` shows the complete role and channel plan without changing the server. Roles are created in this top-to-bottom hierarchy:

```text
  @Chief Executive Officer | Delta PTFS
  @Chief Operating Officer | Delta PTFS
  @Chief Administrative Officer | Delta PTFS
  @Chief Flight Operations Officer | Delta PTFS
  @Chief Human Resources Officer | Delta PTFS
  @━━ BOARD OF DIRECTORS ━━
  @Chief of Staff | Delta PTFS
  @Chief of Corporate Affairs | Delta PTFS
  @Chief of Safety | Delta PTFS
  @━━ LEADERSHIP ━━
  @Senior High Rank | Delta PTFS
  @Lead of Cabin Crew Department | Delta PTFS
  @Lead of Flight Deck Department | Delta PTFS
  @Lead of ATC Department | Delta PTFS
  @Lead of Ground Operations Department | Delta PTFS
  @━━ EXECUTIVES ━━
  @Operations Manager | Delta PTFS
  @Department Manager | Delta PTFS
  @Assistant Department Manager | Delta PTFS
  @Supervisor | Delta PTFS
  @━━ MIDDLE RANK ━━
  @Senior Administration | Delta PTFS
  @Administration | Delta PTFS
  @Senior Moderation | Delta PTFS
  @Moderation | Delta PTFS
  @━━ SERVER ADMINISTRATION ━━
  @Chief Pilot | Delta PTFS
  @Captain | Delta PTFS
  @First Officer | Delta PTFS
  @Air Traffic Control | Delta PTFS
  @Cabin Crew | Delta PTFS
  @Ground Crew | Delta PTFS
  @━━ FLIGHT OPERATIONS ━━
  @Diamond Medallion | Delta PTFS
  @Platinum Medallion | Delta PTFS
  @Gold Medallion | Delta PTFS
  @Silver Medallion | Delta PTFS
  @SkyMiles Member | Delta PTFS
  @━━ SKYMILES MEMBERS ━━
  @Passenger | Delta PTFS
  @Aviation Enthusiast | Delta PTFS
  @Guest | Delta PTFS
  @━━ COMMUNITY ━━
  @Delta Virtual Assistant | Delta PTFS
  @━━ APPLICATION ━━
```

Each `━━ CATEGORY ━━` separator is a real Discord role placed below the roles in its section, as requested. Setup explicitly resets the positions on every run, so existing server roles or Discord's default role-creation position cannot accidentally move a separator above its members. Every member role and separator has its own unique, explicit hexadecimal color. Chief positions are grouped under the Board of Directors and Leadership sections; department leads are grouped under Executives. Senior Administration and Administration receive management permissions, while Senior Moderation and Moderation receive appropriately limited member-moderation permissions. Other roles are organizational and do not receive elevated Discord permissions. The bot assigns itself the `Delta Virtual Assistant | Delta PTFS` role during setup. Discord will not allow the bot to create or assign roles above its own highest managed role, so place the bot's managed integration role near the top before applying the setup.

### Tracking SkyMiles professionally

The role ladder matches the current public Medallion order: **SkyMiles Member → Silver → Gold → Platinum → Diamond**. Million Miler is a separate lifetime recognition program, not a Medallion tier, so it is not included in this progression.

Google Sheets is the source of truth; the bot only sends approved ledger entries to the sheet and reads balances or the leaderboard back from it. Do not collect members' Delta passwords or attempt to sign in to their real accounts. Real redeemable SkyMiles and Medallion qualification are controlled by Delta and should not be copied or presented as balances issued by this virtual airline.

The repository includes a ready-to-deploy Apps Script in `integrations/google-apps-script.gs`. To connect it later:

1. Create a private Google Sheet, open **Extensions → Apps Script**, and paste the supplied script.
2. In **Project Settings → Script Properties**, add `WEBHOOK_SECRET` with a long random value.
3. Select **Deploy → New deployment → Web app**, execute it as yourself, and allow access to anyone with the URL. The shared secret still protects every operation.
4. Copy the `/exec` deployment URL into `GOOGLE_SHEETS_WEBHOOK_URL` on the bot host.
5. Put the same random value in `GOOGLE_SHEETS_WEBHOOK_SECRET` on the bot host and restart it.

The script creates a `SkyMiles Ledger` tab automatically. Each award is an append-only row containing timestamp, Discord user ID, display name, miles, flight ID, reason, and awarding staff ID. Keep the spreadsheet private and protect the ledger from manual edits.

Once connected, members can use `/skymiles balance` and `/skymiles leaderboard`. Members with **Manage Server** can use `/skymiles award` with a negative amount for an audited correction. If the two Google variables are absent, these commands return a setup message without changing anything.

When the program outgrows Sheets, move the same workflow to a dedicated website with Discord OAuth, a database-backed flight ledger, staff approval pages, and an audit history. Keep Discord roles as the display layer—not the source of truth. In either approach, label points as **virtual airline points** rather than real Delta SkyMiles unless Delta has explicitly authorized the integration.

## Proposed server layout

The same command includes this channel plan:

```text
WELCOME CENTER
  # welcome
  # rules
  # announcements
  # roles
  # faq

FLIGHT OPERATIONS (private; visible to management, staff, and flight roles)
  # flight-schedule
  # flight-status
  # book-a-flight
  # check-in
  # route-map

COMMUNITY
  # general
  # aviation-chat
  # photos-and-media
  # bot-commands
  🔊 Community Lounge

AIR TRAFFIC CONTROL
  # atc-information
  🔊 IRFD TWR [123.456]
  🔊 IPPH TWR [123.457]
  🔊 IZOL TWR [123.458]
  🔊 ITKO TWR [123.459]
  🔊 IBTH TWR [123.460]
  🔊 ISAB TWR [123.461]

CREW OPERATIONS (private; visible to management, staff, and flight roles)
  # pilot-briefing
  # atc-coordination
  # crew-chat
  # flight-logs
  🔊 Operations Room

SUPPORT
  # help-desk
  # suggestions

VOICE CHANNELS
  🔊 Pre-flight Briefing
  🔊 Gate A
  🔊 Gate B
  🔊 ATC Tower

AIRPORT FREQUENCY CATEGORIES (kept at the bottom)
  IRFD FREQUENCIES
    🔊 IRFD_DEL [121.750]
    🔊 IRFD_GND [121.900]
    🔊 IRFD_TWR [118.100]
    🔊 IRFD_APP [120.550]
  ...one category for every other airport, plus UNICOM
```

The apply operation is idempotent: running it again skips matching channels and roles rather than duplicating them. It synchronizes private category permissions each time. Community and SkyMiles roles cannot see Flight Operations or Crew Operations; the explicitly listed board, leadership, executive, middle-rank, administration, moderation, and flight roles can see both.

Every airport has its own bottom-of-server frequency category containing its DEL, GND, TWR, and APP channels where available. FORD and QE contain their TWR and APP channels, while UNICOM has its own category. Everyone can connect and listen. Only **Chief Pilot**, **Captain**, **First Officer** (co-pilot), and **Air Traffic Control** can speak; listeners cannot use voice chat, soundboards, streaming, activities, reactions, threads, or application commands in those channels. Applying the layout also migrates and removes the earlier `ATC FREQUENCIES 1` and `ATC FREQUENCIES 2` categories. Run `/bot-version` after deployment and confirm it reports **v2.1.0** before applying the layout.

## Hosting configuration

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Environment variable:** `DISCORD_TOKEN` (set this to the token from the Discord Developer Portal; never commit it)
- **Optional Sheets variables:** `GOOGLE_SHEETS_WEBHOOK_URL` and `GOOGLE_SHEETS_WEBHOOK_SECRET`
- **Optional info banner variables:** `INFO_WELCOME_BANNER_URL`, `INFO_RULES_BANNER_URL`, `INFO_NOTIFICATIONS_BANNER_URL`, `INFO_EVENTS_BANNER_URL`, `INFO_FLIGHT_OPERATIONS_BANNER_URL`, and `INFO_ASSISTANCE_BANNER_URL`
- **Roblox role-sync variable:** `ROBLOX_COMMUNITY_ID` (the numeric ID for the [Delta Roblox Community](https://www.roblox.com/share/g/650682730))
- **Port:** use the host-provided `PORT` value; locally it defaults to `3000`
- **Runtime:** Node.js 20 or later

The bot starts a small HTTP health server immediately so web-service hosts can detect its port while Discord connects. `GET /` returns deployment status with HTTP 200, and `GET /health` returns HTTP 200 only after Discord is ready. Configure the hosting health-check path as `/health`. Do not hard-code a production port—the bot automatically reads the platform's `PORT` environment variable.

If your host supports background workers, that service type also works and does not require a port. On hosts that report **“No open ports detected,”** deploy this repository as a web service with the commands above; the included health server satisfies the port requirement.

When inviting the bot, include the `bot` and `applications.commands` scopes. The bot needs **Manage Channels** and **Manage Roles** permissions to apply the layout.

If Discord returns code `50013`, setup now reports the exact role, category, channel, or permission update that Discord denied. A `50013` during role ordering or assignment is treated as a warning so channel creation can continue. Discord's Administrator permission does not bypass role hierarchy: the bot's managed role must still be above every role it needs to create, assign, or reorder.

## Use

1. Start the bot and wait for its ready message.
2. Run `/setup mode:Preview only section:Roles and categories/channels` to review all roles and channels.
3. Run `/setup mode:Apply layout section:Roles and categories/channels` to create both systems in one operation.

Only members with **Manage Server** can see and run this command. Responses are private to the person running it.

## Local development

```bash
cp .env.example .env
npm install
npm run build
npm test
npm start
```

## Information sequence

Members with **Manage Server** can run `/info` in the destination channel. The bot posts six standalone public messages without replying to another public message. Each message contains its title, body, and matching banner in the same Discord message. The Flight Operations message uses the Flight Operations banner, while the Assistance message uses the SkyTeam banner. Divider instructions are never posted.

Each standalone message uses one Discord embed containing its title, existing Delta Air Lines PTFS wording, and matching banner. The embed uses Delta navy (`#071D49`) for its accent color. The added divider line has been removed. Discord renders a full-width embed image after the embed description, keeping the banner and information inside the same card and message.

Information messages automatically look up the server's custom emoji by name and send Discord's complete `<:name:id>` representation, which is required for bot-authored messages. The sequence uses `information`, `rules`, `roles`, `events`, `support`, `feedback`, and the updated `skyteamlogo` name. If any custom emoji is unavailable, the bot substitutes a standard Unicode emoji so the message never shows a broken `:name:` label. The Flight Operations heading uses the renamed `support` emoji.

The command has six optional attachment fields named **welcome**, **community-rules**, **notifications**, **events**, **flight-operations**, and **skyteam**. Upload the supplied image in its matching field when running `/info`; the bot includes it in that section's embed. A command upload takes priority over a configured banner URL.

For repeat use without selecting the files each time, upload the banners somewhere Discord can display them, such as a private Discord channel/CDN link or your hosting provider's static files, then set these environment variables. To keep PRs compatible with GitHub's web editor and conflict resolver, banner image files are not committed to the repository:

```env
INFO_WELCOME_BANNER_URL=https://example.com/welcome.png
INFO_RULES_BANNER_URL=https://example.com/community-rules.png
INFO_NOTIFICATIONS_BANNER_URL=https://example.com/notifications.png
INFO_EVENTS_BANNER_URL=https://example.com/events.png
INFO_FLIGHT_OPERATIONS_BANNER_URL=https://example.com/flight-operations.png
INFO_ASSISTANCE_BANNER_URL=https://example.com/skyteam.png
```

If neither a command upload nor a banner URL is available, `/info` still posts the matching text message and privately reports which banner variables need to be added. This avoids large Base64 asset conflicts like `assets/info/welcome.png.base64` and `assets/info/skyteam.png.base64`, which GitHub often cannot resolve in the web editor.

## Roblox Community role synchronization

The captcha and Roblox OAuth verification panel have been removed. Discord roles can instead mirror ranks from the [Delta Roblox Community](https://www.roblox.com/share/g/650682730). Set `ROBLOX_COMMUNITY_ID` to the Community's numeric group ID (open the share link and copy the ID from the resulting Community URL), then restart the bot.

Roblox rank names must match Discord role names. For example, Roblox rank `Captain` maps to `Captain | Delta PTFS`. The bot removes other Discord roles whose names match ranks in that same Roblox Community, then grants the member's current rank. It never changes unrelated Discord roles.

1. A Board of Directors or Leadership member runs `/update user-role user:@Member roblox-username:ExactRobloxName` once. This records the approved Roblox username as the member's server nickname and synchronizes their role.
2. The member can later run `/getrole` with no options. The bot uses the Leadership-approved server nickname and fetches their current Roblox Community rank.
3. Leadership cannot update a member whose highest Discord role is equal to or above theirs, or another member in their own configured division.

This is an administrative rank-sync workflow, not account-ownership verification. Leadership must confirm the Roblox username belongs to the selected Discord member before approving the first update. The bot needs **Manage Roles** and **Manage Nicknames**, and its role must be above every role/member it changes. Public Roblox endpoints are used only to resolve the username and read Community membership; no Roblox password, cookie, OAuth secret, or API key is collected.

The `/setup` command has separate `mode` and `section` choices. Choose **Roles only**, **Categories and channels only**, or **Roles and categories/channels** in either preview or apply mode. Existing unbranded member roles are renamed to `[Role Name] | Delta PTFS`; separator roles such as `━━ LEADERSHIP ━━` retain their separator names.

### ATC voice permissions

Every airport frequency channel receives explicit permission overwrites for every configured member role. Board, Leadership, Executive, Middle Rank, Server Administration, and all Flight Operations roles can connect and speak. Air Traffic Control additionally receives Discord's **Priority Speaker** permission. SkyMiles and Community roles can see and join the channels but cannot speak. Streaming/video, soundboards, external sounds, and embedded activities are disabled for everyone in ATC frequency channels. Running the channels section of `/setup` again synchronizes these settings on existing channels.
