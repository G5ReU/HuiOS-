// ========== 游戏系统 ==========
// 数据结构挂在 D.vnGame
// ========== 调试控制台 ==========

function dbg(msg) {
    var log = document.getElementById('dbgLog');
    if (!log) return;
    var isObj = typeof msg === 'object' && msg !== null;
    var text = isObj ? JSON.stringify(msg, null, 2) : String(msg);
    var line = document.createElement('div');
    line.style.cssText = 'padding:2px 0;border-bottom:1px solid #1a1a1a;color:' + (isObj ? '#ff0' : '#0f0');
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ' + text;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

function dbgErr(msg) {
    var log = document.getElementById('dbgLog');
    if (!log) return;
    var line = document.createElement('div');
    line.style.cssText = 'padding:2px 0;border-bottom:1px solid #1a1a1a;color:#f44';
    line.textContent = '[' + new Date().toLocaleTimeString() + '] ERR: ' + String(msg);
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
}

function dbgClear() {
    var log = document.getElementById('dbgLog');
    if (log) log.innerHTML = '';
}

function dbgExec() {
    var input = document.getElementById('dbgInput');
    if (!input) return;
    var code = input.value.trim();
    if (!code) return;
    dbg('> ' + code);
    try {
        var result = eval(code);
        if (result !== undefined) dbg('=> ' + result);
    } catch(e) {
        dbgErr(e.message);
    }
    input.value = '';
}

function dbgToggle() {
    var win = document.getElementById('dbgWin');
    if (!win) return;
    var visible = win.style.display === 'flex';
    win.style.display = visible ? 'none' : 'flex';
}

function dbgInit() {
    var D_settings = typeof D !== 'undefined' && D.settings;
    var show = D_settings && D.settings.debugConsoleOn;
    var win = document.getElementById('dbgWin');
    var btn = document.getElementById('dbgBtn');
    if (!win || !btn) return;
    win.style.display = show ? 'flex' : 'none';
    btn.style.display = show ? 'block' : 'none';
    if (show) {
        dbgInitDrag();
        dbgInitResize();
        dbgInitBtnDrag();
    }
}

// 拖动窗口
function dbgInitDrag() {
    var win = document.getElementById('dbgWin');
    var bar = document.getElementById('dbgTitleBar');
    if (!win || !bar) return;
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    bar.onmousedown = bar.ontouchstart = function(e) {
        dragging = true;
        var t = e.touches ? e.touches[0] : e;
        sx = t.clientX; sy = t.clientY;
        ox = win.offsetLeft; oy = win.offsetTop;
        e.preventDefault();
    };
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        win.style.left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, ox + dx)) + 'px';
        win.style.top  = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, oy + dy)) + 'px';
    });
    document.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        var t = e.touches[0];
        var dx = t.clientX - sx, dy = t.clientY - sy;
        win.style.left = Math.max(0, Math.min(window.innerWidth - win.offsetWidth, ox + dx)) + 'px';
        win.style.top  = Math.max(0, Math.min(window.innerHeight - win.offsetHeight, oy + dy)) + 'px';
    }, { passive: true });
    document.addEventListener('mouseup',  function() { dragging = false; });
    document.addEventListener('touchend', function() { dragging = false; });
}

// 缩放窗口
function dbgInitResize() {
    var win = document.getElementById('dbgWin');
    var handle = document.getElementById('dbgResizeHandle');
    if (!win || !handle) return;
    var resizing = false, sx = 0, sy = 0, sw = 0, sh = 0;
    handle.onmousedown = handle.ontouchstart = function(e) {
        resizing = true;
        var t = e.touches ? e.touches[0] : e;
        sx = t.clientX; sy = t.clientY;
        sw = win.offsetWidth; sh = win.offsetHeight;
        e.preventDefault();
        e.stopPropagation();
    };
    document.addEventListener('mousemove', function(e) {
        if (!resizing) return;
        var w = Math.max(260, sw + e.clientX - sx);
        var h = Math.max(180, sh + e.clientY - sy);
        win.style.width  = w + 'px';
        win.style.height = h + 'px';
    });
    document.addEventListener('touchmove', function(e) {
        if (!resizing) return;
        var t = e.touches[0];
        var w = Math.max(260, sw + t.clientX - sx);
        var h = Math.max(180, sh + t.clientY - sy);
        win.style.width  = w + 'px';
        win.style.height = h + 'px';
    }, { passive: true });
    document.addEventListener('mouseup',  function() { resizing = false; });
    document.addEventListener('touchend', function() { resizing = false; });
}

// LOG按钮拖动，点击切换窗口
function dbgInitBtnDrag() {
    var btn = document.getElementById('dbgBtn');
    if (!btn) return;
    var dragging = false, moved = false;
    var sx = 0, sy = 0, ox = 0, oy = 0;
    btn.onmousedown = btn.ontouchstart = function(e) {
        dragging = true; moved = false;
        var t = e.touches ? e.touches[0] : e;
        sx = t.clientX; sy = t.clientY;
        ox = btn.offsetLeft; oy = btn.offsetTop;
        e.preventDefault();
    };
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (moved) {
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
            btn.style.left = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, ox + dx)) + 'px';
            btn.style.top  = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, oy + dy)) + 'px';
        }
    });
    document.addEventListener('touchmove', function(e) {
        if (!dragging) return;
        var t = e.touches[0];
        var dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) > 4 || Math.abs(dy) > 4) moved = true;
        if (moved) {
            btn.style.right = 'auto';
            btn.style.bottom = 'auto';
            btn.style.left = Math.max(0, Math.min(window.innerWidth - btn.offsetWidth, ox + dx)) + 'px';
            btn.style.top  = Math.max(0, Math.min(window.innerHeight - btn.offsetHeight, oy + dy)) + 'px';
        }
    }, { passive: true });
    document.addEventListener('mouseup', function() {
        if (dragging && !moved) dbgToggle();
        dragging = false;
    });
    document.addEventListener('touchend', function() {
        if (dragging && !moved) dbgToggle();
        dragging = false;
    });
}

// ========== 内置角色：小洄 ==========
var VN_XIAHUI_ID = '__xiahui__';

function getXiahuiChar() {
    return {
        id: VN_XIAHUI_ID,
        name: '小洄',
        persona: '许洄，性格温柔。这款小手机的开发者的分身，可以解答关于这个小手机的所有问题。主入口.html` | HTML 骨架，所有页面/弹窗的 DOM，脚本加载顺序 || `样式.css` | 全部 CSS 样式 || `核心数据.js` | 全局变量、数据结构、工具函数、数据库读写 || `账号角色.js` | 账号/角色/分组的增删改查，角色卡导入 || `聊天系统.js` | 聊天室渲染、消息收发、记忆页面、联系人列表、朋友圈 || `AI回复.js` | AI 请求、prompt 构建、响应解析、后台活动、记忆总结 || `辅助功能.js` | 备忘录、图片识别、心声/心率、后台检测| `界面设置.js` | 主题/壁纸/颜色、API 配置、设置项读写、时钟、初始化入口 || `钱包系统.js` | 余额、转账、充值提款、账单、转账气泡渲染 || `地图系统.js` | 地图创建/渲染、地形生成、地点管理、AI 生成地点 || `社交功能.js` | 表情包系统',
        builtin: true,
        affection: 52,
        sprites: {
            calm_morning:  'https://files.catbox.moe/2yzk04.png',
            calm_evening:  'https://files.catbox.moe/qdyna6.png',
            calm_night:    'https://files.catbox.moe/70qy8o.png',
            happy_morning: '', happy_evening: '', happy_night: '',
            sad_morning:   '', sad_evening:   '', sad_night:   '',
            angry_morning: '', angry_evening: '', angry_night: '',
            shy_morning:   '', shy_evening:   '', shy_night:   '',
            surprised_morning:'',surprised_evening:'',surprised_night:''
        },
        places: [
            {
                id: '__xiahui_bedroom__',
                name: '卧室',
                desc: '温馨的卧室，阳光透过窗帘洒落，空气里有淡淡的书香。',
                builtin: true,
                bg: {
                    morning: 'https://files.catbox.moe/teutrc.png',
                    evening: 'https://files.catbox.moe/3j45w7.png',
                    night:   'https://files.catbox.moe/udqqkr.png'
                }
            }
        ],
        pokeCards: ['有什么事吗？', '不要戳我啦。', '你也很可爱。', '脸蛋戳红啦。', '好的好的。'],
        pokeAngryCards: ['不要！戳！！啦！！！', '你你你你你你！！！'],
        dragCards: ['呀！', '你干嘛啦。', '小心点嘛。', '哼。'],
        history: []
    };
}

// ========== 获取所有VN角色（含内置） ==========
function getAllVNChars() {
    var chars = D.vnGame.chars || [];
    var hasXiahui = chars.some(function(c) { return c.id === VN_XIAHUI_ID; });
    if (!hasXiahui) {
        chars.unshift(getXiahuiChar());
        D.vnGame.chars = chars;
    }
    return chars;
}

function getVNChar(id) {
    return getAllVNChars().find(function(c) { return c.id === id; }) || null;
}

function getCurVNChar() {
    var id = D.vnGame.curCharId || VN_XIAHUI_ID;
    return getVNChar(id) || getAllVNChars()[0];
}

// ========== 时间段判断 ==========
function getTimePeriod() {
    var h = new Date().getHours();
    if (h >= 5 && h < 17)  return 'morning';
    if (h >= 17 && h < 20) return 'evening';
    return 'night';
}

function getTimePeriodLabel() {
    var p = getTimePeriod();
    return p === 'morning' ? '早上' : p === 'evening' ? '傍晚' : '夜晚';
}

// ========== 好感度 ==========
var VN_AFF_STAGES = [
    { min: 0,  max: 20,  label: '陌生人' },
    { min: 21, max: 40,  label: '普通朋友' },
    { min: 41, max: 60,  label: '好朋友' },
    { min: 61, max: 80,  label: '亲密' },
    { min: 81, max: 99,  label: '挚友' },
    { min: 100, max: 100, label: '命中注定' }
];

function getAffStage(val) {
    for (var i = 0; i < VN_AFF_STAGES.length; i++) {
        var s = VN_AFF_STAGES[i];
        if (val >= s.min && val <= s.max) return s.label;
    }
    return '好朋友';
}

function vnChangeAff(delta) {
    var ch = getCurVNChar();
    if (!ch || ch.builtin) return; // 小洄固定不变
    ch.affection = Math.min(100, Math.max(0, (ch.affection || 0) + delta));
    save();
    vnUpdateAffBar();
}

function vnUpdateAffBar() {
    var ch = getCurVNChar();
    if (!ch) return;
    var val = ch.affection || 0;
    $('vnAffVal').textContent = val;
    $('vnAffLabel').textContent = getAffStage(val);
    $('vnAffFill').style.width = val + '%';
}

// ========== 立绘 ==========
var vnCurEmotion = 'calm';

function vnGetSprite(ch, emotion) {
    var period = getTimePeriod();
    var key = emotion + '_' + period;
    var url = ch.sprites && ch.sprites[key];
    if (!url) {
        // fallback: 同情绪其他时间段
        var fallbacks = ['morning', 'evening', 'night'];
        for (var i = 0; i < fallbacks.length; i++) {
            url = ch.sprites && ch.sprites[emotion + '_' + fallbacks[i]];
            if (url) break;
        }
    }
    if (!url) {
        // fallback calm
        var fallbackEmotions = ['calm','happy','sad','angry','shy','surprised'];
        for (var j = 0; j < fallbackEmotions.length; j++) {
            var periods = ['morning','evening','night'];
            for (var k = 0; k < periods.length; k++) {
                url = ch.sprites && ch.sprites[fallbackEmotions[j] + '_' + periods[k]];
                if (url) break;
            }
            if (url) break;
        }
    }
    return url || '';
}

