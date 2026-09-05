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
      <Dot x={43} y={21} />
      <RegionLabel x={55} y={21} name="Sunraysia" anchor="start" />

      <ellipse cx={148} cy={132} rx={32} ry={26} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={148} y={132} />
      <RegionLabel x={148} y={120} name="Greater Bendigo" />

      <ellipse cx={218} cy={120} rx={21.3} ry={16} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={218} y={120} />
      <RegionLabel x={218} y={108} name="Shepparton" anchor="start" />

      <circle cx={171} cy={185} r={17} fill="#191B41" fillOpacity={0.08} />
      <Dot x={171} y={185} />
      <RegionLabel x={171} y={173} name="Melbourne" />

      <ellipse cx={112} cy={172} rx={26} ry={22} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={112} y={172} />
      <RegionLabel x={112} y={160} name="Ballarat" anchor="end" />

      <ellipse cx={119} cy={193} rx={25.9} ry={18} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={125} y={202} />
      <RegionLabel x={133.5} y={210.5} name="Geelong" anchor="start" />

      <ellipse cx={79} cy={193} rx={23.4} ry={18} fill="#191B41" fillOpacity={0.06} />
      <Dot x={79} y={211} />
      <RegionLabel x={79} y={199} name="South West" />

      <ellipse cx={240} cy={182} rx={16} ry={12} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={240} y={182} />
      <RegionLabel x={240} y={170} name="Gippsland" anchor="start" />

      <ellipse cx={215} cy={191} rx={24} ry={16} fill="#191B41" fillOpacity={0.1} />
      <Dot x={218} y={203} />
      <RegionLabel x={230} y={203} name="Latrobe Valley" anchor="start" />
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
    </svg>
  );
}

// Shared NSW outline — contour-traced and smoothed from a real
// reference map, used by both NNSWMap and NSWMap since Northern NSW
// Football and Football NSW are both geographically within NSW, just
// different federations covering different parts of it.
const NSW_OUTLINE_PATH =
  "M 292.0 52.5 Q 299.2 8.6, 282.7 11.1 Q 266.2 13.5, 264.9 9.8 Q 263.5 6.2, 259.1 17.7 " +
  "Q 254.6 29.2, 232.3 21.9 Q 210.1 14.6, 201.6 22.6 Q 193.1 30.5, 104.6 30.5 " +
  "Q 16.2 30.5, 15.1 101.4 Q 14.0 172.3, 27.9 171.9 Q 41.9 171.5, 43.1 178.2 " +
  "Q 44.3 185.0, 54.5 184.7 Q 64.8 184.4, 73.4 199.4 Q 82.1 214.4, 89.9 217.8 " +
  "Q 97.7 221.1, 119.3 220.3 Q 140.9 219.5, 145.9 228.7 Q 150.9 237.9, 154.6 231.0 " +
  "Q 158.2 224.1, 166.1 224.2 Q 173.9 224.4, 175.7 231.8 Q 177.4 239.2, 197.7 248.4 " +
  "Q 217.9 257.6, 228.6 215.2 Q 239.2 172.8, 262.0 134.6 Q 284.9 96.4, 292.0 52.5 Z";

function NNSWMap() {
  return (
    <svg viewBox="0 0 324 258" className="w-full max-w-md">
      {/* Real NSW outline (contour-traced from a source image), not a
          zoomed Hunter-only blob like before. The dropdown still has
          all 8 real Hunter-area names (Newcastle, Lake Macquarie,
          Maitland, Cessnock, Port Stephens, Singleton, Muswellbrook,
          Mid Coast) — cramming all 8 onto the map at this scale isn't
          legible, so it shows the two that anchor the real spread. */}
      <path d={NSW_OUTLINE_PATH} fill="#F7EFDD" stroke="#B8935A" strokeWidth={2} />

      <ellipse cx={242} cy={127} rx={16} ry={13.6} fill="#191B41" fillOpacity={0.08} />
      <Dot x={242} y={127} />
      <RegionLabel x={242} y={113} name="Hunter Region" anchor="end" />

      <ellipse cx={260} cy={102} rx={10} ry={8.5} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={260} y={102} />
      <RegionLabel x={260} y={88} name="Mid Coast" />
    </svg>
  );
}

