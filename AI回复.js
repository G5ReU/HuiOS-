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
    var memContent = getMemContent(charId, 12);
    if (memContent) p += '【长期记忆】\n' + memContent + '\n\n';
// 注入近期通话摘要
var slim = getPromptSlimOpts(charData);
var callMemCount = slim.callMemCount;
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
var nowTs = Date.now();
var local = getDateInThemeTz(nowTs);
var tzHour = getThemeTzOffsetHours();

p += '【当前时间】' + fmtDateTimeByThemeTz(nowTs) + '（UTC' + (tzHour >= 0 ? '+' : '') + tzHour + '，24小时制）\n\n';

var memoInfo = typeof getMemoForAI === 'function' ? getMemoForAI() : '';
if (memoInfo) p += memoInfo;
var anchorList = typeof getRecentQuoteAnchorsForAI === 'function'
    ? getRecentQuoteAnchorsForAI(charId, 20)
    : [];

if (anchorList.length) {
    p += '【最近可引用片段】\n';
    anchorList.forEach(function(a) {
        var who = a.role === 'ai' ? '你' : '用户';
        p += '[' + a.id + '][' + who + '] ' + a.text + '\n';
    });
    p += '\n';
}


if (D.settings.timeAware) {
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
        // ===== 强提醒：距上次消息太久 =====
        var _lastGap = _now - _last.time;
        if (_lastGap > 24 * 60 * 60 * 1000) {
            var _gapDays = Math.floor(_lastGap / (24*60*60*1000));
            p += '\n⚠️【重要：你们已经' + _gapDays + '天没聊了！】\n';
            p += '你必须意识到时间已经过去很久了。之前聊的话题（比如点外卖、约见面、要做某事等）如果没有后续，就已经过期作废了。\n';
            p += '不要继续之前未完成的话题，除非用户主动提起。像真人一样，隔了这么久再聊，应该先打个新的招呼或关心一下对方。\n\n';
        } else if (_lastGap > 4 * 60 * 60 * 1000) {
            var _gapHours = Math.floor(_lastGap / (60*60*1000));
            p += '\n⚠️【注意：距上次聊天已过' + _gapHours + '小时】\n';
            p += '之前的话题（如果有未完成的事）可能已不再有效，不要强行续接，除非用户主动提起。\n\n';
        } else if (_lastGap > 30 * 60 * 1000) {
            p += '\n💡 距上次聊天已过' + Math.floor(_lastGap / (60*1000)) + '分钟，注意话题可能已切换。\n\n';
        }

        p += '\n';
    }
            if (D.settings.segment) {
        p += '【微信聊天习惯】\n';
        p += '你正在拿着手机和用户聊微信，要像真人聊天一样发消息。\n';
        p += '1. 短句优先，能拆开的尽量拆开，不要把好几句情绪话、催促话、撒娇话、吐槽话硬塞进一整段。\n';
        p += '2. 连发多条消息时，必须使用<SPLIT>作为唯一分隔符。\n';
        p += '3. 遇到这种口语短句时，尽量分开发：比如“……”“小洄。”“你知不知道你在说什么。”“去睡觉。听话。”“晚安。”这种不要合成一大段。\n';
        p += '4. 不要输出空白行，不要连续换行，不要拿普通回车代替<SPLIT>。\n';
        p += '5. 长短句结合，但整体要像真人发微信，不要总是一整坨。\n';
        p += '示例：你在干嘛呀<SPLIT>我刚吃完饭\n\n';
    } else {
        p += '【微信聊天习惯】\n你正在拿着手机和用户聊微信，回复长度适中，符合现代人打字习惯，绝对不要有机器人的说教感。\n\n';
    }

    p += '【特殊互动功能】\n';
    p += '- 发语音：<VOICE>你想发成语音的话</VOICE>\n';
    p += '- 拍一拍用户：<PAT> / 拍自己：<SELFPAT> / 撤回打错的话：<RECALL>要撤回的字</RECALL>\n';
    p += '- 主动打电话：<CALL type="voice">打电话的理由</CALL> 或 <CALL type="video">打视频的理由</CALL>\n';
    if (D.settings.polliOn) {
        p += '- 发手机照片：<IMAGE>英文画面提示词</IMAGE><DESC>中文描述</DESC>\n';
    }

    p += '- 发链接分享：<LINK url="virtual" title="搜索关键词" desc="一句简介">附带文字</LINK>\n';
    p += '  ⚠️ 你并不知道真实URL，绝对不要编造网址、域名、路径、参数，也不要在正文里输出 http/https 链接。\n';
    p += '  系统会根据 title 自动搜索真实网页并替换成真正可打开的链接。\n';
    p += '  title 必须写得具体，最好带平台名、主题词、作者名、作品名、关键词，不要只写“这个视频”“一首歌”“那个帖子”。\n';
    p += '  正确示例：<LINK url="virtual" title="李荣浩 乌梅子酱 网易云音乐" desc="这首最近一直在循环">你听这个</LINK>\n';
    p += '  正确示例：<LINK url="virtual" title="猫咪踩奶搞笑合集 bilibili" desc="这个真的很好笑">你看这个哈哈哈</LINK>\n';
    p += '  错误示例：<LINK url="https://xxx.com/abc" title="好东西" desc="很好看">你看</LINK>\n';
