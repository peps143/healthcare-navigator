// ============================================================
// script.js — Healthcare Navigator Chatbot Logic
// Built by Perpetual T. Adu
//
// This file handles:
//   1. Sending messages to the Anthropic API
//   2. Eligibility calculation using the FPL data engine
//   3. Clinic search from the HRSA dataset
//   4. Rendering structured responses in the chat UI
// ============================================================

import { VA_ELIGIBILITY, VA_CLINICS, FPL_2026, searchClinics } from "./data.js";

// ---------- DOM References ----------
const messagesEl   = document.getElementById("messages");
const inputEl      = document.getElementById("user-input");
const sendBtn      = document.getElementById("send-btn");
const quickReplies = document.getElementById("quick-replies");

// ---------- Conversation History ----------
// Keeps the full back-and-forth so the AI has context each turn
let conversationHistory = [];

// ---------- System Prompt ----------
// This is the instruction set that makes the AI an expert healthcare navigator.
// It is built from the real Virginia Medicaid/CHIP rules in data.js.
const SYSTEM_PROMPT = `
You are a compassionate and knowledgeable healthcare navigator helping low-income families in Virginia understand their healthcare options.

You were built by Perpetual T. Adu, a data scientist, using real government data from HRSA and Virginia DMAS.

YOUR EXPERTISE:
- Virginia Medicaid eligibility (adults up to 138% FPL, children up to 148% FPL, pregnant women up to 143% FPL)
- Virginia CHIP/FAMIS eligibility (children 148–205% FPL, pregnant women 143–205% FPL via FAMIS MOMS)
- Free and low-cost clinics across Virginia sourced from the HRSA 2024 dataset
- Federal Poverty Level (FPL) guidelines: $15,060 base + $5,380 per additional household member (2026)
- How to apply: coverva.dmas.virginia.gov

HOW TO RESPOND:
- Use plain, warm, easy-to-understand language. Avoid jargon.
- When someone asks about eligibility, ask for: (1) household size and (2) approximate annual or monthly income. Then calculate.
- When someone asks about clinics, ask what city or zip code they are in, then mention relevant clinics.
- Always encourage users to apply — remind them there is no asset test for Medicaid in Virginia.
- If a user seems distressed or confused, be extra gentle and reassuring.
- Keep responses concise. Use short paragraphs. This is a chat, not an essay.
- If asked something outside healthcare, kindly redirect back to your purpose.
- Do NOT make up clinics, programs, or rules. Stick to what you know.

IMPORTANT DISCLAIMER: Always remind users to verify eligibility with an official source (coverva.dmas.virginia.gov) and that you are a helpful guide, not a legal or medical professional.
`.trim();


// ---------- Render a bot message ----------
function renderBotMessage(html) {
  const msg = document.createElement("div");
  msg.className = "message";
  msg.innerHTML = `
    <div class="avatar bot">🏥</div>
    <div class="bubble bot">${html}</div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------- Render a user message ----------
function renderUserMessage(text) {
  const msg = document.createElement("div");
  msg.className = "message user";
  msg.innerHTML = `
    <div class="avatar user">You</div>
    <div class="bubble user">${escapeHtml(text)}</div>
  `;
  messagesEl.appendChild(msg);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ---------- Typing indicator ----------
function showTyping() {
  const el = document.createElement("div");
  el.className = "typing";
  el.id = "typing-indicator";
  el.innerHTML = `
    <div class="avatar bot">🏥</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const el = document.getElementById("typing-indicator");
  if (el) el.remove();
}

// ---------- Escape HTML (prevent XSS) ----------
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------- Format clinic results as HTML cards ----------
function renderClinicCards(clinics) {
  if (clinics.length === 0) {
    return `<p>I couldn't find clinics matching that location in my Virginia dataset. Try a nearby city, or visit <a href="https://findahealthcenter.hrsa.gov" target="_blank">findahealthcenter.hrsa.gov</a> for the full HRSA directory.</p>`;
  }

  return clinics.slice(0, 3).map((c) => `
    <div class="clinic-card">
      <strong>${escapeHtml(c.name)}</strong>
      <span>${escapeHtml(c.address)}</span><br/>
      <span>📞 ${escapeHtml(c.phone)}</span>
      <div class="tags">
        ${c.services.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}
        ${c.slidingScale ? '<span class="tag">Sliding Scale</span>' : ""}
        ${c.acceptsUninsured ? '<span class="tag">Accepts Uninsured</span>' : ""}
      </div>
      <a href="${c.url}" target="_blank" style="font-size:0.75rem;color:var(--green-mid);font-weight:600;">Visit website →</a>
    </div>
  `).join("");
}

// ---------- Format eligibility results as HTML ----------
function renderEligibilityCards(result) {
  const fplAnnual = FPL_2026.annual(result.householdSize);
  const fplMonthly = FPL_2026.monthly(result.householdSize);

  if (!result.qualifies || result.programs.length === 0) {
    return `
      <p>Based on the information provided, your household income of <strong>$${result.annualIncome.toLocaleString()}/year</strong> is at <strong>${result.incomePercent}% of the Federal Poverty Level</strong> for a family of ${result.householdSize}.</p>
      <p>This may be above the limit for Medicaid/CHIP. You may still qualify for <a href="https://www.healthcare.gov" target="_blank">ACA Marketplace plans</a> with subsidies. I recommend checking <a href="https://coverva.dmas.virginia.gov" target="_blank">coverva.dmas.virginia.gov</a> to confirm.</p>
    `;
  }

  const cards = result.programs.map((p) => `
    <div class="eligibility-result">
      <div class="program-name">✅ ${escapeHtml(p.program)}</div>
      <p>${escapeHtml(p.description)}</p>
      <a class="apply-link" href="${p.applyUrl}" target="_blank">Apply now at coverva.dmas.virginia.gov →</a>
    </div>
  `).join("");

  return `
    <p>For a household of <strong>${result.householdSize}</strong> with an annual income of <strong>$${result.annualIncome.toLocaleString()}</strong>, your income is at <strong>${result.incomePercent}% of the Federal Poverty Level</strong> (FPL = $${fplAnnual.toLocaleString()}/year or $${fplMonthly.toLocaleString()}/month).</p>
    <h3>You may qualify for:</h3>
    ${cards}
    <p style="font-size:0.78rem;color:var(--text-muted);margin-top:0.5rem;">Always verify eligibility at <a href="https://coverva.dmas.virginia.gov" target="_blank">coverva.dmas.virginia.gov</a>.</p>
  `;
}

