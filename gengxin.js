const PUSH_API_BASE = window.PUSH_API_BASE || "https://huios-push.onrender.com";

const PUSH_ENABLED_KEY = "huios_push_enabled";
const PUSH_SUB_UPLOADED_KEY = "huios_push_sub_uploaded";

function normalizeUid(v) {
  return String(v || "").replace(/^acc_/, "");
}

function getUnifiedUserId() {
  if (typeof D !== "undefined" && D.currentAccId) {
    return normalizeUid(D.currentAccId);
  }

  let id = localStorage.getItem("huios_uid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("huios_uid", id);
  }
  return normalizeUid(id);
}

function getPushUserId() {
  // 推送、bg、pull 全部同一個
  return getUnifiedUserId();
}

function getBgUserId() {
  return getUnifiedUserId();
}

function setPushWanted(enabled) {
  localStorage.setItem(PUSH_ENABLED_KEY, enabled ? "1" : "0");
}

function getPushWanted() {
  return localStorage.getItem(PUSH_ENABLED_KEY) === "1";
}

function setPushUploaded(flag) {
  localStorage.setItem(PUSH_SUB_UPLOADED_KEY, flag ? "1" : "0");
}

function getPushUploaded() {
  return localStorage.getItem(PUSH_SUB_UPLOADED_KEY) === "1";
}

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
  ]);
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

async function getReadyRegistration() {
  await ensureSwRegistered();
  return await withTimeout(navigator.serviceWorker.ready, 8000, "SW未就绪");
}

async function getLocalSubscription() {
  const reg = await getReadyRegistration();
  return await reg.pushManager.getSubscription();
}

async function uploadSubscription(sub) {
  const subData = sub.toJSON ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
  const userId = getPushUserId();

  const resp = await fetch(`${PUSH_API_BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sub: subData, userId })
  });

  if (!resp.ok) throw new Error("上报失败: " + resp.status);
  setPushUploaded(true);
}

async function ensurePushSubscribed() {
  const reg = await getReadyRegistration();

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("通知权限被拒绝");
  }

  const publicKey = await fetch(`${PUSH_API_BASE}/vapid-public-key`, {
    cache: "no-store"
  }).then(r => {
    if (!r.ok) throw new Error("获取公钥失败: " + r.status);
    return r.text();
  });

  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await withTimeout(
      reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      }),
      10000,
      "创建订阅超时"
    );
  }

  await uploadSubscription(sub);
  return sub;
}

function updateNotifyUI(state) {
  const statusEl = document.getElementById("notifyStatusText");
  const testEl = document.getElementById("testNotifyItem");
  const toggleEl = document.getElementById("notifyOn");

  if (toggleEl && typeof state.checked === "boolean") {
    toggleEl.checked = state.checked;
  }
  if (statusEl && state.text != null) {
    statusEl.textContent = state.text;
  }
  if (testEl) {
    testEl.style.display = state.checked ? "" : "none";
  }
}

async function onNotifyToggle(checked) {
  const toggleEl = document.getElementById("notifyOn");

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    updateNotifyUI({
      checked: false,
      text: "当前浏览器不支持推送"
    });
    setPushWanted(false);
    setPushUploaded(false);
    return;
  }

  try {
    if (!checked) {
      const sub = await getLocalSubscription();
      if (sub) await sub.unsubscribe();

      setPushWanted(false);
      setPushUploaded(false);

      updateNotifyUI({
        checked: false,
        text: "未开启推送"
      });
      return;
    }

    updateNotifyUI({
      checked: true,
      text: "正在开启推送..."
    });

    await ensurePushSubscribed();

setPushWanted(true);
queueBgSync(300);

updateNotifyUI({
  checked: true,
  text: "已开启推送"
});
  } catch (e) {
    console.error("切换推送失败:", e);

    if (checked) {
      setPushWanted(false);
      setPushUploaded(false);
    }

    updateNotifyUI({
      checked: false,
      text: "开启失败：" + (e.message || e)
    });

    if (toggleEl) toggleEl.checked = false;
  }
}

async function initNotifyStatus() {
  const statusEl = document.getElementById("notifyStatusText");
  const toggleEl = document.getElementById("notifyOn");
  if (!statusEl || !toggleEl) return;

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    updateNotifyUI({
      checked: false,
      text: "当前浏览器不支持推送"
    });
    return;
  }

  const wanted = getPushWanted();

  updateNotifyUI({
    checked: wanted,
    text: wanted ? "正在检查推送状态..." : "未开启推送"
  });

  try {
    const sub = await getLocalSubscription();

    if (sub) {
      updateNotifyUI({
        checked: true,
        text: "已开启推送"
      });

      setPushWanted(true);

      try {
  await uploadSubscription(sub); // 每次都补传，服务端按 endpoint 去重
} catch (e) {
  console.warn("补传订阅失败:", e);
  setPushUploaded(false);
}
      return;
    }

    if (!wanted) {
      updateNotifyUI({
        checked: false,
        text: "未开启推送"
      });
      return;
    }

    setPushUploaded(false);
    updateNotifyUI({
      checked: false,
      text: "推送已失效，请重新开启"
    });
  } catch (e) {
    console.warn("推送状态检测失败:", e);

    updateNotifyUI({
      checked: wanted,
      text: wanted ? "推送状态检测失败，请稍后重试" : "未开启推送"
    });
  }
}

async function sendTestNotify() {
  try {
    const userId = getPushUserId();
    const res = await fetch(`${PUSH_API_BASE}/send-test?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(await res.text());
    if (typeof toast === "function") toast("测试通知已发送");
  } catch (e) {
    alert("发送失败：" + e.message);
  }
}

