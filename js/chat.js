function setupPresence(){
var presenceRef=db.ref("presence1/"+uid);
var connectedRef=db.ref(".info/connected");
connectedRef.on("value",function(snap){
if(snap.val()===true){
var nowTs=Date.now();
presenceRef.set({online:true,lastSeen:nowTs,currentChat:currentOpenChatUid,username:username});
addToOnlineUsers();
// onDisconnect runs only when Firebase truly loses connection (not on minimize)
presenceRef.onDisconnect().set({online:false,lastSeen:firebase.database.ServerValue.TIMESTAMP,currentChat:null,username:username});
db.ref("online_users/"+uid).onDisconnect().remove();
}else{
if(document.hidden)return;
presenceRef.update({online:false,lastSeen:Date.now()});
}
});
// Heartbeat: keep presence alive every 45s (prevents Firebase 60s idle disconnect)
var _presenceInterval=setInterval(function(){
if(!uid)return;
var ts=Date.now();
db.ref("presence1/"+uid).update({lastSeen:ts,online:true});
db.ref("online_users/"+uid).update({lastSeen:ts,timestamp:ts});
},45000);
// ── On visibility/focus change: presence + reconnect handling now lives
// entirely in startPresenceKeepAlive() (js/android-touch.js). That system
// is debounced/throttled and re-attaches listeners exactly once per
// foreground return via fetchFromFirebaseAndSync(). This function used to
// have its own separate visibilitychange handler that ALSO re-attached
// attachLiveListenersForCurrentChat() and attachPrivateChatListeners() on
// every single resume — running two independent re-attachment systems on
// the same event caused listeners to double-fire, which is what was
// behind the repeated "Reconnecting… / Synchronizing…" cycles taking
// longer than necessary, and also contributed to newly-arrived messages
// not rendering promptly when a chat was reopened.
}
window._presenceCache={};
var _presenceListeners={};
// ===== restoreTabBar — was undefined everywhere, caused ReferenceError on back =====
function restoreTabBar(){
var tb=document.getElementById("mainTabBar");
if(tb)tb.style.display="flex";
}
window.restoreTabBar=restoreTabBar;
// ===== Scoped arrow navigation for chat list (.user.navItem elements) =====
function navigateChatList(offset){
var ae=document.activeElement;
if(!ae)return false;
var list=Array.from(document.querySelectorAll("#privateChatList .user.navItem"));
if(!list.length)return false;
// Try direct match
var idx=list.indexOf(ae);
if(idx===-1){
// Walk up — ae might be a child of a navItem
var el=ae;
while(el&&el!==document.body){
idx=list.indexOf(el);
if(idx!==-1)break;
el=el.parentElement;
}
}
if(idx===-1)return false;
var next=list[idx+offset];
if(next){next.focus();return true;}
return false;
}

var bdg=document.getElementById("newMsgBadge");
var unread=0;
window.__skipAutoScrollOnDisplay=false;
function isChatBoxAtBottom(){
if(!chatBox)return true;
return (chatBox.scrollHeight-chatBox.scrollTop-chatBox.clientHeight)<40;
}
function hideNewMsgBadge(){
unread=0;
if(bdg)bdg.style.display="none";
}
function showNewMsgBadge(){
if(!bdg)return;
unread++;
bdg.innerText="("+unread+")";
bdg.style.display="block";
}
if(bdg){
bdg.onclick=function(){
chatBox.scrollTop=chatBox.scrollHeight;
hideNewMsgBadge();
};
}
if(chatBox){
chatBox.addEventListener("scroll",function(){
if(isChatBoxAtBottom()){
hideNewMsgBadge();
var nmBar=document.getElementById("newMsgBar");
if(nmBar)nmBar.style.display="none";
}
});
}
// ===== Copy / Paste helpers (in-app clipboard with real-clipboard fallback) =====
window.__appClipboardText="";
function copyTextToClipboard(text){
if(!text)return;
window.__appClipboardText=text;
try{
if(navigator.clipboard&&navigator.clipboard.writeText){
navigator.clipboard.writeText(text).catch(function(){});
}else{
var ta=document.createElement("textarea");
ta.value=text;
ta.style.position="fixed";
ta.style.left="-9999px";
document.body.appendChild(ta);
ta.focus();ta.select();
try{document.execCommand("copy");}catch(e){}
document.body.removeChild(ta);
}
}catch(e){}
if(typeof showNotification==="function")showNotification("Copied");
}
function pasteIntoInput(inputEl){
if(!inputEl)return;
function insertText(text){
if(!text)return;
var start=inputEl.selectionStart;
var end=inputEl.selectionEnd;
if(typeof start!=="number"){
inputEl.value=(inputEl.value||"")+text;
}else{
var val=inputEl.value||"";
inputEl.value=val.slice(0,start)+text+val.slice(end);
try{inputEl.setSelectionRange(start+text.length,start+text.length);}catch(e){}
}
try{inputEl.dispatchEvent(new Event("input",{bubbles:true}));}catch(e){}
}
try{
if(navigator.clipboard&&navigator.clipboard.readText){
navigator.clipboard.readText().then(function(text){
insertText(text||window.__appClipboardText);
}).catch(function(){
insertText(window.__appClipboardText);
});
return;
}
}catch(e){}
insertText(window.__appClipboardText);
}
// ===== Multi-select messages (select + bulk delete) =====
var selectModeActive=false;
var selectedMessageIds={};
function toggleMessageSelected(messageId,messageElement){
if(selectedMessageIds[messageId]){
delete selectedMessageIds[messageId];
messageElement.classList.remove("msg-selected");
}else{
selectedMessageIds[messageId]=true;
messageElement.classList.add("msg-selected");
}
updateSelectModeSoftkeys();
}
function updateSelectModeSoftkeys(){
var count=Object.keys(selectedMessageIds).length;
softkeyLeft.innerHTML="Cancel";
softkeyCenter.innerHTML=count>0 ? ("Selected ("+count+")") : "Select";
softkeyRight.innerHTML="Delete";
}
function enterSelectMode(initialMessageId,initialMessageElement){
selectModeActive=true;
selectedMessageIds={};
if(initialMessageId&&initialMessageElement){
toggleMessageSelected(initialMessageId,initialMessageElement);
}else{
updateSelectModeSoftkeys();
}
}
function exitSelectMode(){
selectModeActive=false;
var selEls=chatBox.querySelectorAll(".msg-selected");
for(var si=0;si<selEls.length;si++)selEls[si].classList.remove("msg-selected");
selectedMessageIds={};
if(chatPage._updateChatSoftkeys)chatPage._updateChatSoftkeys();
}
function bulkDeleteSelected(){
var ids=Object.keys(selectedMessageIds);
if(ids.length===0){
if(typeof showNotification==="function")showNotification("Select messages first");
return;
}
var allOwn=ids.every(function(id){
var el=document.getElementById("msg-"+id);
return el&&el.dataset&&el.dataset.from===uid;
});
var opts=allOwn?["Delete for Me","Delete for Everyone"]:["Delete for Me"];
showDropdown(opts,function(index){
hideDropdown();
if(opts[index]==="Delete for Me"){
ids.forEach(function(id){
deleteMessageForMe(id);
var el=document.getElementById("msg-"+id);
if(el&&el.parentElement)el.parentElement.remove();
});
}else if(opts[index]==="Delete for Everyone"){
ids.forEach(function(id){deleteMessageForEveryone(id);});
}
var n=ids.length;
exitSelectMode();
if(typeof showNotification==="function")showNotification(n+" message(s) deleted");
});
}
// ===== Multi-select chats on main page (select + bulk delete) =====
var chatListSelectModeActive=false;
var selectedChatUids={};
function toggleChatSelected(chatUid,navItemEl){
if(selectedChatUids[chatUid]){
delete selectedChatUids[chatUid];
navItemEl.classList.remove("chat-selected");
}else{
selectedChatUids[chatUid]=true;
navItemEl.classList.add("chat-selected");
}
updateChatListSelectSoftkeys();
}
function updateChatListSelectSoftkeys(){
var count=Object.keys(selectedChatUids).length;
softkeyLeft.innerHTML=count>0 ? "Delete ("+count+")" : "Select";
softkeyCenter.innerHTML=count>0 ? ("Sel:"+count) : "";
softkeyRight.innerHTML="Cancel";
}
function enterChatListSelectMode(){
chatListSelectModeActive=true;
selectedChatUids={};
updateChatListSelectSoftkeys();
}
function exitChatListSelectMode(){
chatListSelectModeActive=false;
var els=document.querySelectorAll(".chat-selected");
for(var i=0;i<els.length;i++)els[i].classList.remove("chat-selected");
selectedChatUids={};
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online";
var focused=document.activeElement;
if(focused&&focused.classList&&focused.classList.contains("user")){
softkeyLeft.innerHTML="Options";
softkeyRight.innerHTML="Online User";
}
}
function bulkDeleteSelectedChats(){
var uidsToDelete=Object.keys(selectedChatUids);
if(uidsToDelete.length===0){
if(typeof showNotification==="function")showNotification("Select chats first");
return;
}
showConfirmPrompt("Delete "+uidsToDelete.length+" chat(s)?",function(confirmed){
if(!confirmed)return;
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
uidsToDelete.forEach(function(cu){
db.ref("conversations/"+uid+"/"+cu).remove();
db.ref("privateChats/"+uid+"/"+cu).remove();
delete localChats[cu];
var el=window._getChatEl?window._getChatEl(cu):null;
if(el)el.remove();
});
localStorage.setItem("privateChats",JSON.stringify(localChats));
var n2=uidsToDelete.length;
exitChatListSelectMode();
if(typeof showNotification==="function")showNotification(n2+" chat(s) deleted");
setTimeout(function(){
if(typeof focusPrivateChatsLanding==="function")focusPrivateChatsLanding();
},200);
});
}

