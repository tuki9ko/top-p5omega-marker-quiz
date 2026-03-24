import {
  type JudgmentResult,
  type MarkerType,
  type QuizState,
  assignMarker,
  generateQuiz,
  getMarkerImagePath,
  judgeAnswers,
  undoLastMarker,
} from "./quiz-logic.ts";

let currentState: QuizState;

// パーティリスト画像内のジョブアイコン位置（%）
// ジョブアイコンは画像の左端から約 5-15% の位置
const JOB_ICON_LEFT_PERCENT = 5;
// 各メンバー行の中心Y位置（%） - ジョブアイコンの中心
const MEMBER_ROW_CENTERS = [
  12.5, // メンバー0
  23.0, // メンバー1
  33.5, // メンバー2
  44.0, // メンバー3
  54.5, // メンバー4
  65.0, // メンバー5
  75.5, // メンバー6
  86.0, // メンバー7
];
const MARKER_SIZE_PERCENT = 8;

export function initUI(): void {
  currentState = generateQuiz();
  render();
}

function render(): void {
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.innerHTML = "";

  // タイトル
  const title = document.createElement("h1");
  title.textContent = "絶オメガ検証戦 マーカークイズ";
  title.className = "quiz-title";
  app.appendChild(title);

  // サブタイトル
  const subtitle = document.createElement("p");
  subtitle.textContent = "P5 コード：＊＊＊ミ＊【オメガ】マーカー練習";
  subtitle.className = "quiz-subtitle";
  app.appendChild(subtitle);

  // メインコンテナ
  const container = document.createElement("div");
  container.className = "quiz-container";
  app.appendChild(container);

  // パーティリストラッパー
  const wrapper = document.createElement("div");
  wrapper.className = "party-list-wrapper";
  container.appendChild(wrapper);

  // 左側: マーカーボタン列
  const markersCol = document.createElement("div");
  markersCol.className = "markers-column";
  wrapper.appendChild(markersCol);

  // 中央: パーティリスト画像
  const imgContainer = document.createElement("div");
  imgContainer.className = "party-list-image-container";
  wrapper.appendChild(imgContainer);

  const img = document.createElement("img");
  img.src = "/images/PartyList.png";
  img.alt = "パーティリスト";
  img.className = "party-list-image";
  imgContainer.appendChild(img);

  // 頭上マーカー表示（画像の上にオーバーレイ）
  const markerOverlay = document.createElement("div");
  markerOverlay.className = "marker-overlay";
  imgContainer.appendChild(markerOverlay);

  // 右側: バフデバフ列
  const buffsCol = document.createElement("div");
  buffsCol.className = "buffs-column";
  wrapper.appendChild(buffsCol);

  // ヘッダー分のスペーサー（flex比率でヘッダー高さを確保）
  const markerTopSpacer = document.createElement("div");
  markerTopSpacer.className = "column-spacer-top";
  markersCol.appendChild(markerTopSpacer);

  const buffTopSpacer = document.createElement("div");
  buffTopSpacer.className = "column-spacer-top";
  buffsCol.appendChild(buffTopSpacer);

  // 各メンバーの行を生成
  for (let i = 0; i < 8; i++) {
    const member = currentState.members[i];

    // マーカーボタン行
    const buttonRow = document.createElement("div");
    buttonRow.className = "marker-button-row";
    markersCol.appendChild(buttonRow);

    if (currentState.phase === "playing" && member.assignedMarker === null) {
      // サークルボタン
      const circleBtn = createMarkerButton("circle", "/images/Marker_Circle.png", i);
      buttonRow.appendChild(circleBtn);

      // 攻撃マーカーボタン
      const attackBtn = createMarkerButton("attack", "/images/Marker_Attack1.png", i);
      buttonRow.appendChild(attackBtn);

      // 鎖マーカーボタン
      const bindBtn = createMarkerButton("bind", "/images/Marker_Bind1.png", i);
      buttonRow.appendChild(bindBtn);
    } else if (member.assignedMarker !== null) {
      // 割り当て済み：空のプレースホルダー（ボタンを消す）
      const assigned = document.createElement("div");
      assigned.className = "marker-assigned";
      buttonRow.appendChild(assigned);
    }

    // 頭上マーカーオーバーレイ（ジョブアイコンの上に表示）
    if (member.assignedMarker !== null && member.assignedMarker !== "circle") {
      const markerIcon = document.createElement("img");
      markerIcon.src = getMarkerImagePath(member.assignedMarker);
      markerIcon.className = "head-marker";
      const centerY = MEMBER_ROW_CENTERS[i];
      markerIcon.style.top = `${centerY - MARKER_SIZE_PERCENT / 2}%`;
      markerIcon.style.left = `${JOB_ICON_LEFT_PERCENT}%`;
      markerIcon.style.height = `${MARKER_SIZE_PERCENT}%`;
      markerOverlay.appendChild(markerIcon);
    }

    // バフデバフ行
    const buffRow = document.createElement("div");
    buffRow.className = "buff-row";
    buffsCol.appendChild(buffRow);

    // デュナミス（必ず先に表示）
    const dynamisImg = document.createElement("img");
    dynamisImg.src =
      member.dynamis === 1 ? "/images/Buff_Dynamis1.png" : "/images/Buff_Dynamis2.png";
    dynamisImg.alt = `デュナミス${member.dynamis}`;
    dynamisImg.className = "buff-icon";
    buffRow.appendChild(dynamisImg);

    // ハローワールド（ある場合のみ）
    if (member.helloWorld !== null) {
      const hwImg = document.createElement("img");
      hwImg.src =
        member.helloWorld === "first" ? "/images/Debuff_Target1.png" : "/images/Debuff_Target2.png";
      hwImg.alt = member.helloWorld === "first" ? "ファーストターゲット" : "セカンドターゲット";
      hwImg.className = "buff-icon";
      buffRow.appendChild(hwImg);
    }
  }

  // ペット行分のスペーサー
  const markerBottomSpacer = document.createElement("div");
  markerBottomSpacer.className = "column-spacer-bottom";
  markersCol.appendChild(markerBottomSpacer);

  const buffBottomSpacer = document.createElement("div");
  buffBottomSpacer.className = "column-spacer-buff-bottom";
  buffsCol.appendChild(buffBottomSpacer);

  // ボタンエリア
  const buttonArea = document.createElement("div");
  buttonArea.className = "button-area";
  container.appendChild(buttonArea);

  if (currentState.phase === "playing") {
    // リセットボタン
    const resetBtn = document.createElement("button");
    resetBtn.textContent = "リセット";
    resetBtn.className = "btn btn-reset";
    resetBtn.addEventListener("click", () => {
      currentState = undoLastMarker(currentState);
      render();
    });
    buttonArea.appendChild(resetBtn);

    // ステータス表示
    const status = document.createElement("div");
    status.className = "status-text";
    const assignedCount = currentState.members.filter((m) => m.assignedMarker !== null).length;
    status.textContent = `割り当て: ${assignedCount} / 8`;
    buttonArea.appendChild(status);
  } else {
    // 結果表示
    renderResult(container);

    // 次の問題ボタン
    const nextBtn = document.createElement("button");
    nextBtn.textContent = "次の問題";
    nextBtn.className = "btn btn-next";
    nextBtn.addEventListener("click", () => {
      currentState = generateQuiz();
      render();
    });
    buttonArea.appendChild(nextBtn);
  }
}

