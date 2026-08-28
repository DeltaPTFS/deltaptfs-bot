# Delta Airlines Bot

The main Discord bot for Delta Airlines. One command safely previews and creates the server's role and channel layout.

## Proposed role hierarchy

Running `/setup mode:Preview only section:Roles and categories/channels` shows the complete role and channel plan without changing the server. Roles are created in this top-to-bottom hierarchy:

```text
  @Chief Executive Officer | Delta Air Lines
  @Chief Operating Officer | Delta Air Lines
  @Chief Administrative Officer | Delta Air Lines
  @Chief Flight Operations Officer | Delta Air Lines
  @Chief Human Resources Officer | Delta Air Lines
  @━━ BOARD OF DIRECTORS ━━
  @Chief of Staff | Delta Air Lines
  @Chief of Corporate Affairs | Delta Air Lines
  @Chief of Safety | Delta Air Lines
  @━━ LEADERSHIP ━━
  @Senior High Rank | Delta Air Lines
  @Lead of Cabin Crew Department | Delta Air Lines
  @Lead of Flight Deck Department | Delta Air Lines
  @Lead of ATC Department | Delta Air Lines
  @Lead of Ground Operations Department | Delta Air Lines
  @Lead of Marketing Department | Delta Air Lines
  @Lead of External Affairs Department | Delta Air Lines
  @━━ EXECUTIVES ━━
  @Operations Manager | Delta Air Lines
  @Department Manager | Delta Air Lines
  @Assistant Department Manager | Delta Air Lines
  @Supervisor | Delta Air Lines
  @━━ MIDDLE RANK ━━
  @Marketing Manager | Delta Air Lines
  @External Affairs Manager | Delta Air Lines
  @Public Relations Manager | Delta Air Lines
  @Marketing Coordinator | Delta Air Lines
  @External Affairs Coordinator | Delta Air Lines
  @Community Relations Specialist | Delta Air Lines
  @━━ MARKETING & EXTERNAL AFFAIRS ━━
  @Senior Administration | Delta Air Lines
  @Administration | Delta Air Lines
  @Senior Moderation | Delta Air Lines
  @Moderation | Delta Air Lines
  @━━ SERVER ADMINISTRATION ━━
  @Chief Pilot | Delta Air Lines
  @Captain | Delta Air Lines
  @First Officer | Delta Air Lines
  @Air Traffic Control | Delta Air Lines
  @Cabin Crew | Delta Air Lines
  @Ground Crew | Delta Air Lines
  @━━ FLIGHT OPERATIONS ━━
  @Diamond Medallion | Delta Air Lines
  @Platinum Medallion | Delta Air Lines
  @Gold Medallion | Delta Air Lines
  @Silver Medallion | Delta Air Lines
  @SkyMiles Member | Delta Air Lines
  @━━ SKYMILES MEMBERS ━━
  @Authenticated | Delta Air Lines
  @Unauthenticated | Delta Air Lines
  @Passenger | Delta Air Lines
  @Aviation Enthusiast | Delta Air Lines
  @Guest | Delta Air Lines
  @━━ COMMUNITY ━━
  @Delta Virtual Assistant | Delta Air Lines
  @━━ APPLICATION ━━
```

Each `━━ CATEGORY ━━` separator is a real Discord role placed below the roles in its section, as requested. Setup explicitly resets the positions on every run, so existing server roles or Discord's default role-creation position cannot accidentally move a separator above its members. Every member role and separator has its own unique, explicit hexadecimal color. Chief positions are grouped under the Board of Directors and Leadership sections; department leads are grouped under Executives. Senior Administration and Administration receive management permissions, while Senior Moderation and Moderation receive appropriately limited member-moderation permissions. Other roles are organizational and do not receive elevated Discord permissions. The bot assigns itself the `Delta Virtual Assistant | Delta Air Lines` role during setup. Discord will not allow the bot to create or assign roles above its own highest managed role, so place the bot's managed integration role near the top before applying the setup.

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
INFORMATION CENTER
  # information (visible while unauthenticated)
  # rules
  # announcements
  # help-desk

AUTHENTICATION
  # authenticate
  # authentication-help

FLIGHT OPERATIONS (private)
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

CREW OPERATIONS (private)
  # pilot-briefing
  # atc-coordination
  # crew-chat
  # flight-logs
  🔊 Operations Room

SUPPORT
  # suggestions

VOICE CHANNELS
  🔊 Pre-flight Briefing
  🔊 Gate A
  🔊 Gate B
```

The apply operation is idempotent: running it again skips matching channels and roles rather than duplicating them. It synchronizes private category permissions each time. Community and SkyMiles roles cannot see Flight Operations or Crew Operations; the explicitly listed board, leadership, executive, middle-rank, administration, moderation, and flight roles can see both.

Applying the channel layout removes every retired airport-frequency category and channel, removes `#roles`, `#faq`, and the old ATC tower channel, and moves the Information Center and Authentication categories to the top. Run `/bot-version` after deployment and confirm it reports **v4.3.5** before applying the layout.