function vnSetSprite(emotion) {
    vnCurEmotion = emotion || 'calm';
    var ch = getCurVNChar();
    if (!ch) return;
    var url = vnGetSprite(ch, vnCurEmotion);
    var img = $('vnSprite');
    if (url) {
        img.src = url;
        img.style.display = '';
    } else {
        img.style.display = 'none';
    }
}

// ========== 背景 ==========
var vnCurPlaceId = null;

function vnGetCurPlace() {
    var ch = getCurVNChar();
    if (!ch || !ch.places || !ch.places.length) return null;
    var place = ch.places.find(function(p) { return p.id === vnCurPlaceId; });
    return place || ch.places[0];
}

function vnSetBg(place) {
    var period = getTimePeriod();
    var bg = $('vnBg');
    if (!place || !place.bg || !place.bg[period]) {
        bg.style.backgroundImage = '';
        bg.style.background = '#1a1a2e';
        return;
    }
    bg.style.background = '';
    bg.style.backgroundImage = 'url("' + place.bg[period] + '")';
    bg.style.backgroundSize = 'cover';
    bg.style.backgroundPosition = 'center';
}

function vnSwitchPlace(placeId) {
    vnCurPlaceId = placeId;
    var place = vnGetCurPlace();
    vnSetBg(place);
    closeModal('vnPlacePickerModal');
    if (place) {
        vnShowDialog(place.name + '……', false);
    }
}

// ========== 打开/关闭游戏 ==========
function openGameHub() {
    openPage('gameHub');
}

function openVNGame() {
    closePage();
    var ch = getCurVNChar();
    vnCurPlaceId = null;
    vnPokeCount = 0;
    vnIsAngry = false;
    if (vnAngryTimer) { clearTimeout(vnAngryTimer); vnAngryTimer = null; }

    // 初始化UI
    $('vnCharName').textContent = ch.name;
    $('vnDialogName').textContent = ch.name;
    vnUpdateAffBar();

    // 设置背景和立绘
    var place = vnGetCurPlace();
    vnSetBg(place);
    vnSetSprite('calm');

    // 显示游戏页
    openPage('vnGame');

    // 初始化拖拽和戳戳
    vnInitInteraction();

    // 时间问候
    setTimeout(function() {
        vnGreet();
    }, 600);
}

function closeVNGame() {
    closePage();
}

// ========== 问候语 ==========
function vnGreet() {
    var period = getTimePeriod();
    var greetMap = {
        morning: '早上好～今天也要加油哦。',
        evening: '傍晚了，今天过得怎么样？',
        night:   '这么晚了还不睡？'
    };
    vnShowDialog(greetMap[period] || '嗯…你来了。', true);
}

// ========== 对话框显示 ==========
function vnShowDialog(text, isChar) {
    var box = $('vnDialogBox');
    var textEl = $('vnDialogText');
    box.classList.add('show');
    textEl.textContent = '';
    // 打字机效果
    var i = 0;
    var timer = setInterval(function() {
        if (i >= text.length) { clearInterval(timer); return; }
        textEl.textContent += text[i];
        i++;
    }, 22);
}

// ========== 戳戳系统 ==========
var vnPokeCount = 0;
var vnIsAngry = false;
var vnAngryTimer = null;
var vnPokeTimer = null;

function vnPoke() {
    var ch = getCurVNChar();
    if (!ch) return;

    if (vnPokeTimer) { clearTimeout(vnPokeTimer); }

    vnPokeCount++;

    if (vnPokeCount >= 5 && !vnIsAngry) {
        vnIsAngry = true;
        vnSetSprite('angry');
        var angryCards = (ch.pokeAngryCards && ch.pokeAngryCards.length)
            ? ch.pokeAngryCards
            : ['不要！戳！！啦！！！', '你你你你你你！！！'];
        vnShowPokeBubble(angryCards[Math.floor(Math.random() * angryCards.length)]);
        // 30秒后恢复
        vnAngryTimer = setTimeout(function() {
            vnIsAngry = false;
            vnPokeCount = 0;
            vnSetSprite('calm');
            vnHidePokeBubble();
        }, 30000);
        return;
    }

    if (vnIsAngry) {
        var angryCards2 = (ch.pokeAngryCards && ch.pokeAngryCards.length)
            ? ch.pokeAngryCards
            : ['不要！戳！！啦！！！', '你你你你你你！！！'];
        vnShowPokeBubble(angryCards2[Math.floor(Math.random() * angryCards2.length)]);
        return;
    }

    var cards = (ch.pokeCards && ch.pokeCards.length)
        ? ch.pokeCards
        : ['有什么事吗？', '不要戳我啦。'];
    vnShowPokeBubble(cards[Math.floor(Math.random() * cards.length)]);
    vnSetSprite('shy');

    // 2秒后恢复平静
    vnPokeTimer = setTimeout(function() {
        if (!vnIsAngry) vnSetSprite('calm');
        vnPokeCount = 0;
    }, 2000);
}

function vnShowPokeBubble(text) {
    var bubble = $('vnPokeBubble');
    var wrap = $('vnSpriteWrap');
    var rect = wrap.getBoundingClientRect();
    bubble.textContent = text;
    bubble.style.left = (rect.left + rect.width / 2 - 60) + 'px';
    bubble.style.top = (rect.top - 10) + 'px';
    bubble.classList.add('show');
    if (bubble._hideTimer) clearTimeout(bubble._hideTimer);
    bubble._hideTimer = setTimeout(vnHidePokeBubble, 2500);
}

function vnHidePokeBubble() {
    $('vnPokeBubble').classList.remove('show');
}

// ========== 拖拽系统 ==========
var vnDragActive = false;
var vnDragStartX = 0;
var vnDragStartY = 0;
var vnDragOriginLeft = 0;
var vnDragOriginTop = 0;

function vnInitInteraction() {
    var wrap = $('vnSpriteWrap');
    if (!wrap) return;

    // 移除旧监听
    var newWrap = wrap.cloneNode(true);
    wrap.parentNode.replaceChild(newWrap, wrap);
    wrap = $('vnSpriteWrap');

    // 戳戳（单击）
    wrap.addEventListener('click', function(e) {
        if (vnDragMoved) return;
        vnPoke();
    });

    // 拖拽
    wrap.addEventListener('touchstart', vnDragStart, { passive: true });
    wrap.addEventListener('touchmove',  vnDragMove,  { passive: false });
    wrap.addEventListener('touchend',   vnDragEnd,   { passive: true });
    wrap.addEventListener('mousedown',  vnDragStart);
    document.addEventListener('mousemove', vnDragMove);
    document.addEventListener('mouseup',   vnDragEnd);
}

var vnDragMoved = false;

function vnDragStart(e) {
    var touch = e.touches ? e.touches[0] : e;
    vnDragStartX = touch.clientX;
    vnDragStartY = touch.clientY;
    vnDragMoved = false;
    vnDragActive = true;

    var wrap = $('vnSpriteWrap');
    var style = window.getComputedStyle(wrap);
    vnDragOriginLeft = parseInt(style.left) || 0;
    vnDragOriginTop  = parseInt(style.top)  || 0;
    wrap.style.position = 'absolute';
    wrap.classList.add('dragging');
}

function vnDragMove(e) {
    if (!vnDragActive) return;
    if (e.cancelable) e.preventDefault();
    var touch = e.touches ? e.touches[0] : e;
    var dx = touch.clientX - vnDragStartX;
    var dy = touch.clientY - vnDragStartY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) vnDragMoved = true;

    if (vnDragMoved) {
        var wrap = $('vnSpriteWrap');
        var container = $('vnContainer');
        var cRect = container.getBoundingClientRect();
        var wRect = wrap.getBoundingClientRect();
        var newLeft = vnDragOriginLeft + dx;
        var newTop  = vnDragOriginTop  + dy;
        // 边界限制
        newLeft = Math.max(-wRect.width * 0.3, Math.min(cRect.width  - wRect.width * 0.7, newLeft));
        newTop  = Math.max(-wRect.height * 0.2, Math.min(cRect.height - wRect.height * 0.5, newTop));
        wrap.style.left      = newLeft + 'px';
        wrap.style.top       = newTop  + 'px';
        wrap.style.transform = 'none';
    }
}

function vnDragEnd(e) {
    if (!vnDragActive) return;
    vnDragActive = false;
    var wrap = $('vnSpriteWrap');
    wrap.classList.remove('dragging');

    if (vnDragMoved) {
        // 触发拖拽字卡
        var ch = getCurVNChar();
        var cards = (ch && ch.dragCards && ch.dragCards.length)
            ? ch.dragCards
            : ['呀！', '你干嘛啦。', '小心点嘛。', '哼。'];
        vnShowPokeBubble(cards[Math.floor(Math.random() * cards.length)]);
        vnSetSprite('surprised');
        setTimeout(function() {
            if (!vnIsAngry) vnSetSprite('calm');
        }, 2000);

        // 缓慢弹回中心
        setTimeout(function() {
            wrap.style.transition = 'left 0.5s, top 0.5s, transform 0.5s';
            wrap.style.left      = '50%';
            wrap.style.top       = '';
            wrap.style.transform = 'translateX(-50%)';
            wrap.style.bottom    = '160px';
            setTimeout(function() {
                wrap.style.transition = '';
                wrap.style.position   = 'absolute';
            }, 500);
        }, 1200);
    }
}

// ========== 对话/AI交互 ==========
function vnAutoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 90) + 'px';
}

function vnOnKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        vnSendMsg();
    }
}

function vnSendMsg() {
    var input = $('vnInput');
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    input.style.height = 'auto';

    var ch = getCurVNChar();
    if (!ch) return;

    // 记录历史
    if (!ch.history) ch.history = [];
    ch.history.push({ role: 'user', content: text });
    if (ch.history.length > 40) ch.history = ch.history.slice(-40);

    // 显示思考状态
    vnShowDialog('…', false);
    vnSetSprite('calm');

    vnAIReply(ch, text);
}

function vnAIReply(ch, userText) {
    var api = D.api;
    if (!api || !api.key) {
        vnShowDialog('（需要先配置API才能和我聊天哦）', true);
        return;
    }

    var period = getTimePeriod();
    var place  = vnGetCurPlace();
    var affVal = ch.affection || 0;
    var affStage = getAffStage(affVal);

    var sysPrompt = '你正在扮演：' + ch.name + '。\n' +
        '人设：' + (ch.persona || ch.name + '，性格温柔。') + '\n' +
        '当前时间段：' + getTimePeriodLabel() + '\n' +
        '当前地点：' + (place ? place.name : '未知') + '\n' +
        (place && place.desc ? '地点描述：' + place.desc + '\n' : '') +
        '与用户的关系阶段：' + affStage + '（好感度' + affVal + '/100）\n' +
        (ch.builtin ? '' : '好感度说明：根据对话自然地回应，在回复末尾可附加 <AFF>+2</AFF> 或 <AFF>-1</AFF> 表示好感度变化（-5到+5之间），不是每次都需要加。\n') +
        '情绪说明：在回复末尾附加 <EMO>情绪</EMO>，情绪只能是以下之一：calm/happy/sad/angry/shy/surprised。\n' +
        '偶尔（约20%概率）在回复末尾附加 <CHOICES>选项A|选项B|选项C</CHOICES> 给用户做选择，选项要自然贴合对话。\n' +
        '用自然的中文回复，语气符合人设，回复不超过100字。直接说话，不要加角色名前缀。';

    var messages = [{ role: 'system', content: sysPrompt }];

    // 加入历史（最近20条）
    var hist = (ch.history || []).slice(-20);
    // 最后一条是刚才push的user，去掉重复
    for (var i = 0; i < hist.length - 1; i++) {
        messages.push({ role: hist[i].role === 'user' ? 'user' : 'assistant', content: hist[i].content });
    }
    messages.push({ role: 'user', content: userText });

    var url = (api.url || '').replace(/\/+$/, '') + '/v1/chat/completions';

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + api.key
        },
        body: JSON.stringify({
            model: api.model || 'gpt-4o-mini',
            messages: messages,
            temperature: api.temperature || 1,
            max_tokens: 30000,
            stream: false
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var raw = d.choices[0].message.content;
        vnProcessReply(ch, raw);
    })
    .catch(function(e) {
        console.log('VN AI error', e);
        vnShowDialog('（网络出了点问题，稍后再试吧）', true);
    });
}

