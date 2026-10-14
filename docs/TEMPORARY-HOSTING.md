# Temporary demo hosting

The active HTTPS origin is recorded in the ignored local file `work/public-url.txt`. It changes when a new Quick Tunnel starts.

Privacy policy: `/privacy`. Backend health: `/health`. Meta callback (pending setup): `/webhooks/meta`.

The backend listens on `127.0.0.1:4100`. Cloudflare forwards requests to this backend only. The Expo development server is not exposed. Lead APIs and live socket messages require the demo access token. Meta POST notifications require a valid signature once Meta mode is enabled.

The Windows backend and tunnel are running as hidden background processes. Their process IDs are recorded in ignored `work/runtime.json`; diagnostic logs are in ignored `work/`. The official Cloudflare executable is in ignored `.local-tools/`.

Keep the computer awake and these processes running for the demonstration. Stopping the tunnel makes its URL unavailable. A new Quick Tunnel gets a different hostname, requiring app URLs, webhook configuration, mobile configuration, and any form privacy-policy links to be updated. Meta's published forms may require a replacement form for changed links.

Meta credentials are stored in a separate private configuration folder outside the source repository and the selected OneDrive folder. The backend is started with Node's `--env-file` option pointing to that private configuration. Never include the private folder, `.env` files, or access tokens in the submission or recordings.

Real Meta-to-native delivery has now been verified. See `VALIDATION.md` for the result and remaining submission deliverables.
