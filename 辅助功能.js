// ========== 备忘录数据初始化 ==========
if (typeof D.memos === 'undefined') D.memos = {};
if (typeof D.memoSettings === 'undefined') D.memoSettings = { aiAware: false, aiCount: 3 };

function getDateKey(date) {
    var d = date || new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

function getTodayKey() { return getDateKey(new Date()); }

// ========== AI感知 ==========
function getMemoForAI() {
    if (!D.memoSettings || !D.memoSettings.aiAware) return '';
    var todayMemos = D.memos[getTodayKey()] || [];
    if (!todayMemos.length) return '';
    var count = D.memoSettings.aiCount || 3;
    if (count === 0) count = todayMemos.length;
    var memos = todayMemos.slice(0, count);
    var info = '\n【今日备忘】\n';
    var priorityLabel = { high: '[重要]', mid: '', low: '[次要]' };
    memos.forEach(function(m) {
        var status = m.done ? '✓' : '○';
        var star = m.star ? '⭐' : '';
        var pri = priorityLabel[m.priority] || '';
        info += status + ' ' + star + pri + ' ' + m.content + '\n';
    });
    return info;
}

// ========== 初始化 ==========
var memoCurrentDate = new Date();

function initMemo() {
    memoCurrentDate = new Date();
}

// ========== 桌面 Widget ==========
function updateMemoWidget() {
    var widget = $('memoWidget');
    if (!widget) return;
    var todayMemos = D.memos[getTodayKey()] || [];
    if (!todayMemos.length) {
        widget.innerHTML = '<div class="widget-empty">暂无待办事项</div>';
        return;
    }
    // 排序：主要事项优先，再按优先级
    var sorted = todayMemos.slice().sort(function(a, b) {
        if (a.star !== b.star) return (b.star ? 1 : 0) - (a.star ? 1 : 0);
        var po = { high: 0, mid: 1, low: 2 };
        return (po[a.priority] || 1) - (po[b.priority] || 1);
    });
    var h = '<div id="memoWidgetScroll" style="max-height:80px;overflow-y:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none">';
    sorted.forEach(function(m) {
        var done = m.done ? ' done' : '';
        var star = m.star ? '⭐ ' : '';
        h += '<div class="widget-memo-item' + done + '">' + star + esc(m.content) + '</div>';
    });
    h += '</div>';
    widget.innerHTML = h;
    // 隐藏滚动条
    var sc = document.getElementById('memoWidgetScroll');
    if (sc) sc.style.cssText += ';-ms-overflow-style:none';
}

// ========== 日历渲染 ==========
function renderMemoCalendar() {
    var d = memoCurrentDate;
    var year = d.getFullYear();
    var month = d.getMonth();
    var today = new Date();

    $('memoCalTitle').textContent = year + '年' + (month + 1) + '月';

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();
    var daysInPrev = new Date(year, month, 0).getDate();

    var html = '';
    var totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

    for (var i = 0; i < totalCells; i++) {
        var dayNum, curMonth = true;
        if (i < firstDay) {
            dayNum = daysInPrev - firstDay + i + 1;
            curMonth = false;
        } else if (i >= firstDay + daysInMonth) {
            dayNum = i - firstDay - daysInMonth + 1;
            curMonth = false;
        } else {
            dayNum = i - firstDay + 1;
        }

        var cls = 'memo-cal-day';
        if (!curMonth) {
            cls += ' other-month';
        } else {
            var cellDate = new Date(year, month, dayNum);
            var cellKey = getDateKey(cellDate);
            var isToday = (year === today.getFullYear() && month === today.getMonth() && dayNum === today.getDate());
            var isSel = (year === memoCurrentDate.getFullYear() && month === memoCurrentDate.getMonth() && dayNum === memoCurrentDate.getDate());
            var isPast = cellDate < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            if (isSel) cls += ' selected';
            else if (isToday) cls += ' today';
            else if (isPast) cls += ' past';

            var hasMemo = D.memos[cellKey] && D.memos[cellKey].length > 0;
            if (hasMemo) cls += ' has-memo';
        }

        var onclick = curMonth ? ' onclick="selectMemoDate(' + year + ',' + month + ',' + dayNum + ')"' : '';
        html += '<div class="' + cls + '"' + onclick + '>' + dayNum + '</div>';
    }
    $('memoCalDays').innerHTML = html;

    renderMemoDayList();
}

function selectMemoDate(year, month, day) {
    memoCurrentDate = new Date(year, month, day);
    renderMemoCalendar();
}

function prevMonth() {
    memoCurrentDate = new Date(memoCurrentDate.getFullYear(), memoCurrentDate.getMonth() - 1, 1);
    renderMemoCalendar();
}

function nextMonth() {
    memoCurrentDate = new Date(memoCurrentDate.getFullYear(), memoCurrentDate.getMonth() + 1, 1);
    renderMemoCalendar();
}

// ========== 当日列表渲染 ==========
function renderMemoDayList() {
    var key = getDateKey(memoCurrentDate);
    var today = new Date();
    var isToday = (key === getTodayKey());
    var dateStr = isToday ? '今天' :
        (memoCurrentDate.getMonth() + 1) + '月' + memoCurrentDate.getDate() + '日';
    $('memoSelectedDate').textContent = dateStr + ' 的备忘';

    var memos = D.memos[key] || [];
    // 排序：主要优先 → 优先级 → 完成状态（未完成在前）
    var sorted = memos.slice().sort(function(a, b) {
        if (a.star !== b.star) return (b.star ? 1 : 0) - (a.star ? 1 : 0);
        var po = { high: 0, mid: 1, low: 2 };
        var pd = (po[a.priority] || 1) - (po[b.priority] || 1);
        if (pd !== 0) return pd;
        return (a.done ? 1 : 0) - (b.done ? 1 : 0);
    });

    if (!sorted.length) {
        $('memoList').innerHTML = '<div class="memo-empty">这天还没有备忘～</div>';
        return;
    }

    var priColor = { high: '#FF6B6B', mid: '#FFB347', low: '#A8D8EA' };
    var priLabel = { high: '高', mid: '中', low: '低' };

    var html = sorted.map(function(m, i) {
        // 找原始索引
        var realIdx = memos.indexOf(m);
        var done = m.done;
        var priorityC = priColor[m.priority] || priColor.mid;
        var priorityL = priLabel[m.priority] || '中';

        return '<div class="memo-item' + (done ? ' done' : '') + '" id="memoItem_' + key + '_' + realIdx + '">' +
            // 星标
            '<div onclick="toggleMemoStar(\'' + key + '\',' + realIdx + ')" style="font-size:16px;cursor:pointer;flex-shrink:0;opacity:' + (m.star ? '1' : '0.25') + ';transition:opacity 0.2s">⭐</div>' +
            // 勾选圆圈
            '<div class="memo-checkbox' + (done ? ' checked' : '') + '" onclick="toggleMemoDone(\'' + key + '\',' + realIdx + ')">' +
                (done ? '✓' : '') +
            '</div>' +
            // 文字（点击编辑）
            '<div class="memo-text" onclick="openEditMemo(\'' + key + '\',' + realIdx + ')" style="cursor:pointer">' +
                esc(m.content) +
            '</div>' +
            // 优先级标签
            '<div style="font-size:10px;padding:2px 7px;border-radius:8px;background:' + priorityC + '22;color:' + priorityC + ';font-weight:600;flex-shrink:0">' + priorityL + '</div>' +
            // 删除
            '<button class="memo-delete" onclick="deleteMemoItem(\'' + key + '\',' + realIdx + ')">×</button>' +
        '</div>';
    }).join('');

    $('memoList').innerHTML = html;
}

// ========== 操作函数 ==========
function toggleMemoDone(key, idx) {
    if (!D.memos[key] || !D.memos[key][idx]) return;
    D.memos[key][idx].done = !D.memos[key][idx].done;
    save();
    renderMemoDayList();
    renderMemoCalendar();
    updateMemoWidget();
}

function toggleMemoStar(key, idx) {
    if (!D.memos[key] || !D.memos[key][idx]) return;
    D.memos[key][idx].star = !D.memos[key][idx].star;
    save();
    renderMemoDayList();
    updateMemoWidget();
}

function deleteMemoItem(key, idx) {
    if (!D.memos[key]) return;
    D.memos[key].splice(idx, 1);
    if (!D.memos[key].length) delete D.memos[key];
    save();
    renderMemoCalendar();
    updateMemoWidget();
}

// ========== 添加备忘 ==========
function openAddMemo() {
    $('memoContent').value = '';
    $('memoContent').focus();
    // 优先级默认中
    setMemoPriority('mid');
    $('memoStarCheck').checked = false;
    openModal('addMemoModal');
}

function setMemoPriority(p) {
    ['high','mid','low'].forEach(function(v) {
        var btn = $('memoPri_' + v);
        if (!btn) return;
        btn.style.opacity = (v === p) ? '1' : '0.35';
        btn.style.transform = (v === p) ? 'scale(1.08)' : 'scale(1)';
        btn.dataset.sel = (v === p) ? '1' : '0';
    });
}

function getSelectedPriority() {
    var vals = ['high','mid','low'];
    for (var i = 0; i < vals.length; i++) {
        var btn = $('memoPri_' + vals[i]);
        if (btn && btn.dataset.sel === '1') return vals[i];
    }
    return 'mid';
}

function saveMemoItem() {
    var content = $('memoContent').value.trim();
    if (!content) return toast('请输入内容');
    var key = getDateKey(memoCurrentDate);
    if (!D.memos[key]) D.memos[key] = [];
    D.memos[key].push({
        content: content,
        done: false,
        star: $('memoStarCheck').checked,
        priority: getSelectedPriority(),
        time: Date.now()
    });
    save();
    closeModal('addMemoModal');
    renderMemoCalendar();
    updateMemoWidget();
    toast('已添加');
}

// ========== 编辑备忘 ==========
var _editMemoKey = null, _editMemoIdx = -1;

function openEditMemo(key, idx) {
    var m = D.memos[key] && D.memos[key][idx];
    if (!m) return;
    _editMemoKey = key;
    _editMemoIdx = idx;
    $('editMemoContent').value = m.content;
    setEditMemoPriority(m.priority || 'mid');
    $('editMemoStarCheck').checked = !!m.star;
    openModal('editMemoModal');
}

function setEditMemoPriority(p) {
    ['high','mid','low'].forEach(function(v) {
        var btn = $('editMemoPri_' + v);
        if (!btn) return;
        btn.style.opacity = (v === p) ? '1' : '0.35';
        btn.style.transform = (v === p) ? 'scale(1.08)' : 'scale(1)';
        btn.dataset.sel = (v === p) ? '1' : '0';
    });
}

function getEditSelectedPriority() {
    var vals = ['high','mid','low'];
    for (var i = 0; i < vals.length; i++) {
        var btn = $('editMemoPri_' + vals[i]);
        if (btn && btn.dataset.sel === '1') return vals[i];
    }
    return 'mid';
}

function saveEditMemoItem() {
    var content = $('editMemoContent').value.trim();
    if (!content) return toast('请输入内容');
    var m = D.memos[_editMemoKey] && D.memos[_editMemoKey][_editMemoIdx];
    if (!m) return;
    m.content = content;
    m.priority = getEditSelectedPriority();
    m.star = $('editMemoStarCheck').checked;
    save();
    closeModal('editMemoModal');
    renderMemoCalendar();
    updateMemoWidget();
    toast('已保存');
}

// ========== 设置 ==========
function openMemoSettings() {
    $('memoAiAwareOn').checked = !!(D.memoSettings && D.memoSettings.aiAware);
    $('memoAiCount').value = (D.memoSettings && D.memoSettings.aiCount) || 3;
    openModal('memoSettingsModal');
}

function saveMemoSettings() {
    D.memoSettings = {
        aiAware: $('memoAiAwareOn').checked,
        aiCount: parseInt($('memoAiCount').value) || 3
    };
    save();
    closeModal('memoSettingsModal');
    toast('已保存');
}

// ========== 图片识别 ==========
function recognizeImage(imageData, callback) {
    var api = getApi2();
    if (!api || !api.key) {
        api = getApi();
    }
    if (!api || !api.key) {
        callback('图片');
        return;
    }

    var imageContent;
    if (imageData.startsWith('data:image')) {
        // base64
        var mimeMatch = imageData.match(/data:(image\/\w+);base64,/);
        var mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        var base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
        imageContent = {
            type: 'image_url',
            image_url: { url: 'data:' + mimeType + ';base64,' + base64Data }
        };
    } else {
        // url
        imageContent = {
            type: 'image_url',
            image_url: { url: imageData }
        };
    }

    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                {
                    role: 'system',
                    content: '你是专业的图片内容分析助手。请详细分析用户发送的图片，输出准确的中文描述。直接输出描述内容，不要任何开头语。'
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: '请分析这张图片' },
                        imageContent
                    ]
                }
            ],
            temperature: 0.3,
            max_tokens: 50000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        if (!d.choices || !d.choices[0]) throw new Error('无响应');
        var desc = d.choices[0].message.content.trim();
        desc = cleanResponsePrefix(desc);
        callback(desc);
    })
    .catch(function(e) {
        console.log('识图失败', e.message);
        toast('识图失败：' + e.message);
        callback('图片');
    });
}