p += '- 引用回复：<QUOTE id="锚点ID">聊天里真实出现过的原文片段</QUOTE>你的回复内容\n';
p += '- 引用回复：<QUOTE id="锚点ID">聊天里真实出现过的原文片段</QUOTE>你的回复内容\n';
p += '  【引用规则】\n';
p += '  1. 引用是"单条消息级别"的，不是整轮回复级别。\n';
p += '  2. <QUOTE> 必须放在它所绑定的那一条消息最开头，而不是整段输出最开头。\n';
p += '  3. 如果你要连发多条消息，必须用 <SPLIT> 分开；想让第几条带引用，就把 <QUOTE> 写在第几条里面。\n';
p += '  4. 例如：第一条普通消息<SPLIT><QUOTE id="qa_xxx">绝对不吃</QUOTE>现在又饿了？ 这表示第二条带引用。\n';
p += '  5. 再例如：第一条<SPLIT>第二条<SPLIT><QUOTE id="qa_xxx">绝对不吃</QUOTE>现在又饿了？ 这表示第三条带引用。\n';
p += '  6. 不要默认把引用总是放在整轮输出的第一条，除非你真的想让第一条消息带引用。\n';
p += '  7. 正确格式只能是：<QUOTE id="锚点ID">原文片段</QUOTE>你的回复内容\n';
p += '  8. id 只能从【最近可引用片段】里选。\n';
p += '  9. <QUOTE> 内的文字必须和该 id 对应的原文片段一字不差，不能改写、扩写、缩写、替换同义词。\n';
p += '  10. 你可以引用用户的话，也可以引用你自己之前的话，但都必须来自聊天里真实出现过的原文。\n';
p += '  11. 一条消息里最多只用 1 个 <QUOTE>。\n';
p += '  12. 错误示例：<QUOTE id="qa_xxx">绝对不吃</QUOTE>第一条<SPLIT>第二条 这会让引用落在第一条。\n';
p += '  13. 严禁输出 [引用"..."]、【引用：...】、引用: ... 这类文字前缀；系统只识别 <QUOTE>...</QUOTE>。\n';
p += '  14. 不要总是在第一句话或固定位置输出，要积极搭配位置和多次引用以丰富内容和达到活人感。\n';
    p += '\n【排版要求】\n';
    p += '1. 不要输出空白行，不要连续换行。\n';
    p += '2. 需要连发多条消息时，只能使用 <SPLIT>，不要用普通换行代替分条。\n';
    p += '3. 普通文本尽量保持单段，不要随意回车。\n';

    p += '\n【心理与状态追踪】（每轮回复的最后【必须】附带）\n';
    p += '格式：<HEART>当前内心最真实的os/碎碎念</HEART><STATE>当前的动作神态/微表情</STATE><RATE>当前心率(40-180纯数字)</RATE>\n';
    p += '注意：标签必须写对闭合斜杠，如</HEART>。\n';
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
}).slice(-slim.emailCount);
    var _fromChar = _allEmails.filter(function(e) {
        return e.folder === 'inbox' && e.from === _charEmail;
}).slice(-slim.emailCount);
    var _combined = _toChar.concat(_fromChar).sort(function(a, b) { return a.time - b.time; });
    if (_combined.length) {
        p += '【邮件往来记录】\n';
        _combined.forEach(function(e) {
            var dir = e.from === _charEmail ? '你发给用户' : '用户发给你';
p += '内容：' + e.body.slice(0, slim.emailBodyMax) + '\n\n';
        });
    } else {
        p += '暂无邮件往来。\n';
    }
    p += '如需给用户发邮件，格式：<EMAIL subject="主题">正文</EMAIL>\n';
}
p += getMomentsForAI(charData, slim.momentsCount);
    var stickersInfo = typeof getStickersForAI === 'function' ? getStickersForAI(charId) : '';
    if (stickersInfo) p += stickersInfo;
    p += '【最终输出要求】你就是角色本人，千万不要出戏！绝对不要输出任何分析推理过程、思考草稿、场景旁白（场景动作请放到<STATE>里），也不要把生成图片的英文提示词发给用户看。不要输出空白行；需要分成多条消息时只能使用<SPLIT>；不要把多句短句硬并成一大段。直接输出你作为真人发给用户的微信消息以及隐藏的系统标签即可。\n\n';
    return p;
}

function getMomentsForAI(charData, limit) {
    var data = getAccData();
    var acc = getCurAcc();
    if (!data || !acc) return '';
    var visibleMoments = data.moments.filter(function(m) { return canSeeMoment(m, charData.id); });
var recentMoments = visibleMoments.slice(-(limit || 8));
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

function getMemContent(charId, limit) {
    var data = getAccData();
    var mems = (data.memories[charId] || []).slice(-(limit || 12));
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
        // ===== 时间跳跃标记：两条消息间隔超过30分钟就插入时间分隔 =====
        if (i > 0 && m.time && history[i-1].time) {
            var gap = m.time - history[i-1].time;
            if (gap > 30 * 60 * 1000) {
                var gapLabel = '';
                if (gap > 24 * 60 * 60 * 1000) {
                    gapLabel = '⏰ 【过了' + Math.floor(gap / (24*60*60*1000)) + '天】以下是新的对话，之前的话题可能已经过时，请勿继续之前未完成的事。';
                } else if (gap > 60 * 60 * 1000) {
                    gapLabel = '⏰ 【过了' + Math.floor(gap / (60*60*1000)) + '小时】话题可能已切换。';
                } else {
                    gapLabel = '⏰ 【过了' + Math.floor(gap / (60*1000)) + '分钟】';
                }
                msgs.push({ role: 'system', content: gapLabel });
            }
        }

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
        } else if (m.type === 'link') {
            // 🔥 图片代理函数：绕过防盗链
            function proxyImg(url) {
                if (!url) return '';
                if (url.indexOf('wsrv.nl') !== -1) return url; // 已经代理过的不重复
                if (url.indexOf('data:') === 0) return url; // base64不代理
                return 'https://wsrv.nl/?url=' + encodeURIComponent(url);
            }

            var linkContentText = '[分享了网页链接: ' + (m.linkTitle || m.linkUrl) + ']\n';
            
            // 全文 or 简介
            // 检测是否是截图模式（被反爬拦截后的兜底）
            var isScreenshot = m.linkFullText && m.linkFullText.indexOf('__SCREENSHOT__') === 0;
            var screenshotData = isScreenshot ? m.linkFullText.replace('__SCREENSHOT__', '') : '';

            if (isScreenshot) {
                // 截图模式：把截图喂给AI的眼睛
                linkContentText += '【注意】网页内容被反爬虫拦截，无法获取文字。以下附上网页截图，请根据截图内容回答用户。\n\n';
            } else if (m.linkFullText && m.linkFullText.length > 20) {
                var cleanText = m.linkFullText.slice(0, 4000);
                linkContentText += '【网页正文内容】：\n' + cleanText + '\n\n';
            } else if (m.linkDesc) {
                linkContentText += '【网页简介】：\n' + m.linkDesc + '\n\n';
            }
            var userComment = typeof getDisplayContent === 'function' ? getDisplayContent(m) : (m.content || '');
            linkContentText += '【用户附言】：' + (userComment || '（无）');

            // 🌟 终极图片提取逻辑 🌟
            var imgUrls = [];
            
            // 1. 封面图
            if (m.linkImage) imgUrls.push(m.linkImage);
            
            // 1.5 如果是截图模式，截图作为第一张"图片"
            var hasScreenshot = isScreenshot && screenshotData;
            
            // 2. 从全文中抠出所有配图链接（Markdown格式）
            if (m.linkFullText) {
                var imgRegex = /!\[.*?\]\((https?:\/\/[^\)]+)\)/g;
                var match;
                while ((match = imgRegex.exec(m.linkFullText)) !== null) {
                    var imgUrl = match[1];
                    // 过滤掉小图标、表情包等无意义的小图
                    if (imgUrl.indexOf('emoji') === -1 && 
                        imgUrl.indexOf('icon') === -1 && 
                        imgUrl.indexOf('avatar') === -1 &&
                        imgUrl.indexOf('.svg') === -1 &&
                        imgUrls.indexOf(imgUrl) === -1) {
                        imgUrls.push(imgUrl);
                    }
                }
            }

            // 3. 从全文中抠出纯URL格式的图片链接
            if (m.linkFullText) {
                var rawImgRegex = /(https?:\/\/[^\s\)]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^\s\)]*)?)/gi;
                var rawMatch;
                while ((rawMatch = rawImgRegex.exec(m.linkFullText)) !== null) {
                    if (imgUrls.indexOf(rawMatch[1]) === -1) {
                        imgUrls.push(rawMatch[1]);
                    }
                }
            }

            // 4. 最多让AI看前 6 张图片（平衡效果和费用）
            imgUrls = imgUrls.slice(0, 6);

            // 如果这是用户最后一条消息 且 有图片，启动视觉模式
                        if (m.role === 'user' && i === history.length - 1 && (imgUrls.length > 0 || hasScreenshot)) {
                var finalContent = [];
               if (m.quoteContent) {
    var qText2 = normalizeModelQuoteText(m.quoteContent);
    if (qText2) {
        if (m.quoteAnchorId) {
            finalContent.push({ type: 'text', text: '<QUOTE id="' + m.quoteAnchorId + '">' + qText2 + '</QUOTE>' });
        } else {
            finalContent.push({ type: 'text', text: '<QUOTE>' + qText2 + '</QUOTE>' });
        }
    }
}
                
                finalContent.push({ type: 'text', text: linkContentText });
                
                // 🔥 如果有截图，先把截图喂给AI
                if (hasScreenshot) {
                    finalContent.push({ type: 'text', text: '\n[系统提示：以下是网页截图，请仔细观察截图中的所有文字和图片内容]' });
                    finalContent.push({ type: 'image_url', image_url: { url: screenshotData, detail: 'high' } });
                }
                
                if (imgUrls.length > 0) {
                    finalContent.push({ type: 'text', text: '\n[以下是从网页提取的 ' + imgUrls.length + ' 张图片]' });
                    imgUrls.forEach(function(imgUrl) {
                        finalContent.push({ type: 'image_url', image_url: { url: proxyImg(imgUrl), detail: 'auto' } });
                    });
                }
                
                msgs.push({ role: 'user', content: finalContent });
                return;
            }

            content = linkContentText;
        }
