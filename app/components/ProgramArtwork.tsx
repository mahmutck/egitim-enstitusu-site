export function ArrowIcon({ diagonal = false }: { diagonal?: boolean }) {
  return <svg className="ui-arrow" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><path d={diagonal ? "M6 18 18 6M6 6h12v12" : "M4 12h16M13 5l7 7-7 7"} /></svg>;
}

export default function ProgramArtwork({ number, language = "tr" }: { number: string; language?: "tr" | "en" }) {
 return (<div className="program-art" aria-hidden="true">
                <div className="art-caption"><span>{language === "tr" ? "PSİKOLOJİK ARAŞTIRMALAR ENSTİTÜSÜ" : "PSYCHOLOGICAL RESEARCH INSTITUTE"}</span><b>{number} / 03</b></div>
                <svg viewBox="0 0 400 440" fill="none">
                  <defs><radialGradient id={`glow-${number}`}><stop stopColor="#d8bd83" stopOpacity=".32"/><stop offset="1" stopColor="#d8bd83" stopOpacity="0"/></radialGradient></defs>
                  <circle cx="200" cy="220" r="195" fill={`url(#glow-${number})`}/>
                  <g className="art-orbits" stroke="#d8bd83" strokeWidth=".7"><circle cx="200" cy="220" r="150" opacity=".4"/><ellipse cx="200" cy="220" rx="90" ry="175" transform="rotate(35 200 220)" opacity=".5"/><ellipse cx="200" cy="220" rx="90" ry="175" transform="rotate(-35 200 220)" opacity=".5"/><circle cx="200" cy="70" r="5" fill="#e8d5a9"/></g>
                  {number === "01" ? <g>
                    <defs><linearGradient id="somatic-flow" x1="95" y1="90" x2="300" y2="365" gradientUnits="userSpaceOnUse"><stop stopColor="#e8d5a9" stopOpacity=".15"/><stop offset=".42" stopColor="#f5e5c3"/><stop offset="1" stopColor="#b7d7ce" stopOpacity=".35"/></linearGradient></defs>
                    {Array.from({ length: 22 }, (_, index) => {
                      const scale = 1 - index * .029;
                      return <path key={index} d="M203 78C260 78 294 124 276 176C261 220 307 254 289 301C272 346 220 367 175 350C120 329 101 293 119 250C140 202 103 179 119 134C131 101 166 78 203 78Z" transform={`translate(${200 * (1-scale)} ${220 * (1-scale)}) scale(${scale}) rotate(${index * 2.2} 200 220)`} stroke="url(#somatic-flow)" strokeWidth={index % 5 === 0 ? 1.7 : .8} fill={index === 0 ? "#d8bd8308" : "none"}/>;
                    })}
                    <ellipse className="art-pulse" cx="204" cy="222" rx="23" ry="40" fill="#e8d5a9" fillOpacity=".08"/>
                  </g> : number === "02" ? <g stroke="#e8d5a9" strokeWidth="1.5"><path d="M198 126C155 95 104 136 124 180C90 199 107 252 142 255C137 293 173 318 198 292V126ZM202 126C245 95 296 136 276 180C310 199 293 252 258 255C263 293 227 318 202 292V126Z"/><path d="M149 145Q190 145 172 182T149 219Q189 218 180 275M251 145Q210 145 228 182T251 219Q211 218 220 275M124 180Q154 172 158 191M276 180Q246 172 242 191"/><path d="M200 310V355M171 340H229"/><circle className="art-pulse" cx="200" cy="220" r="70" strokeWidth=".7" opacity=".5"/></g> : <g stroke="#e8d5a9"><rect x="116" y="115" width="168" height="210" rx="5" strokeWidth="1.5"/><rect x="130" y="129" width="140" height="182" rx="2" opacity=".4"/><path d="M155 167H245M155 181H225M155 216H245M155 230H245M155 244H213" strokeWidth="2"/><circle cx="229" cy="286" r="22"/><path d="M219 307L213 344L230 335L245 344L240 307M218 285L226 293L240 278" strokeWidth="2"/></g>}
                  <g fill="#e8d5a9"><circle cx="66" cy="219" r="3"/><circle cx="334" cy="219" r="3"/><circle cx="200" cy="387" r="3"/></g>
                </svg>
                <div className="art-footer"><span>{number === "01" ? "BEDEN · FARKINDALIK" : number === "02" ? "BİLİNÇALTI · DENGE" : "BİLGİ · UYGULAMA"}</span><span><ArrowIcon diagonal /></span></div>
              </div>);
}
