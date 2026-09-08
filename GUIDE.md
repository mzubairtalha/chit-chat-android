# Chit Chat — Android Conversion Guide
**Version:** Android v15  
**Original Platform:** KaiOS  
**Converted to:** Android (Touch-first, Material Design)

---

## 📱 What Changed (KaiOS → Android)

### Removed
| KaiOS Element | Reason |
|---|---|
| `softKeysContainer` (Left/Right/Center keys) | Replaced by touch gestures & buttons |
| `floatingButton` + `virtualKeypad` | Not needed on Android |
| `.auth-footer` | Replaced by native buttons |
| `Twemoji_Mozilla.ttf` | System emoji fonts used instead |
| KaiOS fixed header (28px) | Replaced by Android tab bar (96px) |

### Added
| Android Element | Purpose |
|---|---|
| `#androidMainTabBar` | Fixed top bar: App title + Search + ⋮ |
| `#andTabRow` | 5-tab row: Chat / Status / Groups / World / Online |
| `#andMsgRow` | Message input with + (attach) and Send ➤ buttons |
| `#androidFab` | Floating Action Button — toggles search |
| `#andSettingsSheet` | Settings bottom sheet (3-dot menu) |
| `#andGroupsFrame` | iframe for groups.html |
| `#andWorldFrame` | iframe for worldchat.html |
| `js/android-touch.js` | All touch gesture handlers |

---

## 🧭 Navigation

### Tab Bar (top)
Tap any tab to switch instantly:

| Tab | Content |
|---|---|
| **Chat** | Private chats list |
| **Status** | User statuses |
| **Groups** | Opens `groups.html` in an iframe |
| **World** | Opens `worldchat.html` in an iframe |
| **Online** | Live online users list |

### Swipe Gestures (main page)
| Gesture | Action |
|---|---|
| Swipe **Left** | Next tab (Chat → Status → Groups → World → Online) |
| Swipe **Right** | Previous tab (Online → World → Groups → Status → Chat) |
| Swipe **Right** on Online User | Opens private chat with that user |

---

## 💬 Chat Page

### Header
- **← Back** button (top-left) — returns to main page
- User **avatar + name + status** in centre
- Existing header action buttons on the right

### Message Input Row
```
[ + ]  [ type a message...          ]  [ ➤ ]
```
- **+** opens the **Attach / Media menu** (bottom sheet)
- **➤** sends the message
- Textarea auto-grows up to 90px

### Message Gestures
| Gesture | Action |
|---|---|
| **Swipe right** on message | Reply to that message |
| **Long press** (0.5s) on message | Opens message options menu |

### Message Options (long-press)
All options use the existing KaiOS code paths:
- ↩ Reply
- 📋 Copy
- 🗑 Delete for Me
- 🗑 Delete for Everyone *(sent messages only)*
- ✏ Edit *(sent messages only)*
- 😊 React
- ℹ Info
- ☑ Select Messages
- ⛶ Fullscreen *(images only)*

---

## 👥 User List Long-Press Menu
Long-press (0.5s) on any user in the chat list:

| Option | Action |
|---|---|
| 👤 View Profile | Opens chat / profile |
| 🧹 Clear Chat | Removes all messages (with confirm) |
| 🚫 Block | Blocks the user |
| 🔇 Mute / Unmute | Toggles chat mute |
| 🗑 Delete | Removes the chat from list |

