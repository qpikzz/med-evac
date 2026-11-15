# 📚 Sources, Licenses & Attributions — MED-EVAC

> **Project License:** This project is licensed under the **Apache License 2.0** (OSI-approved open-source license), in accordance with the NASA Space Apps Challenge 2026 Terms & Conditions.
>
> **Disclaimer:** MED-EVAC is an independent project created by **Team CyberAstro** for the NASA Space Apps Challenge. It is not officially affiliated with, endorsed, or sponsored by NASA.

---

## 1. Core Desktop & Frontend Stack
*Actively used frameworks, libraries, and build tools bundled or required to build MED-EVAC.*

| Technology / Package | Version | Source Repository | License | Role |
| :--- | :--- | :--- | :--- | :--- |
| **Tauri** (`tauri`, `@tauri-apps/api`, `@tauri-apps/cli`) | `2.12.x` | `https://github.com/tauri-apps/tauri` | **Apache-2.0 OR MIT** | Cross-platform desktop application framework and Rust IPC bridge |
| **Tauri Plugin Opener** (`tauri-plugin-opener`) | `2.7.2` | `https://github.com/tauri-apps/plugins-workspace` | **Apache-2.0 OR MIT** | Opening external links and resources safely from the desktop app |
| **React** (`react`, `react-dom`) | `19.3.1` | `https://github.com/facebook/react` | **MIT** | Frontend UI component rendering |
| **TypeScript** | `6.0.3` | `https://github.com/microsoft/TypeScript` | **Apache-2.0** | Static type checking for frontend codebase |
| **Vite** (`vite`, `@vitejs/plugin-react`) | `8.3.5` | `https://github.com/vitejs/vite` | **MIT** | Frontend build tool and development server |
| **Vitest** | `5.1.0` | `https://github.com/vitest-dev/vitest` | **MIT** | Unit-test runner for deterministic domain modules |
| **openpyxl** *(build-time only)* | not pinned | `https://foss.heptapod.net/openpyxl/openpyxl` | **MIT** | Excel-to-JSON generation of `knowledge_base.json`; not bundled at runtime |
| **Node.js & npm** | `22.x` | `https://github.com/nodejs/node` | **MIT / Artistic-2.0** | JavaScript runtime and package management |
| **Rust Toolchain** (`rustc`, `cargo`) | `1.97.1` | `https://github.com/rust-lang/rust` | **MIT OR Apache-2.0** | Native backend compilation |
| **Docker & Nginx** *(containerized preview)* | `1.27-alpine` | `https://github.com/nginx/nginx` | **BSD-2-Clause** | Optional static web preview serving |

---

## 2. UI Visualization, Charts & Animation Libraries
*Add visualization, body-map, icon, or animation packages here as they are imported into `src/`.*

| Package / Asset | Source Repository | License | Role |
| :--- | :--- | :--- | :--- |
| **lucide-react** | `1.73.0` · `https://github.com/lucide-icons/lucide` | **ISC** | Offline SVG icon set; used for the fixed header `ChevronDown`, profile-menu actions, and access-gate controls |
| **Custom Interactive Body Map SVG** | Original work by Team CyberAstro | **Apache-2.0** | Interactive anatomical figure for health status visualization |
<!-- Template for new UI packages:
| **Library Name** | `https://github.com/...` | **MIT / Apache-2.0** | Brief role description |
-->

---

## 3. Local AI Models & Backend Inference
*Add local LLM weights, embedding models, and Python/Rust AI runtimes here once integrated.*

| Model / Tool | Developer / Provider | Source URL | License | Role |
| :--- | :--- | :--- | :--- | :--- |
| **IBM Granite 3.3 8B Instruct** (`granite3.3:8b`) | IBM | `https://huggingface.co/ibm-granite/granite-3.3-8b-instruct` | **Apache-2.0** | Local reasoning LLM invoked through Ollama; explain-only, never sets colours, urgency or escalation |
| **Ollama** (client/runtime `0.40.1`, observed locally; not bundled) | Ollama | `https://github.com/ollama/ollama` | **MIT** | Local offline model runtime serving `http://127.0.0.1:11434` |
<!-- Uncomment or add rows as backend packages are integrated:
| **Nomic Embed Text v2 MoE** | Nomic AI | `https://huggingface.co/nomic-ai/nomic-embed-text-v2-moe` | **Apache-2.0** | Local multilingual embeddings for RAG protocol retrieval |
| **FastAPI / Uvicorn / NumPy** | Tiangolo / Encode / NumPy | `https://github.com/fastapi/fastapi` | **MIT / BSD-3-Clause** | Local REST API and vector similarity search |
-->

---

## 4. Spaceflight Medical References & Data Sources

Cite every NASA, ESA, JAXA, or open scientific standard used in the RAG knowledge base, UI thresholds, or synthetic data generation.

