// 宣告變數用來存放角色1的「停止（待機）」圖片精靈圖檔
let idleSpriteSheet;
// 宣告變數用來存放角色1的「走路」圖片精靈圖檔
let walkSpriteSheet;
// 宣告變數用來存放角色1的「發功」圖片精靈圖檔
let attackSpriteSheet;
// 宣告變數用來存放「氣功波特效」圖片精靈圖檔
let effectSpriteSheet;

// 宣告陣列用來存放自動偵測出的「停止」動作影格精準座標（起點X與寬度）
let idleFrames = [];
// 宣告陣列用來存放自動偵測出的「走路」動作影格精準座標（起點X與寬度）
let walkFrames = [];
// 宣告陣列用來存放精準等分計算出的「發功」動作影格座標（共12格，起點X與寬度）
let attackFrames = [];
// 宣告陣列用來存放精準等分計算出的「特效」影格座標（共5格，起點X與寬度）
let effectFrames = [];

// 宣告陣列用來存放畫面上正在飛行的氣功波特效物件（支援連發多個特效）
let projectiles = [];

// 宣告變數記錄目前角色的動作狀態：'idle' 代表待機，'walk' 代表走路，'attack' 代表發功中
let currentState = 'idle';
// 宣告變數記錄角色目前面朝的方向：1 代表朝右，-1 代表朝左
let facingDirection = 1;

// 宣告變數記錄角色1目前的 X 軸中心位置（將在 setup 中初始化為畫布寬度的 2/3）
let posX;
// 宣告變數記錄目前角色播放到第幾張影格（從第 0 張開始）
let currentFrame = 0;
// 設定角色動畫播放速度（每經過幾個畫面更新週期切換下一張圖，數字越大動作越慢）
const ANIMATION_SPEED = 5;
// 設定氣功波特效的旋轉動畫播放速度（數字越小旋轉越快）
const EFFECT_ANIMATION_SPEED = 3;

// preload 函式會在程式開始前預先載入外部資源，確保所有圖片載入完成才執行後續程式
function preload() {
  // 載入位於「1/停止/全部停止.png」路徑的停止圖片精靈檔案
  idleSpriteSheet = loadImage('1/停止/全部停止.png');
  // 載入位於「1/走路/全部走路.png」路徑的走路圖片精靈檔案
  walkSpriteSheet = loadImage('1/走路/全部走路.png');
  // 載入位於「1/發功/全部發功.png」路徑的發功圖片精靈檔案（3127 x 165）
  attackSpriteSheet = loadImage('1/發功/全部發功.png');
  // 載入位於「1/特效/全部特效.png」路徑的氣功波特效圖片精靈檔案（740 x 19）
  effectSpriteSheet = loadImage('1/特效/全部特效.png');
}

// setup 函式在程式啟動時只會執行一次，用來初始化畫布、角色初始位置與解析圖片精靈
function setup() {
  // 建立一個與瀏覽器視窗一樣寬、一樣高的全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  // 設定圖片繪製的對齊基準點為「圖片的正中心」，方便計算位置與水平鏡像翻轉
  imageMode(CENTER);

  // 初始化角色1的 X 軸起始位置在畫布總寬度的 2/3 處
  posX = width * (2 / 3);

  // 呼叫透明間隙偵測函式，自動掃描「停止」圖片精靈並存入 idleFrames 陣列
  idleFrames = detectSpriteFrames(idleSpriteSheet);
  // 呼叫透明間隙偵測函式，自動掃描「走路」圖片精靈並存入 walkFrames 陣列
  walkFrames = detectSpriteFrames(walkSpriteSheet);
  // 呼叫精準等分裁切函式，將「發功」圖片精靈（共 12 等分格）均分並存入 attackFrames 陣列
  attackFrames = createUniformFrames(attackSpriteSheet, 12);
  // 呼叫精準等分裁切函式，將「特效」圖片精靈（共 5 張）均分並存入 effectFrames 陣列
  effectFrames = createUniformFrames(effectSpriteSheet, 5);
}

