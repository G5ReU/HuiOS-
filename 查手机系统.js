// ========================================
// 查手机系统.js
// ========================================
// ========== Dock入口 ==========
function openPhoneFromDock() {
    // 从dock打开，需要先选择角色
    const data = getAccData();
    if (!data || !data.chars || !data.chars.length) {
        return toast('还没有角色，请先创建');
    }
    
    // 如果只有一个角色，直接打开
    if (data.chars.length === 1) {
        return openPhone(data.chars[0].id);
    }
    
    // 多个角色，弹出选择
    const html = `
        <div style="padding:12px">
            <h3 style="margin:0 0 12px;font-size:16px;color:#333">选择要查看的角色</h3>
            <div style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto">
                ${data.chars.map(c => `
                    <div onclick="closePhoneModal();openPhone('${c.id}')" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f8f8f8;border-radius:10px;cursor:pointer">
                        <div style="width:40px;height:40px;border-radius:50%;background:var(--primary-light);display:flex;align-items:center;justify-content:center;font-size:20px">
                            ${c.avatar && c.avatar.length > 2 ? '<img src="'+c.avatar+'" style="width:100%;height:100%;border-radius:50%;object-fit:cover">' : (c.avatar || c.realName.charAt(0))}
                        </div>
                        <div style="flex:1">
                            <div style="font-weight:500;color:#333">${esc(c.displayName)}</div>
                            <div style="font-size:12px;color:#999">${esc(c.realName)}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
            <button onclick="closePhoneModal()" style="width:100%;margin-top:12px;padding:10px;border:none;border-radius:10px;background:#f0f0f0;cursor:pointer">取消</button>
        </div>
    `;
    showPhoneModal(html);
}

// ========== 数据结构 ==========
function getPhoneData(charId) {
  const ad = getAccData();
  if (!ad.phoneData) ad.phoneData = {};
  if (!ad.phoneData[charId]) {
    ad.phoneData[charId] = {
      charId,
      widgets: [],
      apps: {
        wechat:   { generated: false, content: null },
        alipay:   { generated: false, content: null },
        taobao:   { generated: false, content: null },
        maps:     { generated: false, content: null },
        browser:  { generated: false, content: null },
        tieba:    { generated: false, content: null },
        mail:     { generated: false, content: null },
        music:    { generated: false, content: null },
        settings: { generated: false, content: null }
      }
    };
  }
  return ad.phoneData[charId];
}

function savePhoneData() {
  save();
}

// ========== App配置 ==========
const PHONE_APPS = [
  { id: 'wechat',   name: '微信',    icon: '💬', color: '#07C160' },
  { id: 'alipay',   name: '支付宝',  icon: '💰', color: '#1677FF' },
  { id: 'taobao',   name: '淘宝',    icon: '🛒', color: '#FF5000' },
  { id: 'maps',     name: '地图',    icon: '🗺️', color: '#3385FF' },
  { id: 'browser',  name: '浏览器',  icon: '🌐', color: '#4285F4' },
  { id: 'tieba',    name: '百度贴吧', icon: '📮', color: '#614BF7' },
  { id: 'mail',     name: '邮箱',    icon: '📧', color: '#EA4335' },
  { id: 'music',    name: '网易云',  icon: '🎵', color: '#C20C0C' },
  { id: 'settings', name: '设置',    icon: '⚙️', color: '#8E8E93' }
];

// ========== 小组件配置 ==========
const PHONE_WIDGETS = [
  { id: 'weather',  name: '天气',   sizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'calendar', name: '日历',   sizes: ['1x1', '2x1'], defaultSize: '1x1' },
  { id: 'memo',     name: '便签',   sizes: ['2x1', '2x2'], defaultSize: '2x1' },
  { id: 'steps',    name: '步数',   sizes: ['1x1'],        defaultSize: '1x1' },
  { id: 'nowplay',  name: '音乐',   sizes: ['2x1'],        defaultSize: '2x1' },
  { id: 'mood',     name: '心情',   sizes: ['1x1', '2x1'], defaultSize: '1x1' },
  { id: 'countdown',name: '倒计时', sizes: ['2x1'],        defaultSize: '2x1' },
  { id: 'photo',    name: '相册',   sizes: ['2x2'],        defaultSize: '2x2' }
];

// ========== 当前状态 ==========
let currentPhoneCharId = null;
let phoneEditMode = false;

// ========== 打开查手机 ==========
function openPhone(charId) {
  currentPhoneCharId = charId;
  const char = getAccData().chars.find(c => c.id === charId);
  if (!char) return toast('找不到角色');
  
  const data = getPhoneData(charId);
  
  // 创建页面
  let page = document.getElementById('phonePage');
  if (!page) {
    page = document.createElement('div');
    page.id = 'phonePage';
    page.className = 'phone-page';
    document.body.appendChild(page);
  }
  
  page.innerHTML = `
    <div class="phone-container">
      <!-- 状态栏 -->
      <div class="phone-status-bar">
        <span class="phone-time">${getTimeStr()}</span>
        <div class="phone-status-icons">
          <span>📶</span>
          <span>WiFi</span>
          <span>🔋</span>
        </div>
      </div>
      
     <!-- 桌面区域 -->
<div class="phone-desktop" id="phoneDesktop">
  <div class="phone-pages" id="phonePages">
    <!-- 第一页 -->
    <div class="phone-page-slide" id="phonePage1">
      <div class="phone-widgets" id="phoneWidgets"></div>
      <div class="phone-apps" id="phoneApps"></div>
    </div>
    <!-- 第二页 -->
    <div class="phone-page-slide" id="phonePage2">
      <div class="phone-apps" id="phoneAppsAI"></div>
    </div>
  </div>
  <!-- 页面指示器 -->
  <div class="phone-page-dots" id="phonePageDots">
    <div class="phone-page-dot active" data-page="0"></div>
    <div class="phone-page-dot" data-page="1"></div>
  </div>
</div>
      
      <!-- 底部工具栏 -->
      <div class="phone-toolbar">
        <button class="phone-toolbar-btn" onclick="openPhoneBatchGen()">📦 批量生成</button>
        <button class="phone-toolbar-btn" onclick="togglePhoneEditMode()">✏️ 编辑桌面</button>
        <button class="phone-toolbar-btn" onclick="phoneDiscardAll()">🗑️ 全部丢弃</button>
        <button class="phone-toolbar-btn" onclick="closePhone()">✕ 关闭</button>
      </div>
      
      <!-- App窗口容器 -->
      <div class="phone-app-window" id="phoneAppWindow" style="display:none;"></div>
      
      <!-- 编辑模式工具栏 -->
      <div class="phone-edit-toolbar" id="phoneEditToolbar" style="display:none;">
        <button onclick="openWidgetPicker()">➕ 添加小组件</button>
        <button onclick="exitPhoneEditMode()">✓ 完成</button>
      </div>
    </div>
  `;
  
// 第一步：先初始化AI应用全局变量
const _phoneData = getPhoneData(charId);
if (_phoneData.aiApps && _phoneData.aiApps.length > 0) {
  // 不删除，只把未完成的重置为可重试状态
  _phoneData.aiApps.forEach(app => {
    if (!app.generated || !app.content) {
      app.generated = false;
      app.content = null;
      app._failed = true; // 标记为可重试，不是生成中
    }
  });
  savePhoneData();
}
phoneAIApps = (_phoneData.aiApps && _phoneData.aiApps.length > 0)
  ? _phoneData.aiApps : [];
phoneCurrentPage = 0;

// 第二步：再渲染
renderPhoneWidgets();
renderPhoneApps();
initPhoneSwipe();
  page.style.display = 'flex';
requestAnimationFrame(() => {
  page.classList.add('show');
});
}

function closePhone() {
  const page = document.getElementById('phonePage');
  if (page) {
    page.classList.remove('show');
    setTimeout(() => { page.style.display = 'none'; }, 300);
  }
  currentPhoneCharId = null;
}

// ========== 渲染小组件 ==========
function renderPhoneWidgets() {
  const container = document.getElementById('phoneWidgets');
  if (!container) return;
  
  const data = getPhoneData(currentPhoneCharId);
  
  if (!data.widgets.length) {
    container.innerHTML = `<div class="phone-widgets-empty">长按编辑桌面添加小组件</div>`;
    return;
  }
  
  container.innerHTML = data.widgets.map((w, i) => {
    const cfg = PHONE_WIDGETS.find(x => x.id === w.type);
    return `
      <div class="phone-widget phone-widget-${w.size}" data-idx="${i}" 
           ${phoneEditMode ? 'draggable="true"' : ''}>
        ${phoneEditMode ? `<button class="widget-delete" onclick="deleteWidget(${i})">✕</button>` : ''}
        <div class="widget-content" onclick="onWidgetClick('${w.type}', ${i})">
          ${renderWidgetContent(w)}
        </div>
      </div>
    `;
  }).join('');
}

function renderWidgetContent(widget) {
  if (!widget.generated || !widget.content) {
    return `
      <div class="widget-empty">
        <span>${PHONE_WIDGETS.find(x => x.id === widget.type)?.name || '组件'}</span>
        <small>点击生成</small>
      </div>
    `;
  }
  
  const c = widget.content;
  switch (widget.type) {
    case 'weather':
      return `
        <div class="widget-weather">
          <span class="weather-icon">${c.icon}</span>
          <span class="weather-temp">${c.temp}°C</span>
          <span class="weather-desc">${c.desc}</span>
          <span class="weather-city">${c.city}</span>
        </div>
      `;
    case 'calendar':
      return `
        <div class="widget-calendar">
          <div class="cal-date">${c.month}月${c.day}日</div>
          <div class="cal-weekday">${c.weekday}</div>
          ${c.event ? `<div class="cal-event">${c.event}</div>` : ''}
        </div>
      `;
    case 'memo':
      return `
        <div class="widget-memo">
          <div class="memo-text">${c.text}</div>
        </div>
      `;
    case 'steps':
      return `
        <div class="widget-steps">
          <div class="steps-num">${c.steps}</div>
          <div class="steps-label">步</div>
        </div>
      `;
    case 'mood':
      return `
        <div class="widget-mood">
          <span class="mood-emoji">${c.emoji}</span>
          <span class="mood-text">${c.text}</span>
        </div>
      `;
    case 'countdown':
      return `
        <div class="widget-countdown">
          <div class="cd-days">${c.days}</div>
          <div class="cd-label">距${c.event}还有${c.days}天</div>
        </div>
      `;
    case 'nowplay':
      return `
        <div class="widget-nowplay" onclick="event.stopPropagation();openPhoneApp('music')">
          <div class="np-title">${c.song}</div>
          <div class="np-artist">${c.artist}</div>
          <div class="np-controls">
            <span>⏮</span><span>▶️</span><span>⏭</span>
          </div>
        </div>
      `;
    case 'photo':
      return `
        <div class="widget-photo">
          <div class="photo-grid">
            ${(c.photos || []).map(p => `<div class="photo-item">${p.desc}</div>`).join('')}
          </div>
        </div>
      `;
    default:
      return `<div>未知组件</div>`;
  }
}

// ========== 渲染App图标 ==========
function renderPhoneApps() {
  const container = document.getElementById('phoneApps');
  if (!container) return;
  
  const data = getPhoneData(currentPhoneCharId);
  
  container.innerHTML = PHONE_APPS.map(app => {
    const appData = data.apps[app.id];
    const hasContent = appData?.generated;
    return `
      <div class="phone-app-icon" onclick="openPhoneApp('${app.id}')">
        <div class="app-icon-bg" style="background:${app.color}">
          <span class="app-icon-emoji">${app.icon}</span>
        </div>
        <span class="app-icon-name">${app.name}</span>
        ${hasContent ? '<span class="app-badge">●</span>' : ''}
      </div>
    `;
  }).join('');
}

// ========== 编辑模式 ==========
function togglePhoneEditMode() {
  phoneEditMode = !phoneEditMode;
  document.getElementById('phoneEditToolbar').style.display = phoneEditMode ? 'flex' : 'none';
  renderPhoneWidgets();
}

function exitPhoneEditMode() {
  phoneEditMode = false;
  document.getElementById('phoneEditToolbar').style.display = 'none';
  renderPhoneWidgets();
}

function openWidgetPicker() {
  const data = getPhoneData(currentPhoneCharId);
  const existingTypes = data.widgets.map(w => w.type);
  const available = PHONE_WIDGETS.filter(w => !existingTypes.includes(w.id));
  
  if (!available.length) {
    return toast('已添加所有小组件');
  }
  
  const html = `
    <div class="widget-picker">
      <h3>添加小组件</h3>
      <div class="widget-picker-list">
        ${available.map(w => `
          <div class="widget-picker-item" onclick="addWidget('${w.id}')">
            <span class="wpi-name">${w.name}</span>
            <span class="wpi-sizes">${w.sizes.join(' / ')}</span>
          </div>
        `).join('')}
      </div>
      <button onclick="closePhoneModal()">取消</button>
    </div>
  `;
  showPhoneModal(html);
}

function addWidget(type) {
  const cfg = PHONE_WIDGETS.find(w => w.id === type);
  if (!cfg) return;
  
  const data = getPhoneData(currentPhoneCharId);
  data.widgets.push({
    type,
    size: cfg.defaultSize,
    generated: false,
    content: null
  });
  savePhoneData();
  closePhoneModal();
  renderPhoneWidgets();
}

function deleteWidget(idx) {
  const data = getPhoneData(currentPhoneCharId);
  data.widgets.splice(idx, 1);
  savePhoneData();
  renderPhoneWidgets();
}

// ========== 小组件点击生成 ==========
async function onWidgetClick(type, idx) {
  if (phoneEditMode) return;
  
  const data = getPhoneData(currentPhoneCharId);
  const widget = data.widgets[idx];
  
  if (widget.generated) {
    // 已生成，可以做其他操作，比如刷新
    if (confirm('重新生成此组件内容？')) {
      widget.generated = false;
      widget.content = null;
    } else {
      return;
    }
  }
  
  toast('生成中...');
  widget.content = await generateWidgetContent(type);
  widget.generated = true;
  savePhoneData();
  renderPhoneWidgets();
  toast('已生成');
}

async function generateWidgetContent(type) {
  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const chats = getAccData().chats[currentPhoneCharId] || [];
  const recent = chats.slice(-50);
  
  const prompt = buildWidgetPrompt(type, char, recent);
  
  try {
    const resp = await callPhoneAI(prompt);
    return JSON.parse(resp);
  } catch (e) {
    console.error('Widget生成失败', e);
    return getDefaultWidgetContent(type);
  }
}

function buildWidgetPrompt(type, char, recent) {
  const chatText = recent.map(m => `${m.role === 'user' ? '用户' : char.name}: ${m.content}`).join('\n');
  
  const templates = {
    weather: `返回JSON：{"icon":"天气emoji","temp":温度数字,"desc":"天气描述","city":"城市名"}`,
    calendar: `返回JSON：{"month":月,"day":日,"weekday":"星期X","event":"今日行程或null"}`,
    memo: `返回JSON：{"text":"便签内容，角色写给自己的备忘"}`,
    steps: `返回JSON：{"steps":今日步数数字}`,
    mood: `返回JSON：{"emoji":"心情emoji","text":"一句话描述心情"}`,
    countdown: `返回JSON：{"days":天数,"event":"事件名称"}`,
    nowplay: `返回JSON：{"song":"歌曲名","artist":"歌手名"}`,
    photo: `返回JSON：{"photos":[{"desc":"照片描述"},{"desc":"照片描述"},{"desc":"照片描述"}]}`
  };
  
  return `你是${char.name}。根据以下信息生成手机小组件内容。

【角色人设】
${char.persona || '无'}

【最近聊天记录】
${chatText || '无'}

【任务】
生成${PHONE_WIDGETS.find(w => w.id === type)?.name}小组件的内容。
${templates[type] || '返回合适的JSON'}

只返回JSON，不要其他内容。`;
}

function getDefaultWidgetContent(type) {
  const defaults = {
    weather: { icon: '☀️', temp: 25, desc: '晴', city: '未知' },
    calendar: { month: new Date().getMonth() + 1, day: new Date().getDate(), weekday: '星期一', event: null },
    memo: { text: '暂无内容' },
    steps: { steps: 0 },
    mood: { emoji: '😐', text: '一般' },
    countdown: { days: 0, event: '未设置' },
    nowplay: { song: '暂无播放', artist: '' },
    photo: { photos: [] }
  };
  return defaults[type] || {};
}

// ========== 打开App ==========
function openPhoneApp(appId) {
  const win = document.getElementById('phoneAppWindow');
  if (!win) return;
  
  const app = PHONE_APPS.find(a => a.id === appId);
  if (!app) return;
  
  win.innerHTML = `
    <div class="phone-app-header" style="background:${app.color}">
      <button class="phone-back-btn" onclick="closePhoneApp()">←</button>
      <span class="phone-app-title">${app.name}</span>
      <button class="phone-app-menu-btn" onclick="openPhoneAppMenu('${appId}')">⋮</button>
    </div>
    <div class="phone-app-body" id="phoneAppBody"></div>
  `;
  
  win.style.display = 'flex';
  win.classList.add('show');
  
  // 渲染对应app内容
  renderPhoneAppContent(appId);
}

function closePhoneApp() {
  // 清理AI应用的定时器
  if (window._aiAppTimers) {
    window._aiAppTimers.forEach(id => { clearInterval(id); clearTimeout(id); });
    window._aiAppTimers = [];
  }
  const win = document.getElementById('phoneAppWindow');
  if (win) {
    win.classList.remove('show');
    setTimeout(() => win.style.display = 'none', 300);
  }
}

function openPhoneAppMenu(appId) {
  const data = getPhoneData(currentPhoneCharId);
  const appData = data.apps[appId];
  
  const html = `
    <div class="phone-app-menu">
      <button onclick="generatePhoneApp('${appId}');closePhoneModal()">
        ${appData?.generated ? '🔄 重新生成' : '✨ 生成内容'}
      </button>
      ${appData?.generated ? `<button onclick="discardPhoneApp('${appId}');closePhoneModal()">🗑️ 丢弃内容</button>` : ''}
      <button onclick="closePhoneModal()">取消</button>
    </div>
  `;
  showPhoneModal(html);
}

// ========== 渲染App内容 ==========
function renderPhoneAppContent(appId) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  
  const data = getPhoneData(currentPhoneCharId);
  const appData = data.apps[appId];
  
  if (!appData?.generated) {
    body.innerHTML = `
      <div class="phone-app-empty">
        <p>暂无内容</p>
        <button class="phone-gen-btn" onclick="generatePhoneApp('${appId}')">✨ 生成内容</button>
      </div>
    `;
    return;
  }
  
  // 根据不同app渲染
  switch (appId) {
    case 'wechat':
      renderWechatApp(body, appData.content);
      break;
    case 'music':
      renderMusicApp(body, appData.content);
      break;
    case 'alipay':
      renderAlipayApp(body, appData.content);
      break;
    case 'taobao':
      renderTaobaoApp(body, appData.content);
      break;
    case 'maps':
      renderMapsApp(body, appData.content);
      break;
    case 'browser':
      renderBrowserApp(body, appData.content);
      break;
    case 'tieba':
      renderTiebaApp(body, appData.content);
      break;
    case 'mail':
      renderMailApp(body, appData.content);
      break;
    case 'settings':
      renderSettingsApp(body, appData.content);
      break;
    default:
      body.innerHTML = `<div>未实现</div>`;
  }
}

// ========== 生成App内容 ==========
async function generatePhoneApp(appId) {
  const data = getPhoneData(currentPhoneCharId);
  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const chats = getAccData().chats[currentPhoneCharId] || [];
  const recent = chats.slice(-50);
  const appName = PHONE_APPS.find(a => a.id === appId)?.name || appId;

  // 显示生成中状态
  const body = document.getElementById('phoneAppBody');
  if (body) {
    body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#aaa;">
        <div style="font-size:32px;animation:spin 1s linear infinite;">⏳</div>
        <div style="font-size:15px;">正在生成 ${appName} 内容…</div>
      </div>
    `;
  }

  const prompt = buildAppPrompt(appId, char, recent);

  try {
    const resp = await callPhoneAI(prompt);
    data.apps[appId].content = JSON.parse(resp);
    data.apps[appId].generated = true;
    savePhoneData();

// 淘宝：批量生成商品图
if (appId === 'taobao') {
  await generateTaobaoImages(data.apps.taobao.content);
  savePhoneData();
}

    renderPhoneAppContent(appId);
    renderPhoneApps();

    // 成功提示
    showPhoneStatusBar(`✅ ${appName} 内容生成成功`);
  } catch (e) {
    console.error('App生成失败', e);

    // 失败提示
    if (body) {
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;color:#aaa;">
          <div style="font-size:32px;">❌</div>
          <div style="font-size:15px;color:#ff6b6b;">${appName} 生成失败</div>
          <div style="font-size:12px;color:#666;padding:0 20px;text-align:center;">${e.message}</div>
          <button onclick="generatePhoneApp('${appId}')" style="margin-top:8px;padding:10px 24px;background:#1677ff;color:white;border:none;border-radius:20px;font-size:14px;">重试</button>
        </div>
      `;
    }
    showPhoneStatusBar(`❌ ${appName} 生成失败：${e.message}`);
  }
}

function buildAppPrompt(appId, char, recent) {
  const chatText = recent.map(m => `${m.role === 'user' ? '用户' : char.name}: ${m.content}`).join('\n');
  
  const templates = {
    wechat: `生成微信内容，返回JSON：
{
  "chats": [
    {
      "name": "联系人名",
      "avatar": "emoji头像",
      "messages": [
        {"from": "对方或self", "text": "消息内容", "time": "时间"}
      ]
    }
  ],
"moments": [
  {"content": "朋友圈内容", "time": "时间", "likes": 数量, "comments": [{"name":"","text":""}], "images": [{"prompt":"photo of [英文图片描述]","desc":"图片说明"}]}
],
  "deleted": [
    {"name": "联系人名", "messages": [{"from":"","text":""}]}
  ]
}
生成3-5个聊天对象，其中可能包含和用户相关的对话。朋友圈2-3条。已删除聊天1个。`,
    
    alipay: `生成支付宝内容，返回JSON：
{
  "balance": "余额显示，如 ****.**",
  "bills": [
    {"type": "支出/收入", "title": "商户名", "amount": "金额", "time": "时间"}
  ],
  "yuebao": "余额宝金额",
  "creditScore": "芝麻信用分"
}
生成10-15条账单记录，体现角色的消费习惯。`,
    
taobao: `生成淘宝内容，返回JSON：
{
  "history": [{"title":"商品名，风格贴近真实淘宝标题，带关键词","price":"价格数字不带¥","img":"商品emoji","imgPrompt":"product photo of [商品英文描述], white background, studio lighting, commercial photography"}],
  "cart": [{"title":"商品名","price":"价格","img":"商品emoji","imgPrompt":"product photo of [商品英文描述], white background, studio lighting, commercial photography"}],
  "orders": [{"title":"商品名","price":"价格","img":"商品emoji","status":"已签收/派送中/处理中/等待发货","time":"时间","imgPrompt":"product photo of [商品英文描述], white background, studio lighting, commercial photography"}],
  "favorites": [{"title":"商品名","price":"价格","img":"商品emoji","imgPrompt":"product photo of [商品英文描述], white background, studio lighting, commercial photography"}]
}
history浏览记录5-8条，cart购物车2-4条，orders订单3-5条，favorites收藏3-5条，体现角色的购物喜好。imgPrompt必须是英文Stable Diffusion提示词。`,
    
    maps: `生成地图内容，返回JSON：
{
  "recent": [{"name":"地点名","address":"地址","time":"搜索时间"}],
  "favorites": [{"name":"地点名","tag":"标签如家/公司"}],
  "history": [{"from":"出发地","to":"目的地","time":"时间"}]
}
各3-5条，体现角色的活动范围。`,
    
    browser: `生成浏览器内容，返回JSON：
{
  "history": [{"title":"网页标题","url":"简化的url","time":"时间"}],
  "bookmarks": [{"title":"书签名","url":"url"}],
  "tabs": [{"title":"标签页标题"}]
}
历史记录10-15条，书签5-8条，标签页3-5个。体现角色的兴趣和内心。`,
    
    tieba: `生成百度贴吧内容，返回JSON：
{
  "following": [{"name":"吧名","icon":"emoji"}],
  "posts": [
    {
      "bar":"吧名",
      "title":"帖子标题",
      "content":"帖子正文，详细内容，200字左右",
      "time":"时间",
      "replies":回复数量,
      "comments":[
        {"name":"用户名","avatar":"emoji","content":"回复内容","time":"时间","likes":点赞数},
        {"name":"用户名","avatar":"emoji","content":"回复内容","time":"时间","likes":点赞数,"isAuthor":true}
      ]
    }
  ],
  "replies": [{"bar":"吧名","post":"帖子标题","content":"回复内容","time":"时间"}]
}
关注5-8个吧，发帖3-5个，每个帖子配5-8条评论，其中isAuthor为true表示楼主（角色）本人回复，回复5-8条。内容真实丰富，体现角色的兴趣爱好和性格。`,
    
    mail: `生成邮箱内容，返回JSON：
{
  "inbox": [{"from":"发件人","subject":"主题","preview":"预览","time":"时间","read":是否已读}],
  "sent": [{"to":"收件人","subject":"主题","preview":"预览","time":"时间"}],
  "spam": [{"from":"发件人","subject":"主题"}]
}
收件箱8-10封，发件箱3-5封，垃圾邮件2-3封。`,
    
    music: `生成网易云内容，返回JSON：
{
  "playlists": [
    {"name": "歌单名", "songs": [{"name":"歌曲名","artist":"歌手"}]}
  ],
  "recent": [{"name":"歌曲名","artist":"歌手","time":"播放时间"}],
  "likes": [{"name":"歌曲名","artist":"歌手"}],
  "comments": [{"song":"歌曲名","content":"评论内容","likes":点赞数}]
}
生成2-3个歌单，每个5-8首歌。最近播放10首。评论3-5条，要走心。`,
    
    settings: `生成手机设置内容，返回JSON：
{
  "profile": {
    "nickname": "昵称",
    "avatar": "头像emoji", 
    "phone": "手机号如138****1234",
    "birthday": "生日",
    "location": "地区"
  },
  "device": {
    "model": "手机型号",
    "system": "系统版本",
    "storage": "存储使用如64G/128G"
  },
  "lastLogin": "上次登录时间",
  "signature": "个性签名"
}`
  };
  
  return `你是${char.name}。根据以下信息生成手机${PHONE_APPS.find(a => a.id === appId)?.name}的内容。

【角色人设】
${char.persona || '无'}

【最近和用户的聊天记录】
${chatText || '无'}

【任务】
${templates[appId] || '生成合适的内容，返回JSON'}

输出要求：直接输出JSON，第一个字符必须是{，最后一个字符必须是}，不要任何其他内容。`;
}

// ========== 微信App渲染 ==========
function renderWechatApp(body, content) {
  body.style.background = '#f0f0f0';
  body.style.fontFamily = '-apple-system,BlinkMacSystemFont,SF Pro Text,sans-serif';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#ededed">
      <!-- 顶部tab -->
      <div style="display:flex;background:#f7f7f7;border-bottom:0.5px solid #d0d0d0;flex-shrink:0">
        ${[['chats','聊天'],['contacts','通讯录'],['discover','发现']].map(([k,v],i) => `
          <button id="wxTab_${k}" onclick="switchWechatTab('${k}')"
            style="flex:1;padding:10px 0;border:none;font-size:13px;cursor:pointer;
            background:${i===0?'#f7f7f7':'#f7f7f7'};
            color:${i===0?'#07C160':'#333'};
            border-bottom:${i===0?'2px solid #07C160':'2px solid transparent'};
            font-weight:${i===0?'600':'400'};
            font-family:-apple-system,BlinkMacSystemFont,sans-serif">
            ${v}
          </button>
        `).join('')}
      </div>
      <div id="wechatContent" style="flex:1;overflow-y:auto"></div>
    </div>
  `;
  body.dataset.content = JSON.stringify(content);
  renderWechatChatsTab(content.chats);
}

function switchWechatTab(tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const content = JSON.parse(body.dataset.content || '{}');
  // 更新tab样式
  ['chats','contacts','discover'].forEach(k => {
    const btn = document.getElementById('wxTab_' + k);
    if (!btn) return;
    btn.style.color = k === tab ? '#07C160' : '#333';
    btn.style.borderBottom = k === tab ? '2px solid #07C160' : '2px solid transparent';
    btn.style.fontWeight = k === tab ? '600' : '400';
  });
  const container = document.getElementById('wechatContent');
  if (!container) return;
  switch(tab) {
    case 'chats':    renderWechatChatsTab(content.chats); break;
    case 'contacts': renderWechatContactsTab(content.chats); break;
    case 'discover': renderWechatDiscoverTab(content.moments); break;
  }
}

 function renderWechatChatsTab(chats) {
  const container = document.getElementById('wechatContent');
  if (!container) return;
  if (!chats?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无聊天</div>';
    return;
  }
  container.innerHTML = `
    <div style="background:#ededed">
      ${chats.map((chat, i) => {
        const lastMsg = chat.messages?.[chat.messages.length - 1];
        const unread = chat.unread || 0;
        return `
          <div onclick="openWechatChat(${i})"
            style="display:flex;align-items:center;gap:12px;padding:12px 16px;background:white;border-bottom:0.5px solid #e8e8e8;cursor:pointer;active:background:#d0d0d0">
            <div style="position:relative;flex-shrink:0">
              <div style="width:46px;height:46px;border-radius:6px;background:linear-gradient(135deg,#a8d8a8,#4a9d4a);display:flex;align-items:center;justify-content:center;font-size:24px">
                ${chat.avatar || '👤'}
              </div>
              ${unread > 0 ? `<div style="position:absolute;top:-4px;right:-4px;background:#ff4444;color:white;font-size:10px;min-width:16px;height:16px;border-radius:8px;display:flex;align-items:center;justify-content:center;padding:0 4px">${unread}</div>` : ''}
            </div>
            <div style="flex:1;min-width:0">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
                <span style="font-size:16px;font-weight:500;color:#111">${chat.name}</span>
                <span style="font-size:12px;color:#999">${lastMsg?.time || ''}</span>
              </div>
              <div style="font-size:13px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${lastMsg?.from === 'self' ? '' : ''}${lastMsg?.text || ''}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function openWechatChat(idx) {
  const body = document.getElementById('phoneAppBody');
  const content = JSON.parse(body.dataset.content || '{}');
  const chat = content.chats[idx];
  if (!chat) return;

  const container = document.getElementById('wechatContent');
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#ededed">
      <!-- 顶部导航 -->
      <div style="display:flex;align-items:center;padding:10px 12px;background:#f7f7f7;border-bottom:0.5px solid #d0d0d0;flex-shrink:0">
        <button onclick="switchWechatTab('chats')"
          style="background:none;border:none;font-size:20px;color:#07C160;cursor:pointer;padding:0 8px 0 0">‹</button>
        <span style="flex:1;text-align:center;font-size:16px;font-weight:600;color:#111;font-family:-apple-system,sans-serif">${chat.name}</span>
        <span style="width:36px"></span>
      </div>
      <!-- 消息区 -->
      <div id="wxMsgList" style="flex:1;overflow-y:auto;padding:12px 12px 8px">
        ${(chat.messages || []).map((m, mi) => renderWechatBubble(m, chat, mi)).join('')}
      </div>
      <!-- 输入栏 -->
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f7f7f7;border-top:0.5px solid #d0d0d0;flex-shrink:0">
        <div style="flex:1;background:white;border-radius:6px;padding:8px 12px;font-size:14px;color:#bbb;border:0.5px solid #e0e0e0">
          输入消息…
        </div>
        <button style="background:#07C160;color:white;border:none;border-radius:6px;padding:8px 14px;font-size:14px;cursor:pointer">发送</button>
      </div>
    </div>
  `;
  // 滚动到底部
  setTimeout(() => {
    const list = document.getElementById('wxMsgList');
    if (list) list.scrollTop = list.scrollHeight;
  }, 50);
}

function renderWechatBubble(m, chat, idx) {
  const isSelf = m.from === 'self';
  return `
    <div style="display:flex;flex-direction:${isSelf ? 'row-reverse' : 'row'};align-items:flex-end;gap:8px;margin-bottom:12px">
      <!-- 头像 -->
      <div style="width:38px;height:38px;border-radius:6px;background:${isSelf ? 'linear-gradient(135deg,#a8d8ea,#4a9dcc)' : 'linear-gradient(135deg,#a8d8a8,#4a9d4a)'};display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
        ${isSelf ? '🙂' : (chat.avatar || '👤')}
      </div>
      <div style="max-width:65%;display:flex;flex-direction:column;${isSelf ? 'align-items:flex-end' : 'align-items:flex-start'}">
        <!-- 名字 -->
        <span style="font-size:11px;color:#999;margin-bottom:4px;padding:0 4px">${isSelf ? '我' : chat.name}</span>
        <!-- 气泡 -->
        <div style="position:relative">
          <div style="background:${isSelf ? '#07C160' : 'white'};color:${isSelf ? 'white' : '#111'};
            padding:9px 13px;border-radius:${isSelf ? '12px 4px 12px 12px' : '4px 12px 12px 12px'};
            font-size:15px;line-height:1.5;word-break:break-all;
            box-shadow:0 1px 2px rgba(0,0,0,0.08);
            font-family:-apple-system,BlinkMacSystemFont,sans-serif">
            ${m.text}
          </div>
        </div>
        <!-- 时间+已读 -->
        <div style="font-size:10px;color:#bbb;margin-top:3px;padding:0 4px">
          ${m.time || ''}${isSelf ? ' 已读' : ''}
        </div>
      </div>
    </div>
  `;
}

function renderWechatMoments(moments) {
  if (!moments?.length) return '<div class="empty">暂无朋友圈</div>';
  
  return `
    <div class="wechat-moments">
      ${moments.map(m => `
        <div class="moment-item">
          <div class="moment-content">${m.content}</div>
          <div class="moment-time">${m.time}</div>
          <div class="moment-actions">
            <span>❤️ ${m.likes || 0}</span>
            <span>💬 ${m.comments?.length || 0}</span>
          </div>
          ${m.comments?.length ? `
            <div class="moment-comments">
              ${m.comments.map(c => `<div><b>${c.name}</b>: ${c.text}</div>`).join('')}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  `;
}

function renderWechatDeleted(deleted) {
  if (!deleted?.length) return '<div class="empty">无已删除聊天</div>';
  
  return `
    <div class="wechat-deleted">
      <div class="deleted-warning">⚠️ 已删除的聊天记录</div>
      ${deleted.map(d => `
        <div class="deleted-chat">
          <div class="deleted-name">${d.name}</div>
          ${d.messages.map(m => `
            <div class="deleted-msg ${m.from === 'self' ? 'self' : ''}">
              <span class="msg-from">${m.from === 'self' ? '我' : d.name}:</span>
              ${m.text}
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

// ========== 网易云App渲染 ==========
let currentPlaylist = [];
let currentPlaylistIdx = -1;
let audioPlayer = null;
let musicLyrics = [];
let lyricsScrollLock = false;
let playerBgUrl = '';
let playerCoverUrl = '';
const _phoneMusicLists = {};

function renderMusicApp(body, content) {
  body.innerHTML = `
    <div class="music-tabs">
      <button class="music-tab active" onclick="switchMusicTab('playlists',event)">歌单</button>
      <button class="music-tab" onclick="switchMusicTab('recent',event)">最近</button>
      <button class="music-tab" onclick="switchMusicTab('likes',event)">喜欢</button>
      <button class="music-tab" onclick="switchMusicTab('comments',event)">评论</button>
    </div>
    <div class="music-content" id="musicContent">
      ${renderMusicPlaylists(content.playlists)}
    </div>
  `;
  body.dataset.content = JSON.stringify(content);
  ensureMusicPlayer();
}

function switchMusicTab(tab, e) {
  if (e) {
    document.querySelectorAll('.music-tab').forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
  }
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const content = JSON.parse(body.dataset.content || '{}');
  const container = document.getElementById('musicContent');
  if (!container) return;
  switch (tab) {
    case 'playlists': container.innerHTML = renderMusicPlaylists(content.playlists); break;
    case 'recent':   container.innerHTML = renderMusicList(content.recent, '最近播放', 'recent'); break;
    case 'likes':    container.innerHTML = renderMusicList(content.likes, '我喜欢的音乐', 'likes'); break;
    case 'comments': container.innerHTML = renderMusicComments(content.comments); break;
  }
}

function renderMusicPlaylists(playlists) {
  if (!playlists?.length) return '<div class="music-empty">暂无歌单</div>';
  return `<div class="music-playlists">
    ${playlists.map((p, i) => `
      <div class="playlist-item" onclick="openPlaylist(${i})">
        <div class="playlist-cover">🎵</div>
        <div class="playlist-info">
          <div class="playlist-name">${p.name}</div>
          <div class="playlist-count">${p.songs?.length || 0} 首</div>
        </div>
        <span class="playlist-arrow">›</span>
      </div>
    `).join('')}
  </div>`;
}

function openPlaylist(idx) {
  const body = document.getElementById('phoneAppBody');
  const content = JSON.parse(body.dataset.content || '{}');
  const playlist = content.playlists[idx];
  if (!playlist) return;

  // 存到全局，避免 HTML 属性转义问题
  const listKey = 'playlist_' + idx;
  _phoneMusicLists[listKey] = playlist.songs || [];

  const container = document.getElementById('musicContent');
  container.innerHTML = `
    <div class="playlist-detail">
      <div class="playlist-detail-header">
        <button class="music-back-btn" onclick="switchMusicTab('playlists')">← 返回</button>
        <span class="playlist-detail-name">${playlist.name}</span>
      </div>
      <div class="song-list">
        ${(playlist.songs || []).map((s, i) => `
          <div class="song-item" onclick="playSongFromList('${listKey}',${i})">
            <span class="song-index">${i + 1}</span>
            <div class="song-info">
              <div class="song-name">${s.name}</div>
              <div class="song-artist">${s.artist}</div>
            </div>
            <span class="song-play-btn">▶</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderMusicList(songs, title, listKey) {
  if (!songs?.length) return `<div class="music-empty">暂无${title}</div>`;

  // 存到全局
  _phoneMusicLists[listKey] = songs;

  return `<div class="music-list">
    <div class="music-list-title">${title}</div>
    ${songs.map((s, i) => `
      <div class="song-item" onclick="playSongFromList('${listKey}',${i})">
        <span class="song-index">${i + 1}</span>
        <div class="song-info">
          <div class="song-name">${s.name}</div>
          <div class="song-artist">${s.artist}</div>
        </div>
        <span class="song-play-btn">▶</span>
      </div>
    `).join('')}
  </div>`;
}

function renderMusicComments(comments) {
  if (!comments?.length) return '<div class="music-empty">暂无评论</div>';
  return `<div class="music-comments">
    <div class="music-list-title">我的评论</div>
    ${comments.map(c => `
      <div class="music-comment-item">
        <div class="comment-song-name">🎵 ${c.song}</div>
        <div class="comment-text">"${c.content}"</div>
        <div class="comment-likes">❤️ ${c.likes || 0}</div>
      </div>
    `).join('')}
  </div>`;
}

// ========== 播放逻辑 ==========
function playSongFromList(listKey, idx) {
  const songs = _phoneMusicLists[listKey];
  if (!songs || !songs[idx]) return toast('找不到歌曲');
  currentPlaylist = songs;
  currentPlaylistIdx = idx;
  playSong(songs[idx].name, songs[idx].artist);
}

async function playSong(name, artist) {
  ensureMusicPlayer();
  const player = document.getElementById('floatMusicPlayer');
  if (player) player.style.display = 'flex';

  updatePlayerUI(name, artist, true);
  musicLyrics = [];
  renderLyrics([]);

  // 重置封面
  const img = document.getElementById('playerCoverImg');
  const fallback = document.getElementById('playerCoverFallback');
  if (!playerCoverUrl) {
    if (img) { img.src = ''; img.style.display = 'none'; }
    if (fallback) fallback.style.display = 'flex';
  }

  try {
    const searchUrl = `https://music-api.gdstudio.xyz/api.php?types=search&source=netease&name=${encodeURIComponent(name + ' ' + artist)}&count=1&pages=1`;
    const searchResp = await fetch(searchUrl);
    const searchData = await searchResp.json();

    if (!searchData?.[0]) {
      showMusicError('未找到歌曲：' + name);
      updatePlayerUI(name, artist, false);
      return;
    }

    const songInfo = searchData[0];

    // artist字段是数组，取名字
    const artistName = Array.isArray(songInfo.artist)
      ? songInfo.artist.map(a => typeof a === 'object' ? (a.name || a) : a).join(' / ')
      : (songInfo.artist || artist);

    updatePlayerUI(songInfo.name || name, artistName, true);

    // 获取播放链接
    const urlResp = await fetch(`https://music-api.gdstudio.xyz/api.php?types=url&source=netease&id=${songInfo.id}&br=320`);
    const urlData = await urlResp.json();

    if (!urlData?.url) {
      showMusicError('获取播放链接失败，可能版权受限');
      updatePlayerUI(name, artist, false);
      return;
    }

    if (!audioPlayer) {
      audioPlayer = new Audio();
      audioPlayer.addEventListener('timeupdate', onAudioTimeUpdate);
      audioPlayer.addEventListener('ended', nextSong);
      audioPlayer.addEventListener('error', () => showMusicError('播放出错，请重试'));
    }

    audioPlayer.src = urlData.url;
    await audioPlayer.play();
    updatePlayerUI(songInfo.name || name, artistName, false, true);

    // 用正确的pic_id加载封面
    if (songInfo.pic_id && !playerCoverUrl) loadCover(songInfo.pic_id);

    // 用正确的lyric_id加载歌词
    const lyricId = songInfo.lyric_id || songInfo.id;
    loadLyrics(lyricId);

  } catch(e) {
    console.error('播放失败', e);
    showMusicError('网络错误：' + e.message);
    updatePlayerUI(name, artist, false);
  }
}

async function loadCover(picId) {
  if (playerCoverUrl) return; // 用户自定义了封面，不覆盖
  try {
    const url = `https://music-api.gdstudio.xyz/api.php?types=pic&source=netease&id=${picId}&size=300`;
    const resp = await fetch(url);
    const data = await resp.json();
    const picUrl = data?.url || '';
    if (!picUrl) return;

    const img = document.getElementById('playerCoverImg');
    const fallback = document.getElementById('playerCoverFallback');
    if (img) {
      img.onload = () => {
        img.style.display = 'block';
        if (fallback) fallback.style.display = 'none';
      };
      img.onerror = () => {
        img.style.display = 'none';
        if (fallback) fallback.style.display = 'flex';
      };
      img.src = picUrl;
    }
  } catch(e) {
    console.log('封面加载失败', e);
  }
}

async function loadLyrics(lyricId) {
  try {
    const resp = await fetch(`https://music-api.gdstudio.xyz/api.php?types=lyric&source=netease&id=${lyricId}`);
    const data = await resp.json();

    let lyrics = [];
    if (data?.lyric) {
      lyrics = parseLrc(data.lyric);
    }

    // 有翻译歌词就合并显示
    if (data?.tlyric && lyrics.length > 0) {
      const tLyrics = parseLrc(data.tlyric);
      // 把翻译行插到原歌词后面
      lyrics = lyrics.map(line => {
        const tLine = tLyrics.find(t => Math.abs(t.time - line.time) < 0.5);
        return tLine
          ? { ...line, text: line.text + '\n' + tLine.text }
          : line;
      });
    }

    if (lyrics.length > 0) {
      musicLyrics = lyrics;
      renderLyrics(lyrics);
    } else {
      renderLyrics([]);
    }
  } catch(e) {
    console.log('歌词加载失败', e);
    renderLyrics([]);
  }
}

// ========== 歌词解析 ==========
function parseLrc(lrc) {
  const lines = lrc.split('\n');
  const result = [];
  const timeReg = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;
  for (const line of lines) {
    const text = line.replace(/\[.*?\]/g, '').trim();
    if (!text) continue;
    let match;
    timeReg.lastIndex = 0;
    while ((match = timeReg.exec(line)) !== null) {
      const min = parseInt(match[1]);
      const sec = parseInt(match[2]);
      const ms  = parseInt(match[3].length === 2 ? match[3] + '0' : match[3]);
      result.push({ time: min * 60 + sec + ms / 1000, text });
    }
  }
  return result.sort((a, b) => a.time - b.time);
}

function parseTxt(txt) {
  return txt.split('\n').filter(l => l.trim()).map((l, i) => ({ time: i * 5, text: l.trim() }));
}

function parseSrt(srt) {
  const blocks = srt.split(/\n\n+/);
  const result = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 3) continue;
    const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
    if (!timeMatch) continue;
    const time = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
    const text = lines.slice(2).join(' ').trim();
    if (text) result.push({ time, text });
  }
  return result;
}

function parseVtt(vtt) {
  const blocks = vtt.split(/\n\n+/);
  const result = [];
  for (const block of blocks) {
    const lines = block.trim().split('\n');
    const timeLine = lines.find(l => l.includes('-->'));
    if (!timeLine) continue;
    const timeMatch = timeLine.match(/(\d{2}):(\d{2})[\.:]([\d.]+)/);
    if (!timeMatch) continue;
    const time = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]) + parseFloat(timeMatch[3]) / (timeMatch[3].length > 2 ? 1000 : 1);
    const text = lines.filter(l => !l.includes('-->') && !/^\d+$/.test(l.trim())).join(' ').trim();
    if (text) result.push({ time, text });
  }
  return result;
}

function renderLyrics(lyrics) {
  const el = document.getElementById('playerLyricsScroll');
  if (!el) return;
  if (!lyrics.length) {
    el.innerHTML = '<div style="text-align:center;padding:20px;color:rgba(255,255,255,0.3);font-size:13px">暂无歌词</div>';
    return;
  }
  el.innerHTML = lyrics.map((l, i) => {
    const lines = l.text.split('\n');
    return `<div class="lyrics-line" data-idx="${i}" data-time="${l.time}"
      onclick="seekToLyric(${l.time})"
      style="text-align:center;padding:6px 8px;font-size:13px;line-height:1.6;cursor:pointer;transition:color 0.3s,font-size 0.3s;color:rgba(255,255,255,0.35)">
      ${lines[0]}
      ${lines[1] ? `<div style="font-size:11px;margin-top:2px;opacity:0.6">${lines[1]}</div>` : ''}
    </div>`;
  }).join('');
}

function seekToLyric(time) {
  if (!audioPlayer) return;
  audioPlayer.currentTime = time;
  if (audioPlayer.paused) audioPlayer.play();
  updatePlayBtn(true);
}

function onAudioTimeUpdate() {
  if (!audioPlayer) return;
  const cur = audioPlayer.currentTime;
  const dur = audioPlayer.duration || 0;

  // 进度条
  const bar = document.getElementById('playerProgressBar');
  if (bar) bar.value = dur ? (cur / dur * 100) : 0;

  // 时间
  const curEl = document.getElementById('playerCurrentTime');
  const durEl = document.getElementById('playerDuration');
  if (curEl) curEl.textContent = formatTime(cur);
  if (durEl) durEl.textContent = formatTime(dur);

  // 歌词高亮
  if (!lyricsScrollLock) syncLyricsHighlight(cur);
}

function syncLyricsHighlight(cur) {
  if (!musicLyrics.length) return;
  let activeIdx = 0;
  for (let i = 0; i < musicLyrics.length; i++) {
    if (musicLyrics[i].time <= cur) activeIdx = i;
    else break;
  }
  const el = document.getElementById('playerLyricsScroll');
  if (!el) return;
  const lines = el.querySelectorAll('.lyrics-line');
  lines.forEach((l, i) => {
    if (i === activeIdx) {
      l.style.color = 'white';
      l.style.fontSize = '14px';
      l.style.fontWeight = '600';
    } else {
      l.style.color = 'rgba(255,255,255,0.35)';
      l.style.fontSize = '13px';
      l.style.fontWeight = 'normal';
    }
  });
  const activeLine = lines[activeIdx];
  if (activeLine) {
    const elRect = el.getBoundingClientRect();
    const lineRect = activeLine.getBoundingClientRect();
    const offset = lineRect.top - elRect.top + el.scrollTop - el.clientHeight / 2 + activeLine.offsetHeight / 2;
    el.scrollTo({ top: offset, behavior: 'smooth' });
  }
}

function updatePlayerUI(name, artist, loading, playing) {
  const nameEl = document.getElementById('playerSongName');
  const artistEl = document.getElementById('playerArtistName');
  const btn = document.getElementById('playerPlayBtn');
  if (nameEl) nameEl.textContent = name;
  if (artistEl) artistEl.textContent = artist;
  if (btn) {
    if (loading) btn.textContent = '⏳';
    else btn.textContent = playing ? '⏸' : '▶';
  }
}

function updatePlayBtn(playing) {
  const btn = document.getElementById('playerPlayBtn');
  if (btn) btn.textContent = playing ? '⏸' : '▶';
}

function togglePlay() {
  if (!audioPlayer) return;
  if (audioPlayer.paused) {
    audioPlayer.play();
    updatePlayBtn(true);
  } else {
    audioPlayer.pause();
    updatePlayBtn(false);
  }
}

function prevSong() {
  if (!currentPlaylist.length) return;
  currentPlaylistIdx = (currentPlaylistIdx - 1 + currentPlaylist.length) % currentPlaylist.length;
  const s = currentPlaylist[currentPlaylistIdx];
  playSong(s.name, s.artist);
}

function nextSong() {
  if (!currentPlaylist.length) return;
  currentPlaylistIdx = (currentPlaylistIdx + 1) % currentPlaylist.length;
  const s = currentPlaylist[currentPlaylistIdx];
  playSong(s.name, s.artist);
}

function formatTime(sec) {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function showMusicError(msg) {
  const el = document.getElementById('playerSongName');
  if (el) el.textContent = msg;
  updatePlayBtn(false);
}

// ========== 悬浮播放器 ==========
function ensureMusicPlayer() {
  if (document.getElementById('floatMusicPlayer')) return;

  const player = document.createElement('div');
  player.id = 'floatMusicPlayer';
  player.style.cssText = `
    display:none;position:absolute;
    left:10px;bottom:70px;
    width:calc(100% - 20px);
    max-height:70%;
    border-radius:18px;
    background:rgba(20,20,30,0.92);
    backdrop-filter:blur(20px);
    z-index:9999;
    flex-direction:column;
    overflow:hidden;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
  `;

  player.innerHTML = `
    <!-- 标题栏 -->
    <div id="playerTitleBar" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px 6px;cursor:move;flex-shrink:0">
      <button onclick="closeMusicPlayer()" style="background:none;border:none;color:#888;font-size:18px;cursor:pointer;padding:0 4px">×</button>
      <span style="font-size:11px;color:#555;letter-spacing:1px">NOW PLAYING</span>
      <button onclick="openPlayerSettings()" style="background:none;border:none;color:#888;font-size:14px;cursor:pointer">⚙</button>
    </div>

    <!-- 封面 -->
    <div style="display:flex;flex-direction:column;align-items:center;padding:0 16px 10px;flex-shrink:0">
      <div style="position:relative;width:90px;height:90px;margin-bottom:10px">
        <img id="playerCoverImg" src="" onerror="this.style.display='none';document.getElementById('playerCoverFallback').style.display='flex'"
          style="width:90px;height:90px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,0.1)">
        <div id="playerCoverFallback" style="display:none;width:90px;height:90px;border-radius:50%;background:linear-gradient(135deg,#C20C0C,#8B0000);align-items:center;justify-content:center;font-size:32px;border:3px solid rgba(255,255,255,0.1)">🎵</div>
      </div>
      <div style="text-align:center">
        <div id="playerSongName" style="color:white;font-size:15px;font-weight:600;margin-bottom:4px">未在播放</div>
        <div id="playerArtistName" style="color:#888;font-size:12px">-</div>
      </div>
    </div>

    <!-- 歌词区 -->
    <div id="playerLyricsScroll" style="flex:1;overflow-y:auto;padding:0 20px;min-height:80px;max-height:160px"
      onscroll="lyricsScrollLock=true;clearTimeout(window._lyricsLockTimer);window._lyricsLockTimer=setTimeout(()=>lyricsScrollLock=false,2000)">
      <div class="lyrics-empty">暂无歌词</div>
    </div>

    <!-- 底部控制区 -->
    <div style="padding:12px 16px 16px;flex-shrink:0;border-top:1px solid rgba(255,255,255,0.06)">
      <!-- 进度条 -->
      <input type="range" id="playerProgressBar" min="0" max="100" value="0"
        style="width:100%;accent-color:#C20C0C;height:3px;cursor:pointer;margin-bottom:4px"
        oninput="onProgressInput(this.value)"
        onchange="onProgressChange(this.value)">
      <div style="display:flex;justify-content:space-between;font-size:10px;color:#666;margin-bottom:12px">
        <span id="playerCurrentTime">0:00</span>
        <span id="playerDuration">0:00</span>
      </div>
      <!-- 控制按钮 -->
      <div style="display:flex;align-items:center;justify-content:space-around">
        <button onclick="prevSong()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;padding:8px">⏮</button>
        <button id="playerPlayBtn" onclick="togglePlay()" style="width:52px;height:52px;border-radius:50%;background:#C20C0C;border:none;color:white;font-size:22px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 16px rgba(194,12,12,0.5)">▶</button>
        <button onclick="nextSong()" style="background:none;border:none;color:white;font-size:22px;cursor:pointer;padding:8px">⏭</button>
      </div>
    </div>

    <!-- 上传歌词按钮 -->
    <div style="padding:0 16px 12px;flex-shrink:0">
      <input type="file" id="lyricsFileInput" accept=".lrc,.txt,.srt,.vtt" style="display:none" onchange="onLyricsFileSelect(event)">
      <button onclick="document.getElementById('lyricsFileInput').click()" style="width:100%;padding:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);border-radius:10px;color:#888;font-size:12px;cursor:pointer">
        + 上传歌词 (.lrc / .txt / .srt / .vtt)
      </button>
    </div>
  `;

  // 挂到 phone-container
  const container = document.querySelector('.phone-container');
  if (container) container.appendChild(player);

  // 进度条拖动
  makeMusicPlayerDraggable(player);
}

function closeMusicPlayer() {
  const p = document.getElementById('floatMusicPlayer');
  if (p) p.style.display = 'none';
}

function onProgressInput(val) {
  // 拖动中实时更新歌词高亮但不跳转
  if (audioPlayer && audioPlayer.duration) {
    const t = val / 100 * audioPlayer.duration;
    syncLyricsHighlight(t);
  }
}

function onProgressChange(val) {
  if (audioPlayer && audioPlayer.duration) {
    audioPlayer.currentTime = val / 100 * audioPlayer.duration;
  }
}

// ========== 播放器拖动 ==========
function makeMusicPlayerDraggable(el) {
  const bar = document.getElementById('playerTitleBar');
  if (!bar) return;
  let startX, startY, origX, origY;
  bar.addEventListener('touchstart', function(e) {
    const t = e.touches[0];
    startX = t.clientX; startY = t.clientY;
    const rect = el.getBoundingClientRect();
    origX = rect.left; origY = rect.top;
  }, { passive: true });
  bar.addEventListener('touchmove', function(e) {
    const t = e.touches[0];
    const dx = t.clientX - startX;
    const dy = t.clientY - startY;
    el.style.left = Math.max(0, origX + dx) + 'px';
    el.style.top  = Math.max(0, origY + dy) + 'px';
    el.style.bottom = 'auto';
  }, { passive: true });
}

// ========== 播放器设置（封面/背景自定义） ==========
function openPlayerSettings() {
  const html = `
    <div style="padding:4px">
      <h3 style="margin:0 0 14px;color:#333;font-size:15px">播放器设置</h3>
      <div style="margin-bottom:12px">
        <div style="font-size:12px;color:#666;margin-bottom:6px">封面图片</div>
        <div style="display:flex;gap:8px">
          <button onclick="setPlayerCoverFromUrl()" style="flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#f8f8f8;font-size:12px;cursor:pointer">🔗 输入URL</button>
          <button onclick="document.getElementById('playerCoverInput').click()" style="flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#f8f8f8;font-size:12px;cursor:pointer">📷 本地图片</button>
          <button onclick="clearPlayerCover()" style="padding:9px;border:1px solid #FFD0D0;border-radius:10px;background:#FFF0F0;color:#FF6B6B;font-size:12px;cursor:pointer">✕</button>
        </div>
        <input type="file" id="playerCoverInput" accept="image/*" style="display:none" onchange="onPlayerCoverFile(event)">
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:#666;margin-bottom:6px">播放器背景</div>
        <div style="display:flex;gap:8px">
          <button onclick="setPlayerBgFromUrl()" style="flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#f8f8f8;font-size:12px;cursor:pointer">🔗 输入URL</button>
          <button onclick="document.getElementById('playerBgInput').click()" style="flex:1;padding:9px;border:1px solid #ddd;border-radius:10px;background:#f8f8f8;font-size:12px;cursor:pointer">📷 本地图片</button>
          <button onclick="clearPlayerBg()" style="padding:9px;border:1px solid #FFD0D0;border-radius:10px;background:#FFF0F0;color:#FF6B6B;font-size:12px;cursor:pointer">✕</button>
        </div>
        <input type="file" id="playerBgInput" accept="image/*" style="display:none" onchange="onPlayerBgFile(event)">
      </div>
      <button onclick="closePhoneModal()" style="width:100%;padding:10px;border:none;border-radius:10px;background:#f0f0f0;font-size:14px;cursor:pointer">关闭</button>
    </div>
  `;
  showPhoneModal(html);
}

function setPlayerCoverFromUrl() {
  const url = prompt('输入封面图片URL：');
  if (!url) return;
  playerCoverUrl = url;
  applyPlayerCover(url);
  closePhoneModal();
}

function onPlayerCoverFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    playerCoverUrl = ev.target.result;
    applyPlayerCover(ev.target.result);
  };
  reader.readAsDataURL(f);
  closePhoneModal();
}

function applyPlayerCover(url) {
  const img = document.getElementById('playerCoverImg');
  const fallback = document.getElementById('playerCoverFallback');
  if (img) { img.src = url; img.style.display = 'block'; }
  if (fallback) fallback.style.display = 'none';
}

function clearPlayerCover() {
  playerCoverUrl = '';
  const img = document.getElementById('playerCoverImg');
  if (img) { img.src = ''; img.style.display = 'none'; }
  const fallback = document.getElementById('playerCoverFallback');
  if (fallback) fallback.style.display = 'flex';
  closePhoneModal();
}

function setPlayerBgFromUrl() {
  const url = prompt('输入背景图片URL：');
  if (!url) return;
  playerBgUrl = url;
  applyPlayerBg(url);
  closePhoneModal();
}

function onPlayerBgFile(e) {
  const f = e.target.files[0]; if (!f) return;
  const reader = new FileReader();
  reader.onload = ev => {
    playerBgUrl = ev.target.result;
    applyPlayerBg(ev.target.result);
  };
  reader.readAsDataURL(f);
  closePhoneModal();
}

function applyPlayerBg(url) {
  const player = document.getElementById('floatMusicPlayer');
  if (player) {
    player.style.backgroundImage = `url(${url})`;
    player.style.backgroundSize = 'cover';
    player.style.backgroundPosition = 'center';
  }
}

function clearPlayerBg() {
  playerBgUrl = '';
  const player = document.getElementById('floatMusicPlayer');
  if (player) {
    player.style.backgroundImage = '';
    player.style.background = 'rgba(20,20,30,0.92)';
  }
  closePhoneModal();
}

// ========== 歌词文件上传 ==========
function onLyricsFileSelect(e) {
  const f = e.target.files[0]; if (!f) return;
  const name = f.name.toLowerCase();
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    let parsed = [];
    if (name.endsWith('.lrc')) {
      parsed = parseLrc(text);
    } else if (name.endsWith('.srt')) {
      parsed = parseSrt(text);
    } else if (name.endsWith('.vtt')) {
      parsed = parseVtt(text);
    } else {
      parsed = parseTxt(text);
    }
    if (!parsed.length) {
      showMusicError('歌词解析失败，请检查文件格式');
      return;
    }
    musicLyrics = parsed;
    renderLyrics(parsed);
    toast('歌词已加载，共 ' + parsed.length + ' 行');
  };
  reader.readAsText(f, 'utf-8');
  e.target.value = '';
}

// ========== 其他App渲染（简化版，后续补充） ==========
function renderAlipayApp(body, content) {
  const c = content;
  body.innerHTML = `
    <div class="alipay-app">
      <div class="alipay-balance">
        <div class="balance-label">余额</div>
        <div class="balance-amount">${c.balance || '****.**'}</div>
      </div>
      <div class="alipay-info">
        <div>余额宝: ${c.yuebao || '****'}</div>
        <div>芝麻信用: ${c.creditScore || '***'}</div>
      </div>
      <div class="alipay-bills">
        <div class="bills-title">账单</div>
        ${(c.bills || []).map(b => `
          <div class="bill-item">
            <div class="bill-info">
              <div class="bill-title">${b.title}</div>
              <div class="bill-time">${b.time}</div>
            </div>
            <div class="bill-amount ${b.type === '收入' ? 'income' : ''}">${b.type === '收入' ? '+' : '-'}${b.amount}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderTaobaoApp(body, content) {
  const c = content;
  body.style.background = 'white';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:white">
      <div style="display:flex;border-bottom:1px solid #f0f0f0;background:white;flex-shrink:0">
        <button style="flex:1;padding:10px 0;border:none;background:none;color:#FF5000;font-size:13px;cursor:pointer;border-bottom:2px solid #FF5000" onclick="switchTaobaoTab('history',event)">浏览记录</button>
        <button style="flex:1;padding:10px 0;border:none;background:none;color:#888;font-size:13px;cursor:pointer" onclick="switchTaobaoTab('cart',event)">购物车</button>
        <button style="flex:1;padding:10px 0;border:none;background:none;color:#888;font-size:13px;cursor:pointer" onclick="switchTaobaoTab('orders',event)">订单</button>
        <button style="flex:1;padding:10px 0;border:none;background:none;color:#888;font-size:13px;cursor:pointer" onclick="switchTaobaoTab('favorites',event)">收藏</button>
      </div>
      <div id="taobaoContent" style="flex:1;overflow-y:auto;background:white">
        ${renderTaobaoHistory(c.history)}
      </div>
    </div>
  `;
  body.dataset.content = JSON.stringify(content);
}

function switchTaobaoTab(tab, e) {
  // 重置所有tab样式
  if (e) {
    e.currentTarget.closest('div').querySelectorAll('button').forEach(btn => {
      btn.style.color = '#888';
      btn.style.borderBottom = 'none';
    });
    e.target.style.color = '#FF5000';
    e.target.style.borderBottom = '2px solid #FF5000';
  }
  const body = document.getElementById('phoneAppBody');
  const c = JSON.parse(body.dataset.content || '{}');
  const el = document.getElementById('taobaoContent');
  switch(tab) {
    case 'history':   el.innerHTML = renderTaobaoHistory(c.history); break;
    case 'cart':      el.innerHTML = renderTaobaoCart(c.cart); break;
    case 'orders':    el.innerHTML = renderTaobaoOrders(c.orders); break;
    case 'favorites': el.innerHTML = renderTaobaoFavorites(c.favorites); break;
  }
}

function renderTaobaoHistory(items) {
  if (!items?.length) return '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无浏览记录</div>';
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px">
    ${items.map((item, i) => renderTaobaoCard(item, i, 'history')).join('')}
  </div>`;
}

function renderTaobaoCart(items) {
  if (!items?.length) return '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">购物车为空</div>';
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px">
    ${items.map((item, i) => renderTaobaoCard(item, i, 'cart')).join('')}
  </div>`;
}

function renderTaobaoFavorites(items) {
  if (!items?.length) return '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无收藏</div>';
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:10px">
    ${items.map((item, i) => renderTaobaoCard(item, i, 'favorites')).join('')}
  </div>`;
}

function renderTaobaoOrders(items) {
  if (!items?.length) return '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无订单</div>';
  return `<div style="padding:10px">
    ${items.map((item, i) => `
      <div onclick="openTaobaoProduct(${i},'orders')"
        style="background:white;border-radius:12px;padding:14px;margin-bottom:10px;box-shadow:0 1px 4px rgba(0,0,0,0.08);cursor:pointer">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:12px;color:#FF5000;font-weight:600">${item.status || '处理中'}</span>
          <span style="font-size:11px;color:#bbb">${item.time || ''}</span>
        </div>
        <div style="font-size:13px;color:#333;line-height:1.5;margin-bottom:6px">${item.title}</div>
        ${item.price ? `<div style="font-size:14px;font-weight:700;color:#FF5000">¥${String(item.price).replace(/[¥￥]/g,'')}</div>` : ''}
      </div>
    `).join('')}
  </div>`;
}

function renderTaobaoCard(item, idx, listKey) {
const price = String(item.price).replace(/[¥￥]/g, '');
  return `
    <div style="background:white;border-radius:10px;overflow:hidden;box-shadow:0 1px 6px rgba(0,0,0,0.09);cursor:pointer"
      onclick="openTaobaoProduct(${idx},'${listKey}')">
<div style="width:100%;aspect-ratio:1/1;background:#f7f7f7;display:flex;align-items:center;justify-content:center;font-size:44px;overflow:hidden">
${item.imgUrl
  ? `<img src="${item.imgUrl}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" /><span style="display:none;align-items:center;justify-content:center;width:100%;height:100%;font-size:44px">${item.img || '📦'}</span>`
  : `<span style="font-size:44px">${item.img || '📦'}</span>`
}
</div>
      <div style="padding:8px">
        <div style="font-size:12px;color:#333;line-height:1.5;height:36px;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:6px">${item.title}</div>
        <div style="font-size:15px;font-weight:700;color:#FF5000">¥${price}</div>
      </div>
    </div>
  `;
}

function openTaobaoProduct(idx, listKey) {
  const body = document.getElementById('phoneAppBody');
  const c = JSON.parse(body.dataset.content || '{}');
const list = listKey === 'cart' ? c.cart
           : listKey === 'favorites' ? c.favorites
           : listKey === 'orders' ? c.orders
           : c.history;
  const item = list?.[idx];
  if (!item) return;

  // 生成物流节点
  const logistics = generateLogistics(item.status);
const canGen = true;
  const imgId = 'tbDetailImg_' + idx;

  const html = `
    <div style="padding:0">
      <!-- 顶部关闭 -->
      <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px 8px">
        <span style="font-size:14px;font-weight:600;color:#333;flex:1">${item.title}</span>
        <button onclick="closePhoneModal()" style="background:none;border:none;font-size:22px;color:#999;cursor:pointer">×</button>
      </div>

${item.imgUrl
  ? `<img src="${item.imgUrl}" style="width:100%;height:200px;object-fit:cover">`
  : canGen
    ? `<div style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer" onclick="genTaobaoDetailImg('${imgId}','${item.title.replace(/'/g,"\\'")}','${(item.img||'').replace(/'/g,"\\'")}')">
         <span style="font-size:48px">${item.img || '📦'}</span>
         <span style="font-size:12px;color:#FF5000">点击生成商品图</span>
       </div>`
    : `<span style="font-size:48px">${item.img || '📦'}</span>`
}

      <!-- 价格 -->
      <div style="padding:10px 14px;border-bottom:1px solid #f5f5f5">
${item.price ? `<span style="font-size:22px;font-weight:700;color:#FF5000">¥${String(item.price).replace(/[¥￥]/g,'')}</span>` : ''}
      </div>

      <!-- AI分析：为什么想买 -->
      <div style="padding:12px 14px;border-bottom:1px solid #f5f5f5">
        <div style="font-size:12px;color:#999;margin-bottom:6px">TA为什么想买</div>
        <div style="font-size:13px;color:#555;line-height:1.6" id="tbWhyBuy_${idx}">
          ${generateWhyBuy(item)}
        </div>
      </div>

      <!-- 物流时间线 -->
      <div style="padding:12px 14px">
        <div style="font-size:12px;color:#999;margin-bottom:10px">物流信息</div>
        <div class="tb-logistics">
          ${logistics.map(l => `
            <div class="tb-logistics-item ${l.active ? 'active' : ''} ${l.done ? 'done' : ''}">
              <div class="tb-logistics-dot"></div>
              <div class="tb-logistics-info">
                <div class="tb-logistics-status">${l.status}</div>
                <div class="tb-logistics-time">${l.time}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
showPhoneModal(html);
if (!item.imgUrl && (D.settings.polliKey || D.api.key)) {
  setTimeout(() => genTaobaoDetailImg(imgId, item.title, item.img || ''), 300);
}
}

function generateWhyBuy(item) {
  // 根据商品类型生成一句话理由，不调用AI避免等待
  const title = item.title || '';
  const reasons = [
    '最近一直在关注这个，感觉质量不错，价格也合适。',
    '朋友推荐过，趁着活动准备入手试试。',
    '用了很久的旧的坏掉了，换个新的。',
    '看评价都说很好用，种草很久了。',
    '最近需要用到，比较了几家选了这个。',
    '感觉很可爱，买来自用或者送人都不错。',
    '这个牌子一直信任，回购了好多次。',
  ];
  return reasons[Math.abs(title.length * 3 + title.charCodeAt(0)) % reasons.length];
}

function generateLogistics(status) {
  const nodes = [
    { status: '买家下单', time: '3天前 10:23' },
    { status: '商家发货', time: '3天前 15:40' },
    { status: '运输中', time: '2天前 08:12' },
    { status: '派送中', time: '今天 09:30' },
    { status: '已签收', time: '今天 14:05' },
  ];

  // 根据订单状态决定高亮到哪个节点
  let activeIdx = 3; // 默认派送中
  if (status) {
    const s = status.toLowerCase();
    if (s.includes('下单') || s.includes('待发')) activeIdx = 0;
    else if (s.includes('发货') || s.includes('已发')) activeIdx = 1;
    else if (s.includes('运输') || s.includes('途中')) activeIdx = 2;
    else if (s.includes('派送') || s.includes('派件')) activeIdx = 3;
    else if (s.includes('签收') || s.includes('完成')) activeIdx = 4;
  }

  return nodes.map((n, i) => ({
    ...n,
    active: i === activeIdx,
    done: i < activeIdx,
  }));
}

async function genTaobaoDetailImg(containerId, title, emoji) {
  const el = document.getElementById(containerId);
  if (!el) return;

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
      <div style="font-size:28px;animation:spin 1s linear infinite">⏳</div>
      <div style="font-size:12px;color:#999">正在生成商品图...</div>
    </div>
  `;

  try {
    const prompt = await buildTaobaoImgPrompt(title);
const polliKey = D.settings.polliKey || '';
const imgUrl = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${D.settings.polliModel || 'flux'}&seed=${Math.floor(Math.random()*9999)}&nologo=true${polliKey ? '&key=' + encodeURIComponent(polliKey) : ''}`;

    const img = new Image();
    img.onload = function() {
      el.innerHTML = '';
      el.style.padding = '0';
      const imgEl = document.createElement('img');
      imgEl.src = imgUrl;
      imgEl.style.cssText = 'width:100%;height:200px;object-fit:cover;cursor:pointer';
      imgEl.onclick = () => viewProductImgFull(imgUrl);
      el.appendChild(imgEl);

      // 重新生成按钮
      const regenBtn = document.createElement('button');
      regenBtn.textContent = '🔄 重新生成';
      regenBtn.style.cssText = 'position:absolute;bottom:8px;right:8px;padding:4px 10px;background:rgba(0,0,0,0.5);color:white;border:none;border-radius:8px;font-size:11px;cursor:pointer';
      regenBtn.onclick = () => genTaobaoDetailImg(containerId, title, emoji);
      el.style.position = 'relative';
      el.appendChild(regenBtn);
    };
    img.onerror = function() {
      el.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
          <span style="font-size:40px">${emoji || '📦'}</span>
          <div style="font-size:12px;color:#FF6B6B">生成失败</div>
          <button onclick="genTaobaoDetailImg('${containerId}','${title.replace(/'/g,"\\'")}','${emoji}')"
            style="padding:5px 14px;background:#FF5000;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer">重试</button>
        </div>
      `;
    };
    img.src = imgUrl;
  } catch(e) {
    el.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px">
        <span style="font-size:40px">${emoji || '📦'}</span>
        <div style="font-size:12px;color:#FF6B6B">失败：${e.message}</div>
        <button onclick="genTaobaoDetailImg('${containerId}','${title.replace(/'/g,"\\'")}','${emoji}')"
          style="padding:5px 14px;background:#FF5000;color:white;border:none;border-radius:8px;font-size:12px;cursor:pointer">重试</button>
      </div>
    `;
  }
}

function openTaobaoOrderDetail(idx) {
  const body = document.getElementById('phoneAppBody');
  const c = JSON.parse(body.dataset.content || '{}');
  const item = c.orders?.[idx];
  if (!item) return;
  openTaobaoProduct(idx, 'orders');
}

async function buildTaobaoImgPrompt(title) {
  if (!D.api.key) return `product photo of ${title}, white background, commercial photography`;
  try {
    const resp = await fetch(
      (D.api.url.replace(/\/$/, '')) + '/v1/chat/completions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
          model: D.api.model,
          messages: [
            { role: 'system', content: '将商品名翻译为英文Stable Diffusion图像生成提示词。只输出英文提示词，格式：product photo of [商品描述], white background, studio lighting, commercial photography, high quality' },
            { role: 'user', content: title }
          ],
          max_tokens: 100,
          temperature: 0.3
        })
      }
    );
    const data = await resp.json();
    return data.choices?.[0]?.message?.content?.trim() || `product photo of ${title}, white background, commercial photography`;
  } catch(e) {
    return `product photo of ${title}, white background, commercial photography`;
  }
}

