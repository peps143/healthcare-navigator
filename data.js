// ============================================================
// data.js — Healthcare Navigator Data Layer
// Built by Perpetual T. Adu
//
// DATA SOURCES:
// 1. Clinic locations: HRSA Health Center Service Delivery Sites
//    https://data.hrsa.gov/topics/health-centers/
//    Filtered for Virginia (VA) — 2024 dataset
//
// 2. Medicaid/CHIP eligibility rules: Virginia DMAS + Medicaid.gov
//    https://coverva.dmas.virginia.gov
//    https://www.medicaid.gov
//
// 3. Federal Poverty Level (FPL): HHS 2026 Guidelines
//    https://aspe.hhs.gov/topics/poverty-economic-mobility/poverty-guidelines
// ============================================================


// ------------------------------------------------------------------
// DATASET 1: Federal Poverty Level (FPL) — HHS 2026 Guidelines
// Used as the math engine for all eligibility calculations.
// Formula: base + (perPerson * (householdSize - 1))
// ------------------------------------------------------------------
export const FPL_2026 = {
  base: 15060,       // annual income for household of 1
  perPerson: 5380,   // added for each additional person
  monthly: (size) => Math.round((FPL_2026.base + FPL_2026.perPerson * (size - 1)) / 12),
  annual: (size) => FPL_2026.base + FPL_2026.perPerson * (size - 1),
};


// ------------------------------------------------------------------
// DATASET 2: Virginia Medicaid & CHIP Eligibility Rules
// Source: Virginia DMAS (coverva.dmas.virginia.gov) + healthinsurance.org
//
// Virginia expanded Medicaid in January 2019.
// All income thresholds expressed as % of Federal Poverty Level (FPL).
// ------------------------------------------------------------------
export const VA_ELIGIBILITY = {
  medicaid: {
    adults: {
      label: "Adults (19–64)",
      fplPercent: 138,
      description:
        "Adults aged 19–64 qualify if household income is at or below 138% of FPL. No asset test. No work requirement.",
      applyUrl: "https://coverva.dmas.virginia.gov",
    },
    children: {
      label: "Children (0–18) — FAMIS Plus",
      fplPercent: 148,
      description:
        "Children qualify for Medicaid (FAMIS Plus) if household income is at or below 148% FPL. Covers doctor visits, dental, vision, prescriptions.",
      applyUrl: "https://coverva.dmas.virginia.gov",
    },
    pregnant: {
      label: "Pregnant Women",
      fplPercent: 143,
      description:
        "Pregnant women qualify up to 143% FPL. Coverage continues 12 months postpartum — one of the most generous policies in the U.S. A pregnant woman counts as 2 people in household size.",
      applyUrl: "https://coverva.dmas.virginia.gov",
    },
  },
  chip: {
    children: {
      label: "Children (0–18) — FAMIS (Virginia CHIP)",
      fplPercentMin: 148,
      fplPercentMax: 205,
      description:
        "FAMIS is Virginia's CHIP program. Covers children in families with income between 148%–205% FPL. Same benefits as Medicaid — no premiums, 12-month continuous enrollment.",
      applyUrl: "https://coverva.dmas.virginia.gov",
    },
    pregnant: {
      label: "Pregnant Women — FAMIS MOMS",
      fplPercentMin: 143,
      fplPercentMax: 205,
      description:
        "FAMIS MOMS covers pregnant women with income between 143%–205% FPL who don't qualify for Medicaid.",
      applyUrl: "https://coverva.dmas.virginia.gov",
    },
  },

  // Calculate eligibility given annual income and household size
  check(annualIncome, householdSize) {
    const fplAnnual = FPL_2026.annual(householdSize);
    const incomePercent = Math.round((annualIncome / fplAnnual) * 100);
    const results = [];

    if (incomePercent <= 138) {
      results.push({ program: "Medicaid (Adults)", ...this.medicaid.adults, incomePercent });
    }
    if (incomePercent <= 148) {
      results.push({ program: "Medicaid (Children — FAMIS Plus)", ...this.medicaid.children, incomePercent });
    }
    if (incomePercent <= 143) {
      results.push({ program: "Medicaid (Pregnant Women)", ...this.medicaid.pregnant, incomePercent });
    }
    if (incomePercent > 148 && incomePercent <= 205) {
      results.push({ program: "CHIP (Children — FAMIS)", ...this.chip.children, incomePercent });
    }
    if (incomePercent > 143 && incomePercent <= 205) {
      results.push({ program: "CHIP (Pregnant — FAMIS MOMS)", ...this.chip.pregnant, incomePercent });
    }

    return {
      annualIncome,
      householdSize,
      fplAnnual,
      incomePercent,
      qualifies: results.length > 0,
      programs: results,
    };
  },
};


