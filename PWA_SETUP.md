# Student360 AI — PWA Setup & Configuration Guide

## 1. Web App Manifest & App Shell Architecture

Student360 AI is configured as an installable Progressive Web App (PWA):
- **Manifest Location**: [`public/manifest.json`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/public/manifest.json)
- **App Name**: Student360 AI
- **Short Name**: Student360
- **Display Mode**: Standalone (`"display": "standalone"`)
- **Theme Color**: `#4f46e5` (Indigo-600)
- **Background Color**: `#0f172a` (Slate-900)

---

## 2. Service Worker Caching Policy & Boundaries

Service worker is registered via [`src/components/pwa/PwaRegister.tsx`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/src/components/pwa/PwaRegister.tsx) pointing to [`public/sw.js`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/public/sw.js):
- **Cached Assets**: Static HTML app shell, icons, fonts, CSS/JS bundles, and [`public/offline.html`](file:///c:/Users/ELCOT/OneDrive/Desktop/AI&ML/public/offline.html).
- **Strict Data Exclusion**: All `/api/*` requests, student master profiles, attendance sheets, and AI insights are **NEVER** cached offline.

---

## 3. HTTPS Requirements

In production environments, service worker registration and Android Chrome PWA installation prompts require HTTPS or `localhost` testing origins.
