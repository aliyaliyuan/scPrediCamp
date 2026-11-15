// The double helix from the welcome screen: two sine strands with rungs between them.
const A = 250, L = 1250, X0 = -300, X1 = 2500
const y = (x, s) => s * A * Math.sin((2 * Math.PI * x) / L)

const rungs = []
for (let x = X0 + 40; x < X1; x += 96) {
  if (Math.abs(Math.sin((2 * Math.PI * x) / L)) >= 0.28) rungs.push(x)
}
const strand = (s) => {
  let d = ''
  for (let x = X0; x <= X1; x += 20) d += `${d ? 'L' : 'M'}${x} ${y(x, s).toFixed(1)}`
  return d
}

export default function Helix() {
  return (
    <svg className="helix" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <g transform="translate(-120 430) rotate(-13)" fill="none" stroke="currentColor">
        {rungs.map((x) => (
          <line key={x} x1={x - 18} y1={y(x - 18, 1)} x2={x + 18} y2={y(x + 18, -1)} strokeWidth="34" />
        ))}
        <path d={strand(1)} strokeWidth="46" strokeLinecap="round" />
        <path d={strand(-1)} strokeWidth="46" strokeLinecap="round" />
      </g>
    </svg>
  )
}
