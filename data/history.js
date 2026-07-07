// 過去成績データ（打撃・投手・チーム年度別・対戦結果）
//
// 【自動集計について】
// この下の ARC_BATTING / ARC_PITCHING / TEAM_YEARS / GAME_RESULTS は
// ARCHIVE_CUTOFF_DATE 時点までの試合を集計した「確定アーカイブ」です。
// これより後に完了した試合は、アプリのスコア入力画面で保存したデータ
// (Supabaseの games テーブル)から js/app.js が自動的に集計して
// 通算成績・ランキング・チーム成績に合算表示します。
// → 今後試合が終わるたびに、この history.js を手動で編集する必要はありません。
const ARCHIVE_CUTOFF_DATE='2026-05-23';
const ARC_BATTING=[
  // 2023年 規定打席以上
  {name:'大住',num:31,year:2023,games:9,ab:25,h:11,d:2,t:0,hr:0,rbi:5,sb:2,bb:6,hbp:0,so:4,avg:.440,slg:.640,obp:.548,ops:1.188},
  {name:'村野',num:55,year:2023,games:6,ab:18,h:7,d:0,t:1,hr:0,rbi:3,sb:1,bb:0,hbp:3,so:1,avg:.389,slg:.500,obp:.421,ops:.921},
  {name:'青木',num:18,year:2023,games:9,ab:19,h:7,d:2,t:0,hr:0,rbi:1,sb:0,bb:2,hbp:3,so:2,avg:.368,slg:.474,obp:.500,ops:.974},
  {name:'竹林',num:14,year:2023,games:8,ab:22,h:8,d:0,t:0,hr:0,rbi:7,sb:1,bb:3,hbp:0,so:1,avg:.364,slg:.364,obp:.440,ops:.804},
  {name:'梅澤',num:10,year:2023,games:9,ab:18,h:4,d:2,t:0,hr:0,rbi:0,sb:2,bb:6,hbp:0,so:2,avg:.222,slg:.333,obp:.417,ops:.750},
  {name:'笹野',num:25,year:2023,games:6,ab:14,h:3,d:1,t:0,hr:0,rbi:1,sb:1,bb:1,hbp:3,so:9,avg:.214,slg:.286,obp:.389,ops:.675},
  {name:'新江',num:44,year:2023,games:9,ab:24,h:4,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:3,so:3,avg:.167,slg:.167,obp:.286,ops:.452},
  {name:'ガク',num:45,year:2023,games:7,ab:18,h:3,d:2,t:0,hr:0,rbi:2,sb:0,bb:1,hbp:0,so:4,avg:.167,slg:.278,obp:.211,ops:.488},
  {name:'ソク',num:11,year:2023,games:9,ab:25,h:3,d:1,t:1,hr:0,rbi:1,sb:5,bb:4,hbp:0,so:6,avg:.120,slg:.240,obp:.241,ops:.481},
  // 2023年 規定打席未満
  {name:'てつ',num:66,year:2023,games:2,ab:4,h:2,d:1,t:0,hr:0,rbi:0,sb:2,bb:3,hbp:0,so:1,avg:.500,slg:.750,obp:.714,ops:1.464},
  {name:'太田',num:6,year:2023,games:2,ab:5,h:2,d:1,t:0,hr:0,rbi:2,sb:3,bb:1,hbp:0,so:2,avg:.400,slg:.600,obp:.500,ops:1.100},
  {name:'うすい',num:9,year:2023,games:5,ab:10,h:4,d:0,t:0,hr:0,rbi:1,sb:0,bb:1,hbp:1,so:3,avg:.400,slg:.400,obp:.500,ops:.962},
  {name:'古田',num:4,year:2023,games:3,ab:8,h:3,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,so:1,avg:.375,slg:.375,obp:.375,ops:.750},
  {name:'至',num:1,year:2023,games:2,ab:6,h:2,d:0,t:0,hr:0,rbi:0,sb:1,bb:0,hbp:0,so:0,avg:.333,slg:.333,obp:.333,ops:.667},
  {name:'難波',num:17,year:2023,games:5,ab:13,h:2,d:0,t:1,hr:0,rbi:0,sb:2,bb:0,hbp:0,so:1,avg:.154,slg:.308,obp:.214,ops:.522},
  {name:'みや',num:7,year:2023,games:3,ab:8,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:1,so:3,avg:.000,slg:.000,obp:.111,ops:.111},
  {name:'ケイタ',num:99,year:2023,games:1,ab:3,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:0,avg:.000,slg:.000,obp:.250,ops:.250},
  // 2024年 規定打席以上
  {name:'ソク',num:11,year:2024,games:6,ab:15,h:6,d:0,t:0,hr:0,rbi:3,sb:0,bb:3,hbp:1,so:3,avg:.400,slg:.400,obp:.526,ops:.926},
  {name:'梅澤',num:10,year:2024,games:7,ab:18,h:7,d:2,t:1,hr:0,rbi:6,sb:0,bb:1,hbp:5,so:1,avg:.389,slg:.611,obp:.500,ops:1.111},
  {name:'うすい',num:9,year:2024,games:6,ab:16,h:6,d:2,t:0,hr:1,rbi:5,sb:0,bb:3,hbp:0,so:3,avg:.375,slg:.688,obp:.474,ops:1.161},
  {name:'竹林',num:14,year:2024,games:7,ab:23,h:8,d:3,t:1,hr:0,rbi:6,sb:6,bb:0,hbp:1,so:0,avg:.348,slg:.565,obp:.375,ops:.940},
  {name:'ガク',num:45,year:2024,games:6,ab:15,h:5,d:2,t:0,hr:0,rbi:1,sb:5,bb:2,hbp:0,so:2,avg:.333,slg:.467,obp:.412,ops:.878},
  {name:'大住',num:31,year:2024,games:8,ab:22,h:6,d:1,t:0,hr:0,rbi:0,sb:5,bb:4,hbp:1,so:1,avg:.273,slg:.318,obp:.407,ops:.726},
  {name:'青木',num:18,year:2024,games:7,ab:15,h:4,d:0,t:0,hr:0,rbi:3,sb:0,bb:2,hbp:1,so:3,avg:.267,slg:.267,obp:.389,ops:.656},
  {name:'村野',num:55,year:2024,games:6,ab:16,h:4,d:1,t:0,hr:0,rbi:4,sb:3,bb:2,hbp:0,so:2,avg:.250,slg:.313,obp:.333,ops:.646},
  {name:'新江',num:44,year:2024,games:6,ab:15,h:1,d:0,t:0,hr:0,rbi:1,sb:1,bb:1,hbp:1,so:3,avg:.067,slg:.067,obp:.176,ops:.243},
  // 2024年 規定打席未満
  {name:'田中',num:5,year:2024,games:3,ab:7,h:2,d:0,t:0,hr:0,rbi:1,sb:1,bb:4,hbp:0,so:2,avg:.286,slg:.286,obp:.545,ops:.831},
  {name:'太田',num:6,year:2024,games:4,ab:8,h:2,d:0,t:0,hr:0,rbi:1,sb:2,bb:1,hbp:0,so:1,avg:.250,slg:.250,obp:.364,ops:.614},
  {name:'古田',num:4,year:2024,games:4,ab:8,h:1,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:1,avg:.125,slg:.125,obp:.222,ops:.347},
  {name:'難波',num:17,year:2024,games:1,ab:3,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,so:1,avg:.000,slg:.000,obp:.000,ops:.000},
  {name:'みや',num:7,year:2024,games:6,ab:12,h:0,d:0,t:0,hr:0,rbi:1,sb:0,bb:0,hbp:0,so:4,avg:.000,slg:.000,obp:.000,ops:.000},
  {name:'至',num:1,year:2024,games:1,ab:2,h:0,d:0,t:0,hr:0,rbi:1,bb:1,hbp:0,so:0,avg:.000,slg:.000,obp:.333,ops:.333},
  // 2025年 規定打席以上
  {name:'ガク',num:45,year:2025,games:8,ab:18,h:7,d:1,t:1,hr:0,rbi:3,sb:3,bb:3,hbp:0,so:5,avg:.389,slg:.556,obp:.444,ops:.966},
  {name:'竹林',num:14,year:2025,games:8,ab:23,h:8,d:0,t:0,hr:0,rbi:6,sb:1,bb:4,hbp:0,so:5,avg:.348,slg:.478,obp:.464,ops:.943},
  {name:'ソク',num:11,year:2025,games:7,ab:19,h:6,d:0,t:0,hr:0,rbi:2,sb:1,bb:3,hbp:0,so:3,avg:.316,slg:.316,obp:.409,ops:.725},
  {name:'村野',num:55,year:2025,games:8,ab:14,h:4,d:2,t:0,hr:0,rbi:0,sb:6,bb:5,hbp:0,so:4,avg:.286,slg:.429,obp:.545,ops:.974},
  {name:'青木',num:18,year:2025,games:8,ab:21,h:6,d:0,t:0,hr:0,rbi:0,sb:0,bb:2,hbp:0,so:5,avg:.286,slg:.286,obp:.348,ops:.634},
  {name:'大住',num:31,year:2025,games:7,ab:17,h:4,d:0,t:0,hr:0,rbi:4,sb:1,bb:7,hbp:0,so:1,avg:.235,slg:.235,obp:.458,ops:.694},
  {name:'うすい',num:9,year:2025,games:7,ab:18,h:4,d:0,t:0,hr:0,rbi:4,sb:0,bb:2,hbp:2,so:2,avg:.222,slg:.222,obp:.364,ops:.586},
  {name:'貢司',num:77,year:2025,games:6,ab:14,h:3,d:1,t:0,hr:0,rbi:1,sb:0,bb:2,hbp:0,so:3,avg:.214,slg:.286,obp:.353,ops:.639},
  {name:'梅澤',num:10,year:2025,games:8,ab:23,h:4,d:0,t:0,hr:0,rbi:2,sb:1,bb:4,hbp:1,so:1,avg:.174,slg:.174,obp:.321,ops:.495},
  // 2025年 規定打席未満
  {name:'難波',num:17,year:2025,games:2,ab:6,h:2,d:0,t:0,hr:0,rbi:0,sb:2,bb:0,hbp:0,so:1,avg:.333,slg:.333,obp:.333,ops:.667},
  {name:'安倍',num:13,year:2025,games:5,ab:13,h:3,d:2,t:1,hr:0,rbi:0,sb:4,bb:0,hbp:0,so:8,avg:.231,slg:.538,obp:.231,ops:.769},
  {name:'笹野',num:25,year:2025,games:2,ab:3,h:0,d:0,t:0,hr:0,rbi:1,sb:0,bb:2,hbp:0,so:0,avg:.000,slg:.000,obp:.400,ops:.400},
  {name:'太田',num:6,year:2025,games:1,ab:2,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:0,avg:.000,slg:.000,obp:.333,ops:.333},
  {name:'みや',num:7,year:2025,games:1,ab:2,h:0,d:0,t:0,hr:0,rbi:1,sb:0,bb:1,hbp:0,so:1,avg:.000,slg:.000,obp:.333,ops:.333},
  {name:'しんぺい',num:23,year:2025,games:1,ab:3,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:2,so:1,avg:.000,slg:.000,obp:.000,ops:.000},
  // 2026年 規定打席以上
  {name:'大住',num:31,year:2026,games:6,ab:16,h:6,d:2,t:0,hr:1,rbi:3,sb:5,bb:3,hbp:1,so:1,avg:.375,slg:.688,obp:.500,ops:1.188},
  {name:'青木',num:18,year:2026,games:6,ab:15,h:6,d:0,t:0,hr:0,rbi:1,sb:0,bb:1,hbp:0,so:1,avg:.400,slg:.400,obp:.438,ops:.838},
  {name:'竹林',num:14,year:2026,games:6,ab:14,h:4,d:1,t:0,hr:1,rbi:6,sb:3,bb:4,hbp:0,so:2,avg:.286,slg:.571,obp:.444,ops:1.016},
  {name:'ソク',num:11,year:2026,games:6,ab:14,h:3,d:2,t:0,hr:0,rbi:3,sb:0,bb:2,hbp:0,so:2,avg:.214,slg:.357,obp:.313,ops:.670},
  {name:'ガク',num:45,year:2026,games:6,ab:14,h:3,d:2,t:0,hr:0,rbi:1,sb:0,bb:0,hbp:1,so:4,avg:.214,slg:.357,obp:.267,ops:.624},
  {name:'うすい',num:9,year:2026,games:5,ab:11,h:2,d:0,t:0,hr:0,rbi:3,sb:0,bb:2,hbp:1,so:1,avg:.182,slg:.182,obp:.357,ops:.539},
  {name:'梅澤',num:10,year:2026,games:5,ab:11,h:1,d:0,t:0,hr:0,rbi:2,sb:0,bb:4,hbp:0,so:0,avg:.091,slg:.091,obp:.333,ops:.424},
  // 2026年 規定打席未満
  {name:'笹野',num:25,year:2026,games:2,ab:3,h:1,d:0,t:0,hr:0,rbi:0,sb:0,bb:2,hbp:0,so:0,avg:.333,slg:.333,obp:.600,ops:.933},
  {name:'貢司',num:77,year:2026,games:2,ab:4,h:1,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:2,avg:.250,slg:.250,obp:.400,ops:.650},
  {name:'しんぺい',num:23,year:2026,games:2,ab:5,h:1,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,so:1,avg:.200,slg:.200,obp:.200,ops:.400},
  {name:'村野',num:55,year:2026,games:4,ab:7,h:1,d:1,t:0,hr:0,rbi:0,sb:2,bb:3,hbp:1,so:1,avg:.143,slg:.286,obp:.455,ops:.740},
  {name:'安倍',num:13,year:2026,games:4,ab:9,h:1,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:4,avg:.111,slg:.111,obp:.200,ops:.311},
  {name:'梶原',num:24,year:2026,games:1,ab:3,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:0,hbp:0,so:0,avg:.000,slg:.000,obp:.000,ops:.000},
  {name:'太田',num:6,year:2026,games:1,ab:2,h:0,d:0,t:0,hr:0,rbi:0,sb:0,bb:1,hbp:0,so:1,avg:.000,slg:.000,obp:.333,ops:.333},
  {name:'前田',num:12,year:2026,games:2,ab:2,h:0,d:0,t:0,hr:0,rbi:1,sb:1,bb:2,hbp:0,so:0,avg:.000,slg:.000,obp:.400,ops:.400},
];
const ARC_PITCHING=[
  // 2023年 規定投球回以上
  {name:'青木',num:18,year:2023,games:9,ip:25,ip3:0,w:3,l:1,sv:0,er:6,r:9,h:13,hr:0,so:17,bb:9,hbp:2,era:1.68},
  // 2023年 規定投球回未満
  {name:'至',num:1,year:2023,games:1,ip:2,ip3:0,w:0,l:0,sv:0,er:0,r:1,h:0,hr:0,so:3,bb:0,hbp:0,era:0.00},
  {name:'ガク',num:45,year:2023,games:2,ip:2,ip3:0,w:0,l:0,sv:0,er:1,r:1,h:3,hr:0,so:1,bb:1,hbp:1,era:3.50},
  {name:'大住',num:31,year:2023,games:9,ip:12,ip3:1,w:1,l:3,sv:1,er:12,r:19,h:15,hr:0,so:6,bb:10,hbp:12,era:6.81},
  {name:'梅澤',num:10,year:2023,games:1,ip:1,ip3:0,w:0,l:0,sv:0,er:1,r:1,h:2,hr:0,so:1,bb:0,hbp:0,era:7.00},
  {name:'ソク',num:11,year:2023,games:6,ip:12,ip3:0,w:1,l:0,sv:0,er:12,r:15,h:19,hr:2,so:8,bb:7,hbp:1,era:7.00},
  {name:'難波',num:17,year:2023,games:2,ip:3,ip3:0,w:0,l:1,sv:0,er:5,r:5,h:3,hr:0,so:1,bb:5,hbp:1,era:11.67},
  {name:'ケイタ',num:99,year:2023,games:1,ip:1,ip3:0,w:0,l:1,sv:0,er:5,r:5,h:3,hr:0,so:2,bb:0,hbp:0,era:35.00},
  // 2024年 規定投球回以上
  {name:'青木',num:18,year:2024,games:7,ip:27,ip3:0,w:4,l:2,sv:0,er:12,r:16,h:23,hr:1,so:21,bb:14,hbp:5,era:3.11},
  {name:'大住',num:31,year:2024,games:6,ip:15,ip3:0,w:1,l:1,sv:0,er:9,r:12,h:11,hr:0,so:15,bb:4,hbp:1,era:4.20},
  // 2024年 規定投球回未満
  {name:'至',num:1,year:2024,games:1,ip:3,ip3:0,w:0,l:0,sv:0,er:0,r:1,h:2,hr:0,so:2,bb:0,hbp:0,era:0.00},
  {name:'ソク',num:11,year:2024,games:2,ip:4,ip3:0,w:0,l:0,sv:0,er:4,r:5,h:4,hr:1,so:3,bb:3,hbp:0,era:7.00},
  // 2025年 規定投球回以上
  {name:'青木',num:18,year:2025,games:8,ip:27,ip3:0,w:6,l:2,sv:0,er:22,r:24,h:21,hr:0,so:19,bb:20,hbp:1,era:5.70},
  // 2025年 規定投球回未満
  {name:'ガク',num:45,year:2025,games:7,ip:13,ip3:1,w:0,l:1,sv:0,er:5,r:6,h:10,hr:0,so:13,bb:9,hbp:3,era:2.63},
  {name:'ソク',num:11,year:2025,games:2,ip:4,ip3:0,w:0,l:0,sv:0,er:2,r:2,h:5,hr:0,so:0,bb:0,hbp:0,era:3.50},
  {name:'大住',num:31,year:2025,games:2,ip:2,ip3:0,w:0,l:0,sv:0,er:1,r:3,h:3,hr:0,so:0,bb:2,hbp:0,era:3.50},
  // 2026年 規定投球回以上
  {name:'青木',num:18,year:2026,games:5,ip:22,ip3:0,w:3,l:2,sv:0,er:15,r:18,h:23,hr:1,so:16,bb:12,hbp:2,era:4.77},
  // 2026年 規定投球回未満
  {name:'ソク',num:11,year:2026,games:3,ip:5,ip3:2,w:0,l:0,sv:1,er:0,r:0,h:4,hr:0,so:3,bb:1,hbp:0,era:0.00},
  {name:'ガク',num:45,year:2026,games:3,ip:7,ip3:0,w:1,l:1,sv:0,er:12,r:13,h:6,hr:0,so:7,bb:12,hbp:5,era:12.00},
];
const TEAM_YEARS=[{year:2023,w:8,l:7,d:0,avg:.243,slg:.371,obp:.334,ops:.705,r:41,era:7.54,so:23,bb:24},{year:2024,w:4,l:11,d:0,avg:.207,slg:.275,obp:.284,ops:.559,r:37,era:7.00,so:40,bb:45},{year:2025,w:3,l:5,d:0,avg:.257,slg:.419,obp:.413,ops:.832,r:41,era:8.44,so:35,bb:35},{year:2026,w:4,l:2,d:0,avg:.243,slg:.374,obp:.372,ops:.746,r:23,era:6.35,so:20,bb:22}];
const ARC_YEARS=[2023,2024,2025,2026];
const GAME_RESULTS=[
{year:2023,round:1,date:'2023/02/18',opp:'東京ブラッキーズ',my:7,opp_score:6,result:'負',venue:'駒沢公園軟式野球場A面'},
{year:2023,round:2,date:'2023/04/22',opp:'東京アザーズ',my:6,opp_score:7,result:'負',venue:'ガス橋6号面野球場'},
{year:2023,round:3,date:'2023/05/06',opp:'Rangers',my:5,opp_score:6,result:'負',venue:'駒沢公園軟式野球場A面'},
{year:2023,round:4,date:'2023/06/10',opp:'StingRays',my:1,opp_score:5,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2023,round:5,date:'2023/06/17',opp:'サイドウォーカーズ',my:5,opp_score:0,result:'負',venue:'ガス橋3号面野球場'},
{year:2023,round:6,date:'2023/07/22',opp:'ドルフィンズ',my:4,opp_score:5,result:'勝',venue:'ガス橋緑地6号面野球場'},
{year:2023,round:7,date:'2023/08/05',opp:'練馬レッドサーティーンズ',my:3,opp_score:4,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2023,round:8,date:'2023/08/26',opp:'Meerkats',my:4,opp_score:8,result:'勝',venue:'ガス橋6号面野球場'},
{year:2023,round:9,date:'2023/10/14',opp:'Aspens',my:15,opp_score:3,result:'負',venue:'ガス橋6号面野球場'},
{year:2023,round:10,date:'2023/11/11',opp:'元硬式',my:4,opp_score:2,result:'負',venue:'ガス橋6号面野球場'},
{year:2024,round:1,date:'2024/03/02',opp:'幕張ベイビーズ',my:12,opp_score:1,result:'勝',venue:'ガス橋緑地8号面野球場'},
{year:2024,round:2,date:'2024/03/30',opp:'ビグレッツ',my:6,opp_score:2,result:'負',venue:'羽根木公園野球場'},
{year:2024,round:3,date:'2024/04/20',opp:'アラスターズ',my:5,opp_score:2,result:'負',venue:'駒沢公園軟式野球場'},
{year:2024,round:4,date:'2024/04/27',opp:'NRCフレンドリィズ',my:5,opp_score:6,result:'勝',venue:'ガス橋7号面野球場'},
{year:2024,round:5,date:'2024/05/11',opp:'AROSSO',my:4,opp_score:5,result:'勝',venue:'ガス橋6号面野球場'},
{year:2024,round:6,date:'2024/07/06',opp:'FS A Cuppers',my:5,opp_score:3,result:'負',venue:'駒沢公園軟式野球場A面'},
{year:2024,round:7,date:'2024/09/14',opp:'アクティブエイト',my:9,opp_score:3,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:1,date:'2025/04/05',opp:'練馬レッドサーティーンズ',my:1,opp_score:6,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:2,date:'2025/04/19',opp:'ファル・メイトファイターズ',my:5,opp_score:10,result:'勝',venue:'羽根木公園野球場'},
{year:2025,round:3,date:'2025/06/07',opp:'AROSSO',my:4,opp_score:0,result:'負',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:4,date:'2025/06/21',opp:'ドルフィンズ',my:5,opp_score:7,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:5,date:'2025/07/19',opp:'チームボアンカレ',my:5,opp_score:3,result:'勝',venue:'渋谷区二子玉川野球場'},
{year:2025,round:6,date:'2025/09/20',opp:'Pithecan All Stars',my:10,opp_score:3,result:'負',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:7,date:'2025/10/04',opp:'MKI Baseball Club',my:1,opp_score:10,result:'勝',venue:'駒沢公園軟式野球場A面'},
{year:2025,round:8,date:'2025/10/18',opp:'琉球システマ',my:3,opp_score:2,result:'勝',venue:'駒沢公園軟式野球場A面'}];
// 2026年の試合結果はすべてSupabaseのgamesテーブルに移行済み(スコア入力画面で確認・編集可能)
