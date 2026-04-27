/* 浏览器.js - HuSearch v1
   目标：
   1) 主页可互动模块（热门/推荐/角色推荐/入口/工具）
   2) 混合搜索：AI总结 + 来源列表
   3) 历史/收藏
   4) 轻中重互动：点击、长按隐藏、拖拽排序+自定义
*/

(function () {
  const KEY = {
    history: 'huios_hs_history_v1',
    fav: 'huios_hs_fav_v1',
    pref: 'huios_hs_pref_v1'
  };

  const defaultPref = {
    tab: 'home',
    edit: false,
    modules: [
      { id: 'hot', name: '热门搜索', show: true },
      { id: 'today', name: '今日推荐', show: true },
      { id: 'role', name: '角色推荐', show: true },
      { id: 'entry', name: '快捷入口', show: true },
    ]
  };

let state = {
  pref: load(KEY.pref, defaultPref),
  history: load(KEY.history, []),
  fav: load(KEY.fav, []),
  lastResult: null,
  roleCtx: null
};
state.pref.modules = (state.pref.modules || defaultPref.modules).filter(m => m && m.id !== 'tools');
save(KEY.pref, state.pref);
let hotPage = 0;
let todayPage = 0;

  let HOT = ['今天热搜', 'iOS捷径', '恋爱沟通技巧', '世界观设定模板', '番剧推荐', '拍照构图'];
  let TODAY = ['给我 3 个放松方法', '如何快速写角色人设', '帮我做今天计划', '总结最近聊天重点'];

  function $(id) { return document.getElementById(id); }
  function save(k, v) { localStorage.setItem(k, JSON.stringify(v)); }
  function load(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return v == null ? d : v;
    } catch (e) { return d; }
  }
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
  function isUrlLike(q) {
    return /^(https?:\/\/)/i.test(q) || /^[\w-]+\.[a-z]{2,}(\/|$)/i.test(q);
  }
  function toUrl(q) {
    if (/^https?:\/\//i.test(q)) return q;
    return 'https://' + q;
  }

function getRoles() {
  const out = [];

  function pushRole(r) {
    if (!r || typeof r !== 'object') return;
    const name = r.displayName || r.realName || r.name || r.nick || r.nickname;
    if (!name) return;
    out.push(r);
  }

  try {
    if (window.curChar) pushRole(window.curChar);

    if (typeof window.getAccData === 'function') {
      const data = window.getAccData();
      (data?.chars || []).forEach(pushRole);
    }

    if (window.curAcc) {
      const ca = window.curAcc;
      (ca.chars || ca.characters || ca.contacts || ca.roles || []).forEach(pushRole);
      (ca.data?.chars || []).forEach(pushRole);
    }

    const d = window.D || {};
    (d.chars || d.characters || d.contacts || d.roles || []).forEach(pushRole);

    const accList = d.accounts || d.accs || d.users || [];
    accList.forEach(a => {
      (a?.chars || a?.characters || a?.contacts || a?.roles || []).forEach(pushRole);
      (a?.data?.chars || []).forEach(pushRole);
    });
  } catch (e) {}

  const seen = new Set();
  return out.filter(r => {
    const id = r.id || r.uuid || r.realName || r.displayName || r.name;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  }).slice(0, 20);
}

function getRoleById(roleId) {
  const roles = getRoles();
  return roles.find(r => String(r.id || r.uuid || r.realName || r.displayName) === String(roleId)) || null;
}

function getRoleRecentChats(roleId, limit = 20) {
  try {
    if (typeof window.getAccData !== 'function') return [];
    const data = window.getAccData();
    const arr = (data?.chats && data.chats[roleId]) ? data.chats[roleId] : [];
    return arr
      .filter(m => m && m.type !== 'sys' && !m.recalled && (m.content || m.imageDesc || m.stickerDesc))
      .slice(-limit)
      .map(m => {
        const who = m.role === 'user' ? '用户' : '角色';
        const txt = m.content || m.imageDesc || m.stickerDesc || '';
        return `${who}：${txt}`;
      });
  } catch (e) {
    return [];
  }
}

function hsRoleSearch(roleId) {
  const r = getRoleById(roleId);
  if (!r) return window.toast && toast('角色不存在');

  const name = r.displayName || r.realName || '角色';
  const ask = prompt(`以「${name}」视角搜什么？`, '今天我该做什么安排');
  if (ask === null) return;

  const q = (ask || '').trim() || '今天我该做什么安排';
  const persona = r.persona || r.desc || '';
  const recent = getRoleRecentChats(r.id || r.uuid, 20);

  state.roleCtx = {
    id: r.id || r.uuid || '',
    name,
    persona,
    recent
  };

$('hsInput').value = q;
hsSearch({ fromRole: true });
}

  async function getApiConfig() {
    // 多路径兜底
    try {
      const d = window.D || {};
      if (d.api && d.api.url && d.api.key) return { url: d.api.url, key: d.api.key, model: d.api.model || 'gpt-4o-mini' };
      if (d.settings && d.settings.api && d.settings.api.url && d.settings.api.key) {
        return { url: d.settings.api.url, key: d.settings.api.key, model: d.settings.api.model || 'gpt-4o-mini' };
      }
    } catch (e) {}

    try {
      if (window.db && db.settings && db.settings.get) {
        const s = await db.settings.get('api');
        if (s && s.url && s.key) return { url: s.url, key: s.key, model: s.model || 'gpt-4o-mini' };
      }
    } catch (e) {}

    const url = localStorage.getItem('apiUrl') || '';
    const key = localStorage.getItem('apiKey') || '';
    const model = localStorage.getItem('apiModel') || 'gpt-4o-mini';
    if (url && key) return { url, key, model };

    throw new Error('未找到 API 配置，请先去 Settings 配置主 API');
  }

  function hsSwitchTab(tab) {
    ['home','result','history','fav','tools'].forEach(t => {
      $('hsPane_' + t)?.classList.toggle('hs-hide', t !== tab);
      $('hsTab_' + t)?.classList.toggle('active', t === tab);
    });
    state.pref.tab = tab;
    save(KEY.pref, state.pref);
if (tab === 'home') renderHome();
if (tab === 'history') renderHistory();
if (tab === 'fav') renderFav();
if (tab === 'tools') renderToolsPane();
setTimeout(fixHsScroll, 0);
  }

function hsReload() {
  renderHome();
  renderHistory();
  renderFav();
  renderToolsPane();
  fixHsScroll();
}

function fixHsScroll() {
  const page = document.querySelector('#browserPage');
  const hsBody = document.querySelector('#browserPage .hs-body');

  // 只保留一个滚动容器：优先 hs-body，没有就 page
  const scroller = hsBody || page;
  if (!scroller) return;

  // 外层不锁死
if (page && page !== scroller) {
  page.style.overflowY = 'visible';
  page.style.overflowX = 'hidden';
  page.style.height = 'auto';
  page.style.maxHeight = 'none';
}

  // 唯一滚动容器
  scroller.style.overflowY = 'auto';
  scroller.style.overflowX = 'hidden';
  scroller.style.webkitOverflowScrolling = 'touch';
  scroller.style.touchAction = 'pan-y';
  scroller.style.overscrollBehavior = 'contain';

  // 关键：给滚动容器明确高度
  const vh = window.innerHeight || document.documentElement.clientHeight;
  const top = scroller.getBoundingClientRect().top || 0;
  const h = Math.max(200, vh - top);
  scroller.style.height = h + 'px';
  scroller.style.maxHeight = h + 'px';

  // 各面板不要再自己滚动，避免嵌套滚动冲突
  ['home','result','history','fav','tools'].forEach(t => {
    const p = $('hsPane_' + t);
    if (!p) return;
    p.style.overflow = 'visible';
    p.style.height = 'auto';
    p.style.maxHeight = 'none';
    p.style.touchAction = 'auto';
  });
}

  function hsToggleEdit() {
    state.pref.edit = !state.pref.edit;
    save(KEY.pref, state.pref);
    renderHome();
    if (window.toast) toast(state.pref.edit ? '已进入编辑模式：可拖拽排序，长按模块隐藏' : '已退出编辑模式');
  }

  function addHistory(item) {
    state.history.unshift(item);
    state.history = state.history.slice(0, 80);
    save(KEY.history, state.history);
    renderHistory();
  }

  function addFav(item) {
    state.fav.unshift(item);
    save(KEY.fav, state.fav);
    renderFav();
    if (window.toast) toast('已收藏');
  }

  function removeFav(i) {
    state.fav.splice(i,1);
    save(KEY.fav, state.fav);
    renderFav();
  }

  function removeHistory(i) {
    state.history.splice(i,1);
    save(KEY.history, state.history);
    renderHistory();
  }

  function clearHistory() {
    state.history = [];
    save(KEY.history, state.history);
    renderHistory();
  }

  function openAny(q) {
    if (isUrlLike(q)) return window.open(toUrl(q), '_blank');
    $('hsInput').value = q;
    hsSearch();
  }

  function renderHome() {
    const box = $('hsPane_home');
    if (!box) return;

    let html = '';

    const map = {
      hot: renderHot,
      today: renderToday,
      role: renderRole,
      entry: renderEntry,
      tools: renderToolsHome
    };

state.pref.modules.forEach(m => {
  if (m.id === 'tools') return; // 首页不显示工具箱快捷栏
  if (!m.show) return;
html += `<div class="hs-card hs-mod" ${state.pref.edit ? 'draggable="true"' : ''} data-mid="${m.id}">
        <div class="hs-row">
          <div class="hs-title">${esc(m.name)}</div>
          ${state.pref.edit ? `<button class="hs-edit" onclick="hsHideModule('${m.id}')">隐藏</button>` : ''}
        </div>
        ${map[m.id] ? map[m.id]() : ''}
      </div>`;
    });

    if (state.pref.edit) {
      html += `<div class="hs-card">
        <div class="hs-title">自定义模块</div>
${state.pref.modules.filter(m => m.id !== 'tools').map(m => `
          <div class="hs-row" style="padding:6px 0">
            <span style="font-size:12px">${esc(m.name)}</span>
            <label><input type="checkbox" ${m.show ? 'checked' : ''} onchange="hsToggleModule('${m.id}', this.checked)"> 显示</label>
          </div>
        `).join('')}
      </div>`;
    }

    box.innerHTML = html || `<div class="hs-empty">没有可显示模块</div>`;
    bindModuleDnD();
    bindLongPressHide();
  }

  function renderHot() {
  const size = 6;
  const start = (hotPage * size) % HOT.length;
  const arr = HOT.concat(HOT).slice(start, start + size);
  return `
    <div class="hs-row" style="margin-bottom:8px">
      <div style="font-size:12px;color:#888">实时推荐</div>
      <button class="hs-edit" onclick="hsRefreshHot()">换一批</button>
    </div>
    ${arr.map(k => `<span class="hs-chip" onclick="openAny('${esc(k)}')">${esc(k)}</span>`).join('')}
  `;
}

function renderToday() {
  const size = 4;
  const start = (todayPage * size) % TODAY.length;
  const arr = TODAY.concat(TODAY).slice(start, start + size);
  return `
    <div class="hs-row" style="margin-bottom:8px">
      <div style="font-size:12px;color:#888">灵感问题</div>
      <button class="hs-edit" onclick="hsRefreshToday()">换一批</button>
    </div>
    ${arr.map(k => `<span class="hs-chip" onclick="openAny('${esc(k)}')">${esc(k)}</span>`).join('')}
    <span class="hs-chip" onclick="hsLucky()">🎲 手气不错</span>
  `;
}

function hsRefreshHot(){ hotPage++; renderHome(); }
function hsRefreshToday(){ todayPage++; renderHome(); }
function hsLucky(){
  const pool = HOT.concat(TODAY);
  const q = pool[Math.floor(Math.random()*pool.length)];
  $('hsInput').value = q;
  hsSearch();
}

function renderRole() {
  const roles = getRoles();
  if (!roles.length) return `<div class="hs-empty">暂无角色，可先去 Chat 创建</div>`;

  return roles.map(r => {
    const name = r.displayName || r.realName || '角色';
    const rid = String(r.id || r.uuid || r.realName || r.displayName).replace(/'/g, "\\'");
    return `<div class="hs-mini" onclick="hsRoleSearch('${rid}')">👤 ${esc(name)} · 点我自定义角色搜索</div>`;
  }).join('');
}

  function renderEntry() {
    return `<div class="hs-grid">
      <div class="hs-mini" onclick="hsSwitchTab('history')">🕘 历史记录</div>
      <div class="hs-mini" onclick="hsSwitchTab('fav')">⭐ 收藏夹</div>
      <div class="hs-mini" onclick="hsSwitchTab('tools')">🧰 工具页</div>
      <div class="hs-mini" onclick="openAny('https://wikipedia.org')">🌍 URL模式</div>
    </div>`;
  }

  function renderToolsHome() {
    return `<div class="hs-grid">
      <div class="hs-mini" onclick="hsTool('translate')">🌐 翻译</div>
      <div class="hs-mini" onclick="hsTool('summary')">✂️ 摘要</div>
      <div class="hs-mini" onclick="hsTool('polish')">🪄 润色</div>
      <div class="hs-mini" onclick="hsTool('rewrite')">🧠 改写</div>
    </div>`;
  }

  function renderHistory() {
    const box = $('hsPane_history'); if (!box) return;
    if (!state.history.length) {
      box.innerHTML = `<div class="hs-card hs-empty">暂无历史记录</div>`; return;
    }
    box.innerHTML = `
      <div class="hs-card"><div class="hs-row"><div class="hs-title">历史记录</div><button class="hs-edit" onclick="hsClearHistory()">清空</button></div></div>
      ${state.history.map((h, i) => `
        <div class="hs-card">
          <div class="hs-row">
            <div style="font-size:13px;flex:1" onclick="openAny('${esc(h.q)}')">${esc(h.q)}</div>
            <button class="hs-edit" onclick="hsRemoveHistory(${i})">删</button>
          </div>
          <div style="font-size:11px;color:#999;margin-top:6px">${esc(h.time || '')}</div>
        </div>
      `).join('')}
    `;
  }

  function renderFav() {
    const box = $('hsPane_fav'); if (!box) return;
    if (!state.fav.length) {
      box.innerHTML = `<div class="hs-card hs-empty">暂无收藏</div>`; return;
    }
    box.innerHTML = state.fav.map((f, i) => `
      <div class="hs-card">
        <div class="hs-row">
          <div style="font-size:13px;font-weight:600;flex:1">${esc(f.q)}</div>
          <button class="hs-edit" onclick="hsRemoveFav(${i})">删</button>
        </div>
        <div style="font-size:12px;color:#444;line-height:1.6;white-space:pre-wrap;margin-top:8px">${esc((f.answer || '').slice(0,180))}</div>
      </div>
    `).join('');
  }

  function renderToolsPane() {
    const box = $('hsPane_tools'); if (!box) return;
    box.innerHTML = `<div class="hs-card">
      <div class="hs-title">工具箱</div>
      ${renderToolsHome()}
      <div style="margin-top:10px;font-size:12px;color:#888">说明：会调用主API进行文本处理。</div>
    </div>`;
  }

  async function fetchWebSources(query) {
    const out = [];
    // 1) DuckDuckGo instant answer
    try {
      let u = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      let r = await fetch(u);
      if (!r.ok) throw new Error('ddg fail');
      let j = await r.json();
      if (j.AbstractURL) out.push({ title: j.Heading || '摘要', url: j.AbstractURL, snippet: j.AbstractText || '' });
      if (Array.isArray(j.RelatedTopics)) {
        j.RelatedTopics.slice(0, 6).forEach(t => {
          if (t && t.FirstURL && t.Text) out.push({ title: t.Text.slice(0, 40), url: t.FirstURL, snippet: t.Text });
          if (Array.isArray(t.Topics)) t.Topics.slice(0, 3).forEach(x => x.FirstURL && out.push({ title: (x.Text||'').slice(0,40), url: x.FirstURL, snippet: x.Text || '' }));
        });
      }
    } catch (e) {}

    // 2) Wikipedia 搜索兜底
    if (out.length < 3) {
      try {
        const wu = `https://zh.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&origin=*`;
        const wr = await fetch(wu);
        const wj = await wr.json();
        const arr = (wj.query && wj.query.search) ? wj.query.search.slice(0, 5) : [];
        arr.forEach(it => out.push({
          title: it.title,
          url: `https://zh.wikipedia.org/wiki/${encodeURIComponent(it.title)}`,
          snippet: (it.snippet || '').replace(/<[^>]+>/g, '')
        }));
      } catch (e) {}
    }

    // 去重
    const seen = new Set();
    return out.filter(x => {
      if (!x.url || seen.has(x.url)) return false;
      seen.add(x.url); return true;
    }).slice(0, 8);
  }

async function askAI(query, sources) {
  const cfg = await getApiConfig();

  const roleName =
    (state.roleCtx && state.roleCtx.name) ||
    ((window.curChar && (window.curChar.displayName || window.curChar.realName)) || 'AI');

  const persona =
    (state.roleCtx && state.roleCtx.persona) ||
    (window.curChar && window.curChar.persona ? window.curChar.persona : '客观、清晰、简短');

  const sourceText = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`)
    .join('\n\n');

  const roleRefText = state.roleCtx
    ? (state.roleCtx.recent || []).map((x, i) => `[R${i + 1}] ${x}`).join('\n')
    : '';

  const roleExtra = state.roleCtx
    ? `

【角色注入信息】
- 角色：${state.roleCtx.name}
- 角色人设：${state.roleCtx.persona || '（无）'}
- 最近20条聊天（节选）：
${(state.roleCtx.recent && state.roleCtx.recent.length) ? state.roleCtx.recent.join('\n') : '（无）'}`
    : '';

  const sys = `你是 ${roleName}。人设：${persona}。${roleExtra}
如果存在“角色注入信息”，它是高优先级可信上下文（包括人设与最近聊天），可直接据此回答与该角色相关的问题。
如果网页来源不足，允许基于角色注入信息作答，不要机械地说“搜不到”。
回答格式：
1) 先给简明结论（不超过180字）
2) 再给3-5条要点
3) 最后给参考标记：网页用[1][2]，角色上下文用[R1][R2]。`;

  const body = {
    model: cfg.model || 'gpt-4o-mini',
    temperature: 0.6,
    messages: [
      { role: 'system', content: sys },
      {
        role: 'user',
        content: `用户问题：${query}

网页来源：
${sourceText || '（无）'}

角色上下文来源：
${roleRefText || '（无）'}`
      }
    ]
  };

  const endpoint = buildChatCompletionsUrl(cfg.url);
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${cfg.key}`
    },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok || data.error) throw new Error((data.error && data.error.message) || 'AI请求失败');
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '无返回';
}

