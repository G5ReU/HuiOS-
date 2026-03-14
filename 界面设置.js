function applyTheme() {
    document.documentElement.style.setProperty('--primary', D.theme.color);
    document.documentElement.style.setProperty('--primary-dark', D.theme.colorDark);
    var bg = $('homeBg');
    if (D.theme.homeWp) { bg.style.backgroundImage = 'url(' + D.theme.homeWp + ')'; bg.style.opacity = '0.3'; }
    else { bg.style.backgroundImage = ''; bg.style.opacity = '0'; }
    updateWpPreview('homeWpPreview', D.theme.homeWp);
    updateWpPreview('globalWpPreview', D.theme.globalWp);
}

function updateWpPreview(id, url) {
    var el = $(id); if (!el) return;
    el.innerHTML = url ? '<img src="'+url+'" style="width:100%;height:100%;object-fit:cover">' : '点击设置';
}

function renderColors() {
    var h = '';
    for (var i = 0; i < COLORS.length; i++) {
        var c = COLORS[i], sel = c.c === D.theme.color ? ' sel' : '';
        h += '<div class="color-opt'+sel+'" style="background:linear-gradient(135deg,'+c.c+','+c.d+')" onclick="pickColor('+i+')"></div>';
    }
    $('colorGrid').innerHTML = h;
}

function pickColor(i) {
    D.theme.color = COLORS[i].c;
    D.theme.colorDark = COLORS[i].d;
    save(); applyTheme(); renderColors(); toast('主题已更换');
}

function saveTz() { D.theme.tz = parseFloat($('tzSelect').value); save(); updateClock(); }

function openAvatarSetting() {
    var mode = D.theme.avatarMode || 'none';
    var radios = document.querySelectorAll('input[name="avatarMode"]');
    radios.forEach(function(r) { r.checked = r.value === mode; });
    openModal('avatarSettingModal');
}

function saveAvatarSetting() {
    var radios = document.querySelectorAll('input[name="avatarMode"]');
    var mode = 'none';
    radios.forEach(function(r) { if (r.checked) mode = r.value; });
    D.theme.avatarMode = mode;
    save();
    updateAvatarModeUI();
    closeModal('avatarSettingModal');
    if (curChar) renderMsgs(false);
    toast('已保存');
}

function saveThemeSettings() {
    D.theme.showFuncTips = $('showFuncTipsOn').checked;
D.settings.debugConsoleOn = document.getElementById('debugConsoleOn') ? document.getElementById('debugConsoleOn').checked : false;
save();
if (typeof dbgInit === 'function') dbgInit();
}

function updateAvatarModeUI() {
    var modeText = { none: '不显示', ai: '显示AI头像', user: '显示我的头像', both: '显示两侧' };
    $('avatarModeVal').textContent = (modeText[D.theme.avatarMode] || '不显示') + ' ›';
    $('showFuncTipsOn').checked = D.theme.showFuncTips !== false;
}

function loadSettingsUI() {
    $('streamOn').checked = D.settings.stream;
    $('autoReplyOn').checked = D.settings.autoReply;
    $('delayVal').value = D.settings.delay;
    $('segmentOn').checked = D.settings.segment;
    $('timeAwareOn').checked = D.settings.timeAware;
    $('polliOn').checked = D.settings.polliOn;
    $('polliKey').value = D.settings.polliKey || '';
    $('polliModel').value = D.settings.polliModel || 'flux';
    $('bgOn').checked = D.settings.bgOn;
    $('bgInterval').value = D.settings.bgInterval;
    $('bgDmOn').checked = D.settings.bgDmOn;
    $('bgMomentOn').checked = D.settings.bgMomentOn;
    $('imgSizeSelect').value = D.settings.imgSize || 512;
    $('imgQualityRange').value = D.settings.imgQuality || 0.6;
    $('imgQualityVal').textContent = D.settings.imgQuality || 0.6;
    updateDelayVis();
    updatePolliVis();
    updateBgVis();
    updateApi2Status();
}

function saveSettings() {
    D.settings.stream = $('streamOn').checked;
    D.settings.autoReply = $('autoReplyOn').checked;
    D.settings.delay = parseInt($('delayVal').value) || 0;
    D.settings.segment = $('segmentOn').checked;
    D.settings.timeAware = $('timeAwareOn').checked;
    D.settings.polliOn = $('polliOn').checked;
    D.settings.polliKey = $('polliKey').value.trim();
    D.settings.polliModel = $('polliModel').value;
    D.settings.bgOn = $('bgOn').checked;
    D.settings.bgInterval = parseInt($('bgInterval').value) || 120;
    D.settings.bgDmOn = $('bgDmOn').checked;
    D.settings.bgMomentOn = $('bgMomentOn').checked;
    D.settings.imgSize = parseInt($('imgSizeSelect').value) || 512;
    D.settings.imgQuality = parseFloat($('imgQualityRange').value) || 0.6;
    $('imgQualityVal').textContent = D.settings.imgQuality;
    save();
    startBgTimer();
    updatePolliVis();
    updateBgVis();
    updateDelayVis();
}

