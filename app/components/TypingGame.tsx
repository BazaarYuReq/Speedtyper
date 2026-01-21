"use client";

import { useEffect, useRef, useState } from "react";
import Keyboard from "../components/Keyboard";

// Multiple paragraphs
const PARAGRAPHS = [
  `
Typing is a skill that improves with regular practice and focus.
Speed and accuracy are both important when you want to become a proficient typist.
Every day you spend a few minutes typing can improve your cognitive processing and finger agility.
This paragraph is designed to simulate a long typing test so you can practice efficiently.
  `,
  `
Consistency beats motivation every time, and the secret is to build a daily habit.
Breaking down large tasks into smaller steps makes them manageable and achievable.
Practicing in focused bursts improves retention and performance over time.
  `,
  `
Next.js and React make UI development fun and interactive.
The more you experiment with different components, the better your understanding becomes.
Building real projects will teach you faster than reading documentation alone.
  `,
];

export default function TypingGame() {
  const [input, setInput] = useState("");
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [pressedKey, setPressedKey] = useState("");
  const [startTime, setStartTime] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [timeLimit, setTimeLimit] = useState(60);
  const [paragraphIndex, setParagraphIndex] = useState(0);
  const paragraphRef = useRef<HTMLDivElement>(null);

  const paragraph = PARAGRAPHS[paragraphIndex].trim().replace(/\n/g, " ");

  // Start or resume the game
  const startGame = (seconds: number = timeLimit) => {
    if (!started) {
      setStarted(true);
      setFinished(false);
      setPressedKey("");
      setStartTime(Date.now());
      setTimeLeft(seconds);
      setTimeLimit(seconds);
      setInput("");
      if (paragraphRef.current) paragraphRef.current.scrollTop = 0;
    } else {
      // Switch timer while typing
      setTimeLeft(seconds);
      setTimeLimit(seconds);
    }
  };

  // Countdown timer
  useEffect(() => {
    if (!started) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          finishGame();
          clearInterval(timer);
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [started]);

  // Finish game
  const finishGame = () => {
    setStarted(false);
    setFinished(true);
  };

  // Global key capture
  useEffect(() => {
    if (!started) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      setPressedKey(e.key);

      if (e.key === "Backspace") {
        setInput((prev) => prev.slice(0, -1));
      } else if (e.key.length === 1) {
        setInput((prev) => {
          const next = prev + e.key;
          if (next.length >= paragraph.length) finishGame();
          return next;
        });
      }
    };

    const handleKeyUp = () => setPressedKey("");

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [started, paragraph]);

  // Scroll to current character
  useEffect(() => {
    if (!paragraphRef.current) return;
    const span = paragraphRef.current.querySelector(`#char-${input.length}`);
    if (span) {
      const offsetTop = (span as HTMLElement).offsetTop;
      paragraphRef.current.scrollTop = offsetTop - 50;
    }
  }, [input]);

  // Stats
  const durationMin = ((Date.now() - startTime) / 60000) || 0.01;
  const wordsTyped = input.trim().split(/\s+/).length;
  const wpm = Math.round(wordsTyped / durationMin);

  const correctChars = paragraph.split("").filter((c, i) => input[i] === c)
    .length;
  const accuracy = input.length ? Math.round((correctChars / input.length) * 100) : 100;

  return (
    <div className="w-full max-w-5xl mx-auto p-4 flex flex-col items-center gap-6 bg-black min-h-screen text-white">
      

      {/* Timer Buttons */}
      <div className="flex gap-4 mt-4">
        {[15, 30, 60].map((sec) => (
          <button
            key={sec}
            onClick={() => startGame(sec)}
            className={`px-5 py-2 rounded-xl font-semibold transition ${
              timeLimit === sec ? "bg-yellow-500 text-black" : "bg-yellow-400 text-black hover:bg-yellow-500"
            }`}
          >
            {sec}s
          </button>
        ))}
      </div>

      {/* Paragraph Navigation */}
      <div className="flex gap-2 mt-4">
        {PARAGRAPHS.map((_, i) => (
          <button
            key={i}
            onClick={() => setParagraphIndex(i)}
            className={`px-3 py-1 rounded-xl text-sm font-semibold transition ${
              paragraphIndex === i ? "bg-green-500 text-black" : "bg-gray-600 text-white hover:bg-gray-700"
            }`}
          >
            Paragraph {i + 1}
          </button>
        ))}
      </div>

      {/* Paragraph */}
      <div
        ref={paragraphRef}
        className="bg-gray-900 p-6 rounded-xl w-full h-72 overflow-y-auto font-mono text-lg whitespace-pre-wrap mt-4"
      >
        {paragraph.split("").map((char, i) => {
          let color = "text-gray-500";

          if (i < input.length) {
            color = input[i] === char ? "text-green-400" : "text-red-400";
          } else if (i === input.length && !finished) {
            color = "text-white underline animate-pulse";
          }

          return (
            <span key={i} id={`char-${i}`} className={color}>
              {char}
            </span>
          );
        })}
      </div>

      {/* Stats */}
      <div className="flex gap-6 mt-4 text-lg">
        <p>
          <span className="font-bold text-yellow-400">WPM:</span> {wpm}
        </p>
        <p>
          <span className="font-bold text-yellow-400">Accuracy:</span> {accuracy}%
        </p>
        <p>
          <span className="font-bold text-yellow-400">Time Left:</span> {timeLeft}s
        </p>
      </div>

      {/* Restart */}
      {finished && (
        <button
          onClick={() => startGame(timeLimit)}
          className="mt-3 px-6 py-2 bg-yellow-400 text-black rounded-xl font-semibold hover:bg-yellow-500 transition"
        >
          Restart
        </button>
      )}

      {/* Keyboard */}
      <Keyboard pressedKey={pressedKey} />
    </div>
  );
}

