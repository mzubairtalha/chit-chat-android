(function () {
  var APP_ID = "ca-app-pub-4672720627282510~8007823774";
  var APP_OPEN_ID = "ca-app-pub-4672720627282510/7993925062";
  var INTERSTITIAL_ID = "ca-app-pub-4672720627282510/8627962844";
  var INTERSTITIAL_MS = 2 * 60 * 1000;
  var APP_OPEN_GAP_MS = 2500;
  var ready = false;
  var webMode = false;
  var appOpenAd = null;
  var interstitialAd = null;
  var showing = false;
  var lastInterstitial = 0;
  var lastAppOpen = 0;
  var pendingAppOpen = false;
  var startTries = 0;
  var interstitialTimer = null;

  function nativeAdmob() {
    return window.admob || (window.cordova && window.cordova.plugins && window.cordova.plugins.admob) || null;
  }

  function isCordova() {
    return !!(window.cordova || window.PhoneGap || window.phonegap);
  }

  function onDeviceReady(fn) {
    if (isCordova()) {
      document.addEventListener("deviceready", fn, false);
    } else if (document.readyState === "complete") {
      setTimeout(fn, 0);
    } else {
      window.addEventListener("load", fn);
    }
  }

  function removeWebAd() {
    var el = document.getElementById("chitAdOverlay");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    showing = false;
  }

  function showWebAd(kind) {
    if (document.getElementById("chitAdOverlay")) return;
    showing = true;
    var wrap = document.createElement("div");
    wrap.id = "chitAdOverlay";
    wrap.setAttribute("role", "dialog");
    wrap.style.cssText = "position:fixed;inset:0;z-index:2147483646;background:#111;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:sans-serif;padding:24px;text-align:center;";
    var title = document.createElement("div");
    title.style.cssText = "font-size:18px;font-weight:700;margin-bottom:8px;";
    title.textContent = kind === "interstitial" ? "Ad" : "App Open Ad";
    var sub = document.createElement("div");
    sub.style.cssText = "font-size:13px;opacity:.75;margin-bottom:28px;max-width:280px;line-height:1.4;";
    sub.textContent = "AdMob " + (kind === "interstitial" ? "interstitial" : "app open") + " (test preview)";
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = "Close";
    btn.style.cssText = "background:#2b6cb0;color:#fff;border:0;border-radius:8px;padding:12px 28px;font-size:16px;min-width:140px;";
    btn.addEventListener("click", removeWebAd);
    wrap.appendChild(title);
    wrap.appendChild(sub);
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
    setTimeout(removeWebAd, 8000);
  }

  function reloadAd(ad) {
    if (!ad || typeof ad.load !== "function") return Promise.resolve();
    return Promise.resolve(ad.load()).catch(function () {});
  }

  function showNative(ad) {
    if (!ad) return Promise.reject();
    return Promise.resolve(ad.isLoaded ? ad.isLoaded() : false)
      .then(function (loaded) {
        if (!loaded && ad.load) return ad.load().then(function () { return true; });
        return !!loaded;
      })
      .then(function () {
        return ad.show();
      });
  }

  function finishShow() {
    showing = false;
    reloadAd(appOpenAd);
    reloadAd(interstitialAd);
    if (pendingAppOpen) {
      pendingAppOpen = false;
      setTimeout(showAppOpen, 600);
    }
  }

  function showAppOpen() {
    var now = Date.now();
    if (showing) {
      pendingAppOpen = true;
      return;
    }
    if (now - lastAppOpen < APP_OPEN_GAP_MS) return;
    if (!ready) {
      pendingAppOpen = true;
      return;
    }
    lastAppOpen = now;
    pendingAppOpen = false;
    if (webMode || !appOpenAd) {
      showWebAd("appOpen");
      return;
    }
    showing = true;
    showNative(appOpenAd)
      .catch(function () {
        if (interstitialAd) return showNative(interstitialAd);
      })
      .catch(function () {})
      .then(finishShow);
  }

  function showInterstitial(force) {
    var now = Date.now();
    if (showing) return;
    if (!force && now - lastInterstitial < INTERSTITIAL_MS) return;
    if (!ready) return;
    if (webMode || !interstitialAd) {
      lastInterstitial = now;
      showWebAd("interstitial");
      return;
    }
    showing = true;
    showNative(interstitialAd)
      .then(function () {
        lastInterstitial = Date.now();
      })
      .catch(function () {})
      .then(finishShow);
  }

  function startInterstitialTimer() {
    if (interstitialTimer) return;
    interstitialTimer = setInterval(function () {
      showInterstitial(false);
    }, INTERSTITIAL_MS);
  }

  function startAds() {
    var admob = nativeAdmob();
    if (!admob || !admob.AppOpenAd) {
      if (isCordova() && startTries < 40) {
        startTries += 1;
        setTimeout(startAds, 400);
        return;
      }
      webMode = true;
      ready = true;
      startInterstitialTimer();
      if (pendingAppOpen) showAppOpen();
      return;
    }
    Promise.resolve(typeof admob.start === "function" ? admob.start() : true)
      .then(function () {
        if (typeof admob.configure === "function") return admob.configure({ appId: APP_ID });
      })
      .then(function () {
        appOpenAd = new admob.AppOpenAd({ adUnitId: APP_OPEN_ID });
        interstitialAd = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
        return Promise.all([reloadAd(appOpenAd), reloadAd(interstitialAd)]);
      })
      .then(function () {
        ready = true;
        webMode = false;
        startInterstitialTimer();
        if (pendingAppOpen) showAppOpen();
        else setTimeout(showAppOpen, 500);
      })
      .catch(function () {
        startTries += 1;
        if (startTries < 8) setTimeout(startAds, 1500);
        else {
          webMode = true;
          ready = true;
          startInterstitialTimer();
          if (pendingAppOpen) showAppOpen();
        }
      });
  }

  window.chitShowAppOpenAd = showAppOpen;
  window.chitShowInterstitialAd = function () { showInterstitial(true); };

  onDeviceReady(startAds);
  document.addEventListener("resume", function () {
    setTimeout(showAppOpen, 400);
  }, false);
})();
