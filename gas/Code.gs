// ============================================================
// ムサセン スコア自動記録 Google Apps Script
// ============================================================
// 【セットアップ手順】
// 1. Googleスプレッドシートを新規作成（タイトル例：ムサセン成績記録）
// 2. 拡張機能 → Apps Script を開く
// 3. このコードを全て貼り付けて保存（Ctrl+S）
// 4. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」を選択
//    - 次のユーザーとして実行：自分
//    - アクセスできるユーザー：全員
// 5. 「デプロイ」ボタンを押し、表示されたURLを
//    js/config.js の GAS_URL = '' の中に貼り付ける
// ============================================================

const SHEET_GAMES    = '試合記録';
const SHEET_BATTING  = '打撃成績';
const SHEET_PITCHING = '投手成績';

// ヘッダーカラー（ゴールド系）
const HDR_BG   = '#b8860b';
const HDR_TEXT = '#ffffff';

// ============================================================
// POST受信：スコアアプリから送られたデータを書き込む
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss   = SpreadsheetApp.getActiveSpreadsheet();

    writeGameRecord(ss, data);
    writeBattingStats(ss, data);
    writePitchingStats(ss, data);

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: 'error', message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// ① 試合記録シート
// ============================================================
function writeGameRecord(ss, data) {
  let sheet = ss.getSheetByName(SHEET_GAMES);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_GAMES);
    const headers = [
      '日付', '相手', '結果', '自点', '失点',
      '1回', '2回', '3回', '4回', '5回', '6回', '7回', '8回', '9回'
    ];
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setValues([headers]);
    hdr.setBackground(HDR_BG).setFontColor(HDR_TEXT).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 100); // 日付
    sheet.setColumnWidth(2, 150); // 相手
  }

  const result = data.myScore > data.oppScore ? '勝'
               : data.myScore < data.oppScore ? '負' : '分';
  const innScores = data.innScores.map(s => s.my);

  sheet.appendRow([
    data.date, data.opp, result,
    data.myScore, data.oppScore,
    ...innScores
  ]);

  // 勝敗セルに色付け
  const lastRow = sheet.getLastRow();
  const cell = sheet.getRange(lastRow, 3);
  if (result === '勝') cell.setBackground('#1a3a1a').setFontColor('#2ecc71').setFontWeight('bold');
  else if (result === '負') cell.setBackground('#3a1a1a').setFontColor('#e74c3c').setFontWeight('bold');
}

// ============================================================
// ② 打撃成績シート
// ============================================================
function writeBattingStats(ss, data) {
  let sheet = ss.getSheetByName(SHEET_BATTING);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_BATTING);
    const headers = [
      '日付', '相手', '打順', '選手名', '守備', '代打',
      '打数', '安打', '二塁打', '三塁打', '本塁打',
      '打点', '四球', '死球', '三振', '犠打', '打率',
      '1回', '2回', '3回', '4回', '5回', '6回', '7回', '8回', '9回'
    ];
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setValues([headers]);
    hdr.setBackground(HDR_BG).setFontColor(HDR_TEXT).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 120); // 選手名
  }

  data.battingRows.forEach(b => {
    const avg = b.ab > 0 ? (b.h / b.ab).toFixed(3) : '---';
    sheet.appendRow([
      data.date, data.opp,
      b.order, b.name, b.pos, b.sub || '',
      b.ab, b.h, b.d, b.t, b.hr,
      b.rbi, b.bb, b.hbp, b.so, b.sac, avg,
      ...b.cells
    ]);
  });
}

