(function(){
var runtimeConfig={
firebaseConfig:{
apiKey: "AIzaSyBiiVHsi_vdIR9w2wyTvQMpCXMltVGTAsM",
authDomain: "chit-chat-84a92.firebaseapp.com",
databaseURL: "https://chit-chat-84a92-default-rtdb.firebaseio.com",
projectId: "chit-chat-84a92",
storageBucket: "chit-chat-84a92.firebasestorage.app",
messagingSenderId: "435993972654",
appId: "1:435993972654:web:5c9a5af5dc60628693823f",
measurementId: "G-HVQG8SQVG1"
},
imagekitPublicKey: "public_dMm+rip9cKZu28pLFolKpivaV0g=",
imagekitUrlEndpoint: "https://ik.imagekit.io/bg7iyrblm",
imagekitUploadUrl: "https://upload.imagekit.io/api/v1/files/upload"
};
window.RUNTIME_CONFIG=runtimeConfig;
var adEl=document.getElementById("kaios-ad");
if(adEl){
var observer=new MutationObserver(function(){
var hasContent=adEl.children.length>0||adEl.textContent.trim().length>0;
var sk=document.getElementById("softKeysContainer");
var footer=document.querySelector(".footer-nav");
if(hasContent){
if(sk)sk.style.display="none";
if(footer)footer.style.display="none";
}else{
if(sk)sk.style.display="";
if(footer)footer.style.display="";
}
});
observer.observe(adEl,{childList: true,subtree: true,characterData: true});
}
if(!firebase.apps||!firebase.apps.length){
firebase.initializeApp(runtimeConfig.firebaseConfig);
}
var auth=firebase.auth();
var db=firebase.database();
window.auth=auth;
window.db=db;
window.notificationSound=document.getElementById("notificationSound")||window.notificationSound||null;
if(window.notificationSound){
try{
window.notificationSound.preload="auto";
window.notificationSound.load();
}catch(e){}
}
window.currentChatUid=window.currentChatUid||null;
window.currentOpenChatUid=window.currentOpenChatUid||null;
window.messages=window.messages||[];
window.chatRef=window.chatRef||null;
window.otherChatRef=window.otherChatRef||null;
window.connectionRef=window.connectionRef||null;
window.processedMessages=window.processedMessages||{};
window.pressCount=typeof window.pressCount==="number" ? window.pressCount : 0;
window.currentEmojiContainer=window.currentEmojiContainer||null;
window.currentActionContainer=window.currentActionContainer||null;
window.shownAlerts=window.shownAlerts||{};
window.isAlertActive=typeof window.isAlertActive==="boolean" ? window.isAlertActive : false;
window.notificationListenerActive=typeof window.notificationListenerActive==="boolean" ? window.notificationListenerActive : false;
window.isBlockedByUser=typeof window.isBlockedByUser==="boolean" ? window.isBlockedByUser : false;
window.isDropdownVisible=typeof window.isDropdownVisible==="boolean" ? window.isDropdownVisible : false;
window.lastFocusedElement=window.lastFocusedElement||null;
window.typingTimeout=window.typingTimeout||null;
window.pendingOpenChatUsername=window.pendingOpenChatUsername||null;
window.pendingOpenChatStatus=window.pendingOpenChatStatus||null;
window.currentChatUsername=window.currentChatUsername||"";
window.lastFocusedChatElement=window.lastFocusedChatElement||null;
window.chatHeaderInterval=window.chatHeaderInterval||null;
window.activeChatPresenceRef=window.activeChatPresenceRef||null;
window.statusRef=window.statusRef||null;
window.viewingProfileUid=window.viewingProfileUid||null;
window.isSearching=typeof window.isSearching==="boolean" ? window.isSearching : false;
window.spamProtection=JSON.parse(localStorage.getItem("spamProtection")||"false");
window.notificationSoundEnabled=JSON.parse(localStorage.getItem("notificationSoundEnabled")||localStorage.getItem("notificationEnabled")||"true");
window.appLockPassword=localStorage.getItem("appLockPassword")||null;
window.replyingToMessageId=window.replyingToMessageId||null;
window.isRecording=typeof window.isRecording==="boolean" ? window.isRecording : false;
window.mediaRecorder=window.mediaRecorder||null;
window.recordedChunks=window.recordedChunks||[];
window.recordingStartTime=typeof window.recordingStartTime==="number" ? window.recordingStartTime : 0;
window.recordingTimer=window.recordingTimer||null;
window.currentAudio=window.currentAudio||null;
window.audioDuration=typeof window.audioDuration==="number" ? window.audioDuration : 0;
window.audioCurrentTime=typeof window.audioCurrentTime==="number" ? window.audioCurrentTime : 0;
window.isAudioPlaying=typeof window.isAudioPlaying==="boolean" ? window.isAudioPlaying : false;
window.loadedChats=window.loadedChats||{};
window.chatMessagesCache=window.chatMessagesCache||{};
window.onlineUsersListRef=window.onlineUsersListRef||null;
window.allOnlineUsers=window.allOnlineUsers||[];
window.displayedUsers=typeof window.displayedUsers==="number" ? window.displayedUsers : 0;
window.onlineUsersLoadComplete=typeof window.onlineUsersLoadComplete==="boolean" ? window.onlineUsersLoadComplete : false;
window.isOnlineUserAdded=typeof window.isOnlineUserAdded==="boolean" ? window.isOnlineUserAdded : false;
window.isAppLocked=localStorage.getItem("isAppLocked")==="true";
window.isOnlineViewActive=typeof window.isOnlineViewActive==="boolean" ? window.isOnlineViewActive : false;
window.activeChatListeners=window.activeChatListeners||{};
window.lastAutoDeleteDates=window.lastAutoDeleteDates||{};
try{window.lastAutoDeleteDates=JSON.parse(localStorage.getItem("lastAutoDeleteDates")||"{}")||{};}catch(e){window.lastAutoDeleteDates={};}
window.isAutoDeleteRunning=window.isAutoDeleteRunning||false;
window.MAX_ONLINE_USERS=window.MAX_ONLINE_USERS||20;
window.USERS_PER_PAGE=window.USERS_PER_PAGE||20;
window.APP_FONT_STYLES={
default: "Arial,sans-serif",
bold: "Arial,sans-serif",
mono: "'Courier New',monospace",
serif: "Georgia,serif",
cursive: "cursive",
narrow: "Arial,sans-serif",
fantasy: "fantasy",
sansserif: "sans-serif",
custom1: "'DejaVu Sans',sans-serif"
};
window.APP_FONT_BOLD={bold: true,narrow: true};
window.applyAppFontPreferences=function(sizePx,styleKey){
var VALID_SIZES=[10,12,14,16,18];
var size=parseInt(sizePx,10);
if(VALID_SIZES.indexOf(size)===-1){
size=parseInt(localStorage.getItem("chitchat_font_size")||"0",10);
if(VALID_SIZES.indexOf(size)===-1)size=12;
}
var storedStyle=localStorage.getItem("chitchat_font_style")||"default";
var style=window.APP_FONT_STYLES[styleKey]? styleKey : storedStyle;
if(!window.APP_FONT_STYLES[style])style="default";
localStorage.setItem("chitchat_font_size",String(size));
localStorage.setItem("chitchat_font_style",style);
var family=window.APP_FONT_STYLES[style];
var tag=document.getElementById("__appFontStyle");
if(!tag){
tag=document.createElement("style");
tag.id="__appFontStyle";
document.head.appendChild(tag);
}
tag.textContent="*{font-family: "+family+"!important;font-size: "+size+"px!important;}";
return{size: size,style: style,family: family};
};
window.resetAppFontPreferences=function(){
localStorage.removeItem("chitchat_font_size");
localStorage.removeItem("chitchat_font_style");
var tag=document.getElementById("__appFontStyle");
if(tag)tag.parentNode.removeChild(tag);
};
(function(){
var savedSize=parseInt(localStorage.getItem("chitchat_font_size")||"",10);
var savedStyle=localStorage.getItem("chitchat_font_style");
if([10,12,14,16,18].indexOf(savedSize)!==-1||savedStyle){
window.applyAppFontPreferences([10,12,14,16,18].indexOf(savedSize)!==-1 ? savedSize : null,savedStyle||"default");
}
})();
var welcomePage=document.getElementById("welcomePage");
var loginPage=document.getElementById("loginPage");
var signUpPage=document.getElementById("signUpPage");
var mainPage=document.getElementById("mainPage");
var chatPage=document.getElementById("chatPage");
var chatHeader=document.getElementById("chatHeader");
var signUpNavButton=document.getElementById("signUpNavButton");
var loginNavButton=document.getElementById("loginNavButton");
var usernameInputLogin=document.getElementById("usernameInputLogin");
var passwordInputLogin=document.getElementById("passwordInputLogin");
var loginButton=document.getElementById("loginButton");
var usernameInputSignUp=document.getElementById("usernameInputSignUp");
var passwordInputSignUp=document.getElementById("passwordInputSignUp");
var signUpButton=document.getElementById("signUpButton");
var chatBox=document.getElementById("chatBox");
var privateChatList=document.getElementById("privateChatList");
var messageInput=document.getElementById("messageInput");
var imageButton=document.getElementById("imageButton");
var sendButton=document.getElementById("sendButton");
var changeBackgroundButton=document.getElementById("changeBackgroundButton");
var softKeysContainer=document.getElementById("softKeysContainer");
var softkeyLeft=document.getElementById("softkey-left");
var softkeyRight=document.getElementById("softkey-right");
var notificationContainer=document.getElementById("notificationContainer");
var dropdownMenu=document.getElementById("dropdownMenu");
var replyInputPreview=document.getElementById("replyInputPreview");
var connectionStatus=document.getElementById("connectionStatus");
var searchContainer=document.getElementById("searchContainer");
var searchInput=document.getElementById("searchInput");
var searchResults=document.getElementById("searchResults");
var searchButton=document.getElementById("searchButton");
var appLockContainer=document.getElementById("appLockContainer");
var appLockInput=document.getElementById("appLockInput");
var appLockSubmit=document.getElementById("appLockSubmit");
var appLockCancel=document.getElementById("appLockCancel");
var loadingMessages=document.getElementById("loadingMessages");
var profileViewContainer=document.getElementById("profileViewContainer");
var profileImageView=document.getElementById("profileImageView");
var profileNameText=document.getElementById("profileNameText");
var profileAboutText=document.getElementById("profileAboutText");
var profileBackButton=document.getElementById("profileBackButton");
var profileEditContainer=document.getElementById("profileEditContainer");
var profileImageEditContainer=document.getElementById("profileImageEditContainer");
var profileImageEdit=document.getElementById("profileImageEdit");
var changeProfilePicButton=document.getElementById("changeProfilePicButton");
var profileAboutInput=document.getElementById("profileAboutInput");
var profileSaveButton=document.getElementById("profileSaveButton");
var statusViewContainer=document.getElementById("statusViewContainer");
var statusImageView=document.getElementById("statusImageView");
var statusBackButton=document.getElementById("statusBackButton");
var statusAddContainer=document.getElementById("statusAddContainer");
var statusImagePreview=document.getElementById("statusImagePreview");
var statusTextInput=document.getElementById("statusTextInput");
var statusSaveButton=document.getElementById("statusSaveButton");
var statusDeleteButton=document.getElementById("statusDeleteButton");
var statusNextButton=document.getElementById("statusNextButton");
var statusFooter=document.getElementById("statusFooter");
var statusViewsButton=document.getElementById("statusViewsButton");
var softkeyCenter=document.getElementById("softkey-center");
window.welcomePage=welcomePage;
window.loginPage=loginPage;
window.signUpPage=signUpPage;
window.mainPage=mainPage;
window.chatPage=chatPage;
window.chatHeader=chatHeader;
window.signUpNavButton=signUpNavButton;
window.loginNavButton=loginNavButton;
window.usernameInputLogin=usernameInputLogin;
window.passwordInputLogin=passwordInputLogin;
window.loginButton=loginButton;
window.usernameInputSignUp=usernameInputSignUp;
window.passwordInputSignUp=passwordInputSignUp;
window.signUpButton=signUpButton;
window.chatBox=chatBox;
window.privateChatList=privateChatList;
window.messageInput=messageInput;
window.imageButton=imageButton;
window.sendButton=sendButton;
window.changeBackgroundButton=changeBackgroundButton;
window.softKeysContainer=softKeysContainer;
window.softkeyLeft=softkeyLeft;
window.softkeyRight=softkeyRight;
window.notificationContainer=notificationContainer;
window.dropdownMenu=dropdownMenu;
window.replyInputPreview=replyInputPreview;
window.connectionStatus=connectionStatus;
window.searchContainer=searchContainer;
window.searchInput=searchInput;
window.searchResults=searchResults;
window.searchButton=searchButton;
window.appLockContainer=appLockContainer;
window.appLockInput=appLockInput;
window.appLockSubmit=appLockSubmit;
window.appLockCancel=appLockCancel;
window.loadingMessages=loadingMessages;
window.profileViewContainer=profileViewContainer;
window.profileImageView=profileImageView;
window.profileNameText=profileNameText;
window.profileAboutText=profileAboutText;
window.profileBackButton=profileBackButton;
window.profileEditContainer=profileEditContainer;
window.profileImageEditContainer=profileImageEditContainer;
window.profileImageEdit=profileImageEdit;
window.changeProfilePicButton=changeProfilePicButton;
window.profileAboutInput=profileAboutInput;
window.profileSaveButton=profileSaveButton;
window.statusViewContainer=statusViewContainer;
window.statusImageView=statusImageView;
window.statusBackButton=statusBackButton;
window.statusAddContainer=statusAddContainer;
window.statusImagePreview=statusImagePreview;
window.statusTextInput=statusTextInput;
window.statusSaveButton=statusSaveButton;
window.statusDeleteButton=statusDeleteButton;
window.statusNextButton=statusNextButton;
window.statusFooter=statusFooter;
window.statusViewsButton=statusViewsButton;
window.softkeyCenter=softkeyCenter;
function setupSoftkeyTouch(el,keyName){
if(!el)return;
el.addEventListener("click",function(e){
e.preventDefault();
var evt=new KeyboardEvent("keydown",{
key: keyName,bubbles: true,cancelable: true
});
document.dispatchEvent(evt);
});
}
document.addEventListener("click",function(e){
var t=e.target;
if(t&&t.id==="welcomeSelectLabel"){
var focused=document.activeElement;
if(focused)focused.click();
}
if(t&&t.id==="loginSubmitLabel"){loginButton.click();}
if(t&&t.id==="loginToSignupLabel"){
loginPage.classList.remove("active");
signUpPage.classList.add("active");
usernameInputSignUp.focus();
}
if(t&&t.id==="loginShowPassLabel"){
var inp=passwordInputLogin;
inp.type=inp.type==="password" ? "text" : "password";
}
if(t&&t.id==="signupSubmitLabel"){signUpButton.click();}
if(t&&t.id==="signupToLoginLabel"){
signUpPage.classList.remove("active");
loginPage.classList.add("active");
usernameInputLogin.focus();
}
if(t&&t.id==="signupShowPassLabel"){
var inp2=passwordInputSignUp;
inp2.type=inp2.type==="password" ? "text" : "password";
}
});
setupSoftkeyTouch(softkeyLeft,"SoftLeft");
setupSoftkeyTouch(softkeyRight,"SoftRight");
setupSoftkeyTouch(softkeyCenter,"Enter");
var uid=localStorage.getItem("uid");
var username=localStorage.getItem("username");
window.uid=uid;
window.username=username;
// Cross-page fast-search index self-heal (groups + private chat share this).
// Only writes when the cached value is actually missing/stale — no duplicates,
// no extra reads on every load beyond one small existence check.
if(uid && username){
var __lower=username.toLowerCase();
db.ref("usernameIndex/"+__lower).once("value").then(function(s){
if(s.val()!==uid){ db.ref("usernameIndex/"+__lower).set(uid); }
}).catch(function(){});
}
})();
(function(){
var DB_NAME="chitchat_db";
var DB_VERSION=1;
var STORE="messages";
var _db=null;
function openDB(cb){
if(_db){cb(_db);return;}
try{
var req=indexedDB.open(DB_NAME,DB_VERSION);
req.onupgradeneeded=function(e){
var db=e.target.result;
if(!db.objectStoreNames.contains(STORE)){
db.createObjectStore(STORE,{keyPath: "key"});
}
};
req.onsuccess=function(e){_db=e.target.result;cb(_db);};
req.onerror=function(){cb(null);};
}catch(e){cb(null);}
}
window.idbSet=function(key,value){
openDB(function(db){
if(!db){
try{localStorage.setItem("idb_"+key,JSON.stringify(value));}catch(e){}
return;
}
try{
var tx=db.transaction(STORE,"readwrite");
tx.objectStore(STORE).put({key: key,value: value,ts: Date.now()});
}catch(e){
try{localStorage.setItem("idb_"+key,JSON.stringify(value));}catch(e2){}
}
});
};
window.idbGet=function(key,cb){
openDB(function(db){
if(!db){
try{
var raw=localStorage.getItem("idb_"+key);
cb(raw ? JSON.parse(raw): null);
}catch(e){cb(null);}
return;
}
try{
var tx=db.transaction(STORE,"readonly");
var req=tx.objectStore(STORE).get(key);
req.onsuccess=function(e){cb(e.target.result ? e.target.result.value : null);};
req.onerror=function(){cb(null);};
}catch(e){cb(null);}
});
};
window.idbDelete=function(key){
openDB(function(db){
if(!db){try{localStorage.removeItem("idb_"+key);}catch(e){}return;}
try{var tx=db.transaction(STORE,"readwrite");tx.objectStore(STORE).delete(key);}catch(e){}
});
};
})();
// Fix 3: querySelector Cache — direct map instead of DOM scan
window._chatElements = {};
window._getChatEl = function(uid) {
  if (window._chatElements[uid] && document.contains(window._chatElements[uid])) {
    return window._chatElements[uid];
  }
  var el = document.querySelector('.user.navItem[data-uid="' + uid + '"]');
  if (el) window._chatElements[uid] = el;
  return el;
};
window._registerChatEl = function(uid, el) {
  window._chatElements[uid] = el;
};
window._removeChatEl = function(uid) {
  delete window._chatElements[uid];
};