function viewProductImgFull(url) {
  const viewer = document.getElementById('imageViewer');
  const img = document.getElementById('viewerImg');
  if (viewer && img) {
    img.src = url;
    viewer.classList.add('active');
  }
}

function renderMapsApp(body, content) {
  const c = content;
  body.style.background = 'white';
  body.style.fontFamily = '-apple-system,BlinkMacSystemFont,sans-serif';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <!-- 搜索栏 -->
      <div style="padding:10px 12px;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.08);flex-shrink:0;z-index:10">
        <div style="background:#f2f2f2;border-radius:10px;padding:9px 14px;display:flex;align-items:center;gap:8px">
          <span style="font-size:15px">🔍</span>
          <span style="font-size:14px;color:#bbb">搜索地点、公交、地铁</span>
        </div>
      </div>

      <!-- 地图主体 -->
      <div style="flex:1;position:relative;overflow:hidden;background:#e8f0e8" id="mapCanvas">
        <!-- 纯CSS街道网格 -->
        <div style="position:absolute;inset:0">
          <!-- 背景底色 -->
          <div style="position:absolute;inset:0;background:#eaf0e4"></div>

          <!-- 主干道横向 -->
          ${[15,35,55,75].map(pct => `
            <div style="position:absolute;left:0;right:0;top:${pct}%;height:8px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1)"></div>
            <div style="position:absolute;left:0;right:0;top:calc(${pct}% + 8px);height:2px;background:#f5c842;opacity:0.6"></div>
          `).join('')}

          <!-- 主干道纵向 -->
          ${[15,35,55,75].map(pct => `
            <div style="position:absolute;top:0;bottom:0;left:${pct}%;width:8px;background:#fff;box-shadow:1px 0 3px rgba(0,0,0,0.1)"></div>
            <div style="position:absolute;top:0;bottom:0;left:calc(${pct}% + 8px);width:2px;background:#f5c842;opacity:0.6"></div>
          `).join('')}

          <!-- 小路横向 -->
          ${[25,45,65].map(pct => `
            <div style="position:absolute;left:0;right:0;top:${pct}%;height:3px;background:rgba(255,255,255,0.8)"></div>
          `).join('')}

          <!-- 小路纵向 -->
          ${[25,45,65].map(pct => `
            <div style="position:absolute;top:0;bottom:0;left:${pct}%;width:3px;background:rgba(255,255,255,0.8)"></div>
          `).join('')}

          <!-- 绿地块 -->
          <div style="position:absolute;left:16%;top:16%;width:8%;height:8%;background:#b8d8a8;border-radius:4px;opacity:0.8"></div>
          <div style="position:absolute;left:56%;top:36%;width:10%;height:6%;background:#b8d8a8;border-radius:4px;opacity:0.8"></div>
          <div style="position:absolute;left:36%;top:56%;width:6%;height:10%;background:#b8d8a8;border-radius:4px;opacity:0.8"></div>

          <!-- 建筑块 -->
          ${[
            [18,38,6,5],[26,28,5,6],[38,18,7,5],[46,38,5,7],
            [58,18,6,5],[66,28,5,6],[18,58,7,4],[46,58,5,6],
            [66,58,6,5],[76,38,4,6],[76,18,5,5],[76,58,4,5]
          ].map(([l,t,w,h]) => `
            <div style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;background:#d4cfc8;border-radius:2px;border:1px solid #c8c2ba"></div>
          `).join('')}

          <!-- 当前位置标记 -->
          <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:5">
            <div style="width:20px;height:20px;border-radius:50%;background:#3385FF;border:3px solid white;box-shadow:0 2px 8px rgba(51,133,255,0.5)"></div>
            <div style="position:absolute;top:-2px;left:-2px;width:24px;height:24px;border-radius:50%;background:rgba(51,133,255,0.2);animation:mapPulse 2s ease-out infinite"></div>
          </div>

          <!-- 收藏地点标记 -->
          ${(c.favorites || []).slice(0,4).map((f, i) => {
            const positions = [[28,25],[68,42],[42,68],[72,22]];
            const pos = positions[i] || [50,50];
            return `
              <div style="position:absolute;left:${pos[0]}%;top:${pos[1]}%;transform:translate(-50%,-100%);z-index:4;cursor:pointer"
                onclick="showMapPlace('${f.name.replace(/'/g,"\\'")}','${(f.tag||'').replace(/'/g,"\\'")}')">
                <div style="background:${f.tag==='家'?'#ff6b6b':f.tag==='公司'?'#3385FF':'#ff9500'};color:white;padding:3px 8px;border-radius:10px;font-size:11px;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2)">
                  ${f.tag==='家'?'🏠':f.tag==='公司'?'🏢':'⭐'} ${f.name}
                </div>
                <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${f.tag==='家'?'#ff6b6b':f.tag==='公司'?'#3385FF':'#ff9500'};margin:0 auto"></div>
              </div>
            `;
          }).join('')}
        </div>

        <!-- 右侧控件 -->
        <div style="position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:8px;z-index:10">
          <div style="width:36px;height:36px;background:white;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer">📍</div>
          <div style="width:36px;height:36px;background:white;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer">+</div>
          <div style="width:36px;height:36px;background:white;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,0.15);display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer">−</div>
        </div>
      </div>

      <!-- 底部信息面板 -->
      <div style="background:white;border-radius:16px 16px 0 0;box-shadow:0 -2px 12px rgba(0,0,0,0.1);padding:16px;flex-shrink:0">
        <!-- 把手 -->
        <div style="width:36px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 14px"></div>

        <!-- 功能按钮 -->
        <div style="display:flex;gap:10px;margin-bottom:14px">
          ${[['🚗','导航'],['🚌','公交'],['🚶','步行'],['🔍','搜周边']].map(([icon,label]) => `
            <button onclick="${label==='导航'?'openMapNav()':''}"
              style="flex:1;padding:10px 0;background:#f5f5f5;border:none;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
              <span style="font-size:20px">${icon}</span>
              <span style="font-size:11px;color:#555">${label}</span>
            </button>
          `).join('')}
        </div>

        <!-- 最近搜索 -->
        <div style="font-size:13px;font-weight:600;color:#333;margin-bottom:10px">最近搜索</div>
        ${(c.recent || []).slice(0,3).map(p => `
          <div onclick="showMapPlace('${p.name.replace(/'/g,"\\'")}','${(p.address||'').replace(/'/g,"\\'")}','${(p.time||'').replace(/'/g,"\\'")}')"
            style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:0.5px solid #f0f0f0;cursor:pointer">
            <div style="width:36px;height:36px;border-radius:8px;background:#f0f4ff;display:flex;align-items:center;justify-content:center;font-size:18px">📍</div>
            <div style="flex:1">
              <div style="font-size:14px;color:#333">${p.name}</div>
              <div style="font-size:12px;color:#999">${p.address || ''}</div>
            </div>
            <span style="font-size:12px;color:#bbb">${p.time || ''}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <style>
      @keyframes mapPulse {
        0% { transform:scale(1);opacity:0.6 }
        100% { transform:scale(3);opacity:0 }
      }
    </style>
  `;
}

function showMapPlace(name, addrOrTag, time) {
  showPhoneModal(`
    <div style="padding:4px;font-family:-apple-system,sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div>
          <div style="font-size:16px;font-weight:600;color:#111">${name}</div>
          <div style="font-size:12px;color:#999;margin-top:2px">${addrOrTag || ''} ${time ? '· '+time : ''}</div>
        </div>
        <button onclick="closePhoneModal()" style="background:none;border:none;font-size:22px;color:#bbb;cursor:pointer">×</button>
      </div>
      <div style="display:flex;gap:10px">
        ${[['🚗','导航','#3385FF'],['📞','电话','#07C160'],['⭐','收藏','#ff9500'],['↗️','分享','#8b5cf6']].map(([icon,label,color]) => `
          <button onclick="${label==='导航'?'closePhoneModal();openMapNav()':'closePhoneModal()'}"
            style="flex:1;padding:10px 0;border:none;border-radius:10px;background:${color}18;display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
            <span style="font-size:20px">${icon}</span>
            <span style="font-size:11px;color:${color};font-weight:500">${label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `);
}

function openMapNav() {
  // 先取好数据，再关modal，防止关modal后DOM状态丢失
  const body = document.getElementById('phoneAppBody');
  if (!body) return;

  // 容错：navContent优先，其次content，再次空对象
  const savedContent = body.dataset.content || body.dataset.navContent || '{}';
  let content = {};
  try { content = JSON.parse(savedContent); } catch(e) { content = {}; }

  closePhoneModal();

  const dest = content.recent?.[0]?.name || content.favorites?.[0]?.name || '目的地';
  const mins = Math.floor(Math.random() * 20) + 8;
  const km = (Math.random() * 3 + 0.5).toFixed(1);

  // 存一份干净的content备用
  body.dataset.navContent = JSON.stringify(content);

  const steps = [
    { icon:'↑', color:'#3385FF', text:'沿当前道路直行', dist:'200m', detail:'保持直行，路况良好' },
    { icon:'↰', color:'#ff9500', text:'左转进入主干道', dist:'500m', detail:'注意红绿灯，左转专用道' },
    { icon:'↑', color:'#3385FF', text:'继续直行', dist:'1.2km', detail:'限速60km/h' },
    { icon:'↱', color:'#ff9500', text:'右转进入目标路段', dist:'300m', detail:'前方路口右转' },
    { icon:'📍', color:'#ff4444', text:'到达目的地', dist:'', detail:'目的地在左侧' },
  ];

  let currentStep = 0;
  let navRunning = true;
  let elapsed = 0;

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;font-family:-apple-system,sans-serif" id="navRoot">

      <!-- 顶栏：当前指令 -->
      <div style="background:#1a73e8;padding:14px 16px 12px;flex-shrink:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
          <button id="navExitBtn"
            style="background:rgba(255,255,255,0.2);border:none;color:white;padding:7px 14px;border-radius:20px;font-size:13px;cursor:pointer;font-weight:500">
            ✕ 退出
          </button>
          <div style="text-align:center">
            <div style="color:rgba(255,255,255,0.7);font-size:12px">前往</div>
            <div style="color:white;font-size:15px;font-weight:700">${dest}</div>
          </div>
          <div style="text-align:right">
            <div style="color:white;font-size:16px;font-weight:700" id="navMins">${mins}</div>
            <div style="color:rgba(255,255,255,0.7);font-size:11px">分钟</div>
          </div>
        </div>
        <!-- 当前步骤卡片 -->
        <div style="background:rgba(255,255,255,0.15);border-radius:14px;padding:12px 14px;display:flex;align-items:center;gap:12px" id="navCurrentCard">
          <div style="width:44px;height:44px;border-radius:12px;background:white;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0" id="navArrow">↑</div>
          <div>
            <div style="color:white;font-size:15px;font-weight:600" id="navStepText">沿当前道路直行</div>
            <div style="color:rgba(255,255,255,0.65);font-size:12px" id="navStepDetail">保持直行，路况良好</div>
          </div>
        </div>
      </div>

      <!-- 地图区域 -->
      <div style="flex:1;position:relative;background:#eaf0e4;overflow:hidden" id="navMap">

        <!-- 街道网格 -->
        <div style="position:absolute;inset:0;background:#dde8d8"></div>
        ${[15,38,62,82].map(p => `
          <div style="position:absolute;left:0;right:0;top:${p}%;height:10px;background:#fff;opacity:0.9"></div>
          <div style="position:absolute;left:0;right:0;top:calc(${p}% + 10px);height:2px;background:#f5c842;opacity:0.5"></div>
        `).join('')}
        ${[15,38,62,82].map(p => `
          <div style="position:absolute;top:0;bottom:0;left:${p}%;width:10px;background:#fff;opacity:0.9"></div>
          <div style="position:absolute;top:0;bottom:0;left:calc(${p}% + 10px);width:2px;background:#f5c842;opacity:0.5"></div>
        `).join('')}
        ${[25,50,70].map(p => `
          <div style="position:absolute;left:0;right:0;top:${p}%;height:4px;background:rgba(255,255,255,0.6)"></div>
          <div style="position:absolute;top:0;bottom:0;left:${p}%;width:4px;background:rgba(255,255,255,0.6)"></div>
        `).join('')}
        <!-- 建筑块 -->
        ${[[18,18,7,6,'#cfc8c0'],[27,27,6,7,'#d4cec8'],[40,18,8,5,'#c8c2ba'],
           [50,28,5,8,'#d0cac2'],[62,18,7,6,'#ccc6be'],[70,27,6,6,'#c8c2ba'],
           [18,50,8,5,'#d4cec8'],[28,60,6,7,'#cfc8c0'],[50,50,7,6,'#d0cac2'],
           [68,50,6,7,'#c8c2ba'],[78,28,5,6,'#ccc6be'],[78,55,5,5,'#d4cec8']
        ].map(([l,t,w,h,c]) => `
          <div style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;background:${c};border-radius:2px;border:1px solid rgba(0,0,0,0.06)"></div>
        `).join('')}
        <!-- 绿地 -->
        ${[[17,17,6,6],[57,37,9,5],[37,55,5,9]].map(([l,t,w,h])=>`
          <div style="position:absolute;left:${l}%;top:${t}%;width:${w}%;height:${h}%;background:#b8d4a8;border-radius:4px;opacity:0.8"></div>
        `).join('')}

        <!-- 导航路线 -->
        <svg style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none" id="navRouteSvg">
          <path id="navRoutePath"
            d="M 50% 70% L 50% 38% L 38% 38% L 38% 15%"
            stroke="#1a73e8" stroke-width="5" fill="none"
            stroke-linecap="round" stroke-linejoin="round"
            stroke-dasharray="8 4" opacity="0.85"/>
          <!-- 进度覆盖（已走过的路变浅） -->
          <path id="navDonePath"
            d="M 50% 70% L 50% 38%"
            stroke="#1a73e8" stroke-width="5" fill="none"
            stroke-linecap="round" stroke-linejoin="round" opacity="0.3"/>
        </svg>

        <!-- 起点 -->
        <div style="position:absolute;left:50%;top:70%;transform:translate(-50%,-50%);z-index:6">
          <div style="width:16px;height:16px;border-radius:50%;background:#1a73e8;border:3px solid white;box-shadow:0 2px 6px rgba(26,115,232,0.5)"></div>
          <div style="position:absolute;top:-2px;left:-2px;width:20px;height:20px;border-radius:50%;background:rgba(26,115,232,0.2);animation:mapPulse 2s ease-out infinite"></div>
        </div>

        <!-- 车辆标记（可动） -->
        <div id="navCar" style="position:absolute;left:50%;top:65%;transform:translate(-50%,-50%);z-index:7;transition:top 1.5s ease,left 1.5s ease">
          <div style="width:28px;height:28px;border-radius:50%;background:#1a73e8;border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 10px rgba(26,115,232,0.6)">🚗</div>
        </div>

        <!-- 终点 -->
        <div style="position:absolute;left:38%;top:15%;transform:translate(-50%,-100%);z-index:5">
          <div style="background:#ea4335;color:white;padding:4px 10px;border-radius:12px;font-size:11px;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-weight:500">📍 ${dest}</div>
          <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid #ea4335;margin:0 auto"></div>
        </div>

        <!-- 速度/限速浮层 -->
        <div style="position:absolute;left:12px;bottom:12px;background:white;border-radius:12px;padding:8px 12px;box-shadow:0 2px 8px rgba(0,0,0,0.12);text-align:center;min-width:52px">
          <div style="font-size:20px;font-weight:700;color:#333" id="navSpeed">32</div>
          <div style="font-size:10px;color:#999">km/h</div>
        </div>
        <div style="position:absolute;right:12px;bottom:12px;background:white;border:3px solid #ea4335;border-radius:50%;width:44px;height:44px;display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.1)">
          <div style="font-size:14px;font-weight:700;color:#333">60</div>
          <div style="font-size:9px;color:#999">限速</div>
        </div>

        <!-- 路况标记 -->
        <div id="navTraffic" style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.6);color:white;padding:4px 10px;border-radius:20px;font-size:11px;display:none">
          🟢 前方路况良好
        </div>
      </div>

      <!-- 底部步骤面板 -->
      <div style="background:white;border-radius:20px 20px 0 0;box-shadow:0 -3px 16px rgba(0,0,0,0.1);padding:14px 16px 20px;flex-shrink:0">
        <div style="width:32px;height:4px;background:#e0e0e0;border-radius:2px;margin:0 auto 12px"></div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <div>
            <span style="font-size:18px;font-weight:700;color:#333" id="navKm">${km}</span>
            <span style="font-size:13px;color:#999"> km</span>
          </div>
          <div style="display:flex;gap:8px">
            <button id="navPauseBtn"
              style="padding:7px 16px;background:#1a73e8;color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer;font-weight:500">
              ⏸ 暂停
            </button>
            <button id="navOverviewBtn"
              style="padding:7px 16px;background:#f5f5f5;color:#333;border:none;border-radius:20px;font-size:13px;cursor:pointer">
              总览
            </button>
          </div>
        </div>
        <!-- 步骤列表 -->
        <div style="display:flex;flex-direction:column;gap:6px" id="navStepsList">
          ${steps.map((s, i) => `
            <div id="navStep_${i}"
              style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:12px;background:${i===0?'#e8f0fe':'#f8f8f8'};transition:background 0.3s">
              <div style="width:32px;height:32px;border-radius:50%;background:${i===0?s.color+'22':'#f0f0f0'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;color:${s.color};font-weight:700;transition:all 0.3s">
                ${s.icon}
              </div>
              <div style="flex:1">
                <div style="font-size:13px;color:${i===0?'#1a73e8':'#555'};font-weight:${i===0?'600':'400'}">${s.text}</div>
              </div>
              ${s.dist ? `<span style="font-size:12px;color:#999;flex-shrink:0">${s.dist}</span>` : '<span style="font-size:11px;color:#ea4335;font-weight:500">终点</span>'}
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <style>
      @keyframes mapPulse{0%{transform:scale(1);opacity:0.6}100%{transform:scale(3);opacity:0}}
    </style>
  `;

  // 车辆沿路线移动的关键帧位置
  const carPath = [
    { left:'50%', top:'65%' },
    { left:'50%', top:'55%' },
    { left:'50%', top:'42%' },
    { left:'44%', top:'38%' },
    { left:'38%', top:'38%' },
    { left:'38%', top:'22%' },
  ];
  let carIdx = 0;

  // 退出按钮
    document.getElementById('navExitBtn').onclick = function() {
    navRunning = false;
    clearInterval(navTimer);
    let saved = {};
    try { saved = JSON.parse(body.dataset.navContent || '{}'); } catch(e) { saved = {}; }
    body.dataset.content = JSON.stringify(saved);
    renderMapsApp(body, saved);
  };

  let navPaused = false;
  document.getElementById('navPauseBtn').onclick = function() {
    navPaused = !navPaused;
    this.textContent = navPaused ? '▶ 继续' : '⏸ 暂停';
    this.style.background = navPaused ? '#34a853' : '#1a73e8';
  };

  document.getElementById('navOverviewBtn').onclick = function() {
    const traffic = document.getElementById('navTraffic');
    if (traffic) {
      traffic.style.display = traffic.style.display === 'none' ? 'block' : 'none';
    }
  };

  const navTimer = setInterval(() => {
    if (!navRunning || navPaused) return;
    elapsed++;

    if (elapsed % 2 === 0) {
      const speed = Math.floor(Math.random() * 25) + 20;
      const speedEl = document.getElementById('navSpeed');
      if (speedEl) speedEl.textContent = speed;
    }

    if (elapsed % 3 === 0 && currentStep < steps.length - 1) {
      currentStep++;

      const stepData = steps[currentStep];
      const arrowEl = document.getElementById('navArrow');
      const textEl  = document.getElementById('navStepText');
      const detailEl = document.getElementById('navStepDetail');
      if (arrowEl)  arrowEl.textContent  = stepData.icon;
      if (textEl)   textEl.textContent   = stepData.text;
      if (detailEl) detailEl.textContent = stepData.detail;

      const minsEl = document.getElementById('navMins');
      if (minsEl) minsEl.textContent = Math.max(1, mins - currentStep * 2);

      for (let i = 0; i < steps.length; i++) {
        const stepEl = document.getElementById('navStep_' + i);
        if (!stepEl) continue;
        const isActive = i === currentStep;
        const isDone   = i < currentStep;
        stepEl.style.background = isActive ? '#e8f0fe' : isDone ? '#f0faf0' : '#f8f8f8';
        const iconEl = stepEl.querySelector('div');
        if (iconEl) {
          iconEl.style.background = isActive ? steps[i].color + '22' : isDone ? '#07C16022' : '#f0f0f0';
          iconEl.style.color      = isActive ? steps[i].color : isDone ? '#07C160' : '#bbb';
          iconEl.textContent      = isDone ? '✓' : steps[i].icon;
        }
        const textNode = stepEl.querySelectorAll('div')[1]?.querySelector('div');
        if (textNode) {
          textNode.style.color      = isActive ? '#1a73e8' : isDone ? '#07C160' : '#555';
          textNode.style.fontWeight = isActive ? '600' : '400';
        }
      }

      carIdx = Math.min(currentStep + 1, carPath.length - 1);
      const car = document.getElementById('navCar');
      if (car) {
        car.style.left = carPath[carIdx].left;
        car.style.top  = carPath[carIdx].top;
      }

      if (currentStep === steps.length - 1) {
        navRunning = false;
        clearInterval(navTimer);
        setTimeout(() => {
          const card = document.getElementById('navCurrentCard');
          if (card) {
            card.style.background = 'rgba(52,168,83,0.25)';
            card.innerHTML = `
              <div style="width:44px;height:44px;border-radius:12px;background:white;display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">🎉</div>
              <div>
                <div style="color:white;font-size:15px;font-weight:600">已到达目的地</div>
                <div style="color:rgba(255,255,255,0.7);font-size:12px">${dest}</div>
              </div>
            `;
          }
          const pauseBtn = document.getElementById('navPauseBtn');
          if (pauseBtn) {
            pauseBtn.textContent = '✓ 已到达';
            pauseBtn.style.background = '#34a853';
            pauseBtn.onclick = null;
          }
        }, 500);
      }
    }
  }, 1000);
}

function renderBrowserApp(body, content) {
  const c = content;
  body.style.background = '#f5f5f5';
  body.style.fontFamily = '-apple-system,BlinkMacSystemFont,sans-serif';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#f5f5f5">
      <!-- 地址栏 -->
      <div style="padding:10px 12px;background:white;box-shadow:0 1px 4px rgba(0,0,0,0.08);flex-shrink:0">
        <div style="background:#f2f2f2;border-radius:10px;padding:9px 14px;display:flex;align-items:center;gap:8px">
          <span style="font-size:13px">🔒</span>
          <span style="font-size:13px;color:#555;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" id="browserUrlBar">选择一个页面浏览</span>
        </div>
      </div>

      <!-- tab栏 -->
      <div style="display:flex;background:white;border-bottom:0.5px solid #e0e0e0;flex-shrink:0">
        ${[['history','历史'],['bookmarks','书签'],['tabs','标签页']].map(([k,v],i) => `
          <button id="browserTab_${k}" onclick="switchBrowserTab('${k}')"
            style="flex:1;padding:10px 0;border:none;font-size:13px;cursor:pointer;background:white;
            color:${i===0?'#4285F4':'#555'};
            border-bottom:${i===0?'2px solid #4285F4':'2px solid transparent'};
            font-weight:${i===0?'600':'400'}">
            ${v}
          </button>
        `).join('')}
      </div>

      <!-- 批量操作栏（默认隐藏） -->
      <div id="browserBatchBar" style="display:none;align-items:center;justify-content:space-between;padding:8px 14px;background:#EEF3FF;border-bottom:0.5px solid #c5d4f7;flex-shrink:0">
        <span style="font-size:13px;color:#4285F4" id="browserBatchCount">已选 0 项</span>
        <div style="display:flex;gap:8px">
          <button onclick="selectAllBrowserItems()"
            style="padding:6px 12px;background:white;border:1px solid #4285F4;color:#4285F4;border-radius:16px;font-size:12px;cursor:pointer">
            全选
          </button>
          <button onclick="startBrowserBatchGen()"
            style="padding:6px 14px;background:#4285F4;border:none;color:white;border-radius:16px;font-size:12px;cursor:pointer;font-weight:500">
            批量生成
          </button>
          <button onclick="cancelBrowserSelect()"
            style="padding:6px 12px;background:white;border:1px solid #ddd;color:#888;border-radius:16px;font-size:12px;cursor:pointer">
            取消
          </button>
        </div>
      </div>

      <!-- 内容区 -->
      <div id="browserContent" style="flex:1;overflow-y:auto"></div>
    </div>
  `;
  body.dataset.content = JSON.stringify(content);
  body.dataset.browserSelectMode = 'false';
  body.dataset.browserSelected = '[]';
  body.dataset.browserCurrentTab = 'history';
  renderBrowserHistory(c.history);
}
function switchBrowserTab(tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  ['history','bookmarks','tabs'].forEach(k => {
    const btn = document.getElementById('browserTab_' + k);
    if (!btn) return;
    btn.style.color = k === tab ? '#4285F4' : '#555';
    btn.style.borderBottom = k === tab ? '2px solid #4285F4' : '2px solid transparent';
    btn.style.fontWeight = k === tab ? '600' : '400';
  });
  body.dataset.browserSelectMode = 'false';
  body.dataset.browserSelected = '[]';
  body.dataset.browserCurrentTab = tab;
  const bar = document.getElementById('browserBatchBar');
  if (bar) bar.style.display = 'none';
  switch(tab) {
    case 'history':   renderBrowserHistory(c.history); break;
    case 'bookmarks': renderBrowserBookmarks(c.bookmarks); break;
    case 'tabs':      renderBrowserTabs(c.tabs); break;
  }
}

function enterBrowserSelectMode() {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  body.dataset.browserSelectMode = 'true';
  body.dataset.browserSelected = '[]';
  const bar = document.getElementById('browserBatchBar');
  if (bar) bar.style.display = 'flex';
  updateBrowserBatchCount();
  const container = document.getElementById('browserContent');
  if (!container) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const tab = body.dataset.browserCurrentTab || 'history';
  switch(tab) {
    case 'history':   renderBrowserHistory(c.history); break;
    case 'bookmarks': renderBrowserBookmarks(c.bookmarks); break;
    case 'tabs':      renderBrowserTabs(c.tabs); break;
  }
}

function cancelBrowserSelect() {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  body.dataset.browserSelectMode = 'false';
  body.dataset.browserSelected = '[]';
  const bar = document.getElementById('browserBatchBar');
  if (bar) bar.style.display = 'none';
  const container = document.getElementById('browserContent');
  if (!container) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const tab = body.dataset.browserCurrentTab || 'history';
  switch(tab) {
    case 'history':   renderBrowserHistory(c.history); break;
    case 'bookmarks': renderBrowserBookmarks(c.bookmarks); break;
    case 'tabs':      renderBrowserTabs(c.tabs); break;
  }
}

function toggleBrowserItem(idx) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  let selected = JSON.parse(body.dataset.browserSelected || '[]');
  if (selected.includes(idx)) {
    selected = selected.filter(i => i !== idx);
  } else {
    selected.push(idx);
  }
  body.dataset.browserSelected = JSON.stringify(selected);
  updateBrowserBatchCount();
  cancelBrowserSelect();
  body.dataset.browserSelectMode = 'true';
  const bar = document.getElementById('browserBatchBar');
  if (bar) bar.style.display = 'flex';
  updateBrowserBatchCount();
  const container = document.getElementById('browserContent');
  if (!container) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const tab = body.dataset.browserCurrentTab || 'history';
  switch(tab) {
    case 'history':   renderBrowserHistory(c.history); break;
    case 'bookmarks': renderBrowserBookmarks(c.bookmarks); break;
    case 'tabs':      renderBrowserTabs(c.tabs); break;
  }
}

function selectAllBrowserItems() {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const tab = body.dataset.browserCurrentTab || 'history';
  const list = tab === 'bookmarks' ? c.bookmarks
             : tab === 'tabs'      ? c.tabs
             : c.history;
  const all = (list || []).map((_, i) => i);
  body.dataset.browserSelected = JSON.stringify(all);
  updateBrowserBatchCount();
  const container = document.getElementById('browserContent');
  if (!container) return;
  switch(tab) {
    case 'history':   renderBrowserHistory(c.history); break;
    case 'bookmarks': renderBrowserBookmarks(c.bookmarks); break;
    case 'tabs':      renderBrowserTabs(c.tabs); break;
  }
}

function updateBrowserBatchCount() {
  const body = document.getElementById('phoneAppBody');
  const selected = JSON.parse(body?.dataset.browserSelected || '[]');
  const el = document.getElementById('browserBatchCount');
  if (el) el.textContent = `已选 ${selected.length} 项`;
}

function openBrowserCached(idx, tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const cached = c._browserCache?.[`${tab}_${idx}`];
  const list = tab === 'bookmarks' ? c.bookmarks
             : tab === 'tabs'      ? c.tabs
             : c.history;
  const page = list?.[idx];
  if (!page) return;

  const urlBar = document.getElementById('browserUrlBar');
  if (urlBar) urlBar.textContent = page.url || page.title;

  const container = document.getElementById('browserContent');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8f8f8;border-bottom:0.5px solid #e0e0e0;flex-shrink:0">
        <button onclick="switchBrowserTab('${tab}')"
          style="background:none;border:none;font-size:20px;color:#4285F4;cursor:pointer;padding:0">‹</button>
        <div style="flex:1;background:white;border-radius:8px;padding:6px 10px;font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0.5px solid #e8e8e8">
          ${page.url || page.title}
        </div>
        <button onclick="regenerateBrowserPage(${idx},'${tab}')"
          style="background:none;border:none;font-size:16px;color:#bbb;cursor:pointer;padding:0 4px">⟳</button>
      </div>
      <div id="browserPageContent" style="flex:1;overflow-y:auto;background:white">
        ${cached || '<div style="padding:40px;text-align:center;color:#bbb;font-size:13px">暂无缓存内容</div>'}
      </div>
    </div>
  `;
}

function regenerateBrowserPage(idx, tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  if (c._browserCache) delete c._browserCache[`${tab}_${idx}`];
  body.dataset.content = JSON.stringify(c);
  const list = tab === 'bookmarks' ? c.bookmarks
             : tab === 'tabs'      ? c.tabs
             : c.history;
  const page = list?.[idx];
  if (page) openBrowserPage(idx, tab);
}

function renderBrowserHistory(items) {
  const container = document.getElementById('browserContent');
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无历史记录</div>';
    return;
  }
  const body = document.getElementById('phoneAppBody');
  const selectMode = body?.dataset.browserSelectMode === 'true';
  const selected = JSON.parse(body?.dataset.browserSelected || '[]');

  const groups = {};
  items.forEach((h, idx) => {
    const key = h.time?.includes('今天') ? '今天'
              : h.time?.includes('昨天') ? '昨天'
              : h.time?.includes('天前') ? h.time.split(' ')[0]
              : (h.time || '更早');
    if (!groups[key]) groups[key] = [];
    groups[key].push({ ...h, _idx: idx });
  });

  container.innerHTML = Object.keys(groups).map(day => `
    <div>
      <div style="padding:8px 16px;font-size:11px;color:#999;background:#f5f5f5;font-weight:500;display:flex;align-items:center;justify-content:space-between">
        <span>${day}</span>
        ${!selectMode ? `<button onclick="enterBrowserSelectMode()" style="background:none;border:none;font-size:11px;color:#4285F4;cursor:pointer;padding:0">多选</button>` : ''}
      </div>
      ${groups[day].map(h => {
        const isSelected = selected.includes(h._idx);
        return `
          <div onclick="${selectMode ? `toggleBrowserItem(${h._idx})` : `openBrowserPage(${h._idx},'history')`}"
            style="display:flex;align-items:center;gap:12px;padding:11px 16px;background:${isSelected?'#EEF3FF':'white'};border-bottom:0.5px solid #f0f0f0;cursor:pointer;transition:background 0.15s">
            ${selectMode ? `
              <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected?'#4285F4':'#ccc'};background:${isSelected?'#4285F4':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all 0.15s">
                ${isSelected ? '<span style="color:white;font-size:13px;font-weight:700">✓</span>' : ''}
              </div>
            ` : `
              <div style="width:34px;height:34px;border-radius:8px;background:#f0f4ff;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
                ${getBrowserFavicon(h.url)}
              </div>
            `}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-bottom:2px">${h.title}</div>
              <div style="font-size:11px;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${h.url}</div>
            </div>
            <span style="font-size:11px;color:#ccc;flex-shrink:0">${h.time?.split(' ').pop() || ''}</span>
          </div>
        `;
      }).join('')}
    </div>
  `).join('');
}

function renderBrowserBookmarks(items) {
  const container = document.getElementById('browserContent');
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无书签</div>';
    return;
  }
  const body = document.getElementById('phoneAppBody');
  const selectMode = body?.dataset.browserSelectMode === 'true';
  const selected = JSON.parse(body?.dataset.browserSelected || '[]');

  container.innerHTML = `
    <div style="padding:12px 16px 4px;display:flex;justify-content:flex-end">
      ${!selectMode ? `<button onclick="enterBrowserSelectMode()" style="background:none;border:none;font-size:12px;color:#4285F4;cursor:pointer;padding:4px 0">多选</button>` : ''}
    </div>
    <div style="background:white;border-radius:12px;margin:0 12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
      ${items.map((b, i) => {
        const isSelected = selected.includes(i);
        return `
          <div onclick="${selectMode ? `toggleBrowserItem(${i})` : `openBrowserPage(${i},'bookmarks')`}"
            style="display:flex;align-items:center;gap:12px;padding:12px 14px;border-bottom:0.5px solid #f0f0f0;cursor:pointer;background:${isSelected?'#EEF3FF':'white'};transition:background 0.15s">
            ${selectMode ? `
              <div style="width:22px;height:22px;border-radius:50%;border:2px solid ${isSelected?'#4285F4':'#ccc'};background:${isSelected?'#4285F4':'white'};display:flex;align-items:center;justify-content:center;flex-shrink:0">
                ${isSelected ? '<span style="color:white;font-size:13px;font-weight:700">✓</span>' : ''}
              </div>
            ` : `
              <div style="width:32px;height:32px;border-radius:8px;background:#f0f4ff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">
                ${getBrowserFavicon(b.url)}
              </div>
            `}
            <div style="flex:1;min-width:0">
              <div style="font-size:14px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.title}</div>
              <div style="font-size:11px;color:#bbb;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${b.url}</div>
            </div>
            <span style="color:#bbb;font-size:16px">›</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderBrowserTabs(items) {
  const container = document.getElementById('browserContent');
  if (!container) return;
  if (!items?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">没有打开的标签页</div>';
    return;
  }
  container.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:10px">
      ${items.map((t, i) => `
        <div onclick="openBrowserPage(${i},'tabs')"
          style="background:white;border-radius:14px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);cursor:pointer">
          <!-- 标签页预览区 -->
          <div style="height:100px;background:linear-gradient(135deg,#667eea22,#764ba222);display:flex;align-items:center;justify-content:center;font-size:36px;position:relative">
            ${getBrowserFavicon(t.url || '')}
            <div style="position:absolute;top:8px;right:8px;width:20px;height:20px;background:rgba(0,0,0,0.2);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;color:white">×</div>
          </div>
          <div style="padding:10px 12px">
            <div style="font-size:13px;color:#333;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.title}</div>
            <div style="font-size:11px;color:#bbb;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.url || ''}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div style="text-align:center;padding:8px;color:#4285F4;font-size:13px">共 ${items.length} 个标签页</div>
  `;
}

function getBrowserFavicon(url) {
  if (!url) return '🌐';
  const u = url.toLowerCase();
  if (u.includes('weibo') || u.includes('微博')) return '🔴';
  if (u.includes('bilibili') || u.includes('b站')) return '📺';
  if (u.includes('zhihu') || u.includes('知乎')) return '🔵';
  if (u.includes('douban') || u.includes('豆瓣')) return '🟢';
  if (u.includes('baidu') || u.includes('百度')) return '🔷';
  if (u.includes('github')) return '⚫';
  if (u.includes('youtube')) return '▶️';
  if (u.includes('twitter') || u.includes('x.com')) return '🐦';
  if (u.includes('instagram')) return '📸';
  if (u.includes('xiaohongshu') || u.includes('小红书')) return '📕';
  if (u.includes('douyin') || u.includes('tiktok') || u.includes('抖音')) return '🎵';
  if (u.includes('taobao') || u.includes('淘宝')) return '🛒';
  if (u.includes('jd') || u.includes('京东')) return '🟥';
  if (u.includes('news') || u.includes('新闻')) return '📰';
  if (u.includes('game') || u.includes('游戏')) return '🎮';
  return '🌐';
}

function openBrowserPage(idx, listKey) {
  const body = document.getElementById('phoneAppBody');
  const c = JSON.parse(body.dataset.content || '{}');
  const list = listKey === 'bookmarks' ? c.bookmarks
             : listKey === 'tabs'      ? c.tabs
             : c.history;
  const page = list?.[idx];
  if (!page) return;

  // 检查是否已有缓存
  const phoneData = getPhoneData(currentPhoneCharId);
  const persistCache = phoneData.apps.browser?.content?._browserCache || {};
  const localCache = c._browserCache || {};
  const cacheKey = `${listKey}_${idx}`;
  const cached = persistCache[cacheKey] || localCache[cacheKey];

  const urlBar = document.getElementById('browserUrlBar');
  if (urlBar) urlBar.textContent = page.url || page.title;

  const container = document.getElementById('browserContent');
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8f8f8;border-bottom:0.5px solid #e0e0e0;flex-shrink:0">
        <button onclick="switchBrowserTab('${listKey}')"
          style="background:none;border:none;font-size:20px;color:#4285F4;cursor:pointer;padding:0">‹</button>
        <div style="flex:1;background:white;border-radius:8px;padding:6px 10px;font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0.5px solid #e8e8e8">
          ${page.url || page.title}
        </div>
        <button onclick="regenerateBrowserPage(${idx},'${listKey}')"
          style="background:none;border:none;font-size:16px;color:#bbb;cursor:pointer;padding:0 4px">⟳</button>
      </div>
      <div id="browserPageContent" style="flex:1;overflow-y:auto;background:white">
        ${cached
          ? cached
          : `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;gap:12px;color:#bbb">
               <div style="font-size:28px;animation:spin 1s linear infinite">⏳</div>
               <div style="font-size:13px">正在加载页面...</div>
             </div>`
        }
      </div>
    </div>
  `;

  // 有缓存直接显示，不调AI
  if (cached) return;

  // 无缓存才调AI生成
  generateBrowserPageContent(page, idx, listKey);
}

async function generateBrowserPageContent(page, idx, listKey) {
  const el = document.getElementById('browserPageContent');
  if (!el) return;

  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const polliKey = D.settings.polliKey || '';
  const polliModel = D.settings.polliModel || 'flux';
  const keyParam = polliKey ? `&key=${encodeURIComponent(polliKey)}` : '';

  const prompt = `你是一个手机网页渲染器。根据以下信息生成一个仿真的手机网页HTML片段。

【角色】${char?.name || '用户'}
【网页标题】${page.title}
【网页URL】${page.url || ''}
【角色人设】${char?.persona || '无'}

【图片生成规则】
需要图片时，使用以下格式的img标签（英文描述，简洁准确）：
<img src="https://gen.pollinations.ai/image/[英文图片描述，空格用%20]?model=${polliModel}&width=400&height=260&seed=[随机4位数]&nologo=true${keyParam}" style="width:100%;border-radius:8px;object-fit:cover" loading="lazy">

【要求】
1. 直接输出HTML片段，不要html/head/body标签
2. 所有样式用inline style，字体用-apple-system
3. 仿照真实网页排版：顶部大图或封面、标题、正文段落、适当配图
4. 内容贴合网页标题和角色人设，真实丰富
5. 图片放在合适位置，不要堆砌，2-3张即可
6. 适合手机屏幕宽度（padding:0 16px）
7. 控制在120行以内

直接输出HTML，第一个字符必须是<`;

  try {
    const html = await callPhoneAIRaw(prompt);
    let result = html.trim();
    const codeMatch = result.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeMatch) result = codeMatch[1].trim();
    if (!result || result.length < 10) throw new Error('内容为空');

    result = result.replace(/<img /g, '<img onerror="this.style.display=\'none\'" ');

    el.innerHTML = result;

    // 持久化缓存：用传入的 idx 和 listKey，不用 page 上的字段
    const cacheKey = `${listKey}_${idx}`;
    const body = document.getElementById('phoneAppBody');
    if (body) {
      const c = JSON.parse(body.dataset.content || '{}');
      if (!c._browserCache) c._browserCache = {};
      c._browserCache[cacheKey] = result;
      body.dataset.content = JSON.stringify(c);
      const _content = getAccData().phoneData[currentPhoneCharId].apps.browser.content;
      if (_content) {
        if (!_content._browserCache) _content._browserCache = {};
        _content._browserCache[cacheKey] = result;
      }
    }
    savePhoneData();

  } catch(e) {
    el.innerHTML = `
      <div style="padding:24px;font-family:-apple-system,sans-serif">
        <div style="height:180px;background:linear-gradient(135deg,#f0f4ff,#e8f0fe);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:48px;margin-bottom:16px">
          ${getBrowserFavicon(page.url || '')}
        </div>
        <h2 style="font-size:18px;color:#333;margin:0 0 8px;font-weight:700">${page.title}</h2>
        <div style="font-size:12px;color:#4285F4;margin-bottom:16px">${page.url || ''}</div>
        <div style="font-size:14px;color:#666;line-height:1.8;margin-bottom:16px">页面加载失败，请重试。</div>
        <button onclick="openBrowserPage(${idx},'${listKey}')"
          style="padding:10px 20px;background:#4285F4;color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer">
          重新加载
        </button>
      </div>
    `;
  }
}

function renderTiebaApp(body, content) {
  const c = content;
  body.style.background = '#f5f5f5';
  body.style.fontFamily = '-apple-system,BlinkMacSystemFont,sans-serif';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#f5f5f5">
      <div style="display:flex;background:white;border-bottom:0.5px solid #e0e0e0;flex-shrink:0">
        ${[['posts','我的帖子'],['replies','我的回复'],['following','关注的吧']].map(([k,v],i) => `
          <button id="tiebaTab_${k}" onclick="switchTiebaTab('${k}')"
            style="flex:1;padding:10px 0;border:none;background:white;font-size:13px;cursor:pointer;
            color:${i===0?'#614BF7':'#555'};
            border-bottom:${i===0?'2px solid #614BF7':'2px solid transparent'};
            font-weight:${i===0?'600':'400'}">
            ${v}
          </button>
        `).join('')}
      </div>
      <div id="tiebaContent" style="flex:1;overflow-y:auto"></div>
    </div>
  `;
  body.dataset.content = JSON.stringify(content);
  renderTiebaPostsTab(c.posts);
}

function switchTiebaTab(tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  ['posts','replies','following'].forEach(k => {
    const btn = document.getElementById('tiebaTab_' + k);
    if (!btn) return;
    btn.style.color = k === tab ? '#614BF7' : '#555';
    btn.style.borderBottom = k === tab ? '2px solid #614BF7' : '2px solid transparent';
    btn.style.fontWeight = k === tab ? '600' : '400';
  });
  switch(tab) {
    case 'posts':     renderTiebaPostsTab(c.posts); break;
    case 'replies':   renderTiebaRepliesTab(c.replies); break;
    case 'following': renderTiebaFollowingTab(c.following); break;
  }
}

function renderTiebaFollowingTab(following) {
  const container = document.getElementById('tiebaContent');
  if (!container) return;
  if (!following?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无关注的吧</div>';
    return;
  }
  container.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
      ${following.map(b => `
        <div style="background:white;border-radius:12px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
          <div style="width:44px;height:44px;border-radius:10px;background:linear-gradient(135deg,#614BF7,#9b7ff7);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
            ${b.icon || '📌'}
          </div>
          <div style="flex:1">
            <div style="font-size:15px;font-weight:500;color:#333">${b.name}吧</div>
            <div style="font-size:12px;color:#bbb;margin-top:2px">点击进入</div>
          </div>
          <span style="color:#bbb;font-size:18px">›</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTiebaPostsTab(posts) {
  const container = document.getElementById('tiebaContent');
  if (!container) return;
  if (!posts?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无发帖</div>';
    return;
  }
  container.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:10px">
      ${posts.map((p, i) => `
        <div onclick="openTiebaPost(${i})"
          style="background:white;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.06);cursor:pointer">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:11px;color:#614BF7;background:#614BF722;padding:2px 8px;border-radius:10px;font-weight:500">${p.bar}吧</span>
            <span style="font-size:11px;color:#bbb">${p.time}</span>
          </div>
          <div style="font-size:15px;font-weight:600;color:#222;margin-bottom:6px;line-height:1.5">${p.title}</div>
          <div style="font-size:13px;color:#888;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin-bottom:10px">${p.content}</div>
          <div style="display:flex;align-items:center;gap:16px;font-size:12px;color:#bbb;border-top:0.5px solid #f5f5f5;padding-top:10px">
            <span>💬 ${p.replies || p.comments?.length || 0} 回复</span>
            <span>👁 ${Math.floor(Math.random()*500)+50} 浏览</span>
            <span style="margin-left:auto;color:#614BF7;font-size:12px">查看全帖 ›</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderTiebaRepliesTab(replies) {
  const container = document.getElementById('tiebaContent');
  if (!container) return;
  if (!replies?.length) {
    container.innerHTML = '<div style="text-align:center;padding:40px;color:#bbb;font-size:14px">暂无回复记录</div>';
    return;
  }
  container.innerHTML = `
    <div style="padding:12px;display:flex;flex-direction:column;gap:8px">
      ${replies.map(r => `
        <div style="background:white;border-radius:12px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <span style="font-size:11px;color:#614BF7;background:#614BF722;padding:2px 8px;border-radius:10px">${r.bar}吧</span>
            <span style="font-size:11px;color:#bbb">${r.time}</span>
          </div>
          <div style="font-size:12px;color:#bbb;margin-bottom:6px">回复了：${r.post}</div>
          <div style="font-size:14px;color:#333;line-height:1.6;background:#f8f8f8;border-radius:8px;padding:10px 12px">${r.content}</div>
        </div>
      `).join('')}
    </div>
  `;
}

function openTiebaPost(idx) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const post = c.posts?.[idx];
  if (!post) return;

  const char = getAccData().chars.find(ch => ch.id === currentPhoneCharId);
  const container = document.getElementById('tiebaContent');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;min-height:100%;background:#f5f5f5">
      <!-- 顶部导航 -->
      <div style="display:flex;align-items:center;padding:10px 12px;background:white;border-bottom:0.5px solid #e0e0e0;flex-shrink:0;position:sticky;top:0;z-index:10">
        <button onclick="switchTiebaTab('posts')"
          style="background:none;border:none;font-size:20px;color:#614BF7;cursor:pointer;padding:0 8px 0 0">‹</button>
        <span style="flex:1;font-size:14px;font-weight:600;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${post.bar}吧</span>
        <span style="font-size:12px;color:#bbb">${post.time}</span>
      </div>

      <!-- 楼主帖子（1楼） -->
      <div style="background:white;margin:10px 12px;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
          <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#614BF7,#9b7ff7);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">
            ${char?.avatar && char.avatar.length > 2 ? `<img src="${char.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : (char?.avatar || '🙂')}
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#614BF7">${char?.displayName || char?.name || '楼主'}</div>
            <div style="font-size:11px;color:#bbb">楼主 · ${post.time}</div>
          </div>
          <span style="margin-left:auto;font-size:12px;color:white;background:#614BF7;padding:2px 8px;border-radius:10px">1楼</span>
        </div>
        <div style="font-size:16px;font-weight:700;color:#222;margin-bottom:10px;line-height:1.5">${post.title}</div>
        <div style="font-size:14px;color:#444;line-height:1.8">${post.content}</div>
        <div style="display:flex;gap:16px;margin-top:12px;padding-top:10px;border-top:0.5px solid #f0f0f0">
          <span style="font-size:13px;color:#bbb;cursor:pointer">👍 点赞</span>
          <span style="font-size:13px;color:#bbb;cursor:pointer">💬 回复</span>
          <span style="font-size:13px;color:#bbb;cursor:pointer">↗️ 分享</span>
        </div>
      </div>

      <!-- 回复列表 -->
      <div style="margin:0 12px 12px;display:flex;flex-direction:column;gap:8px">
        <div style="font-size:13px;color:#999;padding:4px 0">共 ${post.comments?.length || 0} 条回复</div>
        ${(post.comments || []).map((cm, ci) => `
          <div style="background:white;border-radius:12px;padding:14px;box-shadow:0 1px 4px rgba(0,0,0,0.05)">
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <div style="width:36px;height:36px;border-radius:50%;background:${cm.isAuthor ? 'linear-gradient(135deg,#614BF7,#9b7ff7)' : 'linear-gradient(135deg,#f0f0f0,#d0d0d0)'};display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">
                ${cm.isAuthor
                  ? (char?.avatar && char.avatar.length > 2 ? `<img src="${char.avatar}" style="width:100%;height:100%;border-radius:50%;object-fit:cover">` : (char?.avatar || '🙂'))
                  : (cm.avatar || '👤')}
              </div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:600;color:${cm.isAuthor ? '#614BF7' : '#333'}">${cm.isAuthor ? (char?.displayName || char?.name || '楼主') : cm.name}${cm.isAuthor ? ' (楼主)' : ''}</div>
                <div style="font-size:11px;color:#bbb">${cm.time}</div>
              </div>
              <span style="font-size:12px;color:#bbb">${ci + 2}楼</span>
            </div>
            <div style="font-size:14px;color:#444;line-height:1.7">${cm.content}</div>
            <div style="display:flex;gap:16px;margin-top:10px;padding-top:8px;border-top:0.5px solid #f8f8f8">
              <span style="font-size:12px;color:#bbb;cursor:pointer">👍 ${cm.likes || 0}</span>
              <span style="font-size:12px;color:#bbb;cursor:pointer">💬 回复</span>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- 底部输入栏 -->
      <div style="position:sticky;bottom:0;padding:10px 12px;background:white;border-top:0.5px solid #e0e0e0;display:flex;gap:8px;align-items:center">
        <div style="flex:1;background:#f5f5f5;border-radius:20px;padding:9px 14px;font-size:13px;color:#bbb">
          说点什么...
        </div>
        <button style="padding:8px 16px;background:#614BF7;color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer;font-weight:500">发送</button>
      </div>
    </div>
  `;
}

function renderMailApp(body, content) {
  body.style.background = '#f2f2f7';
  body.style.fontFamily = '-apple-system,BlinkMacSystemFont,SF Pro Text,sans-serif';
  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#f2f2f7">

      <!-- 搜索栏 -->
      <div style="padding:10px 16px 8px;background:#f2f2f7;flex-shrink:0">
        <div style="background:rgba(118,118,128,0.12);border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:8px">
          <span style="font-size:13px;color:#8e8e93">🔍</span>
          <span style="font-size:15px;color:#8e8e93">搜索邮件</span>
        </div>
      </div>

      <!-- 信箱列表入口 -->
      <div style="margin:0 16px 16px;background:white;border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,0.06)">
        <div style="padding:10px 16px;font-size:13px;font-weight:600;color:#8e8e93;letter-spacing:0.3px">信箱</div>
        ${[
          ['inbox',   '收件箱', '📥', '#007AFF', content.inbox?.length || 0,   content.inbox?.filter(m=>!m.read).length || 0],
          ['sent',    '已发送', '📤', '#34C759', content.sent?.length || 0,    0],
          ['spam',    '垃圾邮件','🗑️','#FF3B30', content.spam?.length || 0,    0],
        ].map(([tab, label, icon, color, total, unread]) => `
          <div onclick="switchMailTab('${tab}')"
            style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-top:0.5px solid rgba(0,0,0,0.06);cursor:pointer;background:white;active:background:#f2f2f7">
            <div style="width:32px;height:32px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">
              ${icon}
            </div>
            <span style="flex:1;font-size:16px;color:#000;font-weight:400">${label}</span>
            ${unread > 0 ? `<span style="font-size:14px;font-weight:600;color:#007AFF">${unread}</span>` : `<span style="font-size:14px;color:#c7c7cc">${total}</span>`}
            <span style="color:#c7c7cc;font-size:16px;margin-left:2px">›</span>
          </div>
        `).join('')}
      </div>

      <!-- vip/重要邮件快捷入口 -->
      <div style="margin:0 16px 16px;background:white;border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,0.06)">
        <div style="padding:10px 16px;font-size:13px;font-weight:600;color:#8e8e93;letter-spacing:0.3px">快速查看</div>
        ${[
          ['未读邮件', '🔵', '#5856D6', content.inbox?.filter(m=>!m.read).length || 0],
          ['全部邮件', '📋', '#FF9500', (content.inbox?.length||0)+(content.sent?.length||0)],
          ['附件',     '📎', '#8e8e93', Math.floor(Math.random()*5)+1],
        ].map(([label, icon, color, count]) => `
          <div style="display:flex;align-items:center;gap:14px;padding:13px 16px;border-top:0.5px solid rgba(0,0,0,0.06);cursor:pointer">
            <div style="width:32px;height:32px;border-radius:8px;background:${color};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${icon}</div>
            <span style="flex:1;font-size:16px;color:#000">${label}</span>
            <span style="font-size:14px;color:#c7c7cc">${count}</span>
            <span style="color:#c7c7cc;font-size:16px;margin-left:2px">›</span>
          </div>
        `).join('')}
      </div>

    </div>
  `;
  body.dataset.content = JSON.stringify(content);
}

function switchMailTab(tab, e) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  switch(tab) {
    case 'inbox': renderMailList(c.inbox, '收件箱', 'inbox'); break;
    case 'sent':  renderMailList(c.sent,  '已发送', 'sent');  break;
    case 'spam':  renderMailList(c.spam,  '垃圾邮件','spam'); break;
  }
}

function renderMailList(items, title, tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,SF Pro Text,sans-serif">

      <!-- 顶部导航 -->
      <div style="display:flex;align-items:center;padding:12px 16px 8px;background:#f2f2f7;flex-shrink:0">
        <button onclick="renderMailApp(document.getElementById('phoneAppBody'),JSON.parse(document.getElementById('phoneAppBody').dataset.content||'{}'))"
          style="background:none;border:none;color:#007AFF;font-size:16px;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px;font-family:-apple-system,sans-serif">
          ‹ <span style="font-size:16px">信箱</span>
        </button>
        <span style="flex:1;text-align:center;font-size:17px;font-weight:600;color:#000">${title}</span>
        <button style="background:none;border:none;color:#007AFF;font-size:22px;cursor:pointer;padding:0;line-height:1">✎</button>
      </div>

      <!-- 邮件数量 -->
      <div style="padding:2px 16px 10px;font-size:12px;color:#8e8e93;flex-shrink:0">
        ${items?.length || 0} 封邮件
      </div>

      <!-- 邮件列表 -->
      <div style="flex:1;overflow-y:auto">
        ${!items?.length
          ? `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:80px 0;gap:12px">
               <div style="font-size:48px">📭</div>
               <div style="font-size:17px;color:#3c3c43;font-weight:500">没有邮件</div>
               <div style="font-size:14px;color:#8e8e93">此信箱为空</div>
             </div>`
          : `<div style="background:white;margin:0 16px;border-radius:14px;overflow:hidden;box-shadow:0 1px 0 rgba(0,0,0,0.06)">
               ${items.map((m, i) => renderMailRow(m, i, tab, i === items.length - 1)).join('')}
             </div>`
        }
      </div>

    </div>
  `;
  body.dataset.content = JSON.stringify(c);
}

function renderMailRow(m, i, tab, isLast) {
  const isSent = tab === 'sent';
  const isSpam = tab === 'spam';
  const unread = !m.read && !isSent && !isSpam;
  const fromName = isSent ? (m.to || '') : (m.from || '');
  const initial = (fromName[0] || '?').toUpperCase();
  const avatarColors = ['#007AFF','#34C759','#FF9500','#FF3B30','#5856D6','#FF2D55','#AF52DE','#00C7BE'];
  const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];

  return `
    <div onclick="openMailDetail('${tab}',${i})"
      style="display:flex;align-items:flex-start;gap:12px;padding:14px 16px;border-bottom:${isLast?'none':'0.5px solid rgba(0,0,0,0.06)'};background:white;cursor:pointer;position:relative">

      <!-- 头像 -->
      <div style="width:40px;height:40px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:600;color:white;flex-shrink:0;margin-top:2px">
        ${initial}
      </div>

      <!-- 未读蓝点 -->
      ${unread ? `<div style="position:absolute;left:6px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#007AFF"></div>` : ''}

      <!-- 内容 -->
      <div style="flex:1;min-width:0">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:3px">
          <span style="font-size:15px;font-weight:${unread?'600':'400'};color:#000;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px">
            ${isSent ? '发给：' + fromName : fromName}
          </span>
          <span style="font-size:12px;color:#8e8e93;flex-shrink:0;margin-left:8px">${m.time || ''}</span>
        </div>
        <div style="font-size:14px;font-weight:${unread?'500':'400'};color:#000;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${m.subject || '（无主题）'}
        </div>
        <div style="font-size:13px;color:#8e8e93;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
          ${isSpam ? '' : (m.preview || '')}
        </div>
      </div>

      <!-- 箭头 -->
      <span style="color:#c7c7cc;font-size:16px;flex-shrink:0;margin-top:10px">›</span>
    </div>
  `;
}

function openMailDetail(tab, idx) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const list = tab === 'sent' ? c.sent : tab === 'spam' ? c.spam : c.inbox;
  const mail = list?.[idx];
  if (!mail) return;

  // 标记已读
  if (tab === 'inbox' && !mail.read) {
    mail.read = true;
    body.dataset.content = JSON.stringify(c);
    const data = getPhoneData(currentPhoneCharId);
    if (data.apps.mail?.content?.inbox?.[idx]) {
      data.apps.mail.content.inbox[idx].read = true;
      savePhoneData();
    }
  }

  const isSent = tab === 'sent';
  const fromName = isSent ? (mail.to || '') : (mail.from || '');
  const initial = (fromName[0] || '?').toUpperCase();
  const avatarColors = ['#007AFF','#34C759','#FF9500','#FF3B30','#5856D6','#FF2D55','#AF52DE','#00C7BE'];
  const avatarColor = avatarColors[initial.charCodeAt(0) % avatarColors.length];
  const titleMap = { inbox:'收件箱', sent:'已发送', spam:'垃圾邮件' };

  body.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;background:#f2f2f7;font-family:-apple-system,BlinkMacSystemFont,SF Pro Text,sans-serif">

      <!-- 顶部导航 -->
      <div style="display:flex;align-items:center;padding:12px 16px 8px;background:#f2f2f7;flex-shrink:0">
        <button onclick="switchMailTab('${tab}')"
          style="background:none;border:none;color:#007AFF;font-size:16px;cursor:pointer;padding:0;display:flex;align-items:center;gap:4px;font-family:-apple-system,sans-serif">
          ‹ <span style="font-size:16px">${titleMap[tab]}</span>
        </button>
        <span style="flex:1"></span>
        <div style="display:flex;gap:16px">
          <button style="background:none;border:none;color:#007AFF;font-size:20px;cursor:pointer;padding:0">🗑</button>
          <button style="background:none;border:none;color:#007AFF;font-size:20px;cursor:pointer;padding:0">↩</button>
        </div>
      </div>

      <!-- 邮件内容 -->
      <div style="flex:1;overflow-y:auto;padding:0 16px 24px">

        <!-- 主题 -->
        <div style="font-size:20px;font-weight:700;color:#000;margin:8px 0 16px;line-height:1.4">
          ${mail.subject || '（无主题）'}
        </div>

        <!-- 发件人信息卡 -->
        <div style="background:white;border-radius:14px;padding:14px;margin-bottom:16px;box-shadow:0 1px 0 rgba(0,0,0,0.06)">
          <div style="display:flex;align-items:center;gap:12px">
            <div style="width:44px;height:44px;border-radius:50%;background:${avatarColor};display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:600;color:white;flex-shrink:0">
              ${initial}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:15px;font-weight:600;color:#000;margin-bottom:2px">
                ${isSent ? '收件人：' + (mail.to || '') : (mail.from || '')}
              </div>
              <div style="font-size:13px;color:#8e8e93">
                ${isSent ? '发件人：我' : '收件人：我'}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:12px;color:#8e8e93">${mail.time || ''}</div>
            </div>
          </div>
        </div>

        <!-- 正文 -->
        <div style="background:white;border-radius:14px;padding:16px;box-shadow:0 1px 0 rgba(0,0,0,0.06)">
          <div style="font-size:15px;color:#000;line-height:1.8;white-space:pre-wrap">${mail.preview || mail.body || '（无正文）'}</div>
        </div>

        <!-- 快捷回复 -->
        ${!isSent ? `
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
            ${['好的，收到','稍后回复','谢谢！'].map(txt => `
              <div style="background:white;border-radius:20px;padding:8px 16px;font-size:13px;color:#007AFF;box-shadow:0 1px 0 rgba(0,0,0,0.06);cursor:pointer;border:0.5px solid rgba(0,122,255,0.2)">
                ${txt}
              </div>
            `).join('')}
          </div>
        ` : ''}

      </div>

      <!-- 底部工具栏 -->
      ${!isSent ? `
        <div style="padding:12px 16px 20px;background:#f2f2f7;border-top:0.5px solid rgba(0,0,0,0.1);display:flex;justify-content:space-around;flex-shrink:0">
          ${[['↩','回复'],['↪','转发'],['🚩','标记'],['🗑','删除']].map(([icon,label]) => `
            <div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer">
              <span style="font-size:20px;color:#007AFF">${icon}</span>
              <span style="font-size:11px;color:#8e8e93">${label}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

    </div>
  `;
  body.dataset.content = JSON.stringify(c);
}

function renderSettingsApp(body, content) {
  const c = content;
  body.innerHTML = `
    <div class="settings-app">
      <div class="settings-profile">
        <span class="profile-avatar">${c.profile?.avatar || '👤'}</span>
        <div class="profile-info">
          <div class="profile-name">${c.profile?.nickname || '未设置'}</div>
          <div class="profile-phone">${c.profile?.phone || ''}</div>
        </div>
      </div>
      <div class="settings-section">
        <div class="setting-item">
          <span>生日</span><span>${c.profile?.birthday || '-'}</span>
        </div>
        <div class="setting-item">
          <span>地区</span><span>${c.profile?.location || '-'}</span>
        </div>
        <div class="setting-item">
          <span>个性签名</span><span>${c.signature || '-'}</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="setting-item">
          <span>手机型号</span><span>${c.device?.model || '-'}</span>
        </div>
        <div class="setting-item">
          <span>系统版本</span><span>${c.device?.system || '-'}</span>
        </div>
        <div class="setting-item">
          <span>存储空间</span><span>${c.device?.storage || '-'}</span>
        </div>
      </div>
      <div class="settings-section">
        <div class="setting-item">
          <span>上次登录</span><span>${c.lastLogin || '-'}</span>
        </div>
      </div>
    </div>
  `;
}

// ========== 批量生成 ==========
function openPhoneBatchGen() {
  const data = getPhoneData(currentPhoneCharId);
  
  const html = `
    <div class="batch-gen-modal">
      <h3>批量生成</h3>
      <div class="batch-list">
        ${PHONE_APPS.map(app => `
          <label class="batch-item">
            <input type="checkbox" value="${app.id}" ${data.apps[app.id]?.generated ? 'disabled' : ''}>
            <span>${app.icon} ${app.name}</span>
            ${data.apps[app.id]?.generated ? '<small>(已生成)</small>' : ''}
          </label>
        `).join('')}
      </div>
      <div class="batch-actions">
        <button onclick="selectAllBatch()">全选未生成</button>
        <button onclick="doBatchGen()">开始生成</button>
        <button onclick="closePhoneModal()">取消</button>
      </div>
    </div>
  `;
  showPhoneModal(html);
}

function selectAllBatch() {
  document.querySelectorAll('.batch-item input:not(:disabled)').forEach(cb => cb.checked = true);
}

async function doBatchGen() {
  const selected = [...document.querySelectorAll('.batch-item input:checked')].map(cb => cb.value);
  if (!selected.length) return toast('请选择要生成的应用');
  
  closePhoneModal();
  
  for (const appId of selected) {
    toast(`正在生成 ${PHONE_APPS.find(a => a.id === appId)?.name}...`);
    await generatePhoneApp(appId);
  }
  
  toast('批量生成完成');
}

// ========== 丢弃功能 ==========
function discardPhoneApp(appId) {
  const data = getPhoneData(currentPhoneCharId);
  data.apps[appId] = { generated: false, content: null };
  savePhoneData();
  renderPhoneAppContent(appId);
  renderPhoneApps();
  toast('已丢弃');
}

function phoneDiscardAll() {
  if (!confirm('确定要丢弃所有内容吗？此操作不可恢复。')) return;
  if (!confirm('真的确定吗？')) return;
  
  const data = getPhoneData(currentPhoneCharId);
  data.widgets = [];
  Object.keys(data.apps).forEach(k => {
    data.apps[k] = { generated: false, content: null };
  });
  // 同时清掉第二页AI应用
  data.aiApps = [];
  phoneAIApps = [];
  savePhoneData();
  renderPhoneWidgets();
  renderPhoneApps();
  // 重置第二页到待生成状态
  renderAIAppPage();
  toast('已全部丢弃');
}

// ========== 弹窗工具 ==========
function showPhoneModal(html) {
  let modal = document.getElementById('phoneModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'phoneModal';
    modal.className = 'phone-modal';
modal.style.zIndex = '999999';
    // 修复：添加到 phone-container 而不是 phonePage
    const container = document.querySelector('.phone-container');
    if (container) {
      container.appendChild(modal);
    } else {
      // 如果 container 也不存在，添加到 body
      document.body.appendChild(modal);
    }
  }
  modal.innerHTML = `<div class="phone-modal-content">${html}</div>`;
  modal.style.display = 'flex';
}

function closePhoneModal() {
  const modal = document.getElementById('phoneModal');
  if (modal) modal.style.display = 'none';
}

// ========== AI调用 ==========
async function callPhoneAI(prompt) {
  const messages = [
    { role: 'system', content: '你是一个JSON生成器。只返回有效的JSON，不要返回任何其他内容。' },
    { role: 'user', content: prompt }
  ];
  
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
const base = D.api.url.replace(/\/$/, '').replace(/\/v1.*$/, '');
const apiUrl = base + '/v1/chat/completions';
xhr.open('POST', apiUrl);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + D.api.key);
    
xhr.onload = function() {
  console.log('callPhoneAI status:', xhr.status, 'response:', xhr.responseText.slice(0, 300));
  if (xhr.status === 200) {
        try {
          const resp = JSON.parse(xhr.responseText);
          let content = resp.choices?.[0]?.message?.content || '';
          // 提取JSON
// 先尝试直接解析
content = content.trim();
try {
  JSON.parse(content);
  resolve(content);
  return;
} catch(e) {}

// 提取代码块里的JSON
const codeMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
if (codeMatch) {
  try {
    JSON.parse(codeMatch[1].trim());
    resolve(codeMatch[1].trim());
    return;
  } catch(e) {}
}

// 提取裸JSON对象
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (jsonMatch) {
  try {
    JSON.parse(jsonMatch[0]);
    resolve(jsonMatch[0]);
    return;
  } catch(e) {
    // JSON不合法，尝试修复
    const fixed = jsonMatch[0]
      .replace(/,\s*([}\]])/g, '$1')   // 去掉尾随逗号
      .replace(/\/\/[^\n]*/g, '')       // 去掉单行注释
      .replace(/\/\*[\s\S]*?\*\//g, ''); // 去掉多行注释
    try {
      JSON.parse(fixed);
      resolve(fixed);
      return;
    } catch(e2) {}
  }
}

console.error('AI原始返回内容：', content);
reject(new Error('未找到JSON：' + content.slice(0, 200)));
        } catch (e) {
          reject(e);
        }
      } else {
        reject(new Error('请求失败: ' + xhr.status));
      }
    };
    
    xhr.onerror = () => reject(new Error('网络错误'));
    
    xhr.send(JSON.stringify({
      model: D.api.model,
      messages,
      temperature: 0.8
    }));
  });
}
async function callPhoneAIRaw(prompt) {
  const messages = [
    { role: 'system', content: '你是一个手机应用页面生成器。直接输出HTML代码，不要任何解释。' },
    { role: 'user', content: prompt }
  ];

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const base = D.api.url.replace(/\/$/, '').replace(/\/v1.*$/, '');
    const apiUrl = base + '/v1/chat/completions';
    xhr.open('POST', apiUrl);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.setRequestHeader('Authorization', 'Bearer ' + D.api.key);

    xhr.onload = function() {
      if (xhr.status === 200) {
        try {
          const resp = JSON.parse(xhr.responseText);
          const content = resp.choices?.[0]?.message?.content || '';
          if (!content) reject(new Error('AI返回为空'));
          else resolve(content);
        } catch(e) {
          reject(e);
        }
      } else {
        reject(new Error('请求失败: ' + xhr.status));
      }
    };

    xhr.onerror = () => reject(new Error('网络错误'));

    xhr.send(JSON.stringify({
      model: D.api.model,
      messages,
      temperature: 0.8
    }));
  });
}
function showPhoneStatusBar(msg) {
  let bar = document.getElementById('phoneStatusBar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'phoneStatusBar';
    bar.style.cssText = 'position:absolute;bottom:60px;left:0;right:0;padding:10px 16px;background:rgba(0,0,0,0.75);color:white;font-size:13px;text-align:center;z-index:999;transition:opacity 0.3s;';
    const container = document.querySelector('.phone-container');
    if (container) container.appendChild(bar);
  }
  bar.textContent = msg;
  bar.style.opacity = '1';
  clearTimeout(bar._timer);
  bar._timer = setTimeout(() => { bar.style.opacity = '0'; }, 3000);
}
async function generateTaobaoImages(content) {
  if (!content) return;
  const lists = ['history', 'cart', 'orders', 'favorites'];
  const polliKey = D.settings.polliKey || '';

  for (const listKey of lists) {
    const items = content[listKey] || [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const prompt = item.imgPrompt || `product photo of ${item.title}, white background, studio lighting, commercial photography`;
      const url = `https://gen.pollinations.ai/image/${encodeURIComponent(prompt)}?model=${D.settings.polliModel || 'flux'}&seed=${Math.floor(Math.random()*9999)}&nologo=true${polliKey ? '&key=' + encodeURIComponent(polliKey) : ''}`;
      item.imgUrl = url;
    }
  }
}
// ========== 第二页：AI动态应用 ==========

let phoneCurrentPage = 0;
let phoneAIApps = []; // 存储AI生成的应用

// 初始化滑动
function initPhoneSwipe() {
  const desktop = document.getElementById('phoneDesktop');
  if (!desktop) return;
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  desktop.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    isDragging = true;
  }, { passive: true });
  desktop.addEventListener('touchend', e => {
    if (!isDragging) return;
    isDragging = false;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) < Math.abs(dy)) return;
    if (Math.abs(dx) < 40) return;
    if (dx < 0 && phoneCurrentPage === 0) switchPhonePage(1);
    else if (dx > 0 && phoneCurrentPage === 1) switchPhonePage(0);
  }, { passive: true });
}

function switchPhonePage(idx) {
  phoneCurrentPage = idx;
  const page1 = document.getElementById('phonePage1');
  const page2 = document.getElementById('phonePage2');
  if (page1) page1.style.transform = idx === 0 ? 'translateX(0)' : 'translateX(-100%)';
  if (page2) page2.style.transform = idx === 0 ? 'translateX(100%)' : 'translateX(0)';

  // 更新指示器
  document.querySelectorAll('.phone-page-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });

  // 切到第二页时渲染
  if (idx === 1) {
    if (phoneAIApps.length > 0) {
      renderAIApps();
    } else {
      renderAIAppPage();
    }
  }
}

// 渲染第二页
function renderAIAppPage() {
  const container = document.getElementById('phoneAppsAI');
  if (!container) return;

  const data = getPhoneData(currentPhoneCharId);

  // 已有AI应用，直接渲染
  if (data.aiApps && data.aiApps.length > 0) {
    phoneAIApps = data.aiApps;
    renderAIApps();
    return;
  }

  // 未生成，显示待生成图标
// 先把容器改成普通flex居中，不用grid
container.style.display = 'flex';
container.style.flexDirection = 'column';
container.style.alignItems = 'center';
container.style.justifyContent = 'flex-start';
container.style.paddingTop = '60px';
container.innerHTML = `
    <div id="aiGenIconWrap" onclick="startAIAppGen()"
      style="display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer">
      <div id="aiGenIcon"
        style="width:64px;height:64px;border-radius:16px;background:rgba(255,255,255,0.15);backdrop-filter:blur(10px);border:1.5px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:28px;box-shadow:0 4px 20px rgba(0,0,0,0.15)">
        ✨
      </div>
      <span style="font-size:12px;color:rgba(255,255,255,0.7)">待生成</span>
    </div>
  `;
}

// 开始AI生成应用
async function startAIAppGen() {
  const icon = document.getElementById('aiGenIcon');
  const wrap = document.getElementById('aiGenIconWrap');
  if (!icon) return;

  // 图标旋转动画
  icon.style.animation = 'spin 1s linear infinite';
  icon.innerHTML = '⏳';
  if (wrap) wrap.onclick = null; // 防止重复点击

  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const chats = getAccData().chats[currentPhoneCharId] || [];
  const recent = chats.slice(-50);

  try {
    const apps = await generateAIApps(char, recent);
    phoneAIApps = apps;

    // 存储
    const data = getPhoneData(currentPhoneCharId);
    data.aiApps = apps;
    savePhoneData();

// 渲染图标
renderAIApps();

// 并发生成所有应用内容
Promise.all(apps.map((_, i) => generateAIAppContent(i)));

  } catch(e) {
    if (icon) {
      icon.style.animation = '';
      icon.innerHTML = '✨';
    }
    if (wrap) wrap.onclick = startAIAppGen;
    toast('生成失败：' + e.message);
  }
}

// 调用AI决定生成哪些应用
async function generateAIApps(char, recent) {
  const chatText = recent.map(m =>
    `${m.role === 'user' ? '用户' : char.name}: ${m.content}`
  ).join('\n');

  const prompt = `你是${char.name}。根据角色人设和聊天记录，决定这个角色手机上还装了哪些有趣的应用。

【角色人设】
${char.persona || '无'}

【最近聊天记录】
${chatText || '无'}

【要求】
根据角色特点，生成1-9个符合角色身份的手机应用。应用要有趣、贴合角色，不要生成微信、支付宝、淘宝、地图、浏览器、贴吧、邮箱、网易云、设置这些已有的应用。

只返回JSON：
{"apps":[{"id":"唯一英文id","name":"应用名","icon":"emoji","color":"十六进制颜色","desc":"应用简介一句话","type":"应用类型如diary/fitness/social/game/work/hobby等"}]}`;

  const resp = await callPhoneAI(prompt);
  const data = JSON.parse(resp);
  return (data.apps || []).slice(0, 9).map(app => ({
    ...app,
    generated: false,
    content: null
  }));
}

// 渲染AI应用图标
function renderAIApps() {
  const container = document.getElementById('phoneAppsAI');
  if (!container) return;
  // 改回grid布局
  container.style.display = 'grid';
  container.style.flexDirection = '';
  container.style.alignItems = '';
  container.style.justifyContent = '';
  container.style.paddingTop = '';
  container.innerHTML = phoneAIApps.map((app, i) => `
    <div class="phone-app-icon" onclick="openAIApp(${i})" id="aiAppIcon_${i}">
      <div class="app-icon-bg" style="background:${app.color || '#888'};${!app.generated ? 'opacity:0.5;filter:blur(0.5px)' : ''}">
        <span class="app-icon-emoji">${app.generated ? app.icon : '⏳'}</span>
      </div>
      <span class="app-icon-name" style="${!app.generated ? 'opacity:0.6' : ''}">${app.name}</span>
      ${!app.generated ? '<span class="app-badge" style="background:#888">…</span>' : ''}
    </div>
  `).join('');
}

// 生成单个AI应用内容
async function generateAIAppContent(idx) {
  const app = phoneAIApps[idx];
  if (!app || app.generated) return;

  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const chats = getAccData().chats[currentPhoneCharId] || [];
  const recent = chats.slice(-50);
  const chatText = recent.map(m =>
    `${m.role === 'user' ? '用户' : char.name}: ${m.content}`
  ).join('\n');

  const polliKey = D.settings.polliKey || '';
const polliModel = D.settings.polliModel || 'flux';
const keyParam = polliKey ? `&key=${encodeURIComponent(polliKey)}` : '';

const prompt = `你是${char.name}。为手机应用「${app.name}」（${app.desc}）生成完整的HTML页面内容。

【角色人设】
${char.persona || '无'}

【最近聊天记录】
${chatText || '无'}

【应用类型】${app.type}
【应用主色】${app.color}

【图片生成规则】
需要图片时，使用以下格式（英文描述，简洁准确，空格用%20）：
<img src="https://gen.pollinations.ai/image/[英文描述]?model=${polliModel}&width=400&height=260&seed=[随机4位数]&nologo=true${keyParam}" style="width:100%;border-radius:8px;object-fit:cover" loading="lazy" onerror="this.style.display='none'">
头像/小图用width=100&height=100，封面图用width=400&height=260。

【要求】
1. 直接输出HTML片段，不需要html/head/body标签
2. 所有样式用inline style
3. 内容真实丰富，贴合角色，适当在合适位置插入1-3张图片
4. 可以有交互，用原生onclick和基础DOM操作
5. 宽度100%，适合手机屏幕，主色调用${app.color}
6. 文字内容符合角色人设
7. 控制在150行以内

直接输出HTML，不要任何解释，不要代码块标记，第一个字符必须是<`;

  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('生成超时，请重试')), 90000)
  );

  try {
    // 直接调API拿原始文本，不走callPhoneAI的JSON解析
    const rawText = await Promise.race([callPhoneAIRaw(prompt), timeout]);

    // 提取HTML
    let html = rawText.trim();
    // 如果AI还是套了代码块，剥掉
    const codeMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeMatch) html = codeMatch[1].trim();
    // 如果AI返回了JSON，尝试提取html字段
    if (html.startsWith('{')) {
      try {
        const jsonData = JSON.parse(html);
        if (jsonData.html) html = jsonData.html;
      } catch(e) {
        const htmlMatch = html.match(/"html"\s*:\s*"([\s\S]*?)"\s*[,}]/);
        if (htmlMatch) html = htmlMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\'/g, "'");
      }
    }

    if (!html || html.length < 10) throw new Error('HTML内容为空');

    app.content = { html, title: app.name };
    app.generated = true;
    app._failed = false;

    const phoneData = getPhoneData(currentPhoneCharId);
    phoneData.aiApps = phoneAIApps;
    savePhoneData();

    try {
      const iconEl = document.getElementById(`aiAppIcon_${idx}`);
      if (iconEl) {
        iconEl.querySelector('.app-icon-bg').style.opacity = '1';
        iconEl.querySelector('.app-icon-bg').style.filter = '';
        iconEl.querySelector('.app-icon-emoji').textContent = app.icon;
        iconEl.querySelector('.app-icon-name').style.opacity = '1';
        const badge = iconEl.querySelector('.app-badge');
        if (badge) badge.remove();
      }
    } catch(e) {}

  } catch(e) {
    console.error(`AI应用${app.name}生成失败:`, e.message);
    app.generated = false;
    app.content = null;
    app._failed = true;

   const phoneData = getPhoneData(currentPhoneCharId);
phoneData.aiApps = phoneAIApps;
savePhoneData();

    try {
      const iconEl = document.getElementById(`aiAppIcon_${idx}`);
      if (iconEl) {
        iconEl.querySelector('.app-icon-bg').style.opacity = '0.4';
        iconEl.querySelector('.app-icon-bg').style.filter = '';
        iconEl.querySelector('.app-icon-emoji').textContent = '❌';
        iconEl.querySelector('.app-icon-name').style.opacity = '0.6';
        const badge = iconEl.querySelector('.app-badge');
        if (badge) { badge.textContent = '重试'; badge.style.background = '#ff4444'; }
      }
    } catch(e2) {}
  }
}

