/* NeverMiss — website helpline chat ("Help" button).
 *
 * The same AI that answers the NeverMiss WhatsApp helpline, inside the website.
 * Every chat is saved and shows up in admin.html → Helpline chats; the owner
 * gets a WhatsApp alert for each new chat. When the AI can't help, a short
 * form raises a support ticket (admin.html → Tickets).
 *
 * Add one line before </body>:
 *   <script src="/nm-help.js" defer></script>
 * Options on that tag:
 *   data-side="right"   put the button bottom-right (default bottom-left,
 *                       so it never sits on top of the demo chat button)
 *   data-lift="88"      on phones, raise the button this many px (for pages
 *                       with a bottom nav bar, like the dashboard)
 *   data-mode="account" existing customers: account questions instead of the
 *                       "what kind of business" sales opener
 * A page can set window.NM_HELP_VISITOR = function () { return {name, email, business}; }
 * (plus optional phone) to tell the team who is chatting (the dashboard does this).
 *
 * URL option: ?help=1 opens the chat straight away.
 * Backend: /api/support-chat and /api/support-ticket in support_chat.py.
 */
(function () {
  "use strict";
  if (window.__nmHelpLoaded) return;
  window.__nmHelpLoaded = true;

  var API = "https://my-saas-bot.onrender.com";
  var WA = "917004020840";
  var MAX_LEN = 600;
  var KEY_SID = "nm_help_sid", KEY_LOG = "nm_help_log", KEY_SEC = "nm_help_sector";

  // Opening buttons: pick a business type, then the questions that show
  // what NeverMiss is worth to that business. The bot answers these with
  // sector-specific money math (see NEVERMISS_WEBSITE_NOTE in ai_brain.py).
  var SECTORS = [
    { k: "salon", e: "💇", l: "Salon / makeup", n: "salon owners", qs: [
      "Is NeverMiss worth it for my salon?", "A bride messages at 11 PM. What happens?",
      "Can it book appointments for me?", "Will it reply in Hindi?", "How does the 7-day free trial work?"] },
    { k: "coaching", e: "🎓", l: "Coaching institute", n: "coaching institutes", qs: [
      "Is NeverMiss worth it for my institute?", "Parents message late at night. What happens?",
      "Can it book demo classes?", "Can it send fee reminders?", "How does the 7-day free trial work?"] },
    { k: "clinic", e: "🦷", l: "Clinic / dental", n: "clinics", qs: [
      "Is NeverMiss worth it for my clinic?", "Can patients book appointments on WhatsApp?",
      "Can it send appointment reminders?", "Will it reply on Sundays?", "How does the 7-day free trial work?"] },
    { k: "fitness", e: "🏋️", l: "Gym / yoga", n: "gyms and studios", qs: [
      "Is NeverMiss worth it for my gym?", "Can it book free trial sessions?",
      "Can it remind members to renew?", "Will it reply in Hindi?", "How does the 7-day free trial work?"] },
    { k: "classes", e: "💃", l: "Dance / music / art", n: "classes", qs: [
      "Is NeverMiss worth it for my classes?", "Can parents book a trial class?",
      "Can it send monthly fee reminders?", "How does the 7-day free trial work?"] },
    { k: "realestate", e: "🏠", l: "Real estate", n: "brokers", qs: [
      "Is NeverMiss worth it for a broker?", "Buyers enquire on many listings. How does this help?",
      "Can it book site visits?", "How does the 7-day free trial work?"] },
    { k: "other", e: "✨", l: "Something else", n: "businesses", qs: [
      "Will NeverMiss work for my business?", "What does it cost?",
      "How does the 7-day free trial work?", "Can I see a live demo?"] }
  ];
  var ACCOUNT_QS = ["How do I connect my WhatsApp number?", "How do I send a campaign?",
                    "How do I change my bot's replies?", "How do I upgrade my plan?", "Something isn't working"];
  function sectorBy(k) { for (var i = 0; i < SECTORS.length; i++) if (SECTORS[i].k === k) return SECTORS[i]; return null; }

  var me = document.currentScript;
  var side = (me && me.getAttribute("data-side")) === "right" ? "right" : "left";
  var lift = parseInt((me && me.getAttribute("data-lift")) || "0", 10) || 0;
  var accountMode = (me && me.getAttribute("data-mode")) === "account";

  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(s) {
    return esc(s).replace(/\*([^*\n]+)\*/g, "$1")
      .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>')
      .replace(/\n/g, "<br>");
  }
  function newSid() {
    try { if (window.crypto && crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return "h-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }
  function sid() {
    var s = store(KEY_SID);
    if (!s || s.length < 8) { s = newSid(); store(KEY_SID, s); }
    return s;
  }
  function visitor() {
    try { return (window.NM_HELP_VISITOR && window.NM_HELP_VISITOR()) || {}; } catch (e) { return {}; }
  }
  function track(label) { try { window.nmTrack && window.nmTrack.event("cta_click", label); } catch (e) {} }

  /* ── styles ─────────────────────────────── */
  var S = side, O = side === "left" ? "right" : "left";
  var css = [
    "#nmh,#nmh *{box-sizing:border-box;}",
    "#nmh{--t:#0F766E;--td:#0A5A54;--ink:#0B2622;--mut:#557069;--ln:#DCE5E2;--soft:#ECF7F4;font-family:'Hind',system-ui,sans-serif;color:var(--ink);font-size:15px;line-height:1.45;}",
    "#nmh button,#nmh input,#nmh textarea{font-family:inherit;font-size:15px;}",
    "#nmh-launch{position:fixed;" + S + ":18px;bottom:18px;z-index:180;display:flex;align-items:center;gap:8px;background:#fff;color:var(--td);border:1.5px solid var(--t);border-radius:999px;padding:11px 17px;font-weight:600;cursor:pointer;box-shadow:0 8px 24px rgba(7,28,25,.16);}",
    "#nmh-launch:hover{background:var(--soft);}",
    "#nmh-launch svg{width:20px;height:20px;flex:none;}",
    "#nmh-panel{position:fixed;" + S + ":18px;bottom:18px;z-index:195;width:368px;max-width:calc(100vw - 36px);height:560px;max-height:calc(100vh - 36px);background:#fff;border-radius:18px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 24px 60px rgba(7,28,25,.28);}",
    "#nmh-panel.open{display:flex;}",
    "#nmh-head{background:var(--td);color:#fff;padding:13px 14px 13px 16px;display:flex;align-items:center;gap:10px;}",
    "#nmh-head .nmh-av{width:36px;height:36px;border-radius:50%;background:#fff;color:var(--td);display:grid;place-items:center;font-weight:700;flex:none;}",
    "#nmh-head .nmh-tt{flex:1;min-width:0;}#nmh-head b{display:block;font-size:16px;}#nmh-head small{opacity:.85;font-size:12.5px;}",
    "#nmh-x{background:transparent;border:0;color:#fff;width:36px;height:36px;border-radius:8px;cursor:pointer;font-size:22px;line-height:1;}",
    "#nmh-x:hover{background:rgba(255,255,255,.14);}",
    "#nmh-log{flex:1;overflow-y:auto;padding:14px;background:#F5F8F7;display:flex;flex-direction:column;gap:8px;}",
    ".nmh-m{max-width:86%;padding:9px 12px;border-radius:14px;word-wrap:break-word;overflow-wrap:anywhere;}",
    ".nmh-m a{color:inherit;text-decoration:underline;}",
    ".nmh-m.bot{background:#fff;border:1px solid var(--ln);align-self:flex-start;border-bottom-left-radius:4px;}",
    ".nmh-m.me{background:var(--t);color:#fff;align-self:flex-end;border-bottom-right-radius:4px;}",
    ".nmh-m.sys{align-self:center;background:var(--soft);color:var(--td);font-size:13.5px;text-align:center;}",
    ".nmh-chips{display:flex;flex-direction:column;align-items:flex-start;gap:6px;}",
    ".nmh-chips p{margin:2px 0 0;color:var(--mut);font-size:13px;}",
    ".nmh-chips .nmh-wrap{display:flex;flex-wrap:wrap;gap:6px;}",
    ".nmh-chip{background:#fff;color:var(--td);border:1px solid #9FD3C7;border-radius:999px;padding:7px 12px;font-size:14px !important;line-height:1.25;cursor:pointer;text-align:left;}",
    ".nmh-chip:hover{background:var(--soft);border-color:var(--t);}",
    ".nmh-chip.q{border-radius:12px;}",
    ".nmh-link{background:none;border:0;padding:0;color:var(--mut);font-size:12.5px !important;text-decoration:underline;cursor:pointer;}",
    ".nmh-typing{align-self:flex-start;color:var(--mut);font-size:13.5px;padding:4px 2px;}",
    ".nmh-form{background:#fff;border:1px solid var(--ln);border-radius:14px;padding:12px;display:flex;flex-direction:column;gap:8px;}",
    ".nmh-form b{font-size:15px;}.nmh-form p{margin:0;color:var(--mut);font-size:13.5px;}",
    ".nmh-form label{font-size:13px;font-weight:600;color:var(--mut);display:flex;flex-direction:column;gap:3px;}",
    ".nmh-form input,.nmh-form textarea{border:1px solid var(--ln);border-radius:9px;padding:8px 10px;width:100%;color:var(--ink);background:#fff;}",
    ".nmh-form textarea{resize:vertical;min-height:58px;}",
    ".nmh-form .nmh-err{color:#B42318;font-size:13.5px;min-height:0;}",
    ".nmh-form .nmh-row{display:flex;gap:8px;}",
    ".nmh-btn{background:var(--t);color:#fff;border:0;border-radius:10px;padding:10px 14px;font-weight:600;cursor:pointer;}",
    ".nmh-btn:disabled{opacity:.6;cursor:default;}",
    ".nmh-btn.nmh-ghost{background:transparent;color:var(--mut);border:1px solid var(--ln);}",
    "#nmh-bar{display:flex;gap:8px;padding:10px;border-top:1px solid var(--ln);background:#fff;}",
    "#nmh-in{flex:1;border:1px solid var(--ln);border-radius:12px;padding:10px 12px;resize:none;height:44px;max-height:110px;color:var(--ink);}",
    "#nmh-in:focus,.nmh-form input:focus,.nmh-form textarea:focus{outline:2px solid var(--t);outline-offset:0;border-color:var(--t);}",
    "#nmh-send{width:44px;height:44px;padding:0;display:grid;place-items:center;flex:none;}",
    "#nmh-send svg{width:20px;height:20px;}",
    "#nmh-foot{display:flex;justify-content:space-between;gap:8px;padding:0 12px 10px;background:#fff;font-size:12.5px;color:var(--mut);}",
    "#nmh-foot a,#nmh-foot button{color:var(--td);font-weight:600;background:none;border:0;padding:0;cursor:pointer;font-size:12.5px;text-decoration:underline;}",
    "@media (max-width:520px){#nmh-panel{" + S + ":0;bottom:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;}" +
      "#nmh-launch{" + S + ":12px;bottom:" + (12 + lift) + "px;padding:0;width:48px;height:48px;justify-content:center;}#nmh-launch .nmh-lbl{display:none;}}",
    lift ? "@media (min-width:521px) and (max-width:860px){#nmh-launch{bottom:" + (18 + lift) + "px;}}" : ""
  ].join("");
  var st = document.createElement("style");
  st.textContent = css;
  document.head.appendChild(st);

  var ICON_CHAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.3 2.4c-.5.2-.8.6-.8 1.1v.5"/><path d="M12 16.5h.01"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4 20-7z"/></svg>';

  /* ── markup ─────────────────────────────── */
  var root = document.createElement("div");
  root.id = "nmh";
  root.innerHTML =
    '<button type="button" id="nmh-launch" aria-haspopup="dialog" aria-controls="nmh-panel" aria-label="Help: chat with NeverMiss">' + ICON_CHAT + '<span class="nmh-lbl">Help</span></button>' +
    '<div id="nmh-panel" role="dialog" aria-modal="false" aria-labelledby="nmh-title">' +
      '<div id="nmh-head"><div class="nmh-av">N</div><div class="nmh-tt"><b id="nmh-title">NeverMiss Help</b><small>AI replies instantly · our team follows up on WhatsApp</small></div>' +
        '<button type="button" id="nmh-x" aria-label="Close help chat">×</button></div>' +
      '<div id="nmh-log" aria-live="polite"></div>' +
      '<form id="nmh-bar"><label for="nmh-in" style="position:absolute;left:-9999px">Your question</label>' +
        '<textarea id="nmh-in" rows="1" maxlength="' + MAX_LEN + '" placeholder="Ask about plans, setup, billing…"></textarea>' +
        '<button type="submit" class="nmh-btn" id="nmh-send" aria-label="Send">' + ICON_SEND + '</button></form>' +
      '<div id="nmh-foot"><button type="button" id="nmh-tkt">Raise a ticket</button>' +
        '<a href="https://wa.me/' + WA + '?text=' + encodeURIComponent("Hi NeverMiss, I need help with ") + '" target="_blank" rel="noopener" id="nmh-wa">WhatsApp +91 70040 20840</a></div>' +
    '</div>';
  (document.body || document.documentElement).appendChild(root);

  var launch = root.querySelector("#nmh-launch"), panel = root.querySelector("#nmh-panel"),
      log = root.querySelector("#nmh-log"), bar = root.querySelector("#nmh-bar"),
      input = root.querySelector("#nmh-in"), send = root.querySelector("#nmh-send");

  var history = [];
  try { history = JSON.parse(store(KEY_LOG) || "[]") || []; } catch (e) { history = []; }
  var busy = false, formOpen = false, lastQuestion = "";
  var PAGE_SECTOR = { salons: "salon", fitness: "fitness", clinics: "clinic", coaching: "coaching" };
  var sector = store(KEY_SEC) || PAGE_SECTOR[(window.NM_PAGE || {}).sector] ||
               (/coaching/.test(location.pathname) ? "coaching" : "");
  if (!sectorBy(sector)) sector = "";

  function saveLog() { store(KEY_LOG, JSON.stringify(history.slice(-40))); }
  function add(role, text, keep) {
    var d = document.createElement("div");
    d.className = "nmh-m " + role;
    d.innerHTML = fmt(text);
    log.appendChild(d);
    log.scrollTop = log.scrollHeight;
    if (keep !== false) { history.push({ r: role, t: text }); saveLog(); }
    return d;
  }
  function render() {
    log.innerHTML = "";
    add("bot", accountMode
      ? "Hi! Ask me anything about your NeverMiss account, setup, campaigns or billing. If I can't sort it out, I'll pass it to our team."
      : "Hi! I'm the NeverMiss assistant. I can show you what NeverMiss is worth to your business, and answer anything about plans, setup or your account.", false);
    history.forEach(function (m) { add(m.r, m.t, false); });
    if (history.some(function (m) { return m.r === "me"; })) suggest(2); else chips();
  }

  function clearChips() { [].slice.call(log.querySelectorAll(".nmh-chips")).forEach(function (c) { c.remove(); }); }
  function chipBox(note) {
    var box = document.createElement("div");
    box.className = "nmh-chips";
    if (note) { var p = document.createElement("p"); p.textContent = note; box.appendChild(p); }
    var w = document.createElement("div"); w.className = "nmh-wrap"; box.appendChild(w);
    log.appendChild(box);
    return w;
  }
  function askBtn(w, q) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "nmh-chip q"; b.textContent = q;
    b.addEventListener("click", function () { submit(null, q); track("help_suggested"); });
    w.appendChild(b);
  }
  // Opening state: business type first, then that business's questions.
  function chips() {
    clearChips();
    if (accountMode) { var a = chipBox("Common questions"); ACCOUNT_QS.forEach(function (q) { askBtn(a, q); }); return scrollEnd(); }
    var s = sectorBy(sector);
    if (!s) {
      var w = chipBox("What kind of business do you run? I'll show you what NeverMiss is worth to it.");
      SECTORS.forEach(function (x) {
        var b = document.createElement("button");
        b.type = "button"; b.className = "nmh-chip"; b.textContent = x.e + " " + x.l;
        b.addEventListener("click", function () { sector = x.k; store(KEY_SEC, x.k); track("help_sector_" + x.k); chips(); });
        w.appendChild(b);
      });
      return scrollEnd();
    }
    var q = chipBox("What " + s.n + " ask us most");
    s.qs.forEach(function (x) { askBtn(q, x); });
    var ch = document.createElement("button");
    ch.type = "button"; ch.className = "nmh-link"; ch.textContent = s.k === "other" ? "Change business type" : "Not a " + s.l.toLowerCase() + "? Change";
    ch.addEventListener("click", function () { sector = ""; store(KEY_SEC, ""); chips(); });
    q.parentNode.appendChild(ch);
    scrollEnd();
  }
  // After each answer, nudge towards the next question we want them to ask.
  function suggest(n) {
    clearChips();
    var list = accountMode ? ACCOUNT_QS : (sectorBy(sector) || sectorBy("other")).qs;
    var asked = history.map(function (m) { return m.t; });
    var left = list.filter(function (q) { return asked.indexOf(q) === -1; }).slice(0, n);
    if (!left.length) return;
    var w = chipBox("");
    left.forEach(function (q) { askBtn(w, q); });
    scrollEnd();
  }
  function scrollEnd() { log.scrollTop = log.scrollHeight; }

  function open() {
    if (!log.childElementCount) render();
    panel.classList.add("open");
    launch.style.display = "none";
    launch.setAttribute("aria-expanded", "true");
    setTimeout(function () { input.focus(); }, 30);
    track("help_open");
  }
  function close() {
    panel.classList.remove("open");
    launch.style.display = "";
    launch.setAttribute("aria-expanded", "false");
    launch.focus();
  }
  launch.addEventListener("click", open);
  root.querySelector("#nmh-x").addEventListener("click", close);
  root.querySelector("#nmh-tkt").addEventListener("click", function () { showForm(""); });
  root.querySelector("#nmh-wa").addEventListener("click", function () { track("help_whatsapp"); });
  panel.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); bar.requestSubmit ? bar.requestSubmit() : submit(e); }
  });
  input.addEventListener("input", function () {
    input.style.height = "44px";
    input.style.height = Math.min(input.scrollHeight + 2, 110) + "px";
  });
  bar.addEventListener("submit", submit);

  function post(path, body) {
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return { success: false }; }); });
  }

  function submit(e, preset) {
    if (e) e.preventDefault();
    var text = (preset || input.value).trim().slice(0, MAX_LEN);
    if (!text || busy) return;
    busy = true; send.disabled = true;
    if (!preset) { input.value = ""; input.style.height = "44px"; }
    clearChips();
    add("me", text);
    lastQuestion = text;
    var typing = document.createElement("div");
    typing.className = "nmh-typing"; typing.textContent = "Typing…";
    log.appendChild(typing); log.scrollTop = log.scrollHeight;
    post("/api/support-chat", { session_id: sid(), message: text, page: location.pathname, visitor: visitor(),
                                    sector: accountMode ? "" : sector })
      .then(function (d) {
        typing.remove();
        if (!d.success) {
          add("sys", (d.error || "Couldn't reach us just now.") + " You can also WhatsApp us on +91 70040 20840.", false);
          return;
        }
        add("bot", d.reply);
        if (d.needs_ticket) showForm(lastQuestion); else suggest(2);
      })
      .catch(function () {
        typing.remove();
        add("sys", "Couldn't reach us just now. Please try again, or WhatsApp us on +91 70040 20840.", false);
      })
      .then(function () { busy = false; send.disabled = false; input.focus(); });
    track("help_message");
  }

  function showForm(issue) {
    if (!panel.classList.contains("open")) open();
    if (formOpen) { var f0 = log.querySelector(".nmh-form input"); if (f0) f0.focus(); return; }
    formOpen = true;
    var v = visitor();
    var f = document.createElement("form");
    f.className = "nmh-form";
    f.innerHTML =
      "<b>Raise a support ticket</b><p>Our team will reply on WhatsApp, usually within a few hours.</p>" +
      '<label>Your name<input name="name" autocomplete="name" required maxlength="80" value="' + esc(v.name || "") + '"></label>' +
      '<label>WhatsApp number<input name="phone" type="tel" inputmode="numeric" autocomplete="tel" required placeholder="10-digit number" value="' + esc(String(v.phone || "").replace(/\D/g, "").slice(-10)) + '"></label>' +
      '<label>Email (optional)<input name="email" type="email" autocomplete="email" maxlength="120" value="' + esc(v.email || "") + '"></label>' +
      '<label>What do you need help with?<textarea name="issue" required maxlength="1000">' + esc(issue || "") + "</textarea></label>" +
      '<div class="nmh-err" role="alert"></div>' +
      '<div class="nmh-row"><button type="submit" class="nmh-btn">Send ticket</button><button type="button" class="nmh-btn nmh-ghost">Not now</button></div>';
    log.appendChild(f);
    log.scrollTop = log.scrollHeight;
    var err = f.querySelector(".nmh-err"), btn = f.querySelector("button[type=submit]");
    var F = { name: f.querySelector("[name=name]"), phone: f.querySelector("[name=phone]"),
              email: f.querySelector("[name=email]"), issue: f.querySelector("[name=issue]") };
    f.querySelector(".nmh-ghost").addEventListener("click", function () { f.remove(); formOpen = false; input.focus(); });
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = F.name.value.trim(), phone = F.phone.value.replace(/\D/g, "").slice(-10),
          email = F.email.value.trim(), iss = F.issue.value.trim();
      err.textContent = "";
      if (!name) { err.textContent = "Please enter your name."; return F.name.focus(); }
      if (phone.length !== 10) { err.textContent = "Please enter a valid 10-digit WhatsApp number."; return F.phone.focus(); }
      if (!iss) { err.textContent = "Tell us briefly what you need help with."; return F.issue.focus(); }
      btn.disabled = true; btn.textContent = "Sending…";
      post("/api/support-ticket", { session_id: sid(), name: name, phone: phone, email: email, issue: iss, page: location.pathname })
        .then(function (d) {
          if (!d.success) throw new Error(d.error || "");
          f.remove(); formOpen = false;
          add("sys", "Ticket #" + d.ticket_id + " raised. Our team will WhatsApp you on " + phone + " soon.");
          track("help_ticket");
        })
        .catch(function (x) {
          btn.disabled = false; btn.textContent = "Send ticket";
          err.textContent = (x && x.message) || "Couldn't send it. Please WhatsApp us on +91 70040 20840.";
        });
    });
    setTimeout(function () { (!F.name.value ? F.name : !F.phone.value ? F.phone : F.issue).focus(); }, 30);
  }

  if (/^(1|open|true)$/.test(new URLSearchParams(location.search).get("help") || "")) open();
  window.nmHelp = { open: open, close: close };
})();
