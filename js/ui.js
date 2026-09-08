var statusReplyInFlight=false;
function addToOnlineUsers(){
if(!uid||!username||isOnlineUserAdded)return;
db.ref("online_users").once("value",function(snapshot){
db.ref("profiles/"+uid).once("value",function(profileSnap){
var profileData=profileSnap.val();
var profilePic=profileData&&profileData.profilePic
? profileData.profilePic
: "icons/default.png";
var onlineUserData={
username: username,
online: true,
lastSeen: Date.now(),
timestamp: Date.now(),
profilePic: profilePic,
uid: uid
};
db.ref("online_users/"+uid).set(onlineUserData)
.then(function(){
isOnlineUserAdded=true;
})
.catch(function(error){
});
});
});
}
function getMutedChats(){
try{
return JSON.parse(localStorage.getItem("mutedChats")||"{}");
}catch(e){
return{};
}
}
function isChatMuted(chatUid){
var mutedChats=getMutedChats();
return!!(mutedChats[chatUid]&&mutedChats[chatUid].muted);
}
function setChatMuted(chatUid,username,muted){
var mutedChats=getMutedChats();
if(muted){
mutedChats[chatUid]={
muted: true,
username: username||(mutedChats[chatUid]&&mutedChats[chatUid].username)||"User",
updatedAt: Date.now()
};
}else{
delete mutedChats[chatUid];
}
localStorage.setItem("mutedChats",JSON.stringify(mutedChats));
refreshChatMuteIndicator(chatUid);
}
function refreshChatMuteIndicator(chatUid){
var chatEl=document.querySelector('.user.navItem[data-uid="'+chatUid+'"]');
if(!chatEl)return;
var badge=chatEl.querySelector(".mute-badge");
if(!badge)return;
badge.style.display=isChatMuted(chatUid)? "inline-flex" : "none";
}
function rememberPrivateChat(chatUid,username,meta){
if(!chatUid)return;
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
var existing=localChats[chatUid]||{};
var safeMeta=meta||{};
localChats[chatUid]={
username: username||existing.username||"User",
hasMessages: true,
lastActivity: Date.now(),
lastMessageAt: typeof safeMeta.timestamp==="number" ? safeMeta.timestamp : Date.now(),
lastMessage: typeof safeMeta.lastMessage==="string" ? safeMeta.lastMessage : (existing.lastMessage||""),
unreadCount: typeof safeMeta.unreadCount==="number" ? safeMeta.unreadCount : (typeof existing.unreadCount==="number" ? existing.unreadCount : 0),
timestamp: typeof safeMeta.timestamp==="number" ? safeMeta.timestamp : (typeof existing.timestamp==="number" ? existing.timestamp : 0),
chatRoomId: safeMeta.chatRoomId||existing.chatRoomId||null,
profilePic: safeMeta.profilePic||existing.profilePic||null,
online: typeof safeMeta.online==="boolean" ? safeMeta.online :!!existing.online
};
localStorage.setItem("privateChats",JSON.stringify(localChats));
try{
var cachedContacts=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
var found=false;
for(var ci=0;ci<cachedContacts.length;ci++){
if(cachedContacts[ci]&&cachedContacts[ci].uid===chatUid){
cachedContacts[ci].username=username||cachedContacts[ci].username||"User";
if(localChats[chatUid].profilePic)cachedContacts[ci].profilePic=localChats[chatUid].profilePic;
found=true;
break;
}
}
if(!found)cachedContacts.push({uid:chatUid,username:username||"User",profilePic:localChats[chatUid].profilePic||null});
localStorage.setItem("cachedContacts",JSON.stringify(cachedContacts));
}catch(e){}
if(typeof window.idbSet==="function"){
try{window.idbSet("privateChatsIndex",localChats);}catch(e){}
}
}
function getPrivateChatDirectory(){
var contacts={};
try{
var privateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
Object.keys(privateChats).forEach(function(chatUid){
var entry=privateChats[chatUid]||{};
contacts[chatUid]={
uid: chatUid,
username: entry.username||"User",
profilePic: entry.profilePic||null,
online: !!entry.online,
lastMessage: entry.lastMessage||"",
timestamp: entry.timestamp||entry.lastMessageAt||0,
unreadCount: typeof entry.unreadCount==="number" ? entry.unreadCount : 0,
chatRoomId: entry.chatRoomId||null
};
});
}catch(e){}
try{
var cachedContacts=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
cachedContacts.forEach(function(entry){
if(!entry||!entry.uid)return;
contacts[entry.uid]=Object.assign({
uid: entry.uid,
username: entry.username||entry.name||"User",
profilePic: entry.profilePic||null,
online: !!entry.online
},contacts[entry.uid]||{});
});
}catch(e){}
if(window.allPrivateChats&&window.allPrivateChats.length>0){
window.allPrivateChats.forEach(function(entry){
if(!entry||!entry.uid)return;
contacts[entry.uid]=Object.assign({
uid: entry.uid,
username: entry.username||entry.name||"User",
profilePic: entry.profilePic||null,
online: !!entry.online
},contacts[entry.uid]||{});
});
}
return Object.keys(contacts).map(function(key){return contacts[key];});
}
function isFreshOnlineUserRecord(data){
if(!data)return false;
if(data.online===false)return false;
var lastSeen=Math.max(data.timestamp||0,data.lastSeen||0);
if(!lastSeen)return false;
return(Date.now()-lastSeen)<(5*60*1000);
}
function pruneStaleOnlineUsers(){
db.ref("online_users").once("value",function(snapshot){
snapshot.forEach(function(childSnapshot){
var data=childSnapshot.val()||{};
if(!isFreshOnlineUserRecord(data)){
db.ref("online_users/"+childSnapshot.key).remove();
}
});
});
}
function focusPrivateChatsLanding(){
if(typeof window.androidRestoreMainLayout==="function")window.androidRestoreMainLayout();
if(isOnlineViewActive){
var firstOnlineUser=document.querySelector(".online-user-item");
if(firstOnlineUser){
firstOnlineUser.focus({preventScroll:true});
var oul=document.getElementById("onlineUsersList");
if(oul)oul.scrollTop=0;
return;
}
}
var firstPrivateChat=document.querySelector(".user.navItem");
if(firstPrivateChat){
firstPrivateChat.focus({preventScroll:true});
var pcc=document.getElementById("privateChatContent");
if(pcc)pcc.scrollTop=0;
return;
}
var privateChatListEl=document.getElementById("privateChatList");
if(privateChatListEl){
privateChatListEl.setAttribute("tabindex","-1");
privateChatListEl.focus({preventScroll:true});
var pcc2=document.getElementById("privateChatContent");
if(pcc2)pcc2.scrollTop=0;
}
}
function showOnlineUsersLoading(){
var list=document.getElementById("onlineUsersList");
if(!list)return;
list.innerHTML="<div id='onlineUsersLoadingMsg' style='text-align:center;padding:24px 16px;'>"+
"<span class='loading-spinner' style='display:inline-block;margin-right:8px;vertical-align:middle;border-top-color:#00B4D8;'></span>"+
"<span style='color:#64748B;font-size:12px;'>Loading online users...</span></div>";
}
function loadOnlineUsers(){
var onlineUsersList=document.getElementById("onlineUsersList");
if(!onlineUsersList)return;
var hadVisibleUsers=onlineUsersList.querySelectorAll(".online-user-item").length>0;
displayedUsers=0;
onlineUsersLoadComplete=false;
if(!hadVisibleUsers){
allOnlineUsers=[];
window.__onlineUsersReady=false;
showOnlineUsersLoading();
}
if(onlineUsersListRef)onlineUsersListRef.off();
onlineUsersListRef=db.ref("online_users")
.orderByChild("timestamp");
var loadFinished=false;
var loadTimeout=setTimeout(function(){
if(loadFinished)return;
loadFinished=true;
onlineUsersLoadComplete=true;
window.__onlineUsersReady=true;
if(allOnlineUsers.length===0){
onlineUsersList.innerHTML="<div style='text-align:center;padding:20px;color:#94A3B8;font-size:11px;'>No users online</div>";
}
updateOnlineCount();
if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
setupOnlineUsersRealtimeListeners();
},8000);
onlineUsersListRef.once("value",function(snapshot){
if(loadFinished)return;
loadFinished=true;
clearTimeout(loadTimeout);
var userMap={};
snapshot.forEach(function(child){
if(child.key===uid)return;
var d=child.val()||{};
if(!isFreshOnlineUserRecord(d)){
return;
}
userMap[child.key]={
username: d.username||null,
profilePic: d.profilePic||null,
timestamp: d.timestamp||0
};
});
var allKeys=Object.keys(userMap).sort(function(a,b){
return(userMap[b].timestamp||0)-(userMap[a].timestamp||0);
});
var displayKeys=allKeys.slice(0,20);
var pending=displayKeys.length||1;
function afterFetch(){
pending--;
if(pending>0)return;
allOnlineUsers=allKeys.map(function(k){
return{uid: k,data: userMap[k]};
});
updateOnlineCount();
onlineUsersLoadComplete=true;
window.__onlineUsersReady=true;
if(isOnlineViewActive){
renderOnlineUsersDOM();
}else{
onlineUsersList.innerHTML="<div style='text-align:center;padding:16px;color:#94A3B8;font-size:11px;'>"+
allOnlineUsers.length+" user"+(allOnlineUsers.length!==1 ? "s" : "")+" online<br><span style='font-size:10px;'>Open tab to see</span></div>";
}
if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
setupOnlineUsersRealtimeListeners();
}
if(allKeys.length===0){
allOnlineUsers=[];
onlineUsersLoadComplete=true;
window.__onlineUsersReady=true;
onlineUsersList.innerHTML="<div style='text-align:center;padding:20px;color:#94A3B8;font-size:11px;'>No users online</div>";
updateOnlineCount();
if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
setupOnlineUsersRealtimeListeners();
return;
}
displayKeys.forEach(function(k){
db.ref("profiles/"+k).once("value").then(function(s){
var profile=s.val()||{};
if(profile.username){userMap[k].username=profile.username;}
if(profile.profilePic){userMap[k].profilePic=profile.profilePic;}
afterFetch();
}).catch(function(){
afterFetch();
});
});
},function(){
if(loadFinished)return;
loadFinished=true;
clearTimeout(loadTimeout);
onlineUsersLoadComplete=true;
window.__onlineUsersReady=true;
if(document.getElementById("onlineUsersList")){
document.getElementById("onlineUsersList").innerHTML=
"<div style='text-align:center;padding:20px;color:#EF4444;font-size:11px;'>Failed to load</div>";
}
if(typeof tryHideSplashWhenReady==="function")tryHideSplashWhenReady();
});
}
function setupOnlineUsersRealtimeListeners(){
onlineUsersListRef.on("child_added",function(childSnap){
var userUid=childSnap.key;
if(userUid===uid)return;
if(allOnlineUsers.some(function(u){return u.uid===userUid;}))return;
var d=childSnap.val()||{};
if(!isFreshOnlineUserRecord(d))return;
var newUser={uid: userUid,data:{username: d.username||"User",profilePic: d.profilePic||null,timestamp: d.timestamp||0}};
allOnlineUsers.push(newUser);
updateOnlineCount();
if(isOnlineViewActive)addUserToDOM(userUid,newUser.data);
});
onlineUsersListRef.on("child_removed",function(childSnap){
var userUid=childSnap.key;
allOnlineUsers=allOnlineUsers.filter(function(u){return u.uid!==userUid;});
updateOnlineCount();
var el=document.querySelector('.online-user-item[data-uid="'+userUid+'"]');
if(el)el.remove();
if(isOnlineViewActive&&allOnlineUsers.length===0){
var list=document.getElementById("onlineUsersList");
if(list)list.innerHTML="<div style='text-align:center;padding:20px;color:#94A3B8;font-size:11px;'>No users online</div>";
}
});
}
function renderOnlineUsersDOM(){
var onlineUsersList=document.getElementById("onlineUsersList");
if(!onlineUsersList)return;
onlineUsersList.innerHTML="";
if(allOnlineUsers.length===0){
onlineUsersList.innerHTML="<div style='text-align:center;padding:20px;color:#94A3B8;font-size:11px;'>No users online</div>";
return;
}
var toRender=allOnlineUsers.slice(0);
function renderChunk(i){
for(var j=i;j<Math.min(i+5,toRender.length);j++){
createOnlineUserElement(toRender[j].uid,toRender[j].data);
}
if(i+5<toRender.length)setTimeout(function(){renderChunk(i+5);},16);
else displayedUsers=toRender.length;
}
renderChunk(0);
}
function updateOnlineCount(){
var el=document.getElementById("onlineCountHeader");
if(el)el.innerHTML="("+allOnlineUsers.length+")";
}
function addUserToDOM(userUid,data){
var onlineUsersList=document.getElementById("onlineUsersList");
if(!onlineUsersList)return;
var emptyMsg=onlineUsersList.querySelector("div[style*='padding:20px']");
if(emptyMsg)emptyMsg.remove();
if(document.querySelector('.online-user-item[data-uid="'+userUid+'"]'))return;
var userElement=document.createElement("div");
userElement.className="online-user-item";
userElement.setAttribute("data-uid",userUid);
userElement.tabIndex=2;
var picWrap=document.createElement("div");
picWrap.style.cssText="position:relative;width:40px;height:40px;flex-shrink:0;";
var profilePic=document.createElement("img");
profilePic.className="online-user-pic";
profilePic.src=data.profilePic||"icons/default.png";
profilePic.alt=data.username||"User";
picWrap.appendChild(profilePic);
var nameEl=document.createElement("div");
nameEl.className="online-user-name";
nameEl.textContent=data.username||"User";
userElement.appendChild(picWrap);
userElement.appendChild(nameEl);
userElement.onclick=function(){startPrivateChat(userUid,data.username||"User");};
userElement.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();startPrivateChat(userUid,data.username||"User");}
};
var existing=onlineUsersList.querySelectorAll(".online-user-item");
var inserted=false;
for(var i=0;i<existing.length;i++){
var existName=existing[i].querySelector(".online-user-name");
if(existName&&(data.username||"").localeCompare(existName.textContent)<0){
onlineUsersList.insertBefore(userElement,existing[i]);
inserted=true;
break;
}
}
if(!inserted){
var loadMore=document.getElementById("loadingMoreIndicator");
if(loadMore)onlineUsersList.insertBefore(userElement,loadMore);
else onlineUsersList.appendChild(userElement);
}
}
function displayOnlineUsersBatch(startIndex,endIndex){
var onlineUsersList=document.getElementById("onlineUsersList");
if(!onlineUsersList)return;
var loadingMore=document.getElementById("loadingMoreIndicator");
if(loadingMore)loadingMore.remove();
for(var i=startIndex;i<endIndex;i++){
if(i>=allOnlineUsers.length)break;
var user=allOnlineUsers[i];
var existingUser=document.querySelector(`.online-user-item[data-uid="${user.uid}"]`);
if(!existingUser){
createOnlineUserElement(user.uid,user.data);
}
}
if(endIndex<allOnlineUsers.length){
addLoadingMoreIndicator();
}
}
function addLoadingMoreIndicator(){
var onlineUsersList=document.getElementById("onlineUsersList");
if(!onlineUsersList)return;
var existing=document.getElementById("loadingMoreIndicator");
if(existing)existing.remove();
var loadingDiv=document.createElement("div");
loadingDiv.id="loadingMoreIndicator";
loadingDiv.style.cssText="text-align: center;padding: 15px;color: #0077B6;font-size: 12px;font-weight: bold;background: #f0f2f5;margin: 10px;border-radius: 5px;";
loadingDiv.innerHTML="⏳ Loading more users...";
onlineUsersList.appendChild(loadingDiv);
}
function loadNextUserBatch(){
if(!allOnlineUsers||allOnlineUsers.length===0)return;
if(displayedUsers>=allOnlineUsers.length)return;
if(isLoadingMore)return;
isLoadingMore=true;
var loadingMore=document.getElementById("loadingMoreIndicator");
if(loadingMore)loadingMore.remove();
var nextEnd=Math.min(displayedUsers+NEXT_BATCH,allOnlineUsers.length);
setTimeout(function(){
displayOnlineUsersBatch(displayedUsers,nextEnd);
displayedUsers=nextEnd;
isLoadingMore=false;
},300);
}
// ── Online user skeleton loaders ──────────────────────────────────
function showOnlineUserSkeletons(count){
var list=document.getElementById("onlineUsersList");
if(!list)return;
// Remove old skeletons
list.querySelectorAll(".ou-skeleton").forEach(function(s){s.remove();});
for(var i=0;i<(count||5);i++){
var sk=document.createElement("div");
sk.className="ou-skeleton";
sk.innerHTML='<div class="ou-skeleton-av"></div><div class="ou-skeleton-lines"><div class="ou-skeleton-l1"></div><div class="ou-skeleton-l2"></div></div>';
list.appendChild(sk);
}
}
function removeOnlineUserSkeletons(){
var list=document.getElementById("onlineUsersList");
if(list)list.querySelectorAll(".ou-skeleton").forEach(function(s){s.remove();});
}
window.showOnlineUserSkeletons=showOnlineUserSkeletons;
window.removeOnlineUserSkeletons=removeOnlineUserSkeletons;

