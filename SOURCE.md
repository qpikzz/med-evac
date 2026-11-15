# 📚 Sources, Licenses & Attributions — MED-EVAC

> **Project License:** This project is licensed under the **Apache License 2.0** (OSI-approved open-source license), in accordance with the NASA Space Apps Challenge 2026 Terms & Conditions.
>
> **Disclaimer:** MED-EVAC is an independent project created by the **ORBITA project team** for the NASA Space Apps Challenge. It is not officially affiliated with, endorsed, or sponsored by NASA.

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
| **Recharts** | `3.10.1` · `https://github.com/recharts/recharts` | **MIT** | 7-day trend sparklines in the indicator cards (`src/components/charts/TrendSparkline.tsx`) |
| **Motion** (`motion`) | `14.9.0` · `https://github.com/motiondivision/motion` | **MIT** | Screen transitions, indicator-card entrance, animated radiation alert (`src/components/RadiationAlert/`); respects `prefers-reduced-motion` |
| **Custom Interactive Body Map SVG** | Original work by the ORBITA project contributors | **Apache-2.0** | Interactive anatomical figure for health status visualization |
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
| *Risk of Cardiovascular Adaptations* | NASA Human Research Program | https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/ | NASA website content | Evidence link for the Blood pressure indicator: spaceflight can alter the heart and blood vessels, low blood pressure raises the chance of fainting at landing, and countermeasures include exercise, diet, lower-body compression garments and fluids |
| *Fluid shifts, vasodilatation and ambulatory blood pressure reduction during long duration spaceflight* (Norsk et al., J Physiol 2015;593(3):573–584) | The Journal of Physiology | https://pubmed.ncbi.nlm.nih.gov/25774397/ | Abstract publicly available; full text in PMC (PMC4324706) | Evidence link for in-flight 24-hour blood pressure compared with preflight values in long-duration spaceflight |
| *PubMed record PMID 41390616* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/41390616/ | CC BY-NC-ND 4.0 | Evidence link for the Blood pressure indicator |
| *PubMed record PMID 30189994* (J Am Coll Cardiol 2018;72(11):1187–1197) | NIH National Library of Medicine (PubMed); Journal of the American College of Cardiology | https://pubmed.ncbi.nlm.nih.gov/30189994/ | Abstract publicly available | Evidence link for the Blood pressure indicator |
| *NASA Shares Station Research Today Supporting Moon, Mars Tomorrow* (Aug 11, 2026) | NASA International Space Station Research Communications Team | https://www.nasa.gov/missions/station/iss-research/nasa-shares-station-research-today-supporting-moon-mars-tomorrow/ | NASA website content  | Evidence link for the Heart rate indicator: the CARDIOBREATH investigation uses the Bio-Monitor "smart shirt" to track heart rate, blood pressure, breathing rate and activity during exercise aboard the ISS |
| *PubMed record PMID 41027905* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/41027905/ | CC BY 4.0 | Evidence link for the Heart rate indicator |
| *Journal of the American College of Cardiology article (DOI 10.1016/j.jacc.2023.05.058)* | Journal of the American College of Cardiology | https://www.jacc.org/doi/10.1016/j.jacc.2023.05.058 | Abstract publicly available | Evidence link for the Heart rate indicator |
| *Human Adaptation to Spaceflight (2021)* | NASA | https://www.nasa.gov/wp-content/uploads/2015/02/human_adaptation_2021_final.pdf | NASA publication | Evidence link for the Blood sugar indicator |
| *PubMed record PMID 36224737* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/36224737/ | Abstract publicly available | Evidence link for the Blood sugar indicator |
| *PubMed record PMID 41358894* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/41358894/ | Abstract publicly available | Evidence link for the Blood sugar indicator |
| *Increased core body temperature in astronauts during long-duration space missions* (Stahn et al., Sci Rep 2017;7:16180) | Scientific Reports (Springer Nature); Charité – Universitätsmedizin Berlin | https://pmc.ncbi.nlm.nih.gov/articles/PMC5701078/ | CC BY 4.0 (Open Access) | Evidence link for the Body temperature indicator: resting core temperature rose about 1 °C over 2.5 months on the ISS and plateaued after about 75 days, maximum core temperature during exercise rose by about 1.4 °C and exceeded 40 °C in some astronauts, and a non-invasive forehead sensor (skin temperature plus heat flux) was used for measurement |
| *Heat Safety in Space Keeps Infants and Patients Safe on Earth* (Jul 22, 2022) | NASA Space Station Research Integration Office | https://www.nasa.gov/missions/station/heat-safety-in-space-keeps-infants-and-patients-safe-on-earth/ | NASA website content | Evidence link for the Body temperature indicator: the ESA Thermolab study found that core body temperature rises faster during exercise on the ISS, with resting temperature rising by about one degree to 38 °C in the first two months, measured with a forehead sensor |
| *Help NASA Find Practical Ways to Monitor Astronaut Body Temperature in Low Earth Orbit* | NASA | https://www.nasa.gov/help-nasa-find-practical-ways-to-monitor-astronaut-body-temperature-in-low-earth-orbit/ | NASA website content | Evidence link for the Body temperature indicator: NASA call for practical methods to monitor astronaut body temperature in low Earth orbit |
| *Prevalence of sleep deficiency and use of hypnotic drugs in astronauts before, during, and after spaceflight: an observational study* (Barger et al., Lancet Neurol 2014;13(9):904–912) | The Lancet Neurology (Elsevier); Brigham and Women's Hospital; Harvard Medical School; University of Colorado | https://doi.org/10.1016/S1474-4422(14)70122-X |  Abstract publicly available | Evidence link for the Sleep hours indicator: actigraphy sleep data from astronauts on shuttle and ISS missions, with average in-flight sleep of about 6 hours against 8.5 hours scheduled, and sleep deficiency already present during preflight training |
| *Sleep Accommodations Technical Brief* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2023/03/sleep-accomodations-technical-brief-ochmo.pdf | NASA publication | Evidence link for the Sleep hours indicator |
| *PubMed Central article PMC4434546* | NIH National Library of Medicine (PubMed Central) | https://pmc.ncbi.nlm.nih.gov/articles/PMC4434546/ | Abstract publicly available | Evidence link for the Sleep hours indicator |
| *6.0 Medical Operations* (NASA-STD-3001 Volume 1) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/reference/6-0-medical-operations/ | NASA website content | Evidence link for the Mood indicator: behavioral health and performance requirements, including psychological support programs and private psychological communication, with spaceflight stressors that can affect mood, behavior, cognition and performance |
| *NASA Technical Reports Server record 20250001454* | NASA | https://ntrs.nasa.gov/citations/20250001454 | NASA publication | Evidence link for the Mood indicator |
| *Nature article s41586-024-07648-x* | Nature (Springer Nature) | https://www.nature.com/articles/s41586-024-07648-x | CC BY 4.0 | Evidence link for the Mood indicator |
| *PubMed record PMID 25197887* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/25197887/ | Abstract publicly available | Evidence link for the Body mass indicator |
| *Food and Nutrition Risk* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/food-and-nutrition-risk/ | NASA website conten | Evidence link for the Body mass indicator |
| *Human Adaptation to Spaceflight (2021)* | NASA | https://www.nasa.gov/wp-content/uploads/2024/08/human-adaptation-2021-final-b.pdf | NASA publication | Evidence link for the Body mass and Vision changes indicators |
| *PubMed record PMID 28539140* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/28539140/ | Abstract publicly available | Evidence link for the Blood oxygen (SpO2) indicator |
| *Pulse Oximeter Basics* | U.S. Food and Drug Administration (FDA) | https://www.fda.gov/consumers/consumer-updates/pulse-oximeter-basics | FDA website content | Evidence link for the Blood oxygen (SpO2) indicator |
| *NASA-STD-3001, Volume 2, Revision C* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://standards.nasa.gov/sites/default/files/standards/NASA/C/2022-04-08-NASA-STD-3001-Vol-2-Rev-C-Final_0.pdf | NASA standard | Evidence link for the Blood oxygen (SpO2) indicator |
| *Risk of Spaceflight-Induced Bone Changes* | NASA | https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/ | NASA website content | Evidence link for the Bone health indicator |
| *Bone and Mineral Evaluation and Analysis* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/bone-and-mineral-evaluation-and-analysis | NASA website content | Evidence link for the Bone health indicator |
| *ISCD 2023 Official Positions* | International Society for Clinical Densitometry (ISCD) | https://iscd.org/official-positions-2023/ | ISCD website content; society terms apply | Evidence link for the Bone health indicator |
| *Immune Risk* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/immune-risk/ | NASA website content | Evidence link for the Immune signs / symptoms indicator |
| *NASA Investigates How Dormant Viruses Behave During Spaceflight* | NASA | https://www.nasa.gov/humans-in-space/nasa-investigates-how-dormant-viruses-behave-during-spaceflight/ | NASA website content | Evidence link for the Immune signs / symptoms indicator |
| *Nutritional Biochemistry* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/nutritional-biochemistry/ | NASA website content | Evidence link for the Nutrition & hydration indicator |
| *PubMed record PMID 38144801* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/38144801/ | Creative Commons license | Evidence link for the Nutrition & hydration indicator |
| *PubMed record PMID 11435529* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/11435529/ | Abstract publicly available / Full text copyrighted (S. Karger AG) | Evidence link for the Nutrition & hydration indicator |
| *OCHMO-TB-031 Exercise Overview* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/ | NASA website content | Evidence link for the Exercise indicator |
| *npj Microgravity article s41526-020-00111-x* | npj Microgravity (Springer Nature) | https://www.nature.com/articles/s41526-020-00111-x | CC BY 4.0 | Evidence link for the Exercise indicator |
| *Astronaut Exercise* | NASA | https://www.nasa.gov/missions/station/iss-research/astronaut-exercise/ | NASA website content | Evidence link for the Exercise indicator |
| *OCHMO-MTB-001 Spaceflight-Associated Neuro-ocular Syndrome (SANS)* | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2024/02/ochmo-mtb-001-sans.pdf | NASA publication | Evidence link for the Vision changes indicator |
| *PubMed Central article PMC13462731* | NIH National Library of Medicine (PubMed Central) | https://pmc.ncbi.nlm.nih.gov/articles/PMC13462731/ | Publisher terms apply | Evidence link for the Vision changes indicator |
| *Risk of Spaceflight Associated Neuro-Ocular Syndrome (SANS)* | NASA | https://www.nasa.gov/directorates/esdmd/hhp/risk-of-spaceflight-associated-neuro-ocular-syndrome/ | NASA website content | Evidence link for the Vision changes indicator |
| *Space Radiation Hazard* | NASA Human Research Program | https://www.nasa.gov/hrp/hazard-space-radiation/ | NASA website content | Evidence link for the Radiation dose (exposure context) indicator |
| *4.0 Human Performance* (NASA-STD-3001) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/reference/4-0-human-performance/ | NASA website content | Evidence link for the Radiation dose (exposure context) indicator |
| *Space Radiation FAQ* | NASA Johnson Space Center, Space Radiation Analysis Group (SRAG) | https://srag.jsc.nasa.gov/spaceradiation/faq/faq.cfm | NASA website content | Evidence link for the Radiation dose (exposure context) indicator |
| *NASA-STD-3001, Volume 1, Revision C: Crew Health* (approved 15 Sep 2023; supersedes Rev. B) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://standards.nasa.gov/sites/default/files/standards/NASA/C/nasa-std-3001-vol-1-rev-c-signature.pdf | Open access (free public PDF). U.S. Government work — not subject to copyright in the U.S. | Career radiation limit **600 mSv** effective dose (same for all ages and sexes). Reference limit of the Dose budget meter; basis of the illustrative `rad_y_accum` (80 % = 480 mSv) and `rad_r_accum` (600 mSv) thresholds in `rules.json`. Value confirmed via the OCHMO technical brief below |
| *Radiation Protection — NASA-STD-3001 Technical Brief* (OCHMO-TB-020) | NASA Office of the Chief Health and Medical Officer (OCHMO) | https://www.nasa.gov/wp-content/uploads/2023/12/ochmo-tb-020-radiation-protection.pdf | Open access (free public PDF). U.S. Government work — not subject to copyright in the U.S. | Plain-language summary of the 600 mSv career limit (≈ 3 % mean risk of cancer mortality). Also states the 250 mSv solar-particle-event design limit (background only; not used in the app) |
| *SwRI-led team calculates the radiation exposure associated with a trip to Mars* (press release, 30 May 2013) | Southwest Research Institute (SwRI) | https://www.swri.org/newsroom/press-releases/swri-led-team-calculates-the-radiation-exposure-associated-trip-mars | Open access web page. © Southwest Research Institute — only facts/numbers cited with attribution, no text copied | **Primary source of the 1.8 mSv/day** cruise dose-equivalent rate (galactic cosmic rays, measured by MSL/RAD; low-to-moderate solar activity). Used for the synthetic radiation history (≈ 75 µSv/h; 1.8 mSv × day), the projection to Mars arrival, and the illustrative `rad_y_rate` threshold (2 × 75 = 150 µSv/h) |
| *Measurements of Energetic Particle Radiation in Transit to Mars on the Mars Science Laboratory* — Zeitlin C. et al., *Science* 340(6136):1080–1084, 31 May 2013 | MSL Radiation Assessment Detector (RAD) team (SwRI, NASA JPL, Univ. of Kiel, DLR and others) | https://doi.org/10.1126/science.1235989 | **Paywalled** (Science subscription); abstract publicly visible. © AAAS. Full text not read — cited as the original peer-reviewed study behind the SwRI numbers | From the public abstract: dose equivalent ≈ 0.66 ± 0.12 Sv for the shortest round trip with current propulsion (cross-check: 0.66 Sv ÷ 1.8 mSv/day ≈ 360 days ≈ 2 × 180-day transits) |
| *Human Exploration of Mars Design Reference Architecture 5.0* (NASA/SP-2009-566, July 2009) | NASA Mars Architecture Steering Group | https://www.nasa.gov/pdf/373665main_NASA-SP-2009-566.pdf | Open access (free public PDF). U.S. Government work — not subject to copyright in the U.S. | Crew transit Earth→Mars ≈ 180 days (average, conjunction-class mission). Used for the illustrative one-way transit length `TRANSIT_DAYS = 180` and the "At Mars arrival (day 180)" projection |
| *HHC Spaceflight Risks* | NASA Human Health and Countermeasures | https://www.nasa.gov/humans-in-space/hhc-spaceflight-risks/ | NASA website content | Evidence link for the Pulmonary function indicator |
| *PubMed Central article PMC9818606* | NIH National Library of Medicine (PubMed Central) | https://pmc.ncbi.nlm.nih.gov/articles/PMC9818606/ | CC BY 4.0 | Evidence link for the Pulmonary function indicator |
| *European Respiratory Journal, vol. 60, issue 1, article 2101499* | European Respiratory Society | https://publications.ersnet.org/content/erj/60/1/2101499 | Public domain | Evidence link for the Pulmonary function indicator |
| *PubMed record PMID 34058745* | NIH National Library of Medicine (PubMed) | https://pubmed.ncbi.nlm.nih.gov/34058745/ | Abstract publicly available / Full text copyrighted (S. Karger AG) | Evidence link for the Skin health indicator |
| *PubMed Central article PMC9604750* | NIH National Library of Medicine (PubMed Central) | https://pmc.ncbi.nlm.nih.gov/articles/PMC9604750/ | CC BY 4.0 | Evidence link for the Skin health indicator |
| *ScienceDirect article S0738081X25002858* | Elsevier (ScienceDirect) | https://www.sciencedirect.com/science/article/pii/S0738081X25002858 | CC BY 4.0 | Evidence link for the Skin health indicator |