function NSWMap() {
  return (
    <svg viewBox="0 0 324 258" className="w-full max-w-md">
      {/* Same real traced NSW outline as NNSWMap. Sydney metro's 13
          association-level regions aren't individually shown — too
          dense to fit legibly at this scale — but the three regional
          branches and Sydney's overall position are all real. */}
      <path d={NSW_OUTLINE_PATH} fill="#F7EFDD" stroke="#B8935A" strokeWidth={2} />

      <ellipse cx={227} cy={175} rx={14} ry={11.9} fill="#191B41" fillOpacity={0.08} />
      <Dot x={227} y={175} />
      <RegionLabel x={227} y={161} name="Sydney" />

      <ellipse cx={159} cy={109} rx={16} ry={13.6} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={159} y={109} />
      <RegionLabel x={159} y={95} name="Central-West NSW" />

      <ellipse cx={133} cy={197} rx={16} ry={13.6} fill="#191B41" fillOpacity={0.06} />
      <Dot x={133} y={197} />
      <RegionLabel x={133} y={183} name="Riverina" />

      <ellipse cx={219} cy={199} rx={12} ry={10.2} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={219} y={199} />
      <RegionLabel x={233} y={199} name="Southern NSW" anchor="start" />
    </svg>
  );
}

function SAMap() {
  return (
    <svg viewBox="0 0 300 260" className="w-full max-w-md">
      {/* Real SA outline (contour-traced from a source image), not
          the general-knowledge shape used before. Adelaide's 6 metro
          sub-regions aren't individually shown — this corner is too
          narrow (a peninsula tip) to fit them legibly — but they're
          still all real, selectable options in the dropdown. */}
      <path
        d="M 152.2 15.8 Q 25.5 16.0, 25.8 84.4 Q 26.0 152.8, 50.0 151.0
           Q 74.0 149.2, 82.8 155.5 Q 91.5 161.8, 108.0 163.2
           Q 124.5 164.5, 130.5 169.3 Q 136.5 174.2, 136.7 181.7
           Q 136.8 189.2, 142.2 190.1 Q 147.5 191.0, 154.2 207.9
           Q 160.8 224.8, 165.8 225.3 Q 170.8 225.8, 176.3 218.8
           Q 181.8 211.8, 190.7 206.8 Q 199.5 201.8, 201.3 193.4
           Q 203.2 185.0, 208.8 185.0 Q 214.5 185.0, 214.0 193.4
           Q 213.5 201.8, 209.3 208.4 Q 205.2 215.0, 205.0 226.6
           Q 204.8 238.2, 207.5 238.0 Q 210.2 237.8, 212.6 229.5
           Q 215.0 221.2, 218.2 221.3 Q 221.5 221.5, 224.5 227.3
           Q 227.5 233.2, 230.0 233.1 Q 232.5 233.0, 233.3 228.5
           Q 234.2 224.0, 242.5 224.0 Q 250.8 224.0, 256.6 230.2
           Q 262.5 236.5, 270.6 236.7 Q 278.8 236.8, 278.9 126.2
           Q 279.0 15.5, 152.2 15.8 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={227} cy={210} rx={16} ry={13} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={227} y={210} />
      <RegionLabel x={227} y={196} name="Adelaide" />
    </svg>
  );
}

function NTMap() {
  return (
    <svg viewBox="0 0 224 285" className="w-full max-w-sm">
      {/* Real NT outline (contour-traced from a source image), not
          the general-knowledge shape used before. Casuarina and
          Palmerston aren't individually shown — Darwin metro is too
          small a dot on the real territory shape to separate them
          legibly — but both are still real, selectable regions. */}
      <path
        d="M 98.4 13.3 Q 94.6 13.4, 92.9 23.9 Q 91.3 34.4, 74.3 34.1
           Q 57.4 33.9, 52.5 42.5 Q 47.6 51.2, 45.9 63.1
           Q 44.2 75.0, 40.0 76.7 Q 35.8 78.4, 35.7 173.8
           Q 35.6 269.1, 109.6 269.5 Q 183.7 269.9, 183.9 186.0
           Q 184.2 102.2, 164.3 88.8 Q 144.5 75.3, 147.7 60.8
           Q 150.9 46.2, 155.7 43.8 Q 160.4 41.4, 162.8 34.9
           Q 165.2 28.3, 153.7 26.6 Q 142.2 24.9, 141.5 27.0
           Q 140.8 29.1, 133.1 29.1 Q 125.4 29.1, 113.8 21.1
           Q 102.2 13.2, 98.4 13.3 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={66} cy={47} rx={14} ry={11.2} fill="#191B41" fillOpacity={0.08} />
      <Dot x={66} y={30} />
      <RegionLabel x={74} y={33} name="Darwin" anchor="start" />
    </svg>
  );
}