if (m.quoteContent) {
    var qText = normalizeModelQuoteText(m.quoteContent);
    if (qText) {
        if (m.quoteAnchorId) {
            content = '<QUOTE id="' + m.quoteAnchorId + '">' + qText + '</QUOTE>' + content;
        } else {
            content = '<QUOTE>' + qText + '</QUOTE>' + content;
        }
    }
}
        if (content.trim()) msgs.push({ role: role, content: content });
    });
    // 提示AI可以引用最近的用户消息
    var lastUserMsg = null;
    for (var li = history.length - 1; li >= 0; li--) {
        if (history[li].role === 'user') { lastUserMsg = history[li]; break; }
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
        var waitMs = processResp(d.choices[0].message.content) || 0;
        setTimeout(function() {
            finishResp();
        }, waitMs + 50);
    })
    .catch(function(e) {
        hideTyping();
        showError(e.message, true);
        finishResp();
    });
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
    streamReader = null;
    var fullText = streamFull;
    // 先移除临时节点，等DOM更新后再处理
    if (tmp.parentNode) tmp.remove();
    // 用 setTimeout 确保 DOM 清理完成后再插入真实消息
    setTimeout(function() {
var waitMs = 0;
if (fullText.trim()) waitMs = processResp(fullText) || 0;
setTimeout(function() {
    finishResp();
}, waitMs + 50);
    }, 0);
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

function cleanAiTextHead(s) {
    s = String(s || '');
    // 去零宽字符
    s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
    // 只删开头的逗号/顿号/句号（不动换行、不动感叹号）
    s = s.replace(/^[ \t]*[，,、。.]+[ \t]*/, '');
    // 不要 trim，保留换行
    return s;
}
function normalizeAiMsgText(s) {
    s = String(s || '')
        .replace(/\r\n/g, '\n')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n[ \t]+\n/g, '\n')
        .replace(/\n{2,}/g, '\n')
        .trim();
    return s;
}

