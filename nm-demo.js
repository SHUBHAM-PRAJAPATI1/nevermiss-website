/* NeverMiss — live demo chat ("Try our AI as your customer").
 *
 * Add one line before </body> on any page:
 *   <script src="/nm-demo.js" defer></script>
 * Optional: data-sector="coaching|salon|gym|dance|clinic" on that tag.
 * Otherwise the sector comes from window.NM_PAGE (set by sector pages);
 * the homepage shows the business-type picker.
 *
 * URL options (for links sent in WhatsApp DMs):
 *   ?demo=1          open the demo straight away, on this page's sector
 *   ?demo=salon      open the demo on a specific sector
 *   ?offer=founding  show the Founding Partner Program ribbon
 *
 * Backend: /api/demo-chat and /api/demo-feedback in demo_chat.py.
 */
(function () {
  "use strict";
  if (window.__nmDemoLoaded) return;
  window.__nmDemoLoaded = true;

  var API = "https://my-saas-bot.onrender.com";
  var WA = "917004020840";
  var MAX_LEN = 500;

  var SECTORS = {
    coaching: { emoji: "🎓", label: "Coaching institute", name: "Vidyaan Classes", area: "Kothrud",
      tries: ["JEE ki fees kitni hai?", "Is there a free demo lecture?", "Installments milenge?"] },
    salon: { emoji: "💇", label: "Salon / makeup studio", name: "Glow Studio", area: "Baner",
      tries: ["Bridal makeup price?", "Kal shaam haircut ka slot hai?", "Hair spa kitne ka hai?"] },
    gym: { emoji: "🏋️", label: "Gym / fitness", name: "IronEdge Fitness", area: "Wakad",
      tries: ["Monthly fees kya hai?", "Can I try for a day free?", "Ladies batch hai kya?"] },
    dance: { emoji: "💃", label: "Dance / hobby class", name: "Rhythm Nation", area: "Viman Nagar",
      tries: ["Kids batch timing?", "Sangeet choreography price?", "Free trial class hai?"] },
    clinic: { emoji: "🦷", label: "Clinic / dental", name: "SmileCare Dental", area: "Aundh",
      tries: ["Root canal cost?", "Daant mein dard hai, aaj appointment milega?", "Sunday open?"] }
  };
  var PAGE_TO_SECTOR = { coaching: "coaching", salons: "salon", fitness: "gym", clinics: "clinic" };

  var me = document.currentScript;
  var q = new URLSearchParams(location.search);
  var pageSector = (me && me.getAttribute("data-sector")) ||
    PAGE_TO_SECTOR[(window.NM_PAGE || {}).sector] || null;
  if (pageSector && !SECTORS[pageSector]) pageSector = null;

  function track(label) { try { window.nmTrack && window.nmTrack.event("cta_click", label); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmt(s) {
    return esc(s).replace(/\*([^*\n]+)\*/g, "<b>$1</b>").replace(/_([^_\n]+)_/g, "<i>$1</i>").replace(/\n/g, "<br>");
  }

  /* ── styles ─────────────────────────────── */
  var css = [
    "#nmd,#nmd *{box-sizing:border-box;}",
    "#nmd{--t:var(--nm-teal,#0F766E);--td:var(--nm-teal-deep,#0A5A54);--ink:var(--nm-ink,#0B2622);--mut:#557069;--ln:#DCE5E2;--soft:#ECF7F4;font-family:'Hind',system-ui,sans-serif;color:var(--ink);font-size:15px;line-height:1.45;}",
    "#nmd button{font-family:inherit;}",
    "#nmd-launch{position:fixed;right:18px;bottom:18px;z-index:180;display:flex;align-items:center;gap:8px;background:var(--t);color:#fff;border:0;border-radius:999px;padding:13px 19px;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 10px 28px rgba(15,118,110,.35);}",
    "#nmd-launch:hover{background:var(--td);}",
    "#nmd-launch .dot{width:9px;height:9px;border-radius:50%;background:#7CF0C8;box-shadow:0 0 0 0 rgba(124,240,200,.7);animation:nmdp 2s infinite;}",
    "@keyframes nmdp{0%{box-shadow:0 0 0 0 rgba(124,240,200,.7)}70%{box-shadow:0 0 0 9px rgba(124,240,200,0)}100%{box-shadow:0 0 0 0 rgba(124,240,200,0)}}",
    "#nmd-panel{position:fixed;right:18px;bottom:18px;z-index:190;width:384px;max-width:calc(100vw - 36px);height:620px;max-height:calc(100vh - 36px);background:#fff;border-radius:18px;overflow:hidden;display:none;flex-direction:column;box-shadow:0 24px 60px rgba(7,28,25,.28);}",
    "#nmd-panel.open{display:flex;}",
    ".nmd-head{background:var(--t);color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;}",
    ".nmd-av{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.18);display:flex;align-items:center;justify-content:center;font-size:18px;flex:none;}",
    ".nmd-ttl{flex:1;min-width:0;}.nmd-ttl b{display:block;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}.nmd-ttl span{font-size:12px;opacity:.85;}",
    ".nmd-ib{background:rgba(255,255,255,.16);color:#fff;border:0;border-radius:8px;padding:6px 10px;font-size:13px;cursor:pointer;}",
    ".nmd-pick{padding:18px 16px;overflow-y:auto;flex:1;}",
    ".nmd-pick h3{margin:0 0 6px;font-size:19px;font-family:'Bricolage Grotesque',system-ui,sans-serif;letter-spacing:-.02em;}",
    ".nmd-pick p{margin:0 0 16px;color:var(--mut);font-size:14px;}",
    ".nmd-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}",
    ".nmd-sec{border:1px solid var(--ln);background:var(--soft);border-radius:12px;padding:12px 10px;text-align:left;cursor:pointer;font-size:14px;color:var(--ink);}",
    ".nmd-sec:hover{border-color:var(--t);}.nmd-sec .e{font-size:20px;display:block;margin-bottom:4px;}",
    ".nmd-chat{flex:1;display:none;flex-direction:column;min-height:0;}.nmd-chat.show{display:flex;}",
    ".nmd-msgs{flex:1;overflow-y:auto;padding:12px;background:#ECE5DD;display:flex;flex-direction:column;gap:8px;}",
    ".nmd-note{align-self:center;background:#FFF5D1;color:#5d4d10;font-size:12px;padding:6px 10px;border-radius:8px;text-align:center;max-width:92%;}",
    ".nmd-b{max-width:86%;padding:8px 10px;border-radius:10px;font-size:14px;word-wrap:break-word;box-shadow:0 1px 1px rgba(0,0,0,.08);}",
    ".nmd-u{align-self:flex-end;background:#DCF8C6;}.nmd-a{align-self:flex-start;background:#fff;}",
    ".nmd-rate{display:flex;gap:6px;margin-top:7px;flex-wrap:wrap;}",
    ".nmd-rate button{border:1px solid var(--ln);background:#fff;border-radius:999px;font-size:11.5px;padding:3px 9px;cursor:pointer;color:var(--mut);}",
    ".nmd-rate button:hover{border-color:var(--t);color:var(--t);}",
    ".nmd-rated{font-size:11.5px;color:var(--t);margin-top:6px;}",
    ".nmd-typing{align-self:flex-start;background:#fff;border-radius:10px;padding:10px 12px;}",
    ".nmd-typing i{display:inline-block;width:6px;height:6px;margin:0 2px;border-radius:50%;background:#9ca3af;animation:nmdd 1.2s infinite;}",
    ".nmd-typing i:nth-child(2){animation-delay:.2s}.nmd-typing i:nth-child(3){animation-delay:.4s}",
    "@keyframes nmdd{0%,80%,100%{opacity:.3}40%{opacity:1}}",
    ".nmd-sug{display:flex;gap:6px;padding:8px 10px 0;flex-wrap:wrap;background:#fff;}",
    ".nmd-sug button{border:1px solid var(--t);color:var(--t);background:#fff;border-radius:999px;padding:5px 10px;font-size:12.5px;cursor:pointer;}",
    ".nmd-in{display:flex;gap:8px;padding:10px;background:#fff;}",
    ".nmd-in input{flex:1;min-width:0;border:1px solid var(--ln);border-radius:999px;padding:10px 14px;font-size:15px;outline:none;font-family:inherit;}",
    ".nmd-in input:focus{border-color:var(--t);}",
    ".nmd-in button{background:var(--t);color:#fff;border:0;border-radius:999px;padding:0 16px;font-size:14px;font-weight:600;cursor:pointer;}",
    ".nmd-in button:disabled{opacity:.5;cursor:default;}",
    ".nmd-fb{display:none;padding:10px;background:var(--soft);border-top:1px solid var(--ln);}.nmd-fb.show{display:block;}",
    ".nmd-fb textarea,.nmd-fb input{width:100%;border:1px solid var(--ln);border-radius:8px;padding:8px;font-size:14px;margin-bottom:6px;font-family:inherit;resize:vertical;}",
    ".nmd-fb button{background:var(--t);color:#fff;border:0;border-radius:8px;padding:9px 12px;font-size:14px;cursor:pointer;width:100%;}",
    ".nmd-foot{display:flex;gap:8px;padding:0 10px 10px;background:#fff;}",
    ".nmd-foot a,.nmd-foot button{flex:1;text-align:center;font-size:12.5px;padding:9px 6px;border-radius:9px;text-decoration:none;cursor:pointer;border:1px solid var(--ln);background:#fff;color:var(--ink);}",
    ".nmd-foot a{background:var(--t);color:#fff;border-color:var(--t);font-weight:600;}",
    "#nmd-ribbon{position:relative;z-index:60;background:var(--nm-ink,#0B2622);color:#fff;font-family:'Hind',system-ui,sans-serif;font-size:15px;line-height:1.4;}",
    "#nmd-ribbon .in{max-width:1160px;margin:0 auto;padding:10px 44px 10px 20px;position:relative;}",
    "#nmd-ribbon b{color:#7CF0C8;}#nmd-ribbon a{color:#fff;font-weight:600;}",
    "#nmd-ribbon .x{position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:0;color:#fff;font-size:18px;cursor:pointer;opacity:.7;}",
    "@media (max-width:520px){#nmd-panel{right:0;bottom:0;width:100vw;max-width:100vw;height:100dvh;max-height:100dvh;border-radius:0;}#nmd-launch{right:12px;bottom:12px;font-size:14px;padding:12px 16px;}}",
    "@media (prefers-reduced-motion:reduce){#nmd-launch .dot{animation:none;}}"
  ].join("\n");
  var st = document.createElement("style");
  st.id = "nmd-style"; st.textContent = css;
  document.head.appendChild(st);

  /* ── markup ─────────────────────────────── */
  var root = document.createElement("div");
  root.id = "nmd";
  root.innerHTML =
    '<button id="nmd-launch" type="button" data-track="demo_open"><span class="dot"></span>Try our AI as your customer</button>' +
    '<div id="nmd-panel" role="dialog" aria-label="NeverMiss live demo">' +
      '<div class="nmd-head"><div class="nmd-av" id="nmd-av">💬</div>' +
        '<div class="nmd-ttl"><b id="nmd-title">NeverMiss live demo</b><span id="nmd-sub">See how your customers would be answered</span></div>' +
        '<button class="nmd-ib" id="nmd-change" type="button" hidden>Change</button>' +
        '<button class="nmd-ib" id="nmd-close" type="button" aria-label="Close">✕</button></div>' +
      '<div class="nmd-pick" id="nmd-pick"><h3>Pick a business type</h3>' +
        '<p>You chat as a <b>customer</b> of a sample business. Ask anything in English, Hindi or Hinglish, then tell us if the reply sounds natural or generic.</p>' +
        '<div class="nmd-grid" id="nmd-grid"></div></div>' +
      '<div class="nmd-chat" id="nmd-chat">' +
        '<div class="nmd-msgs" id="nmd-msgs" aria-live="polite"></div>' +
        '<div class="nmd-sug" id="nmd-sug"></div>' +
        '<div class="nmd-in"><input id="nmd-text" type="text" maxlength="' + MAX_LEN + '" placeholder="Type as a customer…" autocomplete="off" aria-label="Your message">' +
          '<button id="nmd-send" type="button">Send</button></div>' +
        '<div class="nmd-fb" id="nmd-fb"><textarea id="nmd-fb-text" rows="3" maxlength="1000" placeholder="What should the AI do better for your business?"></textarea>' +
          '<input id="nmd-fb-contact" type="tel" maxlength="100" placeholder="Your WhatsApp number (optional)">' +
          '<button id="nmd-fb-send" type="button">Send feedback</button></div>' +
        '<div class="nmd-foot"><button id="nmd-fb-toggle" type="button">Suggest improvement</button>' +
          '<a id="nmd-cta" href="#" target="_blank" rel="noopener" data-track="demo_get_this">Get this for my business</a></div>' +
      '</div></div>';
  document.body.appendChild(root);

  function $(id) { return document.getElementById(id); }
  var panel = $("nmd-panel"), launch = $("nmd-launch"), pick = $("nmd-pick"), chat = $("nmd-chat");
  var msgs = $("nmd-msgs"), input = $("nmd-text"), sendBtn = $("nmd-send"), sug = $("nmd-sug");

  var S = { sector: null, messages: [], busy: false, ended: false,
            sid: Math.random().toString(36).slice(2) + Date.now().toString(36) };

  Object.keys(SECTORS).forEach(function (k) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "nmd-sec";
    b.innerHTML = '<span class="e">' + SECTORS[k].emoji + "</span>" + esc(SECTORS[k].label);
    b.onclick = function () { start(k); };
    $("nmd-grid").appendChild(b);
  });

  function post(path, body) {
    return fetch(API + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function down() { msgs.scrollTop = msgs.scrollHeight; }
  function note(t) { var d = document.createElement("div"); d.className = "nmd-note"; d.textContent = t; msgs.appendChild(d); down(); }

  function start(k) {
    var s = SECTORS[k];
    S.sector = k; S.messages = []; S.ended = false;
    msgs.innerHTML = "";
    $("nmd-av").textContent = s.emoji;
    $("nmd-title").textContent = s.name + " (sample)";
    $("nmd-sub").textContent = s.label + " · " + s.area + ", Pune";
    $("nmd-change").hidden = false;
    pick.style.display = "none"; chat.classList.add("show");
    $("nmd-fb").classList.remove("show");
    $("nmd-cta").href = "https://wa.me/" + WA + "?text=" +
      encodeURIComponent("Hi, I tried the NeverMiss demo (" + s.label + ") and want this for my business.");
    note("You're a customer of " + s.name + ". Message it the way your own customers would.");
    renderSug(); setBusy(false);
    track("demo_sector_" + k);
    setTimeout(function () { if (window.innerWidth > 520) input.focus(); }, 60);
  }
  function backToPick() {
    chat.classList.remove("show"); pick.style.display = "";
    $("nmd-change").hidden = true; $("nmd-av").textContent = "💬";
    $("nmd-title").textContent = "NeverMiss live demo";
    $("nmd-sub").textContent = "See how your customers would be answered";
  }
  function renderSug() {
    sug.innerHTML = "";
    if (S.messages.length) { sug.style.display = "none"; return; }
    sug.style.display = "";
    SECTORS[S.sector].tries.forEach(function (t) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = t;
      b.onclick = function () { send(t); };
      sug.appendChild(b);
    });
  }
  function addUser(t) { var d = document.createElement("div"); d.className = "nmd-b nmd-u"; d.innerHTML = fmt(t); msgs.appendChild(d); down(); }
  function addBot(t, userText) {
    var d = document.createElement("div"); d.className = "nmd-b nmd-a"; d.innerHTML = fmt(t);
    var rate = document.createElement("div"); rate.className = "nmd-rate";
    [["up", "👍 Sounds natural"], ["down", "👎 Sounds generic"]].forEach(function (r) {
      var b = document.createElement("button"); b.type = "button"; b.textContent = r[1];
      b.onclick = function () {
        post("/api/demo-feedback", { sector: S.sector, rating: r[0], user_message: userText, bot_reply: t, session_id: S.sid }).catch(function () {});
        var done = document.createElement("div"); done.className = "nmd-rated";
        done.textContent = r[0] === "up" ? "Thanks! 🙌" : "Thanks, noted. Tell us what felt off ↓";
        rate.replaceWith(done);
        if (r[0] === "down") { $("nmd-fb").classList.add("show"); $("nmd-fb-text").focus(); }
      };
      rate.appendChild(b);
    });
    d.appendChild(rate); msgs.appendChild(d); down();
  }
  function typing(on) {
    var t = $("nmd-typing");
    if (on && !t) { t = document.createElement("div"); t.className = "nmd-typing"; t.id = "nmd-typing"; t.innerHTML = "<i></i><i></i><i></i>"; msgs.appendChild(t); down(); }
    if (!on && t) t.remove();
  }
  function setBusy(b) { S.busy = b; sendBtn.disabled = b || S.ended; input.disabled = S.ended; }

  function send(text) {
    text = (text || input.value).trim();
    if (!text || S.busy || S.ended || !S.sector) return;
    input.value = "";
    addUser(text);
    S.messages.push({ role: "user", content: text.slice(0, MAX_LEN) });
    renderSug(); setBusy(true); typing(true);
    if (S.messages.length === 1) track("demo_first_message_" + S.sector);
    post("/api/demo-chat", { sector: S.sector, messages: S.messages })
      .then(function (j) {
        typing(false);
        if (j.reply) {
          S.messages.push({ role: "assistant", content: j.reply });
          addBot(j.reply, text);
          if (j.limit) { S.ended = true; note("That's the end of the demo. Tap “Get this for my business” to set it up on your WhatsApp."); }
        } else { S.messages.pop(); note(j.error || "Something went wrong. Please try again."); }
      })
      .catch(function () {
        typing(false); S.messages.pop();
        note("Couldn't reach the server. The first reply can take a few seconds, please try again.");
      })
      .then(function () { setBusy(false); if (!S.ended && window.innerWidth > 520) input.focus(); });
  }

  $("nmd-fb-toggle").onclick = function () { $("nmd-fb").classList.toggle("show"); };
  $("nmd-fb-send").onclick = function () {
    var c = $("nmd-fb-text").value.trim();
    if (!c) { $("nmd-fb-text").focus(); return; }
    var last = S.messages.filter(function (m) { return m.role === "assistant"; }).pop();
    post("/api/demo-feedback", { sector: S.sector, rating: "comment", comment: c, contact: $("nmd-fb-contact").value.trim(),
                                 bot_reply: last ? last.content : "", session_id: S.sid }).catch(function () {});
    $("nmd-fb-text").value = ""; $("nmd-fb").classList.remove("show");
    note("Thanks for the feedback! It goes straight to our team.");
  };

  function open(sector) {
    panel.classList.add("open"); launch.style.display = "none";
    if (sector && SECTORS[sector] && S.sector !== sector) start(sector);
  }
  launch.onclick = function () { open(S.sector ? null : pageSector); };
  $("nmd-close").onclick = function () { panel.classList.remove("open"); launch.style.display = ""; };
  $("nmd-change").onclick = backToPick;
  sendBtn.onclick = function () { send(); };
  input.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); send(); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) $("nmd-close").click(); });

  // Any element with data-demo-open (e.g. a hero button) opens the demo.
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("[data-demo-open]");
    if (!el) return;
    e.preventDefault();
    open(el.getAttribute("data-demo-open") || pageSector);
  });

  /* ── DM link options ────────────────────── */
  var dq = q.get("demo");
  if (dq) open(SECTORS[dq] ? dq : pageSector);

  if (q.get("offer") === "founding") {
    var closed = false;
    try { closed = sessionStorage.getItem("nmd_ribbon_x") === "1"; } catch (e) {}
    if (!closed) {
      var rb = document.createElement("div");
      rb.id = "nmd-ribbon";
      rb.innerHTML = '<div class="in"><b>Founding Partner Program.</b> You\'re one of the first businesses invited to use NeverMiss free, set up by us, in return for honest feedback. ' +
        '<a href="#" data-demo-open>Try the AI first</a>, then <a href="https://wa.me/' + WA + '?text=' +
        encodeURIComponent("Hi, I'd like to join the NeverMiss Founding Partner Program.") +
        '" target="_blank" rel="noopener" data-track="founding_join">reply to join</a>.' +
        '<button class="x" type="button" aria-label="Dismiss">×</button></div>';
      document.body.insertBefore(rb, document.body.firstChild);
      rb.querySelector(".x").onclick = function () { rb.remove(); try { sessionStorage.setItem("nmd_ribbon_x", "1"); } catch (e) {} };
    }
  }
})();