function updateDelayVis() {
    var el = document.querySelector('.delay-item');
    if (el) el.style.display = D.settings.autoReply ? 'flex' : 'none';
}

function updatePolliVis() {
    var show = D.settings.polliOn === true;
    document.querySelectorAll('.polli-item').forEach(function(el) {
        el.style.display = show ? 'flex' : 'none';
    });
}

function updateBgVis() {
    var show = D.settings.bgOn === true;
    document.querySelectorAll('.bg-item').forEach(function(el) {
        el.style.display = show ? 'flex' : 'none';
    });
}

function loadApiUI() {
    $('apiUrl').value = D.api.url || 'https://api.openai.com';
    $('apiKey').value = D.api.key || '';
    $('apiTemp').value = D.api.temp || '';
    $('apiTopP').value = D.api.topP || '';
    if (D.api.model) $('modelSelect').innerHTML = '<option value="'+D.api.model+'">'+D.api.model+'</option>';
}

function testApi() {
    var url = ($('apiUrl').value.trim() || 'https://api.openai.com').replace(/\/+$/, '');
    var key = $('apiKey').value.trim();
    if (!key) return toast('请输入密钥');
    var r = $('testResult'); r.style.display = 'block'; r.style.background = '#FFF3CD'; r.textContent = '测试中...';
    fetch(url + '/v1/models', { headers: { 'Authorization': 'Bearer ' + key } })
    .then(function(res) { return res.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var models = d.data || [];
        $('modelSelect').innerHTML = models.map(function(m) { return '<option value="'+m.id+'">'+m.id+'</option>'; }).join('');
        r.style.background = '#D4EDDA'; r.textContent = '✅ 成功！' + models.length + '个模型';
    })
    .catch(function(e) { r.style.background = '#F8D7DA'; r.textContent = '❌ ' + e.message; });
}

function saveApi() {
    D.api.url = $('apiUrl').value.trim() || 'https://api.openai.com';
    D.api.key = $('apiKey').value.trim();
    D.api.model = $('modelSelect').value;
    D.api.temp = parseFloat($('apiTemp').value) || 1;
    D.api.topP = parseFloat($('apiTopP').value) || 1;
    save(); updateApiStatus(); closeModal('apiModal'); toast('已保存');
}

function updateApiStatus() {
    var s = D.api.key && D.api.model ? D.api.model.slice(0,12) + '...' : D.api.key ? '已配置' : '未配置';
    $('apiStatus').textContent = s + ' ›';
}

function updateApi2Status() {
    var el = $('api2Status');
    if (!el) return;
    var s = D.api2.key && D.api2.model ? D.api2.model.slice(0,12) + '...' : D.api2.key ? '已配置' : '未配置';
    el.textContent = s + ' ›';
}

function showApi2Info() {
    alert('副API说明：\n\n用于以下任务：\n• 图片识别（Vision）\n• 生成记忆摘要\n• 总结记忆\n\n如果不配置，将使用主API。\n\n建议：\n使用支持Vision的模型（如gpt-4-vision、claude-3等）');
}

function testApi2() {
    var url = ($('api2Url').value.trim() || 'https://api.openai.com').replace(/\/+$/, '');
    var key = $('api2Key').value.trim();
    if (!key) return toast('请输入密钥');
    var r = $('test2Result'); r.style.display = 'block'; r.style.background = '#FFF3CD'; r.textContent = '测试中...';
    fetch(url + '/v1/models', { headers: { 'Authorization': 'Bearer ' + key } })
    .then(function(res) { return res.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var models = d.data || [];
        $('model2Select').innerHTML = models.map(function(m) { return '<option value="'+m.id+'">'+m.id+'</option>'; }).join('');
        r.style.background = '#D4EDDA'; r.textContent = '✅ 成功！' + models.length + '个模型';
    })
    .catch(function(e) { r.style.background = '#F8D7DA'; r.textContent = '❌ ' + e.message; });
}

function saveApi2() {
    D.api2.url = $('api2Url').value.trim() || 'https://api.openai.com';
    D.api2.key = $('api2Key').value.trim();
    D.api2.model = $('model2Select').value;
    D.api2.temp = parseFloat($('api2Temp').value) || 0.7;
    D.api2.topP = parseFloat($('api2TopP').value) || 1;
    save(); updateApi2Status(); closeModal('api2Modal'); toast('已保存');
}