// 打开AI生成的应用
function openAIApp(idx) {
  const app = phoneAIApps[idx];
  if (!app) return;

if (!app.generated) {
  if (app._failed) {
    app._failed = false;
    app.content = null;
    // 先更新图标回到生成中状态
    try {
      const iconEl = document.getElementById(`aiAppIcon_${idx}`);
      if (iconEl) {
        iconEl.querySelector('.app-icon-bg').style.opacity = '0.5';
        iconEl.querySelector('.app-icon-emoji').textContent = '⏳';
        iconEl.querySelector('.app-icon-name').style.opacity = '0.6';
        const badge = iconEl.querySelector('.app-badge');
        if (badge) { badge.textContent = '…'; badge.style.background = '#888'; }
      }
    } catch(e) {}
    toast(`重新生成 ${app.name}...`);
    generateAIAppContent(idx).then(() => {
      // 生成成功后如果用户还在第二页，刷新图标
      if (phoneCurrentPage === 1) renderAIApps();
    });
  } else {
    toast(`${app.name} 正在生成中...`);
  }
  return;
}

  const win = document.getElementById('phoneAppWindow');
  if (!win) return;

    win.innerHTML = `
    <div class="phone-app-header" style="background:${app.color || '#888'}">
      <button class="phone-back-btn" onclick="closePhoneApp()">←</button>
      <span class="phone-app-title">${app.content?.title || app.name}</span>
      <div style="display:flex;gap:4px">
        <button class="phone-app-menu-btn" onclick="appendAIAppContent(${idx})" title="追加内容">＋</button>
        <button class="phone-app-menu-btn" onclick="regenAIApp(${idx})" title="重新生成">↺</button>
      </div>
    </div>
    <div class="phone-app-body" id="phoneAppBody" style="overflow-y:auto;-webkit-overflow-scrolling:touch"></div>
  `;

  win.style.display = 'flex';
  win.classList.add('show');

  const body = document.getElementById('phoneAppBody');
  if (!body) return;

  if (!app.content?.html) {
    body.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#bbb;gap:12px">
      <div style="font-size:32px">${app.icon}</div>
      <div style="font-size:14px">暂无内容</div>
    </div>`;
    return;
  }

// 清理上一个AI应用遗留的定时器
if (window._aiAppTimers) {
  window._aiAppTimers.forEach(id => { clearInterval(id); clearTimeout(id); });
}
window._aiAppTimers = [];

// 接管 setInterval/setTimeout，记录所有定时器方便清理
const _origSetInterval = window.setInterval;
const _origSetTimeout = window.setTimeout;
window.setInterval = function(fn, delay, ...args) {
  const id = _origSetInterval(fn, delay, ...args);
  window._aiAppTimers.push(id);
  return id;
};
window.setTimeout = function(fn, delay, ...args) {
  const id = _origSetTimeout(fn, delay, ...args);
  window._aiAppTimers.push(id);
  return id;
};

// 把AI生成的HTML塞进去，用try-catch包住script执行
body.innerHTML = app.content.html;

body.querySelectorAll('script').forEach(oldScript => {
  const newScript = document.createElement('script');
  newScript.textContent = `try { ${oldScript.textContent} } catch(e) { console.warn('AI应用脚本错误:', e.message); }`;
  oldScript.parentNode.replaceChild(newScript, oldScript);
});

// 还原 setInterval/setTimeout
window._origSetInterval = _origSetInterval;
window._origSetTimeout = _origSetTimeout;
window.setInterval = _origSetInterval;
window.setTimeout = _origSetTimeout;
}

// 渲染AI应用内容（通用智能渲染）
function renderAIAppContent(idx) {
  const app = phoneAIApps[idx];
  const body = document.getElementById('phoneAppBody');
  if (!app || !body) return;

  const c = app.content;
  if (!c) {
    body.innerHTML = '<div class="phone-app-empty"><p>暂无内容</p></div>';
    return;
  }

  // 智能渲染：遍历content的顶层key，每个key作为一个section
  const sections = Object.keys(c);

  // 如果只有一个key且是数组，直接渲染列表
  if (sections.length === 1 && Array.isArray(c[sections[0]])) {
    body.innerHTML = renderAISection(sections[0], c[sections[0]], app, idx);
    body.dataset.content = JSON.stringify(c);
    body.dataset.appIdx = idx;
    return;
  }

  // 多个key，用tab切换
  if (sections.length > 1) {
    body.innerHTML = `
      <div style="display:flex;border-bottom:1px solid #f0f0f0;background:white;flex-shrink:0;overflow-x:auto">
        ${sections.map((s, i) => `
          <button style="flex:1;min-width:60px;padding:10px 4px;border:none;background:none;font-size:12px;cursor:pointer;white-space:nowrap;
            ${i === 0 ? 'color:#333;border-bottom:2px solid #333;font-weight:600' : 'color:#888'}"
            onclick="switchAIAppTab('${s}',${idx},event)">${formatAIKey(s)}</button>
        `).join('')}
      </div>
      <div id="aiAppContent" style="flex:1;overflow-y:auto">
        ${renderAISection(sections[0], c[sections[0]], app, idx)}
      </div>
    `;
    body.dataset.content = JSON.stringify(c);
    body.dataset.appIdx = idx;
    return;
  }

  // 单个对象，渲染键值对
  body.innerHTML = `
    <div style="padding:16px">
      ${sections.map(k => `
        <div style="padding:12px 0;border-bottom:1px solid #f5f5f5">
          <div style="font-size:11px;color:#999;margin-bottom:4px">${formatAIKey(k)}</div>
          <div style="font-size:14px;color:#333">${JSON.stringify(c[k])}</div>
        </div>
      `).join('')}
    </div>
  `;
  body.dataset.content = JSON.stringify(c);
}

function switchAIAppTab(key, appIdx, e) {
  // 更新tab样式
  e.target.closest('div').querySelectorAll('button').forEach(btn => {
    btn.style.color = '#888';
    btn.style.borderBottom = 'none';
    btn.style.fontWeight = 'normal';
  });
  e.target.style.color = '#333';
  e.target.style.borderBottom = '2px solid #333';
  e.target.style.fontWeight = '600';

  const body = document.getElementById('phoneAppBody');
  const c = JSON.parse(body.dataset.content || '{}');
  const container = document.getElementById('aiAppContent');
  if (container) {
    container.innerHTML = renderAISection(key, c[key], phoneAIApps[appIdx], appIdx);
  }
}

// 渲染单个section
function renderAISection(key, val, app, appIdx) {
  if (!val) return `<div style="padding:40px;text-align:center;color:#bbb">暂无内容</div>`;

  // 数组：渲染列表
  if (Array.isArray(val)) {
    return `<div style="padding:10px">
      ${val.map((item, i) => renderAIItem(item, i, key, app, appIdx)).join('')}
    </div>`;
  }

  // 对象：渲染键值对
  if (typeof val === 'object') {
    return `<div style="padding:16px">
      ${Object.keys(val).map(k => `
        <div style="padding:10px 0;border-bottom:1px solid #f5f5f5">
          <div style="font-size:11px;color:#999;margin-bottom:4px">${formatAIKey(k)}</div>
          <div style="font-size:14px;color:#333">${val[k]}</div>
        </div>
      `).join('')}
    </div>`;
  }

  // 纯文本
  return `<div style="padding:16px;font-size:14px;color:#333;line-height:1.8">${val}</div>`;
}

// 渲染单条数据
function renderAIItem(item, idx, sectionKey, app, appIdx) {
  if (typeof item === 'string') {
    return `<div style="padding:12px;background:white;border-radius:10px;margin-bottom:8px;font-size:14px;color:#333;box-shadow:0 1px 4px rgba(0,0,0,0.06)">${item}</div>`;
  }

  if (typeof item !== 'object') return '';

  const keys = Object.keys(item);

  // 找标题字段
  const titleKey = keys.find(k => ['title','name','song','subject','event','task','item','content','text'].includes(k)) || keys[0];
  const subKey = keys.find(k => ['desc','description','date','time','artist','author','subtitle','preview','note'].includes(k));
  const statusKey = keys.find(k => ['status','type','tag','category','level'].includes(k));
  const numKey = keys.find(k => ['count','score','likes','num','amount','steps','calories','duration'].includes(k));

  return `
    <div onclick="openAIItemDetail(${appIdx},'${sectionKey}',${idx})"
      style="background:white;border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.07);cursor:pointer;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:10px;background:${app.color}22;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${app.icon}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:500;color:#333;margin-bottom:3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item[titleKey] || ''}</div>
        ${subKey ? `<div style="font-size:12px;color:#999;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${item[subKey]}</div>` : ''}
      </div>
      ${statusKey ? `<span style="font-size:11px;color:${app.color};background:${app.color}18;padding:3px 8px;border-radius:20px;flex-shrink:0">${item[statusKey]}</span>` : ''}
      ${numKey ? `<span style="font-size:13px;font-weight:600;color:${app.color};flex-shrink:0">${item[numKey]}</span>` : ''}
    </div>
  `;
}

// 打开条目详情
function openAIItemDetail(appIdx, sectionKey, itemIdx) {
  const app = phoneAIApps[appIdx];
  if (!app || !app.content) return;

  const section = app.content[sectionKey];
  const item = Array.isArray(section) ? section[itemIdx] : section;
  if (!item) return;

  if (typeof item === 'string') {
    showPhoneModal(`
      <div style="padding:4px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
          <span style="font-size:15px;font-weight:600;color:#333">${formatAIKey(sectionKey)}</span>
          <button onclick="closePhoneModal()" style="background:none;border:none;font-size:20px;color:#999;cursor:pointer">×</button>
        </div>
        <div style="font-size:14px;color:#555;line-height:1.8">${item}</div>
      </div>
    `);
    return;
  }

  const keys = Object.keys(item);
  showPhoneModal(`
    <div style="padding:4px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:20px">${app.icon}</span>
          <span style="font-size:15px;font-weight:600;color:#333">${app.name}</span>
        </div>
        <button onclick="closePhoneModal()" style="background:none;border:none;font-size:20px;color:#999;cursor:pointer">×</button>
      </div>
     ${keys.map(k => {
  const v = item[k];
  let display = '';
  if (v === null || v === undefined) display = '-';
  else if (typeof v === 'object') display = Array.isArray(v) ? v.join('<br>') : Object.entries(v).map(([kk,vv]) => `${formatAIKey(kk)}: ${vv}`).join('<br>');
  else display = String(v);
  return `
    <div style="padding:10px 0;border-bottom:1px solid #f5f5f5">
      <div style="font-size:11px;color:#999;margin-bottom:4px">${formatAIKey(k)}</div>
      <div style="font-size:14px;color:#333;line-height:1.6">${display}</div>
    </div>
  `;
}).join('')}
    </div>
  `);
}

async function appendAIAppContent(idx) {
  const app = phoneAIApps[idx];
  if (!app || !app.generated) return toast('应用尚未生成');

  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);
  const chats = getAccData().chats[currentPhoneCharId] || [];
  const recent = chats.slice(-50);
  const chatText = recent.map(m =>
    `${m.role === 'user' ? '用户' : char.name}: ${m.content}`
  ).join('\n');

  const polliKey = D.settings.polliKey || '';
  const polliModel = D.settings.polliModel || 'flux';
  const keyParam = polliKey ? `&key=${encodeURIComponent(polliKey)}` : '';

  // 在页面底部插入加载提示
  const body = document.getElementById('phoneAppBody');
  if (!body) return;

  const loadingId = 'aiAppend_' + Date.now();
  const loadingEl = document.createElement('div');
  loadingEl.id = loadingId;
  loadingEl.style.cssText = 'padding:20px;text-align:center;color:#bbb;font-size:13px;border-top:1px solid #f0f0f0;margin-top:8px';
  loadingEl.innerHTML = `<div style="font-size:24px;animation:spin 1s linear infinite">⏳</div><div style="margin-top:8px">正在追加内容...</div>`;
  body.appendChild(loadingEl);
  body.scrollTop = body.scrollHeight;

  const prompt = `你是${char.name}。为手机应用「${app.name}」（${app.desc}）追加更多内容。

【角色人设】
${char.persona || '无'}

【最近聊天记录】
${chatText || '无'}

【应用类型】${app.type}
【应用主色】${app.color}

【已有内容摘要】
该应用已经有一些内容了，现在需要追加新的、不重复的内容。

【图片生成规则】
需要图片时使用：
<img src="https://gen.pollinations.ai/image/[英文描述]?model=${polliModel}&width=400&height=260&seed=[随机4位数]&nologo=true${keyParam}" style="width:100%;border-radius:8px;object-fit:cover" loading="lazy" onerror="this.style.display='none'">

【要求】
1. 只输出追加的HTML片段，风格与原应用保持一致
2. 所有样式用inline style，主色调用${app.color}
3. 内容要新颖，不要重复已有内容
4. 适合手机屏幕宽度
5. 控制在80行以内
6. 顶部加一条分割线：<div style="margin:16px;border-top:1px dashed #e0e0e0;text-align:center;position:relative"><span style="background:white;padding:0 10px;color:#bbb;font-size:11px;position:relative;top:-9px">更多内容</span></div>

直接输出HTML，第一个字符必须是<`;

  try {
    const html = await callPhoneAIRaw(prompt);
    let result = html.trim();
    const codeMatch = result.match(/```(?:html)?\s*([\s\S]*?)```/);
    if (codeMatch) result = codeMatch[1].trim();
    if (!result || result.length < 10) throw new Error('内容为空');

    result = result.replace(/<img /g, '<img onerror="this.style.display=\'none\'" ');

    // 移除加载提示，插入新内容
    const loading = document.getElementById(loadingId);
    if (loading) loading.remove();

    const appendEl = document.createElement('div');
    appendEl.innerHTML = result;

    // 执行新内容里的script
    appendEl.querySelectorAll('script').forEach(oldScript => {
      const newScript = document.createElement('script');
      newScript.textContent = `try { ${oldScript.textContent} } catch(e) { console.warn('追加脚本错误:', e.message); }`;
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    body.appendChild(appendEl);
    body.scrollTop = body.scrollHeight;

    // 同步保存到 app.content.html
    app.content.html = (app.content.html || '') + appendEl.innerHTML;
    const phoneData = getPhoneData(currentPhoneCharId);
    phoneData.aiApps = phoneAIApps;
    savePhoneData();

    toast('追加成功');
  } catch(e) {
    const loading = document.getElementById(loadingId);
    if (loading) {
      loading.innerHTML = `<div style="color:#ff6b6b;font-size:13px">追加失败：${e.message}</div>
        <button onclick="appendAIAppContent(${idx})" style="margin-top:8px;padding:6px 16px;background:${app.color};color:white;border:none;border-radius:16px;font-size:12px;cursor:pointer">重试</button>`;
    }
  }
}

// 重新生成AI应用
async function regenAIApp(idx) {
  if (!confirm('重新生成此应用内容？')) return;
  const app = phoneAIApps[idx];
  if (!app) return;
  app.generated = false;
  app.content = null;

  const win = document.getElementById('phoneAppWindow');
  if (win) {
    const body = document.getElementById('phoneAppBody');
    if (body) body.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#bbb;gap:12px">
        <div style="font-size:32px;animation:spin 1s linear infinite">⏳</div>
        <div style="font-size:14px">重新生成中...</div>
      </div>`;
  }

  await generateAIAppContent(idx);

  // 生成完重新打开
  if (app.generated) openAIApp(idx);
}

