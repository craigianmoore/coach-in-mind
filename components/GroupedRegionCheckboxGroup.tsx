"use client";

import CheckboxGroup from "@/components/CheckboxGroup";
import { MEMBER_FEDERATIONS, REGIONS_BY_STATE } from "@/lib/constants";

// Same idea as the plain CheckboxGroup, but for contexts where regions
// span every Member Federation at once (e.g. a mentor who can serve
// coaches from anywhere) — groups the options under a subheading per
// federation, with a "select all" checkbox for that federation's
// regions, instead of one long undifferentiated list.
export default function GroupedRegionCheckboxGroup({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  function toggleGroup(regions: readonly string[], allSelected: boolean) {
    // onToggle is a pure flip, so only touch the regions that actually
    // need to change — flip the unselected ones on, or the selected
    // ones off, leaving everything else untouched.
    const targets = allSelected
      ? regions.filter((r) => selected.includes(r))
      : regions.filter((r) => !selected.includes(r));
    targets.forEach((r) => onToggle(r));
  }

  return (
    <div className="flex flex-col gap-4">
      {Object.entries(MEMBER_FEDERATIONS).map(([code, label]) => {
        const regions = REGIONS_BY_STATE[code];
        if (!regions || regions.length === 0) return null;
        const allSelected = regions.every((r) => selected.includes(r));
        return (
          <div key={code}>
            <div className="mb-1.5 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-600">{label}</p>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => toggleGroup(regions, allSelected)}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                />
                Select all
              </label>
            </div>
            <CheckboxGroup options={regions} selected={selected} onToggle={onToggle} />
          </div>
        );
      })}
    </div>
  );
}
