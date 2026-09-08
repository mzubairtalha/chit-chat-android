/* ================================================================
   CHIT CHAT — Android Status Skin v3
   ----------------------------------------------------------------
   Principles kept from v2 (still true here):
   - No duplicate Firebase WRITE logic. All status creation/deletion
     ultimately calls the real native functions (saveStatus() via
     showTextStatusInput()/selectStatusMedia(), and a self-contained
     delete routine below that talks to the SAME schema as native
     deleteStatus() — single object OR {type:"multiple",statuses:[]}).
   - Reading uses the correct schema every time: a status snapshot is
     EITHER one object {type,content,timestamp,expiresAt} OR
     {type:"multiple", statuses:[...]}. Never iterate a single-status
     object's fields with forEach() — that produces fake entries with
     no real timestamp ("Invalid Date").
   - Real helper functions are reused wherever they exist:
     formatStatusTime() (chat.js), showStatusView()/displayCurrentStatus()
     (ui.js, already skinned by android-touch.js's progress-bar patch).

   New in v3 (this pass):
   1. Add-Status navigation: visible back/cancel button, hardware
      back button support (popstate), and "pick one type → hide the
      other three, show a back arrow to return" behaviour.
   2. A brand-new WhatsApp-style "My Status" list screen
      (#andMyStatusScreen) — primary + additional statuses, each row
      with thumbnail / views / timestamp / a direct delete icon.
   3. A bottom-left eye icon inside the real fullscreen viewer that
      opens a proper viewers list (avatar + name + timestamp).
   4. A FAB on the list screen that expands into 4 mini action
      buttons (Image / Video / Text / Camera).
   5. A delete routine that can never hang on "Deleting…" — it always
      resets its own button state, even on error or timeout.
   ================================================================ */
