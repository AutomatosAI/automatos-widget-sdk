# Embedding Automatos Widgets

One snippet pattern works on **Shopify themes, static HTML sites, React /
Next.js apps, WordPress, and any framework that can render `<script>`
tags**. Customers create a single widget key and embed everywhere.

---

## TL;DR

Two pieces:

1. **The SDK loader** (one script tag per page) — registers
   `window.AutomatosWidget` and is cached by the CloudFront edge.
2. **One or more `init()` calls** — each mounts a widget into a container
   using a public API key (`ak_pub_*`) that resolves your workspace and
   enforces the origin allow-list.

```html
<script src="https://widgets.automatos.app/v0/widget.global.js"
        defer crossorigin="anonymous"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    AutomatosWidget.init({
      apiKey: 'ak_pub_xxxxxxxxxxxxxxxxxxxx',
      widget: 'chat',
      position: 'bottom-right',
      theme: 'light',
      greeting: 'Hi! How can I help?'
    });
  });
</script>
```

That's it. The chat widget appears in the bottom-right of every page that
loads this script.

---

## 1. Get a public key

A public key (`ak_pub_*`) is bound to a workspace and a list of
allowed origins. It's safe to put in client-side HTML — it can't be used
from any other domain.

### Via API

```bash
curl -X POST https://api.automatos.app/api/api-keys \
  -H "Authorization: Bearer <your-server-key>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing site widgets",
    "key_type": "public",
    "permissions": ["chat", "blog"],
    "allowed_domains": [
      "automatos.app",
      "www.automatos.app",
      "localhost:5173"
    ]
  }'
```

Response includes `key` — **shown exactly once**, copy it now. After this
you only see the masked `key_prefix`.

### Via dashboard

Settings → API Keys → Create Key. Pick "Public", check the widgets you
want to allow (`chat`, `blog`), add your domains. Copy the full key from
the success modal.

### Domain rules

* Use the bare host, no scheme, no path: `automatos.app`, not
  `https://automatos.app/`.
* Add every host the embed will run on, including `www.` if both serve
  the site, and any dev hosts (`localhost:5173`,
  `*.myshopify.com`).
* Subdomain wildcards: `*.myshopify.com` allows every Shopify storefront
  the partner app installs to.

---

## 2. Embed the widgets

The script tag is identical on every host — only the surrounding markup
differs.

### Shopify (theme block)

Already wired in `extensions/automatos-theme/blocks/`. Merchants don't
write code — they paste the API key into the block setting. See
`docs/SHOPIFY/SETUP-GUIDE.md` for the install flow.

### Static HTML / WordPress / vanilla site

```html
<!-- Once per page (in <head> or before </body>) -->
<script src="https://widgets.automatos.app/v0/widget.global.js"
        defer crossorigin="anonymous"></script>

<!-- Chat (renders absolutely positioned, no container needed) -->
<script>
  document.addEventListener('DOMContentLoaded', function () {
    AutomatosWidget.init({
      apiKey: 'ak_pub_xxxxxxxxxxxxxxxxxxxx',
      widget: 'chat',
      position: 'bottom-right',
      theme: 'light',
      greeting: 'Ask us anything.'
    });
  });
</script>

<!-- Blog (renders inline into a container you supply) -->
<div id="my-blog"></div>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    AutomatosWidget.init({
      apiKey: 'ak_pub_xxxxxxxxxxxxxxxxxxxx',
      widget: 'blog',
      containerSelector: '#my-blog',
      blogConfig: { layout: 'grid', postsPerPage: 6 }
    });
  });
</script>
```

### React / Next.js / Vite

Drop the script tag in `index.html` (or Next's `_document.tsx`) once,
then mount each widget from a small component. See
`automatos-ai-landing/src/components/widgets/AutomatosChat.tsx` and
`AutomatosBlog.tsx` for the reference implementation we use on
`automatos.app`.

```tsx
// AutomatosChat.tsx — mount once near the app root
useEffect(() => {
  if (!window.AutomatosWidget) return;
  const inst = window.AutomatosWidget.init({
    apiKey: import.meta.env.VITE_AUTOMATOS_PUBLIC_KEY,
    widget: 'chat',
    position: 'bottom-right',
  });
  return () => inst?.destroy();
}, []);
```

### Shopify (or any host with strict CSP)

Add `widgets.automatos.app` and `api.automatos.app` to the host's
`script-src` and `connect-src`. CloudFront serves the bundle with
`Access-Control-Allow-Origin: *` so cross-origin loading works without
extra headers.

---

## 3. Available widget types + config

| Field                | Chat | Blog | Notes                                                  |
|----------------------|------|------|--------------------------------------------------------|
| `apiKey`             | ✅   | ✅   | `ak_pub_*` public key — required.                      |
| `widget`             | ✅   | ✅   | `'chat'` or `'blog'`.                                  |
| `position`           | ✅   |      | `'bottom-right'` (default) or `'bottom-left'`.         |
| `theme`              | ✅   | ✅   | `'light'` or `'dark'`.                                 |
| `title`              | ✅   |      | Header text in the chat panel.                         |
| `greeting`           | ✅   |      | Opening message.                                       |
| `agentId`            | ✅   |      | Override the workspace's default agent.                |
| `containerSelector`  |      | ✅   | CSS selector to mount the blog widget into.            |
| `blogConfig.layout`  |      | ✅   | `'grid' \| 'list' \| 'featured' \| 'minimal'`.         |
| `blogConfig.postsPerPage` |  | ✅   | Default 6, max 50.                                     |
| `blogConfig.category` |     | ✅   | Filter to a single category.                           |
| `themeOverrides`     | ✅   | ✅   | CSS custom properties (e.g. `'--aw-primary': '#000'`). |

---

## 4. How it works (short version)

* The bundle is a Shadow DOM widget — no styles leak in or out, ~9 KB
  gzipped, zero runtime deps.
* On `init()`, the widget calls `POST /api/widgets/auth/session` with
  the API key to mint a short-lived JWT, then opens a streaming chat
  channel (chat) or fetches `/api/widgets/blog/posts` (blog).
* Every request carries `Authorization: Bearer <key|jwt>`. The server
  resolves the workspace from the key and rejects requests whose
  `Origin` header is not in the key's `allowed_domains`.
* Public keys can be revoked instantly from the dashboard. Embeds stop
  working within seconds of revocation.

---

## 5. Versioning + rollout

* `widgets.automatos.app/v0/` is the **stable channel**. We ship
  backwards-compatible changes here without breaking embeds.
* `widgets.automatos.app/<exact-version>/` (e.g. `v0.1.4`) is the
  **pinned channel** for sites that need byte-for-byte consistency.
* Breaking changes ship under a new major (`v1/`). Customers migrate
  by changing one URL.

To redeploy the SDK after a code change, see
`automatos-widget-sdk/.github/workflows/deploy.yml` — push a tag
matching `v*.*.*` and CI handles S3 + CloudFront invalidation.

---

## 6. Reference integrations

| Host             | Reference path                                                              |
|------------------|-----------------------------------------------------------------------------|
| Shopify theme    | `automatos-shopify/extensions/automatos-theme/blocks/{chat,blog}-widget.liquid` |
| React (Vite)     | `automatos-ai-landing/src/components/widgets/Automatos{Chat,Blog}.tsx`     |
| Static HTML      | This document, section 2.                                                   |

If you build an integration for a new host (WordPress plugin, Webflow
embed, Wix app, etc.), drop a copy in `apps/playground/` and link it
back here.
