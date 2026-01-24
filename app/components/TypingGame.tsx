"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Keyboard from "../components/Keyboard";

type ParagraphResult = {
  index: number;
  charsTyped: number;
  charsCorrect: number;
  accuracy: number; // 0-100
  wordsTyped: number;
};

function splitIntoParagraphs(text: string) {
  // Normalize newlines, split by blank lines
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const parts = normalized
    .split(/\n\s*\n+/g)
    .map((p) => p.trim().replace(/\s+/g, " ")) // collapse whitespace inside
    .filter(Boolean);

  return parts;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function TypingGame() {
  // Uploaded paragraph set
  const [paragraphs, setParagraphs] = useState<string[]>([
    // Default starter paragraphs (so it works before upload)
    "Typing is a skill that improves with regular practice and focus. Speed and accuracy are both important when you want to become a proficient typist.",
    "Consistency beats motivation every time. Building a daily habit makes progress predictable and much easier to maintain.",
    "Next.js and React make UI development fun and interactive. Building real projects teaches you faster than reading alone.",
  ]);

  // Current paragraph index
  const [idx, setIdx] = useState(0);
  const paragraph = paragraphs[idx] ?? "";

  // Session state
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  // Timer (single session timer across all paragraphs)
  const [timeLimitSec, setTimeLimitSec] = useState<15 | 30 | 60>(60);
  const [startTs, setStartTs] = useState<number>(0);
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  // Typing state for *current paragraph*
  const [input, setInput] = useState("");
  const [pressedKey, setPressedKey] = useState("");

  // Totals across the whole session
  const [totalCharsTyped, setTotalCharsTyped] = useState(0);
  const [totalCharsCorrect, setTotalCharsCorrect] = useState(0);
  const [totalWordsTyped, setTotalWordsTyped] = useState(0);
  const [results, setResults] = useState<ParagraphResult[]>([]);

  const paragraphRef = useRef<HTMLDivElement>(null);

  // Derived time
  const timeLeftMs = useMemo(() => {
    if (!started && !finished) return timeLimitSec * 1000;
    const left = timeLimitSec * 1000 - elapsedMs;
    return clamp(left, 0, timeLimitSec * 1000);
  }, [timeLimitSec, elapsedMs, started, finished]);

  const timeLeftSec = Math.ceil(timeLeftMs / 1000);

  const elapsedMin = Math.max(elapsedMs / 60000, 0.0001);

  // Live stats (session-wide)
  const wpm = Math.round(totalWordsTyped / elapsedMin);
  const accuracy = totalCharsTyped
    ? Math.round((totalCharsCorrect / totalCharsTyped) * 100)
    : 100;

  // Current paragraph correctness
  const currentCorrectChars = useMemo(() => {
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (input[i] === paragraph[i]) correct++;
    }
    return correct;
  }, [input, paragraph]);

  const currentAccuracy = input.length
    ? Math.round((currentCorrectChars / input.length) * 100)
    : 100;

  // Start session (keeps uploaded paragraphs, resets progress)
  const startSession = () => {
    setStarted(true);
    setFinished(false);
    setStartTs(Date.now());
    setElapsedMs(0);

    setIdx(0);
    setInput("");

    setPressedKey("");
    setResults([]);

    setTotalCharsTyped(0);
    setTotalCharsCorrect(0);
    setTotalWordsTyped(0);

    if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
  };

  const endSession = () => {
    setStarted(false);
    setFinished(true);
    setPressedKey("");
  };

  // Change time mid-session WITHOUT restarting:
  // - we only change the limit, elapsed stays the same
  const setTimeLimit = (sec: 15 | 30 | 60) => {
    setTimeLimitSec(sec);
    // If already running and elapsed exceeds new limit, finish immediately
    // (this will reflect next tick too, but we can handle instantly)
    const left = sec * 1000 - elapsedMs;
    if (started && left <= 0) endSession();
  };

  // Tick timer (to update elapsed & UI live)
  useEffect(() => {
    if (!started) return;

    const id = setInterval(() => {
      setElapsedMs(Date.now() - startTs);
    }, 100);

    return () => clearInterval(id);
  }, [started, startTs]);

  // Auto-end when time is over
  useEffect(() => {
    if (!started) return;
    if (timeLeftMs <= 0) endSession();
  }, [timeLeftMs, started]);

  // Auto-scroll to current character
  useEffect(() => {
    if (!paragraphRef.current) return;
    const container = paragraphRef.current;
    const span = container.querySelector(`#char-${input.length}`);
    if (span) {
      const offsetTop = (span as HTMLElement).offsetTop;
      container.scrollTop = offsetTop - 80;
    }
  }, [input]);

  // Commit current paragraph results + advance
  const commitAndAdvance = () => {
    // Save paragraph result
    const words = input.trim() ? input.trim().split(/\s+/).length : 0;

    const charsTyped = input.length;
    const charsCorrect = currentCorrectChars;

    const res: ParagraphResult = {
      index: idx,
      charsTyped,
      charsCorrect,
      accuracy: charsTyped ? Math.round((charsCorrect / charsTyped) * 100) : 100,
      wordsTyped: words,
    };

    setResults((prev) => [...prev, res]);

    // Update session totals
    setTotalCharsTyped((v) => v + charsTyped);
    setTotalCharsCorrect((v) => v + charsCorrect);
    setTotalWordsTyped((v) => v + words);

    // Advance to next paragraph (if exists), else end session
    if (idx + 1 < paragraphs.length) {
      setIdx((v) => v + 1);
      setInput("");
      if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
    } else {
      endSession();
    }
  };

  // Global key capture (so typing always works)
  useEffect(() => {
    if (!started) return;

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts / modifiers
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key;
      setPressedKey(key);

      // Allow escape to end session quickly
      if (key === "Escape") {
        endSession();
        return;
      }

      // Only prevent default for keys we handle (so browser doesn’t scroll on space/backspace)
      const handled =
        key === "Backspace" ||
        key === "Enter" ||
        key === "Tab" ||
        key === " " ||
        key.length === 1;

      if (handled) e.preventDefault();

      if (key === "Backspace") {
        setInput((prev) => prev.slice(0, -1));
        return;
      }

      // Optional: Enter = “submit paragraph now”
      if (key === "Enter") {
        if (input.length > 0) commitAndAdvance();
        return;
      }

      // Ignore tab (or you can treat it as spaces)
      if (key === "Tab") return;

      // Normal characters (includes space)
      if (key.length === 1) {
        setInput((prev) => {
          const next = prev + key;

          // If paragraph fully typed (length reached), auto-advance
          if (next.length >= paragraph.length) {
            // Commit in next tick (avoid state update ordering issues)
            queueMicrotask(() => commitAndAdvance());
          }

          return next;
        });
      }
    };

    const onKeyUp = () => setPressedKey("");

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, paragraph, input, idx, paragraphs.length, currentCorrectChars]);

  // Upload handling
  const onUpload = async (file: File | null) => {
    if (!file) return;

    const text = await file.text();
    const parsed = splitIntoParagraphs(text);

    if (parsed.length === 0) return;

    setParagraphs(parsed);
    setIdx(0);
    setInput("");
    setResults([]);

    setTotalCharsTyped(0);
    setTotalCharsCorrect(0);
    setTotalWordsTyped(0);

    setStarted(false);
    setFinished(false);
    setElapsedMs(0);
    setPressedKey("");

    if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center gap-5 bg-black min-h-screen text-white">
      <div className="w-full flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-yellow-400">
            FlashTyper (Paragraph Trainer)
          </h1>
          <p className="text-sm text-neutral-400">
            Upload paragraphs → type them consecutively → remember the topic while improving speed.
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

      {/* Controls */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          {[15, 30, 60].map((sec) => (
            <button
              key={sec}
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
          <span className="text-sm text-neutral-400">
            Paragraph: <span className="text-white font-semibold">{idx + 1}</span> /{" "}
            <span className="text-white font-semibold">{paragraphs.length}</span>
          </span>

          {!started && !finished && (
            <button
              onClick={startSession}
              className="px-4 py-2 rounded-xl bg-green-500 text-black font-bold hover:bg-green-600 transition"
            >
              Start
            </button>
          )}

          {started && (
            <button
              onClick={endSession}
              className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-red-400 transition font-semibold"
            >
              End (Esc)
            </button>
          )}

          {finished && (
            <button
              onClick={startSession}
              className="px-4 py-2 rounded-xl bg-yellow-400 text-black font-bold hover:bg-yellow-500 transition"
            >
              Restart
            </button>
          )}
        </div>
      </div>

      {/* Paragraph box */}
      <div
        ref={paragraphRef}
        className="bg-gray-900 p-6 rounded-xl w-full h-72 overflow-y-auto font-mono text-lg whitespace-pre-wrap border border-neutral-800"
      >
        {paragraph.split("").map((char, i) => {
          let cls = "text-gray-500";

          if (i < input.length) {
            cls = input[i] === char ? "text-green-400" : "text-red-400";
          } else if (i === input.length && started) {
            cls = "text-white underline decoration-yellow-400 decoration-2";
          }

          return (
            <span key={i} id={`char-${i}`} className={cls}>
              {char}
            </span>
          );
        })}
      </div>

      {/* Live stats */}
      <div className="w-full grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400">Time Left</div>
          <div className="text-2xl font-bold text-yellow-400">{timeLeftSec}s</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400">Session WPM</div>
          <div className="text-2xl font-bold">{started || finished ? wpm : 0}</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400">Session Accuracy</div>
          <div className="text-2xl font-bold">{started || finished ? accuracy : 100}%</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="text-xs text-neutral-400">Current Accuracy</div>
          <div className="text-2xl font-bold">
            {started ? currentAccuracy : finished ? currentAccuracy : 100}%
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="w-full flex flex-wrap gap-2 items-center justify-between">
        <div className="text-sm text-neutral-400">
          Tip: Press <span className="text-white font-semibold">Enter</span> to submit early and go next.
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (!started) return;
              if (input.length > 0) commitAndAdvance();
            }}
            className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-yellow-400 transition font-semibold"
          >
            Next Paragraph
          </button>

          <button
            onClick={() => {
              setInput("");
              if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
            }}
            className="px-4 py-2 rounded-xl bg-neutral-800 border border-neutral-700 hover:border-neutral-500 transition font-semibold"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="w-full bg-neutral-900 border border-neutral-800 rounded-xl p-4">
          <div className="font-semibold mb-2">Completed Paragraphs</div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {results.map((r) => (
              <div
                key={`${r.index}-${r.charsTyped}-${r.charsCorrect}`}
                className="flex items-center justify-between text-sm bg-black/40 border border-neutral-800 rounded-lg p-2"
              >
                <div className="text-neutral-300">
                  Paragraph <span className="text-white font-semibold">{r.index + 1}</span>
                </div>
                <div className="flex gap-4 text-neutral-300">
                  <span>
                    Acc: <span className="text-white font-semibold">{r.accuracy}%</span>
                  </span>
                  <span>
                    Typed: <span className="text-white font-semibold">{r.charsTyped}</span> chars
                  </span>
                  <span>
                    Words: <span className="text-white font-semibold">{r.wordsTyped}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard */}
      <Keyboard pressedKey={pressedKey} />
    </div>
  );
}
