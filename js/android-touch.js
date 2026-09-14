/* ================================================================
   ANDROID TOUCH MODULE v15 — Chit Chat
   All KaiOS functions reused — no logic duplication
   ================================================================ */
(function () {
  'use strict';

  /* ════ INIT ════════════════════════════════════════════════ */
  /* ════ AUTH SCREENS: show-password + cross-nav links ════════
     The native code already has fully-working handlers for all of
     this — password visibility toggling (bound to a SoftLeft
     keydown) and page-switching (loginToSignupLabel/signupToLogin
     Label .onclick) — they just live inside .auth-footer, which is
     hidden everywhere in the Android build. Rather than duplicate
     that logic, we add proper Android-native controls (a checkbox
     + text links) that simply trigger the SAME real handlers. ──── */
  function setupAuthScreens() {
    /* Show Password — Login page: toggle just the one field
       directly (no need to simulate a key for a single input). */
    var loginChk = document.getElementById('andLoginShowPassChk');
    var loginPwd = document.getElementById('passwordInputLogin');
    if (loginChk && loginPwd && !loginChk._wired) {
      loginChk._wired = true;
      loginChk.addEventListener('change', function () {
        loginPwd.type = loginChk.checked ? 'text' : 'password';
      });
    }

    /* Show Password — Sign Up page: native's SoftLeft handler
       already toggles BOTH password fields together and keeps
       them in sync — reuse it exactly via key simulation so the
       two fields never end up out of sync with each other. */
    var signupChk = document.getElementById('andSignupShowPassChk');
    if (signupChk && !signupChk._wired) {
      signupChk._wired = true;
      signupChk.addEventListener('change', function () {
        var p1 = document.getElementById('passwordInputSignUp');
        var p2 = document.getElementById('passwordInputSignUp2');
        var showing = signupChk.checked;
        if (p1) p1.type = showing ? 'text' : 'password';
        if (p2) p2.type = showing ? 'text' : 'password';
      });
    }

    /* Cross-navigation links — call the exact same real handlers
       already wired to the (hidden) native footer labels. */
    var goSignup = document.getElementById('andGoSignupLink');
    var nativeToSignup = document.getElementById('loginToSignupLabel');
    if (goSignup && !goSignup._wired) {
      goSignup._wired = true;
      goSignup.addEventListener('click', function () {
        if (nativeToSignup) nativeToSignup.click();
      });
    }

    var goLogin = document.getElementById('andGoLoginLink');
    var nativeToLogin = document.getElementById('signupToLoginLabel');
    if (goLogin && !goLogin._wired) {
      goLogin._wired = true;
      goLogin.addEventListener('click', function () {
        if (nativeToLogin) nativeToLogin.click();
      });
    }

    /* Reset the show-password checkboxes back to unchecked (and
       fields back to type=password) whenever a page becomes
       active again, so a stale "visible" state never carries over
       between separate visits to Login/Sign Up (e.g. after
       logging out and back in). */
    var loginPageEl  = document.getElementById('loginPage');
    var signUpPageEl = document.getElementById('signUpPage');
    [loginPageEl, signUpPageEl].forEach(function (pageEl) {
      if (!pageEl || pageEl._andAuthObs) return;
      pageEl._andAuthObs = true;
      var obs = new MutationObserver(function () {
        if (!pageEl.classList.contains('active')) return;
        if (pageEl === loginPageEl && loginChk) { loginChk.checked = false; if (loginPwd) loginPwd.type = 'password'; }
        if (pageEl === signUpPageEl && signupChk) {
          signupChk.checked = false;
          var p1 = document.getElementById('passwordInputSignUp');
          var p2 = document.getElementById('passwordInputSignUp2');
          if (p1) p1.type = 'password';
          if (p2) p2.type = 'password';
        }
      });
      obs.observe(pageEl, { attributes: true, attributeFilter: ['class'] });
    });
  }

  /* ════ CRITICAL FIX: Android-native confirm dialog ══════════
     The native showConfirmPrompt() was built for KaiOS's physical
     keyboard (Enter/SoftLeft/arrow-key navigation drives it; the
     onclick handlers are a secondary afterthought). Reports of
     "logout does nothing when tapped" and "deleted chats/users
     reappear after reopening the app" both trace back to the SAME
     root cause: showConfirmPrompt() is used to gate BOTH actions
     (logout() and "Delete chat" both call it before doing
     anything), so if its buttons don't reliably register a plain
     touch tap, neither action ever actually runs — the user sees a
     dialog, taps what looks like "OK", and nothing happens, with
     no error to explain why.

     Replacing it with a small, dependency-free, touch-first
     implementation (real DOM buttons, plain 'click' listeners, no
     keyboard trapping, no focus-timing dependency) guarantees both
     of those actions — and every other confirmation in the app that
     already calls window.showConfirmPrompt(message, callback) —
     work correctly on Android. ═══════════════════════════════ */
  function installAndroidConfirmPrompt() {
    window.showConfirmPrompt = function (message, callback) {
      /* Only one at a time */
      var existing = document.getElementById('andConfirmOverlay');
      if (existing) existing.remove();

      var overlay = document.createElement('div');
      overlay.id = 'andConfirmOverlay';
      overlay.innerHTML =
        '<div class="and-confirm-box">' +
          '<div class="and-confirm-msg"></div>' +
          '<div class="and-confirm-actions">' +
            '<button type="button" class="and-confirm-cancel">Cancel</button>' +
            '<button type="button" class="and-confirm-ok">OK</button>' +
          '</div>' +
        '</div>';
      overlay.querySelector('.and-confirm-msg').textContent = message;
      document.body.appendChild(overlay);

      var settled = false;
      function finish(result) {
        if (settled) return;
        settled = true;
        overlay.remove();
        if (typeof callback === 'function') callback(result);
      }

      var okBtn     = overlay.querySelector('.and-confirm-ok');
      var cancelBtn = overlay.querySelector('.and-confirm-cancel');

      /* Bind both click AND touchend so this can never fail to
         register on any Android WebView quirk. stopPropagation
         keeps it from also triggering our own global outside-tap
         handlers. preventDefault on touchend stops a ghost click
         from firing a split second later and double-triggering. */
      function bind(el, result) {
        el.addEventListener('click', function (e) { e.stopPropagation(); finish(result); });
        el.addEventListener('touchend', function (e) { e.stopPropagation(); e.preventDefault(); finish(result); });
      }
      bind(okBtn, true);
      bind(cancelBtn, false);

      /* Tapping the dark backdrop itself cancels, same as most
         Android dialogs. */
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) finish(false);
      });

      return overlay;
    };
  }

  /* Install immediately (not waiting for the ~950ms init delay) so
     it's guaranteed to be in place before the very first possible
     user interaction that could need a confirm dialog. */
  installAndroidConfirmPrompt();

  function init() {
    installAndroidConfirmPrompt(); /* re-assert in case anything reset it */
    forceSoftkeyHidden();
    fixLayout();
    addChatBackButton();
    patchDropdownSheet();
    patchPresencePadding();
    setupTabSwiping();
    setupMsgSwipeReply();
    setupMsgLongPress();
    setupUserLongPress();
    setupRipple();
    fixMainPagePadding();
    wireButtons();
    patchStatusViewer();
    patchAppBarIcons();
    setupVideoClose();        /* FIX #3 */
    setupBlockedBack();       /* FIX #6 */
    patchMsgOptionsOrder();   /* FIX #8: React at top */
    patchEmojiReactionPosition(); /* FIX: react picker overlays above message */
    setupVoiceBar();          /* FIX #9 */
    setupAuthScreens();       /* Login/SignUp: show-password + cross-nav links */
  }

  var _ready = false;
  function onReady() { if (_ready) return; _ready = true; setTimeout(init, 950); }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', onReady)
    : onReady();

  /* ════ 1. FORCE SOFTKEY HIDDEN ════════════════════════════ */
  function forceSoftkeyHidden() {
    var skc = document.getElementById('softKeysContainer');
    if (!skc) return;
    var HIDE = 'display:none!important;height:0!important;overflow:hidden!important;visibility:hidden!important;pointer-events:none!important;';
    skc.setAttribute('style', HIDE);
    skc.classList.remove('active');
    var busy = false;
    var obs = new MutationObserver(function () {
      if (busy) return; busy = true; obs.disconnect();
      skc.setAttribute('style', HIDE); skc.classList.remove('active');
      setTimeout(function () { obs.observe(skc, { attributes: true, attributeFilter: ['style','class'] }); busy = false; }, 0);
    });
    obs.observe(skc, { attributes: true, attributeFilter: ['style','class'] });
  }

  /* ════ 2. LAYOUT FIXES ════════════════════════════════════ */
  function fixLayout() {
    var cp = document.getElementById('chatPage'); if (cp) cp.style.bottom = '0';
    var cb = document.getElementById('chatBox');  if (cb) cb.style.paddingBottom = '110px';
  }

  function fixMainPagePadding() {
    var mp = document.getElementById('mainPage'); if (!mp) return;
    /* FIX: read the REAL --bar-h value from CSS instead of a
       hardcoded, previously-stale '96px' (the tab bar height was
       later increased to 108px in CSS but this JS fallback was
       never updated — harmless as long as CSS !important wins, but
       fixed here for correctness and as a safety net in case the
       CSS rule's specificity ever changes). */
    function currentBarHeight() {
      var v = getComputedStyle(document.documentElement).getPropertyValue('--bar-h').trim();
      return v || '108px';
    }
    var TARGET = currentBarHeight();
    mp.style.paddingTop = TARGET;
    var busy = false;
    var obs = new MutationObserver(function () {
      if (busy) return; busy = true; obs.disconnect();
      if (mp.classList.contains('active') || mp.style.display !== 'none') mp.style.paddingTop = currentBarHeight();
      setTimeout(function () { obs.observe(mp, { attributes: true, attributeFilter: ['style','class'] }); busy = false; }, 0);
    });
    obs.observe(mp, { attributes: true, attributeFilter: ['style','class'] });
  }

  window.androidRestoreMainLayout = function () {
    var mp = document.getElementById('mainPage');
    var barH = (getComputedStyle(document.documentElement).getPropertyValue('--bar-h').trim()) || '108px';
    if (mp) {
      mp.style.setProperty('padding-top', barH, 'important');
      mp.classList.add('active');
      mp.scrollTop = 0;
    }
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
    var lists = [
      'privateChatContent', 'onlineUsersList', 'statusListContainer',
      'privateChatList', 'statusTabContent', 'chatTabContent',
      'privateChatsView', 'onlineUsersView', 'mainPage'
    ];
    function pinTop() {
      for (var i = 0; i < lists.length; i++) {
        var el = document.getElementById(lists[i]);
        if (el) el.scrollTop = 0;
      }
      window.scrollTo(0, 0);
    }
    pinTop();
    setTimeout(pinTop, 50);
    setTimeout(pinTop, 200);
  };

  /* ════ 3. FIX: showOnlineUsersView / showPrivateChatsView
            Always maintain 96px paddingTop for Android tab bar ═══ */
  function patchPresencePadding() {
    function waitAndPatch() {
      if (typeof window.showOnlineUsersView !== 'function') { setTimeout(waitAndPatch, 400); return; }
      var _origOnline  = window.showOnlineUsersView;
      var _origPrivate = window.showPrivateChatsView;

      function enforceBarPadding() {
        var mp = document.getElementById('mainPage');
        if (!mp) return;
        var v = getComputedStyle(document.documentElement).getPropertyValue('--bar-h').trim();
        mp.style.paddingTop = v || '108px';
      }

      window.showOnlineUsersView = function () {
        _origOnline();
        enforceBarPadding();
        var ov = document.getElementById('onlineUsersView');
        if (ov) ov.style.display = 'flex';
        if (typeof window.androidRestoreMainLayout === 'function') window.androidRestoreMainLayout();
      };

      window.showPrivateChatsView = function () {
        _origPrivate();
        enforceBarPadding();
        if (typeof window.androidRestoreMainLayout === 'function') window.androidRestoreMainLayout();
      };
    }
    waitAndPatch();
  }

  /* ════ 4. CHAT BACK BUTTON ════════════════════════════════ */
  function addChatBackButton() {
    var header = document.getElementById('chatHeader');
    if (!header || header.querySelector('.and-back')) return;
    var btn = document.createElement('button');
    btn.className = 'and-back'; btn.title = 'Back';
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>';
    btn.addEventListener('click', function () {
      fireKey('SoftRight');
      if (typeof window.chitShowAppOpenAd === 'function') setTimeout(window.chitShowAppOpenAd, 400);
    });
    header.insertBefore(btn, header.firstChild);
  }

  function fireKey(key) {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
  }

  /* ════ 5. DROPDOWN → ANDROID BOTTOM SHEET ════════════════ */
  var _origShow = null, _origHide = null;

  function patchDropdownSheet() {
    if (typeof window.showDropdown !== 'function') { setTimeout(patchDropdownSheet, 350); return; }
    if (_origShow) return;
    _origShow = window.showDropdown;
    _origHide = window.hideDropdown;

    window.showDropdown = function (options, cb, sel) {
      _origShow(options, cb, sel);
      var dm = document.getElementById('dropdownMenu'); if (!dm) return;
      addHandle(dm);
      dm.style.transform = 'translateY(100%)'; dm.style.transition = 'none';
      showBg(function () { if (typeof window.hideDropdown === 'function') window.hideDropdown(); });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dm.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
          dm.style.transform  = 'translateY(0)';
        });
      });
    };

    window.hideDropdown = function () {
      var dm = document.getElementById('dropdownMenu'); hideBg();
      if (dm && dm.style.display !== 'none') {
        dm.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)';
        dm.style.transform  = 'translateY(100%)';
        setTimeout(function () {
          if (_origHide) _origHide();
          _forceRepaint();
        }, 260);
      } else { if (_origHide) _origHide(); _forceRepaint(); }
    };
  }

  /* Android WebView occasionally leaves the page looking "blurry" for a
     moment after a transform-animated sheet/overlay closes — a stale
     GPU compositing frame that only clears on the next repaint (which
     is why tapping the screen "fixes" it). Nudging a harmless property
     forces that repaint immediately instead of waiting for a tap. */
  function _forceRepaint() {
    try {
      var b = document.body;
      var prevDisplay = b.style.display;
      b.style.display = 'none';
      void b.offsetHeight; // synchronous reflow while detached from the render tree
      b.style.display = prevDisplay || '';
    } catch (e) {}
    try {
      // A tiny scroll nudge mimics the redraw a real touch/scroll triggers —
      // this is what was actually clearing it when the user tapped the screen.
      var sc = document.scrollingElement || document.documentElement;
      var y = sc.scrollTop;
      sc.scrollTop = y + 1;
      requestAnimationFrame(function () { sc.scrollTop = y; });
    } catch (e) {}
  }
  window._forceRepaint = _forceRepaint;

  /* Root-cause fix for issue 4: any transform-animated overlay closing
     can leave the same stale-GPU-frame "blur" behind — not just the
     dropdown/bottom-sheet, but also every .custom-alert confirm dialog
     (showConfirmPrompt/showCustomAlert/showCustomPrompt in auth.js —
     which is exactly what runs for "Delete this message?" and every
     other confirm popup). Rather than patch each closing function one by
     one, watch the body for any of these being removed and force the
     repaint right then — this covers every current and future call site.
     */
  function _watchOverlayRemovals() {
    var SELECTOR = '.custom-alert,#andBottomSheetOverlay,#andSheetOverlay,#andSheetBg,#_authLoader,#andConfirmOverlay,#dropdownMenu';
    var mo = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var removed = mutations[i].removedNodes;
        for (var j = 0; j < removed.length; j++) {
          var n = removed[j];
          if (n.nodeType !== 1) continue;
          if (n.matches && n.matches(SELECTOR)) { _forceRepaint(); return; }
        }
      }
    });
    mo.observe(document.body, { childList: true });
  }
  if (document.body) _watchOverlayRemovals();
  else document.addEventListener('DOMContentLoaded', _watchOverlayRemovals);

  function addHandle(el) {
    if (el.querySelector('.and-handle')) return;
    var h = document.createElement('div'); h.className = 'and-handle'; el.insertBefore(h, el.firstChild);
  }

  var _bgEl = null;
  function showBg(onTap) {
    if (!_bgEl) {
      _bgEl = document.createElement('div'); _bgEl.id = 'andSheetOverlay';
      _bgEl.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.42);z-index:5999;display:none;';
      document.body.appendChild(_bgEl);
    }
    _bgEl.style.display = 'block';
    _bgEl.onclick = function () { hideBg(); if (onTap) onTap(); };
  }
  function hideBg() { if (_bgEl) _bgEl.style.display = 'none'; }

  function injectTitle(text) {
    setTimeout(function () {
      var dm = document.getElementById('dropdownMenu'); if (!dm) return;
      var old = dm.querySelector('.and-sheet-title'); if (old) old.remove();
      if (!text) return;
      var el = document.createElement('div'); el.className = 'and-sheet-title'; el.textContent = text;
      var handle = dm.querySelector('.and-handle');
      if (handle) handle.insertAdjacentElement('afterend', el); else dm.insertBefore(el, dm.firstChild);
    }, 10);
  }

  /* ════ 6. SETTINGS (3-dot) → calls existing showSettingsMenu() ═══ */
  window.androidShowSettings = function (e) {
    if (e) e.stopPropagation();
    patchDropdownSheet();
    injectTitle('Settings');
    function tryShow() {
      if (typeof window.showSettingsMenu === 'function') window.showSettingsMenu();
      else setTimeout(tryShow, 300);
    }
    tryShow();
  };

  /* LOGOUT — uses the existing logout() function from chat.js */
  window.androidSettingsAction = function (action) {
    window.androidCloseAllSheets();
    setTimeout(function () {
      if (action === 'logout') {
        if (typeof window.logout === 'function') {
          if (typeof window.showConfirmPrompt === 'function') {
            window.showConfirmPrompt('Are you sure you want to logout?', function (confirmed) {
              if (confirmed && typeof window.logout === 'function') window.logout();
            });
          } else {
            window.logout();
          }
        }
      } else if (action === 'profile') {
        if (typeof window.openMyProfile === 'function') window.openMyProfile();
      }
    }, 300);
  };

  window.androidCloseAllSheets = function () {
    document.querySelectorAll('.and-bottom-sheet').forEach(function (s) { s.classList.remove('and-sheet-open'); });
    var bg2 = document.getElementById('andSheetBg'); if (bg2) bg2.classList.remove('and-bg-visible');
    hideBg();
    if (typeof window.hideDropdown === 'function') window.hideDropdown();
    var sc = document.getElementById('searchContainer'); if (sc) sc.style.display = 'none';
    setTimeout(_forceRepaint, 340);
  };

  /* ════ 7. TAB SYSTEM ════════════════════════════════════ */
  var TABS = ['chat', 'status', 'groups', 'worldchat', 'online'];
  var currentTabIdx = 0;

  window.androidSwitchTab = function (tab) {
    _applyTab(TABS.indexOf(tab) >= 0 ? TABS.indexOf(tab) : 0);
  };

  /* ── "Coming Soon" placeholder screen (Groups, etc.) ────────── */
  function ensureComingSoonScreen() {
    var el = document.getElementById('andComingSoon');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'andComingSoon';
    el.innerHTML =
      '<div class="ast-cs-icon"></div>' +
      '<div class="ast-cs-title"></div>' +
      '<div class="ast-cs-msg"></div>';
    document.body.appendChild(el);
    return el;
  }

  function showComingSoonScreen(key, icon, title, msg) {
    var el = ensureComingSoonScreen();
    el.querySelector('.ast-cs-icon').textContent = icon;
    el.querySelector('.ast-cs-title').textContent = title;
    el.querySelector('.ast-cs-msg').textContent = msg;
    el.dataset.key = key;
    el.style.display = 'flex';
  }

  function hideComingSoonScreen() {
    var el = document.getElementById('andComingSoon');
    if (el) el.style.display = 'none';
  }

  function _applyTab(idx) {
    currentTabIdx = idx;
    var tab = TABS[idx];

    /* ink indicators */
    var MAP = { chat:'andTabChat', status:'andTabStatus', groups:'andTabGroups', worldchat:'andTabWorld', online:'andTabOnline' };
    Object.values(MAP).forEach(function (id) { var el = document.getElementById(id); if (el) el.classList.remove('and-tab-active'); });
    var act = document.getElementById(MAP[tab]); if (act) act.classList.add('and-tab-active');

    /* hide iframes */
    var gf = document.getElementById('andGroupsFrame'), wf = document.getElementById('andWorldFrame');
    if (gf) gf.style.display = 'none';
    if (wf) wf.style.display = 'none';
    hideComingSoonScreen();

    /* FIX: Properly show/hide chat and status content */
    var chatContent   = document.getElementById('chatTabContent');
    var statusContent = document.getElementById('statusTabContent');

    if (tab === 'chat') {
      if (statusContent) statusContent.style.display = 'none';
      if (chatContent)   chatContent.style.display   = 'block';
      if (typeof window.showPrivateChatsView === 'function') window.showPrivateChatsView();
      if (typeof window.switchMainTab === 'function') window.switchMainTab('chat');
    } else if (tab === 'status') {
      /* FIX: Hide chat list when showing status */
      if (chatContent)   chatContent.style.display   = 'none';
      if (statusContent) statusContent.style.display = 'block';
      if (typeof window.switchMainTab === 'function') window.switchMainTab('status');
    } else if (tab === 'groups') {
      if (chatContent)   chatContent.style.display   = 'none';
      if (statusContent) statusContent.style.display = 'none';
      if (gf) {
        if (!gf.dataset.loaded) { gf.src = 'groups.html'; gf.dataset.loaded = '1'; }
        gf.style.display = 'block';
      }
    } else if (tab === 'worldchat') {
      if (chatContent)   chatContent.style.display   = 'none';
      if (statusContent) statusContent.style.display = 'none';
      if (wf) {
        if (!wf.dataset.loaded) { wf.src = 'world_chat.html'; wf.dataset.loaded = '1'; }
        wf.style.display = 'block';
      }
    } else if (tab === 'online') {
      if (statusContent) statusContent.style.display = 'none';
      if (chatContent)   chatContent.style.display   = 'block';
      if (typeof window.showOnlineUsersView === 'function') window.showOnlineUsersView();
      var ol = document.getElementById('onlineUsersList');
      var hasUsers = ol && ol.querySelectorAll('.online-user-item').length > 0;
      if (!window.__onlineUsersReady && !hasUsers) {
        if (typeof window.showOnlineUsersLoading === 'function') window.showOnlineUsersLoading();
        else if (ol) {
          ol.innerHTML = "<div style='text-align:center;padding:24px 16px;'><span class='loading-spinner' style='display:inline-block;margin-right:8px;vertical-align:middle;border-top-color:#00B4D8;'></span><span style='color:#64748B;font-size:12px;'>Loading online users...</span></div>";
        }
      }
      if (typeof window.loadOnlineUsers === 'function' && !window.__onlineUsersReady) {
        window.loadOnlineUsers();
      }
    }
  }

  /* ════ 8. SEARCH TOGGLE ════════════════════════════════ */
  window.androidToggleSearch = function () {
    var sc = document.getElementById('searchContainer'); if (!sc) return;
    var visible = sc.style.display !== 'none' && sc.style.display !== '';
    if (visible) {
      sc.style.display = 'none';
      var si = document.getElementById('searchInput'); if (si) { si.value = ''; si.blur(); }
    } else {
      sc.style.display = 'block';
      setTimeout(function () { var si = document.getElementById('searchInput'); if (si) si.focus(); }, 80);
    }
  };

  /* ════ 9. MAIN PAGE SWIPE — cycles tabs ════════════════ */
  function setupTabSwiping() {
    var mp = document.getElementById('mainPage'); if (!mp) return;
    var x0 = 0, y0 = 0, t0 = 0;
    mp.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = Date.now(); }, { passive: true });
    mp.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0, dt = Date.now() - t0;
      if (Math.abs(dx) < 55 || Math.abs(dx) < Math.abs(dy) * 1.4 || dt > 450) return;
      _applyTab(dx < 0 ? Math.min(currentTabIdx + 1, TABS.length - 1) : Math.max(currentTabIdx - 1, 0));
    }, { passive: true });
  }

  /* ════ 10. USER LONG-PRESS → FILTERED MENU ════════════
      Filters World Chat, Group Chat, Search, Settings
      Keeps: View Profile, Clear Chat, Block, Mute, Delete         ═══ */
  function setupUserLongPress() {
    var timer = null, lpt = null, moved = false;
    document.addEventListener('touchstart', function (e) {
      var item = e.target.closest('.user.navItem, .online-user-item');
      if (!item) return;
      lpt = item; moved = false;
      timer = setTimeout(function () {
        if (moved || lpt !== item) return;
        if (navigator.vibrate) navigator.vibrate(55);
        showFilteredUserMenu(item);
      }, 520);
    }, { passive: true });
    document.addEventListener('touchmove', function () { moved = true; clearTimeout(timer); }, { passive: true });
    document.addEventListener('touchend', function () { clearTimeout(timer); timer = null; }, { passive: true });
  }

  /* Wrap showDropdown for one call — intercept & filter user menu */
  function showFilteredUserMenu(item) {
    if (!_origShow) { patchDropdownSheet(); }

    item.focus();
    var uidForCleanup = item.dataset ? item.dataset.uid : null;

    /* Install a one-time filter wrapper */
    var _savedShow = window.showDropdown;
    window.showDropdown = function (options, cb, sel) {
      window.showDropdown = _savedShow; // restore immediately

      /* REMOVE: World Chat(0), Group Chat(1), Search(2), Settings(8) */
      var REMOVE = ['World Chat', 'Group Chat', 'Search', 'Settings'];
      var filtered = []; var indexMap = [];
      options.forEach(function (opt, i) {
        if (REMOVE.indexOf(opt) === -1) { indexMap.push(i); filtered.push(opt); }
      });

      var wrappedCb = function (newIdx) {
        var realIdx = indexMap[newIdx];
        var chosen = options[realIdx];
        /* FIX: extra safety net so a deleted/blocked contact can
           never resurface from a stale local cache after the app
           is closed and reopened — clears cachedContacts too,
           regardless of anything the native handler does. */
        if (uidForCleanup && chosen && (chosen === 'Delete' || chosen === 'Block')) {
          purgeCachedContactEntry(uidForCleanup);
        }
        if (cb) cb(realIdx);
      };
      _savedShow(filtered, wrappedCb, sel);

      /* Animate */
      var dm = document.getElementById('dropdownMenu'); if (!dm) return;
      addHandle(dm);
      dm.style.transform = 'translateY(100%)'; dm.style.transition = 'none';
      showBg(function () { if (typeof window.hideDropdown === 'function') window.hideDropdown(); });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dm.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
          dm.style.transform = 'translateY(0)';
        });
      });
    };

    /* Fire SoftLeft to trigger KaiOS _showMenu */
    setTimeout(function () { fireKey('SoftLeft'); }, 30);
  }

  function purgeCachedContactEntry(targetUid) {
    try {
      var cached = JSON.parse(localStorage.getItem('cachedContacts') || '[]');
      cached = cached.filter(function (c) { return !c || c.uid !== targetUid; });
      localStorage.setItem('cachedContacts', JSON.stringify(cached));
    } catch (e) {}
  }

  /* ════ 11. + BUTTON: MEDIA MENU (chat) / SEARCH (main page via FAB) ════ */
  window.androidAttach = function () {
    /* Always open the media attachment menu from chat */
    patchDropdownSheet();
    injectTitle('Attach');

    var opts = ['\uD83D\uDE0A  Emoji', '\uD83D\uDCF7  Photo', '\uD83C\uDFA5  Video', '\uD83C\uDFB5  Music', '\uD83C\uDFA4  Voice Note'];

    if (_origShow) {
      _origShow(opts, function (index) {
        var hide = function () { if (typeof window.hideDropdown === 'function') window.hideDropdown(); };
        if (index === 0) { hide(); setTimeout(function () { if (typeof openEmojiPicker === 'function') openEmojiPicker(); }, 50); }
        else if (index === 1) { hide(); if (typeof sendImageDirect === 'function') sendImageDirect(); }
        else if (index === 2) { hide(); if (typeof sendVideoDirect === 'function') sendVideoDirect(); }
        else if (index === 3) { hide(); if (typeof sendMusicFile === 'function') sendMusicFile(); }
        else if (index === 4) { hide(); if (typeof startRecording === 'function') startRecording(); }
      });
      var dm = document.getElementById('dropdownMenu'); if (!dm) return;
      addHandle(dm);
      dm.style.transform = 'translateY(100%)'; dm.style.transition = 'none';
      showBg(function () { if (typeof window.hideDropdown === 'function') window.hideDropdown(); });
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          dm.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.2,1)';
          dm.style.transform = 'translateY(0)';
        });
      });
    }
  };

  /* ════ 12. SEND BUTTON ════════════════════════════════ */
  window.androidSend = function () {
    var inp = document.getElementById('messageInput'); if (!inp) return;
    if (inp._editingMsgId) {
      var newText = inp.value.trim();
      if (newText && typeof saveEditedMessage === 'function') saveEditedMessage(inp._editingMsgId, newText);
      else if (typeof cancelEditMode === 'function') cancelEditMode();
      return;
    }
    var msg = inp.value.trim();
    if (!msg) return;
    if (typeof sendMessage === 'function') {
      sendMessage(msg, 'text', window.replyingToMessageId);
      inp.value = '';
      inp.style.height = 'auto';
      try {
        if (window.replyInputPreview) {
          window.replyInputPreview.classList.remove('visible');
          window.replyInputPreview.style.display = '';
          window.replyInputPreview.innerHTML = '';
        }
      } catch (e) {}
      window.replyingToMessageId = null;
    } else {
      inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    }
  };

  function wireButtons() {
    var sendBtn   = document.getElementById('andSendBtn');
    var attachBtn = document.getElementById('andAttachBtn');
    if (sendBtn   && !sendBtn._wired)   { sendBtn.addEventListener('click',   window.androidSend);   sendBtn._wired   = true; }
    if (attachBtn && !attachBtn._wired) { attachBtn.addEventListener('click', window.androidAttach); attachBtn._wired = true; }
    var ta = document.getElementById('messageInput');
    if (ta && !ta._autoGrow) {
      ta.addEventListener('input', function () { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 90) + 'px'; });
      ta._autoGrow = true;
    }

    /* ── FIX #9: Robust presence + chat-list resync keep-alive.
       (A duplicate, less-complete keep-alive block used to live here
       too — running two separate visibilitychange handlers caused
       race conditions between them, which is part of why the app
       could still end up stuck on "Connection lost… reconnecting"
       after being minimized. Only one keep-alive system now runs.) ── */
    startPresenceKeepAlive();

    /* ── FIX #2: Visual Viewport resize for keyboard ── */
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', function () {
        var cp = document.getElementById('chatPage');
        if (!cp || !cp.classList.contains('active')) return;
        cp.style.height = window.visualViewport.height + 'px';
        var cb = document.getElementById('chatBox');
        if (cb) setTimeout(function () { cb.scrollTop = cb.scrollHeight; }, 80);
      });
    }
  }

  /* ════ 13. MESSAGE SWIPE → REPLY ══════════════════════ */
  function setupMsgSwipeReply() {
    var cb = document.getElementById('chatBox'); if (!cb) return;
    var x0 = 0, y0 = 0, aCont = null, swiping = false, MAX = 80;
    cb.addEventListener('touchstart', function (e) {
      var cont = e.target.closest('.message-container'); if (!cont) { aCont = null; return; }
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; aCont = cont; swiping = false;
    }, { passive: true });
    cb.addEventListener('touchmove', function (e) {
      if (!aCont) return;
      var dx = e.touches[0].clientX - x0, dy = e.touches[0].clientY - y0;
      if (!swiping && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) swiping = true;
      if (!swiping || dx <= 0) return;
      var prog = Math.min(dx, MAX);
      aCont.style.transform = 'translateX(' + prog + 'px)'; aCont.style.transition = 'none';
      var ico = getReplyIco(aCont), opa = Math.min(prog / MAX, 1);
      ico.style.opacity = opa; ico.style.transform = 'translateY(-50%) scale(' + (0.5 + opa * 0.5) + ')';
    }, { passive: true });
    cb.addEventListener('touchend', function (e) {
      if (!aCont || !swiping) { aCont = null; swiping = false; return; }
      var dx = e.changedTouches[0].clientX - x0;
      aCont.style.transition = 'transform 0.25s cubic-bezier(0.4,0,0.2,1)'; aCont.style.transform = 'translateX(0)';
      var ico = aCont.querySelector('.and-reply-ico');
      if (ico) { ico.style.opacity = '0'; ico.style.transform = 'translateY(-50%) scale(0.5)'; }
      if (dx > 60) {
        /* FIX #8: direct reply — NO option menu */
        var bubble = aCont.querySelector('.message');
        if (bubble) {
          var msgId = (bubble.id || '').replace('msg-', '');
          if (msgId) { if (navigator.vibrate) navigator.vibrate(40); directReply(msgId, aCont); }
        }
      }
      aCont = null; swiping = false;
    }, { passive: true });
  }

  function directReply(msgId, cont) {
    window.replyingToMessageId = msgId;
    var preview = document.getElementById('replyInputPreview'); if (!preview) return;
    var textEl = cont ? cont.querySelector('.message-text') : null;
    var snippet = textEl ? textEl.textContent.trim().substring(0, 38) : 'Message';
    var isSent = cont && !!cont.querySelector('.sent');
    var sender = isSent ? 'You' : ((document.getElementById('chatHeaderName') || {}).textContent || 'User');
    preview.innerHTML =
      '<div style="display:flex;align-items:center;padding:6px 10px;width:100%;box-sizing:border-box;">' +
      '<div style="width:3px;min-height:30px;background:var(--purple);border-radius:2px;margin-right:10px;flex-shrink:0;"></div>' +
      '<div style="flex:1;overflow:hidden;">' +
      '<div style="font-size:11px;color:#90E0EF;font-weight:700;">' + sender + '</div>' +
      '<div style="font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">↩ ' + snippet + '</div>' +
      '</div>' +
      '<button onclick="if(window.cancelReplyPreview)window.cancelReplyPreview();window.replyingToMessageId=null;var p=document.getElementById(\'replyInputPreview\');if(p)p.classList.remove(\'visible\');" style="background:transparent;border:none;color:rgba(255,255,255,0.75);font-size:18px;padding:4px 8px;cursor:pointer;box-shadow:none;border-radius:50%;width:auto;margin:0;">✕</button>' +
      '</div>';
    preview.classList.add('visible');
    var inp = document.getElementById('messageInput'); if (inp) inp.focus();
  }

  function getReplyIco(cont) {
    var ico = cont.querySelector('.and-reply-ico');
    if (!ico) { ico = document.createElement('div'); ico.className = 'and-reply-ico'; ico.innerHTML = '↩'; cont.appendChild(ico); }
    return ico;
  }

  /* ════ 14. MESSAGE LONG-PRESS → KaiOS OPTIONS ════════ */
  function setupMsgLongPress() {
    var cb = document.getElementById('chatBox'); if (!cb) return;
    var timer = null, lpm = null, touchMoved = false;
    cb.addEventListener('touchstart', function (e) {
      var bubble = e.target.closest('.message'); if (!bubble) return;
      lpm = bubble; touchMoved = false;
      timer = setTimeout(function () {
        if (touchMoved || lpm !== bubble) return;
        if (navigator.vibrate) navigator.vibrate(60);
        bubble.focus(); setTimeout(function () { fireKey('SoftRight'); }, 30);
      }, 520);
    }, { passive: true });
    cb.addEventListener('touchmove', function () { touchMoved = true; clearTimeout(timer); }, { passive: true });
    cb.addEventListener('touchend', function () { clearTimeout(timer); timer = null; }, { passive: true });
  }

  /* ════ 15. RIPPLE ════════════════════════════════════ */
  function setupRipple() {
    document.addEventListener('touchstart', function (e) {
      var el = e.target.closest('.user.navItem,.online-user-item,.dropdown-item,.and-sheet-item,.and-tab,#loginButtonVisible,#signUpButtonVisible,#signUpNavButton,#loginNavButton');
      if (!el) return; rippleOn(el, e.touches[0]);
    }, { passive: true });
  }
  function rippleOn(el, touch) {
    var rect = el.getBoundingClientRect(), size = Math.max(rect.width, rect.height) * 2;
    var sp = document.createElement('span');
    sp.style.cssText = 'position:absolute;border-radius:50%;background:rgba(0,0,0,0.10);width:'+size+'px;height:'+size+'px;left:'+(touch.clientX-rect.left-size/2)+'px;top:'+(touch.clientY-rect.top-size/2)+'px;animation:andRipple 0.55s ease-out forwards;pointer-events:none;z-index:0;';
    if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
    el.style.overflow = 'hidden'; el.appendChild(sp); setTimeout(function () { sp.remove(); }, 600);
  }

  /* FAB removed */

  /* ════ FIX #8: React at TOP of message options ═══════════ */
  /* ════ FIX: Reaction emoji picker positioning ══════════════
     The native showEmojiContainer() decides "above vs below the
     message" using a threshold tuned for KaiOS's tiny/header-less
     screen (msgRect.top - 58, flipping to "below" if that's < 50px
     from the top). Our Android chat header is taller (~60px) than
     that assumption accounts for, so messages near the top of the
     visible chat area were always flipping to "below" — exactly
     the opposite of the intended "overlay above the message so you
     can react" behaviour. We recompute the position immediately
     after native code runs, using the REAL header height so it
     reliably opens above the message whenever there's genuinely
     enough room, and only falls back to below when there truly
     isn't. ════════════════════════════════════════════════════ */
  function patchEmojiReactionPosition() {
    if (typeof window.showEmojiContainer !== 'function') {
      setTimeout(patchEmojiReactionPosition, 500); return;
    }
    if (window._andEmojiPosPatched) return;
    window._andEmojiPosPatched = true;

    var _origShowEmoji = window.showEmojiContainer;
    window.showEmojiContainer = function (messageContainer) {
      _origShowEmoji(messageContainer);
      requestAnimationFrame(function () { fixEmojiPickerPosition(messageContainer); });
    };
  }

  function fixEmojiPickerPosition(messageContainer) {
    if (!messageContainer) return;
    var picker = messageContainer.querySelector('.emoji-container');
    if (!picker || picker.style.display === 'none') return;

    var header = document.getElementById('chatHeader');
    var headerH = header ? header.getBoundingClientRect().height : 60;
    var clearance = headerH + 12; /* keep the picker fully below the header */

    var msgRect = messageContainer.getBoundingClientRect();
    var pickerH = picker.offsetHeight || 52;
    var eWidth  = picker.offsetWidth || 220;

    var topPos = msgRect.top - pickerH - 12; /* prefer directly above the message */
    if (topPos < clearance) {
      /* Not enough room above — place below the message instead */
      topPos = msgRect.bottom + 8;
    }

    var centerX = msgRect.left + msgRect.width / 2;
    var leftPos = Math.max(4, Math.min(centerX - eWidth / 2, window.innerWidth - eWidth - 4));

    picker.style.position  = 'fixed';
    picker.style.left      = leftPos + 'px';
    picker.style.top       = topPos + 'px';
    picker.style.bottom    = 'auto';
    picker.style.transform = 'none';
  }

  function patchMsgOptionsOrder() {
    /* Intercept showDropdown for message options — put React first */
    if (!_origShow) { setTimeout(patchMsgOptionsOrder, 500); return; }
    var _savedForMsg = window.showDropdown;
    window.showDropdown = function (opts, cb, sel) {
      /* Detect msg options: contains 'Reply' and 'Copy' or 'Delete for Me' */
      var isMsgMenu = opts && (opts.indexOf('Reply') >= 0 || opts.some(function (o) { return o && o.includes('Reply'); }));
      if (isMsgMenu) {
        var reactIdx = opts.findIndex ? opts.findIndex(function (o) { return o && (o === 'React' || o.includes('React')); }) :
          (function () { for (var i = 0; i < opts.length; i++) if (opts[i] && opts[i].includes('React')) return i; return -1; })();
        if (reactIdx > 0) {
          var reordered = [opts[reactIdx]].concat(opts.slice(0, reactIdx)).concat(opts.slice(reactIdx + 1));
          var _origCb = cb;
          cb = function (newIdx) {
            if (newIdx === 0) { _origCb(reactIdx); }
            else if (newIdx <= reactIdx) { _origCb(newIdx - 1); }
            else { _origCb(newIdx); }
          };
          opts = reordered;
        }
      }
      _savedForMsg(opts, cb, sel);
    };
  }

  /* ════ FIX #3: Video close button ════════════════════════ */
  function setupVideoClose() {
    window.androidCloseVideo = function () {
      var vfp = document.getElementById('videoFullscreenPlayer');
      var vid = document.getElementById('fullscreenVideo');
      if (vid) { vid.pause(); vid.src = ''; }
      if (vfp) vfp.style.display = 'none';
      if (typeof window.closeFullScreen === 'function') window.closeFullScreen();
    };

    /* Back button closes video */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'SoftRight' || e.key === 'Backspace' || e.key === 'GoBack') {
        var vfp = document.getElementById('videoFullscreenPlayer');
        if (vfp && (vfp.style.display === 'flex' || vfp.style.display === 'block')) {
          e.preventDefault(); window.androidCloseVideo(); return;
        }
      }
    });
  }

  /* ════ FIX #6: Blocked users back ════════════════════════ */
  function setupBlockedBack() {
    window.androidCloseBlocked = function () {
      var p = document.getElementById('blockedUsersPage');
      if (p) p.style.display = 'none';
      var mp = document.getElementById('mainPage');
      if (mp) mp.classList.add('active');
      fireKey('SoftRight');
    };
    /* Inject back btn if not already in DOM */
    setTimeout(function () {
      var hdr = document.getElementById('blockedUsersHeader');
      if (!hdr) return;
      if (!document.getElementById('andBlockedBack')) {
        var btn = document.createElement('button');
        btn.id = 'andBlockedBack'; btn.innerHTML = '&#8592;';
        btn.addEventListener('click', window.androidCloseBlocked);
        hdr.insertBefore(btn, hdr.firstChild);
      }
    }, 1200);
  }

  /* ════════════════════════════════════════════════════════
     FIX #4 (chat voice note): Android-style recording flow
     ------------------------------------------------------------
     #andVoiceBar is a SIBLING of #messageInputContainer (see
     index.html) so it stays visible even though the native
     startRecording()/stopRecording() functions hide
     messageInputContainer while recording is active.

     Two states, both driving the exact same native voice
     pipeline — we never re-implement recording/upload logic,
     we only call the real functions directly:

       STATE 1 "recording": our own timer + a big 🛑 Stop button.
         Tapping Stop calls the real window.stopRecording().

       STATE 2 "preview": once native stopRecording() finishes
         (async, inside mediaRecorder.onstop) it sets
         chatPage._voiceMode = true and defines
         _voicePlay / _voiceSend / _voiceDelete. We poll briefly
         for that flag, then show Play / Delete / Send buttons
         wired directly to those three real callbacks.
     ════════════════════════════════════════════════════════ */
  function setupVoiceBar() {
    var bar        = document.getElementById('andVoiceBar');
    var recRow     = document.getElementById('andVoiceRecordingRow');
    var prevRow    = document.getElementById('andVoicePreviewRow');
    var timerEl    = document.getElementById('andVoiceTimerText');
    var stopBtn    = document.getElementById('andVoiceStopBtn');
    var delBtn     = document.getElementById('andVoiceDel');
    var playBtn    = document.getElementById('andVoicePlay');
    var sendBtn    = document.getElementById('andVoiceSend');
    var labelEl    = document.getElementById('andVoicePreviewLabel');
    if (!bar || !stopBtn) return;

    var _seconds = 0, _timerInterval = null, _pollTimer = null, _isPlaying = false;

    function resetBar() {
      bar.classList.remove('visible');
      if (recRow)  recRow.style.display  = 'flex';
      if (prevRow) prevRow.style.display = 'none';
      clearInterval(_timerInterval); _timerInterval = null;
      clearInterval(_pollTimer); _pollTimer = null;
      _seconds = 0; _isPlaying = false;
      if (timerEl) timerEl.textContent = '0:00';
      if (playBtn) playBtn.textContent = '\u25B6\uFE0F';
      if (labelEl) labelEl.textContent = 'Voice message';
    }

    /* ── STATE 1: show recording UI + our own live timer ── */
    function showRecordingState() {
      bar.classList.add('visible');
      if (recRow)  recRow.style.display  = 'flex';
      if (prevRow) prevRow.style.display = 'none';
      _seconds = 0;
      if (timerEl) timerEl.textContent = '0:00';
      clearInterval(_timerInterval);
      _timerInterval = setInterval(function () {
        _seconds++;
        var m = Math.floor(_seconds / 60), s = _seconds % 60;
        if (timerEl) timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
      }, 1000);
    }

    /* ── STATE 2: switch to Play / Delete / Send row ── */
    function showPreviewState() {
      clearInterval(_timerInterval); _timerInterval = null;
      if (recRow)  recRow.style.display  = 'none';
      if (prevRow) prevRow.style.display = 'flex';
      var m = Math.floor(_seconds / 60), s = _seconds % 60;
      if (labelEl) labelEl.textContent = 'Voice message · ' + m + ':' + (s < 10 ? '0' : '') + s;
    }

    /* After calling the real stopRecording(), the native code
       finishes asynchronously inside mediaRecorder.onstop and
       only THEN sets chatPage._voiceMode = true. Poll briefly
       for that so we know when to reveal the preview row. */
    function waitForVoiceModeThenShowPreview() {
      var cp = document.getElementById('chatPage');
      var attempts = 0;
      clearInterval(_pollTimer);
      _pollTimer = setInterval(function () {
        attempts++;
        if (cp && cp._voiceMode) {
          clearInterval(_pollTimer); _pollTimer = null;
          showPreviewState();
        } else if (attempts > 40) { /* ~8s safety timeout */
          clearInterval(_pollTimer); _pollTimer = null;
          resetBar();
        }
      }, 200);
    }

    /* ── Wrap the real startRecording/stopRecording so our UI
           reacts to them, without touching their internals ── */
    function waitForRecordingFns() {
      if (typeof window.startRecording !== 'function' || typeof window.stopRecording !== 'function') {
        setTimeout(waitForRecordingFns, 500); return;
      }
      if (window._andVoiceWrapped) return;
      window._andVoiceWrapped = true;

      var _origStart = window.startRecording;
      var _origStop  = window.stopRecording;

      window.startRecording = function () {
        _origStart();
        showRecordingState();
      };
      window.stopRecording = function () {
        _origStop();
        waitForVoiceModeThenShowPreview();
      };
    }
    waitForRecordingFns();

    /* ── Button wiring — direct calls into the real per-recording
           callbacks the native stopRecording() defined ── */
    stopBtn.addEventListener('click', function () {
      if (typeof window.stopRecording === 'function') window.stopRecording();
    });

    delBtn && delBtn.addEventListener('click', function () {
      var cp = document.getElementById('chatPage');
      if (cp && typeof cp._voiceDelete === 'function') cp._voiceDelete();
      resetBar();
    });

    sendBtn && sendBtn.addEventListener('click', function () {
      var cp = document.getElementById('chatPage');
      if (cp && typeof cp._voiceSend === 'function') cp._voiceSend();
      resetBar();
    });

    playBtn && playBtn.addEventListener('click', function () {
      var cp = document.getElementById('chatPage');
      if (!cp || typeof cp._voicePlay !== 'function') return;
      cp._voicePlay();
      _isPlaying = !_isPlaying;
      playBtn.textContent = _isPlaying ? '\u23F8\uFE0F' : '\u25B6\uFE0F';
    });
  }

  function patchAppBarIcons() {
    var sb = document.getElementById('andSearchBtn');
    var db2 = document.getElementById('andDotsBtn');
    if (sb) { sb.innerHTML = '🔍'; sb.style.fontSize = '20px'; }
    if (db2) { db2.innerHTML = '⋮'; db2.style.fontSize = '26px'; db2.style.fontWeight = '700'; }
  }

  /* ════ FIX #2 + #3 + #4: Status viewer patches ══════════ */
  function patchStatusViewer() {
    /* Wait for showStatusView to be available */
    function waitAndPatch() {
      if (typeof window.showStatusView !== 'function' && typeof window.displayCurrentStatus !== 'function') {
        setTimeout(waitAndPatch, 500); return;
      }
      injectStatusProgressUI();
      patchStatusHeart();
      /* addStatusNextButton() removed — the "+ Add Another Status"
         button is no longer wanted inside the fullscreen viewer
         (per explicit request). CSS also force-hides #and-status-
         next-btn as a belt-and-braces guard. */
    }
    setTimeout(waitAndPatch, 1200);
  }

  /* FIX #2: Inject progress bars + tap zones into statusViewContainer */
  function injectStatusProgressUI() {
    var svc = document.getElementById('statusViewContainer');
    if (!svc || svc._andPatched) return;
    svc._andPatched = true;

    /* Progress bar row */
    var prog = document.createElement('div');
    prog.id = 'and-status-progress';
    svc.appendChild(prog);

    /* Tap zones */
    var prev = document.createElement('div');
    prev.id = 'and-status-tap-prev';
    prev.addEventListener('click', function () { andStatusNav(-1); });
    svc.appendChild(prev);

    var next = document.createElement('div');
    next.id = 'and-status-tap-next';
    next.addEventListener('click', function () { andStatusNav(1); });
    svc.appendChild(next);

    /* Patch displayCurrentStatus to update bars */
    if (typeof window.displayCurrentStatus === 'function') {
      var _orig = window.displayCurrentStatus;
      window.displayCurrentStatus = function () {
        _orig.apply(this, arguments);
        setTimeout(updateStatusProgress, 80);
      };
    }
  }

  function updateStatusProgress() {
    var prog = document.getElementById('and-status-progress');
    if (!prog) return;
    var total = (window.userStatusArray || []).length;
    var cur   = window.currentStatusIndex || 0;
    if (total === 0) { prog.innerHTML = ''; return; }

    var dur = 5; /* seconds — adjust if status has duration */
    var cur_status = (window.userStatusArray || [])[cur];
    if (cur_status && cur_status.duration) dur = Math.ceil(cur_status.duration / 1000);

    prog.innerHTML = '';
    for (var i = 0; i < total; i++) {
      var seg = document.createElement('div');
      seg.className = 'and-status-seg' + (i < cur ? ' done' : i === cur ? ' active' : '');
      var fill = document.createElement('div');
      fill.className = 'and-status-seg-fill';
      if (i === cur) fill.style.setProperty('--dur', dur + 's');
      seg.appendChild(fill);
      prog.appendChild(seg);
    }
  }

  function andStatusNav(dir) {
    var arr = window.userStatusArray || [];
    var idx = (window.currentStatusIndex || 0) + dir;
    if (idx < 0) { if (typeof window.hideStatusView === 'function') window.hideStatusView(); return; }
    if (idx >= arr.length) {
      if (typeof window.hideStatusView === 'function') window.hideStatusView();
      return;
    }
    window.currentStatusIndex = idx;
    if (typeof window.displayCurrentStatus === 'function') window.displayCurrentStatus();
    updateStatusProgress();
    /* Update softkey labels */
    var sr = document.getElementById('softkey-right');
    if (sr) sr.innerHTML = idx < arr.length - 1 ? 'Next' : '';
  }

  /* FIX #3: Heart toggle with realtime Firebase */
  function patchStatusHeart() {
    var btn = document.getElementById('statusLikeBtn');
    var svg = document.getElementById('likeIconSvg');
    if (!btn) return;

    function setHeart(liked) {
      if (svg) {
        svg.setAttribute('data-liked', liked ? 'true' : 'false');
        svg.style.fill = liked ? '#EF4444' : '#22C55E';
      }
      btn.title = liked ? 'Unlike' : 'Like';
    }

    /* Re-wire onclick to use proper toggle + realtime */
    btn.onclick = function () {
      var statusUid = window.currentStatusViewUid;
      var arr = window.userStatusArray || [];
      var cur = window.currentStatusIndex || 0;
      if (!statusUid || !arr[cur] || !window.uid || !window.db) return;
      var ts = arr[cur].timestamp;
      var likeRef = window.db.ref('statusLikes/' + statusUid + '/' + ts + '/' + window.uid);
      var currentlyLiked = svg && svg.getAttribute('data-liked') === 'true';
      if (currentlyLiked) {
        likeRef.remove();
        setHeart(false);
      } else {
        likeRef.set(Date.now());
        setHeart(true);
      }
      /* Animate */
      btn.style.transform = 'scale(1.3)';
      setTimeout(function () { btn.style.transform = 'scale(1)'; }, 200);
    };

    /* Listen for like state changes whenever status is displayed */
    var _origDisplayStatus = window.displayCurrentStatus;
    if (typeof _origDisplayStatus === 'function' && !window._andStatusHeartPatched) {
      window._andStatusHeartPatched = true;
      window.displayCurrentStatus = function () {
        _origDisplayStatus.apply(this, arguments);
        /* Load heart state for current status */
        setTimeout(function () {
          var statusUid = window.currentStatusViewUid;
          var arr2 = window.userStatusArray || [];
          var cur2 = window.currentStatusIndex || 0;
          if (!statusUid || !arr2[cur2] || !window.uid || !window.db) return;
          if (statusUid === window.uid) return; /* own status — no heart */
          var ts2 = arr2[cur2].timestamp;
          window.db.ref('statusLikes/' + statusUid + '/' + ts2 + '/' + window.uid)
            .once('value', function (snap) { setHeart(snap.exists()); });
        }, 100);
      };
    }
  }

  /* FIX #4: "Add Next Status" button below delete button */
  function addStatusNextButton() {
    var footer = document.getElementById('statusFooter') || document.querySelector('.status-footer');
    if (!footer || footer._andNextBtn) return;
    footer._andNextBtn = true;
    var btn = document.createElement('button');
    btn.id = 'and-status-next-btn';
    btn.textContent = '+ Add Another Status';
    btn.addEventListener('click', function () {
      if (typeof window.showStatusTypeSelection === 'function') window.showStatusTypeSelection();
      else if (typeof window.showStatusAdd === 'function') window.showStatusAdd();
    });
    footer.appendChild(btn);
    /* Show only for own status */
    var _origShow = window.showStatusView;
    if (typeof _origShow === 'function' && !window._andNextBtnPatched) {
      window._andNextBtnPatched = true;
      window.showStatusView = function (statusUid) {
        _origShow(statusUid);
        btn.style.display = (statusUid === window.uid) ? 'block' : 'none';
      };
    }
  }

  /* ════ FIX #7: Tab swipe — correct bidirectional cycling ═ */
  /* (already correct in setupTabSwiping — left=forward, right=back) */

  /* ════ FIX #9: ROBUST Firebase presence keep-alive ══════ */
  function startPresenceKeepAlive() {
    var _kaTimer = null;

    function reEstablish() {
      try {
        if (!window.db || !window.uid) return;
        window.db.goOnline();
        window.db.ref('presence1/' + window.uid).update({
          online: true,
          lastHeartbeat: Date.now(),
          username: window.username || undefined
        });
      } catch (e) {}
    }

    /* ── FIX (background sync): force an IMMEDIATE, explicit refresh
       of the chat list on every foreground return. Firebase's own
       .on("child_added"/"child_changed") listeners on privateChats/
       {uid} SHOULD auto-resume once the socket reconnects, but many
       Android WebViews aggressively suspend JS timers/sockets while
       backgrounded, and Firebase's own reconnect/backoff can lag
       behind the moment the user actually sees the app again.
       fetchFromFirebaseAndSync() already re-attaches the child
       listeners internally as its final step, so it alone is
       enough — calling attachPrivateChatListeners() separately
       (as an earlier version of this fix did) re-attached the
       Firebase listener TWICE per resume. A fresh ".on(child_added)"
       attachment replays that event for every EXISTING conversation
       (that's how Firebase listeners work, not just genuinely new
       ones), so doing it twice — and doing it on every single
       minimize/reopen cycle — was the source of already-read
       messages seeming to "re-notify" repeatedly. A short throttle
       below keeps rapid foreground/background flapping from
       re-triggering this more than once every few seconds. ────── */
    var _lastResync = 0;
    function forceChatListResync() {
      var now = Date.now();
      if (now - _lastResync < 4000) return; /* throttle: max once / 4s */
      _lastResync = now;
      try {
        if (typeof window.fetchFromFirebaseAndSync === 'function') {
          window.fetchFromFirebaseAndSync();
        }
      } catch (e) {}
    }

    function startKA() {
      clearInterval(_kaTimer);
      _kaTimer = setInterval(function () {
        try {
          if (!window.db || !window.uid) return;
          window.db.ref('presence1/' + window.uid).update({ lastHeartbeat: Date.now(), online: true });
        } catch (e) {}
      }, 20000);
    }

    /* When app returns to foreground. visibilitychange AND focus both
       fire for the same foreground event, and 'online' may too — so they
       all funnel into ONE debounced foreground handler instead of each
       triggering their own reEstablish + full chat-list resync. That
       duplication used to cause repeated "syncing" passes and repeated
       privateChats re-fetches on every single minimize/reopen. */
    var _fgTimer = null;
    function _onForeground() {
      clearTimeout(_fgTimer);
      window.__skipSyncBanner = true;
      _fgTimer = setTimeout(function () {
        reEstablish();
        try {
          if (typeof window.processOutgoingQueue === 'function') window.processOutgoingQueue(true);
        } catch (e) {}
        try {
          if (window._inboxListeners) {
            Object.keys(window._inboxListeners).forEach(function (pid) {
              try { window._inboxListeners[pid].off(); } catch (e) {}
              delete window._inboxListeners[pid];
              if (typeof attachInboxListener === 'function') attachInboxListener(pid);
            });
          }
        } catch (e) {}
        if (typeof window.attachLiveListenersForCurrentChat === 'function') {
          window.attachLiveListenersForCurrentChat();
        }
        /* The rest of this used to live in a THIRD, separate resume
           system in js/config.js (a KaiOS-era "resync safety net" that
           also, worse, force-cycled db.goOffline()/goOnline() on every
           resume — the actual cause of the "Connection lost…
           Reconnecting…" flow the person kept seeing even though it
           looked "fixed" in code that only touched this file). Folded
           in here so there's exactly one resume system, and the
           connection itself is never deliberately dropped.
           NOTE: setupConnectionStatus() deliberately NOT called here —
           it unconditionally resets the banner text to "Connecting..."
           the instant it runs, so calling it on every single resume was
           forcing that banner to show even when Firebase had stayed
           genuinely connected the whole time. The .info/connected
           listener it sets up stays attached for the lifetime of the
           page on its own; it doesn't need to be re-armed on resume,
           and the banner should only ever reflect a REAL state change,
           which the existing listener already reports correctly. */
        try {
          if (window.__onlineUsersLoaded && !window.__onlineUsersReady && typeof window.loadOnlineUsers === 'function') window.loadOnlineUsers();
        } catch (e) {}
        try {
          /* Catch missed messages/unread on the chat LIST after returning
             (skip when a conversation is already open in front of it). */
          var cp = document.getElementById('chatPage');
          var inOpenChat = cp && cp.classList.contains('active');
          if (!inOpenChat) forceChatListResync();
        } catch (e) {}
        startKA();
      }, 250);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden || document.visibilityState === 'hidden') return;
      window.__skipSyncBanner = true;
      _onForeground();
    });

    /* Network reconnect */
    window.addEventListener('online', function () {
      _onForeground();
    });

    /* Page focus (when user switches back) */
    window.addEventListener('focus', function () {
      _onForeground();
    });

    /* Start keep-alive immediately */
    startKA();

    /* Re-establish on init (handles page reload) */
    setTimeout(reEstablish, 1500);
  }

  /* ════ GLOBAL: outside tap closes everything ═════════ */
  document.addEventListener('touchstart', function (e) {
    var sc = document.getElementById('searchContainer');
    if (sc && sc.style.display !== 'none') {
      var sb = document.getElementById('andSearchBtn'), fab = document.getElementById('androidFab');
      if (!sc.contains(e.target) && e.target !== sb && e.target !== fab &&
          !(sb && sb.contains(e.target)) && !(fab && fab.contains(e.target))) {
        sc.style.display = 'none';
        var si = document.getElementById('searchInput'); if (si) { si.value = ''; si.blur(); }
      }
    }

    /* FIX #8: the search RESULTS dropdown (.search-results) is a
       separate element from #searchContainer and wasn't covered by
       the check above — it stayed open even after tapping elsewhere
       on the page (e.g. a chat row underneath it). Hide it whenever
       the tap lands outside both the results list and the search
       input itself. */
    var sr = document.getElementById('searchResults');
    if (sr && sr.style.display !== 'none' && sr.innerHTML.trim() !== '') {
      var si2 = document.getElementById('searchInput');
      if (!sr.contains(e.target) && e.target !== si2 && !(si2 && si2.contains(e.target))) {
        sr.style.display = 'none';
        sr.innerHTML = '';
      }
    }
  }, { passive: true });

})(); // ← end of IIFE
