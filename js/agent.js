// AIエージェント「ムーサン」チャット機能
// ===== AGENT CODE =====
let agentMessages = [];
let agentSelectedPlayer = '';
let agentIsTyping = false;
let MUSACHEN_API_KEY = localStorage.getItem('musachen_api_key') || '';

async function loadApiKeyFromSupabase() {
  try {
    const { data, error } = await sb.from('agent_config').select('value').eq('key', 'api_key').single();
    if (data && data.value) {
      MUSACHEN_API_KEY = data.value;
      localStorage.setItem('musachen_api_key', data.value);
      return true;
    }
  } catch(e) { console.warn('loadApiKeyFromSupabase error', e); }
  return false;
}

async function saveApiKeyToSupabase(key) {
  try {
    await sb.from('agent_config').upsert({ key: 'api_key', value: key });
  } catch(e) { console.warn('saveApiKeyToSupabase error', e); }
}

// スマホキーボード対応（iOS Safari）
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => {
    const win = document.getElementById('agent-window');
    if (win && win.classList.contains('open')) {
      scrollAgentToBottom();
    }
  });
}

function openAgent() {
  document.getElementById('agent-window').classList.add('open');
  document.body.classList.add('agent-open');
  populateAgentPlayerSelect();
  subscribeAgentChat();

  if (agentMessages.length === 0) {
    // ローディング表示
    const el = document.getElementById('agent-messages');
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--dim);font-size:14px;">読み込み中...</div>';

    fetchLiveGamesForAgent().then(async () => {
      // 必ずSupabaseからAPIキーを取得してから判断
      if (!MUSACHEN_API_KEY) {
        await loadApiKeyFromSupabase();
      }
      el.innerHTML = '';
      await loadAgentHistory();
      if (agentMessages.length === 0) {
        if (!MUSACHEN_API_KEY) {
          showApiKeyPrompt();
        } else {
          setTimeout(() => addAgentMsg('bot', getWelcomeMsg()), 400);
        }
      }
    });
  }
  scrollAgentToBottom();
}

function closeAgent() {
  document.getElementById('agent-window').classList.remove('open');
  document.body.classList.remove('agent-open');
  const win = document.getElementById('agent-window');
  win.style.height = '';
  win.style.top = '';
}

function showApiKeyPrompt() {
  const el = document.getElementById('agent-messages');
  const div = document.createElement('div');
  div.id = 'apikey-prompt';
  div.style.cssText = 'background:var(--surface);border:1px solid rgba(240,192,64,.4);border-radius:16px;padding:18px;margin:8px 0;';
  div.innerHTML = `
    <div style="font-size:15px;font-weight:900;color:var(--gold);margin-bottom:8px;">🔑 APIキーの設定</div>
    <div style="font-size:13px;color:var(--dim);margin-bottom:12px;line-height:1.6;">
      ムーサンを使うには Anthropic API キーが必要です。<br>
      キーは端末にのみ保存され、他には送信されません。
    </div>
    <div style="font-size:12px;color:var(--dimmer);margin-bottom:10px;">
      取得先: <a href="https://console.anthropic.com/keys" target="_blank" style="color:var(--gold);">console.anthropic.com/keys</a>
    </div>
    <input id="apikey-input" type="password" placeholder="sk-ant-..." 
      style="width:100%;background:var(--surface2);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:14px;padding:10px 12px;outline:none;font-family:'Noto Sans JP',sans-serif;margin-bottom:10px;">
    <button onclick="saveApiKey()" style="width:100%;padding:12px;background:var(--gold);border:none;color:#1a1a1a;font-family:'Noto Sans JP',sans-serif;font-size:14px;font-weight:900;border-radius:10px;cursor:pointer;">
      設定して起動 ▶
    </button>
  `;
  el.appendChild(div);
  scrollAgentToBottom();
}

async function saveApiKey() {
  const key = document.getElementById('apikey-input').value.trim();
  if (!key.startsWith('sk-ant-')) {
    alert('正しいAPIキーを入力してください（sk-ant- で始まる文字列）');
    return;
  }
  MUSACHEN_API_KEY = key;
  localStorage.setItem('musachen_api_key', key);
  // Supabaseにも保存して全端末で共有
  await saveApiKeyToSupabase(key);
  const prompt = document.getElementById('apikey-prompt');
  if (prompt) prompt.remove();
  addAgentMsg('bot', getWelcomeMsg());
}