// 自動偵測圖片精靈中每個獨立角色影格的通用函式（適用於人物身體連貫、無分離光效的圖片精靈）
function detectSpriteFrames(sheet) {
  // 建立一個暫存陣列用來收集這張圖片精靈的所有影格資料
  let detected = [];
  // 載入圖片的像素資料以便逐行掃描透明度
  sheet.loadPixels();
  // 記錄目前是否正在掃描某一個角色實體的範圍內
  let inSprite = false;
  // 記錄當前角色的起始 X 座標
  let startX = 0;

  // 從圖片最左邊（x = 0）逐一掃描到最右邊（x = sheet.width）
  for (let x = 0; x < sheet.width; x++) {
    // 預設這條垂直線完全是透明的
    let hasPixel = false;

    // 檢查這條垂直線上從上到下（y = 0 到 height）是否有不透明的像素
    for (let y = 0; y < sheet.height; y++) {
      // 計算該像素在 pixels 陣列中的索引位置（每個像素佔 RGBA 4個數值）
      let index = (y * sheet.width + x) * 4;
      // 取得該像素的 Alpha 透明度數值（索引 + 3）
      let alpha = sheet.pixels[index + 3];
      // 若透明度大於 10，代表這條線上有人物圖案
      if (alpha > 10) {
        hasPixel = true;
        break;
      }
    }

    // 如果剛進入人物圖案的左邊界
    if (hasPixel && !inSprite) {
      inSprite = true;
      startX = x;
    } 
    // 如果剛離開人物圖案的右邊界，將這個獨立動作的起點與寬度存入 detected 陣列
    else if (!hasPixel && inSprite) {
      inSprite = false;
      detected.push({
        x: startX,
        w: x - startX
      });
    }
  }

  // 若掃描到圖片最右邊緣時人物還沒結束，補上最後一個影格的資料
  if (inSprite) {
    detected.push({
      x: startX,
      w: sheet.width - startX
    });
  }

  // 回傳解析完成的影格座標陣列
  return detected;
}

// 精準等分裁切圖片精靈的函式（適用於包含分離光效或固定寬度格數的圖片精靈）
function createUniformFrames(sheet, totalCount) {
  // 建立一個暫存陣列用來收集等分後的影格資料
  let uniform = [];
  // 計算每一格的精準浮點數寬度
  let exactStep = sheet.width / totalCount;

  // 逐一計算第 0 格到第 totalCount - 1 格的起點與安全裁切寬度
  for (let i = 0; i < totalCount; i++) {
    // 使用 Math.round() 四捨五入取得最貼近的整數起點 X
    let frameX = Math.round(i * exactStep);
    // 計算下一格的起點 X，並扣除 1 像素作為安全邊距，徹底防止小數誤差切到相鄰影格
    let nextX = Math.round((i + 1) * exactStep);
    let frameW = (nextX - frameX) - 1;

    // 將計算好的單格起點與寬度存入 uniform 陣列
    uniform.push({
      x: frameX,
      w: frameW
    });
  }

  // 回傳等分完成的影格座標陣列
  return uniform;
}

