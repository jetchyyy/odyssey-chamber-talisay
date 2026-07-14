import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { 
  CalendarDays, MapPin, Clock, ArrowRight, Newspaper, 
  ArrowUpRight, Loader2, CheckCircle2, QrCode, CreditCard, X,
  Camera, Upload, ChevronLeft, ChevronRight, Tag, Eye, EyeOff, User
} from "lucide-react";
import { Button } from "../ui/button";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { useNotification } from "../../context/NotificationContext";
import { useNavigate } from "react-router-dom";
import { uploadImage } from "../../lib/storage";
import QRDisplay from "../dashboard/QRDisplay";

const spring: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.75, delay: i * 0.09, ease: [0.32, 0.72, 0, 1] }
  }),
};

// Fallback data
const fallbackEvents = [
  {
    id: "fallback-1",
    title: "Talisay Business Summit 2026",
    date: "2026-06-20",
    time: "8:00 AM - 5:00 PM",
    venue: "Talisay City Hall Auditorium",
    tag: "Summit",
    tag_color: "bg-gold/15 text-amber-800 border border-gold/25",
    image_url: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop",
    price: 500,
    speaker: "Hon. Gerald Anthony Gullas Jr. (Mayor)",
    is_featured: true,
  },
  {
    id: "fallback-2",
    title: "SME Financing & Investment Forum",
    date: "2026-07-05",
    time: "1:00 PM - 6:00 PM",
    venue: "Cityland Commercial Center",
    tag: "Forum",
    tag_color: "bg-green-100 text-green-700",
    image_url: "https://images.unsplash.com/photo-1515187029135-18ee286d815b?q=80&w=600&auto=format&fit=crop",
    price: 0,
    speaker: "DTI Regional Director & Bank Officers",
    is_featured: false,
  },
  {
    id: "fallback-3",
    title: "Annual Trade Expo & Bazaar",
    date: "2026-08-12",
    time: "9:00 AM - 9:00 PM",
    venue: "Talisay Sports Complex",
    tag: "Expo",
    tag_color: "bg-amber-100 text-amber-700",
    image_url: "https://images.unsplash.com/photo-1473091534298-04dcbce3278c?q=80&w=600&auto=format&fit=crop",
    price: 200,
    speaker: "Various Local Industry Leaders",
    is_featured: false,
  },
];

const fallbackNews = [
  {
    id: "fallback-news-1",
    title: "Chamber signs MOU with DTI Region VII for SME development",
    summary: "A landmark agreement to accelerate small business growth and livelihood programs across Talisay, benefiting over 300 micro-enterprises.",
    published_at: "2026-05-10T00:00:00Z",
    category: "Partnership",
    read_time: "3 min",
    image_url: "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "fallback-news-2",
    title: "Talisay ranks among Cebu's top 5 business-friendly cities",
    summary: "Improved ease-of-doing-business scores reflect years of Chamber advocacy work with local government units.",
    published_at: "2026-04-28T00:00:00Z",
    category: "Economic News",
    read_time: "4 min",
    image_url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=700&auto=format&fit=crop",
  },
  {
    id: "fallback-news-3",
    title: "38 new businesses join at the latest member orientation",
    summary: "The newest batch spans retail, healthcare, logistics, and services, strengthening our local commerce and economic network.",
    published_at: "2026-04-15T00:00:00Z",
    category: "Membership",
    read_time: "2 min",
    image_url: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?q=80&w=700&auto=format&fit=crop",
  },
];

