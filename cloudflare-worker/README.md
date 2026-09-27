# Deck-link proxy (optional)

The app first tries to load deck links straight from the browser. If a site blocks that
(you'll see "Couldn't reach … from the browser"), deploy this Worker once and point the app at it.

1. Sign in at dash.cloudflare.com (free account) → Workers & Pages → Create → Create Worker.
2. Name it `light-paws-proxy` → Deploy → Edit code.
3. Replace the code with `deck-proxy.js` from this folder → Deploy.
4. Copy the Worker URL (e.g. `https://light-paws-proxy.<you>.workers.dev`).
5. In `src/App.jsx`, set `const DECK_PROXY_URL = "https://light-paws-proxy.<you>.workers.dev";`
6. Commit + push. The app now uses the proxy only when a direct request fails.

The Worker only fetches from Archidekt, Moxfield and MTGGoldfish, and only answers
requests from lightpaws.app (plus the old jrkline1116.github.io address and localhost for testing). Moxfield sits behind
Cloudflare bot protection and may still refuse; the app then tells the user to paste the text export.