function vnProcessReply(ch, raw) {
    // 解析情绪
    var emo = 'calm';
    var emoMatch = raw.match(/<EMO>([\s\S]*?)<\/EMO>/);
    if (emoMatch) {
        emo = emoMatch[1].trim().toLowerCase();
        raw = raw.replace(emoMatch[0], '');
    }

    // 解析好感度变化
    var affMatch = raw.match(/<AFF>([+-]?\d+)<\/AFF>/);
    if (affMatch) {
        var delta = parseInt(affMatch[1]);
        if (!isNaN(delta)) vnChangeAff(delta);
        raw = raw.replace(affMatch[0], '');
    }

    // 解析选项
    var choicesMatch = raw.match(/<CHOICES>([\s\S]*?)<\/CHOICES>/);
    var choices = null;
    if (choicesMatch) {
        choices = choicesMatch[1].split('|').map(function(s) { return s.trim(); }).filter(Boolean);
        raw = raw.replace(choicesMatch[0], '');
    }

    var text = raw.trim();

    // 存入历史
    if (!ch.history) ch.history = [];
    ch.history.push({ role: 'ai', content: text });
    if (ch.history.length > 40) ch.history = ch.history.slice(-40);
    save();

    // 显示立绘情绪
    vnSetSprite(emo);

    // 显示对话
    vnShowDialog(text, true);

    // 显示选项
    if (choices && choices.length) {
        setTimeout(function() { vnShowChoices(choices); }, text.length * 22 + 400); 
    } else {
        vnHideChoices();
    }
}

function vnShowChoices(choices) {
    var box = $('vnChoices');
    box.innerHTML = '';
    choices.forEach(function(c) {
        var btn = document.createElement('button');
        btn.className = 'vn-choice-btn';
        btn.textContent = c;
        btn.onclick = function() {
            vnHideChoices();
            var input = $('vnInput');
            input.value = c;
            vnSendMsg();
        };
        box.appendChild(btn);
    });
    box.style.display = 'flex';
}

function vnHideChoices() {
    var box = $('vnChoices');
    box.style.display = 'none';
    box.innerHTML = '';
}

// ========== 地点切换 ==========
function vnOpenPlacePicker() {
    var ch = getCurVNChar();
    if (!ch || !ch.places || !ch.places.length) {
        toast('没有可用地点');
        return;
    }
    var list = $('vnPlacePickerList');
    list.innerHTML = '';
    ch.places.forEach(function(p) {
        var item = document.createElement('div');
        item.className = 'vn-place-item';
        item.innerHTML = '<span class="vn-place-item-name">📍 ' + esc(p.name) + '</span>';
        if (vnGetCurPlace() && vnGetCurPlace().id === p.id) {
            item.style.background = 'var(--primary-light)';
        }
        item.onclick = function() { vnSwitchPlace(p.id); };
        list.appendChild(item);
    });
    openModal('vnPlacePickerModal');
}

// ========== 游戏设置弹窗 ==========
function openVNSettings() {
    vnRenderCharList();
    openModal('vnSettingsModal');
}

function vnRenderCharList() {
    var list = $('vnCharList');
    list.innerHTML = '';
    var chars = getAllVNChars();
    var curId = getCurVNChar().id;
    chars.forEach(function(ch) {
        var item = document.createElement('div');
        item.className = 'vn-char-item' + (ch.id === curId ? ' active-char' : '');

        var thumb = '<div class="vn-char-thumb">';
        var previewUrl = vnGetSprite(ch, 'calm');
        if (previewUrl) {
            thumb += '<img src="' + previewUrl + '">';
        } else {
            thumb += ch.name.charAt(0);
        }
        thumb += '</div>';

        item.innerHTML = thumb +
            '<div class="vn-char-item-info">' +
            '<div class="vn-char-item-name">' + esc(ch.name) + (ch.builtin ? ' ⭐' : '') + '</div>' +
            '<div class="vn-char-item-sub">好感度 ' + (ch.affection || 0) + ' · ' + getAffStage(ch.affection || 0) + '</div>' +
            '</div>' +
            '<button style="padding:6px 12px;border:none;border-radius:8px;background:var(--primary-light);color:var(--primary-dark);font-size:12px;cursor:pointer" onclick="event.stopPropagation();vnEditChar(\'' + ch.id + '\')">' +
            (ch.builtin ? '查看' : '编辑') + '</button>';

        item.onclick = function() {
            D.vnGame.curCharId = ch.id;
            save();
            vnRenderCharList();
            // 切换角色时刷新游戏画面
            $('vnCharName').textContent = ch.name;
            $('vnDialogName').textContent = ch.name;
            vnCurPlaceId = null;
            vnSetSprite('calm');
            vnSetBg(vnGetCurPlace());
            vnUpdateAffBar();
            closeModal('vnSettingsModal');
            setTimeout(vnGreet, 300);
        };
        list.appendChild(item);
    });
}

// ========== 新建/编辑角色 ==========
var vnEditingCharId = null;
var vnEditingPlaceIdx = null;
var vnImgTarget = null; // { type:'sprite'|'bg', key, charId, placeIdx, period }

var VN_EMOTIONS = [
    { key: 'calm',      label: '平静' },
    { key: 'happy',     label: '开心' },
    { key: 'sad',       label: '沮丧' },
    { key: 'angry',     label: '生气' },
    { key: 'shy',       label: '害羞' },
    { key: 'surprised', label: '惊讶' }
];
var VN_PERIODS = [
    { key: 'morning', label: '早' },
    { key: 'evening', label: '傍晚' },
    { key: 'night',   label: '夜' }
];

function openVNCreateChar() {
    vnEditingCharId = null;
    $('vnCharModalTitle').textContent = '✨ 新建角色';
    $('vnCharNameInput').value = '';
    $('vnCharPersona').value = '';
    $('vnPokeCards').value = '';
    $('vnPokeAngryCards').value = '';
    $('vnDragCards').value = '';
    $('vnDelCharBtn').style.display = 'none';
    vnRenderSpriteSlots({});
    vnRenderPlaceList([]);
    openModal('vnCharModal');
}

function vnEditChar(id) {
    var ch = getVNChar(id);
    if (!ch) return;
    vnEditingCharId = id;
    $('vnCharModalTitle').textContent = ch.builtin ? '⭐ 查看角色' : '✏️ 编辑角色';
    $('vnCharNameInput').value = ch.name;
    $('vnCharPersona').value = ch.persona || '';
    $('vnPokeCards').value = (ch.pokeCards || []).join('\n');
    $('vnPokeAngryCards').value = (ch.pokeAngryCards || []).join('\n');
    $('vnDragCards').value = (ch.dragCards || []).join('\n');
    $('vnDelCharBtn').style.display = ch.builtin ? 'none' : 'block';
    vnRenderSpriteSlots(ch.sprites || {});
    vnRenderPlaceList(ch.places || []);
    openModal('vnCharModal');
}

function vnRenderSpriteSlots(sprites) {
    var grid = $('vnSpriteList');
    grid.innerHTML = '';
    VN_EMOTIONS.forEach(function(em) {
        VN_PERIODS.forEach(function(pd) {
            var key = em.key + '_' + pd.key;
            var url = sprites[key] || '';
            var slot = document.createElement('div');
            slot.className = 'vn-sprite-slot';
            slot.innerHTML =
                '<div class="vn-sprite-thumb" onclick="vnPickSprite(\'' + key + '\')">' +
                (url ? '<img src="' + url + '" id="vnSpriteThumb_' + key + '">' : '<span id="vnSpriteThumb_' + key + '">+</span>') +
                '</div>' +
                '<div class="vn-sprite-slot-label">' + em.label + pd.label + '</div>';
            grid.appendChild(slot);
        });
    });
}

function vnRenderPlaceList(places) {
    var list = $('vnPlaceList');
    list.innerHTML = '';
    places.forEach(function(p, idx) {
        var item = document.createElement('div');
        item.className = 'vn-place-item';
        item.innerHTML = '<span class="vn-place-item-name">📍 ' + esc(p.name) + (p.builtin ? ' 🔒' : '') + '</span>' +
            '<button class="vn-place-item-btn" style="background:var(--primary-light);color:var(--primary-dark)" onclick="vnEditPlace(' + idx + ')">' +
            (p.builtin ? '查看' : '编辑') + '</button>';
        list.appendChild(item);
    });
}

