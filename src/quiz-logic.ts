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

  // 優先度候補プール方式で判定
  // 同じ優先度の候補からどれを選んでも正解、ただし優先度間の順序は厳密
  const circleMembers = new Set(
    state.members.filter((m) => m.helloWorld === "first").map((m) => m.index),
  );

  const bindCorrect = checkWithPriorityPools(
    userBindMembers,
    buildCandidatePools(state.members, "bind", circleMembers, new Set()),
    2,
  );

  // 鎖で選ばれたメンバーを除外して攻撃の判定
  const bindAssigned = new Set(userBindMembers);
  const attackCorrect = checkWithPriorityPools(
    userAttackMembers,
    buildCandidatePools(state.members, "attack", circleMembers, bindAssigned),
    4,
  );

  const isCorrect = bindCorrect && attackCorrect;

  const details = state.members.map((m) => {
    const correct = correctAnswers.get(m.index) ?? null;
    const userMarker = m.assignedMarker;

    // サークルマーカーは判定に含めない（要件: 0番のサークル付与は正誤判定対象外）
    if (correct === "circle" || userMarker === "circle") {
      return {
        memberIndex: m.index,
        userAnswer: userMarker,
        correctAnswer: correct,
        isCorrect: true,
      };
    }

    return {
      memberIndex: m.index,
      userAnswer: userMarker,
      correctAnswer: correct,
      isCorrect,
    };
  });

  return { isCorrect, details };
}

// 優先度ごとの候補プールを構築（全候補を含む、スロット制限なし）
// 各プールは「この優先度に該当する全メンバー」を持つ
function buildCandidatePools(
  members: MemberState[],
  type: "bind" | "attack",
  circleMembers: Set<number>,
  alreadyAssigned: Set<number>,
): Set<number>[] {
  const pools: Set<number>[] = [];
  const excluded = new Set([...circleMembers, ...alreadyAssigned]);

  if (type === "bind") {
    // 1.1: セカンドターゲット かつ デュナミス2（最優先）
    const pool11 = new Set<number>();
    for (const m of members) {
      if (m.helloWorld === "second" && m.dynamis === 2 && !excluded.has(m.index)) {
        pool11.add(m.index);
      }
    }
    if (pool11.size > 0) pools.push(pool11);

    // 1.2 + 1.3: デュナミス2（1.1除く）とデュナミス1を同一優先度として統合
    const pool12_13 = new Set<number>();
    for (const m of members) {
      if (!excluded.has(m.index) && !pool11.has(m.index)) {
        pool12_13.add(m.index);
      }
    }
    if (pool12_13.size > 0) pools.push(pool12_13);
  } else {
    // 2.1 + 2.2: デュナミス2とデュナミス1を同一優先度として統合
    const pool21_22 = new Set<number>();
    for (const m of members) {
      if (!excluded.has(m.index)) {
        pool21_22.add(m.index);
      }
    }
    if (pool21_22.size > 0) pools.push(pool21_22);
  }

  return pools;
}

// 優先度候補プール方式の判定
// 各プールから順に消費し、ユーザーの選択が正しい優先度順かチェック
// - 高優先度プールの候補は低優先度より先に選ばれなければならない
// - 同じプール内の候補はどの順序で選んでもOK
function checkWithPriorityPools(
  userOrder: number[],
  pools: Set<number>[],
  totalSlots: number,
): boolean {
  let userIdx = 0;
  let remaining = totalSlots;

  for (const pool of pools) {
    if (remaining <= 0) break;

    // このプールから消費する数: プールの候補数と残りスロットの小さい方
    const consumeCount = Math.min(pool.size, remaining);

    // ユーザーの次の consumeCount 個のピックがすべてこのプールに含まれるか
    const userSlice = userOrder.slice(userIdx, userIdx + consumeCount);
    if (userSlice.length !== consumeCount) return false;

    for (const pick of userSlice) {
      if (!pool.has(pick)) return false;
    }

    userIdx += consumeCount;
    remaining -= consumeCount;
  }

  return remaining === 0;
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
