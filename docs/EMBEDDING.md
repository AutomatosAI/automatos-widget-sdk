# Embedding Automatos Widgets

Add an AI chatbot and an AI-powered blog to any website with **one script
tag and one config call**. Same pattern works on Shopify themes, static
HTML, React / Next.js / Vite, WordPress, Webflow — anything that renders
HTML.

> 💡 **Already on Automatos?** Skip to "[Get a public key](#1-get-a-public-key)".
> Brand new? Sign up at [automatos.app](https://automatos.app), then come back.

---

## 30-second Quickstart

Copy this into the `<head>` of any HTML page. Replace the API key with
your own.

```html
<script src="https://widgets.automatos.app/v0/widget.global.js"
        defer crossorigin="anonymous"></script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    AutomatosWidget.init({
      apiKey: 'ak_pub_xxxxxxxxxxxxxxxxxxxx',
      widget: 'chat',
      position: 'bottom-right',
      greeting: 'Hi! Ask us anything.'
    });
  });
</script>
```

Save, refresh. A chat bubble appears in the bottom-right corner,
backed by an AI agent in your Automatos workspace. That's it.

For a blog widget, add a container and a second `init` call (see
[examples](#2-embed-the-widgets) below).

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

### Next.js (App Router — Next 13+)

Three files. Total time: ~5 minutes.

#### 1. Add the SDK script in `app/layout.tsx`

```tsx
// app/layout.tsx
import Script from 'next/script';
import { AutomatosChat } from '@/components/AutomatosChat';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}

        {/* Load the SDK once for the whole site */}
        <Script
          src="https://widgets.automatos.app/v0/widget.global.js"
          strategy="afterInteractive"
          crossOrigin="anonymous"
        />

        {/* Chat widget — appears on every route */}
        <AutomatosChat />
      </body>
    </html>
  );
}
```

#### 2. Create the Chat component (Client Component — needs `useEffect`)

```tsx
// components/AutomatosChat.tsx
'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    AutomatosWidget?: {
      init: (config: AutomatosInitConfig) => { destroy: () => void };
    };
  }
}

interface AutomatosInitConfig {
  apiKey: string;
  widget: 'chat' | 'blog';
  position?: 'bottom-right' | 'bottom-left';
  theme?: 'light' | 'dark';
  greeting?: string;
  agentId?: string;
  containerSelector?: string;
  blogConfig?: { layout?: string; postsPerPage?: number; category?: string };
  themeOverrides?: Record<string, string>;
}

const API_KEY = process.env.NEXT_PUBLIC_AUTOMATOS_PUBLIC_KEY;

export function AutomatosChat() {
  const instance = useRef<{ destroy: () => void } | null>(null);

  useEffect(() => {
    if (!API_KEY) return;
    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;
      if (!window.AutomatosWidget) {
        window.setTimeout(tryInit, 100);
        return;
      }
      instance.current = window.AutomatosWidget.init({
        apiKey: API_KEY,
        widget: 'chat',
        position: 'bottom-right',
        theme: 'dark',
        greeting: 'Hi! How can we help?',
      });
    };

    tryInit();

    return () => {
      cancelled = true;
      instance.current?.destroy();
    };
  }, []);

  return null;
}
```

#### 3. Drop the Blog widget into any page

```tsx
// app/blog/page.tsx
'use client';

import { useEffect, useRef } from 'react';

const API_KEY = process.env.NEXT_PUBLIC_AUTOMATOS_PUBLIC_KEY;

export default function BlogPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const idRef = useRef(`automatos-blog-${Date.now()}`);

  useEffect(() => {
    if (!API_KEY || !containerRef.current) return;
    containerRef.current.id = idRef.current;
    let cancelled = false;
    let inst: { destroy: () => void } | null = null;

    const tryInit = () => {
      if (cancelled) return;
      if (!window.AutomatosWidget) {
        window.setTimeout(tryInit, 100);
        return;
      }
      inst = window.AutomatosWidget.init({
        apiKey: API_KEY,
        widget: 'blog',
        containerSelector: `#${idRef.current}`,
        blogConfig: { layout: 'grid', postsPerPage: 9 },
      });
    };
    tryInit();

    return () => { cancelled = true; inst?.destroy(); };
  }, []);

  return (
    <main className="container mx-auto py-12">
      <h1 className="text-4xl font-bold mb-8">Blog</h1>
      <div ref={containerRef} />
    </main>
  );
}
```

#### Environment variables

Add to `.env.local` (and your Vercel/Railway env):

```bash
NEXT_PUBLIC_AUTOMATOS_PUBLIC_KEY=ak_pub_xxxxxxxxxxxxxxxxxxxx
```

The `NEXT_PUBLIC_` prefix is mandatory — Next strips anything else from the client bundle. The key is safe to expose because it's origin-locked server-side.

#### CSP note (if you have `next.config.js` with strict CSP)

Add to your `Content-Security-Policy` header:
- `script-src` → `https://widgets.automatos.app`
- `connect-src` → `https://api.automatos.app`

---

### Next.js (Pages Router — older Next or migrating)

Same idea, slightly different file layout. Put the SDK loader in `pages/_document.tsx`:

```tsx
// pages/_document.tsx
import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html>
      <Head />
      <body>
        <Main />
        <NextScript />
        <script
          src="https://widgets.automatos.app/v0/widget.global.js"
          defer
          crossOrigin="anonymous"
        />
      </body>
    </Html>
  );
}
```

Then mount `<AutomatosChat />` in `pages/_app.tsx` and use the same component code as App Router above.

---

### Vite / React (no SSR)

Drop the script in `index.html`, mount the component once in your root. See
`automatos-ai-landing/src/components/widgets/{AutomatosChat,AutomatosBlog}.tsx`
for the reference implementation we use on automatos.app:

```html
<!-- index.html -->
<script src="https://widgets.automatos.app/v0/widget.global.js"
        defer crossorigin="anonymous"></script>
```

```tsx
// src/App.tsx — render AutomatosChat once outside Routes
import { AutomatosChat } from '@/components/widgets/AutomatosChat';

function App() {
  return (
    <BrowserRouter>
      <Routes>{/* ... */}</Routes>
      <AutomatosChat />
    </BrowserRouter>
  );
}
```

Vite uses `import.meta.env.VITE_AUTOMATOS_PUBLIC_KEY` instead of
`process.env.NEXT_PUBLIC_*`. Otherwise the component code is identical.

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
