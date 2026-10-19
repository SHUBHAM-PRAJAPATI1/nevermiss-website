/*
 * nm-track.js — tiny first-party visitor tracker for the NeverMiss master dashboard.
 *
 * <script src="nm-track.js" data-endpoint="https://nevermiss-api-05de8a834ac4.herokuapp.com/api/track"
 *         data-product="nevermiss" defer></script>
 *
 * Sends: a page view on load, time-on-page when the tab is closed/hidden,
 * clicks on WhatsApp / phone / download / [data-track] links.
 * After a form is submitted, call  nmTrack.identify({name, phone, email, business, form})
 * so that visitor's whole journey gets a name and number in the dashboard.
 * Add data-pageview="off" to skip the automatic page view (e.g. logged-in app pages).
 * No cookies, no IP stored, no third parties.
 */
(function () {
  var s = document.currentScript;
  var ENDPOINT = (s && s.getAttribute("data-endpoint")) || "/api/track";
  var PRODUCT = (s && s.getAttribute("data-product")) || "nevermiss";
  var AUTO_PV = !(s && s.getAttribute("data-pageview") === "off");

  // Don't count yourself: open any page once with ?nmtrack=off (undo with ?nmtrack=on).
  function store(kind) { try { return window[kind]; } catch (e) { return null; } }
  var ls = store("localStorage"), ss = store("sessionStorage");
  function get(st, k) { try { return st && st.getItem(k); } catch (e) { return null; } }
  function set(st, k, v) { try { st && st.setItem(k, v); } catch (e) {} }

  var q = new URLSearchParams(location.search);
  if (q.get("nmtrack") === "off") set(ls, "nm_track_off", "1");
  if (q.get("nmtrack") === "on") { try { ls && ls.removeItem("nm_track_off"); } catch (e) {} }
  var disabled = get(ls, "nm_track_off") === "1" || navigator.doNotTrack === "1";

  function rid() {
    return (Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
  }
  var vid = get(ls, "nm_vid");
  if (!vid) { vid = rid(); set(ls, "nm_vid", vid); }

  // A session ends after 30 minutes of no page views.
  var sid = get(ss, "nm_sid"), last = +get(ss, "nm_last") || 0;
  if (!sid || Date.now() - last > 30 * 60 * 1000) { sid = rid(); set(ss, "nm_sid", sid); }
  set(ss, "nm_last", String(Date.now()));

  // Keep first-touch UTM for the whole session so later pages still credit the campaign.
  ["utm_source", "utm_medium", "utm_campaign"].forEach(function (k) {
    if (q.get(k)) set(ss, "nm_" + k, q.get(k).slice(0, 120));
  });

  var w = window.innerWidth || 1024;
  var dev = /Mobi|Android|iPhone/i.test(navigator.userAgent) ? "mobile" : (w < 1024 ? "tablet" : "desktop");
  var ref = document.referrer && document.referrer.indexOf(location.host) === -1 ? document.referrer : "";

  function send(event, extra) {
    if (disabled) return;
    var body = {
      event: event, vid: vid, sid: sid, path: location.pathname + location.hash.slice(0, 40),
      ref: ref, dev: dev,
      us: get(ss, "nm_utm_source"), um: get(ss, "nm_utm_medium"), uc: get(ss, "nm_utm_campaign")
    };
    for (var k in (extra || {})) body[k] = extra[k];
    var payload = JSON.stringify(body);
    try {
      // text/plain keeps this a "simple" request: no CORS preflight, survives page close.
      if (navigator.sendBeacon && navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "text/plain" }))) return;
    } catch (e) {}
    try { fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true, mode: "no-cors" }); } catch (e) {}
  }

  var start = Date.now(), leftSent = false;
  if (AUTO_PV) {
    send("pageview");
    function leave() {
      if (leftSent) return;
      leftSent = true;
      send("leave", { dur: Math.round((Date.now() - start) / 1000) });
    }
    addEventListener("pagehide", leave);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") leave();
      else { leftSent = false; start = Date.now(); }
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a,[data-track],button");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var label = (a.getAttribute("data-track") || a.textContent || "").trim().slice(0, 40);
    if (/wa\.me|api\.whatsapp\.com|whatsapp:/.test(href)) send("wa_click", { form: label });
    else if (/^tel:/.test(href)) send("call_click", { form: label });
    else if (a.hasAttribute("data-track") || /\/download/.test(href)) send("cta_click", { form: label });
  }, true);

  window.nmTrack = {
    identify: function (p) {
      p = p || {};
      send("identify", {
        name: p.name || "", phone: String(p.phone || "").replace(/\D/g, ""),
        email: p.email || "", business: p.business || "", form: p.form || ""
      });
    },
    event: function (name, label) { send(name === "wa_click" || name === "call_click" ? name : "cta_click", { form: label || name }); }
  };
})();