## Hosting configuration

- **Build Command:** `npm install && npm run build`
- **Start Command:** `npm start`
- **Runtime:** Node.js 20 or later
- **Required:** `DISCORD_TOKEN`, `DATABASE_URL`, `ROBLOX_OAUTH_CLIENT_ID`, `ROBLOX_OAUTH_CLIENT_SECRET`, and `ROBLOX_OAUTH_REDIRECT_URI`
- **Optional guild restriction:** `GUILD_ID`. When the bot is installed in only one server, that server is accepted automatically even if this value is empty or stale. If the bot is installed in multiple servers, commands are restricted to the configured ID.
- **Optional environment fallbacks:** `AUTHENTICATED_ROLE_ID`, `UNAUTHENTICATED_ROLE_ID`, `ROBLOX_GROUP_ID`, `LOG_CHANNEL_ID`, `ROLE_MAPPINGS`, and `MANAGED_ROLE_IDS`. These non-secret settings can instead be maintained with `/authentication-config`. `UPDATE_ALLOWED_ROLE_IDS` can add more roles that may run `/update`.
- **In-game lookup security:** `AUTHENTICATION_API_KEY`
- **Optional Sheets:** `GOOGLE_SHEETS_WEBHOOK_URL` and `GOOGLE_SHEETS_WEBHOOK_SECRET`
- **Optional banners:** the six `INFO_*_BANNER_URL` variables shown in `.env.example`

Create a Render PostgreSQL database and copy its **Internal Database URL** into the bot web service as `DATABASE_URL`, then redeploy. The bot also recognizes `POSTGRES_URL` and `POSTGRESQL_URL`, but `DATABASE_URL` is recommended. This value is a secret and intentionally cannot be entered through `/authentication-config`. On startup the bot creates `authentications`, expiring `authentication_sessions`, configuration/mapping tables, and `role_update_logs`. Discord and Roblox IDs use PostgreSQL `BIGINT`; Roblox usernames are retained only as current display metadata. Unique constraints prevent one Roblox account from being linked to multiple Discord accounts.

Create a Roblox OAuth 2.0 application with the `openid` and `profile` scopes. Its redirect URI must exactly equal `ROBLOX_OAUTH_REDIRECT_URI`, normally `https://your-render-service.onrender.com/auth/roblox/callback`. **Do not use a Discord channel/message URL:** Roblox must redirect to the bot's public Render web service so the backend can process the OAuth response. Copy the exact same HTTPS callback—including the `/auth/roblox/callback` path and with no extra slash—into both Render's `ROBLOX_OAUTH_REDIRECT_URI` environment variable and the Roblox OAuth application's allowed redirect URI, save both, and redeploy. The authorization-code flow uses a cryptographically random, single-use state and PKCE S256. Secrets belong only in the hosting environment, never in source or Roblox Studio.

If Roblox displays **“Redirect URI is invalid for this application,”** the value sent by the bot does not exactly match an allowed redirect in the Roblox OAuth application. For example, if the Render service URL is `https://delta-assistant.onrender.com`, configure `https://delta-assistant.onrender.com/auth/roblox/callback` in both places. `/authentication-config status` detects Discord URLs, non-HTTPS production URLs, and incorrect callback paths before members begin authentication.

If Roblox displays **“Scope not allowed for this application: openid,”** the redirect is no longer the problem. Open the OAuth application in Creator Hub, expand **Permissions**, add both the `openid` and `profile` scopes, and save the application. The bot needs `openid` to receive the immutable Roblox user ID and `profile` to read the current Roblox username. Publishing alone does not add missing scopes. If Roblox labels the application as a draft after the scopes and callback are saved, publish/activate it before asking other members to authenticate. After changing the OAuth app, start a fresh authentication attempt so Roblox receives a new authorization URL.

The bot starts its HTTP server immediately. `GET /` reports startup state and `GET /health` becomes HTTP 200 after Discord command registration. Configure Render's health path as `/health`. Enable Discord's privileged **Server Members Intent**, and place the bot role above Authenticated, Unauthenticated, and every mapped/managed role.

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

Each standalone message uses one Discord embed containing its title, existing Delta Airlines wording, and matching banner. The embed uses Delta navy (`#071D49`) for its accent color. The added divider line has been removed. Discord renders a full-width embed image after the embed description, keeping the banner and information inside the same card and message.

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

## Discord ↔ Roblox authentication and role management

### `/authentication-config`

Members with **Manage Server** can configure authentication without editing role IDs on Render:

