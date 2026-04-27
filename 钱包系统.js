// ========== 钱包数据初始化 ==========
function getWallet() {
    var data = getAccData();
    if (!data.wallet) data.wallet = { balance: 0, bills: [] };
    if (typeof data.wallet.balance === 'undefined') data.wallet.balance = 0;
    if (!data.wallet.bills) data.wallet.bills = [];
    return data.wallet;
}

function saveWallet() {
    save();
}

// ========== 格式化金额 ==========
function formatMoney(amount) {
    return '¥' + parseFloat(amount).toFixed(2);
}

// ========== 添加账单记录 ==========
function addBill(type, amount, remark, target) {
    var wallet = getWallet();
    wallet.bills.unshift({
        id: genId('bill'),
        type: type,       // transfer_out / transfer_in / recharge / withdraw / refund
        amount: amount,
        remark: remark || '',
        target: target || '',
        time: Date.now()
    });
    saveWallet();
}

// ========== 打开钱包页面 ==========
function openWallet() {
    checkTransferTimeout(); // 每次打开钱包先检查超时
    var wallet = getWallet();
    $('walletBalance').textContent = formatMoney(wallet.balance);
    $('walletPage').classList.add('active');
}

function closeWallet() {
    $('walletPage').classList.remove('active');
}

// ========== 充值 ==========
function openRecharge() {
    resetKeyInput('recharge');
    $('rechargeModal').dataset.mode = 'recharge';
    $('rechargeModalTitle').textContent = '充值';
    $('rechargeRemark').value = '';
    openModal('rechargeModal');
}

// ========== 提款 ==========
function openWithdraw() {
    resetKeyInput('recharge');
    $('rechargeModal').dataset.mode = 'withdraw';
    $('rechargeModalTitle').textContent = '提款';
    $('rechargeRemark').value = '';
    openModal('rechargeModal');
}

function confirmRecharge() {
    var mode = $('rechargeModal').dataset.mode;
    var amount = parseFloat($('rechargeAmount').textContent);
    if (!amount || amount <= 0) return toast('请输入金额');
    var wallet = getWallet();
    var remark = $('rechargeRemark').value.trim();
    if (mode === 'withdraw') {
        if (amount > wallet.balance) return toast('余额不足');
        wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
        addBill('withdraw', amount, remark, '');
        toast('提款成功');
    } else {
        wallet.balance = Math.round((wallet.balance + amount) * 100) / 100;
        addBill('recharge', amount, remark, '');
        toast('充值成功');
    }
    saveWallet();
    closeModal('rechargeModal');
    $('walletBalance').textContent = formatMoney(wallet.balance);
    refreshWalletPreview();
}

// ========== 自定义数字键盘 ==========
var _keyInput = '0';

function walletKeyPress(val) {
    if (val === '⌫') {
        _keyInput = _keyInput.length > 1 ? _keyInput.slice(0, -1) : '0';
    } else if (val === '.') {
        if (_keyInput.indexOf('.') >= 0) return;
        _keyInput += '.';
    } else {
        var dotIdx = _keyInput.indexOf('.');
        if (dotIdx >= 0 && _keyInput.length - dotIdx > 2) return;
        if (dotIdx < 0 && _keyInput.replace(/^0+/, '').length >= 8) return;
        if (_keyInput === '0' && val !== '.') {
            _keyInput = val;
        } else {
            _keyInput += val;
        }
    }
    var target = window._walletKeyTarget;
    if (target === 'recharge') {
        $('rechargeAmount').textContent = _keyInput;
    } else if (target === 'transfer') {
        $('transferAmount').textContent = _keyInput;
    }
}

function resetKeyInput(target) {
    _keyInput = '0';
    window._walletKeyTarget = target;
    if (target === 'recharge') $('rechargeAmount').textContent = '0.00';
    if (target === 'transfer') $('transferAmount').textContent = '0.00';
}

// ========== 转账 ==========
function openTransfer() {
    if (!curChar) return toast('请先选择角色');
    resetKeyInput('transfer');
    $('transferTarget').textContent = curChar.displayName;
    $('transferRemark').value = '';
    $('transferPage').classList.add('active');
}

