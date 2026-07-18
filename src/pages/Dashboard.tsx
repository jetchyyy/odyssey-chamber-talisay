import React, { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabase";
import { Loader2, Mail, ArrowRight, CreditCard, CalendarDays, Building2, Newspaper, Key, LogOut, Shield, MessageSquareQuote, Ticket } from "lucide-react";
import { uploadImage } from "../lib/storage";

// Sub-components
import ApplicationTab from "../components/dashboard/ApplicationTab";
import MemberCardTab from "../components/dashboard/MemberCardTab";
import EventsTab from "../components/dashboard/EventsTab";
import DirectoryTab from "../components/dashboard/DirectoryTab";
import NewsTab from "../components/dashboard/NewsTab";
import NewsSubmitModal from "../components/dashboard/NewsSubmitModal";
import PasswordTab from "../components/dashboard/PasswordTab";
import RenewalModal from "../components/dashboard/RenewalModal";
import MemberStoriesTab from "../components/dashboard/StoriesTab";
import { PackagesPurchaseTab } from "../components/dashboard/PackagesPurchaseTab";
import type { PricingPlan, PaymentQR, RegisteredEvent } from "../components/dashboard/types";
import { getPlanDisplayName, BUSINESS_CATEGORIES } from "../components/dashboard/types";

// ─── Dashboard Component ──────────────────────────────────────────────────────

const Dashboard: React.FC = () => {
  const { user, profile, loading, logout, refetchProfile, isAdmin } = useAuth();
  const { toast } = useNotification();
  const navigate = useNavigate();

  // ── Application workflow states ──────────────────────────────────────────
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentQR[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentQR | null>(null);

  // ── Application form field states ────────────────────────────────────────
  const [companyName, setCompanyName] = useState(profile?.company_name || "");
  const [businessCategory, setBusinessCategory] = useState(() => {
    const cat = profile?.business_category || "";
    if (cat && !BUSINESS_CATEGORIES.includes(cat as any)) return "Other";
    return cat;
  });
  const [otherCategoryText, setOtherCategoryText] = useState(() => {
    const cat = profile?.business_category || "";
    if (cat && !BUSINESS_CATEGORIES.includes(cat as any)) return cat;
    return "";
  });
  const [businessAddress, setBusinessAddress] = useState(profile?.business_address || "");
  const [phone, setPhone] = useState(profile?.phone || "");
  const [paymentMethodName, setPaymentMethodName] = useState("");
  const [paymentReference, setPaymentReference] = useState("");

  // ── Directory listing states ─────────────────────────────────────────────
  const [hasListing, setHasListing] = useState(false);
  const [listingId, setListingId] = useState<string | null>(null);
  const [dirName, setDirName] = useState("");
  const [dirDesc, setDirDesc] = useState("");
  const [dirEmail, setDirEmail] = useState("");
  const [dirPhone, setDirPhone] = useState("");
  const [dirWeb, setDirWeb] = useState("");
  const [dirFacebook, setDirFacebook] = useState("");
  const [dirInstagram, setDirInstagram] = useState("");
  const [dirCat, setDirCat] = useState("");
  const [dirOtherCatText, setDirOtherCatText] = useState("");
  const [dirAddress, setDirAddress] = useState("");
  const [approvalStatus, setApprovalStatus] = useState<"approved" | "pending_approval">("approved");
  const [dirIsVerified, setDirIsVerified] = useState(true);
  const [dirLogoUrl, setDirLogoUrl] = useState("");
  const [dirLogoFile, setDirLogoFile] = useState<File | null>(null);
  const [dirLogoPreview, setDirLogoPreview] = useState("");

  // ── Loader and query states ──────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [registeredEvents, setRegisteredEvents] = useState<RegisteredEvent[]>([]);
  const [activeTab, setActiveTab] = useState<"card" | "events" | "directory" | "news" | "stories" | "settings" | "packages">("card");
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [myCredits, setMyCredits] = useState<any[]>([]);

  // ── Password change states ───────────────────────────────────────────────
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // ── Renewal states ───────────────────────────────────────────────────────
  const [hasPendingRenewal, setHasPendingRenewal] = useState(false);
  const [showRenewalModal, setShowRenewalModal] = useState(false);
  const [renewalPlan, setRenewalPlan] = useState<PricingPlan | null>(null);
  const [renewalPaymentMethod, setRenewalPaymentMethod] = useState("");
  const [renewalPaymentRef, setRenewalPaymentRef] = useState("");
  const [renewalSelectedPayment, setRenewalSelectedPayment] = useState<PaymentQR | null>(null);

  // ── Payment proof states ─────────────────────────────────────────────────
  const [appPaymentProofFile, setAppPaymentProofFile] = useState<File | null>(null);
  const [appPaymentProofPreview, setAppPaymentProofPreview] = useState("");
  const [renewalPaymentProofFile, setRenewalPaymentProofFile] = useState<File | null>(null);
  const [renewalPaymentProofPreview, setRenewalPaymentProofPreview] = useState("");

  // ── Promo code states ─────────────────────────────────────────────────────
  const [appPromoCode, setAppPromoCode] = useState("");
  const [appAppliedPromo, setAppAppliedPromo] = useState<any>(null);
  const [appPromoLoading, setAppPromoLoading] = useState(false);
  const [appPromoError, setAppPromoError] = useState<string | null>(null);

  const appDiscountAmount = appAppliedPromo && selectedPlan
    ? (appAppliedPromo.discount_type === "percentage"
        ? Math.min(selectedPlan.price, (selectedPlan.price * appAppliedPromo.discount_value) / 100)
        : Math.min(selectedPlan.price, appAppliedPromo.discount_value))
    : 0;
  const appFinalPrice = selectedPlan ? Math.max(0, selectedPlan.price - appDiscountAmount) : 0;

  const [renewPromoCode, setRenewPromoCode] = useState("");
  const [renewAppliedPromo, setRenewAppliedPromo] = useState<any>(null);
  const [renewPromoLoading, setRenewPromoLoading] = useState(false);
  const [renewPromoError, setRenewPromoError] = useState<string | null>(null);

  const planToRenew = renewalPlan || plans.find((p) => p.type === profile?.membership_type);

  const renewDiscountAmount = renewAppliedPromo && planToRenew
    ? (renewAppliedPromo.discount_type === "percentage"
        ? Math.min(planToRenew.price, (planToRenew.price * renewAppliedPromo.discount_value) / 100)
        : Math.min(planToRenew.price, renewAppliedPromo.discount_value))
    : 0;
  const renewFinalPrice = planToRenew ? Math.max(0, planToRenew.price - renewDiscountAmount) : 0;

  const handleApplyAppPromo = async () => {
    if (!appPromoCode.trim() || !selectedPlan) return;
    setAppPromoLoading(true);
    setAppPromoError(null);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", appPromoCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setAppPromoError("Invalid promo code.");
        setAppAppliedPromo(null);
        return;
      }

      if (!data.is_active) {
        setAppPromoError("This promo code is inactive.");
        setAppAppliedPromo(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setAppPromoError("This promo code has expired.");
        setAppAppliedPromo(null);
        return;
      }

      if (data.max_uses !== null && data.uses_count >= data.max_uses) {
        setAppPromoError("Usage limit reached.");
        setAppAppliedPromo(null);
        return;
      }

      if (data.applicable_to !== "all" && data.applicable_to !== "membership") {
        setAppPromoError("Not applicable to memberships.");
        setAppAppliedPromo(null);
        return;
      }

      setAppAppliedPromo(data);
      toast.success("Promo code applied!");
    } catch (err: any) {
      setAppPromoError(err.message || "Failed to validate promo code.");
      setAppAppliedPromo(null);
    } finally {
      setAppPromoLoading(false);
    }
  };

  const handleApplyRenewPromo = async () => {
    if (!renewPromoCode.trim() || !planToRenew) return;
    setRenewPromoLoading(true);
    setRenewPromoError(null);
    try {
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", renewPromoCode.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setRenewPromoError("Invalid promo code.");
        setRenewAppliedPromo(null);
        return;
      }

      if (!data.is_active) {
        setRenewPromoError("This promo code is inactive.");
        setRenewAppliedPromo(null);
        return;
      }

      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        setRenewPromoError("This promo code has expired.");
        setRenewAppliedPromo(null);
        return;
      }

      if (data.max_uses !== null && data.uses_count >= data.max_uses) {
        setRenewPromoError("Usage limit reached.");
        setRenewAppliedPromo(null);
        return;
      }

      if (data.applicable_to !== "all" && data.applicable_to !== "membership") {
        setRenewPromoError("Not applicable to memberships.");
        setRenewAppliedPromo(null);
        return;
      }

      setRenewAppliedPromo(data);
      toast.success("Promo code applied!");
    } catch (err: any) {
      setRenewPromoError(err.message || "Failed to validate promo code.");
      setRenewAppliedPromo(null);
    } finally {
      setRenewPromoLoading(false);
    }
  };

  // ── News submission states ───────────────────────────────────────────────
  const [myNews, setMyNews] = useState<any[]>([]);
  const [showNewsSubmitModal, setShowNewsSubmitModal] = useState(false);
  const [editingNews, setEditingNews] = useState<any | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsCategory, setNewsCategory] = useState("General");
  const [newsImg, setNewsImg] = useState("");
  const [newsImgFiles, setNewsImgFiles] = useState<File[]>([]);
  const [existingNewsImgs, setExistingNewsImgs] = useState<string[]>([]);

  // ── Effects ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!loading) {
      if (!user) navigate("/login");
    }
  }, [user, loading, navigate]);

  // Sync profile fields when dynamic profile loads
  useEffect(() => {
    if (profile) {
      setCompanyName(profile.company_name || "");
      setBusinessAddress(profile.business_address || "");
      setPhone(profile.phone || "");
      const cat = profile.business_category || "";
      if (cat) {
        if (BUSINESS_CATEGORIES.includes(cat as any)) {
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

  // Load plans, payments, events, directory, news, renewal
  useEffect(() => {
    if (!user) return;
    const loadData = async () => {
      // 1. Plans
      const { data: plansData } = await supabase.from("membership_pricing").select("*").eq("is_active", true);
      if (plansData) setPlans(plansData);

      // 1b. Packages
      const { data: packagesData } = await supabase.from("membership_packages").select("*").eq("is_active", true);
      const mappedPackages = packagesData
        ? packagesData.map((pkg) => ({
            id: pkg.id,
            type: pkg.membership_type === "individual" ? "package_a" : pkg.membership_type === "sme" ? "package_b" : "package_c",
            name: pkg.name,
            price: Number(pkg.price),
            period: "yr",
            description: pkg.description,
            isPackage: true,
            membership_type: pkg.membership_type,
            benefits: [
              `${pkg.membership_type === "individual" ? "Small (Individual)" : pkg.membership_type === "sme" ? "Medium (SME)" : "Large (Corporate)"} Membership`,
              `${pkg.included_passes} passes included (${pkg.benefit_type.replace(/_/g, " ")})`,
              pkg.terms_and_conditions ? `Terms: ${pkg.terms_and_conditions}` : ""
            ].filter(Boolean)
          }))
        : [];
      setDbPackages(mappedPackages);

      // Pre-select package or plan from URL parameter if present
      const params = new URLSearchParams(window.location.search);
      const preselectedPkgId = params.get("package");
      const preselectedPlanType = params.get("plan");
      if (preselectedPkgId && mappedPackages.length > 0) {
        const found = mappedPackages.find(p => p.id === preselectedPkgId);
        if (found) setSelectedPlan(found);
      } else if (preselectedPlanType && plansData && plansData.length > 0) {
        const found = plansData.find(p => p.type === preselectedPlanType || p.id === preselectedPlanType);
        if (found) setSelectedPlan(found);
      }

      // 2. QR payment methods
      const { data: qrData } = await supabase.from("qr_settings").select("*").eq("is_active", true);
      if (qrData) {
        setPaymentMethods(qrData);
        if (qrData.length > 0) {
          setSelectedPayment(qrData[0]);
          setPaymentMethodName(qrData[0].name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
        }
      }

      // 3. Registered events
      const { data: eventsData } = await supabase
        .from("event_registrations")
        .select(`id, event_id, full_name, email, payment_status, attendance_status, qr_code, events (title, date, time, venue)`)
        .eq("user_id", user.id);
      if (eventsData) setRegisteredEvents(eventsData as any);

      // 4. Business directory listing
      const { data: dirDataList } = await supabase
        .from("business_directory")
        .select("*")
        .eq("user_id", user.id)
        .limit(1);
      const dirData = dirDataList && dirDataList.length > 0 ? dirDataList[0] : null;

      // 4b. Member package credits
      const { data: creditsData } = await supabase
        .from("member_package_credits")
        .select("*")
        .eq("user_id", user.id);
      if (creditsData) setMyCredits(creditsData);

      if (dirData) {
        setHasListing(true);
        setListingId(dirData.id);
        setDirIsVerified(dirData.is_verified);
        const isPending = dirData.approval_status === "pending_approval" && dirData.pending_changes;
        const displayData = isPending ? dirData.pending_changes : dirData;
        setDirName(displayData.business_name || "");
        setDirDesc(displayData.description || "");
        setDirEmail(displayData.contact_email || "");
        setDirPhone(displayData.contact_phone || "");
        setDirWeb(displayData.website_url || "");
        setDirFacebook(displayData.facebook_url || "");
        setDirInstagram(displayData.instagram_url || "");
        const catVal = displayData.category || "";
        if (catVal) {
          if (BUSINESS_CATEGORIES.includes(catVal as any)) { setDirCat(catVal); setDirOtherCatText(""); }
          else { setDirCat("Other"); setDirOtherCatText(catVal); }
        } else { setDirCat(""); setDirOtherCatText(""); }
        setDirAddress(displayData.address || "");
        setApprovalStatus(dirData.approval_status || "approved");
        setDirLogoUrl(displayData.logo_url || "");
        setDirLogoPreview(displayData.logo_url || "");
        setDirLogoFile(null);
      } else {
        setDirName(profile?.company_name || "");
        setDirPhone(profile?.phone || "");
        setDirEmail(profile?.email || "");
        const catVal = profile?.business_category || "";
        if (catVal) {
          if (BUSINESS_CATEGORIES.includes(catVal as any)) { setDirCat(catVal); setDirOtherCatText(""); }
          else { setDirCat("Other"); setDirOtherCatText(catVal); }
        } else { setDirCat(""); setDirOtherCatText(""); }
        setDirAddress(profile?.business_address || "");
        setApprovalStatus("approved");
        setDirLogoUrl("");
        setDirLogoPreview("");
        setDirLogoFile(null);
      }

      // 5. News submissions
      const { data: newsData } = await supabase.from("news").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (newsData) setMyNews(newsData);

      // 6. Pending renewal check
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

  // ── Password strength helpers ────────────────────────────────────────────
  const hasMinLength = newPassword.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPassword);
  const hasLowercase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(newPassword);
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0;
  const strengthScore = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const getStrengthLabel = () => { if (!newPassword) return ""; if (strengthScore <= 2) return "Weak"; if (strengthScore <= 4) return "Fair"; return "Strong"; };
  const getStrengthColor = () => { if (strengthScore <= 2) return "bg-red-500"; if (strengthScore <= 4) return "bg-amber-500"; return "bg-green-600"; };

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSelectPlan = (plan: PricingPlan) => { setSelectedPlan(plan); setFormError(null); };

  const handleSelectPayment = (pay: PaymentQR) => {
    setSelectedPayment(pay);
    setPaymentMethodName(pay.name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer");
  };



  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    if (!selectedPlan) { setFormError("Please select a membership plan."); return; }

    const finalPrice = appFinalPrice;
    const discountAmount = appDiscountAmount;

    if (finalPrice > 0) {
      if (!paymentReference) { setFormError("Please fill in your payment reference number."); return; }
      if (!appPaymentProofFile) { setFormError("Please upload an image of your payment receipt as proof."); return; }
    }

    const finalCategory = businessCategory === "Other" ? otherCategoryText.trim() : businessCategory;
    if (!finalCategory) { setFormError("Please select a business category or specify one."); return; }
    setActionLoading(true);
    setFormError(null);
    try {
      let proofUrl = null;
      if (finalPrice > 0 && appPaymentProofFile) {
        proofUrl = await uploadImage(appPaymentProofFile, "payment-proofs");
      }

      let mappedMembershipType = selectedPlan.type;
      let packageAvailed = null;
      let membershipPackageId = null;

      if ((selectedPlan as any).isPackage) {
        mappedMembershipType = (selectedPlan as any).membership_type;
        packageAvailed = (selectedPlan as any).membership_type === "individual" ? "package_a" : (selectedPlan as any).membership_type === "sme" ? "package_b" : "package_c";
        membershipPackageId = selectedPlan.id;
      } else {
        if (selectedPlan.id === "package_a") {
          mappedMembershipType = "individual";
          packageAvailed = "package_a";
        } else if (selectedPlan.id === "package_b") {
          mappedMembershipType = "sme";
          packageAvailed = "package_b";
        } else if (selectedPlan.id === "package_c") {
          mappedMembershipType = "corporate";
          packageAvailed = "package_c";
        }
      }

      const { error: appError } = await supabase.from("membership_applications").insert({
        user_id: user.id, 
        membership_type: mappedMembershipType, 
        package_availed: packageAvailed,
        membership_package_id: membershipPackageId,
        company_name: companyName,
        business_category: finalCategory, 
        phone, 
        business_address: businessAddress,
        payment_method: finalPrice === 0 ? "free" : paymentMethodName, 
        payment_reference: finalPrice === 0 ? "PROMO-FREE" : paymentReference,
        payment_proof_url: proofUrl, 
        status: "pending", 
        payment_status: finalPrice === 0 ? "free" : "pending",
        promo_code_id: appAppliedPromo ? appAppliedPromo.id : null,
        discount_amount: discountAmount,
        final_amount: finalPrice,
      });
      if (appError) throw appError;

      // Securely increment promo code usage count if applied
      if (appAppliedPromo) {
        const { error: rpcError } = await supabase.rpc("increment_promo_uses", {
          p_code_id: appAppliedPromo.id
        });
        if (rpcError) console.warn("Failed to increment promo uses count:", rpcError.message);
      }

      const { error: profileError } = await supabase.from("profiles").update({
        membership_status: "pending", 
        membership_type: mappedMembershipType,
        company_name: companyName, 
        business_category: finalCategory, 
        phone, 
        business_address: businessAddress,
      }).eq("id", user.id);
      if (profileError) throw profileError;
      await refetchProfile();
      setSelectedPlan(null);
      setAppPaymentProofFile(null);
      setAppPaymentProofPreview("");
      setAppAppliedPromo(null);
      setAppPromoCode("");
    } catch (err: any) {
      setFormError(err.message || "Failed to submit application.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    const planToRenew = renewalPlan || plans.find((p) => p.type === profile.membership_type);
    if (!planToRenew) { toast.error("Please select a membership plan for renewal."); return; }

    const finalPrice = renewFinalPrice;
    const discountAmount = renewDiscountAmount;

    if (finalPrice > 0) {
      if (!renewalPaymentRef) { toast.error("Please fill in your payment reference number."); return; }
      if (!renewalPaymentProofFile) { toast.error("Please upload an image of your payment receipt as proof."); return; }
    }

    setActionLoading(true);
    try {
      let proofUrl = null;
      if (finalPrice > 0 && renewalPaymentProofFile) {
        proofUrl = await uploadImage(renewalPaymentProofFile, "payment-proofs");
      }

      const { error: appError } = await supabase.from("membership_applications").insert({
        user_id: user.id, membership_type: planToRenew.type,
        company_name: profile.company_name, business_category: profile.business_category,
        phone: profile.phone, business_address: profile.business_address,
        payment_method: finalPrice === 0 
          ? "free" 
          : (renewalPaymentMethod || (paymentMethods.length > 0 ? (paymentMethods[0].name.toLowerCase().includes("gcash") ? "gcash" : "bank_transfer") : "gcash")),
        payment_reference: finalPrice === 0 ? "PROMO-FREE" : renewalPaymentRef, 
        payment_proof_url: proofUrl,
        status: "pending", 
        payment_status: finalPrice === 0 ? "free" : "pending",
        promo_code_id: renewAppliedPromo ? renewAppliedPromo.id : null,
        discount_amount: discountAmount,
        final_amount: finalPrice,
      });
      if (appError) throw appError;

      // Securely increment promo code usage count if applied
      if (renewAppliedPromo) {
        const { error: rpcError } = await supabase.rpc("increment_promo_uses", {
          p_code_id: renewAppliedPromo.id
        });
        if (rpcError) console.warn("Failed to increment promo uses count:", rpcError.message);
      }

      setHasPendingRenewal(true);
      setShowRenewalModal(false);
      setRenewalPaymentRef("");
      setRenewalPaymentProofFile(null);
      setRenewalPaymentProofPreview("");
      setRenewAppliedPromo(null);
      setRenewPromoCode("");
      toast.success(
        finalPrice === 0 
          ? "Renewal application submitted successfully via promotional discount! No payment verification needed."
          : "Renewal payment reference and proof submitted! Our admin team will verify it soon."
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to submit renewal application.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!oldPassword) { toast.error("Please enter your current password."); return; }
    const allCriteriaMet = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;
    if (!allCriteriaMet) { toast.error("Please satisfy all password strength criteria."); return; }
    if (!passwordsMatch) { toast.error("Passwords do not match."); return; }
    setIsChangingPassword(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: profile.email || user.email || "", password: oldPassword });
      if (verifyError) throw new Error("Verification failed: The old password you entered is incorrect.");
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      toast.success("Password updated successfully!");
      setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveDirectoryListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!dirName || !dirDesc || !dirCat || !dirAddress) { setFormError("Please fill in all required fields marked with *."); return; }
    const finalDirCategory = dirCat === "Other" ? dirOtherCatText.trim() : dirCat;
    if (!finalDirCategory) { setFormError("Please select a category or specify one."); return; }
    setActionLoading(true);
    setFormError(null);
    try {
      if (hasListing && listingId) {
        let finalLogoUrl = dirLogoUrl;
        if (dirLogoFile) {
          try {
            finalLogoUrl = await uploadImage(dirLogoFile, "directory-logos");
          } catch (uploadErr: any) {
            setFormError("Logo upload failed: " + uploadErr.message);
            setActionLoading(false);
            return;
          }
        }

        const { error } = await supabase.from("business_directory").update({
          pending_changes: {
            business_name: dirName, description: dirDesc, contact_email: dirEmail,
            contact_phone: dirPhone, website_url: dirWeb,
            facebook_url: dirFacebook.trim() || null, instagram_url: dirInstagram.trim() || null,
            category: finalDirCategory, address: dirAddress,
            logo_url: finalLogoUrl || null,
          },
          approval_status: "pending_approval",
        }).eq("id", listingId);
        if (error) throw error;

        setDirLogoUrl(finalLogoUrl);
        setDirLogoPreview(finalLogoUrl);
        setDirLogoFile(null);

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
    setNewsTitle(""); setNewsSummary(""); setNewsContent("");
    setNewsCategory("General"); setNewsImg(""); setNewsImgFiles([]); setExistingNewsImgs([]); setEditingNews(null);
  };

  const handleSaveNewsSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile) return;
    if (!newsTitle.trim() || !newsSummary.trim() || !newsContent.trim()) { setFormError("Please fill in all required fields."); return; }
    setActionLoading(true);
    setFormError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of newsImgFiles) { uploadedUrls.push(await uploadImage(file, "news")); }
      const finalImagesList = [...existingNewsImgs, ...uploadedUrls];
      if (finalImagesList.length === 0 && newsImg.trim()) finalImagesList.push(newsImg.trim());
      const coverUrl = finalImagesList[0] || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=700&auto=format&fit=crop";
      const wordCount = newsContent.trim().split(/\s+/).length;
      const newsData = {
        title: newsTitle.trim(), summary: newsSummary.trim(), content: newsContent.trim(),
        category: newsCategory, image_url: coverUrl, images: finalImagesList,
        author: profile.full_name || "Chamber Member", user_id: user.id,
        status: "pending", read_time: `${Math.max(1, Math.round(wordCount / 200))} min`,
      };
      if (editingNews) {
        if (editingNews.status !== "pending") throw new Error("You can only edit articles that are pending approval.");
        const { error } = await supabase.from("news").update(newsData).eq("id", editingNews.id);
        if (error) throw error;
        toast.success("News submission updated successfully!");
      } else {
        const { error } = await supabase.from("news").insert(newsData);
        if (error) throw error;
        toast.success("News article submitted for review!");
      }
      setShowNewsSubmitModal(false);
      resetNewsForm();
      const { data: updatedNews } = await supabase.from("news").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      if (updatedNews) setMyNews(updatedNews);
    } catch (err: any) {
      setFormError(err.message || "Failed to submit news article.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditNewsClick = (item: any) => {
    if (item.status !== "pending") { toast.error("You can only edit submissions that are pending review."); return; }
    setEditingNews(item);
    setNewsTitle(item.title); setNewsSummary(item.summary); setNewsContent(item.content); setNewsCategory(item.category);
    setNewsImg(""); setNewsImgFiles([]);
    setExistingNewsImgs(item.images || (item.image_url ? [item.image_url] : []));
    setShowNewsSubmitModal(true);
  };

  const handleDeleteNewsSubmission = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("news").delete().eq("id", id).eq("user_id", user?.id || "");
      if (error) throw error;
      toast.success("Submission deleted.");
      setMyNews((prev) => prev.filter((n) => n.id !== id));
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
      const link = document.createElement("a");
      link.href = url;
      link.download = `chamber_pass_${eventTitle.toLowerCase().replace(/[^a-z0-9]/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Check-in pass downloaded successfully! You can present this QR image at the venue check-in.");
    } catch (err: any) {
      toast.error("Failed to download pass image: " + err.message);
    }
  };

  // ── Early returns ─────────────────────────────────────────────────────────
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
    const diffDays = Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return { isNear: diffDays <= 30, isExpired: diffDays <= 0, daysLeft: diffDays };
  };

  const { isNear: isNearExp, isExpired: isExpiredExp, daysLeft: daysLeftExp } = checkNearExpiration();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fbfaf6] pt-32 pb-24 px-4 md:px-8 max-w-7xl mx-auto">

      {/* ── Profile Header ─────────────────────────────────────────────── */}
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
            <button onClick={() => navigate("/admin")} className="btn-premium bg-emerald-800 hover:bg-emerald-700 text-white text-xs !py-2.5 !px-4 shadow-diffuse cursor-pointer">
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

      {/* ── Membership Application (status = none) ─────────────────────── */}
      {profile?.membership_status === "none" && (
        <ApplicationTab
          plans={plans} selectedPlan={selectedPlan} onSelectPlan={handleSelectPlan}
          packages={dbPackages}
          paymentMethods={paymentMethods} selectedPayment={selectedPayment} onSelectPayment={handleSelectPayment}
          formError={formError} actionLoading={actionLoading} onSubmit={handleSubmitApplication}
          companyName={companyName} setCompanyName={setCompanyName}
          businessCategory={businessCategory} setBusinessCategory={setBusinessCategory}
          otherCategoryText={otherCategoryText} setOtherCategoryText={setOtherCategoryText}
          businessAddress={businessAddress} setBusinessAddress={setBusinessAddress}
          phone={phone} setPhone={setPhone}
          paymentReference={paymentReference} setPaymentReference={setPaymentReference}
          appPaymentProofFile={appPaymentProofFile} setAppPaymentProofFile={setAppPaymentProofFile}
          appPaymentProofPreview={appPaymentProofPreview} setAppPaymentProofPreview={setAppPaymentProofPreview}
          promoCode={appPromoCode} setPromoCode={setAppPromoCode}
          appliedPromo={appAppliedPromo} setAppliedPromo={setAppAppliedPromo}
          onApplyPromo={handleApplyAppPromo} promoLoading={appPromoLoading}
          promoError={appPromoError} discountAmount={appDiscountAmount}
          finalPrice={appFinalPrice}
        />
      )}

      {/* ── Pending review screen ───────────────────────────────────────── */}
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
              <div><div className="text-gray-400">Membership Tier</div><div className="text-gray-900 mt-1">{getPlanDisplayName(profile.membership_type)} Member</div></div>
              <div><div className="text-gray-400">Reference Account</div><div className="text-gray-900 mt-1">{profile.company_name || "N/A"}</div></div>
              <div><div className="text-gray-400">Status</div><div className="text-green-700 mt-1 uppercase flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse" /> Reviewing</div></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Rejected screen ─────────────────────────────────────────────── */}
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

      {/* ── Active Member Dashboard ─────────────────────────────────────── */}
      {profile?.membership_status === "active" && (
        <div className="flex flex-col gap-6">
          {/* Expiration warning banner */}
          {isNearExp && (
            <div className={`p-5 rounded-[2rem] border flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm text-xs font-semibold ${
              isExpiredExp ? "bg-red-50 border-red-200 text-red-700" : "bg-amber-50 border-amber-200 text-amber-800"
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
                      setRenewalPlan(plans.find((p) => p.type === profile.membership_type) || null);
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

          {/* Sidebar nav + Main content grid */}
          <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
            {/* Sidebar */}
            <div className="bg-white rounded-2xl p-4.5 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] space-y-1">
              {([
                { id: "card", icon: <CreditCard size={16} />, label: "Digital Member Card" },
                { id: "events", icon: <CalendarDays size={16} />, label: `Registered Events (${registeredEvents.length})` },
                { id: "packages", icon: <Ticket size={16} />, label: "Buy Event Passes" },
                { id: "directory", icon: <Building2 size={16} />, label: "Business Directory Profile" },
                { id: "news", icon: <Newspaper size={16} />, label: `News Submissions (${myNews.length})` },
                { id: "stories", icon: <MessageSquareQuote size={16} />, label: "My Member Stories" },
                { id: "settings", icon: <Key size={16} />, label: "Change Password" },
              ] as const).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-3 transition-colors ${
                    activeTab === tab.id
                      ? "bg-green-700 text-white shadow-diffuse"
                      : "text-gray-600 hover:bg-gray-50 hover:text-green-700"
                  }`}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            <div className="space-y-6">
              <AnimatePresence mode="wait">
                {activeTab === "card" && <MemberCardTab key="card" profile={profile} credits={myCredits} />}

                {activeTab === "events" && (
                  <EventsTab key="events" registeredEvents={registeredEvents} onDownloadPass={handleDownloadPass} />
                )}

                {activeTab === "directory" && (
                  <DirectoryTab
                    key="directory"
                    hasListing={hasListing} approvalStatus={approvalStatus}
                    isVerified={dirIsVerified}
                    formError={formError} actionLoading={actionLoading} onSubmit={handleSaveDirectoryListing}
                    dirName={dirName} setDirName={setDirName}
                    dirDesc={dirDesc} setDirDesc={setDirDesc}
                    dirEmail={dirEmail} setDirEmail={setDirEmail}
                    dirPhone={dirPhone} setDirPhone={setDirPhone}
                    dirWeb={dirWeb} setDirWeb={setDirWeb}
                    dirFacebook={dirFacebook} setDirFacebook={setDirFacebook}
                    dirInstagram={dirInstagram} setDirInstagram={setDirInstagram}
                    dirCat={dirCat} setDirCat={setDirCat}
                    dirOtherCatText={dirOtherCatText} setDirOtherCatText={setDirOtherCatText}
                    dirAddress={dirAddress} setDirAddress={setDirAddress}
                    dirLogoFile={dirLogoFile} setDirLogoFile={setDirLogoFile}
                    dirLogoPreview={dirLogoPreview} setDirLogoPreview={setDirLogoPreview}
                  />
                )}

                {activeTab === "news" && (
                  <NewsTab
                    key="news"
                    myNews={myNews} actionLoading={actionLoading}
                    onNew={() => { resetNewsForm(); setFormError(null); setShowNewsSubmitModal(true); }}
                    onEdit={handleEditNewsClick}
                    onDelete={handleDeleteNewsSubmission}
                  />
                )}

                {activeTab === "stories" && <MemberStoriesTab key="stories" />}

                {activeTab === "packages" && (
                  <PackagesPurchaseTab
                    key="packages"
                    packages={dbPackages.filter((p) => p.package_type === "member_passes")}
                    paymentMethods={paymentMethods}
                    user={user}
                    profile={profile}
                  />
                )}

                {activeTab === "settings" && (
                  <PasswordTab
                    key="settings"
                    oldPassword={oldPassword} setOldPassword={setOldPassword}
                    newPassword={newPassword} setNewPassword={setNewPassword}
                    confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword}
                    isChangingPassword={isChangingPassword} onSubmit={handlePasswordChange}
                    hasMinLength={hasMinLength} hasUppercase={hasUppercase} hasLowercase={hasLowercase}
                    hasNumber={hasNumber} hasSpecial={hasSpecial} passwordsMatch={passwordsMatch}
                    strengthScore={strengthScore} getStrengthLabel={getStrengthLabel} getStrengthColor={getStrengthColor}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      )}

      {/* ── News Submit Modal ───────────────────────────────────────────── */}
      <NewsSubmitModal
        open={showNewsSubmitModal}
        onClose={() => { setShowNewsSubmitModal(false); resetNewsForm(); }}
        editingNews={editingNews} formError={formError}
        actionLoading={actionLoading} onSubmit={handleSaveNewsSubmission}
        newsTitle={newsTitle} setNewsTitle={setNewsTitle}
        newsSummary={newsSummary} setNewsSummary={setNewsSummary}
        newsContent={newsContent} setNewsContent={setNewsContent}
        newsCategory={newsCategory} setNewsCategory={setNewsCategory}
        newsImg={newsImg} setNewsImg={setNewsImg}
        newsImgFiles={newsImgFiles} setNewsImgFiles={setNewsImgFiles}
        existingNewsImgs={existingNewsImgs} setExistingNewsImgs={setExistingNewsImgs}
      />

      {/* ── Renewal Modal ───────────────────────────────────────────────── */}
      <RenewalModal
        open={showRenewalModal} 
        onClose={() => {
          setShowRenewalModal(false);
          setRenewAppliedPromo(null);
          setRenewPromoCode("");
        }}
        plans={plans} renewalPlan={renewalPlan} setRenewalPlan={setRenewalPlan}
        paymentMethods={paymentMethods}
        renewalSelectedPayment={renewalSelectedPayment}
        setRenewalSelectedPayment={(pay) => setRenewalSelectedPayment(pay)}
        setRenewalPaymentMethod={setRenewalPaymentMethod}
        renewalPaymentRef={renewalPaymentRef} setRenewalPaymentRef={setRenewalPaymentRef}
        renewalPaymentProofFile={renewalPaymentProofFile} setRenewalPaymentProofFile={setRenewalPaymentProofFile}
        renewalPaymentProofPreview={renewalPaymentProofPreview} setRenewalPaymentProofPreview={setRenewalPaymentProofPreview}
        actionLoading={actionLoading} onSubmit={handleRenewalSubmit}
        promoCode={renewPromoCode} setPromoCode={setRenewPromoCode}
        appliedPromo={renewAppliedPromo} setAppliedPromo={setRenewAppliedPromo}
        onApplyPromo={handleApplyRenewPromo} promoLoading={renewPromoLoading}
        promoError={renewPromoError} discountAmount={renewDiscountAmount}
        finalPrice={renewFinalPrice}
      />
    </div>
  );
};

export default Dashboard;
