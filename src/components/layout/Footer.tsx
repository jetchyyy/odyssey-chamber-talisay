import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Phone, Mail, ArrowUpRight, Share2, Play, Globe } from "lucide-react";

const footerLinks = {
  organization: {
    label: "Organization",
    links: [
      { name: "About the Chamber", path: "/about" },
      { name: "Vision & Mission", path: "/about/vision" },
      { name: "Board of Directors", path: "/about/board" },
      { name: "Our History", path: "/about/history" },
      { name: "Annual Reports", path: "/reports" },
    ],
  },
  services: {
    label: "Services",
    links: [
      { name: "Business Networking", path: "/services/networking" },
      { name: "Investment Promotion", path: "/services/investment" },
      { name: "SME Support", path: "/services/sme" },
      { name: "Trade Events & Expos", path: "/services/events" },
      { name: "Legal & Compliance", path: "/services/legal" },
    ],
  },
  membership: {
    label: "Membership",
    links: [
      { name: "Join the Chamber", path: "/register" },
      { name: "Member Benefits", path: "/#membership" },
      { name: "Membership Plans", path: "/#membership" },
      { name: "Member Portal", path: "/login" },
      { name: "Business Directory", path: "/directory" },
    ],
  },
};

const socials = [
  { label: "Facebook", icon: Share2, href: "https://www.facebook.com/" },

];

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0D1A14] text-slate-300 relative overflow-hidden">
      {/* Decorative green accent stripe */}
      <div className="h-1 w-full bg-gradient-to-r from-green-700 via-emerald-500 to-gold" />

      {/* Top gradient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-green-900/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 md:px-8 max-w-7xl py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12">

          {/* Brand Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center flex-shrink-0 shadow-green-glow">
                <span className="text-white font-heading font-bold">TC</span>
              </div>
              <div>
                <p className="text-white font-heading font-bold text-lg leading-tight">City of Talisay</p>
                <p className="text-green-400 text-xs font-medium tracking-wide">Chamber of Commerce, Trade & Industry Inc.</p>
              </div>
            </div>

            <p className="text-slate-400 text-sm leading-relaxed max-w-sm">
              The premier business organization driving economic growth, fostering partnerships, and
              empowering entrepreneurs across the City of Talisay, Cebu.
            </p>

            {/* Contact Info */}
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <MapPin size={16} className="text-green-500 mt-0.5 flex-shrink-0" />
                <span>Paseo Ricardo Commercial Center, Nonoc, Rafael Rabaya Rd<br />City of Talisay, Cebu, Philippines</span>
              </li>
              <li className="flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <Phone size={16} className="text-green-500 flex-shrink-0" />
                <a href="tel:+6332123456" className="cursor-pointer">09623184926</a>
              </li>
              <li className="flex items-center gap-3 text-slate-400 hover:text-slate-200 transition-colors">
                <Mail size={16} className="text-green-500 flex-shrink-0" />
                <a href="mailto:info@talisaychamber.org" className="cursor-pointer">talisaychamber@gmail.com</a>
              </li>
            </ul>

            {/* Social Links */}
            <div className="flex gap-3">
              {socials.map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 hover:bg-green-700 hover:border-green-700 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {Object.values(footerLinks).map((column) => (
            <div key={column.label}>
              <h3 className="text-white font-heading font-semibold text-sm tracking-wide uppercase mb-5">
                {column.label}
              </h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.name}>
                    <Link
                      to={link.path}
                      className="text-sm text-slate-400 hover:text-green-400 transition-colors duration-150 cursor-pointer inline-flex items-center gap-1 group"
                    >
                      {link.name}
                      <ArrowUpRight
                        size={12}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Newsletter Banner */}
        <div className="mt-16 rounded-[2rem] border border-white/10 bg-white/[0.035] p-8 flex flex-col md:flex-row items-center justify-between gap-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
          <div>
            <h4 className="text-white font-heading font-bold text-lg mb-1">Boardroom briefings</h4>
            <p className="text-slate-400 text-sm">Monthly policy notes, investment leads, and member-only event alerts.</p>
          </div>
          <form className="flex gap-3 w-full md:w-auto" onSubmit={(e) => e.preventDefault()}>
            <input
              type="email"
              placeholder="Enter your email"
              aria-label="Email address for newsletter"
              className="flex-1 md:w-64 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
            />
            <button
              type="submit"
              className="px-5 py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-lg text-sm font-heading font-semibold transition-colors duration-200 cursor-pointer whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} City of Talisay Chamber of Commerce, Trade and Industry Inc.
            All rights reserved.
          </p>
          <div className="flex gap-6">
            <Link to="/privacy" className="hover:text-slate-300 transition-colors cursor-pointer">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-slate-300 transition-colors cursor-pointer">Terms of Service</Link>
            <Link to="/sitemap" className="hover:text-slate-300 transition-colors cursor-pointer">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
