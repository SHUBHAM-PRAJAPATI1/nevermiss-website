/* NeverMiss — shared behaviour for the homepage and sector pages.
 * Each page sets, before loading this file:
 *   window.NM_PAGE = { sector: "salons", defaultType: "salon" }
 * Handles: mobile nav, the "Who it's for" menu, the demo form, the
 * checkout / free-trial modal (with business type), founding-slot count.
 */
(function () {
  "use strict";
  var API = "https://nevermiss-api-05de8a834ac4.herokuapp.com";
  var WA = "917004020840";
  var PAGE = window.NM_PAGE || { sector: "home", defaultType: "" };

  var TYPES = [
    ["coaching", "Coaching / tuition / training institute"],
    ["salon", "Salon / beauty parlour"],
    ["makeup", "Makeup artist / bridal studio"],
    ["gym", "Gym / fitness studio"],
    ["yoga", "Yoga / wellness studio"],
    ["dance", "Dance academy / Zumba"],
    ["music", "Music academy"],
    ["art", "Art / hobby classes"],
    ["sports", "Sports academy / swimming"],
    ["dental", "Dental clinic"],
    ["skin_clinic", "Skin / hair clinic"],
    ["physio", "Physiotherapy clinic"],
    ["clinic", "Clinic / doctor (eye, ayurveda, homeo, general)"],
    ["diagnostic", "Pathology lab / diagnostic centre"],
    ["pet", "Pet clinic / grooming"],
    ["driving", "Driving school"],
    ["study_abroad", "Study abroad / visa consultant"],
    ["interior", "Interior designer"],
    ["realestate", "Real estate developer / builder"],
    ["realestate_broker", "Real estate broker / channel partner"],
    ["other", "Something else"]
  ];
  var GROUPS = {
    coaching: ["coaching"],
    salons: ["salon", "makeup"],
    fitness: ["gym", "yoga", "dance", "music", "art", "sports"],
    clinics: ["dental", "skin_clinic", "physio", "clinic", "diagnostic", "pet"],
    realty: ["realestate", "realestate_broker"]
  };

  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) { return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  function typeOptions(selected) {
    var first = GROUPS[PAGE.sector] || [];
    var ordered = TYPES.filter(function (t) { return first.indexOf(t[0]) > -1; })
      .concat(TYPES.filter(function (t) { return first.indexOf(t[0]) === -1; }));
    return '<option value="" disabled' + (selected ? "" : " selected") + '>Choose one</option>' +
      ordered.map(function (t) { return '<option value="' + t[0] + '"' + (t[0] === selected ? " selected" : "") + ">" + esc(t[1]) + "</option>"; }).join("");
  }
  function typeLabel(v) { var t = TYPES.filter(function (x) { return x[0] === v; })[0]; return t ? t[1] : v; }

  /* ── nav ───────────────────────────────── */
  var toggle = $(".nav-toggle"), links = $(".nav-links");
  if (toggle && links) toggle.addEventListener("click", function () {
    var open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open);
  });
  var forWrap = $(".nav-for");
  if (forWrap) {
    var forBtn = forWrap.querySelector("button");
    forBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = forWrap.getAttribute("data-open") !== "true";
      forWrap.setAttribute("data-open", open);
      forBtn.setAttribute("aria-expanded", open);
    });
    document.addEventListener("click", function (e) {
      if (!forWrap.contains(e.target)) { forWrap.setAttribute("data-open", "false"); forBtn.setAttribute("aria-expanded", "false"); }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { forWrap.setAttribute("data-open", "false"); forBtn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ── demo form ─────────────────────────── */
  var form = $("#demo-form");
  if (form) {
    var sel = form.querySelector("#f-type");
    if (sel) sel.innerHTML = typeOptions(PAGE.defaultType || "");
    form.addEventListener("submit", function (e) { e.preventDefault(); bookDemo(); });
  }
  var demoPlan = "";
  window.nmPickPlan = function (plan) {
    demoPlan = plan;
    var note = $("#plan-note");
    if (note) { note.hidden = false; note.querySelector("strong").textContent = plan; }
    var c = $("#contact"); if (c) c.scrollIntoView({ behavior: "smooth" });
  };

  function formError(msg) {
    var el = $("#form-error"); if (!el) return;
    el.textContent = msg; el.style.display = "block";
  }

  function bookDemo() {
    var name = $("#f-name").value.trim();
    var biz = $("#f-business").value.trim();
    var type = ($("#f-type") && $("#f-type").value) || PAGE.defaultType || "";
    var digits = $("#f-phone").value.replace(/\D/g, "").slice(-10);
    $("#form-error").style.display = "none";
    if (!name) return formError("Enter your name.");
    if (!biz) return formError("Enter your business name.");
    if (!type) return formError("Choose your type of business.");
    if (digits.length < 10) return formError("Enter a valid 10-digit WhatsApp number.");

    var btn = $("#demo-btn"); btn.disabled = true; btn.textContent = "Sending…";
    if (window.nmTrack) nmTrack.identify({ name: name, phone: digits, business: biz, form: "demo-" + PAGE.sector });
    fetch(API + "/api/demo-request", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name, institute: biz, phone: digits, interested_plan: demoPlan,
                             source: "web:" + type, business_type: type })
    }).then(function (r) { return r.json(); }).then(function (d) {
      if (!d.success) throw new Error(d.error || "failed");
      demoDone(name);
    }).catch(function () {
      var text = "Hi, I'd like a demo of NeverMiss.\nName: " + name + "\nBusiness: " + biz + " (" + typeLabel(type) + ")\nNumber: " + digits;
      window.open("https://wa.me/" + WA + "?text=" + encodeURIComponent(text), "_blank");
      demoDone(name);
    });
  }
  function demoDone(name) {
    form.innerHTML = '<div class="form-done" role="status"><h3>Thanks, ' + esc(name) + '.</h3>' +
      '<p>We\'ll call you within a day to fix a time. Setting it up on your own number takes about twenty minutes.</p>' +
      '<p class="fine">In a hurry? <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">Message us on WhatsApp</a>.</p></div>';
  }

  /* ── checkout / free trial modal ───────── */
  /* Display only. The amount actually charged is computed server-side in
     payment_handler.py (SECTOR_MONTHLY_RS) from the same business type, so
     keep the two tables in step. Monthly prices in rupees, excl. GST. */
  var SECTOR_RS = {
    coaching: { starter: 2499, growth: 3999, pro: 6999 },
    clinic: { starter: 1999, growth: 3499, pro: 5999 },
    salon: { starter: 1499, growth: 2499, pro: 3999 },
    gym: { starter: 1499, growth: 2499, pro: 3999 },
    dance: { starter: 1499, growth: 2499, pro: 3999 }
  };
  var SECTOR_OF = {
    coaching: "coaching",
    dental: "clinic", skin_clinic: "clinic", physio: "clinic", clinic: "clinic", diagnostic: "clinic", pet: "clinic",
    salon: "salon", makeup: "salon",
    gym: "gym", yoga: "gym", sports: "gym",
    dance: "dance", music: "dance", art: "dance"
  };
  function cyclePrices(m) {
    return { monthly: m, half_yearly: Math.ceil(m * 5.5 / 100) * 100 - 1, yearly: m * 10 };
  }
  function priceFor(plan, cycle, type) {
    if (plan === "founding") return 1999;
    var tier = SECTOR_RS[SECTOR_OF[type] || "coaching"];
    return cyclePrices(tier[plan])[cycle];
  }
  var CYCLE_LABEL = { monthly: "/mo", half_yearly: "/6mo", yearly: "/yr" };
  var TITLE = { starter: "Starter", growth: "Growth", pro: "Pro", founding: "Founding" };
  var HEAD = {
    trial: ["Start your 14-day free trial", "No card needed. You get everything in Growth, plus 10 reminders and 10 announcements to try. We'll email you a login link."],
    founding: ["Claim a founding spot", "₹1,999 a month for everything in Growth, locked for 12 months."],
    starter: ["Get Starter", ""], growth: ["Get Growth", ""], pro: ["Get Pro", ""]
  };
  var PLAN = "trial", CYCLE = "monthly";

  var modal = document.createElement("div");
  modal.className = "modal"; modal.id = "checkout";
  modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-labelledby", "co-title");
  modal.innerHTML =
    '<div class="box"><button class="x" type="button" aria-label="Close">✕</button>' +
    '<div id="co-view"><div style="display:flex;flex-direction:column;gap:14px">' +
    '<h3 id="co-title"></h3><p class="sub" id="co-sub"></p>' +
    '<div class="cycle" id="co-cycle"><button type="button" data-c="monthly" class="on">Monthly</button><button type="button" data-c="half_yearly">6 months</button><button type="button" data-c="yearly">12 months</button></div>' +
    '<div class="price" id="co-price"></div>' +
    '<div class="form-group"><label for="co-name">Your name</label><input id="co-name" autocomplete="name" placeholder="e.g. Priya Shah"></div>' +
    '<div class="form-group"><label for="co-business">Business name</label><input id="co-business" autocomplete="organization" placeholder="e.g. Glow Studio, Baner"></div>' +
    '<div class="form-group"><label for="co-type">Type of business</label><select id="co-type"></select></div>' +
    '<div class="form-group"><label for="co-phone">WhatsApp number</label><input id="co-phone" type="tel" autocomplete="tel" placeholder="e.g. 9876543210"></div>' +
    '<div class="form-group"><label for="co-email">Email</label><input id="co-email" type="email" autocomplete="email" placeholder="you@example.com"></div>' +
    '<button type="button" class="coupon-toggle" id="co-coupon-toggle">Have a coupon code?</button>' +
    '<div class="form-group" id="co-coupon-row" hidden><label for="co-coupon">Coupon code</label><input id="co-coupon" style="text-transform:uppercase"></div>' +
    '<div class="form-error" id="co-error" role="alert"></div>' +
    '<button type="button" class="form-submit" id="co-pay"></button>' +
    '<p class="form-note" id="co-note"></p></div></div>' +
    '<div id="co-done" hidden></div></div>';
  document.body.appendChild(modal);

  function payLabel() { return PLAN === "trial" ? "Start free trial" : "Pay and activate"; }
  function updatePrice() {
    var type = $("#co-type").value || PAGE.defaultType || "";
    if (!type && PLAN !== "founding") { $("#co-price").innerHTML = '<span>Choose your type of business to see the price</span>'; return; }
    $("#co-price").innerHTML = "₹" + priceFor(PLAN, CYCLE, type).toLocaleString("en-IN") + "<span>" + CYCLE_LABEL[CYCLE] + "</span>";
  }
  function coError(m) { var e = $("#co-error"); e.textContent = m; e.style.display = "block"; }

  window.nmCheckout = function (plan) {
    PLAN = plan || "trial"; CYCLE = "monthly";
    var h = HEAD[PLAN] || HEAD.pro, trial = PLAN === "trial", monthlyOnly = trial || PLAN === "founding";
    $("#co-title").textContent = h[0]; $("#co-sub").textContent = h[1];
    $("#co-cycle").style.display = monthlyOnly ? "none" : "";
    $("#co-price").style.display = trial ? "none" : "";
    $("#co-coupon-toggle").style.display = monthlyOnly ? "none" : "";
    $("#co-coupon-row").hidden = true; $("#co-coupon").value = "";
    $("#co-type").innerHTML = typeOptions(PAGE.defaultType || "");
    $("#co-note").textContent = trial
      ? "One trial per business. When it ends, pick a plan to keep your bot replying."
      : "You'll get an email right after payment with a link to set your dashboard password. Then connect WhatsApp and you're live.";
    modal.querySelectorAll(".cycle button").forEach(function (b) { b.classList.toggle("on", b.dataset.c === "monthly"); });
    if (!trial) updatePrice();
    $("#co-error").style.display = "none";
    $("#co-view").hidden = false; $("#co-done").hidden = true;
    var pay = $("#co-pay"); pay.disabled = false; pay.textContent = payLabel();
    modal.classList.add("show");
    setTimeout(function () { $("#co-name").focus(); }, 30);
  };
  function closeModal() { modal.classList.remove("show"); }
  modal.querySelector(".x").addEventListener("click", closeModal);
  modal.addEventListener("click", function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("show")) closeModal(); });
  modal.querySelectorAll(".cycle button").forEach(function (b) {
    b.addEventListener("click", function () { CYCLE = b.dataset.c; modal.querySelectorAll(".cycle button").forEach(function (x) { x.classList.toggle("on", x === b); }); updatePrice(); });
  });
  $("#co-type").addEventListener("change", function () { if (PLAN !== "trial") updatePrice(); });
  $("#co-coupon-toggle").addEventListener("click", function () { var r = $("#co-coupon-row"); r.hidden = !r.hidden; });
  $("#co-pay").addEventListener("click", startPayment);
  document.querySelectorAll("[data-checkout]").forEach(function (el) {
    el.addEventListener("click", function () { var p = el.getAttribute("data-checkout"); if (p) window.nmCheckout(p); });
  });
  document.querySelectorAll("[data-plan]").forEach(function (el) {
    el.addEventListener("click", function () { window.nmPickPlan(el.getAttribute("data-plan")); });
  });

  function startPayment() {
    var name = $("#co-name").value.trim(), business = $("#co-business").value.trim();
    var type = $("#co-type").value, email = $("#co-email").value.trim();
    var digits = $("#co-phone").value.replace(/\D/g, "").slice(-10), coupon = $("#co-coupon").value.trim();
    $("#co-error").style.display = "none";
    if (!name) return coError("Enter your name.");
    if (!business) return coError("Enter your business name.");
    if (!type) return coError("Choose your type of business.");
    if (digits.length < 10) return coError("Enter a valid 10-digit WhatsApp number.");
    if (!email || email.indexOf("@") === -1) return coError("Enter a valid email. Your login link goes there.");
    var btype = type === "other" ? "" : type;
    var pay = $("#co-pay"); pay.disabled = true;
    if (window.nmTrack) nmTrack.identify({ name: name, phone: digits, email: email, business: business, form: PLAN === "trial" ? "trial-" + PAGE.sector : "checkout-" + PLAN });

    if (PLAN === "trial") {
      pay.textContent = "Starting your trial…";
      fetch(API + "/api/start-trial", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name, business: business, phone: digits, email: email, business_type: btype }) })
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (d.success) return done(name, email, true);
          coError(d.error || "Couldn't start the trial. Try again or message us on WhatsApp.");
          pay.disabled = false; pay.textContent = payLabel();
        }).catch(function () { coError("Connection error. Try again, or message us on WhatsApp."); pay.disabled = false; pay.textContent = payLabel(); });
      return;
    }
    pay.textContent = "Preparing checkout…";
    fetch(API + "/api/create-order", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: PLAN, billing_cycle: CYCLE, phone: digits, coupon_code: coupon, name: name, business: business, email: email, business_type: btype }) })
      .then(function (r) { return r.json(); })
      .then(function (order) {
        pay.disabled = false; pay.textContent = payLabel();
        if (order.coupon_error) return coError("Coupon: " + order.coupon_error);
        if (!order.id) return coError(order.error || "Couldn't start checkout. Try again or message us on WhatsApp.");
        if (!window.Razorpay) return coError("Payment window didn't load. Refresh the page and try again.");
        var rzp = new Razorpay({
          key: order.key_id, amount: order.amount, currency: "INR", name: "NeverMiss",
          description: TITLE[PLAN] + " subscription", order_id: order.id,
          prefill: { name: name, contact: digits, email: email }, theme: { color: "#0F766E" },
          handler: function (resp) {
            pay.disabled = true; pay.textContent = "Confirming payment…";
            fetch(API + "/api/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id,
                                     razorpay_signature: resp.razorpay_signature, customer: { name: name, business: business, phone: digits, email: email } }) })
              .then(function (r) { return r.json(); })
              .then(function (v) {
                if (v.success) return done(name, email, false);
                coError("Payment received but confirming it failed. Message us on WhatsApp with payment ID " + resp.razorpay_payment_id + ".");
                pay.disabled = false; pay.textContent = payLabel();
              }).catch(function () {
                coError("Payment received but confirming it failed. Message us on WhatsApp with payment ID " + resp.razorpay_payment_id + ".");
                pay.disabled = false; pay.textContent = payLabel();
              });
          },
          modal: { ondismiss: function () { pay.disabled = false; pay.textContent = payLabel(); } }
        });
        rzp.on("payment.failed", function (r) { coError("Payment failed: " + ((r.error && r.error.description) || "please try again.")); });
        rzp.open();
      }).catch(function () { coError("Connection error. Try again, or message us on WhatsApp."); pay.disabled = false; pay.textContent = payLabel(); });
  }
  function done(name, email, trial) {
    $("#co-view").hidden = true;
    var d = $("#co-done"); d.hidden = false;
    d.innerHTML = '<div class="form-done" role="status"><h3>You\'re in, ' + esc(name) + '.</h3>' +
      '<p>Check <strong>' + esc(email) + '</strong> for a link to set your dashboard password. Set it, log in, and connect your WhatsApp number to go live.' +
      (trial ? " Your 14 days start now." : "") + '</p>' +
      '<p class="fine">Not there in a few minutes? Check spam, or <a href="https://wa.me/' + WA + '" target="_blank" rel="noopener">message us on WhatsApp</a>.</p></div>';
  }

  /* ── founding spots ────────────────────── */
  var left = $("#founding-left");
  if (left) fetch(API + "/api/founding-slots").then(function (r) { return r.json(); }).then(function (d) {
    if (typeof d.left !== "number") return;
    if (d.left <= 0) {
      left.textContent = "All founding spots are taken.";
      var b = $("#founding-btn"); if (b) { b.textContent = "Start a free trial instead"; b.setAttribute("data-checkout", "trial"); }
    } else { left.textContent = d.left + " of " + d.total + " spots left."; }
  }).catch(function () {});
})();