function saveVNChar() {
    var name = $('vnCharNameInput').value.trim();
    if (!name) { toast('请填写角色名字'); return; }

    var chars = getAllVNChars();

    if (vnEditingCharId) {
        var ch = chars.find(function(c) { return c.id === vnEditingCharId; });
        if (!ch) return;
        if (!ch.builtin) {
            ch.name = name;
            ch.persona = $('vnCharPersona').value.trim();
        }
        ch.pokeCards = $('vnPokeCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        ch.pokeAngryCards = $('vnPokeAngryCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
        ch.dragCards = $('vnDragCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean);
    } else {
        var newChar = {
            id: genId(),
            name: name,
            persona: $('vnCharPersona').value.trim(),
            builtin: false,
            affection: 30,
            sprites: {},
            places: [],
            pokeCards: $('vnPokeCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean),
            pokeAngryCards: $('vnPokeAngryCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean),
            dragCards: $('vnDragCards').value.split('\n').map(function(s) { return s.trim(); }).filter(Boolean),
            history: []
        };
        chars.push(newChar);
    }

    D.vnGame.chars = chars;
    save();
    closeModal('vnCharModal');
    vnRenderCharList();
    toast('已保存');
}

function deleteVNChar() {
    if (!vnEditingCharId || vnEditingCharId === VN_XIAHUI_ID) return;
    if (!confirm('确定删除这个角色？')) return;
    D.vnGame.chars = (D.vnGame.chars || []).filter(function(c) { return c.id !== vnEditingCharId; });
    if (D.vnGame.curCharId === vnEditingCharId) D.vnGame.curCharId = VN_XIAHUI_ID;
    save();
    closeModal('vnCharModal');
    vnRenderCharList();
    toast('已删除');
}

// ========== 地点管理 ==========
var vnTempPlaces = [];
var vnTempBg = { morning: '', evening: '', night: '' };

function openVNAddPlace() {
    vnEditingPlaceIdx = null;
    $('vnPlaceModalTitle').textContent = '📍 添加地点';
    $('vnPlaceNameInput').value = '';
    $('vnPlaceDesc').value = '';
    $('vnDelPlaceBtn').style.display = 'none';
    vnTempBg = { morning: '', evening: '', night: '' };
    vnResetBgPreviews();
    openModal('vnPlaceModal');
}

function vnEditPlace(idx) {
    var ch = getVNChar(vnEditingCharId);
    if (!ch || !ch.places[idx]) return;
    var p = ch.places[idx];
    vnEditingPlaceIdx = idx;
    $('vnPlaceModalTitle').textContent = p.builtin ? '📍 查看地点' : '📍 编辑地点';
    $('vnPlaceNameInput').value = p.name;
    $('vnPlaceDesc').value = p.desc || '';
    $('vnDelPlaceBtn').style.display = (p.builtin) ? 'none' : 'block';
    vnTempBg = { morning: p.bg.morning || '', evening: p.bg.evening || '', night: p.bg.night || '' };
    vnLoadBgPreviews();
    openModal('vnPlaceModal');
}

function vnResetBgPreviews() {
    ['morning','evening','night'].forEach(function(pd) {
        var img = $('vnBgPreview' + pd.charAt(0).toUpperCase() + pd.slice(1));
        var icon = $('vnBgIcon'   + pd.charAt(0).toUpperCase() + pd.slice(1));
        img.style.display = 'none';
        icon.style.display = '';
    });
}

function vnLoadBgPreviews() {
    ['morning','evening','night'].forEach(function(pd) {
        var cap = pd.charAt(0).toUpperCase() + pd.slice(1);
        var img  = $('vnBgPreview' + cap);
        var icon = $('vnBgIcon'    + cap);
        var url  = vnTempBg[pd];
        if (url) {
            img.src = url;
            img.style.display = 'block';
            icon.style.display = 'none';
        } else {
            img.style.display = 'none';
            icon.style.display = '';
        }
    });
}

function saveVNPlace() {
    var name = $('vnPlaceNameInput').value.trim();
    if (!name) { toast('请填写地点名称'); return; }

    var ch = getVNChar(vnEditingCharId);
    if (!ch) return;

    var placeObj = {
        id: genId(),
        name: name,
        desc: $('vnPlaceDesc').value.trim(),
        builtin: false,
        bg: { morning: vnTempBg.morning, evening: vnTempBg.evening, night: vnTempBg.night }
    };

    if (vnEditingPlaceIdx !== null && vnEditingPlaceIdx !== undefined) {
        var old = ch.places[vnEditingPlaceIdx];
        placeObj.id = old.id;
        placeObj.builtin = old.builtin || false;
        ch.places[vnEditingPlaceIdx] = placeObj;
    } else {
        if (!ch.places) ch.places = [];
        ch.places.push(placeObj);
    }

    save();
    vnRenderPlaceList(ch.places);
    closeModal('vnPlaceModal');
    toast('已保存');
}

function deleteVNPlace() {
    if (vnEditingPlaceIdx === null) return;
    var ch = getVNChar(vnEditingCharId);
    if (!ch) return;
    var p = ch.places[vnEditingPlaceIdx];
    if (p && p.builtin) { toast('内置地点不可删除'); return; }
    if (!confirm('确定删除此地点？')) return;
    ch.places.splice(vnEditingPlaceIdx, 1);
    save();
    vnRenderPlaceList(ch.places);
    closeModal('vnPlaceModal');
    toast('已删除');
}

// ========== 图片选择（立绘/背景） ==========
var vnImgCallback = null;
var vnImgCurrentUrl = '';

function vnPickSprite(key) {
    vnImgCurrentUrl = '';
    var ch = getVNChar(vnEditingCharId);
    if (ch && ch.sprites && ch.sprites[key]) vnImgCurrentUrl = ch.sprites[key];

    $('vnImgChoiceRemove').style.display = vnImgCurrentUrl ? 'block' : 'none';
    $('vnImgChoiceAI').style.display = 'none';

    vnImgCallback = function(url) {
        // 写入角色sprites
        var c = getVNChar(vnEditingCharId);
        if (!c) return;
        if (!c.sprites) c.sprites = {};
        c.sprites[key] = url;
        save();
        // 更新缩略图
        var thumb = $('vnSpriteThumb_' + key);
        if (thumb) {
            if (url) {
                thumb.outerHTML = '<img src="' + url + '" id="vnSpriteThumb_' + key + '" style="width:100%;height:100%;object-fit:cover">';
            } else {
                thumb.outerHTML = '<span id="vnSpriteThumb_' + key + '">+</span>';
            }
        }
    };
    openChoice('vnImgChoice');
}

function vnPickBg(period) {
    vnImgCurrentUrl = vnTempBg[period] || '';
    $('vnImgChoiceRemove').style.display = vnImgCurrentUrl ? 'block' : 'none';
    $('vnImgChoiceAI').style.display = D.settings && D.settings.polliOn ? 'block' : 'none';

    vnImgCallback = function(url) {
        vnTempBg[period] = url;
        var cap = period.charAt(0).toUpperCase() + period.slice(1);
        var img  = $('vnBgPreview' + cap);
        var icon = $('vnBgIcon'    + cap);
        if (url) {
            img.src = url;
            img.style.display = 'block';
            icon.style.display = 'none';
        } else {
            img.style.display = 'none';
            icon.style.display = '';
        }
    };
    openChoice('vnImgChoice');
}

function vnImgFromAlbum() {
    closeChoice('vnImgChoice');
    $('vnImgFileInput').click();
}

function vnImgFromUrl() {
    closeChoice('vnImgChoice');
    $('vnImgUrlInput').value = vnImgCurrentUrl || '';
    openModal('vnImgUrlModal');
}

function vnImgConfirmUrl() {
    var url = $('vnImgUrlInput').value.trim();
    closeModal('vnImgUrlModal');
    if (vnImgCallback) vnImgCallback(url);
}

function vnImgFileSelected(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        if (vnImgCallback) vnImgCallback(ev.target.result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
}

function vnImgFromAI() {
    closeChoice('vnImgChoice');
    // 用pollinations生成背景图，提示词用地点名
    var placeName = $('vnPlaceNameInput').value.trim() || '房间';
    var prompt = encodeURIComponent('anime style room background, ' + placeName + ', soft lighting, detailed, no characters');
    var url = 'https://image.pollinations.ai/prompt/' + prompt + '?width=800&height=450&nologo=true';
    if (vnImgCallback) vnImgCallback(url);
}

function vnImgRemove() {
    closeChoice('vnImgChoice');
    if (vnImgCallback) vnImgCallback('');
}

// ========== AI生成字卡 ==========
function vnGenPokeCards() {
    var name = $('vnCharNameInput').value.trim() || '她';
    var persona = $('vnCharPersona').value.trim();
    var api = D.api;
    if (!api || !api.key) { toast('请先配置API'); return; }

    toast('生成中…');
    var prompt = '你是角色：' + name + '。人设：' + (persona || '性格温柔') + '。\n' +
        '请生成5条被人戳了之后的短句（普通反应），以及2条被连续戳5次后生气的短句。\n' +
        '格式：\n普通:\n短句1\n短句2\n短句3\n短句4\n短句5\n生气:\n短句1\n短句2\n' +
        '每条不超过15字，语气符合人设，不加序号。';

    fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 20000,
            temperature: 1.1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        var text = d.choices[0].message.content;
        var normalMatch = text.match(/普通[:：]\n?([\s\S]*?)(?=生气[:：]|$)/);
        var angryMatch  = text.match(/生气[:：]\n?([\s\S]*?)$/);
        if (normalMatch) $('vnPokeCards').value = normalMatch[1].trim();
        if (angryMatch)  $('vnPokeAngryCards').value = angryMatch[1].trim();
        toast('生成完毕');
    })
    .catch(function() { toast('生成失败'); });
}

function vnGenDragCards() {
    var name = $('vnCharNameInput').value.trim() || '她';
    var persona = $('vnCharPersona').value.trim();
    var api = D.api;
    if (!api || !api.key) { toast('请先配置API'); return; }

    toast('生成中…');
    var prompt = '你是角色：' + name + '。人设：' + (persona || '性格温柔') + '。\n' +
        '请生成4条被人拖着到处走时说的短句，语气符合人设，每条不超过12字，不加序号，每行一条。';

    fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 15000,
            temperature: 1.1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        $('vnDragCards').value = d.choices[0].message.content.trim();
        toast('生成完毕');
    })
    .catch(function() { toast('生成失败'); });
}

// ========== AI生成地点描述 ==========
function vnGenPlaceDesc() {
    var name = $('vnPlaceNameInput').value.trim();
    if (!name) { toast('请先填写地点名称'); return; }
    var api = D.api;
    if (!api || !api.key) { toast('请先配置API'); return; }

    toast('生成中…');
    var prompt = '请用50字以内描述这个地点的氛围和特点，适合用于二次元风格的游戏场景描述。地点名：' + name + '。直接输出描述，不加引号。';

    fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10000,
            temperature: 0.9
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        $('vnPlaceDesc').value = d.choices[0].message.content.trim();
        toast('生成完毕');
    })
    .catch(function() { toast('生成失败'); });
}

// ========== openPage 兼容 ==========
// gameHub 和 vnGame 都走 openPage/closePage 系统
// 需要在 界面设置.js 的 openPage 里识别这两个 id
// 这里做一个补丁：重写 openGameHub 使其兼容现有 page 系统

function openGameHub() {
    openPage('gameHub');
}

// ========== 初始化 ==========
// 确保数据结构存在
function initVNGame() {
    if (!D.vnGame) D.vnGame = { chars: [], curCharId: null };
    getAllVNChars(); // 触发小洄初始化
}
// ========== 二十问系统 ==========

var TQ_STATE = {
    mode: null,
    topic: '',
    questions: [],
    curIdx: 0,
    score: 0,
    charId: null,
    charDesc: '',
    wbIds: [],
    injectContext: false,
    finished: false,
    aiComment: '',
    affDelta: 0
};

function openTwentyQ() {
    TQ_STATE = {
        mode: null, topic: '', questions: [], curIdx: 0, score: 0,
        charId: null, charDesc: '', wbIds: [], injectContext: false,
        finished: false, aiComment: '', affDelta: 0
    };
    tqShowSetup();
    openPage('twentyQ');
}

function closeTwentyQ() {
    closePage();
}

// ========== 设置页 ==========
function tqShowSetup() {
    $('tqSetupView').style.display = 'block';
    $('tqGameView').style.display = 'none';
    $('tqResultView').style.display = 'none';
    tqRenderSetup();
}

function tqRenderSetup() {
    var data = getAccData();
    var charOpts = '<option value="">不绑定角色</option>';
    if (data && data.chars) {
        data.chars.forEach(function(c) {
            charOpts += '<option value="' + c.id + '">' + esc(c.displayName) + '</option>';
        });
    }
    getAllVNChars().forEach(function(c) {
        charOpts += '<option value="vn_' + c.id + '">' + esc(c.name) + '（游戏角色）</option>';
    });
    $('tqCharSelect').innerHTML = charOpts;

    var wbHtml = '';
    if (D.worldbooks && D.worldbooks.length) {
        D.worldbooks.forEach(function(wb) {
            wbHtml += '<label style="display:flex;align-items:center;gap:8px;padding:8px;background:#1a1a1a;border-radius:8px;margin-bottom:6px;cursor:pointer">' +
                '<input type="checkbox" class="tq-wb-check" value="' + wb.id + '" style="width:18px;height:18px">' +
                '<span style="font-size:13px;color:#ccc">' + esc(wb.name) + '</span></label>';
        });
    } else {
        wbHtml = '<div style="font-size:12px;color:#555;padding:8px">暂无世界书</div>';
    }
    $('tqWbList').innerHTML = wbHtml;
}

