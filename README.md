# Ganesh Mitra Mandali (H. Hosahalli)

[![React 19](https://img.shields.io/badge/React-19.0-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.x-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.x-38B2AC.svg)](https://tailwindcss.com/)
[![Gemini 2.5 Flash](https://img.shields.io/badge/Gemini_AI-2.5_Flash-orange.svg)](https://aistudio.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

A modern, progressive web platform engineered for community festival governance, democratic decision-making, real-time messaging, emergency response, and verified member credentials for **Ganesh Mitra Mandali**, H. Hosahalli.

---

## ✨ Features

- **📱 Mobile-First Progressive Web App (PWA)**: Complete offline capability, service worker caching, home-screen installation prompt, and touch-first ergonomics.
- **💬 Real-Time Group Chat**: Fast community discussion stream with photo/video attachments, voice notes, emoji picker, and reply threading.
- **🗳️ Democratic Decision Polls & Data Visualization**: Community voting with deadline timers, 24-hour reminders, and interactive Recharts data visualizations (Bar and Pie charts).
- **👥 Member Directory & Digital QR Passes**: Complete membership management with scannable entry QR verification badges and printable membership cards.
- **📢 Announcements & 24-Hour Automated Alerts**: Pinned notices, scheduled pooja/cultural events, and automated reminder notifications for upcoming milestones.
- **🚨 Incident Desk & Emergency Panic Broadcast**: Citizen issue reporting (lighting, sound, crowds) and high-priority emergency alerts.
- **🛡️ Multi-Level Error Boundaries & Centralized Diagnostics**: Full-page crash protection, section reload, modal isolation, and in-memory log inspector with debug mode.
- **🤖 Gemini AI Integration**: Automated festival announcement drafting and culturally warm bilingual messaging powered by Google Gemini 2.5 Flash.

---

## 📋 Prerequisites

Before running the project locally, ensure you have:

1. **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
2. **npm**: v9.0.0 or higher
3. **Google Gemini API Key**:
   - Obtain a free API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

---

## 🚀 Quick Start Guide

### 1. Clone the Repository

```bash
git clone https://github.com/USERNAME/REPOSITORY.git
cd REPOSITORY
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Open `.env` in your editor and enter your Gemini API key:

```env
GEMINI_API_KEY="your_actual_gemini_api_key_here"
VITE_GEMINI_API_KEY="your_actual_gemini_api_key_here"
APP_URL="http://localhost:3000"
PORT=3000
```

> **Security Note**: Never commit your `.env` file to version control. It is already included in `.gitignore`.

### 4. Run the Development Server

```bash
npm run dev
```

The application will start on `http://localhost:3000`.

### 5. Build for Production

```bash
npm run build
npm run preview
```

---

## 🤖 Gemini AI Capabilities & Example

The platform includes an AI helper module (`src/services/geminiService.ts`) utilizing the `@google/genai` SDK:

### Example Prompt:
> *"Draft a community reminder for tomorrow's Ganesh Visarjana procession starting at 4:00 PM from H. Hosahalli Main Circle."*

### Example Output:
> **🌺 ವಿಜೃಂಭಣೆಯ ಗಣೇಶ ವಿಸರ್ಜನಾ ಮಹೋತ್ಸವ | Grand Ganesh Visarjana Procession**  
> *"Dear H. Hosahalli Mandali Members and Devotees,  
> The grand farewell procession of our Bappa will commence tomorrow at 4:00 PM from the Main Circle. Let us unite with devotion, traditional dholu, and prasada distribution. Please assemble by 3:30 PM at the Mandapa. Ganapati Bappa Morya!"*

---

## 📁 Project Architecture

```
├── .env.example              # Environment variable template
├── .gitignore                # Git ignore rules for node, env, and OS
├── firebase-applet-config.json # Firebase connection identifiers
├── firestore.rules           # Declarative Firestore security policies
├── index.html                # Entry HTML with meta & PWA manifests
├── package.json              # Dependency manifest
├── src/
│   ├── App.tsx               # Root container & view routing
│   ├── components/           # Reusable UI widgets & modals
│   │   ├── ConfirmModal.tsx  # In-app confirmation dialog
│   │   ├── DiagnosticsModal.tsx # In-memory system diagnostics drawer
│   │   ├── ErrorBoundary.tsx # Multi-level fault recovery
│   │   └── PollCharts.tsx    # Recharts visualization
│   ├── context/              # React Context (AuthContext, ThemeContext)
│   ├── lib/                  # Firebase instance & client initialization
│   ├── services/             # Domain services (mandali, storage, reminders, gemini)
│   ├── utils/                # Centralized logger & formatting helpers
│   └── views/                # Primary application screens
└── vite.config.ts            # Vite bundler configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
