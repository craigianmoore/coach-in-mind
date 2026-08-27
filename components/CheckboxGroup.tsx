export default function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: readonly string[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-3">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={selected.includes(opt)} onChange={() => onToggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}
