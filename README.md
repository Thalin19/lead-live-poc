# Lead Live

A React Native proof of concept that receives Meta Lead Ads submissions automatically while its leads screen is already open.

The implementation includes an Expo mobile app, a Node.js backend, SQLite persistence, a durable webhook inbox, and WebSocket live delivery. A separate, visibly labelled demo mode works without Meta credentials.

**Submission eligibility:** this implementation was created with AI assistance. The assignment explicitly prohibits AI-generated code. Do not represent it as unaided work; clarify eligibility with the evaluator before submitting it.

## Run the local demo

Install Node.js 24 LTS. From this repository's root:

```powershell
npm ci
npm run setup
npm start
```

In a second terminal, from the same root:

```powershell
npm run web
```

Open http://localhost:8081. Leave the inbox open, then in a third terminal:

```powershell
npm run demo:lead -- "Alex Morgan" "alex@example.com"
```

The lead should appear without refreshing. These are sample records, not Meta test submissions. Demo mode disables Meta webhook endpoints so a local test cannot be mistaken for a working Meta integration.

For a phone, install the compatible Expo Go app from the official store and run `npm run mobile`. Scan Expo's QR code. Set `HOST=0.0.0.0` in `server/.env` for LAN access, restart the backend, and set the app's server address to your computer's LAN address on port 4000. Both devices need network access to that address. Use a public HTTPS endpoint when cleartext or LAN connectivity is unavailable. An Android emulator typically reaches its host using `http://10.0.2.2:4000`; iOS simulator setup requires macOS. A browser preview does not satisfy the assignment's native-device demonstration.

`npm run setup` creates ignored local environment files and a random app access token. It preserves existing files. If you change the app token later, update it in both environments or the app's Connection dialog. Restart Expo after changing `EXPO_PUBLIC_*` variables. No Meta credentials belong in the mobile app; Expo public variables are included in the client bundle.

## Connect Meta

Follow [Meta setup](docs/META-SETUP.md). You need your own developer account, managed Page, Instant Form, supported Graph API version, and appropriate access to the Page's leads.

Set the server's Meta configuration and change `DEMO_MODE=false`. Restart it. Set Meta's callback URL to your public HTTPS address followed by `/webhooks/meta`. Configure `leadgen` and subscribe the app to your Page. Set the mobile server address to the same reachable backend; use HTTPS/WSS publicly.

The final acceptance test must use [Meta's Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/), with the native app already open. Creating a sample through `demo:lead`, sending a handcrafted webhook, or using Meta's generic webhook dashboard sample is not the required proof.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run setup` | Create local demo configuration without overwriting existing files |
| `npm start` | Start the backend |
| `npm run mobile` | Start Expo for a phone or simulator |
| `npm run web` | Start a browser preview |
| `npm run demo:lead -- "Name" "email@example.com"` | Create a labelled sample in demo mode |
| `npm run meta:check -- LEAD_ID` | Read-only Meta checks; lead ID is optional |
| `npm run jobs:retry` | Requeue failed retrievals after fixing configuration |
| `npm test` | Run server integration and mobile data-model tests |
| `npm run typecheck` | Check the mobile TypeScript source |

## Repository map

- `mobile/App.tsx`: inbox and connection settings.
- `mobile/src/useLeads.ts`: live connection, reconnect, foreground recovery, and status polling.
- `mobile/src/leads.ts`: validated lead data and duplicate-safe merging.
- `server/src/app.mjs`: HTTP routes, signed webhook ingestion, and authenticated WebSockets.
- `server/src/meta.mjs`: Graph retrieval, signature checks, and field normalization.
- `server/src/store.mjs`: durable inbox and lead storage.
- `server/src/worker.mjs`: bounded retries and live publication.
- `scripts/`: local setup, sample submission, and diagnostics.
- `docs/`: configuration, architecture, assumptions, and demonstration instructions.

## Limits and operational notes

This is a single-Page, single-backend-process PoC. A shared app token protects the sample inbox; it is not production user authentication. Do not load unrelated real customer data into this demo. The newest 200 leads are shown, while all stored leads contribute to the count. The app must be foregrounded for immediate live display; reconnecting fetches a current snapshot.

Webhook jobs are committed before acknowledgement. Transient failures retry up to eight attempts with backoff. Permanent errors, including invalid credentials, remain visible as failed jobs. Fix the cause and run `npm run jobs:retry`. Error logs print codes rather than Meta tokens or contact data.

SQLite uses Node's built-in API, which currently emits an experimental warning. Use a persistent volume for `server/data` when hosting; an ephemeral filesystem loses the database. Run only one worker process against this design. A production system would need proper user authentication, tenant scoping, a scalable queue, monitoring, and a data retention policy.

The Expo dependency tree has development-tool advisories recorded in [validation status](docs/VALIDATION.md). Do not expose Expo's development server publicly. Publicly expose only the backend through HTTPS once Meta configuration is ready.

See [architecture](docs/ARCHITECTURE.md), [assumptions](docs/ASSUMPTIONS.md), and the [recording checklist](docs/DEMO.md).
