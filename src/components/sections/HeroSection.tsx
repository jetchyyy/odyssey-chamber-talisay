import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CalendarDays, MapPin, Briefcase } from "lucide-react";

const metrics = [
  { value: "50+", label: "annual events", icon: Briefcase },
  { value: "1998", label: "institution founded", icon: CalendarDays },
  { value: "PHP 2B+", label: "local impact", icon: Building2 },
];

const itemV: Variants = {
  hidden: { opacity: 0, y: 32 },
  visible: (delay = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.32, 0.72, 0, 1] },
  }),
};

const HeroSection: React.FC = () => (
  <section
    className="hero-premium relative min-h-[100dvh] overflow-hidden bg-[#09160f] text-white"
    aria-label="Hero - Talisay Chamber of Commerce"
  >
    <div className="hero-photo-wash" aria-hidden="true" />
    <div className="hero-grid-lines" aria-hidden="true" />
    <div className="hero-seal-watermark" aria-hidden="true">
      TC
    </div>

    <div className="relative z-10 mx-auto grid min-h-[100dvh] max-w-7xl grid-cols-1 items-center gap-8 px-4 pb-10 pt-28 md:px-10 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 lg:pb-8 lg:pt-28">
      <motion.div initial="hidden" animate="visible" className="max-w-3xl">
        <motion.div
          custom={0.05}
          variants={itemV}
          className="mb-6 flex items-center gap-4 text-[0.66rem] font-heading font-bold uppercase tracking-[0.28em] text-gold"
        >
          <span className="h-px w-14 bg-gold/70" />
          City of Talisay, Cebu
        </motion.div>

        <motion.h1
          custom={0.14}
          variants={itemV}
          className="max-w-[10.5ch] text-[clamp(3.25rem,6.7vw,6.85rem)] font-heading font-black leading-[0.84] tracking-[-0.075em] text-[#fffaf0]"
        >
          Trade has a home in Talisay.
        </motion.h1>

        <motion.p
          custom={0.23}
          variants={itemV}
          className="mt-6 max-w-[46ch] text-[1rem] leading-[1.75] text-[#b7c7bd]"
        >
          A civic business chamber built for founders, family enterprises, industry leaders,
          and investors shaping the next chapter of Cebu South.
        </motion.p>

        <motion.div custom={0.32} variants={itemV} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/register"
            className="btn-premium bg-[#f2c766] text-[#0d1a14] shadow-[0_28px_70px_-28px_rgba(242,199,102,0.62)] hover:-translate-y-1 hover:bg-[#ffd978]"
          >
            Apply for membership
            <span className="btn-icon-wrap !bg-[#0d1a14]/10">
              <ArrowRight size={14} />
            </span>
          </Link>
          <Link
            to="/directory"
            className="btn-premium border border-white/12 bg-white/[0.035] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] hover:-translate-y-1 hover:border-gold/40 hover:bg-white/[0.07]"
          >
            View member directory
          </Link>
        </motion.div>

        <motion.div
          custom={0.42}
          variants={itemV}
          className="mt-8 flex max-w-xl items-center gap-4 border-t border-white/10 pt-4 text-sm text-[#81958a]"
        >
          <MapPin size={16} className="text-gold" />
          <span>Paseo Ricardo Commercial Center, Nonoc, Rafael Rabaya Rd
            City of Talisay, Cebu, Philippines</span>
          <span className="ml-auto hidden h-px flex-1 bg-white/10 sm:block" />
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 34, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1, delay: 0.22, ease: [0.32, 0.72, 0, 1] }}
        className="relative flex min-h-0 flex-col justify-center gap-5 lg:pt-6"
      >
        <div className="absolute right-4 top-4 hidden h-[82%] w-px bg-gradient-to-b from-transparent via-gold/40 to-transparent lg:block" />
        <div className="absolute right-9 top-8 hidden font-heading text-[8rem] font-black leading-none tracking-[-0.08em] text-white/[0.035] lg:block">
          1998
        </div>

        <div className="hero-civic-frame group relative z-10 mx-auto w-full max-w-[620px] lg:ml-auto lg:mr-0">
          <img
            src="/coverphoto.jpg"
            alt="Talisay Chamber business community event"
            className="h-full w-full object-cover grayscale transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.025]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09160f] via-[#0d1a14]/36 to-transparent" />
          <div className="absolute inset-0 bg-[#0c2417]/45 mix-blend-multiply" />
        </div>

        <div className="hero-ledger relative z-20 mx-auto w-full max-w-[620px] lg:ml-auto lg:mr-8">
          <div className="grid grid-cols-3 gap-px overflow-hidden rounded-[1.35rem] border border-white/10 bg-white/10 shadow-[0_30px_90px_-40px_rgba(0,0,0,0.75)] sm:rounded-[1.65rem]">
            {metrics.map(({ value, label, icon: Icon }) => (
              <div key={label} className="bg-[#0e2017]/88 px-3 py-4 backdrop-blur-md sm:px-5 sm:py-5">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-gold/12 text-gold sm:mb-4 sm:h-9 sm:w-9">
                  <Icon size={15} />
                </div>
                <div className="font-heading text-xl font-black leading-none tracking-tight text-white tabular-nums sm:text-2xl">
                  {value}
                </div>
                <div className="mt-1 text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-[#879b90] sm:text-[0.7rem] sm:tracking-[0.18em]">
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute left-0 top-0 h-40 w-40 rounded-full border border-gold/15" aria-hidden="true" />
        <div className="absolute left-12 top-12 h-20 w-20 rounded-full border border-white/10" aria-hidden="true" />
      </motion.div>
    </div>

  </section>
);

export default HeroSection;