function tqSelectMode(mode) {
    TQ_STATE.mode = mode;
    document.querySelectorAll('.tq-mode-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelector('.tq-mode-btn[data-mode="' + mode + '"]').classList.add('active');
    $('tqAiOptions').style.display = mode === 'ai' ? 'block' : 'none';
    $('tqUserOptions').style.display = mode === 'user' ? 'block' : 'none';
}

function tqGetWbContent() {
    var ids = [];
    document.querySelectorAll('.tq-wb-check:checked').forEach(function(el) { ids.push(el.value); });
    if (!ids.length || !D.worldbooks) return '';
    var content = '';
    D.worldbooks.forEach(function(wb) {
        if (ids.indexOf(wb.id) >= 0 && wb.entries) {
            wb.entries.forEach(function(e) { content += e.name + '：' + e.content + '\n'; });
        }
    });
    return content;
}

function tqGetCharDesc() {
    var sel = $('tqCharSelect').value;
    if (!sel) return $('tqCharDescInput').value.trim();
    if (sel.startsWith('vn_')) {
        var id = sel.replace('vn_', '');
        var ch = getVNChar(id);
        return ch ? ch.name + '：' + (ch.persona || '') : '';
    }
    var data = getAccData();
    if (!data) return '';
    var c = data.chars.find(function(c) { return c.id === sel; });
    return c ? c.displayName + '：' + (c.persona || '') : '';
}

function tqOnCharChange() {
    var sel = $('tqCharSelect').value;
    $('tqCharDescWrap').style.display = sel ? 'none' : 'block';
}

async function tqStart() {
    var mode = TQ_STATE.mode;
    if (!mode) { toast('请选择主办方'); return; }

    if (mode === 'user') {
        var topic = $('tqUserTopic').value.trim();
        if (!topic) { toast('请输入主题'); return; }
        MY_TQ_STATE = {
            topic: topic,
            questions: [],
            charId: $('tqCharSelect').value,
            charDesc: tqGetCharDesc(),
            finished: false,
            aiScore: 0,
            aiComment: '',
            affDelta: 0
        };
        myTqEditingIdx = null;
        myTqShowEditor();
        return;
    }

    var topic = $('tqAiTopic').value.trim();
    if (!topic) { toast('请输入题目主题'); return; }

    TQ_STATE.topic = topic;
    TQ_STATE.charId = $('tqCharSelect').value;
    TQ_STATE.charDesc = tqGetCharDesc();
    TQ_STATE.injectContext = $('tqInjectCtx').checked;

    var api = D.api;
    if (!api || !api.key) { toast('请先配置API'); return; }

    $('tqStartBtn').disabled = true;
    $('tqStartBtn').textContent = '生成中…';

    var wbContent = tqGetWbContent();
    var charInfo = TQ_STATE.charDesc ? '角色背景：' + TQ_STATE.charDesc + '\n' : '';
    var wbInfo = wbContent ? '世界书内容：\n' + wbContent + '\n' : '';

    var prompt = '你是一个出题老师。\n' +
        charInfo + wbInfo +
        '主题：' + topic + '\n' +
        '自行决定题型，可以是单选题、多选题、简答题，选择题选项数量3到5个不等，题目有趣且有深度。\n' +
        '请出20道题目。\n' +
        '严格按以下JSON格式输出，不要用markdown代码块，不要有任何多余文字，直接输出JSON：\n' +
        '{"questions":[\n' +
        '{"type":"choice","q":"题目","options":["A.选项1","B.选项2","C.选项3"],"answer":"A"},\n' +
        '{"type":"multi","q":"题目（多选）","options":["A.选项1","B.选项2","C.选项3","D.选项4"],"answer":"AC"},\n' +
        '{"type":"text","q":"题目","answer":"标准答案"}\n' +
        ']}';

    try {
        var res = await fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({
                model: api.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 6000,
                temperature: 0.9
            })
        });
        var d = await res.json();
        if (d.error) throw new Error(d.error.message);
        var raw = d.choices[0].message.content.trim();
        raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('未找到JSON');
        var jsonStr = jsonMatch[0];
        jsonStr = jsonStr.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        var parsed = JSON.parse(jsonStr);
        if (!parsed.questions || !parsed.questions.length) throw new Error('题目列表为空');
        TQ_STATE.questions = parsed.questions.slice(0, 20).map(function(q) {
            return {
                type: q.type,
                q: q.q,
                options: q.options || [],
                answer: q.answer,
                userAnswer: q.type === 'multi' ? [] : '',
                submitted: false,
                correct: null,
                aiAnalysis: ''
            };
        });
        tqShowGame();
    } catch(e) {
        toast('生成失败：' + e.message);
        $('tqStartBtn').disabled = false;
        $('tqStartBtn').textContent = '开始答题';
    }
}

// ========== 答题页 ==========
function tqShowGame() {
    $('tqSetupView').style.display = 'none';
    $('tqGameView').style.display = 'flex';
    $('tqResultView').style.display = 'none';
    TQ_STATE.curIdx = 0;
    tqRenderQuestion();
}

function tqRenderQuestion() {
    var idx = TQ_STATE.curIdx;
    var q = TQ_STATE.questions[idx];
    var total = TQ_STATE.questions.length;

    $('tqProgress').textContent = (idx + 1) + ' / ' + total;
    $('tqProgressBar').style.width = ((idx + 1) / total * 100) + '%';
    $('tqQNum').textContent = 'Q' + (idx + 1);
    $('tqQText').textContent = q.q;

    // 题型标签
    var typeLabel = q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '简答';
    $('tqQType').textContent = typeLabel;

    $('tqFeedback').style.display = 'none';
    $('tqNextBtn').style.display = 'none';

    var ansHtml = '';
    if (q.type === 'choice') {
        ansHtml = '<div class="tq-choices">';
        q.options.forEach(function(opt, i) {
            var sel = q.submitted && q.userAnswer === opt.charAt(0) ? ' selected' : '';
            ansHtml += '<button class="tq-choice-opt' + sel + '" onclick="tqSelectChoice(' + i + ')">' + esc(opt) + '</button>';
        });
        ansHtml += '</div>';
        if (!q.submitted) {
            ansHtml += '<button class="tq-submit-btn" onclick="tqSubmitChoice()" style="margin-top:12px">提交</button>';
        }
    } else if (q.type === 'multi') {
        ansHtml = '<div style="font-size:11px;color:#555;margin-bottom:8px">可多选</div><div class="tq-choices">';
        q.options.forEach(function(opt, i) {
            var letter = opt.charAt(0);
            var sel = q.submitted && q.userAnswer.indexOf(letter) >= 0 ? ' selected' : '';
            ansHtml += '<button class="tq-choice-opt' + sel + '" onclick="tqToggleMulti(' + i + ')">' + esc(opt) + '</button>';
        });
        ansHtml += '</div>';
        if (!q.submitted) {
            ansHtml += '<button class="tq-submit-btn" onclick="tqSubmitMulti()" style="margin-top:12px">提交</button>';
        }
    } else {
        if (q.submitted) {
            ansHtml = '<div style="padding:12px;background:#1a1a1a;border-radius:12px;color:#ccc;font-size:14px">' + esc(q.userAnswer) + '</div>';
        } else {
            ansHtml = '<div class="tq-text-area">' +
                '<textarea id="tqTextAnswer" placeholder="输入你的答案…" style="width:100%;min-height:80px;padding:12px;border:1.5px solid #333;border-radius:12px;background:#111;color:white;font-size:14px;resize:none;outline:none;font-family:inherit">' +
                esc(q.userAnswer || '') + '</textarea>' +
                '<button class="tq-submit-btn" onclick="tqSubmitText()">提交</button>' +
                '</div>';
        }
    }

    // 已提交显示打勾
    if (q.submitted) {
        ansHtml += '<div class="tq-submitted-check" id="tqSubmittedCheck">✓ 已提交</div>';
    }

    $('tqAnswerArea').innerHTML = ansHtml;

    // 下一题/提交全部按钮
    if (q.submitted) {
        $('tqNextBtn').style.display = 'block';
        if (idx < total - 1) {
            $('tqNextBtn').textContent = '下一题 →';
        } else {
            var allSubmitted = TQ_STATE.questions.every(function(q) { return q.submitted; });
            $('tqNextBtn').textContent = allSubmitted ? '提交全部，等待批阅 ✓' : '还有题目未作答';
            $('tqNextBtn').disabled = !allSubmitted;
        }
    }

    var card = $('tqCard');
    card.classList.remove('tq-slide-in');
    void card.offsetWidth;
    card.classList.add('tq-slide-in');
}

// 单选
var tqSelectedChoice = null;
function tqSelectChoice(optIdx) {
    var q = TQ_STATE.questions[TQ_STATE.curIdx];
    if (q.submitted) return;
    tqSelectedChoice = optIdx;
    var btns = document.querySelectorAll('.tq-choice-opt');
    btns.forEach(function(b, i) {
        b.classList.toggle('selected', i === optIdx);
    });
}

function tqSubmitChoice() {
    var q = TQ_STATE.questions[TQ_STATE.curIdx];
    if (q.submitted) return;
    if (tqSelectedChoice === null) { toast('请选择一个选项'); return; }
    q.userAnswer = q.options[tqSelectedChoice].charAt(0);
    q.submitted = true;
    tqSelectedChoice = null;
    tqShowSubmitAnim();
}

// 多选
function tqToggleMulti(optIdx) {
    var q = TQ_STATE.questions[TQ_STATE.curIdx];
    if (q.submitted) return;
    var letter = q.options[optIdx].charAt(0);
    var idx = q.userAnswer.indexOf(letter);
    if (idx >= 0) {
        q.userAnswer.splice(idx, 1);
    } else {
        q.userAnswer.push(letter);
    }
    var btns = document.querySelectorAll('.tq-choice-opt');
    btns.forEach(function(b, i) {
        var l = q.options[i].charAt(0);
        b.classList.toggle('selected', q.userAnswer.indexOf(l) >= 0);
    });
}

function tqSubmitMulti() {
    var q = TQ_STATE.questions[TQ_STATE.curIdx];
    if (q.submitted) return;
    if (!q.userAnswer.length) { toast('请至少选择一个选项'); return; }
    q.submitted = true;
    tqShowSubmitAnim();
}

// 简答
function tqSubmitText() {
    var q = TQ_STATE.questions[TQ_STATE.curIdx];
    if (q.submitted) return;
    var ans = $('tqTextAnswer') ? $('tqTextAnswer').value.trim() : '';
    if (!ans) { toast('请输入答案'); return; }
    q.userAnswer = ans;
    q.submitted = true;
    tqShowSubmitAnim();
}

// 提交动画
function tqShowSubmitAnim() {
    var area = $('tqAnswerArea');
    var check = document.createElement('div');
    check.className = 'tq-submitted-check tq-check-anim';
    check.textContent = '✓ 已提交';
    area.appendChild(check);
    setTimeout(function() {
        tqRenderQuestion();
    }, 600);
}

function tqNext() {
    var idx = TQ_STATE.curIdx;
    var total = TQ_STATE.questions.length;
    if (idx < total - 1) {
        TQ_STATE.curIdx++;
        tqRenderQuestion();
    } else {
        tqShowResult();
    }
}

