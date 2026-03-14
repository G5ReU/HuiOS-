// ========== AI回复核心 ==========
function doResponse() {
    if (responding) return;
    if (!D.api.key) { toast('请先配置API'); return; }
    responding = true;
    respondingCharId = curChar ? curChar.id : null;
    updateWaitBtn();
    if (curChar && $('crStatus')) {
        $('crStatus').textContent = '正在输入...';
        $('crStatus').classList.add('typing');
    }
    showTyping();
    var sysPrompt = buildSysPrompt();
    var messages = buildMessages(sysPrompt);
    if (D.settings.stream) streamResp(messages);
    else normalResp(messages);
}

function buildSysPrompt() {
    var acc = getCurAcc();
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var charData = data.chars.find(function(c) { return c.id === charId; });
    if (!charData) return '';
    var p = '你是"' + charData.realName + '"，请完全代入角色对话。\n\n';
    if (charData.persona) p += '【角色设定】\n' + charData.persona + '\n\n';
    if (acc && acc.desc) p += '【关于用户"' + acc.persona + '"】\n' + acc.desc + '\n\n';
    var wbContent = getWbContent(charData);
    if (wbContent) p += '【世界观设定】\n' + wbContent + '\n\n';
// 注入近期通话摘要
var callMemCount = charData.callMemoryCount !== undefined ? charData.callMemoryCount : 3;
if (callMemCount > 0) {
    var callLogs = (data.callLogs || []).filter(function(l) { return l.charId === charId; });
    var recentLogs = callLogs.slice(-callMemCount);
    if (recentLogs.length) {
        p += '【近期通话记录】\n';
        recentLogs.forEach(function(log) {
            var d = new Date(log.startTime);
            var dateStr = (d.getMonth()+1) + '/' + d.getDate();
            var dialogLines = (log.messages || []).filter(function(m) { return !m.isAction && m.content; });
            if (!dialogLines.length) return;
            p += dateStr + '（' + (log.type === 'video' ? '视频' : '语音') + '通话，时长' + log.duration + '）：\n';
            dialogLines.forEach(function(m) {
                var name = m.role === 'user' ? (acc ? acc.persona : '用户') : charData.realName;
                p += name + '：' + m.content.slice(0, 60) + '\n';
            });
            p += '\n';
        });
    }
}
    if (charData.injectHeart) {
        var hearts = data.hearts[charId] || [];
        if (hearts.length > 0) {
            var lh = hearts[hearts.length - 1];
            p += '【你上一轮的内心状态】\n';
            if (lh.text) p += '内心想法：' + lh.text + '\n';
            if (lh.state) p += '当时状态：' + lh.state + '\n';
            if (lh.heartRate) p += '当时心率：' + lh.heartRate + ' BPM\n';
            p += '请基于上述状态继续发展情绪和剧情。\n\n';
        }
    }
    p += '【当前时间】' + getTimeStr() + '\n\n';
    var memoInfo = typeof getMemoForAI === 'function' ? getMemoForAI() : '';
    if (memoInfo) p += memoInfo;
    if (D.settings.timeAware) {
        var now = new Date();
        var utc = now.getTime() + now.getTimezoneOffset() * 60000;
        var local = new Date(utc + D.theme.tz * 3600000);
        var hour = local.getHours();
        var days = ['周日','周一','周二','周三','周四','周五','周六'];
        p += '【时间感知】\n现在是' + days[local.getDay()] + '，';
        if (hour < 6) p += '凌晨时分。\n\n';
        else if (hour < 9) p += '早晨时间。\n\n';
        else if (hour < 12) p += '上午时间。\n\n';
        else if (hour < 14) p += '午餐时间。\n\n';
        else if (hour < 18) p += '下午时间。\n\n';
        else if (hour < 20) p += '傍晚时分。\n\n';
        else if (hour < 23) p += '晚上时间。\n\n';
        else p += '深夜了。\n\n';
    }
    // 读取聊天记录中的时间戳信息
    var _chatMsgs = (data.chats[charId] || []).filter(function(m) {
        return m.type !== 'sys' && !m.recalled && m.time;
    });
    if (_chatMsgs.length > 0) {
        var _now = Date.now();
        var _last = _chatMsgs[_chatMsgs.length - 1];
        var _first = _chatMsgs[0];

        p += '【聊天时间感知】\n';
        p += '上条消息时间：' + fmtTimeLabel(_last.time) + '（距现在' + fmtDuration(_now - _last.time) + '）\n';
        p += '本次对话起点：' + fmtTimeLabel(_first.time) + '\n';

        // 找最长沉默间隔（仅超过5分钟才有意义）
        var _maxGap = 0, _maxGapDesc = '';
        for (var _gi = 1; _gi < _chatMsgs.length; _gi++) {
            var _gap = _chatMsgs[_gi].time - _chatMsgs[_gi - 1].time;
            if (_gap > _maxGap) {
                _maxGap = _gap;
                _maxGapDesc = fmtTimeLabel(_chatMsgs[_gi - 1].time) + ' 至 ' + fmtTimeLabel(_chatMsgs[_gi].time);
            }
        }
        if (_maxGap > 5 * 60 * 1000) {
            p += '历史最长沉默：' + fmtDuration(_maxGap) + '（' + _maxGapDesc + '）\n';
        }
        p += '\n';
    }
    if (D.settings.segment) {
        p += '【发消息方式】\n像真人发微信一样，一句话一条消息，用<SPLIT>分开。\n例：嗯嗯<SPLIT>那你现在在干嘛<SPLIT>我刚吃完饭\n每条5-25字左右，自然分段。\n\n';
    }
    p += '【特殊功能】\n';
    p += '- 语音消息：<VOICE>内容</VOICE>\n';
p += '- 内心与状态（每轮必须）：<HEART>内心想法</HEART><STATE>状态描述</STATE><RATE>数字</RATE>（心率，40-180之间的纯数字）\n';
p += '  注意：闭合标签必须有斜杠，如</HEART>，不能写成<HEART>。\n';
    p += '- 拍一拍用户：<PAT>\n';
    p += '- 拍一拍自己：<SELFPAT>\n';
    p += '- 引用：<QUOTE>原话</QUOTE>回复内容\n';
    p += '  引用规则：①只引用用户说的话，不要引用自己说的话；②原话必须是对方消息里实际存在的原文片段，不能改写或捏造；③只在回复内容与被引用的话直接相关时才引用，不要为了引用而引用。\n';
    p += '  ④不要每条消息都引用，不要重复引用同一句话。\n';
    p += '- 撤回：<RECALL>内容</RECALL>\n';
    p += '- 主动给用户打电话：<CALL type="voice">打电话原因</CALL> 或 <CALL type="video">原因</CALL>\n';
if (D.settings.polliOn) p += '- 发图片：<IMAGE>必须使用英文提示词</IMAGE><DESC>中文描述</DESC>\n示例：<IMAGE>a cute girl sitting by the window, soft light, anime style</IMAGE><DESC>一个坐在窗边的可爱女孩</DESC>\n';
    p += '\n【朋友圈功能】\n';
p += '发朋友圈：<MOMENT><IMG>必须使用英文图片提示词</IMG><LOC>地点</LOC>文字内容</MOMENT>\n';
    p += '点赞：<LIKE>id</LIKE>  评论：<COMMENT id="id">内容</COMMENT>  删除：<DEL_MOMENT>id</DEL_MOMENT>\n';
    var myMoments = data.moments.filter(function(m) { return m.authorId === charId; });
    if (myMoments.length > 0) {
        p += '\n【你发过的朋友圈】\n';
        myMoments.forEach(function(mm) {
            p += '- ID:' + mm.id + ' "' + (mm.content || '[图片]').slice(0, 30) + '"\n';
        });
    }
    if (typeof getMapForChar === 'function' && D.maps) {
        var charMap = getMapForChar(charId);
        if (charMap) {
            p += '\n【地图：' + charMap.name + '】\n';
            p += '- 添加地点：<ADDPLACE>{"name":"名","type":"类型","desc":"描述"}</ADDPLACE>\n';
            p += '- 移动：<MOVETO>地点名</MOVETO>  分享位置：<SHARELOC>附言</SHARELOC>\n';
            p += '- 邀请：<INVITE place="地点名">邀请语</INVITE>\n';
        }
    }
    // 钱包信息
    if (typeof getWallet === 'function') {
        var wallet = getWallet();
        p += '\n【钱包功能】\n';
        p += '用户余额：¥' + wallet.balance.toFixed(2) + '\n';
        p += '- 向用户转账：<TRANSFER id="' + genId('tr') + '" amount="金额">备注</TRANSFER>\n';
        p += '- 收款（回应用户转账）：<TRANSFER_ACCEPT id="对应消息的id">说的话</TRANSFER_ACCEPT>\n';
        p += '- 拒收（回应用户转账）：<TRANSFER_REJECT id="对应消息的id">说的话</TRANSFER_REJECT>\n';
        // 列出所有待处理的转账
        var pendingTransfers = (data.chats[charId] || []).filter(function(m) {
            return m.type === 'transfer' && m.status === 'pending';
        });
        if (pendingTransfers.length) {
            p += '\n【待处理转账】\n';
            pendingTransfers.forEach(function(m) {
                if (m.transferDir === 'out') {
                    p += '- 用户向你转账 ¥' + m.amount.toFixed(2) + (m.remark ? '（备注：' + m.remark + '）' : '') + '，消息ID：' + m.id + '，你需要用TRANSFER_ACCEPT或TRANSFER_REJECT回应\n';
                } else {
                    p += '- 你向用户转账 ¥' + m.amount.toFixed(2) + (m.remark ? '（备注：' + m.remark + '）' : '') + '，消息ID：' + m.id + '，等待用户确认\n';
                }
            });
        }
    }
    p += '\n【重要】正常对话不要使用任何标记。\n';
    if (regenCustomPrompt) p += '\n【用户要求】\n' + regenCustomPrompt + '\n';
// 邮箱信息注入
var _charEmail = charData.emailAddress || charData.email;
if (_charEmail) {
    var _userEmail = typeof getUserEmail === 'function' ? getUserEmail() : 'user@lhuy.vip';
    p += '\n【邮箱信息】\n你的邮箱：' + _charEmail + '\n用户邮箱：' + _userEmail + '\n';
    var _allEmails = data.emails || [];
    var _toChar = _allEmails.filter(function(e) {
        return e.folder === 'sent' && e.to === _charEmail;
    }).slice(-5);
    var _fromChar = _allEmails.filter(function(e) {
        return e.folder === 'inbox' && e.from === _charEmail;
    }).slice(-5);
    var _combined = _toChar.concat(_fromChar).sort(function(a, b) { return a.time - b.time; });
    if (_combined.length) {
        p += '【邮件往来记录】\n';
        _combined.forEach(function(e) {
            var dir = e.from === _charEmail ? '你发给用户' : '用户发给你';
            p += dir + '\n主题：' + e.subject + '\n内容：' + e.body.slice(0, 200) + '\n\n';
        });
    } else {
        p += '暂无邮件往来。\n';
    }
    p += '如需给用户发邮件，格式：<EMAIL subject="主题">正文</EMAIL>\n';
}
    p += getMomentsForAI(charData);
    var stickersInfo = typeof getStickersForAI === 'function' ? getStickersForAI(charId) : '';
    if (stickersInfo) p += stickersInfo;
    return p;
}