// ── New Android-style online user card ────────────────────────────
function createOnlineUserElement(userUid,userData){
var existingUser=document.querySelector('.online-user-item[data-uid="'+userUid+'"]');
if(existingUser)return existingUser;
var resolvedName=userData.username||null;
if(!resolvedName){try{resolvedName=localStorage.getItem("username_"+userUid);}catch(e){}}
resolvedName=resolvedName||userUid.substring(0,8);

var userElement=document.createElement("div");
userElement.className="online-user-item online-user-card";
userElement.dataset.uid=userUid;
userElement.tabIndex=2;

// Avatar wrap with online dot
var picWrap=document.createElement("div");
picWrap.className="ou-av-wrap";
picWrap.style.cssText="width:48px;height:48px;";
var profilePic=document.createElement("img");
profilePic.alt=resolvedName;
profilePic.loading="lazy";
profilePic.style.cssText="width:48px;height:48px;border-radius:50%;object-fit:cover;border:2px solid #BAE6FD;";
var resolvedPic=userData.profilePic||null;
try{resolvedPic=resolvedPic||localStorage.getItem("profilePic_"+userUid);}catch(e){}
if(resolvedPic){profilePic.src=resolvedPic;}
else{loadProfilePicture(userUid,profilePic,resolvedName);}
profilePic.onerror=function(){this.src="icons/default.png";};
var onlineDot=document.createElement("div");
onlineDot.className="ou-online-dot";
picWrap.appendChild(profilePic);
picWrap.appendChild(onlineDot);

// Text
var textWrap=document.createElement("div");
textWrap.style.cssText="flex:1;min-width:0;";
var nameEl=document.createElement("div");
nameEl.className="ou-name online-user-name";
nameEl.textContent=resolvedName;
var subEl=document.createElement("div");
subEl.className="ou-sub";
subEl.textContent="Tap to chat";
textWrap.appendChild(nameEl);
textWrap.appendChild(subEl);

// Chevron
var chev=document.createElement("div");
chev.style.cssText="color:#BAE6FD;font-size:20px;flex-shrink:0;";
chev.textContent="›";

userElement.appendChild(picWrap);
userElement.appendChild(textWrap);
userElement.appendChild(chev);

// Insert in order
var onlineUsersList=document.getElementById("onlineUsersList");
var loadingMore=document.getElementById("loadingMoreIndicator");
var existing=Array.from(onlineUsersList.querySelectorAll(".online-user-item"));
var inserted=false;
for(var i=0;i<existing.length;i++){
var existData=allOnlineUsers.find(function(u){return u.uid===existing[i].dataset.uid;});
var currentTs=userData.timestamp||0;
var existTs=existData&&existData.data?(existData.data.timestamp||0):0;
if(currentTs>existTs||(currentTs===existTs&&resolvedName.localeCompare(existing[i].querySelector(".ou-name")?existing[i].querySelector(".ou-name").textContent:"")<0)){
onlineUsersList.insertBefore(userElement,existing[i]);
inserted=true;break;
}
}
if(!inserted){if(loadingMore)onlineUsersList.insertBefore(userElement,loadingMore);else onlineUsersList.appendChild(userElement);}
removeOnlineUserSkeletons();

var displayName=userData.username||"User";
userElement.onclick=function(){startChatWithUser(userUid,displayName);};
userElement.onkeydown=function(e){if(e.key==="Enter"){e.preventDefault();startChatWithUser(userUid,displayName);}};
userElement.onfocus=function(){
var allDisplayedUsers=Array.from(document.querySelectorAll(".online-user-item:not(#loadingMoreIndicator)"));
if(allDisplayedUsers.indexOf(this)===allDisplayedUsers.length-1)loadNextUserBatch();
};
userElement.onblur=function(){if(isOnlineViewActive){softkeyLeft.innerHTML="PVT Chat";}};
return userElement;
}
function showChatLoadingOverlay(username){
var overlay=document.getElementById("chatLoadingOverlay");
if(!overlay){
overlay=document.createElement("div");
overlay.id="chatLoadingOverlay";
overlay.style.cssText="position:fixed;top:0;left:0;right:0;bottom:0;z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:var(--bg,#F0F9FF);";
var spinner=document.createElement("div");
spinner.style.cssText="width:44px;height:44px;border:3px solid #BAE6FD;border-top-color:#0369A1;border-radius:50%;animation:spin 0.7s linear infinite;margin-bottom:16px;";
var style=document.getElementById("chatLoadingStyle");
if(!style){style=document.createElement("style");style.id="chatLoadingStyle";style.textContent="@keyframes spin{to{transform:rotate(360deg)}}";document.head.appendChild(style);}
var lbl=document.createElement("div");
lbl.id="chatLoadingLabel";
lbl.style.cssText="font-size:15px;font-weight:600;color:#0369A1;";
var sub=document.createElement("div");
sub.style.cssText="font-size:12px;color:#64748B;margin-top:4px;";
sub.textContent="Opening chat...";
overlay.appendChild(spinner);
overlay.appendChild(lbl);
overlay.appendChild(sub);
document.body.appendChild(overlay);
}
var lbl2=document.getElementById("chatLoadingLabel");
if(lbl2)lbl2.textContent=username||"Loading...";
overlay.style.display="flex";
}
function hideChatLoadingOverlay(){
var overlay=document.getElementById("chatLoadingOverlay");
if(overlay)overlay.style.display="none";
}
window.hideChatLoadingOverlay=hideChatLoadingOverlay;
function startChatWithUser(userUid,username){
currentChatUsername=username;
pendingOpenChatUsername=username;
pendingOpenChatStatus="Online";
showChatLoadingOverlay(username);
setTimeout(function(){openChat(userUid);},60);
setTimeout(function(){
if(typeof isKnownChatContact==="function"&&isKnownChatContact(userUid))return;
if(window._spamAllowedCache&&window._spamAllowedCache[userUid]===true)return;
canSendMessageTo(userUid).then(function(allowed){
if(!allowed){
showNotification("Cannot send messages!\n\nThis user has spam protection enabled.");
}
});
},100);
}
function startPrivateChat(userUid,username){
startChatWithUser(userUid,username);
}
function showOnlineUsersView(){
isOnlineViewActive=true;
currentMainTab='chat';
var onlineView=document.getElementById("onlineUsersView");
var privateView=document.getElementById("privateChatsView");
var tabBar=document.getElementById("mainTabBar");
var chatContent=document.getElementById("chatTabContent");
var statusContent=document.getElementById("statusTabContent");
if(onlineView)onlineView.style.display="flex";
if(privateView)privateView.style.display="none";
if(tabBar)tabBar.style.display="none";
if(chatContent)chatContent.style.display="flex";
if(statusContent)statusContent.style.display="none";
var existingItems=document.querySelectorAll(".online-user-item");
if(existingItems.length===0&&allOnlineUsers.length>0){
renderOnlineUsersDOM();
}else if(existingItems.length===0&&!onlineUsersLoadComplete){
showOnlineUsersLoading();
}
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
softkeyLeft.innerHTML="PVT Chat";
softkeyRight.innerHTML="Close";
softkeyCenter.innerHTML="";
setTimeout(function(){
var firstUser=document.querySelector(".online-user-item");
if(firstUser){
firstUser.focus({preventScroll:true});
var oul2=document.getElementById("onlineUsersList");
if(oul2)oul2.scrollTop=0;
}else{
var anyFocusable=document.querySelector(".navItem");
if(anyFocusable)anyFocusable.focus({preventScroll:true});
}
},100);
}
function showPrivateChatsView(){
isOnlineViewActive=false;
currentMainTab='chat';
var onlineView=document.getElementById("onlineUsersView");
var privateView=document.getElementById("privateChatsView");
var tabBar=document.getElementById("mainTabBar");
var chatContent=document.getElementById("chatTabContent");
var statusContent=document.getElementById("statusTabContent");
if(onlineView)onlineView.style.display="none";
if(privateView)privateView.style.display="flex";
if(tabBar)tabBar.style.display="flex";
if(chatContent)chatContent.style.display="flex";
if(statusContent)statusContent.style.display="none";
var tabChat=document.getElementById("tabChat");
var tabStatus=document.getElementById("tabStatus");
if(tabChat){tabChat.style.borderBottom="3px solid #00B4D8";tabChat.style.opacity="1";}
if(tabStatus){tabStatus.style.borderBottom="3px solid transparent";tabStatus.style.opacity="0.75";}
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
softkeyLeft.innerHTML="Options";
softkeyRight.innerHTML="Online";
softkeyCenter.innerHTML="";
setTimeout(function(){
focusPrivateChatsLanding();
},100);
}
var currentMainTab='chat';
function switchMainTab(tab){
currentMainTab=tab;
var chatContent=document.getElementById("chatTabContent");
var statusContent=document.getElementById("statusTabContent");
var tabChat=document.getElementById("tabChat");
var tabStatus=document.getElementById("tabStatus");
if(tab==='chat'){
chatContent.style.display="flex";
statusContent.style.display="none";
tabChat.style.borderBottom="3px solid #00B4D8";
tabChat.style.opacity="1";
tabStatus.style.borderBottom="3px solid transparent";
tabStatus.style.opacity="0.75";
if(isOnlineViewActive){
softkeyLeft.innerHTML="PVT Chat";
softkeyRight.innerHTML="Close";
}else{
softkeyLeft.innerHTML="Options";
softkeyRight.innerHTML="Online";
}
softkeyCenter.innerHTML="";
}else{
chatContent.style.display="none";
statusContent.style.display="flex";
tabChat.style.borderBottom="3px solid transparent";
tabChat.style.opacity="0.75";
tabStatus.style.borderBottom="3px solid #00B4D8";
tabStatus.style.opacity="1";
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Add";
softkeyRight.innerHTML="";
loadStatusList();
setTimeout(function(){
var el=document.getElementById("myStatusRow");
if(el){
el.onclick=function(){showStatusAdd();};
el.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();showStatusAdd();}
};
el.onfocus=function(){
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Add";
softkeyRight.innerHTML="";
};
el.focus({preventScroll:true});
container.scrollTop=0;
}
},100);
}
}
function loadStatusList(){
var container=document.getElementById("statusListContainer");
if(!container)return;
container.innerHTML='<div style="text-align:center;padding:12px;color:#aaa;font-size:12px;">Loading...</div>';
var myPic=document.getElementById("myStatusPic");
if(myPic&&uid){
loadProfilePicture(uid,myPic,username||"Me");
}
var subtitle=document.getElementById("myStatusSubtitle");
if(subtitle&&uid){
db.ref("statuses/"+uid).once("value",function(snap){
if(snap.exists()){
subtitle.textContent="View my status";
subtitle.style.color="#0077B6";
}else{
subtitle.textContent="Tap to add status update";
subtitle.style.color="#667781";
}
});
}
db.ref("conversations/"+uid).once("value",function(convSnap){
if(!convSnap.exists()){
container.innerHTML='<div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">No contacts with status</div>';
return;
}
var partnerUids=[];
convSnap.forEach(function(child){
if(child.key&&child.key!==uid)partnerUids.push(child.key);
});
// Only show statuses for people who are actually in the chat list.
// conversations/{uid} also contains entries for anyone who ever sent us
// a message, so without this filter strangers we never added to the
// chat list could show up here.
var knownUids={};
try{
var knownChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
Object.keys(knownChats).forEach(function(k){knownUids[k]=true;});
}catch(e){}
if(window.allPrivateChats&&window.allPrivateChats.length){
window.allPrivateChats.forEach(function(c){if(c&&c.uid)knownUids[c.uid]=true;});
}
partnerUids=partnerUids.filter(function(p){return knownUids[p];});
if(partnerUids.length===0){
container.innerHTML='<div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">No contacts with status</div>';
return;
}
var privateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
var statusUsers=[];
var pending=partnerUids.length;
partnerUids.forEach(function(partnerUid){
db.ref("conversations/"+uid+"/"+partnerUid).once("value",function(chatSnap){
var hasRealChat=chatSnap.exists()&&chatSnap.numChildren&&chatSnap.numChildren()>0;
if(hasRealChat){
db.ref("statuses/"+partnerUid).once("value",function(snap){
if(snap.exists()){
var statusData=snap.val();
var ts=statusData.timestamp||0;
if(Date.now()-ts<24*60*60*1000){
statusUsers.push({
uid: partnerUid,
username:(privateChats[partnerUid]&&privateChats[partnerUid].username)||"User",
timestamp: ts,
statusData: statusData
});
}
}
pending--;
if(pending===0){
renderStatusList(container,statusUsers);
}
});
}else{
pending--;
if(pending===0){
renderStatusList(container,statusUsers);
}
}
});
});
});
}
function renderStatusList(container,statusUsers){
container.innerHTML="";
if(statusUsers.length===0){
container.innerHTML='<div style="text-align:center;padding:20px;color:#aaa;font-size:12px;">No recent status updates</div>';
return;
}
statusUsers.sort(function(a,b){return b.timestamp-a.timestamp;});
statusUsers.forEach(function(user,idx){
var item=document.createElement("div");
item.className="navItem";
item.tabIndex=100+idx;
item.dataset.uid=user.uid;
item.style.cssText="display:flex;align-items:center;gap:10px;padding:8px 10px;background:#fff;border-bottom:1px solid #f0f0f0;cursor:pointer;width:100%;box-sizing:border-box;border-radius:0;";
var picWrap=document.createElement("div");
picWrap.style.cssText="position:relative;width:38px;height:38px;flex-shrink:0;";
var pic=document.createElement("img");
pic.style.cssText="width:38px;height:38px;border-radius:50%;object-fit:cover;border:2.5px solid #00B4D8;transition:border-color 0.3s;";
pic.src="icons/default.png";
pic.alt=user.username;
loadProfilePicture(user.uid,pic,user.username);
(function(picEl,statusUid,statusData){
var latestTs=0;
if(statusData.statuses){
statusData.statuses.forEach(function(s){if(s.timestamp>latestTs)latestTs=s.timestamp;});
}else if(statusData.timestamp){
latestTs=statusData.timestamp;
}
if(latestTs){
db.ref("statusViews/"+statusUid+"/"+latestTs+"/"+uid).once("value",function(vSnap){
if(vSnap.exists()){
picEl.style.border="2.5px solid #aaa";
picEl.style.boxShadow="none";
}
});
}
})(pic,user.uid,user.statusData);
picWrap.appendChild(pic);
var info=document.createElement("div");
info.style.cssText="flex:1;min-width:0;";
var nameEl=document.createElement("div");
nameEl.style.cssText="font-size:13px;font-weight:bold;color:#0D1B2A;";
nameEl.textContent=user.username;
var timeEl=document.createElement("div");
timeEl.style.cssText="font-size:11px;color:#667781;";
timeEl.textContent=formatStatusTime(user.timestamp);
info.appendChild(nameEl);
info.appendChild(timeEl);
item.appendChild(picWrap);
item.appendChild(info);
item.onclick=function(){showStatusView(user.uid);};
item.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();showStatusView(user.uid);}
};
item.onfocus=function(){
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="View";
softkeyRight.innerHTML="";
};
container.appendChild(item);
});
setTimeout(function(){
var first=container.querySelector(".navItem");
if(first){
first.focus({preventScroll:true});
container.scrollTop=0;
}
},100);
}
function setupConnectionStatus(){
// Remove any previously attached listener first — otherwise every resume
// stacks another ".info/connected" listener on top of the old one, which
// can fire the same state change multiple times.
if(connectionRef){try{connectionRef.off();}catch(e){}}
connectionRef=db.ref(".info/connected");
if(connectionStatus){
connectionStatus.textContent="Connecting...";
connectionStatus.className="connection-status syncing";
connectionStatus.style.display="block";
// Agar slow network pr connection banane mein bohot der lag jaye,
// to banner ko hamesha ke liye na dikhayein — app cached data ke
// sath usable rahe. Jab actual connection ho jayegi to normal
// "connected"/"offline" flow apna kaam khud kar lega.
clearTimeout(window._initialConnBannerTimer);
window._initialConnBannerTimer=setTimeout(function(){
if(connectionStatus&&connectionStatus.textContent==="Connecting..."){
connectionStatus.style.display="none";
}
},10000);
}
connectionRef.on("value",function(snap){
window.__fbConnected=!!(snap&&snap.val()===true);
if(snap.val()===true){
window.__firebaseEverConnected=true;
if(document.hidden||window.__skipSyncBanner){
window.__skipSyncBanner=false;
if(connectionStatus)connectionStatus.style.display="none";
return;
}
showConnectionStatus("connected");
}else{
if(window.__firebaseEverConnected&&!document.hidden){
showConnectionStatus("offline");
}
}
});
}
function showConnectionStatus(state){
if(!connectionStatus)return;
clearTimeout(window._connBannerTimer);
clearTimeout(window._initialConnBannerTimer);
clearInterval(window._syncCheckInterval);
if(state==="connecting"){
connectionStatus.textContent="Connecting...";
connectionStatus.className="connection-status syncing";
connectionStatus.style.display="block";
return;
}
if(state==="offline"){
connectionStatus.textContent="Connection lost. Reconnecting...";
connectionStatus.className="connection-status syncing";
connectionStatus.style.display="block";
window._connBannerTimer=setTimeout(function(){
if(connectionStatus&&connectionStatus.textContent==="Connection lost. Reconnecting..."){
connectionStatus.style.display="none";
}
},6000);
return;
}
if(state==="connected"){
if(window.__skipSyncBanner){
window.__skipSyncBanner=false;
connectionStatus.style.display="none";
return;
}
connectionStatus.textContent="✓ Synchronizing...";
connectionStatus.className="connection-status online";
connectionStatus.style.display="block";
window._syncCheckInterval=setInterval(function(){
if(window.__privateChatsReady){
clearInterval(window._syncCheckInterval);
connectionStatus.style.display="none";
}
},200);
setTimeout(function(){
clearInterval(window._syncCheckInterval);
connectionStatus.style.display="none";
},8000);
}
}
signUpButton.onclick=function(){
var enteredUsername=usernameInputSignUp.value.trim();
var enteredPassword=passwordInputSignUp.value.trim();
var inp2=document.getElementById("passwordInputSignUp2");
var enteredPassword2=inp2 ? inp2.value.trim(): enteredPassword;
if(!enteredUsername||!enteredPassword){
showNotification("Please enter both username and password.");
return;
}
if(enteredPassword.length<6){
showCustomAlert("Password must be at least 6 characters.",function(){
passwordInputSignUp.focus();
});
return;
}
if(inp2&&enteredPassword!==enteredPassword2){
showCustomAlert("Passwords do not match. Please try again.",function(){
inp2.value="";
if(inp2)inp2.focus();
});
return;
}
signUpButton.innerHTML='<span class="loading-spinner" style="display:inline-block;margin-right:8px;vertical-align:middle;"></span>Creating...';
signUpButton.style.opacity="0.7";
signUpButton.disabled=true;
showAuthLoading("Creating account...");
var email=enteredUsername.replace(/\s+/g,'_')+"@chitchat.com";
auth.fetchSignInMethodsForEmail(email)
.then(function(signInMethods){
if(signInMethods.length>0){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
return;
}
return db.ref("usernames/"+enteredUsername).once("value");
})
.then(function(snapshot){
if(snapshot.exists()){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
return;
}
var email=enteredUsername.replace(/\s+/g,'_')+"@chitchat.com";
return auth.createUserWithEmailAndPassword(email,enteredPassword);
})
.then(function(userCredential){
var user=userCredential.user;
uid=user.uid;
username=enteredUsername;
localStorage.setItem("uid",uid);
localStorage.setItem("username",username);
db.ref("usernames/"+enteredUsername).set(uid);
db.ref("users/"+uid).set({
username: enteredUsername,
profilePic: "icons/default.png",
about: "Hey there!I'm using Chit Chat",
createdAt: Date.now(),
lastSeen: Date.now()
});
db.ref("profiles/"+uid).set({
username: enteredUsername,
about: "Hey there!I'm using Chit Chat",
profilePic: "icons/default.png",
lastUpdated: Date.now()
});
db.ref("presence1/"+uid).set({
username: enteredUsername,
online: true,
lastSeen: Date.now()
});
setTimeout(function(){
addToOnlineUsers();
},1000);
var _al2=document.getElementById("_authLoader");
if(_al2)_al2.remove();
hideAuthLoading();
hideSplashScreen();
signUpPage.classList.remove("active");
mainPage.classList.add("active");
softKeysContainer.style.display="block";
softkeyLeft.innerHTML="";
softkeyRight.innerHTML="Back";
setTimeout(function(){
focusPrivateChatsLanding();
},1000);
// Step 1+2: presence for chat list + private chat sync (new chats, unread
// from last message only). Step 3: group unread check, ads, profile
// check, and auto-delete all fire from finishReady() in chat.js once the
// chat list has actually finished loading — not on a fixed timer.
// Online Users and Status are NOT auto-loaded — only when navigated to.
loadPrivateChats();
setupPresence();
setupConnectionStatus();
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online";
// General (non-chat) notifications sync 1s later, in the background.
setTimeout(function(){
loadNotifications();
},1000);
})
.catch(function(error){
hideAuthLoading();
signUpButton.textContent="Create";
signUpButton.style.opacity="1";
signUpButton.disabled=false;
if(error.code==="auth/email-already-in-use"){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
}else{
showNotification("Sign-up failed: "+error.message);
}
});
};
loginButton.onclick=function(){
var enteredUsername=usernameInputLogin.value.trim();
var enteredPassword=passwordInputLogin.value.trim();
if(!enteredUsername||!enteredPassword){
showNotification("Please enter both username and password.");
return;
}
loginButton.textContent="Logging in...";
loginButton.style.opacity="0.7";
loginButton.disabled=true;
showAuthLoading("Logging in...");
var email=enteredUsername.replace(/\s+/g,'_')+"@chitchat.com";
auth.signInWithEmailAndPassword(email,enteredPassword)
.then(function(userCredential){
var user=userCredential.user;
uid=user.uid;
username=enteredUsername;
localStorage.setItem("uid",uid);
localStorage.setItem("username",username);
db.ref("usernames/"+enteredUsername).once("value",function(snapshot){
if(!snapshot.exists()){
db.ref("usernames/"+enteredUsername).set(uid);
}
});
db.ref("users/"+uid).once("value",function(uSnap){
if(!uSnap.exists()){
db.ref("users/"+uid).set({
username: enteredUsername,
profilePic: "icons/default.png",
about: "Hey there!I'm using Chit Chat",
createdAt: Date.now(),
lastSeen: Date.now()
});
}else{
db.ref("users/"+uid).update({lastSeen: Date.now()});
}
});
db.ref("profiles/"+uid).once("value",function(snapshot){
if(!snapshot.exists()){
db.ref("profiles/"+uid).set({
username: enteredUsername,
about: "Hey there!I'm using Chit Chat",
profilePic: "icons/default.png",
lastUpdated: Date.now()
});
}
});
db.ref("presence1/"+uid).update({
online: true,
lastSeen: Date.now(),
currentChat: currentOpenChatUid,
username: enteredUsername
});
setTimeout(function(){
addToOnlineUsers();
},1000);
hideAuthLoading();
hideSplashScreen();
loginPage.classList.remove("active");
mainPage.classList.add("active");
softKeysContainer.style.display="block";
softkeyLeft.innerHTML="";
softkeyRight.innerHTML="Back";
setTimeout(function(){
focusPrivateChatsLanding();
},1000);
// Step 1+2: presence for chat list + private chat sync (new chats, unread
// from last message only). Step 3: group unread check, ads, profile
// check, and auto-delete all fire from finishReady() in chat.js once the
// chat list has actually finished loading — not on a fixed timer.
// Online Users and Status are NOT auto-loaded — only when navigated to.
loadPrivateChats();
setupPresence();
setupConnectionStatus();
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online";
// General (non-chat) notifications sync 1s later, in the background.
setTimeout(function(){
loadNotifications();
},1000);
})
.catch(function(error){
hideAuthLoading();
loginButton.textContent="Login";
loginButton.style.opacity="1";
loginButton.disabled=false;
if(error.code==="auth/user-not-found"){
showNotification("Username or password is wrong,try again.");
setTimeout(function(){passwordInputLogin.focus();},100);
}else if(error.code==="auth/wrong-password"){
showNotification("Username or password is wrong,try again.");
setTimeout(function(){passwordInputLogin.focus();},100);
}else{
showNotification("Username or password is wrong,try again.");
setTimeout(function(){passwordInputLogin.focus();},100);
}
});
};
function showSearchBar(){
searchContainer.style.display="block";
searchInput.focus();
softkeyLeft.innerHTML="Cancel";
softkeyCenter.innerHTML="Search";
softkeyRight.innerHTML="";
isSearching=true;
}
function hideSearchBar(){
searchContainer.style.display="none";
searchInput.value="";
searchResults.style.display="none";
searchResults.innerHTML="";
var spinnerEl=document.getElementById("searchLoadingIndicator");
if(spinnerEl)spinnerEl.style.display="none";
if(isOnlineViewActive){
softkeyLeft.innerHTML="PVT Chat";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Close";
}else{
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="Online User";
}
if(isOnlineViewActive){
var firstOnlineUser=document.querySelector(".online-user-item");
if(firstOnlineUser)firstOnlineUser.focus();
else focusPrivateChatsLanding();
}else{
focusPrivateChatsLanding();
}
isSearching=false;
}
searchInput.onfocus=function(){
softkeyLeft.innerHTML="Cancel";
softkeyCenter.innerHTML="Search";
softkeyRight.innerHTML="";
};
function performSearch(){
var searchTerm=searchInput.value.trim().toLowerCase();
if(!searchTerm){
searchResults.style.display="none";
return;
}
var spinnerEl=document.getElementById("searchLoadingIndicator");
searchResults.innerHTML='<div class="search-loading-row"><div class="search-loading-spinner"></div><span>Searching...</span></div>';
searchResults.style.display="block";
if(spinnerEl)spinnerEl.style.display="block";
isSearching=true;
db.ref("presence1").once("value",function(snapshot){
var results=[];
var pending=[];
snapshot.forEach(function(childSnapshot){
var userUid=childSnapshot.key;
if(userUid===uid)return;
var userPresence=childSnapshot.val()||{};
var presenceName=(userPresence.username||"").toLowerCase();
if(presenceName.indexOf(searchTerm)===-1)return;
pending.push(
db.ref("profiles/"+userUid).once("value").then(function(profileSnap){
var profileData=profileSnap.val()||{};
results.push({
uid: userUid,
username: userPresence.username||profileData.username||"User",
online: !!userPresence.online,
profilePic: profileData.profilePic||userPresence.profilePic||null,
about: profileData.about||"Chit Chat contact"
});
}).catch(function(){
results.push({
uid: userUid,
username: userPresence.username||"User",
online: !!userPresence.online,
profilePic: userPresence.profilePic||null,
about: "Chit Chat contact"
});
})
);
});
Promise.all(pending).then(function(){
renderSearchResults(results);
});
if(pending.length===0){
renderSearchResults([]);
}
});
function renderSearchResults(rows){
if(spinnerEl)spinnerEl.style.display="none";
searchResults.innerHTML="";
if(rows.length===0){
searchResults.innerHTML='<div class="search-loading-row">No users found for "'+searchTerm+'"</div>';
searchResults.style.display="block";
isSearching=false;
return;
}
rows.sort(function(a,b){
if(a.online&&!b.online)return-1;
if(!a.online&&b.online)return 1;
return(a.username||"").localeCompare(b.username||"");
});
rows.forEach(function(user,index){
var item=document.createElement("div");
item.className="search-result-item navItem";
item.dataset.uid=user.uid;
item.tabIndex=20+index;
var container=document.createElement("div");
container.style.cssText="display:flex;align-items:center;gap:10px;width:100%;";
var profilePic=document.createElement("img");
profilePic.style.cssText="width:34px;height:34px;border-radius:50%;object-fit:cover;flex-shrink:0;border:1.5px solid #e0e0e0;";
profilePic.alt=user.username;
profilePic.onerror=function(){this.src="icons/default.png";};
if(user.profilePic){
profilePic.src=user.profilePic;
}else{
profilePic.src="icons/default.png";
}
var infoContainer=document.createElement("div");
infoContainer.style.cssText="flex:1;min-width:0;";
var nameSpan=document.createElement("div");
nameSpan.style.cssText="font-weight:bold;font-size:13px;color:#0D1B2A;";
nameSpan.innerHTML=user.username+(user.online ? '<span style="color:#00B4D8;font-size:10px;">● Online</span>' : '');
var aboutSpan=document.createElement("div");
aboutSpan.style.cssText="font-size:11px;color:#667781;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:160px;";
aboutSpan.textContent=(user.about||"").length>35 ? (user.about||"").substring(0,35)+"..." : (user.about||"");
infoContainer.appendChild(nameSpan);
infoContainer.appendChild(aboutSpan);
container.appendChild(profilePic);
container.appendChild(infoContainer);
item.appendChild(container);
item.onclick=function(){
isUserBlocked(uid,user.uid).then(function(blocked){
if(blocked){
showConfirmPrompt(user.username+" is blocked. Do you want to unblock?",function(confirmed){
if(confirmed){
unblockUser(uid,user.uid);
hideSearchBar();
openChat(user.uid);
}
});
}else{
hideSearchBar();
openChat(user.uid);
}
});
};
item.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();this.click();}
};
item.onfocus=function(){
softkeyLeft.innerHTML="Cancel";
softkeyCenter.innerHTML="Open";
softkeyRight.innerHTML="";
};
searchResults.appendChild(item);
});
searchResults.style.display="block";
setTimeout(function(){
var first=searchResults.querySelector(".search-result-item");
if(first)first.focus();
},100);
isSearching=false;
}
}
function addUserToPvtList(chatUid,username){
if(!uid||!chatUid)return;
var updates={};
updates["privateChats/"+uid+"/"+chatUid]={username: username||"User",lastMessage:"",timestamp: Date.now(),unreadCount: 0,online: false};
db.ref().update(updates);
rememberPrivateChat(chatUid,username,{online: false,timestamp: Date.now(),unreadCount: 0,lastMessage:""});
createChatElement(chatUid,username,false);
}
searchInput.addEventListener("input",function(){
});
searchInput.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
performSearch();
}
});
searchButton.onclick=function(){
performSearch();
};
function showDropdown(options,callback,selectedIndex){
// ── Route to Android bottom sheet for message options and user menu ──
var isReplyMenu=options.indexOf("Reply")!==-1||options.indexOf("Select Messages")!==-1||options.indexOf("React")!==-1;
var isUserMenu=options.indexOf("View Profile")!==-1&&options.indexOf("Block")!==-1;
if((isReplyMenu||isUserMenu)&&typeof showAndBottomSheet==="function"){
// Build icon map for common options
var iconMap={
"Reply":{icon:"↩️",sub:"Reply to this message"},
"Copy":{icon:"📋",sub:"Copy text"},
"Select Messages":{icon:"☑️",sub:"Select multiple"},
"Info":{icon:"ℹ️",sub:"Sent & seen time"},
"Edit":{icon:"✏️",sub:"Edit within 5 min"},
"Delete for Me":{icon:"🗑️",sub:"Remove for you",danger:true},
"Delete for Everyone":{icon:"❌",sub:"Remove for all",danger:true},
"Cancel Reply":{icon:"✕",sub:"Cancel current reply"},
"Mute":{icon:"🔕",sub:"Mute notifications"},
"Unmute":{icon:"🔔",sub:"Unmute notifications"},
"Fullscreen":{icon:"⛶",sub:"View full size"},
"Play":{icon:"▶️",sub:"Play audio"},
"React":{icon:"😊",sub:"Add reaction"},
"View Profile":{icon:"👤",sub:"See profile",arrow:true},
"Clear Chat":{icon:"🧹",sub:"Delete all messages",danger:true},
"Block":{icon:"🚫",sub:"Block this user",danger:true},
"Unmute (user)":{icon:"🔔",sub:""},
"Delete":{icon:"🗑️",sub:"Remove chat",danger:true},
"Settings":{icon:"⚙️",sub:"App settings",arrow:true},
"World Chat":{icon:"🌐",sub:"Open world chat",arrow:true},
"Group Chat":{icon:"👥",sub:"Open group chat",arrow:true},
"Search":{icon:"🔍",sub:"Search messages",arrow:true}
};
var items=options.map(function(opt,index){
var def=iconMap[opt]||{icon:"•",sub:""};
return {
icon:def.icon,label:opt,sublabel:def.sub,
danger:!!def.danger,arrow:!!def.arrow,
action:(function(i){return function(){callback(i);};})(index)
};
});
showAndBottomSheet(items);
return;
}
// ── Original dropdown for other menus (font, background, etc.) ──
dropdownMenu.innerHTML="";
dropdownMenu.style.cssText="display:none;";
isDropdownVisible=false;
lastFocusedElement=document.activeElement;
var isChatDrop=(options.length>=3&&options[0]==='Emoji');
var focusIndex=(typeof selectedIndex==="number") ? selectedIndex : 0;
if(options.indexOf("World Chat")!==-1)focusIndex=options.indexOf("World Chat");
if(options.indexOf("Reply")!==-1)focusIndex=options.indexOf("Reply");
if(isChatDrop&&options.indexOf("Emoji")!==-1)focusIndex=options.indexOf("Emoji");
var focusableItems=[];
if(isChatDrop){
var iconDefs=[
{emoji: '😊',label: 'Emoji',color: '#f5a623'},
{emoji: '📷',label: 'Photo',color: '#e91e8c'},
{emoji: '🎬',label: 'Video',color: '#673ab7'},
{emoji: '🎵',label: 'Music',color: '#00acc1'},
{emoji: '🎤',label: 'Voice',color: '#e53935'}
];
dropdownMenu.className="dropdown-menu grid-mode";
var joinedStyle=[
"display:grid",
"grid-template-columns:repeat(3,1fr)",
"gap:2px 2px",
"padding:6px 4px 4px",
"position:fixed",
"bottom:16px",
"left:8px",
"right:auto",
"top:auto",
"transform:none",
"width:160px",
"background:#fff",
"z-index:5001",
"border-radius:8px",
"box-shadow:0 6px 16px rgba(0,0,0,0.22)",
"border:2px solid #0077B6",
"border-left:2px solid #0077B6",
"box-sizing:border-box",
"max-height:58vh",
"overflow-y:auto",
"-webkit-overflow-scrolling:touch"
].join(";")+";";
dropdownMenu.style.cssText=joinedStyle;
for(var i=0;i<options.length;i++){
(function(index){
var def=iconDefs[index]||{emoji: '•',label: options[index],color: '#888'};
var item=document.createElement("div");
item.className="dropdown-item";
item.tabIndex=14+index;
item.style.cssText="display:flex;flex-direction:column;align-items:center;gap:2px;padding:5px 2px;cursor:pointer;background:transparent;outline:none;border:none;min-height:60px;";
var circle=document.createElement("div");
circle.style.cssText="width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;background:"+def.color+";box-shadow:0 1px 4px rgba(0,0,0,0.14);border:2px solid transparent;transition:transform 0.1s,border-color 0.1s;font-family:'Segoe UI Emoji','Apple Color Emoji',sans-serif;";
circle.textContent=def.emoji;
var lbl=document.createElement("div");
lbl.style.cssText="font-size:9.5px;color:#444;font-family:Poppins,Arial,sans-serif;font-weight:600;text-align:center;line-height:1;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:1px;";
lbl.textContent=def.label;
item.appendChild(circle);
item.appendChild(lbl);
item.onclick=function(ev){
if(ev){ev.preventDefault();ev.stopPropagation();}
callback(index);
};
item.onfocus=function(){circle.style.transform="scale(1.08)";circle.style.borderColor="#00B4D8";lbl.style.color="#0077B6";};
item.onblur=function(){circle.style.transform="scale(1)";circle.style.borderColor="transparent";lbl.style.color="#444";};
dropdownMenu.appendChild(item);
focusableItems[index]=item;
})(i);
}
dropdownMenu.style.display="grid";
}else{
dropdownMenu.className="dropdown-menu";
// "Chat list" menu = the main options menu opened from the chat list screen
// (always contains "World Chat"). Reply/message option menu = long-press
// options on a message (contains "Reply", "Select Messages", "React", etc).
var isChatListMenu=(options.indexOf("World Chat")!==-1);
var isReplyOptionsMenu=!isChatListMenu&&(options.indexOf("Reply")!==-1||options.indexOf("Select Messages")!==-1||options.indexOf("React")!==-1);
if(isChatListMenu){
// Compact footprint, positioned on the LEFT, larger text, guaranteed
// vertical scroll so ArrowDown never overlaps items.
dropdownMenu.style.cssText="display:block;position:fixed;bottom:16px;left:8px;right:auto;top:auto;transform:none;background:#fff;border-radius:8px;padding:0;box-shadow:0 6px 16px rgba(0,0,0,0.22);z-index:5001;width:140px;max-width:60%;overflow-y:auto;max-height:60vh;border:2px solid #0077B6;-webkit-overflow-scrolling:touch;scroll-behavior:smooth;box-sizing:border-box;";
}else if(isReplyOptionsMenu){
// Fixed-size container that always fits on-screen; scrolls internally
// if the option list is taller than the fixed height.
dropdownMenu.style.cssText="display:block;position:fixed;bottom:16px;right:8px;left:auto;top:auto;transform:none;background:#fff;border-radius:8px;padding:0;box-shadow:0 6px 16px rgba(0,0,0,0.22);z-index:5001;width:168px;height:auto;max-height:208px;overflow-y:auto;border:2px solid #0077B6;-webkit-overflow-scrolling:touch;box-sizing:border-box;";
}else{
// Settings/options menu — positioned on the LEFT (was on the right).
// Width matches the compact chat-list/reply option menus instead of
// stretching almost across the whole screen.
dropdownMenu.style.cssText="display:block;position:fixed;bottom:16px;left:8px;right:auto;top:auto;transform:none;background:#fff;border-radius:6px;padding:0;box-shadow:0 6px 16px rgba(0,0,0,0.22);z-index:5001;width:150px;overflow-y:auto;max-height:58vh;border:2px solid #0077B6;-webkit-overflow-scrolling:touch;box-sizing:border-box;";
}
var listFontSize=isChatListMenu ? "14px" : "13px";
var listMinHeight=isChatListMenu ? "38px" : "38px";
var listPadding=isChatListMenu ? "0 10px" : "0 10px";
for(var i=0;i<options.length;i++){
(function(index){
var item=document.createElement("div");
item.className="dropdown-item";
item.tabIndex=14+index;
var isSelected=(typeof selectedIndex!=="undefined"&&selectedIndex!==null&&index===selectedIndex);
var baseBg=isSelected ? "#EFF9FF" : "transparent";
var baseColor=isSelected ? "#00B4D8" : "#0D1B2A";
var baseWeight=isSelected ? "700" : "400";
var baseBorder=isSelected ? "#00B4D8" : "transparent";
item.style.cssText="min-height:"+listMinHeight+";padding:"+listPadding+";font-size:"+listFontSize+";color:"+baseColor+";display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ddd;font-family:Arial,sans-serif;cursor:pointer;background:"+baseBg+";font-weight:"+baseWeight+";border-left:0 solid "+baseBorder+";box-sizing:border-box;";
var txt=document.createElement("span");
txt.textContent=options[index];
item.appendChild(txt);
item.onclick=function(ev){
if(ev){
ev.preventDefault();
ev.stopPropagation();
}
callback(index);
};
item.onfocus=function(){
item.style.background="#0077B6";
item.style.color="#fff";
item.style.fontWeight="700";
try{item.scrollIntoView({block: "nearest",behavior: "smooth"});}catch(e){try{item.scrollIntoView({block: "nearest"});}catch(e2){}}
};
item.onblur=function(){
item.style.background=baseBg;
item.style.color=baseColor;
item.style.fontWeight=baseWeight;
item.style.borderLeft="0 solid "+baseBorder;
};
dropdownMenu.appendChild(item);
focusableItems[index]=item;
})(i);
}
dropdownMenu.style.display="block";
}
isDropdownVisible=true;
dropdownMenu.scrollTop=0;
try{(focusableItems[focusIndex]||focusableItems[0]||dropdownMenu.children[0]).focus();}catch(ex){}
}
function hideDropdown(restoreFocus){
if(restoreFocus===undefined)restoreFocus=true;
// Fully clear dropdown — remove backdrop-filter if any was set
dropdownMenu.style.cssText="display:none;backdrop-filter:none;-webkit-backdrop-filter:none;";
dropdownMenu.className="dropdown-menu";
isDropdownVisible=false;
dropdownMenu.innerHTML="";
// Remove any stale overlay divs that could leave blur residue
var staleOverlays=document.querySelectorAll(".dropdown-blur-overlay,.modal-blur-overlay");
staleOverlays.forEach(function(el){if(el.parentNode)el.parentNode.removeChild(el);});
if(restoreFocus){
try{
if(lastFocusedElement&&document.contains(lastFocusedElement)){
lastFocusedElement.focus();
}
}catch(ex){}
}
}
function showProfileView(profileUid){
hideDropdown();
viewingProfileUid=profileUid;
profileViewContainer.style.display="flex";
profileViewContainer.style.zIndex="10000";
profileViewContainer.scrollTop=0;
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softKeysContainer.style.display="block";
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Open";
softkeyRight.innerHTML="";
if(profileBackButton)profileBackButton.style.display="none";
if(profileBackButton)profileBackButton.tabIndex=0;
profileImageView.src="icons/default.png";
profileImageView.tabIndex=0;
profileAboutText.style.fontSize="11px";
profileAboutText.style.color="#667781";
profileAboutText.style.margin="2px 0 6px 0";
// Show whatever we already know instantly so the page is never blank while
// waiting on the network, then refresh from Firebase in the background.
var cachedInfo=null;
try{
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(localChats[profileUid])cachedInfo=localChats[profileUid];
}catch(e){}
var fallbackName=(cachedInfo&&cachedInfo.username)||profileUid.substring(0,8);
profileNameText.textContent=fallbackName;
profileAboutText.textContent="Hey there!I'm using Chit Chat";
loadProfilePicture(profileUid,profileImageView,fallbackName);
setTimeout(function(){profileImageView.focus();},150);
db.ref("profiles/"+profileUid).once("value",function(snapshot){
var profileData=snapshot.val();
var displayName=(profileData&&profileData.username)? profileData.username : fallbackName;
profileNameText.textContent=displayName;
loadProfilePicture(profileUid,profileImageView,displayName);
var aboutText=(profileData&&profileData.about)? profileData.about : "Hey there!I'm using Chit Chat";
profileAboutText.textContent=aboutText;
}).catch(function(){});
function openProfilePicFullscreen(){
var existing=document.getElementById("profilePicFullscreen");
if(existing)existing.remove();
var overlay=document.createElement("div");
overlay.id="profilePicFullscreen";
overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:#000;z-index:99999;display:flex;align-items:center;justify-content:center;";
var bigImg=document.createElement("img");
bigImg.src=profileImageView.src;
bigImg.style.cssText="max-width:100%;max-height:100%;object-fit:contain;";
overlay.appendChild(bigImg);
document.body.appendChild(overlay);
overlay.tabIndex=0;
setTimeout(function(){overlay.focus();},50);
function closeOverlay(){overlay.remove();profileImageView.focus();}
overlay.addEventListener("keydown",function(e){e.preventDefault();closeOverlay();});
overlay.addEventListener("click",closeOverlay);
}
profileImageView.addEventListener("keydown",function handler(e){
if(profileViewContainer.style.display!=="flex"){
profileImageView.removeEventListener("keydown",handler);
return;
}
if(e.key==="Enter"||e.key==="SoftCenter"){
e.preventDefault();
openProfilePicFullscreen();
}
});
profileImageView.addEventListener("click",function(){openProfilePicFullscreen();});
profileViewContainer._openFullscreen=openProfilePicFullscreen;
}
function hideProfileView(){
profileViewContainer.style.display="none";
mainPage.classList.add("active");
setTimeout(function(){
focusPrivateChatsLanding();
},1000);
}
function showProfileEdit(){
hideDropdown();
profileEditContainer.style.display="flex";
profileEditContainer.style.zIndex="10000";
profileEditContainer.scrollTop=0;
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softKeysContainer.style.display="block";
softkeyLeft.innerHTML="Cancel";
softkeyRight.innerHTML="Save";
var currentUsername=localStorage.getItem("username")||"User";
document.getElementById("profileNameEdit").textContent=currentUsername;
profileImageEdit.src="icons/default.png";
profileAboutInput.value="";
// Focus immediately so the page is usable even if the network fetch below
// is slow or fails (previously this only ran inside the fetch callback).
setTimeout(function(){changeProfilePicButton.focus();},100);
db.ref("profiles/"+uid).once("value",function(snapshot){
var profileData=snapshot.val();
if(profileData){
if(profileData.profilePic){
profileImageEdit.src=profileData.profilePic;
}
if(profileData.about){
profileAboutInput.value=profileData.about;
}
}
}).catch(function(){});
}
function hideProfileEdit(){
profileEditContainer.style.display="none";
mainPage.classList.add("active");
setTimeout(function(){
focusPrivateChatsLanding();
},1000);
}
function saveProfile(){
var aboutText=profileAboutInput.value.trim();
var currentUsername=localStorage.getItem("username")||"User";
db.ref("profiles/"+uid).update({
username: currentUsername,
about: aboutText,
profilePic: profileImageEdit.src,
spamProtection: spamProtection,
lastUpdated: Date.now()
}).then(function(){
db.ref("users/"+uid).update({
username: currentUsername,
about: aboutText,
profilePic: profileImageEdit.src,
lastSeen: Date.now()
});
showNotification("Profile updated successfully!");
hideProfileEdit();
localStorage.setItem("username",currentUsername);
}).catch(function(error){
showNotification("Failed to update profile: "+error.message);
});
}
function changeProfilePicture(){
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({
name: "pick",
data:{
type:["image/*"]
}
});
activity.onsuccess=function(){
var file=this.result.blob;
if(file){
showNotification("Processing image...");
var reader=new FileReader();
reader.onload=function(e){
var base64Image=e.target.result;
compressImageForFirebase(base64Image,function(compressedBase64){
db.ref("profiles/"+uid).update({
profilePic: compressedBase64,
lastUpdated: Date.now()
}).then(function(){
localStorage.setItem("profilePic_"+uid,compressedBase64);
profileImageEdit.src=compressedBase64;
showNotification("Profile picture updated successfully!");
}).catch(function(error){
localStorage.setItem("profilePic_"+uid,base64Image);
profileImageEdit.src=base64Image;
showNotification("Profile picture saved locally.");
});
});
};
reader.onerror=function(){
showNotification("Failed to process image.");
};
reader.readAsDataURL(file);
}else{
showNotification("No image selected.");
}
};
activity.onerror=function(){
showNotification("Unable to pick a profile picture.");
};
}else{
var input=document.createElement("input");
input.type="file";
input.accept="image/*";
input.onchange=function(e){
var file=e.target.files[0];
if(file){
var reader=new FileReader();
reader.onload=function(e){
var base64Image=e.target.result;
compressImageForFirebase(base64Image,function(compressedBase64){
db.ref("profiles/"+uid).update({
profilePic: compressedBase64,
lastUpdated: Date.now()
}).then(function(){
localStorage.setItem("profilePic_"+uid,compressedBase64);
profileImageEdit.src=compressedBase64;
showNotification("Profile picture updated!");
}).catch(function(error){
localStorage.setItem("profilePic_"+uid,base64Image);
profileImageEdit.src=base64Image;
showNotification("Profile picture saved locally.");
});
});
};
reader.readAsDataURL(file);
}
};
input.click();
}
}
function compressImageForFirebase(base64Image,callback){
var img=new Image();
img.onload=function(){
var canvas=document.createElement('canvas');
var ctx=canvas.getContext('2d');
var MAX_WIDTH=200;
var MAX_HEIGHT=200;
var width=img.width;
var height=img.height;
if(width>height){
if(width>MAX_WIDTH){
height*=MAX_WIDTH/width;
width=MAX_WIDTH;
}
}else{
if(height>MAX_HEIGHT){
width*=MAX_HEIGHT/height;
height=MAX_HEIGHT;
}
}
canvas.width=width;
canvas.height=height;
ctx.drawImage(img,0,0,width,height);
var compressedBase64=canvas.toDataURL('image/jpeg',0.7);
var size=compressedBase64.length*0.75;
if(size>900000){
canvas.toDataURL('image/jpeg',0.5);
}
callback(compressedBase64);
};
img.src=base64Image;
}
// Profile pic fetch TTL — re-fetch from Firebase once per session per user
// (not on every render). This alone can cut 50-80% of profile-related reads.
var _profilePicFetchedThisSession={};
function loadProfilePicture(userUid,imgElement,username){
var defaultPic="icons/default.png";
imgElement.onerror=function(){this.src=defaultPic;};
function rememberProfilePicForChatList(picData){
if(!userUid||!picData)return;
try{localStorage.setItem("profilePic_"+userUid,picData);}catch(e){}
try{
var chats=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(chats[userUid]){
chats[userUid].profilePic=picData;
localStorage.setItem("privateChats",JSON.stringify(chats));
if(typeof window.idbSet==="function")window.idbSet("privateChatsIndex",chats);
}
}catch(e){}
}
function setPic(picData){
if(!picData)return;
imgElement.src=picData;
rememberProfilePicForChatList(picData);
}
// 1. Try localStorage first (fastest, zero network)
var localPic=null;
try{
localPic=localStorage.getItem("profilePic_"+userUid);
if(!localPic){
var privateChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
localPic=privateChats[userUid]&&privateChats[userUid].profilePic;
}
if(localPic)setPic(localPic);
}catch(e){}
// 2. Try IDB (slightly slower, also local)
if(typeof window.idbGet==="function"){
window.idbGet("privateChatsIndex",function(cacheMap){
var idbPic=cacheMap&&cacheMap[userUid]&&cacheMap[userUid].profilePic;
if(idbPic&&!localPic)setPic(idbPic);
});
}
// 3. Only go to Firebase if: (a) no local cache, OR (b) not yet fetched this session
// This prevents re-fetching the same pic on every re-render / scroll
if(localPic&&_profilePicFetchedThisSession[userUid]){
return; // Already have it locally and fetched once this session — skip Firebase
}
_profilePicFetchedThisSession[userUid]=true;
db.ref("profiles/"+userUid+"/profilePic").once("value",function(snapshot){
var picData=snapshot.val();
if(picData){setPic(picData);return;}
db.ref("users/"+userUid+"/profilePic").once("value",function(s2){
var picData2=s2.val();
if(picData2){setPic(picData2);return;}
if(!imgElement.src||imgElement.src.indexOf("default")===-1)imgElement.src=defaultPic;
});
},function(){
if(!imgElement.src)imgElement.src=defaultPic;
});
}
function loadStatuses(){
var now=Date.now();
var DAY=24*60*60*1000;
function fetchAndRender(){
db.ref("statuses").once("value",function(snapshot){
userStatuses={};
var myPrivacy=_statusPrivacyCache||{type: "contacts",list:[]};
snapshot.forEach(function(childSnapshot){
var statusUid=childSnapshot.key;
if(statusUid===uid){userStatuses[statusUid]=childSnapshot.val();return;}
var statusData=childSnapshot.val();
var priv=statusData._privacy||{type: "contacts",list:[]};
var allowed=false;
var myContacts={};
if(window.allPrivateChats&&window.allPrivateChats.length>0){
window.allPrivateChats.forEach(function(c){myContacts[c.uid]=true;});
}else{
try{
var cc=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
cc.forEach(function(c){myContacts[c.uid]=true;});
}catch(e){}
}
if(priv.type==="contacts"){
allowed=!!myContacts[statusUid];
}else if(priv.type==="except"){
allowed=!!myContacts[statusUid]&&(priv.list||[]).indexOf(uid)===-1;
}else if(priv.type==="only"){
allowed=(priv.list||[]).indexOf(uid)!==-1;
}else{
allowed=true;
}
if(!allowed)return;
if(statusData.statuses){
var valid=statusData.statuses.filter(function(s){return now-s.timestamp<DAY;});
if(valid.length===0){db.ref("statuses/"+statusUid).remove();return;}
if(valid.length!==statusData.statuses.length)db.ref("statuses/"+statusUid+"/statuses").set(valid);
userStatuses[statusUid]=statusData;
}else if(statusData.timestamp){
if(now-statusData.timestamp>DAY){db.ref("statuses/"+statusUid).remove();return;}
userStatuses[statusUid]=statusData;
}
});
var userElements=document.querySelectorAll(".user.navItem[data-uid]");
userElements.forEach(function(el){
var si=el.querySelector(".status-indicator");
if(si)si.style.display="none";
});
document.querySelectorAll(".status-list-item").forEach(function(item){
if(!userStatuses[item.dataset.uid])item.remove();
});
});
}
fetchAndRender();
if(!window._statusRefreshInterval){
window._statusRefreshInterval=setInterval(fetchAndRender,2*60*1000);
}
}
function showStatusAdd(){
hideDropdown();
statusAddContainer.style.display="flex";
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softKeysContainer.style.display="block";
softkeyLeft.innerHTML="Back";
softkeyRight.innerHTML="";
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusNextButton.style.display="none";
var existingElements=statusAddContainer.querySelectorAll(
".status-timestamp,.status-views,.status-type-buttons,.status-buttons-container"
);
existingElements.forEach(function(el){el.remove();});
if(!statusAddContainer.contains(statusDeleteButton)){
statusAddContainer.appendChild(statusDeleteButton);
}
db.ref("statuses/"+uid).once("value",function(snapshot){
if(!snapshot.exists()){
statusDeleteButton.style.display="none";
showStatusTypeSelection();
}else{
var statusData=snapshot.val();
userStatusArray=[];
if(statusData.type&&(statusData.type==="image"||statusData.type==="text"||statusData.type==="video")){
userStatusArray=[statusData];
}else if(statusData.statuses){
userStatusArray=statusData.statuses
.filter(function(status){return Date.now()-status.timestamp<24*60*60*1000;})
.sort(function(a,b){return a.timestamp-b.timestamp;});
}
if(userStatusArray.length===0){
showStatusTypeSelection();
return;
}
statusDeleteButton.style.display="block";
currentStatusIndex=0;
var currentStatus=userStatusArray[currentStatusIndex];
if(currentStatus.type==="image"){
statusImagePreview.src=currentStatus.content;
statusImagePreview.style.display="block";
}else if(currentStatus.type==="text"){
statusTextInput.style.display="block";
statusTextInput.value=currentStatus.content;
statusTextInput.disabled=true;
}else if(currentStatus.type==="video"){
var svp=document.getElementById("statusVideoPreview");
if(svp){
svp.src=currentStatus.content;
svp.style.display="block";
svp.style.maxWidth="100%";
svp.style.maxHeight="35vh";
svp.controls=true;
svp.playsinline=true;
setTimeout(function(){
var pp=svp.play();
if(pp!==undefined)pp.catch(function(){});
},300);
}
}
var oldBtns=statusAddContainer.querySelectorAll(".status-buttons-container");
oldBtns.forEach(function(el){el.remove();});
var timestampDiv=document.createElement("div");
timestampDiv.className="status-timestamp";
timestampDiv.textContent="Posted "+formatStatusTime(currentStatus.timestamp);
statusAddContainer.appendChild(timestampDiv);
var buttonsContainer=document.createElement("div");
buttonsContainer.className="status-buttons-container";
buttonsContainer.style.cssText="display:flex;flex-direction:column;gap:10px;width:100%;padding:0 10px;box-sizing:border-box;margin-top:8px;";
statusAddContainer.appendChild(buttonsContainer);
statusDeleteButton.style.display="block";
buttonsContainer.appendChild(statusDeleteButton);
db.ref("statusViews/"+uid+"/"+currentStatus.timestamp).once("value",function(viewsSnap){
var viewsCount=viewsSnap.exists()? Object.keys(viewsSnap.val()).length : 0;
var oldViewsDiv=statusAddContainer.querySelector(".status-views");
if(oldViewsDiv)oldViewsDiv.remove();
var viewsDiv=document.createElement("div");
viewsDiv.className="status-views";
viewsDiv.innerHTML="<span>Views: "+viewsCount+"</span>";
statusAddContainer.insertBefore(viewsDiv,buttonsContainer);
if(viewsCount>0){
var viewButton=document.createElement("button");
viewButton.className="navItem view-who-saw-button";
viewButton.textContent="View Who Saw";
viewButton.tabIndex=22;
viewButton.onclick=function(){
viewButton.textContent="";
viewButton.disabled=true;
var spinner=document.createElement("span");
spinner.style.cssText="display:inline-block;width:14px;height:14px;border:2px solid #fff;border-top-color:transparent;border-radius:50%;animation:spin 0.7s linear infinite;vertical-align:middle;margin-right:6px;";
viewButton.appendChild(spinner);
viewButton.appendChild(document.createTextNode(" Loading..."));
showStatusViewers(currentStatus.timestamp,function(){
viewButton.disabled=false;
viewButton.textContent="View Who Saw";
});
};
buttonsContainer.appendChild(viewButton);
}
if(userStatusArray.length>1){
statusNextButton.style.display="block";
if(!buttonsContainer.contains(statusNextButton)){
buttonsContainer.appendChild(statusNextButton);
}
softkeyRight.innerHTML="Next";
}else{
softkeyRight.innerHTML="New Status";
}
setTimeout(function(){statusDeleteButton.focus();},100);
});
}
});
}
function showStatusTypeSelection(){
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusSaveButton.disabled=false;
statusSaveButton.textContent="💾 Save";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
var existingElements=statusAddContainer.querySelectorAll(
".status-timestamp,.status-views,.status-type-buttons"
);
existingElements.forEach(function(el){el.remove();});
var statusTypeButtons=document.createElement("div");
statusTypeButtons.className="status-type-buttons";
statusTypeButtons.style.display="flex";
statusTypeButtons.style.flexDirection="column";
statusTypeButtons.style.gap="10px";
var mediaButton=document.createElement("button");
mediaButton.className="navItem";
mediaButton.textContent="Media(Image/Video)";
mediaButton.tabIndex=21;
mediaButton.style.cssText="width:90%;margin:4px auto;padding:12px 16px;font-size:14px;font-weight:bold;background:linear-gradient(135deg,#0077B6,#0077B6);color:#fff;border:none;border-radius:12px;cursor:pointer;text-align:left;letter-spacing:0.2px;display:block;";
var textButton=document.createElement("button");
textButton.className="navItem";
textButton.textContent="Text";
textButton.tabIndex=22;
textButton.style.cssText="width:90%;margin:4px auto;padding:12px 16px;font-size:14px;font-weight:bold;background:linear-gradient(135deg,#1565c0,#1976d2);color:#fff;border:none;border-radius:12px;cursor:pointer;text-align:left;letter-spacing:0.2px;display:block;";
statusTypeButtons.appendChild(mediaButton);
statusTypeButtons.appendChild(textButton);
statusAddContainer.appendChild(statusTypeButtons);
setTimeout(function(){mediaButton.focus();},100);
mediaButton.onclick=function(){
statusTypeButtons.remove();
selectStatusMedia();
};
textButton.onclick=function(){
statusTypeButtons.remove();
showTextStatusInput();
};
mediaButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
mediaButton.click();
}else if(e.key==="ArrowDown"){
textButton.focus();
}
};
textButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
textButton.click();
}else if(e.key==="ArrowUp"){
mediaButton.focus();
}
};
}
function selectStatusImage(){selectStatusMedia();}
function selectStatusMedia(){
var statusVideoPreview=document.getElementById("statusVideoPreview");
function processImageFile(file){
statusImagePreview.style.display="block";
statusImagePreview.src="";
statusImagePreview.alt="Processing...";
if(statusVideoPreview){statusVideoPreview.style.display="none";statusVideoPreview.src="";}
var reader=new FileReader();
reader.onload=function(e){
var orig=e.target.result;
var img=new Image();
img.onload=function(){
var canvas=document.createElement("canvas");
var ctx=canvas.getContext("2d");
var MAX=600;
var w=img.width,h=img.height;
if(w>h){if(w>MAX){h=h*MAX/w;w=MAX;}}
else{if(h>MAX){w=w*MAX/h;h=MAX;}}
canvas.width=w;canvas.height=h;
ctx.drawImage(img,0,0,w,h);
var quality=0.8;
var base64=canvas.toDataURL("image/jpeg",quality);
while(base64.length>900000&&quality>0.2){quality-=0.1;base64=canvas.toDataURL("image/jpeg",quality);}
statusImagePreview.src=base64;
statusImagePreview.alt="";
statusImagePreview.style.display="block";
statusTextInput.style.display="none";
statusSaveButton.style.display="block";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
statusAddContainer.dataset.pendingType="image";
statusAddContainer.dataset.pendingContent=base64;
setTimeout(function(){statusSaveButton.focus();},100);
};
img.onerror=function(){showNotification("Failed to load image.");showStatusTypeSelection();};
img.src=orig;
};
reader.onerror=function(){showNotification("Failed to read image.");showStatusTypeSelection();};
reader.readAsDataURL(file);
}
function processVideoFile(file){
if(file.size>50*1024*1024){showNotification("Video too large!Max 50MB.");showStatusTypeSelection();return;}
statusImagePreview.style.display="none";
if(!statusVideoPreview){showNotification("Video preview not supported.");return;}
var uploadWrap=document.createElement("div");
uploadWrap.id="statusUploadProgress";
uploadWrap.style.cssText="padding:12px;text-align:center;";
uploadWrap.innerHTML='<div style="color:#fff;font-size:12px;margin-bottom:8px;">🎬 Uploading video...</div>'
+'<div style="background:#333;border-radius:4px;height:6px;overflow:hidden;"><div id="statusUpBar" style="background:#00B4D8;height:100%;width:0%;transition:width 0.2s;"></div></div>'
+'<div id="statusUpPct" style="color:#aaa;font-size:11px;margin-top:4px;">0%</div>';
statusAddContainer.appendChild(uploadWrap);
statusSaveButton.style.display="none";
// Uses the same safe upload path as chat (multi-cloud fallback + stall watchdog)
// instead of a raw XHR with undefined CLOUDINARY_API_URL — that was the bug
// causing the progress bar to stay stuck at 0%.
uploadFileToCloudinary(
file,
function(pct){
var bar=document.getElementById("statusUpBar");
var pctEl=document.getElementById("statusUpPct");
if(bar)bar.style.width=pct+"%";
if(pctEl)pctEl.textContent=pct+"%";
},
function(url){
var upWrap=document.getElementById("statusUploadProgress");
if(upWrap)upWrap.remove();
statusVideoPreview.src=url;
statusVideoPreview.style.display="block";
statusTextInput.style.display="none";
statusSaveButton.style.display="block";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
statusAddContainer.dataset.pendingType="video";
statusAddContainer.dataset.pendingContent=url;
setTimeout(function(){statusSaveButton.focus();},100);
},
function(err){
var upWrap=document.getElementById("statusUploadProgress");
if(upWrap)upWrap.remove();
showNotification("Failed to upload video.");
showStatusTypeSelection();
}
);
}
if(typeof MozActivity!=='undefined'){
var activity=new MozActivity({name: "pick",data:{type:["image/*","video/*"]}});
activity.onsuccess=function(){
var file=this.result.blob;
if(!file){showNotification("No file selected.");showStatusTypeSelection();return;}
if(file.type.startsWith("video/")){processVideoFile(file);}
else{processImageFile(file);}
};
activity.onerror=function(){showNotification("Unable to pick media.");showStatusTypeSelection();};
}else{
var input=document.createElement("input");
input.type="file";
input.accept="image/*,video/*";
input.onchange=function(e){
var file=e.target.files[0];
if(!file){showNotification("No file selected.");showStatusTypeSelection();return;}
if(file.type.startsWith("video/")){processVideoFile(file);}
else{processImageFile(file);}
};
input.click();
}
}
function showTextStatusInput(){
statusImagePreview.style.display="none";
statusTextInput.style.display="block";
statusTextInput.value="";
statusTextInput.disabled=false;
statusSaveButton.style.display="block";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
softkeyLeft.innerHTML="Back";
softkeyRight.innerHTML="Save";
setTimeout(function(){
statusTextInput.focus();
},100);
statusTextInput.onkeydown=function(e){
if(e.key==="ArrowDown"){
statusSaveButton.focus();
}else if(e.key==="Enter"&&e.ctrlKey){
e.preventDefault();
saveStatus();
}
};
statusSaveButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
saveStatus();
}else if(e.key==="ArrowUp"){
statusTextInput.focus();
}
};
}
function saveStatus(){
if(statusSaveButton.disabled)return;
statusSaveButton.disabled=true;
statusSaveButton.textContent="Saving...";
var statusData={};
var statusVideoPreview=document.getElementById("statusVideoPreview");
var pendingType=statusAddContainer.dataset.pendingType||"";
var pendingContent=statusAddContainer.dataset.pendingContent||"";
if(pendingType==="video"&&pendingContent){
statusData={
type: "video",
content: pendingContent,
timestamp: Date.now(),
expiresAt: Date.now()+24*60*60*1000,
};
}else if(pendingType==="image"&&pendingContent){
statusData={
type: "image",
content: pendingContent,
timestamp: Date.now(),
expiresAt: Date.now()+24*60*60*1000,
};
}else if(statusImagePreview.style.display==="block"&&statusImagePreview.src&&statusImagePreview.src!==window.location.href){
statusData={
type: "image",
content: statusImagePreview.src,
timestamp: Date.now(),
expiresAt: Date.now()+24*60*60*1000,
};
}else if(statusTextInput.style.display==="block"&&statusTextInput.value.trim()){
statusData={
type: "text",
content: statusTextInput.value.trim(),
timestamp: Date.now(),
expiresAt: Date.now()+24*60*60*1000,
};
}else{
showNotification("Please select a status type and content.");
return;
}
db.ref("statuses/"+uid).once("value",function(snapshot){
var currentStatus=snapshot.val();
var newStatusData;
if(!currentStatus){
newStatusData=statusData;
}else{
var existingStatuses=[];
if(currentStatus.type&&(currentStatus.type==="image"||currentStatus.type==="text"||currentStatus.type==="video")){
existingStatuses=[currentStatus];
}else if(currentStatus.statuses){
existingStatuses=currentStatus.statuses.filter(function(s){
return Date.now()-s.timestamp<24*60*60*1000;
});
}
existingStatuses.push(statusData);
newStatusData={
type: "multiple",
statuses: existingStatuses,
timestamp: Date.now(),
};
}
db.ref("statuses/"+uid)
.set(Object.assign({},newStatusData,{_privacy: _statusPrivacyCache||{type: "contacts",list:[]}}))
.then(function(){
hideStatusAdd();
})
.catch(function(error){
showNotification("Failed to update status: "+error.message);
statusSaveButton.disabled=false;
statusSaveButton.textContent="💾 Save";
});
});
}
function hideStatusAdd(){
statusAddContainer.style.display="none";
statusSaveButton.disabled=false;
statusSaveButton.textContent="💾 Save";
statusAddContainer.dataset.pendingType="";
statusAddContainer.dataset.pendingContent="";
var svp=document.getElementById("statusVideoPreview");
if(svp){svp.style.display="none";svp.src="";}
mainPage.classList.add("active");
softKeysContainer.style.display="block";
if(currentMainTab==='status'){
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Add";
softkeyRight.innerHTML="";
switchMainTab('status');
}else{
softkeyLeft.innerHTML="Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML="";
setTimeout(function(){focusPrivateChatsLanding();},100);
}
}
function deleteStatus(){
showConfirmPrompt("Delete this status?",function(confirmed){
if(!confirmed)return;
statusDeleteButton.textContent="Deleting...";
statusDeleteButton.disabled=true;
var currentStatusData=userStatusArray[currentStatusIndex];
var timestampToDelete=currentStatusData.timestamp;
db.ref("statusViews/"+uid+"/"+timestampToDelete).remove();
db.ref("statuses/"+uid).once("value",function(snapshot){
var statusData=snapshot.val();
if(!statusData){
statusDeleteButton.textContent="Delete";
statusDeleteButton.disabled=false;
return;
}
function afterDelete(){
statusDeleteButton.textContent="Delete";
statusDeleteButton.disabled=false;
showNotification("Status deleted!");
userStatusArray.splice(currentStatusIndex,1);
currentStatusIndex=Math.max(0,currentStatusIndex-1);
if(userStatusArray.length===0){
showStatusTypeSelection();
}else{
displayCurrentStatusInAdd();
}
}
if(statusData.type&&(statusData.type==="image"||statusData.type==="text"||statusData.type==="video")){
db.ref("statuses/"+uid).remove().then(afterDelete).catch(function(e){
showNotification("Failed: "+e.message);
statusDeleteButton.textContent="Delete";
statusDeleteButton.disabled=false;
});
}else if(statusData.statuses){
var updated=statusData.statuses.filter(function(_,i){return i!==currentStatusIndex;});
if(updated.length===0){
db.ref("statuses/"+uid).remove().then(afterDelete).catch(function(e){
showNotification("Failed: "+e.message);
statusDeleteButton.textContent="Delete";
statusDeleteButton.disabled=false;
});
}else{
var newData=updated.length===1 ? updated[0]:{type: "multiple",statuses: updated,timestamp: updated[updated.length-1].timestamp};
db.ref("statuses/"+uid).set(newData).then(afterDelete).catch(function(e){
showNotification("Failed: "+e.message);
statusDeleteButton.textContent="Delete";
statusDeleteButton.disabled=false;
});
}
}
});
});
}
function showStatusView(statusUid){
hideDropdown();
currentStatusViewUid=statusUid;
var oldVids=statusViewContainer.querySelectorAll("video");
oldVids.forEach(function(v){try{v.pause();v.src="";}catch(e){}});
statusViewContainer.style.display="flex";
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softKeysContainer.style.display="block";
if(statusBackButton)statusBackButton.style.display="none";
var tabBarEl=document.getElementById("mainTabBar");
if(tabBarEl)tabBarEl.style.display="none";
var toRemove=statusViewContainer.querySelectorAll(".status-header,.text-status,.status-timestamp,.status-views,.status-video-view");
toRemove.forEach(function(el){el.remove();});
statusImageView.style.display="none";
statusImageView.src="";
db.ref("profiles/"+statusUid).once("value",function(profileSnap){
var existingHeaders=statusViewContainer.querySelectorAll(".status-header");
existingHeaders.forEach(function(el){el.remove();});
var profileData=profileSnap.val();
var header=document.createElement("div");
header.className="status-header";
var profilePic=document.createElement("img");
profilePic.className="status-profile-pic";
profilePic.src=profileData&&profileData.profilePic ? profileData.profilePic : "icons/default.png";
profilePic.alt="Profile";
var nameSpan=document.createElement("span");
nameSpan.className="status-profile-name";
nameSpan.textContent=profileData&&profileData.username ? profileData.username : "User";
header.appendChild(profilePic);
header.appendChild(nameSpan);
statusViewContainer.insertBefore(header,statusViewContainer.firstChild);
});
db.ref("statuses/"+statusUid).once("value",function(snapshot){
userStatusArray=[];
if(snapshot.exists()){
var statusData=snapshot.val();
if(statusData.type&&(statusData.type==="image"||statusData.type==="text"||statusData.type==="video")){
userStatusArray.push(statusData);
}else if(statusData.statuses){
userStatusArray=statusData.statuses.filter(function(s){
return Date.now()-s.timestamp<24*60*60*1000;
});
}
}
if(userStatusArray.length===0){
showNotification("No status available");
hideStatusView();
return;
}
currentStatusIndex=0;
displayCurrentStatus();
softkeyLeft.innerHTML="Back";
softkeyRight.innerHTML=userStatusArray.length>1 ? "Next" : "";
statusFooter.style.display=statusUid===uid ? "flex" : "none";
var replyRow=document.getElementById("statusReplyRow");
var statusLikeBtn=document.getElementById("statusLikeBtn");
var statusReplyInput=document.getElementById("statusReplyInput");
if(statusUid!==uid){
replyRow.style.display="flex";
softkeyCenter.innerHTML="Send";
db.ref("statusLikes/"+statusUid+"/"+userStatusArray[currentStatusIndex].timestamp+"/"+uid).once("value",function(likeSnap){
var svgIcon=document.getElementById("likeIconSvg");
if(svgIcon)svgIcon.style.fill=likeSnap.exists()? "#e74c3c" : "#00B4D8";
});
statusLikeBtn.onclick=function(){
var ts=userStatusArray[currentStatusIndex].timestamp;
var likeRef=db.ref("statusLikes/"+statusUid+"/"+ts+"/"+uid);
var svgIcon=document.getElementById("likeIconSvg");
likeRef.once("value",function(snap){
if(snap.exists()){
likeRef.remove();
if(svgIcon)svgIcon.style.fill="#00B4D8";
}else{
likeRef.set(Date.now());
if(svgIcon)svgIcon.style.fill="#e74c3c";
}
});
};
setTimeout(function(){statusReplyInput.focus();},200);
statusReplyInput.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
if(statusReplyInFlight)return;
sendStatusReply(statusUid,statusReplyInput.value.trim());
}
};
}else{
replyRow.style.display="none";
softkeyCenter.innerHTML="";
}
if(statusUid!==uid){
recordStatusView(statusUid,userStatusArray[currentStatusIndex].timestamp);
}
if(statusUid===uid){
setTimeout(function(){
if(statusImageView&&statusImageView.style.display!=="none")statusImageView.focus();
else if(statusViewsButton&&statusViewsButton.style.display!=="none")statusViewsButton.focus();
else if(statusNextButton&&statusNextButton.style.display!=="none")statusNextButton.focus();
},100);
}else{
setTimeout(function(){
if(statusReplyInput)statusReplyInput.focus();
},200);
}
});
}
function displayCurrentStatus(){
statusImageView.style.display="none";
statusImageView.src="";
var toRemove=statusViewContainer.querySelectorAll(".text-status,.status-timestamp,.status-views,.status-video-view");
toRemove.forEach(function(el){el.remove();});
var statusData=userStatusArray[currentStatusIndex];
var timestampDiv=document.createElement("div");
timestampDiv.className="status-timestamp";
timestampDiv.textContent=formatStatusTime(statusData.timestamp);
statusViewContainer.appendChild(timestampDiv);
if(statusData.type==="image"){
statusImageView.src=statusData.content;
statusImageView.style.display="block";
statusImageView.alt="Status Image";
statusImageView.onerror=function(){statusImageView.alt="Failed to load image";};
}else if(statusData.type==="video"){
statusImageView.style.display="none";
var isOwnStatus=(currentStatusViewUid===uid);
if(isOwnStatus){
var vid=document.createElement("video");
vid.className="status-video-view";
vid.style.cssText="max-width:100%;max-height:70vh;margin:0 auto;display:block;background:#000;";
vid.src=statusData.content;
vid.controls=true;
vid.playsinline=true;
statusViewContainer.insertBefore(vid,timestampDiv);
vid.play().catch(function(){});
}else{
showStatusVideoDownload(statusData.content,statusViewContainer,timestampDiv);
}
}else{
var textStatus=document.createElement("div");
textStatus.className="text-status";
textStatus.textContent=statusData.content;
statusViewContainer.appendChild(textStatus);
}
if(currentStatusViewUid===uid){
db.ref("statusViews/"+currentStatusViewUid+"/"+statusData.timestamp).once(
"value",
function(snapshot){
var viewsData=snapshot.val();
var viewsCount=viewsData ? Object.keys(viewsData).length : 0;
var viewsDiv=document.createElement("div");
viewsDiv.className="status-views";
viewsDiv.innerHTML="<span>Views: "+viewsCount+"</span>";
statusViewContainer.appendChild(viewsDiv);
statusViewsButton.style.display=viewsCount>0 ? "block" : "none";
}
);
}else{
statusViewsButton.style.display="none";
}
softkeyRight.innerHTML=userStatusArray.length>currentStatusIndex+1 ? "Next" : "";
var statusLikeBtn=document.getElementById("statusLikeBtn");
if(statusLikeBtn&&currentStatusViewUid&&currentStatusViewUid!==uid){
var ts=userStatusArray[currentStatusIndex]? userStatusArray[currentStatusIndex].timestamp : null;
if(ts){
db.ref("statusLikes/"+currentStatusViewUid+"/"+ts+"/"+uid).once("value",function(s){
var svgIcon=document.getElementById("likeIconSvg");
if(svgIcon)svgIcon.style.fill=s.exists()? "#e74c3c" : "#00B4D8";
});
}
}
}
function showStatusVideoDownload(videoUrl,container,insertBefore){
var existing=container.querySelectorAll(".status-video-view");
existing.forEach(function(el){el.remove();});
var vid=document.createElement("video");
vid.className="status-video-view";
vid.style.cssText="max-width:100%;max-height:70vh;margin:0 auto;display:block;background:#000;";
vid.src=videoUrl;
vid.controls=true;
vid.playsinline=true;
if(insertBefore&&insertBefore.parentNode===container){
container.insertBefore(vid,insertBefore);
}else{
container.appendChild(vid);
}
var playPromise=vid.play();
if(playPromise!==undefined){
playPromise.catch(function(){
var wrap=document.createElement("div");
wrap.style.cssText="position:relative;display:inline-block;width:100%;";
vid.parentNode.insertBefore(wrap,vid);
wrap.appendChild(vid);
var tapOverlay=document.createElement("div");
tapOverlay.style.cssText="position:absolute;top:0;left:0;right:0;bottom:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.4);cursor:pointer;z-index:10;border-radius:4px;";
tapOverlay.innerHTML='<div style="background:rgba(0,0,0,0.75);color:#fff;padding:10px 18px;border-radius:20px;font-size:13px;">▶ Tap to play</div>';
tapOverlay.onclick=function(){
vid.play();
tapOverlay.remove();
};
wrap.appendChild(tapOverlay);
});
}
}
function recordStatusView(statusUid,statusTimestamp){
var viewRef=db.ref("statusViews/"+statusUid+"/"+statusTimestamp+"/"+uid);
viewRef.once("value",function(snap){
if(!snap.exists()){
viewRef.set(Date.now());
}
});
}
function hideStatusView(){
var vids=statusViewContainer.querySelectorAll("video");
vids.forEach(function(v){try{v.pause();v.src="";}catch(e){}});
var toRemove=statusViewContainer.querySelectorAll(".status-header,.text-status,.status-timestamp,.status-views,.status-video-view");
toRemove.forEach(function(el){el.remove();});
statusImageView.style.display="none";
statusImageView.src="";
statusViewContainer.style.display="none";
mainPage.classList.add("active");
restoreTabBar();
statusFooter.style.display="none";
var replyRow=document.getElementById("statusReplyRow");
if(replyRow)replyRow.style.display="none";
var statusReplyInput=document.getElementById("statusReplyInput");
if(statusReplyInput)statusReplyInput.value="";
softkeyCenter.innerHTML="";
setTimeout(function(){focusPrivateChatsLanding();},1000);
}
function sendStatusReply(targetUid,replyText){
if(!replyText||!replyText.trim())return;
if(!uid){showNotification("Please login first");return;}
if(statusReplyInFlight)return;
statusReplyInFlight=true;
canSendMessageTo(targetUid).then(function(allowed){
if(!allowed){
showNotification("Cannot send reply-spam protection is on");
statusReplyInFlight=false;
return;
}
var replyInput=document.getElementById("statusReplyInput");
var statusContent="";
var statusType="text";
if(userStatusArray&&userStatusArray[currentStatusIndex]){
var st=userStatusArray[currentStatusIndex];
statusContent=st.content||"";
statusType=st.type||"text";
}
var msgData={
from: uid,
to: targetUid,
timestamp: firebase.database.ServerValue.TIMESTAMP,
seen: false,
status: "sent",
message: replyText.trim(),
statusReply: true,
statusContent: statusContent,
statusType: statusType
};
var senderRef=db.ref("conversations/"+uid+"/"+targetUid).push();
var msgId=senderRef.key;
var receiverRef=db.ref("conversations/"+targetUid+"/"+uid+"/"+msgId);
senderRef.set(msgData).then(function(){
senderRef.update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
});
receiverRef.set(msgData).then(function(){
receiverRef.update({status: "delivered",deliveredTimestamp: firebase.database.ServerValue.TIMESTAMP});
});
if(replyInput)replyInput.value="";
showNotification("Reply sent!");
setTimeout(function(){statusReplyInFlight=false;},500);
}).catch(function(){
statusReplyInFlight=false;
showNotification("Failed to send reply.");
});
}
function showNextStatus(){
if(currentStatusIndex+1<userStatusArray.length){
currentStatusIndex++;
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
var existingElements=statusAddContainer.querySelectorAll(
".status-timestamp,.status-views,.status-buttons-container"
);
existingElements.forEach(function(el){el.remove();});
var statusData=userStatusArray[currentStatusIndex];
if(statusData.type==="image"){
statusImagePreview.src=statusData.content;
statusImagePreview.style.display="block";
}else if(statusData.type==="text"){
statusTextInput.style.display="block";
statusTextInput.value=statusData.content;
statusTextInput.disabled=true;
}
var buttonsContainer=document.createElement("div");
buttonsContainer.className="status-buttons-container";
buttonsContainer.style.display="flex";
buttonsContainer.style.flexDirection="column";
buttonsContainer.style.gap="10px";
statusDeleteButton.style.display="block";
buttonsContainer.appendChild(statusDeleteButton);
var timestampDiv=document.createElement("div");
timestampDiv.className="status-timestamp";
timestampDiv.textContent="Posted "+formatStatusTime(statusData.timestamp);
statusAddContainer.appendChild(timestampDiv);
db.ref("statusViews/"+uid+"/"+statusData.timestamp).once("value",function(viewsSnap){
var viewsCount=viewsSnap.exists()? Object.keys(viewsSnap.val()).length : 0;
var viewsDiv=document.createElement("div");
viewsDiv.className="status-views";
viewsDiv.innerHTML="<span>Views: "+viewsCount+"</span>";
statusAddContainer.appendChild(viewsDiv);
if(viewsCount>0){
var viewButton=document.createElement("button");
viewButton.className="navItem view-who-saw-button";
viewButton.textContent="View Who Saw";
viewButton.tabIndex=22;
viewButton.onclick=function(){
showStatusViewers(statusData.timestamp);
};
buttonsContainer.appendChild(viewButton);
}
if(currentStatusIndex+1<userStatusArray.length){
statusNextButton.style.display="block";
buttonsContainer.appendChild(statusNextButton);
softkeyRight.innerHTML="Next";
}else{
softkeyRight.innerHTML="New Status";
}
statusAddContainer.appendChild(buttonsContainer);
setTimeout(function(){
var viewButton=statusAddContainer.querySelector(".view-who-saw-button");
if(viewButton){
viewButton.focus();
}else{
statusDeleteButton.focus();
}
},100);
});
}else{
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
var existingElements=statusAddContainer.querySelectorAll(
".status-timestamp,.status-views,.status-buttons-container"
);
existingElements.forEach(function(el){el.remove();});
softkeyRight.innerHTML="New Status";
showStatusTypeSelection();
}
}
function showStatusViewers(statusTimestamp,doneCallback){
if(!statusTimestamp){
db.ref("statuses/"+uid).once("value",function(snapshot){
var statusData=snapshot.val();
if(statusData){
var timestamp=statusData.timestamp;
if(statusData.statuses){
timestamp=statusData.statuses.reduce(function(prev,current){
return prev.timestamp>current.timestamp ? prev : current;
}).timestamp;
}
showStatusViewers(timestamp,doneCallback);
}
});
return;
}
var viewsPromise=db.ref("statusViews/"+uid+"/"+statusTimestamp).once("value");
var likesPromise=db.ref("statusLikes/"+uid+"/"+statusTimestamp).once("value");
Promise.all([viewsPromise,likesPromise]).then(function(results){
var viewersData=results[0].val();
var likesData=results[1].val()||{};
var viewers=[];
if(viewersData){
Object.keys(viewersData).forEach(function(viewerUid){
viewers.push({
uid: viewerUid,
viewTime: viewersData[viewerUid],
liked:!!likesData[viewerUid]
});
});
}
if(viewers.length===0){
showNotification("No viewers yet");
return;
}
var viewerPromises=viewers.map(function(viewer){
return db.ref("profiles/"+viewer.uid)
.once("value")
.then(function(snap){
return{
uid: viewer.uid,
username: snap.val()&&snap.val().username ? snap.val().username : "Unknown",
profilePic: snap.val()&&snap.val().profilePic ? snap.val().profilePic : "icons/default.png",
viewTime: viewer.viewTime,
liked: viewer.liked
};
});
});
Promise.all(viewerPromises).then(function(viewersWithDetails){
var viewersContainer=document.createElement("div");
viewersContainer.className="viewers-container";
var header=document.createElement("div");
header.className="viewers-header";
header.textContent="Viewers("+viewersWithDetails.length+")";
viewersContainer.appendChild(header);
var closeButton=document.createElement("button");
closeButton.className="navItem close-viewers-button";
closeButton.textContent="Close";
closeButton.tabIndex=23;
viewersContainer.appendChild(closeButton);
var viewersList=document.createElement("div");
viewersList.className="viewers-list";
viewersWithDetails
.sort(function(a,b){return b.viewTime-a.viewTime;})
.forEach(function(viewer){
var viewerItem=document.createElement("div");
viewerItem.className="viewer-item";
var viewerPic=document.createElement("img");
viewerPic.className="viewer-pic";
viewerPic.src=viewer.profilePic;
viewerPic.alt=viewer.username;
var viewerName=document.createElement("span");
viewerName.className="viewer-name";
if(viewer.liked){
viewerName.innerHTML=viewer.username+'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="12" height="12" fill="#e74c3c" style="vertical-align:middle;margin-left:3px;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
}else{
viewerName.textContent=viewer.username;
}
var viewerTime=document.createElement("span");
viewerTime.className="viewer-time";
var d=new Date(viewer.viewTime);
var h=d.getHours(),m=d.getMinutes();
var ampm=h>=12 ? "pm" : "am";
h=h % 12||12;
viewerTime.textContent=h+":"+(m<10 ? "0"+m : m)+" "+ampm;
viewerItem.appendChild(viewerPic);
viewerItem.appendChild(viewerName);
viewerItem.appendChild(viewerTime);
viewersList.appendChild(viewerItem);
});
viewersContainer.appendChild(viewersList);
statusAddContainer.appendChild(viewersContainer);
if(typeof doneCallback==="function")doneCallback();
setTimeout(function(){closeButton.focus();},100);
closeButton.onclick=function(){
viewersContainer.remove();
statusDeleteButton.focus();
};
closeButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
viewersContainer.remove();
statusDeleteButton.focus();
}
};
});
});
}
function displayCurrentStatusInAdd(){
statusImagePreview.style.display="none";
statusTextInput.style.display="none";
statusSaveButton.style.display="none";
statusDeleteButton.style.display="none";
statusNextButton.style.display="none";
var existingElements=statusAddContainer.querySelectorAll(
".status-timestamp,.status-views,.status-buttons-container"
);
existingElements.forEach((el)=>el.remove());
var currentStatus=userStatusArray[currentStatusIndex];
if(currentStatus.type==="image"){
statusImagePreview.src=currentStatus.content;
statusImagePreview.style.display="block";
}else if(currentStatus.type==="text"){
statusTextInput.style.display="block";
statusTextInput.value=currentStatus.content;
statusTextInput.disabled=true;
}
var buttonsContainer=document.createElement("div");
buttonsContainer.className="status-buttons-container";
buttonsContainer.style.display="flex";
buttonsContainer.style.flexDirection="column";
buttonsContainer.style.gap="10px";
statusDeleteButton.style.display="block";
buttonsContainer.appendChild(statusDeleteButton);
var timestampDiv=document.createElement("div");
timestampDiv.className="status-timestamp";
timestampDiv.textContent="Posted "+formatStatusTime(currentStatus.timestamp);
statusAddContainer.appendChild(timestampDiv);
db.ref("statusViews/"+uid+"/"+currentStatus.timestamp).once("value",function(viewsSnap){
var viewsCount=viewsSnap.exists()? Object.keys(viewsSnap.val()).length : 0;
var viewsDiv=document.createElement("div");
viewsDiv.className="status-views";
viewsDiv.innerHTML=`<span>Views: ${viewsCount}</span>`;
statusAddContainer.appendChild(viewsDiv);
if(viewsCount>0){
var viewButton=document.createElement("button");
viewButton.className="navItem view-who-saw-button";
viewButton.textContent="View Who Saw";
viewButton.tabIndex=22;
viewButton.onclick=function(){
showStatusViewers(currentStatus.timestamp);
};
buttonsContainer.appendChild(viewButton);
}
if(userStatusArray.length>currentStatusIndex+1){
statusNextButton.style.display="block";
buttonsContainer.appendChild(statusNextButton);
softkeyRight.innerHTML="Next";
}else{
softkeyRight.innerHTML="New Status";
}
statusAddContainer.appendChild(buttonsContainer);
setTimeout(()=>statusDeleteButton.focus(),100);
});
}
function showNextStatusView(){
if(currentStatusIndex+1<userStatusArray.length){
currentStatusIndex++;
displayCurrentStatus();
if(currentStatusViewUid!==uid){
recordStatusView(currentStatusViewUid,userStatusArray[currentStatusIndex].timestamp);
}
}else{
currentStatusIndex=0;
displayCurrentStatus();
if(currentStatusViewUid!==uid){
recordStatusView(currentStatusViewUid,userStatusArray[currentStatusIndex].timestamp);
}
}
}
profileBackButton.onclick=function(){
hideProfileView();
};
profileBackButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
hideProfileView();
}
};
profileSaveButton.onclick=function(){
saveProfile();
};
profileSaveButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
saveProfile();
}
};
changeProfilePicButton.onclick=function(){
changeProfilePicture();
};
changeProfilePicButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
changeProfilePicture();
}
};
statusBackButton.onclick=function(){
hideStatusView();
};
statusBackButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
hideStatusView();
}
};
statusSaveButton.onclick=function(){
saveStatus();
};
statusSaveButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
saveStatus();
}else if(e.key==="ArrowDown"){
statusDeleteButton.focus();
}else if(e.key==="ArrowUp"){
if(statusTextInput.style.display==="block"){
statusTextInput.focus();
}else{
statusImagePreview.focus();
}
}
};
statusDeleteButton.onclick=function(){
deleteStatus();
};
statusDeleteButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
deleteStatus();
}else if(e.key==="ArrowUp"){
statusSaveButton.focus();
}else if(e.key==="ArrowDown"){
var viewButton=statusAddContainer.querySelector(".navItem[textContent='View Who Saw']");
if(viewButton)viewButton.focus();
}
};
statusNextButton.onclick=function(){
showNextStatus();
};
statusNextButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
showNextStatus();
}
};
statusViewsButton.onclick=function(){
showStatusViewers(userStatusArray[currentStatusIndex].timestamp);
};
statusViewsButton.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
showStatusViewers(userStatusArray[currentStatusIndex].timestamp);
}
};
// ── NEW Android-style Settings Bottom Sheet ──────────────────────────
function showAndBottomSheet(items,onClose){
var existing=document.getElementById("andBottomSheetOverlay");
if(existing){existing.remove();}
var overlay=document.createElement("div");
overlay.id="andBottomSheetOverlay";
// No backdrop-filter — that's what leaves the blur residue.
// A simple semi-transparent dark background closes cleanly.
overlay.style.cssText="position:fixed;inset:0;z-index:7000;background:rgba(0,0,0,0.42);display:flex;align-items:flex-end;";
var sheet=document.createElement("div");
sheet.style.cssText="width:100%;background:#fff;border-radius:22px 22px 0 0;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 -4px 32px rgba(0,0,0,0.18);will-change:transform;touch-action:pan-y;";
// Drag handle
var handle=document.createElement("div");
handle.style.cssText="width:36px;height:4px;background:#D1D5DB;border-radius:2px;margin:12px auto 2px;flex-shrink:0;";
sheet.appendChild(handle);
var list=document.createElement("div");
list.style.cssText="overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:env(safe-area-inset-bottom,12px);overscroll-behavior:contain;";
items.forEach(function(item){
var row=document.createElement("div");
row.tabIndex=0;
row.style.cssText="display:flex;align-items:center;padding:14px 20px;gap:16px;cursor:pointer;border-bottom:1px solid #F1F5F9;min-height:56px;transition:background 0.1s;";
var ic=document.createElement("div");
ic.style.cssText="width:42px;height:42px;border-radius:13px;display:flex;align-items:center;justify-content:center;font-size:21px;flex-shrink:0;background:"+(item.danger?"rgba(239,68,68,0.09)":"rgba(3,105,161,0.08)")+";";
ic.textContent=item.icon||"•";
var txt=document.createElement("div");
txt.style.cssText="flex:1;min-width:0;";
var lbl=document.createElement("div");
lbl.style.cssText="font-size:15px;font-weight:600;"+(item.danger?"color:#EF4444;":"color:#0F172A;")+";";
lbl.textContent=item.label;
txt.appendChild(lbl);
if(item.sublabel){
var sub=document.createElement("div");
sub.style.cssText="font-size:12px;color:#64748B;margin-top:2px;";
sub.textContent=item.sublabel;
txt.appendChild(sub);
}
if(item.toggle!==undefined){
var on=!!item.toggle;
var pill=document.createElement("div");
pill.style.cssText="width:46px;height:26px;border-radius:13px;background:"+(on?"#0369A1":"#CBD5E1")+";position:relative;transition:background 0.2s;flex-shrink:0;";
var knob=document.createElement("div");
knob.style.cssText="position:absolute;top:3px;left:"+(on?"23px":"3px")+";width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgba(0,0,0,0.22);transition:left 0.2s;";
pill.appendChild(knob);
row.appendChild(ic);row.appendChild(txt);row.appendChild(pill);
}else if(item.arrow){
var arr=document.createElement("div");
arr.style.cssText="color:#CBD5E1;font-size:20px;";
arr.textContent="›";
row.appendChild(ic);row.appendChild(txt);row.appendChild(arr);
}else{
row.appendChild(ic);row.appendChild(txt);
}
function doAction(){closeSheet(true);if(item.action)setTimeout(item.action,80);}
row.onclick=doAction;
row.onkeydown=function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();doAction();}};
row.onfocus=function(){this.style.background=item.danger?"rgba(239,68,68,0.05)":"#F8FAFC";};
row.onblur=function(){this.style.background="";};
list.appendChild(row);
});
sheet.appendChild(list);
overlay.appendChild(sheet);
document.body.appendChild(overlay);

