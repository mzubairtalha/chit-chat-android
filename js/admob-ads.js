(function () {
  var APP_ID = "ca-app-pub-4672720627282510~8007823774";
  var APP_OPEN_ID = "ca-app-pub-4672720627282510/7993925062";
  var INTERSTITIAL_ID = "ca-app-pub-4672720627282510/8627962844";
  var INTERSTITIAL_MS = 2 * 60 * 1000;
  var APP_OPEN_GAP_MS = 8000;
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
  var appOpenLoaded = false;
  var interstitialLoaded = false;
  var startedAt = 0;

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

  function bindAdEvents(ad, kind) {
    if (!ad || typeof ad.on !== "function") return;
    try {
      ad.on("load", function () {
        if (kind === "appOpen") appOpenLoaded = true;
        else interstitialLoaded = true;
      });
      ad.on("loadfail", function () {
        if (kind === "appOpen") appOpenLoaded = false;
        else interstitialLoaded = false;
        setTimeout(function () { reloadAd(ad, kind); }, 8000);
      });
      ad.on("show", function () {
        showing = true;
      });
      ad.on("showfail", function () {
        showing = false;
        if (kind === "appOpen") appOpenLoaded = false;
        else interstitialLoaded = false;
        setTimeout(function () { reloadAd(ad, kind); }, 1500);
      });
      ad.on("dismiss", function () {
        showing = false;
        if (kind === "appOpen") appOpenLoaded = false;
        else interstitialLoaded = false;
        setTimeout(function () { reloadAd(ad, kind); }, 400);
        if (pendingAppOpen) {
          pendingAppOpen = false;
          setTimeout(showAppOpen, 800);
        }
      });
    } catch (e) {}
  }

  function reloadAd(ad, kind) {
    if (!ad || typeof ad.load !== "function") return Promise.resolve();
    if (kind === "appOpen") appOpenLoaded = false;
    if (kind === "interstitial") interstitialLoaded = false;
    return Promise.resolve(ad.load()).then(function () {
      if (kind === "appOpen") appOpenLoaded = true;
      if (kind === "interstitial") interstitialLoaded = true;
    }).catch(function () {
      setTimeout(function () { reloadAd(ad, kind); }, 6000);
    });
  }

  function waitUntilLoaded(ad, kind, timeoutMs) {
    timeoutMs = timeoutMs || 8000;
    var started = Date.now();
    function tick() {
      var loadedFlag = kind === "appOpen" ? appOpenLoaded : interstitialLoaded;
      if (loadedFlag) return Promise.resolve(true);
      if (!ad) return Promise.resolve(false);
      return Promise.resolve(ad.isLoaded ? ad.isLoaded() : false).then(function (loaded) {
        if (loaded) {
          if (kind === "appOpen") appOpenLoaded = true;
          else interstitialLoaded = true;
          return true;
        }
        if (Date.now() - started > timeoutMs) return false;
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(tick()); }, 250);
        });
      }).catch(function () { return false; });
    }
    return tick();
  }

  function showNative(ad, kind) {
    if (!ad) return Promise.reject();
    return waitUntilLoaded(ad, kind, 6000).then(function (loaded) {
      if (!loaded && ad.load) {
        return ad.load().then(function () { return ad.show(); });
      }
      return ad.show();
    });
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
      if (!isCordova()) showWebAd("appOpen");
      return;
    }
    showing = true;
    showNative(appOpenAd, "appOpen")
      .then(function (shown) {
        if (shown === false) showing = false;
      })
      .catch(function () {
        showing = false;
        if (interstitialAd) return showNative(interstitialAd, "interstitial");
      })
      .catch(function () { showing = false; });
  }

  function showInterstitial(force) {
    var now = Date.now();
    if (showing) return;
    if (!force && now - lastInterstitial < INTERSTITIAL_MS) return;
    if (!ready) return;
    if (webMode || !interstitialAd) {
      if (!isCordova()) {
        lastInterstitial = now;
        showWebAd("interstitial");
      }
      return;
    }
    showing = true;
    showNative(interstitialAd, "interstitial")
      .then(function (shown) {
        if (shown === false) showing = false;
        else lastInterstitial = Date.now();
      })
      .catch(function () { showing = false; });
  }

  function startInterstitialTimer() {
    if (interstitialTimer) return;
    interstitialTimer = setInterval(function () {
      if (document.hidden) return;
      showInterstitial(false);
    }, INTERSTITIAL_MS);
  }

  function startAds() {
    var admob = nativeAdmob();
    if (!admob || !admob.AppOpenAd) {
      if (isCordova() && startTries < 50) {
        startTries += 1;
        setTimeout(startAds, 300);
        return;
      }
      webMode = !isCordova();
      ready = true;
      startInterstitialTimer();
      if (pendingAppOpen && webMode) showAppOpen();
      return;
    }
    Promise.resolve(typeof admob.start === "function" ? admob.start() : true)
      .then(function () {
        if (typeof admob.configure === "function") {
          return admob.configure({ appId: APP_ID }).catch(function () {});
        }
      })
      .then(function () {
        appOpenAd = new admob.AppOpenAd({ adUnitId: APP_OPEN_ID });
        interstitialAd = new admob.InterstitialAd({ adUnitId: INTERSTITIAL_ID });
        bindAdEvents(appOpenAd, "appOpen");
        bindAdEvents(interstitialAd, "interstitial");
        return Promise.all([reloadAd(appOpenAd, "appOpen"), reloadAd(interstitialAd, "interstitial")]);
      })
      .then(function () {
        ready = true;
        webMode = false;
        startedAt = Date.now();
        startInterstitialTimer();
        if (pendingAppOpen) setTimeout(showAppOpen, 800);
        else setTimeout(showAppOpen, 1200);
      })
      .catch(function () {
        startTries += 1;
        if (startTries < 10) setTimeout(startAds, 1200);
        else {
          webMode = !isCordova();
          ready = true;
          startInterstitialTimer();
        }
      });
  }

  window.chitShowAppOpenAd = showAppOpen;
  window.chitShowInterstitialAd = function () { showInterstitial(true); };

  onDeviceReady(startAds);
  document.addEventListener("resume", function () {
    setTimeout(function () {
      if (!appOpenLoaded && appOpenAd) reloadAd(appOpenAd, "appOpen");
      if (!interstitialLoaded && interstitialAd) reloadAd(interstitialAd, "interstitial");
      showAppOpen();
    }, 600);
  }, false);
})();