function getMomentsForAI(charData) {
    var data = getAccData();
    var acc = getCurAcc();
    if (!data || !acc) return '';
    var visibleMoments = data.moments.filter(function(m) { return canSeeMoment(m, charData.id); });
    var recentMoments = visibleMoments.slice(-15);
    if (!recentMoments.length) return '';
    var info = '【最近朋友圈】只能基于以下内容互动，禁止编造：\n';
    recentMoments.forEach(function(m) {
        var authorName = m.authorType === 'user' ? acc.nick + '(用户)' : (data.chars.find(function(c) { return c.id === m.authorId; }) || {}).displayName || '未知';
        if (m.authorId === charData.id) authorName = '你自己';
        info += '- [ID:' + m.id + '] ' + authorName + '：' + (m.content || '').slice(0, 50);
// 图片
if (m.images && m.images.length) {
    m.images.forEach(function(img, k) {
        if (img.desc) info += '\n  [图片' + (k+1) + ': ' + img.desc + ']';
        else info += '\n  [图片' + (k+1) + ': 无描述]';
    });
}
// 加这段↓
if (m.likes && m.likes.length) {
    info += '\n  ❤️' + m.likes.length + '人赞';
}
if (m.comments && m.comments.length) {
    info += '\n  💬评论：\n';
    m.comments.forEach(function(c) {
        var acc = getCurAcc();
        var cName = c.authorId === 'user' ? acc.nick :
            (getAccData().chars.find(function(x) { return x.id === c.authorId; }) || {}).displayName || '未知';
        if (c.authorId === charData.id) cName = '你';
        var replyStr = '';
        if (c.replyToAuthor) {
            var rName = c.replyToAuthor === 'user' ? acc.nick :
                (getAccData().chars.find(function(x) { return x.id === c.replyToAuthor; }) || {}).displayName || '未知';
            replyStr = '回复' + rName + ' ';
        }
        info += '    [评论ID:' + c.id + '] ' + cName + ' ' + replyStr + '：' + c.content.slice(0, 30) + '\n';
    });
}
info += '\n';
        if (m.location) info += ' 📍' + m.location;
        info += '\n';
        if (m.likes && m.likes.length) info += '  ❤️' + m.likes.length + '人赞\n';
        if (m.comments && m.comments.length) info += '  💬' + m.comments.length + '条评论\n';
    });
    return info;
}

function canSeeMoment(moment, charId) {
    if (moment.authorId === charId) return true;
    if (moment.authorType === 'user') {
        if (!moment.visibleGroups || !moment.visibleGroups.length) return true;
        var data = getAccData();
        for (var i = 0; i < moment.visibleGroups.length; i++) {
            var group = data.groups.find(function(g) { return g.id === moment.visibleGroups[i]; });
            if (group && group.charIds && group.charIds.indexOf(charId) >= 0) return true;
        }
        return false;
    }
    var data = getAccData();
    var charGroups = data.groups.filter(function(g) { return g.charIds && g.charIds.indexOf(charId) >= 0; });
    if (charGroups.length === 0) return true;
    for (var i = 0; i < charGroups.length; i++) {
        if (charGroups[i].charIds.indexOf(moment.authorId) >= 0) return true;
    }
    return false;
}

function getWbContent(charData) {
    if (!charData || !charData.wbIds || !charData.wbIds.length) return '';
    var data = getAccData();
    var recent = (data.chats[charData.id] || []).slice(-10).map(function(m) { return m.content || ''; }).join(' ');
    var content = '';
    charData.wbIds.forEach(function(wbId) {
        var wb = D.worldbooks.find(function(w) { return w.id === wbId; });
        if (!wb) return;
        wb.entries.forEach(function(e) {
            if (!e.enabled) return;
            if (e.keys && e.keys.length) {
                var triggered = e.keys.some(function(k) { return recent.indexOf(k) >= 0; });
                if (!triggered) return;
            }
            content += e.content + '\n';
        });
    });
    return content.trim();
}

function getMemContent(charId) {
    var data = getAccData();
    var mems = data.memories[charId] || [];
    if (!mems.length) return '';
    return mems.map(function(m) {
        var d = new Date(m.time);
        return '- ' + (d.getMonth() + 1) + '/' + d.getDate() + '：' + m.content;
    }).join('\n');
}

