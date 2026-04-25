// ============================================================
// chat.js  —  AI Chat Logic (ILMU-GLM-5.1)
//
// This file handles everything related to the AI chat panel:
//   • Sending messages to the ILMU-GLM-5.1 API
//   • Falling back to mock responses if the API fails
//   • Rendering chat bubbles in the UI
//   • Saving chat history to Firestore (via db.js)
//   • Handling file uploads and analysis results
// ============================================================
 
 
// ILMU-GLM-5.1 API endpoint
const ILMU_API_URL = 'https://api.ilmu.ai/v1/chat/completions';
 
// Mock responses used when:
//   (a) The API key is not set yet, OR
//   (b) The API call fails (network error, rate limit, etc.)
// This is called "graceful degradation" — the app still works!
const MOCK_RESPONSES = [
  "Based on your income of RM 3,200/month, I recommend saving RM 576 per month for LHDN. Your effective tax rate is approximately 18% annually.",
  "If you cancel Netflix (RM 54/month), you'd save RM 648/year. Since it's been unused for 30 days, this is a smart move. I can draft the cancellation message!",
  "Looking at your expenses, GrabFood is your biggest variable cost. Over the last month, you've spent RM 180 — 40% above your average. Consider a monthly limit of RM 120.",
  "Your Shopee supplies can be classified as business expenses since they're for your home bakery. This could reduce your taxable income by up to RM 1,440/year.",
  "Your top 3 reducible expenses: (1) GrabFood — save RM 80/month, (2) Unused subscriptions — save RM 113/month, (3) Utilities optimisation — save RM 20/month.",
  "Your financial health score is 72/100. Strengths: consistent income growth (+15%). Areas to improve: unused subscriptions and emergency fund (target: 3 months coverage).",
  "Tax tip: As a home bakery owner, you can claim deductions for ingredients, packaging, and even a portion of your electricity bill as business expenses under Section 33 ITA.",
];
let mockIndex = 0; // rotates through mock responses
 
 
// ============================================================
// MAIN SEND FUNCTION
// Called when user clicks ↑ or presses Enter in the chat input
// ============================================================
async function sendChat() {
  const input = document.getElementById('chat-input');
  const msg   = input.value.trim();
  if (!msg) return;
 
  input.value = '';
  appendMessage('user', msg);
 
  // Save user message to Firestore (db.js function)
  await dbAdd('chatHistory', { role: 'user', content: msg });
 
  showTyping(true);
 
  try {
    // Try the real API first
    const response = await callILMU(msg, currentApiKey);
    showTyping(false);
    appendMessage('ai', response);
    await dbAdd('chatHistory', { role: 'ai', content: response });
 
  } catch (error) {
    // API failed — use a mock response instead
    console.warn('ILMU API error, using mock response:', error.message);
    showTyping(false);
    const fallback = MOCK_RESPONSES[mockIndex++ % MOCK_RESPONSES.length];
    appendMessage('ai', fallback);
    await dbAdd('chatHistory', { role: 'ai', content: fallback });
  }
}
 
 
// ============================================================
// CALL ILMU-GLM-5.1 API
// Returns the AI response text, or throws an error
// ============================================================
async function callILMU(userMessage, apiKey) {
  if (!apiKey) throw new Error('No API key set — go to Settings to add your key');
 
  const response = await fetch(ILMU_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'ILMU-GLM-5.1',
      messages: [
        {
          role: 'system',
          content: `You are kaOne's AI Financial Analyst powered by ILMU-GLM-5.1.
You help Malaysian small business owners (especially home-based SMEs) with:
- Tax planning and LHDN estimation
- Expense reduction and subscription management  
- Business vs personal transaction classification
- Budget forecasting and inventory advice
 
Always use Malaysian context: RM (Ringgit Malaysia), LHDN, PCB deductions.
Keep responses concise (max 3 sentences), practical, and friendly.
If asked about specific amounts, reference the user's data where possible.`
        },
        {
          role: 'user',
          content: userMessage
        }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  });
 
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `HTTP ${response.status}`);
  }
 
  const data = await response.json();
  return data.choices?.[0]?.message?.content
    || MOCK_RESPONSES[mockIndex++ % MOCK_RESPONSES.length];
}
 
 
// ============================================================
// QUICK CHAT BUTTONS
// Pre-fills the input and sends immediately
// ============================================================
function quickChat(message) {
  document.getElementById('chat-input').value = message;
  sendChat();
}
 
 
// ============================================================
// RENDER A CHAT MESSAGE BUBBLE
// role = 'user' or 'ai'
// ============================================================
function appendMessage(role, text) {
  const msgs = document.getElementById('chat-messages');
  if (!msgs) return;
 
  const el  = document.createElement('div');
  el.className = `msg msg-${role} fade-in`;
 
  const now = new Date().toLocaleTimeString('en-MY', { hour: '2-digit', minute: '2-digit' });
  el.innerHTML = `
    <div class="msg-bubble">${text}</div>
    <div class="msg-time">${now}</div>
  `;
  msgs.appendChild(el);
  msgs.scrollTop = msgs.scrollHeight; // Auto-scroll to bottom
}
 
 
// ============================================================
// TYPING INDICATOR  (animated dots while waiting for AI)
// ============================================================
function showTyping(show) {
  const typing = document.getElementById('chat-typing');
  if (!typing) return;
  typing.style.display = show ? 'block' : 'none';
  if (show) document.getElementById('chat-messages').scrollTop = 99999;
}
 
 
// ============================================================
// FILE UPLOAD HANDLER
// Simulates reading and analysing the uploaded file
// In production: send file to backend → GLM API → return analysis
// ============================================================
function handleFileUpload(event, type) {
  const file = event.target.files[0];
  if (!file) return;
 
  const list = document.getElementById('file-list');
  if (!list) return;
 
  // Show the file with "Analysing..." status
  const item = document.createElement('div');
  item.className = 'file-item';
  item.innerHTML = `
    <span class="file-icon">${type === 'img' ? '📸' : '📄'}</span>
    <span class="file-name">${file.name}</span>
    <span class="file-status">Analysing...</span>
  `;
  list.appendChild(item);
 
  // Simulate a 2-second AI analysis delay
  setTimeout(() => {
    item.querySelector('.file-status').textContent = 'Done ✓';
 
    const analysisText = type === 'img'
      ? `📸 Receipt scanned: Found RM ${(Math.random() * 200 + 20).toFixed(2)} in expenses. Category detected: ${['Food & Beverage','Supplies','Transport'][Math.floor(Math.random()*3)]}.`
      : `📄 Statement analysed: Found ${Math.floor(Math.random()*20+5)} transactions. Total expenses: RM ${(Math.random()*500+100).toFixed(2)}. GrabFood is ${Math.floor(Math.random()*20+5)}% above your average.`;
 
    // Show result under the file item
    const result = document.createElement('div');
    result.className = 'analysis-result fade-in';
    result.textContent = analysisText;
    list.appendChild(result);
 
    // Also add to the chat so the user sees the insight
    appendMessage('ai', `I've analysed your ${type === 'img' ? 'receipt' : 'statement'}: ${analysisText}`);
 
    // Save to chat history
    dbAdd('chatHistory', {
      role: 'ai',
      content: `File analysis: ${analysisText}`
    });
  }, 2000);
}