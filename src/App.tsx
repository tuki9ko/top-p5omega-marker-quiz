import { useCallback, useEffect, useRef, useState } from "react";
import { ResultView } from "./components/ResultView.tsx";
import {
  type QuizState,
  assignMarker,
  generateQuiz,
  getMarkerImagePath,
  undoLastMarker,
} from "./quiz-logic.ts";

// パーティリスト画像内のジョブアイコン位置（%）
const JOB_ICON_LEFT_PERCENT = 3;
const MEMBER_ROW_CENTERS = [8.5, 19.5, 30.5, 41.5, 52.0, 63.0, 74.0, 85.0];
const MARKER_SIZE_PERCENT = 8;

export function App() {
  const [quizState, setQuizState] = useState<QuizState>(() => generateQuiz());
  const [timerResetKey, setTimerResetKey] = useState(0);
  const startTimeRef = useRef(performance.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerDisplayRef = useRef<HTMLDivElement>(null);
  const finalElapsedRef = useRef(0);

  // タイマー管理: useRefで直接DOM更新し、不要な再レンダリングを回避
  useEffect(() => {
    if (quizState.phase === "playing") {
      startTimeRef.current = performance.now();
      intervalRef.current = setInterval(() => {
        if (timerDisplayRef.current) {
          const elapsed = (performance.now() - startTimeRef.current) / 1000;
          timerDisplayRef.current.textContent = `${elapsed.toFixed(1)}s`;
        }
      }, 100);
    }
    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [quizState.phase, timerResetKey]);

  const handleAssignMarker = useCallback(
    (memberIndex: number, buttonType: "circle" | "attack" | "bind") => {
      setQuizState((prev) => {
        const newState = assignMarker(prev, memberIndex, buttonType);
        if (newState.phase === "result" && prev.phase === "playing") {
          finalElapsedRef.current = (performance.now() - startTimeRef.current) / 1000;
          if (intervalRef.current !== null) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
        return newState;
      });
    },
    [],
  );

  const handleReset = useCallback(() => {
    setQuizState((prev) => undoLastMarker(prev));
    setTimerResetKey((k) => k + 1);
  }, []);

  const handleNewQuiz = useCallback(() => {
    setQuizState(generateQuiz());
    setTimerResetKey((k) => k + 1);
  }, []);

  const assignedCount = quizState.members.filter((m) => m.assignedMarker !== null).length;

  return (
    <>
      <h1 className="quiz-title">絶オメガ検証戦 マーカークイズ</h1>
      <p className="quiz-subtitle">P5 コード：＊＊＊ミ＊【オメガ】マーカー練習</p>

      <div className="quiz-container">
        {/* パーティリストラッパー */}
        <div className="party-list-wrapper">
          {/* 左側: マーカーボタン列 */}
          <div className="markers-column">
            <div className="column-spacer-top" />
            {quizState.members.map((member, i) => (
              <div key={i} className="marker-button-row">
                {quizState.phase === "playing" && member.assignedMarker === null ? (
                  <>
                    <button
                      className="marker-btn marker-btn-circle"
                      onClick={() => handleAssignMarker(i, "circle")}
                    >
                      <img src="/images/Marker_Circle.png" alt="circle" />
                    </button>
                    <button
                      className="marker-btn marker-btn-attack"
                      onClick={() => handleAssignMarker(i, "attack")}
                    >
                      <img src="/images/Marker_Attack1.png" alt="attack" />
                    </button>
                    <button
                      className="marker-btn marker-btn-bind"
                      onClick={() => handleAssignMarker(i, "bind")}
                    >
                      <img src="/images/Marker_Bind1.png" alt="bind" />
                    </button>
                  </>
                ) : member.assignedMarker !== null ? (
                  <div className="marker-assigned" />
                ) : null}
              </div>
            ))}
            <div className="column-spacer-bottom" />
          </div>

          {/* 中央: パーティリスト画像 */}
          <div className="party-list-image-container">
            <img src="/images/PartyList.png" alt="パーティリスト" className="party-list-image" />
            <div className="marker-overlay">
              {quizState.members.map((member, i) => {
                if (member.assignedMarker === null || member.assignedMarker === "circle")
                  return null;
                const centerY = MEMBER_ROW_CENTERS[i];
                return (
                  <img
                    key={i}
                    src={getMarkerImagePath(member.assignedMarker)}
                    className="head-marker"
                    style={{
                      top: `${centerY - MARKER_SIZE_PERCENT / 2}%`,
                      left: `${JOB_ICON_LEFT_PERCENT}%`,
                      height: `${MARKER_SIZE_PERCENT}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* 右側: バフデバフ列 */}
          <div className="buffs-column">
            <div className="column-spacer-top" />
            {quizState.members.map((member, i) => (
              <div key={i} className="buff-row">
                <img
                  src={
                    member.dynamis === 1 ? "/images/Buff_Dynamis1.png" : "/images/Buff_Dynamis2.png"
                  }
                  alt={`デュナミス${member.dynamis}`}
                  className="buff-icon"
                />
                {member.helloWorld !== null && (
                  <img
                    src={
                      member.helloWorld === "first"
                        ? "/images/Debuff_Target1.png"
                        : "/images/Debuff_Target2.png"
                    }
                    alt={
                      member.helloWorld === "first" ? "ファーストターゲット" : "セカンドターゲット"
                    }
                    className="buff-icon"
                  />
                )}
              </div>
            ))}
            <div className="column-spacer-buff-bottom" />
          </div>
        </div>

        {/* ボタンエリア */}
        <div className="button-area">
          {quizState.phase === "playing" ? (
            <>
              <div className="timer-display" ref={timerDisplayRef}>
                0.0s
              </div>
              <button className="btn btn-reset" onClick={handleReset}>
                リセット
              </button>
              <button className="btn btn-skip" onClick={handleNewQuiz}>
                スキップ
              </button>
              <div className="status-text">割り当て: {assignedCount} / 8</div>
            </>
          ) : (
            <button className="btn btn-next" onClick={handleNewQuiz}>
              次の問題
            </button>
          )}
        </div>

        {/* 結果表示 */}
        {quizState.phase === "result" && (
          <ResultView quizState={quizState} elapsedSeconds={finalElapsedRef.current} />
        )}
      </div>
    </>
  );
}
