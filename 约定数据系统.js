(function () {
  function gid(id){ return document.getElementById(id); }
  function now(){ return Date.now(); }
  function clamp(v,min,max){ v=Number(v)||0; return Math.max(min, Math.min(max, v)); }
  function deepClone(o){ return JSON.parse(JSON.stringify(o)); }
  function pad(n){ return n<10 ? '0'+n : ''+n; }

  function getAccId() {
    if (window.curAcc && typeof curAcc === 'object' && curAcc.id) return curAcc.id;
    if (window.curAcc && typeof curAcc === 'string') return curAcc;
    if (window.D && D.curAccId) return D.curAccId;
    return '__default__';
  }

  function ensureV9() {
    if (!window.D) return;
    D.version = Number(D.version || 0);
    if (D.version < 9) D.version = 9;
    D.relation = D.relation || {};
    D.memory2 = D.memory2 || {};
    D.tasks2 = D.tasks2 || {};
    D.timeline2 = D.timeline2 || {};
    D.snapshots = Array.isArray(D.snapshots) ? D.snapshots : [];
    D.eventState = D.eventState || {};
    D.debug = D.debug || {};
    D.debug.tagLogOn = !!D.debug.tagLogOn;
    safeInitAccData(getAccId());
  }

  function safeInitAccData(accId){
    D.relation[accId] = D.relation[accId] || {};
    D.memory2[accId] = D.memory2[accId] || {};
    D.tasks2[accId] = Array.isArray(D.tasks2[accId]) ? D.tasks2[accId] : [];
    D.timeline2[accId] = Array.isArray(D.timeline2[accId]) ? D.timeline2[accId] : [];
    D.eventState[accId] = D.eventState[accId] || { dailyFlags:{} };
  }

  function tline(type, text, extra){
    var accId = getAccId(); safeInitAccData(accId);
    D.timeline2[accId].unshift({
      id: 'tl_' + now() + '_' + Math.random().toString(36).slice(2,7),
      type: type || 'sys',
      text: text || '',
      extra: extra || null,
      ts: now()
    });
    if (D.timeline2[accId].length > 500) D.timeline2[accId] = D.timeline2[accId].slice(0,500);
  }

  function getRel(charId){
    var accId = getAccId(); safeInitAccData(accId);
    if (!D.relation[accId][charId]) {
      D.relation[accId][charId] = { intimacy:0, trust:0, mood:0, updatedAt: now() };
    }
    return D.relation[accId][charId];
  }

  function applyRelation(charId, delta, reason){
    if (!charId) return;
    var r = getRel(charId);
    r.intimacy = clamp(r.intimacy + (Number(delta.intimacy)||0), -100, 100);
    r.trust = clamp(r.trust + (Number(delta.trust)||0), -100, 100);
    r.mood = clamp(r.mood + (Number(delta.mood)||0), -100, 100);
    r.updatedAt = now();
    tline('relation', '关系变化：' + (reason || '互动'), { charId: charId, delta: delta });
    saveSafe();
    renderRelationBar();
  }

  function addTask(task){
    var accId = getAccId(); safeInitAccData(accId);
    task.id = task.id || ('task_' + now() + '_' + Math.random().toString(36).slice(2,7));
    task.status = task.status || 'todo';
    task.createdAt = task.createdAt || now();
    D.tasks2[accId].unshift(task);
    if (D.tasks2[accId].length > 300) D.tasks2[accId] = D.tasks2[accId].slice(0,300);
    tline('task', '新增约定：' + (task.title || '未命名任务'), { taskId: task.id, charId: task.charId });
    saveSafe();
    renderTaskWidget(); renderTaskPage(); renderChatTaskHint();
    return task;
  }

  function finishTask(taskId){
    var accId = getAccId(); safeInitAccData(accId);
    var t = D.tasks2[accId].find(function(x){ return x.id===taskId; });
    if (!t) return;
    t.status = 'done'; t.doneAt = now();
    if (t.rewardIntimacy && t.charId) applyRelation(t.charId, { intimacy: Number(t.rewardIntimacy)||0 }, '完成约定');
    tline('task', '完成约定：' + (t.title||''), { taskId:t.id });
    saveSafe();
    renderTaskWidget(); renderTaskPage(); renderChatTaskHint();
  }

  function cancelTask(taskId){
    var accId = getAccId(); safeInitAccData(accId);
    var t = D.tasks2[accId].find(function(x){ return x.id===taskId; });
    if (!t) return;
    t.status = 'canceled'; t.canceledAt = now();
    tline('task', '取消约定：' + (t.title||''), { taskId:t.id });
    saveSafe();
    renderTaskWidget(); renderTaskPage(); renderChatTaskHint();
  }

  function upsertMemory(charId, scope, key, value, confidence){
    if (!charId || !scope || !key) return;
    var accId = getAccId(); safeInitAccData(accId);
    var bucket = D.memory2[accId][charId] || { short:[], long:{ profile:{}, preference:{}, taboo:{}, promises:[], milestones:[] }, updatedAt:0 };
    if (!bucket.long[scope]) bucket.long[scope] = {};
    bucket.long[scope][key] = { value: value, confidence: Number(confidence)||0.7, updatedAt: now() };
    bucket.updatedAt = now();
    D.memory2[accId][charId] = bucket;
    tline('memory', '更新记忆：'+scope+'.'+key, { charId:charId, key:key });
    saveSafe();
  }

  function forgetMemory(charId, scope, key){
    var accId = getAccId(); safeInitAccData(accId);
    var bucket = D.memory2[accId][charId];
    if (!bucket || !bucket.long || !bucket.long[scope]) return;
    delete bucket.long[scope][key];
    bucket.updatedAt = now();
    tline('memory', '删除记忆：'+scope+'.'+key, { charId:charId, key:key });
    saveSafe();
  }

  function saveSnapshot(reason){
    try{
      ensureV9();
      var snap = { id:'snap_'+now(), reason: reason||'manual', ts: now(), data: deepClone(D) };
      D.snapshots.unshift(snap);
      if (D.snapshots.length > 10) D.snapshots = D.snapshots.slice(0,10);
      saveSafe();
      return snap.id;
    }catch(e){ console.warn('saveSnapshot fail', e); }
  }

  function restoreSnapshot(id){
    var snap = (D.snapshots||[]).find(function(s){ return s.id===id; });
    if (!snap) return false;
    var keep = D.snapshots || [];
    var restored = deepClone(snap.data);
    restored.snapshots = keep;
    window.D = restored;
    saveSafe();
    location.reload();
    return true;
  }

  function parseAttrs(s){
    var o = {};
    if (!s) return o;
    s.replace(/([\w-]+)\s*=\s*"([^"]*)"/g, function(_,k,v){ o[k]=v; return ''; });
    s.replace(/([\w-]+)\s*=\s*'([^']*)'/g, function(_,k,v){ o[k]=v; return ''; });
    return o;
  }

  function numDelta(v){
    if (v == null) return 0;
    return Number(String(v).replace(/^\+/, '')) || 0;
  }

  function applyTagsFromText(text, ctx){
    if (!text || typeof text !== 'string') return text;
    ctx = ctx || {};
    var charId = ctx.charId || (window.curChar && curChar.id);
    var out = text;

    out = out.replace(/<relation\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      applyRelation(charId, {
        intimacy: numDelta(p.intimacy),
        trust: numDelta(p.trust),
        mood: numDelta(p.mood)
      }, p.reason || 'AI标签');
      return '';
    });

    out = out.replace(/<task\s+create\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      addTask({
        title: p.title || '新约定',
        desc: p.desc || '',
        dueAt: p.due ? (Date.parse(p.due) || (now() + 3600e3)) : null,
        charId: charId,
        createdBy: 'ai',
        rewardIntimacy: (p.rewardIntimacy != null ? Number(p.rewardIntimacy) : 2)
      });
      return '';
    });

    out = out.replace(/<task\s+done\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      if (p.id) finishTask(p.id);
      return '';
    });

    out = out.replace(/<task\s+cancel\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      if (p.id) cancelTask(p.id);
      return '';
    });

    out = out.replace(/<memory\s+upsert\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      upsertMemory(charId, p.scope || 'profile', p.key || '', p.value || '', p.confidence || 0.7);
      return '';
    });

    out = out.replace(/<memory\s+forget\b([^>]*)>/g, function(_, a){
      var p = parseAttrs(a);
      forgetMemory(charId, p.scope || 'profile', p.key || '');
      return '';
    });

    return out.trim();
  }

  function toPercent(v){ return (clamp((Number(v)||0)+100,0,200)/2) + '%'; }

  function renderRelationBar(){
    if (!window.curChar || !curChar.id) return;
    var r = getRel(curChar.id);
    if (gid('relIntimacyVal')) gid('relIntimacyVal').textContent = r.intimacy;
    if (gid('relTrustVal')) gid('relTrustVal').textContent = r.trust;
    if (gid('relMoodVal')) gid('relMoodVal').textContent = r.mood;
    if (gid('relIntimacyBar')) gid('relIntimacyBar').style.width = toPercent(r.intimacy);
    if (gid('relTrustBar')) gid('relTrustBar').style.width = toPercent(r.trust);
    if (gid('relMoodBar')) gid('relMoodBar').style.width = toPercent(r.mood);
  }

  function listTodayTasks(){
    var accId = getAccId(); safeInitAccData(accId);
    var s = D.tasks2[accId] || [];
    var today = new Date(); today.setHours(0,0,0,0);
    var ts = +today;
    return s.filter(function(t){
      if (t.status !== 'todo') return false;
      if (!t.dueAt) return true;
      var d = new Date(t.dueAt); d.setHours(0,0,0,0);
      return +d === ts;
    }).slice(0,3);
  }

    function renderTaskWidget(){
    var el = gid('taskWidget'); if (!el) return;
    var arr = listTodayTasks();
    if (!arr.length){ 
      // 空白状态的文案也变优雅一点
      el.innerHTML = '<div class="widget-empty" style="color:#a39bb0;margin-top:6px;line-height:1.4">一杯茶，一首歌<br>今天很空闲</div>'; 
      return; 
    }
    // 渲染成带圆圈的 iOS 提醒事项列表
    el.innerHTML = arr.map(function(t){
      return '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px">'
           + '<div style="width:12px;height:12px;border-radius:50%;border:1.5px solid #FFB347;flex-shrink:0"></div>'
           + '<div style="font-size:11px;color:#444;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;font-weight:500">' + escapeHtml(t.title || '未命名') + '</div>'
           + '</div>';
    }).join('');
  }

  function renderChatTaskHint(){
    var el = gid('chatTaskHint'); if (!el) return;
    var charId = window.curChar && curChar.id;
    if (!charId){ el.style.display='none'; return; }
    var accId = getAccId(); safeInitAccData(accId);
    var t = (D.tasks2[accId]||[]).find(function(x){ return x.status==='todo' && x.charId===charId; });
    if (!t){ el.style.display='none'; return; }
    el.style.display = 'block';
    el.textContent = '📌 当前约定：' + (t.title||'未命名');
  }

  function fmt(ts){
    if (!ts) return '未设置时间';
    var d = new Date(ts);
    return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes());
  }
  function dayKey(ts){ var d=new Date(ts); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); }
  function escapeHtml(s){ return String(s||'').replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  function renderTaskPage(){
    var el = gid('taskListWrap'); if (!el) return;
    var accId = getAccId(); safeInitAccData(accId);
    var arr = D.tasks2[accId] || [];
    if (!arr.length){ el.innerHTML = '<div class="empty-state" style="margin-top:40px"><div class="empty-icon" style="font-size:40px">📌</div><div class="empty-title" style="font-size:15px">暂无约定</div><div class="empty-desc">和TA聊天时可以创建约定</div></div>'; return; }
    
    el.innerHTML = arr.map(function(t){
      var isDone = t.status === 'done';
      var isCancel = t.status === 'canceled';
      var cls = 'task-card' + (isDone ? ' done' : '') + (isCancel ? ' canceled' : '');
      var icon = isDone ? '✓' : (isCancel ? '×' : '');
      
      var actionHtml = '';
      if(t.status === 'todo'){
         actionHtml = '<div class="task-actions"><button class="task-btn-icon ok" onclick="finishTaskById(\''+t.id+'\')">✓ 完成</button><button class="task-btn-icon cancel" onclick="cancelTaskById(\''+t.id+'\')">✕ 取消</button></div>';
      }

      return '<div class="'+cls+'">'
        + '<div class="task-status-icon">' + icon + '</div>'
        + '<div class="task-main">'
        + '  <div class="task-title">' + escapeHtml(t.title||'未命名') + '</div>'
        + '  <div class="task-meta">' + escapeHtml(fmt(t.dueAt||t.createdAt)) + '</div>'
        +    (t.desc ? '<div class="task-desc">' + escapeHtml(t.desc) + '</div>' : '')
        + actionHtml
        + '</div>'
        + '</div>';
    }).join('');
  }

  function renderTimelinePage(){
    var el = gid('timelineList'); if (!el) return;
    var accId = getAccId(); safeInitAccData(accId);
    var arr = D.timeline2[accId] || [];
    if (!arr.length){ el.innerHTML = '<div class="empty-state" style="margin-top:40px"><div class="empty-icon" style="font-size:40px">🕰️</div><div class="empty-title" style="font-size:15px">暂无记录</div></div>'; return; }
    var map = {};
    arr.forEach(function(i){ var k=dayKey(i.ts); (map[k]=map[k]||[]).push(i); });
    var days = Object.keys(map).sort().reverse();
    
    var html = '<div class="timeline-wrap">';
    html += days.map(function(d){
      var dayHtml = '<div class="timeline-day-group">';
      dayHtml += '<div class="timeline-date-label">' + d + '</div>';
      dayHtml += map[d].map(function(i){
          var typeCls = 'tl-type-' + (i.type || 'sys');
          var dObj = new Date(i.ts);
          var hm = pad(dObj.getHours()) + ':' + pad(dObj.getMinutes());
          
          return '<div class="timeline-node ' + typeCls + '">'
            + '<div class="tl-line"></div>'
            + '<div class="tl-dot"></div>'
            + '<div class="tl-content">'
            + '  <div class="tl-time">' + hm + '</div>'
            + '  <div class="tl-text">' + escapeHtml(i.text||'') + '</div>'
            + '</div>'
            + '</div>';
      }).join('');
      dayHtml += '</div>';
      return dayHtml;
    }).join('');
    html += '</div>';
    
    el.innerHTML = html;
  }

  function openPageById(id){ var p=gid(id); if(p) p.classList.add('active'); }
  function closePageById(id){ var p=gid(id); if(p) p.classList.remove('active'); }

  function openTaskPage(){ renderTaskPage(); openPageById('taskPage'); }
  function closeTaskPage(){ closePageById('taskPage'); }
  function openTimelinePage(){ renderTimelinePage(); openPageById('timelinePage'); }
  function closeTimelinePage(){ closePageById('timelinePage'); }
  function clearTimelineConfirm(){
    if (!confirm('确定清空当前账号时间线？')) return;
    var accId = getAccId(); safeInitAccData(accId);
    D.timeline2[accId] = []; saveSafe(); renderTimelinePage();
  }
  function createQuickTask(){
    var t = prompt('输入任务标题（如：今晚散步）');
    if (!t) return;
    addTask({ title:t, charId: window.curChar&&curChar.id, createdBy:'user', rewardIntimacy:1 });
  }

  function saveSafe(){ if (typeof save === 'function') save(); }

  function runEventEngine(){
    var accId = getAccId(); safeInitAccData(accId);
    var st = D.eventState[accId];
    var d = new Date(), day = d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    st.dailyFlags[day] = st.dailyFlags[day] || {};
    var h = d.getHours();

    if (h >= 7 && h <= 10 && !st.dailyFlags[day].morning){
      st.dailyFlags[day].morning = 1;
      addTask({ title:'早安打卡', desc:'和TA说早安', createdBy:'event', rewardIntimacy:1, charId: window.curChar&&curChar.id });
    }
    if (h >= 21 && h <= 23 && !st.dailyFlags[day].night){
      st.dailyFlags[day].night = 1;
      addTask({ title:'晚安打卡', desc:'睡前说晚安', createdBy:'event', rewardIntimacy:1, charId: window.curChar&&curChar.id });
    }

    // 清理旧 flag
    var keys = Object.keys(st.dailyFlags);
    if (keys.length > 10){
      keys.sort();
      keys.slice(0, keys.length-10).forEach(function(k){ delete st.dailyFlags[k]; });
    }
    saveSafe();
  }

  // 对外
  window.applyTagsFromText = applyTagsFromText;
  window.saveSnapshot = saveSnapshot;
  window.restoreSnapshot = restoreSnapshot;
  window.openTaskPage = openTaskPage;
  window.closeTaskPage = closeTaskPage;
  window.openTimelinePage = openTimelinePage;
  window.closeTimelinePage = closeTimelinePage;
  window.clearTimelineConfirm = clearTimelineConfirm;
  window.createQuickTask = createQuickTask;
  window.finishTaskById = finishTask;
  window.cancelTaskById = cancelTask;
  window.renderRelationBar = renderRelationBar;
  window.renderTaskWidget = renderTaskWidget;
  window.renderTaskPage = renderTaskPage;
  window.renderTimelinePage = renderTimelinePage;

  // 启动
  function boot(){
    ensureV9();
    renderTaskWidget();
    renderRelationBar();
    renderChatTaskHint();
    setInterval(function(){ runEventEngine(); renderTaskWidget(); renderChatTaskHint(); }, 60000);
    setTimeout(runEventEngine, 1200);

    // 轻量 hook：切页/开聊后刷新
    var _openPage = window.openPage;
    if (typeof _openPage === 'function') {
      window.openPage = function(name){
        var r = _openPage.apply(this, arguments);
        if (name === 'chat' || name === 'home' || !name) {
          setTimeout(function(){ renderTaskWidget(); renderRelationBar(); renderChatTaskHint(); }, 60);
        }
        return r;
      };
    }
    var _openChat = window.openChat;
    if (typeof _openChat === 'function') {
      window.openChat = function(){
        var r = _openChat.apply(this, arguments);
        setTimeout(function(){ renderRelationBar(); renderChatTaskHint(); }, 60);
        return r;
      };
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();