// ---------- Smart intent detection ----------
// Checks if the user's message contains eligibility or clinic keywords
// so we can layer in structured data on top of the AI response.
function detectIntent(text) {
  const lower = text.toLowerCase();
  const clinicKeywords   = ["clinic", "find", "near", "free", "hospital", "health center", "doctor", "where"];
  const eligibilityWords = ["qualify", "eligible", "eligib", "medicaid", "chip", "famis", "income", "afford", "how much", "household", "family of", "fpl", "poverty"];
  const hasClinic   = clinicKeywords.some((k)   => lower.includes(k));
  const hasEligible = eligibilityWords.some((k) => lower.includes(k));

  // Try to extract a city name from the message for clinic search
  const cities = VA_CLINICS.map((c) => c.city.toLowerCase());
  const foundCity = cities.find((city) => lower.includes(city));

  // Try to extract household size and income for eligibility
  const sizeMatch   = lower.match(/family of (\d+)|household of (\d+)|(\d+) people|(\d+) person/);
  const incomeMatch = lower.match(/\$?([\d,]+)\s*(a year|per year|annual|\/year|a month|per month|monthly|\/month|\/mo)?/);

  return {
    wantsClinics    : hasClinic,
    wantsEligibility: hasEligible,
    city            : foundCity || null,
    householdSize   : sizeMatch   ? parseInt(sizeMatch[1] || sizeMatch[2] || sizeMatch[3] || sizeMatch[4]) : null,
    rawIncome       : incomeMatch ? parseInt(incomeMatch[1].replace(/,/g, "")) : null,
    incomeIsMonthly : incomeMatch ? /month|\/mo/.test(lower) : false,
  };
}

// ---------- Call the Anthropic API ----------
async function callAI(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });

  const response = await fetch("/.netlify/functions/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model      : "claude-sonnet-4-20250514",
      max_tokens : 1000,
      system     : SYSTEM_PROMPT,
      messages   : conversationHistory,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const aiText = data.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  conversationHistory.push({ role: "assistant", content: aiText });
  return aiText;
}

// ---------- Convert plain AI text to safe HTML ----------
function textToHtml(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br/>")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

// ---------- Main send handler ----------
async function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;

  inputEl.value = "";
  quickReplies.style.display = "none";
  renderUserMessage(text);
  showTyping();
  sendBtn.disabled = true;

  try {
    const intent = detectIntent(text);
    const aiText = await callAI(text);
    hideTyping();

    let html = textToHtml(aiText);

    // Layer in structured clinic data if the user is asking about clinics
    if (intent.wantsClinics && intent.city) {
      const clinics = searchClinics(intent.city);
      if (clinics.length > 0) {
        html += `<h3>🏥 Clinics near ${intent.city.charAt(0).toUpperCase() + intent.city.slice(1)}:</h3>`;
        html += renderClinicCards(clinics);
      }
    }

    // Layer in eligibility calculation if we have enough data
    if (intent.wantsEligibility && intent.householdSize && intent.rawIncome) {
      const annualIncome = intent.incomeIsMonthly
        ? intent.rawIncome * 12
        : intent.rawIncome;
      const result = VA_ELIGIBILITY.check(annualIncome, intent.householdSize);
      html += renderEligibilityCards(result);
    }

    renderBotMessage(html);
  } catch (err) {
    hideTyping();
    renderBotMessage(
      `<p>I'm having trouble connecting right now. Please check your internet connection and try again.</p>
       <p style="font-size:0.78rem;color:var(--text-muted);">Error: ${escapeHtml(err.message)}</p>`
    );
  } finally {
    sendBtn.disabled = false;
    inputEl.focus();
  }
}

// ---------- Quick reply buttons ----------
function setupQuickReplies() {
  const prompts = [
    "Do I qualify for Medicaid?",
    "Find free clinics in Richmond",
    "What is CHIP / FAMIS?",
    "Find clinics in Roanoke",
    "How does sliding scale work?",
  ];

  prompts.forEach((p) => {
    const btn = document.createElement("button");
    btn.className = "quick-reply";
    btn.textContent = p;
    btn.addEventListener("click", () => {
      inputEl.value = p;
      handleSend();
    });
    quickReplies.appendChild(btn);
  });
}

// ---------- Event listeners ----------
sendBtn.addEventListener("click", handleSend);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// ---------- Welcome message on load ----------
function showWelcome() {
  renderBotMessage(`
    <p>Hi there! 👋 I'm the <strong>Virginia Healthcare Navigator</strong>, built to help low-income families understand their healthcare options.</p>
    <p>I can help you:</p>
    <ul>
      <li>Check if you qualify for <strong>Medicaid or CHIP/FAMIS</strong></li>
      <li>Find <strong>free & low-cost clinics</strong> near you in Virginia</li>
      <li>Understand your options in plain language</li>
    </ul>
    <p>What can I help you with today?</p>
  `);
  setupQuickReplies();
}

showWelcome();