function WAMap() {
  return (
    <svg viewBox="0 0 250 300" className="w-full max-w-sm">
      {/* Real WA outline (contour-traced from a source image), not
          the general-knowledge shape used before. The 4 Perth suburb
          quadrants aren't individually shown — Perth metro is a small
          dot in the far SW corner of an enormous state, too small to
          separate them legibly — but all remain real, selectable
          regions, along with Mandurah / Peel. */}
      <path
        d="M 208.5 15.2 Q 204.0 9.2, 192.6 14.1 Q 181.2 19.0, 176.2 30.4
           Q 171.2 41.8, 167.0 42.4 Q 162.8 43.0, 162.2 48.4
           Q 161.5 53.8, 155.8 50.9 Q 150.0 48.0, 146.5 49.4
           Q 143.0 50.8, 142.0 58.8 Q 141.0 66.8, 133.9 76.3
           Q 126.8 85.8, 108.7 91.3 Q 90.5 96.8, 89.8 101.3
           Q 89.2 105.8, 78.3 104.4 Q 67.5 103.0, 51.9 114.8
           Q 36.2 126.5, 33.9 138.8 Q 31.5 151.0, 34.1 151.9
           Q 36.8 152.8, 39.1 161.2 Q 41.5 169.5, 38.9 177.2
           Q 36.2 185.0, 48.5 218.4 Q 60.8 251.8, 60.4 264.1
           Q 60.0 276.5, 55.5 279.6 Q 51.0 282.8, 57.4 287.4
           Q 63.8 292.0, 75.3 293.2 Q 86.8 294.5, 98.9 287.1
           Q 111.0 279.8, 133.4 279.5 Q 155.8 279.2, 159.9 273.2
           Q 164.0 267.2, 174.5 262.4 Q 185.0 257.5, 204.1 253.2
           Q 223.2 249.0, 223.2 135.4 Q 223.2 21.8, 218.1 21.5
           Q 213.0 21.2, 208.5 15.2 Z"
        fill="#F7EFDD"
        stroke="#B8935A"
        strokeWidth={2}
      />

      <ellipse cx={73} cy={252} rx={14} ry={11.9} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={61} y={254} />
      <RegionLabel x={65} y={241} name="Perth" anchor="start" />
      <CityLabel x={45} y={272} name="Mandurah" />
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

      <ellipse cx={141} cy={113} rx={10} ry={8.5} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={141} y={113} />
      <RegionLabel x={141} y={99} name="Far North &amp; Gulf" />

      <ellipse cx={164} cy={158} rx={10} ry={8.5} fill="#191B41" fillOpacity={0.06} />
      <Dot x={164} y={158} />
      <RegionLabel x={164} y={144} name="Northern" />

      <ellipse cx={199} cy={190} rx={9} ry={7.6} fill="#E8791A" fillOpacity={0.15} />
      <Dot x={199} y={190} />
      <RegionLabel x={185} y={190} name="Whitsunday Coast" anchor="end" />

      <ellipse cx={223} cy={219} rx={9} ry={7.6} fill="#191B41" fillOpacity={0.06} />
      <Dot x={223} y={219} />
      <RegionLabel x={209} y={219} name="Central Coast" anchor="end" />

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
  if (state === "NSW") return <NSWMap />;
  if (state === "SA") return <SAMap />;
  if (state === "NT") return <NTMap />;
  if (state === "WA") return <WAMap />;
  if (state === "QLD") return <QLDMap />;
  if (state === "VIC") return <VictoriaMap />;
  if (state === "TAS") return <TasmaniaMap />;
  return null;
}
