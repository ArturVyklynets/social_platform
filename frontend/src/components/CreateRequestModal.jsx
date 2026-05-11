import React, { useState, useEffect, useRef } from "react"
import axios from "axios"
import toast from "react-hot-toast"
import {
  X, FileText, Tag, AlignLeft, ChevronDown,
  HeartHandshake, Zap, Stethoscope, Home, ShoppingBasket,
  GraduationCap, ImagePlus, CreditCard, CalendarDays,
} from "lucide-react"

const categoryOptions = [
  { value: "urgent",    label: "Терміново",  description: "Потрібна негайна допомога",   icon: Zap },
  { value: "medical",   label: "Медицина",   description: "Медична підтримка",           icon: Stethoscope },
  { value: "housing",   label: "Житло",      description: "Притулок та проживання",      icon: Home },
  { value: "food",      label: "Харчування", description: "Їжа та продукти",             icon: ShoppingBasket },
  { value: "education", label: "Освіта",     description: "Навчання та навички",         icon: GraduationCap },
]

const INITIAL_FORM = {
  title: "", category: "", goalAmount: "", description: "", cardNumber: "",
  hasSchedule: false, dateFrom: "", dateTo: "", hasTimeRange: false, hourFrom: "9", hourTo: "18",
}

const TODAY = new Date().toISOString().split("T")[0]

