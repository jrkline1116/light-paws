# Light-Paws Console

An aura tracker + play optimizer for the Light-Paws, Emperor's Voice Commander deck.
Runs as an installable web app (PWA) on your phone — home-screen icon, full-screen,
works offline for the Board / Play / Deck tabs. State is saved between opens.

## Run it locally (to test / develop)

Requires Node.js 18+.

    npm install
    npm run dev

Then open the printed URL (e.g. http://localhost:5173) on your computer, or on your
phone if it's on the same Wi-Fi (use the Network URL Vite prints).

## Build for release

    npm run build       # outputs the /dist folder
    npm run preview     # serve /dist locally to check it

## Put it on your phone (free, no app store)

1. Deploy the `/dist` folder to any static host:
   - **Vercel / Netlify / Cloudflare Pages** — drag-and-drop the `dist` folder, or
     connect a Git repo. All have free tiers. HTTPS is automatic (required for PWA).
2. Open the deployed URL in your phone's browser.
3. Install it:
   - **iPhone (Safari):** Share button -> "Add to Home Screen".
   - **Android (Chrome):** menu (⋮) -> "Install app" / "Add to Home screen".
4. Launch from the new icon — it opens full-screen like a native app.

## Notes

- Card art, the hold-to-see-card-text popup, and the "All Auras" tab pull live from
  Scryfall's public API, so those need a connection. Board / Play / Deck work offline.
- Your deck selection, equipped auras, mana, and counts persist via localStorage.
- Import (Deck tab) matches names against the built-in library. Cards outside it are
  reported as unmatched (still searchable on All Auras). Auto-enriching any pasted
  list from Scryfall is the planned next step.

## Where things live

- `src/App.jsx` — the entire app (data, scoring, all four tabs).
- `vite.config.js` — PWA manifest + service worker config.
- `public/` — icons + favicon.
