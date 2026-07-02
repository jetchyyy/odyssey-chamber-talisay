import React from "react";
import { motion } from "framer-motion";
import { Building2, Phone, Map, Loader2, ArrowRight, CreditCard, Camera, Upload, QrCode, Tag } from "lucide-react";
import type { PricingPlan, PaymentQR } from "./types";
import { BUSINESS_CATEGORIES } from "./types";
import QRDisplay from "./QRDisplay";

interface ApplicationTabProps {
  plans: PricingPlan[];
  selectedPlan: PricingPlan | null;
  onSelectPlan: (plan: PricingPlan) => void;
  paymentMethods: PaymentQR[];
  selectedPayment: PaymentQR | null;
  onSelectPayment: (pay: PaymentQR) => void;
  formError: string | null;
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  // Application form fields
  companyName: string; setCompanyName: (v: string) => void;
  businessCategory: string; setBusinessCategory: (v: string) => void;
  otherCategoryText: string; setOtherCategoryText: (v: string) => void;
  businessAddress: string; setBusinessAddress: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  paymentReference: string; setPaymentReference: (v: string) => void;
  appPaymentProofFile: File | null;
  setAppPaymentProofFile: (f: File | null) => void;
  appPaymentProofPreview: string;
  setAppPaymentProofPreview: (v: string) => void;
  // Promo props
  promoCode: string; setPromoCode: (v: string) => void;
  appliedPromo: any; setAppliedPromo: (p: any) => void;
  onApplyPromo: () => Promise<void>;
  promoLoading: boolean;
  promoError: string | null;
  discountAmount: number;
  finalPrice: number;
}

const packagePlans = [
  {
    id: "package_a",
    type: "package_a",
    name: "Package A: Small Enterprise",
    price: 2900,
    period: "yr",
    description: "Combines Small annual membership (discounted to ₱1,700) with 4 Coffee Connections session passes (₱1,200). Total value: ₱4,000.",
    benefits: [
      "Small / Individual Annual Membership (₱1,700)",
      "4 Coffee Connections passes (₱300 per session = ₱1,200)",
      "Total savings of ₱1,100"
    ]
  },
  {
    id: "package_b",
    type: "package_b",
    name: "Package B: Medium Enterprise",
    price: 3800,
    period: "yr",
    description: "Combines Medium annual membership (discounted to ₱2,600) with 4 Coffee Connections session passes (₱1,200). Total value: ₱5,000.",
    benefits: [
      "Medium / SME Annual Membership (₱2,600)",
      "4 Coffee Connections passes (₱300 per session = ₱1,200)",
      "Total savings of ₱1,200"
    ]
  },
  {
    id: "package_c",
    type: "package_c",
    name: "Package C: Large Enterprise",
    price: 4700,
    period: "yr",
    description: "Combines Large annual membership (discounted to ₱3,500) with 4 Coffee Connections session passes (₱1,200). Total value: ₱6,000.",
    benefits: [
      "Large / Corporate Annual Membership (₱3,500)",
      "4 Coffee Connections passes (₱300 per session = ₱1,200)",
      "Total savings of ₱1,300"
    ]
  }
];