async function sendBgPush(payloadOrTitle, body, data) {
  if (!getPushWanted()) {
    return { ok: false, skipped: true, reason: "push not enabled" };
  }

  const payload = (payloadOrTitle && typeof payloadOrTitle === "object")
    ? payloadOrTitle
    : { title: payloadOrTitle, body, data };

  const userId = getPushUserId();
  const res = await fetch(`${PUSH_API_BASE}/send-push`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  userId: userId,
  title: (payload && payload.title) ? payload.title : "HuiOS",
  body: (payload && payload.body) ? payload.body : "",
  url: (payload && payload.url) ? payload.url : "https://huios.pages.dev",
  tag: (payload && payload.tag) ? payload.tag : "huios-bg",
  icon: (payload && payload.icon) ? payload.icon : ""
})
  });

  if (!res.ok) throw new Error("推送发送失败: " + res.status);

  const j = await res.json().catch(() => ({}));
  // 核心：必须至少发到1个订阅才算成功
  if (!j.ok || Number(j.sent || 0) < 1) {
    throw new Error(`服务端未送达（sent=${j.sent || 0}, total=${j.total || 0}）`);
  }
  return j;
}

function getBgBaseUrl() {
  return PUSH_API_BASE;
}

function getBgLastInteractSafe() {
  try {
    if (typeof lastInteract !== "undefined") return lastInteract || {};
    if (typeof window.lastInteract !== "undefined") return window.lastInteract || {};
  } catch (e) {}
  return {};
}

function getBgLastBgTimeMap(chars) {
  const map = {};
  (chars || []).forEach(c => {
    if (!c || !c.id) return;
    map[c.id] = c.lastBgTime || 0;
  });
  return map;
}