function loadApi2UI() {
    $('api2Url').value = D.api2.url || 'https://api.openai.com';
    $('api2Key').value = D.api2.key || '';
    $('api2Temp').value = D.api2.temp || 0.7;
    $('api2TopP').value = D.api2.topP || 1;
    if (D.api2.model) $('model2Select').innerHTML = '<option value="'+D.api2.model+'">'+D.api2.model+'</option>';
}

function getApi2() {
    if (D.api2.key && D.api2.model) return D.api2;
    return D.api;
}

function renderPresets() {
    var h = '<option value="">-- 选择预设 --</option>';
    for (var i = 0; i < D.presets.length; i++) h += '<option value="'+i+'">'+esc(D.presets[i].name)+'</option>';
    $('presetSelect').innerHTML = h;
}

function loadPreset() {
    var i = $('presetSelect').value; if (i === '') return;
    var p = D.presets[parseInt(i)]; if (!p) return;
    $('apiUrl').value = p.url || '';
    $('apiKey').value = p.key || '';
    $('apiTemp').value = p.temp || '';
    $('apiTopP').value = p.topP || '';
    if (p.model) $('modelSelect').innerHTML = '<option value="'+p.model+'">'+p.model+'</option>';
    toast('已加载');
}

function savePreset() {
    var name = $('presetName').value.trim(); if (!name) return toast('请输入名称');
    D.presets.push({ name: name, url: $('apiUrl').value.trim(), key: $('apiKey').value.trim(), model: $('modelSelect').value, temp: parseFloat($('apiTemp').value)||1, topP: parseFloat($('apiTopP').value)||1 });
    save(); renderPresets(); closeModal('presetModal'); toast('已保存');
}

function delPreset() {
    var i = $('presetSelect').value; if (i === '') return toast('请选择预设');
    if (!confirm('删除该预设？')) return;
    D.presets.splice(parseInt(i), 1); save(); renderPresets(); toast('已删除');
}

function openUpload(target) {
    uploadTarget = target;
    var showEmoji = ['newAccAvatar','editAccAvatar','charAvatar','editChatAvatar'].indexOf(target) >= 0;
    document.querySelector('.upload-emoji-opt').style.display = showEmoji ? 'block' : 'none';
    var choice = $('uploadChoice');
    // 计算当前最高 z-index，确保盖在所有弹窗上面
    var maxZ = 10000;
    document.querySelectorAll('.modal.active').forEach(function(m) {
        var z = parseInt(m.style.zIndex) || 1000;
        if (z >= maxZ) maxZ = z + 1;
    });
    choice.style.zIndex = maxZ;
    choice.classList.add('active');
}

function doUpload(type) {
    closeChoice('uploadChoice');
    if (type === 'album') {
        var inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*';
        inp.onchange = function(e) {
            var f = e.target.files[0]; if (!f) return;
            var reader = new FileReader();
            reader.onload = function(ev) { applyUpload(ev.target.result); };
            reader.readAsDataURL(f);
        };
        inp.click();
        } else if (type === 'url') {
        $('urlInput').value = '';
        var urlModal = $('urlModal');
        urlModal.style.zIndex = 10001;
        openModal('urlModal');
    } else if (type === 'emoji') {
        $('emojiInput').value = '';
        var emojiModal = $('emojiModal');
        emojiModal.style.zIndex = 10001;
        openModal('emojiModal');
    } else if (type === 'remove') {
        applyUpload('');
    }
}

function confirmUrl() { var v = $('urlInput').value.trim(); closeModal('urlModal'); if (v) applyUpload(v); }
function confirmEmoji() { var v = $('emojiInput').value.trim(); closeModal('emojiModal'); if (v) applyUpload(v); }

