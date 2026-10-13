# Meta setup

Complete the account-specific steps in your own Meta account. Current dashboard options and permission requirements can vary by app use case and access level; follow the dashboard and official documentation rather than assuming every account has identical screens.

## Account, Page, and form

1. Sign in at [Meta for Developers](https://developers.facebook.com/). Complete developer registration, including its terms and requested account verification. Enter phone numbers and SMS codes directly in Meta, not in chat.
2. Create or select a Facebook Page you control. Suggested test name: **Lead Live Demo**. Use an accurate available category. Record its Page ID.
3. Create a developer app named **Lead Live PoC**, using your own contact email and an available use case supporting the required Page/lead APIs. Record its App ID and selected supported Graph API version.
4. In Meta's business tools, create an Instant Form for the Page named **Intern Assignment Test Leads**, with name and email fields. Supply a valid privacy-policy URL if requested. Do not invent a business or verification documents. No paid ad is required by the assignment.
5. Confirm that the intended Page and form are selectable in the [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing/). Record the Form ID.

## Backend configuration

Keep these values in ignored `server/.env`:

| Setting | Meaning |
| --- | --- |
| `DEMO_MODE` | Set to `false` for actual Meta integration |
| `META_GRAPH_VERSION` | Supported version selected in your app dashboard, including the `v` prefix |
| `META_APP_SECRET` | App secret from your developer app |
| `META_VERIFY_TOKEN` | A random value you choose; enter the same value in Meta callback setup |
| `META_PAGE_ACCESS_TOKEN` | Token authorized to retrieve leads for this Page |
| `META_PAGE_ID` | The one Page accepted by this PoC |
| `META_FORM_ID` | Optional form filter; use the intended form ID to restrict the demo |
| `API_TOKEN` | Separate shared token used by your own app; setup generates it |
| `WEB_ORIGIN` | Exact browser preview origin, if you use the web preview |

Use Meta's current access requirements to obtain a token with lead retrieval and necessary Page access. Check `leads_retrieval` and the Page-management/subscription permissions relevant to your selected workflow. App roles, Page roles, business lead access, and permission access levels can all affect this. Do not assume app review or business verification is universally required or universally avoidable; determine it for your actual test account.

## Callback and Page subscription

1. Start the backend and expose it at a reachable public HTTPS address using hosting or an official tunnel provider. Keep any tunnel running throughout the demonstration. Do not expose Expo's development server as the webhook.
2. Configure the Page webhook callback as `https://YOUR-BACKEND/webhooks/meta`, with the exact `META_VERIFY_TOKEN` value.
3. Subscribe the app's Page webhook to `leadgen`.
4. Subscribe/install this app on the actual Page for `leadgen`. The relevant Page edge is `/{page-id}/subscribed_apps`. Configuring the app callback alone does not subscribe the Page.
5. Restart the backend after changing its environment. Run `npm run meta:check` to check readability and Page subscriptions. The script only reads; it does not grant access or create subscriptions. Verify the subscribed App ID matches your app.
6. Update the mobile app to a reachable backend URL. Use the app access token, not a Meta token.

The server verifies `X-Hub-Signature-256` against the raw POST bytes using the app secret. Keep signature verification enabled. The verify token only handles the initial callback challenge; it does not authenticate lead deliveries.

## Actual acceptance test

Open the native app's list and confirm **Live**, with no local-demo banner. Submit a lead through Meta's Lead Testing Tool. Check delivery tracking in the tool when available, then confirm the matching lead appears without touching the device.

If a previous test lead prevents another submission on that form, remove that disposable test lead using Meta's tool before recreating it. Do not delete unrelated leads. A generic dashboard webhook sample can use an ID that is not retrievable and is not equivalent to a testing-tool submission.

If delivery succeeds but no record appears, check pending/failed counts and backend error codes. Verify the Page subscription, token validity, lead access, Page/form filters, and public endpoint availability. After fixing a retrieval error, use `npm run jobs:retry`. To check a known lead directly, use `npm run meta:check -- LEAD_ID`.

## Sources

- [Meta lead integration setup reference](https://github.com/facebookincubator/catalogue-of-api-solutions/blob/main/solutions/leads/leads-retrieval-set-up-checker.md)
- [Meta retrieving leads guide](https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving/)
- [Meta webhook setup](https://developers.facebook.com/docs/graph-api/webhooks/getting-started/)
- [React Native networking](https://reactnative.dev/docs/network)

The two Meta guide pages were rate-limited during research. The Page/lead flow was checked against Meta's public repository reference; exact account permissions must still be verified in the authenticated dashboard.
