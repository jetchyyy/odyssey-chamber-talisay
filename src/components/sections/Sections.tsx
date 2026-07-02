import React from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Lightbulb, Shield, Target, Users, TrendingUp, Building2,
  Landmark, Handshake, Megaphone, Globe, CheckCircle2, ArrowUpRight
} from "lucide-react";
import { Button } from "../ui/button";
import { supabase } from "../../lib/supabase";


const spring: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, delay: i * 0.09, ease: [0.32, 0.72, 0, 1] }
  }),
};

/* 
   ABOUT SECTION  Z-Axis offset asymmetry
 */
export const AboutSection: React.FC = () => (
  <section className="py-32 section-shell" aria-label="About the Chamber">
    <div className="container mx-auto px-4 md:px-10 max-w-7xl">
      {/* Left-aligned header */}
      <div className="max-w-2xl mb-16">
        <motion.span
          custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="label-pill mb-5 inline-flex"
        >
          About Us
        </motion.span>
        <motion.h2
          custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-[clamp(2rem,4vw,3.5rem)] font-heading font-black text-[#0D1A14] leading-tight"
        >
          Championing business excellence in Talisay
        </motion.h2>
      </div>

      {/* Asymmetric grid: 55/45 */}
      <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-14 items-start">

        {/* Left: prose + We Connect / Support / Advocate */}
        <div>
          <motion.p custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-[1.0625rem] text-gray-600 mb-4 leading-[1.8] max-w-[58ch]">
            Talisay Chamber is a dedicated community of local entrepreneurs, committed to fostering growth,
            collaboration, and success within our region. We champion the interests of small businesses,
            providing vital resources and creating opportunities for networking and professional development.
          </motion.p>
          <motion.p custom={3} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-500 mb-4 leading-[1.8] max-w-[58ch]">
            We believe that robust small businesses are the heartbeat of a thriving community.
          </motion.p>
          <motion.p custom={3.5} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-500 mb-10 leading-[1.8] max-w-[58ch]">
            Join us to connect, gain support, and advocate for a stronger local economy.
          </motion.p>

          {/* Stat row */}
          <motion.div custom={4} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="flex flex-wrap gap-8 mb-10 pt-8 border-t border-gray-100">
            {[
              { num: "PHP 2B+", label: "Economic Impact" },
              { num: "27yrs", label: "Years of Service" },
            ].map(({ num, label }) => (
              <div key={label}>
                <div className="text-2xl font-heading font-black text-[#0D1A14] tabular-nums">{num}</div>
                <div className="text-xs text-gray-400 mt-1 font-medium tracking-wide uppercase">{label}</div>
              </div>
            ))}
          </motion.div>

          {/* We Connect / We Support / We Advocate */}
          <div className="space-y-6">
            {[
              {
                label: "We Connect",
                text: "We facilitate connections between businesses, customers, and community leaders through events, workshops, and online platforms.",
              },
              {
                label: "We Support",
                text: "We offer a range of resources, from educational programs to business tools and mentorship opportunities, to help our members overcome challenges and achieve their goals.",
              },
              {
                label: "We Advocate",
                text: "We are the voice of small businesses, working with local government and organizations to create a favorable environment for our members to flourish.",
              },
            ].map(({ label, text }, i) => (
              <motion.div
                key={label}
                custom={5 + i} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 mt-0.5">
                  <span className="inline-block px-2.5 py-0.5 rounded text-[11px] font-heading font-bold bg-green-700 text-white">
                    {label}
                  </span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">{text}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right: Vision, Mission, Core Values cards */}
        <div className="space-y-5">
          {/* VISION card */}
          <motion.div
            custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="spotlight-card p-8 flex flex-col"
          >
            <div className="w-11 h-11 rounded-2xl bg-green-50 flex items-center justify-center mb-5 flex-shrink-0" style={{ color: "#166534" }}>
              <Lightbulb size={20} />
            </div>
            <h3 className="font-heading font-bold text-[#0D1A14] text-[1.0625rem] mb-3 leading-snug uppercase tracking-wide">
              Vision
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              To be the <strong className="text-[#0D1A14]">cornerstone</strong> in economic prosperity,
              fostering a vibrant community where every business thrives.
            </p>
          </motion.div>

          {/* MISSION card */}
          <motion.div
            custom={3} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="spotlight-card p-8 flex flex-col"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center mb-5 flex-shrink-0" style={{ color: "#17472B" }}>
              <Target size={20} />
            </div>
            <h3 className="font-heading font-bold text-[#0D1A14] text-[1.0625rem] mb-3 leading-snug uppercase tracking-wide">
              Mission
            </h3>
            <p className="text-gray-600 text-sm leading-relaxed">
              To <strong className="text-[#0D1A14]">empower and unite</strong> all businesses in all sizes
              through advocacy, education and networking, that will drive growth and community well-being.
            </p>
          </motion.div>

          {/* CORE VALUES card */}
          <motion.div
            custom={4} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="spotlight-card p-8 flex flex-col"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-50 flex items-center justify-center mb-5 flex-shrink-0" style={{ color: "#9A6216" }}>
              <Shield size={20} />
            </div>
            <h3 className="font-heading font-bold text-[#0D1A14] text-[1.0625rem] mb-4 leading-snug uppercase tracking-wide">
              Core Values
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Collaboration",  color: "bg-orange-500" },
                { label: "Inclusivity",    color: "bg-blue-500" },
                { label: "Innovation",     color: "bg-green-600" },
                { label: "Sustainability", color: "bg-amber-700" },
                { label: "Integrity",      color: "bg-yellow-600" },
                { label: "Community",      color: "bg-yellow-900" },
              ].map(({ label, color }) => (
                <div
                  key={label}
                  className={`${color} rounded-xl px-3 py-2.5 text-white text-[12px] font-heading font-semibold text-center`}
                >
                  {label}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </section>
);

/* 
   SERVICES  Bento asymmetric grid
   Replaces generic 3-column equal layout
 */
const services = [
  { icon: Users,       title: "Business Networking",   desc: "Connect with Talisay's top entrepreneurs, industry leaders, and decision-makers at curated events.", span: "lg:col-span-2" },
  { icon: TrendingUp,  title: "Investment Promotion",  desc: "Positioning Talisay as Cebu's premier investment corridor for local and foreign capital.", span: "" },
  { icon: Building2,   title: "Business Registration", desc: "Streamlined permit assistance and licensing guidance for new and growing ventures.", span: "" },
  { icon: Megaphone,   title: "Trade Events & Expos",  desc: "High-impact local and national exhibitions that put your brand in front of decision-makers.", span: "" },
  { icon: Lightbulb,   title: "SME Support",           desc: "Incubation, mentorship, and funding connections for small and medium enterprises.", span: "lg:col-span-2" },
  { icon: Landmark,    title: "Legal & Compliance",    desc: "Stay current on government regulations, tax compliance, and business law changes.", span: "" },
  { icon: Globe,       title: "Marketing Access",      desc: "Amplify your brand via our digital platforms, publications, and partner networks.", span: "" },
  { icon: Handshake,   title: "Partnership Programs",  desc: "Strategic alliances between businesses, LGUs, DTI, and national organizations.", span: "" },
  { icon: Shield,      title: "Community Outreach",    desc: "CSR programs and community development led by our member businesses.", span: "" },
];

export const ServicesSection: React.FC = () => (
  <section className="py-32 bg-white relative overflow-hidden" aria-label="Services">
    {/* Background gradient accent */}
    <div className="absolute top-0 right-0 w-[800px] h-[600px] bg-green-50/60 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" aria-hidden="true" />

    <div className="relative container mx-auto px-4 md:px-10 max-w-7xl">
      {/* Left-aligned header */}
      <div className="max-w-xl mb-16">
        <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="label-pill mb-5 inline-flex">What We Do</motion.span>
        <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-[#0D1A14] mb-4">
          Comprehensive business services
        </motion.h2>
        <motion.p custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-gray-500 text-[1.0625rem] leading-relaxed">
          We equip members with tools, resources, and connections to thrive in today's market.
        </motion.p>
      </div>

      {/* Bento grid  uniform row heights via auto-rows */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4" style={{ gridAutoRows: '1fr' }}>
        {services.map(({ icon: Icon, title, desc, span }, i) => (
          <motion.div
            key={title}
            custom={i} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className={`group spotlight-card p-8 cursor-pointer flex flex-col ${span}`}
          >
            <div className="w-11 h-11 rounded-2xl bg-gray-50 border border-gray-100/80 flex items-center justify-center text-gray-400 mb-6 flex-shrink-0 spring group-hover:bg-green-700 group-hover:border-green-700 group-hover:text-white">
              <Icon size={20} />
            </div>
            <h3 className="font-heading font-bold text-[#0D1A14] text-[1.0625rem] mb-2 leading-snug">{title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed flex-1">{desc}</p>
            <div className="mt-5 flex items-center gap-1.5 text-xs font-heading font-semibold text-gray-300 group-hover:text-green-600 spring">
              Learn more <ArrowUpRight size={12} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

/* 
   MEMBERSHIP  Premium pricing with emphasis
   Replaces generic 3-tower identical layout
 */
const plans = [
  {
    name: "Small",
    price: "PHP 1,500",
    period: "/yr",
    desc: "For solo entrepreneurs starting their journey.",
    features: ["Networking access", "Event invitations", "Member directory listing"],
    highlight: false,
  },
  {
    name: "Medium",
    price: "PHP 5,000",
    period: "/yr",
    desc: "Most popular for growing small and medium businesses.",
    features: ["All Small benefits", "Business promotion", "Training & seminars access", "Priority support"],
    highlight: true,
    badge: "Most Popular",
  },
  {
    name: "Large",
    price: "PHP 15,000",
    period: "/yr",
    desc: "For established corporations seeking maximum visibility.",
    features: ["All Medium benefits", "Board meeting access", "Co-branding rights", "VIP event seating"],
    highlight: false,
  },
];

const packagePlans = [
  {
    name: "Package A: Small Enterprise",
    price: "PHP 2,900",
    period: "/yr",
    desc: "Combines Small annual membership with 4 Coffee Connections session passes. Save PHP 1,100.",
    features: [
      "Small / Individual Annual Membership",
      "4 Coffee Connections event passes",
      "Save PHP 1,100 on registration"
    ]
  },
  {
    name: "Package B: Medium Enterprise",
    price: "PHP 3,800",
    period: "/yr",
    desc: "Combines Medium annual membership with 4 Coffee Connections session passes. Save PHP 1,200.",
    features: [
      "Medium / SME Annual Membership",
      "4 Coffee Connections event passes",
      "Save PHP 1,200 on registration"
    ]
  },
  {
    name: "Package C: Large Enterprise",
    price: "PHP 4,700",
    period: "/yr",
    desc: "Combines Large annual membership with 4 Coffee Connections session passes. Save PHP 1,300.",
    features: [
      "Large / Corporate Annual Membership",
      "4 Coffee Connections event passes",
      "Save PHP 1,300 on registration"
    ]
  }
];

export const MembershipSection: React.FC = () => {
  const [dbPlans, setDbPlans] = React.useState<any[]>([]);

  React.useEffect(() => {
    const fetchPlans = async () => {
      try {
        const { data, error } = await supabase
          .from("membership_pricing")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });
        if (data && data.length > 0) {
          setDbPlans(data);
        }
      } catch (err) {
        console.error("Error fetching pricing from Supabase:", err);
      }
    };
    fetchPlans();
  }, []);

  const displayPlans = dbPlans.length > 0 
    ? dbPlans.map(p => ({
        name: p.name,
        price: `PHP ${Number(p.price).toLocaleString()}`,
        period: `/${p.period}`,
        desc: p.description,
        features: p.benefits,
        highlight: p.type === "sme",
        badge: p.type === "sme" ? "Most Popular" : undefined
      })) 
    : plans;

  return (
    <section className="py-32 section-shell" aria-label="Membership plans">
      <div className="container mx-auto px-4 md:px-10 max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-16">
          <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="label-pill mb-5 inline-flex">Membership</motion.span>
          <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-[#0D1A14] mb-4">
            Join the Chamber today
          </motion.h2>
          <motion.p custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-500 leading-relaxed">
            Choose a plan and unlock Talisay's most powerful business network.
          </motion.p>
        </div>

        {/* Use items-stretch so all 3 cards grow to the same height */}
        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {displayPlans.map(({ name, price, period, desc, features, highlight, badge }, i) => (
            <motion.div
              key={name}
              custom={i} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className={`relative rounded-[2rem] p-8 flex flex-col spring-fast ${
                highlight
                  ? "bg-green-700 shadow-diffuse-lg"
                  : "bg-white spotlight-card"
              }`}
            >
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-white text-[10px] font-heading font-bold rounded-full tracking-widest uppercase shadow-sm">
                  {badge}
                </div>
              )}

              {/* Plan name */}
              <div className={`text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 ${highlight ? "text-green-200" : "text-gray-400"}`}>
                {name}
              </div>

              {/* Price  fixed height block so all cards align below it */}
              <div className="flex items-end gap-1.5 mb-2 h-12">
                <span className={`text-[2.75rem] font-heading font-black leading-none ${highlight ? "text-white" : "text-[#0D1A14]"}`}>
                  {price}
                </span>
                <span className={`text-sm mb-1 ${highlight ? "text-green-200" : "text-gray-400"}`}>{period}</span>
              </div>

              {/* Desc  fixed height so features always start at same Y */}
              <p className={`text-sm mb-6 leading-relaxed min-h-[3rem] ${highlight ? "text-green-100" : "text-gray-400"}`}>{desc}</p>

              {/* Features  grow to fill space, pushing button to bottom */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${highlight ? "text-green-300" : "text-green-600"}`} />
                    <span className={highlight ? "text-green-50" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>


              {/* CTA  always pinned to bottom via mt-auto on the button wrapper */}
              <div className="mt-auto">
                <a
                  href="/register"
                  className={`btn-premium justify-center w-full spring-fast ${
                    highlight
                      ? "bg-white text-green-700 hover:bg-green-50 shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
                      : "bg-[#0D1A14] text-white hover:bg-navy-mid shadow-navy-diffuse"
                  }`}
                >
                  Get Started
                  <span className={`btn-icon-wrap ${highlight ? "!bg-green-100/60" : "!bg-white/10"}`}>
                    <ArrowUpRight size={13} />
                  </span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Special Package Deals Section */}
        <div className="text-center max-w-xl mx-auto mt-24 mb-12">
          <motion.h3 custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-2xl font-heading font-black text-[#0D1A14] mb-3">
            Special Membership Package Deals
          </motion.h3>
          <motion.p custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-500 leading-relaxed">
            Get more value by bundling your annual chamber membership with premium event access passes.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-5 items-stretch">
          {packagePlans.map(({ name, price, period, desc, features }, i) => (
            <motion.div
              key={name}
              custom={i} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="relative rounded-[2rem] p-8 flex flex-col spring-fast bg-white spotlight-card border border-gray-100"
            >
              <div className="absolute top-0 right-0 bg-green-700 text-white text-[8px] font-heading font-bold uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
                Package Deal
              </div>

              {/* Plan name */}
              <div className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 text-gray-400">
                {name}
              </div>

              {/* Price */}
              <div className="flex items-end gap-1.5 mb-2 h-12">
                <span className="text-[2.25rem] font-heading font-black leading-none text-[#0D1A14]">
                  {price}
                </span>
                <span className="text-sm mb-1 text-gray-400">{period}</span>
              </div>

              {/* Desc */}
              <p className="text-sm mb-6 leading-relaxed min-h-[3rem] text-gray-400">{desc}</p>

              {/* Features */}
              <ul className="space-y-2.5 flex-1 mb-8">
                {features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
                    <span className="text-gray-600">{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <div className="mt-auto">
                <a
                  href="/register"
                  className="btn-premium justify-center w-full spring-fast bg-[#0D1A14] text-white hover:bg-navy-mid shadow-navy-diffuse"
                >
                  Select Package
                  <span className="btn-icon-wrap !bg-white/10">
                    <ArrowUpRight size={13} />
                  </span>
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

