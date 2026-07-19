import React, { useState } from "react";
import { supabase } from "../../lib/supabase";
import { uploadImage } from "../../lib/storage";
import { useNotification } from "../../context/NotificationContext";
import {
  Ticket, CheckCircle2, Loader2, Eye, Receipt, ArrowUpRight, ShieldAlert, Sparkles, Send, Download
} from "lucide-react";

interface PackageRow {
  id: string;
  name: string;
  description: string;
  price: number;
  included_passes: number;
  benefit_type: string;
  terms_and_conditions: string;
}

interface PaymentQR {
  id: string;
  name: string;
  account_number: string;
  qr_code_url: string;
}

interface PackagesPurchaseTabProps {
  packages: PackageRow[];
  paymentMethods: PaymentQR[];
  user: any;
  profile: any;
}

export const PackagesPurchaseTab: React.FC<PackagesPurchaseTabProps> = ({
  packages,
  paymentMethods,
  user,
  profile,
}) => {
  const { toast } = useNotification();
  const [selectedPkg, setSelectedPkg] = useState<PackageRow | null>(null);
  const [paymentMethodName, setPaymentMethodName] = useState("gcash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedPaymentQR = paymentMethods.find((m) =>
    paymentMethodName === "gcash" ? m.name.toLowerCase().includes("gcash") : !m.name.toLowerCase().includes("gcash")
  ) || paymentMethods[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPaymentProofFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPaymentProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownloadImage = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      window.open(url, "_blank");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPkg) return;
    if (!paymentReference.trim()) return setError("Please enter your transaction reference number.");
    if (!paymentProofFile) return setError("Please upload your payment receipt image.");

    setLoading(true);
    setError(null);

    try {
      // 1. Upload payment proof receipt image
      const proofUrl = await uploadImage(paymentProofFile, "payment-proofs");

      // 2. Submit purchase request
      const { error: insertError } = await supabase.from("package_purchases").insert({
        user_id: user.id,
        package_id: selectedPkg.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: profile.phone || null,
        payment_method: paymentMethodName,
        payment_reference: paymentReference.trim().toUpperCase(),
        payment_proof_url: proofUrl,
        status: "pending",
        payment_status: "pending",
      });

      if (insertError) throw insertError;
      setSuccess(true);
      toast.success("Purchase request submitted successfully!");
      setPaymentReference("");
      setPaymentProofFile(null);
      setPaymentProofPreview("");
    } catch (err: any) {
      setError(err.message || "Failed to submit purchase request.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSelection = () => {
    setSelectedPkg(null);
    setSuccess(false);
    setError(null);
  };

  const memberPassPkgs = packages;

  return (
    <div className="space-y-6 font-sans">
      <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-700">
            <Ticket size={20} />
          </div>
          <div>
            <h3 className="font-heading font-black text-gray-900 text-sm">Purchase Event Passes</h3>
            <p className="text-[10px] text-gray-400">Buy additional multi-event passes at discounted member rates.</p>
          </div>
        </div>

        {success ? (
          <div className="text-center py-10 space-y-4 max-w-md mx-auto">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 size={28} />
            </div>
            <h4 className="font-heading font-black text-sm text-[#0D1A14]">Purchase Request Submitted!</h4>
            <p className="text-xs text-gray-500 leading-relaxed">
              We are currently reviewing your payment reference: <strong className="font-mono text-[11px] text-slate-800">{paymentReference}</strong>. Once approved, <strong>{selectedPkg?.included_passes} passes</strong> will automatically be credited to your digital member card.
            </p>
            <button
              onClick={handleCancelSelection}
              className="px-6 py-2 bg-[#0D1A14] text-white hover:bg-[#15251F] font-semibold rounded-xl text-xs cursor-pointer shadow"
            >
              Buy Another Package
            </button>
          </div>
        ) : selectedPkg ? (
          /* Checkout Form */
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Reviewing Selection</span>
                <h4 className="font-bold text-[#0D1A14] text-sm mt-0.5">{selectedPkg.name}</h4>
              </div>
              <button
                type="button"
                onClick={handleCancelSelection}
                className="text-xs text-gray-500 hover:text-red-700 font-semibold cursor-pointer"
              >
                Change Package
              </button>
            </div>

            {/* QR Scanner / Payment Details */}
            <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h5 className="font-bold text-[11px] text-slate-800">Scan QR Code to pay PHP {Number(selectedPkg.price).toLocaleString()}</h5>
                  <p className="text-[10px] text-gray-400 mt-0.5">Please send the exact amount to verify your purchase request.</p>
                </div>
                <div className="flex bg-white border border-gray-200 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setPaymentMethodName("gcash")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      paymentMethodName === "gcash" ? "bg-green-700 text-white" : "text-gray-500"
                    }`}
                  >
                    GCash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethodName("bank_transfer")}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                      paymentMethodName === "bank_transfer" ? "bg-green-700 text-white" : "text-gray-500"
                    }`}
                  >
                    Bank
                  </button>
                </div>
              </div>

              {selectedPaymentQR ? (
                <div className="flex flex-col sm:flex-row items-center gap-5 pt-2">
                  <img
                    src={selectedPaymentQR.qr_code_url}
                    alt={selectedPaymentQR.name}
                    className="h-28 w-auto object-contain bg-white p-1 rounded-xl border border-gray-200"
                  />
                  <div className="space-y-1.5 text-slate-700 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Account Name</span>
                      <strong className="text-slate-800 font-bold">{selectedPaymentQR.name}</strong>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[9px] font-bold uppercase tracking-wider">Account Number</span>
                      <strong className="text-slate-800 font-bold font-mono">{selectedPaymentQR.account_number}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadImage(selectedPaymentQR.qr_code_url, `${selectedPaymentQR.name}_QR.png`)}
                      className="px-2.5 py-1 bg-white hover:bg-gray-100 text-[#0D1A14] border border-gray-200 rounded-lg text-[9px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-sm mt-2 w-max"
                    >
                      <Download size={10} /> Download QR
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-gray-400 italic">No QR code setup. Pay standard rates.</div>
              )}
            </div>

            {/* Reference & Upload receipt */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Transaction Reference</label>
                <input
                  type="text"
                  required
                  value={paymentReference}
                  onChange={(e) => setPaymentReference(e.target.value)}
                  placeholder="GCash Reference Code"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl outline-none focus:border-green-600 text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Upload Receipt Proof</label>
                <input
                  type="file"
                  accept="image/*"
                  required
                  onChange={handleFileChange}
                  className="w-full text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-[10px] file:font-semibold file:cursor-pointer"
                />
                {paymentProofPreview && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={paymentProofPreview} alt="Receipt preview" className="h-10 w-auto object-contain rounded border border-gray-200 p-0.5 bg-gray-50" />
                    <span className="text-[9px] text-gray-400">File selected successfully</span>
                  </div>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-semibold text-xs">
                {error}
              </div>
            )}

            <div className="flex gap-2 justify-end border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={handleCancelSelection}
                className="px-5 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <Send size={12} />}
                Submit Request
              </button>
            </div>
          </form>
        ) : (
          /* Package Selector Grid */
          <div className="grid md:grid-cols-2 gap-4">
            {memberPassPkgs.length === 0 ? (
              <div className="col-span-2 py-8 text-center text-gray-400 italic text-xs">
                No event pass packages available for purchase at the moment.
              </div>
            ) : (
              memberPassPkgs.map((pkg) => (
                <div
                  key={pkg.id}
                  className="border border-gray-100 rounded-2xl p-5 hover:border-green-600/40 hover:bg-green-50/[0.01] flex flex-col justify-between transition-all"
                >
                  <div>
                    <span className="px-1.5 py-0.5 bg-green-50 border border-green-200 text-green-700 font-bold text-[9px] rounded uppercase tracking-wider">Member Rate</span>
                    <h4 className="font-heading font-black text-gray-900 text-xs mt-2">{pkg.name}</h4>
                    <p className="text-[10px] text-gray-400 mt-1 leading-normal">{pkg.description}</p>
                    
                    <div className="mt-4 flex items-end gap-1">
                      <span className="font-heading font-black text-lg text-slate-800">PHP {Number(pkg.price).toLocaleString()}</span>
                      <span className="text-[10px] text-gray-400 mb-0.5">/ {pkg.included_passes} Passes</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedPkg(pkg)}
                    className="w-full mt-4 py-2 bg-[#0D1A14] hover:bg-green-800 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors shadow-sm"
                  >
                    Select Package <ArrowUpRight size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
