import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import {
  Plus, Edit2, Trash2, X, Loader2, Package, Ticket,
  ToggleLeft, ToggleRight, ChevronDown
} from "lucide-react";

interface PackageRow {
  id: string;
  name: string;
  description: string;
  membership_type: "individual" | "sme" | "corporate" | null;
  package_type: "membership_bundle" | "member_passes" | "non_member_passes";
  price: number;
  included_passes: number;
  benefit_type: string;
  is_active: boolean;
  terms_and_conditions: string;
  created_at: string;
}

const MEMBERSHIP_TYPE_LABELS: Record<string, string> = {
  individual: "Small (Individual)",
  sme: "Medium (SME)",
  corporate: "Large (Corporate)",
};

const MEMBERSHIP_TYPE_COLORS: Record<string, string> = {
  individual: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  sme: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  corporate: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const inputCls =
  "w-full px-3 py-2.5 bg-[#101D17] border border-white/10 rounded-xl text-sm text-white focus:border-green-500 outline-none transition-all placeholder:text-[#8A9690]";
const labelCls = "block text-[10px] text-[#8A9690] font-bold uppercase tracking-wider mb-1.5";

export const PackagesTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [packages, setPackages] = useState<PackageRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingPkg, setEditingPkg] = useState<PackageRow | null>(null);

  // Form fields
  const [fName, setFName] = useState("");
  const [fDescription, setFDescription] = useState("");
  const [fPackageType, setFPackageType] = useState<"membership_bundle" | "member_passes" | "non_member_passes">("membership_bundle");
  const [fMembershipType, setFMembershipType] = useState<"individual" | "sme" | "corporate" | "none">("individual");
  const [fPrice, setFPrice] = useState<number | "">("");
  const [fIncludedPasses, setFIncludedPasses] = useState<number | "">(4);
  const [fBenefitType, setFBenefitType] = useState("coffee_connections");
  const [fIsActive, setFIsActive] = useState(true);
  const [fTermsAndConditions, setFTermsAndConditions] = useState("");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("membership_packages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      if (data) setPackages(data);
    } catch (err: any) {
      toast.error("Failed to load packages: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setFName("");
    setFDescription("");
    setFPackageType("membership_bundle");
    setFMembershipType("individual");
    setFPrice("");
    setFIncludedPasses(4);
    setFBenefitType("coffee_connections");
    setFIsActive(true);
    setFTermsAndConditions("");
    setEditingPkg(null);
  };

  const openCreate = () => {
    resetForm();
    setShowModal(true);
  };

  const openEdit = (pkg: PackageRow) => {
    setEditingPkg(pkg);
    setFName(pkg.name);
    setFDescription(pkg.description);
    setFPackageType(pkg.package_type || "membership_bundle");
    setFMembershipType(pkg.membership_type || "none");
    setFPrice(pkg.price);
    setFIncludedPasses(pkg.included_passes);
    setFBenefitType(pkg.benefit_type);
    setFIsActive(pkg.is_active);
    setFTermsAndConditions(pkg.terms_and_conditions || "");
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fName.trim()) return toast.error("Package name is required.");
    if (fPrice === "" || Number(fPrice) < 0) return toast.error("Please enter a valid price.");
    if (fIncludedPasses === "" || Number(fIncludedPasses) < 0) return toast.error("Please enter a valid number of passes.");

    setActionLoading(true);
    try {
      const payload = {
        name: fName.trim(),
        description: fDescription.trim(),
        membership_type: fMembershipType === "none" ? null : fMembershipType,
        package_type: fPackageType,
        price: Number(fPrice),
        included_passes: Number(fIncludedPasses),
        benefit_type: fBenefitType.trim() || "coffee_connections",
        is_active: fIsActive,
        terms_and_conditions: fTermsAndConditions.trim(),
        updated_at: new Date().toISOString(),
      };

      if (editingPkg) {
        const { error } = await supabase
          .from("membership_packages")
          .update(payload)
          .eq("id", editingPkg.id);
        if (error) throw error;
        toast.success("Package updated successfully!");
      } else {
        const { error } = await supabase
          .from("membership_packages")
          .insert(payload);
        if (error) throw error;
        toast.success("Package created successfully!");
      }

      setShowModal(false);
      resetForm();
      await loadData();
    } catch (err: any) {
      toast.error("Failed to save package: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (pkg: PackageRow) => {
    const confirmed = await confirm({
      message: `Are you sure you want to delete "${pkg.name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase
        .from("membership_packages")
        .delete()
        .eq("id", pkg.id);
      if (error) throw error;
      toast.success("Package deleted.");
      await loadData();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const handleToggleActive = async (pkg: PackageRow) => {
    try {
      const { error } = await supabase
        .from("membership_packages")
        .update({ is_active: !pkg.is_active, updated_at: new Date().toISOString() })
        .eq("id", pkg.id);
      if (error) throw error;
      toast.success(pkg.is_active ? "Package deactivated." : "Package activated.");
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-[#8A9690] mt-1">
            Create and manage membership package deals. Set the name, pricing, linked tier, and how many event passes are included.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-diffuse flex-shrink-0"
        >
          <Plus size={14} /> New Package
        </button>
      </div>

      {/* Package cards grid */}
      {packages.length === 0 ? (
        <div className="text-center py-20 text-[#8A9690]">
          <Package size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-semibold">No packages yet. Click "New Package" to create one.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {packages.map((pkg) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`relative bg-[#0A1410] border rounded-2xl p-6 flex flex-col gap-4 transition-all ${
                pkg.is_active ? "border-white/5" : "border-white/[0.02] opacity-50"
              }`}
            >
              {/* Status badge */}
              <div className="absolute top-4 right-4">
                <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                  pkg.is_active
                    ? "text-green-400 bg-green-500/10 border-green-500/20"
                    : "text-[#8A9690] bg-white/5 border-white/10"
                }`}>
                  {pkg.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {/* Icon + name */}
              <div className="flex items-start gap-3 pr-14">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <Package size={18} className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-heading font-black text-white text-sm leading-tight">{pkg.name}</h3>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      pkg.membership_type 
                        ? MEMBERSHIP_TYPE_COLORS[pkg.membership_type] 
                        : "text-gray-400 bg-white/5 border-white/10"
                    }`}>
                      {pkg.membership_type ? MEMBERSHIP_TYPE_LABELS[pkg.membership_type] : "No Linked Tier"}
                    </span>
                    <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      pkg.package_type === "member_passes"
                        ? "text-teal-400 bg-teal-500/10 border-teal-500/20"
                        : pkg.package_type === "non_member_passes"
                        ? "text-pink-400 bg-pink-500/10 border-pink-500/20"
                        : "text-blue-400 bg-blue-500/10 border-blue-500/20"
                    }`}>
                      {(pkg.package_type || "membership_bundle").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {pkg.description && (
                <p className="text-[11px] text-[#8A9690] leading-relaxed line-clamp-2">{pkg.description}</p>
              )}

              {/* Terms and conditions */}
              {pkg.terms_and_conditions && (
                <p className="text-[10px] text-[#8A9690] leading-relaxed italic border-t border-white/[0.04] pt-2">
                  <span className="font-bold uppercase tracking-wider text-[8px] text-[#55635B] block mb-0.5">Terms & Conditions</span>
                  {pkg.terms_and_conditions}
                </p>
              )}

              {/* Key stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[9px] text-[#8A9690] font-bold uppercase mb-1">Price</div>
                  <div className="text-base font-heading font-black text-white">₱{Number(pkg.price).toLocaleString()}</div>
                  <div className="text-[9px] text-[#8A9690]">/yr</div>
                </div>
                <div className="bg-white/[0.03] rounded-xl p-3">
                  <div className="text-[9px] text-[#8A9690] font-bold uppercase mb-1">Passes</div>
                  <div className="text-base font-heading font-black text-green-400 flex items-end gap-1">
                    {pkg.included_passes}
                    <Ticket size={12} className="mb-0.5" />
                  </div>
                  <div className="text-[9px] text-[#8A9690] capitalize">{pkg.benefit_type.replace(/_/g, " ")}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => openEdit(pkg)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-xs font-semibold text-[#ECEFEF] transition-all cursor-pointer"
                >
                  <Edit2 size={12} /> Edit
                </button>
                <button
                  onClick={() => handleToggleActive(pkg)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-xs font-semibold text-[#8A9690] transition-all cursor-pointer"
                >
                  {pkg.is_active ? <ToggleRight size={12} className="text-green-400" /> : <ToggleLeft size={12} />}
                  {pkg.is_active ? "Deactivate" : "Activate"}
                </button>
                <button
                  onClick={() => handleDelete(pkg)}
                  className="p-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-red-500/10 hover:border-red-500/20 text-[#8A9690] hover:text-red-400 transition-all cursor-pointer"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-[#0A1410] border border-white/10 rounded-3xl p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-black text-white text-base">
                    {editingPkg ? "Edit Package" : "New Membership Package"}
                  </h3>
                  <p className="text-[11px] text-[#8A9690] mt-0.5">
                    {editingPkg ? "Update the package details below." : "Configure the new bundle deal below."}
                  </p>
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-[#8A9690] transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                {/* Name */}
                <div>
                  <label className={labelCls}>Package Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Package A: Small Enterprise"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    className={inputCls}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className={labelCls}>Description</label>
                  <textarea
                    rows={3}
                    placeholder="Brief description shown on the membership page..."
                    value={fDescription}
                    onChange={(e) => setFDescription(e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* Terms and Conditions */}
                <div>
                  <label className={labelCls}>Terms & Conditions</label>
                  <textarea
                    rows={2}
                    placeholder="Specific terms for this package deal..."
                    value={fTermsAndConditions}
                    onChange={(e) => setFTermsAndConditions(e.target.value)}
                    className={`${inputCls} resize-none`}
                  />
                </div>

                {/* Package Type */}
                <div>
                  <label className={labelCls}>Package Type *</label>
                  <div className="relative">
                    <select
                      value={fPackageType}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setFPackageType(val);
                        if (val === "non_member_passes") {
                          setFMembershipType("none");
                        }
                      }}
                      className={`${inputCls} appearance-none pr-9 pr-9 cursor-pointer`}
                    >
                      <option value="membership_bundle">Membership Bundle (Includes Annual Membership)</option>
                      <option value="member_passes">Event Passes for Members (Existing Members)</option>
                      <option value="non_member_passes">Event Passes for Non-Members (Guests)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9690] pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-[#8A9690] mt-1">Select the operational workflow classification for this package.</p>
                </div>

                {/* Membership type */}
                <div>
                  <label className={labelCls}>Linked Membership Tier</label>
                  <div className="relative">
                    <select
                      value={fMembershipType}
                      disabled={fPackageType === "non_member_passes"}
                      onChange={(e) => setFMembershipType(e.target.value as any)}
                      className={`${inputCls} appearance-none pr-9 cursor-pointer disabled:opacity-40`}
                    >
                      <option value="none">None (No Linked Tier)</option>
                      <option value="individual">Small (Individual)</option>
                      <option value="sme">Medium (SME)</option>
                      <option value="corporate">Large (Corporate)</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A9690] pointer-events-none" />
                  </div>
                  <p className="text-[10px] text-[#8A9690] mt-1">
                    {fPackageType === "non_member_passes" 
                      ? "Not applicable for guest non-member pass packages." 
                      : "The membership tier assigned/associated with this package."}
                  </p>
                </div>

                {/* Price + Passes (side by side) */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Bundle Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 2900"
                      value={fPrice}
                      onChange={(e) => setFPrice(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Included Passes *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      placeholder="e.g. 4"
                      value={fIncludedPasses}
                      onChange={(e) => setFIncludedPasses(e.target.value === "" ? "" : Number(e.target.value))}
                      className={inputCls}
                    />
                    <p className="text-[10px] text-[#8A9690] mt-1">Number of event passes credited on approval.</p>
                  </div>
                </div>

                {/* Benefit type */}
                <div>
                  <label className={labelCls}>Pass Type / Benefit Label</label>
                  <input
                    type="text"
                    placeholder="e.g. coffee_connections"
                    value={fBenefitType}
                    onChange={(e) => setFBenefitType(e.target.value)}
                    className={inputCls}
                  />
                  <p className="text-[10px] text-[#8A9690] mt-1">Used to group and filter credits. Default: <code className="text-green-400">coffee_connections</code></p>
                </div>

                {/* Active toggle */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                  <button
                    type="button"
                    onClick={() => setFIsActive(!fIsActive)}
                    className="cursor-pointer"
                  >
                    {fIsActive
                      ? <ToggleRight size={24} className="text-green-400" />
                      : <ToggleLeft size={24} className="text-[#8A9690]" />}
                  </button>
                  <div>
                    <div className="text-xs font-bold text-white">
                      {fIsActive ? "Active" : "Inactive"}
                    </div>
                    <div className="text-[10px] text-[#8A9690]">Inactive packages are hidden from the membership registration page.</div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-60 rounded-xl text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {actionLoading ? "Saving..." : editingPkg ? "Save Changes" : "Create Package"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-sm font-bold text-[#8A9690] transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PackagesTab;
