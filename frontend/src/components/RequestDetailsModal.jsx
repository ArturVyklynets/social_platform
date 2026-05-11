import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
  X, DollarSign, HandHeart, CalendarClock, CheckCircle,
  Clock, Stethoscope, Home, Utensils, GraduationCap, Tag,
  ChevronLeft, ChevronRight, User as UserIcon, ImageIcon,
} from "lucide-react"
import DonateModal from "./DonateModal"
import UserProfileModal from "./UserProfileModal"
import { parseUTC } from "../utils"

const API = "http://localhost:8000"

const CATEGORY_CONFIG = {
  urgent:    { label: "Терміново",  icon: Clock,         cls: "bg-red-100 text-red-700" },
  medical:   { label: "Медицина",   icon: Stethoscope,   cls: "bg-blue-100 text-blue-700" },
  housing:   { label: "Житло",      icon: Home,          cls: "bg-amber-100 text-amber-700" },
  food:      { label: "Харчування", icon: Utensils,      cls: "bg-green-100 text-green-700" },
  education: { label: "Освіта",     icon: GraduationCap, cls: "bg-purple-100 text-purple-700" },
}

const STATUS_CONFIG = {
  open:        { label: "Відкрито",  cls: "bg-green-50 text-green-700" },
  in_progress: { label: "В процесі", cls: "bg-yellow-50 text-yellow-700" },
  completed:   { label: "Завершено", cls: "bg-gray-100 text-gray-500" },
}

const MONTH_UA = ["Січень","Лютий","Березень","Квітень","Травень","Червень",
                  "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"]
const DAY_UA   = ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"]
const HOURS    = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]

function buildMonthCells(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7
  const total  = new Date(year, month + 1, 0).getDate()
  return [...Array(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)]
}