// key名美化
function formatAIKey(key) {
  const map = {
    title:'标题', name:'名称', content:'内容', text:'文本', date:'日期',
    time:'时间', status:'状态', type:'类型', desc:'描述', note:'备注',
    author:'作者', score:'评分', level:'等级', count:'数量', tag:'标签',
    song:'歌曲', artist:'歌手', event:'事件', task:'任务', amount:'金额',
    steps:'步数', calories:'卡路里', duration:'时长', preview:'预览',
    subject:'主题', category:'分类', likes:'点赞', from:'来自', to:'发给'
  };
  return map[key] || key;
}

// 丢弃AI应用
function discardAIApps() {
  const data = getPhoneData(currentPhoneCharId);
  data.aiApps = null;
  data.aiApps = [];
  phoneAIApps = [];
  savePhoneData();
  // 重新渲染第二页回到待生成状态
  renderAIAppPage();
  // 如果当前在第二页，刷新显示
  if (phoneCurrentPage === 1) {
    const container = document.getElementById('phoneAppsAI');
    if (container) {
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
      container.style.justifyContent = 'flex-start';
      container.style.paddingTop = '60px';
    }
  }
}
function renderWechatContactsTab(chats) {
  const container = document.getElementById('wechatContent');
  if (!container) return;
  const contacts = chats || [];
  // 按名字首字母分组
  const groups = {};
  contacts.forEach(c => {
    const first = (c.name || '?')[0].toUpperCase();
    if (!groups[first]) groups[first] = [];
    groups[first].push(c);
  });
  const sortedKeys = Object.keys(groups).sort();

  container.innerHTML = `
    <div style="background:#efeff4">
      <!-- 搜索栏 -->
      <div style="padding:8px 12px;background:#efeff4">
        <div style="background:white;border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:8px">
          <span style="color:#bbb;font-size:14px">🔍</span>
          <span style="color:#bbb;font-size:14px">搜索</span>
        </div>
      </div>
      <!-- 特殊入口 -->
      ${['新的朋友','群聊','标签'].map(item => `
        <div style="display:flex;align-items:center;gap:12px;padding:13px 16px;background:white;border-bottom:0.5px solid #e8e8e8">
          <div style="width:36px;height:36px;border-radius:8px;background:#07C160;display:flex;align-items:center;justify-content:center;font-size:18px">
            ${item === '新的朋友' ? '➕' : item === '群聊' ? '👥' : '🏷️'}
          </div>
          <span style="font-size:16px;color:#111">${item}</span>
        </div>
      `).join('')}
      <div style="height:8px;background:#efeff4"></div>
      <!-- 联系人列表 -->
      ${sortedKeys.map(key => `
        <div>
          <div style="padding:6px 16px;background:#efeff4;font-size:12px;color:#999;font-weight:500">${key}</div>
          ${groups[key].map(c => `
            <div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:white;border-bottom:0.5px solid #e8e8e8">
              <div style="width:40px;height:40px;border-radius:6px;background:linear-gradient(135deg,#a8d8a8,#4a9d4a);display:flex;align-items:center;justify-content:center;font-size:22px;flex-shrink:0">
                ${c.avatar || '👤'}
              </div>
              <span style="font-size:16px;color:#111">${c.name}</span>
            </div>
          `).join('')}
        </div>
      `).join('')}
    </div>
  `;
}
function renderWechatDiscoverTab(moments) {
  const container = document.getElementById('wechatContent');
  if (!container) return;
  const menus = [
    { icon:'📷', color:'#07C160', name:'朋友圈', action:'openWechatMoments' },
    { icon:'🔍', color:'#1677ff', name:'搜一搜', action:'' },
    { icon:'📰', color:'#ff6600', name:'看一看', action:'' },
    { icon:'🎮', color:'#8b5cf6', name:'小游戏', action:'' },
    { icon:'🛒', color:'#ff4444', name:'购物', action:'' },
    { icon:'🎬', color:'#333',    name:'视频号', action:'' },
  ];
  container.innerHTML = `
    <div style="background:#efeff4;min-height:100%">
      ${menus.map((m, i) => `
        <div>
          ${i === 1 || i === 3 || i === 5 ? '<div style="height:8px;background:#efeff4"></div>' : ''}
          <div onclick="${m.action ? m.action+'()' : ''}"
            style="display:flex;align-items:center;gap:14px;padding:13px 16px;background:white;border-bottom:0.5px solid #e8e8e8;cursor:${m.action ? 'pointer' : 'default'}">
            <div style="width:36px;height:36px;border-radius:8px;background:${m.color};display:flex;align-items:center;justify-content:center;font-size:19px">
              ${m.icon}
            </div>
            <span style="flex:1;font-size:16px;color:#111;font-family:-apple-system,sans-serif">${m.name}</span>
            <span style="color:#bbb;font-size:18px">›</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
  // 存一下moments供朋友圈用
  container.dataset.moments = JSON.stringify(moments || []);
}

