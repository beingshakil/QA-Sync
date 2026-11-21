# QASync browser extension (Chrome, Edge, Brave · Manifest V3)

Review pages the canvas can't open: staging behind a login, local builds, sites that refuse to be framed.

- `background.js`  service worker: holds the extension token, makes every API call, captures screenshots, sets the badge
- `content.js`     the "host" on the page: toolbar, comment box, issue card; drives `reviewer.js` like the canvas does
- `reviewer.js`    copied from `public/reviewer.js` by `npm run extension` (not committed)
- `page-errors.js` runs in the page's own world to collect console errors for new issues
- `sidepanel.*`    account, the current page's project and issues, per-site "always open"

## Develop
1. `npm run extension` (copies the reviewer and builds `public/downloads/qasync-extension.zip`)
2. chrome://extensions → Developer mode → Load unpacked → this folder (talks to http://localhost:3001 by default)
3. Click the QASync button on a page, connect in the side panel, then Comment.

The downloadable zip is built with the production address (NEXT_PUBLIC_SITE_URL or Vercel's production URL).

## Permissions
`activeTab` + `scripting`: open on a page only when you click the button. `storage`, `sidePanel`.
Host access: localhost (development) and your QASync address. Other sites only through
“Always open on this site”, which asks Chrome for that one site.
Screenshots need the toolbar click on that tab (Chrome's rule); otherwise comments post without one.

## Auth
Connecting mints an extension token (`qasx_…`, see src/server/tokens.ts) on /app/extension. It acts as
you in that workspace through the normal API; disconnect it there at any time.