| Resource Title | Organization | Source URL | License / Terms | How It Was Used |
| :--- | :--- | :--- | :--- | :--- |
| *Health_Indicators_Research.xlsx* (16 indicators) | Team CyberAstro / Ayesha | Internal team workbook (not committed) | Team-authored research summary; individual citations are listed in the workbook | Human source of truth for src/data/rules.json and src/data/knowledge_base.json |
| *NASA / PubMed references cited per indicator* | NASA / NIH PubMed | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence links supporting the knowledge base text; references inform the evidence base but do not independently determine alert status |
| *Synthetic Astronaut Telemetry Logs (SYN-01)* | Team CyberAstro | src/data/synthetic_history.json (generated by scripts/generate-synthetic.mjs) | *Apache-2.0* | Deterministic illustrative mission data; contains zero real PII |
| *NASA / PubMed References — Blood Pressure* | NASA / NIH PubMed | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on cardiovascular adaptation, blood pressure changes, individual baselines, and blood pressure monitoring |
| *NASA / PubMed / JACC References — Heart Rate* | NASA / NIH PubMed / JACC | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on heart rate adaptation, cardiovascular monitoring, and heart rhythm assessment |
| *NASA / PubMed References — Blood Sugar* | NASA / NIH PubMed | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on glucose metabolism, insulin sensitivity, glucose fluctuations, and glucose monitoring |
| *NASA / Scientific References — Body Temperature* | NASA / Scientific Literature | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on thermoregulation, core temperature changes, heat stress, and temperature monitoring |
| *NASA / Scientific References — Sleep Hours* | NASA / NIH PubMed / The Lancet Neurology | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on sleep duration, circadian disruption, sleep monitoring, and crew performance |
| *NASA / Scientific References — Mood* | NASA / NTRS / Nature | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on behavioral health, psychological stress, mood changes, and crew well-being |
| *NASA / PubMed References — Body Mass* | NASA / NIH PubMed | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on body-mass changes, nutritional status, and body-mass monitoring |
| *NASA / FDA / PubMed References — Blood Oxygen (SpO2)* | NASA / NIH PubMed / U.S. FDA | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on oxygen saturation, pulse oximetry, and identification of possible hypoxemia |
| *NASA / ISCD References — Bone Health* | NASA / International Society for Clinical Densitometry (ISCD) | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on bone mineral density, bone remodeling, calcium balance, and skeletal health |
| *NASA References — Immune Signs / Symptoms* | NASA | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on spaceflight-related immune changes, viral reactivation, infection risks, and symptom monitoring |
| *NASA / PubMed References — Nutrition & Hydration* | NASA / NIH PubMed | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on nutritional intake, hydration, energy balance, and nutritional risk monitoring |
| *NASA / Scientific References — Exercise* | NASA / Scientific Literature | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on exercise monitoring, cardiovascular fitness, muscle maintenance, and bone-loss countermeasures |
| *NASA / PubMed References — Vision Changes* | NASA / NIH PubMed Central | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on Spaceflight-Associated Neuro-Ocular Syndrome (SANS), visual changes, and ocular monitoring |
| *NASA / SRAG References — Radiation Dose* | NASA / NASA Space Radiation Analysis Group (SRAG) | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on radiation exposure monitoring, accumulated dose, solar particle events, and radiation protection |
| *NASA / Scientific References — Pulmonary Function* | NASA / NIH PubMed Central / European Respiratory Society | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on respiratory function, spirometry, pulmonary monitoring, and respiratory health assessment |
| *Scientific References — Skin Health* | NIH PubMed / PubMed Central / Scientific Literature | URLs stored in src/data/knowledge_base.json → sources | Source-specific terms and licenses apply | Evidence on skin integrity, wound healing, skin infections, and dermatological symptom monitoring |
---

## 5. Media, Fonts & Branding
* **Application Icons & UI Graphics:** Original artwork created by Team CyberAstro (**Apache-2.0**). Default starter template icons/logos (`tauri.svg`, `vite.svg`, default `src-tauri/icons/`) are replaced before submission to comply with third-party trademark and CC-BY-NC-ND restrictions.
* **Typography:** System sans-serif fallback stack (`Inter, Avenir, Helvetica, Arial, sans-serif`) referenced via CSS without bundling proprietary font binaries.
* **Demo Video & Screenshots:** Original screen recordings and narration produced by Team CyberAstro with full written consent of all adult participants and zero third-party copyrighted audio/video.

---

## 6. Third-Party Open-Source License Notices
This software incorporates unmodified open-source components governed by **MIT**, **Apache-2.0**, **BSD-2-Clause**, **BSD-3-Clause**, **ISC**, and **MPL-2.0** (build-time CSS tooling via `lightningcss` and Rust CSS crates). Full lockfiles (`package-lock.json` and `Cargo.lock`) remain in the repository as the complete transitive dependency manifest.
