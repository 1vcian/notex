# Notex

A minimalist, single-pane Markdown editor. Fully offline-capable PWA.

## Features

- Real-time Markdown rendering (markdown-it).
- Edit / View toggle with syntax highlighting (PrismJS).
- Content saved in the URL hash (LZ compression) for easy sharing.
- localStorage backup — reopening the page restores your last note.
- **100% local** — no CDN, no backend, works offline.
- **Installable** as a PWA on desktop and mobile.

## How to use

1. Type Markdown in **Edit** mode.
2. Switch to **View** mode to see the rendered output.
3. Copy the URL to share your note — the full content is encoded in the link.

## Run locally

```
npx light-server -p 8080 -s .
```

Then open `http://localhost:8080`.
