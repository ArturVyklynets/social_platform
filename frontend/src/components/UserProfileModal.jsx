import { useState, useEffect } from "react"
import axios from "axios"
import { X, Star, User as UserIcon, Heart, Shield, DollarSign } from "lucide-react"
import { parseUTC } from "../utils"

const API = import.meta.env.VITE_API_URL

const ROLE_CONFIG = {
  "Волонтер":   { label: "Волонтер",   cls: "bg-green-100 text-green-700"  },
  "Бенефіціар": { label: "Бенефіціар", cls: "bg-amber-100 text-amber-700"  },
  "Донор":      { label: "Донор",      cls: "bg-blue-100 text-blue-700"    },
}

function StarRow({ rating }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${s <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  )
}

export default function UserProfileModal({ isOpen, onClose, userId }) {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !userId) return
    setProfile(null)
    setReviews([])
    setLoading(true)
    Promise.all([
      axios.get(`${API}/api/users/${userId}`),
      axios.get(`${API}/api/users/${userId}/reviews`),
    ])
      .then(([pRes, rRes]) => {
        setProfile(pRes.data)
        setReviews(rRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isOpen, userId])

  if (!isOpen) return null

  const roleConf   = ROLE_CONFIG[profile?.role] ?? { label: profile?.role ?? "—", cls: "bg-gray-100 text-gray-600" }
  const avatarSrc  = profile?.avatar_url
    ? (profile.avatar_url.startsWith("/") ? `${API}${profile.avatar_url}` : profile.avatar_url)
    : null

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl bg-white shadow-xl max-h-[88vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          </div>
        ) : (
          <>
            {/* ── Profile card ── */}
            <div className="p-8 pb-6">
              <div className="flex items-center gap-4">
                <div className="shrink-0">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt={profile?.full_name}
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo-100">
                      <UserIcon className="h-8 w-8 text-indigo-400" />
                    </div>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-lg font-bold leading-tight text-gray-900">
                    {profile?.full_name || "Ім'я не вказано"}
                  </p>
                  <span className={`mt-1 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${roleConf.cls}`}>
                    {roleConf.label}
                  </span>

                  {profile?.average_rating && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-bold text-gray-900">
                        {profile.average_rating.toFixed(1)}
                      </span>
                      <span className="text-xs text-gray-400">
                        ({profile.reviews_count} відгуків)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {profile?.bio && (
                <p className="mt-4 text-sm leading-relaxed text-gray-600">{profile.bio}</p>
              )}

              {!profile?.bio && !loading && (
                <p className="mt-4 text-sm italic text-gray-400">Опис не заповнено.</p>
              )}
            </div>

            {/* ── Reviews ── */}
            {reviews.length > 0 && (
              <div className="border-t border-gray-100 px-8 pb-8 pt-5">
                <h3 className="mb-4 text-sm font-semibold text-gray-700">
                  Відгуки ({reviews.length})
                </h3>
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-medium text-gray-900">
                          {r.author_name || "Анонім"}
                        </p>
                        <StarRow rating={r.rating} />
                      </div>
                      {r.comment && (
                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{r.comment}</p>
                      )}
                      <p className="mt-2 text-xs text-gray-400">
                        {parseUTC(r.created_at).toLocaleDateString("uk-UA", { dateStyle: "medium" })}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {reviews.length === 0 && profile?.role === "Волонтер" && (
              <div className="border-t border-gray-100 px-8 pb-8 pt-5 text-center">
                <p className="text-sm text-gray-400">Відгуків поки немає.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
