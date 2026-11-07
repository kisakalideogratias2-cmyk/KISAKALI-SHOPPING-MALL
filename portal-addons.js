/* KISAKALI portal add-ons: live website orders for vendor.html, driver.html, admin.html
   Reads/writes the same browser storage used by checkout.html and track.html.
   (Demo storage until a real server is added.) */
(function () {
  var page = (location.pathname.split("/").pop() || "").toLowerCase();
  var role = { "vendor.html": "vendor", "driver.html": "driver", "admin.html": "admin" }[page];
  if (!role) return;
  var AUTH = { vendor: "vAuth", driver: "rAuth", admin: "kAuth" }[role];
  var LABEL = { vendor: "Website Orders", driver: "My Deliveries", admin: "Platform Tools" }[role];

  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }
  function money(n) { return Number(n || 0).toLocaleString("en-US") + " TSh"; }
  function load(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { toast("Storage is full. Could not save."); return false; } }
  function orders() { return load("kisakali_orders", []); }
  function commission() { var c = parseFloat(localStorage.getItem("kisakali_commission")); return isNaN(c) ? 10 : c; }
  function audit(a, d) { var l = load("kisakali_audit", []); l.unshift({ t: new Date().toISOString(), role: role, a: a, d: d }); save("kisakali_audit", l.slice(0, 50)); }
  function toast(m) {
    var t = document.createElement("div"); t.className = "ks-toast"; t.style.zIndex = 99999; t.textContent = m;
    document.body.appendChild(t); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2400);
  }
  function find(num) { return orders().filter(function (o) { return o.number === num; })[0]; }
  function update(num, fn) { var all = orders(); all.forEach(function (o) { if (o.number === num) fn(o); }); return save("kisakali_orders", all); }
  var CSS = "#kp-btn{position:fixed;right:16px;bottom:16px;z-index:900;background:#FE980F;color:#0D0D0D;border:0;border-radius:30px;padding:12px 18px;font-weight:bold;cursor:pointer;box-shadow:0 4px 16px rgba(0,0,0,.5)}" +
    "#kp-panel{position:fixed;top:0;right:0;height:100%;width:min(520px,100%);background:#1c1b1a;color:#fff;z-index:950;overflow-y:auto;padding:18px;display:none;box-shadow:-4px 0 20px rgba(0,0,0,.6)}" +
    "#kp-panel h3{margin:0 0 12px;color:#FE980F}#kp-panel .kp-card{background:#2a2826;border:1px solid #444;border-radius:6px;padding:12px;margin-bottom:12px;font-size:13px}" +
    "#kp-panel .kp-b{background:#FE980F;color:#0D0D0D;border:0;border-radius:4px;padding:8px 12px;font-weight:bold;cursor:pointer;margin:6px 6px 0 0}" +
    "#kp-panel .kp-b.alt{background:#444;color:#fff}#kp-panel input,#kp-panel select{width:100%;padding:8px;margin:6px 0;border-radius:4px;border:1px solid #666;background:#fff;color:#222}" +
    "#kp-panel small{color:#b3b1ae}#kp-panel .kp-tabs button{background:#333;color:#fff;border:0;padding:8px 10px;margin:0 4px 8px 0;border-radius:4px;cursor:pointer}#kp-panel .kp-tabs .on{background:#FE980F;color:#0D0D0D}";
  var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
  var btn = document.createElement("button"); btn.id = "kp-btn"; btn.innerHTML = '<i class="fas fa-inbox"></i> ' + LABEL;
  var panel = document.createElement("div"); panel.id = "kp-panel";
  document.body.appendChild(btn); document.body.appendChild(panel);
  var tab = "pay";

  btn.onclick = function () {
    if (sessionStorage.getItem(AUTH) !== "1") { toast("Please log in first."); return; }
    panel.style.display = "block"; draw();
  };

  function head(title) { return '<div style="display:flex;justify-content:space-between;align-items:center"><h3>' + title + '</h3><button class="kp-b alt" data-a="close">Close</button></div>'; }
  function badge(t) { return '<span class="ks-badge">' + esc(t) + "</span>"; }

  /* ---------- VENDOR ---------- */
  function drawVendor() {
    var all = orders(), names = [];
    all.forEach(function (o) { (o.items || []).forEach(function (i) { if (i.vendor && names.indexOf(i.vendor) < 0) names.push(i.vendor); }); });
    var pick = localStorage.getItem("kisakali_vendor_pick") || names[0] || "";
    if (names.indexOf(pick) < 0) pick = names[0] || "";
    var h = head("Website Orders");
    if (!names.length) return h + "<p><small>No website orders yet. Orders placed on checkout.html appear here.</small></p>";
    h += '<label><small>Showing orders for</small></label><select id="kp-vsel">' + names.map(function (n) { return "<option" + (n === pick ? " selected" : "") + ">" + esc(n) + "</option>"; }).join("") + "</select>";
    var rate = commission();
    all.filter(function (o) { return (o.vendors || []).indexOf(pick) >= 0; }).forEach(function (o) {
      var mine = (o.items || []).filter(function (i) { return i.vendor === pick; });
      var gross = mine.reduce(function (a, i) { return a + i.price * (i.qty || 1); }, 0);
      var vs = (o.vendorStatus || {})[pick] || "Preparing", paid = o.payment === "Verified";
      h += '<div class="kp-card"><b>' + esc(o.number) + "</b> " + badge(vs) + " " + badge("Payment: " + o.payment) + "<br>" +
        mine.map(function (i) {
          var c = i.custom ? '<br><small>' + esc([i.custom.variant, i.custom.flavor].filter(Boolean).join(", ")) + (i.custom.addons && i.custom.addons.length ? " + " + esc(i.custom.addons.join(", ")) : "") +
            (i.custom.inscription ? '<br>Card message: "' + esc(i.custom.inscription) + '"' : "") + "</small>" : "";
          return "&bull; " + esc(i.name) + " x" + (i.qty || 1) + c;
        }).join("<br>") +
        "<br><small>Deliver to: " + esc(o.recipient || (o.anonymous ? "Surprise recipient" : o.customer)) + " &middot; " + esc(o.date || "date not set") + " " + esc(o.time || "") + (o.note ? "<br>Card note: " + esc(o.note) : "") + "</small>" +
        "<br>Gross " + money(gross) + " &middot; Commission " + rate + "% &middot; <b>You receive " + money(gross - gross * rate / 100) + "</b><br>" +
        (!paid ? "<small>Waiting for KISAKALI to verify payment before you start.</small>"
          : vs === "Ready" ? "<small>Marked ready. Waiting for rider assignment.</small>"
          : '<button class="kp-b" data-a="ready" data-n="' + esc(o.number) + '" data-v="' + esc(pick) + '">Mark ready for pickup</button>') + "</div>";
    });
    return h;
  }

  /* ---------- DRIVER ---------- */
  function drawDriver() {
    var h = head("My Deliveries"), list = orders().filter(function (o) { return o.status === "Assigned to Rider" || o.status === "Out for Delivery"; });
    if (!list.length) return h + "<p><small>No deliveries assigned yet. KISAKALI admin assigns paid orders to riders.</small></p>";
    list.forEach(function (o) {
      var needCode = !o.anonymous && o.otp;
      h += '<div class="kp-card"><b>' + esc(o.number) + "</b> " + badge(o.status) + (o.anonymous ? " " + badge("Anonymous surprise") : "") + "<br>" +
        "Deliver to: <b>" + esc(o.recipient || o.customer) + "</b><br>" + esc(o.address) + "<br>" +
        '<a href="tel:' + esc(o.recipientPhone || o.phone) + '" style="color:#FE980F">' + esc(o.recipientPhone || o.phone) + "</a><br>" +
        "<small>" + esc(o.date || "") + " " + esc(o.time || "") + " &middot; " + (o.items || []).length + " item(s) from " + (o.vendors || []).length + " vendor(s)" +
        (o.anonymous ? "<br>Do NOT reveal who sent this gift." : "") + "</small><br>";
      if (o.status === "Assigned to Rider") h += '<button class="kp-b" data-a="pick" data-n="' + esc(o.number) + '">I have collected the order</button>';
      else {
        h += (needCode ? '<input data-code="' + esc(o.number) + '" placeholder="Customer delivery code (4 digits)" inputmode="numeric">' : "") +
          '<input type="file" accept="image/*" capture="environment" data-photo="' + esc(o.number) + '">' +
          '<small>Take a clear photo of the delivered gift.</small><br><button class="kp-b" data-a="deliver" data-n="' + esc(o.number) + '">Confirm delivery</button>';
      }
      h += "</div>";
    });
    return h;
  }

  /* ---------- ADMIN ---------- */
  function drawAdmin() {
    var h = head("Platform Tools") + '<div class="kp-tabs">' + [["pay", "Payments"], ["disp", "Dispatch"], ["ven", "Vendors"], ["com", "Commission"]].map(function (t) {
      return '<button class="' + (tab === t[0] ? "on" : "") + '" data-a="tab" data-n="' + t[0] + '">' + t[1] + "</button>";
    }).join("") + "</div>";
    var all = orders();
    if (tab === "pay") {
      var p = all.filter(function (o) { return o.payment === "Pending"; });
      h += p.length ? "" : "<p><small>No payments waiting for verification.</small></p>";
      p.forEach(function (o) {
        h += '<div class="kp-card"><b>' + esc(o.number) + "</b> " + money(o.total) + "<br><small>" + esc(o.channel) + " &middot; payer " + esc(o.phone) + "</small>" +
          '<input data-ref="' + esc(o.number) + '" placeholder="Provider transaction reference"><button class="kp-b" data-a="pverify" data-n="' + esc(o.number) + '">Verify payment</button>' +
          '<button class="kp-b alt" data-a="preject" data-n="' + esc(o.number) + '">Reject</button></div>';
      });
    } else if (tab === "disp") {
      var d = all.filter(function (o) { return o.payment === "Verified" && (o.status === "Preparing" || o.status === "Arranging"); });
      h += d.length ? "" : "<p><small>No paid orders waiting for dispatch.</small></p>";
      d.forEach(function (o) {
        var ready = (o.vendors || []).filter(function (v) { return (o.vendorStatus || {})[v] === "Ready"; }).length, tot = (o.vendors || []).length;
        h += '<div class="kp-card"><b>' + esc(o.number) + "</b> " + badge(o.status) + "<br><small>Vendors ready: " + ready + " / " + tot + " &middot; " + esc(o.address) + "</small><br>" +
          (ready === tot && tot ? '<button class="kp-b" data-a="assign" data-n="' + esc(o.number) + '">Assign to rider</button>' : "<small>Waiting for all vendors to be ready.</small>") + "</div>";
      });
    } else if (tab === "ven") {
      var apps = load("kisakali_vendor_apps", []);
      h += apps.length ? "" : '<p><small>No vendor applications yet. Applications come from vendor-apply.html.</small></p>';
      apps.forEach(function (a) {
        h += '<div class="kp-card"><b>' + esc(a.shop) + "</b> " + badge(a.status) + "<br><small>" + esc(a.owner) + " &middot; " + esc(a.phone) + " &middot; " + esc(a.category) + " &middot; " + esc(a.area) + "</small><br>" +
          (a.status === "pending" ? '<button class="kp-b" data-a="vapprove" data-n="' + esc(a.id) + '">Approve</button><button class="kp-b alt" data-a="vreject" data-n="' + esc(a.id) + '">Reject</button>' : "") + "</div>";
      });
    } else {
      var ver = all.filter(function (o) { return o.payment === "Verified"; }), gross = ver.reduce(function (a, o) { return a + o.subtotal; }, 0), rate = commission();
      h += '<div class="kp-card"><label>Platform commission (%)</label><input id="kp-rate" type="number" min="0" max="50" step="0.5" value="' + rate + '">' +
        '<button class="kp-b" data-a="saverate">Save commission</button></div>' +
        '<div class="kp-card"><b>Verified orders: ' + ver.length + "</b><br>Product sales " + money(gross) + "<br>Platform commission " + money(gross * rate / 100) + "<br>Vendor payouts " + money(gross - gross * rate / 100) +
        "<br>Delivery fees " + money(ver.reduce(function (a, o) { return a + o.delivery; }, 0)) + "</div>";
    }
    var log = load("kisakali_audit", []).slice(0, 5);
    if (log.length) h += "<small>Recent activity:</small><br>" + log.map(function (l) { return "<small>" + new Date(l.t).toLocaleTimeString() + " " + esc(l.role) + ": " + esc(l.a) + " " + esc(l.d) + "</small>"; }).join("<br>");
    return h;
  }

  function draw() { panel.innerHTML = role === "vendor" ? drawVendor() : role === "driver" ? drawDriver() : drawAdmin(); }

  function shrink(file, cb) {
    var r = new FileReader();
    r.onload = function () {
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement("canvas");
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); cb(c.toDataURL("image/jpeg", 0.6));
      };
      im.onerror = function () { toast("That file is not a valid image."); }; im.src = r.result;
    };
    r.readAsDataURL(file);
  }

  panel.addEventListener("change", function (e) { if (e.target.id === "kp-vsel") { localStorage.setItem("kisakali_vendor_pick", e.target.value); draw(); } });
  panel.addEventListener("click", function (e) {
    var t = e.target.closest("[data-a]"); if (!t) return;
    var a = t.getAttribute("data-a"), n = t.getAttribute("data-n"), o;
    if (a === "close") { panel.style.display = "none"; return; }
    if (a === "tab") { tab = n; draw(); return; }
    if (a === "ready") {
      var v = t.getAttribute("data-v");
      update(n, function (o) { o.vendorStatus = o.vendorStatus || {}; o.vendorStatus[v] = "Ready"; if ((o.vendors || []).every(function (x) { return o.vendorStatus[x] === "Ready"; })) o.status = "Arranging"; });
      audit("ready", n + " by " + v); toast("Marked ready"); draw();
    } else if (a === "pick") { update(n, function (o) { o.status = "Out for Delivery"; }); audit("pickup", n); toast("Order is out for delivery"); draw(); }
    else if (a === "deliver") {
      o = find(n); var code = panel.querySelector('[data-code="' + n + '"]'), ph = panel.querySelector('[data-photo="' + n + '"]');
      if (code && code.value.trim() !== String(o.otp)) { toast("Wrong delivery code."); return; }
      if (!ph || !ph.files[0]) { toast("Take a delivery photo first."); return; }
      shrink(ph.files[0], function (img) {
        if (update(n, function (x) { x.status = "Delivered"; x.pod = img; x.deliveredAt = new Date().toISOString(); })) { audit("delivered", n); toast("Delivery confirmed"); draw(); }
      });
    }
    else if (a === "pverify") {
      var ref = panel.querySelector('[data-ref="' + n + '"]').value.trim(); if (!ref) { toast("Enter the transaction reference."); return; }
      update(n, function (o) { o.payment = "Verified"; o.paymentRef = ref; }); audit("payment verified", n + " " + ref); draw();
    }
    else if (a === "preject") { update(n, function (o) { o.payment = "Failed"; }); audit("payment rejected", n); draw(); }
    else if (a === "assign") { update(n, function (o) { o.status = "Assigned to Rider"; }); audit("assigned", n); toast("Assigned to rider"); draw(); }
    else if (a === "vapprove" || a === "vreject") {
      var apps = load("kisakali_vendor_apps", []); apps.forEach(function (x) { if (x.id === n) x.status = a === "vapprove" ? "approved" : "rejected"; });
      save("kisakali_vendor_apps", apps); audit(a, n); draw();
    }
    else if (a === "saverate") {
      var r = parseFloat(document.getElementById("kp-rate").value);
      if (isNaN(r) || r < 0 || r > 50) { toast("Enter a rate between 0 and 50."); return; }
      localStorage.setItem("kisakali_commission", r); audit("commission", r + "%"); toast("Commission saved"); draw();
    }
  });
})();
