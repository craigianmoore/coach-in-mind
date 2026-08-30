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

function SAMap() {
  return (
    <svg viewBox="0 0 220 260" className="w-full max-w-sm">
      {/* Built from general geographic knowledge of Adelaide metro,
          not traced from a source image — no reference map was
          available for this one, unlike VIC/TAS. Coast runs down the
          west side, Adelaide Hills form the uneven eastern edge. */}
      <path
        d="M 100 10 Q 130 8, 150 25 Q 175 40, 170 70 Q 190 90, 175 115
           Q 195 140, 175 165 Q 190 190, 165 210 Q 175 235, 145 245
           Q 110 250, 90 230 Q 60 225, 55 195 Q 30 180, 40 150
           Q 15 130, 30 100 Q 20 70, 45 50 Q 40 25, 70 15 Q 85 8, 100 10 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={100} cy={130} rx={24} ry={19.2} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={100} y={130} name="Adelaide CBD" />

      <ellipse cx={100} cy={42} rx={24} ry={19.2} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={100} y={42} name="Northern Adelaide" />

      <ellipse cx={155} cy={72} rx={16} ry={12.8} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={155} y={72} name="North Eastern Adelaide" anchor="end" />

      <ellipse cx={150} cy={150} rx={24} ry={19.2} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={150} y={160} name="Eastern Adelaide" />

      <ellipse cx={100} cy={222} rx={12} ry={9.6} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={100} y={222} name="Southern Adelaide" />

      <ellipse cx={58} cy={148} rx={20} ry={16} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={58} y={182} name="Western Adelaide" anchor="start" />

      <text x={110} y={13} fontSize={9.5} fill="#9CA3AF" textAnchor="middle">
        Gulf St Vincent →
      </text>
      <text x={110} y={252} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — not to scale
      </text>
    </svg>
  );
}

function NTMap() {
  return (
    <svg viewBox="0 0 220 260" className="w-full max-w-sm">
      {/* Zoomed to Darwin metro, not the full Northern Territory —
          every current NT club is Darwin/Casuarina/Palmerston, and a
          full-territory view would leave the whole map empty except
          one tiny corner. Built from general geographic knowledge,
          not traced from a source image at this zoom level. */}
      <path
        d="M 90 20 Q 130 15, 150 40 Q 175 55, 170 85
           Q 195 105, 190 135 Q 210 160, 195 190
           Q 200 220, 170 235 Q 150 250, 120 240
           Q 90 245, 70 220 Q 45 210, 45 180
           Q 20 165, 30 135 Q 15 110, 35 85
           Q 30 55, 60 40 Q 65 20, 90 20 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={91} cy={61} rx={26} ry={20.8} fill="#191B41" fillOpacity={0.08} />
      <RegionLabel x={91} y={61} name="Darwin" />

      <ellipse cx={141} cy={81} rx={26} ry={20.8} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={141} y={81} name="Casuarina" anchor="start" />

      <ellipse cx={151} cy={161} rx={26} ry={20.8} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={151} y={161} name="Palmerston" />

      <text x={110} y={252} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — Darwin metro, not the full NT
      </text>
    </svg>
  );
}

function WAMap() {
  return (
    <svg viewBox="0 0 220 350" className="w-full max-w-sm">
      {/* Zoomed to Perth metro, not the full state — every current WA
          club is Perth metro or Mandurah, and a full-state view would
          leave the whole map empty except one tiny corner in the far
          south. Built from general geographic knowledge, not traced
          from a source image at this zoom level. */}
      <path
        d="M 100 15 Q 140 12, 155 40 Q 180 55, 175 85
           Q 195 105, 185 135 Q 200 160, 180 190
           Q 190 220, 165 245 Q 175 275, 145 295
           Q 150 320, 120 330 Q 90 335, 75 310
           Q 50 300, 55 270 Q 30 255, 40 225
           Q 15 205, 35 175 Q 20 145, 45 120
           Q 35 90, 60 70 Q 55 40, 85 25 Q 90 15, 100 15 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={111} cy={61} rx={26} ry={20.8} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={111} y={61} name="Northern Suburbs" />

      <ellipse cx={156} cy={141} rx={26} ry={20.8} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={156} y={141} name="Eastern Suburbs" />

      <Dot x={101} y={161} />
      <CityLabel x={101} y={182} name="Perth" anchor="middle" />

      <ellipse cx={61} cy={151} rx={26} ry={20.8} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={61} y={117} name="Western Suburbs" />

      <ellipse cx={101} cy={231} rx={26} ry={20.8} fill="#191B41" fillOpacity={0.06} />
      <RegionLabel x={101} y={231} name="Southern Suburbs" />

      <ellipse cx={111} cy={301} rx={26} ry={20.8} fill="#E8791A" fillOpacity={0.15} />
      <RegionLabel x={111} y={301} name="Mandurah / Peel" />

      <text x={110} y={342} fontSize={10} fill="#9CA3AF" textAnchor="middle" fontStyle="italic">
        Schematic reference only — Perth metro, not the full state
      </text>
    </svg>
  );
}