function applyUpload(val) {
    var t = uploadTarget;
    if (t === 'newAccAvatar') { $('newAccAvatar').dataset.val = val; $('newAccAvatar').innerHTML = val.length > 2 ? '<img src="'+val+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : (val||'👤'); }
else if (t === 'editAccAvatar') {
    var el = $('editAccAvatar');
    if (el) {
        el.dataset.val = val;
        el.innerHTML = val.length > 2 ? '<img src="'+val+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : (val||'👤');
    }
    // 如果编辑资料弹窗没有打开，说明是从"我的"页面直接点头像，直接保存
    if (!$('editAccModal').classList.contains('active')) {
        var acc = getCurAcc();
        if (acc) { acc.avatar = val; save(); renderMyPage(); toast('头像已更新'); }
    }
}
    else if (t === 'charAvatar') { $('charAvatar').dataset.val = val; $('charAvatar').innerHTML = val.length > 2 ? '<img src="'+val+'" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : (val||'🤖'); }
    else if (t === 'editChatAvatar') { $('editChatAvatar').dataset.val = val; $('editChatAvatar').innerHTML = val.length > 2 ? '<img src="'+val+'" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : (val||'🤖'); }
    else if (t === 'homeWp') { D.theme.homeWp = val; save(); applyTheme(); toast('已设置'); }
    else if (t === 'globalWp') { D.theme.globalWp = val; save(); applyTheme(); toast('已设置'); }
    else if (t === 'chatWp' && curChar) {
        curChar.chatWp = val; save();
        $('messages').style.backgroundImage = val ? 'url('+val+')' : '';
        updateWpPreview('chatWpPreview', val);
        toast('已设置');
    }
}

function updateClock() {
    var now = new Date(), utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var local = new Date(utc + D.theme.tz * 3600000);
    $('clockTime').textContent = String(local.getHours()).padStart(2,'0') + ':' + String(local.getMinutes()).padStart(2,'0');
    $('clockDate').textContent = local.toLocaleDateString('zh-CN', {year:'numeric',month:'long',day:'numeric',weekday:'long'});
    $('clockTz').textContent = (D.theme.tz >= 0 ? 'UTC+' : 'UTC') + D.theme.tz;
}

function getTimeStr() {
    var now = new Date(), utc = now.getTime() + now.getTimezoneOffset() * 60000;
    var local = new Date(utc + D.theme.tz * 3600000), h = local.getHours();
    var p = h < 6 ? '凌晨' : h < 9 ? '早上' : h < 12 ? '上午' : h < 14 ? '中午' : h < 18 ? '下午' : h < 22 ? '晚上' : '深夜';
    return p + h + ':' + String(local.getMinutes()).padStart(2,'0');
}

function openPage(name) {
    var page = $(name + 'Page');
    if (!page) {
        console.error('openPage: 页面不存在 -', name);
        return;
    }
    page.classList.add('active');
    if (name === 'chat') checkAccAndRender();
    else if (name === 'settings') { loadSettingsUI(); updateApiStatus(); }
    else if (name === 'theme') { $('tzSelect').value = D.theme.tz; renderColors(); updateAvatarModeUI(); }
    else if (name === 'worldbook') renderWorldbooks();
    else if (name === 'memo') { initMemo(); renderMemoCalendar(); }
    else if (name === 'health') { /* 健康页面 */ }
    else if (name === 'gameHub') { initVNGame(); }
    else if (name === 'twentyQ') { tqRenderSetup(); }
}

function closePage() { document.querySelectorAll('.page').forEach(function(p) { p.classList.remove('active'); }); }
function openModal(id) {
    var modals = document.querySelectorAll('.modal.active');
    var maxZ = 1000;
    modals.forEach(function(m) {
        var z = parseInt(m.style.zIndex) || 1000;
        if (z >= maxZ) maxZ = z + 1;
    });
    var el = $(id);
    el.style.zIndex = maxZ;
    el.classList.add('active');
    if (id === 'apiModal') { loadApiUI(); renderPresets(); }
}

function closeModal(id) {
    var el = $(id);
    if (el) el.classList.remove('active');
}

function closeChoice(id) { $(id).classList.remove('active'); }
function showError(msg, retry) { $('errorMsg').textContent = msg; $('retryBtn').style.display = retry ? 'block' : 'none'; $('errorModal').classList.add('active'); }
function closeError() { $('errorModal').classList.remove('active'); }

var iosNotifyTimers = {};
var iosNotifyExpanded = false;
var iosNotifyCards = [];

function showNotify(list) {
    if (!list || !list.length) return;
    list.forEach(function(n) {
        addIosNotifyCard(n);
    });
}

function addIosNotifyCard(n) {
    var container = $('iosNotifyContainer');
    if (!container) return;

    var id = 'notify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    iosNotifyCards.push({ id: id, data: n });

    var card = document.createElement('div');
    card.id = id;
    card.style.cssText = [
        'background:rgba(30,30,30,0.85)',
        'backdrop-filter:blur(20px)',
        '-webkit-backdrop-filter:blur(20px)',
        'border-radius:16px',
        'padding:12px 14px',
        'display:flex',
        'align-items:center',
        'gap:10px',
        'pointer-events:all',
        'cursor:pointer',
        'transform:translateY(80px)',
        'opacity:0',
        'transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1),opacity 0.3s ease',
        'user-select:none',
        'position:relative',
        'overflow:hidden'
    ].join(';');

    // 头像
    var avatarEl = document.createElement('div');
    avatarEl.style.cssText = 'width:36px;height:36px;border-radius:50%;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;overflow:hidden';
    if (n.avatar && n.avatar.length > 2) {
        avatarEl.innerHTML = '<img src="' + n.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">';
    } else {
        avatarEl.textContent = n.avatar || n.name.charAt(0);
    }

    // 文字
    var textEl = document.createElement('div');
    textEl.style.cssText = 'flex:1;min-width:0';
    textEl.innerHTML = '<div style="font-size:13px;font-weight:600;color:white;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.name) + '</div>' +
        '<div style="font-size:12px;color:rgba(255,255,255,0.7);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(n.content) + '</div>';

    // 时间
    var timeEl = document.createElement('div');
    timeEl.style.cssText = 'font-size:11px;color:rgba(255,255,255,0.4);flex-shrink:0';
    timeEl.textContent = '现在';

    card.appendChild(avatarEl);
    card.appendChild(textEl);
    card.appendChild(timeEl);

    // 点击跳转
    card.addEventListener('click', function() {
        removeIosNotifyCard(id);
        if (n.accId && n.accId !== D.currentAccId) { D.currentAccId = n.accId; save(); }
        if (n.charId) { openPage('chat'); setTimeout(function() { openChat(n.charId); }, 100); }
    });

    // 向上划走
    var startY = 0;
    card.addEventListener('touchstart', function(e) {
        startY = e.touches[0].clientY;
        if (iosNotifyCards.length > 1) {
            // 长按检测
            card._longPressTimer = setTimeout(function() {
                expandIosNotify();
            }, 500);
        }
    }, { passive: true });
    card.addEventListener('touchmove', function(e) {
        if (card._longPressTimer) { clearTimeout(card._longPressTimer); card._longPressTimer = null; }
        var dy = e.touches[0].clientY - startY;
        if (dy < 0) {
            card.style.transform = 'translateY(' + dy + 'px)';
            card.style.opacity = String(1 + dy / 100);
        }
    }, { passive: true });
    card.addEventListener('touchend', function(e) {
        if (card._longPressTimer) { clearTimeout(card._longPressTimer); card._longPressTimer = null; }
        var dy = e.changedTouches[0].clientY - startY;
        if (dy < -50) {
            removeIosNotifyCard(id);
        } else {
            card.style.transform = 'translateY(0)';
            card.style.opacity = '1';
        }
    });

    container.appendChild(card);
    updateIosNotifyStack();

    // 入场动画
    requestAnimationFrame(function() {
        requestAnimationFrame(function() {
            card.style.transform = 'translateY(0)';
            card.style.opacity = '1';
        });
    });

    // 5秒自动消失
    iosNotifyTimers[id] = setTimeout(function() {
        removeIosNotifyCard(id);
    }, 5000);
}

function removeIosNotifyCard(id) {
    if (iosNotifyTimers[id]) { clearTimeout(iosNotifyTimers[id]); delete iosNotifyTimers[id]; }
    var card = $(id);
    if (card) {
        card.style.transform = 'translateY(80px)';
        card.style.opacity = '0';
        setTimeout(function() { if (card.parentNode) card.parentNode.removeChild(card); }, 400);
    }
    iosNotifyCards = iosNotifyCards.filter(function(x) { return x.id !== id; });
    iosNotifyExpanded = false;
    setTimeout(updateIosNotifyStack, 420);
}

function updateIosNotifyStack() {
    var container = $('iosNotifyContainer');
    if (!container) return;
    var cards = container.querySelectorAll('[id^="notify_"]');
    var total = cards.length;
    if (total === 0) return;

    if (iosNotifyExpanded) {
        // 展开状态：正常列表
        cards.forEach(function(card) {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
            card.style.marginBottom = '0';
        });
        return;
    }

    // 堆叠状态：最多显示3层
    cards.forEach(function(card, i) {
        var fromBottom = total - 1 - i; // 0=最顶层
        if (fromBottom === 0) {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.opacity = '1';
            card.style.zIndex = '10';
        } else if (fromBottom === 1) {
            card.style.transform = 'translateY(6px) scale(0.96)';
            card.style.opacity = '0.7';
            card.style.zIndex = '9';
        } else if (fromBottom === 2) {
            card.style.transform = 'translateY(10px) scale(0.92)';
            card.style.opacity = '0.4';
            card.style.zIndex = '8';
        } else {
            card.style.transform = 'translateY(10px) scale(0.92)';
            card.style.opacity = '0';
            card.style.zIndex = '7';
        }
    });
}

function expandIosNotify() {
    iosNotifyExpanded = true;
    updateIosNotifyStack();
}

function closeNotify() {
    var ids = iosNotifyCards.map(function(x) { return x.id; });
    ids.forEach(function(id) { removeIosNotifyCard(id); });
}

function viewFirstNotify() {
    if (iosNotifyCards.length) {
        var n = iosNotifyCards[iosNotifyCards.length - 1].data;
        closeNotify();
        if (n.accId && n.accId !== D.currentAccId) { D.currentAccId = n.accId; save(); }
        if (n.charId) { openPage('chat'); setTimeout(function() { openChat(n.charId); }, 100); }
    }
}

function closeNotify() { $('notifyOverlay').classList.remove('show'); }
function viewFirstNotify() { if (notifyQueue.length) clickNotify(0); }
function clickNotify(i) {
    var n = notifyQueue[i]; if (!n) return;
    closeNotify();
    if (n.accId && n.accId !== D.currentAccId) { D.currentAccId = n.accId; save(); }
    if (n.charId) { openPage('chat'); setTimeout(function() { openChat(n.charId); }, 100); }
}

function openBgCharSelect() {
    var data = getAccData();
    if (!data) return toast('请先创建账号');
    if (!data.chars || !data.chars.length) return toast('请先创建角色');
    var h = '';
    for (var i = 0; i < data.chars.length; i++) {
        var c = data.chars[i];
        var chk = c.bgEnabled ? ' checked' : '';
        h += '<div style="padding:12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:10px">';
        h += '<input type="checkbox" id="bgc_'+c.id+'"'+chk+' style="width:20px;height:20px">';
        h += '<label for="bgc_'+c.id+'" style="flex:1;cursor:pointer;font-size:14px">'+esc(c.displayName)+'</label>';
        h += '</div>';
    }
    $('bgCharList').innerHTML = h;
    openModal('bgCharModal');
}

function saveBgChars() {
    var data = getAccData();
    data.chars.forEach(function(c) { c.bgEnabled = $('bgc_'+c.id)?.checked || false; });
    save(); closeModal('bgCharModal'); toast('已保存');
}

document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) e.target.classList.remove('active');
    if (e.target.classList.contains('choice-modal')) e.target.classList.remove('active');
    if (e.target.classList.contains('error-modal')) e.target.classList.remove('active');
    if (e.target.id === 'notifyOverlay') closeNotify();
    if (!e.target.closest('.msg-menu') && !e.target.closest('.msg')) hideMsgMenu();
    if (swipedId && !e.target.closest('.contact-item')) {
        document.querySelector('.contact-item[data-id="'+swipedId+'"]')?.classList.remove('swiped');
        swipedId = null;
    }
});

