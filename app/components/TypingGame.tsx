"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "../components/Keyboard";

type Mode = "flash" | "challenge";

type ParagraphResult = {
  index: number;
  charsTyped: number;
  charsCorrect: number;
  accuracy: number;
  wordsTyped: number;
};

function splitIntoParagraphs(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return normalized
    .split(/\n\s*\n+/g)
    .map((p) => p.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHALLENGE_WORDS = [
  "ubiquitous",
  "meticulous",
  "resilience",
  "conundrum",
  "exacerbate",
  "ameliorate",
  "intransigent",
  "lucid",
  "pragmatic",
  "benevolent",
  "ephemeral",
  "ostentatious",
  "vindicate",
  "cogent",
  "tenacious",
  "anachronism",
  "perspicacious",
  "substantiate",
  "capricious",
  "synergy",
  "paradigm",
  "immutable",
  "aesthetic",
  "ambiguous",
  "catalyst",
  "scrutinize",
  "magnanimous",
  "indispensable",
  "coherent",
  "intrinsic",
  "contemplate",
  "diligent",
  "articulate",
  "formidable",
  "reconcile",
  "proliferate",
  "discern",
  "refine",
  "eloquent",
  "cumulative",
  "metaphorical",
  "conspicuous",
  "inevitable",
  "paramount",
  "synthesize",
  "comprehensive",
  "hypothesis",
  "corroborate",
  "nuance",
  "venerate",
];

const DEFAULT_FLASH = [
  "Typing is a skill that improves with regular practice and focus. Speed and accuracy are both important when you want to become a proficient typist.",
  "Consistency beats motivation every time. Building a daily habit makes progress predictable and much easier to maintain.",
  "Next.js and React make UI development fun and interactive. Building real projects teaches you faster than reading alone.",
];

export default function TypingGame() {
  const [mode, setMode] = useState<Mode>("flash");

  const [paragraphs, setParagraphs] = useState<string[]>(DEFAULT_FLASH);
  const [idx, setIdx] = useState(0);
  const flashParagraph = paragraphs[idx] ?? "";

  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  const [timeLimitSec, setTimeLimitSec] = useState<15 | 30 | 60>(60);
  const [deadlineTs, setDeadlineTs] = useState<number>(0);
  const [nowTs, setNowTs] = useState<number>(Date.now());

  const [bonusEnabled, setBonusEnabled] = useState(true);
  const [bonusSecPerParagraph, setBonusSecPerParagraph] = useState(3);

  const [challengeSeed, setChallengeSeed] = useState(20260124);
  const [challengeWordCount, setChallengeWordCount] = useState(220);

  const [input, setInput] = useState("");
  const [pressedKey, setPressedKey] = useState("");

  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const [totalCharsCorrect, setTotalCharsCorrect] = useState(0);
  const [totalWordsTyped, setTotalWordsTyped] = useState(0);
  const [results, setResults] = useState<ParagraphResult[]>([]);

  const paragraphRef = useRef<HTMLDivElement>(null);

  const targetText = useMemo(() => {
    if (mode === "flash") return flashParagraph;

    const rng = mulberry32(challengeSeed);
    const words: string[] = [];
    for (let i = 0; i < challengeWordCount; i++) {
      const w = CHALLENGE_WORDS[Math.floor(rng() * CHALLENGE_WORDS.length)];
      const roll = rng();
      if (roll < 0.08) words.push(w + ",");
      else if (roll < 0.11) words.push(w + ".");
      else words.push(w);
    }
    return words.join(" ").replace(/\s+/g, " ").trim();
  }, [mode, flashParagraph, challengeSeed, challengeWordCount]);

  const timeLeftMs = useMemo(() => {
    if (!started && !finished) return timeLimitSec * 1000;
    return clamp(deadlineTs - nowTs, 0, 999999999);
  }, [deadlineTs, nowTs, started, finished, timeLimitSec]);

  const timeLeftSec = Math.ceil(timeLeftMs / 1000);

  useEffect(() => {
    if (!started) return;
    const id = setInterval(() => setNowTs(Date.now()), 100);
    return () => clearInterval(id);
  }, [started]);

  useEffect(() => {
    if (!started) return;
    if (timeLeftMs <= 0) endSession();
  }, [timeLeftMs, started]);

  // Prevent page scroll during typing session (stops weird jumping)
  useEffect(() => {
    if (!started) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [started]);

  const elapsedMs = useMemo(() => {
    if (!started && !finished) return 0;
    const startedAt = deadlineTs - timeLimitSec * 1000;
    return clamp(nowTs - startedAt, 0, 999999999);
  }, [deadlineTs, timeLimitSec, nowTs, started, finished]);

  const elapsedMin = Math.max(elapsedMs / 60000, 0.0001);
  const wpm = Math.round(totalWordsTyped / elapsedMin);
  const accuracy = totalCharsTyped
    ? Math.round((totalCharsCorrect / totalCharsTyped) * 100)
    : 100;

  const currentCorrectChars = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === targetText[i]) correct++;
    }
    return correct;
  }, [input, targetText]);

  const currentAccuracy = input.length
    ? Math.round((currentCorrectChars / input.length) * 100)
    : 100;

  const startSession = () => {
    setStarted(true);
    setFinished(false);
    setPressedKey("");
    setInput("");
    setIdx(0);
    setResults([]);
    setTotalCharsTyped(0);
    setTotalCharsCorrect(0);
    setTotalWordsTyped(0);

    const now = Date.now();
    setNowTs(now);
    setDeadlineTs(now + timeLimitSec * 1000);

    if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
  };

  const endSession = () => {
    setStarted(false);
    setFinished(true);
    setPressedKey("");
  };

  const setTimeLimit = (sec: 15 | 30 | 60) => {
    setTimeLimitSec(sec);
    if (!started) return;

    const now = Date.now();
    const oldTotal = timeLimitSec * 1000;
    const newTotal = sec * 1000;

    const startedAt = deadlineTs - oldTotal;
    const spent = clamp(now - startedAt, 0, oldTotal);

    const newDeadline = now + clamp(newTotal - spent, 0, newTotal);
    setNowTs(now);
    setDeadlineTs(newDeadline);

    if (newDeadline - now <= 0) endSession();
  };

  // ✅ FIXED AUTO-SCROLL: only scroll when caret goes out of view (no snapping to middle)
  useEffect(() => {
    const container = paragraphRef.current;
    if (!container) return;

    const caret = container.querySelector(
      `#char-${input.length}`
    ) as HTMLElement | null;
    if (!caret) return;

    const top = container.scrollTop;
    const bottom = top + container.clientHeight;

    const caretTop = caret.offsetTop;
    const caretBottom = caretTop + caret.offsetHeight;

    const paddingTop = 60;
    const paddingBottom = 120;

    if (caretTop < top + paddingTop) {
      container.scrollTo({ top: Math.max(caretTop - paddingTop, 0) });
    } else if (caretBottom > bottom - paddingBottom) {
      container.scrollTo({
        top: caretBottom - container.clientHeight + paddingBottom,
      });
    }
  }, [input]);

  const commitChunk = () => {
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;
    const charsTyped = input.length;
    const charsCorrect = currentCorrectChars;

    setTotalCharsTyped((v) => v + charsTyped);
    setTotalCharsCorrect((v) => v + charsCorrect);
    setTotalWordsTyped((v) => v + words);

    setResults((prev) => [
      ...prev,
      {
        index: mode === "flash" ? idx : 0,
        charsTyped,
        charsCorrect,
        accuracy: charsTyped
          ? Math.round((charsCorrect / charsTyped) * 100)
          : 100,
        wordsTyped: words,
      },
    ]);

    setInput("");
    if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
  };

  const addBonusTime = (bonusSec: number) => {
    if (!started) return;
    setDeadlineTs((d) => d + bonusSec * 1000);
  };

  const commitAndAdvanceFlash = () => {
    commitChunk();

    if (mode === "flash" && bonusEnabled && bonusSecPerParagraph > 0) {
      addBonusTime(bonusSecPerParagraph);
    }

    if (idx + 1 < paragraphs.length) {
      setIdx((v) => v + 1);
    } else {
      endSession();
    }
  };

  useEffect(() => {
    if (!started) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      setPressedKey(key);

      if (key === "Escape") {
        endSession();
        return;
      }

      const isChar = key.length === 1; // includes space
      const isBackspace = key === "Backspace";
      const isEnter = key === "Enter";
      const isTab = key === "Tab";

      if (isChar || isBackspace || isEnter || isTab) e.preventDefault();

      if (isBackspace) {
        setInput((prev) => prev.slice(0, -1));
        return;
      }

      if (isEnter) {
        if (input.length > 0) {
          if (mode === "flash") commitAndAdvanceFlash();
          else commitChunk();
        }
        return;
      }

      if (isTab) return;

      if (isChar) {
        setInput((prev) => {
          const next = prev + key;

          if (next.length >= targetText.length) {
            queueMicrotask(() => {
              if (mode === "flash") commitAndAdvanceFlash();
              else commitChunk();
            });
          }

          return next;
        });
      }
    };

    const onKeyUp = () => setPressedKey("");

    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown as any);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, input, mode, idx, targetText, bonusEnabled, bonusSecPerParagraph]);

  const onUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    const parsed = splitIntoParagraphs(text);
    if (parsed.length === 0) return;

    setMode("flash");
    setParagraphs(parsed);
    setIdx(0);
    setInput("");
    setResults([]);
    setTotalCharsTyped(0);
    setTotalCharsCorrect(0);
    setTotalWordsTyped(0);
    setStarted(false);
    setFinished(false);
    setPressedKey("");

    if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
  };

  // reusable button props to avoid focus-scroll bugs
  const noFocus = {
    type: "button" as const,
    onMouseDown: (e: React.MouseEvent) => e.preventDefault(),
  };

  return (
    <div className="bg-black min-h-screen text-white">
      <div className="max-w-6xl mx-auto p-4">
        {/* Sticky header so title never disappears */}
        <div className="sticky top-0 z-10 bg-black/90 backdrop-blur border-b border-neutral-900 pb-3">
          <div className="w-full flex items-center justify-between gap-3 pt-2">
            <div className="flex flex-col">
              <h1 className="text-3xl font-bold text-yellow-400">
                FlashTyper + Challenge
              </h1>
              <p className="text-sm text-neutral-400">
                Flash: upload paragraphs. Challenge: shared word set.
              </p>
            </div>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".txt,text/plain"
                className="hidden"
                onChange={(e) => onUpload(e.target.files?.[0] ?? null)}
              />
              <span className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-yellow-400 transition text-sm">
                Upload .txt
              </span>
            </label>
          </div>

          <div className="w-full flex flex-wrap items-center justify-between gap-3 mt-3">
            <div className="flex gap-2">
              <button
                {...noFocus}
                onClick={() => {
                  if (started) return;
                  setMode("flash");
                  setIdx(0);
                  setInput("");
                }}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  mode === "flash"
                    ? "bg-yellow-500 text-black"
                    : "bg-neutral-800 border border-neutral-700 hover:border-neutral-500"
                }`}
              >
                Flash
              </button>

              <button
                {...noFocus}
                onClick={() => {
                  if (started) return;
                  setMode("challenge");
                  setIdx(0);
                  setInput("");
                }}
                className={`px-4 py-2 rounded-xl font-semibold transition ${
                  mode === "challenge"
                    ? "bg-yellow-500 text-black"
                    : "bg-neutral-800 border border-neutral-700 hover:border-neutral-500"
                }`}
              >
                Challenge
              </button>
            </div>

            <div className="flex gap-2">
              {[15, 30, 60].map((sec) => (
                <button
                  key={sec}
                  {...noFocus}
                  onClick={() => setTimeLimit(sec as 15 | 30 | 60)}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${
                    timeLimitSec === sec
                      ? "bg-yellow-500 text-black"
                      : "bg-yellow-400 text-black hover:bg-yellow-500"
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              {mode === "flash" && (
                <>
                  <button
                    {...noFocus}
                    onClick={() => setBonusEnabled((v) => !v)}
                    className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${
                      bonusEnabled
                        ? "bg-green-500 text-black"
                        : "bg-neutral-800 border border-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    Bonus: {bonusEnabled ? "ON" : "OFF"}
                  </button>

                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-neutral-400">+sec</span>
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={bonusSecPerParagraph}
                      onChange={(e) =>
                        setBonusSecPerParagraph(
                          clamp(Number(e.target.value || 0), 0, 30)
                        )
                      }
                      className="w-20 bg-neutral-900 border border-neutral-700 rounded-lg px-2 py-1 text-white"
                    />
                  </div>
                </>
              )}

              {!started && !finished && (
                <button
                  {...noFocus}
                  onClick={startSession}
                  className="px-4 py-2 rounded-xl bg-green-500 text-black font-bold hover:bg-green-600 transition"
                >
                  Start
                </button>
              )}

              {started && (
                <button
                  {...noFocus}
                  onClick={endSession}
                  className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-red-400 transition font-semibold"
                >
                  End (Esc)
                </button>
              )}

              {finished && (
                <button
                  {...noFocus}
                  onClick={startSession}
                  className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-500 transition"
                >
                  Restart
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 2-column layout: typing left, completed right */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 mt-4">
          {/* LEFT */}
          <div className="flex flex-col gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-neutral-400">
                {mode === "flash" ? (
                  <>
                    Paragraph{" "}
                    <span className="text-white font-semibold">{idx + 1}</span>{" "}
                    / <span className="text-white font-semibold">{paragraphs.length}</span>
                  </>
                ) : (
                  <>
                    Challenge Seed:{" "}
                    <span className="text-white font-semibold">{challengeSeed}</span>
                  </>
                )}
              </div>

              <div className="flex gap-3 text-sm">
                <span>
                  <span className="text-yellow-400 font-semibold">Time:</span>{" "}
                  {timeLeftSec}s
                </span>
                <span>
                  <span className="text-yellow-400 font-semibold">WPM:</span>{" "}
                  {started || finished ? wpm : 0}
                </span>
                <span>
                  <span className="text-yellow-400 font-semibold">Acc:</span>{" "}
                  {started || finished ? accuracy : 100}%
                </span>
                <span>
                  <span className="text-yellow-400 font-semibold">Now:</span>{" "}
                  {started || finished ? currentAccuracy : 100}%
                </span>
              </div>
            </div>

            <div
              ref={paragraphRef}
              className="bg-gray-900 p-6 rounded-xl w-full h-72 overflow-y-auto overscroll-contain font-mono text-lg whitespace-pre-wrap border border-neutral-800"
            >
              {targetText.split("").map((char, i) => {
                let cls = "text-gray-500";
                if (i < input.length)
                  cls = input[i] === char ? "text-green-400" : "text-red-400";
                else if (i === input.length && started)
                  cls =
                    "text-white underline decoration-yellow-400 decoration-2";
                return (
                  <span key={i} id={`char-${i}`} className={cls}>
                    {char}
                  </span>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-sm text-neutral-400">
                Tip: Enter submits early. Esc ends.
              </div>

              <div className="flex gap-2">
                <button
                  {...noFocus}
                  onClick={() => {
                    if (!started) return;
                    if (input.length === 0) return;
                    if (mode === "flash") commitAndAdvanceFlash();
                    else commitChunk();
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-yellow-400 transition font-semibold"
                >
                  {mode === "flash" ? "Next Paragraph" : "Commit Segment"}
                </button>

                <button
                  {...noFocus}
                  onClick={() => {
                    setInput("");
                    if (paragraphRef.current)
                      paragraphRef.current.scrollTop = 0;
                  }}
                  className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-neutral-500 transition font-semibold"
                >
                  Clear
                </button>
              </div>
            </div>

            <Keyboard pressedKey={pressedKey} />
          </div>

          {/* RIGHT */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 h-[520px] lg:h-[640px] flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Completed</div>
              <div className="text-xs text-neutral-400">
                {results.length} item{results.length === 1 ? "" : "s"}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain pr-1 space-y-2">
              {results.length === 0 ? (
                <div className="text-sm text-neutral-400">
                  Finish a paragraph / commit a segment to see results here.
                </div>
              ) : (
                results.map((r, k) => (
                  <div
                    key={`${r.index}-${k}`}
                    className="text-sm bg-black/40 border border-neutral-800 rounded-lg p-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-neutral-300">
                        {mode === "flash" ? (
                          <>
                            Paragraph{" "}
                            <span className="text-white font-semibold">
                              {r.index + 1}
                            </span>
                          </>
                        ) : (
                          <>
                            Segment{" "}
                            <span className="text-white font-semibold">
                              {k + 1}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="text-neutral-400">
                        Acc:{" "}
                        <span className="text-white font-semibold">
                          {r.accuracy}%
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 flex gap-3 text-neutral-400">
                      <span>
                        Typed{" "}
                        <span className="text-white font-semibold">
                          {r.charsTyped}
                        </span>
                      </span>
                      <span>
                        Correct{" "}
                        <span className="text-white font-semibold">
                          {r.charsCorrect}
                        </span>
                      </span>
                      <span>
                        Words{" "}
                        <span className="text-white font-semibold">
                          {r.wordsTyped}
                        </span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
