# Assumptions and limitations

- One managed Facebook Page and one intended test form are sufficient for the interview PoC.
- The submitter has a developer account and the required Page and lead access. Those permissions are external prerequisites, not granted by this code.
- The Meta Lead Testing Tool supplies the final test leads. No actual ad spend is needed.
- The app is already open and foregrounded during the demonstration. Background push notifications are outside scope.
- The backend has a reachable public HTTPS endpoint and outbound access to Graph API.
- A single backend process and persistent SQLite volume are sufficient. Horizontal scaling is outside scope.
- A shared app token is acceptable for a private PoC using test data. It is included in the client configuration and is not production-grade identity or tenant authorization.
- The screen shows the latest 200 leads; earlier records remain in storage.
- Name and email are useful display fields. Missing fields are handled, and additional returned fields remain stored.
- Graph API version is explicitly configured to a supported version selected in the actual app dashboard.
- Local demo mode is solely a development convenience and cannot establish that the required Meta integration works.
