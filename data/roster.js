// 選手名簿・背番号・写真・スタメン設定（ここを編集すれば選手情報を更新できます）
// MASTER DATA
const PLAYER_PHOTOS={1:'https://ts-league.com/team/musasen/profile/13695.jpg',6:'https://ts-league.com/team/musasen/profile/13739.jpg',9:'https://ts-league.com/team/musasen/profile/13742.jpg',10:'https://ts-league.com/team/musasen/profile/13743.jpg',11:'https://ts-league.com/team/musasen/profile/13744.jpg',14:'https://ts-league.com/team/musasen/profile/13745.jpg',17:'https://ts-league.com/team/musasen/profile/13746.jpg',18:'https://ts-league.com/team/musasen/profile/13747.jpg',25:'https://ts-league.com/team/musasen/profile/13748.jpg',31:'https://ts-league.com/team/musasen/profile/13749.jpg',44:'https://ts-league.com/team/musasen/profile/13750.jpg',45:'https://ts-league.com/team/musasen/profile/13751.jpg',55:'https://ts-league.com/team/musasen/profile/13753.jpg'};
const PLAYER_PHOTO_DEFAULT='https://ts-league.com/common/images/team_introduction/pin_no.gif';
const MEMBERS=[{num:1,name:'至'},{num:2,name:'大谷'},{num:3,name:'まつ'},{num:4,name:'古田'},{num:5,name:'田中'},{num:6,name:'太田'},{num:8,name:'伊藤'},{num:9,name:'うすい'},{num:10,name:'梅澤'},{num:11,name:'ソク'},{num:12,name:'前田'},{num:13,name:'安倍'},{num:14,name:'竹林'},{num:17,name:'難波'},{num:18,name:'青木'},{num:23,name:'しんぺい'},{num:24,name:'梶原'},{num:25,name:'笹野'},{num:31,name:'大住'},{num:44,name:'新江'},{num:45,name:'ガク'},{num:47,name:'すいみ～'},{num:55,name:'村野'},{num:66,name:'てつ'},{num:77,name:'貢司'},{num:99,name:'ケイタ'},{num:120,name:'たくま'}];
const PITCHER_NUMS=[1,11,17,18,45];
const POSITIONS=['投','捕','一','二','三','遊','左','中','右','DH','PR','PH'];

const DEFAULT_LINEUP=[{o:1,num:31,pos:'DH'},{o:2,num:55,pos:'中'},{o:3,num:14,pos:'遊'},{o:4,num:10,pos:'三'},{o:5,num:12,pos:'右'},{o:6,num:9,pos:'捕'},{o:7,num:11,pos:'二'},{o:8,num:45,pos:'投'},{o:9,num:13,pos:'左'}];
