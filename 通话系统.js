// ========== 通话系统.js ==========

// ---------- 状态变量 ----------
var callState = {
    active: false,
    type: 'voice',
    charId: null,
    startTime: null,
    timerInterval: null,
    silenceTimer: null,
    aiTypingTimeout: null,
    messages: [],
    currentScene: null,
    sceneImages: [],
    currentBgUrl: null,
    aiTyping: false,
    logId: null,
    retryCount: 0
};

var bubbleDrag = { dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 };
var callRecognition = null;
var callRecognizing = false;

// ---------- 入口：用户发起通话申请 ----------
function startCall(type) {
    if (!curChar) return toast('请先打开聊天');
    if (callState.active) return toast('通话中');
    if (!D.api.key) return toast('请先配置API');

    closeFunc();

    // 在聊天里插入通话申请气泡
    var inviteMsg = {
        id: genId('msg'),
        role: 'user',
        type: 'call_invite',
        callType: type,
        content: '发起了' + (type === 'video' ? '视频' : '语音') + '通话',
        time: Date.now()
    };
    appendMsg(inviteMsg);

    // 插入"等待接听"系统提示
    appendMsg({ role: 'sys', type: 'sys', content: '等待对方接听...', time: Date.now() });

    // AI判断是否接听
    callAIDecidePickup(type);
}

function callAIDecidePickup(type) {
    var char = curChar;
    if (!char) return;
    var acc = getCurAcc();
    var userName = acc ? acc.persona : '用户';

    var systemPrompt = '你是' + char.realName + '。' + (char.persona || '') + '\n'
        + userName + '向你发起了一个' + (type === 'video' ? '视频' : '语音') + '通话请求。\n'
        + '根据你当前的性格和状态，决定是否接听。\n'
        + '如果接听，回复：<CALL_ACCEPT>\n'
        + '如果拒绝，回复：<CALL_REJECT reason="拒绝原因">\n'
        + '只输出标签，不要其他内容。';

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [{ role: 'system', content: systemPrompt }],
            temperature: D.api.temp || 1,
            stream: false
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var reply = d.choices[0].message.content.trim();

        if (reply.indexOf('<CALL_ACCEPT>') >= 0) {
            // 接听
            appendMsg({ role: 'sys', type: 'sys', content: char.displayName + ' 接听了通话', time: Date.now() });
            enterCall(type, char.id);
        } else {
            // 拒绝
            var reasonMatch = reply.match(/<CALL_REJECT\s+reason="([^"]+)"/);
            var reason = reasonMatch ? reasonMatch[1] : '对方暂时无法接听';
            appendMsg({ role: 'sys', type: 'sys', content: char.displayName + ' 拒绝了通话：' + reason, time: Date.now() });
        }
    })
    .catch(function(e) {
        appendMsg({ role: 'sys', type: 'sys', content: '通话请求失败：' + e.message, time: Date.now() });
    });
}

// ---------- AI主动发起通话（后台活动调用） ----------
function aiInitiateCall(charId, type, reason) {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === charId; });
    if (!char) return;
    type = type || 'voice';

    var msg = {
        id: genId('msg'),
        role: 'ai',
        type: 'call_invite',
        callType: type,
        callFromAI: true,
        charId: charId,
        callReason: reason || '',
        content: char.displayName + ' 向你发起了' + (type === 'video' ? '视频' : '语音') + '通话',
        time: Date.now()
    };

    // 直接写入数据，不依赖curChar
    if (!data.chats[charId]) data.chats[charId] = [];
    data.chats[charId].push(msg);
    save();

    // 如果当前正好在这个角色的聊天页，直接渲染
    if (curChar && curChar.id === charId) {
        renderMsgs(false);
        var el = $('messages');
        if (el) el.scrollTop = el.scrollHeight;
    } else {
        // 不在聊天页，更新未读数
        if (!unreadCounts[charId]) unreadCounts[charId] = 0;
        unreadCounts[charId]++;
        if ($('chatPage') && $('chatPage').classList.contains('active')) {
            renderContacts();
        }
    }

    if (typeof showNotify === 'function') {
        showNotify([{
            avatar: char.avatar || char.realName.charAt(0),
            name: char.displayName,
            content: (type === 'video' ? '📹 视频通话邀请' : '📞 语音通话邀请') + (reason ? '：' + reason : ''),
            time: Date.now(),
            accId: D.currentAccId,
            charId: charId
        }]);
    }
}

