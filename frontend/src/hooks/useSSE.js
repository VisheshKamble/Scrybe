import { useEffect, useRef, useState } from 'react'

export function useSSE(videoId) {
  const [text, setText] = useState('')
  const [done, setDone] = useState(false)
  const sourceRef = useRef(null)

  useEffect(() => {
    if (!videoId) return
    setText('')
    setDone(false)

    const source = new EventSource(`/api/stream/${videoId}`)
    sourceRef.current = source

    source.addEventListener('token', (event) => {
      setText((prev) => prev + event.data)
    })
    source.addEventListener('done', () => {
      setDone(true)
      source.close()
    })
    source.onerror = () => {
      source.close()
    }

    return () => source.close()
  }, [videoId])

  return { text, done }
}