function openWechatMoments() {
  const body = document.getElementById('phoneAppBody');
  const content = JSON.parse(body.dataset.content || '{}');
  const container = document.getElementById('wechatContent');
  const char = getAccData().chars.find(c => c.id === currentPhoneCharId);

  container.innerHTML = `
    <div style="background:#f0f0f0;min-height:100%">
      <!-- 顶部导航 -->
      <div style="display:flex;align-items:center;padding:10px 12px;background:rgba(0,0,0,0.4);position:relative">
        <button onclick="switchWechatTab('discover')"
          style="background:none;border:none;font-size:20px;color:white;cursor:pointer;padding:0 8px 0 0">‹</button>
        <span style="flex:1;text-align:center;font-size:16px;font-weight:600;color:white">朋友圈</span>
        <span style="width:36px"></span>
      </div>
      <!-- 封面+头像 -->
      <div style="position:relative;height:200px;background:linear-gradient(135deg,#667eea,#764ba2);overflow:hidden">
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:60px;opacity:0.3">🌿</div>
        <!-- 头像 -->
        <div style="position:absolute;bottom:-20px;right:16px;width:64px;height:64px;border-radius:10px;background:linear-gradient(135deg,#a8d8ea,#4a9dcc);border:3px solid white;display:flex;align-items:center;justify-content:center;font-size:32px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">
          ${char?.avatar && char.avatar.length > 2 ? `<img src="${char.avatar}" style="width:100%;height:100%;border-radius:8px;object-fit:cover">` : (char?.avatar || '🙂')}
        </div>
      </div>
      <div style="height:28px;background:#f0f0f0"></div>
      <!-- 朋友圈列表 -->
      ${(content.moments || []).map((m, i) => `
        <div style="background:white;margin-bottom:8px;padding:14px 16px">
          <div style="display:flex;gap:12px">
            <div style="width:44px;height:44px;border-radius:6px;background:linear-gradient(135deg,#a8d8a8,#4a9d4a);display:flex;align-items:center;justify-content:center;font-size:24px;flex-shrink:0">
              ${m.avatar || '👤'}
            </div>
            <div style="flex:1">
              <div style="font-size:15px;font-weight:600;color:#4a6fa5;margin-bottom:6px">${m.name || '好友'}</div>
              <div style="font-size:15px;color:#111;line-height:1.6;margin-bottom:8px">${m.content}</div>
              <!-- 图片占位 -->
           ${m.images ? `
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:3px;margin-bottom:8px;max-width:210px">
    ${(m.images||[]).slice(0,9).map((img, ii) => {
      const polliKey = D.settings.polliKey || '';
      const polliModel = D.settings.polliModel || 'flux';
      const keyParam = polliKey ? '&key=' + encodeURIComponent(polliKey) : '';
      const imgPrompt = encodeURIComponent(img.prompt || img.desc || m.content.slice(0,30) + ' photo');
      const seed = Math.floor(Math.random() * 9999);
      const imgUrl = `https://gen.pollinations.ai/image/${imgPrompt}?model=${polliModel}&width=200&height=200&seed=${seed}&nologo=true${keyParam}`;
      return `<img src="${imgUrl}" style="aspect-ratio:1/1;width:100%;border-radius:4px;object-fit:cover" onerror="this.outerHTML='<div style=\\'aspect-ratio:1/1;background:#e8e8e8;border-radius:4px\\'></div>'" loading="lazy">`;
    }).join('')}
  </div>