function normalizeAiLinkQuery(title, desc, text) {
    function clean(s) {
        return String(s || '')
            .replace(/\s+/g, ' ')
            .replace(/[“”"'`]/g, '')
            .trim();
    }

    var t = clean(title);
    var d = clean(desc);
    var x = clean(text);

    // 太泛、太口语的内容尽量别拿来搜
    var weakTexts = [
        '你看这个', '你看看这个', '你听这个', '这个好好笑', '这个好看',
        '哈哈哈', '笑死我了', '这首歌', '这个视频', '这个帖子', '这个链接'
    ];

    weakTexts.forEach(function(w) {
        if (x === w) x = '';
        if (d === w) d = '';
    });

    // 优先 title，其次 desc，正文只当补充
    return [t, d, x].filter(Boolean).join(' ').trim();
}

function normalizeModelQuoteText(s) {
    return String(s || '')
        .replace(/<\/?QUOTE(?:\s+[^>]*)?>/gi, '')
        .replace(/\r\n/g, '\n')
        .replace(/\n+/g, ' ')
        .trim();
}
function smartSplitPlainAiText(text) {
    text = normalizeAiMsgText(text);
    if (!text) return [];

    // 有结构标签时不在这里乱拆，交给后面的 inline parser
    if (/<(QUOTE|IMAGE|DESC|VOICE|STICKER|LINK|CALL|EMAIL|TRANSFER|MOMENT|LIKE|COMMENT|RECALL|PAT|SELFPAT)\b/i.test(text)) {
        return [text];
    }

    // 1. 先按换行拆
    var lines = text.split('\n').map(function(s) {
        return normalizeAiMsgText(s);
    }).filter(Boolean);

    if (lines.length > 1) {
        return lines;
    }

    // 2. 再按“短句聊天风”拆
    // 只在文本不长、句子明显很碎时启用，避免把正常长文切烂
    if (text.length <= 90) {
        var parts = text.match(/[^。！？!?…]+[。！？!?…]*|.+$/g) || [];
        parts = parts.map(function(s) { return normalizeAiMsgText(s); }).filter(Boolean);

        var shortCount = parts.filter(function(s) { return s.length <= 18; }).length;
        if (parts.length >= 3 && shortCount >= 2) {
            return parts;
        }
    }

    return [text];
}

function normalizeInlineTags(text) {
    text = String(text || '');

    // ===== QUOTE 修复 =====
    // 方括号变尖括号
    // 兼容旧错误格式：[引用"xxx"]正文  ->  <QUOTE>xxx</QUOTE>正文
    text = text.replace(
        /(^|<SPLIT>|\n)\s*\[引用"([^"\]\n]{1,120})"\]\s*/gi,
        function(all, prefix, inner) {
            return prefix + '<QUOTE>' + inner.trim() + '</QUOTE>';
        }
    );

    // 兼容旧错误格式：【引用：xxx】正文  ->  <QUOTE>xxx</QUOTE>正文
    text = text.replace(
        /(^|<SPLIT>|\n)\s*【引用[:：]?\s*([^】\n]{1,120})】\s*/gi,
        function(all, prefix, inner) {
            return prefix + '<QUOTE>' + inner.trim() + '</QUOTE>';
        }
    );

    // 兼容旧错误格式：引用: xxx 正文（只在段首处理，避免误伤普通句子）
    text = text.replace(
        /(^|<SPLIT>|\n)\s*引用[:：]\s*([^\n]{1,80})\n/gi,
        function(all, prefix, inner) {
            return prefix + '<QUOTE>' + inner.trim() + '</QUOTE>';
        }
    );
    text = text.replace(/\[QUOTE\]/gi, '<QUOTE>')
               .replace(/\[\/QUOTE\]/gi, '</QUOTE>')
               .replace(/< QUOTE >/gi, '<QUOTE>')
               .replace(/< \/QUOTE >/gi, '</QUOTE>');

    // AI漏写斜杠：<QUOTE>纯文本<QUOTE> → 加闭合
    // [^<]* 绝不会跨越已正确闭合的 </QUOTE>
    text = text.replace(/<QUOTE>([^<]*)<QUOTE>/gi, '<QUOTE>$1</QUOTE>');

    // 裸 QUOTE 兜底（完全没写闭合标签）
    // 前瞻里加了 <\/QUOTE>，避免把已闭合的也重复处理
    text = text.replace(
        /<QUOTE>([^<]{1,120})(?=\s*(<\/QUOTE>|<SPLIT>|<PAT>|\|\|\|PAT\|\|\||<IMAGE>|<QUOTE>|$))/gi,
        function(full, inner, after) {
            // 如果后面已经是 </QUOTE>，不重复闭合
            if (after === '</QUOTE>') return full;
            return '<QUOTE>' + inner + '</QUOTE>';
        }
    );

    // ===== IMAGE/DESC 修复 =====
    text = text.replace(/\[IMAGE\]/gi, '<IMAGE>')
               .replace(/\[\/IMAGE\]/gi, '</IMAGE>')
               .replace(/\[DESC\]/gi, '<DESC>')
               .replace(/\[\/DESC\]/gi, '</DESC>');

    // AI漏写斜杠
    text = text.replace(/<IMAGE>([^<]*)<IMAGE>/gi, '<IMAGE>$1</IMAGE>');
    text = text.replace(/<DESC>([^<]*)<DESC>/gi, '<DESC>$1</DESC>');

    // 裸 IMAGE 自动闭合
    text = text.replace(
        /<IMAGE>([^<]{1,800})(?=\s*(<\/IMAGE>|<SPLIT>|<QUOTE>|<PAT>|\|\|\|PAT\|\|\||<IMAGE>|<DESC>|$))/gi,
        function(full, inner, after) {
            if (after === '</IMAGE>') return full;
            return '<IMAGE>' + inner + '</IMAGE>';
        }
    );

    // 裸 DESC 自动闭合
    text = text.replace(
        /<DESC>([^<]{1,300})(?=\s*(<\/DESC>|<SPLIT>|<QUOTE>|<PAT>|\|\|\|PAT\|\|\||<IMAGE>|$))/gi,
        function(full, inner, after) {
            if (after === '</DESC>') return full;
            return '<DESC>' + inner + '</DESC>';
        }
    );

    // LINK 标签修复
    text = text.replace(/\[LINK\s/gi, '<LINK ').replace(/\[\/LINK\]/gi, '</LINK>');

    return text;
}

function pickDisplayQuoteFragment(searchText, fullText) {
    searchText = String(searchText || '').trim();
    fullText = String(fullText || '').trim();

    function tightenQuote(s) {
        s = String(s || '').replace(/\s+/g, ' ').trim();
        if (!s) return '';

        // 先按标点拆，优先取最后一个有情绪点的短片段
        var segs = s.split(/[，,。！？!?；;、\n]/).map(function(x) {
            return String(x || '').trim();
        }).filter(Boolean);

        if (segs.length > 1) {
            for (var i = segs.length - 1; i >= 0; i--) {
                var seg = segs[i];
                if (seg.length >= 2 && seg.length <= 8) {
                    return seg;
                }
            }
            // 没有合适短句，就取最后一段再压短
            s = segs[segs.length - 1];
        }

        // 太长时，优先截尾巴，因为中文情绪点常在尾部
        if (s.length > 8) {
            var tail = s.slice(-6).replace(/^(啊|呀|呸|哼|欸|诶|唉|哈)+/, '').trim();
            if (tail.length >= 2 && tail.length <= 8) return tail;

            var tail2 = s.slice(-4).replace(/^(啊|呀|呸|哼|欸|诶|唉|哈)+/, '').trim();
            if (tail2.length >= 2) return tail2;
        }

        if (s.length > 12) return s.slice(0, 12).trim();
        return s;
    }

    if (!searchText) return tightenQuote(fullText);

    // 先走精确匹配
    var idx = fullText.indexOf(searchText);
    if (idx >= 0) {
        return tightenQuote(fullText.slice(idx, idx + searchText.length));
    }

    // 去空格后再试一次
    var compactSearch = searchText.replace(/\s+/g, '');
    var compactFull = fullText.replace(/\s+/g, '');
    if (compactSearch && compactFull.indexOf(compactSearch) >= 0) {
        return tightenQuote(searchText);
    }

    // 最后兜底：至少压成短片段
    return tightenQuote(searchText);
}

function resolveQuoteMetaByAnchorId(anchorId, chatMsgs) {
    anchorId = String(anchorId || '').trim();
    if (!anchorId) return null;

    for (var i = chatMsgs.length - 1; i >= 0; i--) {
        var m = chatMsgs[i];
        var anchors = Array.isArray(m.quoteAnchors) ? m.quoteAnchors : [];
        for (var j = 0; j < anchors.length; j++) {
            var a = anchors[j];
            if (a && a.id === anchorId) {
                return {
                    quoteTime: m.time,
                    quoteContent: a.text || '',
                    quoteMsgId: m.id || '',
                    quoteAnchorId: a.id
                };
            }
        }
    }

    return null;
}

function resolveQuoteMeta(searchText, chatMsgs) {
    searchText = normalizeModelQuoteText(searchText);
    if (!searchText) return null;

    for (var i = chatMsgs.length - 1; i >= 0; i--) {
        var m = chatMsgs[i];
        if (!m || m.recalled || m.type === 'sys') continue;

        var anchors = Array.isArray(m.quoteAnchors) ? m.quoteAnchors : [];
        for (var j = 0; j < anchors.length; j++) {
            var a = anchors[j];
            if (a && a.text === searchText) {
                return {
                    quoteTime: m.time || 0,
                    quoteContent: a.text,
                    quoteMsgId: m.id || '',
                    quoteAnchorId: a.id || ''
                };
            }
        }
    }

    return null;
}

function splitPromptDesc(prompt, desc) {
    prompt = String(prompt || '').trim();
    desc = String(desc || '').trim();

    // 如果没给DESC，且prompt里混了中文：从第一个中文处分割
    if (!desc) {
        var m = prompt.match(/[\u4e00-\u9fa5]/);
        if (m && m.index > 8) {
            desc = prompt.slice(m.index).trim();
            prompt = prompt.slice(0, m.index).trim();
        }
    }

    // prompt 兜底长度
    if (prompt.length > 600) prompt = prompt.slice(0, 600).trim();

    return { prompt: prompt, desc: desc };
}

function buildImageUrlByPrompt(prompt) {
    var url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) +
        '?model=' + D.settings.polliModel + '&seed=' + Math.floor(Math.random() * 9999) + '&nologo=true';
    if (D.settings.polliKey) url += '&key=' + encodeURIComponent(D.settings.polliKey);
    return url;
}

