// ========================================
// 更新公告.js
// ========================================
// 配置区：每次更新只需修改这里
const UPDATE_CONFIG = {
  version: 'v1.0.3',
  content: `
🎉 欢迎使用 HuIOS！

【更新】
· 真正的后台消息推送

【修复】
· 修复弹窗层级低问题
· 修复iOS长按编辑框不显示问题
  `.trim()
};

// ========================================
// 以下不需要修改
// ========================================
(function() {
  const STORAGE_KEY = 'skipUpdateNotice_' + UPDATE_CONFIG.version;

  function shouldShow() {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  }

  function markSkip() {
    localStorage.setItem(STORAGE_KEY, '1');
  }

  function closeNotice() {
    const mask = document.getElementById('updateNoticeMask');
    if (!mask) return;
    mask.style.opacity = '0';
    mask.style.transform = 'scale(0.96)';
    setTimeout(() => {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 250);
  }

  function showNotice() {
    if (!shouldShow()) return;

    const mask = document.createElement('div');
    mask.id = 'updateNoticeMask';
    mask.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      opacity: 0;
      transition: opacity 0.25s ease;
    `;

    mask.innerHTML = `
      <div id="updateNoticeBox" style="
        background: white;
        border-radius: 18px;
        width: min(88vw, 360px);
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        transform: translateY(16px);
        transition: transform 0.25s ease;
      ">
        <div style="
          padding: 20px 20px 14px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
          text-align: center;
        ">
          <div style="
            display: inline-block;
            background: linear-gradient(135deg, var(--primary, #B8A9C9), var(--primary-dark, #9D8BB8));
            color: white;
            font-size: 12px;
            font-weight: 600;
            padding: 3px 12px;
            border-radius: 20px;
            letter-spacing: 1px;
            margin-bottom: 8px;
          ">${UPDATE_CONFIG.version}</div>
          <div style="font-size: 17px; font-weight: 700; color: #222;">更新公告</div>
        </div>

        <div style="
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          font-size: 14px;
          color: #444;
          line-height: 1.8;
          white-space: pre-wrap;
          -webkit-overflow-scrolling: touch;
        ">${escapeHtml(UPDATE_CONFIG.content)}</div>

        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
        ">
          <button id="updateNoticeSkip" style="
            padding: 14px;
            border: none;
            background: none;
            font-size: 14px;
            color: #999;
            cursor: pointer;
            border-right: 1px solid #f0f0f0;
            font-family: inherit;
          ">本次不再提示</button>
          <button id="updateNoticeClose" style="
            padding: 14px;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 600;
            color: var(--primary-dark, #9D8BB8);
            cursor: pointer;
            font-family: inherit;
          ">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(mask);

    requestAnimationFrame(() => {
      mask.style.opacity = '1';
      const box = document.getElementById('updateNoticeBox');
      if (box) box.style.transform = 'translateY(0)';
    });

    mask.addEventListener('click', function(e) {
      if (e.target === mask) closeNotice();
    });

    document.getElementById('updateNoticeClose').onclick = function() {
      closeNotice();
    };

    document.getElementById('updateNoticeSkip').onclick = function() {
      markSkip();
      closeNotice();
    };
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNotice);
  } else {
    showNotice();
  }
})();
const PUSH_API_BASE = "https://huios-push-production.up.railway.app";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function initNotifyStatus() {
    const statusEl = document.getElementById("notifyStatusText");
    const toggleEl = document.getElementById("notifyOn");
    const testEl = document.getElementById("testNotifyItem");

    if (!statusEl || !toggleEl) return;

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        statusEl.textContent = "当前浏览器不支持推送";
        toggleEl.checked = false;
        if (testEl) testEl.style.display = "none";
        return;
    }

    try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();

        if (sub) {
            statusEl.textContent = "已开启推送";
            toggleEl.checked = true;
            if (testEl) testEl.style.display = "";
        } else {
            statusEl.textContent = "未开启推送";
            toggleEl.checked = false;
            if (testEl) testEl.style.display = "none";
        }
    } catch (e) {
        console.error("检查推送状态失败:", e);
        statusEl.textContent = "推送状态检测失败";
    }
}

async function onNotifyToggle(checked) {
    const statusEl = document.getElementById("notifyStatusText");
    const testEl = document.getElementById("testNotifyItem");
    const toggleEl = document.getElementById("notifyOn");

    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        if (typeof toast === "function") toast("当前浏览器不支持推送");
        if (toggleEl) toggleEl.checked = false;
        return;
    }

    try {
        const reg = await navigator.serviceWorker.ready;

        if (checked) {
            const permission = await Notification.requestPermission();
            if (permission !== "granted") {
                if (toggleEl) toggleEl.checked = false;
                if (statusEl) statusEl.textContent = "通知权限被拒绝";
                return;
            }

            let oldSub = await reg.pushManager.getSubscription();
            if (oldSub) {
                try { await oldSub.unsubscribe(); } catch (e) {}
            }

            const publicKey = await fetch(`${PUSH_API_BASE}/vapid-public-key`, {
                method: "GET",
                cache: "no-store"
            }).then(r => r.text());

            const sub = await reg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            const subData = sub.toJSON ? sub.toJSON() : JSON.parse(JSON.stringify(sub));

const userId = (typeof D !== 'undefined' && D.currentAccId) ? D.currentAccId : 'default';
const resp = await fetch(`${PUSH_API_BASE}/subscribe`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    mode: "cors",
    body: JSON.stringify({ sub: subData, userId })
});

            if (!resp.ok) {
                const text = await resp.text();
                throw new Error(text || ("HTTP " + resp.status));
            }

            if (statusEl) statusEl.textContent = "已开启推送";
            if (testEl) testEl.style.display = "";
            if (toggleEl) toggleEl.checked = true;
            if (typeof toast === "function") toast("推送已开启");
        } else {
            const sub = await reg.pushManager.getSubscription();
            if (sub) await sub.unsubscribe();
            if (statusEl) statusEl.textContent = "未开启推送";
            if (testEl) testEl.style.display = "none";
            if (typeof toast === "function") toast("推送已关闭");
        }
    } catch (e) {
        console.error("切换推送失败:", e);
        if (toggleEl) toggleEl.checked = false;
        if (statusEl) statusEl.textContent = "开启失败";
        if (typeof toast === "function") toast("推送开启失败");
    }
}

