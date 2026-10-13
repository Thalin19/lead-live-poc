# Validation status

Checked locally on 14 October 2026, Australia/Sydney.

| Check | Result |
| --- | --- |
| Automated server integration and mobile data tests | 14 passed, 0 failed |
| Mobile TypeScript check | Passed |
| Android/iOS/web JavaScript exports | Passed for all three platforms |
| Live browser preview | Passed: a synthetic lead appeared in the already-open inbox without refresh |
| Actual phone or simulator execution | Not yet verified; no installed Android simulator detected |
| Actual Meta test-tool delivery and Graph permissions | Not yet verified; developer registration completed, app and Page creation prepared but awaiting explicit approval |
| Public HTTPS backend | Not configured |
| Remote Git repository | Not created |
| Loom videos | Not recorded |

The integration tests use real local HTTP/WebSocket connections with controlled Graph responses. They verify verification-token handling, signed batch ingestion, live push, duplicates, reconnect snapshots, Page/form filtering, authenticated access, transient/permanent failures, database reopen behavior, separate demo mode, and Graph response normalization, and native Android WebSocket Origin compatibility. They do not establish that a real Meta account has the required access.

Meta's official testing guide was checked in the authenticated browser and states that its Lead Ads Testing Tool cannot be used in developer mode. App activation and any associated requirements remain unresolved. No Meta app, public Page, live form, or public backend has been created yet.

## Dependency advisories

The initial npm audit reports 22 findings: 15 high and 7 moderate, in the Expo/React Native tooling tree. Direct advisory sources are `braces` (deep pattern denial of service), `node-forge` (signature verification), and `uuid` (buffer bounds checks); other findings inherit these paths. The available registry versions of braces (3.0.3) and node-forge (1.4.0) remain affected at the time of checking. npm's suggested force fix would downgrade Expo/React Native across incompatible major versions, so it was not applied.

This is a recorded limitation, not a clean audit. Keep development tooling local, use trusted project input, and update the Expo toolchain when compatible patched packages are available. The application backend is separate from the Expo development server.
