#!/usr/bin/env node
var fs = require("fs");
var path = require("path");
var cp = require("child_process");

var ROOT = __dirname;
var WWW = path.join(ROOT, "www");
var args = process.argv.slice(2);
var wantApk = args.indexOf("--apk") !== -1;
var wantPrepare = args.indexOf("--prepare") !== -1 || wantApk;
var skipZip = args.indexOf("--no-zip") !== -1 || !!process.env.CI;

var COPY_FILES = [
  "index.html",
  "world_chat.html",
  "groups.html",
  "sw.js",
  "GUIDE.md",
  "notification.mp3",
  "config.xml"
];
var COPY_DIRS = ["js", "icons"];

function rmDir(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(function (name) {
    var p = path.join(dir, name);
    if (fs.lstatSync(p).isDirectory()) rmDir(p);
    else fs.unlinkSync(p);
  });
  fs.rmdirSync(dir);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  fs.readdirSync(src).forEach(function (name) {
    if (name === "node_modules" || name === "www" || name === "platforms") return;
    var from = path.join(src, name);
    var to = path.join(dest, name);
    if (fs.lstatSync(from).isDirectory()) copyDir(from, to);
    else copyFile(from, to);
  });
}

function run(cmd, cwd) {
  console.log(">", cmd);
  cp.execSync(cmd, { cwd: cwd || ROOT, stdio: "inherit" });
}

function hasBin(name) {
  try {
    cp.execSync((process.platform === "win32" ? "where " : "which ") + name, { stdio: "ignore" });
    return true;
  } catch (e) {
    return false;
  }
}

console.log("Chit Chat build — copying www/");
if (fs.existsSync(WWW)) rmDir(WWW);
fs.mkdirSync(WWW, { recursive: true });

COPY_FILES.forEach(function (f) {
  var src = path.join(ROOT, f);
  if (fs.existsSync(src)) copyFile(src, path.join(WWW, f));
});
COPY_DIRS.forEach(function (d) {
  var src = path.join(ROOT, d);
  if (fs.existsSync(src)) copyDir(src, path.join(WWW, d));
});

if (!skipZip) {
  var zipOut = path.join(ROOT, "ChitChat-Android.zip");
  try {
    run("zip -r \"" + zipOut + "\" index.html world_chat.html groups.html sw.js GUIDE.md notification.mp3 icons js plugins package.json config.xml build.js .gitignore .github -x \"*.git*\" -x \"*/node_modules/*\"");
    console.log("ZIP ready:", zipOut);
  } catch (e) {
    console.log("ZIP step skipped:", e.message);
  }
}

if (!wantPrepare) {
  console.log("Done. For APK: npm install && node build.js --apk");
  process.exit(0);
}

var cordova = hasBin("cordova") ? "cordova" : "npx cordova";
function tryRun(cmd) {
  try {
    run(cmd);
  } catch (e) {
    console.log("skip:", cmd, e.message);
  }
}
if (!fs.existsSync(path.join(ROOT, "platforms", "android"))) {
  tryRun(cordova + " platform add android");
}
tryRun(cordova + " plugin add plugins/admob-plus-cordova --variable APP_ID_ANDROID=ca-app-pub-4672720627282510~8007823774 --save");
run(cordova + " prepare android");
if (wantApk) {
  run(cordova + " build android");
  console.log("APK under platforms/android/app/build/outputs/apk/");
}