$('viewerImg').addEventListener('click', function(e) { e.stopPropagation(); });

// ========== 主页滑动 ==========
var homeCurrentPage = 0;

function initHomeSwipe() {
    var scrollArea = $('homeScrollArea');
    if (!scrollArea) return;
    scrollArea.addEventListener('scroll', function() {
        var scrollLeft = scrollArea.scrollLeft;
        var pageWidth = scrollArea.offsetWidth;
        var newPage = Math.round(scrollLeft / pageWidth);
        if (newPage !== homeCurrentPage) {
            homeCurrentPage = newPage;
            updateHomeDots();
        }
    });
}

function updateHomeDots() {
    var dots = document.querySelectorAll('.home-dot');
    dots.forEach(function(dot, idx) {
        dot.classList.toggle('active', idx === homeCurrentPage);
    });
}

// ========== 初始化 ==========
async function init() {
    await load();
    applyTheme();
    updateClock();
    setInterval(updateClock, 1000);
    renderColors();
    loadSettingsUI();
    updateApiStatus();
    startBgTimer();
    updateMemoWidget();
    initHomeSwipe();
    if (typeof checkMapDataStructure === 'function') checkMapDataStructure();
}

// ========== 世界书 ==========
function renderWorldbooks() {
    var list = $('wbList');
    if (!D.worldbooks || !D.worldbooks.length) {
        list.innerHTML = '<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-title">还没有世界书</div><div class="empty-desc">创建世界书来丰富AI的背景知识</div><button class="empty-btn" onclick="openCreateWb()">创建世界书</button></div>';
        return;
    }
    list.innerHTML = D.worldbooks.map(function(wb) {
        var total = wb.entries ? wb.entries.length : 0;
        var enabled = wb.entries ? wb.entries.filter(function(e) { return e.enabled !== false; }).length : 0;
        return '<div class="worldbook-item" onclick="openWbDetail(\'' + wb.id + '\')">' +
            '<div class="wb-item-icon">📚</div>' +
            '<div class="worldbook-info">' +
            '<div class="worldbook-name">' + esc(wb.name) + '</div>' +
            '<div class="worldbook-count">' + enabled + ' / ' + total + ' 条目启用</div>' +
            '</div>' +
            '<button onclick="event.stopPropagation();openEditWb(\'' + wb.id + '\')" style="padding:6px 12px;border:none;border-radius:8px;background:var(--primary-light);color:var(--primary-dark);font-size:12px;cursor:pointer;flex-shrink:0">编辑</button>' +
            '</div>';
    }).join('');
}

