"use client";

// A simple, schematic reference map — not traced from official
// boundary data (Football Victoria/Football Tasmania don't publish
// that as something I can pull in), but built to be a recognisable
// approximation of each state's actual shape, with regions as
// adjoining bounded areas rather than floating circles.

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
      fontSize={13}
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
    <svg viewBox="0 0 420 300" className="w-full max-w-md">
      <path
        d="M 25 55
           L 130 40
           L 250 35
           L 340 45
           Q 385 55, 400 75
           Q 410 95, 395 115
           L 370 150
           Q 400 175, 385 195
           Q 355 220, 300 205
           Q 275 235, 235 250
           Q 200 260, 175 240
           Q 130 250, 95 220
           Q 60 195, 55 160
           Q 30 150, 20 115
           Q 15 80, 25 55 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <path d="M 25 55 L 130 40 L 140 100 L 90 115 L 55 90 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={80} y={75} name="Sunraysia" />
      <Dot x={60} y={85} />
      <CityLabel x={40} y={100} name="Mildura" />

      <path d="M 130 40 L 250 35 L 245 95 L 140 100 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={195} y={65} name="Greater Bendigo" />
      <Dot x={195} y={80} />
      <CityLabel x={175} y={95} name="Bendigo" />

      <path d="M 250 35 L 340 45 Q 385 55, 400 75 Q 405 95, 385 105 L 300 100 L 245 95 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={315} y={65} name="Shepparton" />
      <Dot x={310} y={78} />
      <CityLabel x={290} y={93} name="Shepparton" />

      <path d="M 140 100 L 245 95 L 250 155 L 155 165 Z" fill="#191B41" fillOpacity={0.07} />
      <RegionLabel x={198} y={125} name="Melbourne" />
      <Dot x={198} y={140} />
      <CityLabel x={168} y={155} name="Melbourne CBD" />

      <path d="M 90 115 L 140 100 L 155 165 L 95 175 L 55 160 Q 55 130, 90 115 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={100} y={140} name="Ballarat" />
      <Dot x={100} y={152} />
      <CityLabel x={78} y={167} name="Ballarat" />

      <path d="M 95 175 L 155 165 L 150 210 Q 120 225, 95 220 Q 75 200, 95 175 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={118} y={195} name="Geelong" />
      <Dot x={120} y={205} />
      <CityLabel x={128} y={218} name="Geelong" />

      <path d="M 55 160 L 95 175 Q 75 200, 95 220 Q 100 245, 65 250 Q 35 235, 30 200 Q 30 175, 55 160 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={65} y={200} name="South West" />
      <Dot x={58} y={225} />
      <CityLabel x={38} y={240} name="Warrnambool" />

      <path d="M 245 95 L 300 100 L 385 105 Q 390 130, 370 150 L 350 160 L 250 155 Z" fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={310} y={125} name="Latrobe Valley" />
      <Dot x={305} y={135} />
      <CityLabel x={283} y={150} name="Traralgon" />

      <path d="M 350 160 L 370 150 Q 400 175, 385 195 Q 355 220, 300 205 Q 275 190, 250 175 L 250 155 L 350 160 Z" fill="#E8791A" fillOpacity={0.14} />
      <RegionLabel x={330} y={185} name="Gippsland" />
      <Dot x={335} y={198} />
      <CityLabel x={343} y={200} name="Bairnsdale" />

      <text x={210} y={288} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

function TasmaniaMap() {
  return (
    <svg viewBox="0 0 280 280" className="w-full max-w-sm">
      <path
        d="M 140 15
           Q 175 18, 195 40
           L 225 55
           Q 245 70, 240 95
           Q 250 115, 235 140
           Q 245 165, 220 190
           Q 225 210, 195 225
           L 200 245
           Q 185 260, 165 245
           Q 140 265, 115 245
           Q 90 255, 80 230
           Q 55 220, 55 195
           Q 35 180, 40 155
           Q 25 135, 40 110
           Q 35 85, 60 65
           Q 65 40, 95 30
           Q 110 15, 140 15 Z"
        fill="#ECEEF1"
        stroke="#6B7280"
        strokeWidth={2}
      />

      <path d="M 60 65 Q 95 30, 140 15 Q 145 50, 130 75 L 90 90 Q 65 85, 60 65 Z" fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={95} y={48} name="North-West" />
      <Dot x={78} y={68} />
      <CityLabel x={58} y={80} name="Burnie" />
      <Dot x={100} y={75} />
      <CityLabel x={106} y={72} name="Devonport" />

      <path d="M 140 15 Q 175 18, 195 40 L 225 55 Q 220 80, 195 90 L 130 75 Q 145 50, 140 15 Z" fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={180} y={50} name="North" />
      <Dot x={175} y={65} />
      <CityLabel x={182} y={62} name="Launceston" />

      <path
        d="M 90 90 L 130 75 L 195 90 Q 235 100, 240 95 Q 250 115, 235 140 Q 245 165, 220 190 Q 225 210, 195 225 L 200 245 Q 185 260, 165 245 Q 140 265, 115 245 Q 90 255, 80 230 Q 55 220, 55 195 Q 35 180, 40 155 Q 25 135, 40 110 Q 60 100, 90 90 Z"
        fill="#191B41"
        fillOpacity={0.06}
      />
      <RegionLabel x={145} y={165} name="South" />
      <Dot x={148} y={195} />
      <CityLabel x={155} y={198} name="Hobart" />

      <text x={140} y={272} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
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