// ===== Parser Debug =====
function isParserDebugOn() {
    return !!(D && D.settings && D.settings.debugParser);
}
function pLog(stage, payload) {
    if (!isParserDebugOn()) return;
    try { console.log('[AIParser][' + stage + ']', payload || ''); } catch (e) {}
}
function pWarn(stage, payload) {
    if (!isParserDebugOn()) return;
    try { console.warn('[AIParser][' + stage + ']', payload || ''); } catch (e) {}
}
function countTags(text) {
    var tags = ['QUOTE','IMAGE','DESC','VOICE','MOMENT','LIKE','COMMENT','RECALL','PAT','SELFPAT','TRANSFER','EMAIL','CALL','SPLIT'];
    var out = {};
    text = String(text || '');
    tags.forEach(function(t) {
        var m = text.match(new RegExp('<' + t + '\\b', 'gi'));
        out[t] = m ? m.length : 0;
    });
    return out;
}

function getPromptSlimOpts(charData) {
    var s = D.settings || {};
    return {
        callMemCount: Math.max(0, parseInt(s.promptCallMemCount || (charData && charData.callMemoryCount !== undefined ? charData.callMemoryCount : 3), 10) || 3),
        momentsCount: Math.max(5, parseInt(s.promptMomentsCount || 8, 10) || 8),
        emailCount: Math.max(2, parseInt(s.promptEmailCount || 3, 10) || 3),
        emailBodyMax: Math.max(60, parseInt(s.promptEmailBodyMax || 120, 10) || 120)
    };
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
    if (!charId) return 0;
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
    // 后台活动已由服务端 bgCron 处理，前端不再执行
    if (callback) callback(); return;

    if (!D.api.key) { if (callback) callback(); return; }

    var s = D.settings || {};
var allowBg = !!s.bgOn;

// 只看总开关 + 角色勾选
if (!allowBg || !char || char.bgEnabled !== true) {
        if (callback) callback();
        return;
    }

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
var localHour = getDateInThemeTz(now).getHours();
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

    // 防止请求发出后你又把开关关掉
    var s2 = D.settings || {};
    if (!s2.bgOn || !char || char.bgEnabled !== true) { if (callback) callback(); return; }

    processBgResponse(char, d.choices[0].message.content);
    if (callback) callback();
})
    .catch(function(e) {
        console.log('后台活动失败', e);
        if (callback) callback();
    });
}

function shouldSendBgSystemPush(charId) {
    try {
        if (
            document.visibilityState === 'visible' &&
            curChar &&
            curChar.id === charId &&
            $('chatPage') &&
            $('chatPage').classList.contains('active')
        ) {
            return false;
        }
    } catch (e) {}
    return true;
}

function processBgResponse(char, text) {
    if (text.indexOf('<IDLE>') >= 0) return;

    var s = (typeof D !== 'undefined' && D.settings) ? D.settings : {};
    var allowBg = !!s.bgOn;
    var allowDm = true;
var allowMoment = true;

    // 处理AI主动发起通话（也受总后台/角色开关约束）
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
if (allowDm) {
    var dmMatches = text.match(/<DM>([\s\S]*?)<\/DM>/g) || [];
    dmMatches.slice(0, 3).forEach(function(dm) {
        var content = dm.replace(/<\/?DM>/g, '').trim();
        if (content) {
            if (!data.chats[char.id]) data.chats[char.id] = [];
            appendMsgToChat(char.id, { role: 'ai', content: content, time: Date.now() });
            notifications.push({ name: char.displayName, avatar: char.avatar, content: content, time: Date.now(), accId: D.currentAccId, charId: char.id });
            if (typeof pushNotify === 'function') {
                pushNotify(char.displayName || char.realName, content.slice(0, 40), {
                    icon: char.avatar || '',
                    charId: char.id,
                    tag: 'chat-' + char.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                });
            }
            if (typeof sendBgPush === 'function' && shouldSendBgSystemPush(char.id)) {
                sendBgPush({
                    title: char.displayName || char.realName || '新消息',
                    body: content.slice(0, 60),
                    tag: 'chat-' + char.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    icon: char.avatar || '',
                    url: 'https://huios.pages.dev'
                });
            }
        }
    });
}
if (allowMoment) {
    var momentMatches = text.match(/<MOMENT>([\s\S]*?)<\/MOMENT>/g) || [];
    if (momentMatches.length) {
        var content = momentMatches[0].replace(/<\/?MOMENT>/g, '').trim();
        var locMatch = content.match(/<LOC>([\s\S]*?)<\/LOC>/);
        var location = locMatch ? locMatch[1].trim() : '';
        content = content.replace(/<LOC>[\s\S]*?<\/LOC>/g, '').trim();
        if (content) {
            data.moments.push({ id: genId('mom'), authorId: char.id, authorType: 'ai', content: content, images: [], location: location, visibleGroups: [], likes: [], comments: [], time: Date.now() });
            notifications.push({ name: char.displayName, avatar: char.avatar, content: '[发了朋友圈] ' + content.slice(0, 20), time: Date.now(), accId: D.currentAccId, charId: char.id });

            if (typeof sendBgPush === 'function' && shouldSendBgSystemPush(char.id)) {
                sendBgPush({
                    title: (char.displayName || char.realName || '角色') + ' 发了新动态',
                    body: content.slice(0, 60),
                    tag: 'moment-' + char.id + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
                    icon: char.avatar || '',
                    url: 'https://huios.pages.dev'
                });
            }
        }
    }
}
        if (allowMoment) {
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
    }

    save();
    if (notifications.length) showNotify(notifications);
    if ($('chatPage').classList.contains('active')) renderContacts();
}
function normalizeSummaryText(s) {
    s = String(s || '').trim();
    // 去掉行首 bullet（-, •, ·, 1. 等）
    s = s.replace(/^\s*[-•·]\s*/gm, '');
    s = s.replace(/^\s*\d+[.)、]\s*/gm, '');
    // 压缩空行
    s = s.replace(/\n{3,}/g, '\n\n').trim();
    return s;
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
{ role: 'system', content: '请将以下对话内容总结为记忆摘要。要求：保留重要事件、情感变化、关键信息；语言自然连贯；总字数控制在200字以内；用中文输出；只输出摘要内容，不要任何开头语或标题。' },
                { role: 'user', content: history }
            ],
            temperature: 0.3,
            max_tokens: 50000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
