import React, { useState, useEffect, useRef } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import ReCAPTCHA from "react-google-recaptcha"
import { X, Mail, Lock, HeartHandshake, ChevronDown, Heart, HandHeart, DollarSign, ArrowLeft, CheckCircle } from "lucide-react"

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  )
}

const roleOptions = [
  { value: "beneficiary", label: "Бенефіціар", description: "Мені потрібна допомога", icon: Heart },
  { value: "volunteer",   label: "Волонтер",   description: "Хочу пропонувати час і навички", icon: HandHeart },
  { value: "donor",       label: "Донор",       description: "Хочу фінансово підтримувати", icon: DollarSign },
]

export default function AuthModals({ isOpen, type, onClose, onSuccess }) {
  const [activeTab, setActiveTab]           = useState(type || "login")
  const [email, setEmail]                   = useState("")
  const [password, setPassword]             = useState("")
  const [role, setRole]                     = useState("")
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false)
  const [rememberMe, setRememberMe]         = useState(false)
  const [isLoading, setIsLoading]           = useState(false)
  const [error, setError]                   = useState("")
  const [captchaToken, setCaptchaToken]     = useState(null)
  const [forgotEmail, setForgotEmail]       = useState("")
  const [forgotSent, setForgotSent]         = useState(false)
  const captchaRef = useRef(null)

  useEffect(() => {
    setActiveTab(type || "login")
    setError("")
    setCaptchaToken(null)
    setForgotSent(false)
    setForgotEmail("")
    captchaRef.current?.reset()
  }, [type, isOpen])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  const handleGoogleLogin = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/auth/google/login`)
      window.location.href = res.data.url
    } catch {
      setError("Не вдалося підключитися до Google. Спробуйте ще раз.")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      if (activeTab === "login") {
        const formData = new URLSearchParams()
        formData.append("username", email)
        formData.append("password", password)
        const res = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, formData)
        localStorage.setItem("token", res.data.access_token)
        onSuccess()
        onClose()
      } else {
        if (!role) {
          setError("Будь ласка, оберіть роль.")
          setIsLoading(false)
          return
        }
        await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
          email, password, role, captcha_token: captchaToken,
        })
        toast.success("Акаунт створено! Будь ласка, увійдіть.")
        setCaptchaToken(null)
        captchaRef.current?.reset()
        setActiveTab("login")
      }
    } catch (err) {
      setError(err.response?.data?.detail || "Сталася помилка. Спробуйте ще раз.")
      setCaptchaToken(null)
      captchaRef.current?.reset()
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/forgot-password`, { email: forgotEmail })
      setForgotSent(true)
    } catch {
      setError("Щось пішло не так. Спробуйте ще раз.")
    } finally {
      setIsLoading(false)
    }
  }

  const selectedRole = roleOptions.find((r) => r.value === role)

  if (activeTab === "forgot") {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

        <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl">
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
            <X className="h-5 w-5" />
          </button>

          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
              <HeartHandshake className="h-7 w-7 text-white" />
            </div>
          </div>

          {forgotSent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="mb-2 text-xl font-bold text-gray-900">Перевірте пошту</h2>
              <p className="mb-6 text-sm text-gray-500">
                Якщо <span className="font-medium text-gray-700">{forgotEmail}</span> зареєстровано,
                ви отримаєте посилання для скидання пароля протягом кількох хвилин.
              </p>
              <button
                onClick={() => { setActiveTab("login"); setForgotSent(false); }}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Повернутися до входу
              </button>
            </div>
          ) : (
            <>
              <div className="mb-5 text-center">
                <h2 className="text-2xl font-bold text-gray-900">Забули пароль?</h2>
                <p className="mt-2 text-sm text-gray-500">
                  Введіть свій email і ми надішлемо посилання для скидання пароля.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Електронна пошта</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="ви@example.com"
                      required
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-70"
                >
                  {isLoading ? "Надсилання..." : "Надіслати посилання"}
                </button>
              </form>

              <button
                onClick={() => setActiveTab("login")}
                className="mt-4 flex w-full items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Повернутися до входу
              </button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">

        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900">
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600">
            <HeartHandshake className="h-7 w-7 text-white" />
          </div>
        </div>

        <div className="mb-5 text-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {activeTab === "login" ? "З поверненням" : "Створити акаунт"}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {activeTab === "login"
              ? "Увійдіть, щоб продовжити змінювати світ"
              : "Приєднуйтесь до KindLink і починайте допомагати"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-center text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleLogin}
          className="mb-3 flex w-full items-center justify-center gap-3 rounded-xl border border-gray-200 bg-white py-2.5 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow"
        >
          <GoogleIcon />
          Продовжити з Google
        </button>

        <div className="mb-3 flex items-center gap-3">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">АБО</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Електронна пошта</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ви@example.com"
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-900">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={activeTab === "login" ? "Введіть пароль" : "Створіть надійний пароль"}
                required
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
              />
            </div>
          </div>

          {activeTab === "register" && (
            <div className="relative">
              <label className="mb-2 block text-sm font-medium text-gray-900">
                Хочу приєднатися як... <span className="text-red-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-3 text-sm focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition-colors"
              >
                {selectedRole ? (
                  <div className="flex items-center gap-2">
                    <selectedRole.icon className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-gray-900">{selectedRole.label}</span>
                    <span className="hidden text-gray-500 sm:inline">({selectedRole.description})</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Оберіть роль</span>
                )}
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isRoleDropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {isRoleDropdownOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                  {roleOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => { setRole(option.value); setIsRoleDropdownOpen(false) }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${role === option.value ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${role === option.value ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <option.icon className={`h-4 w-4 ${role === option.value ? "text-indigo-600" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <div className={`font-medium ${role === option.value ? "text-indigo-700" : "text-gray-900"}`}>{option.label}</div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "login" && (
            <div className="flex items-center justify-between">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                />
                <span className="text-gray-600">Запам'ятати мене</span>
              </label>
              <button
                type="button"
                onClick={() => { setError(""); setActiveTab("forgot") }}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                Забули пароль?
              </button>
            </div>
          )}

          {activeTab === "register" && (
            <div className="flex justify-center">
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY}
                onChange={(token) => setCaptchaToken(token)}
                onExpired={() => setCaptchaToken(null)}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || (activeTab === "register" && !captchaToken)}
            className="w-full rounded-xl bg-indigo-600 py-3 text-white font-semibold shadow-sm hover:bg-indigo-700 hover:shadow transition disabled:opacity-70"
          >
            {isLoading ? "Обробка..." : (activeTab === "login" ? "Увійти" : "Створити акаунт")}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          {activeTab === "login" ? "Немає акаунту? " : "Вже маєте акаунт? "}
          <button
            onClick={() => { setActiveTab(activeTab === "login" ? "register" : "login"); setError("") }}
            className="font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
          >
            {activeTab === "login" ? "Зареєструватись" : "Увійти"}
          </button>
        </p>
      </div>
    </div>
  )
}
