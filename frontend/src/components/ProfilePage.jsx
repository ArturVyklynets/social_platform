import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
  User, Mail, Phone, FileText, Heart, HandHeart, DollarSign,
  Save, Shield, ClipboardList, Camera, CalendarClock,
  CheckCircle, XCircle, MessageSquare, Send, ChevronDown,
} from "lucide-react"

const ROLE_CONFIG = {
  "Волонтер":   { label: "Волонтер",   cls: "bg-green-100 text-green-700",  icon: Shield },
  "Бенефіціар": { label: "Бенефіціар", cls: "bg-amber-100 text-amber-700",  icon: Heart },
  "Донор":      { label: "Донор",      cls: "bg-blue-100 text-blue-700",    icon: DollarSign },
  "Адмін":      { label: "Адмін",      cls: "bg-red-100 text-red-700",      icon: Shield },
}

const STATUS_BADGE = {
  pending:  { label: "Очікує підтвердження", cls: "bg-yellow-100 text-yellow-700" },
  approved: { label: "Підтверджено",          cls: "bg-green-100 text-green-700"  },
  rejected: { label: "Відхилено",             cls: "bg-red-100 text-red-700"      },
}

const TABS = [
  { id: "requests",     label: "Мої запити",       icon: Heart },
  { id: "donations",    label: "Мої пожертви",     icon: DollarSign },
  { id: "volunteering", label: "Моє волонтерство", icon: HandHeart },
  { id: "tickets",      label: "Мої звернення",    icon: MessageSquare },
]

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"

const API = "http://localhost:8000"

