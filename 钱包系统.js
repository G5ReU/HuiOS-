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
        type: type,       // transfer_out / transfer_in / recharge / withdraw
        amount: amount,
        remark: remark || '',
        target: target || '',
        time: Date.now()
    });
    saveWallet();
}

// ========== 打开钱包页面 ==========
function openWallet() {
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
    // 同步我的页面余额预览
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
        // 限制小数点后两位
        var dotIdx = _keyInput.indexOf('.');
        if (dotIdx >= 0 && _keyInput.length - dotIdx > 2) return;
        // 限制整数位不超过8位
        if (dotIdx < 0 && _keyInput.replace(/^0+/, '').length >= 8) return;
        if (_keyInput === '0' && val !== '.') {
            _keyInput = val;
        } else {
            _keyInput += val;
        }
    }
    // 更新显示
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

    // 扣款
    wallet.balance = Math.round((wallet.balance - amount) * 100) / 100;
    saveWallet();
    addBill('transfer_out', amount, remark, targetName);
    refreshWalletPreview();

    // 生成消息
    var msgId = genId('transfer');
    appendMsg({
        id: msgId,
        role: 'user',
        type: 'transfer',
        transferDir: 'out',   // 我转给AI
        amount: amount,
        remark: remark,
        targetName: targetName,
        targetTrue: targetTrue,
        status: 'pending',    // pending / accepted / rejected
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
    appendMsg({
        id: msgId,
        role: 'ai',
        type: 'transfer',
        transferDir: 'in',    // AI转给我
        amount: parseFloat(amount),
        remark: remark || '',
        status: 'pending',
        time: Date.now()
    });
}

// ========== 我处理AI转给我的钱 ==========
function acceptAITransfer(msgId) {
    var msg = findMsgById(msgId);
    if (!msg || msg.status !== 'pending') return;
    var wallet = getWallet();
    wallet.balance = Math.round((wallet.balance + msg.amount) * 100) / 100;
    saveWallet();
    addBill('transfer_in', msg.amount, msg.remark, curChar ? curChar.displayName : 'AI');
    refreshWalletPreview();
    updateTransferStatus(msgId, 'accepted');
    // 发我的收款确认气泡
    appendMsg({
        id: genId('transfer'),
        role: 'user',
        type: 'transfer',
        transferDir: 'out',
        amount: msg.amount,
        remark: msg.remark || '',
        status: 'accepted',
        targetName: curChar ? curChar.displayName : 'AI',
        time: Date.now()
    });
    toast('收款成功 ' + formatMoney(msg.amount));
}

function rejectAITransfer(msgId) {
    var msg = findMsgById(msgId);
    if (!msg || msg.status !== 'pending') return;
    updateTransferStatus(msgId, 'rejected');
    // 发拒收气泡
    appendMsg({
        id: genId('transfer'),
        role: 'user',
        type: 'transfer',
        transferDir: 'out',
        amount: msg.amount,
        remark: msg.remark || '',
        status: 'rejected',
        targetName: curChar ? curChar.displayName : 'AI',
        time: Date.now()
    });
    toast('已拒收');
}

// ========== 更新消息中的转账状态 ==========
function updateTransferStatus(msgId, status) {
    var data = getAccData();
    if (!data || !curChar) return;
    var msgs = data.chats[curChar.id] || [];
    var msg = msgs.find(function(m) { return m.id === msgId; });
    if (msg) {
        msg.status = status;
        save();
        renderMsgs(false);
    }
}

function findMsgById(msgId) {
    var data = getAccData();
    if (!data || !curChar) return null;
    var msgs = data.chats[curChar.id] || [];
    return msgs.find(function(m) { return m.id === msgId; }) || null;
}

// ========== 打开转账详情 ==========
function openTransferDetail(msgId) {
    var msg = findMsgById(msgId);
    if (!msg) return;

    var isOut = msg.transferDir === 'out';
    var statusText = '';
    var statusColor = '#666';
    var showBtns = false;

    if (msg.status === 'pending') {
        if (isOut) {
            statusText = '待' + (msg.targetName || 'TA') + '确认收款';
        } else {
            statusText = '待你确认收款';
            showBtns = true;
        }
        statusColor = '#333';
    } else if (msg.status === 'accepted') {
        statusText = isOut ? '对方收款成功' : '已收款';
        statusColor = '#4CAF50';
    } else if (msg.status === 'rejected') {
        statusText = isOut ? '对方已拒收，款项已退回' : '对方已拒收';
        statusColor = '#FF5252';
    }

    var h = '';
    h += '<div style="text-align:center;padding:20px 0 10px">';
    h += '<div style="font-size:13px;color:' + statusColor + ';margin-bottom:8px">' + statusText + '</div>';
    h += '<div style="font-size:36px;font-weight:700;color:#222">' + formatMoney(msg.amount) + '</div>';
    h += '</div>';
    h += '<div style="background:#f8f8f8;border-radius:12px;padding:14px;margin:10px 0;font-size:13px;line-height:2">';
    if (isOut) {
        h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">收款方</span><span>' + (msg.targetName || '') + (msg.targetTrue && msg.targetTrue !== msg.targetName ? '（' + msg.targetTrue + '）' : '') + '</span></div>';
    } else {
h += '<div style="display:flex;justify-content:space-between"><span style="color:#999">转账方</span><span>' + (curChar ? curChar.displayName : 'AI') + '</span></div>';
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
    var wallet = getWallet();
    var bills = wallet.bills;
    if (!bills.length) {
        $('billsContent').innerHTML = '<div style="text-align:center;padding:40px;color:#999">暂无账单记录</div>';
        $('billsPage').classList.add('active');
        return;
    }

    // 按日期分组
    var groups = {};
    var groupOrder = [];
    bills.forEach(function(b) {
        var d = new Date(b.time);
        var key = d.getFullYear() + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + d.getDate().toString().padStart(2, '0');
        if (!groups[key]) { groups[key] = []; groupOrder.push(key); }
        groups[key].push(b);
    });

    var typeMap = {
        transfer_out: { label: '转账', sign: '-', color: '#333' },
        transfer_in:  { label: '收款', sign: '+', color: '#4CAF50' },
        recharge:     { label: '充值', sign: '+', color: '#4CAF50' },
        withdraw:     { label: '提款', sign: '-', color: '#333' }
    };

    var h = '';
    groupOrder.forEach(function(date) {
        h += '<div style="font-size:12px;color:#999;padding:12px 0 6px">' + date + '</div>';
        groups[date].forEach(function(b) {
            var t = typeMap[b.type] || { label: b.type, sign: '', color: '#333' };
            h += '<div style="background:white;border-radius:12px;padding:14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 4px rgba(0,0,0,0.06)">';
            h += '<div>';
            h += '<div style="font-size:14px;font-weight:500">' + t.label + (b.target ? ' · ' + b.target : '') + '</div>';
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
            topText = '转账成功';
            statusText = '待' + esc(msg.targetName || 'TA') + '确认收款';
        } else {
            statusText = '待你确认收款';
        }
        } else if (status === 'accepted') {
        if (isOut) {
            statusText = '对方已收款';
        } else {
            statusText = '已收款';
        }
    } else if (status === 'rejected') {
        if (isOut) {
            statusText = '对方已拒收，已退款';
        } else {
            statusText = '对方已拒收';
        }
    }

    // pending时正常颜色，完成后变淡
    var isPending = status === 'pending';
    var bgColor, borderColor, amountColor, statusColor;

    if (isPending) {
        bgColor = isOut ? '#FFF9E6' : '#F0FFF4';
        borderColor = isOut ? '#FFD700' : '#4CAF50';
        amountColor = '#222';
        statusColor = '#555';
    } else {
        bgColor = '#F5F5F5';
        borderColor = '#DDDDDD';
        amountColor = '#AAAAAA';
        statusColor = '#AAAAAA';
    }

    var h = '<div onclick="openTransferDetail(\'' + msg.id + '\')" style="cursor:pointer;background:' + bgColor + ';border:1.5px solid ' + borderColor + ';border-radius:14px;padding:14px 18px;min-width:180px;max-width:240px">';

    if (topText) {
        h += '<div style="font-size:11px;color:' + (isPending ? '#999' : '#BBBBBB') + ';margin-bottom:4px">' + topText + '</div>';
    }

    h += '<div style="font-size:13px;color:' + statusColor + ';margin-bottom:6px">' + statusText + '</div>';
    h += '<div style="font-size:24px;font-weight:700;color:' + amountColor + ';margin-bottom:6px">' + formatMoney(msg.amount) + '</div>';

    if (msg.remark) {
        h += '<div style="font-size:11px;color:' + (isPending ? '#999' : '#BBBBBB') + '">备注：' + esc(msg.remark) + '</div>';
    }

    h += '</div>';
    return h;
}