// ---------- 进入通话界面 ----------
function enterCall(type, charId) {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === charId; });
    if (!char) return;

    callState.active = true;
    callState.type = type;
    callState.charId = charId;
    callState.startTime = Date.now();
    callState.messages = [];
    callState.sceneImages = [];
    callState.currentScene = null;
    callState.currentBgUrl = null;
    callState.aiTyping = false;
    callState.logId = genId('call');
    callState.retryCount = 0;

    renderCallScreen();
    showCallScreen();
    startCallTimer();
    resetSilenceTimer();

    // AI开场白
    setTimeout(function() { callAIGreeting(); }, 600);

    // 视频：生成初始场景
    if (type === 'video' && D.settings.polliOn) {
        callGenInitialScene();
    }
}

// ---------- 用户接听AI发来的通话 ----------
function acceptAICall(msgId) {
    var data = getAccData();
    var charId = null;

    // 找到这条邀请消息对应的charId
    for (var cid in data.chats) {
        var msgs = data.chats[cid];
        for (var i = 0; i < msgs.length; i++) {
            if (msgs[i].id === msgId) { charId = cid; break; }
        }
        if (charId) break;
    }
    if (!charId) return toast('找不到通话邀请');

    var char = data.chars.find(function(c) { return c.id === charId; });
    if (!char) return;

    var type = 'voice';
    for (var cid2 in data.chats) {
        var msgs2 = data.chats[cid2];
        for (var j = 0; j < msgs2.length; j++) {
            if (msgs2[j].id === msgId) { type = msgs2[j].callType || 'voice'; break; }
        }
    }

    appendMsg({ role: 'sys', type: 'sys', content: '你接听了通话', time: Date.now() });
    enterCall(type, charId);
}

function rejectAICall(msgId) {
    var data = getAccData();
    var charId = null;
    for (var cid in data.chats) {
        var msgs = data.chats[cid];
        for (var i = 0; i < msgs.length; i++) {
            if (msgs[i].id === msgId) { charId = cid; break; }
        }
        if (charId) break;
    }
    if (!charId) return;
    appendMsg({ role: 'sys', type: 'sys', content: '你拒绝了通话', time: Date.now() });
}

// ---------- 界面渲染 ----------
function renderCallScreen() {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === callState.charId; });
    if (!char) return;

    var avatarHtml = char.avatar && char.avatar.length > 2
        ? '<img src="' + char.avatar + '" style="width:100%;height:100%;object-fit:cover">'
        : (char.avatar || char.realName.charAt(0));

    $('callAvatarRing').innerHTML = avatarHtml;
    $('callAvatarOnBg').innerHTML = avatarHtml;
    $('callCharName').textContent = char.displayName;
    $('callNameOnBg').textContent = char.displayName;
    $('bubbleAvatar').innerHTML = avatarHtml;
    $('bubbleName').textContent = char.displayName;

    $('callTypeLabel').innerHTML = '<div style="width:8px;height:8px;border-radius:50%;background:#4CAF50"></div>'
        + (callState.type === 'video' ? '视频通话' : '语音通话');

    if (callState.type === 'video') {
        $('callVideoBg').style.display = 'block';
        $('callVoiceAvatar').style.display = 'none';
    } else {
        $('callVideoBg').style.display = 'none';
        $('callVoiceAvatar').style.display = 'flex';
    }

    $('callMessages').innerHTML = '';
    $('callInput').value = '';
}

function showCallScreen() { $('callScreen').style.display = 'flex'; }
function hideCallScreen() { $('callScreen').style.display = 'none'; }

// ---------- 计时器 ----------
function startCallTimer() {
    if (callState.timerInterval) clearInterval(callState.timerInterval);
    callState.timerInterval = setInterval(function() {
        var s = Math.floor((Date.now() - callState.startTime) / 1000);
        var str = pad2(Math.floor(s/3600)) + ':' + pad2(Math.floor((s%3600)/60)) + ':' + pad2(s%60);
        if ($('callTimer')) $('callTimer').textContent = str;
        if ($('bubbleTimer')) $('bubbleTimer').textContent = str;
    }, 1000);
}

function stopCallTimer() {
    if (callState.timerInterval) { clearInterval(callState.timerInterval); callState.timerInterval = null; }
}

function pad2(n) { return n < 10 ? '0' + n : '' + n; }

