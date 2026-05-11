import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import { Users, ClipboardList, Trash2, ShieldCheck, Search, ShieldBan, MessageSquare, CheckCircle, Send } from "lucide-react"
import AdminUserProfileModal from "./AdminUserProfileModal"
import AdminRequestDetailModal from "./AdminRequestDetailModal"
import { parseUTC } from "../utils"

const API = "http://localhost:8000"

const ROLES = ["Бенефіціар", "Волонтер", "Донор", "Адмін"]

const ROLE_CLS = {
  "Бенефіціар": "bg-amber-100 text-amber-700",
  "Волонтер":   "bg-green-100 text-green-700",
  "Донор":      "bg-blue-100 text-blue-700",
  "Адмін":      "bg-red-100 text-red-700",
}

const CATEGORY_LABEL = {
  urgent: "Терміново", medical: "Медицина", housing: "Житло",
  food: "Харчування", education: "Освіта",
}

const STATUS_LABEL = { open: "Відкрито", in_progress: "В процесі", completed: "Завершено" }

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` }
}

function SearchBox({ value, onChange, placeholder }) {
  return (
    <div className="relative mb-4 max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
      />
    </div>
  )
}

function UsersTab() {
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(null)
  const [profileUserId, setProfileUserId] = useState(null)
  const [search, setSearch]     = useState("")

  const fetchUsers = useCallback(() => {
    setLoading(true)
    axios
      .get(`${API}/api/admin/users`, { headers: authHeader() })
      .then((r) => setUsers(r.data))
      .catch(() => toast.error("Не вдалося завантажити користувачів."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const filtered = users.filter((u) => {
    const q = search.toLowerCase()
    return (
      (u.full_name?.toLowerCase().includes(q)) ||
      u.email.toLowerCase().includes(q)
    )
  })

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId)
    try {
      await axios.patch(
        `${API}/api/admin/users/${userId}/role`,
        { role: newRole },
        { headers: authHeader() },
      )
      toast.success("Роль оновлено.")
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при зміні ролі.")
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`Видалити користувача ${email}?`)) return
    setUpdating(userId)
    try {
      await axios.delete(`${API}/api/admin/users/${userId}`, { headers: authHeader() })
      toast.success("Користувача видалено.")
      fetchUsers()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при видаленні.")
    } finally {
      setUpdating(null)
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <AdminUserProfileModal
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onRoleChanged={fetchUsers}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Пошук за іменем або email..."
      />

      {filtered.length === 0 ? (
        <Empty icon={Users} text={search ? "Нікого не знайдено за запитом." : "Користувачів не знайдено."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["ID", "Ім'я", "Email", "Роль", "Дії"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((u) => (
                <tr
                  key={u.id}
                  className="cursor-pointer transition-colors hover:bg-indigo-50"
                  onClick={() => setProfileUserId(u.id)}
                >
                  <td className="px-4 py-3 text-gray-400">#{u.id}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {u.is_blocked && (
                        <ShieldBan className="h-3.5 w-3.5 shrink-0 text-red-500" title="Заблокований" />
                      )}
                      <span className={`font-medium ${u.is_blocked ? "text-red-500" : "text-gray-900"}`}>
                        {u.full_name || <span className="text-gray-400">—</span>}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={u.role}
                      disabled={updating === u.id}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className={`rounded-full border-0 px-3 py-1 text-xs font-medium outline-none ring-1 ring-inset ring-gray-200 focus:ring-indigo-500 disabled:opacity-60 ${ROLE_CLS[u.role] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleDelete(u.id, u.email)}
                      disabled={updating === u.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function RequestsTab() {
  const [requests, setRequests]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [deleting, setDeleting]     = useState(null)
  const [selected, setSelected]     = useState(null)
  const [search, setSearch]         = useState("")

  const fetchRequests = useCallback(() => {
    setLoading(true)
    axios
      .get(`${API}/api/admin/requests`, { headers: authHeader() })
      .then((r) => setRequests(r.data))
      .catch(() => toast.error("Не вдалося завантажити запити."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchRequests() }, [fetchRequests])

  const filtered = requests.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async (e, reqId, title) => {
    e.stopPropagation()
    if (!window.confirm(`Видалити запит «${title}»?`)) return
    setDeleting(reqId)
    try {
      await axios.delete(`${API}/api/admin/requests/${reqId}`, { headers: authHeader() })
      toast.success("Запит видалено.")
      setSelected(null)
      fetchRequests()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при видаленні.")
    } finally {
      setDeleting(null)
    }
  }

  const handlePayout = (requestId) => {
    setSelected((prev) => prev ? { ...prev, payout_status: "paid", payout_at: new Date().toISOString(), status: "completed" } : null)
    fetchRequests()
  }

  if (loading) return <Spinner />

  return (
    <>
      <AdminRequestDetailModal
        request={selected}
        onClose={() => setSelected(null)}
        onPayout={handlePayout}
      />

      <SearchBox
        value={search}
        onChange={setSearch}
        placeholder="Пошук за назвою запиту..."
      />

      {filtered.length === 0 ? (
        <Empty icon={ClipboardList} text={search ? "Запитів не знайдено за пошуком." : "Запитів не знайдено."} />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-100">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {["ID", "Назва", "Категорія", "Статус", "Автор", "Зібрано", "Дії"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {filtered.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer transition-colors hover:bg-indigo-50"
                  onClick={() => setSelected(r)}
                >
                  <td className="px-4 py-3 text-gray-400">#{r.id}</td>
                  <td className="max-w-[200px] px-4 py-3">
                    <p className="truncate font-medium text-gray-900">{r.title}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {CATEGORY_LABEL[r.category] ?? r.category ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {r.author
                      ? <span title={r.author.email}>{r.author.full_name || r.author.email}</span>
                      : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 font-semibold text-indigo-700">
                    ₴{(r.collected_amount ?? 0).toLocaleString("uk-UA")}
                    {r.goal_amount
                      ? <span className="ml-1 text-xs font-normal text-gray-400">/ ₴{r.goal_amount.toLocaleString("uk-UA")}</span>
                      : null}
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleDelete(e, r.id, r.title)}
                      disabled={deleting === r.id}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Видалити
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}

function TicketItem({ t, expanded, onToggle, actingExternal, onResolve, onDelete }) {
  const [messages, setMessages]       = useState([])
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [draft, setDraft]             = useState("")
  const [sending, setSending]         = useState(false)

  useEffect(() => {
    if (!expanded) return
    setLoadingMsgs(true)
    axios
      .get(`${API}/api/support/tickets/${t.id}/messages`, { headers: authHeader() })
      .then((r) => setMessages(r.data))
      .catch(() => toast.error("Не вдалося завантажити повідомлення."))
      .finally(() => setLoadingMsgs(false))
  }, [expanded, t.id])

  const handleSend = async () => {
    const body = draft.trim()
    if (!body) return
    setSending(true)
    try {
      const { data } = await axios.post(
        `${API}/api/support/tickets/${t.id}/messages`,
        { body },
        { headers: authHeader() },
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
        className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-100 transition-colors"
        onClick={onToggle}
      >
        <MessageSquare className={`mt-0.5 h-4 w-4 shrink-0 ${t.status === "resolved" ? "text-gray-300" : "text-indigo-500"}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`truncate text-sm font-semibold ${t.status === "resolved" ? "text-gray-400 line-through" : "text-gray-900"}`}>
              {t.title}
            </p>
            {t.status === "open" && (
              <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                Нове
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-gray-400">
            {t.user?.full_name || t.user?.email}
            {" · "}
            {t.created_at ? parseUTC(t.created_at).toLocaleString("uk-UA", { dateStyle: "medium", timeStyle: "short" }) : "—"}
          </p>
        </div>
      </button>

      
      {expanded && (
        <div className="border-t border-gray-200 bg-white px-4 py-4">
          
          <p className="mb-1 text-xs font-medium text-gray-400">
            Звернення від {t.user?.full_name || t.user?.email}
          </p>
          <div className="mb-4 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">{t.body}</p>
          </div>

          
          {loadingMsgs ? (
            <div className="flex justify-center py-4">
              <div className="h-5 w-5 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : (
            <div className="mb-4 space-y-2">
              {messages.length === 0 && (
                <p className="py-2 text-center text-xs text-gray-400">Переписки ще немає</p>
              )}
              {messages.map((m) => {
                const isAdmin = m.sender_role === "Адмін"
                return (
                  <div key={m.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isAdmin ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-900"
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                      <p className={`mt-1 text-xs ${isAdmin ? "text-indigo-200" : "text-gray-400"}`}>
                        {m.sender_name || m.sender_email}
                        {" · "}
                        {parseUTC(m.created_at).toLocaleString("uk-UA", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          
          {t.status === "open" && (
            <div className="mb-4 flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Написати відповідь..."
                rows={2}
                maxLength={2000}
                className="flex-1 resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

          
          <div className="flex gap-2">
            {t.status === "open" && (
              <button
                onClick={() => onResolve(t.id)}
                disabled={actingExternal}
                className="inline-flex items-center gap-1.5 rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Закрити звернення
              </button>
            )}
            <button
              onClick={() => onDelete(t.id)}
              disabled={actingExternal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Видалити
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function TicketList({ items, expanded, setExpanded, acting, onResolve, onDelete }) {
  return (
    <ul className="space-y-3">
      {items.map((t) => (
        <TicketItem
          key={t.id}
          t={t}
          expanded={expanded === t.id}
          onToggle={() => setExpanded(expanded === t.id ? null : t.id)}
          actingExternal={acting === t.id}
          onResolve={onResolve}
          onDelete={onDelete}
        />
      ))}
    </ul>
  )
}

function TicketsTab() {
  const [tickets, setTickets]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [acting, setActing]     = useState(null)

  const fetchTickets = useCallback(() => {
    setLoading(true)
    axios
      .get(`${API}/api/support/tickets`, { headers: authHeader() })
      .then((r) => setTickets(r.data))
      .catch(() => toast.error("Не вдалося завантажити звернення."))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const handleResolve = async (id) => {
    setActing(id)
    try {
      await axios.patch(`${API}/api/support/tickets/${id}/resolve`, {}, { headers: authHeader() })
      toast.success("Звернення закрито.")
      fetchTickets()
    } catch {
      toast.error("Помилка.")
    } finally {
      setActing(null)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm("Видалити це звернення?")) return
    setActing(id)
    try {
      await axios.delete(`${API}/api/support/tickets/${id}`, { headers: authHeader() })
      toast.success("Видалено.")
      setExpanded(null)
      fetchTickets()
    } catch {
      toast.error("Помилка.")
    } finally {
      setActing(null)
    }
  }

  if (loading) return <Spinner />

  const open     = tickets.filter((t) => t.status === "open")
  const resolved = tickets.filter((t) => t.status === "resolved")

  if (tickets.length === 0) {
    return <Empty icon={MessageSquare} text="Звернень поки немає." />
  }

  return (
    <div className="space-y-6">
      {open.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Нові звернення — {open.length}
          </h3>
          <TicketList
            items={open}
            expanded={expanded}
            setExpanded={setExpanded}
            acting={acting}
            onResolve={handleResolve}
            onDelete={handleDelete}
          />
        </section>
      )}
      {resolved.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
            Закриті — {resolved.length}
          </h3>
          <TicketList
            items={resolved}
            expanded={expanded}
            setExpanded={setExpanded}
            acting={acting}
            onResolve={handleResolve}
            onDelete={handleDelete}
          />
        </section>
      )}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
    </div>
  )
}

function Empty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
        <Icon className="h-6 w-6 text-gray-400" />
      </div>
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  )
}

const TABS = [
  { id: "users",    label: "Користувачі", icon: Users },
  { id: "requests", label: "Запити",      icon: ClipboardList },
  { id: "tickets",  label: "Звернення",   icon: MessageSquare },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("users")

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="mx-auto max-w-7xl px-6">

        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
            <ShieldCheck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Адмін-панель</h1>
            <p className="text-sm text-gray-500">Управління користувачами та запитами платформи</p>
          </div>
        </div>

        <div className="mb-6 flex gap-2">
          {TABS.map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <TabIcon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
          {activeTab === "users"    && <UsersTab />}
          {activeTab === "requests" && <RequestsTab />}
          {activeTab === "tickets"  && <TicketsTab />}
        </div>

      </div>
    </div>
  )
}