// ========== 后台活动检测 ==========
function startBgTimer() {
    if (bgTimer) clearInterval(bgTimer);
    if (!D.settings.bgOn) return;
    
    bgTimer = setInterval(function() {
        checkBgActivity();
    }, 30 * 1000);
}

var bgActivityRunning = false;

function checkBgActivity() {
    if (bgActivityRunning) return;
    var data = getAccData();
    if (!data) return;

    var now = Date.now();
var interval = (D.settings.bgInterval || 120) * 1000;

    // 找出所有需要触发的角色
    var candidates = data.chars.filter(function(c) {
        if (!c.bgEnabled) return false;
var last = lastInteract[c.id] || 0;
if (!last) {
    var msgs = (data.chats[c.id] || []);
    var lastMsg = msgs[msgs.length - 1];
    last = lastMsg ? lastMsg.time : 0;
}
if (!last) return false;
        // 距上次互动超过设定时间，且距上次后台活动也超过设定时间
        var lastBg = c.lastBgTime || 0;
        return (now - last >= interval) && (now - lastBg >= interval);
    });

    if (!candidates.length) return;

    bgActivityRunning = true;
    runBgQueue(candidates, 0, function() {
        bgActivityRunning = false;
    });
}

function runBgQueue(chars, idx, done) {
    if (idx >= chars.length) { done(); return; }
    var char = chars[idx];
    doBgActivity(char, function() {
        // 更新该角色的上次后台活动时间
        var data = getAccData();
        var c = data.chars.find(function(x) { return x.id === char.id; });
        if (c) { c.lastBgTime = Date.now(); save(); }
        // 做下一个
        setTimeout(function() {
            runBgQueue(chars, idx + 1, done);
        }, 1000);
    });
}
function openHearts() {
    if (!curChar) return;
    var data = getAccData();
    var hearts = data.hearts[curChar.id] || [];
    var last = hearts.length ? hearts[hearts.length - 1] : null;

    var av = $('heartsAvatar');
    av.innerHTML = curChar.avatar && curChar.avatar.length > 2
        ? '<img src="' + curChar.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
        : (curChar.avatar || curChar.realName.charAt(0));

    $('heartsTitle').textContent = curChar.displayName + ' 的内心';
    $('currentHeartText').textContent = last && last.text ? last.text : '暂无心声';
    $('currentStateText').textContent = last && last.state ? last.state : '暂无状态';
    $('currentHeartTime').textContent = last ? fmtTime(last.time) : '';

    var rateBox = $('heartRateBox');
    if (last && last.heartRate && curChar.showHeartRate) {
        rateBox.style.display = 'flex';
        $('heartRateValue').textContent = last.heartRate;
    } else {
        rateBox.style.display = 'none';
    }

    openModal('heartsModal');
}