async function resetApiKey() {
  localStorage.removeItem('musachen_api_key');
  MUSACHEN_API_KEY = '';
  try { await sb.from('agent_config').delete().eq('key', 'api_key'); } catch(e) {}
  agentMessages = [];
  document.getElementById('agent-messages').innerHTML = '';
  showApiKeyPrompt();
}

function populateAgentPlayerSelect() {
  const sel = document.getElementById('agent-player-sel');
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = '<option value="">── 選手を選択（個人分析）──</option>';
  MEMBERS.forEach(m => {
    const v = m.name + '(' + m.num + ')';
    sel.innerHTML += `<option value="${v}"${current===v?' selected':''}>${v}</option>`;
  });
}

function onAgentPlayerChange() {
  const v = document.getElementById('agent-player-sel').value;
  agentSelectedPlayer = v;
  updateQuickBtns();
  if (v) {
    const name = v.split('(')[0];
    sendQuick(`${name}選手の成績を分析してアドバイスをください`);
  }
}

function updateQuickBtns() {
  const btnsEl = document.getElementById('agent-quick-btns');
  if (agentSelectedPlayer) {
    const name = agentSelectedPlayer.split('(')[0];
    btnsEl.innerHTML = `
      <button class="agent-quick-btn" onclick="sendQuick('${name}選手の打撃成績を詳しく教えてください')">📊 打撃成績</button>
      <button class="agent-quick-btn" onclick="sendQuick('${name}選手が成績を上げるには何が必要ですか？')">📈 改善ポイント</button>
      <button class="agent-quick-btn" onclick="sendQuick('${name}選手の強みと弱みを教えてください')">⚡ 強み・弱み</button>
      <button class="agent-quick-btn" onclick="sendQuick('${name}選手におすすめの練習メニューを提案してください')">🏋️ 練習提案</button>
      <button class="agent-quick-btn" onclick="agentSelectedPlayer='';document.getElementById('agent-player-sel').value='';updateQuickBtns()">🔙 チーム全体へ</button>
    `;
  } else {
    btnsEl.innerHTML = `
      <button class="agent-quick-btn" onclick="sendQuick('チームの今シーズンの状況を分析してください')">📈 チーム総評</button>
      <button class="agent-quick-btn" onclick="sendQuick('最近の試合結果はどうですか？')">⚾ 直近の結果</button>
      <button class="agent-quick-btn" onclick="sendQuick('チームの課題は何ですか？')">🔍 課題分析</button>
      <button class="agent-quick-btn" onclick="sendQuick('次の試合に向けてアドバイスください')">💪 試合前アドバイス</button>
    `;
  }
}

function getWelcomeMsg() {
  const latestYear = Math.max(...TEAM_YEARS.map(t => t.year));
  const ty = TEAM_YEARS.find(t => t.year === latestYear);
  const wins = ty ? ty.w : '?';
  const losses = ty ? ty.l : '?';

  // Supabaseの最新確定試合を取得
  let latestGameMsg = '';
  if (agentLiveGames && agentLiveGames.length > 0) {
    const done = agentLiveGames.filter(g => g.status === 'done');
    if (done.length > 0) {
      const lg = done[0];
      const sc = lg.final_score || {};
      const my = sc.my ?? '-';
      const opp = sc.opp ?? '-';
      const result = lg.match_result || (sc.my != null ? (sc.my > sc.opp ? '勝利' : sc.my < sc.opp ? '敗戦' : '引分') : '');
      latestGameMsg = `\n最新の確定試合は <span class="stat-chip">vs ${lg.opp} ${my}-${opp} ${result}</span> 。`;
    }
  }

  return `ムーサンです。データ分析、始めます。📊\n\n${latestYear}シーズン現在、チームは<span class="stat-chip">${wins}勝${losses}敗</span>。${latestGameMsg}\n\nSupabaseの試合データもリアルタイムで見てるぞ。個人の成績分析、練習アドバイス、試合の振り返りなど何でも聞いてくれ！`;
}

function sendQuick(text) {
  document.getElementById('agent-input').value = text;
  sendAgentMsg();
}

// ---- チャット履歴：Supabase共有 ----
let agentChatSubscription = null;
let agentLastLoadedId = null; // 重複描画防止

