// アプリ本体ロジック（スコア入力・成績集計・画面制御）
let saveTimer=null;
function showSync(ok=true){}
async function loadGames(){
  try {
    console.log('loadGames: connecting to Supabase...');
    const{data,error}=await sb.from('games').select('*').order('date',{ascending:false});
    if(error){console.error('Supabase error:',error.message,error);showSync(false);renderGameList();return;}
    console.log('loadGames: got',data?data.length:0,'rows');
    games=data.map(r=>({id:r.id,opp:r.opp,date:r.date,venue:r.venue,status:r.status,orders:r.orders||9,scores:r.scores,batters:r.batters,pinchHitters:r.pinch_hitters,pitchers:r.pitchers,finalScore:r.final_score,matchResult:r.match_result,updatedAt:r.updated_at}));
    console.log('loadGames: games=',games.length);
    renderGameList();
  } catch(e) {
    console.error('loadGames exception:',e.message,e);
    renderGameList();
  }
}
async function saveGameToSupabase(g, silent=false){
  try {
    const{error}=await sb.from('games').upsert({id:g.id,opp:g.opp,date:g.date,venue:g.venue,status:g.status,orders:g.orders||9,scores:g.scores,batters:g.batters,pinch_hitters:g.pinchHitters,pitchers:g.pitchers,final_score:g.finalScore,match_result:g.matchResult||null,updated_at:new Date().toISOString()});
    if(!error && !silent) setAutosaveSaved();
    if(error)console.error('save error:',error.message,error);
  } catch(e) {
    console.error('saveGameToSupabase exception:',e);
    showSync(false);
  }
}
let isDirty = false; // 変更フラグ

function scheduleSave(){
  if(!currentGame)return;
  isDirty = true;
  clearTimeout(saveTimer);
  updateAutosaveIndicator();
  saveTimer=setTimeout(()=>saveCurrentGame(),1500);
}
function updateAutosaveIndicator(){
  const el=document.getElementById('autosave-indicator');
  if(!el)return;
  el.textContent='保存中...';
}
function setAutosaveSaved(){
  const el=document.getElementById('autosave-indicator');
  if(!el)return;
  lastSavedAt=new Date();
  updateAutosaveTime();
}
let lastSavedAt=null;
function updateAutosaveTime(){
  const el=document.getElementById('autosave-indicator');
  if(!el||!lastSavedAt)return;
  const diff=Math.floor((new Date()-lastSavedAt)/1000);
  if(diff<60) el.textContent='保存済（たった今）';
  else if(diff<3600) el.textContent='保存済（'+Math.floor(diff/60)+'分前）';
  else el.textContent='保存済（'+Math.floor(diff/3600)+'時間前）';
}
setInterval(()=>{if(lastSavedAt)updateAutosaveTime();},30000);
function saveCurrentGame(){if(!currentGame)return;currentGame.batters=JSON.parse(JSON.stringify(batters));currentGame.scores=JSON.parse(JSON.stringify(scores));currentGame.pitchers=JSON.parse(JSON.stringify(pitchers));currentGame.pinchHitters=JSON.parse(JSON.stringify(pinchHitters||{top:{},bot:{}}));currentGame.orders=ORDERS;let my=0,opp=0;for(let i=1;i<=INNINGS;i++){my+=scores[i].top||0;opp+=scores[i].bot||0;}currentGame.finalScore={my,opp};saveGameToSupabase(currentGame);}
function subscribeRealtime(){sb.channel('games-rt').on('postgres_changes',{event:'*',schema:'public',table:'games'},payload=>{if(!currentGame||(payload.new&&payload.new.id!==currentGame.id))loadGames();}).subscribe();}
// STATE
const INNINGS=9;
let ORDERS=9;
let curHalf='top';
let batters={};
['top','bot'].forEach(h=>{batters[h]={};for(let o=1;o<=9;o++)batters[h][o]={name:'',pos:'',results:{}};});
let pinchHitters={top:{},bot:{}};
let scores={};for(let i=1;i<=9;i++)scores[i]={top:0,bot:0};
let pitchers={my:[],opp:[]};
let mst={half:null,order:null,isPinch:false,pinchIdx:null,inning:null,atBat:0,rbi:0,type:null};
let currentGame=null;
let games=[];

// OPTIONS
function memberOptions(sel){let o='<option value="">－ 未選択 －</option>';MEMBERS.forEach(m=>{const v=m.name+'('+m.num+')';o+=`<option value="${v}"${sel===v?' selected':''}>${v}</option>`;});return o;}
function getPlayerPhoto(num){return PLAYER_PHOTOS[num]||PLAYER_PHOTO_DEFAULT;}
function getPlayerPhotoByName(nameNum){
  const m=MEMBERS.find(x=>x.name+'('+x.num+')'===nameNum);
  return m?getPlayerPhoto(m.num):PLAYER_PHOTO_DEFAULT;
}
function posOptions(sel){let o='<option value="">－</option>';POSITIONS.forEach(p=>o+=`<option value="${p}"${sel===p?' selected':''}>${p}</option>`);return o;}
function pitcherMemberOptions(sel){let o='<option value="">選手を選択</option><optgroup label="投手陣">';PITCHER_NUMS.forEach(n=>{const m=MEMBERS.find(x=>x.num===n);if(m){const v=m.name+'('+m.num+')';o+=`<option value="${v}"${sel===v?' selected':''}>${v}</option>`;}});o+='</optgroup><optgroup label="全選手">';MEMBERS.filter(m=>!PITCHER_NUMS.includes(m.num)).forEach(m=>{const v=m.name+'('+m.num+')';o+=`<option value="${v}"${sel===v?' selected':''}>${v}</option>`;});return o+'</optgroup>';}
function getTeamInitial(name){return /^[A-Za-z0-9]/.test(name)?name.slice(0,2).toUpperCase():name.slice(0,2);}
// INIT
window.addEventListener('DOMContentLoaded',async()=>{
  const arcEl=document.getElementById('screen-archive');
  arcEl.style.cssText='display:block;visibility:hidden;pointer-events:none;';
  initRanking();renderRanking();renderTeamYears();initResults();
  arcEl.style.cssText='';
  await loadGames();
  buildRankYearBar();renderRanking();renderTeamYears();initResults();
  subscribeRealtime();
});
// SCREEN
function showScreen(name){
  ['score','archive','scoreinput'].forEach(s=>{const el=document.getElementById('screen-'+s);if(el)el.classList.remove('active');});
  document.getElementById('screen-'+name).classList.add('active');
  // ナビタブは常に表示・active更新
  const hNormal=document.getElementById('hdr-normal');
  const hScore=document.getElementById('hdr-scoreinput');
  if(name==='scoreinput'){
    if(hNormal)hNormal.style.display='none';
    if(hScore)hScore.style.display='flex';
  }else{
    if(hNormal)hNormal.style.display='flex';
    if(hScore)hScore.style.display='none';
  }
  // ナビタブactive（scoreinput時はscoreをactive）
  document.querySelectorAll('.hdr-nav-btn').forEach(b=>b.classList.remove('active'));
  const targetNav = name==='scoreinput'?'score':name;
  const activeBtn=document.getElementById('hnav-'+targetNav);
  if(activeBtn)activeBtn.classList.add('active');
  if(name==='archive')renderRanking();
}
// GAME LIST

function formatUpdatedAt(iso){
  if(!iso) return '';
  // タイムゾーンなしの場合はUTCとして扱うためZを付加
  let isoZ = iso;
  if(!iso.endsWith('Z') && !iso.includes('+') && !iso.includes('-', 10)){
    isoZ = iso.replace(' ', 'T') + 'Z';
  } else {
    isoZ = iso.replace(' ', 'T').replace(/\+00(:00)?$/, 'Z');
  }
  const d = new Date(isoZ);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if(diff < 60) return '今';
  if(diff < 3600) return Math.floor(diff/60)+'分前';
  if(diff < 86400) return Math.floor(diff/3600)+'時間前';
  const m = d.getMonth()+1;
  const day = d.getDate();
  const h = d.getHours().toString().padStart(2,'0');
  const min = d.getMinutes().toString().padStart(2,'0');
  return m+'/'+day+' '+h+':'+min;
}