function closeTransfer() {
    $('transferPage').classList.remove('active');
}

function doTransfer() {
    var amount = parseFloat($('transferAmount').textContent);
    if (!amount || amount <= 0) return toast('请输入金额');
    var wallet = getWallet();
    if (amount > wallet.balance) return toast('余额不足，当前余额 ' + formatMoney(wallet.balance));
    var remark = $('transferRemark').value.trim();
    var targetName = curChar.displayName;
    var targetTrue = curChar.realName;

    wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
    saveWallet();
    addBill('transfer_out', amount, remark, targetName);
    refreshWalletPreview();

    var msgId = genId('transfer');
    appendMsg({
        id: msgId,
        role: 'user',
        type: 'transfer',
        transferDir: 'out',
        amount: amount,
        remark: remark,
        targetName: targetName,
        targetTrue: targetTrue,
        status: 'pending',
        time: Date.now()
    });

    closeTransfer();
    if (D.settings.autoReply) {
        var delay = (D.settings.delay || 0) * 1000;
        if (delay > 0) {
            showDelay(D.settings.delay);
            timer = setTimeout(function() { removeDelay(); doResponse(); }, delay);
        } else {
            setTimeout(function() { doResponse(); }, 300);
        }
    } else {
        updateWaitBtn();
    }
}

// ========== AI主动向我转账 ==========
function processAITransfer(msgId, amount, remark) {
    var charId = curChar ? curChar.id : respondingCharId;
    appendMsgToChat(charId, {
        id: msgId,
        role: 'ai',
        type: 'transfer',
        transferDir: 'in',
        amount: parseFloat(amount),
        remark: remark || '',
        status: 'pending',
        time: Date.now()
    });
}

// ========== 我处理AI转给我的钱 ==========
function acceptAITransfer(msgId) {
    var charId = curChar ? curChar.id : null;
    var msg = findMsgById(msgId, charId);
    if (!msg || msg.status !== 'pending') return;
    var wallet = getWallet();
    wallet.balance = Math.round((wallet.balance + msg.amount) * 100) / 100;
    saveWallet();
    var charName = curChar ? curChar.displayName : 'AI';
    addBill('transfer_in', msg.amount, msg.remark, charName);
    refreshWalletPreview();
    updateTransferStatus(msgId, 'accepted', charId);

    // 在聊天中插入系统提示，让AI知道用户收款了
    if (charId) {
        appendMsgToChat(charId, {
            role: 'sys',
            type: 'sys',
            content: '用户已确认收款 ' + formatMoney(msg.amount),
            time: Date.now()
        });
    }

    toast('已收款 ' + formatMoney(msg.amount));
}

function rejectAITransfer(msgId) {
    var charId = curChar ? curChar.id : null;
    var msg = findMsgById(msgId, charId);
    if (!msg || msg.status !== 'pending') return;
    updateTransferStatus(msgId, 'rejected', charId);

    // 在聊天中插入系统提示，让AI知道用户拒收了
    if (charId) {
        appendMsgToChat(charId, {
            role: 'sys',
            type: 'sys',
            content: '用户已拒收转账 ' + formatMoney(msg.amount),
            time: Date.now()
        });
    }

    toast('已拒收');
}

// ========== 更新消息中的转账状态（不再依赖 curChar）==========
function updateTransferStatus(msgId, status, charId) {
    var data = getAccData();
    if (!data) return;
    var cid = charId || (curChar ? curChar.id : null);

    // 如果有明确的 charId，直接搜
    if (cid) {
        var msgs = data.chats[cid] || [];
        var msg = msgs.find(function(m) { return m.id === msgId; });
        if (msg) {
            msg.status = status;
            save();
            if (curChar && curChar.id === cid) renderMsgs(false);
            return;
        }
    }

    // 兜底：遍历所有聊天记录查找
    var charIds = Object.keys(data.chats);
    for (var i = 0; i < charIds.length; i++) {
        var chatMsgs = data.chats[charIds[i]] || [];
        var found = chatMsgs.find(function(m) { return m.id === msgId; });
        if (found) {
            found.status = status;
            save();
            if (curChar && curChar.id === charIds[i]) renderMsgs(false);
            return;
        }
    }
}