export default function CreateRequestModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm]                   = useState(INITIAL_FORM)
  const [isCategoryOpen, setIsCategoryOpen] = useState(false)
  const [isLoading, setIsLoading]         = useState(false)
  const [imageFile, setImageFile]         = useState(null)
  const [imagePreview, setImagePreview]   = useState(null)
  const fileInputRef                      = useRef(null)

  // Body scroll lock
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  if (!isOpen) return null

  const selectedCategory = categoryOptions.find((c) => c.value === form.category)

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSelectCategory = (value) => {
    setForm((prev) => ({ ...prev, category: value }))
    setIsCategoryOpen(false)
  }

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Будь ласка, оберіть коректний файл зображення.")
      return
    }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.category) {
      toast.error("Будь ласка, оберіть категорію.")
      return
    }

    setIsLoading(true)
    try {
      const token = localStorage.getItem("token")

      // Step 1: create the request with JSON
      const { data: newRequest } = await axios.post(
        "http://localhost:8000/api/requests/",
        {
          title: form.title,
          description: form.description,
          category: form.category,
          goal_amount: form.goalAmount ? parseFloat(form.goalAmount) : null,
          card_number: form.cardNumber || null,
          available_from:      form.hasSchedule && form.dateFrom ? form.dateFrom : null,
          available_to:        form.hasSchedule && form.dateTo   ? form.dateTo   : (form.hasSchedule && form.dateFrom ? form.dateFrom : null),
          available_hour_from: form.hasSchedule && form.hasTimeRange ? parseInt(form.hourFrom) : null,
          available_hour_to:   form.hasSchedule && form.hasTimeRange ? parseInt(form.hourTo)   : null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      )

      // Step 2: attach the image if one was selected
      if (imageFile) {
        const formData = new FormData()
        formData.append("file", imageFile)
        await axios.post(
          `http://localhost:8000/api/requests/${newRequest.id}/image`,
          formData,
          { headers: { Authorization: `Bearer ${token}` } }
        )
      }

      toast.success("Ваш запит успішно створено!")
      setForm(INITIAL_FORM)
      handleRemoveImage()
      onSuccess?.()
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || "Не вдалося створити запит. Спробуйте ще раз.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleBackdropClick = () => {
    if (!isLoading) onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={handleBackdropClick} />

      
      <div className="relative w-full max-w-lg rounded-3xl border border-gray-200 bg-white shadow-xl max-h-[90vh] flex flex-col">

        
        <button
          onClick={onClose}
          disabled={isLoading}
          className="absolute right-4 top-4 z-10 rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-900 disabled:pointer-events-none"
        >
          <X className="h-5 w-5" />
        </button>

        
        <div className="overflow-y-auto px-6 py-6">

          
          <div className="mb-4 flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600">
              <HeartHandshake className="h-6 w-6 text-white" />
            </div>
          </div>

          
          <div className="mb-5 text-center">
            <h2 className="text-xl font-bold text-gray-900">Створити запит про допомогу</h2>
            <p className="mt-1 text-sm text-gray-500">Опишіть свою потребу — волонтери та донори побачать ваш запит</p>
          </div>

          
          <form id="create-request-form" onSubmit={handleSubmit} className="space-y-4">

            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Назва <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.title}
                  onChange={handleChange("title")}
                  placeholder="Коротка назва запиту"
                  required
                  maxLength={120}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            
            <div className="relative">
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Категорія <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsCategoryOpen((prev) => !prev)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-4 pr-3 text-sm transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
              >
                {selectedCategory ? (
                  <div className="flex items-center gap-2">
                    <selectedCategory.icon className="h-4 w-4 text-indigo-600" />
                    <span className="font-medium text-gray-900">{selectedCategory.label}</span>
                    <span className="hidden text-gray-500 sm:inline">({selectedCategory.description})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-400">Оберіть категорію</span>
                  </div>
                )}
                <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isCategoryOpen ? "rotate-180" : ""}`} />
              </button>

              {isCategoryOpen && (
                <div className="absolute left-0 right-0 top-full z-10 mt-2 rounded-xl border border-gray-100 bg-white p-2 shadow-lg">
                  {categoryOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleSelectCategory(option.value)}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${form.category === option.value ? "bg-indigo-50" : "hover:bg-gray-50"}`}
                    >
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${form.category === option.value ? "bg-indigo-100" : "bg-gray-100"}`}>
                        <option.icon className={`h-4 w-4 ${form.category === option.value ? "text-indigo-600" : "text-gray-500"}`} />
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${form.category === option.value ? "text-indigo-700" : "text-gray-900"}`}>
                          {option.label}
                        </div>
                        <div className="text-xs text-gray-500">{option.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Фінансова мета <span className="text-gray-400 font-normal">(необов'язково)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-400">₴</span>
                <input
                  type="number"
                  value={form.goalAmount}
                  onChange={handleChange("goalAmount")}
                  placeholder="0.00"
                  min="1"
                  max="999999"
                  step="0.01"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-8 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
            </div>

            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Номер картки для виплати{" "}
                <span className="font-normal text-gray-400">(необов'язково)</span>
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={form.cardNumber}
                  onChange={handleChange("cardNumber")}
                  placeholder="0000 0000 0000 0000"
                  maxLength={19}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Вказується для того, щоб адміністратор платформи міг перерахувати зібрані кошти.
              </p>
            </div>

            
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Опис <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <AlignLeft className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <textarea
                  value={form.description}
                  onChange={handleChange("description")}
                  placeholder="Опишіть свою ситуацію детально — яка допомога вам потрібна і чому?"
                  required
                  rows={3}
                  maxLength={1000}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
                <span className="absolute bottom-2.5 right-3 text-xs text-gray-400">
                  {form.description.length}/1000
                </span>
              </div>
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Коли потрібна допомога{" "}
                <span className="font-normal text-gray-400">(необов'язково)</span>
              </label>

              {!form.hasSchedule ? (
                <button
                  type="button"
                  onClick={() => setForm(p => ({ ...p, hasSchedule: true }))}
                  className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-400 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <CalendarDays className="h-4 w-4" />
                  Додати часовий проміжок
                </button>
              ) : (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Часовий проміжок</span>
                    <button
                      type="button"
                      onClick={() => setForm(p => ({ ...p, hasSchedule: false, dateFrom: "", dateTo: "", hasTimeRange: false }))}
                      className="rounded-full p-1 text-gray-400 hover:bg-white hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">З дати</label>
                      <input
                        type="date"
                        value={form.dateFrom}
                        min={TODAY}
                        onChange={e => setForm(p => ({ ...p, dateFrom: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-gray-600">По дату <span className="font-normal text-gray-400">(якщо діапазон)</span></label>
                      <input
                        type="date"
                        value={form.dateTo}
                        min={form.dateFrom || TODAY}
                        onChange={e => setForm(p => ({ ...p, dateTo: e.target.value }))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                      />
                    </div>
                  </div>

                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.hasTimeRange}
                      onChange={e => setForm(p => ({ ...p, hasTimeRange: e.target.checked }))}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600"
                    />
                    Вказати конкретний годинний діапазон
                  </label>

                  {form.hasTimeRange && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">Від години</label>
                        <select
                          value={form.hourFrom}
                          onChange={e => setForm(p => ({ ...p, hourFrom: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-medium text-gray-600">До години</label>
                        <select
                          value={form.hourTo}
                          onChange={e => setForm(p => ({ ...p, hourTo: e.target.value }))}
                          className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i}>{String(i).padStart(2, "0")}:00</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>


            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-900">
                Фото <span className="text-gray-400 font-normal">(необов'язково)</span>
              </label>

              {imagePreview ? (
                /* Preview */
                <div className="relative inline-block">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-32 w-full rounded-xl object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute right-2 top-2 rounded-full bg-gray-900/60 p-1 text-white transition hover:bg-gray-900/80"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-2 left-2 rounded-full bg-gray-900/60 px-2 py-0.5 text-xs text-white">
                    {imageFile.name.length > 24 ? imageFile.name.slice(0, 24) + "…" : imageFile.name}
                  </div>
                </div>
              ) : (
                /* Dropzone button */
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-6 text-sm text-gray-400 transition-colors hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-600"
                >
                  <ImagePlus className="h-7 w-7" />
                  <span>Натисніть, щоб завантажити фото</span>
                  <span className="text-xs">JPEG, PNG, WebP, GIF</span>
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

          </form>
        </div>

        
        <div className="shrink-0 border-t border-gray-100 px-6 py-4">
          <button
            type="submit"
            form="create-request-form"
            disabled={isLoading}
            className="w-full rounded-xl bg-indigo-600 py-3 font-semibold text-white shadow-sm transition hover:bg-indigo-700 hover:shadow disabled:opacity-70"
          >
            {isLoading ? "Надсилання…" : "Надіслати запит"}
          </button>
        </div>

      </div>
    </div>
  )
}