async function syncBgDataToServer() {
  try {
    if (typeof getAccData !== "function") {
      console.warn("[bgSync] skip: getAccData not ready");
      return null;
    }

    const data = getAccData();
    if (!data) {
      console.warn("[bgSync] skip: accData empty");
      return null;
    }

    var trimmedChats = {};
    try {
      var chatObj = data.chats || {};
      var chatKeys = Object.keys(chatObj);
      for (var i = 0; i < chatKeys.length; i++) {
        var cid = chatKeys[i];
        var arr = chatObj[cid];
        trimmedChats[cid] = Array.isArray(arr) ? arr.slice(-20) : [];
      }
    } catch (chatErr) {
      console.warn("[bgSync] trimChats error:", chatErr);
      trimmedChats = {};
    }

    var userId = getBgUserId();
    var settings = {};
    var api = {};
    try {
      if (typeof D !== "undefined") {
        settings = D.settings || {};
        api = D.api || {};
      }
    } catch (e) {}

    var payload = {
      userId: userId,
      chars: (data.chars || []).map(function(c) {
        return {
          id: c.id,
          realName: c.realName || "",
          displayName: c.displayName || "",
          persona: c.persona || "",
          avatar: c.avatar || "",
          bgEnabled: c && c.bgEnabled === true
        };
      }),
      chats: trimmedChats,
      settings: settings,
      api: api,
      lastInteract: getBgLastInteractSafe(),
    };

    console.log("[bgSync] sending", {
      userId: payload.userId,
      chars: payload.chars.length,
      chatKeys: Object.keys(payload.chats).length,
      hasApiKey: !!(payload.api && payload.api.key),
      model: (payload.api && payload.api.model) ? payload.api.model : "",
      bgOn: !!(payload.settings && payload.settings.bgOn),
      bgInterval: payload.settings.bgInterval
    });

    var bodyStr = JSON.stringify(payload);
    console.log("[bgSync] payload size:", bodyStr.length);

    var res = await fetch(getBgBaseUrl() + "/bg/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: bodyStr
    });

    if (!res.ok) {
      var errTxt = await res.text().catch(function() { return ""; });
      console.warn("[bgSync] server error:", res.status, errTxt);
      throw new Error("bg/sync fail: " + res.status);
    }

    var j = await res.json().catch(function() { return {}; });
    console.log("[bgSync] ok:", j);
    return j;
  } catch (e) {
    console.warn("[bgSync] failed:", e && e.message ? e.message : e);
    return null;
  }
}
let __bgSyncTimer = null;
let __bgPullTimer = null;

function queueBgSync(delay = 1000) {
  clearTimeout(__bgSyncTimer);
  __bgSyncTimer = setTimeout(() => {
    syncBgDataToServer();
  }, delay);
}

async function pullBgDataFromServer() {
  try {
    if (typeof getAccData !== "function") return;
    const data = getAccData();
    if (!data) return;

    const userId = getBgUserId();
    const res = await fetch(`${getBgBaseUrl()}/bg/pull?userId=${encodeURIComponent(userId)}`, {
      cache: "no-store"
    });

    if (!res.ok) {
      throw new Error(`bg/pull 失败: ${res.status}`);
    }

    const j = await res.json();
    if (!j || !j.ok) return;

    let changed = false;
    let msgCount = 0;
    let momentCount = 0;

    (j.newMsgs || []).forEach(msg => {
      if (!msg || !msg.charId || !msg.content) return;

      if (!data.chats) data.chats = {};
      if (!Array.isArray(data.chats[msg.charId])) data.chats[msg.charId] = [];

      data.chats[msg.charId].push({
        role: "ai",
        content: msg.content,
        time: msg.time || Date.now(),
        isBg: true
      });

      if (Array.isArray(data.chars)) {
        const c = data.chars.find(x => String(x.id) === String(msg.charId));
        if (c) c.lastBgTime = msg.time || Date.now();
      }

      changed = true;
      msgCount++;
    });

    (j.newMoments || []).forEach(m => {
  if (!m || !m.charId || !m.content) return;

  if (!Array.isArray(data.moments)) data.moments = [];

  data.moments.unshift({
    id: m.id || (`bgm_${m.charId}_${m.time || Date.now()}`),
    authorId: m.charId,
    authorType: "ai",
    content: m.content,
    images: [],
    location: "",
    visibleGroups: [],
    likes: [],
    comments: [],
    time: m.time || Date.now(),
    isBg: true
  });

  changed = true;
  momentCount++;
});

    if (changed) {
      if (typeof save === "function") save();
      console.log("[bgPull] merged", { msgCount, momentCount });
    }
  } catch (e) {
    console.warn("[bgPull] failed:", e);
  }
}

function startBgPullLoop() {
  if (__bgPullTimer) clearInterval(__bgPullTimer);

  pullBgDataFromServer();
  __bgPullTimer = setInterval(() => {
    pullBgDataFromServer();
  }, 15000);
}
let __bgSyncLoopTimer = null;

function startBgSyncLoop() {
  if (__bgSyncLoopTimer) clearInterval(__bgSyncLoopTimer);
  syncBgDataToServer();
  __bgSyncLoopTimer = setInterval(() => {
    syncBgDataToServer();
  }, 30000);
}