function setupGlobalPresenceManager(){
Object.keys(_presenceListeners).forEach(function(k){
try{_presenceListeners[k].off();}catch(e){}
});
_presenceListeners={};
function watchPresence(partnerUid){
if(_presenceListeners[partnerUid])return;
var ref=db.ref("presence1/"+partnerUid);
_presenceListeners[partnerUid]=ref;
ref.on("value",function(s){
var data=s.val()||{};
var isOnline=!!data.online;
window._presenceCache[partnerUid]=isOnline;
var el=window._getChatEl(partnerUid);
if(!el)return;
el._isOnline=isOnline;
var badge=el.querySelector(".unread-count");
var currentUnread=badge&&badge.style.display!=="none" ? (parseInt(badge.textContent)||0): 0;
applyChatRowState(el,partnerUid,currentUnread,isOnline);
});
}
setTimeout(function(){
if(window.allPrivateChats){
window.allPrivateChats.forEach(function(c){watchPresence(c.uid);});
}
window._watchPresenceFor=watchPresence;
},500);
}
function setTypingStatus(userUid,isTyping,partnerUid){
if(isTyping){
db.ref("presence1/"+userUid).update({
typing: true,
typingTo: partnerUid
});
}else{
db.ref("presence1/"+userUid).update({
typing: false,
typingTo: null
});
}
}
function setRecordingStatus(userUid,isRecording,partnerUid){
if(isRecording){
db.ref("presence1/"+userUid).update({
recording: true,
recordingTo: partnerUid
});
}else{
db.ref("presence1/"+userUid).update({
recording: false,
recordingTo: null
});
}
}
function showTypingIndicator(partnerUid){
var typingRef=db.ref("presence1/"+partnerUid);
typingRef.on("value",function(snap){
var data=snap.val();
var wasAtBottom=isChatBoxAtBottom();
var typingIndicator=chatBox.querySelector(".typing-indicator");
var recordingIndicator=chatBox.querySelector(".recording-indicator");
if(data&&data.typing&&data.typingTo===uid&&currentChatUid===partnerUid){
if(!typingIndicator){
typingIndicator=document.createElement("div");
typingIndicator.className="typing-indicator";
typingIndicator.innerHTML='<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';
chatBox.appendChild(typingIndicator);
if(wasAtBottom){chatBox.scrollTop=chatBox.scrollHeight;}
}
}else if(typingIndicator){
chatBox.removeChild(typingIndicator);
}
if(data&&data.recording&&data.recordingTo===uid&&currentChatUid===partnerUid){
if(!recordingIndicator){
recordingIndicator=document.createElement("div");
recordingIndicator.className="recording-indicator";
recordingIndicator.textContent=data.username+" is recording a voice message...";
chatBox.appendChild(recordingIndicator);
}
}else if(recordingIndicator){
chatBox.removeChild(recordingIndicator);
}
if(wasAtBottom){chatBox.scrollTop=chatBox.scrollHeight;}
});
}
function isUserBlocked(blockerUid,blockedUid){
return db.ref("blocked/"+blockerUid+"/"+blockedUid).once("value").then(function(snapshot){
return snapshot.exists();
});
}
function blockUser(blockerUid,blockedUid){
db.ref("blocked/"+blockerUid+"/"+blockedUid).set(true);
db.ref("conversations/"+blockerUid+"/"+blockedUid).remove();
db.ref("conversations/"+blockedUid+"/"+blockerUid).remove();
db.ref("privateChats/"+blockerUid+"/"+blockedUid).remove();
db.ref("privateChats/"+blockedUid+"/"+blockerUid).remove();
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
delete localChats[blockedUid];
localStorage.setItem("privateChats",JSON.stringify(localChats));
// FIX: this block previously referenced undefined variables
// (partnerUid/partnerUsername — never declared in this function's
// scope) which threw a ReferenceError every time a user was
// blocked. Because it was wrapped in try/catch, the error was
// swallowed silently, so cachedContacts never actually got updated
// and the blocked user's stale entry could resurface as a contact
// after the app was reopened. A blocked user should simply be
// removed from the cached contacts list entirely.
try{
var cachedContacts=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
cachedContacts=cachedContacts.filter(function(c){return !c||c.uid!==blockedUid;});
localStorage.setItem("cachedContacts",JSON.stringify(cachedContacts));
}catch(e){}
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",localChats);}catch(e){}
}
var userElement=window._getChatEl(blockedUid);
if(userElement){
userElement.remove();
}
hideDropdown();
showNotification("User blocked successfully.");
setTimeout(function(){
focusPrivateChatsLanding();
},2000);
}
function unblockUser(blockerUid,blockedUid){
db.ref("blocked/"+blockerUid+"/"+blockedUid).remove();
db.ref("privateChats/"+blockerUid+"/"+blockedUid).once("value",function(snapshot){
if(snapshot.exists()){
var chatData=snapshot.val()||{};
db.ref("presence1/"+blockedUid).once("value",function(presenceSnap){
var partnerData=presenceSnap.val()||{};
var partnerName=chatData.username||partnerData.username||"User";
createChatElement(blockedUid,partnerName,!!partnerData.online);
});
}
});
}
function formatLastSeen(timestamp){
if(!timestamp||typeof timestamp!=='number')return "Never";
const now=Date.now();
const diff=now-timestamp;
const seconds=Math.floor(diff/1000);
const minutes=Math.floor(seconds/60);
const hours=Math.floor(minutes/60);
const days=Math.floor(hours/24);
const weeks=Math.floor(days/7);
const months=Math.floor(days/30);
if(seconds<5){
return "Just now";
}else if(seconds<60){
return seconds+" seconds ago";
}else if(minutes<5){
return "recently active";
}else if(hours<24){
if(minutes<6){
return minutes+" min ago";
}
const date=new Date(timestamp);
const hours12=date.getHours()% 12||12;
const minutesFormatted=date.getMinutes().toString().padStart(2,'0');
const ampm=date.getHours()>=12 ? 'pm' : 'am';
return hours12+":"+minutesFormatted+ampm;
}else if(days<7){
return days+" day"+(days>1 ? "s" : "")+" ago";
}else if(weeks<4){
return weeks+" week"+(weeks>1 ? "s" : "")+" ago";
}else if(months<12){
return months+" month"+(months>1 ? "s" : "")+" ago";
}else{
const date=new Date(timestamp);
const month=date.getMonth()+1;
const day=date.getDate();
const year=date.getFullYear();
return month+"/"+day+"/"+year;
}
}
function formatSendTime(timestamp){
if(!timestamp||typeof timestamp==='object'){
timestamp=Date.now();
}
var date=new Date(timestamp);
return date.toLocaleTimeString([],{hour: '2-digit',minute: '2-digit'});
}
function formatStatusTime(timestamp){
if(!timestamp)return "Just now";
var now=Date.now();
var diff=now-timestamp;
var seconds=Math.floor(diff/1000);
var minutes=Math.floor(seconds/60);
var hours=Math.floor(minutes/60);
var days=Math.floor(hours/24);
if(seconds<60){
return "Just now";
}else if(minutes<60){
return minutes+" min ago";
}else if(hours<24){
return hours+" hour"+(hours>1 ? "s" : "")+" ago";
}else if(days<7){
return days+" day"+(days>1 ? "s" : "")+" ago";
}else{
var date=new Date(timestamp);
return date.toLocaleDateString([],{month: 'short',day: 'numeric'});
}
}
function getDirectChatRoomId(uidA,uidB){
if(!uidA||!uidB)return uidA||uidB||"";
return [String(uidA),String(uidB)].sort().join("_");
}
function buildPrivateChatPreviewText(messageData,fromUid){
if(!messageData)return "";
var prefix=messageData.from===fromUid ? "You: " : "";
if(messageData.mediaType==="image")return prefix+"📷 Photo";
if(messageData.mediaType==="voice")return prefix+"🎤 Voice";
if(messageData.mediaType==="video")return prefix+"🎬 Video";
if(messageData.statusReply&&messageData.message){
return prefix+messageData.message;
}
return prefix+(messageData.message||messageData.lastMessage||"");
}
function syncPrivateChatEntry(ownerUid,partnerUid,data,mirror){
if(!ownerUid||!partnerUid||!data)return Promise.resolve(false);
var now=Date.now();
var entry={
username: data.username||data.name||partnerUid,
profilePic: data.profilePic||null,
online: typeof data.online==="boolean" ? data.online : false,
lastMessage: data.lastMessage||"",
timestamp: typeof data.timestamp==="number" ? data.timestamp : now,
lastMessageAt: typeof data.lastMessageAt==="number" ? data.lastMessageAt : (typeof data.timestamp==="number" ? data.timestamp : now),
unreadCount: ("unreadCount" in data) ? data.unreadCount : 0,
chatRoomId: data.chatRoomId||getDirectChatRoomId(ownerUid,partnerUid)
};
var updates={};
updates["privateChats/"+ownerUid+"/"+partnerUid]=entry;
if(mirror){
updates["privateChats/"+partnerUid+"/"+ownerUid]=Object.assign({},entry,{
username: data.mirrorUsername||data.username||data.name||"User",
unreadCount: typeof data.mirrorUnreadCount==="number" ? data.mirrorUnreadCount : 0
});
}
return db.ref().update(updates).then(function(){return true;}).catch(function(){return false;});
}
function applyPrivateChatRowMeta(userElement,partnerUid,entry){
if(!userElement||!entry)return;
var nameSpan=userElement.querySelector(".user-name");
if(nameSpan&&entry.username&&entry.username!=="User"){
nameSpan.textContent=entry.username;
}
if(entry.profilePic){
var rowPic=userElement.querySelector(".profile-pic-small");
if(rowPic)rowPic.src=entry.profilePic;
try{localStorage.setItem("profilePic_"+partnerUid,entry.profilePic);}catch(e){}
}
var lastMsgSpan=userElement.querySelector(".chat-last-msg");
var timeSpan=userElement.querySelector(".chat-time");
if(lastMsgSpan){
lastMsgSpan.style.display="none";
lastMsgSpan.textContent="";
}
if(timeSpan){
timeSpan.style.display="none";
timeSpan.textContent="";
}
if(typeof entry.unreadCount==="number"){
// The entry.online flag is written by whoever last synced the chat
// (almost always the message sender, who passes no online value → false).
// Trusting it would keep reverting a row to black the moment a new
// message arrives even when the person is genuinely online. The live
// presence listener keeps userElement._isOnline authoritative instead.
//
// FIX: this privateChats/{uid}/{partner} summary listener runs
// alongside a separate, faster conversations/{uid}/{partner} listener
// that turns the row red the instant a message is written. This
// summary path can lag (its own unreadCount field sometimes updates a
// beat later, in a separate write), and when it fires with an old,
// still-zero count AFTER the row was already correctly turned red, it
// was silently reverting the name back to green — the exact "turns
// red then immediately green" bug. Never let this listener downgrade
// a count that's already showing on screen; only markMessagesAsSeen
// (an explicit, deliberate "read" action) is allowed to clear it.
var domUnreadShown=0;
var domCountSpan=userElement.querySelector(".unread-count");
if(domCountSpan&&domCountSpan.style.display!=="none")domUnreadShown=1;
var nameHasUnread=!!(nameSpan&&nameSpan.classList.contains("chat-username-unread"));
var knownUnread=window._chatLastKnownUnread&&window._chatLastKnownUnread[partnerUid]||0;
var effectiveUnread=Math.max(entry.unreadCount||0,domUnreadShown,nameHasUnread?1:0,knownUnread);
applyChatRowState(userElement,partnerUid,effectiveUnread,!!userElement._isOnline);
}
}
function readPrivateChatsIndexCache(cb){
try{
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(localChats&&Object.keys(localChats).length>0){
cb(localChats);
return;
}
}catch(e){}
if(typeof window.idbGet==="function"){
window.idbGet("privateChatsIndex",function(val){
cb(val&&typeof val==="object" ? val : {});
});
return;
}
cb({});
}
function renderPrivateChatsFromCache(cacheMap,done){
  cacheMap=cacheMap||{};
  var entries=Object.keys(cacheMap).map(function(uidKey){
    return{uid: uidKey,data: cacheMap[uidKey]||{}};
  }).sort(function(a,b){
    // Issue 4 Fix: Sort by unread messages first, then by timestamp
    var aUnread=(a.data.unreadCount||0);
    var bUnread=(b.data.unreadCount||0);
    if(aUnread>0 && bUnread===0)return -1; // a has unread, b doesn't
    if(aUnread===0 && bUnread>0)return 1;  // b has unread, a doesn't
    // Both have unread or both don't have unread - sort by timestamp
    var at=(a.data.timestamp||a.data.lastMessageAt||0);
    var bt=(b.data.timestamp||b.data.lastMessageAt||0);
    return bt-at;
  });
  if(entries.length===0){
    if(done)done(false);
    return;
  }
  entries.forEach(function(entry){
    renderPrivateChatEntry(entry.uid,entry.data,true);
  });
  entries.forEach(function(entry){
    var el=window._getChatEl(entry.uid);
    if(el)privateChatList.appendChild(el);
  });
  setSplashStatus("Ready!",100);
  if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
  if(done)done(true);
}
window._chatLastKnownTs=window._chatLastKnownTs||{};
window._chatLastKnownUnread=window._chatLastKnownUnread||{};
// ---- NOTIFICATION DEDUPE ----
// Persisted per-conversation "last notified" markers. Both toast paths
// (the privateChats summary listener AND the per-message child_added
// listener) route through here so the SAME message can never toast twice
// — neither within one session (two listeners fire for one message) nor
// across reopens (child_added replays every existing message when a page
// reloads or a listener re-attaches, which used to re-notify messages
// that were already shown / already read).
window._lastNotifiedTs=window._lastNotifiedTs||{};
window._lastNotifiedMsgId=window._lastNotifiedMsgId||{};
try{
var _savedNt=JSON.parse(localStorage.getItem("chit_lastNotifiedTs")||"{}");
if(_savedNt&&typeof _savedNt==="object")window._lastNotifiedTs=_savedNt;
}catch(e){}
function markMessageNotified(partnerUid,msgId,ts){
window._lastNotifiedTs[partnerUid]=ts||Date.now();
if(msgId)window._lastNotifiedMsgId[partnerUid]=msgId;
try{localStorage.setItem("chit_lastNotifiedTs",JSON.stringify(window._lastNotifiedTs));}catch(e){}
}
function shouldNotify(partnerUid,msgId,ts){
if(!partnerUid)return false;
var lastId=window._lastNotifiedMsgId[partnerUid];
var lastTs=window._lastNotifiedTs[partnerUid]||0;
if(msgId&&lastId&&msgId===lastId)return false;
if(ts&&lastTs&&ts<=lastTs)return false;
markMessageNotified(partnerUid,msgId,ts);
return true;
}
function renderPrivateChatEntry(partnerUid,entry,skipReorder){
if(!partnerUid||!entry)return;
var incomingTs=entry.timestamp||entry.lastMessageAt||0;
var prevTs=window._chatLastKnownTs[partnerUid];
var isNewChat=(prevTs===undefined);
var tsAdvanced=isNewChat||(incomingTs>prevTs);
if(incomingTs)window._chatLastKnownTs[partnerUid]=incomingTs;
// ---- LIVE UNREAD NOTIFICATION ----
// One persistent listener drives both the unread dot AND the toast: this
// function is already called every time privateChats/uid/<partner>
// changes (a live child_changed/child_added Firebase listener, always
// on — see attachPrivateChatListeners()). Whenever unreadCount goes up
// from what we last saw, and the person isn't already looking at that
// exact conversation, show a toast — whether the app was just sitting on
// the chat list, on another screen, or was reopened after being closed.
window._fbUnreadCount=window._fbUnreadCount||{};
var fbUnread=typeof entry.unreadCount==="number" ? entry.unreadCount : 0;
var prevFb=window._fbUnreadCount[partnerUid];
window._fbUnreadCount[partnerUid]=fbUnread;
var prevUnread=window._chatLastKnownUnread[partnerUid];
var isViewingThisChat=!!(chatPage&&chatPage.classList.contains("active")&&currentChatUid===partnerUid);
var incomingUnread=window.__sessionUnreadEnabled ? (typeof prevUnread==="number" ? prevUnread : 0) : 0;
if(window.__sessionUnreadEnabled&&!isViewingThisChat&&typeof prevFb==="number"&&fbUnread>prevFb){
incomingUnread=(incomingUnread||0)+(fbUnread-prevFb);
if(!(typeof isChatMuted==="function"&&isChatMuted(partnerUid))){
if(shouldNotify(partnerUid,null,incomingTs)){
var toastName=entry.username||partnerUid.substring(0,8);
var toastText=entry.lastMessage||"New message";
var toastPic=entry.profilePic||localStorage.getItem("profilePic_"+partnerUid)||"icons/default.png";
if(typeof showSimpleNotification==="function")showSimpleNotification(toastName,toastText,toastPic,partnerUid,null);
}
}
}
window._chatLastKnownUnread[partnerUid]=incomingUnread;
var alreadyShown=(loadedChats[partnerUid]&&window._getChatEl(partnerUid));
if(alreadyShown){
applyPrivateChatRowMeta(window._getChatEl(partnerUid),partnerUid,entry);
if(!skipReorder&&tsAdvanced)moveChatToTop(partnerUid);
}else{
// ---- INSTANT RENDER: always show the row right away using whatever we
// already know (cache or server snapshot), so the chat list never goes
// blank while we wait on a network round-trip. ----
var knownName=entry.username||partnerUid.substring(0,8);
var knownOnline=typeof entry.online==="boolean" ? entry.online : false;
rememberPrivateChat(partnerUid,knownName,{
online: knownOnline,
timestamp: entry.timestamp||entry.lastMessageAt||0,
lastMessage: entry.lastMessage||"",
unreadCount: typeof entry.unreadCount==="number" ? entry.unreadCount : 0,
chatRoomId: entry.chatRoomId||null,
profilePic: entry.profilePic||null
});
var instantEl=window._getChatEl(partnerUid);
if(!instantEl){
instantEl=createChatElement(partnerUid,knownName,knownOnline);
}
applyPrivateChatRowMeta(instantEl,partnerUid,Object.assign({},entry,{username: knownName,online: knownOnline}));
loadedChats[partnerUid]=true;
if(!skipReorder)moveChatToTop(partnerUid);
}
if(navigator.onLine===false){
return; // nothing more we can do offline; row is already showing.
}
// ---- BACKGROUND REFRESH: quietly update the row in place with the latest
// profile/presence info. Only needed the FIRST time we see this contact —
// every message after that just calls renderPrivateChatEntry() again
// (child_changed on privateChats fires per new message), and re-running
// two network fetches on every single incoming message was itself making
// the app feel like it hung the moment a message arrived. Presence stays
// live via the dedicated listener below regardless; name/pic come from
// the entry data itself (already synced by the sender).
if(!alreadyShown){
Promise.all([
db.ref("profiles/"+partnerUid).once("value"),
db.ref("presence1/"+partnerUid).once("value")
]).then(function(res){
var profileData=res[0]&&res[0].val()||{};
var presenceData=res[1]&&res[1].val()||{};
var name=entry.username||profileData.username||presenceData.username||partnerUid.substring(0,8);
var isOnline=typeof entry.online==="boolean" ? entry.online : !!presenceData.online;
rememberPrivateChat(partnerUid,name,{
online:isOnline,
timestamp: entry.timestamp||entry.lastMessageAt||0,
lastMessage: entry.lastMessage||"",
unreadCount: typeof entry.unreadCount==="number" ? entry.unreadCount : 0,
chatRoomId: entry.chatRoomId||null,
profilePic: profileData.profilePic||entry.profilePic||null
});
var el=window._getChatEl(partnerUid);
if(!el){
el=createChatElement(partnerUid,name,isOnline);
}
applyPrivateChatRowMeta(el,partnerUid,Object.assign({},entry,{username:name,online:isOnline,profilePic: profileData.profilePic||entry.profilePic||null}));
}).catch(function(){});
}
// ---- LIVE PRESENCE for this row ----
// The refresh above is a one-time snapshot, so a contact's online/offline
// flip (including "just came back online while the app was minimized")
// never used to reach the chat list until the whole thing reloaded. This
// is a genuine always-on listener, attached once per contact, that keeps
// the row's online dot / green name in sync from here on.
window._chatListPresenceRefs=window._chatListPresenceRefs||{};
if(!window._chatListPresenceRefs[partnerUid]){
var presenceLiveRef=db.ref("presence1/"+partnerUid);
window._chatListPresenceRefs[partnerUid]=presenceLiveRef;
presenceLiveRef.on("value",function(snap){
var p=snap&&snap.val()||{};
var el2=window._getChatEl(partnerUid);
if(!el2)return;
var isOnlineNow=!!p.online;
el2._isOnline=isOnlineNow;
var dotEl=el2.querySelector(".unread-count");
var nameEl=el2.querySelector(".user-name");
var known=window._chatLastKnownUnread&&window._chatLastKnownUnread[partnerUid]||0;
var stillUnread=(known>0)||!!(dotEl&&dotEl.style.display!=="none")||!!(nameEl&&nameEl.classList.contains("chat-username-unread"));
applyChatRowState(el2,partnerUid,stillUnread?Math.max(known,1):0,isOnlineNow);
});
}
}
function showChatListLoadingSpinner(){
if(!privateChatList)return;
if(document.getElementById("chatListLoadingSpinner"))return;
var wrap=document.createElement("div");
wrap.id="chatListLoadingSpinner";
wrap.style.cssText="text-align:center;padding:24px 10px;color:#94A3B8;font-size:12px;";
wrap.innerHTML='<span class="loading-spinner"></span> Loading chats...';
privateChatList.appendChild(wrap);
}
function hideChatListLoadingSpinner(){
var el=document.getElementById("chatListLoadingSpinner");
if(el&&el.parentElement)el.parentElement.removeChild(el);
}
// isFreshAuth = true right after an explicit Login/Sign Up (skip cache,
// go straight to Firebase). Falsy = app reopen with an existing session
// (show cache instantly, then sync with Firebase in the background).
function loadPrivateChats(isFreshAuth){
setSplashStatus("Loading Private Chats...",70);
privateChatList=document.getElementById("privateChatList");
if(!privateChatList){
hideSplashScreen();
return;
}
loadedChats={};
privateChatList.innerHTML="";
// Group unread / notifications now start from finishReady() below, once
// the list actually finishes loading — not on a fixed timer here.

function finishReady(){
window.__privateChatsReady=true;
window.__sessionUnreadEnabled=true;
setSplashStatus("Ready!",100);
if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
if(typeof setupGroupNotifications==="function")setupGroupNotifications();
if(typeof showKaiAd==="function")showKaiAd();
if(!window._kaiAdsIntervalSet&&typeof getKaiAd==="function"){window._kaiAdsIntervalSet=true;setInterval(showKaiAd,80*1000);}
if(typeof checkPrivateChatProfiles==="function")checkPrivateChatProfiles();
if(typeof startBackgroundAutoDelete==="function")startBackgroundAutoDelete();
// Attach real-time presence listener so green/gray dot updates instantly
attachPresenceChatRowsListener();
// Batch load all statuses in ONE read — fully non-blocking.
// Deferred 5s so it never competes with chat list, presence, or
// media loads during app startup. Status rings update dynamically
// once the background check resolves without blocking any UI.
setTimeout(function(){
if(!uid)return;
window.__statusBatchCache=window.__statusBatchCache||{};
var DAY_MS=24*60*60*1000;
var now=Date.now();
db.ref("statuses").once("value",function(allSnap){
if(!allSnap.exists())return;
var viewChecks=[];
allSnap.forEach(function(child){
var statusUid=child.key;
if(statusUid===uid)return;
var statusData=child.val()||{};
var latestTs=0;
if(statusData.statuses&&statusData.statuses.length){
statusData.statuses.forEach(function(s){if(s.timestamp>latestTs)latestTs=s.timestamp;});
}else if(statusData.timestamp){latestTs=statusData.timestamp;}
if(!latestTs||(now-latestTs)>DAY_MS){
window.__statusBatchCache[statusUid]=null;
return;
}
viewChecks.push({uid:statusUid,ts:latestTs});
});
// Batch view checks with small delay between each to avoid hammering
viewChecks.forEach(function(item,i){
setTimeout(function(){
db.ref("statusViews/"+item.uid+"/"+item.ts+"/"+uid).once("value",function(vSnap){
window.__statusBatchCache[item.uid]={latestTs:item.ts,viewedByMe:vSnap.exists()};
// Dynamically update any visible status ring
var el=window._getChatEl&&window._getChatEl(item.uid);
if(el){
var pic=el.querySelector(".profile-pic-small");
if(pic){
var cls=vSnap.exists()?"status-viewed":"status-new";
pic.className=pic.className.replace(/status-\w+/g,"").trim()+" "+cls;
}
}
}).catch(function(){});
},i*80); // 80ms stagger between each check
});
}).catch(function(){});
},5000);
}

// ---- OFFLINE: show whatever we have cached, nothing more we can do ----
if(navigator.onLine===false){
readPrivateChatsIndexCache(function(cacheMap){
renderPrivateChatsFromCache(cacheMap,function(){
finishReady();
});
});
return;
}

var privateChatsRef=db.ref("privateChats/"+uid);
var legacyChatsRef=db.ref("conversations/"+uid);

function attachPrivateChatListeners(){
privateChatsRef.off();
privateChatsRef.on("child_added",function(chatSnap){
renderPrivateChatEntry(chatSnap.key,chatSnap.val()||{});
});
privateChatsRef.on("child_changed",function(chatSnap){
renderPrivateChatEntry(chatSnap.key,chatSnap.val()||{});
});
privateChatsRef.on("child_removed",function(chatSnap){
var partnerUid=chatSnap.key;
var el=window._getChatEl(partnerUid);
if(el&&el.parentElement)el.parentElement.removeChild(el);
delete loadedChats[partnerUid];
});
}

// Does the actual Firebase fetch (+ legacy fallback), renders/updates
// rows, saves everything to local cache, and marks the list as ready.
// Safe to call either as the ONLY source (fresh login / no cache) or
// as a silent background sync after cache was already shown.
function fetchFromFirebaseAndSync(){
privateChatsRef.once("value",function(snapshot){
hideChatListLoadingSpinner();
var hasPrivateChats=snapshot&&snapshot.exists()&&snapshot.numChildren()>0;
if(hasPrivateChats){
  var privateEntries=[];
  snapshot.forEach(function(childSnapshot){
    privateEntries.push({
      uid: childSnapshot.key,
      data: childSnapshot.val()||{}
    });
  });
  privateEntries.sort(function(a,b){
    // Issue 4 Fix: Sort by unread messages first, then by timestamp
    var aUnread=(a.data.unreadCount||0);
    var bUnread=(b.data.unreadCount||0);
    if(aUnread>0 && bUnread===0)return -1; // a has unread, b doesn't
    if(aUnread===0 && bUnread>0)return 1;  // b has unread, a doesn't
    // Both have unread or both don't have unread - sort by timestamp
    var at=(a.data.timestamp||a.data.lastMessageAt||0);
    var bt=(b.data.timestamp||b.data.lastMessageAt||0);
    return bt-at;
  });
  privateEntries.forEach(function(entry){
    renderPrivateChatEntry(entry.uid,entry.data,true);
  });
  privateEntries.forEach(function(entry){
    var el=window._getChatEl(entry.uid);
    if(el)privateChatList.appendChild(el);
  });
  attachPrivateChatListeners();
  finishReady();
  return;
}
legacyChatsRef.once("value",function(legacySnap){
var legacyKeys=[];
legacySnap.forEach(function(childSnapshot){
legacyKeys.push(childSnapshot.key);
});
if(legacyKeys.length===0){
attachPrivateChatListeners();
finishReady();
return;
}
var pending=legacyKeys.length;
legacyKeys.forEach(function(partnerUid){
isUserBlocked(uid,partnerUid).then(function(blocked){
if(blocked){
pending--;
if(pending<=0)finishReady();
return;
}
Promise.all([
db.ref("profiles/"+partnerUid).once("value"),
db.ref("presence1/"+partnerUid).once("value")
]).then(function(res){
var profileData=res[0]&&res[0].val()||{};
var presenceData=res[1]&&res[1].val()||{};
var name=profileData.username||presenceData.username||partnerUid.substring(0,8);
var isOnline=!!presenceData.online;
rememberPrivateChat(partnerUid,name,{online:isOnline});
if(!window._getChatEl(partnerUid)){
createChatElement(partnerUid,name,isOnline);
}
loadedChats[partnerUid]=true;
pending--;
if(pending<=0)finishReady();
}).catch(function(){
var fallbackName=partnerUid.substring(0,8);
rememberPrivateChat(partnerUid,fallbackName,{online:false});
if(!window._getChatEl(partnerUid)){
createChatElement(partnerUid,fallbackName,false);
}
loadedChats[partnerUid]=true;
pending--;
if(pending<=0)finishReady();
});
});
});
attachPrivateChatListeners();
});
},function(){
// Firebase read failed (e.g. briefly offline) — fall back to cache if we
// haven't shown anything yet, otherwise just leave the current (cached) list as-is.
hideChatListLoadingSpinner();
if(Object.keys(loadedChats).length===0){
readPrivateChatsIndexCache(function(cacheMap){
renderPrivateChatsFromCache(cacheMap,function(){finishReady();});
});
}else{
finishReady();
}
});
}

// ---- FRESH LOGIN / SIGN UP: always pull from Firebase, no cache ----
if(isFreshAuth){
showChatListLoadingSpinner();
fetchFromFirebaseAndSync();
return;
}

// ---- APP REOPEN (existing session): instant cache, then background sync ----
readPrivateChatsIndexCache(function(cacheMap){
var hasCache=cacheMap&&Object.keys(cacheMap).length>0;
if(hasCache){
renderPrivateChatsFromCache(cacheMap,function(){
finishReady(); // instant display from cache
fetchFromFirebaseAndSync(); // silent background sync + cache update
});
}else{
// No cache available at all — show a spinner while we fetch fresh.
showChatListLoadingSpinner();
fetchFromFirebaseAndSync();
}
});
}
function moveChatToTop(partnerUid){
var el=window._getChatEl(partnerUid);
if(el&&privateChatList.firstChild!==el){
privateChatList.insertBefore(el,privateChatList.firstChild);
}
try{
var lc=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(lc[partnerUid]){
lc[partnerUid].lastActivity=Date.now();
localStorage.setItem("privateChats",JSON.stringify(lc));
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",lc);}catch(e){}
}
}
}catch(e){}
}
function applyChatRowState(userElement,partnerUid,unreadCount,isOnline){
if(!userElement)return;
// NOTE: this used to bail out here if a one-time "accurate" unread scan
// had already run once for this row (_liveUnreadComputed), to stop a
// stale denormalized count from overwriting it. But that one-time scan
// is gone now — the denormalized privateChats/uid/partner/unreadCount
// (incremented live, server-side, the moment a message is sent) is the
// only source of truth for the dot, and it's driven by a persistent
// child_changed listener. Blocking here silently ate every live update
// after the first one, which is why new messages stopped showing an
// unread dot until the app was fully reopened.
if(typeof isOnline!=="boolean"){
isOnline=!!userElement._isOnline;
}
userElement._isOnline=isOnline;
var unreadSpan=userElement.querySelector(".unread-indicator");
var unreadCountSpan=userElement.querySelector(".unread-count");
var nameSpan=userElement.querySelector(".user-name");
var timeSpan=userElement.querySelector(".chat-time");
var lastMsgSpan=userElement.querySelector(".chat-last-msg");
if(unreadSpan)unreadSpan.style.display="none"; // single dot only (.unread-count) — this second indicator used to double up as a 2nd dot
if(unreadCountSpan){
if(unreadCount>0&&window.__sessionUnreadEnabled){
unreadCountSpan.style.display="inline-flex";
unreadCountSpan.textContent=unreadCount>99?"99+":String(unreadCount);
}else{
unreadCountSpan.style.display="none";
unreadCountSpan.textContent="";
}
}
if(nameSpan){
nameSpan.className="user-name";
if(unreadCount>0){
nameSpan.classList.add("chat-username-unread");
}else if(isOnline){
nameSpan.classList.add("chat-username-online");
}else{
nameSpan.classList.add("chat-username-normal");
}
}
if(timeSpan){
timeSpan.className="chat-time"+(unreadCount>0 ? " unread-time" : "");
}
if(lastMsgSpan){
lastMsgSpan.className="chat-last-msg"+(unreadCount>0 ? " unread-msg" : "");
}
}
function ensurePrivateChatRow(partnerUid,partnerUsername,isOnline,unreadCount){
if(!partnerUid)return null;
var userElement=window._getChatEl(partnerUid);
if(!userElement&&typeof createChatElement==="function"){
userElement=createChatElement(partnerUid,partnerUsername||"User",!!isOnline);
}
if(!userElement)return null;
var nameEl=userElement.querySelector(".user-name");
if(nameEl&&partnerUsername&&partnerUsername!=="User"){
nameEl.textContent=partnerUsername;
}
if(typeof rememberPrivateChat==="function"){
rememberPrivateChat(partnerUid,partnerUsername||(nameEl&&nameEl.textContent)||"User",{online:!!isOnline});
}
if(typeof applyChatRowState==="function"){
applyChatRowState(userElement,partnerUid,typeof unreadCount==="number" ? unreadCount : 0,!!isOnline);
}
return userElement;
}
function getFocusedMessageContainer(){
var activeEl=document.activeElement;
if(!activeEl)return null;
// Walk up manually (no .closest for KaiOS compat)
var el=activeEl;
while(el&&el!==document.body){
if(el.classList&&el.classList.contains("message-container"))return el;
el=el.parentElement;
}
return null;
}
function focusAdjacentMessage(direction){
if(!chatBox)return false;
// Collect only the focusable .message elements inside chatBox
var all=Array.from(chatBox.querySelectorAll(".message"));
if(!all.length)return false;
var ae=document.activeElement;
// Direct match first
var idx=all.indexOf(ae);
if(idx===-1){
// Walk up from activeElement to find a .message ancestor
var el=ae;
while(el&&el!==chatBox){
if(el.classList&&el.classList.contains("message")){
idx=all.indexOf(el);
break;
}
el=el.parentElement;
}
}
if(idx===-1){
// Nothing focused in message list — go to edge
if(direction>0)all[0].focus();
else all[all.length-1].focus();
return true;
}
var nextIdx=idx+direction;
if(nextIdx<0){
// ArrowUp pressed on the first/top-most message — wrap around to the
// last message (whatever type it is: text, image, video, voice, etc.)
all[all.length-1].focus();
return true;
}
if(nextIdx>=all.length){
// ArrowDown pressed past the last message — go to the compose input
if(typeof messageInput!=="undefined"&&messageInput)messageInput.focus();
return true;
}
all[nextIdx].focus();
return true;
}
function createChatElement(partnerUid,partnerUsername,isOnline){
var existingElement=window._getChatEl(partnerUid);
if(existingElement){return existingElement;}
if(!window.allPrivateChats)window.allPrivateChats=[];
var already=window.allPrivateChats.some(function(c){return c.uid===partnerUid;});
if(!already){
var cachedProfilePic=null;
try{
var cachedPrivateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
cachedProfilePic=cachedPrivateChats[partnerUid]&&cachedPrivateChats[partnerUid].profilePic;
cachedProfilePic=cachedProfilePic||localStorage.getItem("profilePic_"+partnerUid);
}catch(e){}
window.allPrivateChats.push({uid: partnerUid,username: partnerUsername,name: partnerUsername,profilePic: cachedProfilePic||null});
try{
var cachedContacts=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
if(!cachedContacts.some(function(c){return c.uid===partnerUid;})){
cachedContacts.push({uid: partnerUid,username: partnerUsername,profilePic: cachedProfilePic||null});
localStorage.setItem("cachedContacts",JSON.stringify(cachedContacts));
}
}catch(e){}
}
var userElement=document.createElement("div");
userElement.className="user navItem";
userElement.dataset.uid=partnerUid;
if(window._registerChatEl)window._registerChatEl(partnerUid,userElement);
// Start watching presence for this contact
if(window._watchPresenceFor) window._watchPresenceFor(partnerUid);
var picWrap=document.createElement("div");
picWrap.style.cssText="position:relative;flex-shrink:0;margin-right:9px;";
var profilePic=document.createElement("img");
profilePic.className="profile-pic-small status-none";
profilePic.alt=partnerUsername;
profilePic.style.cssText="width:44px;height:44px;border-radius:50%;object-fit:cover;border:2.5px solid transparent;flex-shrink:0;transition:border-color 0.3s;";
try{
var instantPrivateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
var instantPic=(instantPrivateChats[partnerUid]&&instantPrivateChats[partnerUid].profilePic)||localStorage.getItem("profilePic_"+partnerUid);
if(instantPic)profilePic.src=instantPic;
}catch(e){}
loadProfilePicture(partnerUid,profilePic,partnerUsername);
picWrap.appendChild(profilePic);
var infoCol=document.createElement("div");
infoCol.style.cssText="flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;";
var nameRow=document.createElement("div");
nameRow.style.cssText="display:flex;align-items:center;justify-content:space-between;";
var nameSpan=document.createElement("span");
nameSpan.className="user-name chat-username-normal";
nameSpan.textContent=partnerUsername;
nameSpan.style.cssText="font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:160px;";
var muteBadge=document.createElement("span");
muteBadge.className="mute-badge";
muteBadge.textContent="🔇";
muteBadge.style.cssText="display:none;align-items:center;justify-content:center;font-size:12px;margin-left:6px;flex-shrink:0;";
var unreadCountSpan=document.createElement("span");
unreadCountSpan.className="unread-count";
unreadCountSpan.style.cssText="background:#EF4444;color:#fff;border-radius:10px;min-width:18px;height:18px;display:none;margin-left:6px;flex-shrink:0;padding:0 5px;align-items:center;justify-content:center;font-size:11px;font-weight:700;line-height:18px;";
var unreadSpan=document.createElement("span");
unreadSpan.className="unread-indicator";
unreadSpan.style.display="none";
var metaRow=document.createElement("div");
metaRow.style.cssText="display:none;align-items:center;justify-content:space-between;gap:8px;margin-top:3px;min-width:0;";
var timeSpan=document.createElement("span");
timeSpan.className="chat-time";
timeSpan.style.cssText="display:block;font-size:11px;color:#7A8794;white-space:nowrap;flex-shrink:0;";
var lastMsgSpan=document.createElement("span");
lastMsgSpan.className="chat-last-msg";
lastMsgSpan.style.cssText="display:block;font-size:12px;color:#667781;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1;";
nameRow.appendChild(nameSpan);
nameRow.appendChild(muteBadge);
nameRow.appendChild(unreadCountSpan);
infoCol.appendChild(nameRow);
metaRow.appendChild(lastMsgSpan);
metaRow.appendChild(timeSpan);
infoCol.appendChild(metaRow);
setTimeout(function(){refreshChatMuteIndicator(partnerUid);},0);
userElement.appendChild(picWrap);
userElement.appendChild(infoCol);
userElement.appendChild(unreadSpan);
userElement.tabIndex=7;
var _DAY_MS=24*60*60*1000;
// Use batch status cache to avoid per-user Firebase reads (saves ~N reads on load)
function updateStatusRing(){
var privateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(!privateChats[partnerUid]){
profilePic.className="profile-pic-small status-none";
return;
}
// Use batch cache if available (populated once for all users)
if(window.__statusBatchCache){
var cached=window.__statusBatchCache[partnerUid];
if(cached===undefined){profilePic.className="profile-pic-small status-none";return;}
if(cached===null){profilePic.className="profile-pic-small status-none";return;}
// cached = {latestTs, viewedByMe}
if((Date.now()-cached.latestTs)>_DAY_MS){profilePic.className="profile-pic-small status-none";return;}
profilePic.className="profile-pic-small "+(cached.viewedByMe?"status-viewed":"status-new");
return;
}
// Fallback: individual read (only used if batch not ready yet)
db.ref("statuses/"+partnerUid).once("value",function(snap){
if(!snap.exists()){profilePic.className="profile-pic-small status-none";return;}
var statusData=snap.val();
var latestTs=0;
if(statusData.statuses&&statusData.statuses.length){
statusData.statuses.forEach(function(s){if(s.timestamp>latestTs)latestTs=s.timestamp;});
}else if(statusData.timestamp){latestTs=statusData.timestamp;}
if(!latestTs||(Date.now()-latestTs)>_DAY_MS){profilePic.className="profile-pic-small status-none";return;}
db.ref("statusViews/"+partnerUid+"/"+latestTs+"/"+uid).once("value",function(viewSnap){
profilePic.className="profile-pic-small "+(viewSnap.exists()?"status-viewed":"status-new");
});
});
}
updateStatusRing();
var _previewTimer=null;
// ── Lazy preview: use cached entry data first, Firebase only if truly missing ──
// This eliminates N Firebase reads (one per chat row) on every app startup.
// The entry data from privateChats already has lastMessage/lastMessageAt
// populated by the sender — we don't need a separate conversation read.
function applyPreviewFromEntry(entryData){
if(!entryData)return;
var lm=entryData.lastMessage||"";
var lt=entryData.lastMessageAt||entryData.timestamp||0;
var knownUnread=window._chatLastKnownUnread&&window._chatLastKnownUnread[partnerUid]||0;
var dotOn=unreadCountSpan&&unreadCountSpan.style.display!=="none";
var hasUnread=!!(entryData.unreadCount>0||knownUnread>0||dotOn);
if(lm){lastMsgSpan.textContent=lm;metaRow.style.display="flex";}
if(lt){timeSpan.textContent=formatSendTime(lt);}
var isOnlineCached=!!userElement._isOnline;
if(hasUnread){
nameSpan.className="user-name chat-username-unread";
timeSpan.className="chat-time unread-time";
lastMsgSpan.className="chat-last-msg unread-msg";
if(window.__sessionUnreadEnabled&&knownUnread>0){
unreadCountSpan.style.display="inline-flex";
unreadCountSpan.textContent=knownUnread>99?"99+":String(knownUnread);
}else{
unreadCountSpan.style.display="none";
unreadCountSpan.textContent="";
}
}else if(isOnlineCached){
nameSpan.className="user-name chat-username-online";
timeSpan.className="chat-time";
lastMsgSpan.className="chat-last-msg";
unreadCountSpan.style.display="none";
}else{
nameSpan.className="user-name chat-username-normal";
timeSpan.className="chat-time";
lastMsgSpan.className="chat-last-msg";
unreadCountSpan.style.display="none";
}
}
function updateChatPreview(forceFirebase){
if(_previewTimer)clearTimeout(_previewTimer);
// First: try using entry data already in memory (zero network)
var localChatsNow=null;
try{localChatsNow=JSON.parse(localStorage.getItem("privateChats")||"{}");}catch(e){}
var cachedEntry=localChatsNow&&localChatsNow[partnerUid];
if(cachedEntry&&(cachedEntry.lastMessage||cachedEntry.lastMessageAt)&&!forceFirebase){
applyPreviewFromEntry(cachedEntry);
return;
}
// Fallback: Firebase fetch (only if no cached data or explicitly requested)
_previewTimer=setTimeout(function(){
_previewTimer=null;
db.ref("conversations/"+uid+"/"+partnerUid).orderByChild("timestamp").limitToLast(1).once("value",function(chatSnapshot){
var lastMsg=null;
chatSnapshot.forEach(function(msgSnapshot){lastMsg=msgSnapshot.val();});
if(!lastMsg)return;
var knownUnread=window._chatLastKnownUnread&&window._chatLastKnownUnread[partnerUid]||0;
var dotOn=unreadCountSpan&&unreadCountSpan.style.display!=="none";
var hasUnread=!!((lastMsg&&!lastMsg.deleted&&lastMsg.from===partnerUid&&!lastMsg.seen)||knownUnread>0||dotOn);
if(lastMsg&&!lastMsg.deleted){
var preview="";
if(lastMsg.from===uid)preview+="You: ";
if(lastMsg.mediaType==="image")preview+="📷 Photo";
else if(lastMsg.mediaType==="voice")preview+="🎤 Voice";
else if(lastMsg.mediaType==="video")preview+="🎬 Video";
else if(lastMsg.edited)preview+="(edited) "+(lastMsg.message||"");
else preview+=(lastMsg.message||"");
lastMsgSpan.textContent=preview;
if(lastMsg.timestamp)timeSpan.textContent=formatSendTime(lastMsg.timestamp);
metaRow.style.display="flex";
}
var isOnlineCached=!!userElement._isOnline;
if(hasUnread){nameSpan.className="user-name chat-username-unread";timeSpan.className="chat-time unread-time";lastMsgSpan.className="chat-last-msg unread-msg";if(window.__sessionUnreadEnabled&&knownUnread>0){unreadCountSpan.style.display="inline-flex";unreadCountSpan.textContent=knownUnread>99?"99+":String(knownUnread);}else{unreadCountSpan.style.display="none";unreadCountSpan.textContent="";}}
else if(isOnlineCached){nameSpan.className="user-name chat-username-online";timeSpan.className="chat-time";lastMsgSpan.className="chat-last-msg";unreadCountSpan.style.display="none";}
else{nameSpan.className="user-name chat-username-normal";timeSpan.className="chat-time";lastMsgSpan.className="chat-last-msg";unreadCountSpan.style.display="none";}
});
},800);
}
updateChatPreview();
// ── Split click zones: profile pic → profile view, row → open chat ──
profilePic.style.cursor="pointer";
profilePic.onclick=function(e){
e.preventDefault();e.stopPropagation();
if(typeof showProfileView==="function")showProfileView(partnerUid);
};
// Long-press on pic also shows profile
var _picPressT=null;
profilePic.addEventListener("touchstart",function(e){
_picPressT=setTimeout(function(){if(typeof showProfileView==="function")showProfileView(partnerUid);},500);
},false);
profilePic.addEventListener("touchend",function(){clearTimeout(_picPressT);},false);
userElement.onclick=function(e){
// If click was on profile pic, handled above
if(e&&e.target&&(e.target===profilePic||picWrap.contains(e.target)))return;
if(chatListSelectModeActive){toggleChatSelected(partnerUid,userElement);return;}
pendingOpenChatUsername=partnerUsername;
pendingOpenChatStatus=isOnline ? "Online" : "";
showChatLoadingOverlay(partnerUsername);
setTimeout(function(){openChat(partnerUid);},60);
markMessagesAsSeen(partnerUid,userElement);
};
userElement.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
if(chatListSelectModeActive){
toggleChatSelected(partnerUid,userElement);
}else{
pendingOpenChatUsername=partnerUsername;
pendingOpenChatStatus=isOnline ? "Online" : "";
openChat(partnerUid);
markMessagesAsSeen(partnerUid,userElement);
}
return;
}
if(e.key==="SoftLeft"&&chatListSelectModeActive){
e.preventDefault();
e.stopPropagation();
showDropdown(["Delete"],function(index){
if(index===0){
hideDropdown();
var toDelete=Object.keys(selectedChatUids);
if(toDelete.length===0)toDelete=[partnerUid];
var localChats2=JSON.parse(localStorage.getItem("privateChats")||"{}");
toDelete.forEach(function(cu){
db.ref("conversations/"+uid+"/"+cu).remove();
db.ref("privateChats/"+uid+"/"+cu).remove();
delete localChats2[cu];
delete loadedChats[cu];
if(window._chatLastKnownUnread)delete window._chatLastKnownUnread[cu];
if(window._chatLastKnownTs)delete window._chatLastKnownTs[cu];
if(window.allPrivateChats)window.allPrivateChats=window.allPrivateChats.filter(function(c){return c.uid!==cu;});
var el2=window._getChatEl?window._getChatEl(cu):null;
if(el2)el2.remove();
});
localStorage.setItem("privateChats",JSON.stringify(localChats2));
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",localChats2);}catch(e){}
}
var nd=toDelete.length;
exitChatListSelectMode();
if(typeof showNotification==="function")showNotification(nd+" chat(s) deleted");
setTimeout(function(){if(typeof focusPrivateChatsLanding==="function")focusPrivateChatsLanding();},200);
}
});
return;
}
if(e.key==="SoftRight"&&chatListSelectModeActive){
e.preventDefault();
e.stopPropagation();
exitChatListSelectMode();
return;
}
};
userElement.onfocus=function(){
if(chatListSelectModeActive){
updateChatListSelectSoftkeys();
return;
}
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online User";
};
userElement.onblur=function(){
if(chatListSelectModeActive)return;
if(document.activeElement.className!=="user navItem"){
softkeyLeft.innerHTML="";
softkeyRight.innerHTML="";
}
};
if(privateChatList.firstChild){
privateChatList.insertBefore(userElement,privateChatList.firstChild);
}else{
privateChatList.appendChild(userElement);
}
var cachedOnline=window._presenceCache&&window._presenceCache[partnerUid];
userElement._isOnline=!!cachedOnline;
applyChatRowState(userElement,partnerUid,0,!!cachedOnline);
// Fix 1: Store chatRef2 so it can be cleaned up later
if(!window._chatRef2Map) window._chatRef2Map = {};
if(window._chatRef2Map[partnerUid]) {
  window._chatRef2Map[partnerUid].off();
}
// DATA-SAVING: only the single latest message is subscribed to here.
// A full `conversations/{uid}/{puid}` child_added listener replays the
// ENTIRE chat history the moment it attaches (Firebase re-delivers every
// existing child), so with this app re-opening constantly that one line
// was silently downloading every conversation's full history over and
// over — the source of the multi-MB background traffic. limitToLast(1)
// delivers exactly one message (the newest), which is all the chat-list
// row needs for its preview, reorder and toast.
var chatRef2=db.ref("conversations/"+uid+"/"+partnerUid).orderByChild("timestamp").limitToLast(1);
window._chatRef2Map[partnerUid] = chatRef2;
userElement._unreadAttachAt=Date.now();
chatRef2.on("child_added",function(newSnapshot){
var data=newSnapshot.val()||{};
var preview="";
if(data.from===uid)preview+="You: ";
if(data.mediaType==="image")preview+="📷 Photo";
else if(data.mediaType==="voice")preview+="🎤 Voice";
else if(data.mediaType==="video")preview+="🎬 Video";
else preview+=(data.message||"");
if(preview){
var lmSpan=userElement.querySelector('.chat-last-msg');
var tsSpan=userElement.querySelector('.chat-time');
if(lmSpan)lmSpan.textContent=preview;
if(tsSpan&&data.timestamp)tsSpan.textContent=formatSendTime(data.timestamp);
}
moveChatToTop(partnerUid);
if(data&&data.from===partnerUid&&!data.seen){
if(!(chatPage.classList.contains("active")&&currentChatUid===partnerUid)){
try{
if(typeof window.appendIncomingToChatCache==="function"){
window.appendIncomingToChatCache(partnerUid,newSnapshot.key,data);
}
}catch(cacheErr){}
try{
var msgTsLive=typeof data.timestamp==="number"?data.timestamp:0;
var attachAt=userElement._unreadAttachAt||0;
if(msgTsLive&&attachAt&&msgTsLive>=attachAt-2500){
window.__sessionUnreadEnabled=true;
var bumpedUnread=(window._chatLastKnownUnread[partnerUid]||0)+1;
window._chatLastKnownUnread[partnerUid]=bumpedUnread;
applyChatRowState(userElement,partnerUid,bumpedUnread,!!userElement._isOnline);
}
}catch(badgeErr){}
try{
if(!isChatMuted(partnerUid)){
var msgKey=newSnapshot.key;
var msgTs=typeof data.timestamp==="number" ? data.timestamp : 0;
if(shouldNotify(partnerUid,msgKey,msgTs)){
db.ref("profiles/"+partnerUid).once("value",function(profileSnap){
var profileData=profileSnap.val()||{};
var senderName=profileData.username||partnerUsername;
var senderPic=profileData.profilePic||"icons/default.png";
var messageText=data.message||(data.mediaType==="image" ? "📷 Image" :
data.mediaType==="voice" ? "🎤 Voice" :
data.mediaType==="video" ? "📹 Video" : "New message");
showSimpleNotification(senderName,messageText,senderPic,partnerUid);
});
}
}
}catch(notifyErr){}
}
if(!isChatMuted(partnerUid)){
sendPushNotification(data.message||"Media received",partnerUsername,partnerUid);
}
}
});
var _ccTimer=null;
chatRef2.on("child_changed",function(){
if(_ccTimer)return;
_ccTimer=setTimeout(function(){_ccTimer=null;updateChatPreview();},500);
});
return userElement;
}
// ── Real-time presence listener for chat list rows ─────────────────
// This is what makes the green/gray indicator update instantly without
// needing to re-fetch. One listener on "presence1" covers all contacts.
var _presenceChatRowsListenerAttached=false;
function attachPresenceChatRowsListener(){
if(_presenceChatRowsListenerAttached)return;
_presenceChatRowsListenerAttached=true;
var presRef=db.ref("presence1");
presRef.on("child_added",function(snap){_applyPresenceToChatRow(snap.key,snap.val());});
presRef.on("child_changed",function(snap){_applyPresenceToChatRow(snap.key,snap.val());});
presRef.on("child_removed",function(snap){_applyPresenceToChatRow(snap.key,{online:false});});
}
function _applyPresenceToChatRow(presUid,presData){
if(!presUid||presUid===uid)return;
var el=window._getChatEl&&window._getChatEl(presUid);
if(!el)return;
var isOnline=!!(presData&&presData.online);
var wasOnline=!!el._isOnline;
if(isOnline===wasOnline)return; // no change, skip DOM update
el._isOnline=isOnline;
var nameSpan=el.querySelector(".user-name");
var unreadCount=window._chatLastKnownUnread&&window._chatLastKnownUnread[presUid]||0;
var dotEl=el.querySelector(".unread-count");
var stillUnread=unreadCount>0||(dotEl&&dotEl.style.display!=="none")||(nameSpan&&nameSpan.classList.contains("chat-username-unread"));
if(nameSpan){
nameSpan.className="user-name";
if(stillUnread)nameSpan.classList.add("chat-username-unread");
else if(isOnline)nameSpan.classList.add("chat-username-online");
else nameSpan.classList.add("chat-username-normal");
}
// Update online dot on avatar
var pic=el.querySelector(".profile-pic-small");
if(pic){
if(isOnline)pic.style.outline="2.5px solid #10B981";
else pic.style.outline="";
}
}

