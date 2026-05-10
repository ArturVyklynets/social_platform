import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
  X, DollarSign, HandHeart, CalendarClock, CheckCircle,
  Clock, Stethoscope, Home, Utensils, GraduationCap, Tag,
} from "lucide-react"
import DonateModal from "./DonateModal"

const CATEGORY_CONFIG = {
  urgent:    { label: "Терміново",  icon: Clock,         cls: "bg-red-100 text-red-700" },
  medical:   { label: "Медицина",   icon: Stethoscope,   cls: "bg-blue-100 text-blue-700" },
  housing:   { label: "Житло",      icon: Home,          cls: "bg-amber-100 text-amber-700" },
  food:      { label: "Харчування", icon: Utensils,      cls: "bg-green-100 text-green-700" },
  education: { label: "Освіта",     icon: GraduationCap, cls: "bg-purple-100 text-purple-700" },
}

const STATUS_CONFIG = {
  open:        { label: "Відкрито",   cls: "bg-green-50 text-green-700" },
  in_progress: { label: "В процесі", cls: "bg-yellow-50 text-yellow-700" },
  completed:   { label: "Завершено", cls: "bg-gray-100 text-gray-500" },
}

// Returns "YYYY-MM-DDTHH:MM" in local time (required by datetime-local min attribute)
function localDateTimeMin(offsetMinutes = 30) {
  const d = new Date()
  d.setMinutes(d.getMinutes() + offsetMinutes)
  const pad = (n) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function RequestDetailsModal({ isOpen, onClose, request, currentUser }) {
  const [hasVolunteered, setHasVolunteered]   = useState(false)
  const [isVolunteering, setIsVolunteering]   = useState(false)
  const [scheduledAt, setScheduledAt]         = useState("")
  const [isDonateOpen, setIsDonateOpen]       = useState(false)

  // Reset all local state whenever a different request is opened
  useEffect(() => {
    setHasVolunteered(false)
    setIsVolunteering(false)
    setScheduledAt("")
  }, [request?.id])

  if (!isOpen || !request) return null

  const category     = CATEGORY_CONFIG[request.category]
  const CategoryIcon = category?.icon ?? Tag
  const status       = STATUS_CONFIG[request.status] ?? { label: request.status, cls: "bg-gray-100 text-gray-500" }
  const raised       = request.collected_amount ?? 0
  const goal         = request.goal_amount ?? 0
  const pct          = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0
  const role         = currentUser?.role

  // A date is valid when it exists and is strictly in the future
  const isDateValid  = scheduledAt.length > 0 && new Date(scheduledAt) > new Date()

  const handleVolunteer = async () => {
    if (!isDateValid) {
      toast.error("Будь ласка, оберіть майбутню дату та час.")
      return
    }
    setIsVolunteering(true)
    try {
      const token = localStorage.getItem("token")
      // Convert local datetime-local string to UTC ISO-8601 before sending
      await axios.post(
        `http://localhost:8000/api/requests/${request.id}/volunteer`,
        { scheduled_at: new Date(scheduledAt).toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setHasVolunteered(true)
      toast.success("Записано! Подію додано до вашого календаря.")
    } catch (err) {
      if (err.response?.status === 409) {
        setHasVolunteered(true)
        toast.error("Ви вже записались на цей запит.")
      } else {
        toast.error(err.response?.data?.detail || "Щось пішло не так. Спробуйте ще раз.")
      }
    } finally {
      setIsVolunteering(false)
    }
  }

  const ProgressBox = () => (
    <div className="mx-6 mt-5 rounded-2xl bg-gray-50 p-4">
      {goal > 0 ? (
        <>
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-base font-bold text-gray-900">₴{raised.toLocaleString()} зібрано</span>
            <span className="text-sm text-gray-500">з ₴{goal.toLocaleString()}</span>
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
        <p className="text-sm text-gray-500">
          Зібрано:{" "}
          <span className="font-semibold text-gray-900">₴{raised.toLocaleString()}</span>
        </p>
      )}
    </div>
  )

  const renderCTA = () => {

    if (role === "Донор") {
      return (
        <>
          <ProgressBox />
          <div className="p-6 pt-4">
            <button
              onClick={() => setIsDonateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow"
            >
              <DollarSign className="h-4 w-4" />
              Задонатити
            </button>
          </div>
        </>
      )
    }

    if (role === "Волонтер") {
      return (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5">

          
          {hasVolunteered ? (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <p className="font-semibold text-green-700">Ви успішно записались!</p>
              <p className="mt-1 text-sm text-green-600">Подію додано до вашого Google Calendar.</p>
              {scheduledAt && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {new Date(scheduledAt).toLocaleString("uk-UA", { dateStyle: "long", timeStyle: "short" })}
                </p>
              )}
            </div>
          ) : (
            <>
              
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                  <CalendarClock className="h-4 w-4 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Запланувати візит</p>
                  <p className="text-xs text-gray-400">Оберіть зручну дату та час</p>
                </div>
              </div>

              
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                min={localDateTimeMin(30)}
                className="mb-4 w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />

              
              {scheduledAt && !isDateValid && (
                <p className="mb-3 text-xs font-medium text-red-500">
                  Будь ласка, оберіть час не раніше ніж через 30 хвилин.
                </p>
              )}

              
              <button
                onClick={handleVolunteer}
                disabled={!isDateValid || isVolunteering}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HandHeart className="h-4 w-4" />
                {isVolunteering ? "Запис..." : "Підтвердити участь"}
              </button>
            </>
          )}
        </div>
      )
    }

    return (
      <>
        <ProgressBox />
        <div className="pb-6" />
      </>
    )
  }

  return (
    <>
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl max-h-[90vh] overflow-y-auto">

        
        <div className="flex items-start gap-3 p-6 pb-3">
          <div className="min-w-0 flex-1">
            {category ? (
              <span className={`mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${category.cls}`}>
                <CategoryIcon className="h-3.5 w-3.5" />
                {category.label}
              </span>
            ) : request.category ? (
              <span className="mb-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-gray-100 text-gray-600">
                <Tag className="h-3.5 w-3.5" />
                {request.category}
              </span>
            ) : null}

            <h2 className="mt-2 text-xl font-bold leading-snug text-gray-900">{request.title}</h2>

            <span className={`mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${status.cls}`}>
              {status.label}
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        
        {request.image_url && (
          <div className="mx-6 mt-3 overflow-hidden rounded-2xl">
            <img
              src={`http://localhost:8000${request.image_url}`}
              alt={request.title}
              className="h-52 w-full object-cover"
            />
          </div>
        )}

        
        <div className="px-6 pt-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">Про цей запит</h3>
          <p className="text-sm leading-relaxed text-gray-600">{request.description}</p>
        </div>

        
        {renderCTA()}

      </div>
    </div>

    
    <DonateModal
      isOpen={isDonateOpen}
      onClose={() => setIsDonateOpen(false)}
      request={request}
    />
    </>
  )
}
