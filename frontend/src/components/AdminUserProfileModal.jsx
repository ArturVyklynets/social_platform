import { useState, useEffect } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
  X, User, Mail, Phone, FileText, ShieldCheck,
  ClipboardList, DollarSign, HandHeart, ShieldBan, ShieldCheck as ShieldOk,
} from "lucide-react"

const API = "http://localhost:8000"

const ROLES = ["Бенефіціар", "Волонтер", "Донор", "Адмін"]

const ROLE_CLS = {
  "Бенефіціар": "bg-amber-100 text-amber-700",
  "Волонтер":   "bg-green-100 text-green-700",
  "Донор":      "bg-blue-100 text-blue-700",
  "Адмін":      "bg-red-100 text-red-700",
}

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem("token")}` }
}

export default function AdminUserProfileModal({ userId, onClose, onRoleChanged }) {
  const [user, setUser]         = useState(null)
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]       = useState(false)
  const [blocking, setBlocking]   = useState(false)
  const [selectedRole, setSelectedRole] = useState("")

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    axios
      .get(`${API}/api/admin/users/${userId}`, { headers: authHeader() })
      .then((r) => {
        setUser(r.data)
        setSelectedRole(r.data.role)
      })
      .catch(() => toast.error("Не вдалося завантажити профіль."))
      .finally(() => setLoading(false))
  }, [userId])

  const handleToggleBlock = async () => {
    const action = user.is_blocked ? "розблокувати" : "заблокувати"
    if (!window.confirm(`Ви впевнені, що хочете ${action} користувача ${user.email}?`)) return
    setBlocking(true)
    try {
      const { data } = await axios.patch(
        `${API}/api/admin/users/${userId}/block`,
        {},
        { headers: authHeader() },
      )
      setUser((prev) => ({ ...prev, is_blocked: data.is_blocked }))
      toast.success(data.is_blocked ? "Користувача заблоковано." : "Користувача розблоковано.")
      onRoleChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка.")
    } finally {
      setBlocking(false)
    }
  }

  const handleRoleSave = async () => {
    if (selectedRole === user.role) return
    setSaving(true)
    try {
      await axios.patch(
        `${API}/api/admin/users/${userId}/role`,
        { role: selectedRole },
        { headers: authHeader() },
      )
      setUser((prev) => ({ ...prev, role: selectedRole }))
      toast.success("Роль оновлено.")
      onRoleChanged?.()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Помилка при зміні ролі.")
    } finally {
      setSaving(false)
    }
  }

  if (!userId) return null

  const avatarSrc = user?.avatar_url
    ? (user.avatar_url.startsWith("/") ? `${API}${user.avatar_url}` : user.avatar_url)
    : null

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

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : !user ? null : (
          <>
            
            <div className="flex flex-col items-center gap-3 px-8 pb-6 pt-8">
              <div className="relative h-20 w-20 overflow-hidden rounded-full ring-4 ring-indigo-50">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-indigo-100">
                    <User className="h-9 w-9 text-indigo-500" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <h2 className="text-xl font-bold text-gray-900">
                  {user.full_name || "Ім'я не вказано"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">{user.email}</p>
                <span className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ROLE_CLS[user.role] ?? "bg-gray-100 text-gray-600"}`}>
                  <ShieldCheck className="h-3 w-3" />
                  {user.role}
                </span>
              </div>
            </div>

            
            {user.is_blocked && (
              <div className="mx-6 mb-4 flex items-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <ShieldBan className="h-4 w-4 shrink-0" />
                Цей користувач заблокований
              </div>
            )}

            
            <div className="mx-6 mb-6 grid grid-cols-3 gap-3">
              {[
                { icon: ClipboardList, label: "Запитів",      value: user.stats.requests_count  },
                { icon: HandHeart,     label: "Волонтерств",  value: user.stats.volunteer_count  },
                { icon: DollarSign,    label: "Пожертв",      value: user.stats.donations_count  },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex flex-col items-center rounded-2xl bg-gray-50 py-4">
                  <Icon className="mb-1 h-5 w-5 text-indigo-400" />
                  <span className="text-lg font-bold text-gray-900">{value}</span>
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>

            {user.stats.total_donated > 0 && (
              <div className="mx-6 mb-6 flex items-center justify-between rounded-2xl bg-indigo-50 px-5 py-3">
                <span className="text-sm text-indigo-700">Всього задоновано</span>
                <span className="text-base font-bold text-indigo-700">
                  ₴{user.stats.total_donated.toLocaleString("uk-UA")}
                </span>
              </div>
            )}

            
            <div className="mx-6 mb-6 space-y-3">
              <Field icon={Mail}     label="Email"    value={user.email} />
              <Field icon={Phone}    label="Телефон"  value={user.phone} />
              <Field icon={FileText} label="Про себе" value={user.bio}   multiline />
            </div>

            
            <div className="mx-6 mb-4">
              <p className="mb-2 text-sm font-medium text-gray-700">Роль користувача</p>
              <div className="flex gap-2">
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <button
                  onClick={handleRoleSave}
                  disabled={saving || selectedRole === user.role}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? "Збереження..." : "Зберегти"}
                </button>
              </div>
            </div>

            
            <div className="mx-6 mb-8">
              <button
                onClick={handleToggleBlock}
                disabled={blocking}
                className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition disabled:opacity-50 ${
                  user.is_blocked
                    ? "bg-green-50 text-green-700 hover:bg-green-100"
                    : "bg-red-50 text-red-600 hover:bg-red-100"
                }`}
              >
                {user.is_blocked
                  ? <><ShieldOk className="h-4 w-4" />{blocking ? "..." : "Розблокувати користувача"}</>
                  : <><ShieldBan className="h-4 w-4" />{blocking ? "..." : "Заблокувати користувача"}</>
                }
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Field({ icon: Icon, label, value, multiline = false }) {
  return (
    <div className="flex gap-3 rounded-2xl bg-gray-50 px-4 py-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-400">{label}</p>
        {value ? (
          multiline ? (
            <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-900">{value}</p>
          ) : (
            <p className="mt-0.5 text-sm text-gray-900">{value}</p>
          )
        ) : (
          <p className="mt-0.5 text-sm text-gray-400">Не вказано</p>
        )}
      </div>
    </div>
  )
}