function openHeartsList() {
    if (!curChar) return;
    renderHeartsList();
    openModal('heartsListModal');
}

function renderHeartsList() {
    if (!curChar) return;
    var data = getAccData();
    var hearts = data.hearts[curChar.id] || [];
    var reversed = hearts.slice().reverse();
    var h = '';

    if (!reversed.length) {
        h = '<div style="text-align:center;padding:20px;color:var(--text-light)">暂无心声记录</div>';
    } else {
        h += '<div style="text-align:right;padding:0 4px 10px">';
        h += '<button onclick="clearAllHearts()" style="padding:6px 14px;border:none;border-radius:14px;background:#FFE0E0;color:#FF6B6B;font-size:12px;cursor:pointer">🗑 一键清除所有</button>';
        h += '</div>';
        reversed.forEach(function(item, i) {
            var realIdx = hearts.length - 1 - i;
            h += '<div class="heart-list-item" style="position:relative">';
            h += '<div class="heart-list-content">💭 ' + esc(item.text || '无') + '</div>';
            if (item.state) h += '<div class="heart-list-state">🎭 ' + esc(item.state) + '</div>';
            h += '<div class="heart-list-meta">';
            h += '<span class="heart-list-time">' + fmtTime(item.time) + '</span>';
            if (item.heartRate) h += '<span class="heart-list-rate">💓 ' + item.heartRate + ' BPM</span>';
            h += '<span onclick="deleteHeart(' + realIdx + ')" style="color:#FF6B6B;cursor:pointer;margin-left:10px;font-size:12px">删除</span>';
            h += '</div></div>';
        });
    }
    $('heartsListScroll').innerHTML = h;
}