// ---------- 沉默计时 ----------
function resetSilenceTimer() {
    if (callState.silenceTimer) clearTimeout(callState.silenceTimer);
    callState.silenceTimer = setTimeout(function() {
        if (callState.active && !callState.aiTyping) callAISilencePrompt();
    }, 90000);
}

function clearSilenceTimer() {
    if (callState.silenceTimer) { clearTimeout(callState.silenceTimer); callState.silenceTimer = null; }
}

function callAISilencePrompt() {
    if (!callState.active || callState.aiTyping) return;
    var isVideo = callState.type === 'video';
    var instruction = isVideo
        ? '对方已经沉默超过90秒，你有些好奇或担心，用*动作描写*加2~3句话询问对方怎么了，用<SPLIT>分隔动作和对话。'
        : '对方已经沉默超过90秒，主动说2~3句话，询问对方在干什么或表达关心。';
    callAIRequest(instruction, function(reply) {
        if (!callState.active) return;
        processCallAIReply(reply);
        resetSilenceTimer();
    });
}

// ---------- AI typing 超时保护 ----------
function setAITypingTimeout() {
    if (callState.aiTypingTimeout) clearTimeout(callState.aiTypingTimeout);
    callState.aiTypingTimeout = setTimeout(function() {
        if (callState.aiTyping) {
            callState.aiTyping = false;
            callState.retryCount = 0;
        }
    }, 60000); // 改这里
}

function clearAITypingTimeout() {
    if (callState.aiTypingTimeout) { clearTimeout(callState.aiTypingTimeout); callState.aiTypingTimeout = null; }
}

// ---------- 缩小/恢复 ----------
function minimizeCall() {
    hideCallScreen();
    var bubble = $('callBubble');
    bubble.style.display = 'block';
    bubble.style.right = '16px';
    bubble.style.bottom = '80px';
    bubble.style.left = 'auto';
    bubble.style.top = 'auto';
}

function restoreCall() {
    $('callBubble').style.display = 'none';
    showCallScreen();
}

// ---------- 悬浮小球拖动 ----------
function bubbleDragStart(e) {
    bubbleDrag.dragging = false;
    var touch = e.touches ? e.touches[0] : e;
    bubbleDrag.startX = touch.clientX;
    bubbleDrag.startY = touch.clientY;
    var rect = $('callBubble').getBoundingClientRect();
    bubbleDrag.origX = rect.left;
    bubbleDrag.origY = rect.top;
    if (!e.touches) {
        document.addEventListener('mousemove', bubbleDragMoveDoc);
        document.addEventListener('mouseup', bubbleDragEndDoc);
    }
    e.stopPropagation();
}

function bubbleDragMove(e) {
    var touch = e.touches ? e.touches[0] : e;
    var dx = touch.clientX - bubbleDrag.startX;
    var dy = touch.clientY - bubbleDrag.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) bubbleDrag.dragging = true;
    if (!bubbleDrag.dragging) return;
    var bubble = $('callBubble');
    var newX = Math.max(0, Math.min(bubbleDrag.origX + dx, window.innerWidth - bubble.offsetWidth));
    var newY = Math.max(0, Math.min(bubbleDrag.origY + dy, window.innerHeight - bubble.offsetHeight));
    bubble.style.left = newX + 'px';
    bubble.style.top = newY + 'px';
    bubble.style.right = 'auto';
    bubble.style.bottom = 'auto';
    e.preventDefault();
}

function bubbleDragEnd(e) {
    if (bubbleDrag.dragging) { bubbleDrag.dragging = false; e.stopPropagation(); }
}

function bubbleDragMoveDoc(e) { bubbleDragMove(e); }
function bubbleDragEndDoc(e) {
    bubbleDrag.dragging = false;
    document.removeEventListener('mousemove', bubbleDragMoveDoc);
    document.removeEventListener('mouseup', bubbleDragEndDoc);
}

// ---------- 语音识别 ----------
function callMicStart(e) {
    e.preventDefault();
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return toast('浏览器不支持语音识别，请直接打字');
    $('callMicHint').style.display = 'block';
    $('callMicBtn').style.background = 'rgba(255,68,68,0.6)';
    callRecognition = new SR();
    callRecognition.lang = 'zh-CN';
    callRecognition.continuous = false;
    callRecognition.interimResults = false;
    callRecognition.onresult = function(ev) {
        var text = ev.results[0][0].transcript.trim();
        if (text) {
            var inp = $('callInput');
            inp.value = (inp.value ? inp.value + ' ' : '') + text;
            callAutoGrow(inp);
        }
    };
    callRecognition.onerror = function() {};
    callRecognition.start();
    callRecognizing = true;
}