function initBgSyncAndPull() {
  queueBgSync(500);
  startBgSyncLoop();   // 新增
  startBgPullLoop();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      queueBgSync(300);
      pullBgDataFromServer();
    } else {
      syncBgDataToServer(); // 切后台补一次
    }
  });

  window.addEventListener("beforeunload", () => {
    try { syncBgDataToServer(); } catch (e) {}
  });
}
async function showPushDebug() {
  var lines = [];
  lines.push("=== 推送基础 ===");
  lines.push("userId: " + getPushUserId());
  lines.push("推送开关: " + (getPushWanted() ? "是" : "否"));

  // 只发一个请求，不再同步
  lines.push("");
  lines.push("=== 后台推送状态 ===");
  lines.push("正在查询...");

  // 先弹出基础信息
  var uid = getPushUserId();

  try {
    var debugRes = await fetch(PUSH_API_BASE + "/bg/debug-status?userId=" + encodeURIComponent(uid), { cache: "no-store" }).then(function(r) { return r.json(); });

    var lines2 = [];
    lines2.push("=== 推送基础 ===");
    lines2.push("userId: " + uid);
    lines2.push("推送开关: " + (getPushWanted() ? "是" : "否"));
    lines2.push("");
    lines2.push("=== 后台推送状态 ===");

    if (!debugRes || !debugRes.ok) {
      lines2.push("获取失败");
    } else if (!debugRes.exists) {
      lines2.push("服务端无数据（未同步成功）");
    } else {
      lines2.push("后台开关: " + (debugRes.bgOn ? "开✅" : "关❌"));
      lines2.push("设定间隔: " + debugRes.intervalSec + "秒");

      var chars = debugRes.chars || [];
      if (chars.length === 0) {
        lines2.push("无角色数据");
      }
      for (var i = 0; i < chars.length; i++) {
        var c = chars[i];
        lines2.push("");
        lines2.push("【" + (c.name || c.charId) + "】");
        lines2.push("  后台启用: " + (c.bgEnabled ? "是✅" : "否❌"));

        if (c.reason === "user bgOff") {
          lines2.push("  状态: 用户后台关闭");
        } else if (c.reason === "char bgDisabled") {
          lines2.push("  状态: 该角色未启用后台");
        } else if (c.reason === "no lastChat") {
          lines2.push("  状态: 无聊天记录");
        } else if (c.ready) {
          lines2.push("  状态: 就绪 🟢");
        } else {
          lines2.push("  剩余: " + c.remainingSec + "秒");
          lines2.push("  原因: " + (c.reason === "waiting lastChat" ? "距上次聊天太近" : "距上次后台生成太近"));
        }
      }
    }
    alert(lines2.join("\n"));
  } catch (e) {
    alert("查询失败: " + e.message);
  }
}

async function ensureSwRegistered() {
  if (!("serviceWorker" in navigator)) {
    throw new Error("当前浏览器不支持 Service Worker");
  }

  try {
    const reg = await navigator.serviceWorker.getRegistration("/");
    if (reg) return reg;
  } catch (e) {}

  return await navigator.serviceWorker.register("/sw.js");
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initNotifyStatus();
    initBgSyncAndPull();
  });
} else {
  initNotifyStatus();
  initBgSyncAndPull();
}

// 2) 页面内自检（2秒后弹窗）
window.bgPushSelfCheck = function () {
  var lines = [];
  lines.push("bgOn=" + !!(window.D && D.settings && D.settings.bgOn));
  lines.push("bgDmOn=" + !!(window.D && D.settings && D.settings.bgDmOn));
  lines.push("bgMomentOn=" + !!(window.D && D.settings && D.settings.bgMomentOn));
  lines.push("sendBgPush=" + typeof window.sendBgPush);
  lines.push("doBgActivity=" + typeof window.doBgActivity);
  lines.push("processBgResponse=" + typeof window.processBgResponse);
  lines.push("通知权限=" + (window.Notification ? Notification.permission : "不支持"));
  alert("[后台推送自检]\n" + lines.join("\n"));
};

// 3) 一键测试推送
window.testBgPushNow = function () {
  window.sendBgPush("测试推送", "如果你看到了，推送通道是通的", { type: "test" });
  if (typeof toast === "function") toast("已触发测试推送");
};