// ===== Focus trap for full-screen overlays =====
// KaiOS's D-pad "spatial navigation" can move focus to elements underneath a
// full-screen overlay (dialogs, image/video viewers, share pickers) even
// though the overlay visually covers the whole screen and the JS keydown
// handler calls preventDefault()/stopPropagation() — the OS's own focus
// engine can pick the next target independently of JS. Temporarily disabling
// every other focusable element's tabindex while the overlay is open removes
// anywhere else for focus to go.
window._focusTrap = (function(){
var stack=[];
function suppress(containerEl){
var disabled=[];
var all=document.querySelectorAll("[tabindex]");
for(var i=0;i<all.length;i++){
var el=all[i];
if(containerEl&&containerEl.contains&&containerEl.contains(el))continue;
var cur=el.getAttribute("tabindex");
if(cur===null)continue;
if(parseInt(cur,10)<0)continue;
el.setAttribute("data-savedtabindex",cur);
el.setAttribute("tabindex","-1");
disabled.push(el);
}
stack.push(disabled);
}
function restore(){
var disabled=stack.pop();
if(!disabled)return;
disabled.forEach(function(el){
var saved=el.getAttribute("data-savedtabindex");
if(saved!==null)el.setAttribute("tabindex",saved);
el.removeAttribute("data-savedtabindex");
});
}
return {suppress: suppress,restore: restore};
})();