function openCreateWb() {
    editWbId = null;
    $('wbModalTitle').textContent = '📚 创建世界书';
    $('wbName').value = '';
    $('delWbBtn').style.display = 'none';
    openModal('wbModal');
}

function openEditWb(id) {
    var wb = D.worldbooks.find(function(w) { return w.id === id; });
    if (!wb) return;
    editWbId = id;
    $('wbModalTitle').textContent = '✏️ 编辑世界书';
    $('wbName').value = wb.name;
    $('delWbBtn').style.display = 'block';
    openModal('wbModal');
}

function saveWorldbook() {
    var name = $('wbName').value.trim();
    if (!name) return toast('请输入名称');
    if (editWbId) {
        var wb = D.worldbooks.find(function(w) { return w.id === editWbId; });
        if (wb) wb.name = name;
    } else {
        D.worldbooks.push({ id: genId('wb'), name: name, entries: [] });
    }
    save();
    renderWorldbooks();
    closeModal('wbModal');
    toast('已保存');
}

function delWorldbook() {
    if (!editWbId) return;
    if (!confirm('删除这本世界书及全部条目？')) return;
    D.worldbooks = D.worldbooks.filter(function(w) { return w.id !== editWbId; });
    save();
    renderWorldbooks();
    closeModal('wbModal');
    toast('已删除');
}