function buildMessages(sysPrompt) {
    var msgs = [{ role: 'system', content: sysPrompt }];
// 注入二十问记录
var charId = curChar ? curChar.id : respondingCharId;
var _data = getAccData();
if (_data && _data.chars) {
    var _ch = _data.chars.find(function(c) { return c.id === charId; });
    if (_ch && _ch._tqInject) {
        msgs.push({ role: 'system', content: _ch._tqInject });
        delete _ch._tqInject;
        save();
    }
}
    var data = getAccData();
    charId = curChar ? curChar.id : respondingCharId;   // 去掉 var
    var charData = data.chars.find(function(c) { return c.id === charId; });
    var memCount = charData ? charData.memoryCount || 20 : 20;
    var history = (data.chats[charId] || []).filter(function(m) { return m.type !== 'sys' && !m.recalled; }).slice(-memCount);
    history.forEach(function(m, i) {
        var role = m.role === 'user' ? 'user' : 'assistant';
        var content = m.content || '';
        if (m.type === 'location') {
            content = (m.role === 'user' ? '[用户分享了位置: ' : '[分享了位置: ') + (m.placeName || '未知') + ']';
             } else if (m.type === 'transfer') {
    var tDir = m.transferDir === 'out' ? '用户转账给你' : '你转账给用户';
    var tStatus = m.status === 'accepted' ? '已收款' : m.status === 'rejected' ? '已拒收' : '待确认';
    content = '[' + tDir + ' ¥' + (m.amount || 0).toFixed(2) + '，状态：' + tStatus + (m.remark ? '，备注：' + m.remark : '') + (m.status === 'pending' && m.transferDir === 'out' ? '，消息ID：' + m.id : '') + ']';
        } else if (m.type === 'sticker') {
            content = '[' + (m.role === 'user' ? '用户' : '你') + '发送了表情包: ' + (m.stickerDesc || '表情') + ']';
        } else if (m.type === 'image') {
            if (m.role === 'user' && i === history.length - 1 && m.imageUrl && !m.imageDesc) {
                msgs.push({ role: 'user', content: [{ type: 'text', text: '用户发送了图片：' }, { type: 'image_url', image_url: { url: m.imageUrl } }] });
                return;
            }
            content = '[图片: ' + (m.imageDesc || '无描述') + ']';
        } else if (m.type === 'voice') {
            content = '[语音: ' + (m.content || '') + ']';
        }
        if (m.quoteContent) content = '[引用"' + m.quoteContent + '"] ' + content;
        if (content.trim()) msgs.push({ role: role, content: content });
    });
    // 提示AI可以引用最近的用户消息
    var lastUserMsg = null;
    for (var li = history.length - 1; li >= 0; li--) {
        if (history[li].role === 'user') { lastUserMsg = history[li]; break; }
    }
if (lastUserMsg && lastUserMsg.content && lastUserMsg.content.length > 4) {
    msgs.push({
        role: 'system',
        content: '【引用规则】<QUOTE>原话</QUOTE> 仅在你明确回应对方某句具体内容时使用。不要重复引用上一轮已经引用过的话，不要重复引用同一句话。'
    });
}
    return msgs;
}

function normalResp(messages) {
    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({ model: D.api.model, messages: messages, temperature: D.api.temp, top_p: D.api.topP })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        hideTyping();
        if (d.error) throw new Error(d.error.message);
        if (!d.choices || !d.choices[0]) throw new Error('AI返回为空');
        processResp(d.choices[0].message.content);
    })
    .catch(function(e) { hideTyping(); showError(e.message, true); })
    .finally(finishResp);
}

function streamResp(messages) {
    hideTyping();
    var el = $('messages');
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    streamCharId = charId;
    streamFull = '';
    var avatarMode = D.theme.avatarMode || 'none';
    var showAiAvatar = avatarMode === 'ai' || avatarMode === 'both';
    var charData = data.chars.find(function(c) { return c.id === charId; });
    var tmp = document.createElement('div');
    tmp.id = 'streamMsg';
    if (showAiAvatar) {
        tmp.className = 'msg-with-avatar ai bubble-single msg-new';
        var aiAv = charData ? (charData.avatar && charData.avatar.length > 2 ? '<img src="' + charData.avatar + '">' : (charData.avatar || charData.realName.charAt(0))) : '🤖';
        tmp.innerHTML = '<div class="msg-avatar">' + aiAv + '</div><div class="msg-bubble-wrap"><div class="msg-bubble" style="min-height:20px"></div></div>';
    } else {
        tmp.className = 'msg ai bubble-single msg-new';
        tmp.style.margin = '0 12px';
        tmp.innerHTML = '<div class="msg-content-wrap"><div class="msg-bubble" style="min-height:20px"></div></div>';
    }
    el.appendChild(tmp);
    el.scrollTop = el.scrollHeight;
    var bubble = tmp.querySelector('.msg-bubble');
    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({ model: D.api.model, messages: messages, temperature: D.api.temp, top_p: D.api.topP, stream: true })
    })
    .then(function(resp) {
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        var reader = resp.body.getReader();
        streamReader = reader;
        var decoder = new TextDecoder();
        var buffer = '';
        function read() {
            reader.read().then(function(result) {
                if (result.done) {
                    if (tmp.parentNode) tmp.remove();
                    streamReader = null;
                    if (streamFull.trim()) processResp(streamFull);
                    finishResp();
                    return;
                }
                buffer += decoder.decode(result.value, { stream: true });
                var lines = buffer.split('\n');
                buffer = lines.pop();
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line.indexOf('data: ') === 0) {
                        var d = line.slice(6);
                        if (d === '[DONE]') continue;
                        try {
                            var j = JSON.parse(d);
                            var text = j.choices && j.choices[0] && j.choices[0].delta ? j.choices[0].delta.content || '' : '';
                            streamFull += text;
                            if (bubble && tmp.parentNode) {
                                bubble.textContent = streamFull.replace(/<[^>]+>/g, '').replace(/<[^>]*$/g, '');
                                el.scrollTop = el.scrollHeight;
                            }
                        } catch(e) {}
                    }
                }
                read();
            }).catch(function(e) {
                if (tmp.parentNode) tmp.remove();
                streamReader = null;
                showError(e.message, true);
                finishResp();
            });
        }
        read();
    })
    .catch(function(e) {
        if (tmp.parentNode) tmp.remove();
        streamReader = null;
        showError(e.message, true);
        finishResp();
    });
}

function showTyping() {
    hideTyping();
    var el = $('messages');
    var avatarMode = D.theme.avatarMode || 'none';
    var showAiAvatar = avatarMode === 'ai' || avatarMode === 'both';
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var charData = data ? data.chars.find(function(c) { return c.id === charId; }) : null;
    var t = document.createElement('div');
    t.id = 'typingInd';
    if (showAiAvatar) {
        t.className = 'msg-with-avatar ai';
        var aiAv = charData ? (charData.avatar && charData.avatar.length > 2 ? '<img src="' + charData.avatar + '">' : (charData.avatar || charData.realName.charAt(0))) : '🤖';
        t.innerHTML = '<div class="msg-avatar">' + aiAv + '</div><div class="msg-bubble-wrap"><div class="typing-bubble"><span></span><span></span><span></span></div></div>';
    } else {
        t.className = 'typing-ind';
        t.style.margin = '0 12px';
        t.innerHTML = '<span></span><span></span><span></span>';
    }
    el.appendChild(t);
    el.scrollTop = el.scrollHeight;
}

function hideTyping() { var el = $('typingInd'); if (el) el.remove(); }

