import { useState } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { X, Tag, User, CreditCard, Heart, Banknote, CheckCircle } from "lucide-react"

const API = "http://localhost:8000"

const CATEGORY_CLS = {
  urgent:    "bg-red-100 text-red-700",
  medical:   "bg-blue-100 text-blue-700",
  housing:   "bg-amber-100 text-amber-700",
  food:      "bg-green-100 text-green-700",
  education: "bg-purple-100 text-purple-700",
}

const CATEGORY_LABEL = {
  urgent: "Терміново", medical: "Медицина", housing: "Житло",
  food: "Харчування", education: "Освіта",
}

const STATUS_LABEL = { open: "Відкрито", in_progress: "В процесі", completed: "Завершено" }
const STATUS_CLS   = {
  open:        "bg-green-50 text-green-700",
  in_progress: "bg-yellow-50 text-yellow-700",
  completed:   "bg-gray-100 text-gray-500",
}

export default function AdminRequestDetailModal({ request, onClose, onPayout }) {
  const [paying, setPaying] = useState(false)

  if (!request) return null

  const goal   = request.goal_amount ?? 0
  const raised = request.collected_amount ?? 0
  const pct    = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0
  const isPaid = request.payout_status === "paid"

  const handlePayout = async () => {
    const confirmed = window.confirm(
      `Підтвердіть виплату\n\nСума: ₴${raised.toLocaleString("uk-UA")}\nКартка: ${request.card_number}\n\nНатисніть OK тільки після того, як зробили переказ на цю картку.`
    )
    if (!confirmed) return
    setPaying(true)
    try {
      await axios.patch(
        `${API}/api/admin/requests/${request.id}/payout`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )
      toast.success("Виплату зафіксовано!")
      onPayout?.(request.id)
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка.")
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl border border-gray-100 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">

        
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
        >
          <X className="h-5 w-5" />
        </button>

        
        {request.image_url ? (
          <div className="overflow-hidden rounded-t-3xl">
            <img
              src={`${API}${request.image_url}`}
              alt={request.title}
              className="h-48 w-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-32 items-center justify-center rounded-t-3xl bg-gray-100">
            <Heart className="h-10 w-10 text-gray-300" />
          </div>
        )}

        <div className="px-6 pb-8 pt-5">

          
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${CATEGORY_CLS[request.category] ?? "bg-gray-100 text-gray-600"}`}>
              <Tag className="h-3 w-3" />
              {CATEGORY_LABEL[request.category] ?? request.category ?? "Загальне"}
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLS[request.status] ?? "bg-gray-100 text-gray-500"}`}>
              {STATUS_LABEL[request.status] ?? request.status}
            </span>
            <span className="ml-auto text-xs text-gray-400">#{request.id}</span>
          </div>

          
          <h2 className="mb-3 text-xl font-bold leading-snug text-gray-900">{request.title}</h2>

          
          <p className="mb-5 whitespace-pre-wrap text-sm leading-relaxed text-gray-600">
            {request.description}
          </p>

          
          {request.author && (
            <div className="mb-5 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                <User className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-gray-400">Автор запиту</p>
                <p className="text-sm font-medium text-gray-900">
                  {request.author.full_name || request.author.email}
                </p>
                {request.author.full_name && (
                  <p className="text-xs text-gray-400">{request.author.email}</p>
                )}
              </div>
            </div>
          )}

          
          <div className="mb-5 rounded-2xl bg-gray-50 p-4">
            {goal > 0 ? (
              <>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-base font-bold text-gray-900">
                    ₴{raised.toLocaleString("uk-UA")} зібрано
                  </span>
                  <span className="text-sm text-gray-500">
                    з ₴{goal.toLocaleString("uk-UA")}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1.5 text-right text-xs text-gray-400">{pct}% зібрано</p>
              </>
            ) : (
              <p className="text-sm text-gray-600">
                Зібрано:{" "}
                <span className="font-semibold text-gray-900">
                  ₴{raised.toLocaleString("uk-UA")}
                </span>
                {" "}· Мета не вказана
              </p>
            )}
          </div>

          
          {request.card_number ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <CreditCard className="h-5 w-5 shrink-0 text-indigo-500" />
              <div>
                <p className="text-xs text-indigo-400">Картка для виплати</p>
                <p className="font-mono text-sm font-semibold text-indigo-800 tracking-wider">
                  {request.card_number}
                </p>
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-gray-50 px-4 py-3">
              <CreditCard className="h-5 w-5 shrink-0 text-gray-300" />
              <p className="text-sm text-gray-400">Картку для виплати не вказано</p>
            </div>
          )}

          
          {raised > 0 && request.card_number && (
            isPaid ? (
              <div className="flex items-center gap-3 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
                <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
                <div>
                  <p className="text-sm font-semibold text-green-700">
                    Кошти виплачено — ₴{raised.toLocaleString("uk-UA")}
                  </p>
                  {request.payout_at && (
                    <p className="text-xs text-green-500">
                      {new Date(request.payout_at).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <button
                onClick={handlePayout}
                disabled={paying}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <Banknote className="h-4 w-4" />
                {paying ? "Зберігаємо..." : `Підтвердити виплату ₴${raised.toLocaleString("uk-UA")}`}
              </button>
            )
          )}

        </div>
      </div>
    </div>
  )
}
