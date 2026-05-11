import React, { useState, useEffect } from "react"
import axios from "axios"
import { HeartHandshake, Users, CheckCircle, ArrowRight, Heart, Globe, Shield } from "lucide-react"

const API = "http://localhost:8000"

function fmtCount(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}М+`
  if (n >= 1_000)     return `${Math.floor(n / 1_000)} тис.+`
  return String(n)
}

function fmtMoney(n) {
  if (n >= 1_000_000) return `₴${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}М+`
  if (n >= 1_000)     return `₴${Math.floor(n / 1_000)} тис.+`
  return `₴${Math.round(n)}`
}

export default function LandingPage({ onNavigate, onRegister }) {
  const [statsData, setStatsData] = useState(null)

  useEffect(() => {
    axios.get(`${API}/api/requests/platform-stats`)
      .then((r) => setStatsData(r.data))
      .catch(() => {})
  }, [])

  const steps = [
    {
      icon: HeartHandshake,
      title: "Розмістіть запит",
      description: "Розкажіть, яка допомога вам потрібна — фінансова підтримка, навички чи час.",
    },
    {
      icon: Users,
      title: "Знайдіть помічників",
      description: "Зв'яжіться з волонтерами та донорами у вашій громаді, які хочуть допомогти.",
    },
    {
      icon: CheckCircle,
      title: "Вирішіть разом",
      description: "Працюйте спільно, щоб подолати труднощі та створити позитивні зміни у громаді.",
    },
  ]

  const stats = statsData
    ? [
        { value: fmtCount(statsData.requests_count), label: "Запитів про допомогу" },
        { value: fmtCount(statsData.volunteers),     label: "Активних волонтерів" },
        { value: fmtMoney(statsData.collected_uah),  label: "Зібрано коштів" },
        { value: fmtCount(statsData.total_users),    label: "Учасників платформи" },
      ]
    : [
        { value: "—", label: "Запитів про допомогу" },
        { value: "—", label: "Активних волонтерів" },
        { value: "—", label: "Зібрано коштів" },
        { value: "—", label: "Учасників платформи" },
      ]

  return (
    <div className="flex flex-col bg-white">
      
      <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/50 via-white to-white">
        <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8 lg:py-36">
          <div className="mx-auto max-w-3xl text-center">

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-50 px-4 py-1.5 text-sm font-medium text-indigo-700">
              <Heart className="h-4 w-4" />
              Разом робимо громади сильнішими
            </div>

            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              Підтримай, об'єднайся, допоможи своїй громаді
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-gray-500 sm:text-xl">
              KindLink з'єднує тих, хто потребує допомоги, з тими, хто готовий її надати.
              Приєднуйтесь до тисяч людей, які щодня змінюють своє оточення на краще.
            </p>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={() => onNavigate("dashboard")}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base font-semibold text-white transition-colors hover:bg-indigo-700 sm:w-auto shadow-sm"
              >
                Знайти допомогу
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                onClick={onRegister}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-colors hover:bg-gray-50 hover:text-gray-900 sm:w-auto"
              >
                Стати волонтером
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <section className="border-y border-gray-100 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-indigo-600 sm:text-4xl">{stat.value}</div>
                <div className="mt-1 text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <section className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
              Як працює KindLink
            </h2>
            <p className="mt-4 text-pretty text-lg text-gray-500">
              Три прості кроки, щоб зробити реальний вплив у своїй громаді.
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-5xl">
            <div className="grid gap-8 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.title} className="relative rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm transition-shadow hover:shadow-md">
                  <div className="absolute -top-4 left-1/2 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-sm">
                    {index + 1}
                  </div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                    <step.icon className="h-7 w-7 text-indigo-600" />
                  </div>
                  <h3 className="mt-6 text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-balance text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                Побудовано на довірі, рухається серцем
              </h2>
              <p className="mt-4 text-pretty text-lg leading-relaxed text-gray-500">
                KindLink гарантує, що кожен зв'язок є значущим, а кожен внесок справді змінює чиєсь життя.
              </p>
              <div className="mt-8 space-y-6">
                {[
                  { icon: Shield, title: "Перевірені запити",       description: "Кожен запит перевіряється для підтвердження автентичності та реальної потреби." },
                  { icon: Globe,  title: "Місцевий вплив",          description: "Зв'яжіться з людьми у вашому районі для швидшої та особистішої підтримки." },
                  { icon: Heart,  title: "Прозорий прогрес",        description: "Відстежуйте пожертви та волонтерський внесок у режимі реального часу." },
                ].map((feature) => (
                  <div key={feature.title} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                      <feature.icon className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{feature.title}</h3>
                      <p className="mt-1 text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-indigo-100 via-indigo-50 to-white p-8 border border-gray-100 shadow-sm">
                <div className="flex h-full w-full items-center justify-center rounded-2xl border border-white bg-white/50 backdrop-blur shadow-sm">
                  <HeartHandshake className="h-32 w-32 text-indigo-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-indigo-600 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Готові приєднатися?
            </h2>
            <p className="mt-4 text-lg text-indigo-100">
              Приєднуйтесь до KindLink сьогодні та станьте частиною спільноти, якій не байдуже.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                onClick={onRegister}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-indigo-600 transition-colors hover:bg-gray-50 shadow-sm sm:w-auto"
              >
                Почати
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
                <HeartHandshake className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">KindLink</span>
            </div>
            <p className="text-sm text-gray-500">
              © 2026 KindLink. Усі права захищено. Разом будуємо сильніші громади.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
