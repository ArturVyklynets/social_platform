import { useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { X, Star } from "lucide-react"

const API = "http://localhost:8000"

const LABELS = ["", "Дуже погано", "Погано", "Нормально", "Добре", "Відмінно"]

export default function LeaveReviewModal({ isOpen, onClose, requestId, volunteerId, volunteerName }) {
  const [rating,     setRating]     = useState(0)
  const [hovered,    setHovered]    = useState(0)
  const [comment,    setComment]    = useState("")
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const displayed = hovered || rating

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Будь ласка, оберіть оцінку.")
      return
    }
    setSubmitting(true)
    try {
      const token = localStorage.getItem("token")
      await axios.post(
        `${API}/api/reviews/${requestId}/volunteer/${volunteerId}`,
        { rating, comment: comment.trim() || null },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      toast.success("Дякуємо за відгук!")
      onClose(true)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка. Спробуйте ще раз.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => onClose(false)}
      />

      <div className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <button
          onClick={() => onClose(false)}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="mb-1 text-xl font-bold text-gray-900">Оцінити роботу</h2>
        <p className="mb-6 text-sm text-gray-500">
          {volunteerName ? `Ваш відгук про ${volunteerName}` : "Залиште ваш відгук про волонтера"}
        </p>

        {/* Stars */}
        <div className="mb-2 flex justify-center gap-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <Star
                className={`h-10 w-10 transition-colors ${
                  star <= displayed
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            </button>
          ))}
        </div>

        <p className="mb-5 h-5 text-center text-sm font-medium text-gray-600">
          {displayed > 0 ? LABELS[displayed] : ""}
        </p>

        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Розкажіть про свій досвід (необов'язково)..."
          rows={4}
          maxLength={1000}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
        />
        <p className="mt-1 text-right text-xs text-gray-400">{comment.length}/1000</p>

        <button
          onClick={handleSubmit}
          disabled={submitting || !rating}
          className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Надсилання..." : "Надіслати відгук"}
        </button>
      </div>
    </div>
  )
}
