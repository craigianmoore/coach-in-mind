"use client";

const countWords = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// Textarea with a live word counter and a hard word limit. Typing or
// pasting past the limit is cut back to the first `maxWords` words.
export default function WordLimitedTextarea({
  value,
  onChange,
  maxWords,
  rows = 3,
  className = "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2",
}: {
  value: string;
  onChange: (v: string) => void;
  maxWords: number;
  rows?: number;
  className?: string;
}) {
  const words = countWords(value);

  function handle(text: string) {
    if (countWords(text) > maxWords) {
      const m = text.match(new RegExp(`^(\\s*\\S+){${maxWords}}`));
      onChange(m ? m[0] : text);
    } else {
      onChange(text);
    }
  }

  return (
    <>
      <textarea value={value} onChange={(e) => handle(e.target.value)} rows={rows} className={className} />
      <p className={`mt-1 text-right text-xs ${words >= maxWords ? "font-semibold text-amber-700" : "text-gray-500"}`}>
        {words} / {maxWords} words
      </p>
    </>
  );
}
