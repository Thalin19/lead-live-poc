# Loom and submission checklist

## Video 1: required demonstration, maximum five minutes

Before recording, start the server in Meta mode, keep the public HTTPS endpoint available, open the native app's leads screen, and confirm its Live indicator. Remove any old disposable test lead only if Meta's tool requires it. Hide secrets and unrelated personal information.

Suggested sequence:

- **0:00-0:30:** show the running phone/simulator with the leads screen already open. State the behavior you are demonstrating.
- **0:30-1:30:** show Meta's Lead Ads Testing Tool, choose the intended Page/form, and submit a test lead.
- **1:30-2:30:** keep the device untouched as the new lead appears. Show the matching fields.
- **2:30-3:30:** briefly identify the automatic path from Meta through the backend to the app. Leave time for delivery delays and keep the total under five minutes.

Record the actual result; do not imply that sample-mode or a browser-only test establishes the native Meta workflow.

## Video 2: code and architecture explanation

Explain in your own words using the actual source:

1. The React Native inbox and live connection lifecycle.
2. Callback challenge and signed event ingestion.
3. Why `leadgen_id` is followed by a Graph API retrieval.
4. Durable inbox, retries, atomic persistence, and duplicate protection.
5. Snapshot-on-reconnect behavior and configuration boundaries.
6. What was tested, what was demonstrated against Meta, and remaining limitations.

No duration limit is stated for the second video in the provided brief. Be concise and accurate.

## Before submitting

- Confirm eligibility given the brief's explicit AI-code prohibition.
- Complete a genuine test-tool-to-native-app demonstration.
- Publish the source repository without `.env`, databases, tokens, or customer data.
- Check that both Loom links and the repository are accessible to the evaluator.
- Include the assumptions document, updated to match the final setup.
- Confirm the actual due date; the brief says one week without a dated start.

No email has been sent and no Loom recordings or remote repository have been created by this project. Those links must refer to real uploaded results before submission.