function callMicEnd(e) {
    e.preventDefault();
    $('callMicHint').style.display = 'none';
    $('callMicBtn').style.background = 'rgba(255,255,255,0.15)';
    if (callRecognition) { callRecognition.stop(); callRecognition = null; }
    callRecognizing = false;
    setTimeout(function() {
        if ($('callInput').value.trim()) callSendMsg();
    }, 300);
}

// ---------- 发送消息 ----------
function callSendMsg() {
    var text = $('callInput').value.trim();
    if (!text || !callState.active) return;
    $('callInput').value = '';
    callAutoGrow($('callInput'));

    var msg = { role: 'user', content: text, time: Date.now() };
    callState.messages.push(msg);
    appendCallBubble('user', text, false);
    resetSilenceTimer();

    setTimeout(function() { callAIReply(); }, 400);
}

function callAutoGrow(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 80) + 'px';
}

// ---------- 气泡渲染 ----------
function appendCallBubble(role, content, isAction) {
    var el = $('callMessages');
    var div = document.createElement('div');
    div.style.cssText = 'display:flex;flex-direction:column;' + (role === 'user' ? 'align-items:flex-end' : 'align-items:flex-start') + ';margin-bottom:4px';

    var bubble = document.createElement('div');
    if (isAction) {
        bubble.style.cssText = 'font-size:12px;color:rgba(255,255,255,0.45);font-style:italic;max-width:88%;line-height:1.6;padding:2px 6px;text-align:center;width:100%';
        bubble.textContent = content;
    } else {
        bubble.style.cssText = 'max-width:75%;padding:10px 14px;border-radius:'
            + (role === 'user' ? '18px 18px 4px 18px;background:var(--primary);color:white'
                               : '18px 18px 18px 4px;background:rgba(255,255,255,0.12);color:white')
            + ';font-size:14px;line-height:1.6;word-break:break-word';
        bubble.textContent = content;
    }

    div.appendChild(bubble);
    el.appendChild(div);
    el.scrollTop = el.scrollHeight;
}

// ---------- AI开场白 ----------
function callAIGreeting() {
    if (!callState.active) return;
    var isVideo = callState.type === 'video';
    var instruction = isVideo
        ? '通话刚刚接通。先写一句*动作/场景描写*，再用2~3句话热情打招呼，用<SPLIT>分隔动作和对话。必须有实质内容，不能只说"喂"。'
        : '通话刚刚接通，用2~3句话热情地打招呼，表达你接到这个电话的心情，可以问对方现在在干嘛。必须有实质内容。';
    callAIRequest(instruction, function(reply) {
        if (!callState.active) return;
        processCallAIReply(reply);
        resetSilenceTimer();
    });
}

// ---------- AI正常回复 ----------
function callAIReply() {
    if (!callState.active || callState.aiTyping) return;
    callState.aiTyping = true;
    callState.retryCount = 0;
    setAITypingTimeout();

    var isVideo = callState.type === 'video';
    var instruction = isVideo
        ? '根据对方说的内容认真回复。先写一句*动作/场景/心理描写*（*包裹），再说2~4句对话，内容要有信息量，可以分享感受、问问题、讲述当前状态。用<SPLIT>分隔动作和对话。如果场景有变化，在最前面加[SCENE: 详细英文场景描述]。如果你想结束通话，在回复末尾加<CALL_END reason="原因">。'
        : '根据对方说的内容认真回复，说2~4句话，内容要有信息量，像真实打电话一样自然，可以问问题、分享当前状态、表达感受。不能只回一两个字。如果你想结束通话，在回复末尾加<CALL_END reason="原因">。';

    callAIRequest(instruction, function(reply) {
        callState.aiTyping = false;
        clearAITypingTimeout();
        if (!callState.active) return;

        // 检测AI是否主动挂断
        var endMatch = reply.match(/<CALL_END\s+reason="([^"]+)">/);
        if (endMatch) {
            var reason = endMatch[1];
            reply = reply.replace(/<CALL_END[^>]*>/g, '').trim();
            if (reply) processCallAIReply(reply);
            setTimeout(function() { aiEndCall(reason); }, 1500 + reply.length * 20);
            return;
        }

        processCallAIReply(reply);
    });
}

