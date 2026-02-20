<div align="center">
  <h1>Notex</h1>
  <p><b>Shareable, Local-first Markdown Notes</b></p>

  <!-- Badges -->
  <a href="https://github.com/lucian/notex/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License" />
  </a>
  <a href="https://github.com/lucian/notex">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome" />
  </a>
  <a href="#">
    <img src="https://img.shields.io/badge/PWA-Ready-orange.svg" alt="PWA Ready" />
  </a>
</div>

<br />

## 📖 About Notex

Notex is a lightning-fast, zero-dependency progressive web app (PWA) that allows you to write, manage, and share Markdown notes directly from your browser. What makes it special? **There is no backend.** Data is stored locally in your browser, and sharing works uniquely through URL-encoded hashes. Simply copy the link, and whoever opens it receives your exact markdown content instantly reconstructed on their device.

## ✨ Features

- **📝 Live Markdown Rendering:** Beautiful, GitHub-Flavored Markdown preview side-by-side with your code block, keeping styling perfectly aligned.
- **🔗 Zero-Login Sharing:** Notes and state are encoded via LZ compression directly into the URL `/#hash`. Share a link, share a note.
- **📁 Multi-File Management:** Create, seamlessly switch between, and manage an unlimited number of local notes via a sleek hidden sidebar.
- **🚀 Local-First & PWA Ready:** Works entirely offline. Everything operates within your browser's local storage with a lightweight Service Worker ensuring instant loading anywhere.
- **🎨 Premium Dark UI:** Exquisitely crafted design with smooth micro-animations, glass-like modals, and a distraction-free environment.

## 🛠️ Tech Stack

Notex is built to be brutally fast and delightfully lightweight.

- **Frontend Core:** Vanilla HTML5, CSS3, and ES6 JavaScript Modules.
- **Markdown Parsing:** [markdown-it](https://github.com/markdown-it/markdown-it)
- **Syntax Highlighting:** [PrismJS](https://prismjs.com/)
- **Compression:** [lz-string](https://github.com/pieroxy/lz-string)

## 🚀 Getting Started

### 1. Online Usage

Since Notex has no server dependency, simply visit the hosted URL (e.g. `[Your Custom Domain]/notex`).

### 2. Local Installation

```bash
# Clone the repository
git clone https://github.com/lucian/notes.git

# Navigate into the directory
cd notes

# Serve via any static server, e.g., Python:
python3 -m http.server 8080
# Or using Node:
npx serve .
```

Open `http://localhost:8080` in your browser.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! 
Feel free to check [issues page](https://github.com/lucian/notes/issues). 

## ⚖️ License
This project is [MIT](https://opensource.org/licenses/MIT) licensed.
