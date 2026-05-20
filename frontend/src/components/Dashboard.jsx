import React, { useState, useEffect } from "react"
import axios from "axios"
import { Search, Heart, Clock, Stethoscope, Home, Utensils, GraduationCap, Eye } from "lucide-react"
import RequestDetailsModal from "./RequestDetailsModal"

const categoryConfig = {
  urgent:    { label: "Терміново",  icon: Clock,         color: "bg-red-100 text-red-700" },
  medical:   { label: "Медицина",   icon: Stethoscope,   color: "bg-blue-100 text-blue-700" },
  housing:   { label: "Житло",      icon: Home,          color: "bg-amber-100 text-amber-700" },
  food:      { label: "Харчування", icon: Utensils,      color: "bg-green-100 text-green-700" },
  education: { label: "Освіта",     icon: GraduationCap, color: "bg-purple-100 text-purple-700" },
}

const STATUS_UA = {
  open:        "Відкрито",
  in_progress: "В процесі",
  completed:   "Завершено",
}

export default function Dashboard({ currentUser }) {
  const [requests, setRequests]               = useState([])
  const [loading, setLoading]                 = useState(true)
  const [searchQuery, setSearchQuery]         = useState("")
  const [selectedRequest, setSelectedRequest] = useState(null)

  const fetchRequests = async () => {
    try {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/requests/`)
      setRequests(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Помилка при завантаженні запитів:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  const filteredRequests = requests.filter((req) =>
    req.status !== "completed" &&
    (req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
     req.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Потреби вашої громади</h1>
          <p className="mt-2 text-gray-500">Перегляньте запити від ваших сусідів і знайдіть спосіб допомогти.</p>
        </div>

        <div className="relative mb-8 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Пошук запитів..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">Завантаження...</div>
        ) : filteredRequests.length === 0 ? (
          <div className="rounded-3xl border border-gray-200 bg-white py-16 text-center">
            <Heart className="mx-auto h-12 w-12 text-gray-300" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">Запитів не знайдено</h3>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredRequests.map((request) => {
              const cat     = categoryConfig[request.category]
              const CatIcon = cat?.icon ?? Heart
              const goal    = request.goal_amount ?? 0
              const raised  = request.collected_amount ?? 0
              const pct     = goal > 0 ? Math.min(Math.round((raised / goal) * 100), 100) : 0

              return (
                <div
                  key={request.id}
                  onClick={() => setSelectedRequest(request)}
                  className="group flex cursor-pointer flex-col rounded-2xl border border-gray-200 bg-white shadow-sm transition-all hover:border-indigo-300 hover:shadow-md"
                >
                  <div className="flex items-center justify-between p-4 pb-0">
                    {cat ? (
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cat.color}`}>
                        <CatIcon className="h-3.5 w-3.5" />
                        {cat.label}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        {request.category ?? "Загальне"}
                      </span>
                    )}
                    <span className="text-xs font-medium uppercase text-gray-400">
                      {STATUS_UA[request.status] ?? request.status}
                    </span>
                  </div>

                  
                  {request.image_url ? (
                    <div className="mx-4 mt-4 overflow-hidden rounded-xl">
                      <img
                        src={request.image_url.startsWith("/") ? `${import.meta.env.VITE_API_URL}${request.image_url}` : request.image_url}
                        alt={request.title}
                        className="aspect-video w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="mx-4 mt-4 flex aspect-video items-center justify-center rounded-xl border border-gray-100 bg-gray-50">
                      <Heart className="h-12 w-12 text-gray-300" />
                    </div>
                  )}

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 font-semibold leading-snug text-gray-900 group-hover:text-indigo-600">
                      {request.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-gray-500">
                      {request.description}
                    </p>

                    {goal > 0 && (
                      <div className="mt-4">
                        <div className="mb-1.5 flex items-baseline justify-between">
                          <span className="text-sm font-semibold text-gray-900">₴{raised.toLocaleString()} зібрано</span>
                          <span className="text-xs text-gray-500">з ₴{goal.toLocaleString()}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-indigo-600" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 p-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedRequest(request) }}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-2 text-sm font-medium text-gray-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <Eye className="h-4 w-4" />
                      Переглянути
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <RequestDetailsModal
        isOpen={!!selectedRequest}
        request={selectedRequest}
        onClose={() => setSelectedRequest(null)}
        currentUser={currentUser}
      />
    </div>
  )
}