## 5. Media, Fonts & Branding
* **Application Icons & UI Graphics:** Original artwork created by the ORBITA project contributors (**Apache-2.0**). Default starter template icons/logos (`tauri.svg`, `vite.svg`, default `src-tauri/icons/`) are replaced before submission to comply with third-party trademark and CC-BY-NC-ND restrictions.
* **Body map figure (`src/components/BodyMap/BodyMap.tsx`):** Placeholder line-art silhouettes (skin, organs, skeleton) drawn as inline SVG by the ORBITA project contributors (**Apache-2.0**). Optional layer art from Rəna goes in `src/assets/body/` and must be listed here with its licence; AI-generated art also needs an "AI-generated illustration" note in About/Credits.
* **Dark space theme (`src/styles/theme.css`):** Original; starfield is pure CSS radial-gradients, no image files.
* **Typography:** System sans-serif stack (`system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif`) referenced via CSS without bundling proprietary font binaries.
* **Demo Video & Screenshots:** Original screen recordings and narration produced by the ORBITA project team with full written consent of all adult participants and zero third-party copyrighted audio/video.

---

## 6. Third-Party Open-Source License Notices
This software incorporates unmodified open-source components governed by **MIT**, **Apache-2.0**, **BSD-2-Clause**, **BSD-3-Clause**, **ISC**, and **MPL-2.0** (build-time CSS tooling via `lightningcss` and Rust CSS crates). Full lockfiles (`package-lock.json` and `Cargo.lock`) remain in the repository as the complete transitive dependency manifest.
