// ============================================================
// chat.js  —  AI Chat (GEMINI-2.5-flash + context-aware fallback)
// ============================================================



// Context-aware smart responses — keyword matched
const SMART_RESPONSES = [
  {
    kw: ['tax','lhdn','pcb','cukai','save','simpan','owe','bayar'],
    fn: () => `Based on your RM 3,200/month income, save RM 576/month for LHDN. Your estimated annual tax at ~18% is RM 6,912. Set up an automatic transfer of RM 576 on payday to a dedicated tax savings account so you are never surprised at filing time.`
  },
  {
    kw: ['netflix','canva','subscription','unused','langganan','cancel'],
    fn: () => `You have 2 unused subscriptions: Canva Pro (RM 59, unused 45 days) and Netflix (RM 54, unused 30 days). Cancelling both saves RM 1,356/year. I have drafted cancellation messages — click "Cancel" in the Kill Switch panel on your dashboard.`
  },
  {
    kw: ['grabfood','grab','food','makan','delivery'],
    fn: () => `Your GrabFood spending this month is RM 180 — 40% above your RM 128 average. Setting a RM 120/month cap saves RM 720/year. Try batch-cooking on weekends to cut delivery costs by 50%.`
  },
  {
    kw: ['shopee','supplies','business','perniagaan','expense','deduction'],
    fn: () => `Your Shopee supplies purchases qualify as business deductions under Section 33 ITA. At your 18% tax rate, RM 1,440 of business supplies = RM 259 in annual tax savings. Mark them as Business in the ✂️ Transaction Splitter now.`
  },
  {
    kw: ['inventory','flour','sugar','butter','eggs','stock','stok','ingredient','bahan'],
    fn: () => `Flour is running low (50kg, ~12 days left at current use). Reorder 100kg this week — bulk orders save ~8%. Estimated restock cost: RM 240. Budget alert: Ingredients are at 83% of monthly budget with 7 days remaining in the month.`
  },
  {
    kw: ['forecast','next month','may','predict','future','ramalan','revenue','income'],
    fn: () => `GLM Forecast for May 2026: Revenue RM 3,520 (+10% Hari Raya uplift), Expenses RM 1,890, Tax savings needed RM 634. Net profit estimate: RM 1,630. Key action before May: cancel unused subscriptions to free up RM 113/month budget.`
  },
  {
    kw: ['reduce','cut','jimat','kurang','save money','perbelanjaan','less'],
    fn: () => `Your top 3 savings opportunities:\n1. Cancel Canva + Netflix → RM 113/month saved\n2. Cap GrabFood at RM 120 → RM 60/month saved\n3. Bulk buy ingredients → RM 40/month saved\nTotal: RM 213/month = RM 2,556/year 🎉`
  },
  {
    kw: ['health','score','status','kewangan','financial','overall'],
    fn: () => `Your kaOne Financial Health Score: 72/100 🟡\n✅ Income up 15% this month\n⚠️ 2 unused subscriptions draining RM 113/month\n⚠️ Emergency fund covers only 1.2 months (target: 3 months)\n📋 Next action: Cancel unused subs and save RM 200/month into emergency fund.`
  },
  {
    kw: ['split','personal','classify','kategori','type','personal','business'],
    fn: () => `To classify a transaction: click ✂️ Split next to any row in your Recent Transactions table, then choose Personal or Business. For a home bakery — ingredients, packaging, delivery, and marketing = Business. Your own GrabFood meals, Netflix = Personal.`
  },
  {
    kw: ['hello','hi','hai','helo','selamat','apa khabar','good morning','good afternoon'],
    fn: () => `Selamat datang! 👋 I am your kaOne AI Analyst powered by GEMINI-2.5-flash. I can help with LHDN tax planning, subscription management, expense reduction, and financial forecasting. What would you like to analyse today?`
  },
];

const FALLBACK = [
  'Your net profit this month is ~RM 1,350. Biggest opportunity: cancel RM 113/month in unused subscriptions and save RM 576/month for LHDN. Use the Kill Switch panel to action these now.',
  'As a Malaysian home-based SME, you can claim ingredients, packaging, and part of utilities as business deductions under Section 33 ITA. Mark your Shopee receipts as Business in the Transaction Splitter to reduce taxable income.',
  'Quick financial summary: Income RM 3,200, Expenses RM 1,850, Tax to save RM 576, Unused subscriptions RM 113/month. Cancelling the unused subs alone recovers RM 1,356/year.',
];
let fbIdx = 0;

function getSmartResponse(msg) {
  const lower = msg.toLowerCase();
  for (const r of SMART_RESPONSES) {
    if (r.kw.some(k => lower.includes(k))) return r.fn();
  }
  return FALLBACK[fbIdx++ % FALLBACK.length];
}