function finishResp() {
    responding = false;
    var finishedCharId = respondingCharId;
    if (respondingCharId) lastInteract[respondingCharId] = Date.now();
    respondingCharId = null;
    updateWaitBtn();
    if (curChar && $('crStatus')) {
        $('crStatus').textContent = '在线';
        $('crStatus').classList.remove('typing');
    }
    regenCustomPrompt = null;

    // 聊天结束后触发邮件（30%概率，角色需有邮箱）
    if (finishedCharId) {
        var data = getAccData();
        var finishedChar = data.chars.find(function(c) { return c.id === finishedCharId; });
        if (finishedChar && typeof tryTriggerEmailAfterChat === 'function') {
            tryTriggerEmailAfterChat(finishedChar);
        }
    }

    setTimeout(function() {
        if ($('chatPage').classList.contains('active')) renderContacts();
    }, 2000);
}

function processResp(text) {
    var data = getAccData();
    var acc = getCurAcc();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return;
    var savedCharId = charId;
    var charData = data.chars.find(function(c) { return c.id === charId; });
    var charName = charData ? charData.displayName : '角色';

// 修复 AI 漏写闭合斜杠的情况，如 <HEART>...</HEART> 写成 <HEART>...</HEART>
// 第一步：统一 SPLIT 变体
text = text.replace(/<SPL-IT>/gi, '<SPLIT>')
           .replace(/<SPL IT>/gi, '<SPLIT>')
           .replace(/\[SPLIT\]/gi, '<SPLIT>')
           .replace(/< SPLIT >/gi, '<SPLIT>')
           .replace(/<\/SPLIT>/gi, '<SPLIT>');

// 第二步：修复 HEART/STATE/RATE 无闭合标签情况
// 模式：<HEART>内容<STATE>内容<RATE>数字  → 全部加上闭合
text = text.replace(
    /<HEART>([\s\S]*?)<STATE>([\s\S]*?)<RATE>([^\d<]*)(\d+)([^\d<]*?)(?:<\/RATE>)?([\s\S]*?)(?=<[A-Z]|$)/i,
    function(m, h, s, pre, r, post) {
        return '<HEART>' + h + '</HEART><STATE>' + s + '</STATE><RATE>' + r + '</RATE>';
    }
);
// 兜底：<HEART>内容 后面没有任何标签
text = text.replace(/<HEART>([^<]{1,200})(?!\s*<\/HEART>)(?=\s*<STATE>|\s*$)/gi, '<HEART>$1</HEART>');
text = text.replace(/<STATE>([^<]{1,200})(?!\s*<\/STATE>)(?=\s*<RATE>|\s*$)/gi, '<STATE>$1</STATE>');
text = text.replace(/<RATE>([^<]{0,10}\d+[^<]{0,10})(?!\s*<\/RATE>)/gi, '<RATE>$1</RATE>');

// 第三步：把 <TAG>内容<TAG> 修复为 <TAG>内容</TAG>（其他标签）
var _selfCloseTags = ['HEART', 'STATE', 'RATE', 'VOICE', 'MOMENT', 'LIKE', 'COMMENT', 'RECALL', 'IMAGE', 'DESC', 'QUOTE', 'STICKER'];
_selfCloseTags.forEach(function(tag) {
    var re1 = new RegExp('<' + tag + '>([\\s\\S]*?)<' + tag + '>', 'gi');
    text = text.replace(re1, '<' + tag + '>$1</' + tag + '>');
    var re2 = new RegExp('<\\/' + tag + '>([\\s\\S]*?)<\\/' + tag + '>', 'gi');
    text = text.replace(re2, '$1</' + tag + '>');
});
// 提前读取心声数据，必须在删除之前
var heartMatch = text.match(/<HEART>([\s\S]*?)(?:<\/HEART>|<STATE>|$)/i);
var stateMatch = text.match(/<STATE>([\s\S]*?)(?:<\/STATE>|<RATE>|$)/i);
var rateMatch = text.match(/<RATE>[^\d]*(\d+)/i);
if (heartMatch || stateMatch || rateMatch) {
    if (data.hearts[charId]) {
        data.hearts[charId].push({
            text: heartMatch ? heartMatch[1].trim() : '',
            state: stateMatch ? stateMatch[1].trim() : '',
            heartRate: rateMatch ? Math.min(180, Math.max(40, parseInt(rateMatch[1]))) : 72,
            time: Date.now()
        });
        save();
    }
}
// 第四步：兜底清除所有残留的 <HEART> <STATE> <RATE> 及内容（不管什么格式都删掉）
text = text.replace(/<HEART>[\s\S]*?<\/HEART>/gi, '');
text = text.replace(/<STATE>[\s\S]*?<\/STATE>/gi, '');
text = text.replace(/<RATE>[\s\S]*?<\/RATE>/gi, '');
// 真正兜底：如果上面都没匹配到，还有裸标签就直接删
text = text.replace(/<\/?HEART[^>]*>/gi, '');
text = text.replace(/<\/?STATE[^>]*>/gi, '');
text = text.replace(/<\/?RATE[^>]*>/gi, '');

    // 阻止撤回长消息
    var recallCheck = text.match(/<RECALL>([\s\S]*?)<\/RECALL>/);
    if (recallCheck && recallCheck[1].length > 50) {
        text = text.replace(/<RECALL>([\s\S]*?)<\/RECALL>/g, '$1');
    }

    // 拍一拍
    text = text.replace(/<PAT>/g, '|||PAT|||');
    var selfPatCount = (text.match(/<SELFPAT>/g) || []).length;
    for (var sp = 0; sp < Math.min(selfPatCount, 3); sp++) {
        appendMsgToChat(savedCharId, { role: 'sys', type: 'sys', content: charName + ' 拍了拍自己', time: Date.now() });
    }
    text = text.replace(/<SELFPAT>/g, '');

    // 撤回
    var recallMatch = text.match(/<RECALL>([\s\S]*?)<\/RECALL>/);
    if (recallMatch && recallMatch[1].trim().length <= 50) {
        appendMsgToChat(savedCharId, { role: 'ai', content: recallMatch[1].trim(), time: Date.now(), recalled: true, recalledContent: recallMatch[1].trim() });
    }
    text = text.replace(/<RECALL>[\s\S]*?<\/RECALL>/g, '');

    // 朋友圈发布
    var momentMatches = text.match(/<MOMENT>([\s\S]*?)<\/MOMENT>/g) || [];
    momentMatches.forEach(function(mom) {
        var content = mom.replace(/<\/?MOMENT>/g, '').trim();
        var images = [];
        var imgMatches = content.match(/<IMG>([\s\S]*?)<\/IMG>/g) || [];
if (imgMatches.length && D.settings.polliOn) {
    imgMatches.slice(0, 9).forEach(function(img) {
        var prompt = img.replace(/<\/?IMG>/g, '').trim();
        var imgUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + D.settings.polliModel + '&seed=' + Math.floor(Math.random() * 9999) + '&nologo=true';
        if (D.settings.polliKey) imgUrl += '&key=' + encodeURIComponent(D.settings.polliKey);
        images.push({ url: imgUrl, desc: prompt });
    });
}
            content = content.replace(/<IMG>[\s\S]*?<\/IMG>/g, '').trim();

        var locMatch = content.match(/<LOC>([\s\S]*?)<\/LOC>/);
        var location = locMatch ? locMatch[1].trim() : '';
        content = content.replace(/<LOC>[\s\S]*?<\/LOC>/g, '').trim();
        if (content || images.length) {
            data.moments.push({ id: genId('mom'), authorId: charId, authorType: 'ai', content: content, images: images, location: location, visibleGroups: [], likes: [], comments: [], time: Date.now() });
            save();
            appendMsg({ role: 'sys', type: 'sys', content: charName + ' 发了一条朋友圈', time: Date.now() });
        }
    });
    text = text.replace(/<MOMENT>[\s\S]*?<\/MOMENT>/g, '');

    // 朋友圈点赞
    var likeMatches = text.match(/<LIKE>([\s\S]*?)<\/LIKE>/g) || [];
    likeMatches.forEach(function(like) {
        var momId = like.replace(/<\/?LIKE>/g, '').trim();
        var mom = data.moments.find(function(m) { return m.id === momId; });
        if (mom && mom.likes.indexOf(charId) < 0) {
            mom.likes.push(charId);
            save();
            if (mom.authorType === 'user') appendMsg({ role: 'sys', type: 'sys', content: charName + ' 赞了你的朋友圈', time: Date.now() });
        }
    });
    text = text.replace(/<LIKE>[\s\S]*?<\/LIKE>/g, '');

    // 朋友圈评论
    var commentRegex = /<COMMENT\s+id="([^"]+)">([\s\S]*?)<\/COMMENT>/g;
    var cm;
    while ((cm = commentRegex.exec(text)) !== null) {
        var mom = data.moments.find(function(m) { return m.id === cm[1]; });
        if (mom && cm[2].trim()) {
            if (!mom.comments) mom.comments = [];
            mom.comments.push({ id: genId('cmt'), authorId: charId, content: cm[2].trim(), time: Date.now() });
            save();
            if (mom.authorType === 'user') appendMsg({ role: 'sys', type: 'sys', content: charName + ' 评论了你的朋友圈', time: Date.now() });
        }
    }
    text = text.replace(/<COMMENT\s+id="[^"]+">[\s\S]*?<\/COMMENT>/g, '');

    // 删除朋友圈
    var delMatches = text.match(/<DEL_MOMENT>([\s\S]*?)<\/DEL_MOMENT>/g) || [];
    delMatches.forEach(function(del) {
        var momId = del.replace(/<\/?DEL_MOMENT>/g, '').trim();
        var idx = data.moments.findIndex(function(m) { return m.id === momId && m.authorId === charId; });
        if (idx >= 0) { data.moments.splice(idx, 1); save(); appendMsg({ role: 'sys', type: 'sys', content: charName + ' 删除了一条朋友圈', time: Date.now() }); }
    });
    text = text.replace(/<DEL_MOMENT>[\s\S]*?<\/DEL_MOMENT>/g, '');

    // 地图功能
    if (typeof getMapForChar === 'function') {
        var addPlaceMatches = text.match(/<ADDPLACE>([\s\S]*?)<\/ADDPLACE>/g) || [];
        addPlaceMatches.forEach(function(ap) {
            try {
                var placeData = JSON.parse(ap.replace(/<\/?ADDPLACE>/g, '').trim());
                var map = getMapForChar(savedCharId);
                if (map && placeData.name && !map.places.some(function(p) { return p.name === placeData.name; })) {
                    map.places.push({ id: genId('place'), name: placeData.name, type: placeData.type || 'other', desc: placeData.desc || '', x: Math.round(50 + Math.random() * 300), y: Math.round(50 + Math.random() * 300), addedAt: Date.now() });
                    save();
                    appendMsgToChat(savedCharId, { role: 'sys', type: 'sys', content: charName + ' 标记了新地点：' + placeData.name, time: Date.now() });
                }
            } catch(e) {}
        });
        text = text.replace(/<ADDPLACE>[\s\S]*?<\/ADDPLACE>/g, '');

        var moveMatches = text.match(/<MOVETO>([\s\S]*?)<\/MOVETO>/g) || [];
        moveMatches.forEach(function(mv) {
            var placeName = mv.replace(/<\/?MOVETO>/g, '').trim();
            var map = getMapForChar(savedCharId);
            if (map && map.places) {
                var place = map.places.find(function(p) { return p.name.indexOf(placeName) >= 0 || placeName.indexOf(p.name) >= 0; });
                if (place) {
                    var d2 = getAccData();
                    if (!d2.charLocations) d2.charLocations = {};
                    d2.charLocations[savedCharId] = { placeId: place.id, mapId: map.id, time: Date.now() };
                    save();
                }
            }
        });
        text = text.replace(/<MOVETO>[\s\S]*?<\/MOVETO>/g, '');

        var shareMatches = text.match(/<SHARELOC>([\s\S]*?)<\/SHARELOC>/g) || [];
        shareMatches.forEach(function(sl) {
            var msg2 = sl.replace(/<\/?SHARELOC>/g, '').trim();
            var d2 = getAccData();
            var loc = d2.charLocations ? d2.charLocations[savedCharId] : null;
            if (loc && D.maps) {
                var map = D.maps.list.find(function(m) { return m.id === loc.mapId; });
                var place = map && map.places.find(function(p) { return p.id === loc.placeId; });
                if (place) appendMsgToChat(savedCharId, { role: 'ai', type: 'location', placeName: place.name, placeType: place.type, mapId: map.id, mapName: map.name, placeId: place.id, content: msg2, time: Date.now() });
            }
        });
        text = text.replace(/<SHARELOC>[\s\S]*?<\/SHARELOC>/g, '');

        var inviteRegex = /<INVITE\s+place="([^"]+)">([\s\S]*?)<\/INVITE>/g;
        var inv;
        while ((inv = inviteRegex.exec(text)) !== null) {
            var map = getMapForChar(savedCharId);
            if (map && map.places) {
                var place = map.places.find(function(p) { return p.name.indexOf(inv[1]) >= 0; });
                if (place) appendMsgToChat(savedCharId, { role: 'ai', type: 'invite', placeName: place.name, placeType: place.type, placeId: place.id, mapId: map.id, content: inv[2].trim(), time: Date.now() });
            }
        }
        text = text.replace(/<INVITE\s+place="[^"]+">[^<]*<\/INVITE>/g, '');
    }

    // AI转账给用户
    var aiTransferRegex = /<TRANSFER\s+id="([^"]+)"\s+amount="([^"]+)">([\s\S]*?)<\/TRANSFER>/g;
    var atm;
    while ((atm = aiTransferRegex.exec(text)) !== null) {
        processAITransfer(atm[1], atm[2], atm[3].trim());
    }
    text = text.replace(/<TRANSFER\s+id="[^"]+"\s+amount="[^"]+">[\s\S]*?<\/TRANSFER>/g, '');

    // AI确认/拒收转账
    var acceptRegex = /<TRANSFER_ACCEPT\s+id="([^"]+)">([\s\S]*?)<\/TRANSFER_ACCEPT>/g;
    var rejectRegex = /<TRANSFER_REJECT\s+id="([^"]+)">([\s\S]*?)<\/TRANSFER_REJECT>/g;
    var tam;
    while ((tam = acceptRegex.exec(text)) !== null) {
    updateTransferStatus(tam[1], 'accepted');
    var origMsg = findMsgById(tam[1]);
    if (origMsg) {
        appendMsgToChat(savedCharId, {
            id: genId('transfer'),
            role: 'ai',
            type: 'transfer',
            transferDir: 'in',
            amount: origMsg.amount,
            remark: origMsg.remark || '',
            status: 'accepted',
            time: Date.now()
        });
    }
}
text = text.replace(/<TRANSFER_ACCEPT\s+id="[^"]+">[\s\S]*?<\/TRANSFER_ACCEPT>/g, '');
while ((tam = rejectRegex.exec(text)) !== null) {
    updateTransferStatus(tam[1], 'rejected');
    var origMsg2 = findMsgById(tam[1]);
    if (origMsg2) {
        var rjWallet = getWallet();
        rjWallet.balance = Math.round((rjWallet.balance + origMsg2.amount) * 100) / 100;
        saveWallet();
        addBill('transfer_in', origMsg2.amount, '转账退回', '');
        refreshWalletPreview();
        appendMsgToChat(savedCharId, {
            id: genId('transfer'),
            role: 'ai',
            type: 'transfer',
            transferDir: 'in',
            amount: origMsg2.amount,
            remark: '转账退回',
            status: 'rejected',
            time: Date.now()
        });
    }
}
text = text.replace(/<TRANSFER_REJECT\s+id="[^"]+">[\s\S]*?<\/TRANSFER_REJECT>/g, '');

    // AI主动发邮件
    var emailMatches = text.match(/<EMAIL\s+subject="([^"]*)">([\s\S]*?)<\/EMAIL>/g) || [];
    emailMatches.forEach(function(em) {
        var emMatch = em.match(/<EMAIL\s+subject="([^"]*)">([\s\S]*?)<\/EMAIL>/);
        if (!emMatch) return;
        var subject = emMatch[1];
        var body = emMatch[2].trim();
        var charEmailFrom = charData ? (charData.emailAddress || charData.email) : null;
        if (!charEmailFrom) return;
        var newEmail = {
            id: 'email_' + genId(),
            from: charEmailFrom,
            to: getUserEmail(),
            subject: subject,
            body: body,
            time: Date.now(),
            read: false,
            starred: false,
            folder: 'inbox',
            replyTo: null,
            isProactive: true
        };
        data.emails = data.emails || [];
        data.emails.push(newEmail);
        save();
        if (typeof showNotify === 'function') {
            showNotify([{
                name: charData.displayName || charData.realName,
                avatar: charData.avatar,
                content: '📧 ' + subject,
                time: Date.now(),
                accId: D.currentAccId,
                type: 'email'
            }]);
        }
        if (typeof updateEmailBadge === 'function') updateEmailBadge();
        appendMsgToChat(savedCharId, { role: 'sys', type: 'sys', content: charName + ' 给你发了一封邮件：' + subject, time: Date.now() });
    });
    text = text.replace(/<EMAIL\s+subject="[^"]*">[\s\S]*?<\/EMAIL>/g, '');

    // 聊天中发起通话
    var chatCallMatch = text.match(/<CALL\s+type="(voice|video)">([\s\S]*?)<\/CALL>/);
    if (chatCallMatch) {
        var chatCallType = chatCallMatch[1];
        var chatCallReason = chatCallMatch[2].trim();
        text = text.replace(/<CALL\s+type="(voice|video)">[\s\S]*?<\/CALL>/g, '');
        if (typeof aiInitiateCall === 'function') {
            setTimeout(function() {
                aiInitiateCall(savedCharId, chatCallType, chatCallReason);
            }, 500);
        }
    }

    // 语音消息
    var voiceMatches = text.match(/<VOICE>([\s\S]*?)<\/VOICE>/g) || [];
    voiceMatches.forEach(function(v) {
        var vc = v.replace(/<\/?VOICE>/g, '').trim();
        if (vc) appendMsgToChat(savedCharId, { role: 'ai', type: 'voice', content: vc, duration: Math.ceil(vc.length / 5), time: Date.now() });
    });
    text = text.replace(/<VOICE>[\s\S]*?<\/VOICE>/g, '');

    // 表情包
    var stickerMatches = text.match(/<STICKER>([\s\S]*?)<\/STICKER>/g) || [];
    stickerMatches.forEach(function(stk) {
        var desc = stk.replace(/<\/?STICKER>/g, '').trim();
        if (desc) {
            var matched = data.stickers ? data.stickers.find(function(s) { return s.desc === desc || s.desc.indexOf(desc) >= 0 || desc.indexOf(s.desc) >= 0; }) : null;
            if (matched) appendMsgToChat(savedCharId, { role: 'ai', type: 'sticker', stickerUrl: matched.url, stickerDesc: matched.desc, time: Date.now() });
        }
    });
    text = text.replace(/<STICKER>[\s\S]*?<\/STICKER>/g, '');

    // 图片生成
    var imgMatch = text.match(/<IMAGE>([\s\S]*?)<\/IMAGE>/);
    var descMatch = text.match(/<DESC>([\s\S]*?)<\/DESC>/);
    if (imgMatch && D.settings.polliOn) {
        var prompt = imgMatch[1].trim();
        var desc = descMatch ? descMatch[1].trim() : '';
        var imgUrl = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + D.settings.polliModel + '&seed=' + Math.floor(Math.random() * 9999) + '&nologo=true';
        if (D.settings.polliKey) imgUrl += '&key=' + encodeURIComponent(D.settings.polliKey);
        appendMsgToChat(savedCharId, { role: 'ai', type: 'image', imageUrl: imgUrl, imageDesc: desc, time: Date.now() });
        text = text.replace(/<IMAGE>[\s\S]*?<\/IMAGE>/g, '').replace(/<DESC>[\s\S]*?<\/DESC>/g, '');
    }

    // 引用处理
    var quoteMatch = text.match(/<QUOTE>([\s\S]*?)<\/QUOTE>/);
    var quoteContent = '';
    var quoteTime = 0;
    if (quoteMatch) {
        var searchText = quoteMatch[1].trim();
        var chatMsgs = data.chats[savedCharId] || [];
        for (var qi = chatMsgs.length - 1; qi >= 0; qi--) {
            var qMsg = chatMsgs[qi];
            if (qMsg.recalled || qMsg.type === 'sys' || !qMsg.content) continue;
            if (qMsg.content.indexOf(searchText) >= 0 || (searchText.length >= 3 && qMsg.content.indexOf(searchText.slice(0, 5)) >= 0)) {
                quoteTime = qMsg.time;
                quoteContent = qMsg.type === 'image' ? '[图片]' : qMsg.type === 'voice' ? '[语音]' : qMsg.content.slice(0, 50);
                break;
            }
        }
    }

    text = text.trim();
    if (!text) return;

    // 分段发送
    if (D.settings.segment && text.indexOf('<SPLIT>') >= 0) {
        var parts = text.split('<SPLIT>').filter(function(p) { return p.trim(); });
        var delay = 0;
        var usedFirstQuote = false;
        parts.forEach(function(part) {
            part = part.trim();
            if (!part) return;
            var partQuote = '', partQuoteTime = 0;
            var partQuoteMatch = part.match(/<QUOTE>([\s\S]*?)<\/QUOTE>/);
            if (partQuoteMatch) {
                var sq = partQuoteMatch[1].trim();
                var cms = data.chats[savedCharId] || [];
for (var qi2 = cms.length - 1; qi2 >= 0; qi2--) {
                    var qm = cms[qi2];
                    if (qm.recalled || qm.type === 'sys' || !qm.content) continue;
                    if (qm.content.indexOf(sq) >= 0 || (sq.length >= 3 && qm.content.indexOf(sq.slice(0, 5)) >= 0)) {
                        partQuoteTime = qm.time;
                        partQuote = qm.type === 'image' ? '[图片]' : qm.type === 'voice' ? '[语音]' : qm.content.slice(0, 50);
                        break;
                    }
                }
                part = part.replace(/<QUOTE>[\s\S]*?<\/QUOTE>/g, '').trim();
            } else if (!usedFirstQuote && quoteContent) {
                partQuote = quoteContent;
                partQuoteTime = quoteTime;
                usedFirstQuote = true;
            }
            if (!part) return;
            if (part.indexOf('|||PAT|||') >= 0) {
                var subs = part.split('|||PAT|||');
                subs.forEach(function(sub, j) {
                    var s2 = sub.trim();
                    if (s2) {
                        (function(p, q, qt, d, cid) {
                            setTimeout(function() {
                                var msg = { role: 'ai', content: p, time: Date.now() };
                                if (q) { msg.quoteContent = q; msg.quoteTime = qt; }
                                appendMsgToChat(cid, msg);
                            }, d);
                        })(s2, j === 0 ? partQuote : '', partQuoteTime, delay, savedCharId);
                        delay += 300 + Math.min(s2.length * 25, 600);
                    }
                    if (j < subs.length - 1) {
                        (function(d, cid) {
                            setTimeout(function() {
                                appendMsgToChat(cid, { role: 'sys', type: 'sys', content: charName + ' 拍了拍 ' + (acc ? acc.nick : '你'), time: Date.now() });
                            }, d);
                        })(delay, savedCharId);
                        delay += 300;
                    }
                });
            } else {
                (function(p, q, qt, d, cid) {
                    setTimeout(function() {
                        var msg = { role: 'ai', content: p, time: Date.now() };
                        if (q) { msg.quoteContent = q; msg.quoteTime = qt; }
                        appendMsgToChat(cid, msg);
                    }, d);
                })(part, partQuote, partQuoteTime, delay, savedCharId);
                delay += 300 + Math.min(part.length * 25, 600);
            }
        });
    } else {
        text = text.replace(/<QUOTE>[\s\S]*?<\/QUOTE>/g, '');
        if (text.indexOf('|||PAT|||') >= 0) {
            var subs2 = text.split('|||PAT|||');
            var delay2 = 0;
            subs2.forEach(function(sub, i) {
                var s2 = sub.trim();
                if (s2) {
                    (function(p, q, qt, d, cid) {
                        setTimeout(function() {
                            var msg = { role: 'ai', content: p, time: Date.now() };
                            if (q) { msg.quoteContent = q; msg.quoteTime = qt; }
                            appendMsgToChat(cid, msg);
                        }, d);
                    })(s2, i === 0 ? quoteContent : '', quoteTime, delay2, savedCharId);
                    delay2 += 300;
                }
                if (i < subs2.length - 1) {
                    (function(d, cid) {
                        setTimeout(function() {
                            appendMsgToChat(cid, { role: 'sys', type: 'sys', content: charName + ' 拍了拍 ' + (acc ? acc.nick : '你'), time: Date.now() });
                        }, d);
                    })(delay2, savedCharId);
                    delay2 += 300;
                }
            });
        } else {
               var msg = { role: 'ai', content: text, time: Date.now() };
        if (quoteContent) { msg.quoteContent = quoteContent; msg.quoteTime = quoteTime; }
        appendMsgToChat(savedCharId, msg);
        // 检测AI是否说出了自己邮箱
        if (typeof detectEmailInquiry === 'function') {
            detectEmailInquiry(text, charData);
        }
        }
    }
}

