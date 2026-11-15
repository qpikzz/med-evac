<div align="center">

  # 🚀 ORBITA
  **Onboard Remote Biometric & Integrated Telemetry Assistant**

  *A project by **Team CyberAstro** for the **NASA Space Apps Challenge***

  <p>
    <img src="https://img.shields.io/badge/NASA-Space_Apps_Challenge-0B3D91?style=for-the-badge" alt="NASA Space Apps Challenge" />
    <img src="https://img.shields.io/badge/Team-CyberAstro-1E293B?style=for-the-badge" alt="Team CyberAstro" />
    <img src="https://img.shields.io/badge/Tauri-24C8DB?style=for-the-badge&logo=tauri&logoColor=white" alt="Tauri" />
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Offline_First-100%25-10B981?style=for-the-badge" alt="Offline First" />
  </p>

</div>

---

### 📖 About the Project

**ORBITA** is an interactive desktop application intended to help astronauts monitor vital signs, assess physical and mental health risks, and receive autonomous medical guidance during long-duration space missions.

The design goal is **100% offline autonomy** powered by local AI analytics and an interactive SVG body map, so self-diagnosis and treatment protocols remain available during deep-space communication blackouts with Earth.

> [!NOTE]
> This repository is under active development. The desktop shell and offline-first architecture are in place; the medical monitoring features described below are planned and not yet implemented.

---

### 🚧 Project Status

| Area | Status |
| :--- | :--- |
| Desktop shell (Tauri + React + TypeScript) | ✅ Implemented |
| Offline-first architecture & project scaffolding | ✅ Implemented |
| Vitals monitoring dashboard | 🚧 Planned |
| Interactive SVG body map | 🚧 Planned |
| Local AI risk assessment | 🚧 Planned |
| Autonomous treatment protocols | 🚧 Planned |

---

### 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Desktop Core** | **Tauri** (Rust) — Native lightweight webview & local backend |
| **Frontend** | **React**, **TypeScript**, **Vite** |
| **UI & Charts** | Custom Interactive SVG Body Map, Recharts / Apache ECharts, Motion (Framer Motion) |
| **AI & Analytics** | Local ML Model (CatBoost / LightGBM / ONNX) + Rule-based NASA Human Research Program protocols |

---

### 💻 Local Installation & Setup Guide

> [!IMPORTANT]
> Before starting, make sure you have **Git**, **Node.js (LTS)**, and **Rust** installed on your computer.

#### Step 1: Open the Terminal (Command Prompt)
* **On Windows:** Press the `Win + R` keys together on your keyboard, type `cmd` in the window that appears, and press `Enter`.
* **On macOS / Linux:** Open the **Terminal** app from your Applications menu or press `Cmd + Space` (macOS) / `Ctrl + Alt + T` (Linux).

#### Step 2: Navigate to your preferred folder
Type the following command to go to your Desktop (or any other folder) and press `Enter`:
```bash
cd Desktop
```

#### Step 3: Clone (download) the repository
Copy and paste the command below and press `Enter`:
```bash
git clone https://github.com/qpikzz/med-evac.git
```

#### Step 4: Enter the project folder
Move into the newly downloaded folder:
```bash
cd med-evac
```

#### Step 5: Install dependencies
Download all required frontend libraries and wait until the process finishes:
```bash
npm install
```

#### Step 6: Run the application
Start the desktop application in development mode:
```bash
npm run tauri dev
```

> [!NOTE]
> The very first launch may take a few minutes while Rust compiles the native desktop environment. All subsequent launches will start in seconds!
