# Notex

A minimalist, single-pane Markdown editor that stores its content in the URL hash and in localStorage.

## Utility

This tool is designed for instant sharing. Since the entire content of the page is compressed and stored in the URL, you don't need a database or a backend to share notes. Simply type your Markdown, copy the URL, and send it to someone else. They will see exactly what you wrote.

Content is also saved automatically to `localStorage` so your note persists across page reloads without needing to share the URL.

## Features

- Real-time Markdown rendering as you type (powered by markdown-it).
- Single-pane interactive interface with Edit / View toggle.
- Automatic URL updates using LZ-based compression.
- localStorage backup — reopening the page restores your last note automatically.
- Completely serverless (works on GitHub Pages).

## How to use

1. Start typing your Markdown.
2. Toggle between **Edit** mode (syntax-highlighted source) and **View** mode (rendered Markdown).
3. Copy the browser URL to share your note with others — the full content is encoded in the link.
