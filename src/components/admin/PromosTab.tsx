import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import { 
  Edit2, Trash2, Plus, X, Loader2, Search, Tag, 
  Calendar, Percent, Check, AlertTriangle 
} from "lucide-react";

interface PromoCodeRow {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  applicable_to: "membership" | "event" | "all";
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const PromosTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [promos, setPromos] = useState<PromoCodeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search and Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all"); // 'all', 'percentage', 'fixed'
  const [applicableFilter, setApplicableFilter] = useState("all"); // 'all', 'membership', 'event', 'all_target'
  const [statusFilter, setStatusFilter] = useState("all"); // 'all', 'active', 'expired', 'depleted', 'inactive'

  // Modal / Editor states
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<PromoCodeRow | null>(null);

  // Form Fields
  const [promoCode, setPromoCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState<number | "">("");
  const [applicableTo, setApplicableTo] = useState<"membership" | "event" | "all">("all");
  const [maxUses, setMaxUses] = useState<number | "">("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isActive, setIsActive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setPromos(data);
    } catch (err: any) {
      toast.error("Failed to load promo codes: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setPromoCode("");
    setDiscountType("percentage");
    setDiscountValue("");
    setApplicableTo("all");
    setMaxUses("");
    setExpiresAt("");
    setIsActive(true);
    setEditingPromo(null);
  };

  const handleEditClick = (promo: PromoCodeRow) => {
    setEditingPromo(promo);
    setPromoCode(promo.code);
    setDiscountType(promo.discount_type);
    setDiscountValue(promo.discount_value);
    setApplicableTo(promo.applicable_to);
    setMaxUses(promo.max_uses !== null ? promo.max_uses : "");
    
    if (promo.expires_at) {
      // Format timestamp to YYYY-MM-DD for standard date picker input
      const dateObj = new Date(promo.expires_at);
      const yyyy = dateObj.getFullYear();
      const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dateObj.getDate()).padStart(2, "0");
      setExpiresAt(`${yyyy}-${mm}-${dd}`);
    } else {
      setExpiresAt("");
    }
    
    setIsActive(promo.is_active);
    setShowModal(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoCode.trim() || discountValue === "") {
      toast.error("Please fill in all required fields.");
      return;
    }

    const cleanCode = promoCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      toast.error("Invalid promo code format. Use letters, numbers, hyphens or underscores.");
      return;
    }

    const numericValue = Number(discountValue);
    if (isNaN(numericValue) || numericValue <= 0) {
      toast.error("Discount value must be greater than 0.");
      return;
    }

    if (discountType === "percentage" && numericValue > 100) {
      toast.error("Percentage discount value cannot exceed 100%.");
      return;
    }

    const numericMaxUses = maxUses !== "" ? Number(maxUses) : null;
    if (numericMaxUses !== null && (isNaN(numericMaxUses) || numericMaxUses <= 0)) {
      toast.error("Max uses limit must be a positive integer.");
      return;
    }

    const promoData = {
      code: cleanCode,
      discount_type: discountType,
      discount_value: numericValue,
      applicable_to: applicableTo,
      max_uses: numericMaxUses,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      is_active: isActive,
      updated_at: new Date().toISOString()
    };

    setActionLoading(true);
    try {
      if (editingPromo) {
        const { error } = await supabase
          .from("promo_codes")
          .update(promoData)
          .eq("id", editingPromo.id);
        if (error) throw error;
        toast.success(`Promo code "${cleanCode}" updated successfully!`);
      } else {
        const { error } = await supabase
          .from("promo_codes")
          .insert({
            ...promoData,
            uses_count: 0
          });
        if (error) throw error;
        toast.success(`Promo code "${cleanCode}" created successfully!`);
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to save promo code: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePromo = async (promo: PromoCodeRow) => {
    const confirmed = await confirm({
      title: "Delete Promo Code",
      message: `Are you sure you want to delete the promo code "${promo.code}"? This will disable any current users from checking out with it.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const { error } = await supabase.from("promo_codes").delete().eq("id", promo.id);
      if (error) throw error;
      toast.success(`Promo code "${promo.code}" deleted.`);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to delete promo code: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleActive = async (promo: PromoCodeRow) => {
    try {
      const { error } = await supabase
        .from("promo_codes")
        .update({ is_active: !promo.is_active, updated_at: new Date().toISOString() })
        .eq("id", promo.id);
      if (error) throw error;
      toast.success(`Promo code "${promo.code}" ${!promo.is_active ? "activated" : "deactivated"}.`);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to toggle promo code status: " + err.message);
    }
  };

  const getPromoStatus = (promo: PromoCodeRow): "active" | "expired" | "depleted" | "inactive" => {
    if (!promo.is_active) return "inactive";
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) return "expired";
    if (promo.max_uses !== null && promo.uses_count >= promo.max_uses) return "depleted";
    return "active";
  };

  // Filters and Search
  const filteredPromos = promos.filter((p) => {
    const matchesSearch = p.code.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === "all" || p.discount_type === typeFilter;
    
    const matchesApplicable = 
      applicableFilter === "all" || 
      p.applicable_to === applicableFilter;

    const status = getPromoStatus(p);
    const matchesStatus = statusFilter === "all" || status === statusFilter;

    return matchesSearch && matchesType && matchesApplicable && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
      {/* Header and Add Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="text-base font-heading font-black text-white">Promo Codes Management</h3>
          <p className="text-xs text-gray-500 mt-1">Configure discount codes applicable to membership renewals, new applications, and event entry fees.</p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus size={14} /> Create Promo Code
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-6 bg-white/[0.01] p-4 rounded-2xl border border-white/5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
          <input
            type="text"
            placeholder="Search by code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white font-semibold"
          />
        </div>

        <div>
          <select
            value={applicableFilter}
            onChange={(e) => setApplicableFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-green-500 font-semibold cursor-pointer"
          >
            <option value="all">All Targets</option>
            <option value="membership">Membership Discounts</option>
            <option value="event">Event Registration Discounts</option>
            <option value="all">Universal Discounts (All)</option>
          </select>
        </div>

        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-green-500 font-semibold cursor-pointer"
          >
            <option value="all">All Discount Types</option>
            <option value="percentage">Percentage Discount (%)</option>
            <option value="fixed">Fixed Price Reduction (PHP)</option>
          </select>
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-green-500 font-semibold cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active & Valid</option>
            <option value="expired">Expired Codes</option>
            <option value="depleted">Usage Limit Reached (Depleted)</option>
            <option value="inactive">Inactive / Disabled</option>
          </select>
        </div>
      </div>

      {/* Promos Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
              <th className="pb-4 pl-2">Promo Code</th>
              <th className="pb-4">Discount Value</th>
              <th className="pb-4">Applicable To</th>
              <th className="pb-4">Usage Limit</th>
              <th className="pb-4">Expiration</th>
              <th className="pb-4">Status</th>
              <th className="pb-4 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold">
            {filteredPromos.map((p) => {
              const status = getPromoStatus(p);
              return (
                <tr key={p.id} className="hover:bg-white/[0.01]">
                  <td className="py-4 pl-2">
                    <span className="font-mono text-xs font-black bg-white/5 border border-white/10 px-2 py-1 rounded text-white tracking-wider">
                      {p.code}
                    </span>
                  </td>
                  <td className="py-4 text-white">
                    {p.discount_type === "percentage" ? (
                      <span className="flex items-center gap-1"><Percent size={12} className="text-green-400" /> {p.discount_value}% Off</span>
                    ) : (
                      <span>PHP {p.discount_value.toLocaleString()} Off</span>
                    )}
                  </td>
                  <td className="py-4 text-gray-300 capitalize">
                    {p.applicable_to === "all" ? "Universal (All)" : p.applicable_to}
                  </td>
                  <td className="py-4">
                    <div className="text-white">
                      {p.uses_count} / {p.max_uses !== null ? p.max_uses : "Unlimited"}
                    </div>
                    {p.max_uses !== null && (
                      <div className="w-24 bg-white/5 h-1.5 rounded-full mt-1.5 overflow-hidden">
                        <div 
                          className="bg-green-500 h-full rounded-full" 
                          style={{ width: `${Math.min(100, (p.uses_count / p.max_uses) * 100)}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-4 text-gray-300">
                    {p.expires_at ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={12} className="text-gray-500" />
                        {new Date(p.expires_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </span>
                    ) : (
                      <span className="text-gray-500 italic font-normal">Never expires</span>
                    )}
                  </td>
                  <td className="py-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      status === "active"
                        ? "bg-green-500/10 text-green-400 border-green-500/20"
                        : status === "expired"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : status === "depleted"
                        ? "bg-amber-500/10 text-amber-450 border-amber-500/20"
                        : "bg-gray-500/10 text-gray-400 border-white/10"
                    }`}>
                      {status}
                    </span>
                  </td>
                  <td className="py-4 text-right pr-2">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(p)}
                        className={`px-2 py-1 rounded text-[10px] font-bold uppercase border cursor-pointer transition-colors ${
                          p.is_active
                            ? "bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20"
                            : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                        }`}
                        title={p.is_active ? "Click to Deactivate" : "Click to Activate"}
                      >
                        {p.is_active ? "Enabled" : "Disabled"}
                      </button>
                      <button
                        onClick={() => handleEditClick(p)}
                        className="p-1.5 text-gray-500 hover:text-green-500 cursor-pointer transition-colors"
                        title="Edit Promo"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeletePromo(p)}
                        disabled={actionLoading}
                        className="p-1.5 text-gray-500 hover:text-red-500 cursor-pointer transition-colors"
                        title="Delete Promo"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {filteredPromos.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-10 text-gray-500 font-normal italic">
                  No promo codes found matching filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0A1410] border border-white/10 rounded-3xl p-6 shadow-2xl relative text-left"
            >
              <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                <h3 className="font-heading font-black text-white text-base">
                  {editingPromo ? "Edit Promo Code" : "Create Promo Code"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSavePromo} className="space-y-4 text-xs font-semibold text-gray-300">
                {/* Code field */}
                <div>
                  <label className="block text-[#8A9690] mb-1">Promo Code Name *</label>
                  <input
                    type="text"
                    required
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    disabled={!!editingPromo}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors uppercase font-mono tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-normal">Alphanumeric, underscores, or hyphens only. Locked once created.</p>
                </div>

                {/* Grid for type and value */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Discount Type *</label>
                    <select
                      value={discountType}
                      onChange={(e) => {
                        setDiscountType(e.target.value as any);
                        setDiscountValue("");
                      }}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 cursor-pointer"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed">Fixed Price (PHP)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">
                      {discountType === "percentage" ? "Percentage Off * (%)" : "Discount Amount * (PHP)"}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={discountType === "percentage" ? 100 : undefined}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder={discountType === "percentage" ? "e.g. 10" : "e.g. 500"}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Applicable To */}
                <div>
                  <label className="block text-[#8A9690] mb-1">Applicable To *</label>
                  <select
                    value={applicableTo}
                    onChange={(e) => setApplicableTo(e.target.value as any)}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 cursor-pointer"
                  >
                    <option value="all">Universal / All Privileges</option>
                    <option value="membership">Membership Fee / Renewal Only</option>
                    <option value="event">Event Registration Tickets Only</option>
                  </select>
                </div>

                {/* Usage Limit & Expiration Date */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Max Usage Limit</label>
                    <input
                      type="number"
                      min={1}
                      value={maxUses}
                      onChange={(e) => setMaxUses(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 100 (Blank = Unlimited)"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500"
                    />
                    <p className="text-[9px] text-gray-500 mt-1 font-normal">Total times this code can be used.</p>
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 cursor-pointer"
                    />
                    <p className="text-[9px] text-gray-500 mt-1 font-normal">Invalid after this date.</p>
                  </div>
                </div>

                {/* Is Active */}
                <div className="pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-[#101D17] text-green-600 focus:ring-green-500 accent-green-600"
                    />
                    <div>
                      <span className="block text-white text-xs">Is Active</span>
                      <span className="block text-[10px] text-[#8A9690] font-normal">Enable user applications</span>
                    </div>
                  </label>
                </div>

                {/* Form Actions */}
                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Save Promo Code"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