function deleteHeart(idx) {
    if (!curChar) return;
    var data = getAccData();
    if (!data.hearts[curChar.id]) return;
    data.hearts[curChar.id].splice(idx, 1);
    save();
    renderHeartsList();
    toast('已删除');
}

function clearAllHearts() {
    if (!confirm('确定清除所有心声记录？')) return;
    if (!curChar) return;
    var data = getAccData();
    data.hearts[curChar.id] = [];
    save();
    renderHeartsList();
    toast('已清除');
}

function editCurrentHeart() {
    if (!curChar) return;
    var data = getAccData();
    var hearts = data.hearts[curChar.id] || [];
    var last = hearts.length ? hearts[hearts.length - 1] : null;
    $('editHeartText').value = last ? last.text : '';
    $('editStateText').value = last ? last.state : '';
    $('editHeartRate').value = last ? last.heartRate : 72;
    openModal('editHeartModal');
}

function saveEditHeart() {
    if (!curChar) return;
    var data = getAccData();
    var hearts = data.hearts[curChar.id];
    if (!hearts) { data.hearts[curChar.id] = []; hearts = data.hearts[curChar.id]; }
    var entry = {
        text: $('editHeartText').value.trim(),
        state: $('editStateText').value.trim(),
        heartRate: Math.min(180, Math.max(40, parseInt($('editHeartRate').value) || 72)),
        time: Date.now()
    };
    if (hearts.length) {
        hearts[hearts.length - 1] = entry;
    } else {
        hearts.push(entry);
    }
    save();
    closeModal('editHeartModal');
    openHearts();
    toast('已保存');
}
// ========== 心率跳动动画 ==========
var heartRateTimer = null;

