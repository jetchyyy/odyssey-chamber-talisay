import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import {
  Lightbulb, Shield, Target, Users, TrendingUp, Building2,
  Landmark, Handshake, Megaphone, Globe, CheckCircle2, ArrowUpRight,
  Ticket, Loader2, X, Copy, Check
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
  const [dbPackages, setDbPackages] = React.useState<any[]>([]);
  const [qrMethods, setQrMethods] = React.useState<any[]>([]);
  const [activeCategory, setActiveCategory] = React.useState<"bundles" | "members" | "guests">("bundles");
  
  // Guest checkout modal states
  const [selectedGuestPkg, setSelectedGuestPkg] = React.useState<any | null>(null);
  const [guestName, setGuestName] = React.useState("");
  const [guestEmail, setGuestEmail] = React.useState("");
  const [guestPhone, setGuestPhone] = React.useState("");
  const [guestPaymentMethod, setGuestPaymentMethod] = React.useState("gcash");
  const [guestRef, setGuestRef] = React.useState("");
  const [guestProofFile, setGuestProofFile] = React.useState<File | null>(null);
  const [guestProofPreview, setGuestProofPreview] = React.useState("");
  const [checkoutError, setCheckoutError] = React.useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = React.useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = React.useState(false);

  // Guest lookup states
  const [lookupEmail, setLookupEmail] = React.useState("");
  const [lookupRef, setLookupRef] = React.useState("");
  const [lookupResult, setLookupResult] = React.useState<any | null>(null);
  const [lookupLoading, setLookupLoading] = React.useState(false);
  const [lookupError, setLookupError] = React.useState<string | null>(null);
  const [copiedCode, setCopiedCode] = React.useState(false);

  // User auth details
  const [currentUser, setCurrentUser] = React.useState<any | null>(null);
  const [currentProfile, setCurrentProfile] = React.useState<any | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();
          if (profile) setCurrentProfile(profile);
        }

        const { data: plansData } = await supabase
          .from("membership_pricing")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });
        if (plansData) {
          setDbPlans(plansData);
        }

        const { data: packagesData } = await supabase
          .from("membership_packages")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });
        if (packagesData) {
          setDbPackages(packagesData);
        }

        const { data: qrData } = await supabase
          .from("qr_settings")
          .select("*")
          .eq("is_active", true);
        if (qrData) {
          setQrMethods(qrData);
        }
      } catch (err) {
        console.error("Error fetching data from Supabase:", err);
      }
    };
    fetchData();
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

  // Categorize packages
  const membershipBundles = dbPackages.filter(p => p.package_type === "membership_bundle" || !p.package_type);
  const memberPassPackages = dbPackages.filter(p => p.package_type === "member_passes");
  const guestPassPackages = dbPackages.filter(p => p.package_type === "non_member_passes");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setGuestProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setGuestProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGuestCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName.trim() || !guestEmail.trim() || !guestRef.trim() || !guestProofFile) {
      setCheckoutError("Please fill out all required fields and upload proof of payment.");
      return;
    }
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      // 1. Upload receipt to storage
      const { uploadImage } = await import("../../lib/storage");
      const proofUrl = await uploadImage(guestProofFile, "payment-proofs");

      // 2. Insert package purchase
      const { error } = await supabase.from("package_purchases").insert({
        package_id: selectedGuestPkg.id,
        full_name: guestName.trim(),
        email: guestEmail.trim().toLowerCase(),
        phone: guestPhone.trim() || null,
        payment_method: guestPaymentMethod,
        payment_reference: guestRef.trim().toUpperCase(),
        payment_proof_url: proofUrl,
        status: "pending",
        payment_status: "pending"
      });

      if (error) throw error;
      setCheckoutSuccess(true);
      setGuestName("");
      setGuestEmail("");
      setGuestPhone("");
      setGuestRef("");
      setGuestProofFile(null);
      setGuestProofPreview("");
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to submit purchase request.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleGuestLookupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupEmail.trim() || !lookupRef.trim()) {
      setLookupError("Please enter both email and payment reference.");
      return;
    }
    setLookupLoading(true);
    setLookupError(null);
    setLookupResult(null);

    try {
      const { data, error } = await supabase
        .from("package_purchases")
        .select(`
          id, status, payment_status, full_name, email,
          membership_packages ( name, price ),
          promo_codes:generated_promo_code_id ( code )
        `)
        .eq("email", lookupEmail.trim().toLowerCase())
        .eq("payment_reference", lookupRef.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLookupError("No matching purchase request found. Double check your email and payment reference.");
      } else {
        setLookupResult(data);
      }
    } catch (err: any) {
      setLookupError(err.message || "An error occurred during lookup.");
    } finally {
      setLookupLoading(false);
    }
  };

  const copyPromoCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const renderPackageCard = (pkg: any) => {
    const isBundle = pkg.package_type === "membership_bundle" || !pkg.package_type;
    const isMemberOnly = pkg.package_type === "member_passes";
    const isGuestOnly = pkg.package_type === "non_member_passes";

    let ctaLabel = "Select Package";
    let ctaLink = "#";
    let ctaOnClick: (() => void) | undefined = undefined;

    if (isBundle) {
      ctaLink = `/register?package=${pkg.id}`;
    } else if (isMemberOnly) {
      if (currentUser) {
        if (currentProfile?.membership_status === "active") {
          ctaLink = "/dashboard";
          ctaLabel = "Buy in Dashboard";
        } else {
          ctaOnClick = () => alert("Your account membership status must be 'active' to purchase member-only packages. Check your dashboard status.");
          ctaLabel = "Active Membership Required";
        }
      } else {
        ctaLink = `/login?package=${pkg.id}`;
        ctaLabel = "Log in to Purchase";
      }
    } else if (isGuestOnly) {
      ctaOnClick = () => {
        setSelectedGuestPkg(pkg);
        setCheckoutSuccess(false);
        setCheckoutError(null);
      };
      ctaLabel = "Avail Guest Package";
    }

    return (
      <motion.div
        key={pkg.id}
        className="relative rounded-[2rem] p-8 flex flex-col spring-fast bg-white spotlight-card border border-gray-100 w-[320px] md:w-[350px] flex-shrink-0 snap-start"
      >
        <div className="absolute top-0 right-0 bg-green-700 text-white text-[8px] font-heading font-bold uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
          {isBundle ? "Membership Bundle" : isMemberOnly ? "For Active Members" : "Guest Pass Package"}
        </div>

        {/* Package Name */}
        <div className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 text-gray-400 mt-2">
          {pkg.name}
        </div>

        {/* Price */}
        <div className="flex items-end gap-1.5 mb-2 h-12">
          <span className="text-[2.25rem] font-heading font-black leading-none text-[#0D1A14]">
            PHP {Number(pkg.price).toLocaleString()}
          </span>
          <span className="text-sm mb-1 text-gray-400">{isBundle ? "/yr" : " once"}</span>
        </div>

        {/* Description */}
        <p className="text-sm mb-6 leading-relaxed min-h-[3rem] text-gray-400">{pkg.description}</p>

        {/* Features */}
        <ul className="space-y-2.5 flex-1 mb-6">
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
            <span className="text-gray-600 font-medium">
              {pkg.included_passes} Coffee Connections passes included
            </span>
          </li>
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
            <span className="text-gray-600">
              {isBundle ? "Includes annual Chamber membership tier" : isMemberOnly ? "Exclusively for existing registered members" : "No user account/membership required"}
            </span>
          </li>
        </ul>

        {/* Terms & Conditions */}
        {pkg.terms_and_conditions && (
          <div className="text-[10px] text-gray-400 leading-normal italic border-t border-gray-100 pt-3.5 mb-6">
            <span className="font-bold uppercase tracking-wider text-[8px] text-gray-500 block mb-0.5">Terms</span>
            {pkg.terms_and_conditions}
          </div>
        )}

        {/* CTA */}
        <div className="mt-auto">
          {ctaOnClick ? (
            <button
              onClick={ctaOnClick}
              className="btn-premium justify-center w-full spring-fast bg-[#0D1A14] text-white hover:bg-[#11241C] shadow-navy-diffuse cursor-pointer font-bold text-xs"
            >
              {ctaLabel}
              <span className="btn-icon-wrap !bg-white/10">
                <ArrowUpRight size={13} />
              </span>
            </button>
          ) : (
            <a
              href={ctaLink}
              className="btn-premium justify-center w-full spring-fast bg-[#0D1A14] text-white hover:bg-[#11241C] shadow-navy-diffuse font-bold text-xs"
            >
              {ctaLabel}
              <span className="btn-icon-wrap !bg-white/10">
                <ArrowUpRight size={13} />
              </span>
            </a>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <section id="membership" className="py-32 section-shell" aria-label="Membership plans">
      <div className="container mx-auto px-4 md:px-10 max-w-6xl">
        <div className="text-center max-w-xl mx-auto mb-16">
          <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="label-pill mb-5 inline-flex">Membership & Access</motion.span>
          <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-[#0D1A14] mb-4">
            Join the Chamber today
          </motion.h2>
          <motion.p custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="text-gray-500 leading-relaxed">
            Choose standard annual membership tiers, or acquire multi-event bundles for members and guests.
          </motion.p>
        </div>

        {/* Membership Plans Carousel */}
        <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-none flex-nowrap snap-x snap-mandatory lg:justify-center mb-24 -mx-4 px-4 md:mx-0 md:px-0">
          {displayPlans.map(({ name, price, period, desc, features, highlight, badge }, i) => (
            <motion.div
              key={name}
              custom={i} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className={`relative rounded-[2rem] p-8 flex flex-col spring-fast w-[320px] md:w-[350px] flex-shrink-0 snap-start ${
                highlight
                  ? "bg-green-700 shadow-diffuse-lg"
                  : "bg-white spotlight-card border border-gray-100"
              }`}
            >
              {badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-white text-[10px] font-heading font-bold rounded-full tracking-widest uppercase shadow-sm">
                  {badge}
                </div>
              )}

              <div className={`text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 ${highlight ? "text-green-200" : "text-gray-400"}`}>
                {name}
              </div>

              <div className="flex items-end gap-1.5 mb-2 h-12">
                <span className={`text-[2.75rem] font-heading font-black leading-none ${highlight ? "text-white" : "text-[#0D1A14]"}`}>
                  {price}
                </span>
                <span className={`text-sm mb-1 ${highlight ? "text-green-200" : "text-gray-400"}`}>{period}</span>
              </div>

              <p className={`text-sm mb-6 leading-relaxed min-h-[3rem] ${highlight ? "text-green-100" : "text-gray-400"}`}>{desc}</p>

              <ul className="space-y-2.5 flex-1 mb-8">
                {features.map((f: string) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <CheckCircle2 size={14} className={`mt-0.5 flex-shrink-0 ${highlight ? "text-green-300" : "text-green-600"}`} />
                    <span className={highlight ? "text-green-50" : "text-gray-600"}>{f}</span>
                  </li>
                ))}
              </ul>

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

        {/* Specialized Packages Category Layout */}
        <div className="border-t border-gray-100 pt-20">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h3 className="text-2xl font-heading font-black text-[#0D1A14] mb-3">
              Special Event Pass & Bundle Packages
            </h3>
            <p className="text-gray-500 leading-relaxed text-sm">
              Discover customized packages designed for prospective members, existing members seeking extra passes, or guests attending events.
            </p>
          </div>

          {/* Category Tabs Switcher */}
          <div className="flex justify-center mb-10">
            <div className="inline-flex bg-gray-100/80 p-1.5 rounded-2xl gap-1">
              <button
                onClick={() => setActiveCategory("bundles")}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === "bundles"
                    ? "bg-green-700 text-white shadow"
                    : "text-gray-500 hover:text-[#0D1A14]"
                }`}
              >
                Membership Bundles
              </button>
              <button
                onClick={() => setActiveCategory("members")}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === "members"
                    ? "bg-green-700 text-white shadow"
                    : "text-gray-500 hover:text-[#0D1A14]"
                }`}
              >
                For Existing Members
              </button>
              <button
                onClick={() => setActiveCategory("guests")}
                className={`px-4.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === "guests"
                    ? "bg-green-700 text-white shadow"
                    : "text-gray-500 hover:text-[#0D1A14]"
                }`}
              >
                For Guest Non-Members
              </button>
            </div>
          </div>

          {/* Package Carousel Display */}
          <div className="flex overflow-x-auto gap-6 pb-6 scrollbar-none flex-nowrap snap-x snap-mandatory md:justify-center min-h-[300px] -mx-4 px-4 md:mx-0 md:px-0">
            {activeCategory === "bundles" && (
              membershipBundles.length > 0 ? (
                membershipBundles.map(pkg => renderPackageCard(pkg))
              ) : (
                <div className="col-span-3 text-center py-12 text-gray-400 italic text-xs">No membership bundle packages available.</div>
              )
            )}
            
            {activeCategory === "members" && (
              memberPassPackages.length > 0 ? (
                memberPassPackages.map(pkg => renderPackageCard(pkg))
              ) : (
                <div className="col-span-3 text-center py-12 text-gray-400 italic text-xs">No member-exclusive packages available.</div>
              )
            )}

            {activeCategory === "guests" && (
              guestPassPackages.length > 0 ? (
                guestPassPackages.map(pkg => renderPackageCard(pkg))
              ) : (
                <div className="col-span-3 text-center py-12 text-gray-400 italic text-xs">No guest packages available.</div>
              )
            )}
          </div>

          {/* Guest Lookup Utility */}
          <div className="mt-20 max-w-xl mx-auto bg-gray-50/80 border border-gray-100 rounded-3xl p-6 md:p-8">
            <div className="flex items-center gap-2.5 mb-4 text-[#0D1A14]">
              <div className="w-8 h-8 rounded-xl bg-green-700/15 border border-green-700/20 flex items-center justify-center text-green-700">
                <Ticket size={15} />
              </div>
              <div>
                <h4 className="font-heading font-black text-sm">Guest Package Lookup</h4>
                <p className="text-[10px] text-gray-400">Already bought a guest package? Find your promo code here.</p>
              </div>
            </div>

            <form onSubmit={handleGuestLookupSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={lookupEmail}
                    onChange={(e) => setLookupEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-green-600 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Reference</label>
                  <input
                    type="text"
                    required
                    value={lookupRef}
                    onChange={(e) => setLookupRef(e.target.value)}
                    placeholder="GCASH-12345"
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl outline-none focus:border-green-600 bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={lookupLoading}
                className="w-full py-2.5 rounded-xl bg-[#0D1A14] text-white hover:bg-navy-mid font-bold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {lookupLoading ? <Loader2 size={13} className="animate-spin" /> : "Search Purchase Request"}
              </button>
            </form>

            {lookupError && (
              <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-semibold">
                {lookupError}
              </div>
            )}

            {lookupResult && (
              <div className="mt-4 p-4 border border-green-200 bg-green-50/50 rounded-2xl text-xs space-y-2 text-slate-700">
                <div className="flex justify-between font-bold text-slate-800">
                  <span>Package:</span>
                  <span>{lookupResult.membership_packages?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Status:</span>
                  <span className={`font-bold capitalize ${
                    lookupResult.status === "approved" ? "text-emerald-600" : lookupResult.status === "rejected" ? "text-red-600" : "text-amber-600 animate-pulse"
                  }`}>
                    {lookupResult.status}
                  </span>
                </div>
                {lookupResult.status === "approved" && lookupResult.promo_codes?.code && (
                  <div className="border-t border-green-200 pt-3 mt-2">
                    <p className="font-semibold text-slate-800 mb-1 text-[11px]">Your Event Promo Code:</p>
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-2 bg-white border border-green-300 text-green-700 font-mono font-bold text-sm rounded-xl flex-1 select-all text-center">
                        {lookupResult.promo_codes.code}
                      </span>
                      <button
                        onClick={() => copyPromoCode(lookupResult.promo_codes.code)}
                        className="p-2 border border-green-300 rounded-xl bg-white hover:bg-green-50 text-green-600 cursor-pointer"
                        title="Copy to clipboard"
                      >
                        {copiedCode ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-normal">
                      Copy this code and paste it in the Promo Code field on the event registration checkout modal to claim your 4 free passes. Restricted to <strong>{lookupResult.email}</strong>.
                    </p>
                  </div>
                )}
                {lookupResult.status === "pending" && (
                  <p className="text-[10px] text-amber-700 italic mt-1 leading-normal">
                    Your payment verification is pending. Our administrators will review the GCash/Bank Transfer reference number shortly.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Guest Package Checkout Modal */}
      <AnimatePresence>
        {selectedGuestPkg && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-gray-100 max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-heading font-black text-green-700 uppercase tracking-widest">Guest Package Checkout</span>
                  <h3 className="font-heading font-black text-base text-[#0D1A14] mt-0.5">{selectedGuestPkg.name}</h3>
                </div>
                <button
                  onClick={() => setSelectedGuestPkg(null)}
                  className="p-1.5 rounded-lg hover:bg-gray-50 text-gray-400 hover:text-slate-800 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-6 overflow-y-auto flex-1 text-slate-700 text-xs">
                {checkoutSuccess ? (
                  <div className="text-center py-6 space-y-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
                      <CheckCircle2 size={24} />
                    </div>
                    <h4 className="font-heading font-black text-sm text-[#0D1A14]">Purchase Request Submitted!</h4>
                    <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                      Thank you for availing of the event passes package! Our admins are verifying your payment references. Once approved, you can lookup your promo code using your email on this page.
                    </p>
                    <button
                      onClick={() => setSelectedGuestPkg(null)}
                      className="px-6 py-2 bg-[#0D1A14] text-white hover:bg-navy-mid font-semibold rounded-xl text-xs cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleGuestCheckoutSubmit} className="space-y-4.5">
                    {/* User Details */}
                    <div className="space-y-3">
                      <h4 className="font-bold text-[#0D1A14] text-[11px] uppercase tracking-wider">1. Contact Information</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name</label>
                          <input
                            type="text"
                            required
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="John Doe"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-green-600"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                          <input
                            type="email"
                            required
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="john@example.com"
                            className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-green-600"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number (Optional)</label>
                        <input
                          type="text"
                          value={guestPhone}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="e.g. +639171234567"
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-green-600"
                        />
                      </div>
                    </div>

                    {/* QR Payments Selector */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <h4 className="font-bold text-[#0D1A14] text-[11px] uppercase tracking-wider">2. Payment Verification</h4>
                      <p className="text-[10px] text-gray-500">Scan QR to pay <strong>PHP {Number(selectedGuestPkg.price).toLocaleString()}.00</strong></p>

                      {qrMethods.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3">
                          {qrMethods.map((qr) => (
                            <button
                              key={qr.id}
                              type="button"
                              onClick={() => setGuestPaymentMethod(qr.name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer")}
                              className={`p-3 border rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-center ${
                                (guestPaymentMethod === "gcash" && qr.name.toLowerCase().includes("gcash")) ||
                                (guestPaymentMethod === "bank_transfer" && !qr.name.toLowerCase().includes("gcash"))
                                  ? "border-green-700 bg-green-50/20 text-[#0D1A14]"
                                  : "border-gray-200 hover:bg-gray-50"
                              }`}
                            >
                              <img src={qr.qr_image_url} alt={qr.name} className="h-20 w-auto object-contain bg-white p-1 rounded" />
                              <div className="font-bold text-[10px]">{qr.name}</div>
                              <div className="text-[8px] text-gray-500 font-mono">{qr.account_number}</div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl text-[10px]">
                          No direct payment QR codes configured. Please contact the administrator.
                        </div>
                      )}
                    </div>

                    {/* Receipt Upload & Ref */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Transaction Reference</label>
                        <input
                          type="text"
                          required
                          value={guestRef}
                          onChange={(e) => setGuestRef(e.target.value)}
                          placeholder="GCash Reference No."
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-green-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1">Upload Receipt Image</label>
                        <input
                          type="file"
                          accept="image/*"
                          required
                          onChange={handleFileChange}
                          className="w-full text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-gray-100 file:text-[10px] file:font-semibold file:cursor-pointer"
                        />
                        {guestProofPreview && (
                          <div className="mt-2 text-center">
                            <img src={guestProofPreview} alt="Receipt preview" className="h-14 w-auto object-contain mx-auto rounded border border-gray-200 bg-gray-50 p-0.5" />
                          </div>
                        )}
                      </div>
                    </div>

                    {checkoutError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold">
                        {checkoutError}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full py-3 bg-green-700 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                    >
                      {checkoutLoading ? <Loader2 size={14} className="animate-spin" /> : `Submit Payment - PHP ${Number(selectedGuestPkg.price).toLocaleString()}.00`}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};