var summary = normalizeSummaryText(d.choices[0].message.content);
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

    var interval = Math.max(20, parseInt(charData.summaryInterval, 10) || 20);
    var lastCount = parseInt(charData.lastSummarizedCount || 0, 10);
    if (!isFinite(lastCount) || lastCount < 0) lastCount = 0;
    if (lastCount > allMsgs.length) lastCount = 0;

    // 不再用“整除触发”，改为“累计到 interval 就触发”
    if (allMsgs.length - lastCount < interval) return;
    if (charData.summaryRunning) return;

    var api = (typeof getApi2 === 'function') ? getApi2() : D.api;
    if (!api || !api.key) api = D.api;
    if (!api.key) return;

    var acc = getCurAcc();
    var targetMsgs = allMsgs.slice(lastCount, lastCount + interval);
    var history = targetMsgs.map(function(m) {
        var name = m.role === 'user' ? (acc ? acc.persona : '用户') : charData.realName;
        var content = m.type === 'image' ? '[图片: ' + (m.imageDesc || '') + ']' :
                      m.type === 'voice' ? '[语音: ' + (m.content || '') + ']' :
                      (m.content || '');
        return name + '：' + content;
    }).join('\n');

    charData.summaryRunning = true;
    save();

    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { role: 'system', content: '请将以下对话内容总结为记忆摘要。要求：保留重要事件、情感变化、关键信息；语言自然连贯；总字数控制在200字以内；用中文输出；只输出摘要内容，不要任何开头语或标题。' },
                { role: 'user', content: history }
            ],
            temperature: 0.3,
            max_tokens: 20000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error || !d.choices || !d.choices[0]) return;
        var summary = normalizeSummaryText(d.choices[0].message.content);

        var freshData = getAccData();
        if (!freshData.memories[charId]) freshData.memories[charId] = [];
        freshData.memories[charId].push({
            id: genId('mem'),
            content: summary,
            time: Date.now(),
            auto: true
        });

        var freshChar = freshData.chars.find(function(c) { return c.id === charId; });
        if (freshChar) {
            freshChar.lastSummarizedCount = lastCount + targetMsgs.length;
        }

        save();

        if (typeof openMemoryPage === 'function' && $('memoryPage') && $('memoryPage').classList.contains('active')) {
            openMemoryPage();
        }
    })
    .catch(function() {})
    .finally(function() {
        var freshData2 = getAccData();
        var freshChar2 = freshData2.chars.find(function(c) { return c.id === charId; });
        if (freshChar2) {
            freshChar2.summaryRunning = false;
            save();
        }
    });
}
function checkAutoSummary(charId) {
    var data = getAccData();
    var charData = data.chars.find(function(c) { return c.id === charId; });
    if (!charData || !charData.autoSummary) return;
    setTimeout(function() {
        if (typeof autoSummaryIfNeeded === 'function') autoSummaryIfNeeded(charId);
    }, 500);
}
function prepareRespText(rawText) {
    var text = String(rawText || '');
    var hadStructuredTag = /<(VOICE|MOMENT|LIKE|COMMENT|DEL_MOMENT|ADDPLACE|MOVETO|SHARELOC|INVITE|TRANSFER|TRANSFER_ACCEPT|TRANSFER_REJECT|EMAIL|CALL|STICKER|IMAGE|RECALL|PAT|SELFPAT|QUOTE|relation|task|memory)\b/i.test(text);

    text = text.replace(/`?INTERNAL STATE`?[\s\S]*$/i, '').trim();
    text = text.replace(/\n?---+\n?/g, '\n').trim();
    text = text.replace(/^(analysis|reasoning|thought process|internal monologue|draft)\s*:\s*/i, '').trim();

    return { text: text, hadStructuredTag: hadStructuredTag };
}

function handleHeartStateRate(text, data, charId) {
    text = text.replace(/<SPL-IT>/gi, '<SPLIT>')
               .replace(/<SPL IT>/gi, '<SPLIT>')
               .replace(/\[SPLIT\]/gi, '<SPLIT>')
               .replace(/< SPLIT >/gi, '<SPLIT>')
               .replace(/<\/SPLIT>/gi, '<SPLIT>');

    text = text.replace(
        /<HEART>([\s\S]*?)<STATE>([\s\S]*?)<RATE>([^\d<]*)(\d+)([^\d<]*?)(?:<\/RATE>)?([\s\S]*?)(?=<[A-Z]|$)/i,
        function(m, h, s, pre, r, post) {
            return '<HEART>' + h + '</HEART><STATE>' + s + '</STATE><RATE>' + r + '</RATE>';
        }
    );
    text = text.replace(/<HEART>([^<]{1,200})(?!\s*<\/HEART>)(?=\s*<STATE>|\s*$)/gi, '<HEART>$1</HEART>');
    text = text.replace(/<STATE>([^<]{1,200})(?!\s*<\/STATE>)(?=\s*<RATE>|\s*$)/gi, '<STATE>$1</STATE>');
    text = text.replace(/<RATE>([^<]{0,10}\d+[^<]{0,10})(?!\s*<\/RATE>)/gi, '<RATE>$1</RATE>');

    var _selfCloseTags = ['HEART', 'STATE', 'RATE', 'VOICE', 'MOMENT', 'LIKE', 'COMMENT', 'RECALL', 'IMAGE', 'DESC', 'QUOTE', 'STICKER'];
    _selfCloseTags.forEach(function(tag) {
        var re1 = new RegExp('<' + tag + '>([^<]*)<' + tag + '>', 'gi');
        text = text.replace(re1, '<' + tag + '>$1</' + tag + '>');
        var re2 = new RegExp('<\\/' + tag + '>([^<]*)<\\/' + tag + '>', 'gi');
        text = text.replace(re2, '$1</' + tag + '>');
    });

    text = normalizeInlineTags(text);

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

    text = text.replace(/<HEART>[\s\S]*?<\/HEART>/gi, '')
               .replace(/<STATE>[\s\S]*?<\/STATE>/gi, '')
               .replace(/<RATE>[\s\S]*?<\/RATE>/gi, '')
               .replace(/<\/?HEART[^>]*>/gi, '')
               .replace(/<\/?STATE[^>]*>/gi, '')
               .replace(/<\/?RATE[^>]*>/gi, '');
    return text;
}