function parseLocalDate(str) {
  const [y, m, d] = str.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function CalendarPicker({ viewYear, viewMonth, selectedDay, busySlots, availFrom, availTo, onPrev, onNext, onDayClick }) {
  const todayMs    = new Date().setHours(0, 0, 0, 0)
  const availFromMs = availFrom ? parseLocalDate(availFrom).getTime() : null
  const availToMs   = availTo   ? parseLocalDate(availTo).getTime()   : null
  const busyKeys = new Set(
    busySlots.map(s => {
      const d = new Date(s.scheduled_at)
      return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
    })
  )
  const cells = buildMonthCells(viewYear, viewMonth)

  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={onPrev} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold text-gray-800">{MONTH_UA[viewMonth]} {viewYear}</span>
        <button onClick={onNext} className="rounded-lg p-1.5 text-gray-400 transition hover:bg-white hover:text-gray-700">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {(availFrom || availTo) && (
        <p className="mb-2 text-center text-xs text-indigo-600 font-medium">
          Доступно:{" "}
          {availFrom && availTo && availFrom === availTo
            ? parseLocalDate(availFrom).toLocaleDateString("uk-UA", { day: "numeric", month: "long" })
            : [
                availFrom && parseLocalDate(availFrom).toLocaleDateString("uk-UA", { day: "numeric", month: "short" }),
                availTo   && parseLocalDate(availTo).toLocaleDateString("uk-UA", { day: "numeric", month: "short" }),
              ].filter(Boolean).join(" — ")
          }
        </p>
      )}

      <div className="mb-1 grid grid-cols-7">
        {DAY_UA.map(d => (
          <div key={d} className="py-1 text-center text-[10px] font-medium text-gray-400">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} />
          const dateMs = new Date(viewYear, viewMonth, day).setHours(0, 0, 0, 0)
          const date   = new Date(dateMs)
          const isPast     = dateMs < todayMs
          const outOfRange = (availFromMs !== null && dateMs < availFromMs) ||
                             (availToMs   !== null && dateMs > availToMs)
          const isBusy  = busyKeys.has(`${viewYear}-${viewMonth}-${day}`)
          const isSel   = selectedDay && selectedDay.toDateString() === date.toDateString()
          const isToday = dateMs === todayMs
          const disabled = isPast || outOfRange
          return (
            <button
              key={day}
              disabled={disabled}
              onClick={() => !disabled && onDayClick(date)}
              className={[
                "relative rounded-lg py-2 text-xs font-medium transition",
                disabled ? "cursor-not-allowed text-gray-300" : "cursor-pointer",
                isSel    ? "bg-indigo-600 text-white shadow-sm" : (!disabled ? "hover:bg-white text-gray-700" : ""),
                isToday && !isSel && !disabled ? "font-bold text-indigo-600" : "",
                outOfRange && !isPast ? "line-through opacity-40" : "",
              ].filter(Boolean).join(" ")}
            >
              {day}
              {isBusy && !isSel && !disabled && (
                <span className="absolute bottom-0.5 left-1/2 block h-1 w-1 -translate-x-1/2 rounded-full bg-amber-400" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function HourSlots({ selectedDay, busySlots, selectedHour, availHourFrom, availHourTo, onHourClick }) {
  const now = new Date()
  const visibleHours = HOURS.filter(h =>
    (availHourFrom == null || h >= availHourFrom) &&
    (availHourTo   == null || h <= availHourTo)
  )
  return (
    <div className="grid grid-cols-5 gap-2">
      {visibleHours.map(h => {
        const slotDt  = new Date(selectedDay); slotDt.setHours(h, 0, 0, 0)
        const isPast  = slotDt <= now
        const isBusy  = !isPast && busySlots.some(s => {
          const sd = new Date(s.scheduled_at)
          return sd.toDateString() === selectedDay.toDateString() && Math.abs(sd.getHours() - h) <= 1
        })
        const isSel    = selectedHour === h
        const disabled = isPast || isBusy
        return (
          <button
            key={h}
            disabled={disabled}
            onClick={() => !disabled && onHourClick(h)}
            className={[
              "rounded-xl py-2.5 text-xs font-medium transition",
              disabled ? "cursor-not-allowed bg-gray-100 text-gray-300" : "",
              isSel    ? "bg-indigo-600 text-white shadow-sm" : "",
              !disabled && !isSel ? "border border-gray-200 bg-white text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700" : "",
            ].filter(Boolean).join(" ")}
          >
            {String(h).padStart(2, "0")}:00
            {isBusy && (
              <span className="block text-[9px] leading-tight text-amber-500">Зайнято</span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export default function RequestDetailsModal({ isOpen, onClose, request, currentUser }) {
  const [hasVolunteered, setHasVolunteered] = useState(false)
  const [isVolunteering, setIsVolunteering] = useState(false)
  const [isDonateOpen, setIsDonateOpen]     = useState(false)

  const [viewYear, setViewYear]         = useState(() => new Date().getFullYear())
  const [viewMonth, setViewMonth]       = useState(() => new Date().getMonth())
  const [selectedDay, setSelectedDay]   = useState(null)
  const [selectedHour, setSelectedHour] = useState(null)
  const [busySlots, setBusySlots]           = useState([])
  const [loadingSlots, setLoadingSlots]     = useState(false)
  const [authorProfile, setAuthorProfile]   = useState(null)
  const [showAuthorModal, setShowAuthorModal] = useState(false)
  const [report, setReport]               = useState(null)
  const [loadingReport, setLoadingReport] = useState(false)

  useEffect(() => {
    const now = new Date()
    setHasVolunteered(false)
    setIsVolunteering(false)
    setSelectedDay(null)
    setSelectedHour(null)
    setViewYear(now.getFullYear())
    setViewMonth(now.getMonth())
  }, [request?.id])

  useEffect(() => {
    if (!isOpen || currentUser?.role !== "Волонтер") return
    const token = localStorage.getItem("token")
    setLoadingSlots(true)
    setBusySlots([])
    const params = request?.id ? `?exclude_request_id=${request.id}` : ""
    axios
      .get(`${API}/api/requests/calendar${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(r => setBusySlots(r.data))
      .catch(() => {})
      .finally(() => setLoadingSlots(false))
  }, [isOpen, currentUser?.role, request?.id])

  useEffect(() => {
    if (!isOpen || !request?.author_id || currentUser?.role === "Бенефіціар") return
    setAuthorProfile(null)
    axios
      .get(`${API}/api/users/${request.author_id}`)
      .then((r) => setAuthorProfile(r.data))
      .catch(() => {})
  }, [isOpen, request?.author_id, currentUser?.role])

  useEffect(() => {
    if (!isOpen || request?.status !== "completed") return
    const token = localStorage.getItem("token")
    if (!token) return
    setReport(null)
    setLoadingReport(true)
    axios
      .get(`${API}/api/reports/${request.id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setReport(r.data))
      .catch(() => {})
      .finally(() => setLoadingReport(false))
  }, [isOpen, request?.id, request?.status])

  if (!isOpen || !request) return null

  const category     = CATEGORY_CONFIG[request.category]
  const CategoryIcon = category?.icon ?? Tag
  const status       = STATUS_CONFIG[request.status] ?? { label: request.status, cls: "bg-gray-100 text-gray-500" }
  const raised       = request.collected_amount ?? 0
  const goal         = request.goal_amount ?? 0
  const pct          = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0
  const role         = currentUser?.role

  const handleVolunteer = async () => {
    if (!selectedDay || selectedHour === null) {
      toast.error("Будь ласка, оберіть дату та час.")
      return
    }
    const dt = new Date(selectedDay)
    dt.setHours(selectedHour, 0, 0, 0)
    if (dt <= new Date()) {
      toast.error("Будь ласка, оберіть майбутній час.")
      return
    }
    setIsVolunteering(true)
    try {
      const token = localStorage.getItem("token")
      await axios.post(
        `${API}/api/requests/${request.id}/volunteer`,
        { scheduled_at: dt.toISOString() },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setHasVolunteered(true)
      toast.success("Записано! Подію додано до вашого календаря.")
    } catch (err) {
      if (err.response?.status === 409) {
        toast.error(err.response.data?.detail || "Конфлікт часу — цей слот вже зайнятий.")
      } else {
        toast.error(err.response?.data?.detail || "Щось пішло не так. Спробуйте ще раз.")
      }
    } finally {
      setIsVolunteering(false)
    }
  }

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
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
            <div className="h-full rounded-full bg-indigo-600 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-right text-xs text-gray-400">{pct}% зібрано</p>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          Зібрано: <span className="font-semibold text-gray-900">₴{raised.toLocaleString()}</span>
        </p>
      )}
    </div>
  )

  const renderCTA = () => {
    if (role === "Донор") {
      if (goal <= 0) return <div className="pb-6" />
      return (
        <>
          <ProgressBox />
          <div className="p-6 pt-4">
            <button
              onClick={() => setIsDonateOpen(true)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <DollarSign className="h-4 w-4" />
              Задонатити
            </button>
          </div>
        </>
      )
    }

    if (role === "Волонтер") {
      if (request.status !== "open") {
        return (
          <div className="border-t border-gray-100 px-6 pb-6 pt-5">
            <p className="rounded-2xl bg-gray-50 py-4 text-center text-sm text-gray-400">
              Цей запит закрито і більше не приймає волонтерів.
            </p>
          </div>
        )
      }
      return (
        <div className="border-t border-gray-100 px-6 pb-6 pt-5">
          {hasVolunteered ? (
            <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-5 text-center">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
              <p className="font-semibold text-green-700">Ви успішно записались!</p>
              <p className="mt-1 text-sm text-green-600">Подію додано до вашого календаря.</p>
              {selectedDay && selectedHour !== null && (
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {selectedDay.toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}, {String(selectedHour).padStart(2, "0")}:00
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
                  <p className="text-xs text-gray-400">Оберіть зручну дату та годину</p>
                </div>
              </div>

              {loadingSlots ? (
                <div className="flex justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                </div>
              ) : (
                <>
                  <CalendarPicker
                    viewYear={viewYear}
                    viewMonth={viewMonth}
                    selectedDay={selectedDay}
                    busySlots={busySlots}
                    availFrom={request.available_from}
                    availTo={request.available_to}
                    onPrev={prevMonth}
                    onNext={nextMonth}
                    onDayClick={(date) => { setSelectedDay(date); setSelectedHour(null) }}
                  />

                  {selectedDay && (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                        {selectedDay.toLocaleDateString("uk-UA", { day: "numeric", month: "long" })} — оберіть час
                      </p>
                      <HourSlots
                        selectedDay={selectedDay}
                        busySlots={busySlots}
                        selectedHour={selectedHour}
                        availHourFrom={request.available_hour_from}
                        availHourTo={request.available_hour_to}
                        onHourClick={setSelectedHour}
                      />
                    </div>
                  )}
                </>
              )}

              <button
                onClick={handleVolunteer}
                disabled={!selectedDay || selectedHour === null || isVolunteering}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <HandHeart className="h-4 w-4" />
                {isVolunteering ? "Запис..." : "Підтвердити участь"}
              </button>
            </>
          )}
        </div>
      )
    }

    return goal > 0 ? (
      <>
        <ProgressBox />
        <div className="pb-6" />
      </>
    ) : <div className="pb-6" />
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
                src={request.image_url.startsWith("/") ? `${API}${request.image_url}` : request.image_url}
                alt={request.title}
                className="h-52 w-full object-cover"
              />
            </div>
          )}

          <div className="px-6 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Про цей запит</h3>
            <p className="text-sm leading-relaxed text-gray-600">{request.description}</p>
          </div>

          {/* Proof of Work — shown when request is completed */}
          {request.status === "completed" && (
            <div className="mx-6 mt-5 overflow-hidden rounded-2xl border border-green-200 bg-green-50">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-600">
                  <CheckCircle className="h-3.5 w-3.5 text-white" />
                </div>
                <p className="text-sm font-semibold text-green-800">Підтвердження виконання</p>
              </div>
              {loadingReport ? (
                <div className="flex justify-center pb-5 pt-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-4 border-green-400 border-t-transparent" />
                </div>
              ) : report ? (
                <div className="pb-4">
                  {report.photo_url && (
                    <img
                      src={report.photo_url}
                      alt="Фото звіту"
                      className="mb-3 max-h-56 w-full cursor-zoom-in object-cover"
                      onClick={() => window.open(report.photo_url, "_blank")}
                    />
                  )}
                  <div className="px-4">
                    {report.comment && (
                      <p className="text-sm leading-relaxed text-green-800">{report.comment}</p>
                    )}
                    <p className="mt-2 text-xs text-green-500">
                      {parseUTC(report.created_at).toLocaleDateString("uk-UA", { dateStyle: "medium" })}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 pb-4 text-sm text-green-600">
                  <ImageIcon className="h-4 w-4 shrink-0 text-green-400" />
                  Фото звіт ще не завантажено.
                </div>
              )}
            </div>
          )}

          {/* Author card — visible to everyone except the beneficiary themselves */}
          {role !== "Бенефіціар" && request.author_id && (
            <div className="mx-6 mt-4 flex items-center gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-3">
              {authorProfile?.avatar_url ? (
                <img
                  src={authorProfile.avatar_url.startsWith("/") ? `${API}${authorProfile.avatar_url}` : authorProfile.avatar_url}
                  alt={authorProfile.full_name}
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
                  <UserIcon className="h-5 w-5 text-indigo-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">
                  {authorProfile?.full_name || "—"}
                </p>
                <p className="text-xs text-gray-400">Автор запиту</p>
              </div>
              <button
                onClick={() => setShowAuthorModal(true)}
                className="shrink-0 rounded-xl border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-600 transition hover:bg-indigo-50"
              >
                Профіль
              </button>
            </div>
          )}

          {renderCTA()}

        </div>
      </div>

      <DonateModal
        isOpen={isDonateOpen}
        onClose={() => setIsDonateOpen(false)}
        request={request}
      />

      <UserProfileModal
        isOpen={showAuthorModal}
        onClose={() => setShowAuthorModal(false)}
        userId={request.author_id}
      />
    </>
  )
}