function createMarkerButton(
  type: "circle" | "attack" | "bind",
  iconSrc: string,
  memberIndex: number,
): HTMLButtonElement {
  const btn = document.createElement("button");
  btn.className = `marker-btn marker-btn-${type}`;

  const icon = document.createElement("img");
  icon.src = iconSrc;
  icon.alt = type;
  btn.appendChild(icon);

  btn.addEventListener("click", () => {
    currentState = assignMarker(currentState, memberIndex, type);
    render();
  });

  return btn;
}

function renderResult(container: HTMLElement): void {
  const result: JudgmentResult = judgeAnswers(currentState);

  const resultDiv = document.createElement("div");
  resultDiv.className = `result-area ${result.isCorrect ? "correct" : "incorrect"}`;
  container.appendChild(resultDiv);

  const resultTitle = document.createElement("h2");
  resultTitle.textContent = result.isCorrect ? "正解！" : "不正解…";
  resultTitle.className = "result-title";
  resultDiv.appendChild(resultTitle);

  if (!result.isCorrect) {
    const explanation = document.createElement("p");
    explanation.textContent = "正しいマーカー割り当て:";
    explanation.className = "result-explanation";
    resultDiv.appendChild(explanation);

    const table = document.createElement("div");
    table.className = "result-table";
    resultDiv.appendChild(table);

    for (const detail of result.details) {
      const member = currentState.members[detail.memberIndex];
      const row = document.createElement("div");
      row.className = "result-row";

      const memberLabel = document.createElement("span");
      memberLabel.className = "result-member";
      memberLabel.textContent = `メンバー ${detail.memberIndex + 1}`;
      row.appendChild(memberLabel);

      // バフデバフ情報
      const buffInfo = document.createElement("span");
      buffInfo.className = "result-buff-info";
      const dynText = `デュナミス${member.dynamis}`;
      const hwText =
        member.helloWorld === "first" ? " / 1st" : member.helloWorld === "second" ? " / 2nd" : "";
      buffInfo.textContent = `(${dynText}${hwText})`;
      row.appendChild(buffInfo);

      // 正解マーカー
      if (detail.correctAnswer && detail.correctAnswer !== "circle") {
        const correctIcon = document.createElement("img");
        correctIcon.src = getMarkerImagePath(detail.correctAnswer);
        correctIcon.className = "result-marker-icon";
        correctIcon.alt = detail.correctAnswer;
        row.appendChild(correctIcon);

        const correctLabel = document.createElement("span");
        correctLabel.className = "result-marker-label";
        correctLabel.textContent = getMarkerDisplayName(detail.correctAnswer);
        row.appendChild(correctLabel);
      } else {
        const noMarker = document.createElement("span");
        noMarker.className = "result-marker-label";
        noMarker.textContent = "（サークル / マーキングなし）";
        row.appendChild(noMarker);
      }

      table.appendChild(row);
    }
  }
}

function getMarkerDisplayName(marker: MarkerType): string {
  const names: Record<MarkerType, string> = {
    circle: "サークル",
    attack1: "攻撃1",
    attack2: "攻撃2",
    attack3: "攻撃3",
    attack4: "攻撃4",
    bind1: "鎖1",
    bind2: "鎖2",
  };
  return names[marker];
}