async function loadAgentHistory() {
  try {
    const { data, error } = await sb
      .from('agent_chat')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100);
    if (error || !data) return;
    const el = document.getElementById('agent-messages');
    el.innerHTML = '';
    agentMessages = [];
    data.forEach(row => {
      agentMessages.push({ role: row.role, text: row.content });
      renderAgentMsgEl(row.role, row.content);
    });
    if (data.length > 0) agentLastLoadedId = data[data.length - 1].id;
    scrollAgentToBottom();
  } catch(e) { console.warn('loadAgentHistory error', e); }
}

function renderAgentMsgEl(role, text) {
  const el = document.getElementById('agent-messages');
  const div = document.createElement('div');
  div.className = 'agent-msg ' + role;
  const avatarIcon = role === 'bot'
    ? `<img src="logo.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">`
    : '👤';
  div.innerHTML = `
    <div class="agent-msg-avatar">${avatarIcon}</div>
    <div class="agent-bubble">${text}</div>
  `;
  el.appendChild(div);
}

async function saveAgentMsg(role, text) {
  try {
    const { data, error } = await sb.from('agent_chat').insert({ role, content: text }).select('id').single();
    if (data) agentLastLoadedId = data.id; // 自分が送ったメッセージのIDを記録→リアルタイム重複防止
  } catch(e) { console.warn('saveAgentMsg error', e); }
}

function subscribeAgentChat() {
  if (agentChatSubscription) return;
  agentChatSubscription = sb
    .channel('agent-chat-rt')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'agent_chat' }, payload => {
      const row = payload.new;
      // 自分がすでに描画したものは追加しない（直近のメッセージはsendAgentMsgで既に描画済）
      if (row.id === agentLastLoadedId) return;
      agentLastLoadedId = row.id;
      agentMessages.push({ role: row.role, text: row.content });
      renderAgentMsgEl(row.role, row.content);
      scrollAgentToBottom();
    })
    .subscribe();
}

function addAgentMsg(role, text) {
  agentMessages.push({ role, text });
  renderAgentMsgEl(role, text);
  saveAgentMsg(role, text);
  scrollAgentToBottom();
}

function showTypingIndicator() {
  const el = document.getElementById('agent-messages');
  const div = document.createElement('div');
  div.className = 'agent-typing-wrap';
  div.id = 'agent-typing';
  div.innerHTML = `
    <div class="agent-msg-avatar" style="background:none;padding:0;overflow:hidden;">
      <img src="logo.jpg" style="width:34px;height:34px;border-radius:50%;object-fit:cover;">
    </div>
    <div class="agent-typing-dots"><span></span><span></span><span></span></div>
  `;
  el.appendChild(div);
  scrollAgentToBottom();
}

function removeTypingIndicator() {
  const t = document.getElementById('agent-typing');
  if (t) t.remove();
}

function scrollAgentToBottom() {
  const el = document.getElementById('agent-messages');
  setTimeout(() => el.scrollTop = el.scrollHeight, 50);
}

async function sendAgentMsg() {
  const inp = document.getElementById('agent-input');
  const text = inp.value.trim();
  if (!text || agentIsTyping) return;

  // APIキーがない場合はSupabaseから再取得
  if (!MUSACHEN_API_KEY) {
    await loadApiKeyFromSupabase();
  }
  if (!MUSACHEN_API_KEY) {
    addAgentMsg('bot', '⚠️ APIキーが設定されていません。管理者にお知らせください。');
    return;
  }

  inp.value = '';
  inp.style.height = 'auto';
  addAgentMsg('user', text);
  agentIsTyping = true;
  showTypingIndicator();

  try {
    const systemPrompt = await buildAgentSystemPrompt();
    const apiMessages = agentMessages.slice(-12).map(m => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.role === 'bot' ? m.text.replace(/<[^>]+>/g, '') : m.text
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': MUSACHEN_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1000,
        system: systemPrompt,
        messages: apiMessages
      })
    });
    const data = await res.json();
    if (data.error) {
      removeTypingIndicator();
      if (data.error.type === 'authentication_error') {
        addAgentMsg('bot', '⚠️ APIキーが無効です。右上の「🔑」ボタンから再設定してください。');
        MUSACHEN_API_KEY = '';
        localStorage.removeItem('musachen_api_key');
      } else {
        addAgentMsg('bot', `エラー: ${data.error.message}`);
      }
      agentIsTyping = false;
      return;
    }
    const reply = data.content?.[0]?.text || 'データを解析できませんでした。';
    removeTypingIndicator();
    addAgentMsg('bot', formatAgentReply(reply));
  } catch(e) {
    removeTypingIndicator();
    addAgentMsg('bot', '接続エラーが発生しました。ネットワークを確認してください。');
  }
  agentIsTyping = false;
}

