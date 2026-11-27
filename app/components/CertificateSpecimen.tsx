/**
 * Illustrative certificate specimen for the homepage trust section. The QR
 * grid is decorative (it does not encode anything); a scan line sweeps across
 * it and a "verified" seal settles in, all in CSS.
 */

const SIZE = 21;

// Deterministic decorative QR-like pattern with the three finder squares.
function qrCells() {
  const cells: [number, number][] = [];
  let seed = 917;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x > SIZE - 9 && y < 8) || (x < 8 && y > SIZE - 9);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      if (inFinder(x, y)) continue;
      if (rand() > 0.52) cells.push([x, y]);
    }
  }
  return cells;
}

const CELLS = qrCells();

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1" x=".5" y=".5" />
      <rect x="2" y="2" width="3" height="3" fill="currentColor" />
    </g>
  );
}

export default function CertificateSpecimen({ language }: { language: "tr" | "en" }) {
  const tr = language === "tr";
  return (
    <figure className="cert-specimen" aria-hidden="true">
      <div className="cert-paper">
        <span className="cert-sample">{tr ? "Örnek" : "Specimen"}</span>
        <img className="cert-emblem" src="/images/logo-emblem.webp" alt="" width="58" height="64" loading="lazy" />
        <p className="cert-org">{tr ? "Psikolojik Araştırmalar Enstitüsü" : "Psychological Research Institute"}</p>
        <p className="cert-title">{tr ? "Sertifika" : "Certificate"}</p>
        <p className="cert-text">{tr ? "Hipnosomatik Eğitimi’ni başarıyla tamamlamıştır." : "has successfully completed Hypnosomatic Training."}</p>
        <div className="cert-lines"><i /><i /></div>
        <div className="cert-foot">
          <div className="cert-serial">
            <small>{tr ? "Seri No" : "Serial No"}</small>
            <b>21-014</b>
          </div>
          <div className="cert-qr">
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges">
              {CELLS.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="currentColor" />)}
              <Finder x={0} y={0} />
              <Finder x={SIZE - 7} y={0} />
              <Finder x={0} y={SIZE - 7} />
            </svg>
            <span className="cert-scan" />
          </div>
        </div>
        <span className="cert-seal">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5 10 17l9-10" /></svg>
          {tr ? "Doğrulandı" : "Verified"}
        </span>
      </div>
    </figure>
  );
}
