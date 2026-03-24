// デバフ・バフの種類
export type Dynamis = 1 | 2;
export type HelloWorld = "first" | "second";

// マーカーの種類
export type MarkerType =
  | "circle"
  | "attack1"
  | "attack2"
  | "attack3"
  | "attack4"
  | "bind1"
  | "bind2";

// パーティメンバーの状態
export interface MemberState {
  index: number;
  dynamis: Dynamis;
  helloWorld: HelloWorld | null;
  assignedMarker: MarkerType | null;
}

// クイズの状態
export interface QuizState {
  members: MemberState[];
  attackCount: number; // 攻撃マーカーの付与数
  bindCount: number; // 鎖マーカーの付与数
  phase: "playing" | "result";
}

// シャッフル関数
function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 出題をランダム生成
export function generateQuiz(): QuizState {
  const indices = [0, 1, 2, 3, 4, 5, 6, 7];

  // デュナミスの割り当て: ランダムに4人にデュナミス1、残り4人にデュナミス2
  const shuffled = shuffle(indices);
  const dynamis1Members = new Set(shuffled.slice(0, 4));

  // ハローワールドの割り当て: ランダムに2人にファースト、残りから2人にセカンド
  const hwShuffled = shuffle(indices);
  const firstTargets = new Set(hwShuffled.slice(0, 2));
  const remainingForSecond = hwShuffled.filter((i) => !firstTargets.has(i));
  const secondTargets = new Set(shuffle(remainingForSecond).slice(0, 2));

  const members: MemberState[] = indices.map((i) => ({
    index: i,
    dynamis: dynamis1Members.has(i) ? 1 : 2,
    helloWorld: firstTargets.has(i) ? "first" : secondTargets.has(i) ? "second" : null,
    assignedMarker: null,
  }));

  return {
    members,
    attackCount: 0,
    bindCount: 0,
    phase: "playing",
  };
}

// マーカーを割り当てる
export function assignMarker(
  state: QuizState,
  memberIndex: number,
  buttonType: "circle" | "attack" | "bind",
): QuizState {
  if (state.phase !== "playing") return state;

  const member = state.members[memberIndex];
  if (member.assignedMarker !== null) return state; // 既に割り当て済み

  const newState = {
    ...state,
    members: state.members.map((m) => ({ ...m })),
  };
  const targetMember = newState.members[memberIndex];

  if (buttonType === "circle") {
    // サークルマーカー: マーキングしないことを意味する（マーカーは付与しない）
    targetMember.assignedMarker = "circle";
  } else if (buttonType === "attack") {
    if (newState.attackCount >= 4) return state; // 4人まで
    newState.attackCount++;
    const attackNum = newState.attackCount as 1 | 2 | 3 | 4;
    targetMember.assignedMarker = `attack${attackNum}` as MarkerType;
  } else if (buttonType === "bind") {
    if (newState.bindCount >= 2) return state; // 2人まで
    newState.bindCount++;
    const bindNum = newState.bindCount as 1 | 2;
    targetMember.assignedMarker = `bind${bindNum}` as MarkerType;
  }

  // 全員に割り当て完了したかチェック
  const allAssigned = newState.members.every((m) => m.assignedMarker !== null);
  if (allAssigned) {
    newState.phase = "result";
  }

  return newState;
}

// マーカー割り当てを取り消す（直前の操作を戻す）
export function undoLastMarker(state: QuizState): QuizState {
  if (state.phase !== "playing") return state;

  // 最後に割り当てられたマーカーを探す
  // attackCount, bindCountから逆算
  const newState = {
    ...state,
    members: state.members.map((m) => ({ ...m })),
  };

  // 攻撃マーカーの最大番号を持つメンバーを探す
  // 鎖マーカーの最大番号を持つメンバーを探す
  // サークルマーカーを持つメンバーを探す
  // 最後に割り当てたものを特定するのは難しいので、全リセット方式にする
  // → リセットボタンとして使う

  for (const m of newState.members) {
    m.assignedMarker = null;
  }
  newState.attackCount = 0;
  newState.bindCount = 0;

  return newState;
}