// ── Fast markMessagesAsSeen — no full conversation scan ────────────
// Old version did a full .once("value") on the entire conversation to
// find unseen messages. With long chats this was slow and blocked the UI.
// New version: just zero out the unreadCount in privateChats directly
// (the source of truth for the dot), plus a lightweight limitToLast read.
function markMessagesAsSeen(partnerUid,userElement){
if(!partnerUid)return;
var nowTs=Date.now();
// 1. Instantly clear dot in UI (zero latency)
window._chatLastKnownUnread=window._chatLastKnownUnread||{};
window._chatLastKnownUnread[partnerUid]=0;
if(userElement){
var unreadSpan=userElement.querySelector(".unread-indicator");
var unreadCountSpan=userElement.querySelector(".unread-count");
var nameSpan=userElement.querySelector(".user-name");
var lastMsgSpan=userElement.querySelector(".chat-last-msg");
if(unreadSpan)unreadSpan.style.display="none";
if(unreadCountSpan){unreadCountSpan.style.display="none";unreadCountSpan.textContent="";}
if(lastMsgSpan){lastMsgSpan.style.fontWeight="normal";lastMsgSpan.style.color="";}
if(nameSpan){
var isOnline=!!userElement._isOnline;
nameSpan.className=isOnline?"user-name chat-username-online":"user-name chat-username-normal";
}
}
// 2. Clear unreadCount in Firebase & localStorage
try{
var cachedList=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(cachedList[partnerUid]&&typeof cachedList[partnerUid]==="object"){
cachedList[partnerUid].unreadCount=0;
cachedList[partnerUid].lastReadAt=nowTs;
localStorage.setItem("privateChats",JSON.stringify(cachedList));
if(typeof window.idbSet==="function")window.idbSet("privateChatsIndex",cachedList);
}
}catch(e){}
// Zero the Firebase unread counter immediately (don't wait for a read first)
db.ref("privateChats/"+uid+"/"+partnerUid).update({unreadCount:0,lastReadAt:nowTs}).catch(function(){});
// 3. Mark recent unseen messages as seen (limitToLast 30 = fast, covers all recent)
try{localStorage.setItem("lastSeen_ts_"+partnerUid,String(nowTs));}catch(e){}
db.ref("conversations/"+uid+"/"+partnerUid)
.orderByChild("timestamp")
.limitToLast(30)
.once("value",function(snapshot){
var batch={};
snapshot.forEach(function(msgSnap){
var message=msgSnap.val();
if(message&&message.from===partnerUid&&!message.seen){
batch[msgSnap.key+"/seen"]=true;
batch[msgSnap.key+"/stamp"]=nowTs;
batch[msgSnap.key+"/status"]="seen";
// Update sender's copy too
db.ref("conversations/"+partnerUid+"/"+uid+"/"+msgSnap.key).update({seen:true,seenTimestamp:nowTs,status:"seen"}).catch(function(){});
}
});
if(Object.keys(batch).length>0){
db.ref("conversations/"+uid+"/"+partnerUid).update(batch).catch(function(){});
}
}).catch(function(){});
}
function checkBothSeen(messageId){
var senderRef=db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId);
var receiverRef=db.ref("conversations/"+currentChatUid+"/"+uid+"/"+messageId);
senderRef.once('value',function(senderSnap){
receiverRef.once('value',function(receiverSnap){
var senderData=senderSnap.val();
var receiverData=receiverSnap.val();
if(!senderData)return;
var messageElement=document.getElementById("msg-"+messageId);
if(messageElement){
var statusSpan=messageElement.querySelector(".message-status");
if(senderData.from===uid&&statusSpan){
var bothSeen=senderData.seen&&receiverData&&receiverData.seen;
if(bothSeen){
statusSpan.className="message-status double-tick seen";
statusSpan.innerHTML="✓✓";
if(senderData.status!=="seen"){
senderRef.update({status: "seen"});
}
if(receiverData&&receiverData.status!=="seen"){
receiverRef.update({status: "seen"});
}
}else if(receiverData&&(receiverData.status==="delivered"||receiverData.status==="seen")){
statusSpan.className="message-status double-tick";
statusSpan.innerHTML="✓✓";
}else{
statusSpan.className="message-status single-tick";
statusSpan.innerHTML="✓";
}
}
}
});
});
}
function updateMessageColor(messageId){
checkBothSeen(messageId);
}
function isVoicePlayedState(data){
return!!(data&&data.mediaType==="voice"&&(data.status==="played"||data.playedTimestamp||data.playedBy));
}
function applyVoicePlayedState(messageElement,data,forcePlayed){
if(!messageElement||!data||data.mediaType!=="voice")return;
var played=typeof forcePlayed==="boolean" ? forcePlayed : isVoicePlayedState(data);
var voiceCard=messageElement.querySelector(".voice-message-card");
var waveform=messageElement.querySelector(".voice-waveform-canvas");
var playButton=messageElement.querySelector(".voice-toggle-button");
messageElement.classList.toggle("voice-played",played);
if(voiceCard)voiceCard.classList.toggle("voice-played",played);
if(played){
messageElement.style.background="linear-gradient(180deg,#E8F0FF,#D9E8FF)";
messageElement.style.border="1px solid rgba(37,99,235,0.22)";
}else{
messageElement.style.background=messageElement.dataset.from===uid
? "linear-gradient(180deg,#DFF7CE,#CBEFBA)"
: "#FFFFFF";
messageElement.style.border=messageElement.dataset.from===uid
? "1px solid rgba(34,197,94,0.18)"
: "1px solid #E2E8F0";
}
if(waveform){
waveform.dataset.played=played ? "1" : "0";
drawVoiceWaveform(waveform,waveform._peaks||buildFallbackPeaks(hashVoiceSeed(waveform.dataset.seed||data.mediaUrl||messageElement.id),26),0,false);
}
if(playButton&&!playButton.classList.contains("playing")){
playButton.innerHTML="\u25B6\uFE0F";
}
}
function markVoicePlayed(messageId,mediaUrl){
if(!messageId||!currentChatUid||!uid)return;
var messageElement=document.getElementById("msg-"+messageId);
if(!messageElement)return;
if(messageElement.dataset.from===uid)return;
if(messageElement.dataset.played==="1")return;
messageElement.dataset.played="1";
applyVoicePlayedState(messageElement,{mediaType: "voice",mediaUrl: mediaUrl},true);
var payload={
status: "played",
playedTimestamp: firebase.database.ServerValue.TIMESTAMP,
playedBy: uid
};
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).update(payload);
db.ref("conversations/"+currentChatUid+"/"+uid+"/"+messageId).update(payload);
var cached=getCachedMessageEntry(messageId);
if(cached&&cached.data){
updateCachedMessageEntry(messageId,Object.assign({},cached.data,payload));
}
}
function getChatCacheKey(chatUid){
return "chatMessagesCache_v2_"+uid+"_"+chatUid;
}
function cloneMessageData(data){
try{
return JSON.parse(JSON.stringify(data||{}));
}catch(e){
return data ? Object.assign({},data):{};
}
}
function readChatCache(chatUid){
if(!uid||!chatUid)return null;
try{
var raw=localStorage.getItem(getChatCacheKey(chatUid));
return raw ? JSON.parse(raw): null;
}catch(e){
return null;
}
}
function persistChatCache(chatUid){
if(!uid||!chatUid)return;
try{
var byId={};
var existing=chatMessagesCache[chatUid];
if(existing&&Array.isArray(existing.messages)){
existing.messages.forEach(function(m){
if(m&&m.id)byId[m.id]={id:m.id,data:cloneMessageData(m.data||{})};
});
}
messages.forEach(function(msg){
if(msg&&msg.id)byId[msg.id]={id: msg.id,data: cloneMessageData(msg.data||{})};
});
var allMsgs=Object.keys(byId).map(function(k){return byId[k];});
allMsgs.sort(function(a,b){
return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);
});
if(existing&&Array.isArray(existing.messages)&&existing.messages.length>allMsgs.length){
existing.messages.forEach(function(m){
if(m&&m.id&&!byId[m.id])byId[m.id]={id:m.id,data:cloneMessageData(m.data||{})};
});
allMsgs=Object.keys(byId).map(function(k){return byId[k];});
allMsgs.sort(function(a,b){
return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);
});
}
var payload={updatedAt: Date.now(),messages: allMsgs.slice(-50)};
chatMessagesCache[chatUid]=payload;
var key=getChatCacheKey(chatUid);
if(typeof window.idbSet==="function"){
window.idbSet(key,payload);
}else{
try{
localStorage.setItem(key,JSON.stringify(payload));
}catch(e){
try{
Object.keys(localStorage).filter(function(k){return k.indexOf("chatCache_")===0;})
.forEach(function(k){localStorage.removeItem(k);});
localStorage.setItem(key,JSON.stringify(payload));
}catch(e2){}
}
}
}catch(e){}
}
function saveChatCachePayload(chatUid,payload){
if(!uid||!chatUid||!payload)return;
var existing=chatMessagesCache[chatUid];
if(existing&&existing.messages&&payload.messages&&existing.messages.length>payload.messages.length){
payload=mergeChatCachePayloads(existing,payload);
}
chatMessagesCache[chatUid]=payload;
var key=getChatCacheKey(chatUid);
if(typeof window.idbSet==="function"){
window.idbSet(key,payload);
}else{
try{localStorage.setItem(key,JSON.stringify(payload));}catch(e){}
}
}
function readChatCache(chatUid){
if(!uid||!chatUid)return null;
if(chatMessagesCache[chatUid])return chatMessagesCache[chatUid];
try{
var raw=localStorage.getItem(getChatCacheKey(chatUid));
if(raw)return JSON.parse(raw);
}catch(e){}
return null;
}
function mergeChatCachePayloads(a,b){
var byId={};
function add(payload){
if(!payload||!Array.isArray(payload.messages))return;
payload.messages.forEach(function(m){
if(m&&m.id)byId[m.id]={id:m.id,data:cloneMessageData(m.data||{})};
});
}
add(a);add(b);
var messages=Object.keys(byId).map(function(k){return byId[k];});
messages.sort(function(x,y){
return((x.data&&x.data.timestamp)||0)-((y.data&&y.data.timestamp)||0);
});
return{updatedAt: Date.now(),messages: messages.slice(-50)};
}
function readChatCacheAsync(chatUid,cb){
if(!uid||!chatUid){cb(null);return;}
var mem=chatMessagesCache[chatUid]||null;
var key=getChatCacheKey(chatUid);
function finish(disk){
var merged=mergeChatCachePayloads(disk,mem);
if(merged.messages.length){
chatMessagesCache[chatUid]=merged;
cb(merged);
}else{
cb(mem||disk||null);
}
}
if(typeof window.idbGet==="function"){
window.idbGet(key,function(val){
if(val){finish(val);return;}
try{var r=localStorage.getItem(key);finish(r?JSON.parse(r):null);}
catch(e){finish(null);}
});
}else{
try{var r2=localStorage.getItem(key);finish(r2?JSON.parse(r2):null);}
catch(e){finish(null);}
}
}
function normalizeChatCachePayload(payload){
if(!payload||typeof payload!=="object")payload={};
if(!Array.isArray(payload.messages))payload.messages=[];
if(!payload.updatedAt)payload.updatedAt=Date.now();
return payload;
}
function replaceCachedQueuedMessage(chatUid,oldId,newId,newData){
if(!uid||!chatUid||!oldId||!newId)return;
var normalizedData=cloneMessageData(newData||{});
if(currentChatUid===chatUid){
var replaced=false;
for(var i=0;i<messages.length;i++){
if(messages[i].id===oldId){
messages[i].id=newId;
messages[i].data=normalizedData;
replaced=true;
break;
}
}
if(!replaced){
messages.push({id:newId,timestamp: normalizedData&&normalizedData.timestamp,data: normalizedData});
}
var oldEl=document.getElementById("msg-"+oldId);
if(oldEl){
oldEl.id="msg-"+newId;
}
persistChatCache(chatUid);
return;
}
readChatCacheAsync(chatUid,function(cached){
cached=normalizeChatCachePayload(cached||chatMessagesCache[chatUid]||{});
var found=false;
for(var i=0;i<cached.messages.length;i++){
if(cached.messages[i]&&cached.messages[i].id===oldId){
cached.messages[i]={id:newId,data:normalizedData};
found=true;
break;
}
}
if(!found){
cached.messages.push({id:newId,data:normalizedData});
}
cached.messages.sort(function(a,b){
return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);
});
cached.updatedAt=Date.now();
saveChatCachePayload(chatUid,cached);
});
}
function purgeChatLocalState(partnerUid,removeChatRow){
if(!partnerUid||!uid)return;
var cacheKey=getChatCacheKey(partnerUid);
chatMessagesCache[partnerUid]=null;
delete loadedChats[partnerUid];
if(window._chatLastKnownUnread)delete window._chatLastKnownUnread[partnerUid];
if(window._chatLastKnownTs)delete window._chatLastKnownTs[partnerUid];
if(window._lastNotifiedTs)delete window._lastNotifiedTs[partnerUid];
if(window._lastNotifiedMsgId)delete window._lastNotifiedMsgId[partnerUid];
if(window.allPrivateChats)window.allPrivateChats=window.allPrivateChats.filter(function(c){return c&&c.uid!==partnerUid;});
try{localStorage.setItem("chit_lastNotifiedTs",JSON.stringify(window._lastNotifiedTs||{}));}catch(e){}
try{
localStorage.removeItem(cacheKey);
if(typeof window.idbDelete==="function"){
window.idbDelete(cacheKey);
}
}catch(e){}
getOutgoingQueue(function(queue){
var filtered=queue.filter(function(item){return item&&item.toUid!==partnerUid;});
saveOutgoingQueue(filtered);
});
if(removeChatRow){
try{
var privateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
delete privateChats[partnerUid];
localStorage.setItem("privateChats",JSON.stringify(privateChats));
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",privateChats);}catch(e){}
}
}catch(e){}
}
}
function restoreChatCache(chatUid){
var cached=chatMessagesCache[chatUid]||readChatCache(chatUid);
cached.messages.sort(function(a,b){
var at=(a.data&&a.data.timestamp)||0;
var bt=(b.data&&b.data.timestamp)||0;
return at-bt;
});
chatBox.innerHTML="";
messages=[];
processedMessages={};
window.__restoringCache=true;
cached.messages.forEach(function(item){
if(!item||!item.id||!item.data)return;
processedMessages[item.id]=true;
displayMessage(item.id,item.data);
});
window.__restoringCache=false;
setTimeout(function(){
chatBox.scrollTop=chatBox.scrollHeight;
},50);
return true;
}
window.appendIncomingToChatCache=function(partnerUid,messageId,data){
if(!partnerUid||!messageId||!data)return;
if(currentChatUid===partnerUid){
updateCachedMessageEntry(messageId,data);
return;
}
readChatCacheAsync(partnerUid,function(existing){
var cached=normalizeChatCachePayload(existing||chatMessagesCache[partnerUid]||{});
var exists=false;
for(var i=0;i<cached.messages.length;i++){
if(cached.messages[i]&&cached.messages[i].id===messageId){exists=true;break;}
}
if(!exists){
cached.messages.push({id:messageId,data:cloneMessageData(data)});
cached.messages.sort(function(a,b){
return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);
});
if(cached.messages.length>50)cached.messages=cached.messages.slice(-50);
}
cached.updatedAt=Date.now();
saveChatCachePayload(partnerUid,cached);
});
};
function updateCachedMessageEntry(messageId,data){
if(!currentChatUid||!messageId)return;
var found=false;
for(var i=0;i<messages.length;i++){
if(messages[i].id===messageId){
messages[i].data=cloneMessageData(data);
found=true;
break;
}
}
if(!found){
messages.push({
id: messageId,
timestamp: data&&data.timestamp,
data: cloneMessageData(data)
});
}
persistChatCache(currentChatUid);
}
function getCachedMessageEntry(messageId){
for(var i=0;i<messages.length;i++){
if(messages[i].id===messageId){
return messages[i];
}
}
return null;
}
function rememberPrivateChat(partnerUid,partnerUsername,opts){
if(!partnerUid)return;
opts=opts||{};
try{
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
var existing=localChats[partnerUid]||{};
localChats[partnerUid]=Object.assign({},existing,{
username: partnerUsername||existing.username||"User",
online: typeof opts.online==="boolean" ? opts.online : (existing.online||false),
hasMessages: true,
lastActivity: Date.now(),
lastMessage: typeof opts.lastMessage==="string" ? opts.lastMessage : (existing.lastMessage||""),
timestamp: typeof opts.timestamp==="number" ? opts.timestamp : (typeof existing.timestamp==="number" ? existing.timestamp : 0),
lastMessageAt: typeof opts.timestamp==="number" ? opts.timestamp : (typeof existing.lastMessageAt==="number" ? existing.lastMessageAt : 0),
unreadCount: typeof opts.unreadCount==="number" ? opts.unreadCount : (typeof existing.unreadCount==="number" ? existing.unreadCount : 0),
chatRoomId: opts.chatRoomId||existing.chatRoomId||null,
profilePic: opts.profilePic||existing.profilePic||null
});
localStorage.setItem("privateChats",JSON.stringify(localChats));
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",localChats);}catch(e){}
}
}catch(e){}
}
function isKnownChatContact(partnerUid){
if(!partnerUid)return false;
if(loadedChats&&loadedChats[partnerUid])return true;
if(window._getChatEl&&window._getChatEl(partnerUid))return true;
try{
var lc=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(lc&&lc[partnerUid])return true;
}catch(e){}
return false;
}
function buildMessageKey(){
return (uid||"u")+"_m_"+Date.now()+"_"+Math.random().toString(36).slice(2,10);
}
function sendMessage(content,type,replyToId,duration){
var targetChatUid=currentChatUid;
if(!targetChatUid)return;
var sendSignature=targetChatUid+"|"+type+"|"+(content||"")+"|"+(replyToId||"")+"|"+(duration||"");
var nowSend=Date.now();
if(window._lastOutgoingSendSignature===sendSignature&&nowSend-(window._lastOutgoingSendAt||0)<800){
return;
}
window._lastOutgoingSendSignature=sendSignature;
window._lastOutgoingSendAt=nowSend;
var messageId=buildMessageKey();
var senderChatRef=db.ref("conversations/"+uid+"/"+targetChatUid+"/"+messageId);
var receiverChatRef=db.ref("conversations/"+targetChatUid+"/"+uid+"/"+messageId);
processedMessages[messageId]=true;
var optimisticData={
from: uid,
timestamp: Date.now(),
seen: false,
status: "queued"
};
if(type==="text"){
optimisticData.message=content;
}else if(type==="image"||type==="voice"||type==="video"){
optimisticData.mediaUrl=content;
optimisticData.mediaType=type;
if(type==="voice"&&duration){
optimisticData.duration=duration;
}
}
if(replyToId){
optimisticData.replyTo=replyToId;
}
if(currentChatUid===targetChatUid){
displayMessage(messageId,optimisticData);
if(chatBox)chatBox.scrollTop=chatBox.scrollHeight;
}
function abortOptimistic(notice){
try{
var el=document.getElementById("msg-"+messageId);
if(el&&el.parentElement){
var wrap=el.parentElement.classList&&el.parentElement.classList.contains("message-container")?el.parentElement:el;
if(wrap&&wrap.parentElement)wrap.parentElement.removeChild(wrap);
}
}catch(e){}
for(var mi=messages.length-1;mi>=0;mi--){
if(messages[mi]&&messages[mi].id===messageId){messages.splice(mi,1);}
}
delete processedMessages[messageId];
try{
var memCache=chatMessagesCache[targetChatUid];
if(memCache&&Array.isArray(memCache.messages)){
memCache.messages=memCache.messages.filter(function(m){return m&&m.id!==messageId;});
memCache.updatedAt=Date.now();
}
readChatCacheAsync(targetChatUid,function(cached){
var cleaned=normalizeChatCachePayload(cached);
cleaned.messages=(cleaned.messages||[]).filter(function(m){return m&&m.id!==messageId;});
cleaned.updatedAt=Date.now();
saveChatCachePayload(targetChatUid,cleaned);
});
}catch(e){}
if(notice&&typeof showNotification==="function")showNotification(notice);
}
function doFirebaseSend(){
var messageData={
from: uid,
timestamp: firebase.database.ServerValue.TIMESTAMP,
seen: false,
status: "sent"
};
if(type==="text"){
messageData.message=content;
}else if(type==="image"||type==="voice"||type==="video"){
messageData.mediaUrl=content;
messageData.mediaType=type;
if(type==="voice"&&duration){
messageData.duration=duration;
}
}
if(replyToId){
messageData.replyTo=replyToId;
}
if(window.__fbConnected===false||navigator.onLine===false){
if(type==="text"){
queueTextMessage(targetChatUid,content,replyToId,messageId,false,true,true);
}else{
queueMediaMessage(targetChatUid,content,type,replyToId,duration,messageId,false,true,true);
}
return;
}
senderChatRef.set(messageData).then(function(){
var chatRoomId=getDirectChatRoomId(uid,targetChatUid);
var nowTs=Date.now();
var outgoingPreview=buildPrivateChatPreviewText(messageData,uid);
syncPrivateChatEntry(uid,targetChatUid,{
username: currentChatUsername||targetChatUid,
lastMessage: outgoingPreview,
timestamp: nowTs,
unreadCount: 0,
chatRoomId: chatRoomId
},false);
syncPrivateChatEntry(targetChatUid,uid,{
username: username||uid,
lastMessage: outgoingPreview.replace(/^You:\s*/,""),
timestamp: nowTs,
unreadCount: firebase.database.ServerValue.increment(1),
chatRoomId: chatRoomId
},false);
moveChatToTop(targetChatUid);
var sentPreview=(type==="image")? "You: 📷 Photo" :
(type==="voice")? "You: 🎤 Voice" :
(type==="video")? "You: 🎬 Video" :
"You: "+(content||"");
var chatEl=window._getChatEl(targetChatUid);
if(chatEl){
var lmSpan=chatEl.querySelector('.chat-last-msg');
var tsSpan=chatEl.querySelector('.chat-time');
if(lmSpan){lmSpan.textContent=sentPreview;lmSpan.className="chat-last-msg";}
if(tsSpan){tsSpan.textContent=formatSendTime(Date.now());tsSpan.className="chat-time";}
}
var msgEl=document.getElementById("msg-"+messageId);
if(msgEl){
var sp=msgEl.querySelector(".message-status");
if(sp){sp.innerHTML="✓";sp.className="message-status single-tick";}
}
senderChatRef.once("value",function(snap){
var confirmed=snap.val();
if(confirmed&&confirmed.timestamp&&typeof confirmed.timestamp==='number'){
var msgEl2=document.getElementById("msg-"+messageId);
if(msgEl2){
var tsSpan=msgEl2.querySelector(".message-timestamp");
if(tsSpan)tsSpan.textContent=formatSendTime(confirmed.timestamp);
}
var cached=getCachedMessageEntry(messageId);
if(cached&&cached.data){
cached.data.timestamp=confirmed.timestamp;
cached.data.status="sent";
updateCachedMessageEntry(messageId,cached.data);
}
}
});
receiverChatRef.set(messageData).then(function(){
db.ref("presence1/"+targetChatUid).once("value",function(snap){
var presence=snap.val();
if(presence&&presence.online&&presence.currentChat===uid){
senderChatRef.update({
seen: true,
seenTimestamp: firebase.database.ServerValue.TIMESTAMP,
status: "seen"
});
receiverChatRef.update({
seen: true,
seenTimestamp: firebase.database.ServerValue.TIMESTAMP,
status: "seen"
});
}else if(presence&&presence.online){
senderChatRef.update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
receiverChatRef.update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
}
});
db.ref("conversations/"+uid+"/"+targetChatUid).once("value",function(convSnap){
var msgCount=0;
convSnap.forEach(function(){msgCount++;});
if(msgCount<=1){
db.ref("profiles/"+targetChatUid).once("value",function(profileSnap){
var profile=profileSnap.val()||{};
var uname=profile.username||currentChatUsername;
if(!uname||uname===targetChatUid||uname.length>40){
db.ref("presence1/"+targetChatUid).once("value",function(presSnap){
var pres=presSnap.val()||{};
uname=pres.username||"User";
if(uname&&uname!==targetChatUid){
rememberPrivateChat(targetChatUid,uname,{online: false});
if(!window._getChatEl(targetChatUid)){
createChatElement(targetChatUid,uname,false);
}
}
});
}else{
rememberPrivateChat(targetChatUid,uname,{online: false});
if(!window._getChatEl(targetChatUid)){
createChatElement(targetChatUid,uname,false);
}
}
});
}
});
});
db.ref("mixer/"+uid+"/"+targetChatUid).push({
word: getRandomWord(),
timestamp: Date.now()
});
db.ref("mixer/"+targetChatUid+"/"+uid).push({
word: getRandomWord(),
timestamp: Date.now()
});
if(type==="text"){
senderChatRef.update({seen: false});
}
replyingToMessageId=null;
replyInputPreview.classList.remove("visible");replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
messageInput.placeholder="Enter your message";
}).catch(function(){
  // Net slow/flaky hone par Firebase .set() reject ho sakta hai HALKE write
  // server par already land ho chuka ho. Agar wo write maujood hai to dobara
  // queue mein daalna (aur unread double-increment karna) galat hai — bas
  // tick/cache sync karo. Agar sach mein nahi likha gaya to hi queue karo.
  db.ref("conversations/"+uid+"/"+targetChatUid+"/"+messageId).once("value",function(snap){
    if(snap&&snap.exists()){
      try{
        // Mirror receiver node par bhi bhar do (sender write land hua, lekin
        // success .then na chalne ki wajah se receiver mirror missing tha)
        try{receiverChatRef.set(messageData).catch(function(){});}catch(rex){}
        var landedEl=document.getElementById("msg-"+messageId);
        if(landedEl){
          var landedSp=landedEl.querySelector(".message-status");
          if(landedSp){landedSp.innerHTML="✓";landedSp.className="message-status single-tick";}
        }
        var landedCached=getCachedMessageEntry(messageId);
        if(landedCached&&landedCached.data){
          landedCached.data.status="sent";
          updateCachedMessageEntry(messageId,landedCached.data);
        }
        var previewMsg=buildPrivateChatPreviewText({
          from: uid, message: type==="text"?content:"",
          mediaType: type, mediaUrl: type==="text"?null:content,
          timestamp: Date.now()
        },uid);
        var chatRoomId=getDirectChatRoomId(uid,targetChatUid);
        syncPrivateChatEntry(uid,targetChatUid,{
          username: currentChatUsername||targetChatUid,
          lastMessage: previewMsg,
          timestamp: Date.now(),
          unreadCount: 0,
          chatRoomId: chatRoomId
        },false);
        syncPrivateChatEntry(targetChatUid,uid,{
          username: username||uid,
          lastMessage: previewMsg.replace(/^You:\s*/,""),
          timestamp: Date.now(),
          unreadCount: firebase.database.ServerValue.increment(1),
          chatRoomId: chatRoomId
        },false);
      }catch(landedErr){}
      return;
    }
    if(type==="text"){
      queueTextMessage(targetChatUid,content,replyToId,messageId,false,false,true);
    }else{
      queueMediaMessage(targetChatUid,content,type,replyToId,duration,messageId,false,false,true);
    }
  },function(){
    if(type==="text"){
      queueTextMessage(targetChatUid,content,replyToId,messageId,false,false,true);
    }else{
      queueMediaMessage(targetChatUid,content,type,replyToId,duration,messageId,false,false,true);
    }
  });
});
}
if(window._spamAllowedCache&&window._spamAllowedCache[targetChatUid]===false){
abortOptimistic("Cannot send message!\n\nThis user has spam protection enabled.");
return;
}
if(window._spamAllowedCache&&window._spamAllowedCache[targetChatUid]===true){
doFirebaseSend();
return;
}
if(isKnownChatContact(targetChatUid)){
doFirebaseSend();
canSendMessageTo(targetChatUid);
return;
}
canSendMessageTo(targetChatUid).then(function(allowed){
if(!allowed){
abortOptimistic("Cannot send message!\n\nThis user has spam protection enabled.");
return;
}
doFirebaseSend();
});
}
/* Send a media message to a user WITHOUT needing that chat to be open.
   Used by the offline share queue (share.js) once connectivity returns. */
function sendMediaMessageToUid(targetUid,mediaUrl,mediaType,cb,duration,replyToId,options){
if(!targetUid||!mediaUrl){ if(cb)cb(false); return; }
canSendMessageTo(targetUid).then(function(allowed){
if(!allowed){ if(cb)cb(false,"blocked"); return; }
var messageData={
from: uid,
timestamp: firebase.database.ServerValue.TIMESTAMP,
seen: false,
status: "sent",
mediaUrl: mediaUrl,
mediaType: mediaType
};
if(mediaType==="voice"&&duration){
messageData.duration=duration;
}
if(replyToId){
messageData.replyTo=replyToId;
}
var messageId=(options&&options.messageId)?String(options.messageId):buildMessageKey();
var senderChatRef=db.ref("conversations/"+uid+"/"+targetUid+"/"+messageId);
var receiverChatRef=db.ref("conversations/"+targetUid+"/"+uid+"/"+messageId);
if(options&&typeof options.onStart==="function"){
options.onStart(messageId,messageData,senderChatRef,receiverChatRef);
}
senderChatRef.set(messageData).then(function(){
receiverChatRef.set(messageData);
var chatRoomId=getDirectChatRoomId(uid,targetUid);
var nowTs=Date.now();
var preview=buildPrivateChatPreviewText(messageData,uid);
syncPrivateChatEntry(uid,targetUid,{
username: currentChatUsername||targetUid,
lastMessage: preview,
timestamp: nowTs,
unreadCount: 0,
chatRoomId: chatRoomId
},false);
syncPrivateChatEntry(targetUid,uid,{
username: username||uid,
lastMessage: preview.replace(/^You:\s*/,""),
timestamp: nowTs,
unreadCount: firebase.database.ServerValue.increment(1),
chatRoomId: chatRoomId
},false);
moveChatToTop(targetUid);
var chatEl=window._getChatEl(targetUid);
if(chatEl){
var lmSpan=chatEl.querySelector('.chat-last-msg');
var tsSpan=chatEl.querySelector('.chat-time');
var preview=mediaType==="image"?"You: 📷 Photo":mediaType==="video"?"You: 🎬 Video":"You: 🎤 Voice";
if(lmSpan){lmSpan.textContent=preview;lmSpan.className="chat-last-msg";}
if(tsSpan){tsSpan.textContent=formatSendTime(Date.now());tsSpan.className="chat-time";}
}
senderChatRef.once("value",function(snap){
var confirmed=snap.val()||messageData;
if(confirmed&&confirmed.timestamp&&typeof confirmed.timestamp==='number'){
confirmed.status=confirmed.status||"sent";
}
if(cb)cb(true,null,messageId,confirmed||messageData);
});
}).catch(function(err){ if(cb)cb(false,err&&err.message); });
});
}
function formatTimestamp(timestamp){
var date=new Date(timestamp);
return date.toLocaleDateString()+" "+date.toLocaleTimeString();
}

