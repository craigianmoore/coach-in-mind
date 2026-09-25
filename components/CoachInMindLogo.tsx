import Image from "next/image";

// The Coach In Mind mark, shown in a white card so it holds its own
// against either product's header colour. This appears on every page —
// Coach In Mind is the constant; the product underneath it is the
// variable.
//
// The source file is the full lockup — icon, wordmark, AND tagline —
// so it's a tall portrait shape (not square). `size` is the card's
// HEIGHT; width follows the image's own aspect ratio so the tagline
// never gets cramped or cropped.
const LOGO_ASPECT = 370 / 575; // width / height of the source PNG

export default function CoachInMindLogo({ size = 150 }: { size?: number }) {
  const height = size;
  const width = Math.round(size * LOGO_ASPECT);
  return (
    <div
      className="flex-shrink-0 rounded-lg bg-white p-1 shadow-sm"
      style={{ width, height }}
    >
      <Image
        src="/coach-in-mind-logo.png"
        alt="Coach In Mind — shaping coaches minds on & off the pitch"
        width={width}
        height={height}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
