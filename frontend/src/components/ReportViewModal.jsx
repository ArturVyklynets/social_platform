import { useState, useEffect } from "react"
import axios from "axios"
import { X, CheckCircle, ImageIcon } from "lucide-react"
import { parseUTC } from "../utils"

const API = import.meta.env.VITE_API_URL

export default function ReportViewModal({ isOpen, onClose, requestId, requestTitle }) {
  const [report, setReport]   = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !requestId) return
    setReport(null)
    setLoading(true)
    const token = localStorage.getItem("token")
    axios
      .get(`${API}/api/reports/${requestId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setReport(r.data))
      .catch(() => setReport(null))
      .finally(() => setLoading(false))
  }, [isOpen, requestId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-xl max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 pb-4">
          <div className="mb-1 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <h2 className="text-lg font-bold text-gray-900">Звіт про виконання</h2>
          </div>
          {requestTitle && (
            <p className="truncate text-sm text-gray-400">«{requestTitle}»</p>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center pb-10 pt-4">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : report ? (
          <div className="pb-6">
            {report.photo_url && (
              <img
                src={report.photo_url}
                alt="Фото звіту"
                className="mb-4 max-h-64 w-full cursor-zoom-in object-cover"
                onClick={() => window.open(report.photo_url, "_blank")}
              />
            )}
            <div className="px-6">
              {report.comment && (
                <p className="mb-3 text-sm leading-relaxed text-gray-700">{report.comment}</p>
              )}
              <p className="text-xs text-gray-400">
                Надіслано:{" "}
                {parseUTC(report.created_at).toLocaleDateString("uk-UA", { dateStyle: "medium" })}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-6 pb-8 text-sm text-gray-400">
            <ImageIcon className="h-4 w-4 shrink-0" />
            Звіт ще не надіслано.
          </div>
        )}
      </div>
    </div>
  )
}
