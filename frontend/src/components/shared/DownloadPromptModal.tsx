import React, { useState } from "react"
import { useTaskStore } from "@/store/taskStore"
import { Button } from "@/components/ui/button"
import { Download, X, FolderOpen } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export default function DownloadPromptModal() {
  const { downloadTarget, setDownloadTarget, addToast } = useTaskStore()
  const [loading, setLoading] = useState(false)

  if (!downloadTarget) return null

  /** Build a Blob from a data URL using multiple strategies */
  const dataUrlToBlob = async (rawData: string, fileName = 'download'): Promise<Blob> => {
    let dataUrl = rawData

    // Ensure it starts with data:
    if (!dataUrl.startsWith('data:')) {
      // Raw base64 — wrap with generic type
      const clean = dataUrl.trim().replace(/[\r\n\s]/g, '')
      dataUrl = `data:application/octet-stream;base64,${clean}`
    }

    // Strategy 1: fetch() — browser handles decoding natively
    try {
      const res = await fetch(dataUrl)
      if (res.ok) return await res.blob()
    } catch {
      // fetch on data URL failed (e.g. CSP or browser restriction), try manual decode
    }

    // Strategy 2: manual atob() with aggressive sanitization
    try {
      const commaIdx = dataUrl.indexOf(',')
      const header = commaIdx !== -1 ? dataUrl.substring(0, commaIdx) : ''
      let b64 = commaIdx !== -1 ? dataUrl.substring(commaIdx + 1) : dataUrl

      // Detect content type
      const mimeMatch = header.match(/data:([^;,]+)/)
      const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'

      // Strip ALL non-base64 characters (whitespace, newlines, etc.)
      b64 = b64.replace(/[^A-Za-z0-9+/=]/g, '')

      // Fix padding
      const rem = b64.length % 4
      if (rem === 2) b64 += '=='
      else if (rem === 3) b64 += '='

      const binary = window.atob(b64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      return new Blob([bytes], { type: mimeType })
    } catch {
      // atob still failed
    }

    // Strategy 3: last resort — anchor with data URL directly (no Blob needed)
    // Browsers natively support data: URIs as anchor hrefs — no decoding required.
    console.warn('Blob creation failed, falling back to direct data URL anchor download')
    const a3 = document.createElement('a')
    a3.href = rawData.startsWith('data:') ? rawData : `data:application/octet-stream;base64,${rawData.trim()}`
    a3.download = fileName
    document.body.appendChild(a3)
    a3.click()
    document.body.removeChild(a3)
    // Return empty blob as sentinel — caller checks blob.size === 0 to skip file-picker
    return new Blob([], { type: 'application/octet-stream' })
  }

  const handleDownload = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const blob = await dataUrlToBlob(downloadTarget.base64Data, downloadTarget.defaultFileName)

      // If Strategy 3 fired (direct anchor), blob is empty — download already happened
      if (blob.size === 0) {
        addToast("File downloaded successfully!", "success")
        setDownloadTarget(null)
        setLoading(false)
        return
      }

      let saved = false

      // Try native file save picker (opens OS file explorer)
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: downloadTarget.defaultFileName,
          })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          saved = true
          addToast("File saved successfully!", "success")
        } catch (err: any) {
          if (err.name === 'AbortError') {
            setLoading(false)
            return // User cancelled
          }
          console.error("showSaveFilePicker failed, using <a> fallback", err)
        }
      }

      // Fallback: trigger <a> download
      if (!saved) {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = downloadTarget.defaultFileName
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        addToast("File downloaded successfully!", "success")
      }

      setDownloadTarget(null)
    } catch (err: any) {
      addToast(err.message || "Failed to download file", "error")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 15 }}
          className="bg-[#0b0e1a] border border-white/[0.08] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden text-xs text-slate-200 p-6 space-y-4 shadow-cyan-500/5"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
            <div className="flex items-center space-x-2.5">
              <Download className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-black tracking-tight text-slate-100 font-bold">Download File</h3>
            </div>
            <button
              className="p-1 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors"
              onClick={() => setDownloadTarget(null)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleDownload} className="space-y-4">
            <div className="space-y-2">
              <p className="text-slate-400 leading-relaxed text-[11px]">
                Clicking the button below will open your system's File Explorer. You can select the destination folder and filename to save the file.
              </p>
              
              <div className="p-3.5 rounded-xl border border-white/[0.06] bg-white/[0.01] space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">File Name</span>
                <span className="font-mono text-slate-200 text-xs block truncate">{downloadTarget.defaultFileName}</span>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-3 border-t border-white/[0.08]">
              <Button
                variant="secondary"
                type="button"
                onClick={() => setDownloadTarget(null)}
                disabled={loading}
                className="h-9 px-4 rounded-xl border border-white/[0.08] text-slate-300 hover:bg-white/[0.06]"
              >
                Cancel
              </Button>
              <Button
                variant="glow"
                type="submit"
                disabled={loading}
                className="h-9 px-4 rounded-xl shadow-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 border border-cyan-500/30 text-white font-bold flex items-center gap-1.5"
              >
                <FolderOpen className="h-4 w-4" />
                {loading ? "Opening Explorer..." : "Select Folder & Save"}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