function formatAgentReply(text) {
  // Convert markdown-like patterns to HTML
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/【(.+?)】/g, '<span class="stat-chip">$1</span>');
  // Format lines starting with ▶ or ◆ as advice blocks
  const lines = text.split('\n');
  let result = '';
  let inAdvice = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    if (l.startsWith('▶') || l.startsWith('◆') || l.startsWith('✅') || l.startsWith('💡')) {
      if (!inAdvice) { result += '<div class="advice-bar">'; inAdvice = true; }
      result += l + '<br>';
    } else {
      if (inAdvice) { result += '</div>'; inAdvice = false; }
      result += l + (i < lines.length - 1 ? '<br>' : '');
    }
  }
  if (inAdvice) result += '</div>';
  return result;
}

// Supabaseから最新試合データをキャッシュ
let agentLiveGames = null;

async function fetchLiveGamesForAgent() {
  try {
    const { data, error } = await sb.from('games').select('*').order('date', { ascending: false }).limit(20);
    if (error || !data) { agentLiveGames = []; return []; }
    agentLiveGames = data;
    return data;
  } catch(e) {
    agentLiveGames = [];
    return [];
  }
}

function formatLiveGameForAgent(g) {
  const score = g.final_score || {};
  const my = score.my ?? '未確定';
  const opp = score.opp ?? '未確定';
  const result = g.match_result || (score.my != null && score.opp != null ? (score.my > score.opp ? '勝' : score.my < score.opp ? '負' : '引分') : '未確定');
  const status = g.status === 'done' ? '確定済' : '未確定/進行中';

  // 打撃成績をまとめる
  let batSummary = '';
  if (g.batters) {
    const half = g.batters.top || {};
    const entries = [];
    for (let o = 1; o <= 9; o++) {
      const b = half[o];
      if (!b || !b.name) continue;
      const results = b.results || {};
      let h=0, ab=0, rbi=0, hr=0, double_=0, triple=0, bb=0, hbp=0, so=0, sac=0, sb=0, wp=0;
      Object.values(results).forEach(inningResult => {
        const arr = Array.isArray(inningResult) ? inningResult : [inningResult];
        arr.forEach(r => {
          if (!r || !r.type) return;
          const t = r.type;
          if (t === 'H')          { h++; ab++; }
          else if (t === '二塁打') { h++; ab++; double_++; }
          else if (t === '三塁打') { h++; ab++; triple++; }
          else if (t === '本塁打') { h++; ab++; hr++; }
          else if (t === '凡打')   { ab++; }
          else if (t === '三振')   { ab++; so++; }
          else if (t === '四球')   { bb++; }
          else if (t === '死球')   { hbp++; }
          else if (t === '犠打')   { sac++; }
          else if (t === '盗塁')   { sb++; }
          else if (t === '暴投')   { wp++; }
          rbi += r.rbi || 0;
        });
      });
      if (ab > 0 || h > 0 || bb > 0 || hbp > 0 || sac > 0) {
        const obp = (ab + bb + hbp + sac) > 0
          ? ((h + bb + hbp) / (ab + bb + hbp + sac)).toFixed(3)
          : '.000';
        let detail = `${b.name}: ${h}安打(${double_>0?double_+'二塁打 ':''}${triple>0?triple+'三塁打 ':''}${hr>0?hr+'本塁打 ':''}単打${h-double_-triple-hr}本)/${ab}打数 打点${rbi} 出塁率${obp}`;
        if (bb > 0) detail += ` 四球${bb}`;
        if (hbp > 0) detail += ` 死球${hbp}`;
        if (so > 0) detail += ` 三振${so}`;
        if (sac > 0) detail += ` 犠打${sac}`;
        if (sb > 0) detail += ` 盗塁${sb}`;
        entries.push(detail);
      }
    }
    if (entries.length) batSummary = '\n  【打撃成績】\n  ' + entries.join('\n  ');
  }

  // 投手成績
  let pitSummary = '';
  if (g.pitchers && g.pitchers.my && g.pitchers.my.length) {
    const pitLines = g.pitchers.my.map(p => {
      const ip = p.ip != null ? `${p.ip}回${p.ip3 ? p.ip3+'/3' : ''}` : '?回';
      return `${p.name}: ${ip} 自責${p.er ?? '?'}点 失点${p.r ?? '?'}点 K${p.so ?? 0} BB${p.bb ?? 0} 被安打${p.h ?? '?'} 被HR${p.hr ?? 0} 死球${p.hbp ?? 0} 暴投${p.wp ?? 0} 結果:${p.result || '-'}`;
    });
    pitSummary = '\n  【投手成績】\n  ' + pitLines.join('\n  ');
  }

  return `【${g.date ? g.date.slice(0,10) : '日付不明'} vs ${g.opp || '相手不明'}】${status} ${my}-${opp} ${result}${batSummary}${pitSummary}`;
}

