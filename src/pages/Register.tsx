import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Mail, Lock, User, Eye, EyeOff, Loader2, CheckCircle2, Sparkles, Layers } from "lucide-react";
import { supabase } from "../lib/supabase";

const DEFAULT_PLANS = [
  {
    id: "individual",
    type: "individual",
    name: "Small",
    price: 1500,
    period: "yr",
    description: "For solo entrepreneurs starting their journey.",
    benefits: ["Networking access", "Event invitations", "Member directory listing"],
  },
  {
    id: "sme",
    type: "sme",
    name: "Medium",
    price: 5000,
    period: "yr",
    description: "Most popular for growing small and medium businesses.",
    benefits: ["All Small benefits", "Business promotion", "Training & seminars access", "Priority support"],
  },
  {
    id: "corporate",
    type: "corporate",
    name: "Large",
    price: 15000,
    period: "yr",
    description: "For established corporations seeking maximum visibility.",
    benefits: ["All Medium benefits", "Board meeting access", "Co-branding rights", "VIP event seating"],
  },
];

const DEFAULT_PACKAGES = [
  {
    id: "package_a",
    name: "Package A: Small Enterprise",
    price: 2900,
    membership_type: "individual",
    description: "Combines Small annual membership with 4 Coffee Connections session passes. Save PHP 1,100.",
    included_passes: 4,
    benefit_type: "coffee_connections",
    terms_and_conditions: "Subject to event availability. Passes must be used within the fiscal year.",
  },
  {
    id: "package_b",
    name: "Package B: Medium Enterprise",
    price: 3800,
    membership_type: "sme",
    description: "Combines Medium annual membership with 4 Coffee Connections session passes. Save PHP 1,200.",
    included_passes: 4,
    benefit_type: "coffee_connections",
    terms_and_conditions: "Subject to event availability. Passes must be used within the fiscal year.",
  },
  {
    id: "package_c",
    name: "Package C: Large Enterprise",
    price: 4700,
    membership_type: "corporate",
    description: "Combines Large annual membership with 4 Coffee Connections session passes. Save PHP 1,300.",
    included_passes: 4,
    benefit_type: "coffee_connections",
    terms_and_conditions: "Subject to event availability. Passes must be used within the fiscal year.",
  },
];