const ApplicationTab: React.FC<ApplicationTabProps> = ({
  plans, selectedPlan, onSelectPlan,
  paymentMethods, selectedPayment, onSelectPayment,
  formError, actionLoading, onSubmit,
  companyName, setCompanyName,
  businessCategory, setBusinessCategory,
  otherCategoryText, setOtherCategoryText,
  businessAddress, setBusinessAddress,
  phone, setPhone,
  paymentReference, setPaymentReference,
  appPaymentProofFile, setAppPaymentProofFile,
  appPaymentProofPreview, setAppPaymentProofPreview,
  promoCode, setPromoCode,
  appliedPromo, setAppliedPromo,
  onApplyPromo, promoLoading, promoError,
  discountAmount, finalPrice,
}) => {
  const inputCls = "w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all";

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Left: Step 1 + Step 2 */}
      <div className="lg:col-span-2 space-y-6">
        {/* Step 1 — Plan selector */}
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-8">
          <div>
            <span className="label-pill mb-3 inline-flex">Step 1</span>
            <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Select a Membership Plan</h2>
            <p className="text-sm text-gray-500 mb-6">Choose the plan that suits your business profile. Regular annual plans are listed first.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    onSelectPlan(plan);
                    setAppliedPromo(null);
                    setPromoCode("");
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col ${
                    selectedPlan?.id === plan.id
                      ? "border-green-700 bg-green-50/20"
                      : "border-gray-100 hover:border-green-200 bg-white"
                  }`}
                >
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-gray-400 mb-1">{plan.name}</span>
                  <span className="text-xl font-heading font-black text-gray-900 mb-2">PHP {plan.price.toLocaleString()}</span>
                  <p className="text-[11px] text-gray-400 line-clamp-3 mb-4 leading-normal flex-1">{plan.description}</p>
                  <div className="text-[11px] font-semibold text-green-700 flex items-center gap-1 mt-auto">
                    Select Plan <ArrowRight size={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <h3 className="text-base font-heading font-black text-[#0D1A14] mb-2">Special Membership Package Deals</h3>
            <p className="text-xs text-gray-500 mb-6">These packages bundle the membership fee with Coffee Connections session passes at a discounted rate.</p>

            <div className="grid sm:grid-cols-3 gap-4">
              {packagePlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    onSelectPlan(plan as any);
                    setAppliedPromo(null);
                    setPromoCode("");
                  }}
                  className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col relative overflow-hidden ${
                    selectedPlan?.id === plan.id
                      ? "border-green-700 bg-green-50/20"
                      : "border-gray-100 hover:border-green-200 bg-white"
                  }`}
                >
                  <div className="absolute top-0 right-0 bg-green-700 text-white text-[8px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-bl">
                    Package Deal
                  </div>
                  <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-gray-400 mb-1">Package</span>
                  <h4 className="font-heading font-black text-[12px] text-gray-900 leading-tight mb-1 pr-12">{plan.name}</h4>
                  <span className="text-lg font-heading font-black text-green-700 mb-2">PHP {plan.price.toLocaleString()}</span>
                  <p className="text-[11px] text-gray-400 mb-4 leading-relaxed flex-1">{plan.description}</p>
                  <div className="text-[11px] font-semibold text-green-700 flex items-center gap-1 mt-auto">
                    Select Package <ArrowRight size={10} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 2 — Payment details (conditional on plan selection) */}
        {selectedPlan && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
          >
            <span className="label-pill mb-3 inline-flex">Step 2</span>
            <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Payment Details</h2>
            
            {finalPrice > 0 ? (
              <>
                <p className="text-sm text-gray-500 mb-6">
                  Send your membership fee of{" "}
                  <span className="font-bold text-green-700">PHP {finalPrice.toLocaleString()}</span>{" "}
                  {discountAmount > 0 && <span className="text-xs text-gray-450 line-through">(originally PHP {selectedPlan.price.toLocaleString()})</span>}{" "}
                  via GCash or Bank Transfer using the credentials below.
                </p>

                {/* Payment method toggle */}
                <div className="flex gap-2.5 mb-6">
                  {paymentMethods.map((pay) => (
                    <button
                      key={pay.id}
                      onClick={() => onSelectPayment(pay)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                        selectedPayment?.id === pay.id
                          ? "bg-[#0D1A14] text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {pay.name}
                    </button>
                  ))}
                </div>

                {selectedPayment && (
                  <div className="p-5 rounded-2xl bg-gray-50/70 border border-gray-100 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Large QR panel */}
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <QRDisplay qr={selectedPayment} lightboxId="app-qr-lightbox" />
                        <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                          <QrCode size={12} /> Scan with GCash/Bank App
                        </span>
                      </div>
                      {/* Instructions */}
                      <div className="flex flex-col justify-center flex-1">
                        <h4 className="font-heading font-bold text-gray-900 mb-2 text-sm">{selectedPayment.name}</h4>
                        <p className="text-xs text-gray-500 leading-relaxed mb-3">{selectedPayment.description}</p>
                        <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-700 font-mono whitespace-pre-line leading-relaxed">
                          {selectedPayment.payment_instructions}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-800 font-bold flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                  <Tag size={16} />
                </div>
                <div>
                  <h4 className="font-black">Free Membership Registration Applied</h4>
                  <p className="font-normal text-[11px] text-green-700 mt-0.5">Your applied promotional code has reduced the membership registration fee to PHP 0. GCash scan proof is bypassed. Simply submit the form on the right.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Right: Application form */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] sticky top-32">
          <h3 className="text-lg font-heading font-black text-gray-900 mb-6">Application Form</h3>

          {formError && (
            <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {formError}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Company Name */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Company / Business Name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" placeholder="e.g. Talisay Agri-Farm" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Category</label>
              <select
                value={businessCategory}
                onChange={(e) => {
                  setBusinessCategory(e.target.value);
                  if (e.target.value !== "Other") setOtherCategoryText("");
                }}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
              >
                <option value="">Select Category</option>
                {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                <option value="Other">Other</option>
              </select>
            </div>

            {businessCategory === "Other" && (
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Specify Sector / Category</label>
                <input type="text" required placeholder="e.g. Handicrafts, Aquaculture, etc." value={otherCategoryText} onChange={(e) => setOtherCategoryText(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all" />
              </div>
            )}

            {/* Phone */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="tel" placeholder="0917XXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Business Address */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Address</label>
              <div className="relative">
                <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" placeholder="Street, Barangay, Talisay City" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Promo Code Input (Conditional on Selected Plan) */}
            {selectedPlan && (
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
                      onClick={onApplyPromo}
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
            {selectedPlan && discountAmount > 0 && (
              <div className="p-3 rounded-2xl bg-green-50/50 border border-green-200 text-[11px] space-y-1 font-semibold text-green-800">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan Price:</span>
                  <span>PHP {selectedPlan.price.toLocaleString()}</span>
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

            {/* Payment Reference */}
            {finalPrice > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Payment Reference Number *</label>
                <div className="relative">
                  <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="text" required placeholder="GCash Ref / Bank Transaction ID" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            {/* Proof of Payment */}
            {finalPrice > 0 && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Proof of Payment Image *</label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {appPaymentProofPreview ? (
                      <img src={appPaymentProofPreview} alt="Payment proof preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera size={18} className="text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <label
                      htmlFor="app-proof-upload"
                      className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 hover:border-green-500 rounded-xl text-[11px] font-bold text-gray-600 transition-colors w-full"
                    >
                      <Upload size={12} />
                      {appPaymentProofFile ? appPaymentProofFile.name : "Select Receipt Image"}
                    </label>
                    <input
                      id="app-proof-upload"
                      type="file" accept="image/*" required
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAppPaymentProofFile(file);
                          setAppPaymentProofPreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={actionLoading || !selectedPlan}
              className="w-full btn-premium bg-green-700 hover:bg-green-600 text-white justify-center shadow-diffuse mt-4 disabled:opacity-50 disabled:cursor-not-allowed text-xs !py-3"
            >
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" /> Submitting...
                </span>
              ) : (
                <>
                  Submit Application
                  <span className="btn-icon-wrap !bg-white/15"><ArrowRight size={12} /></span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ApplicationTab;
