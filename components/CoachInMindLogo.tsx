import Image from "next/image";

// The Coach In Mind mark, shown in a white card so it holds its own
// against either product's header colour. This appears on every page —
// Coach In Mind is the constant; the product underneath it is the
// variable.
export default function CoachInMindLogo({ size = 90 }: { size?: number }) {
  return (
    <div
      className="flex-shrink-0 rounded-lg bg-white p-2 shadow-sm"
      style={{ width: size, height: size * 1.05 }}
    >
      <Image
        src="/coach-in-mind-logo.png"
        alt="Coach In Mind — shaping coaches minds on & off the pitch"
        width={size - 16}
        height={(size - 16) * 1.05}
        className="h-full w-full object-contain"
        priority
      />
    </div>
  );
}