*(World Chat, Group Chat, Search, Settings are removed from this menu on Android — they're accessible via the tab bar and ⋮ menu)*

---

## ⚙️ Settings (⋮ Three-dot Menu)
Opens `showSettingsMenu()` from `ui.js`:

- ✏️ Edit Profile
- 🔤 Font
- 🔒 App Lock
- 🚫 Spam Protection [ON/OFF]
- 🖼 Change Chat BG
- 🔔 Notifications [ON/OFF]
- 🔊 Sound [ON/OFF]
- ⬇️ Auto-Download [ON/OFF]
- 🚫 Blocked Users
- 🚪 Logout

---

## ➕ Attach Menu (+ Button)
Opens a 3-column grid bottom sheet:
- 😊 Emoji → `openEmojiPicker()`
- 📷 Photo → `sendImageDirect()`
- 🎬 Video → `sendVideoDirect()`
- 🎵 Music → `sendMusicFile()`
- 🎤 Voice → `startRecording()`

All call existing global functions from `chat.js` — no code duplication.

---

## 🔍 Search
- Tap **🔍 search icon** (top-right) or **FAB** button (bottom-right)
- Search bar slides down below the tab bar
- Results appear below the search input
- Tap anywhere outside or tap FAB again to close

---

## 📐 Architecture & Key Decisions

### "Simulate, don't duplicate" principle
All KaiOS JS logic in `ui.js`, `chat.js`, `auth.js` is **untouched**. The Android layer works by:
1. **Focus + KeyboardEvent** — focusing a DOM element then dispatching a synthetic `SoftLeft` or `SoftRight` keydown to trigger the existing handlers
2. **Direct global function calls** — calling functions like `logout()`, `showSettingsMenu()`, `openEmojiPicker()`, `sendImageDirect()` which are already global

### KaiOS compatibility stubs
| Element | Status | Why kept |
|---|---|---|
| `#softKeysContainer` | In DOM, hidden, 0-height | JS accesses `softkeyLeft`, `softkeyRight`, `softkeyCenter` |
| `#mainTabBar` | Hidden | `switchMainTab()` in ui.js reads `tabChat`, `tabStatus` IDs |

### MutationObserver pattern
Prevents KaiOS JS from fighting our CSS:
- `forceSoftkeyHidden()` — watches `softKeysContainer` and immediately re-hides it whenever JS tries to show it (disconnect-before-change to prevent infinite loops)
- `fixMainPagePadding()` — watches `mainPage` and enforces 96px paddingTop whenever JS resets it

### dropdown → bottom sheet
`showDropdown()` and `hideDropdown()` from `ui.js` are patched to add:
- Slide-up animation (translateY: 100% → 0)
- Dark overlay backdrop
- Handle bar indicator
- Sheet title injection

---

## 📁 File Structure

```
app/
├── index.html          ← Main app (KaiOS HTML + Android CSS/HTML overlaid)
├── groups.html         ← Groups page (loaded in iframe)
├── worldchat.html      ← World Chat page (loaded in iframe)
├── GUIDE.md            ← This file
├── js/
│   ├── android-touch.js  ← ✨ NEW: All Android touch logic
│   ├── config.js         ← App config, global variables
│   ├── auth.js           ← Authentication (Firebase Auth)
│   ├── ui.js             ← Main UI, online users, settings
│   ├── chat.js           ← Chat logic, messages, media
│   ├── share.js          ← Sharing features
│   ├── firebase-app.js   ← Firebase SDK
│   ├── firebase-database.js
│   ├── firebase-auth.js
│   └── cloudinary.js     ← Media upload
├── manifest.webapp
└── sw.js               ← Service worker
```

---

## 🐛 Known Fixed Bugs (this session)

| Bug | Fix |
|---|---|
| Blank white screen | Missing `</style>` tag caused browser to parse HTML as CSS |
| MutationObserver infinite loop | Disconnect-before-change pattern added |
| Online users not visible | `showOnlineUsersView()` set paddingTop:0; patched to maintain 96px |
| + button menu closes immediately | Now calls global functions directly instead of key simulation |
| Search results behind header | `top: calc(96px + 58px)` CSS override |
| Logout not working | Now calls `window.logout()` from chat.js directly |
| User menu showed World Chat/Groups/Settings | Filter wrapper intercepts `showDropdown` and removes unwanted items |
| Twemoji font breaking numbers | Removed entirely; system emoji fonts used |
| KaiOS tab bar showing in chat | `body:has(#chatPage.active) #androidMainTabBar { display:none }` |
| Slow-internet sends not instant | `sendMessage` renders an optimistic "queued" bubble before any permission check; online sends push straight to Firebase with top priority via the outgoing queue |
| Full history missing when chat reopens | Per-chat cache widened to last 50 messages; all cache writes merge with the existing disk cache; opening a chat restores the full merged thread, then runs a forced server catch-up/fresh fetch after waiting for `.info/connected` |
| Only last message shows on first open | Catch-up and fresh fetches both re-render the whole merged thread instead of appending chunks; removed the stale-Firebase-local-cache read path after app reopen |
| Unread counts showing on app open | Count badges only render when `__sessionUnreadEnabled` is live (after session init); on app open only the last-message/unread styling check applies, then live increments continue while online |
| Online-users flicker / premature empty state | Spinner + "Loading online users..." shows until first load; stale rows no longer removed internally; tab switch only re-triggers load when list is not ready |
| Send button too small | Enlarged to 52x52 with a 28x28 SVG on both the KaiOS CSS block and Android markup |
| Spam check wrongly blocking contacts | `canSendMessageTo` allows anyone already in the chat list (either direction) and only blocks when the receiver has spam protection ON and the sender is not in the receiver's list |
| Blocked-send ghost message in cache | `abortOptimistic` also removes the optimistic entry from `messages[]` and from the merged local/disk cache |
| Send action on Android | `androidSend` now calls `sendMessage` directly (keeps edit-mode handling) instead of synthesizing Enter keydown |
| Message delivered twice to the receiver | Chat messages now use deterministic client-generated keys (`uid_m_<ts>_<rand>`) instead of Firebase `push()` keys, written to both the sender and receiver nodes under the SAME key — so any retry (flaky-network .set rejection, offline queue replay) overwrites the same message instead of creating a second one |
| Queue retry hammering / busy loop | A failed queue item stays at the head and is retried after 3 s (only while online); offline items are never rotated so order is preserved; permanent "blocked" errors drop the item |
| Outgoing order scrambled on reconnect (hi → hello → test) | Queue is now strict FIFO: priority items are no longer hoisted to the head, and a transient failure keeps the item at the head instead of cycling it to the tail — so queued texts and videos flush in the exact order they were typed |
| Queued message still sends after being deleted | `deleteMessageForMe`/`deleteMessageForEveryone` now also remove the item from the persistent outgoing queue and abort its in-flight upload (`_queueUploadAbort`), so a deleted queued/video message never sends later |
| No way to cancel a chat video/voice upload | Upload progress card now has an ❌ button; clicking it aborts the current Cloudinary request (stops the multi-cloud chain) and does NOT queue the file for later — cancel = cancel |
| Spurious "send failed" after a write actually landed | `doFirebaseSend`'s failure path now reads the node back first; if the write is already on the server it marks the bubble ✓/sent and mirrors+syncs (exactly one unread) instead of re-queueing the same message |
| Queued messages stuck after minimize | Foreground resume now flushes `processOutgoingQueue` and, when not inside an open chat, triggers the throttled chat-list resync so missed messages/unread show up |
| Sending while Firebase socket is still reconnecting | `setupConnectionStatus` now tracks `__fbConnected`; `sendMessage` treats a known-disconnected socket like offline and queues instead of leaving the bubble hanging |
| Chat header stuck on "Loading..." | Header status now falls back to cached last-seen/Offline when the presence node has no data, on both the profile lookup and the live presence listener |

---

## 🚀 Deployment Notes

1. Unzip and serve from any static HTTP server
2. Firebase config is in `js/config.js`
3. For production, update `sw.js` cache version when deploying
4. `groups.html` and `worldchat.html` must be present at the root for iframes to load
5. The app uses `localStorage` + Firebase for state — no server-side sessions

---

*Guide generated during the KaiOS → Android conversion session.*
