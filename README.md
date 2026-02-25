# Automatos Widget SDK

Embeddable AI chat widget for any website. Shadow DOM isolated, zero runtime dependencies, ~9KB gzipped.

## Quick Start

### Script Tag (any website)

```html
<script src="https://sdk.automatos.app/v1/widget.js"></script>
<script>
  AutomatosWidget.init({
    apiKey: "ak_pub_...",
    widget: "chat",
    position: "bottom-right",
    theme: "light",
    greeting: "Hi! How can I help?"
  });
</script>
```

### React / Next.js

```bash
npm install @automatos/widget-sdk
```

```tsx
import { AutomatosChat } from '@automatos/widget-sdk/react';

export default function App() {
  return (
    <AutomatosChat
      apiKey="ak_pub_..."
      position="bottom-right"
      theme="light"
      greeting="Hi! How can I help?"
    />
  );
}
```

### React Hook (programmatic control)

```tsx
import { useAutomatosChat } from '@automatos/widget-sdk/react';

function App() {
  const { open, close, toggle, destroy } = useAutomatosChat({
    apiKey: "ak_pub_...",
    position: "bottom-right",
    theme: "light",
  });

  return <button onClick={toggle}>Toggle Chat</button>;
}
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | required | Your Automatos API key (`ak_pub_*` for public, `ak_srv_*` for server) |
| `widget` | `"chat"` | `"chat"` | Widget type (currently only chat) |
| `baseUrl` | `string` | `https://api.automatos.app` | API base URL |
| `position` | `"bottom-right" \| "bottom-left"` | `"bottom-right"` | FAB position |
| `theme` | `"light" \| "dark"` | `"light"` | Color theme |
| `greeting` | `string` | — | Initial greeting message |
| `agentId` | `number` | — | Specific agent to use |
| `modelId` | `string` | — | Specific model ID |
| `themeOverrides` | `object` | — | CSS custom property overrides |

### Theme Customization

Override any CSS variable via `themeOverrides`:

```js
AutomatosWidget.init({
  apiKey: "ak_pub_...",
  widget: "chat",
  themeOverrides: {
    "--aw-primary": "#8b5cf6",
    "--aw-primary-hover": "#7c3aed",
    "--aw-radius": "8px",
  }
});
```

Available variables: `--aw-primary`, `--aw-primary-hover`, `--aw-bg`, `--aw-bg-secondary`, `--aw-text`, `--aw-text-secondary`, `--aw-border`, `--aw-shadow`, `--aw-radius`, `--aw-font`.

## Packages

| Package | Description | Size (gzip) |
|---------|-------------|-------------|
| `@automatos/core` | API client, auth, SSE parser, types | ~3.6 KB |
| `@automatos/chat-widget` | Chat UI (Shadow DOM, vanilla JS) | ~8.1 KB |
| `@automatos/loader` | `widget.js` IIFE entry point | ~9.3 KB |
| `@automatos/widget-sdk` | React wrapper + re-exports | ~0.5 KB |

## Development

```bash
pnpm install
pnpm build       # Build all packages
pnpm dev          # Start playground on localhost:4100
pnpm test         # Run tests
pnpm typecheck    # Type-check all packages
```

## Architecture

- **Shadow DOM** for style isolation (page CSS can't leak into widget)
- **fetch + ReadableStream** for SSE streaming (backend uses POST)
- **CSS custom properties** for theming (pierce Shadow DOM via `:host`)
- **Custom markdown parser** (~300 lines, DOM-based, XSS-safe)
- **tsup** builds ESM + CJS (npm) + IIFE (CDN)
- **Zero runtime dependencies** in core and chat-widget

## License

MIT