// draw 函式會不斷重複執行（預設每秒約 60 次），用來處理按鍵控制、角色動畫與飛行特效
function draw() {
  // 設定畫布背景顏色為天空色（使用十六進位色碼 #87CEEB）
  background('#87CEEB');

  // 計算角色1的目標顯示高度：固定為整個畫布高度的 1/3
  let targetCharacterHeight = height / 3;

  // 依據目標顯示高度（height / 3）計算基準縮放倍率，讓特效與移動邊界能隨之等比例縮放
  let baseScaleFactor = targetCharacterHeight / idleSpriteSheet.height;

  // 設定 RWD 自適應角色移動速度
  let moveSpeed = max(2, width * 0.004);
  // 設定角色碰撞邊界的安全半寬（以人物本體約 120px 換算，讓角色身體能貼近螢幕最左右端）
  let bodyHalfWidth = (120 * baseScaleFactor) / 2;
  // 計算角色中心點可移動的最左邊界
  let minX = bodyHalfWidth;
  // 計算角色中心點可移動的最右邊界
  let maxX = width - bodyHalfWidth;

  // 如果目前「不是」正在發功中，才允許左右方向鍵控制移動或切換回待機狀態
  if (currentState !== 'attack') {
    // 記錄上一幀狀態以便判斷是否有切換動作
    let previousState = currentState;

    // 即時偵測使用者是否正在按住鍵盤「右方向鍵（RIGHT_ARROW）」
    if (keyIsDown(RIGHT_ARROW)) {
      currentState = 'walk';
      facingDirection = 1;
      posX += moveSpeed;
      // 若抵達畫布最右端，停止移動但繼續播放走路動畫
      if (posX >= maxX) {
        posX = maxX;
      }
    } 
    // 即時偵測使用者是否正在按住鍵盤「左方向鍵（LEFT_ARROW）」
    else if (keyIsDown(LEFT_ARROW)) {
      currentState = 'walk';
      facingDirection = -1;
      posX -= moveSpeed;
      // 若抵達畫布最左端，停止移動但繼續播放走路動畫
      if (posX <= minX) {
        posX = minX;
      }
    } 
    // 若沒有按住任何方向鍵，則回復為「停止（待機）」狀態
    else {
      currentState = 'idle';
    }

    // 如果狀態有發生切換（例如從走路放開按鍵變回停止），將影格重置為第 0 張從頭播放
    if (currentState !== previousState) {
      currentFrame = 0;
    }
  }

  // 依據目前的動作狀態，選出對應的圖片精靈與影格座標陣列
  let activeSheet;
  let activeFrames;
  if (currentState === 'attack') {
    activeSheet = attackSpriteSheet;
    activeFrames = attackFrames;
  } else if (currentState === 'walk') {
    activeSheet = walkSpriteSheet;
    activeFrames = walkFrames;
  } else {
    activeSheet = idleSpriteSheet;
    activeFrames = idleFrames;
  }

  // 確保已經成功取得影格資料才進行動畫更新與繪製
  if (activeFrames.length > 0) {
    // 防止索引超出當前動作陣列的總長度
    if (currentFrame >= activeFrames.length) {
      currentFrame = 0;
    }

    // 判斷目前經過的影格數（frameCount）是否達到設定的切換速度
    if (frameCount % ANIMATION_SPEED === 0) {
      // 如果目前是「發功（attack）」狀態，只執行播放一次，播完最後一張就發射特效並恢復待機
      if (currentState === 'attack') {
        if (currentFrame < activeFrames.length - 1) {
          // 尚未播到最後一張，繼續前進到下一張發功動作
          currentFrame++;
        } else {
          // 發功動作已經完整執行完一次！呼叫函式產生氣功波飛行特效
          spawnEnergyEffect(targetCharacterHeight);
          // 角色動作恢復成「停止（idle）」待機狀態，並重置影格索引為 0
          currentState = 'idle';
          currentFrame = 0;
          activeSheet = idleSpriteSheet;
          activeFrames = idleFrames;
        }
      } 
      // 如果是「停止」或「走路」狀態，則持續循環播放動畫
      else {
        currentFrame = (currentFrame + 1) % activeFrames.length;
      }
    }

    // 取得當前影格的精準裁切起點 X 與裁切寬度
    let frameData = activeFrames[currentFrame];
    let sourceX = frameData.x;
    let sourceY = 0;
    let frameWidth = frameData.w;
    let frameHeight = activeSheet.height;

    // 設定角色1在畫布上實際顯示的高度為整個畫布高度的 1/3
    let displayHeight = targetCharacterHeight;
    // 依照當前動作圖片精靈的原始寬高比例（frameWidth / frameHeight）等比例計算顯示寬度
    let displayWidth = displayHeight * (frameWidth / frameHeight);

    // 設定角色1顯示的 Y 軸中心位置（畫布最底端 height 往上推半個角色高度，精準貼齊畫布最底端）
    let posY = height - (displayHeight / 2);

    // 使用 push() 保存當前的畫布座標系統與變形狀態
    push();
    // 將畫布原點移動到角色1當前的中心座標
    translate(posX, posY);
    // 依據面朝方向進行水平縮放（1 朝右，-1 水平鏡像朝左）
    scale(facingDirection, 1);

    // 繪製單一角色動作影格
    image(
      activeSheet,
      0,
      0,
      displayWidth,
      displayHeight,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight
    );

    // 使用 pop() 恢復先前保存的畫布座標系統狀態
    pop();
  }

  // 呼叫自訂函式更新並繪製所有正在畫面上飛行的氣功波特效（傳入角色顯示高度以維持一致比例）
  updateAndDrawProjectiles(targetCharacterHeight);
}