- `/authentication-config status` checks whether PostgreSQL is reachable and whether the required Roblox OAuth environment variables exist.
- `/authentication-config set` sets the Authenticated role, Unauthenticated role, Roblox group ID, and optional staff log channel.
- `/authentication-config mapping-add` maps a Roblox group-role ID to a Discord role.
- `/authentication-config mapping-remove` removes one or all mappings for a Roblox group role.
- `/authentication-config view` displays the current configuration and mappings.

OAuth client credentials and `DATABASE_URL` remain environment-only secrets and are never accepted through Discord commands.

### `/authenticate roblox-username:Name`

After the member supplies a Roblox username, the bot opens a private RP-name prompt asking **“What would you like your RP name to be?”** The top of the modal states that the last initial must end in a period. The member must enter the initial and period together (for example, `S.`), and must type `CONFIRMED` to confirm the RP name is not their real name. Missing periods are rejected. Valid RP names use a format such as `Jordan S.`.

The bot then resolves the Roblox username to an immutable Roblox user ID, rejects existing Discord or Roblox links, and returns a private **Continue with Roblox** OAuth button. Typing a username is not proof: the record is created only after Roblox OAuth returns the same user ID that was originally resolved. PostgreSQL stores the Discord ID, Roblox ID, current Roblox username, RP name, authentication time, and last-update time. A successful callback grants Authenticated, removes Unauthenticated, sets the server nickname to `Jordan S. (@RobloxUsername)`, attempts configured group-role synchronization, and privately confirms the result. RP names cannot be changed through `/authenticate` after authentication; the bot restores the stored formatted nickname if an authenticated member changes it. Members must open a support ticket for a leadership-approved change. A future support bot should update `authentications.rp_name` before applying the approved nickname.

### `/authentication-panel`

Members with **Manage Server** can run `/authentication-panel` in the authentication channel. The bot posts five public normal messages—not embeds—using the original URL-based banner format and the current replacement image URLs. The welcome and middle banners are their own messages, while the bottom banner URL remains inside each matching instruction message. The single primary **Authenticate** button is attached to the fifth and final message, placing it at the bottom of the entire panel. Server custom emojis are resolved by name, and clicking the button opens a private modal for the member's Roblox username, RP first name, last initial, and `CONFIRMED` acknowledgment. Submitting that modal calls the same OAuth authentication service used by `/authenticate`; it does not create a second authentication system or role.

The command acknowledges Discord before posting the five-message sequence, preventing the interaction from timing out while Discord processes banner previews. The bot refreshes the server emoji cache before composing the messages. It needs **View Channel**, **Send Messages**, **Embed Links**, and **Use External Emojis** in the destination channel; if Discord rejects a post, the private command response now reports the actual error.

### `/getrole`

Only a Discord account with a stored authentication may synchronize. The bot retrieves the saved Roblox user ID, refreshes the current username, reads current group membership, maps the Roblox group-role ID through `ROLE_MAPPINGS`, adds missing mapped roles, and removes obsolete roles only from `MANAGED_ROLE_IDS`. All unrelated Discord roles remain untouched.

### `/update user:@Member action:Add role role:@Role`

The minimum threshold is the configured Executives role (default ID `1533718284615291042`). Authorization compares positions, so any highest role at or above Executives qualifies. Members holding role `1539005023995043880` or `1539005027748945971` may also run `/update`; more exceptions can be supplied through `UPDATE_ALLOWED_ROLE_IDS`. All callers still cannot add or remove a role equal to or above their own highest role. Validation rejects the wrong guild, `@everyone`, managed integration roles, roles equal to or above the caller, roles equal to or above the bot, and invalid no-change requests.

To remove a role, run `/update user:@Member action:Remove role`. You may select a role directly, or omit `role` to receive a private dropdown containing roles the member currently has and that both you and the bot are permitted to remove. Selecting an entry rechecks Executive access and both role hierarchies before removing it. Unrelated roles are left untouched. Every successful add or removal is written to `role_update_logs`, printed to the service log, and—when `LOG_CHANNEL_ID` is configured—posted as an embed.

### `/unlink user:@Member`

Executives and higher may remove a stored connection. Unlink removes only `MANAGED_ROLE_IDS` and Authenticated, grants Unauthenticated, deletes the database record so both accounts may authenticate again, and creates an audit record/log-channel embed. Unrelated staff and community roles are preserved.

### Roblox server-side lookup API

Roblox server scripts may call `GET /api/authentication/{roblox_user_id}` with `x-api-key: <AUTHENTICATION_API_KEY>` from server-side `HttpService`. The endpoint returns only authentication state and the linked IDs. Missing or incorrect credentials receive HTTP 401. Never place the Discord token, database URL, OAuth client secret, or other private credentials in Roblox Studio; only the dedicated lookup API key should be used, and only from server scripts.

### Authentication visibility

New members automatically receive `Unauthenticated | Delta Air Lines`. That role can see only `#information`, `#authenticate`, and `#authentication-help`. Authenticated members have Unauthenticated removed. Discord administrators inherently bypass channel permission overwrites.
