import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUp } from "lucide-react";
import HeroSection from "../components/sections/HeroSection";
import { AboutSection, ServicesSection, MembershipSection } from "../components/sections/Sections";
import { EventsSection, NewsSection, CtaSection } from "../components/sections/MoreSections";
import { supabase } from "../lib/supabase";

const GrainOverlay: React.FC = () => (
  <div className="grain-overlay" aria-hidden="true" />
);

const partners = [

  { name: "City of Talisay", logo: "/talisaycitylogo.jpeg" },
  { name: "DTI", logo: "/dtilogo.png" },
];

const PartnersSection: React.FC = () => (
  <section className="py-16 bg-[#ebf4fc]" aria-label="Partners and affiliates">
    <div className="container mx-auto px-4 md:px-10 max-w-5xl text-center">
      <h2 className="text-3xl md:text-4xl font-heading font-extrabold text-[#2b3e5a] mb-12">
        Our Partners
      </h2>

      <div className="flex flex-wrap justify-center items-center gap-12 md:gap-20 lg:gap-28">
        {partners.map(({ name, logo }, i) => (
          <motion.div
            key={name}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.15, ease: [0.32, 0.72, 0, 1] }}
            className="flex items-center justify-center group"
          >
            <img
              src={logo}
              alt={`${name} official logo`}
              className="h-20 md:h-24 lg:h-28 w-auto object-contain transition-transform duration-300 group-hover:scale-105 mix-blend-multiply"
            />
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);
const AVATAR_GRADIENTS = [
  "from-green-700 to-emerald-600",
  "from-emerald-900 to-green-700",
  "from-amber-600 to-orange-500",
  "from-stone-800 to-green-900",
  "from-blue-700 to-cyan-600",
  "from-purple-700 to-violet-600",
];

const TestimonialsSection: React.FC = () => {
  const [stories, setStories] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchStories = async () => {
      const { data } = await supabase
        .from("member_stories")
        .select("id, full_name, role_title, business_name, story_text, is_featured")
        .eq("status", "approved")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5);
      if (data && data.length > 0) setStories(data);
    };
    fetchStories();
  }, []);

  if (stories.length === 0) return null;

  const row1 = stories.slice(0, Math.min(3, stories.length));
  const row2 = stories.slice(3, 5);

  const renderCard = (s: any, i: number, delayOffset = 0) => {
    const initials = s.full_name.split(" ").map((w: string) => w[0]).slice(0, 2).join("").toUpperCase();
    const gradient = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length];
    const subtitle = [s.role_title, s.business_name].filter(Boolean).join(", ");
    return (
      <motion.div
        key={s.id}
        initial={{ opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: (i + delayOffset) * 0.1, ease: [0.32, 0.72, 0, 1] }}
        className="rounded-[2rem] p-7 border border-white/10 bg-white/[0.035] hover:bg-white/[0.07] spring cursor-default flex flex-col shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
      >
        <div className="text-4xl font-serif text-green-900/60 leading-none mb-4 select-none">"</div>
        <p className="text-slate-300 leading-[1.8] mb-6 text-[15px] flex-1">{s.story_text}</p>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-xs font-heading font-bold flex-shrink-0`}>
            {initials}
          </div>
          <div>
            <div className="font-heading font-semibold text-white text-sm leading-tight">{s.full_name}</div>
            {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <section className="py-32 bg-[#0D1A14] relative overflow-hidden" aria-label="Member testimonials">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-800/40 to-transparent" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-800/40 to-transparent" aria-hidden="true" />
      <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-green-900/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="container mx-auto px-4 md:px-10 max-w-7xl mb-16 text-center">
        <span className="label-pill !bg-green-900/50 !text-green-300 !border-green-700/40 mb-5 inline-flex">Member Stories</span>
        <h2 className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-white">
          What our members say
        </h2>
      </div>

      <div className="container mx-auto px-4 md:px-10 max-w-7xl space-y-4">
        <div className={`grid gap-4 ${row1.length === 1 ? "max-w-md mx-auto" : row1.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {row1.map((s, i) => renderCard(s, i))}
        </div>
        {row2.length > 0 && (
          <div className="grid md:grid-cols-2 gap-4 max-w-[calc(66.66%+0.5rem)] mx-auto lg:max-w-[66.66%]">
            {row2.map((s, i) => renderCard(s, i, 3))}
          </div>
        )}
      </div>
    </section>
  );
};

const BackToTop: React.FC = () => {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.9 }}
          transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-8 right-8 w-11 h-11 bg-green-700 hover:bg-green-600 text-white rounded-2xl shadow-diffuse-lg flex items-center justify-center z-[80] cursor-pointer spring-fast hover:-translate-y-0.5 active:scale-95"
          aria-label="Scroll back to top"
        >
          <ArrowUp size={18} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

const Home: React.FC = () => (
  <>
    <GrainOverlay />
    <div className="flex flex-col w-full">
      <HeroSection />
      <PartnersSection />
      <AboutSection />
      <ServicesSection />
      <TestimonialsSection />
      <MembershipSection />
      <EventsSection />
      <NewsSection />
      <CtaSection />
    </div>
    <BackToTop />
  </>
);

export default Home;
