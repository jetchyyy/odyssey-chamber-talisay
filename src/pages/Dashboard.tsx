import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Profile } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabase";

import { 
  User, Building2, CheckCircle2, Shield, CalendarDays, 
  MapPin, Loader2, ArrowRight, QrCode, Phone, Map, 
  Globe, Mail, CreditCard, LogOut, Download, Newspaper, Plus, Trash2, Edit2, X,
  Camera, Upload, Key
} from "lucide-react";
import { uploadImage } from "../lib/storage";

interface PricingPlan {
  id: string;
  type: string;
  name: string;
  price: number;
  period: string;
  description: string;
  benefits: string[];
}

interface PaymentQR {
  id: string;
  name: string;
  description: string;
  payment_instructions: string;
  qr_code_url: string;
}

interface RegisteredEvent {
  id: string;
  event_id: string;
  full_name: string;
  email: string;
  payment_status: string;
  attendance_status: string;
  qr_code: string;
  events: {
    title: string;
    date: string;
    time: string;
    venue: string;
  };
}

const getPlanDisplayName = (type: string | null | undefined): string => {
  if (!type) return "None";
  switch (type.toLowerCase()) {
    case "individual": return "Small";
    case "sme": return "Medium";
    case "corporate": return "Large";
    default: return type.charAt(0).toUpperCase() + type.slice(1);
  }
};