function dispatchInlineOutput(text, ctx) {
    var savedCharId = ctx.savedCharId, charName = ctx.charName, acc = ctx.acc, charData = ctx.charData, hadStructuredTag = ctx.hadStructuredTag;
    var data = ctx.data;
    var chatMsgsForQuote = data.chats[savedCharId] || [];
var _lastSendKey = '';
var _lastSendAt = 0;

function _normKey(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
}

    var _sentKeys = {};

    function sendAiText(p, q, dly) {
        setTimeout(function() {
            var content = normalizeAiMsgText(cleanAiTextHead(p || ''));
            if (!content && q && q.quoteContent) {
                content = '…';
            }
            if (!content) return;
            // ===== 防引用重复：同内容+同引用 1.5秒内只发一次 =====
            var dedupKey = (q && q.quoteContent ? 'Q:' + q.quoteContent + '|' : '') + content.replace(/\s+/g, '');
            var now = Date.now();
            if (_sentKeys[dedupKey] && (now - _sentKeys[dedupKey] < 1500)) {
                return;
            }
            _sentKeys[dedupKey] = now;

            var msg = { role: 'ai', content: content, time: Date.now() };
if (q) {
    msg.quoteContent = q.quoteContent;
    msg.quoteTime = q.quoteTime;
    msg.quoteMsgId = q.quoteMsgId || '';
    msg.quoteAnchorId = q.quoteAnchorId || '';
}
            appendMsgToChat(savedCharId, msg);
            if (typeof pushNotify === 'function') {
                pushNotify(charName, content.slice(0, 60), { tag: 'chat-' + savedCharId + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) });
            }
        }, dly);
    }

    function dispatchInline(part, startDelay) {
    var delayX = startDelay || 0;
    var tokens = [];
    var re = /<QUOTE(?:\s+id="([^"]+)")?>([\s\S]*?)<\/QUOTE>|<IMAGE>([\s\S]*?)<\/IMAGE>\s*(?:<DESC>([\s\S]*?)<\/DESC>)?|(\|\|\|PAT\|\|\|)/gi;
    var idx = 0, m;

    while ((m = re.exec(part)) !== null) {
        if (m.index > idx) {
            var plain = part.slice(idx, m.index)
                .replace(/<\/?QUOTE(?:\s+[^>]*)?>/gi, '')
                .replace(/<\/?(IMAGE|DESC)>/gi, '')
                .trim();
            if (plain) tokens.push({ type: 'text', content: plain });
        }

        if (m[2] != null) {
            tokens.push({ type: 'quote', id: m[1] || '', content: m[2] });
        } else if (m[3] != null) {
            tokens.push({ type: 'image', prompt: m[3], desc: m[4] || '' });
        } else if (m[5] != null) {
            tokens.push({ type: 'pat' });
        }

        idx = re.lastIndex;
    }

    var tail = part.slice(idx)
        .replace(/<\/?QUOTE(?:\s+[^>]*)?>/gi, '')
        .replace(/<\/?(IMAGE|DESC)>/gi, '')
        .trim();

    if (tail) tokens.push({ type: 'text', content: tail });

    var i = 0;
    var pendingText = '';

    while (i < tokens.length) {
        var tk = tokens[i];

        if (tk.type === 'quote') {
            var quoteMeta = null;

if (tk.id) {
    quoteMeta = resolveQuoteMetaByAnchorId(tk.id, chatMsgsForQuote);

    if (quoteMeta) {
        var modelQuoteText = normalizeModelQuoteText(tk.content || '');
        var exactQuoteText = normalizeModelQuoteText(quoteMeta.quoteContent || '');
        if (modelQuoteText && exactQuoteText && modelQuoteText !== exactQuoteText) {
            pWarn('quote-mismatch', {
                id: tk.id,
                model: modelQuoteText,
                exact: exactQuoteText
            });
        }
    }
} else {
    quoteMeta = resolveQuoteMeta(tk.content, chatMsgsForQuote);
}

            var beforeText = normalizeAiMsgText(cleanAiTextHead(pendingText || ''));
            pendingText = '';

            if (beforeText) {
                sendAiText(beforeText, null, delayX);
                delayX += 280 + Math.min(beforeText.length * 22, 700);
            }

            var afterText = '';
            if (i + 1 < tokens.length && tokens[i + 1].type === 'text') {
                i++;
                afterText = normalizeAiMsgText(cleanAiTextHead(tokens[i].content || ''));
            }

            if (afterText || quoteMeta) {
                sendAiText(afterText || '', quoteMeta, delayX);
                delayX += 280 + Math.min((afterText || '').length * 22, 700);
            }

        } else if (tk.type === 'text') {
            if (i + 1 < tokens.length && tokens[i + 1].type === 'quote') {
                pendingText += tk.content;
            } else {
                var fullText = normalizeAiMsgText(cleanAiTextHead(pendingText + tk.content));
                pendingText = '';
                if (fullText) {
                    sendAiText(fullText, null, delayX);
                    delayX += 280 + Math.min(fullText.length * 22, 700);
                }
            }

        } else if (tk.type === 'image') {
            if (pendingText) {
                sendAiText(pendingText, null, delayX);
                delayX += 280 + Math.min(pendingText.length * 22, 700);
                pendingText = '';
            }

            if (D.settings.polliOn) {
                (function(prompt, desc, dly) {
                    setTimeout(function() {
                        var sp = splitPromptDesc(prompt, desc);
                        if (!sp.prompt) return;
                        appendMsgToChat(savedCharId, {
                            role: 'ai',
                            type: 'image',
                            imageUrl: buildImageUrlByPrompt(sp.prompt),
                            imageDesc: sp.desc,
                            time: Date.now()
                        });
                    }, dly);
                })(tk.prompt, tk.desc, delayX);

                delayX += 220;
            }

        } else if (tk.type === 'pat') {
            if (pendingText) {
                sendAiText(pendingText, null, delayX);
                delayX += 280 + Math.min(pendingText.length * 22, 700);
                pendingText = '';
            }

            (function(dly) {
                setTimeout(function() {
                    appendMsgToChat(savedCharId, {
                        role: 'sys',
                        type: 'sys',
                        content: charName + ' 拍了拍 ' + (acc ? acc.nick : '你'),
                        time: Date.now()
                    });
                }, dly);
            })(delayX);

            delayX += 200;
        }

        i++;
    }

    if (pendingText) {
        sendAiText(pendingText, null, delayX);
        delayX += 280 + Math.min(pendingText.length * 22, 700);
        pendingText = '';
    }

    return delayX;
}

    if (!text || !text.trim()) {
        if (hadStructuredTag) return 0;
        appendMsgToChat(savedCharId, { role: 'ai', content: '…', time: Date.now() });
        return 0;
    }

    var totalDelay = 0;
    if (D.settings.segment && text.indexOf('<SPLIT>') >= 0) {
        var parts = text.split('<SPLIT>').filter(function(p) { return p && p.trim(); });
        var d0 = 0;
        parts.forEach(function(p) { d0 = dispatchInline(p, d0); });
        totalDelay = d0;
    } else if (D.settings.segment) {
        var autoParts = smartSplitPlainAiText(text);
        var d1 = 0;
        autoParts.forEach(function(p) {
            d1 = dispatchInline(p, d1);
        });
        totalDelay = d1;
    } else {
        totalDelay = dispatchInline(text, 0);
    }

    if (typeof detectEmailInquiry === 'function') {
        var plainForDetect = text
            .replace(/<QUOTE(?:\s+id="[^"]+")?>[\s\S]*?<\/QUOTE>/gi, '')
            .replace(/<IMAGE>[\s\S]*?<\/IMAGE>/gi, '')
            .replace(/<DESC>[\s\S]*?<\/DESC>/gi, '')
            .replace(/\|\|\|PAT\|\|\|/g, '')
            .replace(/<SPLIT>/g, ' ')
            .trim();
        detectEmailInquiry(plainForDetect, charData);
    }

    return totalDelay || 0;
}