/* ---------------- Offline outgoing queue (text + media) ---------------- */
function getOutgoingQueue(cb){
if(Array.isArray(window._outgoingQueueCache)){
cb(window._outgoingQueueCache.slice());
return;
}
if(typeof window.idbGet==="function"){
window.idbGet("outgoingQueue",function(val){
window._outgoingQueueCache=Array.isArray(val)?val.slice():[];
cb(window._outgoingQueueCache.slice());
});
}else{
try{
var raw=JSON.parse(localStorage.getItem("outgoingQueue")||"[]");
window._outgoingQueueCache=Array.isArray(raw)?raw.slice():[];
cb(window._outgoingQueueCache.slice());
}
catch(e){cb([]);}
}
}
function saveOutgoingQueue(queue){
window._outgoingQueueCache=Array.isArray(queue)?queue.slice():[];
if(typeof window.idbSet==="function"){
window.idbSet("outgoingQueue",window._outgoingQueueCache);
}else{
try{localStorage.setItem("outgoingQueue",JSON.stringify(window._outgoingQueueCache));}catch(e){}
}
}
function queueOutgoingItem(item){
  getOutgoingQueue(function(queue){
    var idx=-1;
    for(var i=0;i<queue.length;i++){
      if(queue[i]&&queue[i].id===item.id){idx=i;break;}
    }
    if(idx>=0)queue[idx]=item;
    else queue.push(item); // strict FIFO — kabhi bhi agey nahi dala jata
    saveOutgoingQueue(queue);
    if(navigator.onLine&&typeof processOutgoingQueue==="function"){
      setTimeout(function(){processOutgoingQueue(true);},20);
    }
  });
}
function removeFromOutgoingQueue(id){
getOutgoingQueue(function(queue){
saveOutgoingQueue(queue.filter(function(q){return q.id!==id;}));
});
}
// Show a message immediately (before it's actually sent) with a "queued" clock icon,
// and keep it in the local chat cache so it survives closing/reopening the chat
// while still offline.
function displayQueuedMessage(localId,targetUid,type,previewContent,replyToId,duration){
var data={
from: uid,
timestamp: Date.now(),
seen: false,
status: "queued",
queuedLocalId: localId
};
if(type==="text"){
data.message=previewContent;
}else{
data.mediaUrl=previewContent; // local blob: URL for instant preview
data.mediaType=type;
}
if(replyToId){
data.replyTo=replyToId;
}
if(type==="voice"&&duration){
data.duration=duration;
}
if(currentChatUid===targetUid){
displayMessage(localId,data);
chatBox.scrollTop=chatBox.scrollHeight;
}
processedMessages[localId]=true;
if(currentChatUid===targetUid){
updateCachedMessageEntry(localId,data);
}
}
function sendTextMessageToUid(targetUid,text,cb,replyToId,options){
if(!targetUid||!text){if(cb)cb(false);return;}
function proceed(){
var messageData={
from: uid,
timestamp: firebase.database.ServerValue.TIMESTAMP,
seen: false,
status: "sent",
message: text
};
if(replyToId)messageData.replyTo=replyToId;
var messageId=(options&&options.messageId)?String(options.messageId):buildMessageKey();
var senderChatRef=db.ref("conversations/"+uid+"/"+targetUid+"/"+messageId);
var receiverChatRef=db.ref("conversations/"+targetUid+"/"+uid+"/"+messageId);
if(options&&typeof options.onStart==="function"){
options.onStart(messageId,messageData,senderChatRef,receiverChatRef);
}
senderChatRef.set(messageData).then(function(){
receiverChatRef.set(messageData);
var chatRoomId=getDirectChatRoomId(uid,targetUid);
var nowTs=Date.now();
var preview=buildPrivateChatPreviewText(messageData,uid);
syncPrivateChatEntry(uid,targetUid,{
username: currentChatUsername||targetUid,
lastMessage: preview,
timestamp: nowTs,
unreadCount: 0,
chatRoomId: chatRoomId
},false);
syncPrivateChatEntry(targetUid,uid,{
username: username||uid,
lastMessage: preview.replace(/^You:\s*/,""),
timestamp: nowTs,
unreadCount: firebase.database.ServerValue.increment(1),
chatRoomId: chatRoomId
},false);
senderChatRef.once("value",function(snap){
var confirmed=snap.val()||messageData;
if(cb)cb(true,null,messageId,confirmed||messageData);
});
}).catch(function(err){if(cb)cb(false,err&&err.message);});
}
if(isKnownChatContact(targetUid)||(window._spamAllowedCache&&window._spamAllowedCache[targetUid]===true)){
proceed();
return;
}
canSendMessageTo(targetUid).then(function(allowed){
if(!allowed){if(cb)cb(false,"blocked");return;}
window._spamAllowedCache=window._spamAllowedCache||{};
window._spamAllowedCache[targetUid]=true;
proceed();
});
}
function queueTextMessage(targetUid,text,replyToId,localId,showInChat,showNotice,priority){
localId=localId||("queued_"+Date.now()+"_"+Math.random().toString(36).slice(2,8));
queueOutgoingItem({id:localId,toUid:targetUid,type:"text",content:text,replyToId:replyToId||null,createdAt:Date.now(),priority:!!priority});
if(showInChat!==false){
displayQueuedMessage(localId,targetUid,"text",text,replyToId||null);
}
if(showNotice!==false){
showNotification(navigator.onLine ? "Message saved. It will send automatically once it can connect." : "You're offline — message will send automatically once you're back online.");
}
if(navigator.onLine)setTimeout(function(){processOutgoingQueue(true);},30);
}
function queueMediaMessage(targetUid,file,mediaType,replyToId,duration,localId,showInChat,showNotice,priority){
localId=localId||("queued_"+Date.now()+"_"+Math.random().toString(36).slice(2,8));
var queueItem={id:localId,toUid:targetUid,type:mediaType,replyToId:replyToId||null,duration:duration||null,createdAt:Date.now(),priority:!!priority};
if(typeof file==="string"){
queueItem.mediaUrl=file;
}else{
queueItem.blob=file;
}
queueOutgoingItem(queueItem);
var localPreviewUrl=null;
if(typeof file==="string"){
localPreviewUrl=file;
}else{
try{localPreviewUrl=URL.createObjectURL(file);}catch(e){}
}
if(showInChat!==false){
displayQueuedMessage(localId,targetUid,mediaType,localPreviewUrl||"",replyToId||null,duration||null);
}
if(showNotice!==false){
showNotification(navigator.onLine ? "Media saved. It will upload and send once it can connect." : "You're offline — will upload and send once you're back online.");
}
if(navigator.onLine)setTimeout(function(){processOutgoingQueue(true);},30);
}
var _processingOutgoingQueue=false;
function processOutgoingQueue(force){
  if(_processingOutgoingQueue)return;
  if(!uid)return;
  _processingOutgoingQueue=true;
  getOutgoingQueue(function(queue){
    if(!queue.length){_processingOutgoingQueue=false;return;}
    var item=queue[0];
    function finishOne(ok,err,realMessageId,realData,targetUid){
      if(ok&&realMessageId){
        processedMessages[realMessageId]=true;
        delete processedMessages[item.id];
        replaceCachedQueuedMessage(targetUid,item.id,realMessageId,realData||{});
        if(currentChatUid===targetUid){
          var el=document.getElementById("msg-"+item.id);
          if(el){
            el.id="msg-"+realMessageId;
            var statusSpan=el.querySelector(".message-status");
            if(statusSpan){
              statusSpan.textContent="✓";
              statusSpan.className="message-status single-tick";
            }
          }
        }
        queue.shift();
        saveOutgoingQueue(queue);
      }else if(err==="blocked"){
        // Permanent block: yeh message kabhi send nahi ho sakta — drop kar do,
        // taake baqi queue atki na rahe.
        var blockedItem=queue.shift();
        saveOutgoingQueue(queue);
        if(blockedItem){
          try{
            delete processedMessages[blockedItem.id];
            if(currentChatUid===blockedItem.toUid){
              var bel=document.getElementById("msg-"+blockedItem.id);
              if(bel&&bel.parentElement){
                var bwrap=bel.parentElement.classList&&bel.parentElement.classList.contains("message-container")?bel.parentElement:bel;
                if(bwrap&&bwrap.parentElement)bwrap.parentElement.removeChild(bwrap);
              }
            }
            var memCache=chatMessagesCache[blockedItem.toUid];
            if(memCache&&Array.isArray(memCache.messages)){
              memCache.messages=memCache.messages.filter(function(m){return m&&m.id!==blockedItem.id;});
              memCache.updatedAt=Date.now();
            }
            readChatCacheAsync(blockedItem.toUid,function(cached){
              var cleaned=normalizeChatCachePayload(cached);
              cleaned.messages=(cleaned.messages||[]).filter(function(m){return m&&m.id!==blockedItem.id;});
              cleaned.updatedAt=Date.now();
              saveChatCachePayload(blockedItem.toUid,cleaned);
            });
            showNotification("Message couldn't be sent — blocked.");
          }catch(blockErr){}
        }
      }else{
        // Transient failure. Order KABHI mat todo: failed item ko head pr rakho
        // aur wapis try karo. Sirf repeatedly online-fail hone par (deadlock se
        // bachne ke liye) tail pr le jao.
        var failedItem=queue[0];
        if(failedItem){
          if(navigator.onLine!==false){
            failedItem._retries=(failedItem._retries||0)+1;
            if(failedItem._retries>=8){
              queue.shift();
              queue.push(failedItem);
              failedItem._retries=0;
            }
          }
          // offline: head pr hi rahega; poll/online-event dobara try karega
          saveOutgoingQueue(queue);
        }
      }
      _processingOutgoingQueue=false;
      if(ok||err==="blocked"){
        setTimeout(function(){processOutgoingQueue(true);},50);
      }else if(navigator.onLine!==false){
        setTimeout(function(){processOutgoingQueue(true);},3000);
      }
    }
    if(item.type==="text"){
      sendTextMessageToUid(item.toUid,item.content,function(ok,err,realId,realData){
        if(ok)finishOne(true,null,realId,realData,item.toUid);
        else finishOne(false,err,null,null,item.toUid);
      },item.replyToId||null,{
messageId:item.id,onStart:function(realId,realData){
processedMessages[realId]=true;
delete processedMessages[item.id];
var queuedData=cloneMessageData(Object.assign({},realData||{},{
status:"queued"
}));
replaceCachedQueuedMessage(item.toUid,item.id,realId,queuedData);
}
});
    }else if(item.mediaUrl&&typeof sendMediaMessageToUid==="function"){
      sendMediaMessageToUid(item.toUid,item.mediaUrl,item.type,function(ok,err,realId,realData){
        if(ok)finishOne(true,null,realId,realData,item.toUid);
        else finishOne(false,err,null,null,item.toUid);
      },item.duration||null,item.replyToId||null,{
messageId:item.id,onStart:function(realId,realData){
processedMessages[realId]=true;
delete processedMessages[item.id];
var queuedData=cloneMessageData(Object.assign({},realData||{},{
status:"queued"
}));
replaceCachedQueuedMessage(item.toUid,item.id,realId,queuedData);
}
});
    }else if(item.blob&&typeof uploadToCloudinary==="function"){
      var fakeUi={setLabel:function(){},setProgress:function(){},remove:function(){}};
      var blobCancelled=false;
      var qItemId=item.id;
      var blobCtrl=null;
      function cleanupBlobAbort(){
        try{
          if(window._queueUploadAbort&&window._queueUploadAbort[qItemId]){
            delete window._queueUploadAbort[qItemId];
          }
        }catch(e){}
      }
      fakeUi._onControllerReady=function(controller){
        blobCtrl=controller;
        window._queueUploadAbort=window._queueUploadAbort||{};
        if(controller&&controller.abort){
          window._queueUploadAbort[qItemId]=function(){
            if(!blobCancelled){
              blobCancelled=true;
              try{controller.abort();}catch(e){}
            }
          };
        }
      };
      uploadToCloudinary(item.blob,fakeUi,function(url){
        if(blobCancelled)return;
        cleanupBlobAbort();
        sendMediaMessageToUid(item.toUid,url,item.type,function(ok,err,realId,realData){
          if(ok)finishOne(true,null,realId,realData,item.toUid);
          else finishOne(false,err,null,null,item.toUid);
        },item.duration||null,item.replyToId||null,{
          messageId:item.id,onStart:function(realId,realData){
            processedMessages[realId]=true;
            delete processedMessages[item.id];
            var queuedData=cloneMessageData(Object.assign({},realData||{},{
              status:"queued"
            }));
            replaceCachedQueuedMessage(item.toUid,item.id,realId,queuedData);
          }
        });
      },function(){ // upload error
        if(blobCancelled)return;
        cleanupBlobAbort();
        finishOne(false,"upload",null,null,item.toUid);
      },function(){},function(){ // user cancel (delete/queue se cancel)
        blobCancelled=true;
        cleanupBlobAbort();
        getOutgoingQueue(function(nowQueue){
          var stillIn=nowQueue.filter(function(q){return q&&q.id!==qItemId;});
          if(stillIn.length!==nowQueue.length){
            saveOutgoingQueue(stillIn);
          }
        });
        _processingOutgoingQueue=false;
        setTimeout(function(){processOutgoingQueue(true);},50);
      });
    }else{
      finishOne(false,"unknown",null,null,item.toUid);
    }
});
}
window.addEventListener("online",function(){
setTimeout(function(){processOutgoingQueue(true);},500);
});
// The browser 'online' event is unreliable on many KaiOS devices
// (especially cellular reconnects), so also poll periodically as a
// robust fallback — this guarantees queued messages eventually go out
// as long as the app stays open and there's actually a connection.
setInterval(function(){
processOutgoingQueue(true);
},15000);
function formatMessageTime(timestamp){
if(!timestamp)return "";
const date=new Date(timestamp);
const hours=date.getHours();
const minutes=date.getMinutes();
const ampm=hours>=12 ? 'pm' : 'am';
const formattedHours=hours % 12||12;
return `${formattedHours}:${minutes<10 ? '0'+minutes : minutes}${ampm}`;
}
function isAutoDownloadEnabled(){
return localStorage.getItem("autoDownloadMedia")!=="false";
}
function toggleAutoDownloadMedia(){
var enabled=isAutoDownloadEnabled();
localStorage.setItem("autoDownloadMedia",enabled?"false":"true");
showNotification(enabled?"Auto-download turned off":"Auto-download turned on");
}
function toggleFullScreen(element){
var existingOverlay=document.getElementById("imgFullscreenOverlay");
if(existingOverlay){
existingOverlay.remove();
return;
}
var overlay=document.createElement("div");
overlay.id="imgFullscreenOverlay";
overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:9999;display:flex;align-items:center;justify-content:center;";
var img=document.createElement("img");
img.src=element.src;
img.style.cssText="max-width:100%;max-height:100%;object-fit:contain;";
overlay.appendChild(img);
document.body.appendChild(overlay);
overlay.tabIndex=0;
if(window._focusTrap)window._focusTrap.suppress(overlay);
setTimeout(function(){overlay.focus();},30);
function closeImgFullscreen(){
overlay.remove();
if(window._focusTrap)window._focusTrap.restore();
if(element&&document.contains(element))element.focus();
}
// Any key closes the viewer and returns focus to the message it came
// from — the previous version only recognized a fixed list of keys and
// swallowed everything else (preventDefault + stopPropagation with no
// action), which could leave the D-pad appearing completely unresponsive
// ("hung") for any key not on that list.
overlay.addEventListener("keydown",function(ev){
ev.preventDefault();
ev.stopPropagation();
closeImgFullscreen();
});
overlay.addEventListener("click",closeImgFullscreen);
// Downloading happens after the viewer is already visible, not before —
// so opening the image is never delayed by (or dependent on) the
// download succeeding.
if(isAutoDownloadEnabled()){
setTimeout(function(){
try{
var dlLink=document.createElement("a");
dlLink.href=element.src;
dlLink.download="chitchat_"+Date.now()+".jpg";
document.body.appendChild(dlLink);
dlLink.click();
document.body.removeChild(dlLink);
}catch(e){}
},0);
}
}
function startRecording(){
if(isRecording)return;
if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){
navigator.mediaDevices.getUserMedia({audio: true})
.then(function(stream){
hideDropdown();
var recOptions={};
if(typeof MediaRecorder!=="undefined"&&MediaRecorder.isTypeSupported){
if(MediaRecorder.isTypeSupported("audio/ogg;codecs=opus")){
recOptions={mimeType: "audio/ogg;codecs=opus"};
}else if(MediaRecorder.isTypeSupported("audio/ogg")){
recOptions={mimeType: "audio/ogg"};
}else if(MediaRecorder.isTypeSupported("audio/webm;codecs=opus")){
recOptions={mimeType: "audio/webm;codecs=opus"};
}
}
mediaRecorder=new MediaRecorder(stream,recOptions);
recordedChunks=[];
mediaRecorder.ondataavailable=function(e){
recordedChunks.push(e.data);
};
mediaRecorder.start();
isRecording=true;
recordingStartTime=Date.now();
setRecordingStatus(uid,true,currentChatUid);
var messageInputContainer=document.getElementById("messageInputContainer");
messageInputContainer.style.display="none";
softkeyLeft.innerHTML="";
softkeyCenter.innerHTML="Stop";
softkeyRight.innerHTML="";
var recordingContainer=document.createElement("div");
recordingContainer.id="recordingContainer";
recordingContainer.style.cssText="display:flex;align-items:center;justify-content:center;gap:10px;padding:8px;background:#fff3;border-top:1px solid #d1d7db;";
var micIcon=document.createElement("span");
micIcon.style.cssText="font-size:20px;color:#d32f2f;animation:recordPulse 1s infinite;";
micIcon.textContent="🎤";
var timerSpan=document.createElement("span");
timerSpan.id="recordingTimer";
timerSpan.style.cssText="font-size:13px;font-weight:bold;color:#d32f2f;";
timerSpan.textContent="0s";
var hintSpan=document.createElement("span");
hintSpan.style.cssText="font-size:10px;color:#666;";
hintSpan.textContent="Enter=Stop";
recordingContainer.appendChild(micIcon);
recordingContainer.appendChild(timerSpan);
recordingContainer.appendChild(hintSpan);
chatPage.appendChild(recordingContainer);
recordingTimer=setInterval(function(){
var elapsed=Math.floor((Date.now()-recordingStartTime)/1000);
timerSpan.textContent=elapsed+"s";
},1000);
})
.catch(function(err){
showNotification("Unable to access microphone.");
isRecording=false;
setRecordingStatus(uid,false);
});
}else{
showNotification("Voice recording is not supported on this device.");
}
}
function stopRecording(){
if(mediaRecorder&&isRecording){
var lockedVoiceChatUid=currentChatUid;
var lockedVoiceReplyId=replyingToMessageId;
mediaRecorder.stop();
mediaRecorder.onstop=function(){
clearInterval(recordingTimer);
var duration=Math.floor((Date.now()-recordingStartTime)/1000);
isRecording=false;
setRecordingStatus(uid,false);
var recordingContainer=document.getElementById("recordingContainer");
if(recordingContainer){
recordingContainer.remove();
}
var messageInputContainer=document.getElementById("messageInputContainer");
messageInputContainer.style.display="none";
var isVoicePlaying=false;
var voiceAudio=null;
var voiceControls=document.createElement("div");
voiceControls.id="voiceControls";
voiceControls.style.cssText="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#f0f2f5;border-top:1px solid #d1d7db;";
voiceControls.tabIndex=-1;
var voiceIcon=document.createElement("span");
voiceIcon.style.cssText="font-size:18px;";
voiceIcon.textContent="🎤";
var voiceInfo=document.createElement("span");
voiceInfo.id="voicePreviewInfo";
voiceInfo.style.cssText="flex:1;font-size:11px;color:#333;";
voiceInfo.textContent="🎤 Voice("+duration+"s)";
voiceControls.appendChild(voiceIcon);
voiceControls.appendChild(voiceInfo);
chatPage.appendChild(voiceControls);
softkeyLeft.innerHTML="Delete";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Play";
chatPage._voiceMode=true;
chatPage._voiceDuration=duration;
chatPage._voicePlay=function(){
if(voiceAudio){
voiceAudio.pause();
voiceAudio=null;
isVoicePlaying=false;
softkeyRight.innerHTML="Play";
voiceInfo.textContent="🎤 Voice("+duration+"s)";
return;
}
var blob=new Blob(recordedChunks,{type: 'audio/webm'});
var url=URL.createObjectURL(blob);
voiceAudio=new Audio(url);
voiceAudio.play();
isVoicePlaying=true;
softkeyRight.innerHTML="Pause";
voiceInfo.textContent="▶ Playing...";
voiceAudio.onended=function(){
isVoicePlaying=false;
voiceAudio=null;
softkeyRight.innerHTML="Play";
voiceInfo.textContent="🎤 Voice("+duration+"s)";
};
};
chatPage._voiceSend=function(){
if(voiceAudio){voiceAudio.pause();voiceAudio=null;}
isVoicePlaying=false;
chatPage._voiceMode=false;
var mimeType="audio/webm";
var ext=".webm";
if(recordedChunks.length>0){
if(typeof MediaRecorder!=="undefined"&&MediaRecorder.isTypeSupported){
if(MediaRecorder.isTypeSupported("audio/ogg")){
mimeType="audio/ogg";
ext=".ogg";
}
}
}
var blob=new Blob(recordedChunks,{type: mimeType});
var namedFile=new File([blob],"voice_"+Date.now()+ext,{type: mimeType});
voiceControls.remove();
messageInputContainer.style.display="flex";
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Back";
  var voiceUploadCancelled=false;
  uploadFileToCloudinary(namedFile,
  function(progress){},
  function(url){
    if(voiceUploadCancelled)return;
    var savedChatUid=currentChatUid;
    currentChatUid=lockedVoiceChatUid;
    sendMessage(url,"voice",lockedVoiceReplyId,duration);
    currentChatUid=savedChatUid;
    messageInput.focus();
  },
  function(error){
    if(voiceUploadCancelled)return;
    queueMediaMessage(lockedVoiceChatUid,namedFile,"voice",lockedVoiceReplyId,duration);
    messageInput.focus();
  },
  function(){voiceUploadCancelled=true;}
  );
};
chatPage._voiceDelete=function(){
if(voiceAudio){voiceAudio.pause();voiceAudio=null;}
isVoicePlaying=false;
chatPage._voiceMode=false;
recordedChunks=[];
voiceControls.remove();
messageInputContainer.style.display="flex";
messageInput.focus();
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Back";
};
};
mediaRecorder.stream.getTracks().forEach(function(track){track.stop();});
}
}
function cancelReplyPreview(){
replyingToMessageId=null;
replyInputPreview.classList.remove("visible");
replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
if(messageInput)messageInput.focus();
}
function cancelEditMode(){
messageInput._editingMsgId=null;
messageInput.value="";
messageInput.style.height="auto";
replyInputPreview.classList.remove("visible");
replyInputPreview.style.display="";
replyInputPreview.style.visibility="";
replyInputPreview.innerHTML="";
softkeyCenter.innerHTML="Send";
setTimeout(function(){
if(!messageInput._editingMsgId){
messageInput.value="";
replyInputPreview.classList.remove("visible");
replyInputPreview.style.display="";
replyInputPreview.style.visibility="";
}
},50);
messageInput.focus();
}
function saveEditedMessage(msgId,newText){
if(!newText||!newText.trim())return;
var update={message: newText.trim(),edited: true,editedAt: Date.now()};
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+msgId).update(update);
db.ref("conversations/"+currentChatUid+"/"+uid+"/"+msgId).update(update);
try{
var msgElEdit=document.getElementById("msg-"+msgId);
if(msgElEdit){
var textSpan=msgElEdit.querySelector(".message-text");
if(textSpan)textSpan.textContent=newText.trim();
var editedLabel=msgElEdit.querySelector(".edited-label");
if(!editedLabel){
editedLabel=document.createElement("span");
editedLabel.className="edited-label";
editedLabel.style.cssText="font-size:9px;color:#888;font-style:italic;margin-left:4px;";
editedLabel.textContent="edited";
if(textSpan&&textSpan.parentElement){
// Insert right after the text (works regardless of whether the
// timestamp lives directly in the message or inside a nested
// .message-footer wrapper — insertBefore requires a DIRECT child,
// which .message-timestamp often isn't).
if(textSpan.nextSibling){
textSpan.parentElement.insertBefore(editedLabel,textSpan.nextSibling);
}else{
textSpan.parentElement.appendChild(editedLabel);
}
}else{
msgElEdit.appendChild(editedLabel);
}
}
}
var cached=getCachedMessageEntry(msgId);
if(cached&&cached.data){
cached.data.message=newText.trim();
cached.data.edited=true;
cached.data.editedAt=Date.now();
updateCachedMessageEntry(msgId,cached.data);
}
}catch(e){
// even if DOM update fails for any reason, never let it block clearing the input
}finally{
cancelEditMode();
}
}
function updatePlaybackTimer(){
if(isAudioPlaying&&currentAudio){
clearInterval(playbackTimer);
playbackTimer=setInterval(function(){
audioCurrentTime=Math.floor(currentAudio.currentTime);
var activeMessage=currentAudio._messageId ? document.getElementById("msg-"+currentAudio._messageId): null;
if(activeMessage){
var durationEl=activeMessage.querySelector(".voice-meta-row .voice-duration");
if(durationEl){
durationEl.textContent=formatTime(audioCurrentTime)+"/"+formatTime(audioDuration||0);
}
}
},1000);
}
}
function formatTime(seconds){
var mins=Math.floor(seconds/60);
var secs=Math.floor(seconds % 60);
return mins+":"+(secs<10 ? "0" : "")+secs;
}
function resetChatState(){
if(typeof cancelEditMode==="function"){
try{cancelEditMode();}catch(e){}
}
if(typeof hideDropdown==="function"&&isDropdownVisible){
try{hideDropdown(false);}catch(e){}
}
if(typeof hideEmojiContainer==="function"){
try{hideEmojiContainer();}catch(e){}
}
if(typeof hideActionContainer==="function"){
try{hideActionContainer();}catch(e){}
}
if(typingTimeout){
clearTimeout(typingTimeout);
typingTimeout=null;
}
replyingToMessageId=null;
isRecording=false;
if(chatPage){
chatPage._voiceMode=false;
chatPage._voiceSend=null;
chatPage._voicePlay=null;
chatPage._voiceDelete=null;
}
var recordHint=document.getElementById("recordHintBar");
if(recordHint)recordHint.remove();
var loading=document.getElementById("loadingMessages");
if(loading)loading.remove();
if(messageInput){
messageInput._editingMsgId=null;
messageInput.value="";
messageInput.style.height="auto";
}
if(replyInputPreview){
replyInputPreview.classList.remove("visible");
replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
}
}
function openChat(chatUid){
searchContainer.style.display="none";
searchResults.style.display="none";
searchResults.innerHTML="";
searchInput.value="";
var spinEl=document.getElementById("searchLoadingIndicator");
if(spinEl)spinEl.style.display="none";
isSearching=false;
lastFocusedChatElement=document.activeElement;
mainPage.classList.remove("active");
chatPage.classList.add("active");
if(typeof window.hideChatLoadingOverlay==="function")window.hideChatLoadingOverlay();
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Back";
resetChatState();
pushChatHistory();
currentChatUid=chatUid;
currentOpenChatUid=chatUid;
if(uid){setupFinalNotifications();}
currentChatUsername="";
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
var cachedUsername=pendingOpenChatUsername||(localChats[chatUid]&&localChats[chatUid].username)||currentChatUsername||"User";
var cachedStatus=pendingOpenChatStatus||"";
currentChatUsername=cachedUsername;
pendingOpenChatUsername=null;
pendingOpenChatStatus=null;
var tabBar=document.getElementById("mainTabBar");
if(tabBar)tabBar.style.display="none";
var chatHeaderEl=document.getElementById("chatHeader");
if(chatHeaderEl){
chatHeaderEl.classList.add("active");
chatHeaderEl.style.display="flex";
var headerAvatar=document.getElementById("chatHeaderAvatar");
var headerName=document.getElementById("chatHeaderName");
var headerStatus=document.getElementById("chatHeaderStatus");
if(headerAvatar)headerAvatar.src=localStorage.getItem("profilePic_"+chatUid)||"icons/default.png";
if(headerName)headerName.textContent=cachedUsername||"User";
if(headerStatus)headerStatus.textContent=cachedStatus||"Loading...";
}
db.ref("profiles/"+chatUid+"/username").once("value",function(snap){
var freshName=snap.val();
if(!freshName){
db.ref("presence1/"+chatUid+"/username").once("value",function(snap2){
var n=snap2.val()||cachedUsername;
currentChatUsername=n;
var el=document.getElementById("chatHeaderName");
if(el)el.textContent=n;
});
}else{
currentChatUsername=freshName;
var el=document.getElementById("chatHeaderName");
if(el)el.textContent=freshName;
}
});
setTimeout(function(){
  var msgInput=document.getElementById("messageInput");
  if(msgInput)msgInput.focus();
  // Scroll to bottom will be called after messages are loaded
},50);
if(chatRef){chatRef.off();chatRef=null;}
if(otherChatRef){otherChatRef.off();otherChatRef=null;}
for(var k in activeChatListeners){
if(activeChatListeners.hasOwnProperty(k)){
activeChatListeners[k].forEach(function(r){if(r&&r.off)r.off();});
}
}
activeChatListeners={};
chatRef=db.ref("conversations/"+uid+"/"+chatUid);
otherChatRef=db.ref("conversations/"+chatUid+"/"+uid);
activeChatListeners[chatUid]=[chatRef,otherChatRef];
messages=[];
processedMessages={};
hideNewMsgBadge();
chatBox.innerHTML='<div class="loading-messages" id="loadingMessages"><span class="loading-spinner"></span>Getting messages...</div>';
var cachedPic=null;
try{cachedPic=localStorage.getItem("profilePic_"+chatUid);}catch(e){}
var cachedName=null;
try{cachedName=localStorage.getItem("username_"+chatUid)||currentChatUsername;}catch(e){}
var cachedStatus=null;
try{cachedStatus=localStorage.getItem("lastSeen_"+chatUid);}catch(e){}
if(cachedPic){
var hPicEl=document.getElementById("chatHeaderAvatar");
if(hPicEl)hPicEl.src=cachedPic;
}
if(cachedName){
var nameEl2=document.getElementById("chatHeaderName");
if(nameEl2)nameEl2.textContent=cachedName;
}
if(cachedStatus){
var osEl2=document.getElementById("chatHeaderStatus");
if(osEl2)osEl2.textContent=cachedStatus;
}
var cacheRestored=false;
function proceedWithChatCache(cachedData){
if(currentChatUid!==chatUid)return;
if(cachedData&&Array.isArray(cachedData.messages)&&cachedData.messages.length>0){
chatBox.innerHTML="";
messages=[];
processedMessages={};
cachedData.messages.sort(function(a,b){
return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);
});
window.__restoringCache=true;
cachedData.messages.forEach(function(item){
if(!item||!item.id||!item.data)return;
processedMessages[item.id]=true;
displayMessage(item.id,item.data);
});
window.__restoringCache=false;
cacheRestored=true;
setTimeout(function(){if(chatBox)chatBox.scrollTop=chatBox.scrollHeight;},30);
}
loadMessagesFromFirebase(chatUid,cacheRestored);
}
readChatCacheAsync(chatUid,proceedWithChatCache);
otherChatRef.on("child_changed",function(snapshot){
if(currentChatUid!==chatUid)return;
var messageId=snapshot.key;
var data=snapshot.val();
var messageElement=document.getElementById("msg-"+messageId);
if(messageElement){
if(data.deleted){
messageElement.className="message deleted-message";
messageElement.innerHTML="";
var delSpan1=document.createElement("span");
delSpan1.style.cssText="font-style:italic;color:#888;";
delSpan1.textContent="Message deleted";
messageElement.appendChild(delSpan1);
var delTs1=document.createElement("span");
delTs1.className="message-timestamp";
delTs1.textContent=formatSendTime(data.timestamp||data.deletedAt||Date.now());
messageElement.appendChild(delTs1);
}
var statusSpan=messageElement.querySelector(".message-status");
if(statusSpan&&data.status){
if(data.status==="delivered"){statusSpan.textContent="✓✓";statusSpan.className="message-status double-tick";}
else if(data.status==="seen"){statusSpan.textContent="✓✓";statusSpan.className="message-status double-tick seen";}
}
if(data.mediaType==="voice"){
applyVoicePlayedState(messageElement,data);
}
updateMessageColor(messageId);
}
updateCachedMessageEntry(messageId,data);
});
isUserBlocked(chatUid,uid).then(function(blocked){
isBlockedByUser=blocked;
updateChatUI();
// Fix 4: Store blocked listener for cleanup
if(window._blockedListenerRef) window._blockedListenerRef.off();
window._blockedListenerRef = db.ref("blocked/"+chatUid+"/"+uid);
window._blockedListenerRef.on("value",function(snapshot){
isBlockedByUser=snapshot.exists();
updateChatUI();
});
showTypingIndicator(chatUid);
});
setTimeout(function(){
if(isKnownChatContact(chatUid)||(window._spamAllowedCache&&window._spamAllowedCache[chatUid]===true))return;
canSendMessageTo(chatUid).then(function(allowed){
if(!allowed)showNotification("This user has spam protection enabled.");
});
db.ref("presence1/"+uid).update({currentChat: chatUid});
db.ref("profiles/"+chatUid).once("value",function(profSnap){
var profData=profSnap.val();
var resolvedName=(profData&&profData.username)? profData.username : null;
if(!resolvedName){
db.ref("presence1/"+chatUid).once("value",function(snap){
var data=snap.val();
if(data&&data.username)resolvedName=data.username;
updateHeaderName(resolvedName||currentChatUsername||"User",data);
});
}else{
db.ref("presence1/"+chatUid).once("value",function(snap){
updateHeaderName(resolvedName,snap.val());
});
}
function updateHeaderName(name,presenceData){
currentChatUsername=name;
var nameEl=document.getElementById("chatHeaderName");
if(nameEl)nameEl.textContent=name;
try{localStorage.setItem("username_"+chatUid,name);}catch(e){}
var osEl=document.getElementById("chatHeaderStatus");
if(osEl&&presenceData){
var statusText=presenceData.online ? "Online" :(presenceData.lastSeen ? formatLastSeen(presenceData.lastSeen): "");
osEl.textContent=statusText;
try{localStorage.setItem("lastSeen_"+chatUid,statusText);}catch(e){}
}else if(osEl){
var cachedStatusNow="";
try{cachedStatusNow=localStorage.getItem("lastSeen_"+chatUid)||"";}catch(e){}
osEl.textContent=cachedStatusNow||"Offline";
}
if(profData&&profData.profilePic){
var hPicEl=document.getElementById("chatHeaderAvatar");
if(hPicEl)hPicEl.src=profData.profilePic;
try{localStorage.setItem("profilePic_"+chatUid,profData.profilePic);}catch(e){}
}
}
});
db.ref("profiles/"+chatUid+"/profilePic").once("value",function(s){
var pic=s.val();
var hPicEl=document.getElementById("chatHeaderAvatar");
if(pic){
if(hPicEl)hPicEl.src=pic;
try{localStorage.setItem("profilePic_"+chatUid,pic);}catch(e){}
}else{
db.ref("users/"+chatUid+"/profilePic").once("value",function(s2){
var pic2=s2.val();
if(pic2){
if(hPicEl)hPicEl.src=pic2;
try{localStorage.setItem("profilePic_"+chatUid,pic2);}catch(e){}
}
});
}
});
if(activeChatPresenceRef){try{activeChatPresenceRef.off();}catch(e){}activeChatPresenceRef=null;}
activeChatPresenceRef=db.ref("presence1/"+chatUid);
activeChatPresenceRef.on("value",function(snap){
if(currentChatUid!==chatUid)return;
var data=snap.val();
var osEl=document.getElementById("chatHeaderStatus");
var nameEl=document.getElementById("chatHeaderName");
if(data){
if(osEl){
osEl.textContent=data.online ? "Online" :(data.lastSeen ? formatLastSeen(data.lastSeen): "");
osEl.style.color=data.online ? "#22C55E" : "#90E0EF";
}
if(data.username&&nameEl){
nameEl.textContent=data.username;
currentChatUsername=data.username;
}
}else if(osEl){
var cachedStatusFallback="";
try{cachedStatusFallback=localStorage.getItem("lastSeen_"+chatUid)||"";}catch(e){}
osEl.textContent=cachedStatusFallback||"Offline";
}
if(data&&data.online&&currentChatUid===chatUid){
db.ref("conversations/"+uid+"/"+chatUid).orderByChild("status").equalTo("sent").once("value",function(undeliveredSnap){
undeliveredSnap.forEach(function(msgSnap){
if(msgSnap.val().from===uid){
db.ref("conversations/"+uid+"/"+chatUid+"/"+msgSnap.key).update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
db.ref("conversations/"+chatUid+"/"+uid+"/"+msgSnap.key).update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
var msgEl=document.getElementById("msg-"+msgSnap.key);
if(msgEl){
var sp=msgEl.querySelector(".message-status");
if(sp&&sp.className.indexOf("seen")===-1){
sp.textContent="✓✓";
sp.className="message-status double-tick";
}
}
}
});
});
if(data.currentChat===uid){
db.ref("conversations/"+uid+"/"+chatUid).orderByChild("seen").equalTo(false).once("value",function(unseenSnap){
unseenSnap.forEach(function(msgSnap){
if(msgSnap.val().from===uid){
db.ref("conversations/"+uid+"/"+chatUid+"/"+msgSnap.key).update({seen: true,status: "seen"});
db.ref("conversations/"+chatUid+"/"+uid+"/"+msgSnap.key).update({seen: true,status: "seen"});
var msgEl=document.getElementById("msg-"+msgSnap.key);
if(msgEl){
var sp=msgEl.querySelector(".message-status");
if(sp){sp.textContent="✓✓";sp.className="message-status double-tick seen";}
}
}
});
});
}
}
});
isUserBlocked(chatUid,uid).then(function(blocked){
isBlockedByUser=blocked;
updateChatUI();
});
// Fix 4: Store blocked listener for cleanup
if(window._blockedListenerRef) window._blockedListenerRef.off();
window._blockedListenerRef = db.ref("blocked/"+chatUid+"/"+uid);
window._blockedListenerRef.on("value",function(snapshot){
isBlockedByUser=snapshot.exists();
updateChatUI();
});
showTypingIndicator(chatUid);
setTimeout(function(){autoDeleteForChat(chatUid);},1000);
},100);
var newMessageInput=messageInput.cloneNode(true);
messageInput.parentNode.replaceChild(newMessageInput,messageInput);
messageInput=newMessageInput;
function showRecordHintBar(){
var existing=document.getElementById("recordHintBar");
if(existing)return;
var bar=document.createElement("div");
bar.id="recordHintBar";
bar.style.cssText="background:#0077B6;color:#fff;text-align:center;font-size:11px;padding:4px 8px;width:100%;";
bar.textContent="Press Enter again to record 🎤";
var mic=document.getElementById("messageInputContainer");
if(mic&&mic.parentNode)mic.parentNode.insertBefore(bar,mic);
softkeyLeft.innerHTML="Cancel";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Rec";
}
function hideRecordHintBar(){
var bar=document.getElementById("recordHintBar");
if(bar)bar.remove();
messageInput._recordHint=false;
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Back";
}
messageInput.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
if(e.repeat)return;
if(messageInput._editingMsgId){
var newText=messageInput.value.trim();
if(newText)saveEditedMessage(messageInput._editingMsgId,newText);
else cancelEditMode();
return;
}
if(!isBlockedByUser){
var msg=messageInput.value.trim();
if(msg){
sendMessage(msg,"text",replyingToMessageId);
messageInput.value="";
messageInput.style.height="auto";
replyingToMessageId=null;
replyInputPreview.classList.remove("visible");replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
setTypingStatus(uid,false,currentChatUid);
hideRecordHintBar();
}else{
hideRecordHintBar();
}
}
}else if(e.key==="SoftLeft"||e.key==="SoftRight"){
if(messageInput._recordHint){
e.preventDefault();
clearTimeout(messageInput._hintTimer);
hideRecordHintBar();
return;
}
}else if(e.key==="ArrowUp"){
e.preventDefault();
clearTimeout(messageInput._hintTimer);
hideRecordHintBar();
var msgs=document.querySelectorAll(".message-container .message");
if(msgs.length>0){
var lastMsg=msgs[msgs.length-1];
lastMsg.focus();
lastMsg.scrollIntoView({block:"nearest"});
}
}else{
if(messageInput._recordHint){
clearTimeout(messageInput._hintTimer);
hideRecordHintBar();
}
}
});
function updateChatSoftkeys(){
if(typeof emojiPickerOpen!=='undefined'&&emojiPickerOpen)return;
var focused=document.activeElement;
var onMessage=focused&&focused.className&&focused.className.indexOf("message")!==-1;
if(selectModeActive){
updateSelectModeSoftkeys();
return;
}
if(onMessage){
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Options";
}else if(focused===messageInput){
var hasText=messageInput.value.trim().length>0;
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Paste";
}else{
var hasText=messageInput.value.trim().length>0;
softkeyLeft.innerHTML="+";
softkeyCenter.innerHTML="Send";
softkeyRight.innerHTML="Back";
}
}
messageInput.addEventListener("input",function(){
messageInput.style.height='auto';
messageInput.style.height=Math.min(messageInput.scrollHeight,80)+'px';
updateChatSoftkeys();
if(!isBlockedByUser){
setTypingStatus(uid,true,currentChatUid);
if(typingTimeout)clearTimeout(typingTimeout);
typingTimeout=setTimeout(function(){
setTypingStatus(uid,false,currentChatUid);
},2000);
}
});
messageInput.addEventListener("focus",function(){
updateChatSoftkeys();
// KaiOS's on-screen/keypad input covers the bottom of the screen while
// typing — jump the chat to the latest message so it isn't hidden
// behind the input as soon as the field is focused.
setTimeout(function(){chatBox.scrollTop=chatBox.scrollHeight;},60);
});
chatPage._updateChatSoftkeys=updateChatSoftkeys;
}
function loadMessagesFromFirebase(chatUid,hasCachedMessages){
function whenFbConnected(cb){
var done=false;
function finish(){if(done)return;done=true;cb();}
try{
var cref=db.ref(".info/connected");
cref.once("value",function(s){
if(s&&s.val()===true){finish();return;}
var t=setTimeout(finish,1200);
cref.on("value",function h(s2){
if(s2&&s2.val()===true){clearTimeout(t);try{cref.off("value",h);}catch(e){}finish();}
});
});
}catch(e){finish();}
}
function attachLiveListeners(latestTimestamp){
var listenFrom=latestTimestamp>0 ? latestTimestamp+1 : Date.now();
chatRef.orderByChild("timestamp").startAt(listenFrom).on("child_added",function(newSnapshot){
if(currentChatUid!==chatUid)return;
var messageId=newSnapshot.key;
var data=newSnapshot.val();
if(!data)return;
if(!processedMessages[messageId]){
processedMessages[messageId]=true;
var ph=document.getElementById("noMessagesPlaceholder");
if(ph)ph.remove();
var wasAtBottom=isChatBoxAtBottom();
var isOwnMsg=data&&data.from===uid;
window.__skipAutoScrollOnDisplay=!wasAtBottom&&!isOwnMsg;
displayMessage(messageId,data);
window.__skipAutoScrollOnDisplay=false;
updateCachedMessageEntry(messageId,data);
// Show "New message ↓" bar if user is scrolled up (delta sync UX)
if(!wasAtBottom&&!isOwnMsg){
var nmBar=document.getElementById("newMsgBar");
if(!nmBar){
nmBar=document.createElement("div");
nmBar.id="newMsgBar";
nmBar.style.cssText="position:sticky;bottom:56px;z-index:10;background:linear-gradient(90deg,#0369A1,#0EA5E9);color:#fff;font-size:13px;font-weight:600;padding:8px 16px;text-align:center;border-radius:12px 12px 0 0;cursor:pointer;box-shadow:0 -2px 12px rgba(3,105,161,0.25);display:none;margin:0 8px;";
nmBar.textContent="↓ New message";
if(chatBox&&chatBox.parentNode)chatBox.parentNode.appendChild(nmBar);
nmBar.onclick=function(){chatBox.scrollTop=chatBox.scrollHeight;nmBar.style.display="none";};
}
nmBar.style.display="block";
}
if(window._pendingShareFocusUid&&currentChatUid===window._pendingShareFocusUid&&isOwnMsg){
window._pendingShareFocusUid=null;
(function(mid){
setTimeout(function(){
var el=document.getElementById("msg-"+mid);
if(el)el.focus();
},80);
})(messageId);
}
if(wasAtBottom||isOwnMsg){
setTimeout(function(){chatBox.scrollTop=chatBox.scrollHeight;},30);
hideNewMsgBadge();
}else{
showNewMsgBadge();
}
}
});
chatRef.on("child_changed",function(snapshot){
if(currentChatUid!==chatUid)return;
var messageId=snapshot.key;
var data=snapshot.val();
var messageElement=document.getElementById("msg-"+messageId);
if(messageElement){
if(data.deleted){
messageElement.className="message deleted-message";
messageElement.innerHTML="";
var delSpan2=document.createElement("span");
delSpan2.style.cssText="font-style:italic;color:#888;";
delSpan2.textContent="Message deleted";
messageElement.appendChild(delSpan2);
var delTs2=document.createElement("span");
delTs2.className="message-timestamp";
delTs2.textContent=formatSendTime(data.timestamp||data.deletedAt||Date.now());
messageElement.appendChild(delTs2);
var reactionSpanD=messageElement.parentElement.querySelector(".reaction");
if(reactionSpanD)reactionSpanD.parentElement.removeChild(reactionSpanD);
}else{
if(data.edited){
var textSpanE=messageElement.querySelector(".message-text");
if(textSpanE&&data.message)textSpanE.textContent=data.message;
var existingEditedLabel=messageElement.querySelector(".edited-label");
if(!existingEditedLabel&&textSpanE&&textSpanE.parentElement){
var editedLabel=document.createElement("span");
editedLabel.className="edited-label";
editedLabel.style.cssText="font-size:9px;color:#888;font-style:italic;margin-left:4px;";
editedLabel.textContent="edited";
if(textSpanE.nextSibling){
textSpanE.parentElement.insertBefore(editedLabel,textSpanE.nextSibling);
}else{
textSpanE.parentElement.appendChild(editedLabel);
}
}
}
if(data.mediaType==="voice"){
applyVoicePlayedState(messageElement,data);
}
var container=messageElement.parentElement;
var reactionSpan=container ? container.querySelector(".reaction"): null;
if(data.reaction){
if(reactionSpan){
reactionSpan.textContent=data.reaction;
}else if(container){
var rs=document.createElement("span");
rs.className="reaction";
rs.textContent=data.reaction;
container.appendChild(rs);
}
}else{
if(reactionSpan&&reactionSpan.parentElement){
reactionSpan.parentElement.removeChild(reactionSpan);
}
}
}
}
updateCachedMessageEntry(messageId,data);
});
}
if(hasCachedMessages&&messages.length>0){
var cachedLatest=0;
messages.forEach(function(msg){
var ts=(msg.data&&msg.data.timestamp)||0;
if(ts>cachedLatest)cachedLatest=ts;
});
// ── Catch-up fetch: the cache can be a message or two behind — e.g. a
// message that already triggered a notification/preview-row update
// while the chat was closed, but hasn't made it into the local cache
// yet. Rather than trust listener-replay timing alone to backfill it,
// pull the last few messages straight from the server right now and
// render any that aren't already on screen, so a message the user
// already got notified about is guaranteed to be visible the instant
// they open the chat — not "eventually".
//
// FIX: if the socket is still mid-reconnect right after the app was
// minimized (the "Connection lost… / Synchronizing…" window), a plain
// .once("value") call can resolve instantly from Firebase's local
// cache instead of waiting for a fresh server round-trip — silently
// returning the same stale data the cache already had. That's exactly
// how a message that already triggered a notification could still be
// missing when the chat is opened. Wait briefly for a genuine
// ".info/connected"===true before trusting the result.
function runCatchUpFetch(){
whenFbConnected(function(){
chatRef.orderByChild("timestamp").limitToLast(50).once("value",function(snap){
if(currentChatUid!==chatUid)return;
var fromServer=[];
snap.forEach(function(cs){
var mid=cs.key,mdata=cs.val();
if(mdata)fromServer.push({id: mid,data: mdata});
});
var missed=fromServer.filter(function(item){return!processedMessages[item.id];});
var existingCount=0;
try{existingCount=chatBox.querySelectorAll(".message-container,.message").length;}catch(e){}
if(fromServer.length>existingCount||missed.length){
var byId={};
messages.forEach(function(m){if(m&&m.id&&m.data)byId[m.id]={id:m.id,data:m.data};});
fromServer.forEach(function(item){byId[item.id]=item;});
var combined=Object.keys(byId).map(function(k){return byId[k];});
combined.sort(function(a,b){return((a.data&&a.data.timestamp)||0)-((b.data&&b.data.timestamp)||0);});
var ph2=document.getElementById("noMessagesPlaceholder");
if(ph2)ph2.remove();
chatBox.innerHTML="";
messages=[];
processedMessages={};
window.__restoringCache=true;
combined.forEach(function(item){
if(!item||!item.id||!item.data)return;
processedMessages[item.id]=true;
displayMessage(item.id,item.data);
});
window.__restoringCache=false;
    persistChatCache(chatUid);
    setTimeout(function(){if(chatBox)chatBox.scrollTop=chatBox.scrollHeight;},30);
    }
    },function(){
    if(currentChatUid!==chatUid)return;
    });
    });
    }
    runCatchUpFetch();
// Use max(cachedLatest-500, 0) to catch any messages that may have
// arrived within 500ms of the last cached message (handles clock drift)
attachLiveListeners(Math.max(0,cachedLatest-500));
return;
}
var lmEl=document.getElementById("loadingMessages");
if(!lmEl){
lmEl=document.createElement("div");
lmEl.id="loadingMessages";
lmEl.className="loading-messages";
lmEl.innerHTML='<span class="loading-spinner"></span>Getting messages...';
chatBox.insertBefore(lmEl,chatBox.firstChild);
}
function runFreshFetch(){
whenFbConnected(function(){
chatRef.orderByChild("timestamp").limitToLast(50).once("value",function(snapshot){
if(currentChatUid!==chatUid)return;
var el=document.getElementById("loadingMessages");
if(el)el.remove();
chatBox.innerHTML="";
messages=[];
processedMessages={};
var messagesArray=[];
var latestTimestamp=0;
snapshot.forEach(function(childSnapshot){
var messageId=childSnapshot.key;
var data=childSnapshot.val();
if(!data)return;
processedMessages[messageId]=true;
messagesArray.push({id: messageId,data: data});
if((data.timestamp||0)>latestTimestamp)latestTimestamp=data.timestamp||0;
});
messagesArray.sort(function(a,b){
return(a.data.timestamp||0)-(b.data.timestamp||0);
});
if(messagesArray.length===0){
var emptyDiv=document.createElement("div");
emptyDiv.id="noMessagesPlaceholder";
emptyDiv.style.cssText="text-align:center;padding:30px;color:#aaa;font-size:12px;";
emptyDiv.textContent="No messages yet. Say hello!";
chatBox.appendChild(emptyDiv);
attachLiveListeners(latestTimestamp);
}else{
window.__restoringCache=true;
messagesArray.forEach(function(item){
displayMessage(item.id,item.data);
});
window.__restoringCache=false;
persistChatCache(chatUid);
setTimeout(function(){
chatBox.scrollTop=chatBox.scrollHeight;
attachLiveListeners(latestTimestamp);
var msgInput=document.getElementById("messageInput");
if(msgInput)msgInput.focus();
},30);
}
},function(error){
if(currentChatUid!==chatUid)return;
var el=document.getElementById("loadingMessages");
if(el){el.innerHTML="Loading failed. Press Back and try again.";}
});
});
}
// Same "wait for a genuine connection before trusting the read" guard as
// the cached-catch-up path above — a chat opened right during the
// reconnect/"Synchronizing…" window shouldn't render a possibly-stale
// cached snapshot as if it were the current state.
runFreshFetch();
}
// ── Re-attach live listener after background/minimize without clearing chat ──
// Called by the visibilitychange handler in setupPresence() when the app
// comes back from background. If Firebase silently dropped the socket,
// this re-subscribes from the last seen message without clearing the UI.
var _lastAttachedChatUid=null;
var _lastAttachedTs=0;
window.attachLiveListenersForCurrentChat=function(){
if(!currentChatUid||!chatRef)return;
if(_lastAttachedChatUid===currentChatUid&&(Date.now()-_lastAttachedTs)<10000)return;
_lastAttachedChatUid=currentChatUid;
_lastAttachedTs=Date.now();
// Find newest timestamp already in DOM
var allMsgs=chatBox?chatBox.querySelectorAll(".message[data-ts]"):[];
var maxTs=0;
allMsgs.forEach(function(m){
var t=parseInt(m.getAttribute("data-ts")||"0",10);
if(t>maxTs)maxTs=t;
});
var listenFrom=Math.max(0,maxTs-500);
// Off existing, re-on from last known position
chatRef.off("child_added");
chatRef.orderByChild("timestamp").startAt(listenFrom).on("child_added",function(snap){
if(currentChatUid!==_lastAttachedChatUid)return;
var messageId=snap.key;
var data=snap.val();
if(!data||processedMessages[messageId])return;
processedMessages[messageId]=true;
var ph=document.getElementById("noMessagesPlaceholder");
if(ph)ph.remove();
var wasAtBottom=isChatBoxAtBottom();
var isOwnMsg=data.from===uid;
displayMessage(messageId,data);
updateCachedMessageEntry(messageId,data);
if(wasAtBottom||isOwnMsg){setTimeout(function(){chatBox.scrollTop=chatBox.scrollHeight;},30);}
else{showNewMsgBadge();}
});
};
function appendMessageInOrder(node,data){
if(!chatBox||!node)return;
var ts=typeof data.timestamp==="number"?data.timestamp:Date.now();
node._msgTs=ts;
var children=chatBox.children;
var inserted=false;
for(var i=children.length-1;i>=0;i--){
var cts=children[i]._msgTs;
if(typeof cts!=="number"){
var inner=children[i].querySelector&&children[i].querySelector(".message[data-ts]");
cts=inner?parseInt(inner.getAttribute("data-ts")||"0",10):0;
}
if(ts>=cts){
if(children[i].nextSibling)chatBox.insertBefore(node,children[i].nextSibling);
else chatBox.appendChild(node);
inserted=true;
break;
}
}
if(!inserted){
if(children.length)chatBox.insertBefore(node,children[0]);
else chatBox.appendChild(node);
}
}
function displayMessage(messageId,data){
if(document.getElementById("msg-"+messageId))return;
var isSent=data.from===uid;
var ts=formatSendTime(data.timestamp||Date.now());

// Fix 2: Fast path for simple text messages using innerHTML
if(!data.deleted&&!data.replyTo&&data.mediaType==="text"&&data.message){
var msgText=data.message||"";
// Escape HTML
var escaped=msgText.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
var statusHtml="";
if(isSent){
var st=data.status||"";
statusHtml='<span class="message-status">'+(st==="seen"?"✓✓":st==="delivered"?"✓✓":st==="queued"?"🕓":"✓")+'</span>';
}
var reactionHtml=data.reaction?'<span class="reaction">'+data.reaction+'</span>':"";
var editHtml=data.edited?'<span style="font-size:9px;color:#aaa;"> (edited)</span>':"";
var html='<div class="message-container '+(isSent?"sent-container":"received-container")+'">'
+'<div id="msg-'+messageId+'" class="message '+(isSent?"sent":"received")+'" tabIndex="8" data-from="'+data.from+'" data-ts="'+(data.timestamp||0)+'" data-media="text">'
+(data.from!==uid&&currentChatUsername?'<span class="msg-sender" style="display:none">'+currentChatUsername+'</span>':"")
+'<span class="message-text">'+escaped+editHtml+'</span>'
+'<span class="message-timestamp">'+ts+statusHtml+'</span>'
+reactionHtml
+'</div></div>';
var temp=document.createElement("div");
temp.innerHTML=html;
var msgEl=temp.firstChild;
appendMessageInOrder(msgEl,data);
var realMsgEl=document.getElementById("msg-"+messageId);
if(realMsgEl){
realMsgEl.addEventListener("keydown",function(e){
if(e.key==="Enter"){
if(selectModeActive){
e.preventDefault();
e.stopPropagation();
toggleMessageSelected(messageId,realMsgEl);
return;
}
e.preventDefault();
e.stopPropagation();
var mc=realMsgEl.parentElement;
if(mc)showEmojiContainer(mc);
}
});
realMsgEl.onfocus=function(){
if(selectModeActive){
updateSelectModeSoftkeys();
return;
}
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="React";
softkeyRight.innerHTML="Options";
};
realMsgEl.onblur=function(){
setTimeout(function(){
if(currentEmojiContainer&&!currentEmojiContainer.contains(document.activeElement)){
currentEmojiContainer.classList.remove("active-show");
currentEmojiContainer.style.display="none";
currentEmojiContainer=null;
}
},150);
if(document.activeElement&&
document.activeElement.className&&
document.activeElement.className.indexOf("message")===-1&&
document.activeElement.className.indexOf("emoji")===-1){
softkeyLeft.innerHTML="";
softkeyCenter.innerHTML="";
}
};
realMsgEl.dataset.mediaType="text";
}
messages.push({
id: messageId,
element: realMsgEl,
timestamp: data.timestamp,
data: cloneMessageData(data)
});
if(!window.__skipAutoScrollOnDisplay){chatBox.scrollTop=chatBox.scrollHeight;}
if(!window.__restoringCache)persistChatCache(currentChatUid);
return;
}

// Existing full DOM path for media, deleted, reply messages
var messageContainer=document.createElement("div");
messageContainer.className="message-container "+(isSent?"sent-container":"received-container");
var messageElement=document.createElement("div");
messageElement.id="msg-"+messageId;
messageElement.className="message "+(isSent?"sent":"received");
messageElement.tabIndex=8;
messageElement.dataset.from=data.from;
messageElement.dataset.ts=data.timestamp||0;
if(data.deleted){
messageElement.className="message deleted-message";
var delSpan=document.createElement("span");
delSpan.style.cssText="font-style:italic;color:#888;";
delSpan.textContent="Message deleted";
messageElement.appendChild(delSpan);
var delTs=document.createElement("span");
delTs.className="message-timestamp";
delTs.textContent=formatSendTime(data.timestamp||data.deletedAt||Date.now());
messageElement.appendChild(delTs);
messageContainer.appendChild(messageElement);
appendMessageInOrder(messageContainer,data);
return;
}
if(data.replyTo){
var replyPreview=document.createElement("div");
replyPreview.className="reply-preview";
replyPreview.style.cssText="display:flex;align-items:center;gap:6px;cursor:pointer;";
replyPreview.innerHTML='<span style="color:#888;font-style:italic;">Loading...</span>';
messageElement.appendChild(replyPreview);
var replyToId=data.replyTo;
replyPreview.onclick=function(){
var targetEl=document.getElementById("msg-"+replyToId);
if(targetEl){
targetEl.scrollIntoView({behavior: "smooth",block: "center"});
targetEl.style.transition="background 0.3s";
targetEl.style.background="#90E0EF";
setTimeout(function(){targetEl},1200);
targetEl.focus();
}
};
replyPreview.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();replyPreview.click();}
};
function renderReplyPreview(repliedMsg){
if(repliedMsg){
if(repliedMsg.mediaType==="image"&&repliedMsg.mediaUrl){
replyPreview.innerHTML='<img src="'+repliedMsg.mediaUrl+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;flex-shrink:0;" onerror="this.style.display=\'none\'">'
+'<span style="font-size:11px;color:#555;">📷 Image</span>';
}else if(repliedMsg.mediaType==="voice"){
replyPreview.innerHTML='<span style="font-size:18px;">🎤</span><span style="font-size:11px;color:#555;">Voice message</span>';
}else if(repliedMsg.mediaType==="video"){
replyPreview.innerHTML='<span style="font-size:18px;">🎬</span><span style="font-size:11px;color:#555;">Video</span>';
}else{
var previewText=repliedMsg.message ?(repliedMsg.message.substring(0,30)+(repliedMsg.message.length>30 ? "..." : "")): "Message";
replyPreview.innerHTML='<span style="font-size:11px;color:#555;">↩ '+previewText+'</span>';
}
// Save the resolved quote onto this message's own cached data so
// reopening the chat later never needs to look it up again.
// (Deferred because this message itself may not be pushed into the
// local messages[] cache array yet at this exact point.)
setTimeout(function(){
var selfCached=getCachedMessageEntry(messageId);
if(selfCached&&selfCached.data){
selfCached.data.replyPreviewCache={
mediaType: repliedMsg.mediaType||null,
message: repliedMsg.message||null,
mediaUrl: repliedMsg.mediaType==="image" ? repliedMsg.mediaUrl : null
};
updateCachedMessageEntry(messageId,selfCached.data);
}
},0);
}else{
replyPreview.innerHTML='<span style="font-size:11px;color:#aaa;font-style:italic;">Original message deleted</span>';
}
}
if(data.replyPreviewCache){
// Already resolved and saved from a previous view of this chat — show
// it instantly, no lookup or fetch needed at all.
renderReplyPreview(data.replyPreviewCache);
}else{
var cachedReplied=getCachedMessageEntry(replyToId);
if(cachedReplied&&cachedReplied.data){
// We already have this message locally (near-instant, and avoids a
// false "Original message deleted" caused by a live read racing right
// after the app reopens, before connectivity/sync has settled).
renderReplyPreview(cachedReplied.data);
}else{
var replyFetchSettled=false;
var replyFetchTimeout=setTimeout(function(){
if(replyFetchSettled)return;
replyFetchSettled=true;
replyPreview.innerHTML='<span style="font-size:11px;color:#aaa;font-style:italic;">Message not available</span>';
},6000);
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+data.replyTo).once("value",function(snap){
if(replyFetchSettled)return;
replyFetchSettled=true;
clearTimeout(replyFetchTimeout);
renderReplyPreview(snap.val());
},function(){
if(replyFetchSettled)return;
replyFetchSettled=true;
clearTimeout(replyFetchTimeout);
replyPreview.innerHTML='<span style="font-size:11px;color:#aaa;font-style:italic;">Message not available</span>';
});
}
}
}
if(data.mediaType==="image"){
var img=document.createElement("img");
img.alt="Loading...";
img.style.cssText="max-width:220px;max-height:180px;width:100%;border-radius:12px;display:block;object-fit:cover;cursor:pointer;filter:blur(8px);transition:filter 0.35s;";
img.tabIndex=9;
var imgSrc=data.mediaUrl;
var imgMsgId=messageId||String(data.timestamp||Date.now());
// WhatsApp-style: serve from local IDB cache if already saved
function _imgFromBlob(blob){
var bUrl=URL.createObjectURL(blob);
img.src=bUrl;
img.onload=function(){img.alt="";img.style.filter="none";if(isChatBoxAtBottom())chatBox.scrollTop=chatBox.scrollHeight;};
img.onerror=function(){img.alt="Load error";img.style.filter="none";};
}
function _imgFetchRemote(src){
img.src=src;
img.onload=function(){
img.alt="";img.style.filter="none";
if(isChatBoxAtBottom())chatBox.scrollTop=chatBox.scrollHeight;
if(typeof window.mediaCacheSave==="function"&&isAutoDownloadEnabled()){
try{var x=new XMLHttpRequest();x.open("GET",src,true);x.responseType="blob";
x.onload=function(){if(x.status===200)window.mediaCacheSave(imgMsgId,"image",x.response,src);};x.send();}catch(e){}
}
};
img.onerror=function(){img.alt="Failed to load image";img.style.filter="none";};
}
setTimeout(function(){
if(typeof window.mediaCacheGet==="function"){
window.mediaCacheGet(imgMsgId,function(blob){if(blob)_imgFromBlob(blob);else _imgFetchRemote(imgSrc);});
}else{_imgFetchRemote(imgSrc);}
},50);
img.onclick=function(){toggleFullScreen(img);};
img.onfocus=function(){softkeyLeft.innerHTML="Options";softkeyCenter.innerHTML="Full";softkeyRight.innerHTML="Options";};
img.onblur=function(){softkeyLeft.innerHTML="+";softkeyCenter.innerHTML="Send";softkeyRight.innerHTML="Back";};
img.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();e.stopPropagation();toggleFullScreen(img);}};
messageElement.appendChild(img);
}else if(data.mediaType==="voice"){
messageElement.style.padding="7px 9px 5px";
messageElement.style.minWidth="176px";
messageElement.style.background=data.from===uid
? "linear-gradient(180deg,#DFF7CE,#CBEFBA)"
: "#FFFFFF";
messageElement.style.border=data.from===uid
? "1px solid rgba(34,197,94,0.18)"
: "1px solid #E2E8F0";
messageElement.dataset.from=data.from||"";
messageElement.dataset.mediaType="voice";
messageElement.dataset.played=isVoicePlayedState(data)? "1" : "0";
// ── Clean single-progress-bar Voice Player ────────────────────────
var isSent=data.from===uid;
var accentColor=isSent?"rgba(255,255,255,0.9)":"#0369A1";
var bgColor=isSent?"rgba(255,255,255,0.12)":"rgba(3,105,161,0.08)";
var voiceContainer=document.createElement("div");
voiceContainer.className="voice-message-card";
voiceContainer.style.cssText="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:18px;cursor:pointer;box-sizing:border-box;background:"+bgColor+";";

// Play/Pause circle button
var voiceToggle=document.createElement("button");
voiceToggle.className="voice-toggle-button navItem";
voiceToggle.type="button";
voiceToggle.tabIndex=9;
voiceToggle.innerHTML="\u25B6\uFE0F";
voiceToggle.style.cssText="width:42px;height:42px;border-radius:50%;border:none;display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:pointer;background:"+(isSent?"rgba(255,255,255,0.28)":"#0369A1")+";color:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.2);font-size:17px;line-height:1;font-family:'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif;";

// Right column: seekbar + duration row
var voiceMid=document.createElement("div");
voiceMid.style.cssText="flex:1;min-width:0;display:flex;flex-direction:column;gap:6px;";

// ── Single large seekbar ──────────────────────────────────────────
var seekTrack=document.createElement("div");
seekTrack.style.cssText="position:relative;height:5px;background:rgba(0,0,0,0.14);border-radius:3px;cursor:pointer;touch-action:none;";
var seekFill=document.createElement("div");
seekFill.style.cssText="position:absolute;left:0;top:0;height:100%;background:"+accentColor+";border-radius:3px;width:0%;";
var seekThumb=document.createElement("div");
seekThumb.style.cssText="position:absolute;top:50%;left:0%;width:14px;height:14px;border-radius:50%;background:"+accentColor+";box-shadow:0 1px 4px rgba(0,0,0,0.3);transform:translate(-50%,-50%);";
seekTrack.appendChild(seekFill);
seekTrack.appendChild(seekThumb);

// Duration + time row
var timeRow=document.createElement("div");
timeRow.style.cssText="display:flex;align-items:center;justify-content:space-between;";
var voiceDurationLeft=document.createElement("span");
voiceDurationLeft.style.cssText="font-size:11px;font-weight:600;color:"+(isSent?"rgba(255,255,255,0.8)":"#64748B")+";";
voiceDurationLeft.textContent=formatTime(data.duration||0);
var voiceTotalSpan=document.createElement("span");
voiceTotalSpan.style.cssText="font-size:11px;color:"+(isSent?"rgba(255,255,255,0.5)":"#94A3B8")+";";
voiceTotalSpan.textContent=formatTime(data.duration||0);
timeRow.appendChild(voiceDurationLeft);
timeRow.appendChild(voiceTotalSpan);

voiceMid.appendChild(seekTrack);
voiceMid.appendChild(timeRow);
voiceContainer.appendChild(voiceToggle);
voiceContainer.appendChild(voiceMid);

// ── Seekbar live update ───────────────────────────────────────────
function vUpdateSeek(audio){
if(!audio||!audio.duration||isNaN(audio.duration))return;
var pct=(audio.currentTime/audio.duration)*100;
seekFill.style.width=pct+"%";
seekThumb.style.left=pct+"%";
voiceDurationLeft.textContent=formatTime(Math.floor(audio.currentTime));
}

// ── Seekbar touch/click seek ──────────────────────────────────────
function seekToEvent(e){
var rect=seekTrack.getBoundingClientRect();
var clientX=(e.touches?e.touches[0].clientX:(e.changedTouches?e.changedTouches[0].clientX:e.clientX));
var pct=Math.max(0,Math.min(1,(clientX-rect.left)/rect.width));
var audio=window.currentAudio&&window.currentAudio._voiceMsgId===messageId?window.currentAudio:null;
if(audio&&audio.duration){
audio.currentTime=pct*audio.duration;
vUpdateSeek(audio);
}
}
seekTrack.addEventListener("click",function(e){e.preventDefault();e.stopPropagation();seekToEvent(e);});
seekTrack.addEventListener("touchstart",function(e){e.stopPropagation();},{passive:true});
var _dragging=false;
seekTrack.addEventListener("touchmove",function(e){
e.preventDefault();e.stopPropagation();
_dragging=true;
seekToEvent(e);
},{passive:false});
seekTrack.addEventListener("touchend",function(e){
if(_dragging){e.preventDefault();e.stopPropagation();seekToEvent(e);}
_dragging=false;
},{passive:false});

// ── Swipe left/right on whole card to scrub ───────────────────────
var _vsT=null;
voiceContainer.addEventListener("touchstart",function(e){
if(e.target===seekTrack||seekTrack.contains(e.target))return;
_vsT={x:e.touches[0].clientX,t:Date.now()};
},{passive:true});
voiceContainer.addEventListener("touchend",function(e){
if(!_vsT)return;
var dx=e.changedTouches[0].clientX-_vsT.x;
var dt=Date.now()-_vsT.t;
_vsT=null;
if(Math.abs(dx)<22||dt>500)return;
var audio=window.currentAudio&&window.currentAudio._voiceMsgId===messageId?window.currentAudio:null;
if(!audio||!audio.duration)return;
var delta=(dx/voiceContainer.offsetWidth)*audio.duration;
audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+delta));
vUpdateSeek(audio);
},{passive:true});