// ===== Resume / reconnect: intentionally NOT duplicated here =====
// This used to be its own separate "Resume / reconnect safety net" IIFE
// with its own visibilitychange/pageshow/focus/online listeners — a
// second, independent system running alongside startPresenceKeepAlive()
// in js/android-touch.js. Worse, on every resume after 45s+ hidden it
// deliberately called db.goOffline() and then db.goOnline() 80ms later
// to force-cycle the connection — which is *why* the app always showed
// "Connection lost… / Reconnecting…" after being minimized for a
// while: that message wasn't a bug being triggered, it was this code
// intentionally causing a real disconnect every single time, left over
// from KaiOS's much flakier network stack where that used to be
// necessary. Removed. The single source of truth for reconnect/resume
// behavior is now startPresenceKeepAlive() in android-touch.js, which
// re-establishes presence and re-syncs data WITHOUT ever forcing a
// disconnect — Firebase's own client keeps the live connection intact
// the whole time the tab is open, exactly as requested.

// ═══════════════════════════════════════════════════════════════════
// WhatsApp-style Media Cache — IndexedDB "media" object store
// Saves image/video/voice blobs locally so they never re-download.
// Usage:
//   window.mediaCacheSave(msgId, type, blob, url)
//   window.mediaCacheGet(msgId, cb)   → cb(blob|null, url|null)
// ═══════════════════════════════════════════════════════════════════
(function(){
var MEDIA_DB="chitchat_media";
var MEDIA_VER=1;
var MEDIA_STORE="media_blobs";
var _mdb=null;
function openMediaDB(cb){
  if(_mdb){cb(_mdb);return;}
  try{
    var r=indexedDB.open(MEDIA_DB,MEDIA_VER);
    r.onupgradeneeded=function(e){
      var d=e.target.result;
      if(!d.objectStoreNames.contains(MEDIA_STORE)){
        var os=d.createObjectStore(MEDIA_STORE,{keyPath:"msgId"});
        os.createIndex("ts","ts",{unique:false});
      }
    };
    r.onsuccess=function(e){_mdb=e.target.result;cb(_mdb);};
    r.onerror=function(){cb(null);};
  }catch(e){cb(null);}
}
window.mediaCacheSave=function(msgId,type,blob,remoteUrl){
  if(!msgId||!blob)return;
  openMediaDB(function(db){
    if(!db)return;
    try{
      var tx=db.transaction(MEDIA_STORE,"readwrite");
      tx.objectStore(MEDIA_STORE).put({
        msgId:msgId,type:type,blob:blob,
        remoteUrl:remoteUrl||"",ts:Date.now()
      });
    }catch(e){}
  });
};
window.mediaCacheGet=function(msgId,cb){
  if(!msgId){cb(null,null);return;}
  openMediaDB(function(db){
    if(!db){cb(null,null);return;}
    try{
      var tx=db.transaction(MEDIA_STORE,"readonly");
      var req=tx.objectStore(MEDIA_STORE).get(msgId);
      req.onsuccess=function(e){
        var r=e.target.result;
        if(r&&r.blob){cb(r.blob,r.remoteUrl||"");}
        else{cb(null,null);}
      };
      req.onerror=function(){cb(null,null);};
    }catch(e){cb(null,null);}
  });
};
// Prune cache entries older than 30 days on startup (keep storage lean)
window.mediaCachePrune=function(){
  openMediaDB(function(db){
    if(!db)return;
    try{
      var cutoff=Date.now()-30*24*60*60*1000;
      var tx=db.transaction(MEDIA_STORE,"readwrite");
      var idx=tx.objectStore(MEDIA_STORE).index("ts");
      var range=IDBKeyRange.upperBound(cutoff);
      idx.openCursor(range).onsuccess=function(e){
        var cur=e.target.result;
        if(cur){cur.delete();cur.continue();}
      };
    }catch(e){}
  });
};
setTimeout(window.mediaCachePrune,8000);
})();