// ========== 结算页（AI批阅） ==========
async function tqShowResult() {
    $('tqSetupView').style.display = 'none';
    $('tqGameView').style.display = 'none';
    $('tqResultView').style.display = 'flex';

$('tqAiCommentBox').textContent = 'AI批阅中，请稍候…';
$('tqReviewList').innerHTML = '';
$('tqAffChange').style.display = 'none';
$('tqScoreNum').textContent = '?';
$('tqRetryBtn').style.display = 'none';

    var api = D.api;
    if (!api || !api.key) {
        $('tqAiCommentBox').textContent = '（未配置API）';
        return;
    }

    // 组装答题记录
    var qaList = TQ_STATE.questions.map(function(q, i) {
        var userAns = Array.isArray(q.userAnswer) ? q.userAnswer.join('') : q.userAnswer;
        return (i+1) + '. [' + (q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '简答') + '] ' +
            q.q + '\n标准答案：' + q.answer + '\n用户答案：' + userAns;
    }).join('\n\n');

    var charInfo = TQ_STATE.charDesc ? '你的角色设定：' + TQ_STATE.charDesc + '\n' : '';
    var prompt = charInfo +
        '用户刚完成了一场关于「' + TQ_STATE.topic + '」的问答，以下是题目、标准答案和用户的作答：\n\n' +
        qaList + '\n\n' +
        '请你：\n' +
        '1. 批阅每道题，给出对错判断和简短分析（简答题要宽松判断，意思对即可）\n' +
        '2. 统计总分\n' +
        '3. 给出总评语（100字以内，语气符合角色设定，可调侃可鼓励）\n' +
        '4. 给出好感度变化（-5到+10）\n' +
        '严格按以下JSON格式输出，不要markdown代码块：\n' +
        '{"total":15,"reviews":[{"idx":0,"correct":true,"analysis":"分析"},{"idx":1,"correct":false,"analysis":"分析"}],"comment":"总评语","aff":3}';

    try {
        var res = await fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({
                model: api.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 6000,
                temperature: 0.9
            })
        });
        var d = await res.json();
        if (d.error) throw new Error(d.error.message);
        var raw = d.choices[0].message.content.trim();
        raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('格式错误');
        var jsonStr = jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        var result = JSON.parse(jsonStr);

        TQ_STATE.score = result.total || 0;
        TQ_STATE.aiComment = result.comment || '';
        TQ_STATE.affDelta = result.aff || 0;

        // 把批阅结果写回questions
        if (result.reviews) {
            result.reviews.forEach(function(r) {
                if (TQ_STATE.questions[r.idx]) {
                    TQ_STATE.questions[r.idx].correct = r.correct;
                    TQ_STATE.questions[r.idx].aiAnalysis = r.analysis;
                }
            });
        }

        // 分数动画
        var score = TQ_STATE.score;
        var count = 0;
        var timer = setInterval(function() {
            count++;
            $('tqScoreNum').textContent = count;
            if (count >= score) clearInterval(timer);
        }, 60);
        $('tqScoreTotal').textContent = '/ ' + TQ_STATE.questions.length;

        // 总评语
        $('tqAiCommentBox').textContent = TQ_STATE.aiComment;

        // 好感度
        var aff = TQ_STATE.affDelta;
        if (aff !== 0) {
            var affEl = $('tqAffChange');
            affEl.style.display = 'block';
            affEl.textContent = (aff > 0 ? '+' : '') + aff + ' 好感度';
            affEl.className = 'tq-aff-change ' + (aff > 0 ? 'plus' : 'minus');
            affEl.classList.add('pop');
            var curCh = getCurVNChar();
            if (curCh && !curCh.builtin) {
                curCh.affection = Math.min(100, Math.max(0, (curCh.affection || 0) + aff));
                save();
            }
        }

        // 渲染每题批阅
        var html = '';
        TQ_STATE.questions.forEach(function(q, i) {
            var correct = q.correct;
            var userAns = Array.isArray(q.userAnswer) ? q.userAnswer.join('') : q.userAnswer;
            html += '<div class="tq-review-item ' + (correct ? 'correct' : 'wrong') + '">' +
                '<div class="tq-review-header">' +
                '<span class="tq-review-num">Q' + (i+1) + '</span>' +
                '<span class="tq-review-mark">' + (correct ? '✓' : '✗') + '</span>' +
                '</div>' +
                '<div class="tq-review-q">' + esc(q.q) + '</div>' +
                '<div class="tq-review-row"><span class="tq-review-label">你的答案</span><span class="tq-review-val ' + (correct ? 'correct' : 'wrong') + '">' + esc(userAns || '未作答') + '</span></div>' +
                '<div class="tq-review-row"><span class="tq-review-label">正确答案</span><span class="tq-review-val correct">' + esc(q.answer) + '</span></div>' +
                '<div class="tq-review-analysis">' + esc(q.aiAnalysis || '') + '</div>' +
                '</div>';
        });
        $('tqReviewList').innerHTML = html;

// 保存历史记录
tqSaveHistory();
        // 注入记忆
        if (TQ_STATE.injectContext && TQ_STATE.charId) {
            tqInjectContext();
        }

    } catch(e) {
$('tqAiCommentBox').textContent = '批阅失败：' + e.message;
$('tqRetryBtn').style.display = 'block';
    }
}

function tqInjectContext() {
    var summary = '【二十问记录】主题：' + TQ_STATE.topic +
        '，答对' + TQ_STATE.score + '/' + TQ_STATE.questions.length + '题。' +
        '评语：' + TQ_STATE.aiComment;
    var charId = TQ_STATE.charId;
    if (charId.startsWith('vn_')) return;
    var data = getAccData();
    if (!data) return;
    var ch = data.chars.find(function(c) { return c.id === charId; });
    if (!ch) return;
    if (!ch.memories) ch.memories = [];
    ch.memories.push({ id: genId(), content: summary, time: Date.now() });
    save();
    toast('问答已注入角色记忆');
}

function tqGoChat() {
    closePage();
    var charId = TQ_STATE.charId;
    if (!charId || charId.startsWith('vn_')) { openPage('chat'); return; }

    // 组装问答记录注入内容
    var qaDetail = TQ_STATE.questions.map(function(q, i) {
        var userAns = Array.isArray(q.userAnswer) ? q.userAnswer.join('') : q.userAnswer;
        var correctStr = q.correct === true ? '✓' : q.correct === false ? '✗' : '?';
        return (i + 1) + '. ' + q.q +
            '\n   用户答案：' + (userAns || '未作答') + ' ' + correctStr +
            '\n   正确答案：' + q.answer +
            (q.aiAnalysis ? '\n   分析：' + q.aiAnalysis : '');
    }).join('\n\n');

    var inject = '【刚刚完成了一场二十问问答，以下是详细记录，请你知晓并自然地融入接下来的对话中】\n' +
        '主题：' + TQ_STATE.topic + '\n' +
        '得分：' + TQ_STATE.score + ' / ' + TQ_STATE.questions.length + '\n' +
        '总评：' + (TQ_STATE.aiComment || '无') + '\n\n' +
        '答题明细：\n' + qaDetail;

    // 存到角色的临时注入字段，发消息时带上
    var data = getAccData();
    if (data && data.chars) {
        var ch = data.chars.find(function(c) { return c.id === charId; });
        if (ch) {
            ch._tqInject = inject;
            save();
        }
    }

    openPage('chat');
    setTimeout(function() { openChat(charId); }, 200);
}
function tqRetry() {
    tqShowResult();
}
// ========== 二十问历史记录 ==========

function tqSaveHistory() {
    var data = getAccData();
    if (!data) return;
    if (!data.tqHistory) data.tqHistory = [];

    var record = {
        id: genId('tq'),
        time: Date.now(),
        topic: TQ_STATE.topic,
        mode: TQ_STATE.mode,
        charId: TQ_STATE.charId,
        charDesc: TQ_STATE.charDesc,
        score: TQ_STATE.score,
        total: TQ_STATE.questions.length,
        aiComment: TQ_STATE.aiComment,
        affDelta: TQ_STATE.affDelta,
        questions: TQ_STATE.questions.map(function(q) {
            return {
                type: q.type,
                q: q.q,
                options: q.options,
                answer: q.answer,
                userAnswer: q.userAnswer,
                correct: q.correct,
                aiAnalysis: q.aiAnalysis
            };
        })
    };

    data.tqHistory.unshift(record);
    // 最多保存50条
    if (data.tqHistory.length > 50) data.tqHistory = data.tqHistory.slice(0, 50);
    save();
}

function openTqHistory() {
    var data = getAccData();
    var list = (data && data.tqHistory) || [];

    if (!list.length) {
        toast('暂无历史记录');
        return;
    }

    var html = '';
    list.forEach(function(r) {
        var date = new Date(r.time);
        var dateStr = (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
            String(date.getHours()).padStart(2, '0') + ':' +
            String(date.getMinutes()).padStart(2, '0');

        var charLabel = '';
        if (r.charId) {
            if (r.charId.startsWith('vn_')) {
                var vnId = r.charId.replace('vn_', '');
                var vnCh = getVNChar(vnId);
                charLabel = vnCh ? vnCh.name : '游戏角色';
            } else {
                var accData = getAccData();
                if (accData && accData.chars) {
                    var ch = accData.chars.find(function(c) { return c.id === r.charId; });
                    charLabel = ch ? ch.displayName : '';
                }
            }
        }

        var pct = r.total ? Math.round(r.score / r.total * 100) : 0;
        var barColor = pct >= 80 ? '#fff' : pct >= 60 ? '#aaa' : '#555';

        html += '<div class="tqh-item" onclick="openTqHistoryDetail(\'' + r.id + '\')">' +
            '<div class="tqh-item-top">' +
            '<span class="tqh-topic">' + esc(r.topic) + '</span>' +
            '<span class="tqh-date">' + dateStr + '</span>' +
            '</div>' +
            '<div class="tqh-item-mid">' +
            '<div class="tqh-score-wrap">' +
            '<span class="tqh-score">' + r.score + '</span>' +
            '<span class="tqh-total">/' + r.total + '</span>' +
            '</div>' +
            '<div class="tqh-bar-wrap">' +
            '<div class="tqh-bar" style="width:' + pct + '%;background:' + barColor + '"></div>' +
            '</div>' +
            (charLabel ? '<span class="tqh-char">' + esc(charLabel) + '</span>' : '') +
            '</div>' +
            (r.aiComment ? '<div class="tqh-comment">' + esc(r.aiComment) + '</div>' : '') +
            '<button class="tqh-del-btn" onclick="event.stopPropagation();tqDeleteHistory(\'' + r.id + '\')">删除</button>' +
            '</div>';
    });

    $('tqHistoryList').innerHTML = html;
    openModal('tqHistoryModal');
}

function openTqHistoryDetail(id) {
    var data = getAccData();
    var list = (data && data.tqHistory) || [];
    var record = list.find(function(r) { return r.id === id; });
    if (!record) return;

    var date = new Date(record.time);
    var dateStr = date.getFullYear() + '/' + (date.getMonth() + 1) + '/' + date.getDate() + ' ' +
        String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0');

    $('tqDetailTitle').textContent = record.topic;
    $('tqDetailDate').textContent = dateStr;
    $('tqDetailScore').textContent = record.score + ' / ' + record.total;
    $('tqDetailComment').textContent = record.aiComment || '无评语';

    var html = '';
    (record.questions || []).forEach(function(q, i) {
        var correct = q.correct;
        var userAns = Array.isArray(q.userAnswer) ? q.userAnswer.join('') : q.userAnswer;
        html += '<div class="tq-review-item ' + (correct ? 'correct' : 'wrong') + '">' +
            '<div class="tq-review-header">' +
            '<span class="tq-review-num">Q' + (i + 1) + '</span>' +
            '<span class="tq-review-mark">' + (correct ? '✓' : '✗') + '</span>' +
            '</div>' +
            '<div class="tq-review-q">' + esc(q.q) + '</div>' +
            '<div class="tq-review-row"><span class="tq-review-label">你的答案</span><span class="tq-review-val ' + (correct ? 'correct' : 'wrong') + '">' + esc(userAns || '未作答') + '</span></div>' +
            '<div class="tq-review-row"><span class="tq-review-label">正确答案</span><span class="tq-review-val correct">' + esc(q.answer) + '</span></div>' +
            (q.aiAnalysis ? '<div class="tq-review-analysis">' + esc(q.aiAnalysis) + '</div>' : '') +
            '</div>';
    });
    $('tqDetailReviewList').innerHTML = html;

    closeModal('tqHistoryModal');
    openModal('tqDetailModal');
}

function tqDeleteHistory(id) {
    if (!confirm('删除这条记录？')) return;
    var data = getAccData();
    if (!data || !data.tqHistory) return;
    data.tqHistory = data.tqHistory.filter(function(r) { return r.id !== id; });
    save();
    openTqHistory();
}

function tqClearAllHistory() {
    if (!confirm('清空全部历史记录？')) return;
    var data = getAccData();
    if (!data) return;
    data.tqHistory = [];
    save();
    closeModal('tqHistoryModal');
    toast('已清空');
}
// ========== 我来出题模式 ==========

var MY_TQ_STATE = {
    topic: '',
    questions: [],
    charId: null,
    charDesc: '',
    finished: false,
    aiScore: 0,
    aiComment: '',
    affDelta: 0
};

var myTqEditingIdx = null; // 当前正在编辑的题目索引

// ========== 页面切换 ==========
function myTqShowEditor() {
    $('tqSetupView').style.display = 'none';
    $('tqGameView').style.display = 'none';
    $('tqResultView').style.display = 'none';
    $('myTqResultView').style.display = 'none';
    $('myTqEditView').style.display = 'flex';
    $('myTqTopicLabel').textContent = '主题：' + MY_TQ_STATE.topic;
    myTqRenderQuestionList();
}

function myTqShowResult() {
    $('tqSetupView').style.display = 'none';
    $('tqGameView').style.display = 'none';
    $('tqResultView').style.display = 'none';
    $('myTqEditView').style.display = 'none';
    $('myTqResultView').style.display = 'flex';
}

function myTqBackToSetup() {
    $('myTqResultView').style.display = 'none';
    $('myTqEditView').style.display = 'none';
    $('tqSetupView').style.display = 'block';
}

// ========== 题目列表渲染 ==========
function myTqRenderQuestionList() {
    var qs = MY_TQ_STATE.questions;
    $('myTqTopicLabel').textContent = '主题：' + MY_TQ_STATE.topic;
    $('myTqQCount').textContent = qs.length + ' 道题';

    if (!qs.length) {
        $('myTqQList').innerHTML = '<div style="text-align:center;padding:30px;color:#888;font-size:14px">还没有题目，点击下方 + 添加</div>';
        return;
    }

    $('myTqQList').innerHTML = qs.map(function(q, i) {
        var typeLabel = q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '简答';
        var typeBg = q.type === 'choice' ? 'var(--primary-light)' : q.type === 'multi' ? '#FFF3CD' : '#E8F5E9';
        var typeColor = q.type === 'choice' ? 'var(--primary-dark)' : q.type === 'multi' ? '#856404' : '#2E7D32';
        var isValid = myTqValidateQ(q);
        return '<div class="mytq-q-item' + (!isValid ? ' mytq-q-invalid' : '') + '" onclick="myTqEditQuestion(' + i + ')">' +
            '<div class="mytq-q-header">' +
            '<span class="mytq-q-num">Q' + (i + 1) + '</span>' +
            '<span class="mytq-q-type-badge" style="background:' + typeBg + ';color:' + typeColor + '">' + typeLabel + '</span>' +
            (!isValid ? '<span style="font-size:11px;color:#FF6B6B;margin-left:4px">⚠ 不完整</span>' : '') +
            '<button onclick="event.stopPropagation();myTqDeleteQuestion(' + i + ')" style="margin-left:auto;padding:4px 10px;border:none;border-radius:8px;background:#FFE0E0;color:#FF6B6B;font-size:11px;cursor:pointer">删除</button>' +
            '</div>' +
            '<div class="mytq-q-text">' + esc(q.q || '（未填写题目）') + '</div>' +
            (q.type !== 'text' && q.options && q.options.length ?
                '<div class="mytq-q-opts">' + q.options.map(function(o) {
                    return '<span class="mytq-opt-preview">' + esc(o) + '</span>';
                }).join('') + '</div>' : '') +
            '<div class="mytq-q-answer">答案：<span>' + esc(q.answer || '未填写') + '</span></div>' +
            '</div>';
    }).join('');
}

function myTqValidateQ(q) {
    if (!q.q) return false;
    if (!q.answer) return false;
    if ((q.type === 'choice' || q.type === 'multi') && (!q.options || q.options.length < 2)) return false;
    return true;
}

// ========== 添加/编辑题目 ==========
function myTqAddQuestion() {
    MY_TQ_STATE.questions.push({
        type: 'choice',
        q: '',
        options: ['A.', 'B.', 'C.', 'D.'],
        answer: '',
        aiAnswer: '',
        aiAnalysis: '',
        correct: null
    });
    myTqEditingIdx = MY_TQ_STATE.questions.length - 1;
    myTqOpenEditor();
}

function myTqEditQuestion(idx) {
    myTqEditingIdx = idx;
    myTqOpenEditor();
}

function myTqOpenEditor() {
    var idx = myTqEditingIdx;
    var q = MY_TQ_STATE.questions[idx];
    if (!q) return;

    $('myTqEditorTitle').textContent = 'Q' + (idx + 1) + ' 编辑题目';
    $('myTqEditorQText').value = q.q || '';
    $('myTqEditorAnswer').value = q.answer || '';

    // 题型选择
    document.querySelectorAll('.mytq-type-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.type === q.type);
    });

    myTqRenderEditorOptions(q);
    openModal('myTqEditorModal');
}