applyVoicePlayedState(messageElement,data);

function toggleVoicePlayback(){
downloadAndPlayVoice(data.mediaUrl,messageId,voiceDurationLeft,false);
}
voiceContainer.onclick=function(e){
if(e.target===seekTrack||seekTrack.contains(e.target))return;
toggleVoicePlayback();
};
voiceToggle.onclick=function(e){e.preventDefault();e.stopPropagation();toggleVoicePlayback();};
voiceContainer.tabIndex=9;
voiceContainer.onfocus=function(){softkeyLeft.innerHTML="Options";softkeyCenter.innerHTML="Play";softkeyRight.innerHTML="Options";};
voiceContainer.onblur=function(){softkeyLeft.innerHTML="+";softkeyCenter.innerHTML="Send";softkeyRight.innerHTML="Back";};
voiceContainer.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();e.stopPropagation();toggleVoicePlayback();}};

// ── Live seekbar update via rAF ───────────────────────────────────
(function(){
var _raf;
function _tick(){
if(window.currentAudio&&window.currentAudio._voiceMsgId===messageId){
vUpdateSeek(window.currentAudio);
var playIcon='<svg viewBox="0 0 24 24" width="20" height="20" fill="#fff"><path d="'+(window.currentAudio.paused?'M8 5v14l11-7z':'M6 19h4V5H6v14zm8-14v14h4V5h-4z')+'" /></svg>';
voiceToggle.innerHTML=playIcon;
}
_raf=requestAnimationFrame(_tick);
}
_raf=requestAnimationFrame(_tick);
messageElement.addEventListener("DOMNodeRemovedFromDocument",function(){cancelAnimationFrame(_raf);},{once:true});
})();
messageElement.appendChild(voiceContainer);
var voiceMeta=document.createElement("div");
voiceMeta.className="voice-meta-row";
voiceMeta.style.display="none";
messageElement.appendChild(voiceMeta);
messageElement._voiceFooterRow=voiceMeta;
}else if(data.mediaType==="video"){
var isDownloading=false;
var isDownloaded=false;
var localBlobUrl=null;
var thumbUrl=getCloudinaryThumbnail(data.mediaUrl);
var videoThumb=document.createElement("div");
videoThumb.style.cssText="position:relative;display:flex;align-items:center;justify-content:center;height:100px;border-radius:8px;cursor:pointer;margin-bottom:4px;overflow:hidden;background:#111;";
if(thumbUrl){
var thumbImg=document.createElement("img");
thumbImg.src=thumbUrl;
thumbImg.style.cssText="width:100%;height:100%;object-fit:cover;border-radius:8px;";
thumbImg.onerror=function(){
thumbImg.style.display="none";
};
videoThumb.appendChild(thumbImg);
}
var playOverlay=document.createElement("div");
playOverlay.style.cssText="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.55);border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;";
playOverlay.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
videoThumb.appendChild(playOverlay);
var videoLabel=document.createElement("div");
videoLabel.style.cssText="font-size:11px;color:#666;text-align:center;margin-bottom:4px;cursor:pointer;";
var progressBar=document.createElement("div");
progressBar.style.cssText="display:none;margin-top:6px;background:#333;border-radius:4px;height:6px;overflow:hidden;";
var progressFill=document.createElement("div");
progressFill.style.cssText="height:100%;background:#00B4D8;width:0%;transition:width 0.3s;";
progressBar.appendChild(progressFill);
var progressText=document.createElement("div");
progressText.style.cssText="font-size:10px;color:#888;text-align:center;display:none;margin-top:2px;";
messageElement.appendChild(videoThumb);
messageElement.appendChild(videoLabel);
messageElement.appendChild(progressBar);
messageElement.appendChild(progressText);
function handleVideoAction(){
if(isDownloading)return;
if(isDownloaded&&localBlobUrl){
openVideoFullscreen(localBlobUrl);
return;
}
isDownloading=true;
videoLabel.textContent="⬇ Downloading...";
progressBar.style.display="block";
progressText.style.display="block";
progressText.textContent="0%";
var xhr=new XMLHttpRequest();
xhr.open("GET",data.mediaUrl,true);
xhr.responseType="blob";
xhr.onprogress=function(e){
if(e.lengthComputable){
var pct=Math.round((e.loaded/e.total)*100);
progressFill.style.width=pct+"%";
progressText.textContent=pct+"%";
}
};
xhr.onload=function(){
isDownloading=false;
if(xhr.status===200){
var blob=xhr.response;
localBlobUrl=URL.createObjectURL(blob);
isDownloaded=true;
progressBar.style.display="none";
progressText.style.display="none";
videoLabel.textContent="▶ Play video";
playOverlay.style.background="rgba(37,211,102,0.7)";
playOverlay.innerHTML='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="#fff"><path d="M8 5v14l11-7z"/></svg>';
if(isAutoDownloadEnabled()){
try{
var a=document.createElement("a");
a.href=localBlobUrl;
a.download="video_"+Date.now()+".mp4";
document.body.appendChild(a);
a.click();
document.body.removeChild(a);
}catch(e){}
}
openVideoFullscreen(localBlobUrl);
}else{
videoLabel.textContent="❌ Failed. Press Enter";
progressBar.style.display="none";
progressText.style.display="none";
}
};
xhr.onerror=function(){
isDownloading=false;
videoLabel.textContent="❌ Failed. Press Enter";
progressBar.style.display="none";
progressText.style.display="none";
};
xhr.send();
}
messageElement.onclick=function(e){
e.preventDefault();
e.stopPropagation();
handleVideoAction();
};
messageElement.onkeydown=function(e){
if(e.key==="Enter"){
if(selectModeActive){
e.preventDefault();
e.stopPropagation();
toggleMessageSelected(messageId,messageElement);
return;
}
e.preventDefault();
e.stopPropagation();
handleVideoAction();
}
};
}else{
if(data.statusReply){
var previewDiv=document.createElement("div");
previewDiv.className="status-reply-preview";
var label=document.createElement("div");
label.className="status-reply-label";
label.textContent="Status Reply";
previewDiv.appendChild(label);
if(data.statusType==="image"&&data.statusContent){
var previewImg=document.createElement("img");
previewImg.className="status-reply-img";
previewImg.src=data.statusContent;
previewImg.alt="Status image";
previewImg.style.maxWidth="100%";
previewImg.style.maxHeight="100px";
previewImg.onerror=function(){this.style.display="none";};
previewDiv.appendChild(previewImg);
}else if(data.statusType==="video"){
var previewText=document.createElement("div");
previewText.className="status-reply-text";
previewText.innerHTML="🎬 Video Status";
previewDiv.appendChild(previewText);
}else if(data.statusType==="voice"){
var previewText=document.createElement("div");
previewText.className="status-reply-text";
previewText.innerHTML="🎤 Voice Status";
previewDiv.appendChild(previewText);
}else if(data.statusContent){
var previewText=document.createElement("div");
previewText.className="status-reply-text";
var content=data.statusContent;
if(content.startsWith("http")&&content.length>60){
previewText.textContent="📎 Media Status";
}else{
previewText.textContent=content.length>60 ? content.substring(0,60)+"..." : content;
}
previewDiv.appendChild(previewText);
}
messageElement.appendChild(previewDiv);
}
var textSpan=document.createElement("span");
textSpan.className="message-text";
textSpan.textContent=data.message;
messageElement.appendChild(textSpan);
if(data.edited){
var editedLabel=document.createElement("span");
editedLabel.className="edited-label";
editedLabel.style.cssText="font-size:9px;color:#888;font-style:italic;margin-left:4px;";
editedLabel.textContent="edited";
messageElement.appendChild(editedLabel);
}
}
if(data.from===uid){
var footerDiv=document.createElement("div");
footerDiv.className="message-footer";
var statusSpan=document.createElement("span");
statusSpan.className="message-status";
if(data.status==="seen"){
statusSpan.innerHTML="✓✓";
statusSpan.className+=" double-tick seen";
}else if(data.status==="delivered"){
statusSpan.innerHTML="✓✓";
statusSpan.className+=" double-tick";
}else if(data.status==="queued"||data.status==="sending"){
statusSpan.innerHTML='<span style="font-size:8px;color:#aaa;">•••</span>';
}else{
statusSpan.innerHTML="✓";
statusSpan.className+=" single-tick";
}
var timestampSpanSent=document.createElement("span");
timestampSpanSent.className="message-timestamp";
timestampSpanSent.textContent=formatSendTime(data.timestamp);
if(data.mediaType==="voice"&&messageElement._voiceFooterRow){
timestampSpanSent.style.marginLeft="auto";
messageElement._voiceFooterRow.appendChild(timestampSpanSent);
statusSpan.style.marginLeft="4px";
messageElement._voiceFooterRow.appendChild(statusSpan);
}else{
footerDiv.appendChild(timestampSpanSent);
footerDiv.appendChild(statusSpan);
messageElement.appendChild(footerDiv);
}
setTimeout(function(){
checkBothSeen(messageId);
},100);
}else{
var timestampSpanRecv=document.createElement("span");
timestampSpanRecv.className="message-timestamp";
timestampSpanRecv.textContent=formatSendTime(data.timestamp);
if(data.mediaType==="voice"&&messageElement._voiceFooterRow){
timestampSpanRecv.style.marginLeft="auto";
messageElement._voiceFooterRow.appendChild(timestampSpanRecv);
}else{
var footerDivRecv=document.createElement("div");
footerDivRecv.className="message-footer";
footerDivRecv.appendChild(timestampSpanRecv);
messageElement.appendChild(footerDivRecv);
}
}
if(data.seen&&data.seenTimestamp&&data.from===uid){
var seenSpan=document.createElement("span");
seenSpan.className="seen-timestamp";
seenSpan.textContent="Seen: "+formatSeenTime(data.seenTimestamp);
messageElement.appendChild(seenSpan);
}
messageContainer.appendChild(messageElement);
if(!data.deleted){
var emojiContainerDiv=document.createElement("div");
emojiContainerDiv.className="emoji-container";
messageContainer.appendChild(emojiContainerDiv);
}
messageElement.onkeydown=function(e){
if(e.key==="Enter"){
if(selectModeActive){
e.preventDefault();
e.stopPropagation();
toggleMessageSelected(messageId,messageElement);
return;
}
if(data.mediaType==="video"){
e.preventDefault();
e.stopPropagation();
handleVideoAction();
return;
}
if(data.mediaType==="image"||data.mediaType==="voice")return;
e.preventDefault();
e.stopPropagation();
if(!data.deleted)showEmojiContainer(messageContainer);
}
};
if(data.reaction){
var reactionSpan=document.createElement("span");
reactionSpan.className="reaction";
reactionSpan.textContent=data.reaction;
messageContainer.appendChild(reactionSpan);
}
if(!data.deleted){
var actionContainer=document.createElement("div");
actionContainer.className="action-container";
var deleteForMeButton=document.createElement("button");
deleteForMeButton.className="action-button delete-for-me";
deleteForMeButton.textContent="Delete for Me";
deleteForMeButton.tabIndex=11;
actionContainer.appendChild(deleteForMeButton);
if(data.from===uid){
var deleteForEveryoneButton=document.createElement("button");
deleteForEveryoneButton.className="action-button delete-for-everyone";
deleteForEveryoneButton.textContent="Delete for Everyone";
deleteForEveryoneButton.tabIndex=12;
actionContainer.appendChild(deleteForEveryoneButton);
}
if(data.mediaType==="image"){
var fullscreenButton=document.createElement("button");
fullscreenButton.className="action-button";
fullscreenButton.textContent="Fullscreen";
fullscreenButton.tabIndex=13;
actionContainer.appendChild(fullscreenButton);
}else if(data.mediaType==="voice"){
var playButton=document.createElement("button");
playButton.className="action-button";
playButton.textContent="Play";
playButton.tabIndex=13;
actionContainer.appendChild(playButton);
}
var reactButton=document.createElement("button");
reactButton.className="action-button";
reactButton.textContent="React";
reactButton.tabIndex=15;
reactButton.onclick=function(e){
e.stopPropagation();
actionContainer.style.display="none";
showEmojiContainer(messageContainer);
};
actionContainer.appendChild(reactButton);
var replyButton=document.createElement("button");
replyButton.className="action-button";
replyButton.textContent="Reply";
replyButton.tabIndex=14;
actionContainer.appendChild(replyButton);
messageContainer.appendChild(actionContainer);
}
appendMessageInOrder(messageContainer,data);
messages.push({
id: messageId,
element: messageContainer,
timestamp: data.timestamp,
data: cloneMessageData(data)
});
if(!window.__skipAutoScrollOnDisplay){chatBox.scrollTop=chatBox.scrollHeight;}