// ── Clean close — removes element fully, zero blur residue ────────
function closeSheet(immediate){
sheet.style.transition="transform 0.25s cubic-bezier(0.4,0,0.2,1)";
sheet.style.transform="translateY(100%)";
overlay.style.transition="opacity 0.25s";
overlay.style.opacity="0";
var delay=immediate?80:260;
setTimeout(function(){
if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
if(onClose)onClose();
},delay);
}

// ── Backdrop tap closes cleanly ────────────────────────────────────
overlay.addEventListener("click",function(e){
if(e.target===overlay)closeSheet(false);
},false);

// ── Swipe down to close ────────────────────────────────────────────
var _sy=null,_sStartY=0;
sheet.addEventListener("touchstart",function(e){
// Only start drag from the handle area or when list is at top
if(e.target===handle||list.scrollTop<=0){
_sy=e.touches[0].clientY;
_sStartY=_sy;
sheet.style.transition="none";
}
},{passive:true});
sheet.addEventListener("touchmove",function(e){
if(_sy===null)return;
var dy=e.touches[0].clientY-_sStartY;
if(dy<0){dy=0;}
sheet.style.transform="translateY("+dy+"px)";
overlay.style.opacity=String(Math.max(0,0.42-(dy/window.innerHeight)*0.8));
},{passive:true});
sheet.addEventListener("touchend",function(e){
if(_sy===null)return;
var dy=e.changedTouches[0].clientY-_sStartY;
_sy=null;
if(dy>80){
closeSheet(false);
}else{
// Snap back
sheet.style.transition="transform 0.2s cubic-bezier(0.4,0,0.2,1)";
sheet.style.transform="translateY(0)";
overlay.style.opacity="";
overlay.style.transition="";
}
},{passive:true});

