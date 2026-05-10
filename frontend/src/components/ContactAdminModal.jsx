import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { X, MessageSquare, FileText, AlignLeft } from "lucide-react"

const API = "http://localhost:8000"
const INITIAL = { title: "", body: "" }

export default function ContactAdminModal({ isOpen, onClose }) {
  const [form, setForm]       = useState(INITIAL)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) setForm(INITIAL)
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      await axios.post(
        `${API}/api/support/tickets`,
        { title: form.title, body: form.body },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success("Звернення надіслано! Адміністратор розгляне його найближчим часом.")
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Не вдалося надіслати звернення.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !loading && onClose()} />

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white shadow-xl">

        
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none"
        >
          <X className="h-5 w-5" />
        </button>

        
        <div className="px-6 pb-0 pt-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">Зв'язатись з адміністратором</h2>
          <p className="mt-1 text-sm text-gray-500">
            Опишіть проблему — всі адміністратори отримають ваше звернення.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 pb-6 pt-5 space-y-4">

          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">
              Назва <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="Коротко опишіть тему звернення"
                required
                minLength={3}
                maxLength={120}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>
          </div>

          
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-900">
              Суть проблеми <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <textarea
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                placeholder="Детально опишіть ситуацію або питання..."
                required
                minLength={10}
                maxLength={2000}
                rows={5}
                className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <span className="absolute bottom-2.5 right-3 text-xs text-gray-400">
                {form.body.length}/2000
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-70"
          >
            {loading ? "Надсилання..." : "Надіслати звернення"}
          </button>
        </form>
      </div>
    </div>
  )
}
