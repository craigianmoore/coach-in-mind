"use client";

import CheckboxGroup from "@/components/CheckboxGroup";
import { MEMBER_FEDERATIONS, REGIONS_BY_STATE } from "@/lib/constants";

// Same idea as the plain CheckboxGroup, but for contexts where regions
// span every Member Federation at once (e.g. a mentor who can serve
// coaches from anywhere) — groups the options under a subheading per
// federation instead of one long undifferentiated list.
export default function GroupedRegionCheckboxGroup({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      {Object.entries(MEMBER_FEDERATIONS).map(([code, label]) => {
        const regions = REGIONS_BY_STATE[code];
        if (!regions || regions.length === 0) return null;
        return (
          <div key={code}>
            <p className="mb-1.5 text-xs font-semibold text-gray-600">{label}</p>
            <CheckboxGroup options={regions} selected={selected} onToggle={onToggle} />
          </div>
        );
      })}
    </div>
  );
}
