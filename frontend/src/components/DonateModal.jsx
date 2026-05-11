import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { X, HeartHandshake, ArrowRight, Lock, CheckCircle } from "lucide-react"

const QUICK_AMOUNTS = [100, 250, 500, 1000]

export default function DonateModal({ isOpen, onClose, request }) {
  const [amount, setAmount]       = useState("")
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (isOpen) setAmount("")
  }, [isOpen])

  if (!isOpen || !request) return null

  const goal         = request.goal_amount ?? 0
  const raised       = request.collected_amount ?? 0
  const isGoalReached = goal > 0 && raised >= goal

  const numericAmount = parseFloat(amount)
  const isValid       = !isNaN(numericAmount) && numericAmount >= 1

  const handlePay = async () => {
    if (!isValid) {
      toast.error("Введіть суму не менше ₴1.")
      return
    }
    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")
      const { data } = await axios.post(
        "http://localhost:8000/api/payments/create-checkout-session",
        { request_id: request.id, amount: numericAmount },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      // Redirect to Stripe-hosted checkout; isLoading stays true while browser navigates
      window.location.href = data.checkout_session_url
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при ініціалізації оплати.")
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

        
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none"
        >
          <X className="h-5 w-5" />
        </button>

        
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
        </div>

        
        <div className="mb-6 text-center">
          <h2 className="text-xl font-bold text-gray-900">Зробити пожертву</h2>
          <p className="mt-1 line-clamp-2 text-sm text-gray-500">{request.title}</p>
        </div>

        {isGoalReached ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-green-50 border border-green-200 px-5 py-6 text-center">
            <CheckCircle className="h-10 w-10 text-green-500" />
            <p className="text-base font-semibold text-green-800">Ціль досягнута!</p>
            <p className="text-sm text-green-600">
              Зібрано ₴{raised.toLocaleString("uk-UA")} з ₴{goal.toLocaleString("uk-UA")} — збір завершено.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className={`rounded-xl border py-2 text-sm font-semibold transition ${
                    numericAmount === q
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                  }`}
                >
                  ₴{q}
                </button>
              ))}
            </div>

            <div className="mb-6 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₴</span>
              <input
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Інша сума"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-8 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
            </div>

            <button
              onClick={handlePay}
              disabled={!isValid || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Перенаправлення...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  {isValid ? `Сплатити ₴${numericAmount.toLocaleString("uk-UA")}` : "Перейти до оплати"}
                </>
              )}
            </button>
          </>
        )}

        
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-400">
          <Lock className="h-3 w-3" />
          Безпечна оплата через Stripe
        </p>
      </div>
    </div>
  )
}