// ── Animate in ────────────────────────────────────────────────────
sheet.style.transform="translateY(100%)";
sheet.style.transition="transform 0.3s cubic-bezier(0.4,0,0.2,1)";
requestAnimationFrame(function(){
requestAnimationFrame(function(){sheet.style.transform="translateY(0)";});
});
setTimeout(function(){var f=list.querySelector("[tabindex]");if(f)f.focus();},320);
return{close:function(){closeSheet(false);}};
}
window.showAndBottomSheet=showAndBottomSheet;
function showSettingsMenu(){
var spamOn=!!spamProtection;
var soundOn=!!notificationSoundEnabled;
var notifOn=areNotificationsEnabled();
var autoDlOn=isAutoDownloadEnabled();
var lockOn=!!appLockPassword;
showAndBottomSheet([
{icon:"👤",label:"Edit Profile",sublabel:"Name, photo, about",arrow:true,action:function(){setTimeout(function(){showProfileEdit();},50);}},
{icon:"🔤",label:"Font & Text",sublabel:"Size and style",arrow:true,action:function(){setTimeout(function(){showFontMenu();},0);}},
{icon:"🔒",label:"App Lock",sublabel:lockOn?"Tap to disable":"Set a PIN lock",toggle:lockOn,action:function(){if(appLockPassword){showConfirmPrompt("Disable App Lock?",function(c){if(c)removeAppLock();});}else{setupAppLock();}}},
{icon:"🛡️",label:"Spam Protection",sublabel:"Block unsolicited messages",toggle:spamOn,action:function(){toggleSpamProtection();}},
{icon:"🖼️",label:"Chat Background",sublabel:"Change wallpaper",arrow:true,action:function(){changeBackground();}},
{icon:"🔔",label:"Notifications",sublabel:notifOn?"Enabled":"Disabled",toggle:notifOn,action:function(){toggleGlobalNotifications();}},
{icon:"🔊",label:"Message Sound",sublabel:soundOn?"On":"Off",toggle:soundOn,action:function(){toggleNotifications();}},
{icon:"⬇️",label:"Auto-Download Media",sublabel:autoDlOn?"Saving media automatically":"Manual download",toggle:autoDlOn,action:function(){toggleAutoDownloadMedia();}},
{icon:"🚫",label:"Blocked Users",sublabel:"Manage blocked contacts",arrow:true,action:function(){showBlockedUsersList();}},
{icon:"🚪",label:"Logout",sublabel:"Sign out of your account",danger:true,action:function(){showConfirmPrompt("Logout from ChitChat?",function(c){if(c)logout();});}}
]);
}
var _statusPrivacyCache=null;
function loadStatusPrivacy(callback){
db.ref("statusPrivacy/"+uid).once("value",function(snap){
var val=snap.val()||{type: "contacts",list:[]};
_statusPrivacyCache=val;
if(callback)callback(val);
});
}
window.canViewStatus=function(statusOwnerUid,viewerUid,callback){
db.ref("statusPrivacy/"+statusOwnerUid).once("value",function(snap){
var priv=snap.val()||{type: "contacts",list:[]};
var list=priv.list||[];
if(priv.type==="contacts"){
db.ref("conversations/"+statusOwnerUid+"/"+viewerUid).once("value",function(s){
callback(s.exists());
});
}else if(priv.type==="except"){
db.ref("conversations/"+statusOwnerUid+"/"+viewerUid).once("value",function(s){
var isContact=s.exists();
var isExcluded=list.indexOf(viewerUid)!==-1;
callback(isContact&&!isExcluded);
});
}else if(priv.type==="only"){
callback(list.indexOf(viewerUid)!==-1);
}else{
callback(true);
}
});
};
function showStatusPrivacyMenu(){
var priv=_statusPrivacyCache||{type: "contacts",list:[]};
var currentType=priv.type||"contacts";
var typeLabels=["My Contacts","My Contacts Except","Only Share With"];
var typeKeys=["contacts","except","only"];
var selectedIdx=typeKeys.indexOf(currentType);
showDropdown(typeLabels,function(index){
var pickedType=typeKeys[index];
hideDropdown(false);
if(pickedType==="contacts"){
db.ref("statusPrivacy/"+uid).set({type: "contacts",list:[]});
_statusPrivacyCache={type: "contacts",list:[]};
try{localStorage.setItem("statusPrivacy_"+uid,JSON.stringify(_statusPrivacyCache));}catch(e){}
showNotification("Status visible to all contacts.");
}else{
setTimeout(function(){
showStatusPrivacyContactPicker(pickedType,priv.list||[]);
},0);
}
},selectedIdx);
db.ref("statusPrivacy/"+uid).once("value",function(snap){
_statusPrivacyCache=snap.val()||{type: "contacts",list:[]};
});
}
function showStatusPrivacyContactPicker(pickedType,existingList){
var titleText=pickedType==="except" ? "Exclude from status" : "Only share with";
function buildFromContacts(contacts){
if(contacts.length===0){showNotification("No contacts found.");return;}
var overlay=document.createElement("div");
overlay.style.cssText="position:fixed;top:0;left:0;width:100%;height:100%;background:#F0F6FF;z-index:9000;display:flex;flex-direction:column;";
var hdr=document.createElement("div");
hdr.style.cssText="background:linear-gradient(135deg,#0077B6,#00B4D8);color:#fff;padding:10px 12px;font-size:13px;font-weight:700;flex-shrink:0;";
hdr.textContent=titleText;
overlay.appendChild(hdr);
var hint=document.createElement("div");
hint.style.cssText="color:#64748B;font-size:10px;padding:5px 12px;background:#E8F4FD;flex-shrink:0;border-bottom:1px solid #BEE3F8;";
hint.textContent="Enter=select/deselect \u2022 SoftLeft=Save";
overlay.appendChild(hint);
var list=document.createElement("div");
list.style.cssText="flex:1;overflow-y:auto;background:#fff;";
var selectedUids=existingList.slice();
var items=[];
contacts.forEach(function(c,i){
var row=document.createElement("div");
row.tabIndex=200+i;
row.style.cssText="display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid #E2EEF9;cursor:pointer;outline:none;background:#fff;";
row.dataset.uid=c.uid;
var pic=document.createElement("div");
pic.style.cssText="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#00B4D8,#0077B6);flex-shrink:0;overflow:hidden;margin-right:10px;display:flex;align-items:center;justify-content:center;color:#fff;font-size:14px;font-weight:700;";
if(c.pic){
var img=document.createElement("img");
img.src=c.pic;
img.style.cssText="width:100%;height:100%;object-fit:cover;";
img.onerror=function(){pic.textContent=(c.name||"?")[0].toUpperCase();};
pic.appendChild(img);
}else{
pic.textContent=(c.name||"?")[0].toUpperCase();
}
var nameEl=document.createElement("div");
nameEl.style.cssText="flex:1;color:#1E293B;font-size:12px;font-weight:500;";
nameEl.textContent=c.name||c.uid;
var check=document.createElement("div");
check.style.cssText="width:20px;height:20px;border-radius:50%;border:2px solid #BEE3F8;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;";
if(selectedUids.indexOf(c.uid)!==-1){
check.style.background="#00B4D8";check.style.borderColor="#00B4D8";
check.style.color="#fff";check.textContent="\u2714";
}
row.appendChild(pic);row.appendChild(nameEl);row.appendChild(check);
function toggleRow(){
var idx2=selectedUids.indexOf(c.uid);
if(idx2===-1){
selectedUids.push(c.uid);
check.textContent="\u2714";check.style.background="#00B4D8";
check.style.borderColor="#00B4D8";check.style.color="#fff";
}else{
selectedUids.splice(idx2,1);
check.textContent="";check.style.background="transparent";
check.style.borderColor="#BEE3F8";
}
}
row.onclick=toggleRow;
row.addEventListener("keydown",function(e){
e.stopPropagation();
e.preventDefault();
if(e.key==="Enter"){toggleRow();}
else if(e.key==="ArrowDown"){if(items[i+1])items[i+1].focus();}
else if(e.key==="ArrowUp"){if(items[i-1])items[i-1].focus();}
else if(e.key==="SoftLeft"){saveAndClose();}
else if(e.key==="SoftRight"||e.key==="Backspace"){closeOverlay();}
});
row.onfocus=function(){row.style.background="#EBF8FF";};
row.onblur=function(){row.style.background="#fff";};
list.appendChild(row);items.push(row);
});
overlay.appendChild(list);
var skBar=document.createElement("div");
skBar.style.cssText="display:flex;justify-content:space-between;align-items:center;background:#0D1B2A;border-top:1px solid #1E3A5F;padding:0 10px;height:18px;flex-shrink:0;";
var saveBtn=document.createElement("span");
saveBtn.textContent="Save";saveBtn.style.cssText="color:#90E0EF;font-size:10px;cursor:pointer;";
var ctrLbl=document.createElement("span");
ctrLbl.textContent="Select";ctrLbl.style.cssText="color:#fff;font-size:10px;font-weight:700;";
var backBtn=document.createElement("span");
backBtn.textContent="Back";backBtn.style.cssText="color:#90E0EF;font-size:10px;cursor:pointer;";
saveBtn.onclick=saveAndClose;backBtn.onclick=closeOverlay;
skBar.appendChild(saveBtn);skBar.appendChild(ctrLbl);skBar.appendChild(backBtn);
overlay.appendChild(skBar);
document.body.appendChild(overlay);
var _overlayKeyHandler=function(e){
if(!overlay.parentNode){document.removeEventListener("keydown",_overlayKeyHandler,true);return;}
e.stopPropagation();
var focused=document.activeElement;
var ci=items.indexOf(focused);
if(ci===-1)ci=0;
if(e.key==="ArrowDown"){
e.preventDefault();
if(items[ci+1])items[ci+1].focus();
else items[0].focus();
}else if(e.key==="ArrowUp"){
e.preventDefault();
if(items[ci-1])items[ci-1].focus();
else items[items.length-1].focus();
}else if(e.key==="Enter"){
e.preventDefault();
if(items[ci]){
var c2=items[ci].dataset.uid;
var idx3=selectedUids.indexOf(c2);
var check2=items[ci].querySelector("div:last-child");
if(idx3===-1){
selectedUids.push(c2);
if(check2){check2.textContent="\u2714";check2.style.background="#00B4D8";check2.style.borderColor="#00B4D8";check2.style.color="#fff";}
}else{
selectedUids.splice(idx3,1);
if(check2){check2.textContent="";check2.style.background="transparent";check2.style.borderColor="#BEE3F8";}
}
}
}else if(e.key==="SoftLeft"){
e.preventDefault();
saveAndClose();
}else if(e.key==="SoftRight"||e.key==="Backspace"){
e.preventDefault();
closeOverlay();
}
};
document.addEventListener("keydown",_overlayKeyHandler,true);
if(items.length>0)setTimeout(function(){items[0].focus();},50);
function saveAndClose(){
db.ref("statusPrivacy/"+uid).set({type: pickedType,list: selectedUids});
_statusPrivacyCache={type: pickedType,list: selectedUids};
try{localStorage.setItem("statusPrivacy_"+uid,JSON.stringify(_statusPrivacyCache));}catch(e){}
showNotification("Saved.");
closeOverlay();
}
function closeOverlay(){
document.removeEventListener("keydown",_overlayKeyHandler,true);
if(overlay.parentNode)overlay.parentNode.removeChild(overlay);
}
}
if(window.allPrivateChats&&window.allPrivateChats.length>0){
buildFromContacts(window.allPrivateChats.map(function(c){
var pic=c.profilePic||null;
try{pic=pic||localStorage.getItem("profilePic_"+c.uid);}catch(e){}
return{uid: c.uid,name: c.username||c.name||c.uid,pic: pic};
}));
}else{
try{
var _cached=JSON.parse(localStorage.getItem("cachedContacts")||"[]");
if(_cached.length>0){
buildFromContacts(_cached.map(function(c){
var pic=c.profilePic||null;
try{pic=pic||localStorage.getItem("profilePic_"+c.uid);}catch(e){}
return{uid: c.uid,name: c.username||c.uid,pic: pic};
}));
return;
}
}catch(e){}
db.ref("conversations/"+uid).once("value",function(snap){
var keys=[];snap.forEach(function(child){keys.push(child.key);});
if(!keys.length){buildFromContacts([]);return;}
var contacts=[];var pending=keys.length;
keys.forEach(function(pUid){
db.ref("profiles/"+pUid).once("value",function(s){
var p=s.val()||{};
var pic=p.profilePic||null;
try{pic=pic||localStorage.getItem("profilePic_"+pUid);}catch(e){}
contacts.push({uid: pUid,name: p.username||pUid,pic: pic});
if(--pending===0)buildFromContacts(contacts);
});
});
});
}
}
function showFontMenu(){
showDropdown([
"Size",
"Reset"
],function(index){
if(index===0){
hideDropdown(false);
showFontSizeMenu();
}else if(index===1){
hideDropdown(false);
if(typeof resetAppFontPreferences==="function")resetAppFontPreferences();
var targets=document.querySelectorAll(
".message-text,.message,.user-name,.chat-last-msg,#messageInput,.navItem,.dropdown-item"
);
for(var ri=0;ri<targets.length;ri++){
targets[ri].style.fontFamily="";
targets[ri].style.fontSize="";
}
showNotification("Font reset to default.");
}
});
}
function showFontSizeMenu(){
var sizes=[10,12,16,18];
var labels=["Small","Medium","Large","Extra Large"];
var currentSize=parseInt(localStorage.getItem("chitchat_font_size")||"12",10);
var selectedIdx=sizes.indexOf(currentSize);
if(selectedIdx===-1)selectedIdx=1;
showDropdown(labels,function(index){
var size=sizes[index];
if(typeof applyAppFontPreferences==="function"){
applyAppFontPreferences(size,null);
}
hideDropdown(false);
showNotification("Font size updated.");
},selectedIdx);
}
function showFontStyleMenu(){
var styles=[
{key: "default",label: "Normal(Arial)"},
{key: "bold",label: "Bold Heavy"},
{key: "mono",label: "Monospace(Code)"},
{key: "serif",label: "Serif(Formal)"},
{key: "cursive",label: "Cursive(Handwriting)"},
{key: "narrow",label: "Narrow(Compact)"},
{key: "fantasy",label: "Fantasy(Decorative)"},
{key: "sansserif",label: "Sans-Serif(Clean)"},
{key: "custom1",label: "DejaVu Sans"}
];
showDropdown(styles.map(function(item){return item.label;}),function(index){
var picked=styles[index];
if(picked&&typeof applyAppFontPreferences==="function"){
applyAppFontPreferences(null,picked.key);
}
hideDropdown(false);
showNotification("Font: "+picked.label);
});
}
// ── New Android-style Video Player ───────────────────────────────
var _vpControlsHideTimer=null;
function vpFmtTime(s){
s=Math.floor(s||0);
var m=Math.floor(s/60);s=s%60;
return m+":"+(s<10?"0":"")+s;
}
function vpUpdateSeek(video){
var fill=document.getElementById("vp-seekbar-fill");
var thumb=document.getElementById("vp-seekbar-thumb");
var cur=document.getElementById("vp-time-cur");
var dur=document.getElementById("vp-time-dur");
if(!fill||!video.duration||isNaN(video.duration))return;
var pct=(video.currentTime/video.duration)*100;
fill.style.width=pct+"%";
if(thumb)thumb.style.left="calc("+pct+"% - 6px)";
if(cur)cur.textContent=vpFmtTime(video.currentTime);
if(dur)dur.textContent=vpFmtTime(video.duration);
}
function vpShowControls(){
var c=document.getElementById("vp-controls");
var t=document.getElementById("vp-topbar");
if(c)c.classList.remove("hidden");
if(t)t.style.opacity="1";
if(_vpControlsHideTimer)clearTimeout(_vpControlsHideTimer);
_vpControlsHideTimer=setTimeout(function(){
var v=document.getElementById("fullscreenVideo");
if(v&&!v.paused){
var c2=document.getElementById("vp-controls");
var t2=document.getElementById("vp-topbar");
if(c2)c2.classList.add("hidden");
if(t2)t2.style.opacity="0";
}
},3000);
}
window.vpToggleControls=function(){vpShowControls();};
window.vpTogglePlay=function(){
var v=document.getElementById("fullscreenVideo");
var icon=document.getElementById("vpPlayIcon");
if(!v)return;
if(v.paused||v.ended){
v.play().catch(function(){});
if(icon)icon.innerHTML='<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
}else{
v.pause();
if(icon)icon.innerHTML='<path d="M8 5v14l11-7z"/>';
}
vpShowControls();
};
window.vpSkip=function(sec){
var v=document.getElementById("fullscreenVideo");
if(!v)return;
v.currentTime=Math.max(0,Math.min(v.duration||0,v.currentTime+sec));
vpShowControls();
};
window.vpSetVolume=function(val){
var v=document.getElementById("fullscreenVideo");
if(v)v.volume=val/100;
};
window.vpSeek=function(e){
var v=document.getElementById("fullscreenVideo");
var bar=document.getElementById("vp-seekbar");
if(!v||!bar||!v.duration)return;
var rect=bar.getBoundingClientRect();
var pct=(e.clientX-rect.left)/rect.width;
v.currentTime=Math.max(0,Math.min(v.duration,pct*v.duration));
vpUpdateSeek(v);
vpShowControls();
};

