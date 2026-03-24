import {
  type MarkerType,
  type QuizState,
  getMarkerImagePath,
  judgeAnswers,
} from "../quiz-logic.ts";

// タイマースコア定義
interface TimerScore {
  maxSeconds: number;
  label: string;
  comment: string;
}

const TIMER_SCORES: TimerScore[] = [
  { maxSeconds: 4, label: "ツーラーレベル", comment: "早すぎ。もしかして見えてる君ですか？" },
  { maxSeconds: 6, label: "即答レベル", comment: "判断が早い！" },
  { maxSeconds: 15, label: "MF範囲1回目着弾前", comment: "MF範囲避け大丈夫？" },
  { maxSeconds: 18, label: "MF範囲2回目着弾前", comment: "これくらいがベストだよね" },
  { maxSeconds: 22, label: "検知前", comment: "これくらいがちょうどいいかもね" },
  { maxSeconds: 25, label: "検知出現後", comment: "これ以上遅れると大変だよ？" },
  { maxSeconds: Infinity, label: "検知出現後しばらく", comment: "間に合わないかも……" },
];

function getTimerScore(seconds: number): TimerScore {
  for (const score of TIMER_SCORES) {
    if (seconds <= score.maxSeconds) return score;
  }
  return TIMER_SCORES[TIMER_SCORES.length - 1];
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

interface ResultViewProps {
  quizState: QuizState;
  elapsedSeconds: number;
}

export function ResultView({ quizState, elapsedSeconds }: ResultViewProps) {
  const result = judgeAnswers(quizState);
  const score = getTimerScore(elapsedSeconds);

  return (
    <div className={`result-area ${result.isCorrect ? "correct" : "incorrect"}`}>
      <h2 className="result-title">{result.isCorrect ? "正解！" : "不正解…"}</h2>

      <div className="result-time">タイム: {elapsedSeconds.toFixed(1)}秒</div>

      {result.isCorrect && (
        <div className="result-score">
          <div className="result-score-label">{score.label}</div>
          <div className="result-score-comment">{score.comment}</div>
        </div>
      )}

      {!result.isCorrect && (
        <>
          <p className="result-explanation">正しいマーカー割り当て:</p>
          <div className="result-table">
            {result.details.map((detail) => {
              const member = quizState.members[detail.memberIndex];
              const dynText = `デュナミス${member.dynamis}`;
              const hwText =
                member.helloWorld === "first"
                  ? " / 1st"
                  : member.helloWorld === "second"
                    ? " / 2nd"
                    : "";

              return (
                <div key={detail.memberIndex} className="result-row">
                  <span className="result-member">メンバー {detail.memberIndex + 1}</span>
                  <span className="result-buff-info">
                    ({dynText}
                    {hwText})
                  </span>
                  {detail.correctAnswer && detail.correctAnswer !== "circle" ? (
                    <>
                      <img
                        src={getMarkerImagePath(detail.correctAnswer)}
                        className="result-marker-icon"
                        alt={detail.correctAnswer}
                      />
                      <span className="result-marker-label">
                        {getMarkerDisplayName(detail.correctAnswer)}
                      </span>
                    </>
                  ) : (
                    <span className="result-marker-label">（サークル / マーキングなし）</span>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
