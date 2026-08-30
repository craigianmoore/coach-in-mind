"use client";

// A simple, schematic reference map — not survey-accurate geography,
// just enough relative positioning and a few landmark cities to help
// someone who doesn't already know Victorian/Tasmanian geography
// understand roughly where a region actually is.

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3} fill="#191B41" />;
}

function CityLabel({ x, y, name, anchor = "start" }: { x: number; y: number; name: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text x={x} y={y} fontSize={11} fill="#4B5563" textAnchor={anchor} fontFamily="system-ui, sans-serif">
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
      fontWeight={600}
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
    <svg viewBox="0 0 400 320" className="w-full max-w-md">
      {/* Simplified state outline */}
      <path
        d="M 30 40 
           Q 120 15, 220 25
           Q 320 30, 370 60
           Q 385 90, 370 130
           Q 350 180, 300 220
           Q 250 260, 180 275
           Q 100 285, 50 250
           Q 20 200, 25 140
           Q 20 80, 30 40 Z"
        fill="#F7EFDD"
        stroke="#D4AF6A"
        strokeWidth={2}
      />

      {/* Region zones (approximate relative position, not precise borders) */}
      {/* Sunraysia — far NW */}
      <ellipse cx={70} cy={70} rx={45} ry={35} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={70} y={68} name="Sunraysia" />
      <Dot x={65} y={85} />
      <CityLabel x={72} y={88} name="Mildura" />

      {/* Greater Bendigo — north central */}
      <ellipse cx={170} cy={95} rx={40} ry={32} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={170} y={92} name="Greater Bendigo" />
      <Dot x={170} y={108} />
      <CityLabel x={177} y={111} name="Bendigo" />

      {/* Shepparton — north east */}
      <ellipse cx={260} cy={90} rx={38} ry={30} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={260} y={87} name="Shepparton" />
      <Dot x={260} y={102} />
      <CityLabel x={267} y={105} name="Shepparton" />

      {/* Greater Ballarat — west of Melbourne */}
      <ellipse cx={120} cy={165} rx={38} ry={30} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={120} y={163} name="Ballarat" />
      <Dot x={120} y={177} />
      <CityLabel x={127} y={180} name="Ballarat" />

      {/* Melbourne — centre, with quadrant markers */}
      <circle cx={210} cy={175} r={42} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={210} y={150} name="Melbourne" />
      <Dot x={210} y={175} />
      <CityLabel x={217} y={178} name="Melbourne CBD" />
      <text x={195} y={158} fontSize={9} fill="#6B7280" textAnchor="middle">N</text>
      <text x={195} y={198} fontSize={9} fill="#6B7280" textAnchor="middle">S</text>
      <text x={225} y={158} fontSize={9} fill="#6B7280" textAnchor="middle">E</text>
      <text x={225} y={198} fontSize={9} fill="#6B7280" textAnchor="middle">W</text>

      {/* Geelong — SW of Melbourne, coastal */}
      <ellipse cx={155} cy={215} rx={30} ry={24} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={155} y={212} name="Geelong" />
      <Dot x={155} y={224} />
      <CityLabel x={162} y={227} name="Geelong" />

      {/* South West — far SW, Warrnambool area */}
      <ellipse cx={75} cy={230} rx={35} ry={28} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={75} y={215} name="South West" />
      <Dot x={70} y={240} />
      <CityLabel x={77} y={243} name="Warrnambool" />

      {/* Gippsland — E/SE of Melbourne */}
      <ellipse cx={300} cy={200} rx={45} ry={35} fill="#E8791A" fillOpacity={0.12} />
      <RegionLabel x={300} y={185} name="Gippsland" />
      <Dot x={310} y={210} />
      <CityLabel x={317} y={213} name="Bairnsdale" />

      {/* Latrobe Valley — closer in, part of Gippsland belt */}
      <ellipse cx={255} cy={215} rx={30} ry={22} fill="#E8791A" fillOpacity={0.18} />
      <RegionLabel x={255} y={230} name="Latrobe Valley" />
      <Dot x={255} y={205} />
      <CityLabel x={262} y={208} name="Traralgon" />

      <text x={200} y={310} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

function TasmaniaMap() {
  return (
    <svg viewBox="0 0 300 300" className="w-full max-w-sm">
      {/* Simplified island outline */}
      <path
        d="M 150 20
           Q 210 25, 240 60
           Q 260 90, 255 130
           Q 250 170, 230 210
           Q 200 250, 150 265
           Q 100 250, 70 210
           Q 50 170, 45 130
           Q 40 90, 60 60
           Q 90 25, 150 20 Z"
        fill="#ECEEF1"
        stroke="#8B93A3"
        strokeWidth={2}
      />

      {/* North-West */}
      <ellipse cx={100} cy={80} rx={45} ry={35} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={100} y={65} name="North-West" />
      <Dot x={95} y={85} />
      <CityLabel x={102} y={88} name="Burnie" />
      <Dot x={115} y={95} />
      <CityLabel x={122} y={98} name="Devonport" />

      {/* North */}
      <ellipse cx={190} cy={90} rx={45} ry={35} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={190} y={75} name="North" />
      <Dot x={190} y={100} />
      <CityLabel x={197} y={103} name="Launceston" />

      {/* South */}
      <ellipse cx={150} cy={195} rx={55} ry={55} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={150} y={195} name="South" />
      <Dot x={155} y={215} />
      <CityLabel x={162} y={218} name="Hobart" />

      <text x={150} y={288} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
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
