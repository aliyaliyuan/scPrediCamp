import { useState } from 'react'

/*
 Multiple-choice quiz. Each question: { q, options: [string], answer: index, why }.
 `why` is shown once the question is answered correctly. onComplete fires when every
 question has been answered correctly.
*/
export default function Quiz({ questions, onComplete }) {
  const [picked, setPicked] = useState({})
  const [shown, setShown] = useState({})
  const allRight = questions.every((qq, i) => shown[i] && picked[i] === qq.answer)

  function submit(e, i) {
    e.preventDefault()
    if (picked[i] == null) return
    const next = { ...shown, [i]: true }
    setShown(next)
    if (questions.every((qq, j) => next[j] && (j === i ? picked[i] : picked[j]) === qq.answer)) onComplete()
  }

  const score = questions.filter((qq, i) => shown[i] && picked[i] === qq.answer).length

  return (
    <section className="quiz" aria-labelledby="quiz-h">
      <div className="quiz-head">
        <h2 id="quiz-h">Check your understanding</h2>
        <span className="soon" role="status">{score} of {questions.length} correct</span>
      </div>
      <ol className="quiz-list">
        {questions.map((qq, i) => {
          const done = shown[i]
          const right = done && picked[i] === qq.answer
          return (
            <li key={i} className="box">
              <form className="check" onSubmit={(e) => submit(e, i)}>
                <fieldset>
                  <legend>{qq.q}</legend>
                  {qq.options.map((o, k) => (
                    <label key={k} className={`opt${done && k === picked[i] ? (right ? ' good' : ' bad') : ''}`}>
                      <input type="radio" name={`q${i}`} checked={picked[i] === k}
                        onChange={() => { setPicked((p) => ({ ...p, [i]: k })); setShown((s) => ({ ...s, [i]: false })) }} />
                      <span>{o}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="row">
                  <button className="pill small" type="submit" disabled={picked[i] == null || right}>Check</button>
                  {done && (
                    <span className={right ? 'verdict good' : 'verdict bad'} role="status">
                      {right ? `Correct. ${qq.why}` : 'Not quite. Have another look at the section above and try again.'}
                    </span>
                  )}
                </div>
              </form>
            </li>
          )
        })}
      </ol>
      {allRight && <p className="verdict good">All five correct. Lesson 1 is marked complete.</p>}
    </section>
  )
}
