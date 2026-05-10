import { useState } from "react"
import axios from "axios"
import { Heart, HandHeart, DollarSign, HeartHandshake } from "lucide-react"

const ROLES = [
  {
    value: "beneficiary",
    label: "Бенефіціар",
    description: "Мені потрібна допомога від спільноти",
    icon: Heart,
    accent: "text-amber-500",
    activeBg: "bg-amber-50 border-amber-400",
    iconBg: "bg-amber-100",
  },
  {
    value: "volunteer",
    label: "Волонтер",
    description: "Хочу пропонувати свій час і навички",
    icon: HandHeart,
    accent: "text-green-500",
    activeBg: "bg-green-50 border-green-400",
    iconBg: "bg-green-100",
  },
  {
    value: "donor",
    label: "Донор",
    description: "Хочу фінансово підтримувати запити",
    icon: DollarSign,
    accent: "text-blue-500",
    activeBg: "bg-blue-50 border-blue-400",
    iconBg: "bg-blue-100",
  },
]

export default function RoleSelectionModal({ onRoleSet }) {
  const [selected, setSelected] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleConfirm = async () => {
    if (!selected) return
    setIsLoading(true)
    setError("")
    try {
      const token = localStorage.getItem("token")
      const res = await axios.patch(
        "http://localhost:8000/api/users/me/role",
        { role: selected },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      onRoleSet(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || "Щось пішло не так. Спробуйте ще раз.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" />

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

        
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
        </div>

        
        <div className="mb-7 text-center">
          <h2 className="text-2xl font-bold text-gray-900">Останній крок!</h2>
          <p className="mt-2 text-sm text-gray-500">
            Оберіть роль, щоб завершити реєстрацію. Це визначає, як ви взаємодієте з платформою.
          </p>
        </div>

        
        <div className="mb-6 flex flex-col gap-3">
          {ROLES.map(({ value, label, description, icon: Icon, accent, activeBg, iconBg }) => {
            const isActive = selected === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setSelected(value)}
                className={`flex w-full items-center gap-4 rounded-2xl border-2 px-4 py-4 text-left transition-all ${
                  isActive
                    ? `${activeBg} shadow-sm`
                    : "border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white"
                }`}
              >
                <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? iconBg : "bg-gray-100"}`}>
                  <Icon className={`h-5 w-5 ${isActive ? accent : "text-gray-400"}`} />
                </div>
                <div>
                  <p className={`font-semibold ${isActive ? "text-gray-900" : "text-gray-700"}`}>{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                {isActive && (
                  <div className="ml-auto flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-indigo-600">
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleConfirm}
          disabled={!selected || isLoading}
          className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isLoading ? "Збереження..." : "Підтвердити та продовжити"}
        </button>
      </div>
    </div>
  )
}