async function sendTestNotify() {
    try {
        const userId = (typeof D !== 'undefined' && D.currentAccId) ? D.currentAccId : 'default';
        const res = await fetch(`${PUSH_API_BASE}/send-test?userId=${encodeURIComponent(userId)}`, {
            method: "GET"
        });
        const text = await res.text();
        if (res.ok) {
            if (typeof toast === "function") toast("测试通知已发送");
        } else {
            alert("发送失败：" + text);
        }
    } catch (e) {
        alert("发送失败：" + e.message);
    }
}

async function pushNotify(title, body, options) {
    try {
        var url = "https://huios.pages.dev";
        var icon = "";
        var tag = "huios-push";
        if (typeof options === "object" && options) {
            url = options.url || url;
            icon = options.icon || "";
            tag = options.tag || tag;
        }
        const userId = (typeof D !== 'undefined' && D.currentAccId) ? D.currentAccId : 'default';
        await fetch(PUSH_API_BASE + "/send-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, body, url, icon, tag, userId })
        });
    } catch (e) {
        console.error("推送失败:", e);
    }
}
async function showPushDebug() {
    const lines = [];

    // 1. 浏览器支持情况
    lines.push('=== 环境 ===');
    lines.push('ServiceWorker: ' + ('serviceWorker' in navigator ? '支持' : '不支持'));
    lines.push('PushManager: ' + ('PushManager' in window ? '支持' : '不支持'));
    lines.push('Notification权限: ' + (Notification.permission));

    // 2. userId
    const userId = (typeof D !== 'undefined' && D.currentAccId) ? D.currentAccId : 'default';
    lines.push('');
    lines.push('=== 用户 ===');
    lines.push('userId: ' + userId);

    // 3. SW 状态
    lines.push('');
    lines.push('=== Service Worker ===');
    try {
        const reg = await navigator.serviceWorker.ready;
        lines.push('SW状态: 已就绪');
        const sub = await reg.pushManager.getSubscription();
        if (sub) {
            lines.push('订阅状态: 已订阅');
            lines.push('endpoint: ' + sub.endpoint.slice(0, 50) + '...');
        } else {
            lines.push('订阅状态: 未订阅');
        }
    } catch (e) {
        lines.push('SW状态: 异常 - ' + e.message);
    }

    // 4. 公钥获取
    lines.push('');
    lines.push('=== 服务器 ===');
    try {
        const key = await fetch(`${PUSH_API_BASE}/vapid-public-key`, { cache: 'no-store' }).then(r => r.text());
        lines.push('公钥获取: 成功');
        lines.push('公钥: ' + key.slice(0, 20) + '...');
    } catch (e) {
        lines.push('公钥获取: 失败 - ' + e.message);
    }

    // 5. 服务器订阅情况
    try {
        const data = await fetch(`${PUSH_API_BASE}/subscriptions?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }).then(r => r.json());
        lines.push('我的订阅数: ' + data.filtered);
        if (data.subs && data.subs.length) {
            data.subs.forEach(function(s, i) {
                lines.push('  设备' + (i+1) + ': ' + s.endpoint + ' 密钥:' + (s.hasKeys ? '有' : '无'));
            });
        }
    } catch (e) {
        lines.push('服务器订阅查询: 失败 - ' + e.message);
    }

    // 弹窗
    const mask = document.createElement('div');
    mask.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
    mask.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:min(90vw,400px);max-height:75vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="padding:16px 20px;border-bottom:1px solid #f0f0f0;font-weight:700;font-size:16px;">推送调试信息</div>
            <div style="flex:1;overflow-y:auto;padding:16px 20px;font-size:12px;font-family:monospace;white-space:pre-wrap;line-height:1.8;color:#333;">${lines.join('\n')}</div>
            <div style="border-top:1px solid #f0f0f0;">
                <button onclick="this.closest('div').parentNode.parentNode.remove()" style="width:100%;padding:14px;border:none;background:none;font-size:15px;font-weight:600;color:#9D8BB8;cursor:pointer;">确定</button>
            </div>
        </div>
    `;
    document.body.appendChild(mask);
    mask.addEventListener('click', function(e) { if (e.target === mask) mask.remove(); });
}