setTimeout(function () {
  try { window.bgPushSelfCheck(); } catch (e) {}
}, 2000);

window.forceBgParseTest = function () {
  try {
    var acc = (typeof getAccData === "function" && getAccData()) ? getAccData() : {};
    var chars = Array.isArray(acc.chars) ? acc.chars : [];
    var char = window.curChar || chars.find(function (c) { return c && c.bgEnabled; }) || chars[0];

    if (!char) return alert("没有可用角色");
    if (typeof processBgResponse !== "function") return alert("processBgResponse 不存在");

processBgResponse(char, "<DM>这是一条后台私聊测试</DM>");
    alert("已强制注入 <DM>，看是否收到推送");
  } catch (e) {
    alert("测试失败：" + (e.message || e));
  }
};

// ===== 设置页：延迟测试讯息（30s）=====
let __delayTestTimer = null;
let __delayTestDueAt = 0;
let __delayTestTick = null;

function __delaySecLeft() {
  return Math.max(0, Math.ceil((__delayTestDueAt - Date.now()) / 1000));
}

function __updateDelayTestBtnUI() {
  const btn = document.getElementById("delayTestMsgBtn");
  const label = document.getElementById("delayTestBtnLabel");
  if (!btn || !label) return;

  if (__delayTestTimer) {
    btn.textContent = "取消（" + __delaySecLeft() + "s）";
    label.textContent = "延迟测试讯息（倒计时中）";
    if (!__delayTestTick) {
      __delayTestTick = setInterval(() => {
        if (!__delayTestTimer) return;
        btn.textContent = "取消（" + __delaySecLeft() + "s）";
      }, 1000);
    }
  } else {
    btn.textContent = "开始";
    label.textContent = "延迟测试讯息（30s）";
    if (__delayTestTick) {
      clearInterval(__delayTestTick);
      __delayTestTick = null;
    }
  }
}

async function __fireDelayTestPush() {
  try {
    const r = await sendBgPush({
      title: "HuiOS 调试推送",
      body: "30秒延迟测试成功：后台推送链路可用",
      tag: "huios-delay-test",
      url: "https://huios.pages.dev"
    });

    if (typeof toast === "function") {
      toast("延迟推送已完成（sent=" + (r.sent || 0) + "）");
    }
  } catch (e) {
    alert("延迟推送失败：" + (e.message || e));
  } finally {
    __delayTestTimer = null;
    __delayTestDueAt = 0;
    __updateDelayTestBtnUI();
  }
}

async function startDelayBgPushTest() {
  try {
    if (!getPushWanted()) throw new Error("你还没开启推送开关");

    const uid = getPushUserId();
    const s = await fetch(`${PUSH_API_BASE}/subscriptions?userId=${encodeURIComponent(uid)}`).then(r => r.json());
    if (!s || !s.ok || Number(s.filtered || 0) < 1) {
      throw new Error("服务器无可用订阅，请先重新开启推送");
    }

    const r = await sendBgPushDelayed({
      title: "HuiOS 调试推送",
      body: "30秒延迟测试成功：后台推送链路可用",
      tag: "huios-delay-test-" + Date.now(),
      url: "https://huios.pages.dev"
    }, 30000);

    if (!r.queued) {
      throw new Error("任务未入队：" + (r.reason || "unknown"));
    }

    if (typeof toast === "function") toast("已提交延迟推送任务（30秒）");
    console.log("[delayTest] queued", r);
  } catch (e) {
    alert("延迟推送失败：" + (e.message || e));
  }
}
async function sendBgPushDelayed(payload, delayMs) {
  const userId = getPushUserId();
  const res = await fetch(`${PUSH_API_BASE}/send-push-delay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title: payload?.title || "HuiOS",
      body: payload?.body || "",
      url: payload?.url || "https://huios.pages.dev",
      tag: payload?.tag || ("delay-test-" + Date.now()),
      icon: payload?.icon || "",
      delayMs: Number(delayMs || 30000)
    })
  });
  if (!res.ok) throw new Error("延迟接口失败: " + res.status);
  return await res.json();
}
window.startDelayBgPushTest = startDelayBgPushTest;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", __updateDelayTestBtnUI);
} else {
  __updateDelayTestBtnUI();
}