if(!window.__restoringCache)persistChatCache(currentChatUid);
messageElement.onfocus=function(){
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="React";
softkeyRight.innerHTML="Back";
};
messageElement.onblur=function(){
setTimeout(function(){
if(currentEmojiContainer&&!currentEmojiContainer.contains(document.activeElement)){
currentEmojiContainer.classList.remove("active-show");
currentEmojiContainer.style.display="none";
currentEmojiContainer=null;
}
},150);
if(document.activeElement&&
document.activeElement.className&&
document.activeElement.className.indexOf("message")===-1&&
document.activeElement.className.indexOf("emoji")===-1){
softkeyLeft.innerHTML="";
softkeyCenter.innerHTML="";
}
};
if(data.from!==uid&&!data.seen){
db.ref("presence1/"+currentChatUid).once("value",function(snap){
var partnerData=snap.val();
if(partnerData&&partnerData.currentChat===uid){
chatRef.child(messageId).update({
seen: true,
seenTimestamp: firebase.database.ServerValue.TIMESTAMP,
status: "seen"
});
otherChatRef.child(messageId).update({
seen: true,
seenTimestamp: firebase.database.ServerValue.TIMESTAMP,
status: "seen"
});
}
});
}
}
function formatSeenTime(timestamp){
if(!timestamp)return "";
const date=new Date(timestamp);
const month=date.getMonth()+1;
const day=date.getDate();
const hours=date.getHours();
const minutes=date.getMinutes();
const ampm=hours>=12 ? 'pm' : 'am';
const formattedHours=hours % 12||12;
return `${month}/${day}${formattedHours}:${minutes<10 ? '0'+minutes : minutes}${ampm}`;
}
function updateChatUI(){
var messageInputContainer=document.getElementById("messageInputContainer");
var blockedMessage=chatBox.querySelector(".blocked-message");
if(isBlockedByUser){
messageInputContainer.style.display="none";
if(!blockedMessage){
var blockedDiv=document.createElement("div");
blockedDiv.className="blocked-message";
blockedDiv.innerHTML="<span>"+currentChatUsername+" has blocked you</span>";
chatBox.appendChild(blockedDiv);
}
}else{
messageInputContainer.style.display="flex";
if(blockedMessage){
chatBox.removeChild(blockedMessage);
}
}
if(isChatBoxAtBottom()){chatBox.scrollTop=chatBox.scrollHeight;}
}
function uploadImageAsBase64(file,onProgress,onComplete,onError){
var reader=new FileReader();
var img=new Image();
reader.onload=function(e){
var originalBase64=e.target.result;
img.onload=function(){
var canvas=document.createElement("canvas");
var ctx=canvas.getContext("2d");
var MAX=800;
var w=img.width,h=img.height;
if(w>h){if(w>MAX){h=h*MAX/w;w=MAX;}}
else{if(h>MAX){w=w*MAX/h;h=MAX;}}
canvas.width=w;canvas.height=h;
ctx.drawImage(img,0,0,w,h);
if(onProgress)onProgress(50);
var quality=0.75;
var base64=canvas.toDataURL("image/jpeg",quality);
while(base64.length>900000&&quality>0.2){
quality-=0.1;
base64=canvas.toDataURL("image/jpeg",quality);
}
if(onProgress)onProgress(100);
if(onComplete)onComplete(base64);
};
img.onerror=function(){if(onError)onError(new Error("Invalid image"));};
img.src=originalBase64;
};
reader.onerror=function(){if(onError)onError(new Error("FileReader failed"));};
reader.readAsDataURL(file);
}
function sendImage(){
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["image/*","video/*","audio/*"]}});
activity.onsuccess=function(){
var file=this.result.blob;
if(file){handleMediaFile(file);}
else{showNotification("No file selected.");}
};
activity.onerror=function(){showNotification("Unable to pick a file.");};
}else{
var input=document.createElement("input");
input.type="file";
input.accept="image/*,video/*,audio/*";
input.multiple=true;
input.onchange=function(e){
var files=Array.from(e.target.files);
if(!files.length){showNotification("No file selected.");return;}
files.forEach(function(file){handleMediaFile(file);});
};
input.click();
}
}
function handleMediaFile(file){
if(file&&!file.name&&file instanceof Blob){
var ext="";
var t=file.type||"";
if(t.startsWith("image/"))ext=".jpg";
else if(t.startsWith("video/"))ext=".mp4";
else if(t.startsWith("audio/"))ext=t.indexOf("ogg")>=0 ? ".ogg" : ".webm";
else ext=".bin";
file=new File([file],"media_"+Date.now()+ext,{type: t||"application/octet-stream"});
}
var fileType=file.type||"";
if(!fileType&&file.name){
var n=file.name.toLowerCase();
if(n.match(/\.(jpg|jpeg|png|gif|webp)$/))fileType="image/jpeg";
else if(n.match(/\.(mp4|3gp|webm|mkv)$/))fileType="video/mp4";
else if(n.match(/\.(ogg|webm|mp3|aac|opus)$/))fileType="audio/ogg";
}
var lockedChatUid=currentChatUid;
var lockedReplyId=replyingToMessageId;
if(!lockedChatUid)return;
var uploadCancelled=false;
if(fileType.startsWith("image/")){
uploadFileToCloudinary(file,
null,
function(url){
if(uploadCancelled)return;
var savedChatUid=currentChatUid;
currentChatUid=lockedChatUid;
sendMessage(url,"image",lockedReplyId);
currentChatUid=savedChatUid;
},
function(err){
if(uploadCancelled)return;
queueMediaMessage(lockedChatUid,file,"image",lockedReplyId);
},
function(){uploadCancelled=true;}
);
}else if(fileType.startsWith("video/")){
var MAX_VIDEO_MB=30;
if(file.size>MAX_VIDEO_MB*1024*1024){
showNotification("Video too large!Max size is "+MAX_VIDEO_MB+"MB.");
return;
}
uploadFileToCloudinary(file,
null,
function(url){
if(uploadCancelled)return;
var savedChatUid=currentChatUid;
currentChatUid=lockedChatUid;
sendMessage(url,"video",lockedReplyId);
currentChatUid=savedChatUid;
},
function(err){
if(uploadCancelled)return;
queueMediaMessage(lockedChatUid,file,"video",lockedReplyId);
},
function(){uploadCancelled=true;}
);
}else if(fileType.startsWith("audio/")){
uploadFileToCloudinary(file,
null,
function(url){
if(uploadCancelled)return;
var savedChatUid=currentChatUid;
currentChatUid=lockedChatUid;
sendMessage(url,"voice",lockedReplyId);
currentChatUid=savedChatUid;
},
function(err){
if(uploadCancelled)return;
queueMediaMessage(lockedChatUid,file,"voice",lockedReplyId);
},
function(){uploadCancelled=true;}
);
}else{
showNotification("Unsupported file type.");
}
}
function sendVideo(){
sendImage();
}
function pickMediaWithChooser(accept,label){
var chooser=document.createElement("div");
chooser.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:flex-end;";
var sheet=document.createElement("div");
sheet.style.cssText="width:100%;background:#fff;border-radius:14px 14px 0 0;padding:12px 0 20px;";
var title=document.createElement("div");
title.style.cssText="text-align:center;font-size:13px;font-weight:700;color:#0077B6;padding:6px 0 10px;border-bottom:1px solid #f0f0f0;margin-bottom:6px;";
title.textContent="Choose "+label+" from";
sheet.appendChild(title);
var btns=[];
function makeBtn(text,icon,onClick){
var btn=document.createElement("div");
btn.tabIndex=0;
btn.style.cssText="padding:12px 20px;font-size:14px;color:#111;display:flex;align-items:center;gap:14px;cursor:pointer;outline:none;";
btn.innerHTML='<span style="font-size:22px;">'+icon+'</span>'+text;
btn.onclick=function(){chooser.remove();onClick();};
btn.onkeydown=function(e){
if(e.key==="Enter"){btn.click();}
else if(e.key==="ArrowDown"){var ni=btns.indexOf(btn)+1;if(ni<btns.length)btns[ni].focus();}
else if(e.key==="ArrowUp"){var ni=btns.indexOf(btn)-1;if(ni>=0)btns[ni].focus();else cancelBtn.focus();}
else if(e.key==="Escape"||e.key==="SoftLeft"||e.key==="Backspace"){chooser.remove();}
};
btn.onfocus=function(){btn.style.background="#E0F7FA";};
btn.onblur=function(){btn};
sheet.appendChild(btn);
btns.push(btn);
}
makeBtn("Camera","📷",function(){
var input=document.createElement("input");
input.type="file";
input.accept=accept;
input.capture="environment";
input.onchange=function(e){var f=e.target.files[0];if(f)handleMediaFile(f);};
document.body.appendChild(input);
input.click();
setTimeout(function(){if(input.parentNode)input.parentNode.removeChild(input);},5000);
});
makeBtn("Gallery","🖼️",function(){
var input=document.createElement("input");
input.type="file";
input.accept=accept;
input.onchange=function(e){var f=e.target.files[0];if(f)handleMediaFile(f);};
document.body.appendChild(input);
input.click();
setTimeout(function(){if(input.parentNode)input.parentNode.removeChild(input);},5000);
});
var cancelBtn=document.createElement("div");
cancelBtn.tabIndex=0;
cancelBtn.style.cssText="text-align:center;padding:10px;color:#e53935;font-size:13px;font-weight:600;margin-top:4px;cursor:pointer;border-top:1px solid #f0f0f0;outline:none;";
cancelBtn.textContent="Cancel";
cancelBtn.onclick=function(){chooser.remove();};
cancelBtn.onkeydown=function(e){
if(e.key==="Enter"){chooser.remove();}
else if(e.key==="ArrowUp"){if(btns.length)btns[btns.length-1].focus();}
else if(e.key==="Escape"||e.key==="SoftLeft"||e.key==="Backspace"){chooser.remove();}
};
sheet.appendChild(cancelBtn);
chooser.appendChild(sheet);
document.body.appendChild(chooser);
chooser.onclick=function(e){if(e.target===chooser)chooser.remove();};
setTimeout(function(){if(btns.length)btns[0].focus();},50);
}
function sendImageDirect(){
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["image/*"]}});
activity.onsuccess=function(){var file=this.result.blob;if(file)handleMediaFile(file);};
activity.onerror=function(){showNotification("Unable to pick photo.");};
}else{
pickMediaWithChooser("image/*","Photo");
}
}
function sendVideoDirect(){
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["video/*"]}});
activity.onsuccess=function(){var file=this.result.blob;if(file)handleMediaFile(file);};
activity.onerror=function(){showNotification("Unable to pick video.");};
}else{
pickMediaWithChooser("video/*","Video");
}
}
function sendMusicFile(){
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["audio/*"]}});
activity.onsuccess=function(){var file=this.result.blob;if(file)handleMediaFile(file);else showNotification("No audio selected.");};
activity.onerror=function(){showNotification("Unable to pick audio.");};
}else{
var input=document.createElement("input");
input.type="file";
input.accept="audio/*";
input.onchange=function(e){var f=e.target.files[0];if(f)handleMediaFile(f);};
input.click();
}
}
var worldChatButton=document.getElementById("worldChatButton");
if(worldChatButton){
worldChatButton.onfocus=function(){
softkeyLeft.innerHTML="Options";
softkeyRight.innerHTML="Back";
};
}
var groupChatButton=document.getElementById("groupChatButton");
if(groupChatButton){
groupChatButton.onfocus=function(){
softkeyLeft.innerHTML="Options";
softkeyRight.innerHTML="Back";
};
}
var _appLockPrevFocus=null;
function showAppLockScreen(){
_appLockPrevFocus=document.activeElement;
appLockContainer.style.display="flex";
appLockInput.value="";
welcomePage.classList.remove("active");
loginPage.classList.remove("active");
signUpPage.classList.remove("active");
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softKeysContainer.style.display="none";
setTimeout(function(){appLockInput.focus();},50);
}
function hideAppLockScreen(){
appLockContainer.style.display="none";
}
function setupAppLock(){
hideDropdown();
showCustomPrompt("Enter a password to lock the app:",function(password){
if(password){
localStorage.setItem("appLockPassword",password);
localStorage.setItem("isAppLocked","true");
appLockPassword=password;
isAppLocked=true;
showNotification("App lock enabled successfully.");
}else{
showNotification("Please enter a valid password.");
}
});
}
function removeAppLock(){
localStorage.removeItem("appLockPassword");
localStorage.setItem("isAppLocked","false");
appLockPassword=null;
isAppLocked=false;
showNotification("App lock disabled successfully.");
}
var _appLockEls=function(){return[appLockInput,appLockCancel,appLockSubmit];};
appLockContainer.addEventListener("keydown",function(e){
var els=_appLockEls();
var ci=els.indexOf(document.activeElement);
if(e.key==="ArrowDown"){
e.preventDefault();
var next=els[(ci+1)% els.length];
next.focus();
}else if(e.key==="ArrowUp"){
e.preventDefault();
var prev=els[(ci-1+els.length)% els.length];
prev.focus();
}else if(e.key==="Enter"){
if(document.activeElement===appLockCancel){
e.preventDefault();appLockCancel.click();
}else if(document.activeElement===appLockSubmit||document.activeElement===appLockInput){
e.preventDefault();appLockSubmit.click();
}
}
});
appLockSubmit.onfocus=function(){appLockSubmit.style.opacity="0.85";appLockSubmit.style.transform="scale(1.03)";};
appLockSubmit.onblur=function(){appLockSubmit.style.opacity="1";appLockSubmit.style.transform="scale(1)";};
appLockCancel.onfocus=function(){appLockCancel.style.borderColor="#00B4D8";appLockCancel.style.color="#00B4D8";};
appLockCancel.onblur=function(){appLockCancel.style.borderColor="#1E3A5F";appLockCancel.style.color="#94A3B8";};
appLockCancel.onclick=function(){
hideAppLockScreen();
if(_appLockPrevFocus&&_appLockPrevFocus.focus){
setTimeout(function(){_appLockPrevFocus.focus();},50);
}
};
appLockSubmit.onclick=function(){
var enteredPassword=appLockInput.value;
if(enteredPassword===appLockPassword){
hideAppLockScreen();
initializeApp();
setTimeout(function(){focusPrivateChatsLanding();},1000);
}else{
showCustomAlert("Incorrect password. Please try again.",function(){
appLockInput.value="";
appLockInput.focus();
});
}
};
appLockInput.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();appLockSubmit.click();}
};
function changeBackground(){
function processBackgroundFile(file){
var reader=new FileReader();
reader.onload=function(e){
var orig=e.target.result;
var img=new Image();
img.onload=function(){
var canvas=document.createElement("canvas");
var ctx=canvas.getContext("2d");
var MAX=1080;
var w=img.width,h=img.height;
if(w>h){if(w>MAX){h=h*MAX/w;w=MAX;}}
else{if(h>MAX){w=w*MAX/h;h=MAX;}}
canvas.width=w;canvas.height=h;
ctx.drawImage(img,0,0,w,h);
var base64=canvas.toDataURL("image/jpeg",0.7);
chatBox.style.backgroundImage="url("+base64+")";
chatBox.style.backgroundSize="cover";
chatBox.style.backgroundPosition="center";
try{localStorage.setItem("chatBackground",base64);}catch(e){}
};
img.src=orig;
};
reader.readAsDataURL(file);
}
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["image/*"]}});
activity.onsuccess=function(){
var file=this.result.blob;
if(file){processBackgroundFile(file);}
};
activity.onerror=function(){showNotification("Unable to pick a background image.");};
}else{
var input=document.createElement("input");
input.type="file";
input.accept="image/*";
input.onchange=function(e){
var file=e.target.files[0];
if(file){processBackgroundFile(file);}
};
input.click();
}
}
function updatePrivateChatList(user1Uid,user2Uid){
db.ref("conversations/"+user1Uid+"/"+user2Uid).set(true);
db.ref("conversations/"+user2Uid+"/"+user1Uid).set(true);
}
var REACTION_EMOJIS=['👍','😂','😢','😡','❤','😮'];
function hideEmojiContainer(){
if(currentEmojiContainer){
currentEmojiContainer.classList.remove("active-show");
currentEmojiContainer.removeAttribute("style");
currentEmojiContainer.style.display="none";
currentEmojiContainer=null;
}
var all=document.querySelectorAll(".emoji-container.active-show");
all.forEach(function(c){
c.classList.remove("active-show");
c.style.display="none";
});
}
function showEmojiContainer(messageContainer){
hideEmojiContainer();
var emojiContainer=messageContainer.querySelector(".emoji-container");
if(!emojiContainer)return;
var msgEl=messageContainer.querySelector(".message");
var msgId=msgEl ? msgEl.id.replace("msg-",""): null;
var reactionSpan=messageContainer.querySelector(".reaction");
var currentReaction=reactionSpan ? reactionSpan.textContent : null;
emojiContainer.innerHTML="";
REACTION_EMOJIS.forEach(function(em,i){
var span=document.createElement("span");
span.className="emoji emoji-font";
span.textContent=em;
span.tabIndex=200+i;
span.setAttribute("data-emoji",em);
span.onclick=function(ev){
ev.stopPropagation();
emojiContainer.classList.remove("active-show");
emojiContainer.style.display="none";
currentEmojiContainer=null;
setTimeout(function(){if(msgEl)msgEl.focus();},0);
if(msgId){
if(em===currentReaction)removeReaction(msgId);
else addReaction(msgId,em);
}
};
span.onkeydown=function(ev){
var emojis=Array.from(emojiContainer.querySelectorAll(".emoji"));
var ci=emojis.indexOf(span);
if(ev.key==="ArrowRight"||ev.key==="ArrowDown"){
ev.preventDefault();ev.stopPropagation();
if(ci+1<emojis.length)emojis[ci+1].focus();
}else if(ev.key==="ArrowLeft"||ev.key==="ArrowUp"){
ev.preventDefault();ev.stopPropagation();
if(ci-1>=0)emojis[ci-1].focus();
}else if(ev.key==="Enter"||ev.key==="SoftCenter"){
ev.preventDefault();span.click();
}else if(ev.key==="Escape"||ev.key==="SoftLeft"||ev.key==="Backspace"){
ev.preventDefault();
emojiContainer.classList.remove("active-show");
emojiContainer.style.display="none";
currentEmojiContainer=null;
if(msgEl)msgEl.focus();
}
};
emojiContainer.appendChild(span);
});
emojiContainer.style.removeProperty("display");
emojiContainer.classList.add("active-show");
currentEmojiContainer=emojiContainer;
var msgRect=messageContainer.getBoundingClientRect();
var chatBoxEl=document.getElementById("chatBox");
var chatRect=chatBoxEl ? chatBoxEl.getBoundingClientRect():{left: 0,width: window.innerWidth};
var eWidth=220;
var centerX=msgRect.left+msgRect.width/2;
var leftPos=Math.max(4,Math.min(centerX-eWidth/2,window.innerWidth-eWidth-4));
emojiContainer.style.position="fixed";
emojiContainer.style.left=leftPos+"px";
emojiContainer.style.transform="none";
var topPos=msgRect.top-58;
if(topPos<50)topPos=msgRect.bottom+8;
emojiContainer.style.top=topPos+"px";
emojiContainer.style.bottom="auto";
var firstEmoji=emojiContainer.querySelector(".emoji");
if(firstEmoji)firstEmoji.focus();
}
function showActionContainer(messageContainer){
if(currentActionContainer){
currentActionContainer.style.display="none";
}
var actionContainer=messageContainer.querySelector(".action-container");
actionContainer.style.display="flex";
currentActionContainer=actionContainer;
}
function hideActionContainer(){
if(currentActionContainer){
currentActionContainer.style.display="none";
currentActionContainer=null;
}
}
function addReaction(messageId,emoji){
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).update({reaction: emoji});
db.ref("conversations/"+currentChatUid+"/"+uid+"/"+messageId).update({reaction: emoji});
var msgEl=document.getElementById("msg-"+messageId);
if(msgEl){
var container=msgEl.parentElement;
var existing=container.querySelector(".reaction");
if(existing){existing.textContent=emoji;}
else{
var rs=document.createElement("span");
rs.className="reaction";
rs.textContent=emoji;
container.appendChild(rs);
}
}
var cached=getCachedMessageEntry(messageId);
if(cached&&cached.data){
cached.data.reaction=emoji;
updateCachedMessageEntry(messageId,cached.data);
}
}
function removeReaction(messageId){
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).update({reaction: null});
db.ref("conversations/"+currentChatUid+"/"+uid+"/"+messageId).update({reaction: null});
var msgEl=document.getElementById("msg-"+messageId);
if(msgEl){
var container=msgEl.parentElement;
var existing=container.querySelector(".reaction");
if(existing)existing.parentElement.removeChild(existing);
}
var cached=getCachedMessageEntry(messageId);
if(cached&&cached.data){
cached.data.reaction=null;
updateCachedMessageEntry(messageId,cached.data);
}
}
function removeMessageBubbleFromDom(messageId){
  try{
    var bel=document.getElementById("msg-"+messageId);
    if(bel&&bel.parentElement){
      var bwrap=bel.parentElement.classList&&bel.parentElement.classList.contains("message-container")?bel.parentElement:bel;
      if(bwrap&&bwrap.parentElement)bwrap.parentElement.removeChild(bwrap);
    }
  }catch(e){}
}
// Unsent (queued) message ko delete karne par: queue se nikalo + agar isi waqt
// uska upload chal raha ho to use bhi abort karo, taake wo baad mein send na ho.
function cancelQueuedOutgoingMessage(messageId){
  if(!messageId)return;
  removeFromOutgoingQueue(messageId);
  try{
    if(window._queueUploadAbort&&typeof window._queueUploadAbort[messageId]==="function"){
      window._queueUploadAbort[messageId]();
    }
  }catch(e){}
}
function deleteMessageForMe(messageId){
  cancelQueuedOutgoingMessage(messageId);
  db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).remove();
  processedMessages[messageId]=true;
  messages=messages.filter(function(m){return m.id!==messageId;});
  persistChatCache(currentChatUid);
}
function deleteMessageForEveryone(messageId){
  // Agar message abhi bhi unsent/queued hai to wo ab send nahi hoga — bina DB
  // stub banaye usay chat se hata do.
  getOutgoingQueue(function(nowQueue){
    var stillQueued=false;
    for(var qi=0;qi<nowQueue.length;qi++){
      if(nowQueue[qi]&&nowQueue[qi].id===messageId){stillQueued=true;break;}
    }
    if(stillQueued){
      cancelQueuedOutgoingMessage(messageId);
      deleteMessageForMe(messageId);
      removeMessageBubbleFromDom(messageId);
      return;
    }
    deleteSentMessageForEveryone(messageId);
  });
}
function deleteSentMessageForEveryone(messageId){
  var senderRef=db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId);
  var receiverRef=db.ref("conversations/"+currentChatUid+"/"+uid+"/"+messageId);
  var deletedData={
    deleted: true,
    message: "Message deleted",
    timestamp: firebase.database.ServerValue.TIMESTAMP,
    from: uid,
    deletedBy: uid,
    deletedAt: Date.now()
  };
  senderRef.update(deletedData);
  receiverRef.update(deletedData);
  var messageElement=document.getElementById("msg-"+messageId);
  if(messageElement){
    messageElement.className="message deleted-message";
    messageElement.innerHTML="";
    var deletedSpan=document.createElement("span");
    deletedSpan.textContent="Message deleted";
    deletedSpan.style.cssText="font-style:italic;color:#888;";
    messageElement.appendChild(deletedSpan);
    var tsSpan=document.createElement("span");
    tsSpan.className="message-timestamp";
    tsSpan.textContent=formatSendTime(Date.now());
    messageElement.appendChild(tsSpan);
    var reactionSpan=messageElement.parentElement.querySelector(".reaction");
    if(reactionSpan)reactionSpan.parentElement.removeChild(reactionSpan);
    var actionContainer=messageElement.parentElement.querySelector(".action-container");
    if(actionContainer)actionContainer.parentElement.removeChild(actionContainer);
  }
  var cached=getCachedMessageEntry(messageId);
  if(cached&&cached.data){
    cached.data.deleted=true;
    cached.data.message="Message deleted";
    cached.data.deletedAt=Date.now();
    updateCachedMessageEntry(messageId,cached.data);
  }
}
var DROPDOWN_ICONS={};
var CHAT_DROPDOWN_ITEMS=[
{label: 'Emoji',icon: '😊',color: '#FFB300'},
{label: 'Photo',icon: '📷',color: '#E91E63'},
{label: 'Video',icon: '🎬',color: '#7B1FA2'},
{label: 'Audio',icon: '🎵',color: '#E91E63'}
];
function navigate(offset){
var elements=Array.from(document.querySelectorAll(".navItem,.message,.emoji,.action-button,.dropdown-item"));
var index=elements.indexOf(document.activeElement);
var target=elements[index+offset];
if(target)target.focus();
}
function logout(){
hideDropdown();
var userId=uid;
if(userId){
try{db.ref("conversations/"+userId).off();}catch(e){}
}
notificationListenerActive=false;
groupNotificationListenerActive=false;
for(var chatUidKey in activeChatListeners){
if(activeChatListeners.hasOwnProperty(chatUidKey)){
activeChatListeners[chatUidKey].forEach(function(ref){try{ref.off();}catch(e){}});
}
}
activeChatListeners={};
if(window._chatListPresenceRefs){
for(var presUidKey in window._chatListPresenceRefs){
if(window._chatListPresenceRefs.hasOwnProperty(presUidKey)){
try{window._chatListPresenceRefs[presUidKey].off();}catch(e){}
}
}
window._chatListPresenceRefs={};
}
window._chatLastKnownUnread={};
window._chatLastKnownTs={};
var privateChatItems=document.querySelectorAll(".user.navItem[data-uid]");
privateChatItems.forEach(function(el){
var pUid=el.dataset.uid;
if(pUid&&userId){
try{db.ref("conversations/"+userId+"/"+pUid).off();}catch(e){}
try{db.ref("presence1/"+pUid).off();}catch(e){}
try{db.ref("statuses/"+pUid).off();}catch(e){}
}
});
if(connectionRef){try{connectionRef.off();}catch(e){}connectionRef=null;}
if(statusRef){try{statusRef.off();}catch(e){}statusRef=null;}
if(chatRef){try{chatRef.off();}catch(e){}chatRef=null;}
if(otherChatRef){try{otherChatRef.off();}catch(e){}otherChatRef=null;}
if(onlineUsersListRef){try{onlineUsersListRef.off();}catch(e){}onlineUsersListRef=null;}
if(userId){
try{
db.ref("presence1/"+userId).update({
online: false,
lastSeen: Date.now(),
currentChat: null
});
db.ref("online_users/"+userId).remove();
}catch(e){}
}
// Local logout must not wait on a network round-trip. Firebase's
// auth.signOut() needs the network to fully invalidate the session
// server-side, but on a flaky/offline KaiOS connection that call can hang
// or fail — and since all of the UI reset used to live inside its
// .then(), the person would stay stuck looking at the old logged-in
// screen (or get a "Failed to logout" error) instead of actually being
// logged out. We reset everything locally right away and let signOut()
// finish in the background; from the person's point of view, logging out
// is instant either way.
try{auth.signOut();}catch(e){}
var savedAppLockPassword=localStorage.getItem("appLockPassword");
var savedIsAppLocked=localStorage.getItem("isAppLocked");
var savedChatBackground=localStorage.getItem("chatBackground");
var savedFontSize=localStorage.getItem("chitchat_font_size");
var savedFontStyle=localStorage.getItem("chitchat_font_style");
// Note: chat list index ("privateChats") and cached message bodies
// ("chatMessagesCache_v2_*") are intentionally NOT preserved below —
// they belong to the account that just logged out. Leaving them behind
// would let the next person who logs in on this phone see the previous
// user's chat list and message history.
localStorage.clear();
if(savedAppLockPassword)localStorage.setItem("appLockPassword",savedAppLockPassword);
if(savedIsAppLocked)localStorage.setItem("isAppLocked",savedIsAppLocked);
if(savedChatBackground)localStorage.setItem("chatBackground",savedChatBackground);
if(savedFontSize)localStorage.setItem("chitchat_font_size",savedFontSize);
if(savedFontStyle)localStorage.setItem("chitchat_font_style",savedFontStyle);
uid=null;
username=null;
currentChatUid=null;
currentOpenChatUid=null;
window.currentChatUid=null;
messages=[];
processedMessages={};
loadedChats={};
chatMessagesCache={};
unreadCounts={};
lastMessagesCache={};
userStatuses={};
lastAutoDeleteDates={};
allOnlineUsers=[];
displayedUsers=0;
onlineUsersLoadComplete=false;
isOnlineUserAdded=false;
mainPage.classList.remove("active");
chatPage.classList.remove("active");
signUpPage.classList.add("active");
var mainTabBar=document.getElementById("mainTabBar");
if(mainTabBar)mainTabBar.style.display="none";
softKeysContainer.style.display="none";
softKeysContainer.classList.remove("active");
softkeyLeft.innerHTML="";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="";
privateChatList.innerHTML="";
var onlineUsersList=document.getElementById("onlineUsersList");
if(onlineUsersList)onlineUsersList.innerHTML="";
var statusListContainer=document.getElementById("statusListContainer");
if(statusListContainer)statusListContainer.innerHTML="";
usernameInputLogin.value="";
passwordInputLogin.value="";
usernameInputSignUp.value="";
passwordInputSignUp.value="";
messageInput.value="";
profileViewContainer.style.display="none";
profileEditContainer.style.display="none";
statusViewContainer.style.display="none";
statusAddContainer.style.display="none";
searchContainer.style.display="none";
showAutoHideAlert("Logged out successfully!");
setTimeout(function(){signUpNavButton.focus();},2000);
}
function showAutoHideAlert(message){
isAlertActive=true;
var alertBox=document.createElement("div");
alertBox.className="custom-alert auto-hide-alert";
alertBox.innerHTML='<div class="custom-alert-header">Chit Chat</div><p>'+message+'</p>';
var style=document.createElement('style');
style.textContent=`
.auto-hide-alert{
animation: fadeOut 2s ease-in-out 0s forwards;
}
@keyframes fadeOut{
0%{opacity: 1;}
70%{opacity: 1;}
100%{opacity: 0;display: none;}
}
`;
document.head.appendChild(style);
document.body.appendChild(alertBox);
setTimeout(function(){
if(alertBox.parentNode){
alertBox.parentNode.removeChild(alertBox);
}
isAlertActive=false;
},2000);
}
document.addEventListener("keydown",function(e){
var _toastEl=document.getElementById("incomingMsgToast");
if(_toastEl&&_toastEl.classList.contains("active")){
if(e.key==="SoftLeft"||e.key==="Escape"||e.key==="Backspace"){
e.preventDefault();e.stopPropagation();
hideIncomingToast(true);
return;
}
if(e.key==="SoftCenter"||e.key==="Enter"){
e.preventDefault();e.stopPropagation();
openIncomingToastTarget();
return;
}
}
if(e.key==="Enter"&&isRecording&&chatPage.classList.contains("active")){
e.preventDefault();
e.stopPropagation();
stopRecording();
return;
}
if(typeof emojiPickerOpen!=='undefined'&&emojiPickerOpen){
if(e.key==="SoftLeft"||e.key==="Power"||e.key==="EndCall"||e.key==="Escape"){
e.preventDefault();
e.stopPropagation();
closeEmojiPicker();
return;
}
if(e.key==="SoftRight"){
e.preventDefault();
e.stopPropagation();
cycleEmojiCategory(1);
return;
}
return;
}
if(isDropdownVisible&&(e.key==="SoftRight"||e.key==="SoftLeft")){
e.preventDefault();
hideDropdown();
return;
}
if(isAlertActive){
var alertBox=document.querySelector(".custom-alert");
if(alertBox){
var input=alertBox.querySelector("#promptInput");
var okButton=alertBox.querySelector("#promptOkButton")||alertBox.querySelector("#alertOkButton");
var cancelButton=alertBox.querySelector("#confirmCancelButton");
if(input&&e.key==="ArrowDown"&&document.activeElement===input){
okButton.focus();
}else if(okButton&&e.key==="ArrowUp"&&document.activeElement===okButton){
if(input)input.focus();
}else if(cancelButton&&e.key==="ArrowRight"&&document.activeElement===okButton){
cancelButton.focus();
}else if(cancelButton&&e.key==="ArrowLeft"&&document.activeElement===cancelButton){
okButton.focus();
}
}
return;
}
if(isAppLocked&&appLockContainer.style.display==="flex"){
e.preventDefault();
return;
}
var videoFullscreenPlayer=document.getElementById("videoFullscreenPlayer");
if(videoFullscreenPlayer&&videoFullscreenPlayer.style.display==="flex"){
var video=document.getElementById("fullscreenVideo");
var playBtn=document.getElementById("fullscreenPlayPauseBtn");
var volumeIndicator=document.getElementById("volumeIndicator");
e.preventDefault();
e.stopPropagation();
if(e.key==="Enter"){
if(e.repeat)return;
e.preventDefault();
e.stopPropagation();
if(document.activeElement===playBtn){
playBtn.click();
}
else{
if(video.paused||video.ended){
video.play().catch(function(){});
}else{
video.pause();
}
}
}
else if(e.key==="ArrowLeft"){
video.currentTime=Math.max(0,(video.currentTime||0)-5);
}
else if(e.key==="ArrowRight"){
video.currentTime=Math.min(video.duration||0,(video.currentTime||0)+5);
}
else if(e.key==="ArrowUp"){
video.volume=Math.min(1,(video.volume||0)+0.1);
if(volumeIndicator){
volumeIndicator.style.opacity="1";
if(window.volumeHideTimeout){
clearTimeout(window.volumeHideTimeout);
}
window.volumeHideTimeout=setTimeout(function(){
if(volumeIndicator){
volumeIndicator.style.opacity="0.3";
}
},2000);
}
}
else if(e.key==="ArrowDown"){
video.volume=Math.max(0,(video.volume||0)-0.1);
if(volumeIndicator){
volumeIndicator.style.opacity="1";
if(window.volumeHideTimeout){
clearTimeout(window.volumeHideTimeout);
}
window.volumeHideTimeout=setTimeout(function(){
if(volumeIndicator){
volumeIndicator.style.opacity="0.3";
}
},2000);
}
}
else if(e.key==="SoftLeft"||e.key==="SoftRight"||e.key==="Power"||e.key==="Backspace"){
closeVideoFullscreen();
}
return;
}
var activeElement=document.activeElement;
if(e.key==="Enter"&&activeElement&&activeElement.classList&&activeElement.classList.contains("video-container")){
return;
}
if(e.key==="Enter"&&activeElement){
var tag=activeElement.tagName;
if(typeof chatListSelectModeActive!=="undefined"&&chatListSelectModeActive&&activeElement.classList&&activeElement.classList.contains("user")){
e.preventDefault();
toggleChatSelected(activeElement.dataset.uid,activeElement);
return;
}
if(tag==="BUTTON"||(activeElement.classList&&activeElement.classList.contains("navItem")&&tag!=="INPUT"&&tag!=="TEXTAREA"&&!activeElement.classList.contains("video-container"))){
e.preventDefault();
activeElement.click();
return;
}
}
if(statusViewContainer.style.display==="flex"){
var statusLikeBtn=document.getElementById("statusLikeBtn");
var statusReplyInput=document.getElementById("statusReplyInput");
var statusReplyRow=document.getElementById("statusReplyRow");
if(e.key==="SoftLeft"||e.key==="Backspace"){
e.preventDefault();
hideStatusView();
}else if(e.key==="SoftRight"){
if(currentStatusIndex+1<userStatusArray.length){
showNextStatusView();
}else{
hideStatusView();
if(currentStatusViewUid===uid){
setTimeout(function(){showStatusAdd();},100);
}
}
}else if(e.key==="SoftCenter"||(e.key==="Enter"&&activeElement===statusReplyInput)){
if(statusReplyInput&&statusReplyInput.value.trim()){
e.preventDefault();
sendStatusReply(currentStatusViewUid,statusReplyInput.value.trim());
}
}else if(e.key==="Enter"&&activeElement===statusLikeBtn){
e.preventDefault();
if(statusLikeBtn)statusLikeBtn.click();
}else if(e.key==="Enter"&&activeElement===statusViewsButton){
showStatusViewers(userStatusArray[currentStatusIndex].timestamp);
}else if(e.key==="Enter"&&activeElement===statusImageView){
toggleFullScreen(statusImageView);
}else if(e.key==="ArrowDown"||e.key==="ArrowRight"){
e.preventDefault();
if(statusReplyRow&&statusReplyRow.style.display==="flex"){
if(!activeElement||activeElement===statusLikeBtn){
if(statusReplyInput)statusReplyInput.focus();
}else if(activeElement===statusReplyInput){
if(statusLikeBtn)statusLikeBtn.focus();
}
}
}else if(e.key==="ArrowUp"||e.key==="ArrowLeft"){
e.preventDefault();
if(statusReplyRow&&statusReplyRow.style.display==="flex"){
if(activeElement===statusReplyInput){
if(statusLikeBtn)statusLikeBtn.focus();
}else if(activeElement===statusLikeBtn){
if(statusReplyInput)statusReplyInput.focus();
}
}
}
return;
}
var blockedUsersPage=document.getElementById("blockedUsersPage");
if(blockedUsersPage&&blockedUsersPage.style.display==="flex"){
if(e.key==="SoftLeft"||e.key==="Backspace"){
e.preventDefault();
hideBlockedUsersList();
}
return;
}
if(statusAddContainer.style.display==="flex"){
if(e.key==="SoftLeft"||(e.key==="Backspace"&&document.activeElement&&document.activeElement.tagName!=="INPUT"&&document.activeElement.tagName!=="TEXTAREA")){
e.preventDefault();
hideStatusAdd();
}else if(e.key==="SoftRight"){
if(softkeyRight.innerHTML==="Save"){
saveStatus();
}else if(softkeyRight.innerHTML==="New Status"){
var elsToClear=statusAddContainer.querySelectorAll(".status-timestamp,.status-views,.status-buttons-container,.status-type-buttons");
elsToClear.forEach(function(el){el.remove();});
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
var svpEl=document.getElementById("statusVideoPreview");
if(svpEl){svpEl.style.display="none";svpEl.src="";}
showStatusTypeSelection();
}else if(softkeyRight.innerHTML==="Next"&&userStatusArray.length>0){
showNextStatus();
}
}else if(e.key==="Enter"){
if(document.activeElement===statusTextInput&&statusSaveButton.style.display==="block"){
e.preventDefault();
saveStatus();
}
else if(document.activeElement.classList.contains("view-who-saw-button")){
e.preventDefault();
document.activeElement.click();
}
else if(document.activeElement.classList.contains("close-viewers-button")){
e.preventDefault();
document.activeElement.click();
}
}else if(e.key==="ArrowDown"){
if(activeElement.className.includes("navItem")&&activeElement.textContent==="Image Status"){
document.querySelector(".navItem[textContent='Text Status']").focus();
}else if(activeElement===statusTextInput){
statusSaveButton.focus();
}else if(activeElement===statusImagePreview){
statusSaveButton.focus();
}else if(activeElement===statusDeleteButton){
var viewButton=statusAddContainer.querySelector(".view-who-saw-button");
if(viewButton&&viewButton.style.display!=="none"){
viewButton.focus();
}else if(statusNextButton.style.display!=="none"){
statusNextButton.focus();
}
}else if(activeElement.className.includes("view-who-saw-button")){
if(statusNextButton.style.display!=="none"){
statusNextButton.focus();
}
}
}else if(e.key==="ArrowUp"){
if(activeElement.className.includes("navItem")&&activeElement.textContent==="Text Status"){
document.querySelector(".navItem[textContent='Image Status']").focus();
}else if(activeElement===statusSaveButton){
if(statusTextInput.style.display==="block"){
statusTextInput.focus();
}else{
statusImagePreview.focus();
}
}else if(activeElement===statusNextButton){
var viewButton=statusAddContainer.querySelector(".view-who-saw-button");
if(viewButton&&viewButton.style.display!=="none"){
viewButton.focus();
}else{
statusDeleteButton.focus();
}
}else if(activeElement.className.includes("view-who-saw-button")){
statusDeleteButton.focus();
}
}
return;
}
if(profileViewContainer.style.display==="flex"){
if(e.key==="SoftLeft"||e.key==="Backspace"){
e.preventDefault();
var pfOverlay=document.getElementById("profilePicFullscreen");
if(pfOverlay){pfOverlay.remove();profileImageView.focus();return;}
hideProfileView();
}else if(e.key==="Enter"||e.key==="SoftCenter"){
e.preventDefault();
var existing=document.getElementById("profilePicFullscreen");
if(existing){
existing.remove();
profileImageView.focus();
}else if(profileImageView.src&&profileImageView.src!==window.location.href&&profileImageView.src!==""){
var overlay=document.createElement("div");
overlay.id="profilePicFullscreen";
overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;";
var bigImg=document.createElement("img");
bigImg.src=profileImageView.src;
bigImg.style.cssText="max-width:100%;max-height:100%;object-fit:contain;";
overlay.appendChild(bigImg);
document.body.appendChild(overlay);
overlay.tabIndex=0;
setTimeout(function(){overlay.focus();},30);
overlay.addEventListener("keydown",function(ev){ev.preventDefault();overlay.remove();profileImageView.focus();});
overlay.onclick=function(){overlay.remove();profileImageView.focus();};
}
}
return;
}
if(profileEditContainer.style.display==="flex"){
if(e.key==="SoftLeft"){
hideProfileEdit();
}else if(e.key==="SoftRight"){
saveProfile();
}else if(e.key==="ArrowDown"){
if(activeElement===changeProfilePicButton){
profileAboutInput.focus();
}else if(activeElement===profileAboutInput){
profileSaveButton.focus();
}
}else if(e.key==="ArrowUp"){
if(activeElement===profileAboutInput){
changeProfilePicButton.focus();
}else if(activeElement===profileSaveButton){
profileAboutInput.focus();
}
}
return;
}
if(searchResults.style.display==="block"){
searchResultsVisible=true;
if(e.key==="ArrowDown"){
e.preventDefault();
var items=Array.from(searchResults.querySelectorAll(".search-result-item"));
var index=items.indexOf(activeElement);
if(index<items.length-1)items[index+1].focus();
else if(items.length>0)items[0].focus();
}else if(e.key==="ArrowUp"){
e.preventDefault();
var items=Array.from(searchResults.querySelectorAll(".search-result-item"));
var index=items.indexOf(activeElement);
if(index>0)items[index-1].focus();
else searchInput.focus();
}else if(e.key==="SoftLeft"){
hideSearchBar();
}else if(e.key==="Enter"){
if(activeElement&&activeElement.classList.contains("search-result-item")){
e.preventDefault();
activeElement.click();
}else if(activeElement===searchInput){
e.preventDefault();
performSearch();
}
}
return;
}else{
searchResultsVisible=false;
}
if(isDropdownVisible){
e.preventDefault();
e.stopPropagation();
if(e.key==="ArrowUp"){
var items=Array.from(dropdownMenu.children);
var index=items.indexOf(activeElement);
if(index>0)items[index-1].focus();
}else if(e.key==="ArrowDown"){
var items=Array.from(dropdownMenu.children);
var index=items.indexOf(activeElement);
if(index<items.length-1)items[index+1].focus();
}else if(e.key==="Enter"){
activeElement.click();
}else if(e.key==="SoftLeft"){
hideDropdown();
}
return;
}
if(activeElement&&activeElement.className==="simple-voice-controls"&&activeElement.tagName==="BUTTON"){
if(e.key==="Enter"){
e.preventDefault();
activeElement.click();
}
return;
}
if(activeElement.tagName==="IMG"&&activeElement.style.position==="fixed"){
if(e.key==="Enter"||e.key==="SoftRight"){
toggleFullScreen(activeElement);
var messageContainer=activeElement.parentElement.parentElement;
messageContainer.querySelector(".message").focus();
}
return;
}
if(mainPage.classList.contains("active")){
if(e.key==="ArrowLeft"||e.key==="ArrowRight"){
if(!isOnlineViewActive&&searchContainer.style.display!=="block"&&!isDropdownVisible){
e.preventDefault();
if(currentMainTab==='chat'){
switchMainTab('status');
}else{
switchMainTab('chat');
}
return;
}
}
if(e.key==="SoftLeft"){
e.preventDefault();
if(typeof chatListSelectModeActive!=="undefined"&&chatListSelectModeActive){
exitChatListSelectMode();
return;
}
if(currentMainTab==='status'){
switchMainTab('chat');
return;
}
if(searchContainer.style.display==="block"){
hideSearchBar();
return;
}
if(isOnlineViewActive){
if(typeof showPrivateChatsView==='function'){
showPrivateChatsView();
}
}else{
if(!activeElement||!activeElement.classList||!activeElement.classList.contains("user")){
showDropdown([
"World Chat",
"Group Chat",
"Search",
"Settings"
],function(index){
if(index===0){hideDropdown();navigateTo("world_chat.html");}
else if(index===1){hideDropdown();navigateTo("groups.html");}
else if(index===2){hideDropdown();showSearchBar();}
else if(index===3){
hideDropdown(false);
setTimeout(function(){showSettingsMenu();},0);
}
});
return;
}
else if(activeElement&&activeElement.className==="user navItem"){
var partnerUid=activeElement.dataset.uid;
var _nameEl=activeElement.querySelector(".user-name");
var _cachedName=_nameEl ? _nameEl.textContent.trim(): "";
if(!_cachedName){
var _lc=JSON.parse(localStorage.getItem("privateChats")||"{}");
_cachedName=(_lc[partnerUid]&&_lc[partnerUid].username)? _lc[partnerUid].username : "";
}
var _showMenu=function(partnerUsername){
if(!partnerUsername)partnerUsername=_cachedName||"User";
var muteLabel=isChatMuted(partnerUid)? "Unmute" : "Mute";
showDropdown([
"World Chat","Group Chat","Search","View Profile",
"Clear Chat","Block",muteLabel,"Delete","Settings"
],function(index){
if(index===0){hideDropdown();navigateTo("world_chat.html");}
else if(index===1){hideDropdown();navigateTo("groups.html");}
else if(index===2){hideDropdown();showSearchBar();}
else if(index===3){showProfileView(partnerUid);}
else if(index===4){
hideDropdown();
showConfirmPrompt("Clear all messages in chat with "+partnerUsername+"?",function(confirm){
if(confirm){
// Clear locally right away — don't wait on the network round-trip
// to Firebase before the person sees any result. The remove() still
// happens, just in the background.
db.ref("conversations/"+uid+"/"+partnerUid).remove();
showNotification("Chat cleared!");
purgeChatLocalState(partnerUid,false);
try{
var cachedList=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(cachedList[partnerUid]){
cachedList[partnerUid].lastMessage="";
cachedList[partnerUid].lastTime="";
cachedList[partnerUid].lastMessageAt=0;
localStorage.setItem("privateChats",JSON.stringify(cachedList));
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",cachedList);}catch(e){}
}
}
}catch(e){}
if(chatBox)chatBox.innerHTML="";
}
});
}
else if(index===5){blockUser(uid,partnerUid);hideDropdown();}
else if(index===6){
hideDropdown();
var mutedNow=!isChatMuted(partnerUid);
setChatMuted(partnerUid,partnerUsername,mutedNow);
showNotification(partnerUsername+(mutedNow ? " is muted" : " is unmuted"));
}
else if(index===7){
hideDropdown();
showConfirmPrompt("Delete chat with "+partnerUsername+"?",function(confirm){
if(confirm){
db.ref("conversations/"+uid+"/"+partnerUid).remove();
// Also drop the privateChats entry server-side — otherwise the
// chat (and the deleted user) comes straight back on the next
// app open because fetchFromFirebaseAndSync() rebuilds the list
// from privateChats/{uid}.
db.ref("privateChats/"+uid+"/"+partnerUid).remove();
purgeChatLocalState(partnerUid,true);
activeElement.remove();
showNotification("Chat with "+partnerUsername+" removed.");
setTimeout(function(){
focusPrivateChatsLanding();
},200);
}
});
}
else if(index===8){
hideDropdown(false);
setTimeout(function(){showSettingsMenu();},0);
}
});
};
if(_cachedName){
_showMenu(_cachedName);
}else{
db.ref("presence1/"+partnerUid).once("value",function(snap){
_showMenu(snap.val()? snap.val().username : "");
});
}
}
else{
}
}
return;
}
if(e.key==="SoftRight"){
e.preventDefault();
if(typeof chatListSelectModeActive!=="undefined"&&chatListSelectModeActive){
exitChatListSelectMode();
return;
}
if(currentMainTab==='status'){
return;
}
if(isOnlineViewActive){
showConfirmPrompt("Close Chit Chat?",function(confirm){
if(confirm){
try{window.close();}catch(e){}
setTimeout(function(){
document.body.style.display="none";
},300);
}
});
}else{
if(typeof showOnlineUsersView==='function'){
showOnlineUsersView();
if(!window.__onlineUsersLoaded){
window.__onlineUsersLoaded=true;
var oList=document.getElementById("onlineUsersList");
if(oList){
oList.innerHTML="<div style='text-align:center;padding:20px;'>"+
"<span class='loading-spinner' style='display:inline-block;margin-right:8px;vertical-align:middle;border-top-color:#00B4D8;'></span>"+
"<span style='color:#64748B;font-size:11px;'>Loading online users...</span></div>";
}
setTimeout(function(){
if(typeof loadOnlineUsers==="function")loadOnlineUsers();
},50);
}
}
}
return;
}
if(e.key==="SoftCenter"){
e.preventDefault();
if(chatPage.classList.contains("active")){
if(messageInput._editingMsgId){
var newText=messageInput.value.trim();
if(newText)saveEditedMessage(messageInput._editingMsgId,newText);
else cancelEditMode();
return;
}
var ae=document.activeElement;
if(ae&&ae.className&&ae.className.indexOf("message")!==-1&&!ae.classList.contains("navItem")){
if(selectModeActive){
var selMid=ae.id.replace("msg-","");
toggleMessageSelected(selMid,ae);
return;
}
var mc=ae.parentElement;
if(mc){showEmojiContainer(mc);return;}
}
if(isRecording){
stopRecording();
return;
}
if(chatPage._voiceMode){
if(chatPage._voiceSend)chatPage._voiceSend();
return;
}
var msg=messageInput.value.trim();
if(msg){
sendMessage(msg,"text",replyingToMessageId);
messageInput.value="";
messageInput.style.height="auto";
replyingToMessageId=null;
replyInputPreview.classList.remove("visible");replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
setTypingStatus(uid,false,currentChatUid);
}
if(chatPage._updateChatSoftkeys)chatPage._updateChatSoftkeys();
return;
}
if(currentMainTab==='status'){
showStatusAdd();
return;
}
}
if(e.key==="ArrowDown"){
e.preventDefault();
if(currentMainTab==='status'){
var statusItems=Array.from(document.querySelectorAll("#myStatusRow,#statusListContainer .navItem"));
var cidx=statusItems.indexOf(document.activeElement);
if(cidx<statusItems.length-1)statusItems[cidx+1].focus();
else if(statusItems.length>0)statusItems[0].focus();
return;
}
if(isOnlineViewActive){
var onlineUsers=Array.from(document.querySelectorAll(".online-user-item"));
var currentIndex=onlineUsers.indexOf(document.activeElement);
if(currentIndex<onlineUsers.length-1){
onlineUsers[currentIndex+1].focus();
}else if(onlineUsers.length>0){
if(typeof loadNextUserBatch==='function'){
loadNextUserBatch();
}
setTimeout(function(){
var firstUser=document.querySelector(".online-user-item");
if(firstUser)firstUser.focus();
},400);
}
}else{
var focusableElements=Array.from(document.querySelectorAll(
".user.navItem"
));
var currentIndex=focusableElements.indexOf(document.activeElement);
if(currentIndex<focusableElements.length-1){
focusableElements[currentIndex+1].focus();
}else if(focusableElements.length>0){
focusableElements[0].focus();
}
}
return;
}
if(e.key==="ArrowUp"){
e.preventDefault();
if(currentMainTab==='status'){
var statusItems=Array.from(document.querySelectorAll("#myStatusRow,#statusListContainer .navItem"));
var cidx=statusItems.indexOf(document.activeElement);
if(cidx>0)statusItems[cidx-1].focus();
else if(statusItems.length>0)statusItems[statusItems.length-1].focus();
return;
}
if(isOnlineViewActive){
var onlineUsers=Array.from(document.querySelectorAll(".online-user-item"));
var currentIndex=onlineUsers.indexOf(document.activeElement);
if(currentIndex>0){
onlineUsers[currentIndex-1].focus();
}else if(onlineUsers.length>0){
onlineUsers[onlineUsers.length-1].focus();
}
}else{
var focusableElements=Array.from(document.querySelectorAll(
".user.navItem"
));
var currentIndex=focusableElements.indexOf(document.activeElement);
if(currentIndex>0){
focusableElements[currentIndex-1].focus();
}else if(focusableElements.length>0){
focusableElements[focusableElements.length-1].focus();
}
}
return;
}
if(e.key==="Enter"){
var activeEl=document.activeElement;
if(isOnlineViewActive&&activeEl&&activeEl.classList.contains("online-user-item")){
var userUid=activeEl.dataset.uid;
var nameSpan=activeEl.querySelector(".online-user-name");
var username=nameSpan ? nameSpan.textContent : "User";
if(typeof startChatWithUser==='function'){
startChatWithUser(userUid,username);
}
}
}
}
if(e.key==="SoftLeft"){
if(chatPage.classList.contains("active")){
e.preventDefault();
if(selectModeActive){
exitSelectMode();
return;
}
if(chatPage._voiceMode){
if(chatPage._voiceDelete)chatPage._voiceDelete();
return;
}
if(!isBlockedByUser){
if(typeof window.showAndBottomSheet==="function"){
window.showAndBottomSheet([
{icon:"😊",label:"Emoji",sublabel:"Pick an emoji",action:function(){emojiPickerOpen=true;setTimeout(function(){openEmojiPicker();},30);}},
{icon:"📷",label:"Photo",sublabel:"Send an image",action:function(){sendImageDirect();}},
{icon:"🎬",label:"Video",sublabel:"Send a video clip",action:function(){sendVideoDirect();}},
{icon:"🎵",label:"Music",sublabel:"Send an audio file",action:function(){sendMusicFile();}},
{icon:"🎤",label:"Voice",sublabel:"Record a voice note",action:function(){startRecording();}}
]);
}else{
var menuItems=["Emoji","Photo","Video","Music","Voice"];
showDropdown(menuItems,function(index){
if(index===0){emojiPickerOpen=true;hideDropdown();setTimeout(function(){openEmojiPicker();},30);}
else if(index===1){hideDropdown();sendImageDirect();}
else if(index===2){hideDropdown();sendVideoDirect();}
else if(index===3){hideDropdown();sendMusicFile();}
else if(index===4){hideDropdown();startRecording();}
});
}
}
return;
}
}
if(e.key==="Enter"){
if(isRecording&&chatPage.classList.contains("active")){
e.preventDefault();
stopRecording();
return;
}
if(chatPage._voiceMode&&chatPage.classList.contains("active")){
e.preventDefault();
if(chatPage._voiceSend)chatPage._voiceSend();
return;
}
if(activeElement&&activeElement.classList&&(
activeElement.classList.contains("voice-toggle-button")||
activeElement.classList.contains("voice-message-card")
)){
e.preventDefault();
activeElement.click();
return;
}
if(activeElement&&(
activeElement.id==="messageInput"||
activeElement.id==="sendVoiceButton"||
activeElement.id==="playVoiceButton"||
activeElement.id==="deleteVoiceButton"||
activeElement.id==="stopRecordingButton"
)){
return;
}
if(activeElement&&activeElement.className==="emoji"){
var messageContainer=activeElement.parentElement.parentElement;
var messageId=messageContainer.querySelector(".message").id.replace("msg-","");
addReaction(messageId,activeElement.textContent);
hideEmojiContainer();
hideActionContainer();
messageContainer.querySelector(".message").focus();
}else if(activeElement&&activeElement.className.indexOf("action-button")!==-1){
var messageContainer=activeElement.parentElement.parentElement;
var messageId=activeElement.id.replace("msg-","");
var messagesList=Array.from(document.querySelectorAll(".message-container"));
var currentIndex=messagesList.indexOf(messageContainer);
var nextMessage=(currentIndex<messagesList.length-1)? messagesList[currentIndex+1].querySelector(".message"): null;
var prevMessage=(currentIndex>0)? messagesList[currentIndex-1].querySelector(".message"): null;
if(activeElement.textContent==="Delete for Me"){
deleteMessageForMe(messageId);
messageContainer.remove();
hideEmojiContainer();
hideActionContainer();
if(nextMessage)nextMessage.focus();
else if(prevMessage)prevMessage.focus();
else document.getElementById("messageInput").focus();
}else if(activeElement.textContent==="Delete for Everyone"){
deleteMessageForEveryone(messageId);
hideEmojiContainer();
hideActionContainer();
if(nextMessage)nextMessage.focus();
else if(prevMessage)prevMessage.focus();
else document.getElementById("messageInput").focus();
}else if(activeElement.textContent==="Fullscreen"){
var media=messageContainer.querySelector("img");
if(media)toggleFullScreen(media);
hideEmojiContainer();
hideActionContainer();
}else if(activeElement.textContent==="Play"){
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).once("value",function(snap){
var data=snap.val();
if(data.mediaType==="voice"){
var voiceSpan=messageContainer.querySelector(".voice-meta-row .voice-duration")||messageContainer.querySelector(".voice-duration");
downloadAndPlayVoice(data.mediaUrl,messageId,voiceSpan);
}
});
hideEmojiContainer();
hideActionContainer();
}else if(activeElement.textContent==="Reply"){
replyingToMessageId=messageId;
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).once("value",function(snap){
var data=snap.val();
replyInputPreview.classList.add("visible");
if(data.mediaType==="image"&&data.mediaUrl){
replyInputPreview.innerHTML='<img src="'+data.mediaUrl+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;margin-right:6px;flex-shrink:0;" onerror="this.style.display=\'none\'">'
+'<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📷 Image</span>'
+'<span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;font-size:14px;">✕</span>';
}else if(data.mediaType==="voice"){
replyInputPreview.innerHTML='<span style="font-size:20px;margin-right:6px;">🎤</span>'
+'<span style="flex:1;">Voice message</span>'
+'<span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;font-size:14px;">✕</span>';
}else if(data.mediaType==="video"){
replyInputPreview.innerHTML='<span style="font-size:20px;margin-right:6px;">🎬</span>'
+'<span style="flex:1;">Video</span>'
+'<span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;font-size:14px;">✕</span>';
}else{
replyInputPreview.innerHTML='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">↩ '+(data.message ? data.message.substring(0,30)+(data.message.length>30 ? "..." : ""): "Message")+'</span>'
+'<span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;font-size:14px;">✕</span>';
}
messageInput.focus();
});
hideEmojiContainer();
hideActionContainer();
}
}else if(activeElement&&activeElement.className.indexOf("message")!==-1){
var messageContainer=activeElement.parentElement;
var messageId=activeElement.id.replace("msg-","");
if(selectModeActive){
e.preventDefault();
toggleMessageSelected(messageId,activeElement);
return;
}
var replyPreviewEl=activeElement.querySelector(".reply-preview");
if(replyPreviewEl){
e.preventDefault();
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+messageId).once("value",function(snap){
var d=snap.val();
if(d&&d.replyTo){
var targetEl=document.getElementById("msg-"+d.replyTo);
if(targetEl){
targetEl.scrollIntoView({behavior: "smooth",block: "center"});
targetEl.style.transition="background 0.3s";
var origBg=targetEl.style.background;
targetEl.style.background="#90E0EF";
setTimeout(function(){targetEl.style.background=origBg||"";},1200);
targetEl.focus();
}
}
});
return;
}
if(messageContainer.querySelector(".voice-message-card")){
e.preventDefault();
var voiceBtn=messageContainer.querySelector(".voice-toggle-button")||messageContainer.querySelector(".voice-message-card");
if(voiceBtn)voiceBtn.click();
}else if(messageContainer.querySelector("img")&&!messageContainer.querySelector(".reply-preview img")){
var img=messageContainer.querySelector("img:not(.status-reply-img)");
if(img)toggleFullScreen(img);
}else{
showEmojiContainer(messageContainer);
}
}else if(activeElement&&activeElement.id==="searchButton"){
performSearch();
}
}
if(e.key==="ArrowDown"){
if(chatPage.classList.contains("active")){
var handledDown=focusAdjacentMessage(1);
if(!handledDown){
var messagesList=Array.from(document.querySelectorAll(".message"));
var idx=messagesList.indexOf(activeElement);
if(idx!==-1){
if(idx<messagesList.length-1){messagesList[idx+1].focus();}
else{messageInput.focus();}
}else{navigate(1);}
}
if(chatPage._updateChatSoftkeys)setTimeout(chatPage._updateChatSoftkeys,10);
}else{
if(!navigateChatList(1))navigate(1);
}
}
if(e.key==="ArrowUp"){
if(isRecording||chatPage._voiceMode)return;
if(chatPage.classList.contains("active")){
var handledUp=focusAdjacentMessage(-1);
if(!handledUp){
var messagesList=Array.from(document.querySelectorAll(".message"));
var idx=messagesList.indexOf(activeElement);
if(idx>0){messagesList[idx-1].focus();}
else if(idx===-1){
if(messagesList.length>0)messagesList[messagesList.length-1].focus();
}else{navigate(-1);}
}
if(chatPage._updateChatSoftkeys)setTimeout(chatPage._updateChatSoftkeys,10);
}else{
if(!navigateChatList(-1))navigate(-1);
}
}
if(e.key==="SoftRight"||e.key==="Backspace"||e.key==="Escape"){
if(e.key==="Backspace"&&document.activeElement&&
(document.activeElement.tagName==="INPUT"||document.activeElement.tagName==="TEXTAREA")&&
document.activeElement.value.length>0){
return;
}
if(chatPage.classList.contains("active")){
e.preventDefault();
if(isDropdownVisible){hideDropdown();return;}
if(selectModeActive){
bulkDeleteSelected();
return;
}
if(chatPage._voiceMode&&e.key==="SoftRight"){
if(chatPage._voicePlay)chatPage._voicePlay();
return;
}
var ae=document.activeElement;
var aeForMenu=ae;
if(ae&&ae.tagName==="IMG"&&ae.closest(".message-container")){
aeForMenu=ae.closest(".message-container").querySelector(".message");
}else if(ae&&ae.closest&&ae.closest(".message-container")&&ae.closest(".message-container").querySelector(".voice-duration")){
aeForMenu=ae.closest(".message-container").querySelector(".message");
}
if(e.key==="SoftRight"&&ae===messageInput){
pasteIntoInput(messageInput);
return;
}
if(e.key==="SoftRight"&&aeForMenu&&aeForMenu.className.indexOf("message")!==-1){
var msgContainer=aeForMenu.parentElement;
var msgId=aeForMenu.id.replace("msg-","");
var opts2=[];
if(replyingToMessageId)opts2.push("Cancel Reply");
opts2.push("Reply");
if(aeForMenu.querySelector(".message-text"))opts2.push("Copy");
opts2.push("Select Messages");
opts2.push("Info");
opts2.push("Delete for Me");
opts2.push(isChatMuted(currentChatUid)? "Unmute" : "Mute");
var isSentMsg=!!msgContainer.querySelector(".sent");
if(isSentMsg){
opts2.push("Delete for Everyone");
opts2.push("Edit");
}
if(msgContainer.querySelector("img:not(.status-reply-img)")){opts2.push("Fullscreen");}
else if(msgContainer.querySelector(".voice-duration")){opts2.push("Play");}
opts2.push("React");
showDropdown(opts2,function(index){
var ml=Array.from(document.querySelectorAll(".message-container"));
var ci2=ml.indexOf(msgContainer);
var nx=(ci2<ml.length-1)? ml[ci2+1].querySelector(".message"): null;
var pv=(ci2>0)? ml[ci2-1].querySelector(".message"): null;
if(opts2[index]==="Reply"){
hideDropdown();replyingToMessageId=msgId;
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+msgId).once("value",function(snap){
var d2=snap.val();
replyInputPreview.classList.add("visible");
if(d2.mediaType==="image"&&d2.mediaUrl)replyInputPreview.innerHTML='<img src="'+d2.mediaUrl+'" style="width:36px;height:36px;object-fit:cover;border-radius:4px;margin-right:6px;flex-shrink:0;"><span style="flex:1;">Photo</span><span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;">✕</span>';
else if(d2.mediaType==="voice")replyInputPreview.innerHTML='<span style="font-size:20px;margin-right:6px;">🎤</span><span style="flex:1;">Voice</span><span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;">✕</span>';
else if(d2.mediaType==="video")replyInputPreview.innerHTML='<span style="font-size:20px;margin-right:6px;">🎬</span><span style="flex:1;">Video</span><span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;">✕</span>';
else replyInputPreview.innerHTML='<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">↩ '+(d2.message ? d2.message.substring(0,30): "Message")+'</span><span onclick="cancelReplyPreview();" style="cursor:pointer;padding:2px 6px;">✕</span>';
messageInput.focus();
});
}else if(opts2[index]==="Info"){
hideDropdown();
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+msgId).once("value",function(snap){
var d2=snap.val();
var info2="Message: "+(d2.message||(d2.mediaType==="image" ? "Image" : d2.mediaType==="voice" ? "Voice" : "Media"));
info2+="\nSent: "+formatSendTime(d2.timestamp);
if(d2.deliveredTimestamp)info2+="\nDelivered: "+formatSeenTime(d2.deliveredTimestamp);
else if(d2.status==="delivered")info2+="\nDelivered: Just now";
else info2+="\nDelivered: Not yet";
if(d2.seen&&d2.seenTimestamp)info2+="\nSeen: "+formatSeenTime(d2.seenTimestamp);
else info2+="\nSeen: Not seen yet";
showCustomAlert(info2,function(){
if(nx)nx.focus();else if(pv)pv.focus();else messageInput.focus();
});
});
}else if(opts2[index]==="Edit"){
hideDropdown();
db.ref("conversations/"+uid+"/"+currentChatUid+"/"+msgId).once("value",function(snap){
var d2=snap.val();
if(!d2||d2.mediaType||d2.deleted){
showNotification("Only text messages can be edited.");
if(nx)nx.focus();else if(pv)pv.focus();else messageInput.focus();
return;
}
var age=Date.now()-(d2.timestamp||0);
if(age>5*60*1000){
showNotification("Messages can only be edited within 5 minutes.");
if(nx)nx.focus();else if(pv)pv.focus();else messageInput.focus();
return;
}
messageInput.value=d2.message||"";
messageInput.style.height='auto';
messageInput.style.height=Math.min(messageInput.scrollHeight,80)+'px';
replyInputPreview.classList.add("visible");
replyInputPreview;
replyInputPreview.innerHTML='<span style="font-size:18px;margin-right:6px;">✏️</span>'
+'<span style="flex:1;color:#0077B6;font-weight:600;">Editing message</span>'
+'<span onclick="cancelEditMode();" style="cursor:pointer;padding:2px 6px;font-size:14px;">✕</span>';
messageInput._editingMsgId=msgId;
softkeyCenter.innerHTML="Save";
messageInput.focus();
var len=messageInput.value.length;
try{messageInput.setSelectionRange(len,len);}catch(ex){}
});
}else if(opts2[index]==="Delete for Me"){deleteMessageForMe(msgId);msgContainer.remove();if(nx)nx.focus();else if(pv)pv.focus();else messageInput.focus();}
else if(opts2[index]==="Copy"){
hideDropdown();
var textEl=aeForMenu.querySelector(".message-text");
copyTextToClipboard(textEl?textEl.textContent:"");
aeForMenu.focus();
}
else if(opts2[index]==="Select Messages"){
hideDropdown();
enterSelectMode(msgId,aeForMenu);
}
else if(opts2[index]==="Mute"||opts2[index]==="Unmute"){
var nowMuted=!isChatMuted(currentChatUid);
setChatMuted(currentChatUid,currentChatUsername||"User",nowMuted);
showNotification((currentChatUsername||"User")+(nowMuted ? " is muted" : " is unmuted"));
hideDropdown();
}
else if(opts2[index]==="Delete for Everyone"){deleteMessageForEveryone(msgId);if(nx)nx.focus();else if(pv)pv.focus();else messageInput.focus();}
else if(opts2[index]==="Fullscreen"){var im2=msgContainer.querySelector("img:not(.status-reply-img)");if(im2)toggleFullScreen(im2);}
else if(opts2[index]==="Play"){db.ref("conversations/"+uid+"/"+currentChatUid+"/"+msgId).once("value",function(snap){var d2=snap.val();if(d2.mediaType==="voice")downloadAndPlayVoice(d2.mediaUrl,msgId,msgContainer.querySelector(".voice-meta-row .voice-duration")||msgContainer.querySelector(".voice-duration"));});}
else if(opts2[index]==="Cancel Reply"){
hideDropdown();
replyingToMessageId=null;
replyInputPreview.classList.remove("visible");
replyInputPreview.style.display="";
replyInputPreview.innerHTML="";
messageInput.focus();
}
else if(opts2[index]==="React"){
hideDropdown();
showEmojiContainer(msgContainer);
}
});
}else{
var closingChatUid=currentChatUid;
if(closingChatUid){
var closingRow=window._getChatEl(closingChatUid);
if(closingRow)markMessagesAsSeen(closingChatUid,closingRow);
}
if(activeChatPresenceRef){try{activeChatPresenceRef.off();}catch(e){}activeChatPresenceRef=null;}
var hStatusReset=document.getElementById("chatHeaderStatus");
if(hStatusReset)hStatusReset.textContent="Loading...";
currentChatUid=null;
currentOpenChatUid=null;
var chatHeaderBack=document.getElementById("chatHeader");
if(chatHeaderBack){chatHeaderBack.style.display="none";chatHeaderBack.classList.remove("active");}
chatPage.classList.remove("active");
mainPage.classList.add("active");
db.ref("presence1/"+uid).update({currentChat: null});
restoreTabBar();
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online";
focusPrivateChatsLanding();
if(typeof window.androidRestoreMainLayout==="function")window.androidRestoreMainLayout();
}
return;
}
}
if(e.key==="5"){
pressCount++;
if(pressCount===1){
var lastMessage=messages[messages.length-1];
if(lastMessage)lastMessage.element.querySelector(".message").focus();
}else if(pressCount===2){
messageInput.focus();
pressCount=0;
}
}
if(e.key==="8"){
if(chatBox)chatBox.scrollTop+=50;
}
if(e.key==="2"){
if(chatBox)chatBox.scrollTop-=50;
}
});
function canSendMessageTo(partnerUid){
return new Promise(function(resolve){
if(!partnerUid){resolve(true);return;}
if(window._spamAllowedCache&&window._spamAllowedCache[partnerUid]===true){resolve(true);return;}
if(window._spamAllowedCache&&window._spamAllowedCache[partnerUid]===false){resolve(false);return;}
var settled=false;
var timeoutId=setTimeout(function(){
if(settled)return;
settled=true;
resolve(true);
},2000);
function done(ok){
if(settled)return;
settled=true;clearTimeout(timeoutId);
window._spamAllowedCache=window._spamAllowedCache||{};
window._spamAllowedCache[partnerUid]=!!ok;
resolve(!!ok);
}
db.ref("privateChats/"+partnerUid+"/"+uid).once("value",function(theirListSnap){
if(settled)return;
var theyHaveMe=!!(theirListSnap&&theirListSnap.exists());
db.ref("privateChats/"+uid+"/"+partnerUid).once("value",function(myListSnap){
if(settled)return;
var iHaveThem=!!(myListSnap&&myListSnap.exists());
if(theyHaveMe&&iHaveThem){done(true);return;}
if(theyHaveMe){done(true);return;}
db.ref("profiles/"+partnerUid+"/spamProtection").once("value",function(snap){
if(settled)return;
var partnerSpamProtection=snap.val()||false;
if(!partnerSpamProtection){done(true);return;}
done(false);
},function(){done(true);});
},function(){done(true);});
},function(){done(true);});
});
}
function updateAllUnreadCounts(){
var userElements=document.querySelectorAll(".user.navItem");
userElements.forEach(function(userElement){
var partnerUid=userElement.dataset.uid;
updateUserStatus(partnerUid,userElement);
});
}
function updateUserStatus(partnerUid,userElement){
db.ref("privateChats/"+uid+"/"+partnerUid).once("value",function(privateSnap){
var privateEntry=privateSnap.val()||{};
db.ref("presence1/"+partnerUid).once("value",function(snap){
var presence=snap.val()||{};
var isOnline=typeof privateEntry.online==="boolean" ? privateEntry.online : !!presence.online;
var unreadCount=typeof privateEntry.unreadCount==="number" ? privateEntry.unreadCount : 0;
if(privateSnap.exists()){
applyChatRowState(userElement,partnerUid,unreadCount,isOnline);
return;
}
var chatRef=db.ref("conversations/"+uid+"/"+partnerUid);
chatRef.once("value",function(chatSnapshot){
var legacyUnreadCount=0;
chatSnapshot.forEach(function(msgSnapshot){
var data=msgSnapshot.val();
if(data.from===partnerUid&&!data.seen){
legacyUnreadCount++;
}
});
applyChatRowState(userElement,partnerUid,legacyUnreadCount,isOnline);
});
});
});
}
function startBackgroundAutoDelete(){
setTimeout(function(){
if(!uid||isAutoDeleteRunning)return;
var today=new Date().toDateString();
var partners=window.allPrivateChats
? window.allPrivateChats.map(function(c){return c.uid;})
:[];
if(partners.length===0){
db.ref("conversations/"+uid).once("value",function(snap){
var keys=[];
snap.forEach(function(c){keys.push(c.key);});
keys.forEach(function(pUid,i){
if(lastAutoDeleteDates[pUid]===today)return;
setTimeout(function(){autoDeleteForChat(pUid);},i*2000);
});
});
return;
}
partners.forEach(function(pUid,i){
if(lastAutoDeleteDates[pUid]===today)return;
setTimeout(function(){autoDeleteForChat(pUid);},i*2000);
});
},10000);
}
function autoDeleteForChat(chatUid){
return new Promise(function(resolve){
if(!uid||!chatUid){
resolve();
return;
}
var today=new Date().toDateString();
if(lastAutoDeleteDates[chatUid]===today){
resolve();
return;
}
isUserBlocked(uid,chatUid).then(function(blocked){
if(blocked){
resolve();
return;
}
var chatRef=db.ref("conversations/"+uid+"/"+chatUid);
var otherRef=db.ref("conversations/"+chatUid+"/"+uid);
chatRef.orderByChild("timestamp").once("value",function(snapshot){
if(!snapshot.exists()){
resolve();
return;
}
var messages=[];
var messageCount=0;
snapshot.forEach(function(childSnapshot){
var msgData=childSnapshot.val();
messages.push({
key: childSnapshot.key,
timestamp: msgData.timestamp||0,
data: msgData
});
messageCount++;
});
if(messageCount<=20){
lastAutoDeleteDates[chatUid]=today;
localStorage.setItem("lastAutoDeleteDates",JSON.stringify(lastAutoDeleteDates));
resolve();
return;
}
messages.sort(function(a,b){
return a.timestamp-b.timestamp;
});
var messagesToDelete=messages.slice(0,messageCount-20);
var messagesToKeep=messages.slice(-20);
if(messagesToDelete.length===0){
resolve();
return;
}
var deletePromises=[];
messagesToDelete.forEach(function(message){
deletePromises.push(chatRef.child(message.key).remove());
deletePromises.push(otherRef.child(message.key).remove());
});
Promise.all(deletePromises).then(function(){
lastAutoDeleteDates[chatUid]=today;
localStorage.setItem("lastAutoDeleteDates",JSON.stringify(lastAutoDeleteDates));
if(currentChatUid===chatUid&&chatPage.classList.contains("active")){
setTimeout(function(){
loadMessagesFromFirebase(chatUid,messages.length>0);
},1500);
}
resolve();
}).catch(function(error){
resolve();
});
});
});
});
}
function triggerAutoDeleteForAllChats(){
if(!uid)return;
var today=new Date().toDateString();
db.ref("conversations/"+uid).once("value",function(snapshot){
var totalChats=snapshot.numChildren();
var processed=0;
snapshot.forEach(function(chatSnapshot){
var partnerUid=chatSnapshot.key;
autoDeleteForChat(partnerUid).then(function(){
processed++;
if(processed===totalChats){
}
});
});
});
}
function addAutoDeleteTestButton(){
if(!document.getElementById("autoDeleteTestBtn")){
var testBtn=document.createElement("button");
testBtn.id="autoDeleteTestBtn";
testBtn.textContent="Test Auto-Delete All Chats";
testBtn.style.position="fixed";
testBtn.style.bottom="10px";
testBtn.style.right="10px";
testBtn.style.zIndex="9999";
testBtn.style.padding="5px";
testBtn.style.fontSize="10px";
testBtn.onclick=triggerAutoDeleteForAllChats;
document.body.appendChild(testBtn);
}
}
function cleanupOldDeleteRecords(){
db.ref("conversations/"+uid).once("value",function(snapshot){
var currentChats=[];
snapshot.forEach(function(chat){
currentChats.push(chat.key);
});
for(var chatUid in lastAutoDeleteDates){
if(!currentChats.includes(chatUid)){
delete lastAutoDeleteDates[chatUid];
}
}
localStorage.setItem("lastAutoDeleteDates",JSON.stringify(lastAutoDeleteDates));
});
}
setInterval(cleanupOldDeleteRecords,30*24*60*60*1000);
var voiceWaveformCache={};
function hashVoiceSeed(input){
var hash=0;
input=String(input||"");
for(var i=0;i<input.length;i++){
hash=((hash<<5)-hash)+input.charCodeAt(i);
hash|=0;
}
return Math.abs(hash);
}
function buildFallbackPeaks(seed,count){
var peaks=[];
var x=seed||1;
for(var i=0;i<count;i++){
x=(x*1664525+1013904223)% 4294967296;
var value=0.18+((x/4294967296)*0.82);
peaks.push(value);
}
return peaks;
}
function normalizeCanvasSize(canvas){
if(!canvas)return{width: 0,height: 0};
var dpr=window.devicePixelRatio||1;
var rect=canvas.getBoundingClientRect();
var width=Math.max(1,Math.floor((rect.width||120)*dpr));
var height=Math.max(1,Math.floor((rect.height||30)*dpr));
if(canvas.width!==width||canvas.height!==height){
canvas.width=width;
canvas.height=height;
}
return{width: width,height: height,dpr: dpr};
}
function drawVoiceWaveform(canvas,peaks,progress,isPlaying){
if(!canvas)return;
var ctx=canvas.getContext("2d");
if(!ctx)return;
var size=normalizeCanvasSize(canvas);
var width=size.width;
var height=size.height;
ctx.clearRect(0,0,width,height);
var played=canvas.dataset.played==="1";
var midY=Math.floor(height/2);
var progressX=Math.floor(Math.max(0,Math.min(1,progress||0))*width);
var lineH=3;
ctx.fillStyle="rgba(156,163,175,0.55)";
ctx.fillRect(0,midY-1,width,lineH);
if(played&&progressX>0){
ctx.fillStyle="#2563EB";
ctx.fillRect(0,midY-1,progressX,lineH);
}
if(progress>0){
ctx.fillStyle=played ? "#2563EB" : "#94A3B8";
ctx.beginPath();
ctx.arc(progressX,midY,5,0,Math.PI*2);
ctx.fill();
}
}
function initVoiceWaveform(canvas,mediaUrl,seedKey){
if(!canvas)return;
canvas.dataset.seed=seedKey||mediaUrl||"voice";
var seed=hashVoiceSeed(canvas.dataset.seed);
drawVoiceWaveform(canvas,buildFallbackPeaks(seed,26),0,false);
if(!mediaUrl||voiceWaveformCache[mediaUrl]){
if(voiceWaveformCache[mediaUrl]){
canvas._peaks=voiceWaveformCache[mediaUrl];
drawVoiceWaveform(canvas,canvas._peaks,0,false);
}
return;
}
var AudioCtx=window.AudioContext||window.webkitAudioContext;
if(!AudioCtx||!window.fetch)return;
var ctx=new AudioCtx();
fetch(mediaUrl).then(function(res){return res.arrayBuffer();}).then(function(buf){
return ctx.decodeAudioData(buf);
}).then(function(audioBuffer){
var peaks=[];
var channelData=audioBuffer.getChannelData(0);
var samplesPerBar=Math.max(1,Math.floor(channelData.length/26));
for(var i=0;i<26;i++){
var start=i*samplesPerBar;
var end=Math.min(channelData.length,start+samplesPerBar);
var sum=0;
for(var j=start;j<end;j++){
sum+=Math.abs(channelData[j]);
}
var avg=sum/Math.max(1,end-start);
peaks.push(Math.max(0.18,Math.min(1,avg*2.8)));
}
voiceWaveformCache[mediaUrl]=peaks;
canvas._peaks=peaks;
drawVoiceWaveform(canvas,peaks,0,false);
}).catch(function(){
canvas._peaks=buildFallbackPeaks(seed,26);
drawVoiceWaveform(canvas,canvas._peaks,0,false);
});
}
function downloadAndPlayVoice(mediaUrl,messageId,voiceSpan,isUploadedAudio){
var messageElement=document.getElementById("msg-"+messageId);
if(!messageElement)return;
var playButton=messageElement.querySelector(".voice-toggle-button");
var durationEl=messageElement.querySelector(".voice-duration")||voiceSpan;
var originalDuration=durationEl?durationEl.textContent:"";
var SVG_PLAY="\u25B6\uFE0F";
var SVG_PAUSE="\u23F8\uFE0F";
function findSeekEls(){
var card=messageElement.querySelector(".voice-message-card");
if(!card)return null;
var allDivs=card.querySelectorAll("div");
for(var i=0;i<allDivs.length;i++){
var d=allDivs[i];
if(d.children.length===2){
var f=d.children[0];var t=d.children[1];
if(f&&t&&f.style&&t.style&&t.style.borderRadius==="50%"){
return{fill:f,thumb:t};
}
}
}
return null;
}
function updateSeekPct(pct){
var se=findSeekEls();if(!se)return;
var p=Math.max(0,Math.min(100,pct));
se.fill.style.width=p+"%";se.thumb.style.left=p+"%";
}
function setUiPlaying(on){if(playButton){playButton.innerHTML=on?SVG_PAUSE:SVG_PLAY;playButton.classList.toggle("playing",!!on);}}
// Toggle same audio
if(window.currentAudio&&window.currentAudio._voiceMsgId===messageId){
if(window.isAudioPlaying){
window.currentAudio.pause();window.isAudioPlaying=false;setUiPlaying(false);
}else{
window.currentAudio.play().then(function(){window.isAudioPlaying=true;setUiPlaying(true);}).catch(function(){showNotification("Failed to play audio.");});
}
return;
}
// Stop previous
if(window.currentAudio){
window.currentAudio.pause();
var prevId=window.currentAudio._voiceMsgId;
if(prevId){
var prevEl=document.getElementById("msg-"+prevId);
if(prevEl){
var pb=prevEl.querySelector(".voice-toggle-button");if(pb){pb.innerHTML=SVG_PLAY;pb.classList.remove("playing");}
var pc=prevEl.querySelector(".voice-message-card");
if(pc){var pd=pc.querySelectorAll("div");
for(var j=0;j<pd.length;j++){var d3=pd[j];
if(d3.children.length===2&&d3.children[1]&&d3.children[1].style&&d3.children[1].style.borderRadius==="50%"){
d3.children[0].style.width="0%";d3.children[1].style.left="0%";break;}}}
var pDur=prevEl.querySelector(".voice-duration");
if(pDur&&pDur.dataset.originalText)pDur.textContent=pDur.dataset.originalText;
}
}
window.currentAudio=null;window.isAudioPlaying=false;
}
if(durationEl){durationEl.dataset.originalText=originalDuration;durationEl.textContent="\u2026";}
setUiPlaying(false);
var audio=new Audio(mediaUrl);
audio._voiceMsgId=messageId;audio._messageId=messageId;
audio.onerror=function(){
if(durationEl)durationEl.textContent=durationEl.dataset.originalText||originalDuration;
setUiPlaying(false);showNotification("Failed to load audio.");};
audio.onloadedmetadata=function(){
var dur=Math.floor(audio.duration)||0;window.audioDuration=dur;
if(durationEl){durationEl.dataset.originalText=formatTime(dur);durationEl.textContent=formatTime(dur);}};
audio.ontimeupdate=function(){
var cur=audio.currentTime||0;var tot=audio.duration||window.audioDuration||1;
if(durationEl)durationEl.textContent=formatTime(Math.floor(cur));
updateSeekPct((cur/Math.max(1,tot))*100);};
audio.onended=function(){
window.isAudioPlaying=false;setUiPlaying(false);
if(durationEl)durationEl.textContent=durationEl.dataset.originalText||originalDuration;
updateSeekPct(0);window.currentAudio=null;};
audio.oncanplaythrough=function(){
window.currentAudio=audio;
audio.play().then(function(){
window.isAudioPlaying=true;setUiPlaying(true);
if(playButton)playButton.focus();
if(messageElement.dataset.from!==uid)markVoicePlayed(messageId,mediaUrl);
}).catch(function(){window.isAudioPlaying=false;setUiPlaying(false);showNotification("Failed to play audio.");});};
audio.load();
}