// ---------- AI主动挂断 ----------
function aiEndCall(reason) {
    if (!callState.active) return;
    appendCallBubble('ai', reason, true);
    setTimeout(function() { endCall(true); }, 1000);
}

// ---------- 处理AI回复内容 ----------
function processCallAIReply(raw) {
    if (!raw) return;

    // 提取 [SCENE:...] 标记
    var sceneMatch = raw.match(/\[SCENE:\s*([^\]]+)\]/);
    if (sceneMatch) {
        var scene = sceneMatch[1].trim();
        raw = raw.replace(sceneMatch[0], '').trim();
        if (callState.type === 'video' && D.settings.polliOn && scene !== callState.currentScene) {
            callUpdateScene(scene);
        }
    }

    var parts = raw.split(/<SPLIT>/i).map(function(p) { return p.trim(); }).filter(function(p) { return p; });
    var delay = 0;

    parts.forEach(function(part) {
        setTimeout(function() {
            if (!callState.active) return;
            // 识别动作描写
            if (/^\*[^*]+\*$/.test(part)) {
                appendCallBubble('ai', part, true);
                callState.messages.push({ role: 'ai', content: part.slice(1, -1), time: Date.now(), isAction: true });
            } else {
                // 混合内容拆分
                var segments = part.split(/(\*[^*]+\*)/g);
                segments.forEach(function(seg) {
                    seg = seg.trim();
                    if (!seg) return;
                    if (/^\*[^*]+\*$/.test(seg)) {
                        appendCallBubble('ai', seg, true);
                        callState.messages.push({ role: 'ai', content: seg.slice(1,-1), time: Date.now(), isAction: true });
                    } else {
                        appendCallBubble('ai', seg, false);
                        callState.messages.push({ role: 'ai', content: seg, time: Date.now(), isAction: false });
                    }
                });
            }
        }, delay);
        delay += 300 + part.length * 18;
    });
}

// ---------- AI请求（含重试） ----------
function callAIRequest(instruction, callback) {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === callState.charId; });
    if (!char) return;

    var systemPrompt = buildCallSystemPrompt(char);

    // 最近20条对话历史
    var history = callState.messages.slice(-20).map(function(m) {
        return { role: m.role === 'user' ? 'user' : 'assistant', content: m.content };
    });

    var messages = [{ role: 'system', content: systemPrompt }]
        .concat(history)
        .concat([{ role: 'user', content: instruction }]);

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: messages,
            temperature: D.api.temp || 1,
            stream: false
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        callState.retryCount = 0;
        callback(d.choices[0].message.content.trim());
    })
    .catch(function(e) {
    console.error('通话AI请求失败', e);
    if (callState.retryCount < 1) {
        callState.retryCount++;
        setTimeout(function() { callAIRequest(instruction, callback); }, 5000); // 改这里
    } else {
        callState.retryCount = 0;
        callState.aiTyping = false;
        clearAITypingTimeout();
    }
});
}