function findMsgById(msgId, charId) {
    var data = getAccData();
    if (!data) return null;
    var cid = charId || (curChar ? curChar.id : null);

    // 优先在指定角色的聊天里找
    if (cid) {
        var msgs = data.chats[cid] || [];
        var msg = msgs.find(function(m) { return m.id === msgId; });
        if (msg) return msg;
    }

    // 兜底：遍历所有聊天记录
    var charIds = Object.keys(data.chats);
    for (var i = 0; i < charIds.length; i++) {
        var chatMsgs = data.chats[charIds[i]] || [];
        var found = chatMsgs.find(function(m) { return m.id === msgId; });
        if (found) return found;
    }

    return null;
}

// ========== 转账超时检查（12小时未确认自动退回）==========
var TRANSFER_TIMEOUT = 12 * 60 * 60 * 1000; // 12小时

function checkTransferTimeout() {
    var data = getAccData();
    if (!data) return;
    var now = Date.now();
    var changed = false;
    var charIds = Object.keys(data.chats);

    for (var i = 0; i < charIds.length; i++) {
        var cid = charIds[i];
        var msgs = data.chats[cid] || [];

        for (var j = 0; j < msgs.length; j++) {
            var m = msgs[j];
            if (m.type !== 'transfer' || m.status !== 'pending') continue;
            if (now - m.time < TRANSFER_TIMEOUT) continue;

            // 超时了
            m.status = 'expired';
            changed = true;

            if (m.transferDir === 'out' && m.role === 'user') {
                // 用户转给AI的钱，AI没收，退回用户
                var wallet = getWallet();
                wallet.balance = Math.round((wallet.balance + m.amount) * 100) / 100;
                addBill('refund', m.amount, '转账超时退回', m.targetName || '');

                appendMsgToChat(cid, {
                    role: 'sys',
                    type: 'sys',
                    content: '转账 ' + formatMoney(m.amount) + ' 超过12小时未被确认，已自动退回',
                    time: Date.now()
                });
            } else if (m.transferDir === 'in' && m.role === 'ai') {
                // AI转给用户的钱，用户没收，过期作废
                appendMsgToChat(cid, {
                    role: 'sys',
                    type: 'sys',
                    content: '转账 ' + formatMoney(m.amount) + ' 超过12小时未确认，已过期',
                    time: Date.now()
                });
            }
        }
    }

    if (changed) {
        save();
        refreshWalletPreview();
        if (curChar && $('chatPage').classList.contains('active')) renderMsgs(false);
    }
}

// 定时检查（每10分钟）
setInterval(checkTransferTimeout, 10 * 60 * 1000);