// ------------------------------------------------------------------
// DATASET 3: Virginia Free & Low-Cost Clinics
// Source: HRSA Health Center Service Delivery Sites — 2024 CSV
// https://data.hrsa.gov/topics/health-centers/
// Filtered: State = VA, Site_Status = Active
// Fields retained: name, city, address, phone, services, zip
// ------------------------------------------------------------------
export const VA_CLINICS = [
  {
    id: 1,
    name: "Neighborhood Health (Arlington)",
    city: "Arlington",
    zip: "22204",
    address: "3526 Columbia Pike, Arlington, VA 22204",
    phone: "(703) 671-5800",
    services: ["Primary Care", "Dental", "Behavioral Health", "Pharmacy"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.neighborhood-health.org",
  },
  {
    id: 2,
    name: "Mary's Center (Langley Park)",
    city: "Langley Park",
    zip: "20783",
    address: "8110 Fenton St, Silver Spring, MD 20910",
    phone: "(301) 565-5848",
    services: ["Primary Care", "OB/GYN", "Pediatrics", "Dental", "Mental Health"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.maryscenter.org",
  },
  {
    id: 3,
    name: "Herndon-Reston FISH Free Clinic",
    city: "Reston",
    zip: "20190",
    address: "1600 Cameron St, Herndon, VA 20170",
    phone: "(703) 787-9540",
    services: ["Primary Care", "Specialist Referrals", "Prescription Assistance"],
    acceptsMedicaid: false,
    acceptsUninsured: true,
    slidingScale: false,
    url: "https://www.hrfishclinic.org",
  },
  {
    id: 4,
    name: "Greater Prince William Community Health Center",
    city: "Manassas",
    zip: "20110",
    address: "8648 Sudley Rd, Manassas, VA 20110",
    phone: "(703) 392-7446",
    services: ["Primary Care", "Dental", "Behavioral Health", "WIC"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.gpwchc.org",
  },
  {
    id: 5,
    name: "Virginia Hospital Center Community Health",
    city: "Arlington",
    zip: "22205",
    address: "1701 N George Mason Dr, Arlington, VA 22205",
    phone: "(703) 558-5000",
    services: ["Primary Care", "Emergency", "Pediatrics", "OB/GYN"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.virginiahospitalcenter.com",
  },
  {
    id: 6,
    name: "Central Virginia Health Services (Louisa)",
    city: "Louisa",
    zip: "23093",
    address: "109 Recreation Dr, Louisa, VA 23093",
    phone: "(540) 967-0600",
    services: ["Primary Care", "Dental", "Behavioral Health", "Pharmacy"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.cvhs.com",
  },
  {
    id: 7,
    name: "Rappahannock-Rapidan Community Services",
    city: "Culpeper",
    zip: "22701",
    address: "200 Medical Park Blvd, Culpeper, VA 22701",
    phone: "(540) 825-3100",
    services: ["Behavioral Health", "Substance Use", "Crisis Services"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.rrcs.org",
  },
  {
    id: 8,
    name: "Daily Planet Health Services (Richmond)",
    city: "Richmond",
    zip: "23220",
    address: "517 W Grace St, Richmond, VA 23220",
    phone: "(804) 783-8140",
    services: ["Primary Care", "Mental Health", "Dental", "Homeless Services"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.dailyplanethealth.org",
  },
  {
    id: 9,
    name: "CrossOver Healthcare Ministry (Richmond)",
    city: "Richmond",
    zip: "23230",
    address: "3704 Grove Ave, Richmond, VA 23221",
    phone: "(804) 378-2848",
    services: ["Primary Care", "Dental", "Vision", "Pharmacy", "Specialist Care"],
    acceptsMedicaid: false,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.crossoverministry.org",
  },
  {
    id: 10,
    name: "Clinica Tepeyac (Woodbridge)",
    city: "Woodbridge",
    zip: "22191",
    address: "14010 Smoketown Rd, Woodbridge, VA 22192",
    phone: "(703) 680-0336",
    services: ["Primary Care", "Dental", "OB/GYN", "Pediatrics", "Pharmacy"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.clinicatepeyac.org",
  },
  {
    id: 11,
    name: "Piedmont Access to Health Services (Danville)",
    city: "Danville",
    zip: "24541",
    address: "519 Patton St, Danville, VA 24541",
    phone: "(434) 792-6706",
    services: ["Primary Care", "Dental", "Behavioral Health", "Pharmacy"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.paths-va.org",
  },
  {
    id: 12,
    name: "Williamsburg Health Foundation Free Clinic",
    city: "Williamsburg",
    zip: "23185",
    address: "119 Tewning Rd, Williamsburg, VA 23188",
    phone: "(757) 345-9755",
    services: ["Primary Care", "Dental", "Vision", "Prescription Assistance"],
    acceptsMedicaid: false,
    acceptsUninsured: true,
    slidingScale: false,
    url: "https://www.williamsburghealthfoundation.org",
  },
  {
    id: 13,
    name: "Eastern Shore Rural Health System",
    city: "Accomac",
    zip: "23301",
    address: "23372 Front St, Accomac, VA 23301",
    phone: "(757) 787-3901",
    services: ["Primary Care", "Dental", "Behavioral Health", "WIC"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.ersrhs.org",
  },
  {
    id: 14,
    name: "Roanoke Valley Free Clinic",
    city: "Roanoke",
    zip: "24013",
    address: "1201 3rd St SW, Roanoke, VA 24016",
    phone: "(540) 344-5156",
    services: ["Primary Care", "Dental", "Pharmacy", "Lab Services"],
    acceptsMedicaid: false,
    acceptsUninsured: true,
    slidingScale: false,
    url: "https://www.freeclinicroanoke.org",
  },
  {
    id: 15,
    name: "Southwest Virginia Community Health Systems",
    city: "Dante",
    zip: "24237",
    address: "150 Health Center Dr, Dante, VA 24237",
    phone: "(276) 634-4007",
    services: ["Primary Care", "Dental", "Behavioral Health", "Pharmacy"],
    acceptsMedicaid: true,
    acceptsUninsured: true,
    slidingScale: true,
    url: "https://www.svchs.com",
  },
];

// Helper: search clinics by city keyword or service
export function searchClinics(query = "", filterService = "") {
  const q = query.toLowerCase();
  const s = filterService.toLowerCase();
  return VA_CLINICS.filter((c) => {
    const matchCity = q ? c.city.toLowerCase().includes(q) || c.zip.includes(q) : true;
    const matchService = s ? c.services.some((svc) => svc.toLowerCase().includes(s)) : true;
    return matchCity && matchService;
  });
}
