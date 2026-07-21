/* 聖靈九果・結果子分出去 —— tsum 連鏈版(物理堆疊+劃線連同款)
 * 反向化鑰匙:連線不是「消滅」,是「結果子分給鄰舍」——果子是聖靈結的,不是自己擠的。
 * 九款圖鑑=九果剛剛好:仁愛、喜樂、和平、忍耐、恩慈、良善、信實、溫柔、節制。
 * 經文:加5:22-23 / 約15:8(和合本,已 cuv 查驗)。零相依、可離線、手機直向友善。榮耀歸神。
 */
(function(){
'use strict';
var W = 540, H = 960;
var cv = document.getElementById('cv'), ctx = cv.getContext('2d');
cv.width = W; cv.height = H;

// ---------- letterbox fit ----------
function fit(){
  var vw = innerWidth, vh = innerHeight, s = Math.min(vw/W, vh/H);
  cv.style.width = (W*s)+'px'; cv.style.height = (H*s)+'px';
}
addEventListener('resize', fit); fit();

// ---------- tsum 圖鑑:聖靈九果剛剛好九款(加5:22-23)——顏色拉開+每果專屬記號 ----------
var TYPES = [
  {id:'p0', name:'仁愛・蘋果',   c1:'#e05252', c2:'#b03030', heart:true},
  {id:'p1', name:'喜樂・橘子',   c1:'#f0a03c', c2:'#c87818', seg:true},
  {id:'p2', name:'和平・藍莓',   c1:'#6a88d8', c2:'#4560ae', calyx:true},
  {id:'p3', name:'忍耐・石榴',   c1:'#c04868', c2:'#943048', crown:true},
  {id:'p4', name:'恩慈・水蜜桃', c1:'#f4b0a8', c2:'#d8827a', cleft:true},
  {id:'p5', name:'良善・青蘋果', c1:'#9cc85a', c2:'#74a136'},
  {id:'p6', name:'信實・葡萄',   c1:'#9a6cc8', c2:'#7248a0', dots:true},
  {id:'p7', name:'溫柔・檸檬',   c1:'#f0d84c', c2:'#c9b028', bumps:true},
  {id:'p8', name:'節制・橄欖',   c1:'#7a8a4a', c2:'#556130', band:true}
];

// ---------- 年齡三檔(kid-age-modes) ----------
var MODES = {
  young:{ label:'幼幼(4-6)', types:4, minChain:2, target:600,  r:47, feed:20 },
  kid:  { label:'兒童(7-11)', types:7, minChain:3, target:3000, r:38, feed:13 },
  teen: { label:'青少年(12+)', types:9, minChain:4, target:6000, r:32, feed:10 }
};
var modeKey = 'kid';
try{ modeKey = localStorage.getItem('f9-mode') || 'kid'; }catch(e){}
if(!MODES[modeKey]) modeKey = 'kid';
var M = MODES[modeKey];

// ---------- 版面 ----------
var CROWD_TOP = 64, CROWD_H = 150;           // 上方群眾草地
var PLAY_TOP = CROWD_TOP + CROWD_H + 8;      // 堆疊區頂
var FLOOR = H - 26;                          // 堆疊區底

// ---------- 狀態 ----------
var tsums = [], chain = [], flying = [], sparks = [];
var fed = 0, shownFed = 0, chainCount = 0, playing = false, won = false;
var startTime = 0, doneSent = false;
var blessT = 0;          // >0 = 祝福時刻(加倍)剩餘秒
var nextBlessAt = 6;     // 第幾鏈觸發祝福
var spawnQueue = 0, spawnTick = 0;
var CAP = 46;
var muted = false;
try{ muted = localStorage.getItem('f9-mute') === '1'; }catch(e){}
var scene = 'menu';      // menu | play | win
var banner = null;       // {text, t}
var hintT = 0, checkT = 0, hintGroup = null;   // 提示/救援(07-21)
var dbgChecks = 0, dbgRescues = 0;             // 07-22 診斷計數(test 鉤子讀)

function activeTypes(){
  // 幼幼 4 款=蘋果紅/檸檬黃/藍莓藍/青蘋果綠最好分;兒童 7;青少年 9 全員
  if (M.types === 4) return [TYPES[0], TYPES[7], TYPES[2], TYPES[5]];
  if (M.types === 7) return [TYPES[0], TYPES[1], TYPES[2], TYPES[3], TYPES[5], TYPES[6], TYPES[7]];
  return TYPES;
}

// ---------- 音效/BGM(零檔案 WebAudio) ----------
var AC = null;
function ac(){ if(!AC){ try{ AC = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){} } return AC; }
function blip(f, dur, type, vol){
  if (muted) return; var a = ac(); if(!a) return;
  try{
    var o = a.createOscillator(), g = a.createGain();
    o.type = type||'sine'; o.frequency.value = f;
    g.gain.setValueAtTime((vol||0.12), a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + (dur||0.15));
    o.connect(g); g.connect(a.destination); o.start(); o.stop(a.currentTime + (dur||0.15) + 0.02);
  }catch(e){}
}
function chordCollect(n){
  var base = 392; // G4
  [0,4,7, n>=5?12:null].forEach(function(st,i){
    if(st===null) return;
    setTimeout(function(){ blip(base*Math.pow(2,st/12), 0.25, 'triangle', 0.1); }, i*40);
  });
}
// 輕快 BGM:兩軌八小節循環(procedural-bgm 精簡版)
var bgmTimer = null, bgmStep = 0;
var MELO = [523,587,659,784, 659,587,523,392, 440,494,523,659, 587,523,494,392];
var BASS = [131,131,175,175, 196,196,175,175, 147,147,175,175, 196,196,131,131];
function bgmTick(){
  if (muted || scene !== 'play') return;
  var i = bgmStep % 16;
  blip(BASS[i], 0.22, 'sine', 0.05);
  if (bgmStep % 2 === 0) blip(MELO[(bgmStep/2)%16|0], 0.18, 'triangle', 0.045);
  bgmStep++;
}
function bgmStart(){ if (bgmTimer) return; bgmTimer = setInterval(bgmTick, 240); }

// ---------- 曉臻預烤語音(播報人聲鐵律:mp3 有就播,沒有就靜默,絕不機器聲) ----------
var VOICES = { intro:'voice/intro.mp3', bless:'voice/bless.mp3', win:'voice/win.mp3' };
var voiceEl = null, blessSpoken = false;
function speak(key){
  if (muted) return;
  try{
    if (voiceEl){ voiceEl.pause(); }
    voiceEl = new Audio(VOICES[key]);
    voiceEl.volume = 1; voiceEl.play().catch(function(){});
  }catch(e){}
}

// ---------- 產生/物理(Verlet 圓) ----------
function rnd(a,b){ return a + Math.random()*(b-a); }
function spawnTsum(){
  var ts = activeTypes(), t, x;
  // 07-22:群聚生成——45% 抄場上隨機一顆的型別、落在它附近,讓 5+ 長鏈自然可達(鏈長本無上限,是密度不夠)
  var anchor = playing && tsums.length && Math.random() < 0.45 ? tsums[(Math.random()*tsums.length)|0] : null;   // 07-22:開場鋪場不群聚(會滾雪球整片同色),只在補球時群聚
  if (anchor && !anchor.t.wild){
    t = anchor.t;
    x = Math.max(M.r+6, Math.min(W-M.r-6, anchor.x + rnd(-70,70)));
  } else {
    t = ts[(Math.random()*ts.length)|0];
    x = rnd(M.r+6, W-M.r-6);
  }
  // 07-22:有大有小(像一網滿滿的魚)——15% 大隻 1.3×、~25% 小隻 0.78×、其餘微抖動
  var sr = M.r * (Math.random()<0.15 ? 1.3 : (Math.random()<0.3 ? 0.78 : rnd(0.92,1.08)));
  tsums.push({ x:x, y:PLAY_TOP - rnd(20,140), px:0, py:0, r:sr, t:t,
               wob:Math.random()*6.28, hi:0 });
  var s = tsums[tsums.length-1]; s.px = s.x; s.py = s.y - rnd(0,2);
}
function physics(dt){
  var i, j, a, b;
  for (i=0;i<tsums.length;i++){
    a = tsums[i];
    var vx = (a.x - a.px)*0.99, vy = (a.y - a.py)*0.99;
    a.px = a.x; a.py = a.y;
    a.x += vx; a.y += vy + 0.42;
  }
  for (var it=0; it<3; it++){
    for (i=0;i<tsums.length;i++){
      a = tsums[i];
      if (a.x < a.r) a.x = a.r;
      if (a.x > W-a.r) a.x = W-a.r;
      if (a.y > FLOOR - a.r) a.y = FLOOR - a.r;
      if (a.y < -200) a.y = -200;
    }
    for (i=0;i<tsums.length;i++){
      for (j=i+1;j<tsums.length;j++){
        a = tsums[i]; b = tsums[j];
        var dx = b.x-a.x, dy = b.y-a.y, rr = a.r+b.r;
        if (Math.abs(dx)>rr || Math.abs(dy)>rr) continue;
        var d2 = dx*dx+dy*dy;
        if (d2 >= rr*rr || d2 === 0) continue;
        var d = Math.sqrt(d2), push = (rr-d)/d*0.5;
        dx*=push; dy*=push;
        a.x-=dx; a.y-=dy; b.x+=dx; b.y+=dy;
      }
    }
  }
}

// ---------- 連鏈輸入 ----------
var dragging = false, curP = null, trail = [];
function evPos(e){
  var r = cv.getBoundingClientRect();
  var p = (e.touches && e.touches[0]) || e;
  return { x:(p.clientX-r.left)/r.width*W, y:(p.clientY-r.top)/r.height*H };
}
function hitTsum(p){
  for (var i=tsums.length-1;i>=0;i--){
    var t = tsums[i], dx = p.x-t.x, dy = p.y-t.y;
    if (dx*dx+dy*dy < t.r*t.r*1.1) return t;
  }
  return null;
}
function onDown(e){
  hintT = 0; hintGroup = null;
  e.preventDefault();
  var p = evPos(e);
  if (scene === 'menu'){ menuTap(p); return; }
  if (scene === 'win'){ winTap(p); return; }
  if (hudTap(p)) return;
  var t = hitTsum(p);
  if (t){ dragging = true; curP = p; trail = [{x:t.x, y:t.y}]; chain = [t]; t.hi = 1; blip(440, 0.08, 'sine', 0.08); }
}
function onMove(e){
  if (!dragging || scene!=='play') return;
  e.preventDefault();
  var p = evPos(e), t = hitTsum(p);
  curP = p;                                   // 07-22:游標徽章位置
  trail.push({x:p.x, y:p.y});                 // 07-22:滑鼠軌跡(線會轉彎,不是直線)
  if (trail.length > 60) trail.shift();
  if (!t) return;
  var last = chain[chain.length-1];
  if (t === last) return;
  var prev = chain[chain.length-2];
  if (t === prev){ last.hi = 0; chain.pop(); blip(330,0.06,'sine',0.06); return; } // 回滑取消
  if (chain.indexOf(t) !== -1) return;
  if (t.t !== last.t) return;
  var dx = t.x-last.x, dy = t.y-last.y, lim = (t.r+last.r)*1.35;
  if (dx*dx+dy*dy > lim*lim) return;
  chain.push(t); t.hi = 1;
  blip(440*Math.pow(2, Math.min(chain.length,12)/12), 0.08, 'sine', 0.09);
}
function onUp(e){
  if (scene!=='play'){ dragging=false; return; }
  if (!dragging) return;
  dragging = false; curP = null;
  var n = chain.length;
  if (n >= M.minChain) collect(chain.slice());
  for (var i=0;i<chain.length;i++) chain[i].hi = 0;
  chain = [];
}
cv.addEventListener('pointerdown', onDown);
cv.addEventListener('pointermove', onMove);
addEventListener('pointerup', onUp);
addEventListener('pointercancel', onUp);   // 07-22 修:手機手勢中斷只發 cancel,不接=dragging 卡死→救援全停
cv.addEventListener('touchstart', function(e){e.preventDefault();}, {passive:false});

// ---------- 收鏈=分給眾人 ----------
function collect(list){
  var n = list.length;
  var mult = (n>=8?3 : n>=5?2 : 1) * (blessT>0?2:1);
  var people = n * M.feed * mult;
  fed = Math.min(M.target, fed + people);
  chainCount++;
  hintT = 0; hintGroup = null;
  chordCollect(n);
  for (var i=0;i<n;i++){
    var t = list[i], idx = tsums.indexOf(t);
    if (idx !== -1) tsums.splice(idx,1);
    flying.push({ x:t.x, y:t.y, r:t.r, t:t.t, tx:rnd(60,W-60), ty:CROWD_TOP+CROWD_H*0.55, p:0, d:i*0.05 });
  }
  for (i=0;i<10+n*2;i++) sparks.push({ x:list[0].x, y:list[0].y, vx:rnd(-3,3), vy:rnd(-4,1), life:1 });
  spawnQueue += n + 1;                      // ★越分越多:清 n 掉 n+1
  banner = { text: n>=5 ? ('好長的一串!分給鄰舍 '+people+' 份') : ('分給鄰舍 '+people+' 份'), t:1.4 };
  if (chainCount >= nextBlessAt && blessT<=0){
    blessT = 8; nextBlessAt += (modeKey==='teen'?9:7);
    banner = { text:'✨ 聖靈澆灌——結的果子加倍!', t:2.4 };
    blip(784,0.4,'triangle',0.12); blip(988,0.5,'triangle',0.1);
    if (!blessSpoken){ blessSpoken = true; speak('bless'); }
  }
  if (fed >= M.target && !won){
    won = true; scene = 'win'; speak('win');
    if (!doneSent){ doneSent = true;
      if (window.__ping) window.__ping('fruit9-tsum-done', Math.round((Date.now()-startTime)/1000)); }
  }
}


// ---------- 提示+卡死救援(07-21 修:場上可能完全沒有可連的同款相鄰組=卡死) ----------
function findGroup(){
  for (var i=0;i<tsums.length;i++){
    var seed = tsums[i];
    var group = [seed], seen = [seed], grow = true;
    while (grow && group.length < 9){
      grow = false;
      for (var j=0;j<tsums.length;j++){
        var c = tsums[j];
        if (seen.indexOf(c) !== -1 || c.t !== seed.t) continue;
        var lastT = group[group.length-1];
        var dx=c.x-lastT.x, dy=c.y-lastT.y, lim=(c.r+lastT.r)*1.35;
        if (dx*dx+dy*dy <= lim*lim){ group.push(c); seen.push(c); grow = true; break; }
      }
    }
    if (group.length >= M.minChain) return group;
  }
  return null;
}
function rescue(){
  // 無鏈可連的溫柔救援:挑一顆,把離它最近的幾顆變成同款(必產生可連組),火花+橫幅
  // 07-22:只挑「已落定」的球(掉落中的遞色後落地會散,鏈必斷)
  var cands = tsums.filter(function(t){ return !t.t.wild && Math.abs(t.y - t.py) < 1.5 && t.y > PLAY_TOP; });
  if (cands.length <= M.minChain) return false;
  var seed = cands[(Math.random()*cands.length)|0];
  // 07-22 修 v2:沿「實際相鄰」走訪遞色,不搬位置——瞬移進人堆會被物理彈散(minChain≥4 必斷鏈);
  // 堆裡最近的未用球本來就貼著(~1.0×半徑和<1.35 可連),純換色=物理穩定、必可連
  var used = [seed], prev = seed;
  for (var i=0;i<M.minChain-1;i++){
    var best = null, bd = 1e9;
    for (var j=0;j<cands.length;j++){
      var c = cands[j];
      if (used.indexOf(c) !== -1) continue;
      var dx=c.x-prev.x, dy=c.y-prev.y, d2=dx*dx+dy*dy;
      if (d2 < bd){ bd = d2; best = c; }
    }
    if (!best) break;
    var lim = (best.r+prev.r)*1.2;
    if (bd > lim*lim){
      // 稀疏場才輕移貼齊 prev(順著原方向,不闖進堆中心)
      var ang = Math.atan2(best.y-prev.y, best.x-prev.x);
      best.x = Math.max(best.r, Math.min(W-best.r, prev.x + Math.cos(ang)*(prev.r+best.r)*0.98));
      best.y = Math.max(PLAY_TOP, Math.min(FLOOR-best.r, prev.y + Math.sin(ang)*(prev.r+best.r)*0.98));
      best.px = best.x; best.py = best.y;
    }
    best.t = seed.t;
    for (var k=0;k<6;k++) sparks.push({ x:best.x, y:best.y, vx:rnd(-2,2), vy:rnd(-3,1), life:1 });
    used.push(best); prev = best;
  }
  banner = { text:"✨ 聖靈吹拂——果子聚在一起了!", t:2.0 };
  blip(659,0.3,'triangle',0.1);
  hintGroup = null; hintT = 0;
  return true;
}
// ---------- 畫圖 ----------
function roundRect(x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r);
  ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

// 立體感三件套:色彩混合 + 球面漸層 + 高光/接地影(canvas 2D 假 3D,零相依;2026-07-21 回灌)
function hex2rgb(h){ return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function mixc(h, f){ // f>0 往白、f<0 往黑
  var c = hex2rgb(h), t = f>0 ? 255 : 0, a = Math.abs(f);
  return 'rgb('+Math.round(c[0]+(t-c[0])*a)+','+Math.round(c[1]+(t-c[1])*a)+','+Math.round(c[2]+(t-c[2])*a)+')';
}
function ballGrad(x, y, r, c1, c2){
  var g = ctx.createRadialGradient(x - r*0.35, y - r*0.45, r*0.12, x, y, r*1.02);
  g.addColorStop(0, mixc(c1, 0.55));
  g.addColorStop(0.45, c1);
  g.addColorStop(1, mixc(c2, -0.22));
  return g;
}
function ballHighlight(x, y, r){
  ctx.fillStyle = 'rgba(255,255,255,.45)';
  ctx.beginPath(); ctx.ellipse(x - r*0.34, y - r*0.44, r*0.24, r*0.13, -0.55, 0, 7); ctx.fill();
}
function groundShadow(x, y, r){
  ctx.fillStyle = 'rgba(70,50,20,.16)';
  ctx.beginPath(); ctx.ellipse(x, y + r*0.86, r*0.78, r*0.2, 0, 0, 7); ctx.fill();
}

function drawFace(x,y,r,happy){
  // 臉部鐵則:每顆 tsum 都有眼和嘴
  ctx.fillStyle = '#3a2a18';
  ctx.beginPath(); ctx.arc(x-r*0.28, y-r*0.08, r*0.085, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x+r*0.28, y-r*0.08, r*0.085, 0, 7); ctx.fill();
  ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = Math.max(2, r*0.07); ctx.lineCap='round';
  ctx.beginPath(); ctx.arc(x, y+r*0.14, r*0.24, 0.25, Math.PI-0.25); ctx.stroke();
  if (happy){
    ctx.fillStyle = 'rgba(240,120,120,.45)';
    ctx.beginPath(); ctx.arc(x-r*0.5, y+r*0.1, r*0.12, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.5, y+r*0.1, r*0.12, 0, 7); ctx.fill();
  }
}
function drawTsum(t, xx, yy, rr){
  var x = xx!==undefined?xx:t.x, y = yy!==undefined?yy:t.y, r = (rr!==undefined?rr:t.r) * (t.hi? 1.13:1);
  var ty = t.t;
  ctx.save();
  groundShadow(x, y, r);
  if (t.hi){ ctx.shadowColor = '#fff'; ctx.shadowBlur = 14; }
  // 果身:球面漸層立體感
  ctx.fillStyle = ballGrad(x, y, r*0.95, ty.c1, ty.c2);
  ctx.beginPath(); ctx.arc(x, y, r*0.95, 0, 7); ctx.fill();
  // 果梗+小葉(每顆果子的共同記號)
  ctx.strokeStyle = '#6a4a26'; ctx.lineWidth = Math.max(2, r*0.09); ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x, y-r*0.86); ctx.quadraticCurveTo(x+r*0.06, y-r*1.02, x+r*0.16, y-r*1.1); ctx.stroke();
  ctx.fillStyle = '#5a9a3c';
  ctx.beginPath(); ctx.ellipse(x+r*0.32, y-r*1.0, r*0.2, r*0.1, 0.5, 0, 7); ctx.fill();
  // 各果專屬記號
  if (ty.heart){ ctx.fillStyle = '#7a1828';
    ctx.font = 'bold ' + Math.max(10, r*0.42) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('♥', x+r*0.4, y+r*0.5); }
  if (ty.seg){ ctx.strokeStyle = 'rgba(180,100,20,.5)'; ctx.lineWidth = Math.max(2, r*0.06);
    for (var si=0; si<3; si++){ var sa = -0.5 + si*1.05;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x+Math.cos(sa)*r*0.85, y+Math.sin(sa)*r*0.85); ctx.stroke(); } }
  if (ty.calyx){ ctx.fillStyle = 'rgba(30,45,100,.65)';
    ctx.font = 'bold ' + Math.max(9, r*0.36) + 'px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('✦', x, y+r*0.62); }
  if (ty.crown){ ctx.fillStyle = mixc(ty.c2, -0.25);
    ctx.beginPath();
    ctx.moveTo(x-r*0.3, y-r*0.72); ctx.lineTo(x-r*0.22, y-r*0.98); ctx.lineTo(x-r*0.1, y-r*0.74);
    ctx.lineTo(x, y-r*1.0); ctx.lineTo(x+r*0.1, y-r*0.74); ctx.lineTo(x+r*0.2, y-r*0.95); ctx.lineTo(x+r*0.28, y-r*0.7);
    ctx.closePath(); ctx.fill(); }
  if (ty.cleft){ ctx.strokeStyle = 'rgba(180,90,80,.55)'; ctx.lineWidth = Math.max(2, r*0.07); ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x, y-r*0.8); ctx.quadraticCurveTo(x-r*0.28, y-r*0.2, x-r*0.08, y+r*0.7); ctx.stroke(); }
  if (ty.dots){ ctx.fillStyle = 'rgba(60,30,90,.5)';
    ctx.beginPath(); ctx.arc(x-r*0.32, y+r*0.15, r*0.16, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.05, y+r*0.42, r*0.15, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(x+r*0.38, y+r*0.1, r*0.14, 0, 7); ctx.fill(); }
  if (ty.bumps){ ctx.fillStyle = ty.c1;
    ctx.beginPath(); ctx.ellipse(x-r*0.92, y, r*0.16, r*0.1, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.ellipse(x+r*0.92, y, r*0.16, r*0.1, 0, 0, 7); ctx.fill(); }
  if (ty.band){ ctx.strokeStyle = 'rgba(40,50,20,.45)'; ctx.lineWidth = Math.max(2, r*0.1);
    ctx.beginPath(); ctx.arc(x, y, r*0.72, 0.5, 2.2); ctx.stroke(); }
  ballHighlight(x, y, r*0.95);
  drawFace(x, y+r*0.05, r, t.hi);
  ctx.restore();
}
function drawCrowdPerson(x, y, s, i, t){
  // 坐在草地上的小人(有臉),吃飽比例越高越多人舉手歡呼
  var happyN = Math.floor((fed/M.target)*CROWD_N);
  var happy = i < happyN;
  var bob = happy ? Math.sin(t*5 + i)*2 : 0;
  ctx.fillStyle = ['#c96b4a','#7a9c5a','#5a7a9c','#9c7a5a','#8a5a9c'][i%5];
  ctx.beginPath(); ctx.arc(x, y - 6*s + bob*0.3, 7*s, Math.PI, 0); ctx.fill();
  ctx.fillRect(x-7*s, y-6*s+bob*0.3, 14*s, 6*s);
  ctx.fillStyle = '#f2c9a0';
  ctx.beginPath(); ctx.arc(x, y-13*s + bob, 5.2*s, 0, 7); ctx.fill();
  ctx.fillStyle = '#4a3020';
  ctx.beginPath(); ctx.arc(x, y-16*s + bob, 5*s, Math.PI*1.05, Math.PI*1.95); ctx.fill(); // 髮(耳前無髮)
  ctx.fillStyle = '#2a1a10';
  ctx.beginPath(); ctx.arc(x-1.8*s, y-13.5*s+bob, 0.7*s, 0, 7); ctx.fill();
  ctx.beginPath(); ctx.arc(x+1.8*s, y-13.5*s+bob, 0.7*s, 0, 7); ctx.fill();
  ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 0.8*s;
  ctx.beginPath(); ctx.arc(x, y-11.8*s+bob, 1.6*s, 0.3, Math.PI-0.3); ctx.stroke();
  if (happy){ // 舉手
    ctx.strokeStyle = '#f2c9a0'; ctx.lineWidth = 2*s; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x-6*s, y-6*s); ctx.lineTo(x-9*s, y-16*s-bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x+6*s, y-6*s); ctx.lineTo(x+9*s, y-16*s-bob); ctx.stroke();
  }
}
var CROWD_N = 24, crowdPos = [];
(function(){
  for (var i=0;i<CROWD_N;i++){
    crowdPos.push({ x: 36 + (i%8)*68 + ((i/8|0)%2)*30 + rnd(-8,8),
                    y: CROWD_TOP + 52 + (i/8|0)*44 + rnd(-4,4), s: rnd(0.85,1.1) });
  }
})();

function drawHUD(){
  ctx.fillStyle = '#1e5c33';
  ctx.fillRect(0,0,W,CROWD_TOP);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 26px "Microsoft JhengHei",sans-serif'; ctx.textAlign='center';
  ctx.fillText('已分享 ' + Math.round(shownFed) + ' / ' + M.target + ' 份果子', W/2, 40);
  // 返回大廳
  ctx.font = '20px sans-serif'; ctx.textAlign='left';
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillText('← 大廳', 12, 38);
  ctx.textAlign='right';
  ctx.fillText(muted?'🔇':'🔊', W-14, 38);
  // 進度條
  ctx.fillStyle = 'rgba(0,0,0,.3)'; roundRect(80, 48, W-160, 10, 5); ctx.fill();
  ctx.fillStyle = blessT>0 ? '#ffd54a' : '#8fdc7a';
  var w = Math.max(10,(W-160)*Math.min(1, shownFed/M.target));
  roundRect(80, 48, w, 10, 5); ctx.fill();
}
function hudTap(p){
  if (p.y < CROWD_TOP){
    if (p.x < 100){ location.href = 'https://hfpc-bible-games.netlify.app/'; return true; }
    if (p.x > W-100){ muted = !muted; try{ localStorage.setItem('f9-mute', muted?'1':'0'); }catch(e){} return true; }
  }
  return false;
}

function drawScene(t){
  // 天空+草地
  var g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#8ecfF0'); g.addColorStop(0.35,'#a8dcf2'); g.addColorStop(1,'#7ec9ea');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);
  ctx.fillStyle = '#5aa953';
  ctx.fillRect(0, CROWD_TOP, W, CROWD_H);
  ctx.fillStyle = 'rgba(255,255,255,.25)';
  for (var i=0;i<3;i++){ ctx.beginPath();
    ctx.ellipse(90+i*180 + Math.sin(t*0.3+i)*10, CROWD_TOP-24, 44,14, 0,0,7); ctx.fill(); }
  for (i=0;i<CROWD_N;i++) drawCrowdPerson(crowdPos[i].x, crowdPos[i].y, crowdPos[i].s, i, t);
  // 堆疊區底(布/籃)
  ctx.fillStyle = '#e9dfc8';
  ctx.fillRect(0, PLAY_TOP-6, W, FLOOR-PLAY_TOP+40);
  ctx.fillStyle = 'rgba(160,130,80,.25)';
  for (i=0;i<5;i++) ctx.fillRect(0, PLAY_TOP+ i*(FLOOR-PLAY_TOP)/5, W, 2);
  ctx.fillStyle = '#caa96a'; ctx.fillRect(0, FLOOR, W, H-FLOOR);
}
function drawChainLine(){
  // 07-22 修:改畫在 tsum 上層(舊版先畫線再畫球=線被球蓋住看不見),並加「最後一顆→游標」段
  if (!dragging || chain.length < 1) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(255,235,120,.9)'; ctx.lineWidth = 14; ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.shadowColor = 'rgba(255,240,160,.9)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(chain[0].x, chain[0].y);
  for (var i=1;i<chain.length;i++) ctx.lineTo(chain[i].x, chain[i].y);
  if (curP) ctx.lineTo(curP.x, curP.y);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.95)'; ctx.lineWidth = 5; ctx.shadowBlur = 0;
  ctx.stroke();
  ctx.restore();
  // 已選顆數徽章(跟著游標)
  if (curP && chain.length >= 2){
    ctx.fillStyle = 'rgba(30,60,38,.9)';
    ctx.beginPath(); ctx.arc(curP.x, curP.y - 44, 20, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(chain.length, curP.x, curP.y - 36);
  }
}

// ---------- 開場/勝利畫面 ----------
var menuBtns = [];
function drawMenu(t){
  drawScene(t);
  ctx.fillStyle = 'rgba(20,45,28,.82)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center'; ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 52px "Microsoft JhengHei",sans-serif';
  ctx.fillText('聖靈九果', W/2, 190);
  ctx.font = 'bold 34px "Microsoft JhengHei",sans-serif';
  ctx.fillText('結 果 子 ・ 分 出 去', W/2, 245);
  // 示意 tsum
  var demo = [TYPES[0], TYPES[5], TYPES[1], TYPES[6], TYPES[2]];
  for (var i=0;i<5;i++) drawTsum({t:demo[i], hi:0}, 90+i*90, 330 + Math.sin(t*2+i)*8, 34);
  ctx.fillStyle = '#fff'; ctx.font = '22px "Microsoft JhengHei",sans-serif';
  ctx.fillText('「聖靈所結的果子,就是仁愛、喜樂、和平、忍耐、', W/2, 420);
  ctx.fillText('恩慈、良善、信實、溫柔、節制。」(加5:22-23)', W/2, 452);
  ctx.font = '24px "Microsoft JhengHei",sans-serif'; ctx.fillStyle = '#cfe9d5';
  ctx.fillText('劃線連起同款的果子,分給鄰舍', W/2, 510);
  ctx.fillText('果子是聖靈結的——多結果子,榮耀歸神!', W/2, 544);
  menuBtns = [];
  var keys = ['young','kid','teen'];
  for (i=0;i<3;i++){
    var y = 610 + i*92, sel = keys[i]===modeKey;
    ctx.fillStyle = sel ? '#ffd54a' : 'rgba(255,255,255,.14)';
    roundRect(W/2-170, y, 340, 72, 18); ctx.fill();
    ctx.fillStyle = sel ? '#4a3510' : '#fff';
    ctx.font = 'bold 30px "Microsoft JhengHei",sans-serif';
    // 07-22:標明「連N顆」——玩家會以為每檔都是連3
    ctx.font = 'bold 28px "Microsoft JhengHei",sans-serif';
    ctx.fillText(MODES[keys[i]].label, W/2, y+32);
    ctx.font = '21px "Microsoft JhengHei",sans-serif';
    ctx.fillText('同款連 ' + MODES[keys[i]].minChain + ' 顆・分享 ' + MODES[keys[i]].target + ' 份', W/2, y+60);
    menuBtns.push({ x:W/2-170, y:y, w:340, h:72, key:keys[i] });
  }
  ctx.fillStyle = '#9fd6a8'; ctx.font = '20px sans-serif';
  ctx.fillText('點一個年齡檔就開始 ▶', W/2, 910);
}
function menuTap(p){
  for (var i=0;i<menuBtns.length;i++){
    var b = menuBtns[i];
    if (p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h){
      modeKey = b.key; M = MODES[modeKey];
      try{ localStorage.setItem('f9-mode', modeKey); }catch(e){}
      startGame(); return;
    }
  }
}
function startGame(){
  tsums = []; chain = []; flying = []; sparks = [];
  fed = 0; shownFed = 0; chainCount = 0; won = false; blessT = 0; blessSpoken = false;
  nextBlessAt = modeKey==='young' ? 4 : 6;
  spawnQueue = 0; doneSent = false;
  hintT = 0; checkT = 0; hintGroup = null;
  var n = Math.min(CAP-6, Math.floor((W-20)/(2*M.r)) * 6);
  for (var i=0;i<n;i++) spawnTsum();
  scene = 'play'; playing = true; startTime = Date.now();
  banner = { text: '劃線連起 ' + M.minChain + ' 顆同款!', t: 3 };   // 07-22:各檔連鏈門檻不同(青少年=4),開場講清楚
  ac(); bgmStart(); speak('intro');
  if (window.__ping) window.__ping('fruit9-tsum-start');
}
var winBtns = [];
function drawWin(t){
  drawScene(t);
  for (var i=0;i<tsums.length;i++) drawTsum(tsums[i]);
  ctx.fillStyle = 'rgba(20,45,28,.88)'; ctx.fillRect(0,0,W,H);
  ctx.textAlign='center';
  ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 44px "Microsoft JhengHei",sans-serif';
  ctx.fillText('🎉 果子結滿了!', W/2, 170);
  // 十二個籃子
  var bx0 = W/2 - 5.5*44, by = 260;
  for (i=0;i<12;i++){
    var bx = bx0 + i*44, fill = Math.min(1, Math.max(0, (t*4 - i*0.35)));
    ctx.fillStyle = '#a97c3f';
    ctx.beginPath(); ctx.moveTo(bx-16, by-14); ctx.lineTo(bx+16, by-14);
    ctx.lineTo(bx+11, by+14); ctx.lineTo(bx-11, by+14); ctx.closePath(); ctx.fill();
    if (fill > 0.2){
      ctx.fillStyle = '#e8b64c';
      ctx.beginPath(); ctx.arc(bx-6, by-16, 6,0,7); ctx.arc(bx+2, by-19, 7,0,7); ctx.arc(bx+9, by-15, 5,0,7); ctx.fill();
    }
  }
  ctx.fillStyle = '#fff'; ctx.font = '23px "Microsoft JhengHei",sans-serif';
  var L = ['「聖靈所結的果子,就是仁愛、喜樂、和平、','忍耐、恩慈、良善、信實、溫柔、節制。」','(加拉太書 5:22-23)','「你們多結果子,我父就因此得榮耀,','你們也就是我的門徒了。」(約15:8)'];
  for (i=0;i<L.length;i++) ctx.fillText(L[i], W/2, 350 + i*40);
  ctx.fillStyle = '#cfe9d5'; ctx.font = '22px "Microsoft JhengHei",sans-serif';
  ctx.fillText('果子不是自己擠出來的——', W/2, 590);
  ctx.fillText('是聖靈在我們裡面結出來的;分出去,榮耀歸神。', W/2, 624);
  winBtns = [];
  var items = [['🔊 再聽經文','listen'],['再玩一次','again'],['← 回大廳','lobby']];
  for (i=0;i<3;i++){
    var y = 690 + i*84;
    ctx.fillStyle = 'rgba(255,255,255,.15)'; roundRect(W/2-160, y, 320, 66, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 27px "Microsoft JhengHei",sans-serif';
    ctx.fillText(items[i][0], W/2, y+43);
    winBtns.push({ x:W/2-160, y:y, w:320, h:66, act:items[i][1] });
  }
}
function winTap(p){
  for (var i=0;i<winBtns.length;i++){
    var b = winBtns[i];
    if (p.x>b.x && p.x<b.x+b.w && p.y>b.y && p.y<b.y+b.h){
      if (b.act==='listen') speak('win');
      else if (b.act==='again') scene = 'menu';
      else location.href = 'https://hfpc-bible-games.netlify.app/';
      return;
    }
  }
}

// ---------- 主迴圈 ----------
var last = 0, winT = 0;
function loop(ms){
  requestAnimationFrame(loop);
  var t = ms/1000, dt = Math.min(0.05, t-last); last = t;
  if (scene === 'menu'){ drawMenu(t); return; }
  if (scene === 'win'){ winT += dt; drawWin(winT); return; }
  // play
  if (blessT > 0) blessT -= dt;
  spawnTick -= dt;
  if (spawnQueue > 0 && spawnTick <= 0 && tsums.length < CAP){
    spawnTsum(); spawnQueue--; spawnTick = 0.12;
  }
  physics(dt);
  // 提示+卡死救援:4 秒沒動作亮提示;場上真的無鏈可連就溫柔聚攏(每秒檢查一次)
  hintT += dt; checkT += dt;
  if (checkT >= 1){
    checkT = 0; dbgChecks++;
    if (hintGroup){
      // 07-22:除了「還在場上」也驗「仍彼此可連」——物理擠散的過期提示要放掉,救援才會再補
      for (var hi=0;hi<hintGroup.length;hi++){
        var bad = tsums.indexOf(hintGroup[hi])===-1;
        if (!bad && hi>0){
          var A=hintGroup[hi-1], B=hintGroup[hi], hdx=B.x-A.x, hdy=B.y-A.y, hlim=(A.r+B.r)*1.35;
          bad = hdx*hdx+hdy*hdy > hlim*hlim;
        }
        if (bad){ hintGroup=null; break; }
      }
    }
    // 07-22:孤兒型別救援——場上同款總數 < minChain(永遠連不成,如卡在角落的最後一隻)
    // 每秒遞色成「最近鄰居」的型別(火花提示);拖曳中不動、沒落定不動、wild 不動
    if (!dragging){
      var tc = {};
      for (var oi=0;oi<tsums.length;oi++){ var oid=tsums[oi].t.id; tc[oid]=(tc[oid]||0)+1; }
      for (oi=0;oi<tsums.length;oi++){
        var orp = tsums[oi];
        if (orp.t.wild || tc[orp.t.id] >= M.minChain) continue;
        if (Math.abs(orp.y - orp.py) >= 1.5) continue;
        var bn=null, bdd=1e9;
        for (var oj=0;oj<tsums.length;oj++){
          var oc = tsums[oj];
          if (oc===orp || oc.t.wild || oc.t.id===orp.t.id) continue;
          var odx=oc.x-orp.x, ody=oc.y-orp.y, od2=odx*odx+ody*ody;
          if (od2<bdd){ bdd=od2; bn=oc; }
        }
        if (bn){
          tc[orp.t.id]--; tc[bn.t.id]=(tc[bn.t.id]||0)+1;
          orp.t = bn.t;
          for (var ok=0;ok<6;ok++) sparks.push({ x:orp.x, y:orp.y, vx:rnd(-2,2), vy:rnd(-3,1), life:1 });
        }
      }
    }
    if (!hintGroup && !dragging){
      var g0 = findGroup();
      // 07-22 修:場滿 CAP 時 spawnQueue 永遠掉不到 0(生成被 tsums.length<CAP 擋)
      // →舊條件 spawnQueue===0 讓救援永不觸發=死局;場滿就直接放行救援
      if (!g0 && flying.length===0 && (spawnQueue===0 || tsums.length >= CAP)){ dbgRescues++; rescue(); g0 = findGroup(); }
      if (hintT >= 4 && g0) hintGroup = g0;
    }
  }
  shownFed += (fed - shownFed) * Math.min(1, dt*6);
  drawScene(t);
  for (var i=0;i<tsums.length;i++) drawTsum(tsums[i]);
  drawChainLine();   // 07-22:畫在球上層才看得見
  if (hintGroup && !dragging){   // 提示:金色光圈脈動
    ctx.strokeStyle = 'rgba(255,235,140,'+(0.55+0.35*Math.sin(t*6))+')';
    ctx.lineWidth = 5;
    for (i=0;i<hintGroup.length;i++){
      var hg = hintGroup[i];
      ctx.beginPath(); ctx.arc(hg.x, hg.y, hg.r*1.12+2*Math.sin(t*6), 0, 7); ctx.stroke();
    }
  }
  // 飛向群眾的食物
  for (i=flying.length-1;i>=0;i--){
    var f = flying[i];
    if (f.d > 0){ f.d -= dt; drawTsum({t:f.t,hi:0}, f.x, f.y, f.r); continue; }
    f.p += dt*2.4;
    if (f.p >= 1){ flying.splice(i,1); continue; }
    var e = 1-(1-f.p)*(1-f.p);
    drawTsum({t:f.t,hi:0}, f.x+(f.tx-f.x)*e, f.y+(f.ty-f.y)*e - Math.sin(e*Math.PI)*80, f.r*(1-e*0.5));
  }
  for (i=sparks.length-1;i>=0;i--){
    var s = sparks[i]; s.life -= dt*1.6; s.x += s.vx; s.y += s.vy; s.vy += 0.15;
    if (s.life<=0){ sparks.splice(i,1); continue; }
    ctx.fillStyle = 'rgba(255,230,140,'+s.life+')';
    ctx.beginPath(); ctx.arc(s.x, s.y, 4*s.life, 0, 7); ctx.fill();
  }
  if (blessT > 0){
    ctx.fillStyle = 'rgba(255,213,74,'+ (0.10+0.06*Math.sin(t*6)) +')';
    ctx.fillRect(0, PLAY_TOP-6, W, FLOOR-PLAY_TOP+40);
  }
  drawHUD();
  if (banner && banner.t > 0){
    banner.t -= dt;
    ctx.fillStyle = 'rgba(30,60,38,.85)';
    roundRect(W/2-210, PLAY_TOP+8, 420, 52, 14); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 24px "Microsoft JhengHei",sans-serif'; ctx.textAlign='center';
    ctx.fillText(banner.text, W/2, PLAY_TOP+43);
  }
}
requestAnimationFrame(loop);

// ---------- 測試鉤子(?test=1 才掛;Playwright 驗證用,不影響玩家) ----------
if (location.search.indexOf('test=1') !== -1){
  window.__tsum = {
    state: function(){ return { scene:scene, fed:fed, n:tsums.length, queue:spawnQueue, chains:chainCount, mode:modeKey, dragging:dragging, hint:!!hintGroup, checks:dbgChecks, rescues:dbgRescues, chainLen:chain.length }; },
    row: function(n){
      // 排一排同款(驗證鏈長無上限):前 n 顆同型等距一列,其餘搬離
      var ty = tsums[0].t;
      for (var i=0;i<tsums.length;i++){
        var c = tsums[i];
        if (i < n){ c.t = ty; c.x = 40 + i*(c.r*1.6); c.y = FLOOR - c.r; }
        else { c.y = PLAY_TOP + 10; c.x = W - 30; }
        c.px = c.x; c.py = c.y;
      }
      return { y: FLOOR - tsums[0].r, xs: tsums.slice(0,n).map(function(c){return c.x;}) };
    },
    deadlock: function(){
      // 重現 07-22 死局:場滿 CAP+隊列>0+全場無同款相鄰(每顆給獨一無二的假型別)
      while (tsums.length < CAP) spawnTsum();
      tsums.length = CAP;
      for (var i=0;i<tsums.length;i++){
        var ty = tsums[i].t;
        tsums[i].t = { id:'zz'+i, kind:ty.kind, name:ty.name, c1:ty.c1, c2:ty.c2 };
      }
      spawnQueue = 5; hintT = 5; checkT = 0; hintGroup = null;
      return { n:tsums.length, queue:spawnQueue, group:findGroup()?1:0 };
    },
    start: function(k){ if(k && MODES[k]){ modeKey=k; M=MODES[k]; } startGame(); },
    autoChain: function(){
      // BFS 找一組同款相鄰 >= minChain,走正式 collect 路徑
      for (var i=0;i<tsums.length;i++){
        var seed = tsums[i], group = [seed], seen = [seed];
        var grow = true;
        while (grow && group.length < 9){
          grow = false;
          for (var j=0;j<tsums.length;j++){
            var c = tsums[j];
            if (seen.indexOf(c) !== -1 || c.t !== seed.t) continue;
            var lastT = group[group.length-1];
            var dx=c.x-lastT.x, dy=c.y-lastT.y, lim=(c.r+lastT.r)*1.35;
            if (dx*dx+dy*dy <= lim*lim){ group.push(c); seen.push(c); grow = true; break; }
          }
        }
        if (group.length >= M.minChain){ collect(group); return group.length; }
      }
      return 0;
    },
    findGroup: function(){ var g=findGroup(); return g?g.length:0; },
    rescue: function(){ return rescue(); },
    win: function(){ fed = M.target - 1; return this.autoChain(); }
  };
}
})();