function QLDMap() {
  return (
    <svg viewBox="0 0 300 335" className="w-full max-w-md">
      {/* Outline traced from a real reference map (contour-detected
          and smoothed), same rigour as VIC/TAS. South Coast (NSW) —
          three border clubs geographically in NSW but playing in
          Football Queensland's competitions — isn't shown as its own
          marker; the south-east corner is already at capacity with
          the other nine zones. */}
      <path
        d="M 100.7 16.1 Q 92.4 5.1, 81.8 63.6 Q 71.1 122.1, 61.0 123.2
           Q 51.0 124.2, 49.4 114.9 Q 47.7 105.6, 36.2 107.7
           Q 24.6 109.8, 24.8 190.3 Q 24.9 270.9, 48.8 270.9
           Q 72.6 270.9, 73.3 297.0 Q 74.1 323.1, 150.6 319.5
           Q 227.1 315.9, 236.4 320.4 Q 245.7 324.9, 259.5 318.3
           Q 273.3 311.7, 273.0 284.7 Q 272.7 257.7, 253.3 242.4
           Q 234.0 227.1, 232.5 217.9 Q 231.0 208.8, 222.0 206.9
           Q 213.0 204.9, 207.2 186.8 Q 201.3 168.6, 180.8 158.6
           Q 160.2 148.5, 151.5 113.5 Q 142.8 78.6, 130.4 73.3
           Q 117.9 68.1, 113.4 47.5 Q 108.9 27.0, 100.7 16.1 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={151} cy={113} rx={14} ry={11.9} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={151} y={113} />
      <RegionLabel x={151} y={99} name="Far North &amp; Gulf" />

      <ellipse cx={168} cy={154} rx={14} ry={11.9} fill="#191B41" fillOpacity={0.06} />
      <Dot x={168} y={154} />
      <RegionLabel x={168} y={140} name="Northern" />

      <ellipse cx={207} cy={186} rx={12} ry={10.2} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={207} y={186} />
      <RegionLabel x={193} y={186} name="Whitsunday Coast" anchor="end" />

      <ellipse cx={225} cy={219} rx={12} ry={10.2} fill="#191B41" fillOpacity={0.06} />
      <Dot x={225} y={219} />
      <RegionLabel x={211} y={219} name="Central Coast" anchor="end" />

      <ellipse cx={248} cy={254} rx={12} ry={10.2} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={248} y={254} />
      <RegionLabel x={248} y={240} name="Wide Bay" />

      <ellipse cx={258} cy={265} rx={10} ry={8.5} fill="#191B41" fillOpacity={0.06} />
      <Dot x={258} y={265} />
      <RegionLabel x={238} y={265} name="Sunshine Coast" anchor="end" />

      <ellipse cx={250} cy={285} rx={14} ry={11.9} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={250} y={285} />
      <RegionLabel x={236} y={285} name="Metro" anchor="end" />

      <ellipse cx={259} cy={300} rx={10} ry={8.5} fill="#191B41" fillOpacity={0.06} />
      <Dot x={259} y={300} />
      <RegionLabel x={259} y={320} name="South Coast" anchor="end" />

      <ellipse cx={220} cy={300} rx={12} ry={10.2} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={220} y={300} />
      <RegionLabel x={194} y={300} name="Darling Downs" anchor="end" />
    </svg>
  );
}

export default function RegionMap({ state }: { state: string }) {
  if (state === "NNSW") return <NNSWMap />;
  if (state === "SA") return <SAMap />;
  if (state === "NT") return <NTMap />;
  if (state === "WA") return <WAMap />;
  if (state === "QLD") return <QLDMap />;
  if (state === "VIC") return <VictoriaMap />;
  if (state === "TAS") return <TasmaniaMap />;
  return null;
}
