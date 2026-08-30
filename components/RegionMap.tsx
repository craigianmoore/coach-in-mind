"use client";

// Outlines traced directly from real reference maps of Victoria and
// Tasmania (contour-detected and smoothed from the source images),
// with city positions matched from the same source. Still simplified
// for a clean schematic look, but genuinely shaped like each state.

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill="#191B41" />;
}

function CityLabel({ x, y, name, anchor = "start" }: { x: number; y: number; name: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fontSize={10.5} fill="#4B5563" textAnchor={anchor} fontFamily="system-ui, sans-serif">
      {name}
    </text>
  );
}

function RegionLabel({ x, y, name, anchor = "middle" }: { x: number; y: number; name: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text
      x={x}
      y={y}
      fontSize={12}
      fontWeight={700}
      fill="#191B41"
      textAnchor={anchor}
      fontFamily="system-ui, sans-serif"
    >
      {name}
    </text>
  );
}

function VictoriaMap() {
  return (
    <svg viewBox="0 0 340 245" className="w-full max-w-md">
      <path
        d="M 35.0 16.6 Q 15.0 15.0, 15.0 104.6 Q 15.0 194.2, 22.2 201.1 Q 29.5 208.0, 55.1 208.4
           Q 80.7 208.9, 93.7 218.5 Q 106.7 228.1, 132.6 209.1 Q 158.5 190.1, 177.5 210.1
           Q 196.5 230.0, 224.2 207.8 Q 252.0 185.7, 288.5 180.6 Q 325.0 175.6, 297.6 156.8
           Q 270.1 137.9, 264.9 119.8 Q 259.6 101.8, 201.9 103.5 Q 144.1 105.2, 118.4 74.5
           Q 92.8 43.9, 80.0 42.2 Q 67.2 40.5, 61.2 29.3 Q 55.1 18.1, 35.0 16.6 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={43} cy={40} rx={28} ry={24} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={43} y={36} name="Sunraysia" />
      <Dot x={43} y={21} />
      <CityLabel x={48} y={24} name="Mildura" />

      <ellipse cx={148} cy={132} rx={32} ry={26} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={148} y={113} name="Greater Bendigo" />
      <Dot x={148} y={132} />
      <CityLabel x={154} y={136} name="Bendigo" />

      <ellipse cx={218} cy={120} rx={32} ry={24} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={218} y={103} name="Shepparton" />
      <Dot x={218} y={120} />
      <CityLabel x={195} y={95} name="Wangaratta area" />

      <circle cx={171} cy={185} r={28} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={171} y={168} name="Melbourne" />
      <Dot x={171} y={185} />
      <CityLabel x={177} y={188} name="Melbourne CBD" />

      <ellipse cx={105} cy={165} rx={26} ry={22} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={105} y={148} name="Ballarat" />
      <Dot x={112} y={172} />
      <CityLabel x={70} y={172} name="Ballarat" />

      <ellipse cx={125} cy={202} rx={26} ry={18} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={125} y={200} name="Geelong" />
      <Dot x={125} y={202} />
      <CityLabel x={107} y={216} name="Geelong" />

      <ellipse cx={65} cy={195} rx={26} ry={20} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={65} y={178} name="South West" />
      <Dot x={79} y={211} />
      <CityLabel x={20} y={222} name="Warrnambool" />

      <ellipse cx={248} cy={172} rx={32} ry={24} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={248} y={155} name="Gippsland" />
      <Dot x={240} y={182} />
      <CityLabel x={245} y={200} name="Bairnsdale" />

      <ellipse cx={210} cy={205} rx={24} ry={16} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={195} y={225} name="Latrobe Valley" />
      <Dot x={218} y={203} />
      <CityLabel x={175} y={200} name="Traralgon" />

      <text x={175} y={238} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

function TasmaniaMap() {
  return (
    <svg viewBox="0 0 280 260" className="w-full max-w-sm">
      <path
        d="M 68.0 34.1 Q 15.0 15.0, 33.9 91.0 Q 52.8 167.1, 77.2 203.1 Q 101.6 239.0, 128.4 242.0
           Q 155.3 245.0, 163.8 232.1 Q 172.2 219.1, 177.2 227.4 Q 182.2 235.8, 191.1 211.7
           Q 200.0 187.5, 212.3 200.0 Q 224.7 212.5, 228.6 170.2 Q 232.5 128.0, 248.8 126.5
           Q 265.0 125.1, 255.4 122.7 Q 245.9 120.2, 244.2 74.5 Q 242.5 28.8, 181.7 41.0
           Q 120.9 53.2, 68.0 34.1 Z"
        fill="#ECEEF1"
        stroke="#6B7280"
        strokeWidth={2}
      />

      <ellipse cx={100} cy={45} rx={48} ry={28} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={100} y={28} name="North-West" />
      <Dot x={92} y={44} />
      <CityLabel x={68} y={57} name="Burnie" />
      <Dot x={110} y={52} />
      <CityLabel x={112} y={65} name="Ulverstone" />
      <Dot x={121} y={53} />
      <CityLabel x={127} y={50} name="Devonport" />

      <ellipse cx={195} cy={65} rx={45} ry={30} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={195} y={47} name="North" />
      <Dot x={172} y={74} />
      <CityLabel x={178} y={70} name="Launceston" />

      <ellipse cx={148} cy={160} rx={75} ry={65} fill="#191B41" fillOpacity={0.05} />
      <RegionLabel x={148} y={150} name="South" />
      <Dot x={70} y={125} />
      <CityLabel x={30} y={122} name="Queenstown" />
      <Dot x={182} y={185} />
      <CityLabel x={188} y={188} name="Hobart" />
      <Dot x={167} y={180} />
      <CityLabel x={110} y={178} name="New Norfolk" />
      <Dot x={234} y={124} />
      <CityLabel x={200} y={121} name="Coles Bay" />

      <text x={140} y={253} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

export default function RegionMap({ state }: { state: string }) {
  if (state === "VIC") return <VictoriaMap />;
  if (state === "TAS") return <TasmaniaMap />;
  return null;
}
