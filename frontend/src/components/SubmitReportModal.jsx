import { useState, useRef } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { X, Upload, Camera, FileImage } from "lucide-react"

const API = import.meta.env.VITE_API_URL

export default function SubmitReportModal({ isOpen, onClose, requestId, requestTitle }) {
  const [file, setFile]         = useState(null)
  const [preview, setPreview]   = useState(null)
  const [comment, setComment]   = useState("")
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  if (!isOpen) return null

  const handleFile = (f) => {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFile(f)
  }

  const handleClose = () => {
    if (uploading) return
    setFile(null)
    setPreview(null)
    setComment("")
    onClose(false)
  }

  const handleSubmit = async () => {
    if (!file) { toast.error("Додайте фото звіту."); return }
    setUploading(true)
    try {
      const token = localStorage.getItem("token")
      const formData = new FormData()
      formData.append("file", file)
      if (comment.trim()) formData.append("comment", comment.trim())
      await axios.post(`${API}/api/reports/${requestId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      })
      toast.success("Звіт надіслано!")
      setFile(null)
      setPreview(null)
      setComment("")
      onClose(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при надсиланні звіту.")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-xl">
        <button
          onClick={handleClose}
          disabled={uploading}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-40"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6">
          <div className="mb-1 flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900">Звіт про виконану роботу</h2>
          </div>
          {requestTitle && (
            <p className="mb-5 truncate text-sm text-gray-400">«{requestTitle}»</p>
          )}

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={[
              "mb-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed transition",
              dragOver
                ? "border-indigo-400 bg-indigo-50"
                : "border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/50",
              preview ? "p-2" : "p-8",
            ].join(" ")}
          >
            {preview ? (
              <img src={preview} alt="preview" className="max-h-52 w-full rounded-xl object-cover" />
            ) : (
              <>
                <FileImage className="mb-2 h-10 w-10 text-gray-300" />
                <p className="text-sm font-medium text-gray-500">Натисніть або перетягніть фото</p>
                <p className="mt-1 text-xs text-gray-400">JPEG, PNG, WebP або GIF</p>
              </>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])}
          />

          {preview && (
            <button
              onClick={() => { setFile(null); setPreview(null) }}
              className="mb-3 text-xs text-gray-400 underline hover:text-gray-600"
            >
              Змінити фото
            </button>
          )}

          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Короткий опис виконаної роботи (необов'язково)..."
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
          />
          <p className="mt-1 mb-4 text-right text-xs text-gray-400">{comment.length}/500</p>

          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Завантаження...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Надіслати звіт
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
