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
| *Synthetic Astronaut Telemetry Logs (SYN-01)* | Team CyberAstro | src/data/synthetic_history.json (generated by scripts/generate-synthetic.mjs) | *Apache-2.0* | Deterministic illustrative mission data; contains zero real PII || *Risk of Cardiovascular Adaptations* | NASA Human Research Program | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Blood pressure indicator: spaceflight can alter the heart and blood vessels, low blood pressure raises the chance of fainting at landing, and countermeasures include exercise, diet, lower-body compression garments and fluids |
| *NASA Shares Station Research Today Supporting Moon, Mars Tomorrow* (Aug 11, 2026) | NASA International Space Station Research Communications Team | https://www.nasa.gov/missions/station/iss-research/nasa-shares-station-research-today-supporting-moon-mars-tomorrow/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Heart rate indicator: the CARDIOBREATH investigation uses the Bio-Monitor "smart shirt" to track heart rate, blood pressure, breathing rate and activity during exercise aboard the ISS |
| *Human Adaptation 2021* | NASA | https://www.nasa.gov/wp-content/uploads/2015/02/human_adaptation_2021_final.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Blood sugar indicator |
| *Increased core body temperature in astronauts during long-duration space missions* (Stahn et al., Sci Rep 2017;7:16180) | Scientific Reports (Springer Nature); Charité – Universitätsmedizin Berlin | https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078/ | CC BY 4.0 (Open Access) | Evidence link for the Body temperature indicator: resting core temperature rose about 1 °C over 2.5 months on the ISS and plateaued after about 75 days, maximum core temperature during exercise rose by about 1.4 °C and exceeded 40 °C in some astronauts, and a non-invasive forehead sensor (skin temperature plus heat flux) was used for measurement |
| *Heat Safety in Space Keeps Infants and Patients Safe on Earth* (Jul 22, 2022) | NASA Space Station Research Integration Office | https://www.nasa.gov/missions/station/heat-safety-in-space-keeps-infants-and-patients-safe-on-earth/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Body temperature indicator: the ESA Thermolab study found that core body temperature rises faster during exercise on the ISS, with resting temperature rising by about one degree to 38 °C in the first two months, measured with a forehead sensor |
| *Help NASA Find Practical Ways to Monitor Astronaut Body Temperature in Low Earth Orbit* | NASA | https://www.nasa.gov/help-nasa-find-practical-ways-to-monitor-astronaut-body-temperature-in-low-earth-orbit/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Body temperature indicator: NASA call for practical methods to monitor astronaut body temperature in low Earth orbit |
| *Sleep Accommodations Technical Brief* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Sleep hours indicator |
| *6.0 Medical Operations* (NASA-STD-3001 Volume 1) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/reference/6-0-medical-operations/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Mood indicator: behavioral health and performance requirements, including psychological support programs and private psychological communication, with spaceflight stressors that can affect mood, behavior, cognition and performance |
| *Food and Nutrition Risk* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/food-and-nutrition-risk/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Body mass indicator |
| *Human Adaptation 2021* | NASA | https://www.nasa.gov/wp-content/uploads/2024/08/human-adaptation-2021-final-b.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Body mass and Vision changes indicators |
| *Pulse Oximeter Basics* | U.S. Food and Drug Administration (FDA) | https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics | U.S. Government website content; generally public domain unless otherwise noted | Evidence link for the Blood oxygen (SpO2) indicator |
| *NASA-STD-3001, Volume 2, Revision C* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://standards.nasa.gov/sites/default/files/standards/NASA/C/2022-04-08-NASA-STD-3001-Vol-2-Rev-C-Final_0.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Blood oxygen (SpO2) indicator |
| *Risk of Spaceflight-Induced Bone Changes* | NASA | https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Bone health indicator |
| *Bone and Mineral Evaluation and Analysis* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Bone health indicator |
| *Immune Risk* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/immune-risk/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Immune signs / symptoms indicator |
| *NASA Investigates How Dormant Viruses Behave During Spaceflight* | NASA | https://www.nasa.gov/humans-in-space/nasa-investigates-how-dormant-viruses-behave-during-spaceflight/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Immune signs / symptoms indicator |
| *Nutritional Biochemistry* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/nutritional-biochemistry/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Nutrition & hydration indicator |
| *OCHMO-TB-031 Exercise Overview* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Exercise indicator |
| *Astronaut Exercise* | NASA | https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Exercise indicator |
| *OCHMO-MTB-001 Spaceflight-Associated Neuro-ocular Syndrome (SANS)* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Vision changes indicator |
| *Risk of Spaceflight Associated Neuro-Ocular Syndrome (SANS)* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Vision changes indicator |
| *Space Radiation Hazard* | NASA Human Research Program | https://www.nasa.gov/hrp/hazard-space-radiation/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Radiation dose (exposure context) indicator |
| *4.0 Human Performance* (NASA-STD-3001) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/reference/4-0-human-performance/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Radiation dose (exposure context) indicator |
| *Space Radiation FAQ* | NASA Johnson Space Center, Space Radiation Analysis Group (SRAG) | https://srag.jsc.nasa.gov/spaceradiation/faq/faq.cfm | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Radiation dose (exposure context) indicator |
| *NASA-STD-3001, Volume 1, Revision B: Crew Health* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2020/10/2022-01-05_nasa-std-3001_vol.1_rev._b_final_draft_with_signature_010522.pdf | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Radiation dose (exposure context) indicator |
| *HHC Spaceflight Risks* | NASA Human Health and Countermeasures | https://www.nasa.gov/humans-in-space/hhc-spaceflight-risks/ | NASA content; generally not copyrighted (see NASA usage guidelines) | Evidence link for the Pulmonary function indicator |

---

## 6. Third-Party Open-Source License Notices
This software incorporates unmodified open-source components governed by **MIT**, **Apache-2.0**, **BSD-2-Clause**, **BSD-3-Clause**, **ISC**, and **MPL-2.0** (build-time CSS tooling via `lightningcss` and Rust CSS crates). Full lockfiles (`package-lock.json` and `Cargo.lock`) remain in the repository as the complete transitive dependency manifest.
