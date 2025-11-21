import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import logoUrl from "@assets/hydrovac-logo.png";

export default function Navbar() {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Find Services" },
    { href: "/advertise", label: "List Your Business" },
    { href: "/contact", label: "Contact" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 md:h-20 items-center justify-between gap-4 px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 md:gap-3 hover-elevate rounded-md px-2 py-1 -ml-2 flex-shrink-0" data-testid="link-home">
          <img src={logoUrl} alt="HydroVacFinder Logo" className="h-10 md:h-14 w-auto" />
          <div className="hidden sm:flex items-center gap-1 md:gap-2">
            <span className="font-heading text-lg md:text-2xl font-bold text-primary whitespace-nowrap">HydroVac</span>
            <span className="font-heading text-lg md:text-2xl font-bold text-foreground whitespace-nowrap">Finder</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-1 flex-shrink-0">
          {navLinks.map((link) => (
            <Button
              key={link.href}
              variant={location === link.href ? "secondary" : "ghost"}
              data-testid={`link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
              asChild
            >
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden flex-shrink-0"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <div className="container mx-auto px-4 py-4 flex flex-col space-y-2">
            {navLinks.map((link) => (
              <Button
                key={link.href}
                variant={location === link.href ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => setMobileMenuOpen(false)}
                data-testid={`mobile-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                asChild
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