// ---------- 系统提示词 ----------
function buildCallSystemPrompt(char) {
    var acc = getCurAcc();
    var data = getAccData();
    var userName = acc ? acc.persona : '用户';
    var isVideo = callState.type === 'video';

    var base = '你是' + char.realName + '。' + (char.persona || '') + '\n\n';
    base += '【当前情境】\n';
    base += '你正在与' + userName + '进行' + (isVideo ? '视频' : '语音') + '通话。\n\n';
    base += '【回复规则】\n';
    base += '1. 每次回复必须有实质内容，说2~4句话，不能只回一两个字或语气词。\n';
    base += '2. 像真实' + (isVideo ? '视频' : '语音') + '通话一样自然，可以问问题、分享状态、表达感受。\n';
    base += '3. 必须回复，不能沉默或敷衍。\n';
    base += '4. 不要重复对方刚说过的话。\n';
    base += '5. 保持角色性格，内容要有信息量。\n';

    if (isVideo) {
        base += '6. 视频通话中，在对话前写一句*动作/场景/心理描写*（用*包裹）。\n';
        base += '7. 场景变化时在回复最前面加[SCENE: 详细英文场景描述，包含光线、环境、氛围]。\n';
        base += '   当前场景：' + (callState.currentScene || '未知') + '\n';
    }

    base += '8. 如果你想结束通话（情节需要），在回复末尾加<CALL_END reason="挂断原因">。\n\n';

    // 世界书
    if (char.wbIds && char.wbIds.length) {
        var wbTexts = [];
        D.worldbooks.filter(function(wb) { return char.wbIds.indexOf(wb.id) >= 0; })
            .forEach(function(wb) {
                (wb.entries || []).filter(function(e) { return e.enabled !== false; })
                    .forEach(function(e) { wbTexts.push(e.content); });
            });
        if (wbTexts.length) base += '【世界观设定】\n' + wbTexts.join('\n') + '\n\n';
    }

    // 记忆
    var memories = data.memories[char.id] || [];
    if (memories.length) {
        base += '【记忆摘要】\n';
        memories.slice(-3).forEach(function(m) { base += m.content + '\n'; });
        base += '\n';
    }

    // 注入历史通话记录
    var callMemoryCount = char.callMemoryCount !== undefined ? char.callMemoryCount : 3;
    if (callMemoryCount > 0) {
        var logs = (data.callLogs || []).filter(function(l) { return l.charId === char.id; });
        var recentLogs = logs.slice(-callMemoryCount);
        if (recentLogs.length) {
            base += '【历史通话记录（最近' + recentLogs.length + '次）】\n';
            recentLogs.forEach(function(log, idx) {
                var d = new Date(log.startTime);
                base += '第' + (idx + 1) + '次（' + (d.getMonth()+1) + '/' + d.getDate() + '，时长' + log.duration + '）：\n';
                var dialogMsgs = (log.messages || []).filter(function(m) { return !m.isAction; });
                dialogMsgs.slice(-10).forEach(function(m) {
                    var name = m.role === 'user' ? userName : char.realName;
                    base += name + '：' + m.content + '\n';
                });
                base += '\n';
            });
        }
    }

    return base;
}

// ---------- 视频通话生图 ----------
function callGenInitialScene() {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === callState.charId; });
    if (!char) return;

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: '你是' + char.realName + '。' + (char.persona || '') },
                { role: 'user', content: '根据你的人设，用详细的英文描述你现在所在的场景，包含光线、环境、氛围、细节，直接输出英文描述，不要其他内容。' }
            ],
            temperature: 0.7,
            stream: false
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) return;
        callUpdateScene(d.choices[0].message.content.trim());
    })
    .catch(function() {});
}

function callUpdateScene(sceneDesc) {
    if (!sceneDesc) return;
    if (callState.currentBgUrl) {
        callState.sceneImages.push({ scene: callState.currentScene, url: callState.currentBgUrl });
    }
    callState.currentScene = sceneDesc;

    var loading = $('callBgLoading');
    if (loading) loading.style.display = 'flex';

    var url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(sceneDesc)
        + '?model=' + (D.settings.polliModel || 'flux')
        + '&seed=' + Math.floor(Math.random() * 99999)
        + '&nologo=true&width=800&height=450';
    if (D.settings.polliKey) url += '&key=' + encodeURIComponent(D.settings.polliKey);

    var img = new Image();
    img.onload = function() {
        callState.currentBgUrl = url;
        var bgImg = $('callBgImg');
        if (bgImg) { bgImg.src = url; bgImg.style.display = 'block'; }
        if (loading) loading.style.display = 'none';
    };
    img.onerror = function() {
        if (loading) loading.style.display = 'none';
    };
    img.src = url;
}

// ---------- 结束通话 ----------
function endCall(byAI) {
    if (!callState.active) return;

    var duration = Date.now() - callState.startTime;
    var durationStr = formatCallDuration(duration);

    stopCallTimer();
    clearSilenceTimer();
    clearAITypingTimeout();

    if (callRecognition) { callRecognition.stop(); callRecognition = null; }

    saveCallLog(durationStr);
    insertCallBubble(durationStr, byAI);

    callState.active = false;
    callState.charId = null;
    callState.messages = [];
    callState.sceneImages = [];
    callState.aiTyping = false;

    hideCallScreen();
    $('callBubble').style.display = 'none';

    toast('通话已结束，时长 ' + durationStr);
}

function formatCallDuration(ms) {
    var s = Math.floor(ms / 1000);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + ':' + pad2(m) + ':' + pad2(sec);
    return pad2(m) + ':' + pad2(sec);
}