` : ''}
              <div style="display:flex;justify-content:space-between;align-items:center">
                <span style="font-size:12px;color:#bbb">${m.time || ''}</span>
                <div style="display:flex;gap:12px">
                  <span style="font-size:12px;color:#999">❤️ ${m.likes || 0}</span>
                  <span style="font-size:12px;color:#999">💬 ${m.comments?.length || 0}</span>
                </div>
              </div>
              ${m.comments?.length ? `
                <div style="margin-top:8px;background:#f7f7f7;border-radius:6px;padding:8px 10px">
                  ${m.comments.map(c => `
                    <div style="font-size:13px;color:#333;line-height:1.6">
                      <span style="color:#4a6fa5;font-weight:500">${c.name}</span>：${c.text}
                    </div>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

async function startBrowserBatchGen() {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const tab = body.dataset.browserCurrentTab || 'history';
  const list = tab === 'bookmarks' ? c.bookmarks
             : tab === 'tabs'      ? c.tabs
             : c.history;
  const selected = JSON.parse(body.dataset.browserSelected || '[]');
  if (!selected.length) return toast('请先选择要生成的页面');

  cancelBrowserSelect();

  const container = document.getElementById('browserContent');
  if (!container) return;

  const char = getAccData().chars.find(ch => ch.id === currentPhoneCharId);
  const pages = selected.map(idx => list[idx]).filter(Boolean);

  // 渲染等待界面
  container.innerHTML = `
    <div style="padding:16px;font-family:-apple-system,sans-serif">
      <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:6px">批量生成 ${pages.length} 个页面</div>
      <div style="font-size:12px;color:#999;margin-bottom:16px">一次调用生成全部，节省API额度</div>
      <div id="batchGenList" style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px">
        ${pages.map((page, order) => `
          <div id="batchItem_${order}"
            style="background:white;border-radius:12px;padding:12px 14px;box-shadow:0 1px 4px rgba(0,0,0,0.07);display:flex;align-items:center;gap:10px">
            <div style="width:32px;height:32px;border-radius:8px;background:#f0f4ff;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">
              ${getBrowserFavicon(page?.url || '')}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;color:#333;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500">${page?.title || '未知页面'}</div>
              <div style="font-size:11px;color:#bbb;margin-top:2px" id="batchStatus_${order}">等待中...</div>
            </div>
            <div id="batchIcon_${order}" style="font-size:18px;flex-shrink:0">⏳</div>
          </div>
        `).join('')}
      </div>
      <div id="batchProgress"
        style="text-align:center;padding:14px;background:#EEF3FF;border-radius:12px;font-size:13px;color:#4285F4">
        正在生成，请稍候...
      </div>
      <button onclick="switchBrowserTab('${tab}')"
        style="width:100%;margin-top:12px;padding:12px;background:#f5f5f5;border:none;border-radius:12px;font-size:14px;color:#555;cursor:pointer">
        返回列表
      </button>
    </div>
  `;

  // 构建一次性批量prompt
  const polliKey = D.settings.polliKey || '';
  const polliModel = D.settings.polliModel || 'flux';
  const keyParam = polliKey ? `&key=${encodeURIComponent(polliKey)}` : '';

  const prompt = `你是一个手机网页渲染器。一次性生成以下 ${pages.length} 个网页的HTML内容。

【角色】${char?.name || '用户'}
【角色人设】${char?.persona || '无'}

【需要生成的页面列表】
${pages.map((p, i) => `${i + 1}. 标题：${p.title}  URL：${p.url || '无'}`).join('\n')}

【输出格式要求】
每个页面之间用以下分隔符隔开（必须严格遵守）：
===PAGE_${'{'}N{'}'}===
其中N从1开始，对应上面的序号。

例如输出格式：
===PAGE_1===
<div>第1个页面的HTML内容</div>
===PAGE_2===
<div>第2个页面的HTML内容</div>

【每个页面HTML的要求】
1. 只输出HTML片段，不要html/head/body标签
2. 所有样式用inline style，字体用-apple-system
3. 仿照真实网页排版，有标题、正文
4. 内容贴合对应网页标题和角色人设
5. 适合手机屏幕宽度（padding:0 16px）
6. 每个页面控制在60行以内
7. 需要图片时使用：
<img src="https://gen.pollinations.ai/image/[英文描述，空格用%20]?model=${polliModel}&width=400&height=260&seed=[随机4位数]&nologo=true${keyParam}" style="width:100%;border-radius:8px;object-fit:cover" loading="lazy" onerror="this.style.display='none'">

从 ===PAGE_1=== 开始输出，不要任何前置说明。`;

  try {
    const raw = await callPhoneAIRaw(prompt);

    // 解析每个页面
    let successCount = 0;
    if (!c._browserCache) c._browserCache = {};

    pages.forEach((page, order) => {
      const pageNum = order + 1;
      const statusEl = document.getElementById('batchStatus_' + order);
      const iconEl   = document.getElementById('batchIcon_' + order);

      // 提取对应页面内容
      const startMarker = `===PAGE_${pageNum}===`;
      const endMarker   = `===PAGE_${pageNum + 1}===`;
      const startIdx = raw.indexOf(startMarker);
      if (startIdx === -1) {
        if (statusEl) statusEl.textContent = '未找到内容';
        if (iconEl)   iconEl.textContent = '❌';
        return;
      }

      const contentStart = startIdx + startMarker.length;
      const endIdx = raw.indexOf(endMarker, contentStart);
      let html = (endIdx === -1 ? raw.slice(contentStart) : raw.slice(contentStart, endIdx)).trim();

      // 剥掉可能的代码块
      const codeMatch = html.match(/```(?:html)?\s*([\s\S]*?)```/);
      if (codeMatch) html = codeMatch[1].trim();

      // 注入图片错误处理
      html = html.replace(/<img /g, '<img onerror="this.style.display=\'none\'" ');

      if (!html || html.length < 10) {
        if (statusEl) statusEl.textContent = '内容为空';
        if (iconEl)   iconEl.textContent = '❌';
        return;
      }

    // 存入缓存
    const cacheKey = `${tab}_${selected[order]}`;
    c._browserCache[cacheKey] = html;

    // 同步写入 phoneData，确保持久化路径正确
    const _pd = getPhoneData(currentPhoneCharId);
    if (_pd.apps.browser.content) {
      if (!_pd.apps.browser.content._browserCache) {
        _pd.apps.browser.content._browserCache = {};
      }
      _pd.apps.browser.content._browserCache[cacheKey] = html;
    }

    successCount++;
    if (statusEl) statusEl.textContent = '生成成功';
    if (iconEl)   iconEl.textContent = '✅';

    const itemEl = document.getElementById('batchItem_' + order);
    if (itemEl) {
      itemEl.style.cursor = 'pointer';
      // 用立即执行捕获当前值，避免闭包问题
      const _idx = selected[order];
      const _tab = tab;
      itemEl.onclick = () => openBrowserCached(_idx, _tab);
      const hint = document.createElement('div');
      hint.style.cssText = 'font-size:11px;color:#4285F4;margin-top:6px;padding-top:6px;border-top:0.5px solid #f0f0f0';
      hint.textContent = '点击查看';
      itemEl.appendChild(hint);
    }
  });

  // forEach 结束后统一保存
  body.dataset.content = JSON.stringify(c);
  savePhoneData();

    const progressEl = document.getElementById('batchProgress');
    if (progressEl) {
      progressEl.style.background = '#f0faf0';
      progressEl.style.color = '#07C160';
      progressEl.textContent = `完成：${successCount} 个成功，${pages.length - successCount} 个失败`;
    }

  } catch(e) {
    const progressEl = document.getElementById('batchProgress');
    if (progressEl) {
      progressEl.style.background = '#fff0f0';
      progressEl.style.color = '#ff4444';
      progressEl.textContent = '生成失败：' + e.message;
    }
    // 标记全部失败
    pages.forEach((_, order) => {
      const statusEl = document.getElementById('batchStatus_' + order);
      const iconEl   = document.getElementById('batchIcon_' + order);
      if (statusEl) statusEl.textContent = '失败';
      if (iconEl)   iconEl.textContent = '❌';
    });
  }
}

function openBrowserCached(idx, tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;

  const cacheKey = `${tab}_${idx}`;

  // 读缓存：phoneData > body.dataset 两路兜底
  const phoneData = getPhoneData(currentPhoneCharId);
  const pdCache = phoneData.apps.browser?.content?._browserCache || {};
  const localC  = JSON.parse(body.dataset.content || '{}');
  const localCache = localC._browserCache || {};
  const cached = pdCache[cacheKey] || localCache[cacheKey];

  const list = tab === 'bookmarks' ? localC.bookmarks
             : tab === 'tabs'      ? localC.tabs
             : localC.history;
  const page = list?.[idx];
  if (!page) return;

  const urlBar = document.getElementById('browserUrlBar');
  if (urlBar) urlBar.textContent = page.url || page.title;

  const container = document.getElementById('browserContent');
  if (!container) return;
  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f8f8f8;border-bottom:0.5px solid #e0e0e0;flex-shrink:0">
        <button onclick="switchBrowserTab('${tab}')"
          style="background:none;border:none;font-size:20px;color:#4285F4;cursor:pointer;padding:0">‹</button>
        <div style="flex:1;background:white;border-radius:8px;padding:6px 10px;font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;border:0.5px solid #e8e8e8">
          ${page.url || page.title}
        </div>
        <button onclick="regenerateBrowserPage(${idx},'${tab}')"
          style="background:none;border:none;font-size:16px;color:#bbb;cursor:pointer;padding:0 4px">⟳</button>
      </div>
      <div id="browserPageContent" style="flex:1;overflow-y:auto;background:white">
        ${cached
          ? cached
          : `<div style="padding:40px;text-align:center;color:#bbb;font-size:13px">
               暂无缓存，请重新生成<br><br>
               <button onclick="openBrowserPage(${idx},'${tab}')"
                 style="padding:10px 20px;background:#4285F4;color:white;border:none;border-radius:20px;font-size:13px;cursor:pointer">
                 立即生成
               </button>
             </div>`
        }
      </div>
    </div>
  `;
}

function regenerateBrowserPage(idx, tab) {
  const body = document.getElementById('phoneAppBody');
  if (!body) return;
  const c = JSON.parse(body.dataset.content || '{}');
  const list = tab === 'bookmarks' ? c.bookmarks
             : tab === 'tabs'      ? c.tabs
             : c.history;
  const page = list?.[idx];
  if (!page) return;

  // 清掉缓存，重新生成
  if (c._browserCache) delete c._browserCache[`${tab}_${idx}`];
  body.dataset.content = JSON.stringify(c);
  openBrowserPage(idx, tab);
}

// ========== 初始化入口 ==========
// 在角色聊天页面添加"查手机"按钮，调用 openPhone(charId) 即可