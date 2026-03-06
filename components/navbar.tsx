"use client"

import Link from "next/link"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handler)
    return () => window.removeEventListener("scroll", handler)
  }, [])

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "glass shadow-card border-b border-border/60 py-3"
          : "bg-transparent py-5"
      )}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-brand">
            <span className="text-primary-foreground font-bold text-sm font-mono">CB</span>
          </div>
          <span className={cn(
            "text-lg font-semibold tracking-tight transition-colors",
            scrolled ? "text-foreground" : "text-foreground"
          )}>
            ContratBox
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="#fonctionnalites" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Fonctionnalités
          </Link>
          <Link href="#tarifs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Tarifs
          </Link>
          <Link href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            FAQ
          </Link>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Se connecter</Link>
          </Button>
          <Button size="sm" className="bg-primary text-primary-foreground shadow-brand hover:bg-primary/90" asChild>
            <Link href="/signup">Commencer gratuitement</Link>
          </Button>
        </div>

        {/* Mobile toggle */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden glass border-t border-border/60 px-4 py-4 flex flex-col gap-4">
          <Link href="#fonctionnalites" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Fonctionnalités</Link>
          <Link href="#tarifs" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>Tarifs</Link>
          <Link href="#faq" className="text-sm text-muted-foreground" onClick={() => setMobileOpen(false)}>FAQ</Link>
          <hr className="border-border" />
          <Button variant="outline" size="sm" asChild><Link href="/login">Se connecter</Link></Button>
          <Button size="sm" className="bg-primary text-primary-foreground" asChild><Link href="/signup">Commencer gratuitement</Link></Button>
        </div>
      )}
    </header>
  )
}