function startHeartRateAnimation(bpm) {
    if (heartRateTimer) clearInterval(heartRateTimer);
    var wave = $('heartRateWave');
    var val = $('heartRateValue');
    if (!wave || !val) return;

    var bars = '';
    var pattern = [3, 5, 3, 20, 8, 3, 5, 3, 12, 3, 5, 3];
    for (var i = 0; i < 12; i++) {
        bars += '<span style="--h:' + pattern[i] + 'px"></span>';
    }
    wave.innerHTML = bars;

    val.classList.remove('high', 'very-high');
    if (bpm >= 130) val.classList.add('very-high');
    else if (bpm >= 100) val.classList.add('high');

    var base = bpm;
    heartRateTimer = setInterval(function() {
        var jitter = Math.floor(Math.random() * 11) - 5;
        var display = Math.min(180, Math.max(40, base + jitter));
        val.textContent = display;
    }, 60000 / bpm);
}

// 重写openHearts加入动画
var _openHeartsOrig = openHearts;
openHearts = function() {
    _openHeartsOrig();
    if (!curChar) return;
    var data = getAccData();
    var hearts = data.hearts[curChar.id] || [];
    var last = hearts.length ? hearts[hearts.length - 1] : null;
    if (last && last.heartRate && curChar.showHeartRate) {
        startHeartRateAnimation(last.heartRate);
    }
};