const Register: React.FC = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<"plans" | "packages">("plans");
  const [selectedItem, setSelectedItem] = useState<{ id: string; name: string; price: string; isPackage: boolean; type?: string } | null>(null);
  
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [showPassword, setShowPassword] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch plans and packages from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: plansData } = await supabase
          .from("membership_pricing")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });
        const { data: packagesData } = await supabase
          .from("membership_packages")
          .select("*")
          .eq("is_active", true)
          .order("price", { ascending: true });

        const finalPlans = plansData && plansData.length > 0 ? plansData : DEFAULT_PLANS;
        const finalPkgs = packagesData && packagesData.length > 0 ? packagesData : DEFAULT_PACKAGES;

        setDbPlans(finalPlans);
        setDbPackages(finalPkgs);

        // Check if there is already a plan or package in query parameters
        const params = new URLSearchParams(window.location.search);
        const pkgParam = params.get("package");
        const planParam = params.get("plan");

        if (pkgParam) {
          const foundPkg = finalPkgs.find(p => p.id === pkgParam);
          if (foundPkg) {
            setSelectedItem({
              id: foundPkg.id,
              name: foundPkg.name,
              price: `PHP ${Number(foundPkg.price).toLocaleString()}`,
              isPackage: true,
              type: foundPkg.membership_type
            });
            setStep(2);
          }
        } else if (planParam) {
          const foundPlan = finalPlans.find(p => p.type === planParam || p.id === planParam);
          if (foundPlan) {
            setSelectedItem({
              id: foundPlan.id,
              name: foundPlan.name,
              price: `PHP ${Number(foundPlan.price).toLocaleString()}`,
              isPackage: false,
              type: foundPlan.type
            });
            setStep(2);
          }
        }
      } catch (err) {
        console.error("Error loading plans/packages in register:", err);
        setDbPlans(DEFAULT_PLANS);
        setDbPackages(DEFAULT_PACKAGES);
      } finally {
        setDataLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSelectItem = (item: any, isPackage: boolean) => {
    const formattedItem = {
      id: item.id,
      name: item.name,
      price: `PHP ${Number(item.price).toLocaleString()}`,
      isPackage,
      type: isPackage ? item.membership_type : item.type
    };
    setSelectedItem(formattedItem);
    
    // Update URL query parameters
    const params = new URLSearchParams();
    if (isPackage) {
      params.set("package", item.id);
    } else {
      params.set("plan", item.type || item.id);
    }
    navigate(`/register?${params.toString()}`, { replace: true });
    
    setStep(2);
  };

  const handleChangeSelection = () => {
    setSelectedItem(null);
    setStep(1);
    // Clear URL parameters
    navigate("/register", { replace: true });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password) {
      setError("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullName = `${firstName.trim()} ${lastName.trim()}`;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "member",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data?.user) {
        setSuccess(true);
        const params = new URLSearchParams(window.location.search);
        const pkgParam = params.get("package");
        const planParam = params.get("plan");
        const nextParams = new URLSearchParams();
        if (pkgParam) nextParams.set("package", pkgParam);
        if (planParam) nextParams.set("plan", planParam);
        const searchStr = nextParams.toString();
        setTimeout(() => {
          navigate(searchStr ? `/login?${searchStr}` : "/login");
        }, 4000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf6] pt-28 pb-16 px-4 relative overflow-hidden flex flex-col items-center">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gold/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-50 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none" />

      <div className="w-full max-w-5xl relative z-10 flex flex-col items-center">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 shadow-diffuse mb-6 hover:scale-105 transition-transform duration-300">
            <span className="text-white font-heading font-bold text-lg">TC</span>
          </Link>
          <h1 className="text-3xl md:text-4xl font-heading font-black text-[#0D1A14] mb-2">Join the Chamber</h1>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            {step === 1 
              ? "Select a membership tier or special package to start your application" 
              : "Complete the form below to create your account"}
          </p>
        </div>

        {error && (
          <div className="w-full max-w-md mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
            {error}
          </div>
        )}

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              className="w-full flex flex-col items-center"
            >
              {/* Tab switcher */}
              <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-12 shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)]">
                <button
                  onClick={() => setActiveTab("plans")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === "plans"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Layers size={13} />
                  Membership Plans
                </button>
                <button
                  onClick={() => setActiveTab("packages")}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-heading font-bold transition-all duration-200 cursor-pointer ${
                    activeTab === "packages"
                      ? "bg-white text-green-700 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Sparkles size={13} />
                  Special Packages
                </button>
              </div>

              {dataLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Loader2 className="animate-spin text-green-700 mb-4" size={32} />
                  <p className="text-sm font-medium">Loading memberships details...</p>
                </div>
              ) : activeTab === "plans" ? (
                <div className="grid md:grid-cols-3 gap-6 w-full items-stretch">
                  {dbPlans.map((plan: any) => (
                    <div
                      key={plan.id}
                      className={`relative rounded-[2rem] p-8 flex flex-col bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)] hover:-translate-y-1 group`}
                    >
                      {plan.type === "sme" && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold text-white text-[9px] font-heading font-bold rounded-full tracking-widest uppercase shadow-sm">
                          Popular Choice
                        </div>
                      )}
                      <div className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 text-gray-400">
                        {plan.name} Plan
                      </div>
                      <div className="flex items-end gap-1.5 mb-3">
                        <span className="text-[2.25rem] font-heading font-black leading-none text-[#0D1A14]">
                          PHP {Number(plan.price).toLocaleString()}
                        </span>
                        <span className="text-sm mb-1 text-gray-400">/{plan.period || "yr"}</span>
                      </div>
                      <p className="text-sm text-gray-400 leading-relaxed mb-6 min-h-[2.5rem]">
                        {plan.description}
                      </p>
                      
                      <ul className="space-y-2.5 flex-1 mb-8">
                        {(plan.benefits || []).map((b: string) => (
                          <li key={b} className="flex items-start gap-2.5 text-sm">
                            <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
                            <span className="text-gray-600">{b}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => handleSelectItem(plan, false)}
                        className={`w-full btn-premium justify-center font-bold text-xs cursor-pointer py-3 ${
                          plan.type === "sme"
                            ? "bg-green-700 text-white hover:bg-green-600"
                            : "bg-[#0D1A14] text-white hover:bg-navy-mid"
                        }`}
                      >
                        Select Plan
                        <span className="btn-icon-wrap !bg-white/10"><ArrowRight size={12} /></span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-6 w-full items-stretch">
                  {dbPackages.map((pkg: any) => {
                    const featuresList = [
                      `${pkg.membership_type === "individual" ? "Small (Individual)" : pkg.membership_type === "sme" ? "Medium (SME)" : "Large (Corporate)"} Membership`,
                      `${pkg.included_passes} passes included (${(pkg.benefit_type || "").replace(/_/g, " ")})`
                    ];
                    return (
                      <div
                        key={pkg.id}
                        className="relative rounded-[2rem] p-8 flex flex-col bg-white border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.015)] transition-all duration-300 hover:shadow-[0_20px_40px_rgb(0,0,0,0.04)] hover:-translate-y-1 group"
                      >
                        <div className="absolute top-0 right-0 bg-green-700 text-white text-[8px] font-heading font-bold uppercase tracking-widest px-3 py-1 rounded-bl-2xl">
                          Special Offer
                        </div>
                        <div className="text-[10px] font-heading font-bold uppercase tracking-[0.2em] mb-3 text-gray-400 pr-12">
                          {pkg.name}
                        </div>
                        <div className="flex items-end gap-1.5 mb-3">
                          <span className="text-[2.25rem] font-heading font-black leading-none text-[#0D1A14]">
                            PHP {Number(pkg.price).toLocaleString()}
                          </span>
                          <span className="text-sm mb-1 text-gray-400">/yr</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6 min-h-[2.5rem]">
                          {pkg.description}
                        </p>

                        <ul className="space-y-2.5 flex-1 mb-6">
                          {featuresList.map((f: string) => (
                            <li key={f} className="flex items-start gap-2.5 text-sm">
                              <CheckCircle2 size={14} className="mt-0.5 flex-shrink-0 text-green-600" />
                              <span className="text-gray-600">{f}</span>
                            </li>
                          ))}
                        </ul>

                        {pkg.terms_and_conditions && (
                          <div className="text-[10px] text-gray-400 leading-normal italic border-t border-gray-100 pt-3.5 mb-6">
                            <span className="font-bold uppercase tracking-wider text-[8px] text-gray-500 block mb-0.5">Terms</span>
                            {pkg.terms_and_conditions}
                          </div>
                        )}

                        <button
                          onClick={() => handleSelectItem(pkg, true)}
                          className="w-full btn-premium justify-center bg-[#0D1A14] text-white hover:bg-navy-mid font-bold text-xs cursor-pointer py-3"
                        >
                          Select Package
                          <span className="btn-icon-wrap !bg-white/10"><ArrowRight size={12} /></span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="w-full max-w-lg bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.03)] border border-gray-100 p-8 sm:p-10 relative z-10"
            >
              {selectedItem && (
                <div className="mb-8 p-5 bg-green-50/50 border border-green-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-green-800 block mb-0.5">
                      Selected Tier
                    </span>
                    <span className="font-heading font-extrabold text-sm text-[#0D1A14]">
                      {selectedItem.name}
                    </span>
                    <span className="text-xs text-gray-500 block mt-0.5">
                      {selectedItem.price} {selectedItem.isPackage ? "" : "/yr"}
                    </span>
                  </div>
                  <button
                    onClick={handleChangeSelection}
                    className="flex items-center gap-1 text-xs font-semibold text-green-700 hover:text-green-800 cursor-pointer"
                  >
                    <ArrowLeft size={12} />
                    Change
                  </button>
                </div>
              )}

              {success ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-50 border border-green-200 text-green-700 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 size={32} />
                  </div>
                  <h2 className="text-xl font-heading font-black text-gray-900 mb-3">Registration Successful!</h2>
                  <p className="text-sm text-gray-500 mb-6">
                    Your account has been created. Redirecting you to login...
                  </p>
                  <Link to="/login" className="text-green-700 font-semibold hover:underline">
                    Go to Login directly
                  </Link>
                </div>
              ) : (
                <form onSubmit={handleSignUp} className="space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[13px] font-heading font-semibold text-gray-700 mb-1.5 ml-1">First Name *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Juan"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[13px] font-heading font-semibold text-gray-700 mb-1.5 ml-1">Last Name *</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder="Dela Cruz"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-heading font-semibold text-gray-700 mb-1.5 ml-1">Email Address *</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type="email"
                        placeholder="you@company.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-heading font-semibold text-gray-700 mb-1.5 ml-1">Password *</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a strong password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-11 pr-11 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all"
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full btn-premium bg-green-700 hover:bg-green-600 text-white justify-center shadow-diffuse mt-4 disabled:opacity-75 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={16} className="animate-spin" /> Submitting...
                      </span>
                    ) : (
                      <>
                        Submit Application
                        <span className="btn-icon-wrap !bg-white/15"><ArrowRight size={14} /></span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <p className="mt-8 text-center text-sm text-gray-500">
                Already a member? <Link to="/login" className="text-green-700 font-semibold hover:underline">Sign in</Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Register;