function renderGameList(){
  const el=document.getElementById('gamelist-all');
  if(!el) return;
  const norm=d=>(d||'').replace(/\//g,'-');
  const sorted=[...games].sort((a,b)=>norm(b.date).localeCompare(norm(a.date)));
  const upcoming=sorted.filter(g=>g.status!=='done');
  const done=sorted.filter(g=>g.status==='done');
  let html='';
  html+='<div style="font-size:12px;font-weight:700;color:var(--dim);letter-spacing:1px;padding:4px 2px 8px;">予定試合</div>';
  html+=upcoming.length?upcoming.map(g=>gameCard(g)).join(''):'<p style="color:var(--dimmer);font-size:14px;padding:4px 0 12px;">予定されている試合はありません</p>';
  html+='<div style="font-size:12px;font-weight:700;color:var(--dim);letter-spacing:1px;padding:16px 2px 8px;border-top:1px solid var(--border);margin-top:8px;">スコア確定</div>';
  html+=done.length?done.map(g=>gameCard(g)).join(''):'<p style="color:var(--dimmer);font-size:14px;padding:4px 0;">確定済みの試合はありません</p>';
  el.innerHTML=html;
}
function gameCard(g){
  const initial=getTeamInitial(g.opp);
  let rightHtml='';
  if(g.status==='done'&&g.finalScore){
    const isWin=g.matchResult==='勝';
    const isDraw=g.matchResult==='分';
    const scoreColor=isWin?'var(--gold)':isDraw?'var(--dim)':'var(--rb)';
    const label=isWin?'WIN':isDraw?'DRAW':'LOSE';
    rightHtml=`<div style="font-family:'Bebas Neue',cursive;font-size:28px;color:${scoreColor};line-height:1;">${g.finalScore.my}-${g.finalScore.opp}</div>
      <div style="font-size:11px;font-weight:700;color:${scoreColor};">${label}</div>`;
  }
  return`<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;display:flex;align-items:center;gap:14px;" onclick="openGame('${g.id}')">
    <div style="flex:1;min-width:0;"><div style="font-size:17px;font-weight:700;margin-bottom:3px;">vs ${g.opp}</div><div style="font-size:12px;color:var(--dim);margin-bottom:3px;">${g.date}</div><div style="font-size:11px;color:var(--dimmer);">${g.venue}</div></div>
    <div style="text-align:right;flex-shrink:0;min-width:60px;">${rightHtml}${g.updatedAt?`<div style="font-size:10px;color:var(--dimmer);margin-top:4px;">最終更新：${formatUpdatedAt(g.updatedAt)}</div>`:''}</div>

  </div>`;
}
function openNewGame(){const now=new Date();now.setMinutes(0);document.getElementById('ng-date').value=now.toISOString().slice(0,16);document.getElementById('ng-opp').value='';document.getElementById('ng-venue').value='';document.getElementById('newgame-modal').classList.add('open');}
function closeNewGame(e){if(!e||e.target===document.getElementById('newgame-modal'))document.getElementById('newgame-modal').classList.remove('open');}
async function createGame(){
  const opp=document.getElementById('ng-opp').value.trim();
  const date=document.getElementById('ng-date').value;
  const venue=document.getElementById('ng-venue').value.trim();
  if(!opp){alert('対戦相手を入力してください');return;}
  const id='g_'+Date.now();
  const newGame={id,opp,date:date?date.replace('T',' ').slice(0,16):'日時未定',venue:venue||'球場未定',status:'upcoming',orders:9,scores:null,batters:null,pinchHitters:null,pitchers:null,finalScore:null};
  games.unshift(newGame);
  await saveGameToSupabase(newGame);
  closeNewGame();
  renderGameList();
}
function openGame(gameId){
  const g=games.find(x=>x.id===gameId);if(!g)return;
  currentGame=g;
  const gid=document.getElementById('game-info-disp');if(gid){gid.textContent='vs '+g.opp;}
  ORDERS=g.orders||9;
  if(g.batters){batters=JSON.parse(JSON.stringify(g.batters));pinchHitters=JSON.parse(JSON.stringify(g.pinchHitters||{top:{},bot:{}}));}
  else{['top','bot'].forEach(h=>{batters[h]={};for(let o=1;o<=ORDERS;o++)batters[h][o]={name:'',pos:'',results:{}};});pinchHitters={top:{},bot:{}};DEFAULT_LINEUP.forEach(d=>{const m=MEMBERS.find(x=>x.num===d.num);if(m){batters.top[d.o].name=m.name+'('+m.num+')';batters.top[d.o].pos=d.pos;}});}
  if(g.scores)scores=JSON.parse(JSON.stringify(g.scores));
  else{scores={};for(let i=1;i<=INNINGS;i++)scores[i]={top:0,bot:0};}
  if(g.pitchers)pitchers=JSON.parse(JSON.stringify(g.pitchers));
  else pitchers={my:[],opp:[]};
  if(g.status==='upcoming'){g.status='inprogress';saveGameToSupabase(g, true);}
  isDirty = false;
  showScreen('scoreinput');
  setTimeout(()=>{curHalf='top';document.getElementById('pitcher-assign-wrap').innerHTML='';renderBatters();showSubTab('bat');},50);
}

async function saveAndBack(){
  if(currentGame && isDirty){
    currentGame.batters=JSON.parse(JSON.stringify(batters));
    currentGame.scores=JSON.parse(JSON.stringify(scores));
    currentGame.pitchers=JSON.parse(JSON.stringify(pitchers));
    currentGame.pinchHitters=JSON.parse(JSON.stringify(pinchHitters||{top:{},bot:{}}));
    currentGame.orders=ORDERS;
    let my=0,opp=0;
    for(let i=1;i<=INNINGS;i++){my+=scores[i].top||0;opp+=scores[i].bot||0;}
    currentGame.finalScore={my,opp};
    await saveGameToSupabase(currentGame);
  }
  isDirty = false;
  const _gid=document.getElementById('game-info-disp');if(_gid)_gid.textContent='';
  currentGame=null;
  await loadGames();
  showScreen('score');
  window.scrollTo({top:0,behavior:'instant'});
}
function tempSave(){ saveAndBack(); }

async function confirmScore(){
  if(!currentGame) return;
  let my=0,opp=0;
  for(let i=1;i<=INNINGS;i++){my+=scores[i].top||0;opp+=scores[i].bot||0;}
  currentGame.finalScore={my,opp};
  currentGame.matchResult=my>opp?'勝':my<opp?'負':my===opp&&my>0?'分':null;
  currentGame.status='done';
  saveCurrentGame();
  const _gid=document.getElementById('game-info-disp');if(_gid)_gid.textContent='';
  currentGame=null;
  await loadGames();
  showScreen('score');
  window.scrollTo({top:0,behavior:'instant'});
}

async function deleteCurrentGame(){
  if(!currentGame)return;
  const label='vs '+(currentGame.opp||'相手')+'（'+(currentGame.date||'日時未定')+'）';
  if(!confirm(label+'\nこの試合を削除します。よろしいですか？\nこの操作は取り消せません。'))return;
  try{
    const{error}=await sb.from('games').delete().eq('id',currentGame.id);
    if(error){console.error('deleteCurrentGame error:',error.message,error);alert('削除に失敗しました。通信環境を確認してもう一度お試しください。');return;}
  }catch(e){console.error('deleteCurrentGame exception:',e);alert('削除に失敗しました。通信環境を確認してもう一度お試しください。');return;}
  isDirty=false;
  const _gid=document.getElementById('game-info-disp');if(_gid)_gid.textContent='';
  currentGame=null;
  await loadGames();
  showScreen('score');
  window.scrollTo({top:0,behavior:'instant'});
}

async function backToGameList(){
  saveCurrentGame();
  const _gid=document.getElementById('game-info-disp');if(_gid)_gid.textContent='';
  currentGame=null;
  await loadGames();
  showScreen('score');
}
// SCORE
function setHalf(h){
  curHalf=h;
  document.getElementById('h-top').classList.toggle('active',h==='top');
  document.getElementById('h-bot').classList.toggle('active',h==='bot');
  updateScoreHeader();
  if(h==='bot') renderPitcherAssign();
  else document.getElementById('pitcher-assign-wrap').innerHTML='';
  renderBatters();
}
function updateScoreHeader(){
  // スコアをcurrentGameに反映
  if(currentGame){
    let my=0,opp=0;
    for(let i=1;i<=INNINGS;i++){my+=scores[i].top||0;opp+=scores[i].bot||0;}
    currentGame.finalScore={my,opp};
  }
  // 点数入力画面が開いていれば再描画
  if(document.getElementById('subtab-score').style.display!=='none') renderScoreInput();
}
// BATTERS
function makeInnRow(half,orderKey,isPinch,pidx){
  const src=isPinch?pinchHitters[half][orderKey][pidx]:batters[half][orderKey];
  if(!src)return document.createElement('div');
  const row=document.createElement('div');row.className='bat-row-innings';
  for(let i=1;i<=INNINGS;i++){
    const arr=src.results[i],abArr=Array.isArray(arr)?arr:(arr?[arr]:[]);
    const col=document.createElement('div');col.className='inn-col';
    const lbl=document.createElement('div');lbl.className='inn-col-label';lbl.textContent=i+'回';col.appendChild(lbl);
    if(abArr.length===0){const btn=document.createElement('button');btn.className='res-btn';btn.textContent='－';btn.style.color='var(--dimmer)';btn.onclick=(()=>{const _h=half,_k=orderKey,_ip=isPinch,_pi=pidx,_i=i;return()=>openModalEx(_h,_k,_ip,_pi,_i,0);})();col.appendChild(btn);}
    else{abArr.forEach((res,ab)=>{const btn=document.createElement('button');btn.className='res-btn';const t=res.type;if(['H','二塁打','三塁打','本塁打'].includes(t))btn.classList.add('hit');else if(['凡打','三振'].includes(t))btn.classList.add('out');else if(['四球','死球','犠打'].includes(t))btn.classList.add('walk');else if(['盗塁','暴投'].includes(t))btn.classList.add('green');if(res.rbi>0)btn.classList.add('rbi-on');const lmap={'H':'単打','二塁打':'二塁打','三塁打':'三塁打','本塁打':'本塁打','凡打':res.detail?res.detail.slice(0,2):'凡打','三振':'三振','四球':'四球','死球':'死球','犠打':'犠打','盗塁':'盗塁','暴投':'暴投'};btn.textContent=lmap[t]||t.slice(0,2);btn.onclick=(()=>{const _h=half,_k=orderKey,_ip=isPinch,_pi=pidx,_i=i,_ab=ab;return()=>openModalEx(_h,_k,_ip,_pi,_i,_ab);})();col.appendChild(btn);});
    // 2打席目以上は小さい＋ボタンを追加
    const addBtn=document.createElement('button');addBtn.className='res-btn';addBtn.textContent='＋';addBtn.style.cssText='color:var(--gold);border-color:var(--gold);';addBtn.onclick=(()=>{const _h=half,_k=orderKey,_ip=isPinch,_pi=pidx,_i=i,_ab=abArr.length;return()=>openModalEx(_h,_k,_ip,_pi,_i,_ab);})();col.appendChild(addBtn);}
    row.appendChild(col);
  }
  return row;
}
function renderBatters(){
  const cont=document.getElementById('bat-list');if(!cont)return;cont.innerHTML='';
  for(let o=1;o<=ORDERS;o++){
    const b=batters[curHalf][o];if(!b)continue;
    const ph=pinchHitters[curHalf][o]||[];
    const card=document.createElement('div');card.className='bat-row';
    const topRow=document.createElement('div');topRow.className='bat-row-top';
    const nd=document.createElement('div');nd.className='bat-num';nd.textContent=o;topRow.appendChild(nd);
    const selWrap=document.createElement('div');selWrap.className='bat-selects';
    let ns;
    if(curHalf==='bot'){
      ns=document.createElement('input');ns.type='text';ns.className='sel';ns.placeholder='選手名';ns.value=b.name||'';
      ns.oninput=(ord=>e=>{batters[curHalf][ord].name=e.target.value;scheduleSave();})(o);
    }else{
      ns=document.createElement('select');ns.className='sel';ns.innerHTML=memberOptions(b.name);ns.onchange=(ord=>e=>{batters[curHalf][ord].name=e.target.value;scheduleSave();})(o);
    }
    selWrap.appendChild(ns);
    const ps=document.createElement('select');ps.className='sel sel-pos';ps.innerHTML=posOptions(b.pos);ps.onchange=(ord=>e=>{batters[curHalf][ord].pos=e.target.value;scheduleSave();})(o);selWrap.appendChild(ps);
    const db=document.createElement('button');db.className='btn-daida';db.textContent='＋代打';db.onclick=(ord=>()=>addPinchHitter(curHalf,ord))(o);selWrap.appendChild(db);
    topRow.appendChild(selWrap);card.appendChild(topRow);
    card.appendChild(makeInnRow(curHalf,o,false,null));
    cont.appendChild(card);
    ph.forEach((p,pi)=>{
      const dc=document.createElement('div');dc.className='daida-card';
      const dt=document.createElement('div');dt.className='daida-card-top';
      const dlbl=document.createElement('div');dlbl.className='daida-label';dlbl.textContent='代打';dt.appendChild(dlbl);
      const dns=document.createElement('select');dns.className='sel';dns.style.flex='1';dns.innerHTML=memberOptions(p.name);dns.onchange=((_o,_pi)=>e=>{pinchHitters[curHalf][_o][_pi].name=e.target.value;scheduleSave();})(o,pi);dt.appendChild(dns);
      const dps=document.createElement('select');dps.className='sel sel-pos';dps.innerHTML=posOptions(p.pos);dps.onchange=((_o,_pi)=>e=>{pinchHitters[curHalf][_o][_pi].pos=e.target.value;scheduleSave();})(o,pi);dt.appendChild(dps);
      const del=document.createElement('button');del.className='btn-daida-del';del.textContent='✕';del.onclick=((_o,_pi)=>()=>removePinchHitter(curHalf,_o,_pi))(o,pi);dt.appendChild(del);
      dc.appendChild(dt);dc.appendChild(makeInnRow(curHalf,o,true,pi));cont.appendChild(dc);
    });
  }
  const addBtn=document.createElement('button');
  addBtn.style.cssText='width:calc(100% - 20px);margin:6px 10px 10px;padding:14px;background:transparent;border:2px dashed var(--border);border-radius:14px;color:var(--dim);font-size:16px;font-weight:700;cursor:pointer;font-family:sans-serif;';
  addBtn.textContent='＋ 打者を追加（'+(ORDERS+1)+'番）';
  addBtn.onclick=()=>{ORDERS++;batters[curHalf][ORDERS]={name:'',pos:'',results:{}};if(!batters[curHalf==='top'?'bot':'top'][ORDERS])batters[curHalf==='top'?'bot':'top'][ORDERS]={name:'',pos:'',results:{}};renderBatters();};
  cont.appendChild(addBtn);
}
function addPinchHitter(half,order){if(!pinchHitters[half][order])pinchHitters[half][order]=[];pinchHitters[half][order].push({name:'',pos:'',results:{}});renderBatters();}
function removePinchHitter(half,order,pidx){pinchHitters[half][order].splice(pidx,1);renderBatters();scheduleSave();}
// MODAL
function openModal(half,order,inning,atBat=0){openModalEx(half,order,false,null,inning,atBat);}
function openModalEx(half,order,isPinch,pidx,inning,atBat=0){
  mst={half,order,isPinch,pinchIdx:pidx,inning,atBat,rbi:0,type:null};
  const src=isPinch?pinchHitters[half][order][pidx]:batters[half][order];
  const arr=src.results[inning],abArr=Array.isArray(arr)?arr:(arr?[arr]:[]),res=abArr[atBat]||null;
  if(res){mst.rbi=res.rbi||0;mst.type=res.type;}
  const abLabel=abArr.length>0?' ('+(atBat+1)+'打席目)':'';
  document.getElementById('modal-sub').textContent=(isPinch?'代打 '+src.name:order+'番 '+src.name)+' '+(half==='top'?'表':'裏')+' '+inning+'回'+abLabel;
  document.getElementById('modal-player').textContent=src.name||order+'番';
  document.getElementById('rbi-disp').textContent=mst.rbi;
  document.getElementById('res-detail').value=res?(res.detail||''):'';
  document.getElementById('res-modal').classList.add('open');
}
function closeModal(e){document.getElementById('res-modal').classList.remove('open');}

// 相手攻撃データから自チーム投手成績を自動計算
// 投手担当イニング表示・入力UI
function renderPitcherAssign(){
  const wrap = document.getElementById('pitcher-assign-wrap');
  if(!wrap) return;

  // 投手データがなければ青木を追加
  if(pitchers.my.length===0){
    pitchers.my.push({name:'青木(18)',ip:0,ip3:0,er:0,r:0,so:0,bb:0,hbp:0,h:0,hr:0,wp:0,result:'-',fromInning:1,toInning:9});
  }

  let html = '<div style="padding:10px 12px;background:var(--surface);border-bottom:1px solid var(--border);">';
  html += '<div class="p-sec" style="margin:0 0 10px;">自チーム投手陣</div>';

  pitchers.my.forEach((p,idx)=>{
    const thirds=p.ip*3+p.ip3;
    const era=thirds>0?((p.er*27)/thirds).toFixed(2):'---';
    const ec=parseFloat(era)<3?'var(--gb)':parseFloat(era)<6?'var(--gold)':'var(--rb)';
    html += `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:12px;padding:12px;margin-bottom:10px;">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
        <select class="p-name-sel" style="padding:12px 8px;font-size:15px;border-radius:10px;" onchange="pitchers.my[${idx}].name=this.value;scheduleSave()">${pitcherMemberOptions(p.name)}</select>
        <span style="font-family:'Bebas Neue',cursive;font-size:14px;color:${ec};white-space:nowrap;">防 ${era}</span>
        ${pitchers.my.length>1?`<button class="btn-del" onclick="pitchers.my.splice(${idx},1);renderPitcherAssign()">✕</button>`:''}
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:13px;color:var(--dim);">担当:</span>
        <select style="background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:15px;padding:12px 8px;outline:none;" onchange="pitchers.my[${idx}].fromInning=parseInt(this.value);scheduleSave()">
          ${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}"${(p.fromInning||1)===n?' selected':''}>${n}回</option>`).join('')}
        </select>
        <span style="color:var(--dim);">〜</span>
        <select style="background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:15px;padding:12px 8px;outline:none;" onchange="pitchers.my[${idx}].toInning=parseInt(this.value);updatePitcherIP(${idx});scheduleSave()">
          ${[1,2,3,4,5,6,7,8,9].map(n=>`<option value="${n}"${(p.toInning||9)===n?' selected':''}>${n}回</option>`).join('')}
        </select>
        <span style="font-size:13px;color:var(--dim);">勝敗:</span>
        <select style="background:var(--surface);border:1px solid var(--border);border-radius:10px;color:var(--text);font-size:15px;padding:12px 8px;outline:none;" onchange="pitchers.my[${idx}].result=this.value;scheduleSave()">
          <option value="-"${p.result==='-'?' selected':''}>－</option>
          <option value="勝ち"${p.result==='勝ち'?' selected':''}>勝ち</option>
          <option value="負け"${p.result==='負け'?' selected':''}>負け</option>
          <option value="セーブ"${p.result==='セーブ'?' selected':''}>セーブ</option>
          <option value="ホールド"${p.result==='ホールド'?' selected':''}>ホールド</option>
        </select>
      </div>
    </div>`;
  });

  html += `<button class="btn-add-p" style="padding:16px;font-size:15px;" onclick="pitchers.my.push({name:'',ip:0,ip3:0,er:0,r:0,so:0,bb:0,hbp:0,h:0,hr:0,wp:0,result:'-',fromInning:1,toInning:9});renderPitcherAssign()">＋ 投手を追加</button>`;
  html += '</div>';
  wrap.innerHTML = html;

  // 相手攻撃データから投手成績を自動計算
  calcPitcherFromBatting();
}

function updatePitcherIP(idx){
  const p=pitchers.my[idx];
  const from=p.fromInning||1;
  const to=p.toInning||9;
  p.ip=Math.max(0,to-from+1);
  p.ip3=0;
  renderPitcherAssign();
}

function calcPitcherFromBatting(){
  // 相手の打席結果を集計
  let totalH=0,totalHR=0,totalBB=0,totalHBP=0,totalSO=0,totalWP=0,totalR=0;
  for(let o=1;o<=ORDERS;o++){
    const b=batters['bot'][o];
    if(!b) continue;
    for(let i=1;i<=INNINGS;i++){
      const arr=b.results[i];
      if(!arr) continue;
      (Array.isArray(arr)?arr:[arr]).forEach(r=>{
        if(['H','二塁打','三塁打','本塁打'].includes(r.type)) totalH++;
        if(r.type==='本塁打') totalHR++;
        if(r.type==='四球') totalBB++;
        if(r.type==='死球') totalHBP++;
        if(r.type==='三振') totalSO++;
        if(r.type==='暴投') totalWP++;
        totalR += r.rbi||0;
      });
    }
    // 代打分
    (pinchHitters['bot'][o]||[]).forEach(p=>{
      for(let i=1;i<=INNINGS;i++){
        const arr=p.results[i];
        if(!arr) continue;
        (Array.isArray(arr)?arr:[arr]).forEach(r=>{
          if(['H','二塁打','三塁打','本塁打'].includes(r.type)) totalH++;
          if(r.type==='本塁打') totalHR++;
          if(r.type==='四球') totalBB++;
          if(r.type==='死球') totalHBP++;
          if(r.type==='三振') totalSO++;
          if(r.type==='暴投') totalWP++;
          totalR += r.rbi||0;
        });
      }
    });
  }
  // 失点（相手の得点=自チームの失点）
  let totalLost=0;
  for(let i=1;i<=INNINGS;i++) totalLost+=scores[i].bot||0;

  // 投手が未登録なら自動で青木を追加
  if(pitchers.my.length===0){
    pitchers.my.push({name:'青木(18)',ip:0,ip3:0,er:0,r:0,so:0,bb:0,hbp:0,h:0,hr:0,wp:0,result:'-'});
  }
  // 投手1人の場合は全て反映、複数の場合は合計を先頭投手に反映
  if(pitchers.my.length>=1){
    const p=pitchers.my[0];
    p.h=totalH; p.hr=totalHR; p.bb=totalBB; p.hbp=totalHBP;
    p.so=totalSO; p.wp=totalWP; p.r=totalLost; p.er=totalLost;
    renderPitchers('my');
  }
}

function pickRes(type){
  const{half,order,isPinch,pinchIdx,inning,atBat}=mst;mst.type=type;
  const detail=document.getElementById('res-detail').value.trim();
  const src=isPinch?pinchHitters[half][order][pinchIdx]:batters[half][order];
  let arr=src.results[inning];if(!Array.isArray(arr))arr=arr?[arr]:[];
  arr[atBat]={type,detail,rbi:mst.rbi};src.results[inning]=arr;
  recalcScore(half,inning);closeModal();renderBatters();updateScoreHeader();if(half==='bot')calcPitcherFromBatting();scheduleSave();
}
function chgRbi(d){
  mst.rbi=Math.max(0,(mst.rbi||0)+d);document.getElementById('rbi-disp').textContent=mst.rbi;
  if(mst.type){const{half,order,isPinch,pinchIdx,inning,atBat}=mst;const src=isPinch?pinchHitters[half][order][pinchIdx]:batters[half][order];const arr=src.results[inning];if(Array.isArray(arr)&&arr[atBat])arr[atBat].rbi=mst.rbi;recalcScore(half,inning);updateScoreHeader();scheduleSave();}
}
function clearRes(){
  const{half,order,isPinch,pinchIdx,inning,atBat}=mst;
  const src=isPinch?pinchHitters[half][order][pinchIdx]:batters[half][order];
  let arr=src.results[inning];
  if(Array.isArray(arr)){arr.splice(atBat,1);if(arr.length===0)delete src.results[inning];else src.results[inning]=arr;}else delete src.results[inning];
  recalcScore(half,inning);closeModal();renderBatters();updateScoreHeader();if(half==='bot')calcPitcherFromBatting();scheduleSave();
}
function recalcScore(half,inning){
  let t=0;
  for(let o=1;o<=ORDERS;o++){const arr=batters[half][o]?.results[inning];if(arr)(Array.isArray(arr)?arr:[arr]).forEach(r=>{t+=r.rbi||0;});(pinchHitters[half][o]||[]).forEach(p=>{const pa=p.results[inning];if(pa)(Array.isArray(pa)?pa:[pa]).forEach(r=>{t+=r.rbi||0;});});}
  scores[inning][half]=t;
}
function showSubTab(name){
  ['score','bat'].forEach(t=>{document.getElementById('subtab-'+t).style.display=t===name?'block':'none';});
  document.querySelectorAll('.sub-tab').forEach((el,i)=>el.classList.toggle('active',['score','bat'][i]===name));
  if(name==='score') renderScoreInput();
}
// PITCHERS
function addPitcher(side){pitchers[side].push({name:'',ip:0,ip3:0,er:0,r:0,so:0,bb:0,hbp:0,h:0,hr:0,wp:0,result:'-'});renderPitchers(side);}
function removePitcher(side,idx){pitchers[side].splice(idx,1);renderPitchers(side);}
function renderPitchers(side){
  const cont=document.getElementById((side==='my'?'my':'opp')+'-pitchers');if(!cont)return;cont.innerHTML='';
  pitchers[side].forEach((p,idx)=>{
    const thirds=p.ip*3+p.ip3,era=thirds>0?((p.er*27)/thirds).toFixed(2):'---',ec=parseFloat(era)<3?'good':parseFloat(era)<6?'avg':'bad';
    const card=document.createElement('div');card.className='p-card';
    const nf=side==='my'?`<select class="p-name-sel" onchange="pitchers['${side}'][${idx}].name=this.value;scheduleSave()">${pitcherMemberOptions(p.name)}</select>`:`<input class="p-name-inp" type="text" placeholder="相手投手名" value="${p.name}" oninput="pitchers['${side}'][${idx}].name=this.value;scheduleSave()">`;
    card.innerHTML=`<div class="p-card-hdr">${nf}<span class="era-chip ${ec}" style="margin-left:7px;">防 ${era}</span><button class="btn-del" onclick="removePitcher('${side}',${idx})">✕</button></div>
<div class="p-grid"><div class="p-field"><label>投球回</label><div class="p-inn-row"><input type="number" min="0" max="9" value="${p.ip}" oninput="pitchers['${side}'][${idx}].ip=parseInt(this.value)||0;renderPitchers('${side}');scheduleSave()"><span>回</span><select onchange="pitchers['${side}'][${idx}].ip3=parseInt(this.value);renderPitchers('${side}');scheduleSave()"><option value="0"${p.ip3===0?' selected':''}>0</option><option value="1"${p.ip3===1?' selected':''}>1/3</option><option value="2"${p.ip3===2?' selected':''}>2/3</option></select></div></div>
<div class="p-field"><label>勝敗</label><select onchange="pitchers['${side}'][${idx}].result=this.value;scheduleSave()"><option value="-"${p.result==='-'?' selected':''}>－</option><option value="勝ち"${p.result==='勝ち'?' selected':''}>勝ち</option><option value="負け"${p.result==='負け'?' selected':''}>負け</option><option value="セーブ"${p.result==='セーブ'?' selected':''}>セーブ</option><option value="ホールド"${p.result==='ホールド'?' selected':''}>ホールド</option></select></div></div>
${side==='my'?`<div class="p-stats">
  <div class="p-si"><label>自責点</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.er}"></div>
  <div class="p-si"><label>失点</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.r}"></div>
  <div class="p-si"><label>奪三振</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.so}"></div>
  <div class="p-si"><label>与四球</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.bb}"></div>
  <div class="p-si"><label>与死球</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.hbp}"></div>
  <div class="p-si"><label>被安打</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.h}"></div>
  <div class="p-si"><label>被本塁打</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.hr}"></div>
  <div class="p-si"><label>暴投</label><input type="number" readonly style="opacity:.6;background:var(--bg);" value="${p.wp}"></div>
</div>`:`<div class="p-stats">
  <div class="p-si"><label>自責点</label><input type="number" min="0" value="${p.er}" oninput="pitchers['${side}'][${idx}].er=parseInt(this.value)||0;renderPitchers('${side}');scheduleSave()"></div>
  <div class="p-si"><label>失点</label><input type="number" min="0" value="${p.r}" oninput="pitchers['${side}'][${idx}].r=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>奪三振</label><input type="number" min="0" value="${p.so}" oninput="pitchers['${side}'][${idx}].so=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>与四球</label><input type="number" min="0" value="${p.bb}" oninput="pitchers['${side}'][${idx}].bb=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>与死球</label><input type="number" min="0" value="${p.hbp}" oninput="pitchers['${side}'][${idx}].hbp=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>被安打</label><input type="number" min="0" value="${p.h}" oninput="pitchers['${side}'][${idx}].h=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>被本塁打</label><input type="number" min="0" value="${p.hr}" oninput="pitchers['${side}'][${idx}].hr=parseInt(this.value)||0;scheduleSave()"></div>
  <div class="p-si"><label>暴投</label><input type="number" min="0" value="${p.wp}" oninput="pitchers['${side}'][${idx}].wp=parseInt(this.value)||0;scheduleSave()"></div>
</div>`}`;
    cont.appendChild(card);
  });
}
// SUMMARY
function openSummary(){
  let html='<div class="s-sec">スコアボード</div><div style="overflow-x:auto"><table class="s-tbl"><thead><tr><th>チーム</th>';
  for(let i=1;i<=INNINGS;i++)html+=`<th>${i}</th>`;html+='<th>計</th></tr></thead><tbody>';
  let myT=0,oppT=0;
  html+='<tr><td>自チーム</td>';for(let i=1;i<=INNINGS;i++){const s=scores[i].top||0;myT+=s;html+=`<td>${s}</td>`;}html+=`<td><strong>${myT}</strong></td></tr>`;
  html+='<tr><td>相手</td>';for(let i=1;i<=INNINGS;i++){const s=scores[i].bot||0;oppT+=s;html+=`<td>${s}</td>`;}html+=`<td><strong>${oppT}</strong></td></tr>`;
  html+='</tbody></table></div>';
  html+='<div class="s-sec">打撃成績</div><div style="overflow-x:auto"><table class="s-tbl"><thead><tr><th>打順</th><th>選手</th><th>守備</th>';
  for(let i=1;i<=INNINGS;i++)html+=`<th>${i}回</th>`;html+='<th>打数</th><th>安打</th><th>打点</th></tr></thead><tbody>';
  for(let o=1;o<=ORDERS;o++){const b=batters.top[o];if(!b||!b.name)continue;let ab=0,h=0,rbi=0,cells=[];for(let i=1;i<=INNINGS;i++){const arr=b.results[i];if(!arr){cells.push('－');continue;}const abArr=Array.isArray(arr)?arr:[arr];const lbls=abArr.map(r=>{const l=(r.detail&&r.detail.trim())?r.detail:r.type;if(!['四球','死球','犠打'].includes(r.type))ab++;if(['H','二塁打','三塁打','本塁打'].includes(r.type))h++;rbi+=r.rbi||0;return l;});cells.push(lbls.join('/'));}html+=`<tr><td>${o}</td><td>${b.name}</td><td>${b.pos||'－'}</td>`;cells.forEach(c=>html+=`<td style="font-size:9px;">${c}</td>`);html+=`<td>${ab}</td><td>${h}</td><td>${rbi}</td></tr>`;(pinchHitters.top[o]||[]).forEach(p=>{let pab=0,ph=0,prbi=0,pcells=[];for(let i=1;i<=INNINGS;i++){const arr=p.results[i];if(!arr){pcells.push('');continue;}const abArr=Array.isArray(arr)?arr:[arr];const lbls=abArr.map(r=>{if(!['四球','死球','犠打'].includes(r.type))pab++;if(['H','二塁打','三塁打','本塁打'].includes(r.type))ph++;prbi+=r.rbi||0;return r.detail||r.type;});pcells.push(lbls.join('/'));}html+=`<tr style="background:rgba(240,192,64,.05);"><td style="color:var(--gold);">代打</td><td>${p.name}</td><td>${p.pos||'－'}</td>`;pcells.forEach(c=>html+=`<td style="font-size:9px;">${c}</td>`);html+=`<td>${pab}</td><td>${ph}</td><td>${prbi}</td></tr>`;});}
  html+='</tbody></table></div>';
  html+='<div class="s-sec">投手成績</div>';
  if(!pitchers.my.length)html+='<p style="color:var(--dim);font-size:11px;margin-bottom:10px;">投手タブでデータを入力してください</p>';
  else{html+='<div style="overflow-x:auto"><table class="s-tbl"><thead><tr><th>登板</th><th>選手</th><th>投球回</th><th>自責</th><th>失点</th><th>K</th><th>四球</th><th>死球</th><th>被安</th><th>被HR</th><th>暴投</th><th>勝敗</th></tr></thead><tbody>';pitchers.my.forEach((p,i)=>{html+=`<tr><td>${i+1}</td><td>${p.name}</td><td>${p.ip}回${p.ip3>0?' '+p.ip3+'/3':''}</td><td>${p.er}</td><td>${p.r}</td><td>${p.so}</td><td>${p.bb}</td><td>${p.hbp}</td><td>${p.h}</td><td>${p.hr}</td><td>${p.wp}</td><td>${p.result}</td></tr>`;});html+='</tbody></table></div>';}
  let txt='【自チーム打撃成績】\n';
  for(let o=1;o<=ORDERS;o++){const b=batters.top[o];if(!b||!b.name)continue;let ab=0,h=0,rbi=0,cells=[];for(let i=1;i<=INNINGS;i++){const arr=b.results[i];if(!arr)continue;(Array.isArray(arr)?arr:[arr]).forEach(r=>{if(!['四球','死球','犠打'].includes(r.type))ab++;if(['H','二塁打','三塁打','本塁打'].includes(r.type))h++;rbi+=r.rbi||0;cells.push(r.detail||r.type);});}txt+=`${o}番 ${b.name} ${b.pos||''} | ${cells.join(' ')} | ${ab}打数${h}安打 打点${rbi}\n`;}
  txt+='\n【自チーム投手成績】\n';pitchers.my.forEach((p,i)=>{txt+=`${i+1}番手 ${p.name} ${p.ip}回${p.ip3>0?p.ip3+'/3':''} 自責${p.er} 失${p.r} K${p.so} 四${p.bb} 死${p.hbp} 被安${p.h} ${p.result}\n`;});
  html+=`<div class="s-sec">コピー用テキスト</div><div class="copy-wrap"><div class="copy-box" id="copy-all">${txt}</div><button class="btn-copy" onclick="copyText('copy-all')">📋<br>コピー</button></div>`;
  document.getElementById('sum-content').innerHTML=html;
  document.getElementById('sum-modal').classList.add('open');
}
function closeSummary(){document.getElementById('sum-modal').classList.remove('open');}
function copyText(id){const el=document.getElementById(id);if(navigator.clipboard)navigator.clipboard.writeText(el.textContent).then(()=>alert('コピーしました！'));else{const r=document.createRange();r.selectNode(el);window.getSelection().removeAllRanges();window.getSelection().addRange(r);document.execCommand('copy');alert('コピーしました！');}}

function sendToSheets(){if(!GAS_URL){alert('GAS URLが設定されていません。');return;}const opp=currentGame?currentGame.opp:'不明';const today=new Date().toLocaleDateString('ja-JP');let myT=0,oppT=0;const innScores=[];for(let i=1;i<=INNINGS;i++){myT+=scores[i].top||0;oppT+=scores[i].bot||0;innScores.push({inn:i,my:scores[i].top||0,opp:scores[i].bot||0});}const battingRows=[];for(let o=1;o<=ORDERS;o++){const b=batters.top[o];if(!b||!b.name)continue;let ab=0,h=0,hr=0,rbi=0,bb=0,hbp=0,so=0,sac=0,d=0,t=0;const cells=[];for(let i=1;i<=INNINGS;i++){const arr=b.results[i];if(!arr){cells.push('');continue;}const abArr=Array.isArray(arr)?arr:[arr];const lbls=abArr.map(r=>{if(!['四球','死球','犠打'].includes(r.type))ab++;if(r.type==='H')h++;if(r.type==='二塁打'){h++;d++;}if(r.type==='三塁打'){h++;t++;}if(r.type==='本塁打'){h++;hr++;}if(r.type==='四球')bb++;if(r.type==='死球')hbp++;if(r.type==='三振')so++;if(r.type==='犠打')sac++;rbi+=r.rbi||0;return r.detail||r.type;});cells.push(lbls.join('/'));}battingRows.push({order:o,name:b.name,pos:b.pos||'',sub:'',ab,h,d,t,hr,rbi,bb,hbp,so,sac,cells});}const pitcherRows=pitchers.my.map((p,i)=>({order:i+1,name:p.name,ip:p.ip+'.'+(p.ip3===0?'0':p.ip3===1?'1':'2'),er:p.er,r:p.r,so:p.so,bb:p.bb,hbp:p.hbp,h:p.h,hr:p.hr,wp:p.wp,result:p.result}));const payload={date:today,opp,myScore:myT,oppScore:oppT,innScores,battingRows,pitcherRows};const btn=document.getElementById('btn-send-sheets');btn.textContent='送信中...';btn.disabled=true;fetch(GAS_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(()=>{btn.textContent='✅ 送信完了！';setTimeout(()=>{btn.textContent='📤 スプレッドシートに記録';btn.disabled=false;},3000);}).catch(err=>{btn.textContent='❌ 送信失敗';btn.disabled=false;alert('送信失敗\n'+err);});}
// ===== 通算成績の自動集計 =====
// ARCHIVE_CUTOFF_DATE より後に完了したSupabaseの試合データを集計し、
// data/history.js の静的アーカイブ(ARC_BATTING/ARC_PITCHING/TEAM_YEARS)に自動で合算する。
function gameYear(g){return parseInt((g.date||'').slice(0,4))||0;}
function isPostArchiveGame(g){const d=(g.date||'').replace(/\//g,'-').slice(0,10);return g.status==='done'&&!!d&&d>ARCHIVE_CUTOFF_DATE;}
function liveArchiveGames(){return games.filter(isPostArchiveGame);}
function parseNameNum(key){const m=/^(.*)\((\d+)\)$/.exec(key||'');return m?{name:m[1],num:parseInt(m[2])}:{name:key||'',num:0};}
function collectGameBatting(g){
  const rows={};
  const add=key=>{if(!rows[key]){const{name,num}=parseNameNum(key);rows[key]={name,num,ab:0,h:0,d:0,t:0,hr:0,rbi:0,bb:0,hbp:0,so:0,sb:0};}return rows[key];};
  const walk=entry=>{
    if(!entry||!entry.name)return;
    const r=add(entry.name);
    for(let i=1;i<=INNINGS;i++){
      const arr=entry.results&&entry.results[i];if(!arr)continue;
      (Array.isArray(arr)?arr:[arr]).forEach(res=>{
        if(res.type==='盗塁'){r.sb++;return;}
        if(res.type==='暴投')return;
        r.rbi+=res.rbi||0;
        if(!['四球','死球','犠打'].includes(res.type))r.ab++;
        if(res.type==='H')r.h++;
        else if(res.type==='二塁打'){r.h++;r.d++;}
        else if(res.type==='三塁打'){r.h++;r.t++;}
        else if(res.type==='本塁打'){r.h++;r.hr++;}
        else if(res.type==='四球')r.bb++;
        else if(res.type==='死球')r.hbp++;
        else if(res.type==='三振')r.so++;
      });
    }
  };
  const top=g.batters&&g.batters.top;if(top)Object.values(top).forEach(walk);
  const ph=g.pinchHitters&&g.pinchHitters.top;if(ph)Object.values(ph).forEach(arr=>(arr||[]).forEach(walk));
  return Object.values(rows);
}
function collectGamePitching(g){
  return((g.pitchers&&g.pitchers.my)||[]).filter(p=>p.name).map(p=>{
    const{name,num}=parseNameNum(p.name);
    return{name,num,thirds:(p.ip||0)*3+(p.ip3||0),
      w:p.result==='勝ち'?1:0,l:p.result==='負け'?1:0,sv:p.result==='セーブ'?1:0,
      er:p.er||0,r:p.r||0,so:p.so||0,bb:p.bb||0,hbp:p.hbp||0,h:p.h||0,hr:p.hr||0};
  });
}
function computeLiveBattingRaw(){
  const map={};
  liveArchiveGames().forEach(g=>{
    const yr=gameYear(g);
    collectGameBatting(g).forEach(r=>{
      const key=yr+'_'+r.num+'_'+r.name;
      if(!map[key])map[key]={name:r.name,num:r.num,year:yr,games:0,ab:0,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,so:0};
      const m=map[key];m.games++;
      ['ab','h','d','t','hr','rbi','sb','bb','hbp','so'].forEach(k=>m[k]+=r[k]);
    });
  });
  return map;
}
function computeLivePitchingRaw(){
  const map={};
  liveArchiveGames().forEach(g=>{
    const yr=gameYear(g);
    collectGamePitching(g).forEach(r=>{
      const key=yr+'_'+r.num+'_'+r.name;
      if(!map[key])map[key]={name:r.name,num:r.num,year:yr,games:0,thirds:0,w:0,l:0,sv:0,er:0,r:0,so:0,bb:0,hbp:0,h:0,hr:0};
      const m=map[key];m.games++;
      ['thirds','w','l','sv','er','r','so','bb','hbp','h','hr'].forEach(k=>m[k]+=r[k]);
    });
  });
  return map;
}
// 静的アーカイブ行はライブ試合の合算対象になった行だけ再計算し、
// 無関係な行は元の数値をそのまま返す(元データのavg/slg/obp/opsが打数などから
// 完全には逆算できないケースがあるため、無関係な行の値を勝手に補正しない)。
function getMergedBatting(){
  const liveByKey={};
  Object.values(computeLiveBattingRaw()).forEach(r=>{
    const key=r.year+'_'+r.num;
    if(!liveByKey[key])liveByKey[key]={...r};
    else{const m=liveByKey[key];m.games+=r.games;['ab','h','d','t','hr','rbi','sb','bb','hbp','so'].forEach(k=>m[k]+=r[k]);}
  });
  const seen=new Set();
  const result=ARC_BATTING.map(r=>{
    const key=r.year+'_'+r.num;seen.add(key);
    const lv=liveByKey[key];
    if(!lv)return r;
    const ab=r.ab+lv.ab,h=r.h+lv.h,d=r.d+lv.d,t=r.t+lv.t,hr=r.hr+lv.hr,bb=r.bb+lv.bb,hbp=r.hbp+lv.hbp;
    const avg=ab>0?h/ab:0,slg=ab>0?(h+d+2*t+3*hr)/ab:0,obp=(ab+bb+hbp)>0?(h+bb+hbp)/(ab+bb+hbp):0;
    return{...r,games:r.games+lv.games,ab,h,d,t,hr,rbi:r.rbi+lv.rbi,sb:r.sb+lv.sb,bb,hbp,so:r.so+lv.so,avg,slg,obp,ops:obp+slg};
  });
  Object.keys(liveByKey).forEach(key=>{
    if(seen.has(key))return;
    const lv=liveByKey[key];
    const avg=lv.ab>0?lv.h/lv.ab:0,slg=lv.ab>0?(lv.h+lv.d+2*lv.t+3*lv.hr)/lv.ab:0,obp=(lv.ab+lv.bb+lv.hbp)>0?(lv.h+lv.bb+lv.hbp)/(lv.ab+lv.bb+lv.hbp):0;
    result.push({name:lv.name,num:lv.num,year:lv.year,games:lv.games,ab:lv.ab,h:lv.h,d:lv.d,t:lv.t,hr:lv.hr,rbi:lv.rbi,sb:lv.sb,bb:lv.bb,hbp:lv.hbp,so:lv.so,avg,slg,obp,ops:obp+slg});
  });
  return result;
}
function getMergedPitching(){
  const liveByKey={};
  Object.values(computeLivePitchingRaw()).forEach(r=>{
    const key=r.year+'_'+r.num;
    if(!liveByKey[key])liveByKey[key]={...r};
    else{const m=liveByKey[key];m.games+=r.games;['thirds','w','l','sv','er','r','so','bb','hbp','h','hr'].forEach(k=>m[k]+=r[k]);}
  });
  const seen=new Set();
  const result=ARC_PITCHING.map(r=>{
    const key=r.year+'_'+r.num;seen.add(key);
    const lv=liveByKey[key];
    if(!lv)return r;
    const thirds=r.ip*3+r.ip3+lv.thirds,er=r.er+lv.er;
    return{...r,games:r.games+lv.games,ip:Math.floor(thirds/3),ip3:thirds%3,w:r.w+lv.w,l:r.l+lv.l,sv:r.sv+lv.sv,er,r:r.r+lv.r,so:r.so+lv.so,bb:r.bb+lv.bb,hbp:r.hbp+lv.hbp,h:r.h+lv.h,hr:r.hr+lv.hr,era:thirds>0?(er*27)/thirds:0};
  });
  Object.keys(liveByKey).forEach(key=>{
    if(seen.has(key))return;
    const lv=liveByKey[key];
    result.push({name:lv.name,num:lv.num,year:lv.year,games:lv.games,ip:Math.floor(lv.thirds/3),ip3:lv.thirds%3,w:lv.w,l:lv.l,sv:lv.sv,er:lv.er,r:lv.r,so:lv.so,bb:lv.bb,hbp:lv.hbp,h:lv.h,hr:lv.hr,era:lv.thirds>0?(lv.er*27)/lv.thirds:0});
  });
  return result;
}
function getMergedTeamYears(){
  const liveByYear={};
  liveArchiveGames().forEach(g=>{
    const yr=gameYear(g);
    if(!liveByYear[yr])liveByYear[yr]={year:yr,w:0,l:0,d:0,r:0,ab:0,h:0,d2:0,t:0,hr:0,bb:0,hbp:0,thirds:0,er:0,so:0,pbb:0};
    const m=liveByYear[yr];
    if(g.matchResult==='勝')m.w++;else if(g.matchResult==='負')m.l++;else if(g.matchResult==='分')m.d++;
    m.r+=(g.finalScore&&g.finalScore.my)||0;
    collectGameBatting(g).forEach(r=>{m.ab+=r.ab;m.h+=r.h;m.d2+=r.d;m.t+=r.t;m.hr+=r.hr;m.bb+=r.bb;m.hbp+=r.hbp;});
    collectGamePitching(g).forEach(r=>{m.thirds+=r.thirds;m.er+=r.er;m.so+=r.so;m.pbb+=r.bb;});
  });
  const years=new Set([...TEAM_YEARS.map(t=>t.year),...Object.keys(liveByYear).map(Number)]);
  return[...years].sort((a,b)=>a-b).map(year=>{
    const live=liveByYear[year];
    const staticRow=TEAM_YEARS.find(t=>t.year===year);
    if(!live)return staticRow;
    const rate=(ab,h,d,t,hr,bb,hbp)=>{
      const avg=ab>0?h/ab:0,slg=ab>0?(h+d+2*t+3*hr)/ab:0,obp=(ab+bb+hbp)>0?(h+bb+hbp)/(ab+bb+hbp):0;
      return{avg,slg,obp,ops:obp+slg};
    };
    if(!staticRow){
      const rr=rate(live.ab,live.h,live.d2,live.t,live.hr,live.bb,live.hbp);
      return{year,w:live.w,l:live.l,d:live.d,...rr,r:live.r,era:live.thirds>0?(live.er*27)/live.thirds:0,so:live.so,bb:live.pbb};
    }
    // 静的アーカイブとライブ試合が同じ年度に混在する場合は、内訳をARC_BATTING/ARC_PITCHING/GAME_RESULTSから復元して合算する
    const sb_=ARC_BATTING.filter(r=>r.year===year).reduce((a,r)=>({ab:a.ab+r.ab,h:a.h+r.h,d:a.d+r.d,t:a.t+r.t,hr:a.hr+r.hr,bb:a.bb+r.bb,hbp:a.hbp+r.hbp}),{ab:0,h:0,d:0,t:0,hr:0,bb:0,hbp:0});
    const sp_=ARC_PITCHING.filter(r=>r.year===year).reduce((a,r)=>({thirds:a.thirds+r.ip*3+r.ip3,er:a.er+r.er,so:a.so+r.so,bb:a.bb+r.bb}),{thirds:0,er:0,so:0,bb:0});
    const ab=sb_.ab+live.ab,h=sb_.h+live.h,d=sb_.d+live.d2,t=sb_.t+live.t,hr=sb_.hr+live.hr,bb=sb_.bb+live.bb,hbp=sb_.hbp+live.hbp;
    const thirds=sp_.thirds+live.thirds,er=sp_.er+live.er,so=sp_.so+live.so,pbb=sp_.bb+live.pbb;
    const rr=rate(ab,h,d,t,hr,bb,hbp);
    return{year,w:staticRow.w+live.w,l:staticRow.l+live.l,d:staticRow.d+live.d,...rr,r:staticRow.r+live.r,era:thirds>0?(er*27)/thirds:0,so,bb:pbb};
  });
}
function getAllArchiveYears(){
  const set=new Set(ARC_YEARS);
  games.forEach(g=>{if(g.status==='done'){const y=gameYear(g);if(y)set.add(y);}});
  return[...set];
}
// 選手ごとの出場試合一覧(アプリでスコア入力した試合のみ。2023〜2026/05/23の
// 静的アーカイブ期間は試合単位のデータが元々存在しないため対象外)
function getPlayerGameLogs(player){
  return liveArchiveGames().map(g=>{
    const bat=collectGameBatting(g).find(r=>r.name+'('+r.num+')'===player);
    const pit=collectGamePitching(g).find(r=>r.name+'('+r.num+')'===player);
    if(!bat&&!pit)return null;
    return{date:g.date,opp:g.opp,matchResult:g.matchResult,finalScore:g.finalScore,bat,pit};
  }).filter(Boolean).sort((a,b)=>(b.date||'').replace(/\//g,'-').localeCompare((a.date||'').replace(/\//g,'-')));
}
function fmtBatLine(b){
  const parts=[`${b.ab}打数${b.h}安打`];
  if(b.d)parts.push(`二塁打${b.d}`);
  if(b.t)parts.push(`三塁打${b.t}`);
  if(b.hr)parts.push(`本塁打${b.hr}`);
  if(b.rbi)parts.push(`打点${b.rbi}`);
  if(b.bb)parts.push(`四球${b.bb}`);
  if(b.hbp)parts.push(`死球${b.hbp}`);
  if(b.so)parts.push(`三振${b.so}`);
  if(b.sb)parts.push(`盗塁${b.sb}`);
  return parts.join('・');
}
function fmtPitLine(p){
  const parts=[`${Math.floor(p.thirds/3)}.${p.thirds%3}回`];
  if(p.er)parts.push(`自責${p.er}`);
  if(p.so)parts.push(`奪三振${p.so}`);
  if(p.bb)parts.push(`与四球${p.bb}`);
  if(p.h)parts.push(`被安打${p.h}`);
  if(p.hr)parts.push(`被本塁打${p.hr}`);
  if(p.w)parts.push('勝');
  if(p.l)parts.push('負');
  if(p.sv)parts.push('セーブ');
  return parts.join('・');
}
// ARCHIVE RANKING
const RANK_CATS=[{key:'_pitcher',label:'投手',fmt:v=>v,unit:'',color:'normal-val',minAb:0},
  {key:'avg',label:'打率',fmt:v=>v.toFixed(3).replace('0.','.'),unit:'',color:'gold-val',minAb:5},{key:'games',label:'試合数',fmt:v=>v,unit:'試合',color:'normal-val',minAb:0},{key:'h',label:'安打',fmt:v=>v,unit:'本',color:'normal-val',minAb:0},{key:'d',label:'二塁打',fmt:v=>v,unit:'本',color:'normal-val',minAb:0},{key:'t',label:'三塁打',fmt:v=>v,unit:'本',color:'normal-val',minAb:0},{key:'hr',label:'本塁打',fmt:v=>v,unit:'本',color:'normal-val',minAb:0},{key:'rbi',label:'打点',fmt:v=>v,unit:'点',color:'normal-val',minAb:0},{key:'bb',label:'四球',fmt:v=>v,unit:'個',color:'normal-val',minAb:0},{key:'hbp',label:'死球',fmt:v=>v,unit:'個',color:'normal-val',minAb:0},{key:'so',label:'三振',fmt:v=>v,unit:'個',color:'normal-val',minAb:0},{key:'sb',label:'盗塁',fmt:v=>v,unit:'個',color:'normal-val',minAb:0},{key:'ops',label:'OPS',fmt:v=>v.toFixed(3),unit:'',color:'gold-val',minAb:5}];
let rankCatIdx=0,rankYear='all';
function buildRankYearBar(){
  const ybar=document.getElementById('rank-year-bar');if(!ybar)return;
  const prev=rankYear;ybar.innerHTML='';
  const allBtn=document.createElement('button');allBtn.className='yr-btn all'+(prev==='all'?' active':'');allBtn.textContent='全年度';allBtn.onclick=()=>setRankYear('all');ybar.appendChild(allBtn);
  [...getAllArchiveYears()].sort((a,b)=>b-a).forEach(y=>{const b=document.createElement('button');b.className='yr-btn'+(prev===y?' active':'');b.textContent=y+'年';b.onclick=()=>setRankYear(y);ybar.appendChild(b);});
}
function initRanking(){const bar=document.getElementById('rank-cat-bar');if(!bar)return;bar.innerHTML='';RANK_CATS.forEach((c,i)=>{const b=document.createElement('button');b.className='rank-cat-btn'+(i===0?' active':'');b.textContent=c.label;b.onclick=()=>{rankCatIdx=i;document.querySelectorAll('.rank-cat-btn').forEach((btn,j)=>btn.classList.toggle('active',j===i));renderRanking();};bar.appendChild(b);});buildRankYearBar();}
function setRankYear(y){rankYear=y;document.querySelectorAll('#rank-year-bar .yr-btn').forEach(b=>{b.classList.toggle('active',b.textContent===(y==='all'?'全年度':y+'年'));});renderRanking();}
function renderRanking(){
  const cat=RANK_CATS[rankCatIdx];
  // タイトル非表示
  // 投手タブの場合は別処理
  if(cat.key==='_pitcher'){renderPitcherRanking();return;}
  const ARC_BATTING_LIVE=getMergedBatting();
  let data;
  if(rankYear==='all'){const map={};ARC_BATTING_LIVE.forEach(r=>{const key=r.name+'('+r.num+')';if(!map[key])map[key]={name:r.name,num:r.num,games:0,ab:0,h:0,d:0,t:0,hr:0,rbi:0,bb:0,hbp:0,so:0,sb:0,ops_sum:0,ops_w:0};const m=map[key];m.games+=r.games;m.ab+=r.ab;m.h+=r.h;m.d+=r.d;m.t+=r.t;m.hr+=r.hr;m.rbi+=r.rbi;m.bb+=r.bb;m.hbp+=r.hbp;m.so+=r.so;m.sb+=r.sb;m.ops_sum+=r.ops*r.ab;m.ops_w+=r.ab;});data=Object.values(map).map(m=>({...m,avg:m.ab>0?m.h/m.ab:0,ops:m.ops_w>0?m.ops_sum/m.ops_w:0}));}
  else data=ARC_BATTING_LIVE.filter(r=>r.year===rankYear);
  if(cat.minAb>0)data=data.filter(r=>r.ab>=cat.minAb);
  const asc=cat.key==='so';
  data=[...data].sort((a,b)=>asc?a[cat.key]-b[cat.key]:b[cat.key]-a[cat.key]);
  const list=document.getElementById('rank-list');if(!list)return;
  list.innerHTML=data.map((r,i)=>{const nc=i===0?'gold':i===1?'silver':i===2?'bronze':'other';const subYears=rankYear==='all'?ARC_BATTING_LIVE.filter(x=>x.name+'('+x.num+')'===r.name+'('+r.num+')').map(x=>x.year).join('・')+'年':r.year+'年';const pk=r.name+'('+r.num+')';const ph=getPlayerPhoto(r.num);return`<div class="rank-card" onclick="openPlayerModal('${pk}')"><div class="rank-num ${nc}">${i+1}</div><img src="${ph}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;"><div class="rank-info"><div class="rank-name">${r.name}(${r.num})</div><div class="rank-sub">${r.games}試合 ${r.ab}打数</div><div class="rank-sub" style="margin-top:2px;">安:${r.h} 本:${r.hr} 点:${r.rbi}</div></div><div><div class="rank-val ${cat.color}">${cat.fmt(r[cat.key])}</div><div class="rank-val-unit">${cat.unit}</div></div></div>`;}).join('')||'<p style="color:var(--dim);font-size:14px;padding:20px;">データがありません</p>';
}
// TEAM YEARS
function renderTeamYears(){const el=document.getElementById('team-year-list');if(!el)return;el.innerHTML=[...getMergedTeamYears()].reverse().map(t=>{const wc=t.w>t.l?'var(--gold)':'var(--rb)';const ec=t.era<6?'var(--gb)':t.era<8?'var(--gold)':'var(--rb)';return`<div class="team-yr-card"><div class="ty-hdr"><div class="ty-year">${t.year}年</div><div style="font-size:16px;font-weight:900;color:${wc};">${t.w}勝 ${t.l}敗 ${t.d}分</div></div><div class="ty-stats"><div class="ty-st"><div class="ty-val" style="color:var(--gold);">${t.avg.toFixed(3).replace('0.','.')}</div><div class="ty-lbl">打率</div></div><div class="ty-st"><div class="ty-val" style="color:var(--gold);">${t.r}</div><div class="ty-lbl">総得点</div></div><div class="ty-st"><div class="ty-val" style="color:${ec};">${t.era.toFixed(2)}</div><div class="ty-lbl">防御率</div></div><div class="ty-st"><div class="ty-val" style="color:var(--gb);">${t.so}</div><div class="ty-lbl">奪三振</div></div><div class="ty-st"><div class="ty-val">${t.slg.toFixed(3)}</div><div class="ty-lbl">長打率</div></div><div class="ty-st"><div class="ty-val">${t.obp.toFixed(3)}</div><div class="ty-lbl">出塁率</div></div><div class="ty-st"><div class="ty-val">${t.ops.toFixed(3)}</div><div class="ty-lbl">OPS</div></div><div class="ty-st"><div class="ty-val" style="color:var(--blue);">${t.bb}</div><div class="ty-lbl">与四球</div></div></div></div>`;}).join('');}
// PLAYER MODAL
function openPlayerModal(player){
  const ARC_BATTING_LIVE=getMergedBatting(),ARC_PITCHING_LIVE=getMergedPitching();
  const rows=ARC_BATTING_LIVE.filter(r=>r.name+'('+r.num+')'===player);
  const pitRowsCheck=ARC_PITCHING_LIVE.filter(r=>r.name+'('+r.num+')'===player);
  if(!rows.length&&!pitRowsCheck.length)return;
  const pmNum=(ARC_BATTING_LIVE.find(r=>r.name+'('+r.num+')'===player)||{}).num;
  const pmPhoto=pmNum?getPlayerPhoto(pmNum):PLAYER_PHOTO_DEFAULT;
  document.getElementById('pm-name').innerHTML=`<img src="${pmPhoto}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin-right:12px;vertical-align:middle;">${player}`;
  const T=rows.reduce((a,r)=>({games:a.games+r.games,ab:a.ab+r.ab,h:a.h+r.h,d:a.d+r.d,t:a.t+r.t,hr:a.hr+r.hr,rbi:a.rbi+r.rbi,bb:a.bb+r.bb,hbp:a.hbp+r.hbp,so:a.so+r.so,sb:a.sb+r.sb}),{games:0,ab:0,h:0,d:0,t:0,hr:0,rbi:0,bb:0,hbp:0,so:0,sb:0});
  const avg=T.ab>0?(T.h/T.ab).toFixed(3).replace('0.','.'):'.---';const slg=T.ab>0?((T.h+T.d+T.t*2+T.hr*3)/T.ab).toFixed(3):'---';const obp=(T.ab+T.bb+T.hbp)>0?((T.h+T.bb+T.hbp)/(T.ab+T.bb+T.hbp)).toFixed(3):'---';const ops_w=rows.reduce((a,r)=>a+r.ab,0);const ops=ops_w>0?(rows.reduce((a,r)=>a+r.ops*r.ab,0)/ops_w).toFixed(3):'---';
  let html=`<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:16px;"><div class="cc-stat" style="padding:12px;"><div class="cc-val" style="color:var(--gold);font-size:28px;">${avg}</div><div class="cc-lbl">通算打率</div></div><div class="cc-stat" style="padding:12px;"><div class="cc-val" style="font-size:28px;">${ops}</div><div class="cc-lbl">通算OPS</div></div></div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px;"><div class="cc-stat"><div class="cc-val">${T.games}</div><div class="cc-lbl">試合</div></div><div class="cc-stat"><div class="cc-val">${T.ab}</div><div class="cc-lbl">打数</div></div><div class="cc-stat"><div class="cc-val">${T.h}</div><div class="cc-lbl">安打</div></div><div class="cc-stat"><div class="cc-val" style="color:#ff8c00;">${T.hr}</div><div class="cc-lbl">本塁打</div></div><div class="cc-stat"><div class="cc-val" style="color:var(--gold);">${T.rbi}</div><div class="cc-lbl">打点</div></div><div class="cc-stat"><div class="cc-val">${T.d}</div><div class="cc-lbl">二塁打</div></div><div class="cc-stat"><div class="cc-val">${T.t}</div><div class="cc-lbl">三塁打</div></div><div class="cc-stat"><div class="cc-val">${T.sb}</div><div class="cc-lbl">盗塁</div></div><div class="cc-stat"><div class="cc-val" style="color:var(--blue);">${T.bb}</div><div class="cc-lbl">四球</div></div><div class="cc-stat"><div class="cc-val">${T.hbp}</div><div class="cc-lbl">死球</div></div><div class="cc-stat"><div class="cc-val" style="color:var(--rb);">${T.so}</div><div class="cc-lbl">三振</div></div><div class="cc-stat"><div class="cc-val">${slg}</div><div class="cc-lbl">長打率</div></div></div>
  <div style="font-size:11px;color:var(--dim);margin-bottom:14px;">出塁率 ${obp} ／ 参加: ${rows.map(r=>r.year).join('・')}年</div>
  <div style="font-size:13px;color:var(--dim);font-weight:700;margin-bottom:10px;">年度別成績</div>
  <div style="overflow-x:auto;border-radius:10px;border:1px solid var(--border);margin-bottom:14px;"><table style="width:100%;border-collapse:collapse;min-width:400px;"><thead><tr style="background:var(--surface2);"><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">年</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">試</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">打数</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">安打</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">本</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">打点</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">打率</th><th style="padding:9px 6px;font-size:12px;color:var(--dimmer);">OPS</th></tr></thead><tbody>`;
  rows.sort((a,b)=>a.year-b.year).forEach(r=>{const ac=r.avg>=.350?'color:var(--gold)':r.avg>=.220?'color:var(--gb)':'color:var(--dim)';html+=`<tr style="border-top:1px solid var(--border);"><td style="padding:10px 6px;text-align:center;font-size:13px;font-weight:700;">${r.year}</td><td style="padding:10px 6px;text-align:center;font-size:13px;">${r.games}</td><td style="padding:10px 6px;text-align:center;font-size:13px;">${r.ab}</td><td style="padding:10px 6px;text-align:center;font-size:13px;">${r.h}</td><td style="padding:10px 6px;text-align:center;font-size:13px;color:#ff8c00;font-weight:700;">${r.hr}</td><td style="padding:10px 6px;text-align:center;font-size:13px;color:var(--gold);">${r.rbi}</td><td style="padding:10px 6px;text-align:center;font-family:'Bebas Neue',cursive;font-size:17px;${ac};">${r.avg.toFixed(3).replace('0.','.')}</td><td style="padding:10px 6px;text-align:center;font-family:'Bebas Neue',cursive;font-size:17px;">${r.ops.toFixed(3)}</td></tr>`;});
  html+='</tbody></table></div>';
  const pitRows=ARC_PITCHING_LIVE.filter(r=>r.name+'('+r.num+')'===player);
  if(pitRows.length>0){const pt=pitRows.reduce((a,r)=>({games:a.games+r.games,ip:a.ip+r.ip*3+r.ip3,w:a.w+r.w,l:a.l+r.l,sv:a.sv+r.sv,er:a.er+r.er,so:a.so+r.so,bb:a.bb+r.bb}),{games:0,ip:0,w:0,l:0,sv:0,er:0,so:0,bb:0});const pera=pt.ip>0?((pt.er*27)/pt.ip).toFixed(2):'---';const ec=parseFloat(pera)<5?'var(--gb)':parseFloat(pera)<8?'var(--gold)':'var(--rb)';html+=`<div style="font-size:13px;color:var(--dim);font-weight:700;margin-bottom:10px;">投手通算成績</div><div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:14px;"><div class="cc-stat"><div class="cc-val" style="color:${ec};">${pera}</div><div class="cc-lbl">防御率</div></div><div class="cc-stat"><div class="cc-val">${pt.w}勝${pt.l}敗</div><div class="cc-lbl">勝敗</div></div><div class="cc-stat"><div class="cc-val" style="color:var(--gb);">${pt.so}</div><div class="cc-lbl">奪三振</div></div><div class="cc-stat"><div class="cc-val" style="color:var(--blue);">${pt.bb}</div><div class="cc-lbl">与四球</div></div></div>`;}
  const gameLogs=getPlayerGameLogs(player);
  if(gameLogs.length>0){
    html+=`<div style="font-size:13px;color:var(--dim);font-weight:700;margin:14px 0 10px;">出場試合（アプリ記録分・${gameLogs.length}試合）</div>`;
    html+='<div style="display:flex;flex-direction:column;gap:8px;">';
    gameLogs.forEach(g=>{
      const rc=g.matchResult==='勝'?'var(--gold)':g.matchResult==='負'?'var(--rb)':'var(--dim)';
      const dateDisp=(g.date||'').replace(/-/g,'/').slice(0,10);
      const score=g.finalScore?`${g.finalScore.my}-${g.finalScore.opp}`:'';
      html+=`<div style="background:var(--surface2);border-radius:10px;padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
          <div style="font-size:12px;color:var(--dim);">${dateDisp} vs ${g.opp}</div>
          <div style="font-size:12px;font-weight:900;color:${rc};">${g.matchResult||''} ${score}</div>
        </div>
        ${g.bat?`<div style="font-size:12px;">打撃: ${fmtBatLine(g.bat)}</div>`:''}
        ${g.pit?`<div style="font-size:12px;margin-top:2px;">投手: ${fmtPitLine(g.pit)}</div>`:''}
      </div>`;
    });
    html+='</div>';
  }
  document.getElementById('pm-content').innerHTML=html;
  lockBodyScroll();
  document.getElementById('player-modal').classList.add('open');
}
function closePlayerModal(e){
  if(!e||e.target===document.getElementById('player-modal')){
    document.getElementById('player-modal').classList.remove('open');
    unlockBodyScroll();
  }
}
// 背景スクロール固定（モーダル表示中、後ろの画面が一緒にスクロールされるのを防ぐ）
let modalScrollY=0;
function lockBodyScroll(){
  modalScrollY=window.scrollY||window.pageYOffset||0;
  document.body.style.position='fixed';
  document.body.style.top=(-modalScrollY)+'px';
  document.body.style.width='100%';
  document.body.classList.add('modal-open');
}
function unlockBodyScroll(){
  document.body.classList.remove('modal-open');
  document.body.style.position='';
  document.body.style.top='';
  document.body.style.width='';
  window.scrollTo(0,modalScrollY);
}
// RESULTS
let resYear='all';
function initResults(){
  const bar=document.getElementById('res-yr-bar');if(!bar)return;
  const prev=resYear;bar.innerHTML='';
  const a=document.createElement('button');a.className='res-yr-btn'+(prev==='all'?' active':'');a.textContent='全年度';a.onclick=()=>setResYear('all');bar.appendChild(a);
  [...getAllArchiveYears()].sort((x,y)=>x-y).forEach(y=>{const b=document.createElement('button');b.className='res-yr-btn'+(prev===y?' active':'');b.textContent=y+'年';b.onclick=()=>setResYear(y);bar.appendChild(b);});
}
function setResYear(y){resYear=y;document.querySelectorAll('.res-yr-btn').forEach(b=>b.classList.toggle('active',b.textContent===(y==='all'?'全年度':y+'年')));renderResults();}
function renderResults(){
  const el=document.getElementById('results-list');if(!el)return;

  // Supabaseのgamesデータ（status='done'）＋従来のARCデータを合わせて表示
  // Supabaseの確定済み試合を変換
  const sbGames=games.filter(g=>g.status==='done'&&g.finalScore&&g.matchResult).map(g=>{
    const year=g.date?parseInt(g.date.slice(0,4)):new Date().getFullYear();
    return{
      year, date:g.date||'', opp:g.opp, venue:g.venue||'',
      my:g.finalScore.my, opp_score:g.finalScore.opp,
      result:g.matchResult, round:'', fromSupabase:true, id:g.id
    };
  });

  // 従来データと合わせてSupabaseにないものだけARCから使用
  const sbIds=new Set(sbGames.map(g=>g.id));
  const arcFiltered=GAME_RESULTS.filter(r=>resYear==='all'||r.year===resYear);

  // Supabaseデータに年度フィルター
  const sbFiltered=sbGames.filter(g=>resYear==='all'||g.year===resYear);

  // 合わせて日付降順ソート
  const all=[...sbFiltered,...arcFiltered].sort((a,b)=>(b.date||'').localeCompare(a.date||''));

  if(!all.length){el.innerHTML='<p style="color:var(--dim);font-size:14px;padding:20px;">対戦結果がありません</p>';return;}

  let html='',curYear=null;
  all.forEach(g=>{
    const yr=g.year||parseInt((g.date||'').slice(0,4));
    if(yr!==curYear){
      curYear=yr;
      const yg=all.filter(r=>(r.year||parseInt((r.date||'').slice(0,4)))===curYear);
      const wins=yg.filter(r=>r.result==='勝').length;
      const loses=yg.filter(r=>r.result==='負').length;
      const draws=yg.filter(r=>r.result==='分').length;
      const decided=wins+loses;
      const total=wins+loses+draws;
      html+=`<div class="game-season-header">${curYear}年シーズン</div>
      <div class="season-summary">
        <div class="ss-item"><div class="ss-val" style="color:var(--gold);">${wins}</div><div class="ss-lbl">勝利</div></div>
        <div class="ss-item"><div class="ss-val" style="color:var(--rb);">${loses}</div><div class="ss-lbl">敗北</div></div>
        <div class="ss-item"><div class="ss-val">${total}</div><div class="ss-lbl">試合</div></div>
        <div class="ss-item"><div class="ss-val" style="color:${wins>=loses?'var(--gold)':'var(--rb)'};">${decided>0?Math.round(wins/decided*100):0}%</div><div class="ss-lbl">勝率</div></div>
      </div>`;
    }
    const isWin=g.result==='勝';
    const isDraw=g.result==='分';
    const oi=getTeamInitial(g.opp);
    const myScore=g.my!==undefined?g.my:g.my;
    const oppScore=g.opp_score!==undefined?g.opp_score:(g.opp_score||0);
    const cardCls=isWin?'win':isDraw?'':'lose';
    const cardStyle=isDraw?' style="border-top:3px solid var(--dim);"':'';
    const scoreCls=isWin?'win-score':isDraw?'':'lose-score';
    const scoreStyle=isDraw?' style="color:var(--dim);"':'';
    const badgeCls=isWin?'badge-win':isDraw?'':'badge-lose';
    const badgeStyle=isDraw?' style="background:rgba(176,160,128,.2);color:var(--dim);"':'';
    const badgeLabel=isWin?'WIN':isDraw?'DRAW':'LOSE';
    const logoCls=isWin?'win-logo':isDraw?'':'lose-logo';
    html+=`<div class="game-card ${cardCls}"${cardStyle}>
      <div class="game-meta">
        <div class="game-date">${g.date||''}</div>
        ${g.round?`<div class="game-round">第${g.round}回戦</div>`:''}
      </div>
      <div class="game-row">
        <div class="game-team"><div class="game-team-logo my-logo">M</div><div class="game-team-name my-name">自チーム</div></div>
        <div class="game-score-center">
          <div class="game-score-nums"><span class="score-my ${scoreCls}"${scoreStyle}>${myScore}</span><span class="score-sep">-</span><span class="score-opp">${oppScore}</span></div>
          <span class="game-result-badge ${badgeCls}"${badgeStyle}>${badgeLabel}</span>
        </div>
        <div class="game-team"><div class="game-team-logo ${logoCls}">${oi}</div><div class="game-team-name">${g.opp}</div></div>
      </div>
      <div class="game-venue">${g.venue||''}</div>
    </div>`;
  });
  el.innerHTML=html;
}

// ============================================================
// 点数入力
// ============================================================
// 数字入力モーダル管理
let numTarget = {inning:null, half:null};

function openNumModal(inning, half){
  numTarget = {inning, half};
  const cur = scores[inning][half] || 0;
  const teamName = half==='top' ? '自チーム' : (currentGame?currentGame.opp:'相手');
  document.getElementById('num-title').textContent = inning + '回 ' + (half==='top'?'表':'裏') + '（' + teamName + '）';
  const grid = document.getElementById('num-grid');
  grid.innerHTML = [0,1,2,3,4,5,6,7,8,9,10].map(n =>
    `<button class="num-btn${cur===n?' selected':''}" onclick="pickNum(${n})">${n}</button>`
  ).join('');
  document.getElementById('num-modal').classList.add('open');
}

function pickNum(val){
  const {inning, half} = numTarget;
  scores[inning][half] = val;
  closeNumModal();
  updateScoreHeader();
  scheduleSave();
  renderScoreInput();
}

function closeNumModal(e){
  if(!e || e.target===document.getElementById('num-modal'))
    document.getElementById('num-modal').classList.remove('open');
}

function renderScoreInput(){
  const wrap = document.getElementById('score-input-wrap');
  if(!wrap) return;

  let myTotal=0, oppTotal=0;
  for(let i=1;i<=INNINGS;i++){myTotal+=scores[i].top||0;oppTotal+=scores[i].bot||0;}
  const oppName = currentGame ? currentGame.opp : '相手';

  // 縦型スコアボード
  let rows = '';
  for(let i=1;i<=INNINGS;i++){
    const ms = scores[i].top ?? 0;
    const os = scores[i].bot ?? 0;
    rows += `<div class="sb-row">
      <div class="sb-inn-label">${i}回</div>
      <button class="sb-score-btn my-btn${ms>0?' has-score':''}" onclick="openNumModal(${i},'top')">${ms}</button>
      <button class="sb-score-btn opp-btn${os>0?' has-score':''}" onclick="openNumModal(${i},'bot')">${os}</button>
    </div>`;
  }

  const html = `
    <div class="scoreboard-wrap">
      <div class="sb-header">
        <div></div>
        <div class="sb-header-cell my">自チーム</div>
        <div class="sb-header-cell">${oppName}</div>
      </div>
      ${rows}
      <div class="sb-total-row">
        <div class="sb-total-label">計</div>
        <div class="sb-total-score my">${myTotal}</div>
        <div class="sb-total-score">${oppTotal}</div>
      </div>


    </div>`;

  wrap.innerHTML = html;
}



function renderPitcherRanking(){
  const list=document.getElementById('rank-list');if(!list)return;
  const ybar=document.getElementById('rank-year-bar');
  const ARC_PITCHING_LIVE=getMergedPitching();
  // 年度フィルター
  let data = rankYear==='all' ? ARC_PITCHING_LIVE : ARC_PITCHING_LIVE.filter(r=>r.year===rankYear);
  // 全年度は選手ごとに合算
  if(rankYear==='all'){
    const map={};
    data.forEach(r=>{
      const key=r.name+'('+r.num+')';
      if(!map[key])map[key]={name:r.name,num:r.num,games:0,ip:0,w:0,l:0,sv:0,er:0,so:0,bb:0,h:0,hbp:0,r:0};
      const m=map[key];
      m.games+=r.games;m.ip+=r.ip*3+r.ip3;m.w+=r.w;m.l+=r.l;m.sv+=r.sv;
      m.er+=r.er;m.so+=r.so;m.bb+=r.bb;m.h+=r.h;m.hbp+=r.hbp;m.r+=r.r;
    });
    data=Object.values(map).map(m=>({...m,era:m.ip>0?((m.er*27)/m.ip):999,ipDisp:Math.floor(m.ip/3)+'.'+(m.ip%3)}));
  }else{
    data=data.map(r=>({...r,era:r.era,ipDisp:r.ip+'.'+(r.ip3||0)}));
  }
  data=[...data].filter(r=>r.ip>0).sort((a,b)=>{
    // 勝数降順
    if(b.w!==a.w) return b.w-a.w;
    // 防御率昇順（999は最下位）
    const ea=a.era===999?9999:a.era;
    const eb=b.era===999?9999:b.era;
    if(Math.abs(ea-eb)>0.001) return ea-eb;
    // イニング降順
    return b.ip-a.ip;
  });
  list.innerHTML=data.map((r,i)=>{
    const nc=i===0?'gold':i===1?'silver':i===2?'bronze':'other';
    const ec=r.era<3?'color:var(--gb)':r.era<6?'color:var(--gold)':'color:var(--rb)';
    const subYears=rankYear==='all'?ARC_PITCHING_LIVE.filter(x=>x.name+'('+x.num+')'===r.name+'('+r.num+')').map(x=>x.year).join('・')+'年':r.year+'年';
    const eraDisp=r.era===999?'---':r.era.toFixed(2);
    const pitPhoto=getPlayerPhoto(r.num);
    const pitPk=r.name+'('+r.num+')';
    return`<div class="rank-card" onclick="openPlayerModal('${pitPk}')" style="cursor:pointer;">
      <div class="rank-num ${nc}">${i+1}</div>
      <img src="${pitPhoto}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;flex-shrink:0;">
      <div class="rank-info">
        <div class="rank-name">${r.name}(${r.num})</div>
        <div class="rank-sub">${r.games}試合 ${r.ipDisp}回 ${r.w}勝${r.l}敗${r.sv>0?' '+r.sv+'S':''}</div>
        <div class="rank-sub" style="margin-top:2px;">K:${r.so} BB:${r.bb} 被安:${r.h}</div>
      </div>
      <div>
        <div class="rank-val" style="${ec}">${eraDisp}</div>
        <div class="rank-val-unit">防御率</div>
      </div>
    </div>`;
  }).join('')||'<p style="color:var(--dim);font-size:14px;padding:20px;">データがありません</p>';
}

function showArcMode(name){
  ['ranking','team','results'].forEach(m=>{document.getElementById('arc-'+m).style.display=m===name?'block':'none';});
  document.getElementById('arcbtn-ranking').classList.toggle('active',name==='ranking');
  document.getElementById('arcbtn-team').classList.toggle('active',name==='team');
  document.getElementById('arcbtn-results').classList.toggle('active',name==='results');
  if(name==='ranking'){renderRanking();loadGames().then(()=>{buildRankYearBar();renderRanking();});}
  if(name==='team'){renderTeamYears();loadGames().then(()=>renderTeamYears());}
  if(name==='results'){loadGames().then(()=>{initResults();renderResults();});}
}