function openRegenModal() {
    hideMsgMenu();
    closeFunc();
    $('regenPrompt').value = '';
    openModal('regenModal');
}

function confirmRegen() {
    var prompt = $('regenPrompt').value.trim();
    closeModal('regenModal');
    doRegen(prompt);
}

function doRegen(customPrompt) {
    closeFunc();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return;
    var data = getAccData();
    var msgs = data.chats[charId] || [];
    for (var i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === 'user') break;
        if (msgs[i].role === 'ai' && msgs[i].type !== 'sys') msgs.splice(i, 1);
    }
    save();
    renderMsgs(false);
    if (!responding) { regenCustomPrompt = customPrompt || null; doResponse(); }
}

function recognizeImage(imageData, callback) {
    var api = typeof getApi2 === 'function' ? getApi2() : D.api;
    if (!api.key) { callback('图片'); return; }
    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { role: 'system', content: '请用中文描述这张图片的内容，直接输出描述，不要任何开头语。' },
                { role: 'user', content: [{ type: 'image_url', image_url: { url: imageData } }] }
            ],
            temperature: 0.3,
            max_tokens: 200
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        callback(d.choices[0].message.content.trim());
    })
    .catch(function(e) { console.log('识图失败', e); callback('图片'); });
}

function doBgActivity(char, callback) {
    if (!D.api.key) { if (callback) callback(); return; }
    var acc = getCurAcc();
    var data = getAccData();
    var now = Date.now();

    // 最近50条聊天记录
    var recentMsgs = (data.chats[char.id] || [])
        .filter(function(m) { return !m.recalled && m.type !== 'sys' && m.content; })
        .slice(-50);

    var historyText = recentMsgs.map(function(m) {
        var name = m.role === 'user' ? (acc ? acc.persona : '用户') : char.realName;
        return name + '：' + (m.content || '');
    }).join('\n');

    // 距上次互动时长
    var lastTime = lastInteract[char.id] || 0;
    var gapText = lastTime ? fmtDuration(now - lastTime) : '未知';

    // 当前时间段
    var localHour = new Date(now + D.theme.tz * 3600000 - new Date().getTimezoneOffset() * 60000).getHours();
    var timePeriod = localHour < 6 ? '凌晨' : localHour < 9 ? '早上' : localHour < 12 ? '上午' :
                     localHour < 14 ? '中午' : localHour < 18 ? '下午' : localHour < 22 ? '晚上' : '深夜';

    var sysPrompt = '你是"' + char.realName + '"。\n';
    if (char.persona) sysPrompt += '【角色设定】\n' + char.persona + '\n\n';
    sysPrompt += '【当前时间】' + timePeriod + '\n';
    sysPrompt += '【距上次和用户聊天】' + gapText + '\n\n';

    if (historyText) {
        sysPrompt += '【最近的聊天记录】\n' + historyText + '\n\n';
    }

    sysPrompt += '现在用户不在线，你可以选择主动做一些事，也可以什么都不做。\n';
sysPrompt += '根据你的性格和当前时间，自然地决定：\n\n';
if (D.settings.bgDmOn) sysPrompt += '- 发私信给用户（最多3条，用<DM>内容</DM>）\n';
if (D.settings.bgMomentOn) {
    sysPrompt += '- 发朋友圈（最多1条，用<MOMENT>内容</MOMENT>）\n';
    sysPrompt += '- 点赞朋友圈（用<LIKE>id</LIKE>）\n';
    sysPrompt += '- 评论朋友圈（用<COMMENT id="id">内容</COMMENT>）\n';
}
sysPrompt += '- 给用户打语音电话（用<CALL type="voice">打电话原因</CALL>）\n';
sysPrompt += '- 给用户打视频电话（用<CALL type="video">打电话原因</CALL>）\n';
sysPrompt += '- 什么都不做（回复<IDLE>）\n\n';
sysPrompt += '【重要】要符合角色性格，不要强行活跃，该安静时就<IDLE>。打电话要有合理理由，不能无缘无故打。';

    // 最近朋友圈
    var visibleMoments = data.moments.filter(function(m) {
        return canSeeMoment(m, char.id);
    }).slice(-10);
    if (visibleMoments.length) {
        sysPrompt += '\n\n【最近朋友圈】\n';
        visibleMoments.forEach(function(m) {
            var author = m.authorType === 'user' ? (acc ? acc.nick : '用户') :
                (data.chars.find(function(x) { return x.id === m.authorId; }) || {}).displayName || '未知';
            sysPrompt += '- [ID:' + m.id + '] ' + author + '：' + (m.content || '[图片]').slice(0, 40) + '\n';
        });
    }

    // 15% 概率改为发邮件而不是普通后台活动
    if (typeof maybeCharSendEmail === 'function' && Math.random() < 0.15) {
        var charEmailAddr = char.emailAddress || char.email;
        if (charEmailAddr) {
            maybeCharSendEmail(char);
            if (callback) callback();
            return;
        }
    }

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: '现在是' + timePeriod + '，距上次聊天已经' + gapText + '了，你想做什么？' }
            ],
            temperature: 1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error || !d.choices || !d.choices[0]) { if (callback) callback(); return; }
        processBgResponse(char, d.choices[0].message.content);
        if (callback) callback();
    })
    .catch(function(e) {
        console.log('后台活动失败', e);
        if (callback) callback();
    });
}

