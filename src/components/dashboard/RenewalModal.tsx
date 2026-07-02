import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2, Camera, Upload, Tag } from "lucide-react";
import type { PricingPlan, PaymentQR } from "./types";
import QRDisplay from "./QRDisplay";

interface RenewalModalProps {
  open: boolean;
  onClose: () => void;
  plans: PricingPlan[];
  renewalPlan: PricingPlan | null;
  setRenewalPlan: (plan: PricingPlan | null) => void;
  paymentMethods: PaymentQR[];
  renewalSelectedPayment: PaymentQR | null;
  setRenewalSelectedPayment: (qr: PaymentQR) => void;
  setRenewalPaymentMethod: (m: string) => void;
  renewalPaymentRef: string;
  setRenewalPaymentRef: (v: string) => void;
  renewalPaymentProofFile: File | null;
  setRenewalPaymentProofFile: (f: File | null) => void;
  renewalPaymentProofPreview: string;
  setRenewalPaymentProofPreview: (v: string) => void;
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  // Promo props
  promoCode: string; setPromoCode: (v: string) => void;
  appliedPromo: any; setAppliedPromo: (p: any) => void;
  onApplyPromo: () => Promise<void>;
  promoLoading: boolean;
  promoError: string | null;
  discountAmount: number;
  finalPrice: number;
}

const RenewalModal: React.FC<RenewalModalProps> = ({
  open, onClose,
  plans, renewalPlan, setRenewalPlan,
  paymentMethods, renewalSelectedPayment, setRenewalSelectedPayment, setRenewalPaymentMethod,
  renewalPaymentRef, setRenewalPaymentRef,
  renewalPaymentProofFile, setRenewalPaymentProofFile,
  renewalPaymentProofPreview, setRenewalPaymentProofPreview,
  actionLoading, onSubmit,
  promoCode, setPromoCode,
  appliedPromo, setAppliedPromo,
  onApplyPromo, promoLoading, promoError,
  discountAmount, finalPrice,
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.96, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.96, opacity: 0 }}
          className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
          >
            <X size={20} />
          </button>

          <h3 className="text-xl font-heading font-black text-gray-900 mb-2">Renew Chamber Membership</h3>
          <p className="text-xs text-gray-500 mb-6">
            Submit your renewal payment details below. Once verified by the Chamber Admin, your expiration date will be extended by 1 year.
          </p>

          <form onSubmit={onSubmit} className="space-y-4 text-xs font-semibold text-gray-700">
            {/* Renewal tier selector */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Select Renewal Tier *</label>
              <select
                value={renewalPlan?.type || ""}
                onChange={(e) => {
                  const plan = plans.find((p) => p.type === e.target.value) || null;
                  setRenewalPlan(plan);
                  setAppliedPromo(null);
                  setPromoCode("");
                }}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.type}>
                    {p.name} Tier — PHP {Number(p.price).toLocaleString()} / {p.period}
                  </option>
                ))}
              </select>
            </div>

            {/* Plan description */}
            {renewalPlan && (
              <div className="p-3.5 rounded-2xl bg-green-50/50 border border-green-100 text-green-800 text-[11px] font-normal leading-relaxed">
                <span className="font-heading font-black block mb-0.5">{renewalPlan.name} Plan Description:</span>
                {renewalPlan.description}
              </div>
            )}

            {/* Promo Code Input (Conditional on Selected Plan) */}
            {renewalPlan && (
              <div className="pt-2 border-t border-gray-100">
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Promotional Discount Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Promo Code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    disabled={!!appliedPromo || promoLoading}
                    className="flex-1 px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none uppercase font-mono tracking-wider focus:bg-white focus:border-green-500 transition-all disabled:opacity-60"
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
            {renewalPlan && discountAmount > 0 && (
              <div className="p-3 rounded-2xl bg-green-50/50 border border-green-200 text-[11px] space-y-1 font-semibold text-green-800">
                <div className="flex justify-between">
                  <span className="text-gray-500">Renewal Fee:</span>
                  <span>PHP {Number(renewalPlan.price).toLocaleString()}</span>
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

            {finalPrice > 0 ? (
              <>
                {/* Payment method buttons */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1.5">Payment Method *</label>
                  <div className="grid grid-cols-2 gap-3">
                    {paymentMethods.map((pay) => (
                      <button
                        key={pay.id}
                        type="button"
                        onClick={() => {
                          setRenewalSelectedPayment(pay);
                          setRenewalPaymentMethod(pay.name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
                        }}
                        className={`p-3 rounded-2xl border text-center font-bold transition-all cursor-pointer ${
                          renewalSelectedPayment?.id === pay.id
                            ? "bg-green-50 border-green-500 text-green-700 ring-2 ring-green-500/10"
                            : "border-gray-200 hover:bg-gray-50 text-gray-600"
                        }`}
                      >
                        {pay.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR code display + instructions */}
                {renewalSelectedPayment && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-4">
                    <QRDisplay qr={renewalSelectedPayment} lightboxId="renewal-qr-lightbox" />
                    <div>
                      <div className="font-heading font-bold text-gray-900 text-[11px]">Payment Instructions:</div>
                      <p className="text-[10px] text-gray-500 mt-1 leading-normal font-normal">
                        {renewalSelectedPayment.payment_instructions}
                      </p>
                    </div>
                  </div>
                )}

                {/* Reference number */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Transaction Reference Number *</label>
                  <input
                    type="text" required
                    placeholder="Enter GCash Ref / Bank Transaction ID"
                    value={renewalPaymentRef}
                    onChange={(e) => setRenewalPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                  />
                </div>

                {/* Proof of payment */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Proof of Payment Image *</label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {renewalPaymentProofPreview ? (
                        <img src={renewalPaymentProofPreview} alt="Renewal proof preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera size={18} className="text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="renewal-proof-upload"
                        className="cursor-pointer flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 border border-gray-200 hover:border-green-500 rounded-xl text-[11px] font-bold text-gray-600 transition-colors w-full"
                      >
                        <Upload size={12} />
                        {renewalPaymentProofFile ? renewalPaymentProofFile.name : "Select Receipt Image"}
                      </label>
                      <input
                        id="renewal-proof-upload"
                        type="file" accept="image/*" required
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setRenewalPaymentProofFile(file);
                            setRenewalPaymentProofPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5 rounded-2xl bg-green-50 border border-green-200 text-xs text-green-800 font-bold flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                  <Tag size={16} />
                </div>
                <div>
                  <h4 className="font-black">Free Membership Renewal Applied</h4>
                  <p className="font-normal text-[11px] text-green-700 mt-0.5">Your applied promotional code has reduced the renewal fee to PHP 0. GCash scan proof is bypassed. Simply submit the renewal form below.</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-4 border-t border-gray-100 mt-6">
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
              >
                {actionLoading ? (
                  <><Loader2 className="animate-spin" size={14} /> Submitting...</>
                ) : (
                  "Submit Renewal Reference"
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 border border-gray-200 hover:bg-gray-50 rounded-xl text-gray-500 cursor-pointer text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

export default RenewalModal;
