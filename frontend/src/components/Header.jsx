import React, { useState } from "react"
import { HeartHandshake, Plus, User, LogOut, Menu, X, ShieldCheck, MessageSquare } from "lucide-react"
import ContactAdminModal from "./ContactAdminModal"

export default function Header({ isAuthenticated, currentUser, currentView, onNavigate, onLoginClick, onRegisterClick, onLogout, onCreateClick }) {
  const [mobileMenuOpen, setMobileMenuOpen]     = useState(false)
  const [contactModalOpen, setContactModalOpen] = useState(false)

  const navLinks = [
    { label: "Головна",           view: "landing"    },
    { label: "Переглянути запити", view: "dashboard"  },
  ]

  return (
    <>
      <ContactAdminModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
      />

      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">

          
          <button onClick={() => onNavigate("landing")} className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600">
              <HeartHandshake className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">KindLink</span>
          </button>

          
          <nav className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => onNavigate(link.view)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  currentView === link.view
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => onNavigate("about")}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                currentView === "about"
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              Про нас
            </button>
          </nav>

          
          <div className="hidden items-center gap-3 md:flex">
            {isAuthenticated ? (
              <>
                {currentUser?.role === "Бенефіціар" && (
                  <button
                    onClick={onCreateClick}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition"
                  >
                    <Plus className="h-4 w-4" /> Попросити допомогу
                  </button>
                )}
                {currentUser?.role === "Адмін" && (
                  <button
                    onClick={() => onNavigate("admin")}
                    className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition ${
                      currentView === "admin"
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                    }`}
                  >
                    <ShieldCheck className="h-4 w-4" /> Адмін-панель
                  </button>
                )}
                {currentUser?.role !== "Адмін" && (
                  <button
                    onClick={() => setContactModalOpen(true)}
                    className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition"
                  >
                    <MessageSquare className="h-4 w-4" /> Написати адміну
                  </button>
                )}
                <button onClick={() => onNavigate("profile")} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                  <User className="h-4 w-4" /> Мій профіль
                </button>
                <button onClick={onLogout} className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition">
                  <LogOut className="h-4 w-4" /> Вийти
                </button>
              </>
            ) : (
              <>
                <button onClick={onLoginClick} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition">
                  Увійти
                </button>
                <button onClick={onRegisterClick} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition">
                  Реєстрація
                </button>
              </>
            )}
          </div>

          
          <button className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>
    </>
  )
}