// ── MAIN SEND ─────────────────────────────────────────────
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg = input.value.trim();
  if (!msg) return;

  input.value = '';
  appendChatMessage('user', msg);
  showTypingIndicator(true);

  const apiKey =
    currentApiKey ||
    document.getElementById('api-key-input')?.value?.trim() ||
    GEMINI_API_KEY;

  try {
    const reply = await callGemini(msg, apiKey);

    showTypingIndicator(false);
    appendChatMessage('ai', reply);

    await dbAdd('chatHistory', { role: 'user', content: msg });
    await dbAdd('chatHistory', { role: 'ai', content: reply });

    // Update sidebar
    const sideEl = document.getElementById('sidebar-api-status');
    if (sideEl) {
      sideEl.textContent = 'API: Gemini Connected ✓';
      sideEl.style.color = '#6fa004';
    }

  } catch (err) {
    showTypingIndicator(false);

    appendChatMessage('ai', "⚠️ Gemini failed. Check your API key or network.");

    const sideEl = document.getElementById('sidebar-api-status');
    if (sideEl) {
      sideEl.textContent = 'API: Error';
      sideEl.style.color = '#dc2626';
    }
  }
}

function quickChat(m) { document.getElementById('chat-input').value = m; sendChat(); }

function appendChatMessage(role, text) {
  const c = document.getElementById('chat-messages');
  if (!c) return;
  const el = document.createElement('div');
  el.className = `msg msg-${role} fade-in`;
  const now = new Date().toLocaleTimeString('en-MY',{hour:'2-digit',minute:'2-digit'});
  el.innerHTML = `<div class="msg-bubble">${text.replace(/\n/g,'<br>')}</div><div class="msg-time">${now}</div>`;
  c.appendChild(el);
  c.scrollTop = c.scrollHeight;
}

function showTypingIndicator(show) {
  const el = document.getElementById('chat-typing');
  if (!el) return;
  el.style.display = show ? 'block' : 'none';
  if (show && document.getElementById('chat-messages'))
    document.getElementById('chat-messages').scrollTop = 99999;
}

function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
  const list = document.getElementById('file-list');
  if (!list) return;
  
  const item = document.createElement('div');
  item.className = 'file-item';
  item.innerHTML = `<span class="file-icon">${type==='img'?'📸':'📄'}</span><span class="file-name">${file.name}</span><span class="file-status">Analysing...</span>`;
  list.appendChild(item);
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const apiKey = currentApiKey || document.getElementById('api-key-input')?.value?.trim() || GEMINI_API_KEY;
      let prompt = '';
      
      if (type === 'img') {
        // For images, send to Gemini Vision
        const base64 = e.target.result;
        prompt = `You are a Malaysian financial assistant analysing a receipt image. 
Extract and return ONLY this JSON (no other text):
{"amount": number, "category": "Food & Beverage"|"Supplies"|"Transport"|"Marketing"|"Utilities", "date": "YYYY-MM-DD", "items": ["item1", "item2"]}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: file.type, data: base64.split(',')[1] } }] }]
            })
          }
        );
        
        const data = await res.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(result.replace(/```json|```/g, '').trim());
        
        item.querySelector('.file-status').textContent = 'Done ✓';
        const text = `📸 Receipt Analysis:\n• Amount: RM ${parsed.amount || 'N/A'}\n• Category: ${parsed.category || 'Uncategorized'}\n• Date: ${parsed.date || 'N/A'}\n• Items: ${(parsed.items || []).join(', ')}\n\n💡 Mark as Business in the ✂️ Split tool to save on tax.`;
        
        const r = document.createElement('div');
        r.className = 'analysis-result fade-in';
        r.textContent = text;
        list.appendChild(r);
        appendChatMessage('ai', text);
        dbAdd('chatHistory', { role:'ai', content: text });
        
      } else {
        // For documents, send text content to Gemini
        const textContent = e.target.result;
        const analysisPrompt = `You are a Malaysian financial assistant. Analyse this bank statement or receipt data. Extract:
1. Total income
2. Total expenses  
3. Top spending categories
4. Any unusual transactions
5. Tax-deductible business expenses

Return ONLY a concise summary in Malay or English.`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: analysisPrompt + '\n\nDocument content:\n' + textContent.substring(0, 10000) }] }]
            })
          }
        );

        const data = await res.json();
        const result = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis available';
        
        item.querySelector('.file-status').textContent = 'Done ✓';
        const text = `📄 Document Analysis:\n${result}\n\n💡 Use the Transaction Splitter to categorize business expenses.`;
        
        const r = document.createElement('div');
        r.className = 'analysis-result fade-in';
        r.textContent = text;
        list.appendChild(r);
        appendChatMessage('ai', text);
        dbAdd('chatHistory', { role:'ai', content: text });
      }
    } catch (err) {
      item.querySelector('.file-status').textContent = 'Error ✗';
      appendChatMessage('ai', '⚠️ Analysis failed. Please try again.');
    }
  };
  
  if (type === 'img') {
    reader.readAsDataURL(file);
  } else {
    reader.readAsText(file);
  }
}
async function callGemini(prompt, apiKey) {
  const key = apiKey || GEMINI_API_KEY;

  if (!key) throw new Error("Missing Gemini API key");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `You are a Malaysian financial assistant. Be concise and practical.\n\nUser: ${prompt}`
              }
            ]
          }
        ]
      })
    }
  );

  if (!res.ok) throw new Error("Gemini API error");

  const data = await res.json();

  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}