// 產生一顆氣功波特效物件並加入飛行清單的函式
function spawnEnergyEffect(characterHeight) {
  // 依照發功圖檔高度（165px）與角色顯示高度（height / 3）計算等比例縮放倍率
  let attackScale = characterHeight / attackSpriteSheet.height;
  // 計算角色手部（胸口高度）的 Y 軸發射位置
  let spawnY = height - (characterHeight * 0.55);
  // 依據角色目前面朝的方向，將特效產生在角色身體前方一點的位置
  let spawnX = posX + (facingDirection * 70 * attackScale);

  // 將新的氣功波特效物件推入 projectiles 陣列中
  projectiles.push({
    x: spawnX,                  // 特效目前的 X 座標
    y: spawnY,                  // 特效目前的 Y 座標
    dir: facingDirection,       // 特效飛行方向（1 往右飛，-1 往左飛）
    frame: 0                    // 特效目前的動畫影格索引（0 到 4）
  });
}

// 更新所有飛行中氣功波特效的位置、動畫並繪製到畫布上的函式
function updateAndDrawProjectiles(characterHeight) {
  // 確保特效圖片精靈已成功載入且有影格資料
  if (effectFrames.length === 0) return;

  // 依照發功圖檔高度（165px）與角色顯示高度（height / 3）計算一致的等比例縮放倍率
  let effectScale = characterHeight / attackSpriteSheet.height;
  // 設定 RWD 自適應的氣功波飛行速度
  let projectileSpeed = max(5, width * 0.009);

  // 從陣列尾端往前遍歷（方便在特效飛出邊界消失時安全刪除該物件，不會跳過元素）
  for (let i = projectiles.length - 1; i >= 0; i--) {
    // 取出目前這顆氣功波特效物件
    let p = projectiles[i];

    // 依照發射方向更新特效的 X 軸位置
    p.x += p.dir * projectileSpeed;

    // 依據特效動畫速度切換下一張氣功波影格（在 0 到 4 之間循環播放）
    if (frameCount % EFFECT_ANIMATION_SPEED === 0) {
      p.frame = (p.frame + 1) % effectFrames.length;
    }

    // 取得當前特效影格的裁切座標與寬度，並依照原始長寬比等比例縮放
    let efData = effectFrames[p.frame];
    let efDisplayH = effectSpriteSheet.height * effectScale;
    let efDisplayW = efDisplayH * (efData.w / effectSpriteSheet.height);

    // 繪製氣功波特效（若為向左發射則水平鏡像翻轉）
    push();
    translate(p.x, p.y);
    scale(p.dir, 1);
    image(
      effectSpriteSheet,
      0,
      0,
      efDisplayW,
      efDisplayH,
      efData.x,
      0,
      efData.w,
      effectSpriteSheet.height
    );
    pop();

    // 邊界消失判斷：若往右飛且已完全超出畫布最右端，或往左飛且已完全超出畫布最左端
    if ((p.dir === 1 && p.x - (efDisplayW / 2) > width) || 
        (p.dir === -1 && p.x + (efDisplayW / 2) < 0)) {
      // 從陣列中移除該特效，使其消失不見並釋放記憶體
      projectiles.splice(i, 1);
    }
  }
}

// keyPressed 函式會在鍵盤上有任何按鍵被按下的瞬間觸發
function keyPressed() {
  // 判斷使用者是否按下了鍵盤的「空白鍵（key === ' ' 或 keyCode === 32）」
  if (key === ' ' || keyCode === 32) {
    // 如果目前還沒在發功中，立即切換成「發功（attack）」狀態並從第 0 張開始播放一次
    if (currentState !== 'attack') {
      currentState = 'attack';
      currentFrame = 0;
    }
    // 回傳 false 可防止按下空白鍵時瀏覽器網頁意外往下捲動
    return false;
  }
}

// windowResized 函式會在瀏覽器視窗大小改變（例如切換裝置、旋轉螢幕、縮放視窗）時自動觸發
function windowResized() {
  // 記錄視窗縮放前角色在畫布 X 軸上的相對位置比例
  let ratioX = posX / width;
  // 重新調整畫布的寬度與高度，使其隨時保持全螢幕狀態
  resizeCanvas(windowWidth, windowHeight);
  // 依據原本的相對比例重新計算角色的新 X 座標，確保縮放視窗後角色仍維持在原本的相對位置
  posX = width * ratioX;
}