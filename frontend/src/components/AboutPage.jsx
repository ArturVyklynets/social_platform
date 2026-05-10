import React from "react"
import { Heart, Users, Target, Shield, Globe, Award, Lightbulb, HandHeart, Mail, MapPin, Phone } from "lucide-react"
import toast from "react-hot-toast"

export default function AboutPage({ onGetStarted }) {
  const values = [
    {
      icon: Heart,
      title: "Людяність понад усе",
      description: "Кожна взаємодія на платформі керується емпатією та щирою турботою про інших.",
    },
    {
      icon: Shield,
      title: "Довіра та безпека",
      description: "Ми перевіряємо всі запити та дотримуємось суворих стандартів конфіденційності.",
    },
    {
      icon: Globe,
      title: "Відкрита спільнота",
      description: "Кожен заслуговує на допомогу, коли вона потрібна, незалежно від походження чи обставин.",
    },
    {
      icon: Lightbulb,
      title: "Інновації",
      description: "Ми постійно вдосконалюємо платформу, щоб надавати та отримувати допомогу було простіше.",
    },
  ]

  const milestones = [
    { year: "2024", event: "Концепція KindLink розроблена для вирішення потреб місцевих громад." },
    { year: "2025", event: "Архітектура платформи та основні функції спроектовані та побудовані." },
    { year: "2026", event: "Офіційний запуск платформи KindLink, що об'єднує тисячі людей." },
  ]

  return (
    <div className="min-h-screen bg-white">
      
      <section className="relative overflow-hidden bg-indigo-600 px-4 py-20 text-white sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm">
            <HandHeart className="h-4 w-4" />
            Наша історія
          </div>
          <h1 className="mb-6 text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
            З'єднуємо серця, будуємо сильніші громади
          </h1>
          <p className="mx-auto max-w-2xl text-pretty text-lg text-indigo-100 sm:text-xl">
            KindLink народився з простої переконаності: коли громади об'єднуються,
            відбуваються неймовірні речі. Ми — міст між тими, хто потребує допомоги,
            і тими, хто готовий її дати.
          </p>
        </div>
      </section>

      
      <section className="px-4 py-20 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700">
                <Target className="h-4 w-4" />
                Наша місія
              </div>
              <h2 className="mb-6 text-balance text-3xl font-bold text-gray-900 sm:text-4xl">
                Розширюємо можливості громад через єднання
              </h2>
              <p className="mb-6 text-pretty text-lg text-gray-500">
                У KindLink ми переконані: ніхто не повинен стикатися з труднощами наодинці. Наша
                місія — створити світ, де допомога завжди поруч, де сусіди підтримують
                сусідів, а дух взаємодопомоги процвітає.
              </p>
              <p className="mb-8 text-pretty text-gray-500">
                Ми побудували платформу, яка дозволяє людям просити допомогу без сорому,
                волонтерам — знаходити значущі способи долучитися, а донорам — бачити
                прямий вплив своєї щедрості.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-6 py-4 border border-gray-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Users className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">150K+</p>
                    <p className="text-sm text-gray-500 font-medium">Активних учасників</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-2xl bg-gray-50 px-6 py-4 border border-gray-100">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 text-green-600">
                    <Award className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">50K+</p>
                    <p className="text-sm text-gray-500 font-medium">Виконаних запитів</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="aspect-square overflow-hidden rounded-[2.5rem] bg-gray-100 shadow-inner">
                <img
                  src="https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=800&h=800&fit=crop"
                  alt="Волонтери громади працюють разом"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 rounded-3xl bg-white p-6 shadow-xl border border-gray-100">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md">
                    <Heart className="h-7 w-7 fill-current" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Загальний вплив</p>
                    <p className="text-2xl font-extrabold text-gray-900">₴350М+</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-gray-50 px-4 py-24 sm:px-6 lg:px-8 border-y border-gray-200">
        <div className="mx-auto max-w-7xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold text-gray-900 sm:text-4xl">
              Наші цінності
            </h2>
            <p className="mx-auto max-w-2xl text-pretty text-lg text-gray-500">
              Ці принципи визначають все, що ми робимо в KindLink — від розробки
              платформи до служіння нашій спільноті.
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {values.map((value, index) => (
              <div key={index} className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm transition-all hover:shadow-md hover:-translate-y-1">
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <value.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-gray-900">{value.title}</h3>
                <p className="text-gray-500 leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      
      <section className="px-4 py-24 sm:px-6 lg:px-8 bg-white">
        <div className="mx-auto max-w-4xl">
          <div className="mb-16 text-center">
            <h2 className="mb-4 text-balance text-3xl font-bold text-gray-900 sm:text-4xl">
              Наш шлях
            </h2>
            <p className="text-pretty text-lg text-gray-500">
              Від маленької ідеї до процвітаючої платформи для громади.
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-4 top-0 h-full w-0.5 bg-indigo-100 sm:left-1/2 sm:-ml-px" />
            <div className="space-y-12">
              {milestones.map((milestone, index) => (
                <div key={index} className={`relative flex items-center gap-4 sm:gap-8 ${index % 2 === 0 ? "sm:flex-row-reverse" : ""}`}>
                  <div className="flex-1 sm:w-1/2" />
                  <div className="absolute left-4 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-indigo-600 text-xs font-bold text-white shadow-sm sm:relative sm:left-auto z-10">
                    {index + 1}
                  </div>
                  <div className="ml-12 flex-1 sm:ml-0 sm:w-1/2">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition">
                      <span className="text-sm font-bold text-indigo-600 uppercase tracking-wider">
                        {milestone.year}
                      </span>
                      <p className="mt-2 text-lg font-medium text-gray-900">{milestone.event}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-gray-50 px-4 py-24 sm:px-6 lg:px-8 border-t border-gray-200">
        <div className="mx-auto max-w-7xl">
          <div className="grid items-center gap-16 lg:grid-cols-2">
            <div>
              <h2 className="mb-4 text-balance text-3xl font-bold text-gray-900 sm:text-4xl">
                Зв'яжіться з нами
              </h2>
              <p className="mb-10 text-pretty text-lg text-gray-500">
                Маєте запитання або хочете стати партнером? Ми раді почути вас.
                Напишіть нам — і разом побудуємо сильнішу громаду.
              </p>

              <div className="space-y-8">
                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-indigo-600">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Email</p>
                    <p className="text-lg font-bold text-gray-900">hello@kindlink.org</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-indigo-600">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Телефон</p>
                    <p className="text-lg font-bold text-gray-900">+380 (44) 123-4567</p>
                  </div>
                </div>

                <div className="flex items-center gap-5">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100 text-indigo-600">
                    <MapPin className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Адреса</p>
                    <p className="text-lg font-bold text-gray-900">Івано-Франківськ, Україна</p>
                  </div>
                </div>
              </div>
            </div>

            
            <div className="rounded-[2rem] border border-gray-200 bg-white p-8 sm:p-10 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Надіслати повідомлення</h3>
              <form
                className="space-y-5"
                onSubmit={(e) => { e.preventDefault(); toast.success("Повідомлення надіслано!") }}
              >
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">Ім'я</label>
                    <input type="text" required className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition" placeholder="Іван" />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-900">Прізвище</label>
                    <input type="text" required className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition" placeholder="Франко" />
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Електронна пошта</label>
                  <input type="email" required className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition" placeholder="ivan@example.com" />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-900">Повідомлення</label>
                  <textarea rows={4} required className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600 transition" placeholder="Як ми можемо допомогти?" />
                </div>
                <button type="submit" className="w-full rounded-xl bg-indigo-600 py-3.5 text-white font-bold hover:bg-indigo-700 transition shadow-sm">
                  Надіслати
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      
      <section className="bg-indigo-600 px-4 py-20 text-center sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-6 text-balance text-3xl font-extrabold text-white sm:text-5xl">
            Готові приєднатися?
          </h2>
          <p className="mx-auto mb-10 max-w-2xl text-pretty text-lg text-indigo-100">
            Приєднуйтесь до тисяч учасників спільноти, які вже об'єднуються, підтримують
            і піднімають одне одного через KindLink.
          </p>
          <button onClick={onGetStarted} className="rounded-xl bg-white px-8 py-4 text-lg font-bold text-indigo-600 transition-colors hover:bg-gray-50 shadow-lg hover:-translate-y-1 transform">
            Приєднатися до KindLink
          </button>
        </div>
      </section>

      
      <footer className="border-t border-gray-200 bg-white px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="text-sm text-gray-500 font-medium">
            &copy; {new Date().getFullYear()} KindLink. Усі права захищено. Разом будуємо сильніші громади.
          </p>
        </div>
      </footer>
    </div>
  )
}