// 正解のマーカー割り当てを計算する
export function calculateCorrectAnswers(members: MemberState[]): Map<number, MarkerType> {
  const answers = new Map<number, MarkerType>();

  // Step 0: ハローワールド：ファーストターゲットの2人にサークルマーカー
  // （正誤判定には含めない）
  for (const m of members) {
    if (m.helloWorld === "first") {
      answers.set(m.index, "circle");
    }
  }

  // Step 1: 鎖マーカーを2人に付与
  let bindCount = 0;
  const bindTargets: number[] = [];

  // 1.1: セカンドターゲット かつ デュナミス2 のメンバー
  for (const m of members) {
    if (bindCount >= 2) break;
    if (m.helloWorld === "second" && m.dynamis === 2 && !answers.has(m.index)) {
      bindTargets.push(m.index);
      bindCount++;
    }
  }

  // 1.2: デュナミス2 のメンバー
  for (const m of members) {
    if (bindCount >= 2) break;
    if (m.dynamis === 2 && !answers.has(m.index) && !bindTargets.includes(m.index)) {
      bindTargets.push(m.index);
      bindCount++;
    }
  }

  // 1.3: デュナミス1 のメンバー
  for (const m of members) {
    if (bindCount >= 2) break;
    if (m.dynamis === 1 && !answers.has(m.index) && !bindTargets.includes(m.index)) {
      bindTargets.push(m.index);
      bindCount++;
    }
  }

  for (let i = 0; i < bindTargets.length; i++) {
    answers.set(bindTargets[i], `bind${i + 1}` as MarkerType);
  }

  // Step 2: 攻撃マーカーを4人に付与
  let attackCount = 0;
  const attackTargets: number[] = [];

  // 2.1: デュナミス2 のメンバー
  for (const m of members) {
    if (attackCount >= 4) break;
    if (m.dynamis === 2 && !answers.has(m.index) && !attackTargets.includes(m.index)) {
      attackTargets.push(m.index);
      attackCount++;
    }
  }

  // 2.2: デュナミス1 のメンバー
  for (const m of members) {
    if (attackCount >= 4) break;
    if (m.dynamis === 1 && !answers.has(m.index) && !attackTargets.includes(m.index)) {
      attackTargets.push(m.index);
      attackCount++;
    }
  }

  for (let i = 0; i < attackTargets.length; i++) {
    answers.set(attackTargets[i], `attack${i + 1}` as MarkerType);
  }

  return answers;
}

// 正誤判定の結果
export interface JudgmentResult {
  isCorrect: boolean;
  // 各メンバーについて、ユーザーの回答と正解
  details: {
    memberIndex: number;
    userAnswer: MarkerType | null;
    correctAnswer: MarkerType | null;
    isCorrect: boolean;
  }[];
}

// 正誤判定を実行
export function judgeAnswers(state: QuizState): JudgmentResult {
  const correctAnswers = calculateCorrectAnswers(state.members);

  // ユーザーの回答から、鎖と攻撃の付与順序を再構成
  // 同じ優先度グループ内では順序不問なので、グループ単位で比較する

  // まず正解の優先度グループを構築
  const correctBindGroups = buildPriorityGroups(state.members, "bind", correctAnswers);
  const correctAttackGroups = buildPriorityGroups(state.members, "attack", correctAnswers);

  // ユーザーの鎖割り当てメンバー（順番に）
  const userBindMembers: number[] = [];
  const userAttackMembers: number[] = [];

  for (const m of state.members) {
    if (m.assignedMarker?.startsWith("bind")) {
      const num = Number.parseInt(m.assignedMarker.replace("bind", ""));
      userBindMembers[num - 1] = m.index;
    }
    if (m.assignedMarker?.startsWith("attack")) {
      const num = Number.parseInt(m.assignedMarker.replace("attack", ""));
      userAttackMembers[num - 1] = m.index;
    }
  }

  // グループ単位で正誤判定
  const bindCorrect = checkGroupOrder(userBindMembers, correctBindGroups);
  const attackCorrect = checkGroupOrder(userAttackMembers, correctAttackGroups);

  // サークルの判定（ファーストターゲットのサークルは判定に含めない）
  // ファーストターゲット以外でサークルを押した人がいないことを確認
  // → 実際にはファーストターゲットの人がサークルを押しているかは判定不要（要件0番）

  const isCorrect = bindCorrect && attackCorrect;

  const details = state.members.map((m) => {
    const correct = correctAnswers.get(m.index) ?? null;
    const userMarker = m.assignedMarker;

    // サークルマーカーは判定に含めない
    if (correct === "circle" || userMarker === "circle") {
      return {
        memberIndex: m.index,
        userAnswer: userMarker,
        correctAnswer: correct,
        isCorrect: true, // サークルは常にOK
      };
    }

    return {
      memberIndex: m.index,
      userAnswer: userMarker,
      correctAnswer: correct,
      isCorrect: isCorrect, // 全体の判定を使う（グループ順序で判定済み）
    };
  });

  return { isCorrect, details };
}

