import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import { 
  Search, Plus, Edit2, Loader2, Upload, Trash2, X, ChevronLeft, ChevronRight, UserPlus, UserCheck, Copy, Sparkles 
} from "lucide-react";
import type { Profile } from "../../context/AuthContext";

const getPlanDisplayName = (type: string | null | undefined): string => {
  if (!type) return "None";
  switch (type.toLowerCase()) {
    case "individual": return "Small";
    case "sme": return "Medium";
    case "corporate": return "Large";
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

export const MembersTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | "active" | "pending" | "expired">("all");
  const [memberPlanFilter, setMemberPlanFilter] = useState("all");
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);

  // Manual Creation form states
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberCompany, setNewMemberCompany] = useState("");
  const [newMemberPlan, setNewMemberPlan] = useState("individual"); // Plan when creating
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [newMemberCategory, setNewMemberCategory] = useState("Retail"); // Category when creating
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [createdCreds, setCreatedCreds] = useState<{ name: string; email: string; pass: string } | null>(null);

  // Edit Expiry / details states
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<Profile | null>(null);
  const [memberCredits, setMemberCredits] = useState<any[]>([]);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [editMemberExpiresAt, setEditMemberExpiresAt] = useState("");

  // Excel Import states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    errors: string[];
  } | null>(null);
  const [importTempPassword, setImportTempPassword] = useState("Chamber2026!");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setProfiles(data);
    } catch (err: any) {
      toast.error("Failed to load members: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setMemberCurrentPage(1);
  }, [searchQuery, memberStatusFilter, memberPlanFilter]);

  // Excel File Change & Parse
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: "binary" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const normalized = json.map((row: any, index) => {
          const fullNameKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "full name" ||
              k.toLowerCase() === "name" ||
              k.toLowerCase() === "fullname" ||
              k.toLowerCase() === "member name" ||
              k.toLowerCase() === "name of member"
          );
          
          const emailKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "email" ||
              k.toLowerCase() === "email address" ||
              k.toLowerCase() === "emailaddress"
          );

          const companyKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "company" ||
              k.toLowerCase() === "company name" ||
              k.toLowerCase() === "business" ||
              k.toLowerCase() === "business name" ||
              k.toLowerCase() === "business/company name"
          );

          const phoneKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "phone" ||
              k.toLowerCase() === "phone number" ||
              k.toLowerCase() === "contact" ||
              k.toLowerCase() === "contact number" ||
              k.toLowerCase() === "mobile number" ||
              k.toLowerCase() === "mobile"
          );

          const addressKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "address" ||
              k.toLowerCase() === "business address"
          );

          const tierKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "tier" ||
              k.toLowerCase() === "plan" ||
              k.toLowerCase() === "membership tier" ||
              k.toLowerCase() === "membership plan" ||
              k.toLowerCase() === "company size"
          );

          const rawFullName = fullNameKey ? String(row[fullNameKey]).trim() : "";
          const rawEmail = emailKey ? String(row[emailKey]).trim() : "";
          const rawCompany = companyKey ? String(row[companyKey]).trim() : "";
          const rawPhone = phoneKey ? String(row[phoneKey]).trim() : "";
          const rawAddress = addressKey ? String(row[addressKey]).trim() : "";
          const rawTier = tierKey ? String(row[tierKey]).trim().toLowerCase() : "";

          let mappedTier = "individual";
          if (rawTier.includes("sme") || rawTier.includes("medium")) {
            mappedTier = "sme";
          } else if (rawTier.includes("corporate") || rawTier.includes("large")) {
            mappedTier = "corporate";
          }

          return {
            rowNum: index + 2,
            fullName: rawFullName,
            email: rawEmail,
            companyName: rawCompany,
            phone: rawPhone,
            address: rawAddress,
            tier: mappedTier
          };
        });

        const validRows = normalized.filter((r) => r.fullName && r.email);
        setImportPreviewData(validRows);

        if (validRows.length === 0) {
          toast.error("No valid rows found in Excel sheet. Make sure 'Full Name' and 'Email' headers exist.");
        } else {
          toast.success(`Loaded ${validRows.length} members from file.`);
        }
      } catch (err: any) {
        toast.error("Failed to parse file: " + err.message);
      }
    };

    reader.readAsBinaryString(file);
  };

  // Start Bulk Excel Import
  const handleStartImport = async () => {
    if (importPreviewData.length === 0) {
      toast.error("No data available to import.");
      return;
    }
    if (!importTempPassword || importTempPassword.length < 6) {
      toast.error("Please provide a valid temporary password (at least 6 characters).");
      return;
    }

    setImporting(true);
    setImportProgress({
      current: 0,
      total: importPreviewData.length,
      successCount: 0,
      errors: []
    });

    let successes = 0;
    const errorsList: string[] = [];

    for (let i = 0; i < importPreviewData.length; i++) {
      const row = importPreviewData[i];
      setImportProgress((prev) => prev ? { ...prev, current: i + 1 } : null);

      try {
        const { error } = await supabase.rpc("admin_import_member", {
          p_email: row.email,
          p_password: importTempPassword,
          p_full_name: row.fullName,
          p_company_name: row.companyName || null,
          p_membership_type: row.tier,
          p_phone: row.phone || null,
          p_business_address: row.address || null,
          p_expires_at: null
        });

        if (error) throw error;
        successes++;
      } catch (err: any) {
        console.error(`Error importing row ${row.rowNum}:`, err.message);
        errorsList.push(`Row ${row.rowNum} (${row.email}): ${err.message}`);
      }
    }

    setImportProgress((prev) =>
      prev
        ? {
            ...prev,
            successCount: successes,
            errors: errorsList
          }
        : null
    );

    setImporting(false);
    await loadData();
    
    if (errorsList.length === 0) {
      toast.success(`Successfully imported all ${successes} members!`);
    } else if (successes > 0) {
      toast.info(`Import complete. Imported ${successes} of ${importPreviewData.length} members with some errors.`);
    } else {
      toast.error("Failed to import any members. Check row details or email registration conflicts.");
    }
  };

  // Create single member manually
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail || !newMemberPassword) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }

    setActionLoading(true);
    try {
      const { data: existingProfile, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newMemberEmail.trim())
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingProfile) {
        toast.error("A user profile with this email address already exists in the system.");
        setActionLoading(false);
        return;
      }

      let expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      const { data: newUserId, error: rpcError } = await supabase.rpc("admin_import_member", {
        p_email: newMemberEmail.trim(),
        p_password: newMemberPassword,
        p_full_name: newMemberName.trim(),
        p_company_name: newMemberCompany.trim() || null,
        p_membership_type: newMemberPlan,
        p_phone: newMemberPhone.trim() || null,
        p_business_address: newMemberAddress.trim() || null,
        p_expires_at: expiryDate.toISOString()
      });

      if (rpcError) throw rpcError;

      setCreatedCreds({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        pass: newMemberPassword,
      });

      setNewMemberName("");
      setNewMemberEmail("");
      setNewMemberCompany("");
      setNewMemberPlan("individual");
      setNewMemberPhone("");
      setNewMemberAddress("");
      setNewMemberCategory("Retail");
      setNewMemberPassword("");

      setShowMemberModal(false);
      setShowCredsModal(true);
      
      await loadData();
      toast.success("Member account created successfully!");
    } catch (err: any) {
      toast.error("Error creating member: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update member details / expiry date
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setActionLoading(true);
    try {
      const updateData: any = {
        full_name: newMemberName.trim() || null,
        membership_status: newMemberPlan, 
        membership_type: newMemberCategory || null, 
        company_name: newMemberCompany.trim() || null,
        phone: newMemberPhone.trim() || null,
        expires_at: editMemberExpiresAt ? new Date(editMemberExpiresAt).toISOString() : null,
      };

      if (newMemberPlan === "active" && editingMember.membership_status !== "active" && !editMemberExpiresAt) {
        let expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        updateData.expires_at = expiryDate.toISOString();
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", editingMember.id);

      if (profileError) throw profileError;

      if (newMemberPlan === "active" && newMemberCompany.trim()) {
        const { data: existingListings } = await supabase
          .from("business_directory")
          .select("id")
          .eq("user_id", editingMember.id)
          .limit(1);

        const existingListing = existingListings && existingListings.length > 0 ? existingListings[0] : null;

        if (!existingListing) {
          const { error: dirError } = await supabase
            .from("business_directory")
            .insert({
              user_id: editingMember.id,
              business_name: newMemberCompany.trim(),
              description: `Registered Chamber Member business specializing in retail.`,
              contact_email: editingMember.email,
              contact_phone: newMemberPhone.trim() || null,
              category: "Retail",
              address: "Talisay City",
              is_verified: false,
              is_featured: false,
              approval_status: "approved",
              pending_changes: null
            });
          if (dirError) console.error("Error creating auto-directory listing on update:", dirError.message);
        }
      }

      setShowEditMemberModal(false);
      setEditingMember(null);
      await loadData();
      toast.success("Member details updated successfully!");
    } catch (err: any) {
      toast.error("Error updating member details: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMemberClick = async (member: Profile) => {
    setEditingMember(member);
    setNewMemberName(member.full_name || "");
    setNewMemberCompany(member.company_name || "");
    setNewMemberPhone(member.phone || "");
    setNewMemberCategory(member.membership_type || "individual"); // stores plan when editing
    setNewMemberPlan(member.membership_status || "active"); // stores status when editing
    
    if (member.expires_at) {
      setEditMemberExpiresAt(new Date(member.expires_at).toISOString().split("T")[0]);
    } else {
      setEditMemberExpiresAt("");
    }
    
    // Fetch their package credits
    setMemberCredits([]);
    setCreditsLoading(true);
    setShowEditMemberModal(true);
    try {
      const { data, error } = await supabase
        .from("member_package_credits")
        .select("*")
        .eq("user_id", member.id);
      if (!error && data) {
        setMemberCredits(data);
      }
    } catch (err) {
      console.error("Error loading member credits:", err);
    } finally {
      setCreditsLoading(false);
    }
  };

  const handleToggleCreditActive = async (creditId: string, currentStatus: boolean, memberId: string) => {
    try {
      const { error } = await supabase
        .from("member_package_credits")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", creditId);
      if (error) throw error;
      toast.success(currentStatus ? "Pass disabled." : "Pass enabled.");
      
      // Refetch credits
      const { data } = await supabase
        .from("member_package_credits")
        .select("*")
        .eq("user_id", memberId);
      if (data) setMemberCredits(data);
    } catch (err: any) {
      toast.error("Failed to update credit status: " + err.message);
    }
  };

  // Filter Members
  const filteredProfiles = profiles.filter((p) => {
    if (p.membership_status === "none" && memberStatusFilter !== "all") return false;

    const matchesSearch = 
      [p.full_name, p.email, p.company_name].join(" ").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesPlan = memberPlanFilter === "all" || p.membership_type === memberPlanFilter;

    if (memberStatusFilter === "active") return matchesSearch && matchesPlan && p.membership_status === "active";
    if (memberStatusFilter === "pending") return matchesSearch && matchesPlan && p.membership_status === "pending";
    if (memberStatusFilter === "expired") {
      return matchesSearch && matchesPlan && (p.membership_status === "expired" || p.membership_status === "rejected");
    }

    return matchesSearch && matchesPlan && p.membership_status !== "none";
  });

  const totalMemberFilteredCount = filteredProfiles.length;
  const totalMemberPages = Math.ceil(totalMemberFilteredCount / memberRowsPerPage) || 1;
  const paginatedMembers = filteredProfiles.slice(
    (memberCurrentPage - 1) * memberRowsPerPage,
    memberCurrentPage * memberRowsPerPage
  );

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-heading font-black text-white">Chamber Members</h3>
            <div className="flex gap-1.5 mt-2">
              {[
                { id: "all", label: `All (${profiles.filter(p => p.membership_status !== "none").length})` },
                { id: "active", label: `Active (${profiles.filter(p => p.membership_status === "active").length})` },
                { id: "pending", label: `Pending (${profiles.filter(p => p.membership_status === "pending").length})` },
                { id: "expired", label: `Expired (${profiles.filter(p => p.membership_status === "expired" || p.membership_status === "rejected").length})` },
              ].map(({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setMemberStatusFilter(id as any)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                    memberStatusFilter === id
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
                placeholder="Search member..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white placeholder-gray-500 font-semibold"
              />
            </div>
            <select
              value={memberPlanFilter}
              onChange={(e) => setMemberPlanFilter(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white font-semibold cursor-pointer"
            >
              <option value="all">All Plans</option>
              <option value="individual">Small Plan</option>
              <option value="sme">Medium Plan</option>
              <option value="corporate">Large Plan</option>
              <option value="enterprise">Enterprise Plan</option>
              <option value="associate">Associate Plan</option>
            </select>
            <button
              onClick={() => {
                setNewMemberName("");
                setNewMemberEmail("");
                setNewMemberCompany("");
                setNewMemberPlan("individual");
                setNewMemberPhone("");
                setNewMemberAddress("");
                setNewMemberCategory("Retail");
                const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                let pass = "TC-";
                for (let i = 0; i < 8; i++) {
                  pass += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                setNewMemberPassword(pass);
                setCreatedCreds(null);
                setShowMemberModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus size={14} /> Add Member
            </button>

            <button
              onClick={() => {
                setImportFile(null);
                setImportPreviewData([]);
                setImportProgress(null);
                setImporting(false);
                setShowImportModal(true);
              }}
              className="w-full sm:w-auto px-4 py-2 rounded-xl border border-white/10 hover:bg-white/5 text-gray-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload size={14} /> Import from Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
                <th className="pb-4.5 pl-2">Member details</th>
                <th className="pb-4.5">Membership Plan</th>
                <th className="pb-4.5">Status</th>
                <th className="pb-4.5">Company / phone</th>
                <th className="pb-4.5">Joined Date</th>
                <th className="pb-4.5 text-right pr-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-semibold">
              {paginatedMembers.map((item) => {
                const isExpired = item.expires_at ? new Date(item.expires_at) < new Date() : false;
                return (
                  <tr key={item.id} className="hover:bg-white/[0.01]">
                    <td className="py-4.5 pl-2">
                      <div className="text-white font-bold">{item.full_name || "Name not set"}</div>
                      <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{item.email}</div>
                    </td>
                    <td className="py-4.5">
                      {item.membership_type ? getPlanDisplayName(item.membership_type) : "None"}
                    </td>
                    <td className="py-4.5">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                        item.membership_status === "active" && !isExpired
                          ? "bg-green-500/10 text-green-400 border border-green-500/25"
                          : isExpired || item.membership_status === "expired"
                          ? "bg-red-500/10 text-red-400 border border-red-500/25"
                          : item.membership_status === "pending"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                          : "bg-white/5 text-gray-400 border border-white/10"
                      }`}>
                        {isExpired ? "Expired" : item.membership_status}
                      </span>
                    </td>
                    <td className="py-4.5 text-gray-300">
                      <div>{item.company_name || "Individual"}</div>
                      <div className="text-[10px] text-[#8A9690] font-normal mt-0.5">{item.phone || "-"}</div>
                    </td>
                    <td className="py-4.5 text-gray-300 font-normal">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                    </td>
                    <td className="py-4.5 text-right pr-2">
                      <button
                        onClick={() => handleEditMemberClick(item)}
                        className="px-2.5 py-1 rounded bg-[#1A382A] hover:bg-[#204936] text-[#ECEFEF] text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <Edit2 size={11} /> Edit Details
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredProfiles.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-500">
                    No members match selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalMemberFilteredCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-white/5 text-[11px] text-[#8A9690]">
            <div className="flex items-center gap-2 font-semibold">
              <span>Rows per page:</span>
              <select
                value={memberRowsPerPage}
                onChange={(e) => {
                  setMemberRowsPerPage(Number(e.target.value));
                  setMemberCurrentPage(1);
                }}
                className="px-2 py-1 bg-[#101D17] border border-white/10 rounded-lg text-white font-bold cursor-pointer outline-none focus:border-green-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[11px] text-[#8A9690]">
                Showing {Math.min(totalMemberFilteredCount, (memberCurrentPage - 1) * memberRowsPerPage + 1)} - {Math.min(totalMemberFilteredCount, memberCurrentPage * memberRowsPerPage)} of {totalMemberFilteredCount} members
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMemberCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={memberCurrentPage === 1}
                className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              
              {Array.from({ length: totalMemberPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalMemberPages || Math.abs(p - memberCurrentPage) <= 1)
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && <span className="px-1 text-gray-600">...</span>}
                      <button
                        onClick={() => setMemberCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          memberCurrentPage === p
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
                onClick={() => setMemberCurrentPage(prev => Math.min(totalMemberPages, prev + 1))}
                disabled={memberCurrentPage === totalMemberPages}
                className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-heading font-black text-white text-lg">Add New Chamber Member</h3>
                <button
                  onClick={() => setShowMemberModal(false)}
                  className="p-1 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateMember} className="space-y-4 text-xs font-semibold text-gray-300">
                <div>
                  <label className="block text-[#8A9690] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. Maria Clara"
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      placeholder="e.g. maria@clara.com"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Account Password *</label>
                    <input
                      type="text"
                      required
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Company / Business Name</label>
                    <input
                      type="text"
                      value={newMemberCompany}
                      onChange={(e) => setNewMemberCompany(e.target.value)}
                      placeholder="e.g. Clara Boutique"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="e.g. +639171234567"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Chamber Plan</label>
                    <select
                      value={newMemberPlan}
                      onChange={(e) => setNewMemberPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    >
                      <option value="individual">Small Plan</option>
                      <option value="sme">Medium Plan</option>
                      <option value="corporate">Large Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                      <option value="associate">Associate Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Industry Sector</label>
                    <select
                      value={newMemberCategory}
                      onChange={(e) => setNewMemberCategory(e.target.value)}
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
                  <div>
                    <label className="block text-[#8A9690] mb-1">Location / Address</label>
                    <input
                      type="text"
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      placeholder="e.g. Talisay City, Cebu"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Create Account"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowMemberModal(false)}
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

      {/* CREDENTIALS SUCCESS DISPLAY MODAL */}
      <AnimatePresence>
        {showCredsModal && createdCreds && (
          <div className="fixed inset-0 z-[130] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0A1410] border border-white/10 rounded-3xl p-6 text-left"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-950/50 border border-green-800/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-400">
                  <UserCheck size={24} />
                </div>
                <h3 className="font-heading font-black text-white text-base">Member Created Successfully</h3>
                <p className="text-[10px] text-gray-500 mt-1">Copy these credentials. The password is only displayed once.</p>
              </div>

              <div className="space-y-3.5 text-xs font-semibold text-gray-300 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold">Full Name</span>
                  <span className="text-white font-bold block mt-0.5">{createdCreds.name}</span>
                </div>
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold">Email Address</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-white font-mono">{createdCreds.email}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdCreds.email);
                        toast.success("Email copied to clipboard!");
                      }}
                      className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold">Temporary Password</span>
                  <div className="flex justify-between items-center mt-0.5">
                    <span className="text-amber-400 font-mono font-bold text-sm">{createdCreds.pass}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdCreds.pass);
                        toast.success("Password copied to clipboard!");
                      }}
                      className="p-1 hover:bg-white/5 rounded text-gray-400 hover:text-white transition-all cursor-pointer"
                    >
                      <Copy size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowCredsModal(false);
                  setCreatedCreds(null);
                }}
                className="w-full py-2.5 mt-6 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors text-xs text-center block"
              >
                Close & Continue
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT EXPR/MEMBER MODAL */}
      <AnimatePresence>
        {showEditMemberModal && editingMember && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6 flex items-center gap-2">
                <Edit2 className="text-green-400" size={18} />
                Edit Member Details
              </h3>

              <form onSubmit={handleUpdateMember} className="space-y-4 text-xs font-semibold text-gray-300">
                <div>
                  <label className="block text-[#8A9690] mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="e.g. Maria Clara"
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Company / Business Name</label>
                    <input
                      type="text"
                      value={newMemberCompany}
                      onChange={(e) => setNewMemberCompany(e.target.value)}
                      placeholder="e.g. Clara Boutique"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={newMemberPhone}
                      onChange={(e) => setNewMemberPhone(e.target.value)}
                      placeholder="e.g. +639171234567"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Membership Plan</label>
                    <select
                      value={newMemberCategory} // acts as plan when editing
                      onChange={(e) => setNewMemberCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    >
                      <option value="individual">Small Plan</option>
                      <option value="sme">Medium Plan</option>
                      <option value="corporate">Large Plan</option>
                      <option value="enterprise">Enterprise Plan</option>
                      <option value="associate">Associate Plan</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Membership Status</label>
                    <select
                      value={newMemberPlan} // acts as status when editing
                      onChange={(e) => setNewMemberPlan(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending</option>
                      <option value="expired">Expired</option>
                      <option value="rejected">Rejected</option>
                      <option value="none">None (Remove Membership)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-bold">Membership Expiry Date</label>
                  <input
                    type="date"
                    value={editMemberExpiresAt}
                    onChange={(e) => setEditMemberExpiresAt(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors font-semibold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">Leave blank or modify to set when this membership will expire.</p>
                </div>

                {/* Package Credits Section */}
                <div className="pt-4 border-t border-white/5 space-y-3">
                  <h4 className="font-heading font-black text-white text-xs flex items-center gap-1.5">
                    <Sparkles className="text-amber-400" size={14} />
                    Active Package Passes / Credits
                  </h4>
                  {creditsLoading ? (
                    <div className="flex items-center gap-2 text-gray-500 py-1 text-xs">
                      <Loader2 className="animate-spin" size={12} /> Loading credit balances...
                    </div>
                  ) : memberCredits.length > 0 ? (
                    <div className="space-y-2">
                      {memberCredits.map((credit) => (
                        <div key={credit.id} className={`p-3 border rounded-xl flex items-center justify-between ${
                          credit.is_active !== false ? "bg-white/[0.02] border-white/5" : "bg-red-950/10 border-red-500/10 opacity-70"
                        }`}>
                          <div className="space-y-1">
                            <p className="text-white text-[11px] font-bold">{credit.package_name}</p>
                            <p className="text-[10px] text-[#8A9690] capitalize">Benefit: {credit.benefit_type.replace("_", " ")}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                                credit.is_active !== false
                                  ? "text-green-400 bg-green-500/10 border-green-500/25"
                                  : "text-red-400 bg-red-500/10 border-red-500/25"
                              }`}>
                                {credit.is_active !== false ? "Active" : "Disabled"}
                              </span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2">
                            <span className="text-xs font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              {credit.remaining_credits} / {credit.total_credits} Remaining
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleCreditActive(credit.id, credit.is_active !== false, editingMember.id)}
                              className="px-2 py-1 bg-white/5 hover:bg-white/10 text-white rounded text-[10px] font-bold cursor-pointer transition-colors border border-white/10"
                            >
                              {credit.is_active !== false ? "Disable passes" : "Enable passes"}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-[10px] italic">No active package session credits for this member.</p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? <Loader2 className="animate-spin" size={14} /> : "Save Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditMemberModal(false);
                      setEditingMember(null);
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

      {/* EXCEL IMPORT MODAL */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
                <div>
                  <h3 className="font-heading font-black text-white text-lg flex items-center gap-2">
                    <Upload className="text-green-400" size={20} />
                    Import Members from Excel / CSV
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-1">
                    Upload a spreadsheet with member details to bulk register them.
                  </p>
                </div>
                <button
                  onClick={() => setShowImportModal(false)}
                  disabled={importing}
                  className="p-1.5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4 text-xs text-gray-300">
                <div className="p-4.5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <label className="block text-[#8A9690] mb-1 font-bold">Default Temporary Password *</label>
                    <input
                      type="text"
                      required
                      value={importTempPassword}
                      onChange={(e) => setImportTempPassword(e.target.value)}
                      placeholder="Temporary password for all"
                      disabled={importing}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors font-semibold"
                    />
                    <p className="text-[10px] text-gray-500 mt-1">Users will use this password to log in for the first time. You can set the membership expiration date for each member individually from the members list after the import is complete.</p>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1 font-bold">Upload File (.xlsx, .xls, .csv)</label>
                  <div className="flex items-center gap-4">
                    <label
                      htmlFor="member-excel-upload"
                      className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-[#101D17] hover:bg-[#152F24] border border-white/10 hover:border-green-500 rounded-xl text-white text-xs transition-colors flex-1 text-center font-bold"
                    >
                      <Upload size={14} />
                      {importFile ? importFile.name : "Select Excel/CSV Document"}
                    </label>
                    <input
                      id="member-excel-upload"
                      type="file"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileChange}
                      disabled={importing}
                      className="hidden"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1">
                    Columns should ideally include: <strong>Full Name</strong> (or Name), <strong>Email</strong>, and optionally: Company Name, Phone, Address, Tier.
                  </p>
                </div>

                {importProgress && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-[#8A9690]">Import Status:</span>
                      <span className="text-white">
                        {importProgress.current} / {importProgress.total} processed ({importProgress.successCount} successful)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                    {importProgress.errors.length > 0 && (
                      <div className="space-y-1 mt-2">
                        <span className="text-red-400 font-bold block">Encountered Errors:</span>
                        <div className="max-h-24 overflow-y-auto bg-red-950/20 border border-red-500/10 rounded-xl p-2.5 text-[10px] text-red-300 font-mono space-y-1">
                          {importProgress.errors.map((err, i) => (
                            <div key={i}>{err}</div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {importPreviewData.length > 0 && !importing && !importProgress && (
                  <div>
                    <label className="block text-[#8A9690] mb-2 font-bold">Parsed Members Preview ({importPreviewData.length} records)</label>
                    <div className="overflow-x-auto border border-white/5 rounded-2xl max-h-48">
                      <table className="w-full text-left text-[11px] font-normal border-collapse">
                        <thead>
                          <tr className="bg-white/[0.02] border-b border-white/5 text-[#8A9690] font-bold uppercase">
                            <th className="p-2.5">Name</th>
                            <th className="p-2.5">Email</th>
                            <th className="p-2.5">Company</th>
                            <th className="p-2.5 text-center">Tier</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreviewData.map((row, idx) => (
                            <tr key={idx} className="border-b border-white/5 text-gray-300 hover:bg-white/[0.01]">
                              <td className="p-2.5 font-semibold text-white">{row.fullName}</td>
                              <td className="p-2.5 font-mono">{row.email}</td>
                              <td className="p-2.5">{row.companyName || "-"}</td>
                              <td className="p-2.5 text-center">
                                <span className="capitalize px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-semibold border border-green-500/20">
                                  {row.tier}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex gap-2.5 pt-4 border-t border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={handleStartImport}
                    disabled={importing || importPreviewData.length === 0}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-diffuse text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? <Loader2 className="animate-spin" size={14} /> : "Start Member Import"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    disabled={importing}
                    className="px-4 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer text-xs"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
