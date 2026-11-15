// Loads Pyodide (Python compiled to WebAssembly) once, with the packages the lessons need.
const VERSION = '0.26.4'
// Set VITE_PYODIDE_BASE at build time to serve Pyodide from somewhere else (for example your own copy).
const BASE = new URL(import.meta.env.VITE_PYODIDE_BASE || `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`, document.baseURI).href
let ready

export function getPyodide(onStatus = () => {}) {
  if (!ready) {
    ready = (async () => {
      onStatus('Downloading Python (about 15 MB, first run only) ...')
      await new Promise((resolve, reject) => {
        const s = document.createElement('script')
        s.src = BASE + 'pyodide.js'
        s.onload = resolve
        s.onerror = () => reject(new Error('Could not download Python. Check your connection and try again.'))
        document.head.appendChild(s)
      })
      const py = await window.loadPyodide({ indexURL: BASE })
      onStatus('Loading numpy, pandas and sqlite3 ...')
      await py.loadPackage(['numpy', 'pandas', 'sqlite3'])
      const src = await (await fetch('py/spredixcan_lite.py')).text()
      py.FS.writeFile('/home/pyodide/spredixcan_lite.py', src)
      return py
    })()
    ready.catch(() => { ready = undefined })
  }
  return ready
}

// Copies a file from the site into Python's in-memory file system (skips files already there).
export async function putFile(py, url, path) {
  if (py.FS.analyzePath(path).exists) return
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url}`)
  let bytes = new Uint8Array(await res.arrayBuffer())
  // Some servers send .gz files with "Content-Encoding: gzip", so the browser has already
  // unpacked them. Pack those again so Python always finds a real gzip file at a .gz path.
  if (path.endsWith('.gz') && !(bytes[0] === 0x1f && bytes[1] === 0x8b)) {
    const packed = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'))
    bytes = new Uint8Array(await new Response(packed).arrayBuffer())
  }
  py.FS.mkdirTree(path.slice(0, path.lastIndexOf('/')))
  py.FS.writeFile(path, bytes)
}