function processBgResponse(char, text) {
    if (text.indexOf('<IDLE>') >= 0) return;
// 处理AI主动发起通话
var callBgRegex = /<CALL\s+type="(voice|video)">([\s\S]*?)<\/CALL>/;
var callBgMatch = text.match(callBgRegex);
if (callBgMatch) {
    var callType = callBgMatch[1];
    var callReason = callBgMatch[2].trim();
    if (typeof aiInitiateCall === 'function') {
        aiInitiateCall(char.id, callType, callReason);
    }
    return;
}
    var data = getAccData();
    var acc = getCurAcc();
    var notifications = [];
    var dmMatches = text.match(/<DM>([\s\S]*?)<\/DM>/g) || [];
    dmMatches.slice(0, 3).forEach(function(dm) {
        var content = dm.replace(/<\/?DM>/g, '').trim();
        if (content) {
            if (!data.chats[char.id]) data.chats[char.id] = [];
appendMsgToChat(char.id, { role: 'ai', content: content, time: Date.now() });
notifications.push({ name: char.displayName, avatar: char.avatar, content: content, time: Date.now(), accId: D.currentAccId, charId: char.id });
        }
    });
    var momentMatches = text.match(/<MOMENT>([\s\S]*?)<\/MOMENT>/g) || [];
    if (momentMatches.length) {
        var content = momentMatches[0].replace(/<\/?MOMENT>/g, '').trim();
        var locMatch = content.match(/<LOC>([\s\S]*?)<\/LOC>/);
        var location = locMatch ? locMatch[1].trim() : '';
        content = content.replace(/<LOC>[\s\S]*?<\/LOC>/g, '').trim();
        if (content) {
            data.moments.push({ id: genId('mom'), authorId: char.id, authorType: 'ai', content: content, images: [], location: location, visibleGroups: [], likes: [], comments: [], time: Date.now() });
            notifications.push({ name: char.displayName, avatar: char.avatar, content: '[发了朋友圈] ' + content.slice(0, 20), time: Date.now(), accId: D.currentAccId, charId: char.id });
        }
    }
    var likeMatches = text.match(/<LIKE>([\s\S]*?)<\/LIKE>/g) || [];
    likeMatches.forEach(function(like) {
        var mom = data.moments.find(function(m) { return m.id === like.replace(/<\/?LIKE>/g, '').trim(); });
        if (mom && mom.likes.indexOf(char.id) < 0) mom.likes.push(char.id);
    });
    var commentRegex = /<COMMENT\s+id="([^"]+)">([\s\S]*?)<\/COMMENT>/g;
    var cm;
    while ((cm = commentRegex.exec(text)) !== null) {
        var mom = data.moments.find(function(m) { return m.id === cm[1]; });
        if (mom && cm[2].trim()) {
            if (!mom.comments) mom.comments = [];
            mom.comments.push({ id: genId('cmt'), authorId: char.id, content: cm[2].trim(), time: Date.now() });
        }
    }
    save();
    if (notifications.length) showNotify(notifications);
    if ($('chatPage').classList.contains('active')) renderContacts();
}
// ========== 记忆总结 ==========
function doSummaryNow() {
    if (!curChar) return;
    if (!D.api || !D.api.key) return toast('请先配置API');
    var data = getAccData();
    var charData = data.chars.find(function(c) { return c.id === curChar.id; });
    var memCount = charData ? (charData.memoryCount || 20) : 20;
    // 取最近N条有效消息
    var msgs = (data.chats[curChar.id] || []).filter(function(m) {
        return !m.recalled && m.type !== 'sys' && (m.content || m.imageDesc);
    }).slice(-memCount);
    if (msgs.length < 3) return toast('聊天记录太少，无法总结');
    toast('正在总结记忆...');
    var api = (typeof getApi2 === 'function') ? getApi2() : D.api;
    if (!api || !api.key) api = D.api;
    var acc = getCurAcc();
    var history = msgs.map(function(m) {
        var name = m.role === 'user' ? (acc ? acc.persona : '用户') : curChar.realName;
        var content = m.type === 'image' ? '[图片: ' + (m.imageDesc || '') + ']' :
                      m.type === 'voice' ? '[语音: ' + (m.content || '') + ']' :
                      (m.content || '');
        return name + '：' + content;
    }).join('\n');
    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { role: 'system', content: '请将以下对话内容总结为记忆摘要。要求：保留重要事件、情感变化、关键信息；每个要点单独一行，以"-"开头；总字数控制在200字以内；用中文输出；只输出摘要内容，不要任何开头语。' },
                { role: 'user', content: history }
            ],
            temperature: 0.3,
            max_tokens: 50000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var summary = d.choices[0].message.content.trim();
        if (!data.memories[curChar.id]) data.memories[curChar.id] = [];
        data.memories[curChar.id].push({
            id: genId('mem'),
            content: summary,
            time: Date.now(),
            auto: false
        });
        save();
        toast('记忆已总结并保存');
        // 如果记忆页面开着就刷新
        if (typeof openMemoryPage === 'function' && $('memoryPage').classList.contains('active')) {
            openMemoryPage();
        }
    })
    .catch(function(e) { toast('总结失败：' + e.message); });
}

