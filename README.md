# 🏥 Virginia Low-Income Family Healthcare Navigator

**Built by Perpetual T. Adu**

A conversational AI chatbot that helps low-income families in Virginia navigate the U.S. healthcare system — finding free clinics, understanding Medicaid and CHIP eligibility, and connecting families with real resources.

🔗 **[Live Demo →](https://neon-chebakia-6db908.netlify.app)** 
🌐 **[Portfolio →](https://sites.google.com/view/perpetual-adu-analysis/home)**


---

## 📌 Project Overview

Millions of low-income families in Virginia struggle to understand what healthcare coverage they qualify for and where to access free or low-cost care. This project addresses that gap by combining **real government datasets** with a **conversational AI interface** — making complex eligibility rules accessible to everyday users.

---

## 🧠 Data Science Skills Demonstrated

| Skill | How It Appears in This Project |
|---|---|
| **Data sourcing** | Sourced real clinic data from HRSA government open data portal |
| **Data filtering & cleaning** | Filtered 2024 HRSA national dataset down to active Virginia sites |
| **Rules-based logic engine** | Built an eligibility calculator using 2026 HHS Federal Poverty Level formulas |
| **API integration** | Integrated Anthropic Claude AI API with structured prompting |
| **Intent detection** | Built a keyword-based NLP layer to detect user needs and trigger structured responses |
| **Data structuring** | Organized clinic and policy data into structured JSON for querying |
| **Frontend development** | Built a full responsive chat UI (HTML, CSS, JavaScript) |
| **Deployment** | Deployed via GitHub → Netlify CI/CD pipeline |
| **Documentation** | Wrote clear data source attribution and methodology |

---

## 📊 Data Sources

### 1. HRSA Health Center Service Delivery Sites (2024)
- **URL:** https://data.hrsa.gov/topics/health-centers/
- **Format:** CSV / XLSX (~5.4 MB national dataset)
- **Used for:** Free and federally qualified health center locations across Virginia
- **Processing:** Filtered for Virginia (State = VA), active sites only, retained: name, address, phone, services, zip

### 2. Virginia Medicaid & CHIP Eligibility Rules
- **URL:** https://coverva.dmas.virginia.gov
- **Source:** Virginia Department of Medical Assistance Services (DMAS)
- **Used for:** Eligibility thresholds by program and population group
  - Adults (19–64): ≤ 138% FPL
  - Children (FAMIS Plus): ≤ 148% FPL
  - Pregnant women: ≤ 143% FPL
  - CHIP/FAMIS children: 148–205% FPL
  - FAMIS MOMS (pregnant): 143–205% FPL

### 3. Federal Poverty Level Guidelines (2026)
- **URL:** https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
- **Source:** U.S. Department of Health & Human Services (HHS)
- **Used for:** Eligibility math engine
  - Base (household of 1): $15,060/year
  - Each additional person: + $5,380/year

---

## 🗂 Project Structure

```
healthcare-navigator/
│
├── index.html      # Entry point — chat UI markup & accessibility
├── style.css       # All styling — responsive, mobile-first design
├── script.js       # Chatbot logic: API calls, intent detection, rendering
├── data.js         # Data layer: clinics, eligibility rules, FPL engine
└── README.md       # This file
```

### File Responsibilities

**`data.js`** — The data science layer
- `FPL_2026`: Math engine for Federal Poverty Level calculations
- `VA_ELIGIBILITY`: Virginia Medicaid/CHIP rules + `.check()` method that runs eligibility logic
- `VA_CLINICS`: 15 real Virginia clinic records from the HRSA 2024 dataset
- `searchClinics()`: Filter function by city or service type

**`script.js`** — The intelligence layer
- `detectIntent()`: Keyword NLP to identify what the user needs
- `callAI()`: Manages conversation history and Anthropic API calls
- `renderClinicCards()`: Formats clinic data as structured UI cards
- `renderEligibilityCards()`: Formats eligibility results with apply links
- Conversation memory: full history passed on every API call

**`style.css`** — The design layer
- CSS custom properties (design tokens) for consistent theming
- Animated typing indicator and message fade-in
- Mobile-responsive layout using `clamp()` and media queries

**`index.html`** — The structure layer
- Semantic HTML5 with ARIA roles for screen reader accessibility
- ES Module loading (`type="module"`) for clean JS imports

---

## ⚙️ How It Works (Architecture)

```
User types message
       ↓
detectIntent() — keyword scan for clinics / eligibility
       ↓
callAI() — sends message + full history to Claude API
       ↓
AI responds with plain-language healthcare guidance
       ↓
If clinic intent + city found  →  searchClinics() → renderClinicCards()
If eligibility intent + data   →  VA_ELIGIBILITY.check() → renderEligibilityCards()
       ↓
Final HTML rendered in chat window
```

---

## 🚀 How to Run Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/YOUR_USERNAME/healthcare-navigator.git
   cd healthcare-navigator
   ```

2. You need a local server (browsers block ES Modules from `file://`). Use one of:
   ```bash
   # Option A: Python (built into most computers)
   python -m http.server 8000

   # Option B: Node.js
   npx serve .
   ```

3. Open `http://localhost:8000` in your browser

4. **API Key:** The project uses a Netlify serverless proxy in production. For local testing, see the deployment section.

---

## ☁️ Deployment

This project is deployed using a **GitHub → Netlify** CI/CD pipeline:

1. Code lives in this GitHub repository
2. Netlify watches for new commits and auto-deploys
3. The Anthropic API key is stored as a **Netlify environment variable** — never in the code
4. A Netlify serverless function (`/netlify/functions/chat.js`) acts as a secure proxy

---

## 🔮 Future Improvements

- [ ] Add geolocation API to auto-detect user's city for clinic search
- [ ] Expand clinic dataset to all 50+ HRSA-listed Virginia sites
- [ ] Add language toggle (English / Spanish) for broader accessibility
- [ ] Integrate live HRSA API for real-time clinic data
- [ ] Add a data dashboard showing Virginia Medicaid enrollment trends (UDS data)

---

## ⚠️ Disclaimer

This tool is for informational purposes only. Always verify eligibility at [coverva.dmas.virginia.gov](https://coverva.dmas.virginia.gov). This is not a substitute for legal or medical advice.

---

## 👩‍💻 About the Developer

**Perpetual T. Adu** — Data Scientist

*This project was built to demonstrate practical data science skills applied to a real social impact problem: helping low-income families access healthcare resources they may not know they qualify for.*