function VolunteeringTab() {
  const [apps, setApps]       = useState([])
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"))

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    axios
      .get(`${API}/api/requests/my-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setApps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (apps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <HandHeart className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Ви ще не записувались на волонтерство.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {apps.map((app) => {
        const badge = STATUS_BADGE[app.status] ?? STATUS_BADGE.pending
        return (
          <li key={app.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
              <CalendarClock className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{app.request_title}</p>
              <p className="mt-0.5 text-xs text-gray-400">
                {new Date(app.scheduled_at).toLocaleString("uk-UA", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
              {badge.label}
            </span>
          </li>
        )
      })}
    </ul>
  )
}

const CATEGORY_LABEL = {
  urgent: "Терміново", medical: "Медицина", housing: "Житло",
  food: "Харчування", education: "Освіта",
}

const STATUS_LABEL = { open: "Відкрито", in_progress: "В процесі", completed: "Завершено" }

function MyRequestsTab() {
  const [reqs, setReqs]       = useState([])
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"))

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    axios
      .get(`${API}/api/requests/my-requests`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setReqs(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (reqs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <ClipboardList className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Ви ще не розміщували жодного запиту про допомогу.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-4">
      {reqs.map((r) => {
        const goal    = r.goal_amount ?? 0
        const raised  = r.collected_amount ?? 0
        const pct     = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0
        return (
          <li key={r.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900">{r.title}</p>
              <span className="shrink-0 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs text-gray-600">
                {STATUS_LABEL[r.status] ?? r.status}
              </span>
            </div>

            {goal > 0 ? (
              <>
                <div className="mb-1 flex items-baseline justify-between text-xs text-gray-500">
                  <span className="font-semibold text-gray-800">₴{raised.toLocaleString("uk-UA")} зібрано</span>
                  <span>з ₴{goal.toLocaleString("uk-UA")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="mt-1 text-right text-xs text-gray-400">{pct}%</p>
              </>
            ) : (
              <p className="text-xs text-gray-400">
                Зібрано: <span className="font-semibold text-gray-700">₴{raised.toLocaleString("uk-UA")}</span>
                {" "}· Фінансова мета не вказана
              </p>
            )}

            {r.card_number && (
              <p className="mt-2 text-xs text-gray-400">
                Картка для виплати: <span className="font-mono">{r.card_number}</span>
              </p>
            )}

            {(r.collected_amount ?? 0) > 0 && (
              <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                r.payout_status === "paid"
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {r.payout_status === "paid"
                  ? `Кошти виплачено${r.payout_at ? " · " + new Date(r.payout_at).toLocaleDateString("uk-UA") : ""}`
                  : "Очікує виплати від адміна"}
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function DonationsTab() {
  const [donations, setDonations] = useState([])
  const [loading, setLoading]     = useState(() => !!localStorage.getItem("token"))

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    axios
      .get(`${API}/api/payments/my-donations`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setDonations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (donations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <DollarSign className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">Ви ще не зробили жодної пожертви.</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-gray-100">
      {donations.map((d) => (
        <li key={d.id} className="flex items-center gap-3 py-4 first:pt-0 last:pb-0">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50">
            <DollarSign className="h-5 w-5 text-green-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-gray-900">{d.request_title}</p>
            <p className="mt-0.5 text-xs text-gray-400">
              {d.created_at
                ? new Date(d.created_at).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })
                : "—"}
            </p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-green-700">
            ₴{d.amount.toLocaleString("uk-UA")}
          </span>
        </li>
      ))}
    </ul>
  )
}

function TicketCard({ t, userId }) {
  const [expanded, setExpanded]       = useState(false)
  const [messages, setMessages]       = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [draft, setDraft]             = useState("")
  const [sending, setSending]         = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoadingMsgs(true)
    const token = localStorage.getItem("token")
    axios
      .get(`${API}/api/support/tickets/${t.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setMessages(r.data))
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }, [expanded, t.id])

  const handleSend = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    const token = localStorage.getItem("token")
    try {
      const { data } = await axios.post(
        `${API}/api/support/tickets/${t.id}/messages`,
        { body },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      setMessages((prev) => [...prev, data])
      setDraft("")
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка.")
    } finally {
      setSending(false)
    }
  }

  return (
    <li className="rounded-2xl border border-gray-100 bg-gray-50 overflow-hidden">
      
      <button
        className="flex w-full items-center justify-between gap-2 px-4 py-4 text-left hover:bg-gray-100 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-gray-900">{t.title}</p>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              t.status === "resolved" ? "bg-green-100 text-green-700" : "bg-indigo-100 text-indigo-700"
            }`}>
              {t.status === "resolved" ? "Вирішено" : "Відкрито"}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {t.created_at
              ? new Date(t.created_at).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" })
              : "—"}
          </p>
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      
      {expanded && (
        <div className="border-t border-gray-100 bg-white px-4 py-4">
          
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="mb-1 text-xs font-medium text-gray-400">Ваше звернення</p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{t.body}</p>
          </div>

          
          {loadingMsgs ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {messages.length === 0 && (
                <p className="py-2 text-center text-xs text-gray-400">Відповіді ще немає</p>
              )}
              {messages.map((m) => {
                const isOwn   = m.sender_id === userId
                const isAdmin = m.sender_role === "Адмін"
                return (
                  <div key={m.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isAdmin
                        ? "border border-indigo-100 bg-indigo-50 text-gray-900"
                        : "bg-gray-100 text-gray-900"
                    }`}>
                      {isAdmin && (
                        <p className="mb-1 text-xs font-semibold text-indigo-600">Адміністратор</p>
                      )}
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {new Date(m.created_at).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          
          {t.status === "open" && (
            <div className="flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Написати відповідь..."
                rows={2}
                maxLength={2000}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              />
              <button
                onClick={handleSend}
                disabled={sending || !draft.trim()}
                className="self-end inline-flex items-center justify-center rounded-xl bg-indigo-600 p-2.5 text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  )
}

function MyTicketsTab({ userId }) {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(() => !!localStorage.getItem("token"))

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    axios
      .get(`${API}/api/support/my-tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setTickets(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
          <MessageSquare className="h-6 w-6 text-gray-400" />
        </div>
        <p className="text-sm text-gray-500">У вас ще немає звернень до адміністратора.</p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {tickets.map((t) => (
        <TicketCard key={t.id} t={t} userId={userId} />
      ))}
    </ul>
  )
}

const EMPTY_STATE = {
  requests:     { icon: ClipboardList,   text: "Ви ще не розміщували жодного запиту про допомогу." },
  donations:    { icon: DollarSign,      text: "Ви ще не зробили жодної пожертви." },
  volunteering: { icon: HandHeart,       text: "Ви ще не записувались на волонтерство." },
  tickets:      { icon: MessageSquare,   text: "У вас ще немає звернень до адміністратора." },
}

function EmptyTab({ id }) {
  const { icon: Icon, text } = EMPTY_STATE[id]
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

function TabContent({ activeTab, role, userId }) {
  if (activeTab === "tickets")                               return <MyTicketsTab userId={userId} />
  if (activeTab === "volunteering" && role === "Волонтер")   return <VolunteeringTab />
  if (activeTab === "donations"    && role === "Донор")       return <DonationsTab />
  if (activeTab === "requests"     && role === "Бенефіціар") return <MyRequestsTab />
  return <EmptyTab id={activeTab} />
}

function IncomingApplicationsCard() {
  const [apps, setApps]         = useState([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(null)

  const fetchApps = useCallback(() => {
    const token = localStorage.getItem("token")
    if (!token) { setLoading(false); return }
    setLoading(true)
    axios
      .get(`${API}/api/requests/my-incoming-applications`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setApps(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchApps() }, [fetchApps])

  const handleStatus = async (appId, newStatus) => {
    setUpdating(appId)
    try {
      const token = localStorage.getItem("token")
      await axios.patch(
        `${API}/api/requests/applications/${appId}/status`,
        { status: newStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      toast.success(newStatus === "approved" ? "Заявку схвалено!" : "Заявку відхилено.")
      fetchApps()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка. Спробуйте ще раз.")
    } finally {
      setUpdating(null)
    }
  }

  const pending  = apps.filter((a) => a.status === "pending")
  const resolved = apps.filter((a) => a.status !== "pending")

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900">Пропозиції допомоги</h2>
        <p className="mt-1 text-sm text-indigo-500">
          Волонтери, які хочуть допомогти з вашими запитами.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="h-6 w-6 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : apps.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
            <HandHeart className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Поки що жодних пропозицій від волонтерів.</p>
        </div>
      ) : (
        <div className="space-y-8">

          
          {pending.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Очікують рішення — {pending.length}
              </h3>
              <ul className="space-y-3">
                {pending.map((app) => (
                  <li
                    key={app.id}
                    className="flex items-start justify-between gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold text-indigo-700">
                          {app.volunteer_name || app.volunteer_email}
                        </span>{" "}
                        хоче допомогти з{" "}
                        <span className="font-semibold">«{app.request_title}»</span>
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                        <CalendarClock className="h-3.5 w-3.5" />
                        {new Date(app.scheduled_at).toLocaleString("uk-UA", {
                          dateStyle: "long",
                          timeStyle: "short",
                        })}
                      </p>
                      {app.volunteer_phone && (
                        <p className="mt-0.5 text-xs text-gray-400">{app.volunteer_phone}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                      <button
                        onClick={() => handleStatus(app.id, "approved")}
                        disabled={updating === app.id}
                        className="flex items-center gap-1.5 rounded-xl bg-green-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                      >
                        <CheckCircle className="h-3.5 w-3.5" />
                        Схвалити
                      </button>
                      <button
                        onClick={() => handleStatus(app.id, "rejected")}
                        disabled={updating === app.id}
                        className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-50 disabled:opacity-60"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Відхилити
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          
          {resolved.length > 0 && (
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Оброблені — {resolved.length}
              </h3>
              <ul className="divide-y divide-gray-100">
                {resolved.map((app) => {
                  const badge = STATUS_BADGE[app.status]
                  return (
                    <li key={app.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm text-gray-700">
                          {app.volunteer_name || app.volunteer_email}
                          {" → "}
                          <span className="font-medium">«{app.request_title}»</span>
                        </p>
                        <p className="text-xs text-gray-400">
                          {new Date(app.scheduled_at).toLocaleString("uk-UA", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  const [user, setUser]               = useState(null)
  const [isLoadingUser, setIsLoadingUser] = useState(() => !!localStorage.getItem("token"))
  const [fetchError, setFetchError]   = useState(() =>
    !localStorage.getItem("token") ? "You must be logged in to view this page." : ""
  )

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName]   = useState("")
  const [phone, setPhone]         = useState("")
  const [bio, setBio]             = useState("")

  const [activeTab, setActiveTab]     = useState("requests")
  const [isSaving, setIsSaving]       = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError]     = useState("")

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    Promise.all([
      axios.get(`${API}/api/users/me`, { headers }),
      axios.get(`${API}/api/users/me/profile`, { headers }),
    ])
      .then(([userRes, profileRes]) => {
        setUser(userRes.data)
        const { full_name, phone, bio } = profileRes.data
        if (full_name) {
          const [first, ...rest] = full_name.trim().split(" ")
          setFirstName(first)
          setLastName(rest.join(" "))
        }
        if (phone) setPhone(phone)
        if (bio)   setBio(bio)
      })
      .catch(() => setFetchError("Failed to load profile. Please try again."))
      .finally(() => setIsLoadingUser(false))
  }, [])

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append("file", file)
    setIsUploadingAvatar(true)
    try {
      const token = localStorage.getItem("token")
      const { data } = await axios.post(
        `${API}/api/users/me/avatar`,
        formData,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setUser((prev) => ({ ...prev, avatar_url: data.url }))
      toast.success("Аватар оновлено!")
    } catch {
      toast.error("Не вдалося завантажити аватар. Спробуйте ще раз.")
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setSaveSuccess(false)
    setSaveError("")
    try {
      const token = localStorage.getItem("token")
      await axios.put(
        `${API}/api/users/me/profile`,
        {
          full_name: [firstName, lastName].filter(Boolean).join(" ") || null,
          phone: phone || null,
          bio: bio || null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch {
      setSaveError("Failed to save. Please try again.")
    } finally {
      setIsSaving(false)
    }
  }

  const roleConfig  = ROLE_CONFIG[user?.role] ?? { label: user?.role ?? "—", cls: "bg-gray-100 text-gray-600", icon: Shield }
  const RoleIcon    = roleConfig.icon
  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Your Name"
  const avatarSrc   = user?.avatar_url ? `${API}${user.avatar_url}` : null

  if (isLoadingUser) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-red-500">
          {fetchError === "You must be logged in to view this page."
            ? "Ви повинні увійти, щоб переглянути цю сторінку."
            : fetchError === "Failed to load profile. Please try again."
            ? "Не вдалося завантажити профіль. Спробуйте ще раз."
            : fetchError}
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto flex max-w-6xl gap-6 px-6">

        
        <aside className="flex w-72 flex-shrink-0 flex-col gap-5">

          
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">

              
              <label className="group relative mb-4 cursor-pointer">
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={isUploadingAvatar}
                />
                <div className="relative h-20 w-20 overflow-hidden rounded-full">
                  {avatarSrc ? (
                    <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-indigo-100">
                      <User className="h-9 w-9 text-indigo-500" />
                    </div>
                  )}
                  {isUploadingAvatar && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    </div>
                  )}
                  {!isUploadingAvatar && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                      <Camera className="h-5 w-5 text-white" />
                      <span className="text-[10px] font-medium text-white">Змінити</span>
                    </div>
                  )}
                </div>
              </label>

              <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
              <p className="mt-1 break-all text-sm text-gray-500">{user?.email}</p>
              <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${roleConfig.cls}`}>
                <RoleIcon className="h-3 w-3" />
                {roleConfig.label}
              </span>
            </div>
          </div>

          
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold text-gray-700">Ваш вплив</h3>
            <ul className="space-y-3">
              {[
                { label: "Розміщено запитів",  value: "0"  },
                { label: "Всього задоновано",  value: "₴0" },
                { label: "Годин волонтерства", value: "0"  },
              ].map(({ label, value }) => (
                <li key={label} className="flex items-center justify-between border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-semibold text-gray-900">{value}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        
        <div className="flex min-w-0 flex-1 flex-col gap-5">

          
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-gray-900">Налаштування профілю</h2>
              <p className="mt-1 text-sm text-indigo-500">Оновіть свою особисту інформацію та налаштування.</p>
            </div>

            <form onSubmit={handleSave}>
              <div className="grid grid-cols-2 gap-4">

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Ім'я</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Іван" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Прізвище</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Франко" className={inputCls} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Електронна пошта</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="email" value={user?.email ?? ""} readOnly disabled className={`${inputCls} cursor-not-allowed opacity-60`} />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Номер телефону</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+380 (67) 123-4567" className={inputCls} />
                  </div>
                </div>

                <div className="col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-900">Про себе</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Захоплений допомогою своїй громаді та позитивними змінами в суспільстві."
                      rows={4}
                      maxLength={500}
                      className={`${inputCls} resize-none pt-3`}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-3">
                {saveSuccess && <span className="text-sm font-medium text-green-600">Зміни збережено!</span>}
                {saveError   && <span className="text-sm font-medium text-red-500">{saveError}</span>}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow disabled:opacity-70"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Збереження..." : "Зберегти зміни"}
                </button>
              </div>
            </form>
          </div>

          
          <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
            <div className="mb-6 flex gap-2">
              {TABS.map((tab) => {
                const TabIcon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                  >
                    <TabIcon className="h-3.5 w-3.5" />
                    {tab.label}
                  </button>
                )
              })}
            </div>
            <TabContent activeTab={activeTab} role={user?.role} userId={user?.id} />
          </div>

          
          {user?.role === "Бенефіціар" && <IncomingApplicationsCard />}

        </div>
      </div>
    </div>
  )
}
