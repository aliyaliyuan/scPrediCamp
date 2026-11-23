import { useEffect, useState } from 'react'
import Helix from './Helix.jsx'
import Course from './Course.jsx'
import { BUILT } from './built.js'
import { LESSONS } from './lessons.js'
import { useProgress } from './progress.js'



function useHash() {
  const [hash, setHash] = useState(() => window.location.hash.slice(1))
  useEffect(() => {
    const on = () => { setHash(window.location.hash.slice(1)); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return hash
}

function TopBar({ done, showAll }) {
  const count = Object.keys(done).length
  return (
    <header className="bar">
      <div className="wrap">
        <a className="brand" href="#welcome">sc<b>PrediXcan</b></a>
        <div className="progress">
          <span>{count} of {LESSONS.length} lessons</span>
          <div className="track"><i style={{ width: `${(count / LESSONS.length) * 100}%` }} /></div>
        </div>
        {showAll && <a className="pill ghost small" href="#course">All lessons</a>}
      </div>
    </header>
  )
}

export default function App() {
  const hash = useHash()
  const { done, complete } = useProgress()
  const m = /^lesson-(\d+)$/.exec(hash)
  const n = m ? Number(m[1]) : null
  const Lesson = n ? BUILT[n] : null

  if (Lesson) {
    return (
      <>
        <TopBar done={done} showAll />
        <Lesson key={n} lesson={LESSONS.find((l) => l.n === n)} onComplete={() => complete(n)} />
      </>
    )
  }
  if (hash === 'course' || n) {
    return (
      <>
        <TopBar done={done} />
        <Course done={done} />
      </>
    )
  }
  return (
    <section className="welcome">
      <Helix />
      <div className="welcome-copy">
        <h1>Welcome to scPrediCamp</h1>
        <a className="pill" href="#course">Click to begin</a>
      </div>
    </section>
  )
}
