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

      <ellipse cx={43} cy={39} rx={21.1} ry={18} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={53} y={21} name="Sunraysia" anchor="start" />
      <Dot x={43} y={21} />
      <CityLabel x={43} y={39} name="Mildura" />

      <ellipse cx={148} cy={132} rx={32} ry={26} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={148} y={122} name="Greater Bendigo" />
      <Dot x={148} y={132} />
      <CityLabel x={155} y={139} name="Bendigo" />

      <ellipse cx={218} cy={120} rx={21.3} ry={16} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={218} y={110} name="Shepparton" anchor="start" />
      <Dot x={218} y={120} />
      <CityLabel x={225} y={127} name="Wangaratta area" />

      <circle cx={171} cy={185} r={17} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={171} y={175} name="Melbourne" />
      <Dot x={171} y={185} />
      <CityLabel x={178} y={192} name="Melbourne" />

      <ellipse cx={112} cy={172} rx={26} ry={22} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={112} y={162} name="Ballarat" />
      <Dot x={112} y={172} />
      <CityLabel x={105} y={179} name="Ballarat" anchor="end" />

      <ellipse cx={119} cy={193} rx={25.9} ry={18} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={115} y={202} name="Geelong" anchor="end" />
      <Dot x={125} y={202} />
      <CityLabel x={125} y={192} name="Geelong" />

      <ellipse cx={79} cy={193} rx={23.4} ry={18} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={86} y={218} name="South West" anchor="start" />
      <Dot x={79} y={211} />
      <CityLabel x={72} y={218} name="Warrnambool" anchor="end" />

      <ellipse cx={240} cy={182} rx={16} ry={12} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={240} y={172} name="Gippsland" />
      <Dot x={240} y={182} />
      <CityLabel x={247} y={189} name="Bairnsdale" />

      <ellipse cx={215} cy={191} rx={24} ry={16} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={225} y={210} name="Latrobe Valley" anchor="start" />
      <Dot x={218} y={203} />
      <CityLabel x={211} y={210} name="Traralgon" anchor="end" />

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

      <ellipse cx={86} cy={64} rx={39.1} ry={23} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={100} y={19} name="North-West" />
      <Dot x={92} y={44} />
      <CityLabel x={68} y={62} name="Burnie" />
      <Dot x={110} y={52} />
      <CityLabel x={135} y={78} name="Ulverstone" anchor="end" />
      <Dot x={121} y={53} />
      <CityLabel x={127} y={42} name="Devonport" />

      <ellipse cx={196} cy={72} rx={45} ry={30} fill="#191B41" fillOpacity={0.1} />
      <RegionLabel x={210} y={45} name="North" />
      <Dot x={172} y={74} />
      <CityLabel x={178} y={65} name="Launceston" />

      <ellipse cx={148} cy={160} rx={69} ry={60} fill="#191B41" fillOpacity={0.05} />
      <RegionLabel x={148} y={150} name="South" />
      <Dot x={70} y={125} />
      <CityLabel x={65} y={122} name="Queenstown" anchor="end" />
      <Dot x={182} y={185} />
      <CityLabel x={188} y={188} name="Hobart" />
      <Dot x={167} y={180} />
      <CityLabel x={162} y={175} name="New Norfolk" anchor="end" />
      <Dot x={234} y={124} />
      <CityLabel x={229} y={121} name="Coles Bay" anchor="end" />

      <text x={140} y={253} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

function NNSWMap() {
  return (
    <svg viewBox="0 0 260 240" className="w-full max-w-sm">
      {/* Built from general geographic knowledge of the Hunter Region,
          not traced from a source image like the VIC/TAS maps — this
          is NNSWF's actual catchment, a small corner of the state, not
          all of NSW (Football NSW covers Sydney and the rest). */}
      <path
        d="M 60 15
           Q 110 5, 150 20
           Q 190 30, 200 60
           Q 215 85, 210 115
           Q 225 140, 210 165
           Q 195 190, 165 195
           Q 140 210, 110 195
           Q 80 200, 65 175
           Q 40 165, 35 135
           Q 15 115, 25 85
           Q 20 50, 45 30
           Q 45 15, 60 15 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={175} cy={140} rx={29.9} ry={26} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={175} y={122} name="Newcastle" />
      <Dot x={175} y={140} />
      <CityLabel x={182} y={144} name="Newcastle" />

      <ellipse cx={155} cy={188} rx={14} ry={10} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={155} y={178} name="Lake Macquarie" />
      <Dot x={155} y={188} />

      <ellipse cx={195} cy={95} rx={15.6} ry={12} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={195} y={78} name="Port Stephens" />
      <Dot x={195} y={95} />

      <ellipse cx={168} cy={55} rx={27.2} ry={20} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={150} y={22} name="Mid Coast" />
      <Dot x={185} y={45} />

      <ellipse cx={115} cy={138} rx={27.9} ry={22} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={115} y={128} name="Maitland" />
      <Dot x={115} y={138} />

      <ellipse cx={75} cy={158} rx={22.4} ry={19} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={75} y={148} name="Cessnock" />
      <Dot x={75} y={158} />

      <ellipse cx={90} cy={98} rx={26} ry={22} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={90} y={88} name="Singleton" />
      <Dot x={90} y={98} />

      <ellipse cx={70} cy={53} rx={27.9} ry={22} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={70} y={43} name="Muswellbrook" />
      <Dot x={70} y={53} />

      <text x={130} y={228} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — NNSWF catchment, not all of NSW
      </text>
    </svg>
  );
}

export default function RegionMap({ state }: { state: string }) {
  if (state === "NNSW") return <NNSWMap />;
  if (state === "VIC") return <VictoriaMap />;
  if (state === "TAS") return <TasmaniaMap />;
  return null;
}