const Dashboard: React.FC = () => {
  const { user, profile, loading, logout, refetchProfile, isAdmin } = useAuth();
  const { toast } = useNotification();
  const navigate = useNavigate();

  // Application workflow states
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentQR[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentQR | null>(null);
  
  // Form input states
  const [companyName, setCompanyName] = useState(profile?.company_name || "");
  const [businessCategory, setBusinessCategory] = useState(() => {
    const cat = profile?.business_category || "";
    if (cat && !["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(cat)) {
      return "Other";
    }
    return cat;
  });
  const [otherCategoryText, setOtherCategoryText] = useState(() => {
    const cat = profile?.business_category || "";
    if (cat && !["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(cat)) {
      return cat;
    }
    return "";
  });
  const [businessAddress, setBusinessAddress] = useState(profile?.business_address || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  
  // Directory listing states
  const [hasListing, setHasListing] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [dirName, setDirName] = useState("");
  const [dirDesc, setDirDesc] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPhone, setDirPhone] = useState("");
  const [dirWeb, setDirWeb] = useState("");
  const [dirCat, setDirCat] = useState("");
  const [dirOtherCatText, setDirOtherCatText] = useState("");
  const [dirAddress, setDirAddress] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending_approval">("approved");

  // Sync profile fields when dynamic profile loads
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setBusinessAddress(profile.business_address || "");
      setPhone(profile.phone || "");
      const cat = profile.business_category || "";
      if (cat) {
        if (["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(cat)) {
          setBusinessCategory(cat);
          setOtherCategoryText("");
        } else {
          setBusinessCategory("Other");
          setOtherCategoryText(cat);
        }
      } else {
        setBusinessCategory("");
        setOtherCategoryText("");
      }
    }
  }, [profile]);
  
  // Loader and query states
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"card" | "events" | "directory" | "news" | "settings">("card");

  // Password change states
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Renewal states
  const [hasPendingRenewal, setHasPendingRenewal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalPlan, setRenewalPlan] = useState<PricingPlan | null>(null);
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState("");
  const [renewalPaymentRef, setRenewalPaymentRef] = useState("");
  const [renewalSelectedPayment, setRenewalSelectedPayment] = useState<PaymentQR | null>(null);

  // Payment proof states
  const [appPaymentProofFile, setAppPaymentProofFile] = useState<File | null>(null);
  const [appPaymentProofPreview, setAppPaymentProofPreview] = useState("");
  const [renewalPaymentProofFile, setRenewalPaymentProofFile] = useState<File | null>(null);
  const [renewalPaymentProofPreview, setRenewalPaymentProofPreview] = useState("");

  // News Submission states
  const [myNews, setMyNews] = useState<any[]>([]);
  const [showNewsSubmitModal, setShowNewsSubmitModal] = useState(false);
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsCategory, setNewsCategory] = useState("General");
  const [newsImg, setNewsImg] = useState("");
  const [newsImgFile, setNewsImgFile] = useState<File | null>(null);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (isAdmin) {
        navigate("/admin");
      }
    }
  }, [user, isAdmin, loading, navigate]);

  // Load plans, payments, registered events, and directory listings
  useEffect(() => {
    if (!user) return;

    const loadData = async () => {
      // 1. Fetch CMS plans
      const { data: plansData } = await supabase
        .from("membership_pricing")
        .select("*")
        .eq("is_active", true);
      if (plansData) setPlans(plansData);

      // 2. Fetch active QR payment details
      const { data: qrData } = await supabase
        .from("qr_settings")
        .select("*")
        .eq("is_active", true);
      if (qrData) {
        setPaymentMethods(qrData);
        if (qrData.length > 0) {
          setSelectedPayment(qrData[0]);
          setPaymentMethodName(qrData[0].name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
        }
      }

      // 3. Fetch user registered events
      const { data: eventsData } = await supabase
        .from("event_registrations")
        .select(`
          id,
          event_id,
          full_name,
          email,
          payment_status,
          attendance_status,
          qr_code,
          events (
            title,
            date,
            time,
            venue
          )
        `)
        .eq("user_id", user.id);
      if (eventsData) setRegisteredEvents(eventsData as any);

      // 4. Check if directory listing already exists
      const { data: dirDataList } = await supabase
        .from("business_directory")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);

      const dirData = dirDataList && dirDataList.length > 0 ? dirDataList[0] : null;

      if (dirData) {
        setHasListing(true);
        setListingId(dirData.id);
        const isPending = dirData.approval_status === "pending_approval" && dirData.pending_changes;
        const displayData = isPending ? dirData.pending_changes : dirData;

        setDirName(displayData.business_name || "");
        setDirDesc(displayData.description || "");
        setDirEmail(displayData.contact_email || "");
        setDirPhone(displayData.contact_phone || "");
        setDirWeb(displayData.website_url || "");
        const categoryVal = displayData.category || "";
        if (categoryVal) {
          if (["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(categoryVal)) {
            setDirCat(categoryVal);
            setDirOtherCatText("");
          } else {
            setDirCat("Other");
            setDirOtherCatText(categoryVal);
          }
        } else {
          setDirCat("");
          setDirOtherCatText("");
        }
        setDirAddress(displayData.address || "");
        setApprovalStatus(dirData.approval_status || "approved");
      } else {
        // Prefill directory fields with profile data if available
        setDirName(profile?.company_name || "");
        setDirPhone(profile?.phone || "");
        setDirEmail(profile?.email || "");
        const categoryVal = profile?.business_category || "";
        if (categoryVal) {
          if (["Retail", "Construction", "Food & Beverage", "Professional Services", "Healthcare", "IT & Tech", "Logistics", "Agriculture"].includes(categoryVal)) {
            setDirCat(categoryVal);
            setDirOtherCatText("");
          } else {
            setDirCat("Other");
            setDirOtherCatText(categoryVal);
          }
        } else {
          setDirCat("");
          setDirOtherCatText("");
        }
        setDirAddress(profile?.business_address || "");
        setApprovalStatus("approved");
      }

      // 5. Fetch user's news submissions
      const { data: newsData } = await supabase
        .from("news")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (newsData) setMyNews(newsData);

      // 6. Check if renewal/membership application is pending
      const { data: pendingApp } = await supabase
        .from("membership_applications")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .limit(1);
      setHasPendingRenewal(!!(pendingApp && pendingApp.length > 0));
    };

    loadData();
  }, [user, profile]);

  const handleSelectPlan = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setFormError(null);
  };

  const handleSelectPayment = (pay: PaymentQR) => {
    setSelectedPayment(pay);
    setPaymentMethodName(pay.name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
  };

  // Submit Membership Application
  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    if (!selectedPlan) {
      setFormError("Please select a membership plan.");
      return;
    }
    if (!paymentReference) {
      setFormError("Please fill in your payment reference number.");
      return;
    }
    if (!appPaymentProofFile) {
      setFormError("Please upload an image of your payment receipt as proof.");
      return;
    }

    setActionLoading(true);
    setFormError(null);

    const finalCategory = businessCategory === "Other" ? otherCategoryText.trim() : businessCategory;
    if (!finalCategory) {
      setFormError("Please select a business category or specify one.");
      setActionLoading(false);
      return;
    }

    try {
      // Upload proof of payment first
      const proofUrl = await uploadImage(appPaymentProofFile, "payment-proofs");

      // 1. Create membership application
      const { error: appError } = await supabase
        .from("membership_applications")
        .insert({
          user_id: user.id,
          membership_type: selectedPlan.type,
          company_name: companyName,
          business_category: finalCategory,
          phone: phone,
          business_address: businessAddress,
          payment_method: paymentMethodName,
          payment_reference: paymentReference,
          payment_proof_url: proofUrl,
          status: "pending",
          payment_status: "pending",
        });

      if (appError) throw appError;

      // 2. Update profile state to pending
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          membership_status: "pending",
          membership_type: selectedPlan.type,
          company_name: companyName,
          business_category: finalCategory,
          phone: phone,
          business_address: businessAddress,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      await refetchProfile();
      setSelectedPlan(null);
      setAppPaymentProofFile(null);
      setAppPaymentProofPreview("");
    } catch (err: any) {
      setFormError(err.message || "Failed to submit application.");
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Renewal Payment Application
  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const planToRenew = renewalPlan || plans.find(p => p.type === profile.membership_type);
    if (!planToRenew) {
      toast.error("Please select a membership plan for renewal.");
      return;
    }
    if (!renewalPaymentRef) {
      toast.error("Please fill in your payment reference number.");
      return;
    }
    if (!renewalPaymentProofFile) {
      toast.error("Please upload an image of your payment receipt as proof.");
      return;
    }

    setActionLoading(true);
    try {
      // Upload proof of payment first
      const proofUrl = await uploadImage(renewalPaymentProofFile, "payment-proofs");

      const { error: appError } = await supabase
        .from("membership_applications")
        .insert({
          user_id: user.id,
          membership_type: planToRenew.type,
          company_name: profile.company_name,
          business_category: profile.business_category,
          phone: profile.phone,
          business_address: profile.business_address,
          payment_method: renewalPaymentMethod || (paymentMethods.length > 0 ? (paymentMethods[0].name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer") : "gcash"),
          payment_reference: renewalPaymentRef,
          payment_proof_url: proofUrl,
          status: "pending",
          payment_status: "pending",
        });

      if (appError) throw appError;

      setHasPendingRenewal(true);
      setShowRenewalModal(false);
      setRenewalPaymentRef("");
      setRenewalPaymentProofFile(null);
      setRenewalPaymentProofPreview("");
      toast.success("Renewal payment reference and proof submitted! Our admin team will verify it soon.");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit renewal application.");
    } finally {
      setActionLoading(false);
    }
  };

  // Password validation constraints
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;

  const strengthScore = [
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial
  ].filter(Boolean).length;

  const getStrengthLabel = () => {
    if (!newPassword) return "";
    if (strengthScore <= 2) return "Weak";
    if (strengthScore <= 4) return "Fair";
    return "Strong";
  };

  const getStrengthColor = () => {
    if (strengthScore <= 2) return "bg-red-500";
    if (strengthScore <= 4) return "bg-amber-500";
    return "bg-green-600";
  };

  // Change User Password
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;

    if (!oldPassword) {
      toast.error("Please enter your current password.");
      return;
    }

    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    if (!allCriteriaMet) {
      toast.error("Please satisfy all password strength criteria.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("Passwords do not match.");
      return;
    }

    setIsChangingPassword(true);
    try {
      // 1. Silent re-authentication to verify old password
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: profile.email || user.email || "",
        password: oldPassword,
      });

      if (verifyError) {
        throw new Error("Verification failed: The old password you entered is incorrect.");
      }

      // 2. Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast.success("Password updated successfully!");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Create or Update Business Directory Listing
  const handleSaveDirectoryListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!dirName || !dirDesc || !dirCat || !dirAddress) {
      setFormError("Please fill in all required fields marked with *.");
      return;
    }

    const finalDirCategory = dirCat === "Other" ? dirOtherCatText.trim() : dirCat;
    if (!finalDirCategory) {
      setFormError("Please select a category or specify one.");
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      if (hasListing && listingId) {
        const listingData = {
          pending_changes: {
            business_name: dirName,
            description: dirDesc,
            contact_email: dirEmail,
            contact_phone: dirPhone,
            website_url: dirWeb,
            category: finalDirCategory,
            address: dirAddress,
          },
          approval_status: "pending_approval",
        };

        const { error } = await supabase
          .from("business_directory")
          .update(listingData)
          .eq("id", listingId);
        if (error) throw error;
        
        setApprovalStatus("pending_approval");
        toast.success("Proposed edits submitted for administrator approval!");
      } else {
        setFormError("Under the new Chamber policy, only administrators can register new business listings. Please contact support.");
      }
    } catch (err: any) {
      setFormError(err.message || "Failed to save directory listing.");
    } finally {
      setActionLoading(false);
    }
  };

  const resetNewsForm = () => {
    setNewsTitle("");
    setNewsSummary("");
    setNewsContent("");
    setNewsCategory("General");
    setNewsImg("");
    setNewsImgFile(null);
    setEditingNews(null);
  };

  const handleSaveNewsSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newsTitle.trim() || !newsSummary.trim() || !newsContent.trim()) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setActionLoading(true);
    setFormError(null);

    try {
      let finalImgUrl = newsImg;
      if (newsImgFile) {
        finalImgUrl = await uploadImage(newsImgFile, "news");
      }

      const wordCount = newsContent.trim().split(/\s+/).length;
      const readTimeVal = `${Math.max(1, Math.round(wordCount / 200))} min`;

      const newsData = {
        title: newsTitle.trim(),
        summary: newsSummary.trim(),
        content: newsContent.trim(),
        category: newsCategory,
        image_url: finalImgUrl || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=700&auto=format&fit=crop",
        author: profile.full_name || "Chamber Member",
        user_id: user.id,
        status: "pending",
        read_time: readTimeVal
      };

      if (editingNews) {
        if (editingNews.status !== "pending") {
          throw new Error("You can only edit articles that are pending approval.");
        }
        const { error } = await supabase
          .from("news")
          .update(newsData)
          .eq("id", editingNews.id);
        if (error) throw error;
        toast.success("News submission updated successfully!");
      } else {
        const { error } = await supabase
          .from("news")
          .insert(newsData);
        if (error) throw error;
        toast.success("News article submitted for review!");
      }

      setShowNewsSubmitModal(false);
      resetNewsForm();
      
      const { data: updatedNews } = await supabase
        .from("news")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (updatedNews) setMyNews(updatedNews);

    } catch (err: any) {
      setFormError(err.message || "Failed to submit news article.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditNewsClick = (item: any) => {
    if (item.status !== "pending") {
      toast.error("You can only edit submissions that are pending review.");
      return;
    }
    setEditingNews(item);
    setNewsTitle(item.title);
    setNewsSummary(item.summary);
    setNewsContent(item.content);
    setNewsCategory(item.category);
    setNewsImg(item.image_url || "");
    setNewsImgFile(null);
    setShowNewsSubmitModal(true);
  };

  const handleDeleteNewsSubmission = async (id: string) => {
    const confirmed = window.confirm("Are you sure you want to delete this submission?");
    if (!confirmed) return;

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("news")
        .delete()
        .eq("id", id)
        .eq("user_id", user?.id || "");
      if (error) throw error;

      toast.success("Submission deleted.");
      setMyNews(prev => prev.filter(n => n.id !== id));
    } catch (err: any) {
      toast.error("Failed to delete submission: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPass = async (qrCodeText: string, eventTitle: string) => {
    try {
      const response = await fetch(`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(qrCodeText)}&size=300x300`);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeTitle = eventTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
      link.download = `chamber_pass_${safeTitle}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Check-in pass downloaded successfully! You can present this QR image at the venue check-in.");
    } catch (err: any) {
      toast.error("Failed to download pass image: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf6]">
        <Loader2 size={36} className="animate-spin text-green-700" />
      </div>
    );
  }

  const checkNearExpiration = () => {
    if (!profile?.expires_at) return { isNear: false, isExpired: false, daysLeft: 0 };
    const expiry = new Date(profile.expires_at);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return {
      isNear: diffDays <= 30,
      isExpired: diffDays <= 0,
      daysLeft: diffDays
    };
  };

  const { isNear: isNearExp, isExpired: isExpiredExp, daysLeft: daysLeftExp } = checkNearExpiration();

  return (
    <div className="min-h-screen bg-[#fbfaf6] pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto">
      {/* Header Profile Dashboard */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 bg-white rounded-3xl p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.02)] border border-gray-100">
        <div className="flex items-center gap-4.5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center text-white text-xl font-heading font-black">
            {profile?.full_name?.substring(0, 2).toUpperCase() || "MB"}
          </div>
          <div>
            <h1 className="text-2xl font-heading font-black text-gray-900 leading-tight">
              {profile?.full_name || "Talisay Chamber Member"}
            </h1>
            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1.5">
              <Mail size={13} /> {profile?.email}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {profile?.role === "admin" && (
            <button
              onClick={() => navigate("/admin")}
              className="btn-premium bg-emerald-800 hover:bg-emerald-700 text-white text-xs !py-2.5 !px-4 shadow-diffuse cursor-pointer"
            >
              Admin Portal <ArrowRight size={13} />
            </button>
          )}
          <button
            onClick={() => logout()}
            className="px-4 py-2.5 rounded-full border border-gray-200 hover:bg-red-50 hover:text-red-700 text-gray-600 text-xs font-semibold flex items-center gap-1.5 spring-fast cursor-pointer"
          >
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </div>

      {/* RENDER MEMBERSHIP APPLICATION WORKFLOW (IF STATUS IS NONE) */}
      {profile?.membership_status === "none" && (
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Step 1: Select Plan */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
              <span className="label-pill mb-3 inline-flex">Step 1</span>
              <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Select a Membership Plan</h2>
              <p className="text-sm text-gray-500 mb-8">
                Choose the plan that suits your business profile. Tiers are defined below.
              </p>

              <div className="grid sm:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    onClick={() => handleSelectPlan(plan)}
                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col ${
                      selectedPlan?.id === plan.id
                        ? "border-green-700 bg-green-50/20"
                        : "border-gray-100 hover:border-green-200 bg-white"
                    }`}
                  >
                    <span className="text-[10px] font-heading font-bold uppercase tracking-wider text-gray-400 mb-1">
                      {plan.name}
                    </span>
                    <span className="text-xl font-heading font-black text-gray-900 mb-2">
                      PHP {plan.price.toLocaleString()}
                    </span>
                    <p className="text-[11px] text-gray-400 line-clamp-3 mb-4 leading-normal flex-1">{plan.description}</p>
                    <div className="text-[11px] font-semibold text-green-700 flex items-center gap-1 mt-auto">
                      Select Tier <ArrowRight size={10} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 2: Payment Details (shows only if plan is selected) */}
            {selectedPlan && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
              >
                <span className="label-pill mb-3 inline-flex">Step 2</span>
                <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Payment Details</h2>
                <p className="text-sm text-gray-500 mb-6">
                  Send your membership fee of <span className="font-bold text-green-700">PHP {selectedPlan.price.toLocaleString()}</span> via GCash or Bank Transfer using the credentials below.
                </p>

                {/* QR Method Toggle */}
                <div className="flex gap-2.5 mb-6">
                  {paymentMethods.map((pay) => (
                    <button
                      key={pay.id}
                      onClick={() => handleSelectPayment(pay)}
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
                  <div className="grid md:grid-cols-2 gap-6 p-6 rounded-2xl bg-gray-50/70 border border-gray-100">
                    <div className="flex flex-col justify-center">
                      <h4 className="font-heading font-bold text-gray-900 mb-2">{selectedPayment.name}</h4>
                      <p className="text-xs text-gray-500 leading-relaxed mb-4">{selectedPayment.description}</p>
                      <div className="bg-white p-4 rounded-xl border border-gray-200 text-xs text-gray-700 font-mono whitespace-pre-line leading-relaxed">
                        {selectedPayment.payment_instructions}
                      </div>
                    </div>
                    <div className="flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200">
                      <img
                        src={selectedPayment.qr_code_url}
                        alt="Payment QR Code"
                        className="w-40 h-40 object-contain mb-2"
                      />
                      <span className="text-[10px] text-gray-400 font-semibold flex items-center gap-1">
                        <QrCode size={12} /> Scan with GCash/Bank App
                      </span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {/* Form details input */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] sticky top-32">
              <h3 className="text-lg font-heading font-black text-gray-900 mb-6">Application Form</h3>

              {formError && (
                <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSubmitApplication} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Company / Business Name</label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="text"
                      placeholder="e.g. Talisay Agri-Farm"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Category</label>
                  <select
                    value={businessCategory}
                    onChange={(e) => {
                      setBusinessCategory(e.target.value);
                      if (e.target.value !== "Other") {
                        setOtherCategoryText("");
                      }
                    }}
                    className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                  >
                    <option value="">Select Category</option>
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

                {businessCategory === "Other" && (
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Specify Sector / Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Handicrafts, Aquaculture, etc."
                      value={otherCategoryText}
                      onChange={(e) => setOtherCategoryText(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="tel"
                      placeholder="0917XXXXXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Address</label>
                  <div className="relative">
                    <Map className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="text"
                      placeholder="Street, Barangay, Talisay City"
                      value={businessAddress}
                      onChange={(e) => setBusinessAddress(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Payment Reference Number *</label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                    <input
                      type="text"
                      placeholder="GCash Ref / Bank Transaction ID"
                      required
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                    />
                  </div>
                </div>

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
                        type="file"
                        accept="image/*"
                        required
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
      )}

      {/* RENDER PENDING STATUS REVIEW SCREEN */}
      {profile?.membership_status === "pending" && (
        <div className="max-w-2xl mx-auto bezel-outer shadow-diffuse bg-white rounded-3xl">
          <div className="bezel-inner p-8 md:p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-full flex items-center justify-center mb-6">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="text-2xl font-heading font-black text-gray-900 mb-3">Application Under Review</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md mb-8">
              We received your application for the <span className="font-semibold text-green-700">{getPlanDisplayName(profile.membership_type)}</span> membership. Our administrative officers are validating your payment reference. This usually takes between 12 to 24 hours.
            </p>
            <div className="w-full p-4.5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row justify-between gap-4 text-xs font-heading font-semibold text-left">
              <div>
                <div className="text-gray-400">Membership Tier</div>
                <div className="text-gray-900 mt-1">{getPlanDisplayName(profile.membership_type)} Member</div>
              </div>
              <div>
                <div className="text-gray-400">Reference Account</div>
                <div className="text-gray-900 mt-1">{profile.company_name || "N/A"}</div>
              </div>
              <div>
                <div className="text-gray-400">Status</div>
                <div className="text-green-700 mt-1 uppercase flex items-center gap-1">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Reviewing
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RENDER REJECTED STATUS SCREEN */}
      {profile?.membership_status === "rejected" && (
        <div className="max-w-2xl mx-auto bezel-outer shadow-diffuse bg-white rounded-3xl">
          <div className="bezel-inner p-8 md:p-12 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-full flex items-center justify-center mb-6">
              <Shield size={32} />
            </div>
            <h2 className="text-2xl font-heading font-black text-gray-900 mb-3">Application Rejected</h2>
            <p className="text-gray-500 text-sm leading-relaxed max-w-md mb-6">
              Unfortunately, your payment reference details could not be verified by our administrative office. Please verify your receipt reference and resubmit.
            </p>
            <button
              onClick={async () => {
                await supabase.from("profiles").update({ membership_status: "none" }).eq("id", user?.id || "");
                refetchProfile();
              }}
              className="btn-premium bg-red-600 hover:bg-red-700 text-white !py-2.5 shadow-diffuse flex items-center gap-1.5"
            >
              Reapply / Modify Form
            </button>
          </div>
        </div>
      )}

      {/* RENDER FULL MEMBER CONTROLS (IF STATUS IS ACTIVE) */}
      {profile?.membership_status === "active" && (
        <div className="flex flex-col gap-6">
          {/* Expiration warning banner */}
          {isNearExp && (
            <div className={`p-5 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-xs font-semibold ${
              isExpiredExp 
                ? "bg-red-50 border-red-200 text-red-700" 
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}>
              <div className="flex items-center gap-3">
                <span className={`w-10 h-10 rounded-2xl flex items-center justify-center ${isExpiredExp ? "bg-red-100 text-red-705" : "bg-amber-100 text-amber-705"}`}>
                  <Shield size={18} />
                </span>
                <div className="text-left">
                  <div className="font-heading font-black text-sm text-gray-900">
                    {isExpiredExp ? "Membership Expired" : "Membership Expiring Soon"}
                  </div>
                  <div className="opacity-90 font-normal mt-0.5 max-w-2xl text-gray-500">
                    {isExpiredExp 
                      ? "Your membership has expired. Please submit a renewal payment reference below to reactivate your listing and member news submission privileges."
                      : `Your membership expires in ${daysLeftExp} days (on ${new Date(profile.expires_at!).toLocaleDateString()}). Renew early to ensure uninterrupted Chamber privileges.`}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center">
                {hasPendingRenewal ? (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 font-bold uppercase text-[10px] tracking-wider">
                    <Loader2 size={12} className="animate-spin" /> Renewal Pending Verification
                  </span>
                ) : (
                  <button
                    onClick={() => {
                      setRenewalPlan(plans.find(p => p.type === profile.membership_type) || null);
                      if (paymentMethods.length > 0) {
                        setRenewalSelectedPayment(paymentMethods[0]);
                        setRenewalPaymentMethod(paymentMethods[0].name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
                      }
                      setShowRenewalModal(true);
                    }}
                    className={`px-4.5 py-2.5 rounded-xl text-white font-bold cursor-pointer transition-colors shadow-diffuse text-xs ${
                      isExpiredExp ? "bg-red-700 hover:bg-red-600" : "bg-amber-600 hover:bg-amber-500"
                    }`}
                  >
                    Renew Membership
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar tabs */}
          <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-1">
            <button
              onClick={() => setActiveTab("card")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "card"
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
              }`}
            >
              <CreditCard size={16} /> Digital Member Card
            </button>
            <button
              onClick={() => setActiveTab("events")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "events"
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
              }`}
            >
              <CalendarDays size={16} /> Registered Events ({registeredEvents.length})
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "directory"
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
              }`}
            >
              <Building2 size={16} /> Business Directory Profile
            </button>
            <button
              onClick={() => setActiveTab("news")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "news"
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
              }`}
            >
              <Newspaper size={16} /> News Submissions ({myNews.length})
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                activeTab === "settings"
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
              }`}
            >
              <Key size={16} /> Change Password
            </button>
          </div>

          {/* Main workspace */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {/* Tab 1: Digital Card */}
              {activeTab === "card" && (
                <motion.div
                  key="card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-8 items-center"
                >
                  {/* Card Container */}
                  <div className="relative w-80 sm:w-[350px] h-52 rounded-[1.5rem] bg-gradient-to-br from-[#0D1A14] via-[#166534] to-[#0D1A14] text-white p-6 shadow-2xl overflow-hidden border border-green-600/35 flex flex-col justify-between select-none">
                    {/* Metallic glow accents */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
                    <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-green-500/10 rounded-full blur-2xl pointer-events-none" />

                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/10 flex items-center justify-center p-0.5 border border-white/10">
                          <img src="/talisaychamberlogo.jpg" alt="Logo" className="object-contain w-full h-full" />
                        </div>
                        <span className="font-heading font-black text-xs tracking-wider">TALISAY CHAMBER</span>
                      </div>
                      <span className="text-[9px] font-heading font-bold tracking-widest text-gold bg-gold/15 px-2 py-0.5 rounded-full border border-gold/25 uppercase">
                        {getPlanDisplayName(profile.membership_type)}
                      </span>
                    </div>

                    <div className="my-auto pt-2">
                      <div className="text-lg font-heading font-bold leading-tight">{profile.full_name}</div>
                      <div className="text-[10px] text-green-200 mt-1">{profile.company_name || "Independent Member"}</div>
                    </div>

                    <div className="flex justify-between items-end border-t border-white/10 pt-3 text-[9px] font-mono text-gray-400">
                      <div>
                        <div>MEMBER ID</div>
                        <div className="text-white font-semibold mt-0.5">{profile.id.substring(0, 8).toUpperCase()}</div>
                      </div>
                      <div className="text-right">
                        <div>EXPIRES END</div>
                        <div className="text-white font-semibold mt-0.5">
                          {new Date(new Date(profile.created_at).setFullYear(new Date(profile.created_at).getFullYear() + 1)).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* QR Scan Info */}
                  <div className="flex-1 text-center md:text-left space-y-4">
                    <span className="label-pill !bg-green-50 !text-green-700 !border-green-100 inline-flex">Verified Member</span>
                    <h3 className="text-xl font-heading font-black text-gray-900 leading-tight">Digital Membership QR Code</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">
                      Use this QR code during entry verification at Chamber trade fairs, network expos, conferences, and seminars.
                    </p>
                    <div className="inline-flex items-center gap-3 p-4 bg-gray-50 border border-gray-100 rounded-2xl">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent("MEMB-" + profile.id)}&size=120x120`}
                        alt="Member QR Code"
                        className="w-20 h-20 object-contain bg-white p-1 rounded-lg border border-gray-200 shadow-sm"
                      />
                      <div className="text-left">
                        <div className="text-[10px] font-bold text-gray-400 uppercase">Verification ID</div>
                        <div className="text-xs font-mono text-gray-700 mt-0.5">MEMB-{profile.id.substring(0, 8).toUpperCase()}</div>
                        <div className="text-[10px] text-green-600 font-semibold mt-1 flex items-center gap-1">
                          <CheckCircle2 size={12} /> Active & Approved
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Tab 2: Registered Events */}
              {activeTab === "events" && (
                <motion.div
                  key="events"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
                >
                  <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Registered Events</h2>
                  <p className="text-sm text-gray-500 mb-8">
                    Your reservations and passes for upcoming Chamber activities.
                  </p>

                  <div className="space-y-4">
                    {registeredEvents.map((reg) => (
                      <div
                        key={reg.id}
                        className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row md:items-start justify-between gap-6"
                      >
                        <div className="flex-1">
                          {reg.payment_status === "paid" || reg.payment_status === "free" ? (
                            <span className="text-[10px] font-bold text-green-700 uppercase bg-green-50 border border-green-150 px-2 py-0.5 rounded-full mb-2 inline-block">
                              Pass Verified & Active
                            </span>
                          ) : reg.payment_status === "rejected" ? (
                            <span className="text-[10px] font-bold text-red-700 uppercase bg-red-50 border border-red-150 px-2 py-0.5 rounded-full mb-2 inline-block animate-pulse">
                              Payment Rejected
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-700 uppercase bg-amber-50 border border-amber-150 px-2 py-0.5 rounded-full mb-2 inline-block">
                              Pending Verification
                            </span>
                          )}
                          <h4 className="font-heading font-bold text-gray-900 text-base leading-snug">{reg.events?.title}</h4>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-gray-400 mt-3">
                            <span className="flex items-center gap-1.5"><CalendarDays size={13} className="text-green-600" />{reg.events?.date}</span>
                            <span className="flex items-center gap-1.5"><MapPin size={13} className="text-green-600" />{reg.events?.venue}</span>
                          </div>

                          {reg.payment_status === "rejected" && (
                            <p className="text-[11px] text-red-600 font-semibold mt-4 leading-normal bg-red-50/50 p-2.5 rounded-xl border border-red-100/50">
                              Your payment reference number was flagged as invalid or unverified. Please contact the Chamber office to clear your balance.
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200">
                          <div className="relative">
                            <img
                              src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(reg.qr_code)}&size=100x100`}
                              alt="Check-in QR"
                              className={`w-16 h-16 object-contain transition-all duration-300 ${
                                reg.payment_status === "paid" || reg.payment_status === "free" ? "" : "blur-[3px] opacity-25 select-none pointer-events-none"
                              }`}
                            />
                            {(reg.payment_status !== "paid" && reg.payment_status !== "free") && (
                              <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                                <Shield className="text-gray-400 w-5 h-5" />
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <div className="text-[9px] font-bold text-gray-400 uppercase">Check-in Pass</div>
                            <div className="text-[11px] font-mono text-gray-700 mt-0.5">{reg.qr_code}</div>
                            <div className="text-[9px] font-bold mt-1 text-gray-500 capitalize">
                              Attendance: {reg.attendance_status}
                            </div>
                            <div className={`text-[9px] font-bold mt-0.5 capitalize ${
                              reg.payment_status === "paid" || reg.payment_status === "free"
                                ? "text-green-700"
                                : reg.payment_status === "rejected"
                                ? "text-red-600"
                                : "text-amber-600"
                            }`}>
                              Payment: {reg.payment_status}
                            </div>
                            {(reg.payment_status === "paid" || reg.payment_status === "free") && (
                              <button
                                onClick={() => handleDownloadPass(reg.qr_code, reg.events?.title || "event")}
                                className="mt-2 text-[9px] font-bold text-green-700 hover:text-green-600 flex items-center gap-1 cursor-pointer hover:underline transition-all"
                              >
                                <Download size={10} /> Save Pass
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {registeredEvents.length === 0 && (
                      <div className="text-center py-10">
                        <CalendarDays className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h4 className="font-heading font-semibold text-gray-900">No events registered yet</h4>
                        <p className="text-sm text-gray-500 mt-1 mb-5">Explore our upcoming events and register.</p>
                        <button
                          onClick={() => navigate("/events")}
                          className="btn-premium bg-[#0D1A14] text-white text-xs !py-2 shadow-navy-diffuse"
                        >
                          View Events Calendar
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Tab 3: Business Directory Listing */}
              {activeTab === "directory" && (
                <motion.div
                  key="directory"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
                >
                  {!hasListing ? (
                    <div className="text-center py-12 px-6 flex flex-col items-center max-w-lg mx-auto">
                      <div className="w-16 h-16 bg-green-50 border border-green-100 text-green-700 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                        <Building2 size={28} />
                      </div>
                      <h3 className="font-heading font-black text-xl text-gray-900 mb-3">Directory Listing Pending</h3>
                      <p className="text-gray-505 text-sm leading-relaxed mb-6">
                        Under Chamber policies, directory listings must be initially set up by an administrator. 
                        Once created, you will be able to edit and update your business profile from this tab.
                      </p>
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-400 font-semibold w-full text-center">
                        Please contact the Chamber Admin to create your business directory profile.
                      </div>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">
                        Manage Directory Profile
                      </h2>
                      <p className="text-sm text-gray-500 mb-6">
                        Update your business information on the public Talisay Chamber Business Directory.
                      </p>

                      {approvalStatus === "pending_approval" && (
                        <div className="mb-6 p-4 bg-amber-50/70 border border-amber-200/60 text-amber-905 rounded-2xl flex items-start gap-3 shadow-[0_2px_10px_rgba(245,158,11,0.02)] text-left">
                          <div className="p-1.5 bg-amber-105 rounded-xl text-amber-700 mt-0.5">
                            <Shield size={16} className="animate-pulse" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold font-heading text-amber-800">Proposed Edits Pending Review</h4>
                            <p className="text-[11px] text-amber-700/80 leading-relaxed mt-0.5">
                              You have made changes to your directory profile that are currently waiting for admin approval. 
                              While review is pending, the directory page displays your last approved information. 
                              You can continue to modify your draft edits below.
                            </p>
                          </div>
                        </div>
                      )}

                      {formError && (
                        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                          {formError}
                        </div>
                      )}

                      <form onSubmit={handleSaveDirectoryListing} className="space-y-4">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Name *</label>
                            <div className="relative">
                              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                              <input
                                type="text"
                                required
                                placeholder="e.g. Santos Trading Co."
                                value={dirName}
                                onChange={(e) => setDirName(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Category *</label>
                            <select
                              required
                              value={dirCat}
                              onChange={(e) => {
                                setDirCat(e.target.value);
                                if (e.target.value !== "Other") {
                                  setDirOtherCatText("");
                                }
                              }}
                              className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                            >
                              <option value="">Select Category</option>
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

                          {dirCat === "Other" && (
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Specify Sector / Category</label>
                              <input
                                type="text"
                                required
                                placeholder="e.g. Handicrafts, Aquaculture, etc."
                                value={dirOtherCatText}
                                onChange={(e) => setDirOtherCatText(e.target.value)}
                                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                              />
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Description *</label>
                          <textarea
                            required
                            rows={4}
                            placeholder="Tell us what your business does..."
                            value={dirDesc}
                            onChange={(e) => setDirDesc(e.target.value)}
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all resize-none"
                          />
                        </div>

                        <div className="grid sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                              <input
                                type="email"
                                placeholder="sales@company.com"
                                value={dirEmail}
                                onChange={(e) => setDirEmail(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                              <input
                                type="text"
                                placeholder="(032) 234-5678"
                                value={dirPhone}
                                onChange={(e) => setDirPhone(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Website URL</label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                              <input
                                type="text"
                                placeholder="www.company.com"
                                value={dirWeb}
                                onChange={(e) => setDirWeb(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Physical Address *</label>
                          <div className="relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                            <input
                              type="text"
                              required
                              placeholder="Barangay, City/Province"
                              value={dirAddress}
                              onChange={(e) => setDirAddress(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          disabled={actionLoading}
                          className="btn-premium bg-green-700 hover:bg-green-600 text-white shadow-diffuse text-xs"
                        >
                          {actionLoading ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 size={13} className="animate-spin" /> Saving...
                            </span>
                          ) : (
                            "Save Proposed Edits"
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </motion.div>
              )}

              {/* Tab 4: News Submissions */}
              {activeTab === "news" && (
                <motion.div
                  key="news"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-1 text-left">
                        News & Announcement Submissions
                      </h2>
                      <p className="text-sm text-gray-500 text-left">
                        Submit articles, updates, or announcements to be featured on the Chamber News wall.
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        resetNewsForm();
                        setFormError(null);
                        setShowNewsSubmitModal(true);
                      }}
                      className="flex items-center gap-1.5 px-4.5 py-2.5 rounded-full bg-green-700 hover:bg-green-600 text-white text-xs font-bold transition-all shadow-diffuse cursor-pointer self-start sm:self-auto"
                    >
                      <Plus size={14} /> Submit Article
                    </button>
                  </div>

                  {myNews.length === 0 ? (
                    <div className="text-center py-12 px-6 flex flex-col items-center">
                      <Newspaper className="mx-auto h-12 w-12 text-gray-305 mb-4" />
                      <h4 className="font-heading font-semibold text-gray-900">No submissions yet</h4>
                      <p className="text-sm text-gray-500 mt-1 max-w-[32ch] mx-auto">
                        Share your company's milestones, announcements, or press releases with the Chamber network.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 text-gray-400 font-bold uppercase tracking-wider">
                            <th className="pb-3.5 pl-2">Title</th>
                            <th className="pb-3.5">Category</th>
                            <th className="pb-3.5">Submission Date</th>
                            <th className="pb-3.5">Status</th>
                            <th className="pb-3.5 text-right pr-2">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-semibold text-gray-700">
                          {myNews.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/40">
                              <td className="py-4 pl-2 max-w-[200px] text-left">
                                <div className="text-gray-900 font-bold truncate" title={item.title}>{item.title}</div>
                                <div className="text-[10px] text-gray-400 font-normal truncate mt-0.5" title={item.summary}>{item.summary}</div>
                              </td>
                              <td className="py-4 text-left">{item.category}</td>
                              <td className="py-4 text-left text-gray-400 font-normal">
                                {new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                              </td>
                              <td className="py-4 text-left">
                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                                  item.status === "approved"
                                    ? "bg-green-50 text-green-700 border-green-100"
                                    : item.status === "rejected"
                                    ? "bg-red-50 text-red-700 border-red-100"
                                    : "bg-amber-50 text-amber-700 border-amber-100 animate-pulse"
                                }`}>
                                  {item.status === "pending" ? "Pending Review" : item.status}
                                </span>
                              </td>
                              <td className="py-4 text-right pr-2">
                                <div className="flex items-center justify-end gap-1">
                                  {item.status === "pending" && (
                                    <>
                                      <button
                                        onClick={() => handleEditNewsClick(item)}
                                        className="p-1 text-gray-400 hover:text-green-700 cursor-pointer"
                                        title="Edit Draft"
                                      >
                                        <Edit2 size={13} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteNewsSubmission(item.id)}
                                        className="p-1 text-gray-400 hover:text-red-700 cursor-pointer"
                                        title="Delete Submission"
                                      >
                                        <Trash2 size={13} />
                                      </button>
                                    </>
                                  )}
                                  {item.status !== "pending" && (
                                    <span className="text-[10px] text-gray-300 font-normal italic pr-2">Locked</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Tab 5: Change Password */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] text-left"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-1">
                      Account Security Settings
                    </h2>
                    <p className="text-sm text-gray-500">
                      Update your login password. To ensure security, verify your identity with your current password, and choose a new, strong password.
                    </p>
                  </div>

                  <form onSubmit={handlePasswordChange} className="max-w-md space-y-4 text-xs font-semibold text-gray-700">
                    <div>
                      <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1.5">Current Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter your current password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1.5">New Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter secure new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                      />
                    </div>

                    {/* Password strength meter */}
                    {newPassword && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400">
                          <span>Password Strength</span>
                          <span className={`font-black ${
                            strengthScore <= 2 ? "text-red-500" : strengthScore <= 4 ? "text-amber-500" : "text-green-600"
                          }`}>
                            {getStrengthLabel()}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-105 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${getStrengthColor()}`}
                            style={{ width: `${(strengthScore / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1.5">Confirm New Password *</label>
                      <input
                        type="password"
                        required
                        placeholder="Confirm your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-gray-55 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                      />
                    </div>

                    {/* Password validation indicators checklist */}
                    <div className="p-4.5 bg-gray-55/40 border border-gray-100 rounded-2xl space-y-2 text-gray-500 font-normal">
                      <div className="text-[10px] uppercase font-bold text-gray-400 mb-1">Security Criteria Checklist</div>
                      
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={hasMinLength ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${hasMinLength ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          At least 8 characters
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={hasUppercase ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${hasUppercase ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          Contains an uppercase letter (A-Z)
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={hasLowercase ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${hasLowercase ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          Contains a lowercase letter (a-z)
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={hasNumber ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${hasNumber ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          Contains a number (0-9)
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={hasSpecial ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${hasSpecial ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          Contains a special character (e.g. !@#$%)
                        </span>
                      </div>

                      <div className="border-t border-gray-100 my-1 pt-2 flex items-center gap-2.5">
                        <CheckCircle2 size={14} className={passwordsMatch ? "text-green-600" : "text-gray-300"} />
                        <span className={`transition-colors text-xs ${passwordsMatch ? "text-green-700 font-semibold" : "text-gray-400"}`}>
                          Passwords match
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={
                        isChangingPassword ||
                        !oldPassword ||
                        !hasMinLength ||
                        !hasUppercase ||
                        !hasLowercase ||
                        !hasNumber ||
                        !hasSpecial ||
                        !passwordsMatch
                      }
                      className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-600 disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
                    >
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="animate-spin" size={14} /> Updating Password...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </button>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
      )}

      {/* MEMBER NEWS SUBMISSION MODAL */}
      <AnimatePresence>
        {showNewsSubmitModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => {
                  setShowNewsSubmitModal(false);
                  resetNewsForm();
                }}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-heading font-black text-gray-900 mb-2">
                {editingNews ? "Edit News Submission" : "Submit News Article"}
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Fill in the details below to submit an article. Submissions are subject to administrator approval before being published.
              </p>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-semibold">
                  {formError}
                </div>
              )}

              <form onSubmit={handleSaveNewsSubmission} className="space-y-4 text-xs font-semibold text-gray-700">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Article Title *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Santos Trading expands local retail lines"
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Category *</label>
                    <select
                      value={newsCategory}
                      onChange={(e) => setNewsCategory(e.target.value)}
                      className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                    >
                      <option value="General">General</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Economic News">Economic News</option>
                      <option value="Membership">Membership</option>
                      <option value="Event">Event</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Summary * (Short Teaser Description)</label>
                  <input
                    type="text"
                    required
                    placeholder="Provide a one-sentence teaser description..."
                    value={newsSummary}
                    onChange={(e) => setNewsSummary(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Full Article Content *</label>
                  <textarea
                    required
                    rows={6}
                    placeholder="Write the full body content of your news article here..."
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-950 outline-none focus:bg-white focus:border-green-500 transition-all resize-none font-sans leading-relaxed"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Banner Image</label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-3 bg-gray-50 hover:bg-gray-100 transition-all relative min-h-[96px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setNewsImgFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="text-center pointer-events-none">
                        <Plus className="mx-auto text-gray-400 mb-1" size={18} />
                        <span className="text-[10px] text-gray-600 font-bold block">
                          {newsImgFile ? newsImgFile.name : "Upload Image File"}
                        </span>
                        <span className="text-[9px] text-gray-400 block mt-0.5">PNG, JPG up to 5MB</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={newsImg}
                        onChange={(e) => setNewsImg(e.target.value)}
                        placeholder="Or paste image URL..."
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-[10px] text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all"
                      />
                      <div className="flex-1 min-h-[64px] border border-gray-100 rounded-xl overflow-hidden bg-gray-50 flex items-center justify-center text-[10px] text-gray-400 relative">
                        {newsImgFile ? (
                          <img
                            src={URL.createObjectURL(newsImgFile)}
                            alt="Upload Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : newsImg ? (
                          <img
                            src={newsImg}
                            alt="URL Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <span>Image Preview</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Submitting...
                      </>
                    ) : (
                      editingNews ? "Update Submission" : "Submit Article"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewsSubmitModal(false);
                      resetNewsForm();
                    }}
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

      {/* RENEWAL MODAL */}
      <AnimatePresence>
        {showRenewalModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-gray-100 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => setShowRenewalModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <h3 className="text-xl font-heading font-black text-gray-900 mb-2">
                Renew Chamber Membership
              </h3>
              <p className="text-xs text-gray-500 mb-6">
                Submit your renewal payment details below. Once verified by the Chamber Admin, your expiration date will be extended by 1 year.
              </p>

              <form onSubmit={handleRenewalSubmit} className="space-y-4 text-xs font-semibold text-gray-700">
                {/* 1. Plan display/select */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Select Renewal Tier *</label>
                  <select
                    value={renewalPlan?.type || ""}
                    onChange={(e) => {
                      const selected = plans.find(p => p.type === e.target.value) || null;
                      setRenewalPlan(selected);
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

                {/* Plan details */}
                {renewalPlan && (
                  <div className="p-3.5 rounded-2xl bg-green-50/50 border border-green-100 text-green-800 text-[11px] font-normal leading-relaxed">
                    <span className="font-heading font-black block mb-0.5">{renewalPlan.name} Plan Description:</span>
                    {renewalPlan.description}
                  </div>
                )}

                {/* Payment method selector */}
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

                {/* QR code and payment instructions */}
                {renewalSelectedPayment && (
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-150 space-y-3">
                    <div className="flex items-start gap-4">
                      {renewalSelectedPayment.qr_code_url && (
                        <div className="w-20 h-20 bg-white border border-gray-200 rounded-xl overflow-hidden flex items-center justify-center p-1 flex-shrink-0">
                          <img
                            src={renewalSelectedPayment.qr_code_url}
                            alt="QR Payment"
                            className="object-contain w-full h-full"
                          />
                        </div>
                      )}
                      <div>
                        <div className="font-heading font-bold text-gray-900 text-[11px]">Payment Instructions:</div>
                        <p className="text-[10px] text-gray-500 mt-1 leading-normal font-normal">
                          {renewalSelectedPayment.payment_instructions}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Reference Number */}
                <div>
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Transaction Reference Number *</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter GCash Ref / Bank Transaction ID"
                    value={renewalPaymentRef}
                    onChange={(e) => setRenewalPaymentRef(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 outline-none focus:bg-white focus:border-green-500 transition-all font-semibold"
                  />
                </div>

                {/* Proof of Payment Upload */}
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
                        type="file"
                        accept="image/*"
                        required
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

                {/* Action buttons */}
                <div className="flex gap-2.5 pt-4 border-t border-gray-100 mt-6">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Submitting...
                      </>
                    ) : (
                      "Submit Renewal Reference"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRenewalModal(false)}
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
    </div>
  );
};

export default Dashboard;