// ============================================================
// ③ 投手成績シート
// ============================================================
function writePitchingStats(ss, data) {
  let sheet = ss.getSheetByName(SHEET_PITCHING);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_PITCHING);
    const headers = [
      '日付', '相手', '登板順', '選手名', '投球回',
      '自責点', '失点', '奪三振', '与四球', '与死球',
      '被安打', '被本塁打', '暴投', '勝敗', '防御率'
    ];
    const hdr = sheet.getRange(1, 1, 1, headers.length);
    hdr.setValues([headers]);
    hdr.setBackground(HDR_BG).setFontColor(HDR_TEXT).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(4, 120); // 選手名
  }

  data.pitcherRows.forEach(p => {
    const ipParts = String(p.ip).split('.');
    const ipNum   = parseInt(ipParts[0] || 0);
    const ipThird = parseInt(ipParts[1] || 0);
    const thirds  = ipNum * 3 + ipThird;
    const era     = thirds > 0 ? ((p.er * 27) / thirds).toFixed(2) : '---';
    const ipStr   = ipNum + '回' + (ipThird > 0 ? ipThird + '/3' : '');

    sheet.appendRow([
      data.date, data.opp,
      p.order, p.name, ipStr,
      p.er, p.r, p.so, p.bb, p.hbp,
      p.h, p.hr, p.wp,
      p.result, era
    ]);
  });
}

// ============================================================
// GET: ブラウザで直接URLにアクセスして動作確認する用
// デプロイ後に https://script.google.com/macros/s/xxx/exec を
// ブラウザで開き「正常動作中」と表示されればOK
// ============================================================
function doGet(e) {
  return ContentService
    .createTextOutput('⚾ ムサセン スコア記録GAS - 正常動作中 ✅')
    .setMimeType(ContentService.MimeType.TEXT);
}

// ============================================================
// ムサセン 過去成績 一括インポート
// ============================================================
// 【使い方】
// 1. Apps Script編集画面を開く
// 2. このコードを musasen-gas.js の末尾に追加して保存
// 3. 上部の関数選択ドロップダウンで「importAllHistory」を選択
// 4. 実行ボタン（▶）を押す
// 5. スプレッドシートに全データが書き込まれる
// ============================================================

function importAllHistory() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  importBattingHistory(ss);
  importPitchingHistory(ss);
  importTeamHistory(ss);
  SpreadsheetApp.getUi().alert('✅ 過去成績のインポートが完了しました！');
}