// ========== 打开转账详情 ==========
function openTransferDetail(msgId) {
    var msg = findMsgById(msgId);
    if (!msg) return;

    var isOut = msg.transferDir === 'out' && msg.role === 'user';
    var isIn = msg.transferDir === 'in' && msg.role === 'ai';
    var statusText = '';
    var statusColor = '#666';
    var showBtns = false;
    var topText = '';

    if (msg.status === 'pending') {
        if (isOut) {
            topText = '转账已发出';
            statusText = '等待对方确认收款';
        } else if (isIn) {
            topText = '收到一笔转账';
            statusText = '请确认是否收款';
            showBtns = true;
        }
        statusColor = '#333';
    } else if (msg.status === 'accepted') {
        if (isOut) {
            topText = '转账成功';
            statusText = '对方已收款';
        } else {
            topText = '收款成功';
            statusText = '已存入零钱';
        }
        statusColor = '#4CAF50';
    } else if (msg.status === 'rejected') {
        if (isOut) {
            topText = '转账被拒收';
            statusText = '款项已退回至零钱';
        } else {
            topText = '已拒收';
            statusText = '转账已退回给对方';
        }
        statusColor = '#FF5252';
    } else if (msg.status === 'expired') {
        if (isOut) {
            topText = '转账已过期';
            statusText = '对方超过12小时未确认，款项已退回';
        } else {
            topText = '转账已过期';
            statusText = '超过12小时未确认，转账已失效';
        }
        statusColor = '#999';
    }

    // 剩余时间提示
    var remainText = '';
    if (msg.status === 'pending') {
        var remain = TRANSFER_TIMEOUT - (Date.now() - msg.time);
        if (remain > 0) {
            var remainH = Math.floor(remain / 3600000);
            var remainM = Math.floor((remain % 3600000) / 60000);
            remainText = '剩余 ' + remainH + '小时' + remainM + '分钟后自动' + (isOut ? '退回' : '过期');
        }
    }

    var charName = curChar ? curChar.displayName : 'AI';

    var h = '';
    h += '<div style="text-align:center;padding:20px 0 10px">';
    if (topText) h += '<div style="font-size:14px;color:' + statusColor + ';font-weight:500;margin-bottom:6px">' + topText + '</div>';
    h += '<div style="font-size:36px;font-weight:700;color:#222">' + formatMoney(msg.amount) + '</div>';
    if (remainText) h += '<div style="font-size:11px;color:#F59E0B;margin-top:6px">⏳ ' + remainText + '</div>';
    h += '</div>';

    h += '<div style="background:#f8f8f8;border-radius:12px;padding:14px;margin:10px 0;font-size:13px;line-height:2">';
    if (isOut) {
        h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">收款方</span><span>' + esc(msg.targetName || charName) + '</span></div>';
    } else {
        h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">转账方</span><span>' + esc(charName) + '</span></div>';
    }
    if (msg.remark) {
        h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">备注</span><span>' + esc(msg.remark) + '</span></div>';
    }
    h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">时间</span><span>' + fmtTime(msg.time) + '</span></div>';
    h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">状态</span><span style="color:' + statusColor + '">' + statusText + '</span></div>';
    h += '</div>';

    if (showBtns) {
        h += '<div style="display:flex;gap:12px;margin-top:16px">';
        h += '<button onclick="rejectAITransfer(\'' + msgId + '\');closeModal(\'transferDetailModal\')" style="flex:1;padding:14px;border:1px solid #ddd;border-radius:12px;background:white;font-size:15px;cursor:pointer;color:#666">拒收</button>';
        h += '<button onclick="acceptAITransfer(\'' + msgId + '\');closeModal(\'transferDetailModal\')" style="flex:1;padding:14px;border:none;border-radius:12px;background:#4CAF50;color:white;font-size:15px;cursor:pointer;font-weight:600">收款</button>';
        h += '</div>';
    }

    $('transferDetailContent').innerHTML = h;
    openModal('transferDetailModal');
}

// ========== 账单页 ==========
function openBills() {
    checkTransferTimeout(); // 打开账单前也检查超时
    var wallet = getWallet();
    var bills = wallet.bills;
    if (!bills.length) {
        $('billsContent').innerHTML = '<div style="text-align:center;padding:40px;color:#999">暂无账单记录</div>';
        $('billsPage').classList.add('active');
        return;
    }

    var groups = {};
    var groupOrder = [];
    bills.forEach(function(b) {
        var d = new Date(b.time);
        var key = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
        if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
        groups[key].push(b);
    });

    var typeMap = {
        transfer_out: { label: '转账', icon: '💸', sign: '-', color: '#333' },
        transfer_in:  { label: '收款', icon: '💰', sign: '+', color: '#4CAF50' },
        recharge:     { label: '充值', icon: '📥', sign: '+', color: '#4CAF50' },
        withdraw:     { label: '提款', icon: '📤', sign: '-', color: '#333' },
        refund:       { label: '退回', icon: '↩️', sign: '+', color: '#F59E0B' }
    };

    var h = '';
    groupOrder.forEach(function(date) {
        h += '<div style="font-size:12px;color:#999;padding:12px 0 6px">' + date + '</div>';
        groups[date].forEach(function(b) {
            var t = typeMap[b.type] || { label: b.type, icon: '📋', sign: '', color: '#333' };
            h += '<div style="background:white;border-radius:12px;padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.06)">';
            h += '<div>';
            h += '<div style="font-size:14px;font-weight:500">' + t.icon + ' ' + t.label + (b.target ? ' · ' + b.target : '') + '</div>';
            if (b.remark) h += '<div style="font-size:11px;color:#999;margin-top:2px">' + esc(b.remark) + '</div>';
            h += '<div style="font-size:11px;color:#bbb;margin-top:2px">' + fmtTime(b.time) + '</div>';
            h += '</div>';
            h += '<div style="font-size:17px;font-weight:600;color:' + t.color + '">' + (t.sign === '-' ? '-' : '+') + '¥' + parseFloat(b.amount).toFixed(2) + '</div>';
            h += '</div>';
        });
    });

    $('billsContent').innerHTML = h;
    $('billsPage').classList.add('active');
}