function myTqSelectType(type) {
    var q = MY_TQ_STATE.questions[myTqEditingIdx];
    if (!q) return;
    q.type = type;
    if (type === 'text') {
        q.options = [];
    } else if (!q.options || q.options.length < 2) {
        q.options = ['A.', 'B.', 'C.', 'D.'];
    }
    document.querySelectorAll('.mytq-type-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.type === type);
    });
    myTqRenderEditorOptions(q);
}

function myTqRenderEditorOptions(q) {
    var wrap = $('myTqEditorOptsWrap');
    if (q.type === 'text') {
        wrap.innerHTML = '';
        wrap.style.display = 'none';
        return;
    }
    wrap.style.display = 'block';
    var letters = ['A','B','C','D','E','F'];
    var h = '<div style="font-size:12px;color:#666;margin-bottom:8px">选项（至少2个）：</div>';
    h += '<div id="myTqOptList">';
    (q.options || []).forEach(function(opt, i) {
        h += '<div class="mytq-opt-row">' +
            '<span class="mytq-opt-letter">' + letters[i] + '</span>' +
            '<input type="text" class="mytq-opt-input" placeholder="选项内容" value="' + esc(opt.replace(/^[A-F]\.\s*/, '')) + '" oninput="myTqUpdateOption(' + i + ',this.value)">' +
            (q.options.length > 2 ? '<button onclick="myTqRemoveOption(' + i + ')" style="flex-shrink:0;padding:6px 10px;border:none;border-radius:8px;background:#FFE0E0;color:#FF6B6B;font-size:12px;cursor:pointer">−</button>' : '') +
            '</div>';
    });
    h += '</div>';
    if (q.options.length < 6) {
        h += '<button onclick="myTqAddOption()" style="width:100%;padding:10px;border:1.5px dashed #ccc;border-radius:10px;background:transparent;color:#888;font-size:13px;cursor:pointer;margin-top:6px">+ 添加选项</button>';
    }
    if (q.type === 'multi') {
        h += '<div style="font-size:12px;color:#888;margin-top:8px">多选题答案请填写字母组合，如：AB 或 ACD</div>';
    } else {
        h += '<div style="font-size:12px;color:#888;margin-top:8px">单选题答案填写一个字母，如：A</div>';
    }
    wrap.innerHTML = h;
}

function myTqUpdateOption(i, val) {
    var q = MY_TQ_STATE.questions[myTqEditingIdx];
    if (!q || !q.options) return;
    var letters = ['A','B','C','D','E','F'];
    q.options[i] = letters[i] + '.' + val;
}

function myTqAddOption() {
    var q = MY_TQ_STATE.questions[myTqEditingIdx];
    if (!q || q.options.length >= 6) return;
    var letters = ['A','B','C','D','E','F'];
    q.options.push(letters[q.options.length] + '.');
    myTqRenderEditorOptions(q);
}

function myTqRemoveOption(i) {
    var q = MY_TQ_STATE.questions[myTqEditingIdx];
    if (!q || q.options.length <= 2) return;
    q.options.splice(i, 1);
    // 重新编号
    var letters = ['A','B','C','D','E','F'];
    q.options = q.options.map(function(o, idx) {
        return letters[idx] + '.' + o.replace(/^[A-F]\.\s*/, '');
    });
    myTqRenderEditorOptions(q);
}

function myTqSaveEditor() {
    var q = MY_TQ_STATE.questions[myTqEditingIdx];
    if (!q) return;
    q.q = $('myTqEditorQText').value.trim();
    q.answer = $('myTqEditorAnswer').value.trim().toUpperCase();
    // 同步选项最新值（防止oninput未触发）
    if (q.type !== 'text') {
        var inputs = document.querySelectorAll('.mytq-opt-input');
        var letters = ['A','B','C','D','E','F'];
        inputs.forEach(function(inp, i) {
            if (q.options[i] !== undefined) {
                q.options[i] = letters[i] + '.' + inp.value.trim();
            }
        });
    }
    if (!q.q) return toast('请填写题目内容');
    if (!q.answer) return toast('请填写答案');
    closeModal('myTqEditorModal');
    myTqRenderQuestionList();
    toast('已保存');
}

function myTqDeleteQuestion(idx) {
    if (!confirm('删除这道题？')) return;
    MY_TQ_STATE.questions.splice(idx, 1);
    myTqRenderQuestionList();
}

// ========== 开始答题（让AI作答）==========
async function myTqStartGame() {
    var qs = MY_TQ_STATE.questions;
    if (!qs.length) return toast('请先添加题目');
    var invalid = qs.filter(function(q) { return !myTqValidateQ(q); });
    if (invalid.length) return toast('有 ' + invalid.length + ' 道题目不完整，请检查');

    var api = D.api;
    if (!api || !api.key) return toast('请先配置API');

    $('myTqStartBtn').disabled = true;
    $('myTqStartBtn').textContent = 'AI答题中…';

        var charInfo = MY_TQ_STATE.charDesc ? '你的角色设定：' + MY_TQ_STATE.charDesc + '\n' : '';

    // 注入聊天记录
    var chatHistory = '';
    var charId = MY_TQ_STATE.charId;
    if (charId && !charId.startsWith('vn_')) {
        var accData = getAccData();
        if (accData && accData.chats && accData.chats[charId] && accData.chats[charId].length) {
            var recentMsgs = accData.chats[charId].slice(-100);
            chatHistory = '以下是你和用户最近的聊天记录（供你参考，了解用户的背景和习惯）：\n';
            recentMsgs.forEach(function(m) {
                if (m.role === 'user') {
                    chatHistory += '用户：' + (m.content || '') + '\n';
                } else {
                    chatHistory += '你：' + (m.content || '') + '\n';
                }
            });
            chatHistory += '\n';
        }
    } else if (charId && charId.startsWith('vn_')) {
        var vnId = charId.replace('vn_', '');
        var vnCh = getVNChar(vnId);
        if (vnCh && vnCh.history && vnCh.history.length) {
            var recentVnMsgs = vnCh.history.slice(-100);
            chatHistory = '以下是你和用户最近的聊天记录（供你参考，了解用户的背景和习惯）：\n';
            recentVnMsgs.forEach(function(m) {
                if (m.role === 'user') {
                    chatHistory += '用户：' + (m.content || '') + '\n';
                } else {
                    chatHistory += '你：' + (m.content || '') + '\n';
                }
            });
            chatHistory += '\n';
        }
    }

    var qList = qs.map(function(q, i) {
        var line = (i + 1) + '. [' + (q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '简答') + '] ' + q.q;
        if (q.options && q.options.length) {
            line += '\n' + q.options.join(' / ');
        }
        return line;
    }).join('\n\n');

    var prompt = charInfo + chatHistory +
        '用户出了一套关于「' + MY_TQ_STATE.topic + '」的题目让你来回答，请认真作答。\n\n' +
        '题目如下：\n' + qList + '\n\n' +
        '要求：\n' +
        '1. 每道题认真作答\n' +
        '2. 单选题只选一个字母（如：A）\n' +
        '3. 多选题选多个字母（如：AC）\n' +
        '4. 简答题用一两句话回答\n' +
        '5. 如果真的不确定，可以猜一个，不能跳过\n' +
        '严格按以下JSON输出，不要markdown代码块：\n' +
        '{"answers":[{"idx":0,"answer":"A","thought":"我觉得是A因为…"},{"idx":1,"answer":"AC","thought":"…"},{"idx":2,"answer":"简答内容","thought":"…"}]}';

    try {
        var res = await fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({
                model: api.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.9
            })
        });
        var d = await res.json();
        if (d.error) throw new Error(d.error.message);
        var raw = d.choices[0].message.content.trim();
        raw = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        var jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('格式错误');
        var parsed = JSON.parse(jsonMatch[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']'));

        // 把AI答案写回题目：
        (parsed.answers || []).forEach(function(a) {
            if (MY_TQ_STATE.questions[a.idx]) {
                MY_TQ_STATE.questions[a.idx].aiAnswer = a.answer || '';
                MY_TQ_STATE.questions[a.idx].aiThought = a.thought || '';
            }
        });

        // 自动批改
        myTqGrade();
        myTqShowResult();
        myTqRenderResult();

    } catch(e) {
        toast('AI答题失败：' + e.message);
        $('myTqStartBtn').disabled = false;
        $('myTqStartBtn').textContent = '开始，让AI来答';
    }
}