function areNotificationsEnabled(){
return localStorage.getItem("notificationsEnabled")!=="false";
}
function toggleGlobalNotifications(){
var enabled=areNotificationsEnabled();
localStorage.setItem("notificationsEnabled",enabled?"false":"true");
showNotification(enabled?"Notifications turned off":"Notifications turned on");
}
function getMutedGroups(){
try{return JSON.parse(localStorage.getItem("mutedGroups")||"{}");}catch(e){return{};}
}
function isGroupMuted(groupId){
var m=getMutedGroups();
return!!(m[groupId]&&m[groupId].muted);
}
function toggleGroupMute(groupId,groupName){
var m=getMutedGroups();
if(m[groupId]&&m[groupId].muted){delete m[groupId];}
else{m[groupId]={muted:true,name:groupName||"Group"};}
localStorage.setItem("mutedGroups",JSON.stringify(m));
return!!(m[groupId]&&m[groupId].muted);
}

var _toastPrevSoftkeys=null;
var _toastAutoHideTimer=null;
var _activeToastTarget=null;
function hideIncomingToast(restoreSoftkeys){
var toastEl=document.getElementById("incomingMsgToast");
if(toastEl)toastEl.classList.remove("active");
_activeToastTarget=null;
clearTimeout(_toastAutoHideTimer);
if(restoreSoftkeys!==false&&_toastPrevSoftkeys){
softkeyLeft.innerHTML=_toastPrevSoftkeys.l;
softkeyCenter.innerHTML=_toastPrevSoftkeys.c;
softkeyRight.innerHTML=_toastPrevSoftkeys.r;
_toastPrevSoftkeys=null;
}
}
function openIncomingToastTarget(){
var target=_activeToastTarget;
hideIncomingToast(true);
if(!target)return;
if(target.chatUid){
if(typeof openChat==="function")openChat(target.chatUid);
}else if(target.groupId){
try{localStorage.setItem("openGroupOnLoad",target.groupId);}catch(e){}
window.location.href="groups.html";
}
}
function showSimpleNotification(name,text,pic,chatUid,groupId){
if(!areNotificationsEnabled())return;
if(window.notificationSound&&(typeof notificationSoundEnabled==="undefined"||notificationSoundEnabled)){
try{
window.notificationSound.currentTime=0;
window.notificationSound.play().catch(function(){});
}catch(e){}
}
var toastEl=document.getElementById("incomingMsgToast");
if(!toastEl)return;
var nameEl=toastEl.querySelector(".toast-name");
var msgEl=toastEl.querySelector(".toast-msg");
var picEl=document.getElementById("toastPic");
if(nameEl)nameEl.textContent=name||"New message";
if(msgEl)msgEl.textContent=(text&&text.length>45)?text.substring(0,45)+"...":(text||"");
if(picEl)picEl.src=pic||"icons/default.png";
_activeToastTarget={chatUid:chatUid||null,groupId:groupId||null};
if(!_toastPrevSoftkeys){
_toastPrevSoftkeys={l:softkeyLeft.innerHTML,c:softkeyCenter.innerHTML,r:softkeyRight.innerHTML};
}
softkeyLeft.innerHTML="Dismiss";
softkeyCenter.innerHTML="Open";
softkeyRight.innerHTML="";
toastEl.classList.add("active");
toastEl.onclick=function(){openIncomingToastTarget();};
clearTimeout(_toastAutoHideTimer);
_toastAutoHideTimer=setTimeout(function(){hideIncomingToast(true);},4500);
try{toastEl.focus();}catch(e){}
}

