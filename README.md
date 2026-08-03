# Delta Air Lines PTFS Bot

The main Discord bot for Delta Air Lines PTFS. One command safely previews and creates the server's role and channel layout.

## Proposed role hierarchy

Running `/setup-server mode:Preview only` shows the complete role and channel plan without changing the server. Roles are created in this top-to-bottom hierarchy:

```text
  @Chief Executive Officer
  @Chief Operating Officer
  @Chief Administrative Officer
  @Chief Flight Operations Officer
  @Chief Human Resources Officer
  @━━ BOARD OF DIRECTORS ━━
  @Chief of Staff
  @Chief of Corporate Affairs
  @Chief of Safety
  @━━ LEADERSHIP ━━
  @Senior High Rank
  @Lead of Cabin Crew Department
  @Lead of Flight Deck Department
  @Lead of ATC Department
  @Lead of Ground Operations Department
  @━━ EXECUTIVES ━━
  @Operations Manager
  @Department Manager
  @Assistant Department Manager
  @Supervisor
  @━━ MIDDLE RANK ━━
  @Senior Administration
  @Administration
  @Senior Moderation
  @Moderation
  @━━ SERVER ADMINISTRATION ━━
  @Chief Pilot
  @Captain
  @First Officer
  @Air Traffic Control
  @Cabin Crew
  @Ground Crew
  @━━ FLIGHT OPERATIONS ━━
  @Diamond Medallion
  @Platinum Medallion
  @Gold Medallion
  @Silver Medallion
  @SkyMiles Member
  @━━ SKYMILES MEMBERS ━━
  @Passenger
  @Aviation Enthusiast
  @Guest
  @━━ COMMUNITY ━━
  @Delta Virtual Assistant
  @━━ APPLICATION ━━
```

Each `━━ CATEGORY ━━` separator is a real Discord role placed below the roles in its section, as requested. Setup explicitly resets the positions on every run, so existing server roles or Discord's default role-creation position cannot accidentally move a separator above its members. Every member role and separator has its own unique, explicit hexadecimal color. Chief positions are grouped under the Board of Directors and Leadership sections; department leads are grouped under Executives. Senior Administration and Administration receive management permissions, while Senior Moderation and Moderation receive appropriately limited member-moderation permissions. Other roles are organizational and do not receive elevated Discord permissions. The bot assigns itself the `Delta Virtual Assistant` role during setup. Discord will not allow the bot to create or assign roles above its own highest managed role, so place the bot's managed integration role near the top before applying the setup.

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
```

The apply operation is idempotent: running it again skips matching channels and roles rather than duplicating them. It synchronizes private category permissions each time. Community and SkyMiles roles cannot see Flight Operations or Crew Operations; the explicitly listed board, leadership, executive, middle-rank, administration, moderation, and flight roles can see both.

## Hosting configuration

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment variable:** `DISCORD_TOKEN` (set this to the token from the Discord Developer Portal; never commit it)
- **Optional Sheets variables:** `GOOGLE_SHEETS_WEBHOOK_URL` and `GOOGLE_SHEETS_WEBHOOK_SECRET`
- **Runtime:** Node.js 20 or later

When inviting the bot, include the `bot` and `applications.commands` scopes. The bot needs **Manage Channels** and **Manage Roles** permissions to apply the layout.

## Use

1. Start the bot and wait for its ready message.
2. Run `/setup-server mode:Preview only` to review all roles and channels.
3. Run `/setup-server mode:Apply layout` to create both systems in one operation.

Only members with **Manage Server** can see and run this command. Responses are private to the person running it.

## Local development

```bash
cp .env.example .env
npm install
npm test
npm start
```
