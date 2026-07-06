import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import { uploadImage } from "../../lib/storage";
import { 
  Search, Plus, Edit2, Trash2, Globe, Mail, Phone, Shield, Check, X, Loader2, Upload, 
  Building2, ChevronLeft, ChevronRight 
} from "lucide-react";
import type { Profile } from "../../context/AuthContext";

interface DirectoryRow {
  id: string;
  user_id?: string | null;
  business_name: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  website_url: string;
  category: string;
  address: string;
  is_featured: boolean;
  is_verified: boolean;
  logo_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  pending_changes?: any;
  approval_status?: "approved" | "pending_approval";
}

export const DirectoryTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [directory, setDirectory] = useState<DirectoryRow[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form states
  const [showDirModal, setShowDirModal] = useState(false);
  const [editingDir, setEditingDir] = useState<DirectoryRow | null>(null);
  
  const [dirBizName, setDirBizName] = useState("");
  const [dirDescription, setDirDescription] = useState("");
  const [dirCategory, setDirCategory] = useState("Retail");
  const [dirOtherCatText, setDirOtherCatText] = useState("");
  const [dirAddress, setDirAddress] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPhone, setDirPhone] = useState("");
  const [dirWebsite, setDirWebsite] = useState("");
  const [dirOwnerId, setDirOwnerId] = useState("");
  const [dirLogoUrl, setDirLogoUrl] = useState("");
  const [dirFacebookUrl, setDirFacebookUrl] = useState("");
  const [dirInstagramUrl, setDirInstagramUrl] = useState("");
  
  const [dirLogoFile, setDirLogoFile] = useState<File | null>(null);
  const [dirLogoPreview, setDirLogoPreview] = useState("");
  const [dirLogoUploading, setDirLogoUploading] = useState(false);
  const [dirIsVerified, setDirIsVerified] = useState(true);
  const [dirIsFeatured, setDirIsFeatured] = useState(false);

  // Search & Filters
  const [dirSearchQuery, setDirSearchQuery] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState("all");
  const [dirCurrentPage, setDirCurrentPage] = useState(1);
  const [dirRowsPerPage, setDirRowsPerPage] = useState(10);

  // Review Edits Modal states
  const [showReviewEditsModal, setShowReviewEditsModal] = useState(false);
  const [reviewingDir, setReviewingDir] = useState<DirectoryRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: dirData, error: dirError } = await supabase
        .from("business_directory")
        .select("*")
        .order("business_name", { ascending: true });
      if (dirError) throw dirError;
      if (dirData) setDirectory(dirData);

      const { data: profilesData, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (profError) throw profError;
      if (profilesData) setProfiles(profilesData);
    } catch (err: any) {
      toast.error("Failed to load directory data: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setDirCurrentPage(1);
  }, [dirSearchQuery, dirStatusFilter]);

  const resetDirectoryForm = () => {
    setDirBizName("");
    setDirDescription("");
    setDirCategory("Retail");
    setDirOtherCatText("");
    setDirAddress("");
    setDirEmail("");
    setDirPhone("");
    setDirWebsite("");
    setDirOwnerId("");
    setDirLogoUrl("");
    setDirFacebookUrl("");
    setDirInstagramUrl("");
    setDirLogoFile(null);
    setDirLogoPreview("");
    setEditingDir(null);
    setDirIsVerified(true);
    setDirIsFeatured(false);
  };

  const handleSaveDirectory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dirBizName || !dirDescription || !dirCategory || !dirAddress) {
      toast.error("Please fill in all required fields.");
      return;
    }

    const finalDirCategory = dirCategory === "Other" ? dirOtherCatText.trim() : dirCategory;
    if (!finalDirCategory) {
      toast.error("Please specify a business category.");
      return;
    }

    setActionLoading(true);
    try {
      let finalLogoUrl = dirLogoUrl;
      if (dirLogoFile) {
        setDirLogoUploading(true);
        try {
          finalLogoUrl = await uploadImage(dirLogoFile, "business-logos");
        } catch (uploadErr: any) {
          toast.error("Logo upload failed: " + uploadErr.message);
          setDirLogoUploading(false);
          setActionLoading(false);
          return;
        }
        setDirLogoUploading(false);
      }

      const listingData = {
        business_name: dirBizName.trim(),
        description: dirDescription.trim(),
        category: finalDirCategory,
        address: dirAddress.trim(),
        contact_email: dirEmail.trim() || null,
        contact_phone: dirPhone.trim() || null,
        website_url: dirWebsite.trim() || null,
        user_id: dirOwnerId || null,
        logo_url: finalLogoUrl || null,
        facebook_url: dirFacebookUrl.trim() || null,
        instagram_url: dirInstagramUrl.trim() || null,
        is_verified: dirIsVerified,
        is_featured: dirIsFeatured,
        approval_status: "approved",
        pending_changes: null
      };

      if (editingDir) {
        const { error } = await supabase
          .from("business_directory")
          .update(listingData)
          .eq("id", editingDir.id);
        if (error) throw error;
        toast.success("Directory listing updated successfully!");
      } else {
        const { error } = await supabase
          .from("business_directory")
          .insert(listingData);
        if (error) throw error;
        toast.success("Directory listing created successfully!");
      }

      setShowDirModal(false);
      resetDirectoryForm();
      await loadData();
    } catch (err: any) {
      toast.error("Error saving directory listing: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditDirectoryClick = (biz: DirectoryRow) => {
    setEditingDir(biz);
    setDirBizName(biz.business_name);
    setDirDescription(biz.description);
    const cat = biz.category;
    if (cat) {
      if (["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(cat)) {
        setDirCategory(cat);
        setDirOtherCatText("");
      } else {
        setDirCategory("Other");
        setDirOtherCatText(cat);
      }
    } else {
      setDirCategory("Retail");
      setDirOtherCatText("");
    }
    setDirAddress(biz.address);
    setDirEmail(biz.contact_email || "");
    setDirPhone(biz.contact_phone || "");
    setDirWebsite(biz.website_url || "");
    setDirOwnerId(biz.user_id || "");
    setDirLogoUrl(biz.logo_url || "");
    setDirLogoPreview(biz.logo_url || "");
    setDirLogoFile(null);
    setDirFacebookUrl(biz.facebook_url || "");
    setDirInstagramUrl(biz.instagram_url || "");
    setDirIsVerified(biz.is_verified || false);
    setDirIsFeatured(biz.is_featured || false);
    setShowDirModal(true);
  };

  const handleDeleteDirectory = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Directory Listing",
      message: "Are you sure you want to delete this directory listing?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("business_directory").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      toast.success("Listing deleted.");
    } catch (err: any) {
      toast.error("Failed to delete listing: " + err.message);
    }
  };

  const handleToggleDirectoryVerify = async (biz: DirectoryRow) => {
    try {
      const { error } = await supabase
        .from("business_directory")
        .update({ is_verified: !biz.is_verified })
        .eq("id", biz.id);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      toast.error("Error toggling verification: " + err.message);
    }
  };

  const handleToggleDirectoryFeatured = async (biz: DirectoryRow) => {
    try {
      const { error } = await supabase
        .from("business_directory")
        .update({ is_featured: !biz.is_featured })
        .eq("id", biz.id);
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      toast.error("Error toggling featured tag: " + err.message);
    }
  };

  const handleApproveEdits = async (biz: DirectoryRow) => {
    if (!biz.pending_changes) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("business_directory")
        .update({
          business_name: biz.pending_changes.business_name,
          description: biz.pending_changes.description,
          category: biz.pending_changes.category,
          address: biz.pending_changes.address,
          contact_email: biz.pending_changes.contact_email,
          contact_phone: biz.pending_changes.contact_phone,
          website_url: biz.pending_changes.website_url,
          facebook_url: biz.pending_changes.facebook_url !== undefined ? biz.pending_changes.facebook_url : biz.facebook_url,
          instagram_url: biz.pending_changes.instagram_url !== undefined ? biz.pending_changes.instagram_url : biz.instagram_url,
          logo_url: biz.pending_changes.logo_url !== undefined ? biz.pending_changes.logo_url : biz.logo_url,
          pending_changes: null,
          approval_status: "approved",
          is_verified: true
        })
        .eq("id", biz.id);
      if (error) throw error;

      setShowReviewEditsModal(false);
      setReviewingDir(null);
      await loadData();
      toast.success("Proposed edits approved and published successfully!");
    } catch (err: any) {
      toast.error("Error approving edits: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectEdits = async (biz: DirectoryRow) => {
    const confirmed = await confirm({
      title: "Reject Proposed Edits",
      message: `Are you sure you want to reject the edits proposed for "${biz.business_name}"? The changes will be discarded.`,
      confirmText: "Discard",
      variant: "danger"
    });
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("business_directory")
        .update({
          pending_changes: null,
          approval_status: "approved"
        })
        .eq("id", biz.id);
      if (error) throw error;

      setShowReviewEditsModal(false);
      setReviewingDir(null);
      await loadData();
      toast.success("Proposed edits rejected successfully.");
    } catch (err: any) {
      toast.error("Error rejecting edits: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Directory Filters and Search
  const filteredDirectory = directory.filter((biz) => {
    const matchesSearch = 
      biz.business_name.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
      biz.description.toLowerCase().includes(dirSearchQuery.toLowerCase()) ||
      biz.category.toLowerCase().includes(dirSearchQuery.toLowerCase());

    if (dirStatusFilter === "verified") return matchesSearch && biz.is_verified;
    if (dirStatusFilter === "pending") return matchesSearch && !biz.is_verified;
    if (dirStatusFilter === "featured") return matchesSearch && biz.is_featured;
    return matchesSearch;
  });

  const totalDirFilteredCount = filteredDirectory.length;
  const totalDirPages = Math.ceil(totalDirFilteredCount / dirRowsPerPage) || 1;
  const paginatedDirectory = filteredDirectory.slice(
    (dirCurrentPage - 1) * dirRowsPerPage,
    dirCurrentPage * dirRowsPerPage
  );

  const renderComparisonField = (label: string, liveVal: string | null, proposedVal: string | null) => {
    const isChanged = liveVal !== proposedVal;
    return (
      <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-white/5 text-left">
        <div>
          <div className="text-[10px] text-[#8A9690] uppercase font-bold">{label} (Live)</div>
          <div className="text-xs text-gray-400 mt-1 break-all bg-white/[0.01] p-2 rounded-lg border border-white/5">
            {liveVal || <span className="italic text-gray-650">Empty</span>}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#4ADE80] uppercase font-bold">{label} (Proposed)</div>
          <div className={`text-xs mt-1 break-all p-2 rounded-lg border ${
            isChanged 
              ? "text-emerald-350 bg-emerald-500/5 border-emerald-500/20 font-bold" 
              : "text-gray-400 bg-white/[0.01] border-white/5"
          }`}>
            {proposedVal || <span className="italic text-gray-600">Empty</span>}
          </div>
        </div>
      </div>
    );
  };

  const renderLogoComparison = (liveVal: string | null, proposedVal: string | null) => {
    const isChanged = liveVal !== proposedVal;
    return (
      <div className="grid grid-cols-2 gap-4 py-2.5 border-b border-white/5 text-left">
        <div>
          <div className="text-[10px] text-[#8A9690] uppercase font-bold">Business Logo (Live)</div>
          <div className="mt-1 flex items-center justify-start p-2 rounded-lg bg-white/[0.01] border border-white/5 w-16 h-16 overflow-hidden">
            {liveVal ? (
              <img src={liveVal} alt="Live logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 size={24} className="text-gray-650 mx-auto" />
            )}
          </div>
        </div>
        <div>
          <div className="text-[10px] text-[#4ADE80] uppercase font-bold">Business Logo (Proposed)</div>
          <div className={`mt-1 flex items-center justify-start p-2 rounded-lg border w-16 h-16 overflow-hidden ${
            isChanged 
              ? "bg-emerald-500/5 border-emerald-500/20" 
              : "bg-[#101D17] border-white/5"
          }`}>
            {proposedVal ? (
              <img src={proposedVal} alt="Proposed logo" className="w-full h-full object-contain" />
            ) : (
              <Building2 size={24} className="text-gray-650 mx-auto" />
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-heading font-black text-white">Business Directory CMS</h3>
            <p className="text-xs text-gray-500 mt-1">Manage public business listings, verification badges, featured rankings, and owner linkage.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="flex flex-wrap gap-1 w-full sm:w-auto">
              {[
                { id: "all", label: `All (${directory.length})` },
                { id: "verified", label: `Verified (${directory.filter(d => d.is_verified).length})` },
                { id: "pending", label: `Pending (${directory.filter(d => !d.is_verified).length})` },
                { id: "featured", label: `Featured (${directory.filter(d => d.is_featured).length})` },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setDirStatusFilter(id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                    dirStatusFilter === id
                      ? "bg-green-700/10 text-green-400 border-green-500/25"
                      : "bg-white/[0.02] text-gray-400 border-white/5 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Search listings..."
                value={dirSearchQuery}
                onChange={(e) => setDirSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white placeholder-gray-500 font-semibold"
              />
            </div>
            <button
              onClick={() => {
                resetDirectoryForm();
                setShowDirModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={14} /> Add Listing
            </button>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
              <th className="pb-4.5 pl-2">Business Name</th>
              <th className="pb-4.5">Category</th>
              <th className="pb-4.5">Location</th>
              <th className="pb-4.5">Owner</th>
              <th className="pb-4.5">Verification</th>
              <th className="pb-4.5 text-right pr-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-semibold">
            {paginatedDirectory.map((biz) => (
              <tr key={biz.id} className="hover:bg-white/[0.01]">
                <td className="py-4.5 pl-2">
                  <div className="text-white font-bold">{biz.business_name}</div>
                  <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{biz.contact_email || "No Email"}</div>
                </td>
                <td className="py-4.5">{biz.category}</td>
                <td className="py-4.5 text-gray-300">{biz.address}</td>
                <td className="py-4.5">
                  {(() => {
                    const owner = profiles.find(p => p.id === biz.user_id);
                    return owner ? (
                      <div>
                        <div className="text-white font-bold">{owner.full_name || "Name not set"}</div>
                        <div className="text-[10px] text-[#8A9690] font-normal">{owner.email}</div>
                      </div>
                    ) : (
                      <span className="text-[#8A9690] font-normal italic">Unowned</span>
                    );
                  })()}
                </td>
                <td className="py-4.5">
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handleToggleDirectoryVerify(biz)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                        biz.is_verified
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-gray-500/10 text-gray-400 border-white/10"
                      }`}
                    >
                      {biz.is_verified ? "Verified" : "Pending"}
                    </button>
                    <button
                      onClick={() => handleToggleDirectoryFeatured(biz)}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border cursor-pointer ${
                        biz.is_featured
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-gray-500/10 text-gray-500 border-white/10"
                      }`}
                    >
                      {biz.is_featured ? "Featured" : "Standard"}
                    </button>
                    {biz.approval_status === "pending_approval" && (
                      <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase border bg-orange-500/10 text-orange-400 border-orange-500/20 animate-pulse">
                        Pending Edits
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-4.5 text-right pr-2">
                  <div className="flex items-center justify-end gap-2">
                    {biz.approval_status === "pending_approval" && biz.pending_changes && (
                      <button
                        onClick={() => {
                          setReviewingDir(biz);
                          setShowReviewEditsModal(true);
                        }}
                        className="px-2 py-1 rounded bg-blue-600/15 border border-blue-500/20 text-blue-400 hover:bg-blue-600/25 text-[10px] font-bold uppercase cursor-pointer mr-1 transition-colors"
                      >
                        Review Edits
                      </button>
                    )}
                    <button
                      onClick={() => handleEditDirectoryClick(biz)}
                      className="p-1.5 text-gray-500 hover:text-green-400 cursor-pointer transition-colors"
                      title="Edit Listing"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      onClick={() => handleDeleteDirectory(biz.id)}
                      className="p-1.5 text-gray-500 hover:text-red-400 cursor-pointer transition-colors"
                      title="Delete Listing"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalDirFilteredCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5 text-[11px] text-[#8A9690]">
          <div className="flex items-center gap-2 font-semibold">
            <span>Rows per page:</span>
            <select
              value={dirRowsPerPage}
              onChange={(e) => {
                setDirRowsPerPage(Number(e.target.value));
                setDirCurrentPage(1);
              }}
              className="px-2 py-1 bg-[#101D17] border border-white/10 rounded-lg text-white font-bold cursor-pointer outline-none focus:border-green-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-[11px] text-[#8A9690]">
              Showing {Math.min(totalDirFilteredCount, (dirCurrentPage - 1) * dirRowsPerPage + 1)} - {Math.min(totalDirFilteredCount, dirCurrentPage * dirRowsPerPage)} of {totalDirFilteredCount} listings
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setDirCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={dirCurrentPage === 1}
              className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            
            {Array.from({ length: totalDirPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalDirPages || Math.abs(p - dirCurrentPage) <= 1)
              .map((p, idx, arr) => {
                const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-1 text-gray-600">...</span>}
                    <button
                      onClick={() => setDirCurrentPage(p)}
                      className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        dirCurrentPage === p
                          ? "bg-green-700 text-white"
                          : "bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              onClick={() => setDirCurrentPage(prev => Math.min(totalDirPages, prev + 1))}
              disabled={dirCurrentPage === totalDirPages}
              className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Directory Editor Modal */}
      <AnimatePresence>
        {showDirModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-heading font-black text-white text-lg">
                  {editingDir ? "Edit Directory Listing" : "Add Directory Listing"}
                </h3>
                <button
                  onClick={() => {
                    setShowDirModal(false);
                    resetDirectoryForm();
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSaveDirectory} className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Business Name *</label>
                    <input
                      type="text"
                      required
                      value={dirBizName}
                      onChange={(e) => setDirBizName(e.target.value)}
                      placeholder="e.g. Santos Trading Co."
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Category *</label>
                    <select
                      value={dirCategory}
                      onChange={(e) => {
                        setDirCategory(e.target.value);
                        if (e.target.value !== "Other") {
                          setDirOtherCatText("");
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    >
                      <option value="Retail">Retail</option>
                      <option value="Construction">Construction</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Professional Services">Professional Services</option>
                      <option value="Healthcare">Healthcare</option>
                      <option value="IT & Tech">IT & Tech</option>
                      <option value="Logistics">Logistics</option>
                      <option value="Agriculture">Agriculture</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  {dirCategory === "Other" && (
                    <div className="sm:col-span-2">
                      <label className="block text-[#8A9690] mb-1">Specify Sector / Category *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Handicrafts, Aquaculture, etc."
                        value={dirOtherCatText}
                        onChange={(e) => setDirOtherCatText(e.target.value)}
                        className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Business Description *</label>
                  <textarea
                    required
                    rows={4}
                    value={dirDescription}
                    onChange={(e) => setDirDescription(e.target.value)}
                    placeholder="Describe the business offerings..."
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Physical Address *</label>
                  <input
                    type="text"
                    required
                    value={dirAddress}
                    onChange={(e) => setDirAddress(e.target.value)}
                    placeholder="Barangay, City/Province"
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={dirEmail}
                      onChange={(e) => setDirEmail(e.target.value)}
                      placeholder="info@company.com"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Contact Phone</label>
                    <input
                      type="text"
                      value={dirPhone}
                      onChange={(e) => setDirPhone(e.target.value)}
                      placeholder="(032) 123-4567"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Website URL</label>
                    <input
                      type="text"
                      value={dirWebsite}
                      onChange={(e) => setDirWebsite(e.target.value)}
                      placeholder="company.com"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Business Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-xl bg-[#101D17] border border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {dirLogoPreview ? (
                        <img src={dirLogoPreview} alt="Logo preview" className="w-full h-full object-contain" />
                      ) : (
                        <Building2 size={24} className="text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="dir-logo-upload"
                        className="cursor-pointer flex items-center gap-2 px-3 py-2 bg-[#101D17] border border-white/10 hover:border-green-500 rounded-xl text-white text-xs transition-colors w-full"
                      >
                        <Upload size={14} />
                        {dirLogoFile ? dirLogoFile.name : (dirLogoPreview ? "Replace logo" : "Upload logo")}
                      </label>
                      <input
                        id="dir-logo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setDirLogoFile(file);
                            setDirLogoPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <p className="text-[10px] text-gray-500 mt-1">PNG, JPG or SVG. Max 2MB recommended.</p>
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Facebook Page URL</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl focus-within:border-green-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="#4267B2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                      <input
                        type="text"
                        value={dirFacebookUrl}
                        onChange={(e) => setDirFacebookUrl(e.target.value)}
                        placeholder="facebook.com/yourbusiness"
                        className="flex-1 bg-transparent text-white outline-none text-xs"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Instagram Profile URL</label>
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl focus-within:border-green-500 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="url(#ig-tab-gradient)">
                        <defs>
                          <linearGradient id="ig-tab-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#f09433"/>
                            <stop offset="25%" stopColor="#e6683c"/>
                            <stop offset="50%" stopColor="#dc2743"/>
                            <stop offset="75%" stopColor="#cc2366"/>
                            <stop offset="100%" stopColor="#bc1888"/>
                          </linearGradient>
                        </defs>
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                      </svg>
                      <input
                        type="text"
                        value={dirInstagramUrl}
                        onChange={(e) => setDirInstagramUrl(e.target.value)}
                        placeholder="instagram.com/yourbusiness"
                        className="flex-1 bg-transparent text-white outline-none text-xs"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Owner (Linked Profile)</label>
                  <select
                    value={dirOwnerId}
                    onChange={(e) => setDirOwnerId(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                  >
                    <option value="">Unowned / Select Profile...</option>
                    {profiles
                      .filter((p) => p.role === "member")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.full_name || "Unnamed"} ({p.email})
                        </option>
                      ))}
                  </select>
                  <p className="text-[10px] text-gray-500 mt-1 font-normal">
                    Linking this directory profile to a user allows that member to edit the listing details from their dashboard (subject to admin approval).
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dirIsVerified}
                      onChange={(e) => setDirIsVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-[#101D17] text-green-600 focus:ring-green-500 accent-green-600"
                    />
                    <div>
                      <span className="block text-white text-xs">Verified Display</span>
                      <span className="block text-[10px] text-[#8A9690] font-normal">Show in public directory</span>
                    </div>
                  </label>
                  
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={dirIsFeatured}
                      onChange={(e) => setDirIsFeatured(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-[#101D17] text-green-600 focus:ring-green-500 accent-green-600"
                    />
                    <div>
                      <span className="block text-white text-xs">Featured Listing</span>
                      <span className="block text-[10px] text-[#8A9690] font-normal">Highlight listing</span>
                    </div>
                  </label>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Save Listing"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDirModal(false);
                      resetDirectoryForm();
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

      {/* Review Proposed Edits Modal */}
      <AnimatePresence>
        {showReviewEditsModal && reviewingDir && reviewingDir.pending_changes && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="font-heading font-black text-white text-lg flex items-center gap-2">
                    <Shield className="text-amber-400" size={18} />
                    Review Proposed Directory Edits
                  </h3>
                  <p className="text-[11px] text-[#8A9690] mt-0.5">
                    Review and compare updates proposed by the owner of <strong>{reviewingDir.business_name}</strong>.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowReviewEditsModal(false);
                    setReviewingDir(null);
                  }}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-1 mb-8 overflow-y-auto max-h-[50vh] pr-1.5 custom-scrollbar">
                {renderLogoComparison(reviewingDir.logo_url ?? null, reviewingDir.pending_changes.logo_url ?? null)}
                {renderComparisonField("Business Name", reviewingDir.business_name, reviewingDir.pending_changes.business_name)}
                {renderComparisonField("Category", reviewingDir.category, reviewingDir.pending_changes.category)}
                {renderComparisonField("Business Description", reviewingDir.description, reviewingDir.pending_changes.description)}
                {renderComparisonField("Physical Address", reviewingDir.address, reviewingDir.pending_changes.address)}
                {renderComparisonField("Contact Email", reviewingDir.contact_email, reviewingDir.pending_changes.contact_email)}
                {renderComparisonField("Contact Phone", reviewingDir.contact_phone, reviewingDir.pending_changes.contact_phone)}
                {renderComparisonField("Website URL", reviewingDir.website_url, reviewingDir.pending_changes.website_url)}
                {renderComparisonField("Facebook URL", reviewingDir.facebook_url ?? null, (reviewingDir.pending_changes.facebook_url !== undefined ? reviewingDir.pending_changes.facebook_url : reviewingDir.facebook_url) ?? null)}
                {renderComparisonField("Instagram URL", reviewingDir.instagram_url ?? null, (reviewingDir.pending_changes.instagram_url !== undefined ? reviewingDir.pending_changes.instagram_url : reviewingDir.instagram_url) ?? null)}
              </div>

              <div className="flex flex-col sm:flex-row gap-2.5 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => handleApproveEdits(reviewingDir)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} Approve & Publish Edits
                </button>
                <button
                  type="button"
                  onClick={() => handleRejectEdits(reviewingDir)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-500/20 text-red-400 font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  {actionLoading ? <Loader2 className="animate-spin" size={14} /> : <X size={14} />} Reject & Discard Edits
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