function openWbDetail(id) {
    curWbId = id;
    var wb = D.worldbooks.find(function(w) { return w.id === id; });
    if (!wb) return;
    $('wbDetailTitle').textContent = wb.name;
    if ($('wbSearchInput')) $('wbSearchInput').value = '';
    renderWbEntries();
    $('wbDetailPage').classList.add('active');
}

function closeWbDetail() {
    $('wbDetailPage').classList.remove('active');
    renderWorldbooks();
}

function renderWbEntries() {
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    var keyword = $('wbSearchInput') ? $('wbSearchInput').value.trim().toLowerCase() : '';
    var entries = (wb.entries || []).filter(function(e) {
        if (!keyword) return true;
        return (e.name && e.name.toLowerCase().indexOf(keyword) >= 0) ||
               (e.content && e.content.toLowerCase().indexOf(keyword) >= 0) ||
               (e.keys && e.keys.join(',').toLowerCase().indexOf(keyword) >= 0);
    });

    var allEnabled = (wb.entries || []).length > 0 && (wb.entries || []).every(function(e) { return e.enabled !== false; });
    if ($('wbToggleAllBtn')) $('wbToggleAllBtn').textContent = allEnabled ? '全禁用' : '全启用';

    if (!entries.length) {
        $('wbEntryList').innerHTML = keyword
            ? '<div style="text-align:center;padding:40px;color:var(--text-light);font-size:14px">没有匹配的条目</div>'
            : '<div class="empty-state"><div class="empty-icon">📝</div><div class="empty-title">还没有条目</div><div class="empty-desc">点击右上角 + 添加</div></div>';
        return;
    }

    $('wbEntryList').innerHTML = entries.map(function(e) {
        var isEnabled = e.enabled !== false;
        var keyStr = e.keys && e.keys.length ? e.keys.join('、') : '始终触发';
        return '<div class="wb-entry-item" style="opacity:' + (isEnabled ? '1' : '0.45') + ';transition:opacity 0.2s">' +
            '<div class="wb-entry-header">' +
            '<div class="wb-entry-name">' + esc(e.name) + '</div>' +
            '<div style="display:flex;align-items:center;gap:8px">' +
            '<label class="switch" style="transform:scale(0.85)" onclick="event.stopPropagation()">' +
            '<input type="checkbox" ' + (isEnabled ? 'checked' : '') + ' onchange="toggleWbEntry(\'' + e.id + '\',this.checked)">' +
            '<span class="slider"></span></label>' +
            '<button class="wb-entry-btn edit" onclick="openEditWbEntry(\'' + e.id + '\')">编辑</button>' +
            '</div></div>' +
            '<div class="wb-entry-keywords">🔑 ' + esc(keyStr) + '</div>' +
            '<div class="wb-entry-content">' + esc((e.content || '').slice(0, 80)) + ((e.content || '').length > 80 ? '…' : '') + '</div>' +
            '</div>';
    }).join('');
}

