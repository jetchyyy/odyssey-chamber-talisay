import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import {
  Check, X, Loader2, Receipt, CheckCircle2, Ticket, Eye, Copy, ExternalLink, CalendarDays, User
} from "lucide-react";

interface PurchaseRow {
  id: string;
  user_id: string | null;
  package_id: string;
  full_name: string;
  email: string;
  phone: string | null;
  payment_method: string;
  payment_reference: string;
  payment_proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  payment_status: string;
  generated_promo_code_id: string | null;
  created_at: string;
  membership_packages?: {
    name: string;
    price: number;
    included_passes: number;
    package_type: "membership_bundle" | "member_passes" | "non_member_passes";
  } | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  promo_codes?: {
    code: string;
  } | null;
}

export const PackagePurchasesTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedProofUrl, setSelectedProofUrl] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "member_passes" | "non_member_passes">("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("package_purchases")
        .select(`
          id, user_id, package_id, full_name, email, phone,
          payment_method, payment_reference, payment_proof_url,
          status, payment_status, generated_promo_code_id, created_at,
          membership_packages ( name, price, included_passes, package_type ),
          profiles ( full_name, email ),
          promo_codes:generated_promo_code_id ( code )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        setPurchases(data as any);
      }
    } catch (err: any) {
      toast.error("Failed to load package purchases: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    const yes = window.confirm("Approve Purchase\n\nAre you sure you want to approve this package purchase? This will activate the passes.");
    if (!yes) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("package_purchases")
        .update({ status: "approved" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Purchase approved successfully!");
      await loadData();
    } catch (err: any) {
      toast.error("Approval failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const yes = window.confirm("Reject Purchase\n\nAre you sure you want to reject this package purchase request?");
    if (!yes) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("package_purchases")
        .update({ status: "rejected", payment_status: "refunded" })
        .eq("id", id);

      if (error) throw error;
      toast.success("Purchase rejected.");
      await loadData();
    } catch (err: any) {
      toast.error("Rejection failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied code "${text}" to clipboard!`);
  };

  // Filter purchases
  const filteredPurchases = purchases.filter((p) => {
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    const matchesType = typeFilter === "all" || p.membership_packages?.package_type === typeFilter;
    return matchesStatus && matchesType;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Filters & Control Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0A1410] border border-white/5 p-5 rounded-2xl">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[9px] text-[#8A9690] font-bold uppercase tracking-wider mb-1">Status Filter</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[#101D17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500 outline-none cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div>
            <label className="block text-[9px] text-[#8A9690] font-bold uppercase tracking-wider mb-1">Package Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[#101D17] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-green-500 outline-none cursor-pointer"
            >
              <option value="all">All Packages</option>
              <option value="member_passes">Existing Members</option>
              <option value="non_member_passes">Guests (Non-Members)</option>
            </select>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-[#8A9690]">
            Showing <strong className="text-white">{filteredPurchases.length}</strong> purchases
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-green-700" size={32} />
        </div>
      ) : filteredPurchases.length === 0 ? (
        <div className="bg-[#0A1410] border border-white/5 rounded-2xl p-12 text-center text-[#8A9690]">
          <Ticket size={36} className="mx-auto text-green-700/50 mb-3" />
          <h3 className="font-heading font-bold text-white mb-1">No Purchases Found</h3>
          <p className="text-xs">There are no package purchases matching your active filters.</p>
        </div>
      ) : (
        <div className="bg-[#0A1410] border border-white/5 rounded-2xl overflow-hidden shadow-diffuse">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-[#8A9690] font-bold">
                  <th className="p-4">Purchaser Details</th>
                  <th className="p-4">Package</th>
                  <th className="p-4">Payment Method & Ref</th>
                  <th className="p-4 text-center">Receipt</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Redemption Code</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredPurchases.map((purchase) => {
                  const isGuest = !purchase.user_id;
                  const price = purchase.membership_packages?.price || 0;
                  const promoCodeText = purchase.promo_codes?.code;

                  return (
                    <tr key={purchase.id} className="hover:bg-white/[0.01] transition-colors">
                      {/* User Info */}
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-1.5">
                          {isGuest ? (
                            <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded text-[9px] uppercase tracking-wider font-semibold">Guest</span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-green-500/10 border border-green-500/20 text-green-400 rounded text-[9px] uppercase tracking-wider font-semibold">Member</span>
                          )}
                          {purchase.full_name}
                        </div>
                        <div className="text-gray-400 mt-0.5">{purchase.email}</div>
                        {purchase.phone && <div className="text-gray-500 mt-0.5 text-[10px]">{purchase.phone}</div>}
                      </td>

                      {/* Package details */}
                      <td className="p-4">
                        <div className="font-semibold text-white">{purchase.membership_packages?.name || "Unknown Package"}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          PHP {Number(price).toLocaleString()} | {purchase.membership_packages?.included_passes} Passes
                        </div>
                      </td>

                      {/* Payment Ref */}
                      <td className="p-4">
                        <div className="font-medium text-white uppercase">{purchase.payment_method.replace("_", " ")}</div>
                        <div className="text-gray-500 font-mono text-[10px] mt-0.5 select-all">{purchase.payment_reference}</div>
                      </td>

                      {/* Receipt preview */}
                      <td className="p-4 text-center">
                        {purchase.payment_proof_url ? (
                          <button
                            onClick={() => setSelectedProofUrl(purchase.payment_proof_url!)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-green-700/10 border border-green-500/20 text-green-400 hover:bg-green-700 hover:text-white transition-all cursor-pointer font-semibold text-[10px]"
                          >
                            <Eye size={11} /> View Receipt
                          </button>
                        ) : (
                          <span className="text-gray-600 text-[10px] italic">No receipt</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          purchase.status === "approved"
                            ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400"
                            : purchase.status === "rejected"
                            ? "bg-red-500/15 border border-red-500/30 text-red-400"
                            : "bg-amber-500/15 border border-amber-500/30 text-amber-400 animate-pulse"
                        }`}>
                          {purchase.status}
                        </span>
                        <div className="text-[9px] text-gray-500 mt-1 capitalize">Payment: {purchase.payment_status}</div>
                      </td>

                      {/* Redemption code */}
                      <td className="p-4">
                        {purchase.status === "approved" ? (
                          isGuest ? (
                            promoCodeText ? (
                              <button
                                onClick={() => copyToClipboard(promoCodeText)}
                                className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[#101D17] border border-green-500/30 text-green-400 font-mono font-bold hover:bg-green-500 hover:text-black transition-colors cursor-pointer select-all"
                                title="Click to copy promo code"
                              >
                                {promoCodeText} <Copy size={11} />
                              </button>
                            ) : (
                              <span className="text-red-400 italic">Code Generation Error</span>
                            )
                          ) : (
                            <span className="text-green-500/80 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Credits Loaded
                            </span>
                          )
                        ) : (
                          <span className="text-gray-600 italic">Pending approval</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        {purchase.status === "pending" && (
                          <div className="flex justify-end gap-1.5">
                            <button
                              disabled={actionLoading}
                              onClick={() => handleApprove(purchase.id)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                              title="Approve & Issue Passes"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              disabled={actionLoading}
                              onClick={() => handleReject(purchase.id)}
                              className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50"
                              title="Reject Request"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Proof of Payment Zoom Modal */}
      <AnimatePresence>
        {selectedProofUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedProofUrl(null)}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-zoom-out"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-xl w-full bg-[#0A1410] border border-white/10 rounded-2xl overflow-hidden shadow-2xl p-4"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-3">
                <span className="text-xs font-bold text-white flex items-center gap-1.5"><Receipt size={13} /> Proof of Payment</span>
                <button
                  onClick={() => setSelectedProofUrl(null)}
                  className="p-1 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={15} />
                </button>
              </div>
              <img
                src={selectedProofUrl}
                alt="Proof of Payment receipt"
                className="w-full max-h-[70vh] object-contain rounded-lg bg-white/5"
              />
              <div className="text-center mt-3">
                <a
                  href={selectedProofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] text-green-400 hover:underline"
                >
                  Open in New Tab <ExternalLink size={10} />
                </a>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
