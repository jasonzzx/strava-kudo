// Builds bookmarklet.txt (the javascript: URI) and install.html from strava-kudo.js.
// Run with: node bookmarklet/build.js
const fs = require("fs");
const path = require("path");

const srcPath = path.join(__dirname, "strava-kudo.js");
const source = fs.readFileSync(srcPath, "utf8");

const minified = source
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("//"))
  .join(" ");

const bookmarkletUrl = "javascript:" + encodeURIComponent(minified);

fs.writeFileSync(path.join(__dirname, "bookmarklet.txt"), bookmarkletUrl);

const installHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Install: Strava Kudo Bookmarklet</title>
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; color: #222; line-height: 1.5; }
  h1 { font-size: 22px; }
  h2 { font-size: 17px; margin-top: 32px; }
  .btn { display: inline-block; background: #fc5200; color: #fff; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; }
  textarea { width: 100%; height: 90px; font-family: monospace; font-size: 11px; }
  code { background: #f3f3f3; padding: 2px 5px; border-radius: 4px; }
  ol li { margin-bottom: 10px; }
</style>
</head>
<body>
  <h1>Strava Kudo Bookmarklet</h1>
  <p>Drag this link to your bookmarks bar (desktop), or follow the mobile steps below.</p>
  <p><a class="btn" href="${bookmarkletUrl}">Kudo All</a></p>

  <h2>Desktop (Chrome / Firefox / Edge / Safari)</h2>
  <ol>
    <li>Show your bookmarks bar if it's hidden (Cmd/Ctrl+Shift+B).</li>
    <li>Drag the orange <strong>Kudo All</strong> button above onto your bookmarks bar.</li>
    <li>Go to <code>strava.com/dashboard</code>, then click the new "Kudo All" bookmark.</li>
  </ol>

  <h2>iPhone / iPad (Safari)</h2>
  <ol>
    <li>Open any page in Safari and tap the <strong>Share</strong> icon → <strong>Add Bookmark</strong>. Name it <code>Kudo All</code> and save it.</li>
    <li>Tap the <strong>Bookmarks</strong> icon (the open book) → find <code>Kudo All</code> → swipe left → <strong>Edit</strong>.</li>
    <li>Delete the URL field's contents and paste in the code below, then tap <strong>Done</strong>.</li>
    <li>Open <code>strava.com/dashboard</code> in Safari, then tap your <code>Kudo All</code> bookmark from the address bar or bookmarks list to run it.</li>
  </ol>

  <h2>Android (Chrome)</h2>
  <ol>
    <li>Open any page, tap the <strong>⋮</strong> menu → <strong>Star/Add bookmark</strong>.</li>
    <li>Go to Chrome menu → <strong>Bookmarks</strong> → find it → tap <strong>⋮</strong> → <strong>Edit</strong>.</li>
    <li>Change the name to <code>Kudo All</code> and replace the URL with the code below, then save.</li>
    <li>Open <code>strava.com/dashboard</code>, tap the address bar, type <code>kudo</code> to find the bookmark, and tap it to run.</li>
  </ol>

  <h2>Bookmarklet code (for mobile paste)</h2>
  <textarea readonly onclick="this.select()">${bookmarkletUrl}</textarea>

  <p style="margin-top:32px;color:#888;font-size:13px;">
    This runs entirely in your browser using your existing Strava login — no password or cookie is
    ever entered into this page or sent anywhere except strava.com.
  </p>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, "install.html"), installHtml);

console.log("Built bookmarklet.txt and install.html");
console.log("Bookmarklet length:", bookmarkletUrl.length, "chars");