function toggleWbEntry(entryId, checked) {
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    var entry = (wb.entries || []).find(function(e) { return e.id === entryId; });
    if (!entry) return;
    entry.enabled = checked;
    save();
    renderWbEntries();
}

function toggleWbAllEnabled() {
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb || !wb.entries) return;
    var allEnabled = wb.entries.every(function(e) { return e.enabled !== false; });
    wb.entries.forEach(function(e) { e.enabled = !allEnabled; });
    save();
    renderWbEntries();
}

function openAddWbEntry() {
    editWbEntryId = null;
    $('wbEntryTitle').textContent = '📝 添加条目';
    $('wbEntryName').value = '';
    $('wbEntryKeys').value = '';
    $('wbEntryContent').value = '';
    $('wbEntryEnabled').checked = true;
    $('delWbEntryBtn').style.display = 'none';
    openModal('wbEntryModal');
}

function openEditWbEntry(id) {
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    var entry = (wb.entries || []).find(function(e) { return e.id === id; });
    if (!entry) return;
    editWbEntryId = id;
    $('wbEntryTitle').textContent = '✏️ 编辑条目';
    $('wbEntryName').value = entry.name;
    $('wbEntryKeys').value = entry.keys ? entry.keys.join(',') : '';
    $('wbEntryContent').value = entry.content || '';
    $('wbEntryEnabled').checked = entry.enabled !== false;
    $('delWbEntryBtn').style.display = 'block';
    openModal('wbEntryModal');
}

function saveWbEntry() {
    var name = $('wbEntryName').value.trim();
    if (!name) return toast('请填写名称');
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    var keys = $('wbEntryKeys').value.split(/[,，]/).map(function(k) { return k.trim(); }).filter(Boolean);
    var enabled = $('wbEntryEnabled').checked;
    if (editWbEntryId) {
        var entry = (wb.entries || []).find(function(e) { return e.id === editWbEntryId; });
        if (entry) {
            entry.name = name;
            entry.keys = keys;
            entry.content = $('wbEntryContent').value.trim();
            entry.enabled = enabled;
        }
    } else {
        if (!wb.entries) wb.entries = [];
        wb.entries.push({
            id: genId('wbe'),
            name: name,
            keys: keys,
            content: $('wbEntryContent').value.trim(),
            enabled: enabled
        });
    }
    save();
    renderWbEntries();
    closeModal('wbEntryModal');
    toast('已保存');
}

function delWbEntry() {
    if (!editWbEntryId) return;
    if (!confirm('删除这条条目？')) return;
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    wb.entries = wb.entries.filter(function(e) { return e.id !== editWbEntryId; });
    save();
    renderWbEntries();
    closeModal('wbEntryModal');
    toast('已删除');
}

function openWbImportExport() {
    openModal('wbImportExportModal');
}

function exportWb() {
    var wb = D.worldbooks.find(function(w) { return w.id === curWbId; });
    if (!wb) return;
    var blob = new Blob([JSON.stringify(wb, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = wb.name + '.json'; a.click();
    URL.revokeObjectURL(url);
    toast('已导出');
}

function exportAllWb() {
    if (!D.worldbooks.length) return toast('没有世界书');
    var blob = new Blob([JSON.stringify(D.worldbooks, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = '全部世界书.json'; a.click();
    URL.revokeObjectURL(url);
    toast('已导出');
}

function onWbImport(e) {
    var file = e.target.files[0]; if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            var data = JSON.parse(ev.target.result);
            var list = Array.isArray(data) ? data : [data];
            var count = 0;
            list.forEach(function(wb) {
                if (!wb.name) return;
                var exists = D.worldbooks.find(function(w) { return w.name === wb.name; });
                if (exists) {
                    (wb.entries || []).forEach(function(e) {
                        if (!exists.entries.find(function(x) { return x.name === e.name; })) {
                            exists.entries.push(Object.assign({ id: genId('wbe'), enabled: true }, e));
                        }
                    });
                } else {
                    D.worldbooks.push({
                        id: genId('wb'),
                        name: wb.name,
                        entries: (wb.entries || []).map(function(e) {
                            return Object.assign({ id: genId('wbe'), enabled: true }, e);
                        })
                    });
                }
                count++;
            });
            save();
            renderWorldbooks();
            closeModal('wbImportExportModal');
            toast('导入了 ' + count + ' 本世界书');
        } catch(err) {
            toast('解析失败：' + err.message);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

// 启动
init();
if (typeof dbgInit === 'function') dbgInit();