// ========== 自动总结检测（已在checkAutoSummary里调用）==========
function autoSummaryIfNeeded(charId) {
    var data = getAccData();
    var charData = data.chars.find(function(c) { return c.id === charId; });
    if (!charData || !charData.autoSummary) return;

    var allMsgs = (data.chats[charId] || []).filter(function(m) {
        return !m.recalled && m.type !== 'sys' && (m.content || m.imageDesc);
    });

    var interval = Math.max(20, charData.summaryInterval || 20);

    // 只在消息数量恰好是interval整数倍时触发
    if (allMsgs.length === 0 || allMsgs.length % interval !== 0) return;

    // 防止重复总结：检查最后一条记忆是否已经是对这批消息的总结
    var mems = data.memories[charId] || [];
    var lastMem = mems[mems.length - 1];
    if (lastMem && lastMem.auto && (Date.now() - lastMem.time) < 60000) return;

    var api = (typeof getApi2 === 'function') ? getApi2() : D.api;
    if (!api || !api.key) api = D.api;
    if (!api.key) return;

    var acc = getCurAcc();
    // 取最近interval条进行总结
    var targetMsgs = allMsgs.slice(-interval);
    var history = targetMsgs.map(function(m) {
        var name = m.role === 'user' ? (acc ? acc.persona : '用户') : charData.realName;
        var content = m.type === 'image' ? '[图片: ' + (m.imageDesc || '') + ']' :
                      m.type === 'voice' ? '[语音: ' + (m.content || '') + ']' :
                      (m.content || '');
        return name + '：' + content;
    }).join('\n');

    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { role: 'system', content: '请将以下对话内容总结为记忆摘要。要求：保留重要事件、情感变化、关键信息；每个要点单独一行，以"-"开头；总字数控制在200字以内；用中文输出；只输出摘要内容，不要任何开头语。' },
                { role: 'user', content: history }
            ],
            temperature: 0.3,
            max_tokens: 20000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error || !d.choices || !d.choices[0]) return;
        var summary = d.choices[0].message.content.trim();
        var freshData = getAccData();
        if (!freshData.memories[charId]) freshData.memories[charId] = [];
        freshData.memories[charId].push({
            id: genId('mem'),
            content: summary,
            time: Date.now(),
            auto: true
        });
        save();
        // 如果记忆页面开着就刷新
        if (typeof openMemoryPage === 'function' && $('memoryPage') && $('memoryPage').classList.contains('active')) {
            openMemoryPage();
        }
    })
    .catch(function() {});
}
function checkAutoSummary(charId) {
    var data = getAccData();
    var charData = data.chars.find(function(c) { return c.id === charId; });
    if (!charData || !charData.autoSummary) return;
    setTimeout(function() {
        if (typeof autoSummaryIfNeeded === 'function') autoSummaryIfNeeded(charId);
    }, 500);
}