// ========== 批改 ==========
function myTqGrade() {
    var score = 0;
    MY_TQ_STATE.questions.forEach(function(q) {
        var correct = false;
        var userAns = (q.aiAnswer || '').trim().toUpperCase();
        var stdAns = (q.answer || '').trim().toUpperCase();
        if (q.type === 'choice') {
            correct = userAns === stdAns;
        } else if (q.type === 'multi') {
            // 排序后比较
            var ua = userAns.split('').sort().join('');
            var sa = stdAns.split('').sort().join('');
            correct = ua === sa;
        } else {
            // 简答题：包含关键词则算对（宽松）
            correct = userAns.length > 0 && stdAns.length > 0 &&
                (userAns.indexOf(stdAns) >= 0 || stdAns.indexOf(userAns) >= 0 || userAns.length >= 4);
        }
        q.correct = correct;
        if (correct) score++;
    });
    MY_TQ_STATE.aiScore = score;
}

// ========== 结算页渲染 ==========
async function myTqRenderResult() {
    var qs = MY_TQ_STATE.questions;
    var score = MY_TQ_STATE.aiScore;
    var total = qs.length;
    var pct = total ? Math.round(score / total * 100) : 0;

    // 分数动画
    $('myTqScoreTotal').textContent = '/ ' + total;
    var count = 0;
    var scoreTimer = setInterval(function() {
        count++;
        $('myTqScoreNum').textContent = count;
        if (count >= score) clearInterval(scoreTimer);
    }, 60);

    $('myTqAiCommentBox').textContent = 'AI正在写感想…';
    $('myTqAffChange').style.display = 'none';
    $('myTqReviewList').innerHTML = '';

    // 渲染每题批阅
    var html = '';
    qs.forEach(function(q, i) {
        var correct = q.correct;
        html += '<div class="tq-review-item ' + (correct ? 'correct' : 'wrong') + '">' +
            '<div class="tq-review-header">' +
            '<span class="tq-review-num">Q' + (i + 1) + '</span>' +
            '<span class="tq-review-mark">' + (correct ? '✓' : '✗') + '</span>' +
            '</div>' +
            '<div class="tq-review-q">' + esc(q.q) + '</div>' +
            '<div class="tq-review-row"><span class="tq-review-label">AI的答案</span>' +
            '<span class="tq-review-val ' + (correct ? 'correct' : 'wrong') + '">' + esc(q.aiAnswer || '未作答') + '</span></div>' +
            (q.aiThought ? '<div class="tq-review-analysis">💭 ' + esc(q.aiThought) + '</div>' : '') +
            '<div class="tq-review-row"><span class="tq-review-label">正确答案</span>' +
            '<span class="tq-review-val correct">' + esc(q.answer) + '</span></div>' +
            '</div>';
    });
    $('myTqReviewList').innerHTML = html;

    // 先保存历史（不依赖感想生成成功）
    myTqSaveHistory();

    // 让AI写感想
    var api = D.api;
    if (!api || !api.key) {
        $('myTqAiCommentBox').textContent = '（未配置API，无法生成感想）';
        return;
    }

    var charInfo = MY_TQ_STATE.charDesc ? '你的角色设定：' + MY_TQ_STATE.charDesc + '\n' : '';

    // 注入聊天记录
    var commentChatHistory = '';
    var commentCharId = MY_TQ_STATE.charId;
    if (commentCharId && !commentCharId.startsWith('vn_')) {
        var commentAccData = getAccData();
        if (commentAccData && commentAccData.chats && commentAccData.chats[commentCharId] && commentAccData.chats[commentCharId].length) {
            var commentRecentMsgs = commentAccData.chats[commentCharId].slice(-100);
            commentChatHistory = '以下是你和用户最近的聊天记录（供你参考，了解用户的背景和习惯）：\n';
            commentRecentMsgs.forEach(function(m) {
                if (m.role === 'user') {
                    commentChatHistory += '用户：' + (m.content || '') + '\n';
                } else {
                    commentChatHistory += '你：' + (m.content || '') + '\n';
                }
            });
            commentChatHistory += '\n';
        }
    } else if (commentCharId && commentCharId.startsWith('vn_')) {
        var commentVnId = commentCharId.replace('vn_', '');
        var commentVnCh = getVNChar(commentVnId);
        if (commentVnCh && commentVnCh.history && commentVnCh.history.length) {
            var commentRecentVnMsgs = commentVnCh.history.slice(-100);
            commentChatHistory = '以下是你和用户最近的聊天记录（供你参考，了解用户的背景和习惯）：\n';
            commentRecentVnMsgs.forEach(function(m) {
                if (m.role === 'user') {
                    commentChatHistory += '用户：' + (m.content || '') + '\n';
                } else {
                    commentChatHistory += '你：' + (m.content || '') + '\n';
                }
            });
            commentChatHistory += '\n';
        }
    }

    var qaDetail = qs.map(function(q, i) {
        return (i + 1) + '. [' + (q.type === 'choice' ? '单选' : q.type === 'multi' ? '多选' : '简答') + '] ' + q.q + '\n' +
            '   你的答案：' + (q.aiAnswer || '未作答') + (q.correct ? ' ✓' : ' ✗') + '\n' +
            '   正确答案：' + q.answer +
            (q.aiThought ? '\n   你当时的想法：' + q.aiThought : '');
    }).join('\n\n');
    var prompt = charInfo + commentChatHistory +
        '你刚刚回答了用户出的一套关于「' + MY_TQ_STATE.topic + '」的题目，' +
        '共' + total + '题，答对了' + score + '题（正确率' + pct + '%）。\n\n' +
        '以下是完整答题记录：\n' + qaDetail + '\n\n' +
        '请用角色的语气写一段对自己答题情况的感想（80字以内），可以反思、可以得意、可以委屈，要自然真实。\n' +
        '然后给出好感度变化：答对越多好感越高（满分+5，80%以上+3，60%以上+1，低于60%不变）。\n' +
        '输出格式只需要两行，不要JSON，不要任何多余内容：\n' +
        '第一行：感想文字\n' +
        '第二行：一个整数，表示好感度变化，如 3 或 -1 或 0';

    try {
        var res = await fetch((api.url || '').replace(/\/+$/, '') + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
            body: JSON.stringify({
                model: api.model || 'gpt-4o-mini',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 50000,
                temperature: 1
            })
        });
        var d = await res.json();
        if (d.error) throw new Error(d.error.message);
        var raw = d.choices[0].message.content.trim();

        // 解析两行格式，最后一行是数字，其余是感想
        var lines = raw.split('\n').map(function(l) { return l.trim(); }).filter(Boolean);
        var aff = 0;
        var comment = '';
        if (lines.length >= 2) {
            var lastLine = lines[lines.length - 1];
            var affNum = parseInt(lastLine);
            if (!isNaN(affNum) && /^[+-]?\d+$/.test(lastLine)) {
                aff = affNum;
                comment = lines.slice(0, lines.length - 1).join('');
            } else {
                comment = lines.join('');
            }
        } else {
            comment = raw;
        }

        // 容错：如果还是没解析到感想，直接用原文
        if (!comment) comment = raw;

        MY_TQ_STATE.aiComment = comment;
        MY_TQ_STATE.affDelta = aff;

        $('myTqAiCommentBox').textContent = MY_TQ_STATE.aiComment;

        // 好感度变化
        if (aff !== 0) {
            var affEl = $('myTqAffChange');
            affEl.style.display = 'block';
            affEl.textContent = (aff > 0 ? '+' : '') + aff + ' 好感度';
            affEl.className = 'tq-aff-change ' + (aff > 0 ? 'plus' : 'minus');
            affEl.classList.add('pop');
            var charId = MY_TQ_STATE.charId;
            if (charId && !charId.startsWith('vn_')) {
                var data = getAccData();
                if (data && data.chars) {
                    var ch = data.chars.find(function(c) { return c.id === charId; });
                    if (ch) {
                        ch.affection = Math.min(100, Math.max(0, (ch.affection || 0) + aff));
                        save();
                    }
                }
            } else if (charId && charId.startsWith('vn_')) {
                var vnId = charId.replace('vn_', '');
                var vnCh = getVNChar(vnId);
                if (vnCh && !vnCh.builtin) {
                    vnCh.affection = Math.min(100, Math.max(0, (vnCh.affection || 0) + aff));
                    save();
                }
            }
        }

        // 感想生成成功后更新历史记录里的评语
        var accData = getAccData();
        if (accData && accData.tqHistory && accData.tqHistory.length) {
            var latest = accData.tqHistory[0];
            if (latest.topic === MY_TQ_STATE.topic) {
                latest.aiComment = MY_TQ_STATE.aiComment;
                latest.affDelta = MY_TQ_STATE.affDelta;
                save();
            }
        }

    } catch(e) {
        $('myTqAiCommentBox').textContent = '感想生成失败：' + e.message;
    }
}

// ========== 去聊天 ==========
function myTqGoChat() {
    closePage();
    var charId = MY_TQ_STATE.charId;
    if (!charId || charId.startsWith('vn_')) { openPage('chat'); return; }

    var qaDetail = MY_TQ_STATE.questions.map(function(q, i) {
        return (i + 1) + '. ' + q.q +
            '\n   AI答案：' + (q.aiAnswer || '未作答') + (q.correct ? ' ✓' : ' ✗') +
            '\n   正确答案：' + q.answer +
            (q.aiThought ? '\n   AI想法：' + q.aiThought : '');
    }).join('\n\n');

    var inject = '【刚刚完成了一场用户出题问答，以下是详细记录，请你知晓并自然地融入接下来的对话中】\n' +
        '主题：' + MY_TQ_STATE.topic + '\n' +
        '你的得分：' + MY_TQ_STATE.aiScore + ' / ' + MY_TQ_STATE.questions.length + '\n' +
        '你的感想：' + (MY_TQ_STATE.aiComment || '无') + '\n\n' +
        '答题明细：\n' + qaDetail;

    var data = getAccData();
    if (data && data.chars) {
        var ch = data.chars.find(function(c) { return c.id === charId; });
        if (ch) { ch._tqInject = inject; save(); }
    }

    openPage('chat');
    setTimeout(function() { openChat(charId); }, 200);
}

// ========== 保存历史 ==========
function myTqSaveHistory() {
    var data = getAccData();
    if (!data) return;
    if (!data.tqHistory) data.tqHistory = [];
    var record = {
        id: genId('mytq'),
        time: Date.now(),
        topic: MY_TQ_STATE.topic,
        mode: 'user',
        charId: MY_TQ_STATE.charId,
        charDesc: MY_TQ_STATE.charDesc,
        score: MY_TQ_STATE.aiScore,
        total: MY_TQ_STATE.questions.length,
        aiComment: MY_TQ_STATE.aiComment,
        affDelta: MY_TQ_STATE.affDelta,
        questions: MY_TQ_STATE.questions.map(function(q) {
            return {
                type: q.type, q: q.q, options: q.options,
                answer: q.answer,
                userAnswer: q.aiAnswer,
                correct: q.correct,
                aiAnalysis: q.aiThought || ''
            };
        })
    };
    data.tqHistory.unshift(record);
    if (data.tqHistory.length > 50) data.tqHistory = data.tqHistory.slice(0, 50);
    save();
}