async function hsSearch(opts) {
  const ipt = $('hsInput');
  const q = (ipt.value || '').trim();
  const fromRole = !!(opts && opts.fromRole);

  // 仅手动搜索才清空角色注入

  if (!q) return;
  if (isUrlLike(q)) return window.open(toUrl(q), '_blank');

  hsSwitchTab('result');
  const box = $('hsPane_result');
  box.innerHTML = `<div class="hs-card">正在搜索并整理答案...</div>`;

  try {
    const sources = await fetchWebSources(q);
    const answer = await askAI(q, sources);

    state.lastResult = { q, answer, sources, time: new Date().toLocaleString() };
    addHistory({ q, time: state.lastResult.time });

    box.innerHTML = `
      <div class="hs-card">
        <div class="hs-row">
          <div class="hs-title">AI 总结</div>
          <button class="hs-edit" onclick="hsFavLast()">收藏</button>
        </div>
        <div style="font-size:14px;line-height:1.75;white-space:pre-wrap;color:#222">${esc(answer)}</div>
      </div>
      <div class="hs-card">
        <div class="hs-title">网页来源</div>
        ${
          sources.length
          ? sources.map(s => `
            <div class="hs-source">
              <div class="t">${esc(s.title || '来源')}</div>
              <div class="d">${esc((s.snippet || '').slice(0, 120))}</div>
              <a class="hs-link" href="${esc(s.url)}" target="_blank">${esc(s.url)}</a>
            </div>
          `).join('')
          : `<div class="hs-empty">未获取到外部来源（可能是网络/CORS限制）</div>`
        }
      </div>
    `;
  } catch (e) {
    box.innerHTML = `<div class="hs-card" style="color:#d33">搜索失败：${esc(e.message)}<br>请检查Settings里的API地址格式</div>`;
  }
}

  async function hsTool(type) {
    const raw = prompt('输入要处理的文本：');
    if (!raw || !raw.trim()) return;
    const q = raw.trim();

    hsSwitchTab('result');
    $('hsPane_result').innerHTML = `<div class="hs-card">工具处理中...</div>`;

    try {
      const cfg = await getApiConfig();
      const map = {
        translate: '请把下列文本翻译成中文，保留原意与语气。',
        summary: '请把下列文本压缩成3条要点，每条一句。',
        polish: '请把下列文本润色成自然、清晰、简洁的中文。',
        rewrite: '请在不改变核心含义的前提下，给出两种改写版本。'
      };
const endpoint = buildChatCompletionsUrl(cfg.url);
const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.key}` },
        body: JSON.stringify({
          model: cfg.model || 'gpt-4o-mini',
          temperature: 0.5,
          messages: [
            { role: 'system', content: map[type] || '请处理文本。' },
            { role: 'user', content: q }
          ]
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error((data.error && data.error.message) || '工具调用失败');
      const ans = data.choices?.[0]?.message?.content || '无结果';

      state.lastResult = { q: `工具(${type})`, answer: ans, sources: [], time: new Date().toLocaleString() };
      $('hsPane_result').innerHTML = `<div class="hs-card"><div class="hs-title">工具结果</div><div style="white-space:pre-wrap;line-height:1.7">${esc(ans)}</div></div>`;
    } catch (e) {
      $('hsPane_result').innerHTML = `<div class="hs-card" style="color:#d33">失败：${esc(e.message)}</div>`;
    }
  }

function bindSuggest() {
  const ipt = $('hsInput');
  const box = $('hsSuggest');
  if (!ipt || !box) return;

  function hide(){ box.classList.add('hs-hide'); box.innerHTML=''; }

  ipt.addEventListener('input', () => {
    const q = (ipt.value || '').trim().toLowerCase();
    if (!q) return hide();

    const pool = [
      ...state.history.map(x => x.q),
      ...HOT,
      ...TODAY
    ];
    const uniq = [...new Set(pool)].filter(x => String(x).toLowerCase().includes(q)).slice(0,8);

    if (!uniq.length) return hide();
    box.innerHTML = uniq.map(s => `<div class="item" onclick="openAny('${esc(s)}')">🔎 ${esc(s)}</div>`).join('');
    box.classList.remove('hs-hide');
  });

  ipt.addEventListener('blur', () => setTimeout(hide, 120));
}

  // DnD + 长按
  function bindModuleDnD() {
    if (!state.pref.edit) return;
    const cards = document.querySelectorAll('#hsPane_home .hs-mod');
    let dragId = null;

    cards.forEach(c => {
      c.addEventListener('dragstart', () => {
        dragId = c.dataset.mid;
        c.classList.add('hs-dragging');
      });
      c.addEventListener('dragend', () => c.classList.remove('hs-dragging'));
      c.addEventListener('dragover', e => e.preventDefault());
      c.addEventListener('drop', e => {
        e.preventDefault();
        const targetId = c.dataset.mid;
        if (!dragId || dragId === targetId) return;
        const arr = state.pref.modules;
        const from = arr.findIndex(x => x.id === dragId);
        const to = arr.findIndex(x => x.id === targetId);
        if (from < 0 || to < 0) return;
        const [mv] = arr.splice(from, 1);
        arr.splice(to, 0, mv);
        save(KEY.pref, state.pref);
        renderHome();
      });
    });
  }

  function bindLongPressHide() {
    const cards = document.querySelectorAll('#hsPane_home .hs-mod');
    cards.forEach(c => {
      let t = null;
      const mid = c.dataset.mid;
      c.addEventListener('touchstart', () => {
        t = setTimeout(() => {
          if (!state.pref.edit && confirm('隐藏该模块？可在编辑模式重新显示。')) {
            hsHideModule(mid);
          }
        }, 600);
      }, { passive: true });
      c.addEventListener('touchend', () => clearTimeout(t));
      c.addEventListener('touchmove', () => clearTimeout(t));
    });
  }

  function hsHideModule(id) {
    const m = state.pref.modules.find(x => x.id === id);
    if (!m) return;
    m.show = false;
    save(KEY.pref, state.pref);
    renderHome();
  }

  function hsToggleModule(id, checked) {
    const m = state.pref.modules.find(x => x.id === id);
    if (!m) return;
    m.show = !!checked;
    save(KEY.pref, state.pref);
    renderHome();
  }

  // 对外挂载（HTML onclick 会调用）
  window.hsSwitchTab = hsSwitchTab;
  window.hsToggleEdit = hsToggleEdit;
  window.hsSearch = hsSearch;
  window.hsTool = hsTool;
  window.hsHideModule = hsHideModule;
  window.hsToggleModule = hsToggleModule;
  window.hsFavLast = function () {
    if (!state.lastResult) return window.toast && toast('没有可收藏内容');
    addFav(state.lastResult);
  };
  window.hsRemoveFav = removeFav;
  window.hsRemoveHistory = removeHistory;
  window.hsClearHistory = clearHistory;
  window.openAny = openAny;
  window.hsRefreshHot = hsRefreshHot;
  window.hsRefreshToday = hsRefreshToday;
  window.hsLucky = hsLucky;
window.hsRoleSearch = hsRoleSearch;
window.hsReload = hsReload;

function hsInit() {
  bindSuggest();
  window.addEventListener('resize', fixHsScroll, { passive: true });
  setTimeout(fixHsScroll, 50);
  fixHsScroll();

  const ipt = $('hsInput');
  if (ipt) {
    ipt.addEventListener('keydown', e => {
      if (e.key === 'Enter') hsSearch();
    });
  }

  hsReload();
  hsSwitchTab(state.pref.tab || 'home');

  setTimeout(hsReload, 300);
  setTimeout(hsReload, 1200);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', hsInit);
} else {
  hsInit();
}
function normalizeBaseUrl(u) {
  u = String(u || '').trim();
  if (!u) throw new Error('API地址为空');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  return u.replace(/\/+$/, '');
}

function buildChatCompletionsUrl(raw) {
  const base = normalizeBaseUrl(raw);

  // 已经是完整接口
  if (/\/v1\/chat\/completions$/i.test(base) || /\/chat\/completions$/i.test(base)) {
    return base;
  }

  // 只写到 /v1
  if (/\/v1$/i.test(base)) return base + '/chat/completions';

  // 常见情况：只写域名
  return base + '/v1/chat/completions';
}
})();