// ── Video player swipe gestures ───────────────────────────────────
// Horizontal swipe  → seek  (full swipe = full duration)
// Right-half vertical swipe ↕ → volume
// Left-half vertical swipe ↕  → brightness (CSS filter)
(function(){
var _vt=null; // touch start data
var _vpBrightness=1;
function _showVpHint(text){
var hint=document.getElementById("vp-gesture-hint");
if(!hint){
hint=document.createElement("div");
hint.id="vp-gesture-hint";
hint.style.cssText="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:#fff;padding:10px 18px;border-radius:12px;font-size:15px;font-weight:600;z-index:20;pointer-events:none;transition:opacity 0.3s;white-space:nowrap;";
var pl=document.getElementById("videoFullscreenPlayer");
if(pl)pl.appendChild(hint);
}
hint.textContent=text;
hint.style.opacity="1";
clearTimeout(hint._hideT);
hint._hideT=setTimeout(function(){hint.style.opacity="0";},800);
}
var tapOverlay=document.getElementById("vp-tap-overlay");
if(tapOverlay){
tapOverlay.addEventListener("touchstart",function(e){
var t=e.touches[0];
_vt={x:t.clientX,y:t.clientY,t:Date.now(),side:t.clientX>window.innerWidth/2?"right":"left"};
},false);
tapOverlay.addEventListener("touchend",function(e){
if(!_vt)return;
var t=e.changedTouches[0];
var dx=t.clientX-_vt.x;
var dy=t.clientY-_vt.y;
var dt=Date.now()-_vt.t;
var absDx=Math.abs(dx);
var absDy=Math.abs(dy);
var v=document.getElementById("fullscreenVideo");
if(!v){_vt=null;return;}
// Tap (no significant movement) → toggle controls
if(absDx<15&&absDy<15&&dt<300){
vpShowControls();
_vt=null;return;
}
// Horizontal swipe → seek
if(absDx>absDy&&absDx>30){
var seekPct=dx/(window.innerWidth*0.8);
var seekSecs=seekPct*(v.duration||0);
v.currentTime=Math.max(0,Math.min(v.duration||0,v.currentTime+seekSecs));
vpUpdateSeek(v);
_showVpHint((seekSecs>=0?"⏩ ":""+(Math.abs(seekSecs).toFixed(0))+"s")+(seekSecs<0?"⏪ "+Math.abs(seekSecs).toFixed(0)+"s":""));
vpShowControls();
_vt=null;return;
}
// Vertical swipe → volume (right) or brightness (left)
if(absDy>absDx&&absDy>30){
var delta=-(dy/window.innerHeight)*1.2;
if(_vt.side==="right"){
// Volume
var newVol=Math.max(0,Math.min(1,(v.volume||1)+delta));
v.volume=newVol;
var volSlider=document.getElementById("vp-vol-slider");
if(volSlider)volSlider.value=Math.round(newVol*100);
_showVpHint("🔊 "+Math.round(newVol*100)+"%");
}else{
// Brightness via CSS filter
_vpBrightness=Math.max(0.1,Math.min(2,_vpBrightness+delta));
var vid2=document.getElementById("fullscreenVideo");
if(vid2)vid2.style.filter="brightness("+_vpBrightness.toFixed(2)+")";
_showVpHint("☀️ "+Math.round(_vpBrightness*100)+"%");
}
vpShowControls();
}
_vt=null;
},false);
// Cancel on multi-touch
tapOverlay.addEventListener("touchcancel",function(){_vt=null;},false);
}
})();
window.androidVideoMore=function(){
if(typeof window.showAndBottomSheet==="function"){
var v=document.getElementById("fullscreenVideo");
window.showAndBottomSheet([
{icon:"\u2B07\uFE0F",label:"Save Video",sublabel:"Download to device",action:function(){
if(v&&v.src){try{var a=document.createElement("a");a.href=v.src;a.download="video_"+Date.now()+".mp4";document.body.appendChild(a);a.click();document.body.removeChild(a);}catch(e){}}
}},
{icon:"\uD83D\uDD01",label:"Loop",sublabel:"Toggle repeat",action:function(){
if(v){v.loop=!v.loop;if(typeof showNotification==="function")showNotification(v.loop?"Loop ON":"Loop OFF");}
}}
]);
}
};
function openVideoFullscreen(blobUrl){
var player=document.getElementById("videoFullscreenPlayer");
var video=document.getElementById("fullscreenVideo");
if(!player||!video)return;
if(player.style.display==="flex")return;
video.pause();
video.src=blobUrl;
video.currentTime=0;
video.volume=1;
player.style.display="flex";
softKeysContainer.style.display="none";
if(window._focusTrap)window._focusTrap.suppress(player);
video.ontimeupdate=function(){vpUpdateSeek(video);};
video.onplay=function(){
var icon=document.getElementById("vpPlayIcon");
if(icon)icon.innerHTML='<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>';
};
video.onpause=video.onended=function(){
var icon=document.getElementById("vpPlayIcon");
if(icon)icon.innerHTML='<path d="M8 5v14l11-7z"/>';
if(video.ended)video.currentTime=0;
};
video.onloadedmetadata=function(){vpUpdateSeek(video);};
var volSlider=document.getElementById("vp-vol-slider");
if(volSlider)volSlider.value=100;
video.onvolumechange=function(){if(volSlider)volSlider.value=Math.round(video.volume*100);};
var pp=video.play();
if(pp)pp.then(function(){}).catch(function(){});
vpShowControls();
setTimeout(function(){var pb=document.getElementById("vpPlayBtn");if(pb)pb.focus();},150);
}
function closeVideoFullscreen(){
var player=document.getElementById("videoFullscreenPlayer");
var video=document.getElementById("fullscreenVideo");
if(!player||!video)return;
video.pause();video.src="";
player.style.display="none";
if(window._focusTrap)window._focusTrap.restore();
if(_vpControlsHideTimer){clearTimeout(_vpControlsHideTimer);_vpControlsHideTimer=null;}
softKeysContainer.style.display="block";
setTimeout(function(){var inp=document.getElementById("messageInput");if(inp)inp.focus();},100);
}
function showBlockedUsersList(){
var blockedPage=document.getElementById("blockedUsersPage");
var blockedList=document.getElementById("blockedUsersList");
blockedList.innerHTML='<div id="blockedUsersEmpty">Loading...</div>';
blockedPage.style.display="flex";
mainPage.classList.remove("active");
chatPage.classList.remove("active");
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Unblock";
softkeyRight.innerHTML="";
softKeysContainer.style.display="block";
db.ref("blocked/"+uid).once("value",function(snapshot){
blockedList.innerHTML="";
var blockedUids=[];
snapshot.forEach(function(child){
blockedUids.push(child.key);
});
if(blockedUids.length===0){
blockedList.innerHTML='<div id="blockedUsersEmpty">No blocked users</div>';
softkeyCenter.innerHTML="";
return;
}
var loaded=0;
blockedUids.forEach(function(blockedUid){
db.ref("presence1/"+blockedUid).once("value",function(presSnap){
var presData=presSnap.val()||{};
var username=presData.username||"Unknown";
var item=document.createElement("div");
item.className="blocked-user-item navItem";
item.dataset.uid=blockedUid;
item.tabIndex=0;
var pic=document.createElement("img");
pic.className="blocked-user-pic";
pic.src="icons/default.png";
pic.alt=username;
pic.onerror=function(){this.src="icons/default.png";};
var cachedPic=localStorage.getItem("profilePic_"+blockedUid);
if(cachedPic){
pic.src=cachedPic;
}else{
db.ref("profiles/"+blockedUid+"/profilePic").once("value",function(s){
if(s.val()){pic.src=s.val();}
});
}
var nameDiv=document.createElement("div");
nameDiv.className="blocked-user-name";
nameDiv.textContent=username;
item.appendChild(pic);
item.appendChild(nameDiv);
function doUnblock(){
showConfirmPrompt("Do you really want to unblock "+username+"?",function(confirmed){
if(confirmed){
unblockUser(uid,blockedUid);
item.remove();
showNotification(username+" has been unblocked.");
if(blockedList.children.length===0){
blockedList.innerHTML='<div id="blockedUsersEmpty">No blocked users</div>';
softkeyCenter.innerHTML="";
}
}
});
}
item.onclick=doUnblock;
item.onkeydown=function(e){
if(e.key==="Enter"){
e.preventDefault();
doUnblock();
}else if(e.key==="ArrowDown"){
e.preventDefault();
var items=Array.from(blockedList.querySelectorAll(".blocked-user-item"));
var idx=items.indexOf(document.activeElement);
if(idx<items.length-1)items[idx+1].focus();
}else if(e.key==="ArrowUp"){
e.preventDefault();
var items=Array.from(blockedList.querySelectorAll(".blocked-user-item"));
var idx=items.indexOf(document.activeElement);
if(idx>0)items[idx-1].focus();
}else if(e.key==="SoftLeft"){
e.preventDefault();
hideBlockedUsersList();
}else if(e.key==="SoftCenter"){
e.preventDefault();
doUnblock();
}
};
item.onfocus=function(){
softkeyLeft.innerHTML="Back";
softkeyCenter.innerHTML="Unblock";
softkeyRight.innerHTML="";
};
blockedList.appendChild(item);
loaded++;
if(loaded===blockedUids.length){
setTimeout(function(){
var first=blockedList.querySelector(".blocked-user-item");
if(first)first.focus();
},100);
}
});
});
});
}
function hideBlockedUsersList(){
var blockedPage=document.getElementById("blockedUsersPage");
blockedPage.style.display="none";
mainPage.classList.add("active");
softkeyLeft.innerHTML=isOnlineViewActive ? "PVT Chat" : "Options";
softkeyCenter.innerHTML="";
softkeyRight.innerHTML=isOnlineViewActive ? "Close" : "Online User";
setTimeout(function(){
focusPrivateChatsLanding();
},100);
}
function toggleNotifications(){
notificationSoundEnabled=!notificationSoundEnabled;
localStorage.setItem("notificationSoundEnabled",JSON.stringify(notificationSoundEnabled));
localStorage.setItem("notificationEnabled",JSON.stringify(notificationSoundEnabled));
var status=notificationSoundEnabled ? "ON" : "OFF";
showNotification("Sound is now "+status);
setTimeout(function(){
showSettingsMenu();
},1500);
}
function toggleSpamProtection(){
var newStatus=!spamProtection;
if(newStatus===true){
showCustomConfirm(
"Spam Protection ON ⚠️: only users in your chat list can message you;new users cannot message you,but you can message everyone — continue?",
function(confirmed){
if(confirmed){
spamProtection=true;
localStorage.setItem("spamProtection",JSON.stringify(true));
db.ref("profiles/"+uid+"/spamProtection").set(true);
showNotification("✅ Spam protection is now ON");
setTimeout(function(){
showSettingsMenu();
},1500);
}
}
);
}else{
spamProtection=false;
localStorage.setItem("spamProtection",JSON.stringify(false));
db.ref("profiles/"+uid+"/spamProtection").set(false);
showNotification("Spam protection is now OFF");
setTimeout(function(){
showSettingsMenu();
},1500);
}
}
function showCustomConfirm(message,callback){
isAlertActive=true;
var lastFocused=document.activeElement;
var alertBox=document.createElement("div");
alertBox.className="custom-alert";
alertBox.innerHTML=`
<div class="custom-alert-header">Chit Chat</div>
<p style="white-space:pre-line;">${message}</p>
<div class="button-container">
<button id="confirmYesBtn" class="confirm-ok-btn navItem" tabindex="0">Yes</button>
<button id="confirmNoBtn" class="confirm-cancel-btn navItem" tabindex="0">No</button>
</div>
`;
document.body.appendChild(alertBox);
var yesBtn=document.getElementById("confirmYesBtn");
var noBtn=document.getElementById("confirmNoBtn");
setTimeout(function(){yesBtn.focus();},100);
yesBtn.onclick=function(){
document.body.removeChild(alertBox);
isAlertActive=false;
callback(true);
if(lastFocused)lastFocused.focus();
};
noBtn.onclick=function(){
document.body.removeChild(alertBox);
isAlertActive=false;
callback(false);
if(lastFocused)lastFocused.focus();
};
yesBtn.onkeydown=function(e){
if(e.key==="Enter")yesBtn.click();
if(e.key==="ArrowRight")noBtn.focus();
};
noBtn.onkeydown=function(e){
if(e.key==="Enter")noBtn.click();
if(e.key==="ArrowLeft")yesBtn.focus();
};
}
function pushChatHistory(){
if(window.history&&window.history.pushState){
window.history.pushState({chatOpen: true},"");
}
}
window.addEventListener("popstate",function(e){
if(isDropdownVisible){hideDropdown();history.pushState({chatOpen: true},"");return;}
if(document.getElementById("profilePicFullscreen")){
document.getElementById("profilePicFullscreen").remove();
history.pushState({chatOpen: true},"");
return;
}
if(chatPage.classList.contains("active")){
var msgInputEl=document.getElementById("messageInput");
if(msgInputEl&&msgInputEl.value.trim().length>0){
history.pushState({chatOpen: true},"");
return;
}
currentChatUid=null;currentOpenChatUid=null;
chatPage.classList.remove("active");
mainPage.classList.add("active");
db.ref("presence1/"+uid).update({currentChat: null});
restoreTabBar();
softkeyLeft.innerHTML="Options";softkeyCenter.innerHTML="";softkeyRight.innerHTML="Online";
if(lastFocusedChatElement&&document.contains(lastFocusedChatElement)){
lastFocusedChatElement.focus({preventScroll:true});
var pcc3=document.getElementById("privateChatContent");
if(pcc3)pcc3.scrollTop=0;
var oul3=document.getElementById("onlineUsersList");
if(oul3)oul3.scrollTop=0;
}
else focusPrivateChatsLanding();
history.pushState({},"");
return;
}
if(statusViewContainer&&statusViewContainer.style.display==="flex"){
hideStatusView();history.pushState({},"");return;
}
if(statusAddContainer&&statusAddContainer.style.display==="flex"){
hideStatusAdd();history.pushState({},"");return;
}
if(profileViewContainer&&profileViewContainer.style.display==="flex"){
hideProfileView();history.pushState({},"");return;
}
if(profileEditContainer&&profileEditContainer.style.display==="flex"){
hideProfileEdit();history.pushState({},"");return;
}
});
document.addEventListener("keyup",function(e){
if(e.key!=="Power"&&e.key!=="EndCall")return;
e.preventDefault();
e.stopPropagation();
if(isDropdownVisible){hideDropdown();return;}
if(chatPage.classList.contains("active")){
var msgInputEl=document.getElementById("messageInput");
if(msgInputEl&&msgInputEl.value.trim().length>0)return;
currentChatUid=null;currentOpenChatUid=null;
chatPage.classList.remove("active");
mainPage.classList.add("active");
db.ref("presence1/"+uid).update({currentChat: null});
restoreTabBar();
softkeyLeft.innerHTML="Options";softkeyCenter.innerHTML="";softkeyRight.innerHTML="Online";
if(lastFocusedChatElement&&document.contains(lastFocusedChatElement)){
lastFocusedChatElement.focus({preventScroll:true});
var pcc4=document.getElementById("privateChatContent");
if(pcc4)pcc4.scrollTop=0;
var oul4=document.getElementById("onlineUsersList");
if(oul4)oul4.scrollTop=0;
}else{
focusPrivateChatsLanding();
}
}else if(statusViewContainer&&statusViewContainer.style.display==="flex"){
hideStatusView();
}else if(statusAddContainer&&statusAddContainer.style.display==="flex"){
hideStatusAdd();
}else if(profileViewContainer&&profileViewContainer.style.display==="flex"){
hideProfileView();
}else if(profileEditContainer&&profileEditContainer.style.display==="flex"){
hideProfileEdit();
}else if(mainPage.classList.contains("active")){
showConfirmPrompt("Close Chit Chat?",function(ok){if(ok)window.close();});
}
});
