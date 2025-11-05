Security and Deployment Notes

1) Move API calls to backend proxy
- Use the Node proxy in `backend/server.js`.
- Create `.env` from `backend/ENV_EXAMPLE.txt` and set provider keys.
- Run: `npm install && npm run start` in `backend/`.
- Update frontend services to call `/api/...` endpoints instead of hitting providers directly.

2) Keep secrets out of client
- Remove keys from `config/api-keys.js` for production builds.
- Do not commit real keys; use env vars on the server.

3) Firestore rules
- `firestore.rules` restricts access so users can only read/write their own document at `artifacts/{appId}/users/{uid}` and limits changed fields.
- Deploy rules with Firebase CLI before launch.

4) CORS
- The proxy enables CORS by default for simplicity; restrict origins to your domain before launch.

5) Rate limits and retries
- The frontend includes exponential backoff for AI calls; mirror similar retry limits on the proxy if needed.

6) City→IATA resolution
- Replace the stub with a server-side lookup service (e.g., Amadeus locations or a curated list) to avoid leaking patterns in the client.

7) Content validation
- Validate request parameters on the proxy (dates, numbers, ranges) before forwarding to providers.