async function buildAgentSystemPrompt() {
  const latestYear = Math.max(...ARC_YEARS);

  // Supabaseから最新試合データ取得
  const liveGames = await fetchLiveGamesForAgent();
  const liveGamesSummary = liveGames.length
    ? liveGames.slice(0, 10).map(formatLiveGameForAgent).join('\n')
    : '（データなし）';

  // 直近の確定試合を別途まとめる
  const doneGames = liveGames.filter(g => g.status === 'done').slice(0, 5);
  const latestGame = doneGames[0] || null;
  const latestGameStr = latestGame ? formatLiveGameForAgent(latestGame) : '（確定試合なし）';

  let playerContext = '';
  if (agentSelectedPlayer) {
    const name = agentSelectedPlayer.split('(')[0];
    const num = parseInt(agentSelectedPlayer.match(/\((\d+)\)/)?.[1] || '0');
    const batStats = ARC_BATTING.filter(b => b.name === name || b.num === num);
    const pitStats = ARC_PITCHING.filter(p => p.name === name || p.num === num);
    playerContext = `\n\n## 選択中の選手: ${name}(#${num})\n### 打撃成績（年度別）\n${JSON.stringify(batStats, null, 1)}\n### 投球成績（年度別）\n${JSON.stringify(pitStats, null, 1)}`;
  } else {
    const latestBat = ARC_BATTING.filter(b => b.year === latestYear).sort((a,b) => b.avg - a.avg).slice(0, 8);
    playerContext = `\n\n## ${latestYear}年 打撃上位選手\n${JSON.stringify(latestBat, null, 1)}`;
  }

  return `あなたは草野球チーム「ムサセン」の専属データアナリスト「ムーサン」です。チームの一員として、データに基づいた分析と具体的なアドバイスをします。

## あなたのキャラクター
- 名前は「ムーサン」。チームのデータ担当として親しまれている
- 冷静で論理的だが、チームへの熱い想いがある
- 数字を根拠に語るが、感情的なサポートも忘れない
- 専門的すぎず、草野球レベルに合わせた実践的アドバイスをする
- 「データによると〜です」「数字が示しているのは〜ます」など丁寧な口調を使う
- 励ます時は具体的な数字を引用して励ます
- 一人称は「ムーサン」
- 語尾は必ず「〜です」「〜ます」「〜ますね」「〜ですよ」などの丁寧語を使う
- 「〜だ」「〜だな」「〜だったな」「〜だぞ」などの断定口調は絶対に使わない

## チームデータ
### チーム年度別成績（固定統計）
${JSON.stringify(TEAM_YEARS, null, 1)}

### 全選手リスト
${JSON.stringify(MEMBERS.map(m=>m.name+'('+m.num+')'), null, 1)}

## ★ リアルタイム試合データ（Supabaseより取得・最新）
### 直近の確定試合
${latestGameStr}

### 最近の試合一覧（最新10件）
${liveGamesSummary}
${playerContext}

## 回答のガイドライン
- 日本語で回答する
- 「今日の試合」「最新の試合」はリアルタイム試合データを必ず参照して答える
- 成績の数字を必ず引用して具体的に話す
- 打撃アドバイス: 打率(.250以上=良い、.300以上=優秀)、出塁率(.350以上=良い)を基準に
- 練習提案は草野球で実践できる具体的なものにする
- 回答は200〜400文字程度、長すぎず短すぎず
- 重要な数字は【 】で囲む（例:【打率.389】）
- アドバイスは ▶ で始める
- チームメートとして温かく、でもデータは正直に伝える`;
}