// ============================================================
// 打撃成績（2023〜2026）
// ============================================================
function importBattingHistory(ss) {
  const SHEET = '打撃成績_アーカイブ';
  let sheet = ss.getSheetByName(SHEET);
  if (sheet) sheet.clear();
  else sheet = ss.insertSheet(SHEET);

  const headers = ['年度','選手名','背番号','試合','打数','安打','二塁打','三塁打','本塁打','打点','四球','死球','三振','盗塁','打率','長打率','出塁率','OPS'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#b8860b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);

  const data = [
    // 2023
    [2023,'大住',31,8,23,8,2,0,1,6,4,0,2,1,.348,.609,.444,1.053],
    [2023,'竹林',14,8,21,6,2,0,0,5,3,0,2,0,.286,.381,.375,.756],
    [2023,'青木',18,8,20,5,0,0,0,3,2,0,4,0,.250,.250,.318,.568],
    [2023,'ソク',11,7,18,4,1,0,0,2,2,0,3,1,.222,.278,.300,.578],
    [2023,'うすい',9,6,16,3,0,0,0,2,2,0,3,0,.188,.188,.278,.466],
    [2023,'梅澤',10,5,15,2,0,0,0,1,2,0,3,0,.133,.133,.235,.368],
    [2023,'ガク',45,6,14,2,1,0,0,2,2,0,5,0,.143,.214,.250,.464],
    [2023,'村野',55,5,12,2,0,0,0,1,2,0,2,1,.167,.167,.286,.453],
    [2023,'太田',6,4,11,2,0,0,0,1,1,0,2,0,.182,.182,.250,.432],
    [2023,'笹野',25,3,7,2,0,0,0,1,1,0,1,0,.286,.286,.375,.661],
    // 2024
    [2024,'ソク',11,15,45,17,4,0,0,9,7,2,4,3,.378,.467,.463,.930],
    [2024,'竹林',14,14,45,10,2,0,0,5,6,0,7,2,.222,.267,.314,.581],
    [2024,'うすい',9,13,37,8,1,0,0,4,5,1,5,0,.216,.243,.313,.556],
    [2024,'村野',55,11,32,8,1,1,0,4,4,1,4,3,.250,.344,.342,.686],
    [2024,'ガク',45,13,34,7,2,0,0,3,3,1,8,0,.206,.265,.289,.554],
    [2024,'大住',31,10,29,5,1,0,0,3,3,1,4,1,.172,.207,.265,.472],
    [2024,'梅澤',10,11,29,4,0,0,0,3,3,0,5,0,.138,.138,.219,.357],
    [2024,'青木',18,9,26,6,0,0,0,2,2,1,4,0,.231,.231,.310,.541],
    [2024,'新江',44,7,19,4,1,0,0,2,3,0,4,0,.211,.263,.318,.581],
    [2024,'笹野',25,4,8,2,0,0,0,1,2,0,1,0,.250,.250,.400,.650],
    [2024,'前田',12,3,7,1,0,0,0,1,1,1,2,0,.143,.143,.333,.476],
    [2024,'太田',6,3,5,0,0,0,0,1,1,0,2,0,.000,.000,.167,.167],
    // 2025
    [2025,'竹林',14,9,27,9,2,0,1,5,9,1,1,2,.333,.519,.514,1.033],
    [2025,'村野',55,8,23,8,1,0,0,3,5,1,2,3,.348,.391,.448,.839],
    [2025,'ソク',11,8,25,5,1,0,0,3,5,1,4,0,.200,.240,.344,.584],
    [2025,'青木',18,8,24,4,0,0,0,2,4,0,3,0,.167,.167,.286,.453],
    [2025,'梅澤',10,8,24,4,0,0,0,2,4,0,3,0,.167,.167,.286,.453],
    [2025,'大住',31,7,22,5,1,0,0,2,4,0,3,0,.227,.273,.346,.619],
    [2025,'うすい',9,7,20,4,1,0,0,2,3,1,3,0,.200,.250,.320,.570],
    [2025,'ガク',45,6,17,3,0,0,0,1,3,0,6,0,.176,.176,.300,.476],
    [2025,'安倍',13,3,7,0,0,0,0,0,1,0,3,0,.000,.000,.125,.125],
    [2025,'笹野',25,2,5,1,0,0,0,0,2,0,0,0,.200,.200,.429,.629],
    // 2026
    [2026,'青木',18,5,13,6,0,0,0,1,0,0,1,0,.462,.462,.462,.923],
    [2026,'大住',31,5,13,5,2,0,1,3,1,1,1,2,.385,.769,.467,1.236],
    [2026,'竹林',14,5,10,3,1,0,1,5,4,0,1,2,.300,.700,.500,1.200],
    [2026,'ソク',11,5,11,3,2,0,0,3,2,0,1,0,.273,.455,.385,.839],
    [2026,'ガク',45,5,11,3,2,0,0,1,0,1,4,0,.273,.455,.333,.788],
    [2026,'村野',55,4,7,1,1,0,0,0,3,1,1,2,.143,.286,.455,.740],
    [2026,'うすい',9,4,8,1,0,0,0,2,1,1,1,0,.125,.125,.300,.425],
    [2026,'安倍',13,4,9,1,0,0,0,0,1,0,4,1,.111,.111,.200,.311],
    [2026,'梅澤',10,4,10,1,0,0,0,1,1,0,0,0,.100,.100,.182,.282],
    [2026,'笹野',25,2,3,1,0,0,0,0,2,0,0,0,.333,.333,.600,.933],
    [2026,'貢司',77,2,4,1,0,0,0,0,1,0,2,0,.250,.250,.400,.650],
    [2026,'前田',12,1,1,0,0,0,0,0,1,0,0,0,.000,.000,.500,.500],
    [2026,'太田',6,1,2,0,0,0,0,1,1,0,0,0,.000,.000,.333,.333],
    [2026,'梶原',24,1,3,0,0,0,0,0,0,0,0,0,.000,.000,.000,.000],
    [2026,'しんぺい',23,1,2,0,0,0,0,0,0,0,1,0,.000,.000,.000,.000],
  ];

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);

  // 打率列に色付け
  data.forEach((row, i) => {
    const avg = row[14];
    const cell = sheet.getRange(i + 2, 15);
    if (avg >= 0.350) cell.setBackground('#2a1f00').setFontColor('#f0c040').setFontWeight('bold');
    else if (avg >= 0.250) cell.setBackground('#0a1f0a').setFontColor('#2ecc71');
  });

  // 列幅調整
  sheet.setColumnWidth(2, 90);
  sheet.setColumnWidth(1, 60);
  Logger.log('打撃成績インポート完了: ' + data.length + '行');
}

