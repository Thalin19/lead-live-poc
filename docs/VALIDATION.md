# Validation status

Checked locally on 14 October 2026, Australia/Sydney.

| Check | Result |
| --- | --- |
| Automated server integration and mobile data tests | 14 passed, 0 failed |
| Mobile TypeScript check | Passed |
| Android/iOS/web JavaScript exports | Passed for all three platforms |
| Live browser preview | Passed: a real Meta test lead appeared in the already-open inbox without refresh |
| Actual phone or simulator execution | Passed on Android through Expo Go; user confirmed the real Meta lead appeared automatically without tapping or refreshing |
| Actual Meta test-tool delivery and Graph permissions | Passed: Meta Track status shows Success / Successful webhook integration; backend reports 1 lead, 0 pending, 0 failed |
| Public HTTPS backend | Temporary Cloudflare tunnel verified: health and privacy return 200; unauthenticated lead access returns 401 |
| Remote Git repository | Not created |
| Loom videos | Not recorded |

The automated integration tests use real local HTTP/WebSocket connections with controlled Graph responses. They verify verification-token handling, signed batch ingestion, live push, duplicates, reconnect snapshots, Page/form filtering, authenticated access, transient/permanent failures, database reopen behavior, separate demo mode, Graph response normalization, and native Android WebSocket Origin compatibility. A separate real Meta account test then established the live integration described below.

Meta's official testing guide was checked in the authenticated browser and states that its Lead Ads Testing Tool cannot be used in developer mode. Lead Live PoC was published with explicit user approval. The public demo policy is configured in the app. Meta access was granted with approval; the Graph API confirmed the test Page and returned its Page token, which is stored outside this repository. The Page object webhook is verified and subscribed to `leadgen` at v26.0, and the app is installed on the actual Page through `subscribed_apps`.

Meta app ID: `1838659977324087`. Facebook Page profile ID: `61595492515077`. Verified Graph Page ID: `1304752079399424`. The app webhook UI currently offers Graph API v26.0.

The active demonstration form is `Lead Live Test Form — live connection`, ID `1806402827071949`. It has full name and email fields, fixed delivery, and wording requesting fictional details. Earlier forms remain in the Page library but are not accepted by the running server's form filter. Replacement forms were necessary because the earlier temporary privacy URLs expired.

## Real Meta acceptance test

On 14 October 2026, with the Android app open in Expo Go and showing Live, a dummy lead was created with Meta's Lead Ads Testing Tool. Meta reported successful webhook delivery for app `1838659977324087`. The server verified the signed notification, fetched the lead through Graph, persisted it, and pushed it to the live inbox. The already-open browser inbox changed from 0 to 1 without any further interaction. The user confirmed the same lead appeared automatically on the Android phone without tapping or refreshing.

Test lead ID: `4063493370624935`. Dummy fields: `<test lead: dummy data for full_name>` and `test@meta.com`. Backend result: Meta mode, 1 lead, 0 pending, 0 failed. Native execution is confirmed by the user's direct observation; a Loom recording has not yet been captured.

The current Cloudflare tunnel is temporary and has no uptime guarantee. An earlier tunnel was retired while the computer session remained open; its replacement was verified before the successful test. Reviewers must start a fresh tunnel and update URLs when reproducing the demonstration.

## Dependency advisories

The initial npm audit reports 22 findings: 15 high and 7 moderate, in the Expo/React Native tooling tree. Direct advisory sources are `braces` (deep pattern denial of service), `node-forge` (signature verification), and `uuid` (buffer bounds checks); other findings inherit these paths. The available registry versions of braces (3.0.3) and node-forge (1.4.0) remain affected at the time of checking. npm's suggested force fix would downgrade Expo/React Native across incompatible major versions, so it was not applied.

This is a recorded limitation, not a clean audit. Keep development tooling local, use trusted project input, and update the Expo toolchain when compatible patched packages are available. The application backend is separate from the Expo development server.
