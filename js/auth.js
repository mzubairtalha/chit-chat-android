function getRandomWord(){
return randomWords[Math.floor(Math.random()*randomWords.length)];
}
var authSubmitBusy=false;
var BLOCKED_USERNAME_TERMS=["sex","porn","xxx","fuck","nude","naked","boobs","dick","penis","vagina","pussy","cum","horny","escort","fetish","milf","anal","erotic","hentai","slut","whore","rape"];
function isUsernameAllowed(name){
var lower=name.toLowerCase().replace(/[^a-z0-9]/g,"");
for(var i=0;i<BLOCKED_USERNAME_TERMS.length;i++){
if(lower.indexOf(BLOCKED_USERNAME_TERMS[i])!==-1)return false;
}
return true;
}
function setAuthButtonsBusy(kind,busy,busyText,idleText){
var hidden=kind==="login"?loginButton:signUpButton;
var visible=document.getElementById(kind==="login"?"loginButtonVisible":"signUpButtonVisible");
if(busy){
if(hidden){hidden.textContent=busyText;hidden.style.opacity="0.7";hidden.disabled=true;}
if(visible){
visible.innerHTML='<span class="loading-spinner" style="display:inline-block;margin-right:6px;vertical-align:middle;border-top-color:#fff;"></span>'+busyText;
visible.style.opacity="0.7";
visible.disabled=true;
}
}else{
if(hidden){hidden.textContent=idleText;hidden.style.opacity="1";hidden.disabled=false;}
if(visible){visible.textContent=idleText;visible.style.opacity="1";visible.disabled=false;}
}
}
function nav(move){
var currentIndex=document.activeElement;
if(welcomePage.classList.contains('active')){
var items=[signUpNavButton,loginNavButton];
var currentElemIdx=items.indexOf(currentIndex);
var next=currentElemIdx+move;
var targetElement=items[next];
if(targetElement)targetElement.focus();
}else if(loginPage.classList.contains('active')){
var items=[usernameInputLogin,passwordInputLogin,loginButton];
var currentElemIdx=items.indexOf(currentIndex);
var next=currentElemIdx+move;
var targetElement=items[next];
if(targetElement)targetElement.focus();
}else if(signUpPage.classList.contains('active')){
var items=[usernameInputSignUp,passwordInputSignUp,signUpButton];
var currentElemIdx=items.indexOf(currentIndex);
var next=currentElemIdx+move;
var targetElement=items[next];
if(targetElement)targetElement.focus();
}
}
document.addEventListener('keydown',function(e){
if(welcomePage.classList.contains('active')||loginPage.classList.contains('active')||signUpPage.classList.contains('active')){
if(e.key==="ArrowDown"||e.key==="ArrowUp"){
e.preventDefault();
if(welcomePage.classList.contains('active')){
var wItems=[signUpNavButton,loginNavButton];
var wCi=wItems.indexOf(document.activeElement);
if(wCi===-1)wCi=0;
var wNext=e.key==="ArrowDown"
?(wCi<wItems.length-1 ? wCi+1 : 0)
:(wCi>0 ? wCi-1 : wItems.length-1);
wItems[wNext].focus();
return;
}
var authInputs=[];
if(loginPage.classList.contains('active')){
var lbv=document.getElementById("loginButtonVisible");
authInputs=[usernameInputLogin,passwordInputLogin,lbv].filter(Boolean);
}else if(signUpPage.classList.contains('active')){
var inp2el=document.getElementById("passwordInputSignUp2");
var sbv=document.getElementById("signUpButtonVisible");
authInputs=[usernameInputSignUp,passwordInputSignUp,inp2el,sbv].filter(Boolean);
}
if(authInputs.length>0){
var ci=authInputs.indexOf(document.activeElement);
if(e.key==="ArrowDown"){
var next=(ci<authInputs.length-1)? ci+1 : 0;
authInputs[next].focus();
}else{
var prev=(ci>0)? ci-1 : authInputs.length-1;
authInputs[prev].focus();
}
}
return;
}
if(e.key==="Enter"&&welcomePage.classList.contains('active')){
var ae=document.activeElement;
if(ae===signUpNavButton||ae===loginNavButton){
e.preventDefault();
ae.click();
return;
}
}
if(e.key==="SoftRight"){
if(loginPage.classList.contains('active')){
e.preventDefault();
loginPage.classList.remove("active");
signUpPage.classList.add("active");
usernameInputSignUp.focus();
}else if(signUpPage.classList.contains('active')){
e.preventDefault();
signUpPage.classList.remove("active");
loginPage.classList.add("active");
usernameInputLogin.focus();
}else if(welcomePage.classList.contains('active')){
e.preventDefault();
welcomePage.classList.remove("active");
loginPage.classList.add("active");
usernameInputLogin.focus();
}
}
if(e.key==="SoftLeft"&&(loginPage.classList.contains('active')||signUpPage.classList.contains('active'))){
e.preventDefault();
if(loginPage.classList.contains('active')){
var inp=passwordInputLogin;
inp.type=inp.type==="password" ? "text" : "password";
var lbl=document.getElementById("loginShowPassLabel");
if(lbl)lbl.textContent=inp.type==="password" ? "Show Password" : "Hide Password";
}else{
var inp1=passwordInputSignUp;
var inp2=document.getElementById("passwordInputSignUp2");
var show=inp1.type==="password";
inp1.type=show ? "text" : "password";
if(inp2)inp2.type=show ? "text" : "password";
var lbl2=document.getElementById("signupShowPassLabel");
if(lbl2)lbl2.textContent=show ? "Hide Password" : "Show Password";
}
}
if(e.key==="Enter"){
if(loginPage.classList.contains('active')){
var ae=document.activeElement;
if(ae===usernameInputLogin){e.preventDefault();passwordInputLogin.focus();return;}
e.preventDefault();
submitLogin();
}else if(signUpPage.classList.contains('active')){
var ae2=document.activeElement;
var inp2=document.getElementById("passwordInputSignUp2");
if(ae2===usernameInputSignUp){e.preventDefault();passwordInputSignUp.focus();return;}
if(ae2===passwordInputSignUp&&inp2){e.preventDefault();inp2.focus();return;}
e.preventDefault();
submitSignup();
}
}
}
});
signUpNavButton.onclick=function(){
welcomePage.classList.remove("active");
signUpPage.classList.add("active");
usernameInputSignUp.focus();
};
loginNavButton.onclick=function(){
welcomePage.classList.remove("active");
loginPage.classList.add("active");
usernameInputLogin.focus();
};
setTimeout(function(){
var lbv=document.getElementById("loginButtonVisible");
if(lbv)lbv.onclick=function(){ submitLogin(); };
var sbv=document.getElementById("signUpButtonVisible");
if(sbv)sbv.onclick=function(){ submitSignup(); };
var loginToSignup=document.getElementById("loginToSignupLabel");
if(loginToSignup)loginToSignup.onclick=function(){
loginPage.classList.remove("active");
signUpPage.classList.add("active");
usernameInputSignUp.focus();
};
var loginSubmit=document.getElementById("loginSubmitLabel");
if(loginSubmit)loginSubmit.onclick=function(){ submitLogin(); };
var signupToLogin=document.getElementById("signupToLoginLabel");
if(signupToLogin)signupToLogin.onclick=function(){
signUpPage.classList.remove("active");
loginPage.classList.add("active");
usernameInputLogin.focus();
};
var signupSubmit=document.getElementById("signupSubmitLabel");
if(signupSubmit)signupSubmit.onclick=function(){ submitSignup(); };
},0);
if(usernameInputLogin){
usernameInputLogin.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
passwordInputLogin.focus();
}
});
}
if(passwordInputLogin){
passwordInputLogin.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
submitLogin();
}
});
}
if(usernameInputSignUp){
usernameInputSignUp.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
passwordInputSignUp.focus();
}
});
}
if(passwordInputSignUp){
passwordInputSignUp.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
var repeatInput=document.getElementById("passwordInputSignUp2");
if(repeatInput)repeatInput.focus();
else signUpButton.click();
}
});
}
var repeatPasswordInput=document.getElementById("passwordInputSignUp2");
if(repeatPasswordInput){
repeatPasswordInput.addEventListener("keydown",function(e){
if(e.key==="Enter"){
e.preventDefault();
e.stopPropagation();
submitSignup();
}
});
}
document.addEventListener("DOMContentLoaded",function(){
showSplashScreen();
setSplashStatus("Starting...",10);
document.addEventListener('keydown',function(e){
if(isAppLocked&&appLockContainer&&appLockContainer.style.display==="flex"){
e.preventDefault();
return false;
}
});
function waitForFirebase(attempts){
if(typeof firebase!=="undefined"&&firebase.app){
setSplashStatus("Starting...",15);
if(isAppLocked){
hideSplashScreen();
showAppLockScreen();
return;
}
if(!uid||!username){
setSplashStatus("Welcome!",100);
setTimeout(function(){
hideSplashScreen();
signUpPage.classList.add("active");
if(usernameInputSignUp)usernameInputSignUp.focus();
},600);
return;
}
initializeApp();
}else if(attempts>0){
setSplashStatus("Loading...",10);
setTimeout(function(){waitForFirebase(attempts-1);},300);
}else{
setSplashStatus("Offline mode...",30);
if(!uid||!username){
hideSplashScreen();
signUpPage.classList.add("active");
if(usernameInputSignUp)usernameInputSignUp.focus();
}else{
hideSplashScreen();
if(mainPage){
welcomePage.classList.remove("active");
mainPage.classList.add("active");
if(softKeysContainer)softKeysContainer.style.display="block";
}
}
}
}
waitForFirebase(30);
});
function showSplashScreen(){
if(splashScreen){
splashScreen.classList.add("active");
splashScreen.style.display="flex";
splashScreen.style.opacity="1";
var pb=document.getElementById("splashProgressBar");
if(pb){pb.style.width="0%";setTimeout(function(){pb.style.width="25%";},100);}
}
}
function setSplashStatus(text,pct){
var el=document.getElementById("splashStatusText");
if(el)el.textContent=text;
var pb=document.getElementById("splashProgressBar");
if(pb&&pct!==undefined)pb.style.width=pct+"%";
}
function hideSplashScreen(){
if(splashScreen){
window.__appSplashPending=false;
var pb=document.getElementById("splashProgressBar");
if(pb)pb.style.width="100%";
setTimeout(function(){
splashScreen.style.opacity="0";
setTimeout(function(){
splashScreen.classList.remove("active");
splashScreen.style.display="none";
},600);
},250);
}
}
function tryHideSplashWhenReady(){
if(window.__appSplashPending&&window.__privateChatsReady){
window.__appSplashPending=false;
hideSplashScreen();
}
}
function initializeApp(){
var savedBackground=localStorage.getItem("chatBackground");
if(savedBackground){
chatBox.style.backgroundImage="url("+savedBackground+")";
}
if(uid&&username){
setSplashStatus("Loading...",60);
setTimeout(function(){
loadAppWithUserFast();
},0);
try{
auth.onAuthStateChanged(function(user){
if(!user||user.uid!==uid){
localStorage.removeItem("uid");
localStorage.removeItem("username");
}
});
}catch(e){}
function loadAppWithUserFast(){
setSplashStatus("Connecting...",65);
enterMainApp(username);
setTimeout(function(){
if(typeof checkPrivateChatProfiles==="function")checkPrivateChatProfiles();
},5000);
}
return;
}
setSplashStatus("Verifying account...",20);
var authDone=false;
var authProgressTimer=setInterval(function(){
var pb=document.getElementById("splashProgressBar");
if(pb){
var cur=parseInt(pb.style.width)||20;
if(cur<33)pb.style.width=(cur+1)+"%";
}
},200);
var authTimeout=setTimeout(function(){
if(!authDone){
authDone=true;
clearInterval(authProgressTimer);
hideSplashScreen();
signUpPage.classList.add("active");
if(usernameInputSignUp)usernameInputSignUp.focus();
}
},3000);
try{
auth.onAuthStateChanged(function(user){
if(authDone)return;
authDone=true;
clearTimeout(authTimeout);
clearInterval(authProgressTimer);
if(user&&user.uid===uid){
setSplashStatus("Loading...",60);
loadAppWithUser();
}else{
localStorage.removeItem("uid");
localStorage.removeItem("username");
hideSplashScreen();
setTimeout(function(){
signUpPage.classList.add("active");
if(usernameInputSignUp)usernameInputSignUp.focus();
},300);
}
});
}catch(e){
clearTimeout(authTimeout);
clearInterval(authProgressTimer);
hideSplashScreen();
signUpPage.classList.add("active");
if(usernameInputSignUp)usernameInputSignUp.focus();
}
function loadAppWithUser(){
enterMainApp(username);
setTimeout(function(){
if(typeof checkPrivateChatProfiles==="function")checkPrivateChatProfiles();
},5000);
}
}
function checkPrivateChatProfiles(){
// Data saver: this pass fires one `once()` read per chat row (profile +
// presence), and can be triggered from two paths on the same load
// (finishReady + the enterMainApp timer). Only actually run it once per
// hour so frequent app opens do not re-download every profile.
var now=Date.now();
var lastCheck=0;
try{lastCheck=parseInt(localStorage.getItem("_profileCheckTs")||"0",10)||0;}catch(e){}
if(now-lastCheck<60*60*1000){
return;
}
try{localStorage.setItem("_profileCheckTs",String(now));}catch(e){}
var privateChatUsers=document.querySelectorAll(".user.navItem");
if(privateChatUsers.length===0){
return;
}
privateChatUsers.forEach(function(userElement){
var partnerUid=userElement.dataset.uid;
if(!partnerUid)return;
db.ref("profiles/"+partnerUid).once("value",function(snapshot){
var profileData=snapshot.val();
if(!profileData)return;
var needsUpdate=false;
var nameSpan=userElement.querySelector(".user-name");
if(nameSpan&&profileData.username&&nameSpan.textContent!==profileData.username){
nameSpan.textContent=profileData.username;
needsUpdate=true;
}
var profilePic=userElement.querySelector(".profile-pic-small");
if(profilePic&&profileData.profilePic){
if(profilePic.src!==profileData.profilePic){
profilePic.src=profileData.profilePic;
try{
localStorage.setItem("profilePic_"+partnerUid,profileData.profilePic);
}catch(e){
}
needsUpdate=true;
}
}
if(needsUpdate){
var localChats=JSON.parse(localStorage.getItem("privateChats")||"{}");
if(localChats[partnerUid]){
localChats[partnerUid].username=profileData.username||localChats[partnerUid].username;
localStorage.setItem("privateChats",JSON.stringify(localChats));
}
}
});
db.ref("presence1/"+partnerUid).once("value",function(presenceSnap){
var presenceData=presenceSnap.val();
if(presenceData){
var nameSpan=userElement.querySelector(".user-name");
var unreadSpan=userElement.querySelector(".unread-indicator");
var unreadCountSpan=userElement.querySelector(".unread-count");
if(nameSpan){
var unreadText=unreadCountSpan ? parseInt(unreadCountSpan.textContent,10): 0;
var hasUnread=!!(unreadText>0||(unreadSpan&&unreadSpan.style.display!=="none"));
nameSpan.className="user-name";
if(hasUnread){
nameSpan.classList.add("chat-username-unread");
}else if(presenceData.online){
nameSpan.classList.add("chat-username-online");
}else{
nameSpan.classList.add("chat-username-normal");
}
}
}
});
});
}
function submitSignup(){
if(authSubmitBusy)return;
var enteredUsername=usernameInputSignUp.value.trim();
var enteredPassword=passwordInputSignUp.value.trim();
var inp2=document.getElementById("passwordInputSignUp2");
var enteredPassword2=inp2 ? inp2.value.trim(): enteredPassword;
if(!enteredUsername||!enteredPassword){
showNotification("Please enter both username and password.");
return;
}
if(enteredUsername.length<3){
showCustomAlert("Username must be at least 3 characters.",function(){
usernameInputSignUp.focus();
});
return;
}
if(enteredUsername.length>20){
showCustomAlert("Username must be 20 characters or fewer.",function(){
usernameInputSignUp.focus();
});
return;
}
if(!isUsernameAllowed(enteredUsername)){
showCustomAlert("This username isn't allowed. Please choose a different one.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
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
authSubmitBusy=true;
setAuthButtonsBusy("signup",true,"Creating...","Create Account");
showAuthLoading("Creating account...");
var email=enteredUsername.replace(/\s+/g,'_')+"@chitchat.com";
auth.fetchSignInMethodsForEmail(email)
.then(function(signInMethods){
if(signInMethods.length>0){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
return Promise.reject(new Error("USERNAME_TAKEN"));
}
return db.ref("usernames/"+enteredUsername).once("value");
})
.then(function(snapshot){
if(snapshot.exists()){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
return Promise.reject(new Error("USERNAME_TAKEN"));
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
db.ref("usernameIndex/"+enteredUsername.toLowerCase()).set(uid);
setTimeout(function(){
addToOnlineUsers();
},1000);
authSubmitBusy=false;
enterMainApp(enteredUsername,true);
})
.catch(function(error){
authSubmitBusy=false;
if(error&&error.message==="USERNAME_TAKEN"){
setAuthButtonsBusy("signup",false,"","Create Account");
hideAuthLoading();
return;
}
hideAuthLoading();
setAuthButtonsBusy("signup",false,"","Create Account");
if(error.code==="auth/email-already-in-use"){
showCustomAlert("Username already in use. Please choose a different username.",function(){
usernameInputSignUp.value="";
usernameInputSignUp.focus();
});
}else{
showNotification("Sign-up failed: "+error.message);
}
});
}
signUpButton.onclick=submitSignup;
function submitLogin(){
if(authSubmitBusy)return;
var enteredUsername=usernameInputLogin.value.trim();
var enteredPassword=passwordInputLogin.value.trim();
if(!enteredUsername||!enteredPassword){
showNotification("Please enter both username and password.");
return;
}
authSubmitBusy=true;
setAuthButtonsBusy("login",true,"Logging in...","Login");
// Auto-reset after 10s if Firebase hangs
window._loginResetTimer=setTimeout(function(){
authSubmitBusy=false;
setAuthButtonsBusy("login",false,"","Login");
showNotification("Connection slow. Try again.");
},10000);
showAuthLoading("Logging in...");
var email=enteredUsername.replace(/\s+/g,'_')+"@chitchat.com";
auth.signInWithEmailAndPassword(email,enteredPassword)
.then(function(userCredential){
if(window._loginResetTimer)clearTimeout(window._loginResetTimer);
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
db.ref("usernameIndex/"+enteredUsername.toLowerCase()).set(uid);
setTimeout(function(){
addToOnlineUsers();
},1000);
authSubmitBusy=false;
enterMainApp(enteredUsername,true);
})
.catch(function(error){
hideAuthLoading();
if(window._loginResetTimer)clearTimeout(window._loginResetTimer);
authSubmitBusy=false;
setAuthButtonsBusy("login",false,"","Login");
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
}
loginButton.onclick=submitLogin;
function enterMainApp(activeUsername,isFreshAuth){
hideAuthLoading();
if(loginPage)loginPage.classList.remove("active");
if(signUpPage)signUpPage.classList.remove("active");
if(mainPage)mainPage.classList.add("active");
if(softKeysContainer){
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
}
if(softkeyLeft)softkeyLeft.innerHTML="Options";
if(softkeyCenter)softkeyCenter.innerHTML="";
if(softkeyRight)softkeyRight.innerHTML="Online";
window.__appSplashPending=true;
window.__privateChatsReady=false;
// Safety net: if something hangs (slow/absent network, a stalled
// Firebase read, etc.) never leave the person staring at a frozen splash
// screen forever — force it open after a hard cap and let the normal
// "offline: show cached data" paths take over.
clearTimeout(window._splashWatchdog);
window._splashWatchdog=setTimeout(function(){
if(window.__appSplashPending&&typeof hideSplashScreen==="function"){
hideSplashScreen();
}
},12000);
// Was previously hardcoded to true here without ever calling
// loadOnlineUsers() on this (session-restore / app-reopen) path — so the
// Online Users list stayed empty until some unrelated event happened to
// call loadOnlineUsers() later (e.g. the resume/reconnect handler). Let
// loadOnlineUsers() itself flip this once it actually has data.
window.__onlineUsersReady=false;
window.__onlineUsersLoaded=false;
// Startup sequence — exactly what should happen on app open, in order:
// 1. Presence (online/offline) for whoever is already in the chat list.
// 2. Private chat list sync: new chats appear, unread checked from each
//    chat's last message only (not scanning full message history).
// 3. Group chat unread (last message only) — in the background so it
//    can't block/hang the app, and does NOT wait for #2 to finish.
// 4. After ~1s, general notification listeners sync in the background.
// Online Users and Status are intentionally NOT loaded here — they only
// load the moment the person actually navigates to that screen (see
// SoftRight handler for Online Users, and the Status tab handler).
if(typeof showPrivateChatsView==="function")showPrivateChatsView();
if(softKeysContainer){
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
}
if(softkeyLeft)softkeyLeft.innerHTML="Options";
if(softkeyCenter)softkeyCenter.innerHTML="";
if(softkeyRight)softkeyRight.innerHTML="Online";
// Step 1 + 2: presence for existing rows + chat list sync (new chats,
// unread from last message) — loadPrivateChats() renders cached rows
// instantly, then refreshes each row's presence/profile in the background.
if(typeof loadPrivateChats==="function")loadPrivateChats(isFreshAuth);
// Clear any stale "currentChat" from a previous session. It is only ever
// valid while the chat page is actually open; if the app was killed or
// reloaded while viewing a chat (Android WebViews do this on background),
// leaving the old value up makes other users' apps mark our incoming
// messages as "seen" instantly (read receipt) even though we never saw
// them — which is what made the unread dot turn black by itself.
try{
if(window.db&&window.uid)window.db.ref("presence1/"+window.uid).update({currentChat: null});
}catch(e){}
if(typeof setupConnectionStatus==="function")setupConnectionStatus();
// Step 3: group unread (last message only), background — attached
// immediately, independent of whether the private chat list has
// finished loading yet.
// Step 3: group unread check fires automatically once loadPrivateChats()
// above finishes (see finishReady() in chat.js) — not started here in
// parallel, so it doesn't compete with the chat list load.
if(typeof setupPresence==="function")setupPresence();
if(typeof setupGlobalPresenceManager==="function")setupGlobalPresenceManager();
if(typeof addToOnlineUsers==="function")addToOnlineUsers();
// Ads / profile-change check / auto-delete now start from finishReady()
// in chat.js, right after both the private chat list AND the group
// unread check are done — not on their own timer here.
try{
var _sp=localStorage.getItem("statusPrivacy_"+uid);
if(_sp)window._statusPrivacyCache=JSON.parse(_sp);
}catch(e){}
// Step 4: general notification sync, 1 second later, in the background.
setTimeout(function(){
db.ref("statusPrivacy/"+uid).once("value",function(snap){
var val=snap.val()||{type: "contacts",list:[]};
window._statusPrivacyCache=val;
try{localStorage.setItem("statusPrivacy_"+uid,JSON.stringify(val));}catch(e){}
});
if(typeof loadNotifications==="function")loadNotifications();
},1000);
setTimeout(function(){
if(typeof focusPrivateChatsLanding==="function"){
focusPrivateChatsLanding();
}
var pendingChatUid=null;
try{pendingChatUid=localStorage.getItem("openChatOnLoad");}catch(e){}
if(pendingChatUid){
try{localStorage.removeItem("openChatOnLoad");}catch(e){}
if(typeof openChat==="function")openChat(pendingChatUid);
}
if(typeof processPendingShares==="function"){
setTimeout(processPendingShares,800);
}
if(typeof processOutgoingQueue==="function"){
setTimeout(processOutgoingQueue,1000);
}
},300);
}
function showCustomAlert(message,callback){
isAlertActive=true;
var lastFocusedElement=document.activeElement;
var alertBox=document.createElement("div");
alertBox.className="custom-alert";
alertBox.innerHTML='<div class="custom-alert-header">Chit Chat</div>'
+'<p style="white-space:pre-line;">'+message+'</p>'
+'<div class="button-container">'
+'<button id="alertOkButton" class="confirm-ok-btn navItem" style="font-size:13px;">OK</button>'
+'</div>';
document.body.appendChild(alertBox);
var okButton=document.getElementById("alertOkButton");
setTimeout(function(){okButton.focus();},0);
okButton.onclick=function(){
document.body.removeChild(alertBox);
isAlertActive=false;
if(callback)callback(true);
if(lastFocusedElement&&document.contains(lastFocusedElement)){
lastFocusedElement.focus();
}else if(loginPage.classList.contains('active')){
usernameInputLogin.focus();
}else if(signUpPage.classList.contains('active')){
usernameInputSignUp.focus();
}else if(chatPage.classList.contains('active')){
messageInput.focus();
}
};
okButton.onkeydown=function(e){
if(e.key==="Enter"||e.key==="SoftCenter"){e.preventDefault();okButton.click();}
if(e.key==="ArrowDown"||e.key==="ArrowUp"||e.key==="Tab"){e.preventDefault();okButton.focus();}
};
}
function showCustomPrompt(message,callback,validOptions){
isAlertActive=true;
var lastFocusedElement=document.activeElement;
var alertBox=document.createElement("div");
alertBox.className="custom-alert";
alertBox.innerHTML='<div class="custom-alert-header">Chit Chat</div>'
+'<p>'+message+'</p>'
+'<input type="text" id="promptInput" class="navItem" tabindex="0" style="width:85%;padding:8px 12px;border:1.5px solid #00B4D8;border-radius:8px;font-size:13px;margin-bottom:10px;outline:none;font-family:inherit;"/>'
+'<div class="button-container"><button id="promptOkButton" class="confirm-ok-btn navItem" tabindex="0">OK</button></div>';
document.body.appendChild(alertBox);
var input=document.getElementById("promptInput");
var okButton=document.getElementById("promptOkButton");
requestAnimationFrame(function(){
input.focus();
setTimeout(function(){
if(document.activeElement!==input){
input.focus();
}
},100);
});
okButton.onclick=function(){
var value=input.value.trim();
if(validOptions&&(!value||validOptions.indexOf(value)===-1)){
showCustomAlert("Please select one option.",function(){
input.focus();
});
return;
}
document.body.removeChild(alertBox);
isAlertActive=false;
callback(value);
if(lastFocusedElement&&document.contains(lastFocusedElement)){
lastFocusedElement.focus();
}else if(loginPage.classList.contains('active')){
usernameInputLogin.focus();
}else if(signUpPage.classList.contains('active')){
usernameInputSignUp.focus();
}
};
input.onkeydown=function(e){
if(e.key==="Enter")okButton.click();
};
}
function showConfirmPrompt(message,callback){
isAlertActive=true;
var lastFocused=document.activeElement;
if(lastFocused&&lastFocused.blur)lastFocused.blur();
var alertBox=document.createElement("div");
alertBox.className="custom-alert";
alertBox.innerHTML='<p style="padding:20px 18px 10px;font-size:13px;font-weight:600;color:#0077B6;margin:0;text-align:center;">'+message+'</p>'
+'<div class="button-container">'
+'<button class="confirm-ok-btn navItem" tabindex="0">OK</button>'
+'<button class="confirm-cancel-btn navItem" tabindex="0">Cancel</button>'
+'</div>';
document.body.appendChild(alertBox);
var okButton=alertBox.querySelector(".confirm-ok-btn");
var cancelButton=alertBox.querySelector(".confirm-cancel-btn");
var closed=false;
function closeAlert(result){
if(closed)return;
closed=true;
document.removeEventListener("keydown",trapKeys,true);
if(alertBox.parentNode)alertBox.parentNode.removeChild(alertBox);
isAlertActive=false;
callback(result);
try{if(lastFocused&&document.contains(lastFocused))lastFocused.focus();}catch(e){}
}
function trapKeys(e){
e.stopPropagation();
var ae=document.activeElement;
if(e.key==="Enter"||e.key==="SoftCenter"){
e.preventDefault();
closeAlert(ae===cancelButton ? false : true);
}else if(e.key==="ArrowRight"||e.key==="ArrowDown"){
e.preventDefault();
cancelButton.focus();
}else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){
e.preventDefault();
okButton.focus();
}else if(e.key==="Escape"||e.key==="SoftLeft"||e.key==="Backspace"){
e.preventDefault();
closeAlert(false);
}
}
document.addEventListener("keydown",trapKeys,true);
okButton.onclick=function(e){e.stopPropagation();closeAlert(true);};
cancelButton.onclick=function(e){e.stopPropagation();closeAlert(false);};
okButton.focus();
setTimeout(function(){if(!closed)okButton.focus();},50);
setTimeout(function(){if(!closed)okButton.focus();},150);
}
function showAuthLoading(text){
var existing=document.getElementById("_authLoader");
if(existing)existing.remove();
var el=document.createElement("div");
el.id="_authLoader";
el.style.cssText="position:fixed;inset:0;background:rgba(0,119,182,0.88);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;";
el.innerHTML='<div class="loading-spinner" style="width:38px;height:38px;border-width:4px;border-color:rgba(255,255,255,0.3);border-top-color:#00B4D8;"></div>'
+'<div style="color:#fff;font-size:15px;font-weight:700;letter-spacing:0.3px;">'+text+'</div>';
document.body.appendChild(el);
return el;
}
function hideAuthLoading(){
var el=document.getElementById("_authLoader");
if(el)el.remove();
}
function showPromptInput(message,defaultValue,callback){
isAlertActive=true;
var lastFocused=document.activeElement;
if(lastFocused&&lastFocused.blur)lastFocused.blur();
var alertBox=document.createElement("div");
alertBox.className="custom-alert";
alertBox.innerHTML='<div class="custom-alert-header">Chit Chat</div>'
+'<div style="padding:10px;">'
+'<p style="font-size:11px;margin-bottom:6px;">'+message+'</p>'
+'<input id="promptEditInput" type="text" class="navItem" style="width:100%;padding:7px;font-size:12px;border:1.5px solid #00B4D8;border-radius:6px;outline:none;" value="'+(defaultValue||'').replace(/"/g,'&quot;')+'">'
+'</div>'
+'<div class="button-container" style="padding:0 10px 10px;">'
+'<button class="prompt-ok-btn navItem" tabindex="0">Save</button>'
+'<button class="prompt-cancel-btn navItem" tabindex="0">Cancel</button>'
+'</div>';
document.body.appendChild(alertBox);
var input=alertBox.querySelector("#promptEditInput");
var okBtn=alertBox.querySelector(".prompt-ok-btn");
var cancelBtn=alertBox.querySelector(".prompt-cancel-btn");
var closed=false;
function doClose(val){
if(closed)return;
closed=true;
if(alertBox.parentNode)alertBox.parentNode.removeChild(alertBox);
isAlertActive=false;
callback(val);
if(lastFocused&&document.contains(lastFocused))lastFocused.focus();
}
okBtn.onclick=function(){doClose(input.value);};
cancelBtn.onclick=function(){doClose(null);};
input.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();e.stopPropagation();doClose(input.value);}
else if(e.key==="ArrowDown"){e.preventDefault();okBtn.focus();}
else if(e.key==="SoftLeft"||e.key==="Escape"){doClose(null);}
};
okBtn.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();e.stopPropagation();doClose(input.value);}
else if(e.key==="ArrowRight"||e.key==="ArrowDown"){e.preventDefault();cancelBtn.focus();}
else if(e.key==="ArrowUp"){e.preventDefault();input.focus();}
};
cancelBtn.onkeydown=function(e){
if(e.key==="Enter"){e.preventDefault();e.stopPropagation();doClose(null);}
else if(e.key==="ArrowLeft"||e.key==="ArrowUp"){e.preventDefault();okBtn.focus();}
};
setTimeout(function(){if(!closed){input.focus();input.select();}},60);
}
function showNotification(message){
notificationContainer.textContent=message;
notificationContainer.classList.add("active");
setTimeout(function(){
notificationContainer.classList.remove("active");
},3000);
}
function loadNotifications(){
var notificationsRef=db.ref("notifications");
notificationsRef.orderByChild("timestamp").limitToLast(1).on("child_added",function(snapshot){
var notificationData=snapshot.val();
if(notificationData&&notificationData.message){
showNotification(notificationData.message);
}
});
}
function navigateTo(url){
window.location.href=url;
}
function sendPushNotification(message,fromUsername,chatUid){
if(chatUid&&typeof isChatMuted==="function"&&isChatMuted(chatUid))return;
if(Notification.permission==="granted"){
new Notification("New message from "+fromUsername,{
body: message,
icon: 'icons/icon56x56.png'
});
}
}
function showKaiAd(){
if(typeof getKaiAd==='function'){
getKaiAd({
publisher: 'da08737d-861e-4ebe-bbbb-8fb90d004d39',
app: 'Chit_Chat',
slot: 'Chit_Chat__slot',
onerror: function(err){},
onready: function(ad){
var previouslyFocusedElement=document.activeElement;
ad.call('display');
ad.on('display',function(){
softKeysContainer.style.display="none";
softKeysContainer.classList.remove("active");
});
ad.on('close',function(){
if(previouslyFocusedElement)previouslyFocusedElement.focus();
if(chatPage.classList.contains("active")||mainPage.classList.contains("active")){
softKeysContainer.style.display="block";
softKeysContainer.classList.add("active");
}
});
}
});
}
}