function saveCallLog(durationStr) {
    var data = getAccData();
    if (!data) return;
    if (!data.callLogs) data.callLogs = [];
    data.callLogs.push({
        id: callState.logId,
        charId: callState.charId,
        type: callState.type,
        startTime: callState.startTime,
        duration: durationStr,
        messages: callState.messages.slice()
    });
    save();
}

function insertCallBubble(durationStr, byAI) {
    if (!callState.charId) return;
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === callState.charId; });
    if (!char) return;

    var label = (callState.type === 'video' ? '视频通话' : '语音通话');
    var extra = byAI ? '（对方挂断）' : '';

    var msg = {
        id: genId('msg'),
        role: 'sys',
        type: 'call',
        callType: callState.type,
        callLogId: callState.logId,
        callDuration: durationStr + extra,
        content: label + ' ' + durationStr + extra,
        time: Date.now()
    };

    var savedCurChar = curChar;
    if (!curChar || curChar.id !== callState.charId) {
        curChar = char;
    }
    appendMsg(msg);
    curChar = savedCurChar;
}

// ---------- 通话记录查看 ----------
function openCallLogs() {
    if (!curChar) return toast('请先打开聊天');
    var data = getAccData();
    var logs = (data.callLogs || []).filter(function(l) { return l.charId === curChar.id; });

    if (!logs.length) {
        $('callLogsList').innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light)">暂无通话记录</div>';
    } else {
        var h = '';
        for (var i = logs.length - 1; i >= 0; i--) {
            var l = logs[i];
            var icon = l.type === 'video' ? '📹' : '📞';
            var label = l.type === 'video' ? '视频通话' : '语音通话';
            var d = new Date(l.startTime);
            var dateStr = d.getFullYear() + '/' + pad2(d.getMonth()+1) + '/' + pad2(d.getDate())
                + ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
            h += '<div onclick="openCallDetail(\'' + l.id + '\')" style="display:flex;align-items:center;gap:12px;padding:14px 12px;border-bottom:1px solid #f0f0f0;cursor:pointer">';
            h += '<span style="font-size:24px">' + icon + '</span>';
            h += '<div style="flex:1"><div style="font-size:14px;font-weight:500">' + label + '</div>';
            h += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">' + dateStr + '</div></div>';
            h += '<div style="font-size:13px;color:var(--text-gray)">' + l.duration + ' ›</div>';
            h += '</div>';
        }
        $('callLogsList').innerHTML = h;
    }
    openModal('callLogsModal');
}

function openCallDetail(logId) {
    var data = getAccData();
    var log = (data.callLogs || []).find(function(l) { return l.id === logId; });
    if (!log) return toast('记录不存在');

    var char = (data.chars || []).find(function(c) { return c.id === log.charId; });
    var charName = char ? char.displayName : '未知';
    var acc = getCurAcc();
    var userName = acc ? acc.nick : '我';

    var icon = log.type === 'video' ? '📹' : '📞';
    $('callDetailTitle').textContent = icon + ' ' + (log.type === 'video' ? '视频通话' : '语音通话') + ' · ' + log.duration;

    var h = '';
    if (!log.messages || !log.messages.length) {
        h = '<div style="text-align:center;padding:20px;color:var(--text-light)">无对话记录</div>';
    } else {
        log.messages.forEach(function(m) {
            var name = m.role === 'user' ? userName : charName;
            var t = new Date(m.time);
            var timeStr = pad2(t.getHours()) + ':' + pad2(t.getMinutes()) + ':' + pad2(t.getSeconds());
            if (m.isAction) {
                h += '<div style="text-align:center;padding:4px 8px;margin:4px 0">';
                h += '<span style="font-size:12px;color:var(--text-light);font-style:italic">*' + esc(m.content) + '*</span>';
                h += '</div>';
            } else {
                h += '<div style="margin:8px 0;' + (m.role === 'user' ? 'text-align:right' : '') + '">';
                h += '<div style="font-size:11px;color:var(--text-light);margin-bottom:3px">' + esc(name) + ' · ' + timeStr + '</div>';
                h += '<div style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;font-size:13px;line-height:1.5;'
                    + (m.role === 'user' ? 'background:var(--primary);color:white' : 'background:#f0f0f0;color:#333') + '">';
                h += esc(m.content) + '</div></div>';
            }
        });
    }
    $('callDetailList').innerHTML = h;
    closeModal('callLogsModal');
    openModal('callDetailModal');
}

function viewCallDetail(logId) {
    if (!logId) return;
    openCallDetail(logId);
}