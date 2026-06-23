// Strava Kudo Bookmarklet
// Run while logged into strava.com (any page works; the dashboard feed works best).
// Injects an overlay listing friends' recent activities with a kudo checkbox per row,
// a "select all unkudoed" control, and a "kudo selected" bulk action button.
// Uses Strava's own internal web endpoints (session cookie + CSRF meta tag) — no
// credentials are read, stored, or sent anywhere except strava.com itself.
(function () {
  "use strict";

  if (!/(^|\.)strava\.com$/.test(location.hostname)) {
    alert("Run this bookmarklet on strava.com (open your Strava feed first).");
    return;
  }

  var existing = document.getElementById("sk-overlay-root");
  if (existing) existing.remove();

  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  if (!csrfMeta || !csrfMeta.content) {
    alert("Could not find Strava's CSRF token on this page. Try reloading strava.com and run the bookmarklet again.");
    return;
  }
  var CSRF_TOKEN = csrfMeta.content;

  var athleteLink = document.querySelector('a[href*="/athletes/"]');
  var athleteMatch = athleteLink && athleteLink.getAttribute("href").match(/\/athletes\/(\d+)/);
  var ATHLETE_ID = athleteMatch ? athleteMatch[1] : null;
  if (!ATHLETE_ID) {
    alert("Could not find your athlete ID on this page. Open your Strava dashboard (strava.com/dashboard) and run the bookmarklet again.");
    return;
  }

  var STAGGER_MS = 200;

  function statValue(stats, subtitle) {
    if (!stats) return null;
    for (var i = 0; i < stats.length; i++) {
      if (/_subtitle$/.test(stats[i].key) && stats[i].value === subtitle) {
        return stats[i - 1] ? stats[i - 1].value : null;
      }
    }
    return null;
  }

  function stripHtml(html) {
    if (!html) return "";
    var div = document.createElement("div");
    div.innerHTML = html;
    return div.textContent.replace(/\s+/g, " ").trim();
  }

  function feedUrl(numEntries, before, cursor) {
    var p = new URLSearchParams();
    p.set("feed_type", "following");
    p.set("athlete_id", ATHLETE_ID);
    p.set("num_entries", String(numEntries));
    if (before) p.set("before", String(before));
    if (cursor) p.set("cursor", String(cursor));
    return "https://www.strava.com/dashboard/feed?" + p.toString();
  }

  function kudoUrl(activityId) {
    return "https://www.strava.com/feed/activity/" + activityId + "/kudo";
  }

  async function fetchFeedPage(before, cursor) {
    var res = await fetch(feedUrl(30, before, cursor), {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
    if (!res.ok) throw new Error("Feed request failed: " + res.status);
    var json = await res.json();
    var activities = [];
    for (var i = 0; i < json.entries.length; i++) {
      var entry = json.entries[i];
      if (String(entry.entity) !== "Activity") continue;
      var a = entry.activity;
      if (a.ownedByCurrentAthlete) continue;
      var kc = a.kudosAndComments;
      if (!kc || !(kc.canKudo || kc.hasKudoed)) continue;
      activities.push({
        id: a.id,
        name: a.activityName,
        type: a.type,
        athleteName: a.athlete ? a.athlete.athleteName : "Unknown",
        avatarUrl: a.athlete ? a.athlete.avatarUrl : "",
        hasKudoed: !!kc.hasKudoed,
        kudosCount: kc.kudosCount || 0,
        distance: stripHtml(statValue(a.stats, "Distance")),
        pace: stripHtml(statValue(a.stats, "Pace") || statValue(a.stats, "Speed"))
      });
    }
    var last = json.entries[json.entries.length - 1];
    return {
      activities: activities,
      hasMore: !!(json.pagination && json.pagination.hasMore),
      nextBefore: last ? last.cursorData.updated_at : null,
      nextCursor: last ? last.cursorData.rank : null
    };
  }

  async function sendKudo(activityId) {
    var res = await fetch(kudoUrl(activityId), {
      method: "POST",
      credentials: "include",
      headers: {
        "X-CSRF-Token": CSRF_TOKEN,
        "X-Requested-With": "XMLHttpRequest"
      }
    });
    return res.ok;
  }

  var root = document.createElement("div");
  root.id = "sk-overlay-root";
  root.style.cssText =
    "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,0.5);" +
    "display:flex;align-items:center;justify-content:center;font-family:-apple-system,Helvetica,Arial,sans-serif;";

  var card = document.createElement("div");
  card.style.cssText =
    "background:#fff;color:#222;border-radius:10px;width:min(480px,94vw);max-height:88vh;" +
    "display:flex;flex-direction:column;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,0.3);";
  root.appendChild(card);

  var header = document.createElement("div");
  header.style.cssText =
    "padding:14px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between;";
  header.innerHTML = '<strong style="font-size:16px;">Kudo your friends</strong>';
  var closeBtn = document.createElement("button");
  closeBtn.textContent = "✕";
  closeBtn.style.cssText = "border:none;background:none;font-size:18px;cursor:pointer;color:#888;";
  closeBtn.onclick = function () { root.remove(); };
  header.appendChild(closeBtn);
  card.appendChild(header);

  var controls = document.createElement("div");
  controls.style.cssText =
    "padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;";
  var selectAllLabel = document.createElement("label");
  selectAllLabel.style.cssText = "display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px;";
  var selectAllCheckbox = document.createElement("input");
  selectAllCheckbox.type = "checkbox";
  selectAllLabel.appendChild(selectAllCheckbox);
  selectAllLabel.appendChild(document.createTextNode("Select all"));
  var kudoAllBtn = document.createElement("button");
  kudoAllBtn.textContent = "Kudo selected (0)";
  kudoAllBtn.disabled = true;
  kudoAllBtn.style.cssText =
    "margin-left:auto;background:#fc5200;color:#fff;border:none;border-radius:6px;padding:8px 14px;" +
    "font-size:14px;font-weight:600;cursor:pointer;opacity:0.5;";
  controls.appendChild(selectAllLabel);
  controls.appendChild(kudoAllBtn);
  card.appendChild(controls);

  var status = document.createElement("div");
  status.style.cssText = "padding:0 16px;font-size:13px;color:#666;min-height:18px;";
  card.appendChild(status);

  var list = document.createElement("div");
  list.style.cssText = "overflow-y:auto;flex:1;padding:4px 0;";
  card.appendChild(list);

  var footer = document.createElement("div");
  footer.style.cssText = "padding:10px 16px;border-top:1px solid #eee;text-align:center;";
  var loadMoreBtn = document.createElement("button");
  loadMoreBtn.textContent = "Load more";
  loadMoreBtn.style.cssText =
    "background:#f3f3f3;border:1px solid #ddd;border-radius:6px;padding:7px 16px;font-size:13px;cursor:pointer;";
  footer.appendChild(loadMoreBtn);
  card.appendChild(footer);

  document.body.appendChild(root);

  var rowsById = {};
  var selected = {};
  var nextBefore = null;
  var nextCursor = null;

  function updateKudoButton() {
    var n = Object.keys(selected).length;
    kudoAllBtn.textContent = "Kudo selected (" + n + ")";
    kudoAllBtn.disabled = n === 0;
    kudoAllBtn.style.opacity = n === 0 ? "0.5" : "1";
  }

  function updateSelectAllState() {
    var ids = Object.keys(rowsById).filter(function (id) { return !rowsById[id].activity.hasKudoed; });
    var checkedCount = ids.filter(function (id) { return selected[id]; }).length;
    selectAllCheckbox.checked = ids.length > 0 && checkedCount === ids.length;
    selectAllCheckbox.indeterminate = checkedCount > 0 && checkedCount < ids.length;
  }

  function renderRow(activity) {
    var row = document.createElement("div");
    row.style.cssText =
      "display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid #f5f5f5;";

    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.disabled = activity.hasKudoed;
    checkbox.checked = activity.hasKudoed;
    checkbox.onchange = function () {
      if (checkbox.checked) selected[activity.id] = true;
      else delete selected[activity.id];
      updateKudoButton();
      updateSelectAllState();
    };

    var avatar = document.createElement("img");
    avatar.src = activity.avatarUrl;
    avatar.style.cssText = "width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;";

    var text = document.createElement("div");
    text.style.cssText = "flex:1;min-width:0;font-size:13px;line-height:1.3;";
    var nameEl = document.createElement("div");
    nameEl.style.cssText = "font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    nameEl.textContent = activity.athleteName;
    var activityEl = document.createElement("div");
    activityEl.style.cssText = "color:#666;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
    activityEl.textContent = activity.name;
    text.appendChild(nameEl);
    text.appendChild(activityEl);
    if (activity.distance || activity.pace) {
      var metaEl = document.createElement("div");
      metaEl.style.cssText = "color:#999;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      metaEl.textContent = [activity.distance, activity.pace].filter(Boolean).join(" · ");
      text.appendChild(metaEl);
    }

    var kudosEl = document.createElement("div");
    kudosEl.style.cssText = "font-size:12px;color:#999;flex-shrink:0;";
    kudosEl.textContent = "👍 " + activity.kudosCount;

    row.appendChild(checkbox);
    row.appendChild(avatar);
    row.appendChild(text);
    row.appendChild(kudosEl);
    list.appendChild(row);

    rowsById[activity.id] = { activity: activity, row: row, checkbox: checkbox, kudosEl: kudosEl };
  }

  function markKudoed(id) {
    var entry = rowsById[id];
    if (!entry) return;
    entry.activity.hasKudoed = true;
    entry.activity.kudosCount += 1;
    entry.checkbox.checked = true;
    entry.checkbox.disabled = true;
    entry.kudosEl.textContent = "👍 " + entry.activity.kudosCount;
    delete selected[id];
  }

  async function loadPage() {
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = "Loading…";
    try {
      var page = await fetchFeedPage(nextBefore, nextCursor);
      page.activities.forEach(renderRow);
      nextBefore = page.nextBefore;
      nextCursor = page.nextCursor;
      loadMoreBtn.style.display = page.hasMore ? "inline-block" : "none";
      updateSelectAllState();
    } catch (e) {
      status.textContent = "Failed to load feed: " + e.message;
    } finally {
      loadMoreBtn.disabled = false;
      loadMoreBtn.textContent = "Load more";
    }
  }

  selectAllCheckbox.onchange = function () {
    var checked = selectAllCheckbox.checked;
    Object.keys(rowsById).forEach(function (id) {
      var entry = rowsById[id];
      if (entry.activity.hasKudoed) return;
      entry.checkbox.checked = checked;
      if (checked) selected[id] = true;
      else delete selected[id];
    });
    updateKudoButton();
  };

  loadMoreBtn.onclick = loadPage;

  kudoAllBtn.onclick = async function () {
    var ids = Object.keys(selected);
    if (ids.length === 0) return;
    kudoAllBtn.disabled = true;
    selectAllCheckbox.disabled = true;
    var sent = 0, failed = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      status.textContent = "Sending kudos… " + (sent + failed + 1) + " / " + ids.length;
      try {
        var ok = await sendKudo(id);
        if (ok) { markKudoed(id); sent++; }
        else failed++;
      } catch (e) {
        failed++;
      }
      if (i < ids.length - 1) await new Promise(function (r) { setTimeout(r, STAGGER_MS); });
    }
    status.textContent = sent + " kudo" + (sent === 1 ? "" : "s") + " sent" + (failed ? " · " + failed + " failed" : "");
    selectAllCheckbox.disabled = false;
    updateKudoButton();
    updateSelectAllState();
  };

  loadPage();
})();
