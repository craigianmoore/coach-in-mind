// Shared by the profile forms: when a required answer is missing, the form scrolls back to that exact question,
// outlines it and shows this message, instead of leaving the person at the Save button wondering what happened.
export type Missing = { id: string; msg: string } | null;

// Outline for the question that needs completing.
export const missingCls = (missing: Missing, id: string) =>
  missing?.id === id ? "rounded-lg ring-2 ring-red-500 ring-offset-4 bg-red-50/40" : "";

export function FieldMsg({ missing, id }: { missing: Missing; id: string }) {
  return missing?.id === id ? (
    <p role="alert" className="mt-2 text-sm font-semibold text-red-600">
      {missing.msg}
    </p>
  ) : null;
}

// Scrolls the question into the middle of the screen and moves focus to its first input.
export function scrollToField(id: string) {
  if (typeof document === "undefined") return;
  // Wait a tick so the outline and message have rendered before measuring.
  setTimeout(() => {
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = el.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button");
    input?.focus({ preventScroll: true });
  }, 30);
}
