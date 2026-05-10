import React, { useState } from "react"
import axios from "axios"
import { HeartHandshake, Lock, CheckCircle, XCircle } from "lucide-react"

export default function ResetPasswordPage({ token, onDone }) {
  const [password, setPassword]   = useState("")
  const [confirm, setConfirm]     = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState("")

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (password.length < 8) {
      setError("Пароль повинен містити щонайменше 8 символів.")
      return
    }
    if (password !== confirm) {
      setError("Паролі не збігаються.")
      return
    }

    setIsLoading(true)
    try {
      await axios.post("http://localhost:8000/api/auth/reset-password", {
        token,
        new_password: password,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || "Щось пішло не так. Спробуйте ще раз.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-xl">

        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
        </div>

        {success ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Пароль оновлено!</h2>
            <p className="mb-6 text-sm text-gray-500">
              Ваш пароль успішно змінено. Тепер ви можете увійти з новим паролем.
            </p>
            <button
              onClick={onDone}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Перейти до входу
            </button>
          </div>
        ) : !token ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Недійсне посилання</h2>
            <p className="mb-6 text-sm text-gray-500">
              Це посилання для скидання пароля відсутнє або некоректне. Будь ласка, запросіть нове.
            </p>
            <button
              onClick={onDone}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              На головну
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-900">Встановити новий пароль</h2>
              <p className="mt-2 text-sm text-gray-500">
                Оберіть надійний пароль для вашого акаунту KindLink.
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Новий пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Щонайменше 8 символів"
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-900">Підтвердити пароль</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Повторіть пароль"
                    required
                    className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
                  />
                </div>
              </div>

              {password.length > 0 && (
                <p className={`text-xs ${password.length >= 8 ? "text-green-600" : "text-amber-500"}`}>
                  {password.length >= 8 ? "✓ Достатньо надійний" : `Ще ${8 - password.length} символів`}
                </p>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-70"
              >
                {isLoading ? "Оновлення..." : "Оновити пароль"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