// 優先度グループを構築する
// 鎖: [1.1グループ, 1.2グループ, 1.3グループ]
// 攻撃: [2.1グループ, 2.2グループ]
function buildPriorityGroups(
  members: MemberState[],
  type: "bind" | "attack",
  correctAnswers: Map<number, MarkerType>,
): number[][] {
  const groups: number[][] = [];
  const assigned = new Set<number>();

  // サークル（ファーストターゲット）をスキップ対象に
  for (const m of members) {
    if (correctAnswers.get(m.index) === "circle") {
      assigned.add(m.index);
    }
  }

  if (type === "bind") {
    // 1.1: セカンドターゲット かつ デュナミス2
    const group11: number[] = [];
    for (const m of members) {
      if (m.helloWorld === "second" && m.dynamis === 2 && !assigned.has(m.index)) {
        group11.push(m.index);
        assigned.add(m.index);
      }
    }
    if (group11.length > 0) groups.push(group11);

    // 1.2: デュナミス2
    const group12: number[] = [];
    for (const m of members) {
      if (m.dynamis === 2 && !assigned.has(m.index)) {
        group12.push(m.index);
        assigned.add(m.index);
      }
    }
    if (group12.length > 0) groups.push(group12);

    // 1.3: デュナミス1
    const group13: number[] = [];
    for (const m of members) {
      if (m.dynamis === 1 && !assigned.has(m.index)) {
        group13.push(m.index);
        assigned.add(m.index);
      }
    }
    if (group13.length > 0) groups.push(group13);
  } else {
    // 鎖が既に割り当て済みのメンバーをスキップ対象に追加
    for (const [idx, marker] of correctAnswers) {
      if (marker.startsWith("bind")) {
        assigned.add(idx);
      }
    }

    // 2.1: デュナミス2
    const group21: number[] = [];
    for (const m of members) {
      if (m.dynamis === 2 && !assigned.has(m.index)) {
        group21.push(m.index);
        assigned.add(m.index);
      }
    }
    if (group21.length > 0) groups.push(group21);

    // 2.2: デュナミス1
    const group22: number[] = [];
    for (const m of members) {
      if (m.dynamis === 1 && !assigned.has(m.index)) {
        group22.push(m.index);
        assigned.add(m.index);
      }
    }
    if (group22.length > 0) groups.push(group22);
  }

  return groups;
}

// グループ順序の判定: グループ内の順序は問わないが、グループ間の順序は厳密
function checkGroupOrder(userOrder: number[], groups: number[][]): boolean {
  let userIdx = 0;

  for (const group of groups) {
    const groupSet = new Set(group);
    // このグループに属するメンバーが、連続してuserOrderに現れるか
    const userSlice = userOrder.slice(userIdx, userIdx + group.length);

    if (userSlice.length !== group.length) return false;

    // グループ内のメンバーが全て含まれているか（順序は不問）
    const userSliceSet = new Set(userSlice);
    for (const member of groupSet) {
      if (!userSliceSet.has(member)) return false;
    }
    for (const member of userSliceSet) {
      if (!groupSet.has(member)) return false;
    }

    userIdx += group.length;
  }

  return true;
}

// マーカー画像パスを取得
export function getMarkerImagePath(marker: MarkerType): string {
  const map: Record<MarkerType, string> = {
    circle: "/images/Marker_Circle.png",
    attack1: "/images/Marker_Attack1.png",
    attack2: "/images/Marker_Attack2.png",
    attack3: "/images/Marker_Attack3.png",
    attack4: "/images/Marker_Attack4.png",
    bind1: "/images/Marker_Bind1.png",
    bind2: "/images/Marker_Bind2.png",
  };
  return map[marker];
}
