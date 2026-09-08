// Upload helper
// Image => base64 (Firebase DB)
// Voice/Audio => Cloudinary (with multi-cloud fallback)
// Video => Cloudinary (with multi-cloud fallback)

// Sab clouds isi order mein try honge. Agar 1st cloud pr upload
// stall/fail ho jaye, to automatically agle cloud pr try hoga.
var CLOUDINARY_CLOUDS = [
  { cloud: "dntrjixuc", preset: "ml_default" },
  { cloud: "lhltyz9t",  preset: "chit chat"  },
  { cloud: "ljoceldl",  preset: "chit chat"  },
  { cloud: "jj63rmzd",  preset: "chit chat"  },
  { cloud: "cwirgeba",  preset: "chit chat"  },
  { cloud: "k3x1oahr",  preset: "chit chat"  }
];

var BASE64_AUDIO_MAX_MB = 1; // (not actively used, kept for compatibility)

// Agar itni der (ms) tak koi naya progress event na aye, to
// maan lo request "stuck/stall" ho gayi hai -> abort -> agle cloud pr try
var STALL_TIMEOUT_MS = 15000;   // 15 sec bina progress ke
var ABSOLUTE_MAX_MS  = 120000;  // 2 min max per cloud attempt (hard safety cap)

function randomToken() {
  var arr = new Uint8Array(16);
  if (window.crypto && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (var i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  var out = [];
  for (var j = 0; j < arr.length; j++) {
    out.push(("0" + arr[j].toString(16)).slice(-2));
  }
  return out.join("");
}

function buildImageKitThumbnail(url) { return url || ""; }
function getCloudinaryThumbnail(url) { return url || ""; }

function makeProgressUI(labelText, cancellable) {
  var wrap = null, barInner = null, label = null, pct = null, cancelBtn = null;
  var chatBoxEl = document.getElementById("chatBox");
  if (chatBoxEl) {
    wrap = document.createElement("div");
    wrap.style.cssText = "background:#1a1a1a;border-radius:8px;padding:10px 12px;margin:4px 0;color:#fff;font-size:12px;";
    label = document.createElement("div");
    label.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;color:#aaa;";
    var labelTextSpan = document.createElement("span");
    labelTextSpan.textContent = labelText;
    label.appendChild(labelTextSpan);
    if (cancellable) {
      cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.textContent = "❌";
      cancelBtn.title = "Cancel upload";
      cancelBtn.style.cssText = "background:none;border:none;padding:0 2px;margin-left:10px;font-size:16px;line-height:1;color:#ff5252;cursor:pointer;outline:none;flex-shrink:0;";
      label.appendChild(cancelBtn);
    }
    var barOuter = document.createElement("div");
    barOuter.style.cssText = "background:#333;border-radius:4px;height:5px;overflow:hidden;";
    barInner = document.createElement("div");
    barInner.style.cssText = "background:#25d366;height:100%;width:0%;transition:width 0.3s;";
    barOuter.appendChild(barInner);
    pct = document.createElement("div");
    pct.style.cssText = "display:flex;align-items:center;justify-content:space-between;font-size:10px;color:#888;margin-top:3px;";
    var pctText = document.createElement("span");
    pctText.textContent = "0%";
    pct.appendChild(pctText);
    wrap.appendChild(label);
    wrap.appendChild(barOuter);
    wrap.appendChild(pct);
    chatBoxEl.appendChild(wrap);
    chatBoxEl.scrollTop = chatBoxEl.scrollHeight;
  }
  return {
    wrap: wrap, barInner: barInner, label: label, pct: pct, cancelBtn: cancelBtn,
    _cancelFn: null,
    remove: function() { if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap); },
    setProgress: function(p) {
      if (barInner) barInner.style.width = p + "%";
      if (pct) pct.textContent = p + "%";
    },
    setLabel: function(t) { if (label) label.textContent = t; }
  };
}

// Upload to Cloudinary with automatic multi-cloud fallback + stall detection.
// Agar current cloud pr request atak jaye (na success na error aye) to
// khud abort karke agle cloud pr try karta hai.
function uploadToCloudinary(file, ui, onComplete, onError, onProgress, onCancel) {
  var fileType = file.type || "";
  var resourceType = "image";
  if (fileType.startsWith("video/") || fileType.startsWith("audio/")) resourceType = "video";

  if (!ui) ui = { setLabel: function() {}, setProgress: function() {}, remove: function() {} };

  var MAX_MB = 50;
  if (file.size > MAX_MB * 1024 * 1024) {
    ui.setLabel("❌ File too large! Max 50MB.");
    setTimeout(function() { ui.remove(); }, 2000);
    if (onError) onError(new Error("File too large"));
    return;
  }

  var cancelled = false;
  var currentXhr = null;
  var currentWatchdog = null;

  // User/delete ne cancel kiya -> abhi wali request abort + aage clouds band
  function userCancel() {
    if (cancelled) return;
    cancelled = true;
    if (currentWatchdog) { clearInterval(currentWatchdog); currentWatchdog = null; }
    if (currentXhr) { try { currentXhr.abort(); } catch (e) {} currentXhr = null; }
    try { ui.setLabel("❌ Upload cancelled"); } catch (e) {}
    try { setTimeout(function() { ui.remove(); }, 800); } catch (e) {}
    if (onCancel) onCancel();
  }

  if (ui) {
    ui._cancelFn = userCancel;
    ui.controller = { abort: userCancel };
    if (ui.cancelBtn && typeof ui.cancelBtn.onclick !== "function") {
      ui.cancelBtn.onclick = userCancel;
    }
    if (typeof ui._onControllerReady === "function") {
      try { ui._onControllerReady(ui.controller); } catch (e) {}
    }
  }

  function tryCloud(cloudIndex) {
    if (cancelled) return;
    if (cloudIndex >= CLOUDINARY_CLOUDS.length) {
      // Sab clouds fail/stall ho chuke
      ui.setLabel("❌ Upload failed on all servers");
      setTimeout(function() { ui.remove(); }, 2000);
      if (onError) onError(new Error("Upload failed on all Cloudinary clouds"));
      return;
    }

    var current = CLOUDINARY_CLOUDS[cloudIndex];
    var uploadUrl = "https://api.cloudinary.com/v1_1/" + current.cloud + "/" + resourceType + "/upload";

    var fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", current.preset);

    var xhr = new XMLHttpRequest();
    xhr.open("POST", uploadUrl, true);

    var settled = false;
    var startTime = Date.now();
    var lastProgressTime = Date.now();
    currentXhr = xhr;

    // Watchdog: har 2 sec check karo ke request stall to nahi hui
    var watchdog = setInterval(function() {
      if (cancelled) return;
      if (settled) return;
      var now = Date.now();
      var stalled = (now - lastProgressTime) > STALL_TIMEOUT_MS;
      var tooLong = (now - startTime) > ABSOLUTE_MAX_MS;
      if (stalled || tooLong) {
        settled = true;
        clearInterval(watchdog);
        currentXhr = null;
        if (currentWatchdog === watchdog) currentWatchdog = null;
        try { xhr.abort(); } catch (e) {}
        // agle cloud pr try karo (agar user ne cancel nahi kiya)
        tryCloud(cloudIndex + 1);
      }
    }, 2000);
    currentWatchdog = watchdog;

    // Upload start hote hi UI ko thora movement do (0% pr "frozen" na dikhe)
    xhr.upload.onloadstart = function() {
      lastProgressTime = Date.now();
      ui.setProgress(1);
      if (onProgress) onProgress(1);
    };

    xhr.upload.onprogress = function(e) {
      lastProgressTime = Date.now();
      if (e.lengthComputable) {
        var p = Math.round((e.loaded / e.total) * 100);
        ui.setProgress(p);
        if (onProgress) onProgress(p);
      }
    };

    xhr.onload = function() {
      if (cancelled || settled) return;
      settled = true;
      clearInterval(watchdog);
      currentXhr = null;
      if (currentWatchdog === watchdog) currentWatchdog = null;
      try {
        var resp = JSON.parse(xhr.responseText || "{}");
        if (xhr.status >= 200 && xhr.status < 300 && resp.secure_url) {
          ui.setProgress(100);
          ui.setLabel("✓ Upload complete");
          setTimeout(function() { ui.remove(); }, 1200);
          if (onComplete) onComplete(resp.secure_url);
        } else {
          // is cloud pr fail hua -> agle cloud pr try karo
          tryCloud(cloudIndex + 1);
        }
      } catch (e) {
        tryCloud(cloudIndex + 1);
      }
    };

    xhr.onerror = function() {
      if (cancelled || settled) return;
      settled = true;
      clearInterval(watchdog);
      currentXhr = null;
      if (currentWatchdog === watchdog) currentWatchdog = null;
      tryCloud(cloudIndex + 1);
    };

    xhr.onabort = function() {
      // watchdog ne khud abort kiya hoga (handled) ya user cancel — kuch nahi karna
      if (!cancelled) {
        currentXhr = null;
        if (currentWatchdog === watchdog) { clearInterval(watchdog); currentWatchdog = null; }
      }
    };

    xhr.send(fd);
  }

  tryCloud(0);
}

// Upload image/audio as base64 to Firebase DB
function uploadAsBase64(file, ui, onComplete, onError) {
  var reader = new FileReader();
  ui.setProgress(10);

  reader.onprogress = function(e) {
    if (e.lengthComputable) {
      ui.setProgress(Math.round((e.loaded / e.total) * 40));
    }
  };

  reader.onload = function(e) {
    var base64 = e.target.result;
    ui.setProgress(70);
    ui.setLabel("Sending...");
    ui.setProgress(100);
    ui.setLabel("✓ Done");
    setTimeout(function() { ui.remove(); }, 1200);
    // Return the actual base64 data URI so it can be rendered directly
    // as <img src="..."> — a "firebase://" reference isn't a real URL
    // and the browser can't load it, which was causing "failed to load".
    if (onComplete) onComplete(base64);
  };

  reader.onerror = function() {
    if (onError) onError(new Error("FileReader failed"));
  };

  reader.readAsDataURL(file);
}

// Main upload function
function uploadFileToCloudinary(file, onProgress, onComplete, onError, onCancel) {
  if (!file) { if (onError) onError(new Error("No file")); return; }

  var fileType = file.type || "";

  // IMAGE => always base64 (fast, no cancel needed)
  if (fileType.startsWith("image/")) {
    var ui = makeProgressUI("🖼 Uploading image...");
    uploadAsBase64(file, ui, onComplete, onError);
    return;
  }

  // AUDIO/VOICE => Cloudinary (multi-cloud fallback + stall detection)
  if (fileType.startsWith("audio/")) {
    var ui = makeProgressUI("🔊 Uploading audio...", !!onCancel);
    uploadToCloudinary(file, ui, onComplete, onError, onProgress, onCancel);
    return;
  }

  // VIDEO => Cloudinary (multi-cloud fallback + stall detection)
  if (fileType.startsWith("video/")) {
    var ui = makeProgressUI("🎬 Uploading video...", !!onCancel);
    uploadToCloudinary(file, ui, onComplete, onError, onProgress, onCancel);
    return;
  }

  if (onError) onError(new Error("Unsupported file type: " + fileType));
}