export const EventsSection: React.FC = () => {
  const { user, profile } = useAuth();
  const { toast } = useNotification();
  const navigate = useNavigate();

  const [dbEvents, setDbEvents] = useState<any[]>([]);
  const [hasFetchedEvents, setHasFetchedEvents] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  
  // Registration flow
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<any | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Guest inputs & generated QR Pass Code state
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [regQrCodePass, setRegQrCodePass] = useState("");

  // Privacy agreement states
  const [privacyTitle, setPrivacyTitle] = useState("Data Privacy Agreement");
  const [privacyContent, setPrivacyContent] = useState("");
  const [privacyActive, setPrivacyActive] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [partnerName, setPartnerName] = useState("");
  const [dataSharingScope, setDataSharingScope] = useState("none");
  const [agreedToPartnerSharing, setAgreedToPartnerSharing] = useState(false);

  // Promo code states
  const [promoCode, setPromoCode] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<any>(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState<string | null>(null);

  // Package Credit States
  const [userCredits, setUserCredits] = useState<any[]>([]);
  const [usePackagePass, setUsePackagePass] = useState(false);
  const [creditsLoading, setCreditsLoading] = useState(false);

  const [viewingEvent, setViewingEvent] = useState<any | null>(null);

  // Login & prompt flow for event registration modal
  const [memberPromptState, setMemberPromptState] = useState<"prompt" | "login" | "guest_form">("prompt");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const isMember = user && profile?.membership_status === "active";
  const originalPrice = selectedEvent ? (isMember ? selectedEvent.price : (selectedEvent.non_member_price || 0)) : 0;

  const discountAmount = appliedPromo && selectedEvent
    ? (appliedPromo.discount_type === "percentage"
        ? Math.min(originalPrice, (originalPrice * appliedPromo.discount_value) / 100)
        : Math.min(originalPrice, appliedPromo.discount_value))
    : 0;
  const finalPrice = selectedEvent 
    ? (usePackagePass ? 0 : Math.max(0, originalPrice - discountAmount)) 
    : 0;

  const handleApplyPromo = async () => {
    if (!promoCode.trim() || !selectedEvent) return;
    setPromoLoading(true);
    setPromoError(null);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setPromoError("Invalid promo code.");
        setAppliedPromo(null);
        return;
      }

      if (!data.is_active) {
        setPromoError("This promo code is inactive.");
        setAppliedPromo(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setPromoError("This promo code has expired.");
        setAppliedPromo(null);
        return;
      }

      if (data.max_uses !== null && data.uses_count >= data.max_uses) {
        setPromoError("Usage limit reached.");
        setAppliedPromo(null);
        return;
      }

      if (data.applicable_to !== "all" && data.applicable_to !== "event") {
        setPromoError("Not applicable to events.");
        setAppliedPromo(null);
        return;
      }

      setAppliedPromo(data);
      toast.success("Promo code applied!");
    } catch (err: any) {
      setPromoError(err.message || "Failed to validate promo code.");
      setAppliedPromo(null);
    } finally {
      setPromoLoading(false);
    }
  };

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase.from("events").select("*").eq("is_archived", false).order("date", { ascending: true });
        if (error) throw error;
        if (data) {
          setDbEvents(data);
          setHasFetchedEvents(true);
          
          // Fetch privacy policy settings
          const { data: privacyData } = await supabase
            .from("privacy_settings")
            .select("*")
            .eq("is_active", true)
            .order("created_at", { ascending: false });
          if (privacyData && privacyData.length > 0) {
            setPrivacyTitle(privacyData[0].title);
            setPrivacyContent(privacyData[0].content);
            setPrivacyActive(privacyData[0].is_active);
            setPartnerName(privacyData[0].partner_name || "");
            setDataSharingScope(privacyData[0].data_sharing_scope || "none");
          }
          
          if (data.length > 0) {
            // Check query parameters to see if we should auto-open a registration modal
            const params = new URLSearchParams(window.location.search);
            const registerEventId = params.get("register");
            if (registerEventId) {
              const foundEvent = data.find(e => e.id === registerEventId);
              if (foundEvent) {
                setSelectedEvent(foundEvent);
                setGuestName("");
                setGuestEmail("");
                setRegSuccess(false);
                setRegError(null);
                setPaymentReference("");
                setRegQrCodePass("");
                setMemberPromptState("prompt");
                setLoginEmail("");
                setLoginPassword("");
                setLoginError(null);
                setLoginLoading(false);
                setShowLoginPassword(false);
              }
            }
          }
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, []);



  useEffect(() => {
    if (!selectedEvent) return;
    const fetchPaymentDetails = async () => {
      try {
        const { data } = await supabase.from("qr_settings").select("*").eq("is_active", true);
        if (data) {
          setPaymentMethods(data);
          if (data.length > 0) setSelectedPayment(data[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    
    const fetchPackageCredits = async () => {
      if (!user || !selectedEvent.allow_package_redemption) {
        setUserCredits([]);
        setUsePackagePass(false);
        return;
      }
      setCreditsLoading(true);
      try {
        const { data, error } = await supabase
          .from("member_package_credits")
          .select("*")
          .eq("user_id", user.id)
          .eq("benefit_type", "coffee_connections")
          .eq("is_active", true)
          .gt("remaining_credits", 0)
          .limit(1);
        if (!error && data && data.length > 0) {
          setUserCredits(data);
          setUsePackagePass(true); // default to checked
        } else {
          setUserCredits([]);
          setUsePackagePass(false);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCreditsLoading(false);
      }
    };

    fetchPaymentDetails();
    fetchPackageCredits();
  }, [selectedEvent, user]);

  const activeEvents = hasFetchedEvents ? dbEvents : fallbackEvents;
  const featured = activeEvents.find(e => e.is_featured) || activeEvents[0];
  const rest = activeEvents.filter(e => e.id !== (featured?.id));
  const handleRegisterClick = (evt: any) => {
    setSelectedEvent(evt);
    setGuestName("");
    setGuestEmail("");
    setRegSuccess(false);
    setRegError(null);
    setPaymentReference("");
    setPaymentProofFile(null);
    setPaymentProofPreview("");
    setRegQrCodePass("");
    setAppliedPromo(null);
    setPromoCode("");
    setMemberPromptState("prompt");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
    setLoginLoading(false);
    setShowLoginPassword(false);
    setAgreedToPrivacy(false);
    setAgreedToPartnerSharing(false);
  };

  const handleCloseRegModal = () => {
    setSelectedEvent(null);
    setGuestName("");
    setGuestEmail("");
    setRegSuccess(false);
    setRegError(null);
    setPaymentReference("");
    setPaymentProofFile(null);
    setPaymentProofPreview("");
    setRegQrCodePass("");
    setAppliedPromo(null);
    setAgreedToPrivacy(false);
    setAgreedToPartnerSharing(false);
    setPromoCode("");
    setMemberPromptState("prompt");
    setLoginEmail("");
    setLoginPassword("");
    setLoginError(null);
    setLoginLoading(false);
    setShowLoginPassword(false);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent) return;

    // Determine target name & email
    const regName = user ? (profile?.full_name || "Chamber Member") : guestName.trim();
    const regEmail = user ? profile?.email : guestEmail.trim();

    if (!regName || !regEmail) {
      setRegError("Please fill in all registration fields.");
      return;
    }

    if (privacyActive && !agreedToPrivacy) {
      setRegError("You must agree to the Data Privacy Act before registering.");
      return;
    }

    const showPartnerCheckbox = privacyActive && !!partnerName && (dataSharingScope === "events_only" || dataSharingScope === "both");
    if (showPartnerCheckbox && !agreedToPartnerSharing) {
      setRegError(`You must agree to share your data with our partner ${partnerName} before registering.`);
      return;
    }

    const priceAfterDiscount = finalPrice;
    const currentDiscountAmount = discountAmount;

    if (priceAfterDiscount > 0) {
      if (!paymentReference) {
        setRegError("Please input your transaction reference number.");
        return;
      }
      if (!paymentProofFile) {
        setRegError("Please upload an image of your payment receipt as proof.");
        return;
      }
    }

    setRegLoading(true);
    setRegError(null);

    try {
      let proofUrl = null;
      if (priceAfterDiscount > 0 && paymentProofFile) {
        proofUrl = await uploadImage(paymentProofFile, "payment-proofs");
      }

      const qrPassCode = `EVT-${Math.floor(100000 + Math.random() * 900000)}`;
      setRegQrCodePass(qrPassCode);

      const regData: any = {
        event_id: selectedEvent.id,
        user_id: user ? user.id : null,
        full_name: regName,
        email: regEmail,
        payment_method: usePackagePass ? "package" : (priceAfterDiscount === 0 ? "free" : (selectedPayment?.name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer")),
        payment_reference: usePackagePass ? "PACKAGE-CREDIT" : (priceAfterDiscount === 0 ? "PROMO-FREE" : paymentReference),
        payment_status: usePackagePass ? "free" : (priceAfterDiscount === 0 ? "free" : "pending"),
        attendance_status: "registered",
        qr_code: qrPassCode,
        promo_code_id: appliedPromo ? appliedPromo.id : null,
        discount_amount: currentDiscountAmount,
        final_amount: priceAfterDiscount,
        used_package_credit_id: usePackagePass ? userCredits[0].id : null,
        agreed_to_privacy: agreedToPrivacy,
        agreed_to_partner_sharing: showPartnerCheckbox ? agreedToPartnerSharing : false,
      };

      if (proofUrl) {
        regData.payment_proof_url = proofUrl;
      }

      const { error } = await supabase.from("event_registrations").insert(regData);
      if (error) throw error;

      // Securely increment promo code usage count if applied
      if (appliedPromo) {
        const { error: rpcError } = await supabase.rpc("increment_promo_uses", {
          p_code_id: appliedPromo.id
        });
        if (rpcError) console.warn("Failed to increment promo uses count:", rpcError.message);
      }

      setRegSuccess(true);
      setPaymentProofFile(null);
      setPaymentProofPreview("");
      setAppliedPromo(null);
      setPromoCode("");
    } catch (err: any) {
      setRegError(err.message || "Failed to submit event registration.");
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <section className="py-32 section-shell" aria-label="Upcoming events">
      <div className="container mx-auto px-4 md:px-10 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="label-pill mb-5 inline-flex">Events & Seminars</motion.span>
            <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-[#0D1A14]">
              Upcoming events
            </motion.h2>
          </div>
          <motion.div custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <button onClick={() => navigate("/events")} className="btn-premium bg-[#0D1A14] text-white hover:-translate-y-0.5 shadow-navy-diffuse cursor-pointer">
              View all events
              <span className="btn-icon-wrap !bg-white/10"><ArrowRight size={13} /></span>
            </button>
          </motion.div>
        </div>

        {/* Asymmetric layout: large featured card + stacked side cards */}
        {activeEvents.length > 0 ? (
          <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-5">

            {/* Featured event  double-bezel */}
            {featured && (
              <motion.article
                custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
                onClick={() => setViewingEvent(featured)}
                className="bezel-outer shadow-diffuse cursor-pointer group"
              >
                <div className="bezel-inner flex flex-col h-full">
                  <div className="relative h-64 overflow-hidden rounded-t-[calc(2rem-5px)]">
                    <img src={featured.image_url} alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0D1A14]/70 to-transparent" />
                    <span className={`absolute top-4 left-4 text-xs font-heading font-semibold px-3 py-1 rounded-full ${featured.tag_color || "bg-green-700 text-white"}`}>
                      {featured.tag} - Featured
                    </span>
                    <span className="absolute bottom-4 right-4 bg-[#0D1A14]/85 text-green-400 text-xs font-bold px-3 py-1 rounded-full border border-green-900/40">
                      {featured.price === 0 ? "Free Event" : `PHP ${featured.price.toLocaleString()}`}
                    </span>
                  </div>
                  <div className="p-7 flex-1 flex flex-col">
                    <h3 className="font-heading font-bold text-[#0D1A14] text-xl mb-4 leading-snug group-hover:text-green-700 spring">
                      {featured.title}
                    </h3>
                    <div className="grid grid-cols-2 gap-3 text-sm text-gray-400 mb-6">
                      <span className="flex items-center gap-2"><CalendarDays size={13} className="text-green-600" />{new Date(featured.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                      <span className="flex items-center gap-2"><Clock size={13} className="text-green-600" />{featured.time}</span>
                      <span className="flex items-center gap-2 col-span-2"><MapPin size={13} className="text-green-600" />{featured.venue}</span>
                    </div>
                    <div className="mt-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRegisterClick(featured);
                        }}
                        className="btn-premium bg-green-700 hover:bg-green-600 text-white w-full justify-center shadow-diffuse hover:-translate-y-0.5 cursor-pointer"
                      >
                        Register Now
                        <span className="btn-icon-wrap !bg-white/15"><ArrowUpRight size={13} /></span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.article>
            )}

            {/* Side cards */}
            <div className="flex flex-col gap-5">
              {rest.map((evt, i) => (
                <motion.article
                  key={evt.id}
                  custom={i + 1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  onClick={() => setViewingEvent(evt)}
                  className="spotlight-card flex gap-4 p-5 cursor-pointer group flex-1"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={evt.image_url} alt={evt.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className={`text-[9px] font-heading font-semibold px-2 py-0.5 rounded-full ${evt.tag_color || "bg-green-100 text-green-700"}`}>{evt.tag}</span>
                      <span className="text-[10px] font-bold text-green-700">{evt.price === 0 ? "Free" : `PHP ${evt.price}`}</span>
                    </div>
                    <h3 className="font-heading font-bold text-[#0D1A14] text-sm leading-snug mb-2 group-hover:text-green-700 spring line-clamp-2">
                      {evt.title}
                    </h3>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1"><CalendarDays size={11} className="text-green-600" />{new Date(evt.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                      <span className="flex items-center gap-1"><MapPin size={11} className="text-green-600" />{evt.venue}</span>
                    </div>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 border border-gray-100 rounded-[2rem] text-center w-full">
            <CalendarDays className="w-12 h-12 text-[#0D1A14]/20 mb-4" />
            <h3 className="text-lg font-heading font-bold text-[#0D1A14] mb-1">No upcoming events</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              There are no upcoming events scheduled at the moment. Please stay tuned or check back later!
            </p>
          </div>
        )}
      </div>

      {/* EVENT DETAILS MODAL */}
      <AnimatePresence>
        {viewingEvent && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => setViewingEvent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer z-10"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>

              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className={`text-xs font-heading font-semibold px-2.5 py-0.5 rounded-full ${viewingEvent.tag_color || "bg-green-50 text-green-700 border border-green-100"}`}>
                  {viewingEvent.tag}
                </span>
                {viewingEvent.is_featured && (
                  <span className="text-[10px] bg-amber-500/10 text-amber-700 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">
                    Featured
                  </span>
                )}
                <span className="text-xs text-gray-400 font-semibold">
                  {viewingEvent.price === 0 && (viewingEvent.non_member_price === 0 || !viewingEvent.non_member_price)
                    ? "Free Entry"
                    : `Members: ${viewingEvent.price === 0 ? "Free" : `₱${viewingEvent.price.toLocaleString()}`} / Guests: ₱${(viewingEvent.non_member_price || 0).toLocaleString()}`
                  }
                </span>
              </div>

              <h3 className="text-2xl font-heading font-black text-gray-900 mb-4 leading-tight">{viewingEvent.title}</h3>

              {viewingEvent.image_url && (
                <div className="relative rounded-2xl overflow-hidden mb-6 bg-slate-900/5 dark:bg-slate-900/10 flex items-center justify-center min-h-[240px] max-h-[480px]">
                  <img
                    src={viewingEvent.image_url}
                    alt={viewingEvent.title}
                    className="max-h-[480px] w-auto object-contain mx-auto transition-all duration-300"
                  />
                </div>
              )}

              {/* Key Event Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4 p-4.5 rounded-2xl bg-gray-50/70 border border-gray-150 text-xs font-semibold text-gray-600 mb-6">
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={16} className="text-green-700 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Date</span>
                    <span className="text-gray-900 font-bold">{new Date(viewingEvent.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock size={16} className="text-green-700 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Time</span>
                    <span className="text-gray-900 font-bold">{viewingEvent.time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 sm:col-span-2">
                  <MapPin size={16} className="text-green-700 flex-shrink-0" />
                  <div>
                    <span className="text-[10px] text-gray-400 block uppercase font-bold">Venue</span>
                    <span className="text-gray-900 font-bold">{viewingEvent.venue}</span>
                  </div>
                </div>
                {viewingEvent.speaker && (
                  <div className="flex items-center gap-2.5 sm:col-span-2 border-t border-gray-200/60 pt-2.5 mt-1">
                    <User size={16} className="text-green-700 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Keynote Speaker</span>
                      <span className="text-gray-900 font-bold">{viewingEvent.speaker}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              {viewingEvent.description && (
                <div className="mb-8">
                  <h4 className="font-heading font-black text-xs text-gray-900 uppercase tracking-wider mb-2">Event Description</h4>
                  <p className="text-gray-500 text-sm leading-relaxed whitespace-pre-line font-sans">
                    {viewingEvent.description}
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setViewingEvent(null);
                    handleRegisterClick(viewingEvent);
                  }}
                  className="flex-1 btn-premium bg-green-700 hover:bg-green-600 text-white justify-center text-xs font-bold py-3"
                >
                  Register for Event
                  <span className="btn-icon-wrap !bg-white/15"><ArrowUpRight size={13} /></span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingEvent(null)}
                  className="px-6 py-3 border border-gray-200 hover:bg-gray-55/45 rounded-full text-gray-600 text-xs font-bold transition-all text-center cursor-pointer hover:bg-gray-50"
                >
                  Close Details
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT REGISTRATION MODAL */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-heading font-black text-gray-900 mb-2">Register for Event</h3>
              <h4 className="font-heading font-bold text-green-700 text-sm leading-relaxed mb-6">{selectedEvent.title}</h4>

              {(() => {
                const isMember = !!(user && profile?.membership_status === "active");
                const memberPrice = selectedEvent.price;
                const guestPrice = selectedEvent.non_member_price || 0;
                const applicablePrice = isMember ? memberPrice : guestPrice;

                if (regSuccess) {
                  return (
                    <div className="text-center py-6 flex flex-col items-center">
                      <div className="w-14 h-14 bg-green-50 border border-green-200 text-green-700 rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                        <CheckCircle2 size={28} />
                      </div>
                      <h4 className="font-heading font-black text-gray-900 text-base mb-2">Registration Submitted!</h4>
                      <p className="text-xs text-gray-500 leading-relaxed mb-6 max-w-sm">
                        {finalPrice > 0 
                          ? "Your payment reference is submitted for verification. Please save/download your QR Check-In Pass below to present at the venue."
                          : "Your free check-in pass has been generated! Save it below and present it at the venue entrance."}
                      </p>
                      
                      {/* Generated QR Pass Preview */}
                      <div className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm inline-block mb-6 text-center">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(regQrCodePass)}`} 
                          alt="Ticket Pass QR" 
                          className="w-36 h-36 object-contain mx-auto"
                        />
                        <div className="text-[10px] font-mono text-gray-400 mt-2 font-bold uppercase">{regQrCodePass}</div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 w-full">
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(regQrCodePass)}`;
                              const response = await fetch(qrUrl);
                              const blob = await response.blob();
                              const fileUrl = window.URL.createObjectURL(blob);
                              
                              const link = document.createElement("a");
                              link.href = fileUrl;
                              link.download = `chamber_pass_${selectedEvent.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                              window.URL.revokeObjectURL(fileUrl);
                              toast.success("Check-In Pass downloaded!");
                            } catch (e: any) {
                              toast.error("Download failed: " + e.message);
                            }
                          }}
                          className="flex-1 btn-premium bg-green-700 hover:bg-green-600 text-white justify-center text-xs"
                        >
                          Download QR Pass
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEvent(null);
                            if (user) {
                              navigate("/dashboard");
                            }
                          }}
                          className="flex-1 btn-premium bg-[#0D1A14] text-white justify-center text-xs"
                        >
                          {user ? "Go to Dashboard" : "Close"}
                        </button>
                      </div>
                    </div>
                  );
                }

                if (!user && memberPromptState === "prompt") {
                  return (
                    <div className="space-y-6 py-4">
                      <div className="text-center space-y-3">
                        <div className="w-16 h-16 bg-gold/10 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-gold/20">
                          <CalendarDays size={32} />
                        </div>
                        <h4 className="font-heading font-black text-gray-900 text-lg">Are you a registered Chamber member?</h4>
                        <p className="text-xs text-gray-500 leading-relaxed max-w-sm mx-auto">
                          Active members of the Talisay Chamber of Commerce receive special discounted admission rates, package credit redemptions, and automated event tracking.
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-3">
                        <button
                          type="button"
                          onClick={() => setMemberPromptState("login")}
                          className="w-full btn-premium bg-green-700 hover:bg-green-600 text-white justify-center shadow-diffuse text-xs font-bold py-3.5"
                        >
                          Yes, I am a member (Log In)
                        </button>
                        <button
                          type="button"
                          onClick={() => setMemberPromptState("guest_form")}
                          className="w-full py-3 border border-gray-200 hover:border-gray-300 rounded-xl text-gray-600 text-xs font-bold transition-all text-center cursor-pointer hover:bg-gray-50/50"
                        >
                          No, continue as Guest
                        </button>
                      </div>
                    </div>
                  );
                }

                if (!user && memberPromptState === "login") {
                  return (
                    <div className="space-y-5 py-2">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-2">
                        <h4 className="font-heading font-black text-gray-900 text-base">Sign In to Member Portal</h4>
                        <button
                          type="button"
                          onClick={() => setMemberPromptState("prompt")}
                          className="text-[11px] text-green-700 font-bold hover:underline"
                        >
                          Back
                        </button>
                      </div>

                      {loginError && (
                        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
                          {loginError}
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-[10px] font-heading font-bold text-gray-500 uppercase mb-1">Email Address</label>
                          <input
                            type="email"
                            placeholder="you@company.com"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-heading font-bold text-gray-500 uppercase mb-1">Password</label>
                          <div className="relative">
                            <input
                              type={showLoginPassword ? "text" : "password"}
                              placeholder="••••••••"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                            >
                              {showLoginPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={loginLoading}
                          onClick={async () => {
                            if (!loginEmail || !loginPassword) {
                              setLoginError("Please enter both email and password.");
                              return;
                            }
                            setLoginLoading(true);
                            setLoginError(null);
                            try {
                              const { error: signInError } = await supabase.auth.signInWithPassword({
                                email: loginEmail,
                                password: loginPassword,
                              });
                              if (signInError) throw signInError;
                            } catch (err: any) {
                              setLoginError(err.message || "Failed to sign in.");
                            } finally {
                              setLoginLoading(false);
                            }
                          }}
                          className="w-full btn-premium bg-[#0D1A14] text-white justify-center shadow-navy-diffuse text-xs font-bold py-3"
                        >
                          {loginLoading ? (
                            <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Signing In...</span>
                          ) : (
                            "Sign In"
                          )}
                        </button>

                        <div className="text-center pt-2">
                          <button
                            type="button"
                            onClick={() => setMemberPromptState("guest_form")}
                            className="text-xs text-gray-500 hover:text-gray-700 font-semibold"
                          >
                            Or continue registering as Guest
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    {!user && (
                      <div className="p-3 bg-green-50 border border-green-200 text-[11px] text-green-800 rounded-xl font-semibold flex items-center justify-between">
                        <span>Registering as a Guest.</span>
                        <button
                          type="button"
                          onClick={() => setMemberPromptState("login")}
                          className="text-green-700 font-bold hover:underline"
                        >
                          Are you a member? Sign In
                        </button>
                      </div>
                    )}

                    {regError && (
                      <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
                        {regError}
                      </div>
                    )}

                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-500 leading-relaxed space-y-1">
                      <div><span className="font-bold text-gray-800">Speaker:</span> {selectedEvent.speaker}</div>
                      <div><span className="font-bold text-gray-800">Venue:</span> {selectedEvent.venue}</div>
                      <div><span className="font-bold text-gray-800">Date/Time:</span> {selectedEvent.date} @ {selectedEvent.time}</div>
                      <div className="border-t border-gray-200/60 my-2 pt-2 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-gray-800">Admission Rate:</div>
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {isMember ? (
                              <span className="text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-200">Chamber Member Rate Active</span>
                            ) : (
                              <span>Guest/Non-member Rate Active</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-green-700 font-black text-sm">
                            {applicablePrice === 0 ? "Free Event" : (
                              finalPrice === 0 ? "Free Applied" : `PHP ${finalPrice.toLocaleString()}`
                            )}
                          </span>
                          <div className="text-[9px] text-gray-400 mt-0.5">
                            {isMember ? `Standard rate: PHP ${guestPrice.toLocaleString()}` : `Member rate: PHP ${memberPrice.toLocaleString()}`}
                          </div>
                        </div>
                      </div>
                    </div>

                    {!user && (
                      <div className="grid sm:grid-cols-2 gap-4 border-b border-gray-100 pb-4 mb-4">
                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Full Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="Your full name"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="Your email address"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                          />
                        </div>
                      </div>
                    )}

                    {/* Package Credits Redemption Selector */}
                    {userCredits.length > 0 && (
                      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-2 mb-4">
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            id="use_package_pass_chk"
                            checked={usePackagePass}
                            onChange={(e) => {
                              setUsePackagePass(e.target.checked);
                              if (e.target.checked) {
                                // Clear promo code if redeeming pass
                                setAppliedPromo(null);
                                setPromoCode("");
                              }
                            }}
                            className="rounded border-gray-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer mt-0.5"
                          />
                          <div className="flex-1">
                            <label htmlFor="use_package_pass_chk" className="font-heading font-black text-xs text-[#5C3E14] cursor-pointer block select-none">
                              Use Coffee Connections Package Credit
                            </label>
                            <p className="text-[10px] text-amber-700 font-semibold mt-0.5 leading-normal">
                              You have <span className="font-bold text-amber-800">{userCredits[0].remaining_credits} passes</span> remaining in your package. Checking this will redeem 1 pass for this event.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Promo Code Input */}
                    {!usePackagePass && applicablePrice > 0 && (
                      <div className="pt-2 border-t border-gray-100">
                        <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Promotional Discount Code</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            placeholder="Enter Promo Code"
                            value={promoCode}
                            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                            disabled={!!appliedPromo || promoLoading}
                            className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs outline-none uppercase font-mono tracking-wider focus:bg-white focus:border-green-500 transition-all disabled:opacity-60"
                          />
                          {appliedPromo ? (
                            <button
                              type="button"
                              onClick={() => {
                                setAppliedPromo(null);
                                setPromoCode("");
                              }}
                              className="px-3.5 py-2 rounded-xl border border-red-200 hover:bg-red-50 text-red-500 text-xs font-bold transition-all cursor-pointer"
                            >
                              Clear
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleApplyPromo}
                              disabled={promoLoading || !promoCode.trim()}
                              className="px-3.5 py-2 rounded-xl bg-green-700 hover:bg-green-600 disabled:bg-gray-300 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center min-w-[64px]"
                            >
                              {promoLoading ? <Loader2 size={12} className="animate-spin" /> : "Apply"}
                            </button>
                          )}
                        </div>
                        {promoError && (
                          <p className="text-[10px] text-red-500 mt-1 font-semibold">{promoError}</p>
                        )}
                        {appliedPromo && (
                          <p className="text-[10px] text-green-600 mt-1 font-bold flex items-center gap-1">
                            ✓ Code Applied: {appliedPromo.code} ({appliedPromo.discount_type === 'percentage' ? `${appliedPromo.discount_value}%` : `PHP ${appliedPromo.discount_value.toLocaleString()}`} Off)
                          </p>
                        )}
                      </div>
                    )}

                    {/* Price breakdown */}
                    {applicablePrice > 0 && discountAmount > 0 && (
                      <div className="p-3 rounded-2xl bg-green-50/50 border border-green-200 text-[11px] space-y-1 font-semibold text-green-800">
                        <div className="flex justify-between">
                          <span className="text-gray-505">Admission rate:</span>
                          <span>PHP {applicablePrice.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-red-600 font-bold">
                          <span>Discount:</span>
                          <span>- PHP {discountAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs font-black border-t border-green-200 pt-1.5 mt-1 text-[#0D1A14]">
                          <span>Total Amount Due:</span>
                          <span>PHP {finalPrice.toLocaleString()}</span>
                        </div>
                      </div>
                    )}



                    {applicablePrice > 0 && finalPrice === 0 && (
                      <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-800 font-bold flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                          <Tag size={16} />
                        </div>
                        <div>
                          <h4 className="font-black">
                            {usePackagePass ? "Redeeming Package Credit" : "Free Event Entry Applied"}
                          </h4>
                          <p className="font-normal text-[10px] text-green-700 mt-0.5">
                            {usePackagePass
                              ? "Your membership package credit will be redeemed for this event. GCash payment proof is bypassed. Simply submit the form below."
                              : "Your applied promotional code has reduced the entry fee to PHP 0. GCash scan proof is bypassed. Simply submit the form below."}
                          </p>
                        </div>
                      </div>
                    )}

                    {finalPrice > 0 && (
                      <div className="space-y-4 border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-heading font-bold text-gray-700">Choose Channel for Payment:</span>
                          <div className="flex gap-2">
                            {paymentMethods.map(pay => (
                              <button
                                key={pay.id}
                                type="button"
                                onClick={() => setSelectedPayment(pay)}
                                className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                                  selectedPayment?.id === pay.id ? "bg-[#0D1A14] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                              >
                                {pay.name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {selectedPayment && (
                          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 space-y-3 text-xs">
                            <div className="flex flex-col items-center">
                              <QRDisplay qr={selectedPayment} lightboxId="evt-qr-lightbox" />
                            </div>
                            <div>
                              <h5 className="font-heading font-bold text-gray-900">{selectedPayment.name}</h5>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-normal">{selectedPayment.payment_instructions}</p>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Transaction Reference Number *</label>
                          <div className="relative">
                            <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                              type="text"
                              required
                              placeholder="Enter the Ref number from receipt"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Proof of Payment Image *</label>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                              {paymentProofPreview ? (
                                <img src={paymentProofPreview} alt="Receipt Preview" className="w-full h-full object-cover" />
                              ) : (
                                <Camera size={18} className="text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <label
                                htmlFor="evt-proof-upload"
                                className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 hover:border-green-500 rounded-xl text-[11px] font-bold text-gray-600 transition-colors w-full"
                              >
                                <Upload size={12} />
                                {paymentProofFile ? paymentProofFile.name : "Select Receipt Image"}
                              </label>
                              <input
                                id="evt-proof-upload"
                                type="file"
                                accept="image/*"
                                required
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    setPaymentProofFile(file);
                                    setPaymentProofPreview(URL.createObjectURL(file));
                                  }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {privacyActive && privacyContent && (
                      <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3 mt-4 text-left">
                        <h4 className="text-[11px] font-heading font-black text-gray-900 uppercase tracking-wider">{privacyTitle}</h4>
                        <div className="max-h-28 overflow-y-auto text-[10px] text-gray-500 font-normal leading-relaxed pr-1 whitespace-pre-line border-t border-gray-150 pt-2 scrollbar-thin">
                          {privacyContent}
                        </div>
                        <div className="flex flex-col gap-2.5 border-t border-gray-150 pt-2.5">
                          <div className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              id="evt_agree_privacy_chk"
                              checked={agreedToPrivacy}
                              onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                              className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4 cursor-pointer mt-0.5"
                              required
                            />
                            <label htmlFor="evt_agree_privacy_chk" className="text-[11px] text-gray-600 font-semibold cursor-pointer select-none">
                              I consent to the collection and processing of my personal data as described in this agreement. *
                            </label>
                          </div>

                          {!!partnerName && (dataSharingScope === "events_only" || dataSharingScope === "both") && (
                            <div className="flex items-start gap-2">
                              <input
                                type="checkbox"
                                id="evt_agree_partner_chk"
                                checked={agreedToPartnerSharing}
                                onChange={(e) => setAgreedToPartnerSharing(e.target.checked)}
                                className="rounded border-gray-300 text-green-700 focus:ring-green-500 w-4 h-4 cursor-pointer mt-0.5"
                                required
                              />
                              <label htmlFor="evt_agree_partner_chk" className="text-[11px] text-gray-600 font-semibold cursor-pointer select-none">
                                You also agree to share your data with our partner <span className="font-bold text-gray-900">{partnerName}</span>. *
                              </label>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full btn-premium bg-green-700 hover:bg-green-600 text-white justify-center shadow-diffuse text-xs mt-4"
                    >
                      {regLoading ? (
                        <span className="flex items-center gap-1.5"><Loader2 size={13} className="animate-spin" /> Submitting...</span>
                      ) : (
                        applicablePrice === 0 ? "Get Free Pass" : "Register and Pay"
                      )}
                    </button>
                  </form>
                );
              })()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export const NewsSection: React.FC = () => {
  const [dbNews, setDbNews] = useState<any[]>([]);
  const [hasFetchedNews, setHasFetchedNews] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any | null>(null);
  const navigate = useNavigate();
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  useEffect(() => {
    setActiveImgIndex(0);
  }, [selectedNews]);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const { data, error } = await supabase.from("news").select("*").eq("status", "approved").order("published_at", { ascending: false });
        if (error) throw error;
        if (data) {
          setDbNews(data);
          setHasFetchedNews(true);
        } else {
          setDbNews([]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchNews();
  }, []);

  const activeNews = hasFetchedNews ? dbNews : fallbackNews;
  const featured = activeNews[0];
  const rest = activeNews.slice(1);

  return (
    <section className="py-32 bg-white" aria-label="News and announcements">
      <div className="container mx-auto px-4 md:px-10 max-w-7xl">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
          <div>
            <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="label-pill mb-5 inline-flex">News & Announcements</motion.span>
            <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="text-[clamp(1.875rem,3.5vw,3rem)] font-heading font-black text-[#0D1A14]">
              Latest updates
            </motion.h2>
          </div>
          <motion.div custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Button onClick={() => navigate("/news")} variant="outline" className="border-gray-200 text-gray-700 font-heading font-semibold rounded-full cursor-pointer spring group">
              All News <ArrowRight className="ml-1 w-4 h-4 group-hover:translate-x-1 spring-fast" />
            </Button>
          </motion.div>
        </div>

        {/* Asymmetric 2-col: big featured + 2 stacked  items-stretch for equal heights */}
        {activeNews.length > 0 ? (
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-stretch">
            {/* Featured */}
            {featured && (
              <motion.article
                custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
                onClick={() => setSelectedNews(featured)}
                className="group cursor-pointer"
              >
                <div className="bezel-outer shadow-diffuse h-full">
                  <div className="bezel-inner flex flex-col h-full">
                    <div className="h-56 overflow-hidden rounded-t-[calc(2rem-5px)] flex-shrink-0">
                      <img src={featured.image_url} alt={featured.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" />
                    </div>
                    <div className="p-7 flex flex-col flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-[10px] font-heading font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">{featured.category}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1"><Newspaper size={10} /> {featured.read_time || "3 min"} read</span>
                      </div>
                      <h3 className="font-heading font-bold text-[#0D1A14] text-xl mb-3 leading-snug group-hover:text-green-700 spring">
                        {featured.title}
                      </h3>
                      <p className="text-gray-500 text-sm leading-relaxed mb-4 flex-1">{featured.summary}</p>
                      <span className="text-xs text-gray-400">{new Date(featured.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>
                </div>
              </motion.article>
            )}

            {/* Side articles */}
            <div className="flex flex-col gap-5">
              {rest.map((item, i) => (
                <motion.article
                  key={item.id}
                  custom={i + 1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
                  onClick={() => setSelectedNews(item)}
                  className="spotlight-card flex gap-4 p-5 cursor-pointer group flex-1"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-heading font-semibold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">{item.category}</span>
                      <span className="text-[10px] text-gray-400">{item.read_time || "3 min"} read</span>
                    </div>
                    <h3 className="font-heading font-bold text-[#0D1A14] text-sm leading-snug mb-2 group-hover:text-green-700 spring line-clamp-2">{item.title}</h3>
                    <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">{item.summary}</p>
                    <span className="text-[11px] text-gray-400">{new Date(item.published_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                </motion.article>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 px-4 bg-gray-50 border border-gray-100 rounded-[2rem] text-center w-full">
            <Newspaper className="w-12 h-12 text-[#0D1A14]/20 mb-4" />
            <h3 className="text-lg font-heading font-bold text-[#0D1A14] mb-1">No news updates</h3>
            <p className="text-sm text-gray-550 max-w-sm">
              There are no news updates or announcements at the moment. Please check back later!
            </p>
          </div>
        )}
      </div>

      {/* ARTICLE READER MODAL */}
      <AnimatePresence>
        {selectedNews && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-2xl bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => setSelectedNews(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <span className="text-xs font-heading font-semibold px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100">{selectedNews.category}</span>
                <span className="text-xs text-gray-400">{selectedNews.read_time || "3 min"} read</span>
                <span className="text-xs text-gray-400">•</span>
                <span className="text-xs text-gray-400">{new Date(selectedNews.published_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
              </div>

              <h3 className="text-2xl font-heading font-black text-gray-900 mb-4 leading-tight">{selectedNews.title}</h3>
              
              {(() => {
                const articleImages = selectedNews.images && selectedNews.images.length > 0
                  ? selectedNews.images
                  : (selectedNews.image_url ? [selectedNews.image_url] : []);
                return articleImages.length > 0 && (
                  <div className="relative rounded-2xl overflow-hidden mb-6 bg-slate-900/5 dark:bg-slate-900/10 flex items-center justify-center min-h-[240px] max-h-[480px]">
                    <img
                      src={articleImages[activeImgIndex]}
                      alt={`${selectedNews.title} photo ${activeImgIndex + 1}`}
                      className="max-h-[480px] w-auto object-contain transition-all duration-300 mx-auto"
                    />
                    
                    {articleImages.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImgIndex((prev) => (prev === 0 ? articleImages.length - 1 : prev - 1));
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white rounded-full p-2 transition-all cursor-pointer z-10"
                          aria-label="Previous image"
                        >
                          <ChevronLeft size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImgIndex((prev) => (prev === articleImages.length - 1 ? 0 : prev + 1));
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/85 text-white rounded-full p-2 transition-all cursor-pointer z-10"
                          aria-label="Next image"
                        >
                          <ChevronRight size={18} />
                        </button>
                        
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 bg-black/40 px-2.5 py-1 rounded-full backdrop-blur-sm">
                          {articleImages.map((_url: string, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImgIndex(idx);
                              }}
                              className={`w-1.5 h-1.5 rounded-full transition-all cursor-pointer ${
                                idx === activeImgIndex ? "bg-white scale-125" : "bg-white/55 hover:bg-white/80"
                              }`}
                              aria-label={`Go to slide ${idx + 1}`}
                            />
                          ))}
                        </div>
                        
                        <span className="absolute top-3 right-3 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-mono z-10 font-bold">
                          {activeImgIndex + 1} / {articleImages.length}
                        </span>
                      </>
                    )}
                  </div>
                );
              })()}

              <p className="font-heading font-semibold text-gray-600 text-sm mb-6 leading-relaxed bg-gray-50 p-4.5 border-l-4 border-green-700 rounded-r-xl">
                {selectedNews.summary}
              </p>

              <div className="text-gray-500 text-sm leading-relaxed whitespace-pre-line font-sans mb-6">
                {selectedNews.content}
              </div>

              <div className="border-t border-gray-100 pt-4 flex justify-between text-xs text-gray-400 font-semibold">
                <span>Published by: {selectedNews.author || "Chamber Admin"}</span>
                <button
                  onClick={() => setSelectedNews(null)}
                  className="text-green-700 hover:underline"
                >
                  Close Article
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export const CtaSection: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="py-32 relative overflow-hidden bg-[#0D1A14]" aria-label="Join the Chamber">
      {/* Background imagery */}
      <div
        className="absolute inset-0 opacity-[0.12] bg-cover bg-center"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1554469384-e58fac16e23a?q=80&w=2000&auto=format&fit=crop')" }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D1A14] via-green-950/40 to-[#0D1A14]" aria-hidden="true" />
      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-green-800/20 rounded-full blur-3xl pointer-events-none" aria-hidden="true" />

      <div className="relative z-10 container mx-auto px-4 md:px-10 max-w-4xl text-center">
        <motion.span custom={0} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="label-pill mb-6 inline-flex !bg-green-900/50 !text-green-300 !border-green-700/40">
          Become a Member
        </motion.span>

        <motion.h2 custom={1} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-[clamp(2.25rem,5vw,4.5rem)] font-heading font-black text-white mb-6 leading-tight">
          Ready to accelerate your business growth?
        </motion.h2>

        <motion.p custom={2} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="text-[1.0625rem] text-slate-400 mb-12 max-w-[52ch] mx-auto leading-[1.8]">
          Join Talisay's most powerful commercial network. Gain exclusive access
          to events, resources, partnerships, and government linkages.
        </motion.p>

        <motion.div custom={3} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-14">
          <button onClick={() => navigate("/register")} className="btn-premium bg-green-700 hover:bg-green-600 text-white shadow-diffuse-lg hover:-translate-y-1 cursor-pointer">
            Apply for Membership
            <span className="btn-icon-wrap !bg-white/15"><ArrowUpRight size={14} /></span>
          </button>
          <button onClick={() => navigate("/contact")} className="btn-premium glass-dark text-white hover:-translate-y-0.5 cursor-pointer">
            Contact Our Office
          </button>
        </motion.div>

        {/* Trust indicators */}
        <motion.div custom={4} variants={spring} initial="hidden" whileInView="visible" viewport={{ once: true }}
          className="flex flex-wrap justify-center gap-8">
          {[
            { num: "27", label: "Years of Service" },
            { num: "50+", label: "Events/Year" },
            { num: "PHP 2B+", label: "Economic Impact" },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl font-heading font-black text-white tabular-nums">{num}</div>
              <div className="text-xs text-slate-500 mt-1 tracking-wide">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