(function () {
  'use strict';

  var EXPIRE = 24 * 60 * 60 * 1000; /* 24h, matches native */

  function init() {
    patchStatusTypeSelection();
    patchMyStatusRowTap();
    patchViewerEyeIcon();
    patchShowStatusViewBackHandling();
    patchHideStatusAdd();
    patchHideStatusView();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(init, 1200); });
  } else {
    setTimeout(init, 1200);
  }

  /* ══════════════════════════════════════════════════════════
     LOCAL CACHE — instant "My Status" loading
     ------------------------------------------------------------
     Tapping "My Status" previously always waited on a live
     Firebase round-trip before showing anything. We now cache the
     last-known array in localStorage and hand it back SYNCHRONOUSLY
     first (instant paint), then still do the real Firebase fetch in
     the background and re-render if anything changed — exactly the
     "cache first, network second" pattern requested.
     ══════════════════════════════════════════════════════════ */
  function cacheKey() { return 'chitchat_my_status_cache_' + window.uid; }

  function getCachedStatuses() {
    try {
      var raw = localStorage.getItem(cacheKey());
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      /* Drop anything that's already expired even in the cache */
      return (parsed || []).filter(function (s) { return Date.now() - s.timestamp < EXPIRE; });
    } catch (e) { return null; }
  }

  function setCachedStatuses(arr) {
    try { localStorage.setItem(cacheKey(), JSON.stringify(arr || [])); } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════
     SCHEMA-SAFE READ — the one and only place this file reads
     statuses/{uid}. Mirrors exactly how native code parses it.

     cb may be called TWICE: first synchronously with cached data
     (if any) for an instant UI, then again once the live Firebase
     read resolves. Callers should be safe to re-render on a second
     call — every call site here already just rebuilds its view.
     ══════════════════════════════════════════════════════════ */
  function readMyStatuses(cb) {
    if (!window.uid) { cb([]); return; }

    var cached = getCachedStatuses();
    if (cached) cb(cached); /* instant paint from local cache */

    if (!window.db) return;
    window.db.ref('statuses/' + window.uid).once('value', function (snap) {
      var arr = [];
      if (snap.exists()) {
        var data = snap.val();
        if (data.type && (data.type === 'image' || data.type === 'text' || data.type === 'video')) {
          arr = [data];
        } else if (data.statuses) {
          arr = data.statuses.filter(function (s) { return Date.now() - s.timestamp < EXPIRE; });
        }
        arr.sort(function (a, b) { return b.timestamp - a.timestamp; });
      }
      setCachedStatuses(arr);
      cb(arr);
    }, function () { if (!cached) cb([]); });
  }

  /* ══════════════════════════════════════════════════════════
     1. ADD-STATUS TYPE SELECTION — 4-button bar + back/cancel
     ══════════════════════════════════════════════════════════ */
  function patchStatusTypeSelection() {
    if (typeof window.showStatusTypeSelection !== 'function' || typeof window.hideStatusAdd !== 'function') {
      setTimeout(patchStatusTypeSelection, 400);
      return;
    }
    if (window._andStatusTypePatched) return;
    window._andStatusTypePatched = true;

    var _origShowType = window.showStatusTypeSelection;

    window.showStatusTypeSelection = function () {
      _origShowType();

      var container = document.getElementById('statusAddContainer');
      if (!container) return;

      var nativeBtns = container.querySelector('.status-type-buttons');
      if (nativeBtns) nativeBtns.remove();
      var old = container.querySelector('.ast-type-bar');
      if (old) old.remove();
      var oldBack = container.querySelector('.ast-add-topbar');
      if (oldBack) oldBack.remove();

      /* ── Top bar: visible Cancel/Back button (always present) ── */
      var topBar = document.createElement('div');
      topBar.className = 'ast-add-topbar';
      topBar.innerHTML =
        '<button type="button" class="ast-add-cancel">' +
        '<span style="font-size:20px;line-height:1;">&#8592;</span> Cancel' +
        '</button>';
      topBar.querySelector('.ast-add-cancel').addEventListener('click', function (e) {
        e.preventDefault();
        andCloseAddStatus();
      });
      container.insertBefore(topBar, container.firstChild);

      /* ── 4-button horizontal bar ── */
      var bar = document.createElement('div');
      bar.className = 'ast-type-bar status-type-buttons';

      var items = [
        { icon: '✏️', label: 'Text',   action: function () { window.showTextStatusInput(); } },
        { icon: '🖼️', label: 'Image',  action: function () { window.selectStatusMedia(); } },
        { icon: '🎥', label: 'Video',  action: function () { window.selectStatusMedia(); } },
        { icon: '📷', label: 'Camera', action: function () { window.selectStatusMedia(); } }
      ];

      items.forEach(function (item) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ast-type-btn navItem';
        btn.innerHTML =
          '<span class="ast-type-icon">' + item.icon + '</span>' +
          '<span>' + item.label + '</span>';
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          enterCreationMode(container);
          item.action();
        });
        bar.appendChild(btn);
      });

      container.insertBefore(bar, topBar.nextSibling);

      /* Register a history entry so the hardware back button closes
         this screen instead of the whole app (see popstate handler
         installed once in setupHardwareBack()). */
      setupHardwareBack();
    };
  }

  /* When any of the 4 buttons is tapped: hide the bar, show a small
     "back to selection" arrow that restores it without losing the
     screen (does NOT fully exit Add Status). */
  function enterCreationMode(container) {
    /* Fully REMOVE the 4-button bar from the DOM (not just hide it)
       the instant a mode is picked. This guarantees zero chance of
       it lingering visually over the preview/editor, regardless of
       any CSS specificity or timing edge case. It's cheaply rebuilt
       from scratch by showStatusTypeSelection() if the user backs
       out to pick a different mode. */
    var bar = container.querySelector('.ast-type-bar');
    if (bar) bar.remove();

    var old = container.querySelector('.ast-creation-back');
    if (old) old.remove();

    var backBtn = document.createElement('button');
    backBtn.type = 'button';
    backBtn.className = 'ast-creation-back';
    backBtn.innerHTML = '&#8592; Back';
    backBtn.addEventListener('click', function (e) {
      e.preventDefault();
      exitCreationMode(container);
    });
    var topBar = container.querySelector('.ast-add-topbar');
    if (topBar) topBar.insertAdjacentElement('afterend', backBtn);
    else container.insertBefore(backBtn, container.firstChild);

    armSelfHealingHide(container);
  }

  /* ── Self-healing guard ────────────────────────────────────
     Belt-and-braces backup for enterCreationMode()'s removal
     above: selectStatusMedia()'s file-processing callbacks run
     inside native closures we can't hook into directly, and the OS
     file picker itself is asynchronous, so if showStatusTypeSelection()
     ever gets re-triggered by a native fallback path while a preview
     is already showing, this watches #statusAddContainer and removes
     any freshly (re)created bar the instant a preview is visible. ── */
  var _healObserver = null;
  function armSelfHealingHide(container) {
    if (_healObserver) _healObserver.disconnect();
    _healObserver = new MutationObserver(function () {
      var bar = container.querySelector('.ast-type-bar');
      if (!bar) return;
      var imgPrev  = document.getElementById('statusImagePreview');
      var txtInput = document.getElementById('statusTextInput');
      var vidPrev  = document.getElementById('statusVideoPreview');
      var visible = [imgPrev, txtInput, vidPrev].some(function (el) {
        return el && el.style.display !== 'none' && el.style.display !== '';
      });
      if (visible) bar.remove();
    });
    _healObserver.observe(container, {
      attributes: true, attributeFilter: ['style'], subtree: true
    });
  }
  function disarmSelfHealingHide() {
    if (_healObserver) { _healObserver.disconnect(); _healObserver = null; }
  }

  /* Returning to the 4-button selection state — re-run the (patched)
     type-selection screen from scratch so nothing is left over. */
  function exitCreationMode(container) {
    disarmSelfHealingHide();
    if (typeof window.showStatusTypeSelection === 'function') {
      window.showStatusTypeSelection();
    }
  }

  /* Fully close the Add-Status screen and go back to wherever the
     user was (status list / chat list). Also patches the REAL
     hideStatusAdd() once so that ANY path that closes the Add
     screen — cancel button, hardware back, OR a successful save —
     refreshes the My Status list in real time if it's the active
     screen. This is what makes newly-posted statuses appear
     instantly without navigating away and back. */
  var _hideStatusAddPatched = false;
  function andCloseAddStatus() {
    disarmSelfHealingHide();
    patchHideStatusAdd();
    if (typeof window.hideStatusAdd === 'function') window.hideStatusAdd();
  }
  function patchHideStatusAdd() {
    if (_hideStatusAddPatched) return;
    if (typeof window.hideStatusAdd !== 'function') { setTimeout(patchHideStatusAdd, 400); return; }
    _hideStatusAddPatched = true;
    var _origHide = window.hideStatusAdd;
    window.hideStatusAdd = function () {
      disarmSelfHealingHide();
      _origHide();
      var mgr = document.getElementById('andMyStatusScreen');
      if (mgr && mgr.classList.contains('active')) {
        refreshMyStatusScreen();
      }
    };
  }

  /* ── Hardware back button ─────────────────────────────────
     The popstate LISTENER is attached once. A fresh history
     entry is pushed every time a status screen opens, so each
     hardware back press always has one buffered state to
     consume — it closes the active status screen instead of
     leaving the app or losing extra back-presses. ──────────── */
  var _backListenerAttached = false;
  function armBackListener() {
    if (_backListenerAttached) return;
    _backListenerAttached = true;
    window.addEventListener('popstate', function onPop() {
      var container = document.getElementById('statusAddContainer');
      var mgr = document.getElementById('andMyStatusScreen');
      var viewer = document.getElementById('statusViewContainer');
      if (container && container.style.display === 'flex') {
        andCloseAddStatus();
      } else if (viewer && viewer.style.display === 'flex') {
        if (typeof window.hideStatusView === 'function') window.hideStatusView();
      } else if (mgr && mgr.classList.contains('active')) {
        andCloseMyStatusScreen();
      }
    });
  }
  function setupHardwareBack() {
    armBackListener();
    try { history.pushState({ andStatusAdd: true, t: Date.now() }, ''); } catch (e) {}
  }

  /* ══════════════════════════════════════════════════════════
     2. TAP "My Status" ROW → open WhatsApp-style list screen
        (or the real create-flow if there's nothing posted yet)
     ══════════════════════════════════════════════════════════ */
  function patchMyStatusRowTap() {
    /* Capture-phase listener beats native's bubble-phase .onclick,
       and works no matter when native re-binds myStatusRow.onclick
       (it does so every time switchMainTab('status') runs). */
    document.addEventListener('click', function (e) {
      var row = e.target.closest && e.target.closest('#myStatusRow');
      if (!row) return;
      e.stopImmediatePropagation();
      e.preventDefault();

      var navigated = false;
      readMyStatuses(function (arr) {
        var mgr = document.getElementById('andMyStatusScreen');
        var mgrOpen = mgr && mgr.classList.contains('active');

        if (!navigated) {
          /* First resolution (cache or network, whichever wins) —
             decide where to go. */
          navigated = true;
          if (arr.length === 0) {
            if (typeof window.showStatusAdd === 'function') window.showStatusAdd();
          } else {
            andOpenMyStatusScreen();
          }
        } else if (mgrOpen) {
          /* Second resolution (the background network fetch) — if
             we're already showing the list, just refresh its
             contents instead of re-deciding navigation. */
          refreshMyStatusScreen();
        }
      });
    }, true);
  }

  /* ══════════════════════════════════════════════════════════
     3. NEW SCREEN: My Status (WhatsApp-style list)
     ══════════════════════════════════════════════════════════ */
  function ensureMyStatusScreen() {
    var el = document.getElementById('andMyStatusScreen');
    if (el) return el;

    el = document.createElement('div');
    el.id = 'andMyStatusScreen';
    el.innerHTML =
      '<div class="ast-mgr-header">' +
        '<button class="ast-mgr-back" id="astMgrBackBtn">&#8592;</button>' +
        '<div class="ast-mgr-title">My status</div>' +
      '</div>' +
      '<div class="ast-mgr-list" id="astMgrList"></div>' +
      '<div class="ast-mgr-enc">🔒 Your statuses are end-to-end encrypted. They will disappear after 24 hours.</div>' +
      '<div id="astMgrFabWrap">' +
        '<div id="astMgrFabMenu">' +
          '<button class="ast-fab-mini" data-act="image"><span>🖼️</span></button>' +
          '<button class="ast-fab-mini" data-act="video"><span>🎥</span></button>' +
          '<button class="ast-fab-mini" data-act="text"><span>✏️</span></button>' +
          '<button class="ast-fab-mini" data-act="camera"><span>📷</span></button>' +
        '</div>' +
        '<button id="astMgrFabMain">+</button>' +
      '</div>';
    document.body.appendChild(el);

    el.querySelector('#astMgrBackBtn').addEventListener('click', andCloseMyStatusScreen);

    var fabMain = el.querySelector('#astMgrFabMain');
    var fabMenu = el.querySelector('#astMgrFabMenu');
    fabMain.addEventListener('click', function () {
      var open = fabMenu.classList.toggle('open');
      fabMain.classList.toggle('rotated', open);
    });
    fabMenu.querySelectorAll('.ast-fab-mini').forEach(function (btn) {
      btn.addEventListener('click', function () {
        fabMenu.classList.remove('open');
        fabMain.classList.remove('rotated');
        var act = btn.dataset.act;
        andOpenFreshStatusCreator(function () {
          var container = document.getElementById('statusAddContainer');
          if (act === 'text' && typeof window.showTextStatusInput === 'function') {
            if (container) enterCreationMode(container);
            window.showTextStatusInput();
          } else if (typeof window.selectStatusMedia === 'function') {
            if (container) enterCreationMode(container);
            window.selectStatusMedia();
          }
        });
      });
    });

    return el;
  }

  /* ── Open the status creator screen directly on the 4-button
     selection step, WITHOUT going through showStatusAdd()'s
     "does a status already exist?" branch. That branch shows the
     old-status MANAGEMENT view (with its own delete button/preview)
     whenever at least one status is already posted — exactly the
     wrong screen for "post a new/second status" entry points like
     our FAB. This was the root cause of the previous status and its
     delete button remaining visible while creating a new one. ──── */
  function andOpenFreshStatusCreator(afterOpenCb) {
    var container = document.getElementById('statusAddContainer');
    if (!container) return;
    if (typeof window.hideDropdown === 'function') window.hideDropdown();
    container.style.display = 'flex';
    if (window.mainPage) window.mainPage.classList.remove('active');
    if (window.chatPage) window.chatPage.classList.remove('active');
    if (typeof window.showStatusTypeSelection === 'function') {
      window.showStatusTypeSelection(); /* patched version: 4-button bar + cancel */
    }
    if (typeof afterOpenCb === 'function') setTimeout(afterOpenCb, 60);
  }

  function andOpenMyStatusScreen() {
    var el = ensureMyStatusScreen();
    el.classList.add('active');
    armBackListener();
    try { history.pushState({ andMyStatusScreen: true, t: Date.now() }, ''); } catch (e) {}
    refreshMyStatusScreen();
  }

  window.andCloseMyStatusScreen = function () {
    var el = document.getElementById('andMyStatusScreen');
    if (el) el.classList.remove('active');
  };

  function refreshMyStatusScreen() {
    var list = document.getElementById('astMgrList');
    if (!list) return;
    list.innerHTML = '<div class="ast-mgr-loading">Loading…</div>';

    readMyStatuses(function (arr) {
      if (arr.length === 0) { andCloseMyStatusScreen(); return; }
      list.innerHTML = '';

      arr.forEach(function (st, idx) {
        var row = buildMgrRow(st, idx, arr);
        list.appendChild(row);
      });
    });
  }

  function buildMgrRow(st, idx, fullArr) {
    var row = document.createElement('div');
    row.className = 'ast-mgr-item';

    var thumbHtml;
    if (st.type === 'image') {
      thumbHtml = '<img class="ast-mgr-thumb" src="' + st.content + '" onerror="this.src=\'icons/default.png\'">';
    } else if (st.type === 'video') {
      thumbHtml =
        '<div class="ast-mgr-thumb ast-mgr-thumb-video">' +
          '<video src="' + st.content + '" muted preload="metadata"></video>' +
          '<span class="ast-mgr-play">▶</span>' +
        '</div>';
    } else {
      thumbHtml =
        '<div class="ast-mgr-thumb ast-mgr-thumb-text">' +
          escHtml((st.content || '').substring(0, 24)) +
        '</div>';
    }

    row.innerHTML =
      thumbHtml +
      '<div class="ast-mgr-info">' +
        '<div class="ast-mgr-views" data-ts="' + st.timestamp + '">Loading views…</div>' +
        '<div class="ast-mgr-time">' + (idx === 0 ? 'Posted ' : '') + window.formatStatusTime(st.timestamp) + '</div>' +
      '</div>' +
      '<button class="ast-mgr-delete" title="Delete">🗑️</button>';

    /* Async view count */
    if (window.db && window.uid) {
      window.db.ref('statusViews/' + window.uid + '/' + st.timestamp).once('value', function (vs) {
        var count = vs.exists() ? Object.keys(vs.val()).length : 0;
        var vEl = row.querySelector('.ast-mgr-views');
        if (vEl) vEl.textContent = count + ' view' + (count !== 1 ? 's' : '');
      });
    }

    /* Tap row (not the delete icon) → open real fullscreen viewer at this index */
    row.addEventListener('click', function (e) {
      if (e.target.closest('.ast-mgr-delete')) return;
      openViewerAt(idx);
    });

    /* Delete icon → robust delete, can never hang */
    row.querySelector('.ast-mgr-delete').addEventListener('click', function (e) {
      e.stopPropagation();
      confirmAndDelete(st, row);
    });

    return row;
  }

  var _viewerOpenedFromMgrList = false;

  function openViewerAt(idx) {
    if (typeof window.showStatusView !== 'function') return;

    /* CRITICAL FIX: #andMyStatusScreen has a HIGHER z-index (5400)
       than the real fullscreen viewer #statusViewContainer (500).
       If we don't hide the list first, the viewer opens correctly
       underneath but stays completely invisible — the user appears
       "stuck" on the list screen forever. Hide it, then reopen it
       automatically once the viewer is closed (see patchHideStatusView
       below) so the round-trip feels natural. */
    var mgr = document.getElementById('andMyStatusScreen');
    if (mgr && mgr.classList.contains('active')) {
      _viewerOpenedFromMgrList = true;
      mgr.classList.remove('active');
    }

    window.showStatusView(window.uid);
    /* showStatusView() always resets to index 0; jump to the tapped
       row right after it finishes its own async setup. */
    setTimeout(function () {
      if (idx > 0 && window.userStatusArray && idx < window.userStatusArray.length) {
        window.currentStatusIndex = idx;
        if (typeof window.displayCurrentStatus === 'function') window.displayCurrentStatus();
      }
    }, 350);
  }

  /* Restore the My Status list screen automatically after the user
     backs out of the fullscreen viewer, but only if that's where
     they came from (never interferes with viewing a contact's
     status, which never touches the list screen at all). */
  var _hideStatusViewPatched = false;
  function patchHideStatusView() {
    if (_hideStatusViewPatched) return;
    if (typeof window.hideStatusView !== 'function') { setTimeout(patchHideStatusView, 400); return; }
    _hideStatusViewPatched = true;
    var _origHideView = window.hideStatusView;
    window.hideStatusView = function () {
      _origHideView();
      var eyeBtn = document.getElementById('andEyeBtn');
      if (eyeBtn) eyeBtn.style.display = 'none';
      if (_viewerOpenedFromMgrList) {
        _viewerOpenedFromMgrList = false;
        var mgr = document.getElementById('andMyStatusScreen');
        if (mgr) { mgr.classList.add('active'); refreshMyStatusScreen(); }
      }
    };
  }

  /* ══════════════════════════════════════════════════════════
     ROBUST DELETE — mirrors the real schema-write logic but
     guarantees the button/row state is ALWAYS reset, even if a
     Firebase call is slow or fails (fixes "stuck on Deleting…").
     ══════════════════════════════════════════════════════════ */
  function confirmAndDelete(st, row) {
    if (typeof window.showConfirmPrompt !== 'function') { doDelete(st, row); return; }
    window.showConfirmPrompt('Delete this status?', function (confirmed) {
      if (confirmed) doDelete(st, row);
    });
  }

  function doDelete(st, row) {
    var delBtn = row.querySelector('.ast-mgr-delete');
    var originalHtml = delBtn.innerHTML;
    delBtn.innerHTML = '⏳';
    delBtn.disabled = true;

    /* Hard safety timeout — no matter what happens with Firebase,
       this row's UI is guaranteed to recover within 6s. */
    var settled = false;
    var safety = setTimeout(function () {
      if (settled) return;
      settled = true;
      delBtn.innerHTML = originalHtml;
      delBtn.disabled = false;
      if (typeof window.showNotification === 'function') {
        window.showNotification('Could not delete — check your connection and try again.');
      }
    }, 6000);

    function finish(ok) {
      if (settled) return;
      settled = true;
      clearTimeout(safety);
      if (ok) {
        if (typeof window.showNotification === 'function') window.showNotification('Status deleted!');
        /* update in real time: drop the row immediately, then
           re-check whether any statuses remain */
        row.remove();
        refreshMyStatusScreen();
      } else {
        delBtn.innerHTML = originalHtml;
        delBtn.disabled = false;
        if (typeof window.showNotification === 'function') window.showNotification('Failed to delete status.');
      }
    }

    if (!window.db || !window.uid) { finish(false); return; }

    window.db.ref('statusViews/' + window.uid + '/' + st.timestamp).remove();
    window.db.ref('statusLikes/' + window.uid + '/' + st.timestamp).remove();

    window.db.ref('statuses/' + window.uid).once('value', function (snap) {
      var data = snap.val();
      if (!data) { finish(true); return; }

      if (data.type && (data.type === 'image' || data.type === 'text' || data.type === 'video')) {
        /* Only one status existed — remove the whole node */
        window.db.ref('statuses/' + window.uid).remove()
          .then(function () { finish(true); })
          .catch(function () { finish(false); });
      } else if (data.statuses) {
        var updated = data.statuses.filter(function (s) { return s.timestamp !== st.timestamp; });
        if (updated.length === 0) {
          window.db.ref('statuses/' + window.uid).remove()
            .then(function () { finish(true); })
            .catch(function () { finish(false); });
        } else {
          var newData = updated.length === 1
            ? updated[0]
            : { type: 'multiple', statuses: updated, timestamp: updated[updated.length - 1].timestamp };
          window.db.ref('statuses/' + window.uid).set(newData)
            .then(function () { finish(true); })
            .catch(function () { finish(false); });
        }
      } else {
        finish(true);
      }
    }, function () { finish(false); });
  }

  /* ══════════════════════════════════════════════════════════
     4. EYE ICON in the real fullscreen viewer → viewer list
     ══════════════════════════════════════════════════════════ */
  function patchShowStatusViewBackHandling() {
    if (typeof window.showStatusView !== 'function') {
      setTimeout(patchShowStatusViewBackHandling, 400);
      return;
    }
    if (window._andViewerBackPatched) return;
    window._andViewerBackPatched = true;
    var _origShowView = window.showStatusView;
    window.showStatusView = function (statusUid) {
      armBackListener();
      try { history.pushState({ andStatusViewer: true, t: Date.now() }, ''); } catch (e) {}
      _origShowView(statusUid);
    };
  }

  /* ── FIX: the native eye/"Views" button is only ever made visible
     from inside an async Firebase callback, AND only when the live
     view-count happens to be > 0 at that exact moment — so on a
     freshly-posted status (0 views so far) there is nothing to tap
     at all, and the user's touch falls straight through to the
     left/right navigation zone underneath, making it LOOK like
     tapping "the eye icon" closed/advanced the status. We replace
     it entirely with our own persistent, always-visible-for-your-
     own-status button, decoupled from that fragile visibility gate,
     with its own live-updating count. ─────────────────────────── */
  function patchViewerEyeIcon() {
    if (typeof window.displayCurrentStatus !== 'function') {
      setTimeout(patchViewerEyeIcon, 400); return;
    }
    if (window._andEyeIconPatched) return;
    window._andEyeIconPatched = true;

    /* Hide the native button completely — we no longer rely on it */
    var nativeBtn = document.getElementById('statusViewsButton');
    if (nativeBtn) nativeBtn.style.display = 'none';

    var eyeBtn = ensureEyeButton();

    var _origDisplay = window.displayCurrentStatus;
    window.displayCurrentStatus = function () {
      _origDisplay.apply(this, arguments);
      refreshEyeButton();
    };

    /* ── FIX: bind the eye button's visibility DIRECTLY to whether
       #statusViewContainer is actually on-screen, instead of
       relying on every possible JS function that could close/leave
       the viewer to remember to hide it. No matter which code path
       is used to exit — hardware back, tab switch, native "Back"
       button, auto-advance past the last status — the moment the
       viewer's own display style stops being "flex", this observer
       force-hides the eye button (and the viewers sheet, if open)
       immediately. This is what was letting the eye icon linger
       into the private chat screen. ─────────────────────────── */
    var svc = document.getElementById('statusViewContainer');
    if (svc) {
      var obs = new MutationObserver(function () {
        if (svc.style.display !== 'flex') {
          eyeBtn.style.display = 'none';
          var sheet = document.getElementById('andViewersSheet');
          if (sheet) sheet.classList.remove('active');
        }
      });
      obs.observe(svc, { attributes: true, attributeFilter: ['style'] });
    }
  }

  function ensureEyeButton() {
    var btn = document.getElementById('andEyeBtn');
    if (btn) return btn;
    btn = document.createElement('button');
    btn.id = 'andEyeBtn';
    btn.className = 'ast-eye-btn';
    btn.innerHTML = '<span>👁️</span><span id="andEyeCount">0</span>';
    btn.style.display = 'none';
    document.body.appendChild(btn);

    /* This click never touches statusViewContainer's display or the
       playback timer — it only opens an overlay sheet on top. */
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation();
      var arr = window.userStatusArray || [];
      var idx = window.currentStatusIndex || 0;
      var st = arr[idx];
      if (!st) return;
      andShowViewersSheet(window.uid, st.timestamp);
    });
    return btn;
  }

  function refreshEyeButton() {
    var btn = document.getElementById('andEyeBtn');
    if (!btn) return;
    var arr = window.userStatusArray || [];
    var idx = window.currentStatusIndex || 0;
    var st = arr[idx];
    var isOwn = st && window.currentStatusViewUid === window.uid;

    if (!isOwn) { btn.style.display = 'none'; return; }

    btn.style.display = 'flex';
    if (window.db) {
      window.db.ref('statusViews/' + window.uid + '/' + st.timestamp).once('value', function (snap) {
        var count = snap.exists() ? Object.keys(snap.val()).length : 0;
        var countEl = document.getElementById('andEyeCount');
        if (countEl) countEl.textContent = count;
      });
    }
  }

  function andShowViewersSheet(statusUid, timestamp) {
    var old = document.getElementById('andViewersSheet');
    if (old) old.remove();

    var sheet = document.createElement('div');
    sheet.id = 'andViewersSheet';
    sheet.innerHTML =
      '<div class="ast-vs-bg"></div>' +
      '<div class="ast-vs-body">' +
        '<div class="ast-vs-handle"></div>' +
        '<div class="ast-vs-header">' +
          '<div class="ast-vs-title">Viewed by …</div>' +
          '<button class="ast-vs-close">✕</button>' +
        '</div>' +
        '<div class="ast-vs-list"><div class="ast-mgr-loading">Loading…</div></div>' +
      '</div>';
    document.body.appendChild(sheet);
    requestAnimationFrame(function () { sheet.classList.add('active'); });

    function close() {
      sheet.classList.remove('active');
      setTimeout(function () { sheet.remove(); }, 220);
    }
    sheet.querySelector('.ast-vs-bg').addEventListener('click', close);
    sheet.querySelector('.ast-vs-close').addEventListener('click', close);

    if (!window.db) return;
    var viewsPromise = window.db.ref('statusViews/' + statusUid + '/' + timestamp).once('value');
    var likesPromise = window.db.ref('statusLikes/' + statusUid + '/' + timestamp).once('value');

    Promise.all([viewsPromise, likesPromise]).then(function (results) {
      var viewsData = results[0].val();
      var likesData = results[1].val() || {};
      var viewerUids = viewsData ? Object.keys(viewsData) : [];

      var titleEl = sheet.querySelector('.ast-vs-title');
      if (titleEl) titleEl.textContent = 'Viewed by ' + viewerUids.length;

      var listEl = sheet.querySelector('.ast-vs-list');
      if (viewerUids.length === 0) {
        listEl.innerHTML = '<div class="ast-mgr-loading">No views yet</div>';
        return;
      }

      var profilePromises = viewerUids.map(function (vUid) {
        return window.db.ref('profiles/' + vUid).once('value').then(function (pSnap) {
          var p = pSnap.val() || {};
          return {
            uid: vUid,
            username: p.username || 'User',
            profilePic: p.profilePic || 'icons/default.png',
            viewTime: viewsData[vUid],
            liked: !!likesData[vUid]
          };
        });
      });

      Promise.all(profilePromises).then(function (viewers) {
        viewers.sort(function (a, b) { return b.viewTime - a.viewTime; });
        listEl.innerHTML = '';
        viewers.forEach(function (v) {
          var item = document.createElement('div');
          item.className = 'ast-vs-item';
          item.innerHTML =
            '<img class="ast-vs-avatar" src="' + v.profilePic + '" onerror="this.src=\'icons/default.png\'">' +
            '<div class="ast-vs-name">' + escHtml(v.username) + (v.liked ? ' ❤️' : '') + '</div>' +
            '<div class="ast-vs-time">' + formatClock(v.viewTime) + '</div>';
          listEl.appendChild(item);
        });
      });
    });
  }

  /* ══════════════════════════════════════════════════════════
     HELPERS
     ══════════════════════════════════════════════════════════ */
  function escHtml(t) {
    return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function formatClock(ts) {
    var d = new Date(ts);
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'pm' : 'am';
    h = h % 12 || 12;
    return h + ':' + (m < 10 ? '0' : '') + m + ' ' + ampm;
  }

})();