function processResp(text) {
    // ===== 防重复处理（1.5秒内同内容只处理一次）=====
    var _k = String(text || '').replace(/\s+/g, ' ').trim();
    var _now = Date.now();
    if (_k && window.__lastRespKey === _k && (_now - (window.__lastRespAt || 0) < 1500)) {
        return 0;
    }
    window.__lastRespKey = _k;
    window.__lastRespAt = _now;

    var pre = prepareRespText(text);
    text = pre.text;
    var hadStructuredTag = pre.hadStructuredTag;

    var data = getAccData();
    var acc = getCurAcc();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return 0;

    var savedCharId = charId;
    var charData = data.chars.find(function(c) { return c.id === charId; });
    var charName = charData ? charData.displayName : '角色';

    pLog('start', { len: text.length, tags: countTags(text), charId: savedCharId });

    text = handleHeartStateRate(text, data, charId);

    // --- 结构化标签处理 ---
    var recallCheck = text.match(/<RECALL>([\s\S]*?)<\/RECALL>/);
    if (recallCheck && recallCheck[1].length > 50) {
        text = text.replace(/<RECALL>([\s\S]*?)<\/RECALL>/g, '$1');
    }

    text = text.replace(/<PAT>/g, '|||PAT|||');
    var selfPatCount = (text.match(/<SELFPAT>/g) || []).length;
    for (var sp = 0; sp < Math.min(selfPatCount, 3); sp++) {
        appendMsgToChat(savedCharId, { role: 'sys', type: 'sys', content: charName + ' 拍了拍自己', time: Date.now() });
    }
    text = text.replace(/<SELFPAT>/g, '');

    var recallMatch = text.match(/<RECALL>([\s\S]*?)<\/RECALL>/);
    if (recallMatch && recallMatch[1].trim().length <= 50) {
        appendMsgToChat(savedCharId, { role: 'ai', content: recallMatch[1].trim(), time: Date.now(), recalled: true, recalledContent: recallMatch[1].trim() });
    }
    text = text.replace(/<RECALL>[\s\S]*?<\/RECALL>/g, '');

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

    var delMatches = text.match(/<DEL_MOMENT>([\s\S]*?)<\/DEL_MOMENT>/g) || [];
    delMatches.forEach(function(del) {
        var momId = del.replace(/<\/?DEL_MOMENT>/g, '').trim();
        var idx = data.moments.findIndex(function(m) { return m.id === momId && m.authorId === charId; });
        if (idx >= 0) { data.moments.splice(idx, 1); save(); appendMsg({ role: 'sys', type: 'sys', content: charName + ' 删除了一条朋友圈', time: Date.now() }); }
    });
    text = text.replace(/<DEL_MOMENT>[\s\S]*?<\/DEL_MOMENT>/g, '');

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

    var aiTransferRegex = /<TRANSFER\s+id="([^"]+)"\s+amount="([^"]+)">([\s\S]*?)<\/TRANSFER>/g;
    var atm;
    while ((atm = aiTransferRegex.exec(text)) !== null) {
        processAITransfer(atm[1], atm[2], atm[3].trim());
    }
    text = text.replace(/<TRANSFER\s+id="[^"]+"\s+amount="[^"]+">[\s\S]*?<\/TRANSFER>/g, '');

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
            showNotify([{ name: charData.displayName || charData.realName, avatar: charData.avatar, content: '📧 ' + subject, time: Date.now(), accId: D.currentAccId, type: 'email' }]);
        }
        if (typeof pushNotify === 'function') {
            pushNotify(charData.displayName || charData.realName, '📧 ' + subject, { icon: charData.avatar || '', charId: savedCharId, tag: 'email-' + savedCharId });
        }
        if (typeof updateEmailBadge === 'function') updateEmailBadge();
        appendMsgToChat(savedCharId, { role: 'sys', type: 'sys', content: charName + ' 给你发了一封邮件：' + subject, time: Date.now() });
    });
    text = text.replace(/<EMAIL\s+subject="[^"]*">[\s\S]*?<\/EMAIL>/g, '');

    var chatCallMatch = text.match(/<CALL\s+type="(voice|video)">([\s\S]*?)<\/CALL>/);
    if (chatCallMatch) {
        var chatCallType = chatCallMatch[1];
        var chatCallReason = chatCallMatch[2].trim();
        text = text.replace(/<CALL\s+type="(voice|video)">[\s\S]*?<\/CALL>/g, '');
        if (typeof aiInitiateCall === 'function') {
            setTimeout(function() { aiInitiateCall(savedCharId, chatCallType, chatCallReason); }, 500);
        }
    }

    var voiceMatches = text.match(/<VOICE>([\s\S]*?)<\/VOICE>/g) || [];
    voiceMatches.forEach(function(v) {
        var vc = v.replace(/<\/?VOICE>/g, '').trim();
        if (vc) appendMsgToChat(savedCharId, { role: 'ai', type: 'voice', content: vc, duration: Math.ceil(vc.length / 5), time: Date.now() });
    });
    text = text.replace(/<VOICE>[\s\S]*?<\/VOICE>/g, '');

    var stickerMatches = text.match(/<STICKER>([\s\S]*?)<\/STICKER>/g) || [];
    stickerMatches.forEach(function(stk) {
        var desc = stk.replace(/<\/?STICKER>/g, '').trim();
        if (desc) {
            var matched = data.stickers ? data.stickers.find(function(s) { return s.desc === desc || s.desc.indexOf(desc) >= 0 || desc.indexOf(s.desc) >= 0; }) : null;
            if (matched) appendMsgToChat(savedCharId, { role: 'ai', type: 'sticker', stickerUrl: matched.url, stickerDesc: matched.desc, time: Date.now() });
        }
    });
    text = text.replace(/<STICKER>[\s\S]*?<\/STICKER>/g, '');
    // ===== 链接卡片处理 =====
    var linkRegex = /<LINK\s+url="([^"]+)"\s+title="([^"]*)"\s*(?:desc="([^"]*)")?\s*>([\s\S]*?)<\/LINK>/gi;
    var linkMatch;
    while ((linkMatch = linkRegex.exec(text)) !== null) {
        var lUrl = linkMatch[1].trim();
        var lTitle = linkMatch[2].trim();
        var lDesc = (linkMatch[3] || '').trim();
        var lText = linkMatch[4].trim();
        var isVirtual = true; // 所有AI链接都走搜索，不信任AI编造的URL
        lUrl = 'javascript:void(0)';

var linkMsg = {
    id: genId('link'),
    role: 'ai',
    type: 'link',
    content: lText,
    linkUrl: lUrl,
    linkTitle: lTitle || '网页链接',
    linkDesc: lDesc,
    linkFavicon: '',
    linkImage: '',
    linkVirtual: isVirtual,
    time: Date.now()
};
appendMsgToChat(savedCharId, linkMsg);
    }
    text = text.replace(/<LINK\s+url="[^"]+"\s+title="[^"]*"\s*(?:desc="[^"]*")?\s*>[\s\S]*?<\/LINK>/gi, '');
    // --- 结构化标签处理结束 ---

    pLog('before-inline', { len: text.length, tags: countTags(text) });

    return dispatchInlineOutput(text, {
        data: data,
        acc: acc,
        savedCharId: savedCharId,
        charData: charData,
        charName: charName,
        hadStructuredTag: hadStructuredTag
    });
}