// ============================================================
// 投手成績（2023〜2026）
// ============================================================
function importPitchingHistory(ss) {
  const SHEET = '投手成績_アーカイブ';
  let sheet = ss.getSheetByName(SHEET);
  if (sheet) sheet.clear();
  else sheet = ss.insertSheet(SHEET);

  const headers = ['年度','選手名','背番号','試合','投球回','勝','負','セーブ','自責点','失点','奪三振','与四球','与死球','被安打','被本塁打','防御率','WHIP'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#b8860b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);

  const data = [
    // 2023
    [2023,'青木',18,8,'28回0/3',3,5,0,20,22,14,12,3,28,2,6.43,1.43],
    [2023,'ソク',11,5,'8回0/3',0,0,2,1,1,5,2,1,5,0,1.13,0.88],
    [2023,'ガク',45,3,'4回0/3',0,0,0,6,7,3,8,2,5,0,13.50,3.25],
    [2023,'竹林',14,2,'2回0/3',0,0,0,3,3,1,2,0,3,0,13.50,2.50],
    // 2024
    [2024,'青木',18,14,'55回1/3',4,6,0,40,44,34,25,3,60,5,6.50,1.55],
    [2024,'大住',31,4,'5回2/3',0,1,0,8,9,2,9,2,8,0,12.71,3.00],
    [2024,'ガク',45,3,'4回0/3',1,1,1,7,8,2,6,2,5,0,15.75,2.75],
    [2024,'ライダン',99,2,'3回0/3',0,1,0,5,6,2,5,0,6,1,15.00,3.67],
    // 2025
    [2025,'青木',18,8,'27回0/3',2,4,0,24,26,17,14,3,30,1,8.00,1.63],
    [2025,'ガク',45,4,'8回0/3',1,1,1,10,11,7,12,4,9,0,11.25,2.63],
    [2025,'前田',12,3,'8回0/3',1,0,0,6,7,11,5,1,8,0,6.75,1.63],
    // 2026
    [2026,'ソク',11,3,'5回2/3',0,0,1,0,0,3,0,1,4,0,0.00,0.80],
    [2026,'青木',18,4,'16回0/3',2,2,0,14,15,10,10,2,20,1,6.13,1.88],
    [2026,'ガク',45,3,'7回0/3',1,0,1,12,13,7,12,5,6,0,12.00,2.57],
  ];

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  sheet.setColumnWidth(2, 90);
  Logger.log('投手成績インポート完了: ' + data.length + '行');
}

// ============================================================
// チーム年度別成績
// ============================================================
function importTeamHistory(ss) {
  const SHEET = 'チーム成績_アーカイブ';
  let sheet = ss.getSheetByName(SHEET);
  if (sheet) sheet.clear();
  else sheet = ss.insertSheet(SHEET);

  const headers = ['年度','勝','負','分','チーム打率','長打率','出塁率','OPS','総得点','チーム防御率','奪三振','与四球'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setBackground('#b8860b').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);

  const data = [
    [2023, 8, 7, 0, 0.243, 0.371, 0.334, 0.705, 41, 7.54, 23, 24],
    [2024, 4,11, 0, 0.207, 0.275, 0.284, 0.559, 37, 7.00, 40, 45],
    [2025, 3, 5, 0, 0.257, 0.419, 0.413, 0.832, 41, 8.44, 35, 35],
    [2026, 4, 2, 0, 0.243, 0.374, 0.372, 0.746, 23, 6.35, 20, 22],
  ];

  sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  Logger.log('チーム成績インポート完了');
}