function closeBills() {
    $('billsPage').classList.remove('active');
}

// ========== 刷新我的页面余额预览 ==========
function refreshWalletPreview() {
    var wallet = getWallet();
    var el = $('myWalletPreview');
    if (el) el.textContent = formatMoney(wallet.balance);
    var el2 = $('walletBalance');
    if (el2) el2.textContent = formatMoney(wallet.balance);
}

// ========== 渲染转账气泡 ==========
function renderTransferBubble(msg) {
    var isOut = msg.transferDir === 'out';
    var status = msg.status || 'pending';
    var statusText = '';
    var topText = '';

    if (status === 'pending') {
        if (isOut) {
            topText = '转账已发出';
            statusText = '等待对方确认';
        } else {
            topText = '收到转账';
            statusText = '点击查看详情';
        }
    } else if (status === 'accepted') {
        if (isOut) {
            topText = '转账成功';
            statusText = '对方已收款';
        } else {
            topText = '收款成功';
            statusText = '已存入零钱';
        }
    } else if (status === 'rejected') {
        if (isOut) {
            topText = '转账被拒收';
            statusText = '款项已退回';
        } else {
            topText = '已拒收';
            statusText = '已退回给对方';
        }
    } else if (status === 'expired') {
        topText = '转账已过期';
        statusText = isOut ? '款项已自动退回' : '已失效';
    }

    var isPending = status === 'pending';
    var isExpired = status === 'expired';
    var bgColor, borderColor, amountColor, statusColor;

    if (isPending) {
        bgColor = isOut ? '#FFF9E6' : '#F0FFF4';
        borderColor = isOut ? '#FFD700' : '#4CAF50';
        amountColor = '#222';
        statusColor = '#555';
    } else if (isExpired) {
        bgColor = '#FAFAFA';
        borderColor = '#E0E0E0';
        amountColor = '#BBBBBB';
        statusColor = '#BBBBBB';
    } else {
        bgColor = '#F5F5F5';
        borderColor = '#DDDDDD';
        amountColor = '#AAAAAA';
        statusColor = '#AAAAAA';
    }

    var h = '<div onclick="event.stopPropagation();openTransferDetail(\'' + msg.id + '\')" ontouchend="event.stopPropagation();openTransferDetail(\'' + msg.id + '\')" style="cursor:pointer;background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:14px;padding:14px 18px;min-width:180px;max-width:240px">';

    if (topText) {
        h += '<div style="font-size:11px;color:' + (isPending ? '#999' : '#BBBBBB') + ';margin-bottom:4px">' + topText + '</div>';
    }

    h += '<div style="font-size:24px;font-weight:700;color:' + amountColor + ';margin:6px 0">' + formatMoney(msg.amount) + '</div>';

    if (msg.remark) {
        h += '<div style="font-size:11px;color:' + (isPending ? '#888' : '#BBBBBB') + ';margin-bottom:4px">💬 ' + esc(msg.remark) + '</div>';
    }

    h += '<div style="font-size:11px;color:' + statusColor + '">' + statusText + '</div>';

    h += '</div>';
    return h;
}