var groupNotificationListenerActive=false;
var _lastKnownGroupUnread={};
function setupGroupNotifications(){
if(!uid)return;
if(groupNotificationListenerActive)return;
groupNotificationListenerActive=true;
var userGroupsRef=db.ref("userGroups/"+uid);
userGroupsRef.on("child_added",function(snap){
var g=snap.val()||{};
_lastKnownGroupUnread[snap.key]=g.unreadCount||0;
});
userGroupsRef.on("child_changed",function(snap){
var groupId=snap.key;
var g=snap.val()||{};
var prevUnread=_lastKnownGroupUnread[groupId]||0;
var newUnread=g.unreadCount||0;
_lastKnownGroupUnread[groupId]=newUnread;
if(newUnread<=prevUnread)return;
if(!g.lastMessageTime||g.lastMessageTime<(Date.now()-8000))return;
if(isGroupMuted(groupId))return;
showSimpleNotification(g.name||"Group",g.lastMessage||"New message",g.icon||"icons/default_grp.png",null,groupId);
});
}
function setupFinalNotifications(){
// Private-chat notifications are now handled by the always-on
// privateChats listener in renderPrivateChatEntry() (see
// window._chatLastKnownUnread) — a single lightweight, persistent
// listener instead of this function's old approach of opening a live
// per-message listener on every conversation's full message list. This
// is kept only for group notifications, which don't have an equivalent
// lightweight summary node to piggyback on.
if(!uid)return;
if(typeof setupGroupNotifications==="function")setupGroupNotifications();
}
function showVideoVolumeIndicator(volume){
var videoPlayer=document.getElementById("videoFullscreenPlayer");
if(!videoPlayer)return;
var oldIndicator=document.getElementById("videoVolumeIndicator");
if(oldIndicator)oldIndicator.remove();
var indicator=document.createElement("div");
indicator.id="videoVolumeIndicator";
indicator.style.cssText=`
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%,-50%);
background: rgba(0,0,0,0.7);
color: white;
padding: 10px 20px;
border-radius: 20px;
font-size: 16px;
z-index: 10000;
pointer-events: none;
transition: opacity 0.5s;
`;
var volumePercent=Math.round(volume*100);
indicator.textContent="Volume: "+volumePercent+"%";
videoPlayer.appendChild(indicator);
setTimeout(function(){
if(indicator.parentNode){
indicator.style.opacity="0";
setTimeout(function(){
if(indicator.parentNode)indicator.remove();
},500);
}
},1000);
}
var EMOJI_DATA={
recent:[],
smileys:['😀','😁','😂','🤣','😃','😄','😅','😆','😇','😈','👿','😉','😊','😋','😌','😍','🥰','😎','😏','😐','😑','😒','😓','😔','😕','😖','😗','😘','😙','😚','😛','😜','😝','😞','😟','😠','😡','😢','😣','😤','😥','😦','😧','😨','😩','😪','😫','😬','😭','😮','😯','😰','😱','😲','😳','😴','😵','😶','😷','🤐','🤑','🤒','🤓','🤔','🤕','🤗','🤩','🤪','🤫','🤬','🤭','🤮','🤯','🥱','🥲','🥳','🥴','🥵','🥶','🥸','🥹','🥺','🫠','🫡','🫢','🫣','🫤','🫥','🤨','😶‍🌫️','😵‍💫','🫨','😮‍💨','🙂','🙃','🤤','😺','😸','😹','😻','😼','😽','🙀','😿','😾','👋','🤚','🖐','✋','🖖','👌','🤌','🤏','✌','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝','👍','👎','✊','👊','🤛','🤜','👏','🙌','🫶','👐','🤲','🙏','✍','💪','🦾','🦿','🦵','🦶','👂','🦻','👃','🫀','🫁','🧠','🦷','🦴','👀','👁','👅','👄','🫦','💋','💘','💝','💖','💗','💓','💞','💕','💟','❣','💔','❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💯','💢','💥','💫','💦','💨','🕳','💬','💭','💤','🗣','👤','👥','👣','👶','🧒','👧','👦','🧑','👩','👨','🧓','👵','👴','🧕','🧔','💁','🙆','🙅','🤦','🤷','🙋','🙎','🙍','💆','💇','🧖','🧗','🧘','🕴','🚶','🏃','💃','🕺','🧑‍🤝‍🧑','👫','👬','👭','💏','💑','👪','🤰','🤱','🧑‍🍼','🧏','🤙','🫰','🫳','🫴','🫲','🫱','🫸','🫷','🤜','🤛','🤝','🧑‍🎤','🧑‍🎨','🧑‍🚀','🧑‍🏫','🧑‍💻'],
nature:['🐶','🐱','🐭','🐹','🐰','🦊','🦝','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🦆','🦅','🦉','🦇','🐺','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦀','🦞','🦈','🐟','🐠','🐡','🐬','🐳','🐋','🦭','🐊','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🦣','🦫','🦥','🦦','🦨','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦜','🕊','🐇','🦔','🐿','🦡','🦘','🌵','🌲','🌳','🌴','🎋','🎍','🌱','🌿','☘','🍀','🍃','🍂','🍁','🍄','🌾','💐','🌷','🌹','🥀','🌺','🌸','🌼','🌻','🌞','🌝','🌛','🌜','🌚','🌕','🌖','🌗','🌘','🌑','🌒','🌓','🌔','🌙','🌟','⭐','🌠','🌌','☀','🌤','⛅','🌥','☁','🌦','🌧','⛈','🌩','🌨','❄','☃','⛄','🌬','💨','💧','💦','☔','⛱','🌊','🌈','⚡','🔥','🌍','🌎','🌏','🌐','🗺','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🌳','🌲','🌴','🍀','☘','🌿','🍁','🍄'],
food:['🍎','🍏','🍊','🍋','🍌','🍍','🥭','🍇','🍓','🫐','🍈','🍒','🍑','🥝','🍅','🫒','🥥','🥑','🍆','🥕','🌽','🌶','🫑','🥦','🥬','🧄','🧅','🥜','🌰','🍞','🥐','🥖','🫓','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🍖','🍗','🥩','🥓','🌭','🍔','🍟','🍕','🌮','🌯','🫔','🥙','🧆','🥗','🥘','🫕','🍲','🫙','🍱','🍘','🍙','🍚','🍛','🍜','🍝','🍠','🍢','🍣','🍤','🍥','🥮','🍡','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🧃','🥤','🧋','🍵','☕','🫖','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽','🥢','🧂'],
activity:['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🏓','🏸','🏒','🥅','🎿','🛷','🥌','⛸','🥊','🥋','🎽','🛹','🛼','🛷','🥇','🥈','🥉','🏅','🎖','🏆','🎗','🎫','🎟','🎪','🤹','🎭','🎨','🖼','🎬','🎤','🎧','🎼','🎵','🎶','🎷','🪗','🎸','🎹','🥁','🪘','🎺','🎻','🪕','🎲','🎯','🎳','🎮','🕹','🎰','🧩','🪄','🪅','🧸','🎴','🀄','🎭','🎪','🤸','🏋','🤼','🤺','🏊','🚵','🏇','🧗','🏄','🤽','🚣','🧘','🏌','🏇','🧜','🛀','🛌','🧑‍🎤','🧑‍🎨','🧑‍✈️','🧑‍🚀','🧑‍🏫'],
travel:['🚗','🚕','🚙','🚌','🚎','🏎','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍','🛵','🚲','🛴','🛹','🛼','🚏','🛣','🛤','🚨','🚔','🚍','🚘','🚖','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚂','🚆','🚇','🚊','🚉','✈','🛩','🛫','🛬','🪂','💺','🛰','🚀','🛸','🚁','🛶','⛵','🚤','🛥','🛳','⛴','🚢','⚓','🗺','🧭','🌍','🌎','🌏','🏔','⛰','🌋','🗻','🏕','🏖','🏜','🏝','🏞','🏟','🏛','🏗','🧱','🏠','🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫','🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕','🕍','⛩','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙','🌃','🌌','🌉','🌁'],
objects:['📱','💻','🖥','🖨','⌨','🖱','🖲','💾','💿','📀','📼','📷','📸','📹','🎥','📽','🎞','📞','☎','📟','📠','📺','📻','🎙','🎚','🎛','🧭','⏱','⏲','⏰','🕰','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯','🪔','🧯','🛢','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖','🧰','🔧','🔩','🪛','🔨','⚒','🛠','⛏','🔱','⚙','🗜','🪤','🧲','🔫','💣','🧨','🪓','🛡','⚔','🗡','🏹','🪃','🪚','🔬','🔭','📦','📫','📪','📬','📭','📮','🗳','✏','✒','🖋','🖊','📝','📁','📂','🗂','📅','📆','🗒','🗓','📇','📈','📉','📊','📋','📌','📍','✂','📎','🖇','📏','📐','🗃','🗄','🗑','🔒','🔓','🔏','🔐','🔑','🗝','🚪','🛋','🪑','🚽','🚿','🛁','🪠','🧴','🧷','🧹','🧺','🧻','🧼','🪣','🧽','🪞','🪟','🛏','🛒','🎁','🎈','🎏','🎀','🎊','🎉','🎎','🏮','🎐'],
symbols:['❤','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤‍🔥','❤‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','☮','✝','☪','🕉','☸','✡','🔯','🕎','☯','☦','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⁉','‼','🔅','🔆','📶','🛜','📳','📴','📵','📞','📣','📢','🔔','🔕','🎵','🎶','⚠','🚸','🚫','🚳','🚭','🚯','🚱','🚷','📵','🔞','☢','☣','✅','☑','✔','❌','❎','⭕','🛑','⛔','📛','🔱','🔰','♻','✴','❇','💠','🔘','🔲','🔳','▪','▫','◾','◽','◼','◻','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🔶','🔷','🔸','🔹','🔺','🔻','💯','🔀','🔁','🔂','▶','⏸','⏹','⏺','⏭','⏮','⏩','⏪','⏫','⏬','◀','🔼','🔽','➡','⬅','⬆','⬇','↗','↘','↙','↖','↕','↔','↩','↪','🔙','🔚','🔛','🔜','🔝','#️⃣','*️⃣','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'],
flags:['🏳','🏴','🚩','🎌','🏁','🏳️‍🌈','🏳️‍⚧️','🏴‍☠️','🇵🇰','🇸🇦','🇺🇸','🇬🇧','🇮🇳','🇨🇳','🇷🇺','🇩🇪','🇫🇷','🇯🇵','🇰🇷','🇧🇷','🇮🇹','🇨🇦','🇦🇺','🇲🇽','🇮🇩','🇳🇱','🇦🇪','🇹🇷','🇮🇷','🇪🇸','🇵🇱','🇧🇩','🇪🇬','🇦🇫','🇮🇶','🇸🇩','🇪🇹','🇲🇾','🇿🇦','🇻🇳','🇵🇭','🇺🇦','🇦🇷','🇩🇿','🇳🇬','🇵🇪','🇺🇿','🇸🇾','🇸🇪','🇨🇭','🇨🇱','🇳🇴','🇨🇿','🇷🇴','🇨🇴','🇰🇪','🇭🇺','🇵🇹','🇾🇪','🇹🇭','🇬🇭','🇹🇿','🇦🇹','🇲🇦','🇫🇮','🇮🇱','🇯🇴','🇸🇬','🇭🇰','🇳🇿','🇵🇬','🇫🇯','🇸🇴','🇱🇧','🇲🇲','🇰🇵','🇨🇺','🇧🇾','🇦🇿','🇬🇪','🇲🇩','🇰🇬','🇹🇯','🇲🇳','🇦🇲','🇱🇻','🇱🇹','🇪🇪','🇸🇮','🇭🇷','🇧🇦','🇲🇰','🇷🇸','🇧🇬','🇸🇰','🇬🇷','🇩🇰','🇧🇪','🇮🇪','🇿🇼','🇿🇲','🇺🇬','🇷🇼','🇲🇿','🇲🇼','🇳🇦','🇸🇳','🇹🇳','🇱🇾','🇨🇲','🇦🇴','🇲🇱','🇧🇫','🇨🇩','🇨🇬','🇲🇬','🇲🇺','🇧🇮','🇪🇷','🇩🇯','🇸🇸','🇨🇫','🇹🇩']
};
var EMOJI_RECENT_KEY='chitchat_recent_emojis';
function loadRecentEmojis(){
try{var r=JSON.parse(localStorage.getItem(EMOJI_RECENT_KEY)||'[]');EMOJI_DATA.recent=Array.isArray(r)? r.slice(0,12):[];}catch(e){EMOJI_DATA.recent=[];}
}
function saveRecentEmoji(emoji){
loadRecentEmojis();
EMOJI_DATA.recent=EMOJI_DATA.recent.filter(function(e){return e!==emoji;});
EMOJI_DATA.recent.unshift(emoji);
EMOJI_DATA.recent=EMOJI_DATA.recent.slice(0,12);
try{localStorage.setItem(EMOJI_RECENT_KEY,JSON.stringify(EMOJI_DATA.recent));}catch(e){}
}
var emojiPickerOverlay=document.getElementById('emojiPickerOverlay');
var emojiPickerGrid=document.getElementById('emojiPickerGrid');
var emojiCategoryTabs=Array.from(document.querySelectorAll('.emoji-category-tab'));
var currentEmojiCat='recent';
var emojiPickerOpen=false;
var EMOJI_CAT_ORDER=['recent','smileys','nature','food','activity','travel','objects','symbols','flags'];
function openEmojiPicker(){
loadRecentEmojis();
emojiPickerOpen=true;
currentEmojiCat=(EMOJI_DATA.recent&&EMOJI_DATA.recent.length>0)? 'recent' : 'smileys';
emojiPickerOverlay.classList.add('active');
softkeyLeft.innerHTML='Close';
softkeyCenter.innerHTML='';
softkeyRight.innerHTML='Category';
renderEmojiCategory(currentEmojiCat);
setTimeout(function(){
var firstEp=emojiPickerGrid.querySelector('.ep-emoji');
if(firstEp)firstEp.focus();
},60);
}
function closeEmojiPicker(){
emojiPickerOpen=false;
emojiPickerOverlay.classList.remove('active');
if(chatPage.classList.contains('active')){
softkeyLeft.innerHTML='+';
softkeyCenter.innerHTML=messageInput.value.trim()? 'Send' : 'Voice';
softkeyRight.innerHTML='Back';
messageInput.focus();
}
}
function renderEmojiCategory(cat){
currentEmojiCat=cat;
emojiCategoryTabs.forEach(function(t){t.classList.toggle('active',t.dataset.cat===cat);});
emojiPickerGrid.innerHTML='';
var emojis=EMOJI_DATA[cat]||[];
if(cat==='recent'){loadRecentEmojis();emojis=EMOJI_DATA.recent;}
if(!emojis.length){
if(cat==='recent'){
currentEmojiCat='smileys';
emojiCategoryTabs.forEach(function(t){t.classList.toggle('active',t.dataset.cat==='smileys');});
emojis=EMOJI_DATA['smileys']||[];
}
if(!emojis.length){
emojiPickerGrid.innerHTML='<div style="color:#555;font-size:11px;padding:20px;grid-column:span 4;text-align:center;">No emojis</div>';
return;
}
}
var numLabels=['1','2','3','4','5','6','7','8','9','*','0','#','','','',''];
emojis.forEach(function(emoji,idx){
var span=document.createElement('span');
span.className='ep-emoji emoji-font';
var emojiNode=document.createTextNode(emoji);
span.appendChild(emojiNode);
if(idx<12&&numLabels[idx]){
var numSpan=document.createElement('span');
numSpan.className='ep-num';
numSpan.textContent=numLabels[idx];
span.appendChild(numSpan);
}
span.tabIndex=100+idx;
span.onclick=function(){insertEmoji(emoji);};
span.onkeydown=function(e){
if(e.key==='Enter'){e.preventDefault();insertEmoji(emoji);return;}
if(e.key==='ArrowRight'){
var all=Array.from(emojiPickerGrid.querySelectorAll('.ep-emoji'));
var ci=all.indexOf(span);if(ci+1<all.length)all[ci+1].focus();return;
}
if(e.key==='ArrowLeft'){
var all=Array.from(emojiPickerGrid.querySelectorAll('.ep-emoji'));
var ci=all.indexOf(span);if(ci-1>=0)all[ci-1].focus();return;
}
if(e.key==='ArrowDown'){
var all=Array.from(emojiPickerGrid.querySelectorAll('.ep-emoji'));
var ci=all.indexOf(span);
var ni=ci+4;if(ni<all.length)all[ni].focus();return;
}
if(e.key==='ArrowUp'){
var all=Array.from(emojiPickerGrid.querySelectorAll('.ep-emoji'));
var ci=all.indexOf(span);
var ni=ci-4;if(ni>=0)all[ni].focus();return;
}
if(e.key==='SoftLeft'||e.key==='Escape'){e.stopPropagation();closeEmojiPicker();return;}
if(e.key==='Power'||e.key==='EndCall'){e.stopPropagation();closeEmojiPicker();return;}
};
emojiPickerGrid.appendChild(span);
});
var first=emojiPickerGrid.querySelector('.ep-emoji');
if(first)setTimeout(function(){first.focus();},40);
}
function cycleEmojiCategory(dir){
var idx=EMOJI_CAT_ORDER.indexOf(currentEmojiCat);
idx=(idx+dir+EMOJI_CAT_ORDER.length)% EMOJI_CAT_ORDER.length;
renderEmojiCategory(EMOJI_CAT_ORDER[idx]);
}
function insertEmoji(emoji){
saveRecentEmoji(emoji);
var inp=messageInput;
var start=(inp.selectionStart!==undefined ? inp.selectionStart : inp.value.length);
var end=(inp.selectionEnd!==undefined ? inp.selectionEnd : inp.value.length);
inp.value=inp.value.substring(0,start)+emoji+inp.value.substring(end);
var np=start+emoji.length;
try{inp.setSelectionRange(np,np);}catch(ex){}
softkeyCenter.innerHTML=inp.value.trim()? 'Send' : 'Voice';
closeEmojiPicker();
}
emojiCategoryTabs.forEach(function(tab){
tab.onclick=function(){renderEmojiCategory(tab.dataset.cat);};
});
loadRecentEmojis();
