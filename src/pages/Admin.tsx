import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import { supabase } from "../lib/supabase";
import { uploadImage } from "../lib/storage";
import { 
  Users, CreditCard, CalendarDays, Newspaper, Building2, 
  Settings, TrendingUp, CheckCircle, XCircle, Trash2, Edit2, 
  Plus, ArrowRight, Loader2, QrCode, Search, Check, RefreshCw, X, ArrowLeft, Archive,
  UserCheck, UserPlus, Copy, Shield, Receipt, FileDown, Upload, ChevronLeft, ChevronRight,
  User
} from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

// Types matching the schema
interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  membership_status: string;
  membership_type: string | null;
  company_name: string | null;
  phone: string | null;
  expires_at?: string | null;
  created_at?: string;
}

interface ApplicationRow {
  id: string;
  user_id: string;
  membership_type: string;
  company_name: string | null;
  business_category: string | null;
  phone: string | null;
  business_address: string | null;
  payment_method: string;
  payment_reference: string;
  payment_proof_url?: string | null;
  status: string;
  invoice_number?: string | null;
  created_at: string;
  profiles: {
    full_name: string;
    email: string;
  };
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  speaker: string;
  price: number;
  non_member_price: number;
  tag: string;
  tag_color: string;
  capacity?: number;
  image_url?: string;
  is_featured: boolean;
  is_archived: boolean;
}

interface EventRegistrationRow {
  id: string;
  full_name: string;
  email: string;
  payment_status: string;
  attendance_status: string;
  qr_code: string;
}

interface PricingRow {
  id: string;
  type: string;
  name: string;
  price: number;
  period: string;
  description: string;
  benefits: string[];
}

interface QRSettingRow {
  id: string;
  name: string;
  description: string;
  payment_instructions: string;
  qr_code_url: string;
  is_active: boolean;
}

interface NewsRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  category: string;
  read_time: string;
  author: string;
  image_url?: string;
  status?: string;
  user_id?: string | null;
  published_at?: string;
}

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

interface BoardMemberRow {
  id: string;
  name: string;
  position: string;
  rank: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
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

const Admin: React.FC = () => {
  const { user, profile, loading, isAdmin } = useAuth();
  const { toast, confirm } = useNotification();
  const navigate = useNavigate();

  // Selected Active Tab
  const [activeTab, setActiveTab] = useState<
    "analytics" | "applications" | "users" | "members" | "events" | "pricing" | "qrs" | "news" | "directory" | "board"
  >(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const validTabs = ["analytics", "applications", "users", "members", "events", "pricing", "qrs", "news", "directory", "board"];
    return (tab && validTabs.includes(tab) ? tab : "analytics") as any;
  });

  // Database lists
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [pricing, setPricing] = useState<PricingRow[]>([]);
  const [qrs, setQrs] = useState<QRSettingRow[]>([]);
  const [news, setNews] = useState<NewsRow[]>([]);
  const [directory, setDirectory] = useState<DirectoryRow[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Loading States
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal / Editing form states
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventSpeaker, setEventSpeaker] = useState("");
  const [eventPrice, setEventPrice] = useState(0);
  const [eventNonMemberPrice, setEventNonMemberPrice] = useState(0);
  const [eventTag, setEventTag] = useState("Event");
  const [eventImg, setEventImg] = useState("");
  
  // Share Invite Modal
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEvent, setShareEvent] = useState<EventRow | null>(null);
  const [eventView, setEventView] = useState<"active" | "archived">("active");
  const [eventImgFile, setEventImgFile] = useState<File | null>(null);
  const [eventFeatured, setEventFeatured] = useState(false);

  // QR Settings Editor
  const [editingQr, setEditingQr] = useState<QRSettingRow | null>(null);
  const [qrName, setQrName] = useState("");
  const [qrDesc, setQrDesc] = useState("");
  const [qrInstructions, setQrInstructions] = useState("");
  const [qrUrl, setQrUrl] = useState("");
  const [qrFile, setQrFile] = useState<File | null>(null);

  // Pricing CMS Editor
  const [editingPrice, setEditingPrice] = useState<PricingRow | null>(null);
  const [priceAmt, setPriceAmt] = useState(0);
  const [priceDesc, setPriceDesc] = useState("");
  const [priceBenefits, setPriceBenefits] = useState("");

  // News CMS Editor
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [editingNewsItem, setEditingNewsItem] = useState<NewsRow | null>(null);
  const [newsTitle, setNewsTitle] = useState("");
  const [newsSummary, setNewsSummary] = useState("");
  const [newsContent, setNewsContent] = useState("");
  const [newsCategory, setNewsCategory] = useState("General");
  const [newsImg, setNewsImg] = useState("");
  const [newsImgFile, setNewsImgFile] = useState<File | null>(null);
  const [reviewingNewsItem, setReviewingNewsItem] = useState<NewsRow | null>(null);

  // Member Management States
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [showCredsModal, setShowCredsModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberCompany, setNewMemberCompany] = useState("");
  const [newMemberPlan, setNewMemberPlan] = useState("individual");
  const [newMemberPhone, setNewMemberPhone] = useState("");
  const [newMemberAddress, setNewMemberAddress] = useState("");
  const [newMemberCategory, setNewMemberCategory] = useState("Retail");
  const [newMemberPassword, setNewMemberPassword] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; pass: string; name: string } | null>(null);
  const [editingMember, setEditingMember] = useState<ProfileRow | null>(null);
  const [editMemberExpiresAt, setEditMemberExpiresAt] = useState("");
  const [memberStatusFilter, setMemberStatusFilter] = useState<"all" | "active" | "pending" | "expired">("all");
  const [memberPlanFilter, setMemberPlanFilter] = useState("all");
  const [memberCurrentPage, setMemberCurrentPage] = useState(1);
  const [memberRowsPerPage, setMemberRowsPerPage] = useState(10);

  // Membership Applications Invoice Modal States
  const [showAppInvoiceModal, setShowAppInvoiceModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [appInvoiceNumInput, setAppInvoiceNumInput] = useState("");
  const [appModalStatus, setAppModalStatus] = useState("pending");

  // Excel Import States
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreviewData, setImportPreviewData] = useState<any[]>([]);
  const [importTempPassword, setImportTempPassword] = useState("TalisayMember2026!");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<{
    current: number;
    total: number;
    successCount: number;
    errors: string[];
  } | null>(null);

  // Business Directory Management States
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
  const [dirSearchQuery, setDirSearchQuery] = useState("");
  const [dirStatusFilter, setDirStatusFilter] = useState("all");
  const [dirCurrentPage, setDirCurrentPage] = useState(1);
  const [dirRowsPerPage, setDirRowsPerPage] = useState(10);

  // Review Edits Modal States
  const [showReviewEditsModal, setShowReviewEditsModal] = useState(false);
  const [reviewingDir, setReviewingDir] = useState<DirectoryRow | null>(null);

  // Board of Directors CMS States
  const [boardMembers, setBoardMembers] = useState<BoardMemberRow[]>([]);
  const [showBoardModal, setShowBoardModal] = useState(false);
  const [editingBoardMember, setEditingBoardMember] = useState<BoardMemberRow | null>(null);
  const [boardName, setBoardName] = useState("");
  const [boardPosition, setBoardPosition] = useState("");
  const [boardRank, setBoardRank] = useState(100);
  const [boardImgUrl, setBoardImgUrl] = useState("");
  const [boardImgFile, setBoardImgFile] = useState<File | null>(null);
  const [boardImgPreview, setBoardImgPreview] = useState("");
  const [boardSearchQuery, setBoardSearchQuery] = useState("");
  const [boardCurrentPage, setBoardCurrentPage] = useState(1);
  const [boardRowsPerPage, setBoardRowsPerPage] = useState(10);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [user, loading, isAdmin, navigate]);

  // Load all backend tables
  const loadDatabase = async () => {
    setPageLoading(true);
    try {
      // 1. Load users
      const { data: usersData } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (usersData) setProfiles(usersData);

      // 2. Load applications joined with profile
      const { data: appsData } = await supabase
        .from("membership_applications")
        .select(`
          id, user_id, membership_type, company_name, business_category, phone, business_address, 
          payment_method, payment_reference, payment_proof_url, status, invoice_number, created_at,
          profiles ( full_name, email )
        `)
        .order("created_at", { ascending: false });
      if (appsData) setApplications(appsData as any);

      // 3. Load events
      const { data: eventsData } = await supabase.from("events").select("*").order("date", { ascending: true });
      if (eventsData) setEvents(eventsData);

      // 4. Load pricing CMS
      const { data: pricingData } = await supabase.from("membership_pricing").select("*").order("price", { ascending: true });
      if (pricingData) setPricing(pricingData);

      // 5. Load QRs CMS
      const { data: qrsData } = await supabase.from("qr_settings").select("*").order("created_at", { ascending: true });
      if (qrsData) setQrs(qrsData);

      // 6. Load News CMS
      const { data: newsData } = await supabase.from("news").select("*").order("published_at", { ascending: false });
      if (newsData) setNews(newsData);

      // 7. Load Directory Listings
      const { data: dirData } = await supabase.from("business_directory").select("*").order("business_name", { ascending: true });
      if (dirData) setDirectory(dirData);

      // 8. Load Board Members
      const { data: boardData } = await supabase.from("board_members").select("*").order("rank", { ascending: true });
      if (boardData) setBoardMembers(boardData);

    } catch (error) {
      console.error("Failed to load admin databases:", error);
    } finally {
      setPageLoading(false);
    }
  };

  useEffect(() => {
    if (user && isAdmin) {
      loadDatabase();
    }
  }, [user, isAdmin]);

  // Reset pagination on filter or search changes
  useEffect(() => {
    setMemberCurrentPage(1);
  }, [searchQuery, memberStatusFilter, memberPlanFilter]);

  // Reset directory pagination on filter or search changes
  useEffect(() => {
    setDirCurrentPage(1);
  }, [dirSearchQuery, dirStatusFilter]);

  // APPROVE MEMBERSHIP APPLICATION
  const handleApproveApplication = async (app: ApplicationRow) => {
    setActionLoading(true);
    try {
      // 1. Update application status to approved and payment status to approved
      const { error: appError } = await supabase
        .from("membership_applications")
        .update({ status: "approved", payment_status: "approved" })
        .eq("id", app.id);
      if (appError) throw appError;

      // Fetch current profile to calculate expiration date
      const { data: currentProfile } = await supabase
        .from("profiles")
        .select("expires_at, membership_status")
        .eq("id", app.user_id)
        .single();

      let newExpiryDate = new Date();
      if (currentProfile && currentProfile.expires_at && currentProfile.membership_status === "active") {
        const existingExpiry = new Date(currentProfile.expires_at);
        if (existingExpiry > new Date()) {
          newExpiryDate = existingExpiry;
        }
      }
      newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

      // 2. Update user's profile to Active Member
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          membership_status: "active",
          membership_type: app.membership_type,
          company_name: app.company_name,
          phone: app.phone,
          business_address: app.business_address,
          business_category: app.business_category,
          expires_at: newExpiryDate.toISOString()
        })
        .eq("id", app.user_id);
      if (profileError) throw profileError;

      // 3. Automatically generate a public Business Directory entry (if company name is provided)
      if (app.company_name) {
        // Check if directory listing already exists
        const { data: existingListings } = await supabase
          .from("business_directory")
          .select("id")
          .eq("user_id", app.user_id)
          .limit(1);

        const existingListing = existingListings && existingListings.length > 0 ? existingListings[0] : null;

        if (!existingListing) {
          const { error: dirError } = await supabase
            .from("business_directory")
            .insert({
              user_id: app.user_id,
              business_name: app.company_name,
              description: `Registered Member business specializing in ${app.business_category || "commerce"}.`,
              contact_email: app.profiles?.email,
              contact_phone: app.phone,
              category: app.business_category || "Retail",
              address: app.business_address || "Talisay City",
              is_verified: true,
              is_featured: false,
              approval_status: "approved",
              pending_changes: null
            });
          if (dirError) console.error("Error creating auto-directory listing:", dirError.message);
        } else {
          // Verify existing listing
          await supabase
            .from("business_directory")
            .update({ is_verified: true })
            .eq("id", existingListing.id);
        }
      }

      await loadDatabase();
      toast.success("Application approved, user activated, and directory listing verified!");
    } catch (err: any) {
      toast.error("Error approving application: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };
  // REJECT MEMBERSHIP APPLICATION
  const handleRejectApplication = async (app: ApplicationRow) => {
    const confirmed = await confirm({
      title: "Reject Application",
      message: "Are you sure you want to reject this application?",
      confirmText: "Reject",
      variant: "danger",
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const { error: appError } = await supabase
        .from("membership_applications")
        .update({ status: "rejected", payment_status: "rejected" })
        .eq("id", app.id);
      if (appError) throw appError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ membership_status: "rejected" })
        .eq("id", app.user_id);
      if (profileError) throw profileError;

      await loadDatabase();
      toast.success("Application rejected.");
    } catch (err: any) {
      toast.error("Error rejecting application: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SAVE MEMBERSHIP APPLICATION INVOICE AND STATUS
  const handleSaveAppInvoiceAndStatus = async (
    app: ApplicationRow,
    invoiceNumber: string,
    newStatus: string
  ) => {
    let formattedInvoice = invoiceNumber.trim();
    if (formattedInvoice && !formattedInvoice.toUpperCase().startsWith("INV-")) {
      formattedInvoice = `INV-${formattedInvoice}`;
    }

    setActionLoading(true);
    try {
      // 1. Update application status, payment status, and invoice number
      const { error: appError } = await supabase
        .from("membership_applications")
        .update({ 
          status: newStatus, 
          payment_status: newStatus === "approved" ? "approved" : (newStatus === "rejected" ? "rejected" : "pending"),
          invoice_number: formattedInvoice || null
        })
        .eq("id", app.id);
      if (appError) throw appError;

      // 2. If transitioning to approved, update the profile and create business directory listing
      if (newStatus === "approved") {
        // Fetch current profile to calculate expiration date
        const { data: currentProfile } = await supabase
          .from("profiles")
          .select("expires_at, membership_status")
          .eq("id", app.user_id)
          .single();

        let newExpiryDate = new Date();
        if (currentProfile && currentProfile.expires_at && currentProfile.membership_status === "active") {
          const existingExpiry = new Date(currentProfile.expires_at);
          if (existingExpiry > new Date()) {
            newExpiryDate = existingExpiry;
          }
        }
        newExpiryDate.setFullYear(newExpiryDate.getFullYear() + 1);

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            membership_status: "active",
            membership_type: app.membership_type,
            company_name: app.company_name,
            phone: app.phone,
            business_address: app.business_address,
            business_category: app.business_category,
            expires_at: newExpiryDate.toISOString()
          })
          .eq("id", app.user_id);
        if (profileError) throw profileError;

        if (app.company_name) {
          const { data: existingListings } = await supabase
            .from("business_directory")
            .select("id")
            .eq("user_id", app.user_id)
            .limit(1);

          const existingListing = existingListings && existingListings.length > 0 ? existingListings[0] : null;

          if (!existingListing) {
            const { error: dirError } = await supabase
              .from("business_directory")
              .insert({
                user_id: app.user_id,
                business_name: app.company_name,
                description: `Registered Member business specializing in ${app.business_category || "commerce"}.`,
                contact_email: app.profiles?.email,
                contact_phone: app.phone,
                category: app.business_category || "Retail",
                address: app.business_address || "Talisay City",
                is_verified: true,
                is_featured: false,
                approval_status: "approved",
                pending_changes: null
              });
            if (dirError) console.error("Error creating auto-directory listing:", dirError.message);
          } else {
            await supabase
              .from("business_directory")
              .update({ is_verified: true })
              .eq("id", existingListing.id);
          }
        }
      } else if (newStatus === "rejected") {
        // If transitioning to rejected, reset profile membership_status to rejected
        await supabase
          .from("profiles")
          .update({ membership_status: "rejected" })
          .eq("id", app.user_id);
      } else {
        // Reset/Keep profile membership_status to pending or none
        await supabase
          .from("profiles")
          .update({ membership_status: "pending" })
          .eq("id", app.user_id);
      }

      toast.success("Membership application invoice and status updated successfully!");
      setShowAppInvoiceModal(false);
      await loadDatabase();
    } catch (err: any) {
      toast.error("Failed to update application details: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // PRINT MEMBERSHIP APPLICATION INVOICE
  const handlePrintAppInvoice = (app: ApplicationRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocker is preventing invoice generation. Please allow pop-ups.");
      return;
    }

    // Lookup plan pricing details
    const plan = pricing.find(p => p.type === app.membership_type);
    const planName = plan ? plan.name : `${app.membership_type.toUpperCase()} Tier`;
    const planPrice = plan ? plan.price : 0;

    const invoiceDisplayNumber = app.invoice_number ? app.invoice_number : "PENDING MATCH";

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Membership Invoice - ${app.profiles?.full_name || "Applicant"}</title>
        <style>
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1f2937;
            margin: 40px;
            font-size: 14px;
            line-height: 1.6;
          }
          .invoice-box {
            max-width: 800px;
            margin: auto;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            padding: 40px;
            background: #fff;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #059669;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          .logo-area h1 {
            font-size: 24px;
            font-weight: 800;
            color: #065f46;
            margin: 0;
            letter-spacing: -0.02em;
          }
          .logo-area p {
            font-size: 11px;
            color: #6b7280;
            margin: 4px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            font-weight: 600;
          }
          .invoice-details {
            text-align: right;
          }
          .invoice-details h2 {
            font-size: 20px;
            font-weight: 900;
            color: #111827;
            margin: 0;
            text-transform: uppercase;
          }
          .invoice-details p {
            font-size: 12px;
            color: #4b5563;
            margin: 4px 0 0 0;
          }
          .invoice-details span {
            font-family: monospace;
            font-weight: bold;
            color: #065f46;
          }
          .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          .section-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            color: #6b7280;
            margin-bottom: 8px;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #f3f4f6;
            padding-bottom: 4px;
          }
          .info-block p {
            margin: 3px 0;
            color: #374151;
          }
          .info-block strong {
            color: #111827;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 40px;
          }
          .table th {
            background-color: #f9fafb;
            color: #374151;
            font-weight: 700;
            font-size: 12px;
            text-transform: uppercase;
            border-bottom: 2px solid #e5e7eb;
            padding: 12px;
            text-align: left;
          }
          .table td {
            border-bottom: 1px solid #f3f4f6;
            padding: 12px;
            font-size: 13px;
            color: #374151;
          }
          .amount-summary {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            margin-top: 20px;
            font-size: 13px;
          }
          .amount-row {
            display: flex;
            width: 250px;
            justify-content: space-between;
            padding: 6px 0;
          }
          .amount-row.total {
            border-top: 2px solid #e5e7eb;
            font-size: 16px;
            font-weight: 800;
            color: #111827;
            padding-top: 10px;
          }
          .status-stamp {
            position: absolute;
            top: 120px;
            right: 40px;
            border: 4px solid #10b981;
            color: #10b981;
            font-size: 18px;
            font-weight: 900;
            text-transform: uppercase;
            padding: 6px 14px;
            border-radius: 8px;
            opacity: 0.15;
            transform: rotate(-12deg);
            pointer-events: none;
            letter-spacing: 0.1em;
          }
          .status-stamp.unpaid {
            border-color: #f59e0b;
            color: #f59e0b;
          }
          .footer {
            border-top: 1px solid #e5e7eb;
            padding-top: 20px;
            margin-top: 40px;
            font-size: 11px;
            color: #9ca3af;
            text-align: center;
          }
          @media print {
            body {
              margin: 0;
              background-color: #fff;
            }
            .invoice-box {
              border: none;
              padding: 0;
              box-shadow: none;
            }
            @page {
              size: portrait;
              margin: 15mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          ${
            app.status === "approved"
              ? `<div class="status-stamp">PAID</div>`
              : `<div class="status-stamp unpaid">PENDING</div>`
          }

          <div class="header">
            <div class="logo-area">
              <h1>Talisay Chamber of Commerce</h1>
              <p>Trade, Industry & Livelihood development</p>
            </div>
            <div class="invoice-details">
              <h2>Invoice / Official Receipt</h2>
              <p>Invoice No: <span>${invoiceDisplayNumber}</span></p>
              <p>Date: ${new Date(app.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>

          <div class="grid-2">
            <div class="info-block">
              <div class="section-title">Billed To</div>
              <p><strong>${app.profiles?.full_name || "Applicant"}</strong></p>
              <p>${app.profiles?.email || ""}</p>
              ${app.company_name ? `<p>Company: ${app.company_name}</p>` : ""}
              ${app.phone ? `<p>Phone: ${app.phone}</p>` : ""}
            </div>
            <div class="info-block">
              <div class="section-title">Chamber Information</div>
              <p><strong>Talisay Chamber of Commerce & Industry Inc.</strong></p>
              <p>Poblacion, Talisay City, Cebu, Philippines</p>
              <p>Email: billing@talisaychamber.org</p>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right; width: 120px;">Unit Price</th>
                <th style="text-align: right; width: 120px;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <strong>Chamber Membership Fee - ${planName} Plan</strong><br/>
                  <span style="font-size: 11px; color: #6b7280;">Validity: 1 Year from Date of Approval</span>
                </td>
                <td style="text-align: right;">PHP ${planPrice.toLocaleString()}</td>
                <td style="text-align: right;">PHP ${planPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="amount-summary">
            <div class="amount-row">
              <span style="color: #6b7280;">Subtotal:</span>
              <span>PHP ${planPrice.toLocaleString()}</span>
            </div>
            <div class="amount-row">
              <span style="color: #6b7280;">Payment Method:</span>
              <span style="text-transform: capitalize;">${app.payment_method.replace("_", " ")}</span>
            </div>
            ${
              app.payment_reference
                ? `<div class="amount-row">
                    <span style="color: #6b7280;">Reference:</span>
                    <span style="font-family: monospace; font-size: 11px;">${app.payment_reference}</span>
                  </div>`
                : ""
            }
            <div class="amount-row total">
              <span>Total Paid:</span>
              <span>PHP ${planPrice.toLocaleString()}</span>
            </div>
          </div>

          <div style="margin-top: 60px; font-size: 12px; color: #4b5563;">
            <p><strong>Terms & Conditions:</strong></p>
            <p style="font-size: 11px; color: #6b7280; margin-top: 4px;">
              This serves as an official proof of membership application and fee payment. Upon status approval, the applicant is registered as an active member of the Talisay Chamber of Commerce & Industry Inc.
            </p>
          </div>

          <div class="footer">
            Talisay Chamber of Commerce & Industry Inc. &copy; 2026. All rights reserved.
          </div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };



  // SAVE EVENT (NEW OR EDIT)
  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventVenue || !eventSpeaker) return;

    setActionLoading(true);
    try {
      let finalImgUrl = eventImg;
      if (eventImgFile) {
        finalImgUrl = await uploadImage(eventImgFile, "events");
      }

      // Determine colors based on tags
      let computedColor = "bg-green-100 text-green-700";
      if (eventTag.toLowerCase() === "summit") computedColor = "bg-gold/15 text-amber-800 border border-gold/25";
      if (eventTag.toLowerCase() === "expo") computedColor = "bg-amber-100 text-amber-700";

      const eventData = {
        title: eventTitle,
        description: eventDesc,
        date: eventDate,
        time: eventTime,
        venue: eventVenue,
        speaker: eventSpeaker,
        price: Number(eventPrice),
        non_member_price: Number(eventNonMemberPrice),
        tag: eventTag,
        tag_color: computedColor,
        is_featured: eventFeatured,
        image_url: finalImgUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop",
      };

      if (editingEvent) {
        const { error } = await supabase.from("events").update(eventData).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(eventData);
        if (error) throw error;
      }

      setShowEventModal(false);
      setEditingEvent(null);
      resetEventForm();
      await loadDatabase();
      toast.success("Event saved successfully!");
    } catch (err: any) {
      toast.error("Error saving event: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const resetEventForm = () => {
    setEventTitle("");
    setEventDesc("");
    setEventDate("");
    setEventTime("");
    setEventVenue("");
    setEventSpeaker("");
    setEventPrice(0);
    setEventNonMemberPrice(0);
    setEventTag("Event");
    setEventImg("");
    setEventImgFile(null);
    setEventFeatured(false);
  };

  // DELETE EVENT
  const handleDeleteEvent = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Event",
      message: "Are you sure you want to delete this event and all its registrations?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      await loadDatabase();
      toast.success("Event deleted.");
    } catch (err: any) {
      toast.error("Failed to delete event: " + err.message);
    }
  };

  // Toggle Archive Status
  const handleToggleArchiveEvent = async (evt: EventRow) => {
    const nextStatus = !evt.is_archived;
    const confirmed = await confirm({
      title: nextStatus ? "Archive Event" : "Unarchive Event",
      message: `Are you sure you want to ${nextStatus ? "archive" : "unarchive"} "${evt.title}"? ${
        nextStatus ? "It will be hidden from public registration list." : "It will become active on public lists again."
      }`,
      confirmText: nextStatus ? "Archive" : "Unarchive",
      variant: nextStatus ? "danger" : "primary"
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({ is_archived: nextStatus })
        .eq("id", evt.id);

      if (error) throw error;
      
      await loadDatabase();
      toast.success(nextStatus ? "Event archived successfully!" : "Event unarchived!");
    } catch (err: any) {
      toast.error("Failed to update archive status: " + err.message);
    }
  };

  // Generate secure random password
  const handleAutoGeneratePassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
    let pass = "TC-";
    for (let i = 0; i < 8; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewMemberPassword(pass);
    toast.info("Temporary password auto-generated!");
  };

  // CREATE MEMBER AND USER ACCOUNT
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName || !newMemberEmail || !newMemberPassword) {
      toast.error("Please fill in Name, Email, and Password.");
      return;
    }

    setActionLoading(true);
    try {
      // 1. Check if email already exists in profiles
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

      // 2. Instantiate temporary client to create user without overriding current admin session
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
      const tempClient = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });

      // 3. Register user via auth.signUp
      const { data: authData, error: authError } = await tempClient.auth.signUp({
        email: newMemberEmail.trim(),
        password: newMemberPassword,
        options: {
          data: {
            full_name: newMemberName.trim(),
            company_name: newMemberCompany.trim(),
            role: "member",
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user account. No user data returned.");

      let expiryDate = new Date();
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);

      // 4. Update the profile to active member and other chosen fields
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          membership_status: "active",
          membership_type: newMemberPlan,
          company_name: newMemberCompany.trim() || null,
          phone: newMemberPhone.trim() || null,
          business_address: newMemberAddress.trim() || null,
          business_category: newMemberCategory || null,
          expires_at: expiryDate.toISOString()
        })
        .eq("id", authData.user.id);

      if (profileError) throw profileError;

      // 5. Automatically create Business Directory Listing if company name is provided
      if (newMemberCompany.trim()) {
        const { error: dirError } = await supabase
          .from("business_directory")
          .insert({
            user_id: authData.user.id,
            business_name: newMemberCompany.trim(),
            description: `Registered Chamber Member business specializing in ${newMemberCategory || "commerce"}.`,
            contact_email: newMemberEmail.trim(),
            contact_phone: newMemberPhone.trim() || null,
            category: newMemberCategory || "Retail",
            address: newMemberAddress.trim() || "Talisay City",
            is_verified: true,
            is_featured: false,
            approval_status: "approved",
            pending_changes: null
          });
        if (dirError) console.error("Error creating auto-directory listing:", dirError.message);
      }

      // 6. Set created credentials for showing to admin
      setCreatedCreds({
        name: newMemberName.trim(),
        email: newMemberEmail.trim(),
        pass: newMemberPassword,
      });

      // Reset form states
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
      
      await loadDatabase();
      toast.success("Member account created successfully!");
    } catch (err: any) {
      toast.error("Error creating member: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // UPDATE EXISTING MEMBER STATUS AND DETAILS
  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    setActionLoading(true);
    try {
      const updateData: any = {
        full_name: newMemberName.trim() || null,
        membership_status: newMemberPlan, // in this context newMemberPlan state stores status when editing
        membership_type: newMemberCategory || null, // in this context newMemberCategory state stores plan when editing
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

      // Automatically create directory entry if they are set to active and have a company and directory entry doesn't exist yet
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
              is_verified: true,
              is_featured: false,
              approval_status: "approved",
              pending_changes: null
            });
          if (dirError) console.error("Error creating auto-directory listing on update:", dirError.message);
        }
      }

      setShowEditMemberModal(false);
      setEditingMember(null);
      await loadDatabase();
      toast.success("Member details updated successfully!");
    } catch (err: any) {
      toast.error("Error updating member details: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE USER (calls admin RPC which deletes from auth.users with cascade)
  const handleDeleteUser = async (item: ProfileRow) => {
    const confirmed = await confirm({
      title: "Delete User Account",
      message: `Are you sure you want to permanently delete the account for "${item.full_name || item.email}"? This will also remove all their membership applications and event registrations. This action cannot be undone.`,
      confirmText: "Delete Permanently",
      variant: "danger",
    });
    if (!confirmed) return;

    // Front-end self-delete guard
    if (item.id === user?.id) {
      toast.error("You cannot delete your own account.");
      return;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_delete_user", {
        target_user_id: item.id,
      });
      if (error) throw error;
      await loadDatabase();
      toast.success(`User "${item.full_name || item.email}" has been deleted.`);
    } catch (err: any) {
      toast.error("Failed to delete user: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditMemberClick = (member: ProfileRow) => {
    setEditingMember(member);
    setNewMemberName(member.full_name || "");
    setNewMemberEmail(member.email || "");
    setNewMemberCompany(member.company_name || "");
    setNewMemberPlan(member.membership_status || "active"); // used for status dropdown
    setNewMemberCategory(member.membership_type || "individual"); // used for plan dropdown
    setNewMemberPhone(member.phone || "");
    setEditMemberExpiresAt(member.expires_at ? member.expires_at.split("T")[0] : "");
    setShowEditMemberModal(true);
  };

  // Trigger Event Share Modal
  const handleShareEventClick = (evt: EventRow) => {
    setShareEvent(evt);
    setShowShareModal(true);
  };

  // Download QR Code for Event Registration
  const handleDownloadShareQR = async (evt: EventRow, url: string) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `register_qr_${evt.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
      toast.success("Registration QR Code downloaded!");
    } catch (e: any) {
      toast.error("Failed to download QR code: " + e.message);
    }
  };

  // SAVE QR METHOD SETTING
  const handleSaveQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;
    setActionLoading(true);
    try {
      let finalQrUrl = qrUrl;
      if (qrFile) {
        finalQrUrl = await uploadImage(qrFile, "qrs");
      }
      const { error } = await supabase
        .from("qr_settings")
        .update({
          name: qrName,
          description: qrDesc,
          payment_instructions: qrInstructions,
          qr_code_url: finalQrUrl,
        })
        .eq("id", editingQr.id);
      if (error) throw error;
      setEditingQr(null);
      setQrFile(null);
      await loadDatabase();
      toast.success("QR Setting updated!");
    } catch (err: any) {
      toast.error("Failed to save QR setting: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE QR PAYMENT METHOD
  const handleDeleteQr = async (qr: QRSettingRow) => {
    const confirmed = await confirm({
      title: "Delete Payment Option",
      message: `Are you sure you want to delete the "${qr.name}" payment method? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    setActionLoading(true);
    try {
      const { error } = await supabase.from("qr_settings").delete().eq("id", qr.id);
      if (error) throw error;
      if (editingQr?.id === qr.id) {
        setEditingQr(null);
        setQrFile(null);
      }
      await loadDatabase();
      toast.success(`"${qr.name}" payment option deleted.`);
    } catch (err: any) {
      toast.error("Failed to delete payment option: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SAVE MEMBERSHIP PRICING TIER (CMS)
  const handleSavePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPrice) return;
    setActionLoading(true);
    try {
      const benefitsArr = priceBenefits.split("\n").map(b => b.trim()).filter(b => b.length > 0);
      const { error } = await supabase
        .from("membership_pricing")
        .update({
          price: Number(priceAmt),
          description: priceDesc,
          benefits: benefitsArr,
        })
        .eq("id", editingPrice.id);
      if (error) throw error;
      setEditingPrice(null);
      await loadDatabase();
      toast.success("Pricing plan updated!");
    } catch (err: any) {
      toast.error("Failed to save pricing: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SAVE NEWS POST (CMS)
  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsTitle || !newsSummary || !newsContent) return;
    setActionLoading(true);
    try {
      let finalNewsImgUrl = newsImg;
      if (newsImgFile) {
        finalNewsImgUrl = await uploadImage(newsImgFile, "news");
      }

      const wordCount = newsContent.trim().split(/\s+/).length;
      const readTime = `${Math.max(1, Math.ceil(wordCount / 200))} min read`;

      const newsData = {
        title: newsTitle,
        summary: newsSummary,
        content: newsContent,
        category: newsCategory,
        image_url: finalNewsImgUrl || "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=700&auto=format&fit=crop",
        read_time: readTime,
        status: editingNewsItem ? (editingNewsItem.status || 'approved') : 'approved',
        user_id: editingNewsItem ? editingNewsItem.user_id : (user?.id || null),
      };

      if (editingNewsItem) {
        const { error } = await supabase.from("news").update(newsData).eq("id", editingNewsItem.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("news").insert(newsData);
        if (error) throw error;
      }

      setShowNewsModal(false);
      setEditingNewsItem(null);
      setNewsTitle("");
      setNewsSummary("");
      setNewsContent("");
      setNewsCategory("General");
      setNewsImg("");
      setNewsImgFile(null);
      await loadDatabase();
      toast.success("News article published successfully!");
    } catch (err: any) {
      toast.error("Failed to publish news: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // APPROVE MEMBER NEWS SUBMISSION
  const handleApproveNewsSubmission = async (item: NewsRow) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("news")
        .update({
          status: "approved",
          published_at: new Date().toISOString()
        })
        .eq("id", item.id);

      if (error) throw error;
      setReviewingNewsItem(null);
      await loadDatabase();
      toast.success("News submission approved and published!");
    } catch (err: any) {
      toast.error("Failed to approve submission: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // REJECT MEMBER NEWS SUBMISSION
  const handleRejectNewsSubmission = async (item: NewsRow) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("news")
        .update({ status: "rejected" })
        .eq("id", item.id);

      if (error) throw error;
      setReviewingNewsItem(null);
      await loadDatabase();
      toast.success("News submission rejected.");
    } catch (err: any) {
      toast.error("Failed to reject submission: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // DELETE NEWS POST
  const handleDeleteNews = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete News Article",
      message: "Are you sure you want to delete this news article?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("news").delete().eq("id", id);
      if (error) throw error;
      await loadDatabase();
      toast.success("News article deleted.");
    } catch (err: any) {
      toast.error("Failed to delete article: " + err.message);
    }
  };

  // VERIFY / FEATURE DIRECTORY LISTING
  const handleToggleDirectoryVerify = async (biz: DirectoryRow) => {
    try {
      const { error } = await supabase
        .from("business_directory")
        .update({ is_verified: !biz.is_verified })
        .eq("id", biz.id);
      if (error) throw error;
      await loadDatabase();
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
      await loadDatabase();
    } catch (err: any) {
      toast.error("Error toggling featured tag: " + err.message);
    }
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
      await loadDatabase();
      toast.success("Listing deleted.");
    } catch (err: any) {
      toast.error("Failed to delete listing: " + err.message);
    }
  };

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
      // Upload logo if a new file was selected
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
      await loadDatabase();
    } catch (err: any) {
      toast.error("Error saving directory listing: " + err.message);
    } finally {
      setActionLoading(false);
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
          pending_changes: null,
          approval_status: "approved"
        })
        .eq("id", biz.id);
      if (error) throw error;

      setShowReviewEditsModal(false);
      setReviewingDir(null);
      await loadDatabase();
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
      await loadDatabase();
      toast.success("Proposed edits discarded.");
    } catch (err: any) {
      toast.error("Error rejecting edits: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Board of Directors CRUD Handlers
  const resetBoardForm = () => {
    setEditingBoardMember(null);
    setBoardName("");
    setBoardPosition("");
    setBoardRank(100);
    setBoardImgUrl("");
    setBoardImgFile(null);
    setBoardImgPreview("");
  };

  const handleSaveBoardMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardName || !boardPosition) {
      toast.error("Name and Position are required.");
      return;
    }

    setActionLoading(true);
    try {
      let finalImgUrl = boardImgUrl;
      if (boardImgFile) {
        finalImgUrl = await uploadImage(boardImgFile, "board-members");
      }

      const payload = {
        name: boardName,
        position: boardPosition,
        rank: Number(boardRank),
        image_url: finalImgUrl || null,
      };

      if (editingBoardMember) {
        const { error } = await supabase
          .from("board_members")
          .update(payload)
          .eq("id", editingBoardMember.id);
        if (error) throw error;
        toast.success("Board member updated successfully!");
      } else {
        const { error } = await supabase
          .from("board_members")
          .insert(payload);
        if (error) throw error;
        toast.success("Board member added successfully!");
      }

      setShowBoardModal(false);
      resetBoardForm();
      await loadDatabase();
    } catch (err: any) {
      toast.error("Failed to save board member: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteBoardMember = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Board Member",
      message: "Are you sure you want to remove this board member from the list?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("board_members")
        .delete()
        .eq("id", id);
      if (error) throw error;
      toast.success("Board member deleted.");
      await loadDatabase();
    } catch (err: any) {
      toast.error("Failed to delete board member: " + err.message);
    }
  };

  const handleEditBoardMemberClick = (member: BoardMemberRow) => {
    setEditingBoardMember(member);
    setBoardName(member.name);
    setBoardPosition(member.position);
    setBoardRank(member.rank);
    setBoardImgUrl(member.image_url || "");
    setBoardImgPreview(member.image_url || "");
    setShowBoardModal(true);
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

  // Handle Excel file selection and parsing
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

        // Normalize sheet columns
        const normalized = json.map((row: any, index) => {
          // Find full name key
          const fullNameKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "full name" ||
              k.toLowerCase() === "name" ||
              k.toLowerCase() === "fullname" ||
              k.toLowerCase() === "member name" ||
              k.toLowerCase() === "name of member"
          );
          
          // Find email key
          const emailKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "email" ||
              k.toLowerCase() === "email address" ||
              k.toLowerCase() === "emailaddress"
          );

          // Find company key
          const companyKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "company" ||
              k.toLowerCase() === "company name" ||
              k.toLowerCase() === "business" ||
              k.toLowerCase() === "business name" ||
              k.toLowerCase() === "business/company name"
          );

          // Find phone key
          const phoneKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "phone" ||
              k.toLowerCase() === "phone number" ||
              k.toLowerCase() === "contact" ||
              k.toLowerCase() === "contact number" ||
              k.toLowerCase() === "mobile number" ||
              k.toLowerCase() === "mobile"
          );

          // Find address key
          const addressKey = Object.keys(row).find(
            (k) =>
              k.toLowerCase() === "address" ||
              k.toLowerCase() === "business address"
          );

          // Find tier key
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

          // Map tier string to database plan keys: individual, sme, corporate
          let mappedTier = "individual";
          if (rawTier.includes("sme") || rawTier.includes("medium")) {
            mappedTier = "sme";
          } else if (rawTier.includes("corporate") || rawTier.includes("large")) {
            mappedTier = "corporate";
          }

          return {
            rowNum: index + 2, // Excel rows are 1-indexed, headers are row 1
            fullName: rawFullName,
            email: rawEmail,
            companyName: rawCompany,
            phone: rawPhone,
            address: rawAddress,
            tier: mappedTier
          };
        });

        // Filter out rows that don't have name and email
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

  // Sequentially import members calling pg RPC function
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
          p_expires_at: null // Expiry date is set individually after import
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
    await loadDatabase();
    
    if (errorsList.length === 0) {
      toast.success(`Successfully imported all ${successes} members!`);
    } else if (successes > 0) {
      toast.info(`Import complete. Imported ${successes} of ${importPreviewData.length} members with some errors.`);
    } else {
      toast.error("Failed to import any members. Check row details or email registration conflicts.");
    }
  };

  // Helper values for calculations
  const totalProfilesCount = profiles.length;
  const activeMembersCount = profiles.filter(p => p.membership_status === "active").length;
  const pendingAppsCount = applications.filter(a => a.status === "pending").length;
  
  // Calculate revenue: sum of plans of active users
  const totalRevenueEstimates = profiles.reduce((sum, p) => {
    if (p.membership_status !== "active") return sum;
    const plan = pricing.find(pr => pr.type === p.membership_type);
    return sum + (plan ? Number(plan.price) : 0);
  }, 0);

  // Filtered and Paginated Profiles
  const filteredProfiles = profiles
    .filter(p => p.membership_status !== "none")
    .filter(p => {
      if (memberStatusFilter === "all") return true;
      if (memberStatusFilter === "active") return p.membership_status === "active";
      if (memberStatusFilter === "pending") return p.membership_status === "pending";
      if (memberStatusFilter === "expired") return p.membership_status === "expired" || p.membership_status === "rejected";
      return true;
    })
    .filter(p => {
      if (memberPlanFilter === "all") return true;
      return p.membership_type === memberPlanFilter;
    })
    .filter(p => 
      [p.full_name, p.email, p.company_name].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
    );

  const totalFilteredCount = filteredProfiles.length;
  const totalMemberPages = Math.ceil(totalFilteredCount / memberRowsPerPage) || 1;
  const paginatedProfiles = filteredProfiles.slice(
    (memberCurrentPage - 1) * memberRowsPerPage,
    memberCurrentPage * memberRowsPerPage
  );

  // Filtered and Paginated Directory listings
  const filteredDirectory = directory
    .filter(biz => {
      if (dirStatusFilter === "all") return true;
      if (dirStatusFilter === "verified") return biz.is_verified === true;
      if (dirStatusFilter === "pending") return biz.is_verified === false;
      if (dirStatusFilter === "featured") return biz.is_featured === true;
      return true;
    })
    .filter(biz => {
      const searchLower = dirSearchQuery.toLowerCase();
      const owner = profiles.find(p => p.id === biz.user_id);
      const ownerName = owner ? (owner.full_name || "") : "";
      const ownerEmail = owner ? (owner.email || "") : "";
      
      return [
        biz.business_name || "",
        biz.description || "",
        biz.category || "",
        biz.address || "",
        biz.contact_email || "",
        biz.contact_phone || "",
        ownerName,
        ownerEmail
      ].join(" ").toLowerCase().includes(searchLower);
    });

  const totalDirFilteredCount = filteredDirectory.length;
  const totalDirPages = Math.ceil(totalDirFilteredCount / dirRowsPerPage) || 1;
  const paginatedDirectory = filteredDirectory.slice(
    (dirCurrentPage - 1) * dirRowsPerPage,
    dirCurrentPage * dirRowsPerPage
  );

  // Show loading spinner while auth or page data is loading
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf6]">
        <Loader2 size={36} className="animate-spin text-green-700" />
      </div>
    );
  }

  // If not logged in or not admin, the useEffect above handles redirect.
  // Show a brief spinner while navigation processes.
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf6]">
        <Loader2 size={36} className="animate-spin text-green-700" />
      </div>
    );
  }

  // Admin data is loading
  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbfaf6]">
        <Loader2 size={36} className="animate-spin text-green-700" />
      </div>
    );
  }

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

  return (
    <div className="min-h-screen bg-[#0E1B15] text-[#ECEFEF] pt-6 md:pt-8 pb-16 flex">
      {/* Dynamic Admin Left Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0A1410] p-6 hidden md:flex flex-col gap-6 select-none flex-shrink-0">
        <div>
          <span className="text-[10px] font-heading font-bold text-green-400 tracking-[0.2em] uppercase">Control Panel</span>
          <h2 className="text-sm font-heading font-black text-white mt-1">Chamber Admin</h2>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1.5">
          {[
            { id: "analytics", label: "Analytics Overview", icon: TrendingUp },
            { id: "applications", label: "Applications", icon: CreditCard, count: pendingAppsCount },
            { id: "users", label: "User Management", icon: Users },
            { id: "members", label: "Member Management", icon: UserCheck },
            { id: "events", label: "Events & Passes", icon: CalendarDays },
            { id: "pricing", label: "Membership Fees CMS", icon: CreditCard },
            { id: "qrs", label: "QR Payment CMS", icon: QrCode },
            { id: "news", label: "News & Announcements", icon: Newspaper },
            { id: "directory", label: "Business Directory", icon: Building2 },
            { id: "board", label: "Board of Directors", icon: Shield },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as any);
                setSearchQuery("");
                const url = new URL(window.location.href);
                url.searchParams.set("tab", id);
                window.history.pushState({}, "", url.toString());
              }}
              className={`w-full flex items-center justify-between px-4.5 py-3 rounded-xl text-[12px] font-semibold transition-all cursor-pointer ${
                activeTab === id
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "text-[#8A9690] hover:bg-white/5 hover:text-white"
              }`}
            >
              <span className="flex items-center gap-3">
                <Icon size={15} /> {label}
              </span>
              {count !== undefined && count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[9px] font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="border-t border-white/5 pt-4">
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-4.5 py-3 rounded-xl text-[12px] font-semibold text-[#8A9690] hover:bg-white/5 hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft size={15} /> Exit Admin Console
          </button>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto overflow-y-auto">
        {/* Mobile Tab Navigation */}
        <div className="md:hidden mb-6 overflow-x-auto pb-3 flex gap-2 border-b border-white/5 scrollbar-none -mx-6 px-6">
          {[
            { id: "analytics", label: "Analytics", icon: TrendingUp },
            { id: "applications", label: "Applications", icon: CreditCard, count: pendingAppsCount },
            { id: "users", label: "Users", icon: Users },
            { id: "members", label: "Members", icon: UserCheck },
            { id: "events", label: "Events", icon: CalendarDays },
            { id: "pricing", label: "Plans CMS", icon: CreditCard },
            { id: "qrs", label: "QR CMS", icon: QrCode },
            { id: "news", label: "News CMS", icon: Newspaper },
            { id: "directory", label: "Directory", icon: Building2 },
            { id: "board", label: "Board", icon: Shield },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as any);
                setSearchQuery("");
                const url = new URL(window.location.href);
                url.searchParams.set("tab", id);
                window.history.pushState({}, "", url.toString());
              }}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                activeTab === id
                  ? "bg-green-700 text-white shadow-diffuse"
                  : "bg-white/[0.02] border border-white/5 text-[#8A9690] hover:text-white"
              }`}
            >
              <Icon size={13} />
              <span>{label}</span>
              {count !== undefined && count > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[8px] font-bold">
                  {count}
                </span>
              )}
            </button>
          ))}
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all shrink-0 cursor-pointer bg-white/[0.02] border border-white/5 text-[#8A9690] hover:text-white"
          >
            <ArrowLeft size={13} />
            <span>Exit Admin</span>
          </button>
        </div>
        {/* Dynamic header depending on tab */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-heading font-black text-white leading-tight capitalize">
              {activeTab.replace("-", " ")}
            </h1>
            <p className="text-xs text-[#8A9690] mt-1">
              Admin console to manage Chamber of Commerce databases.
            </p>
          </div>
          
          <button
            onClick={() => loadDatabase()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 text-xs text-[#ECEFEF] bg-[#11241C] hover:bg-[#152F24] transition-colors cursor-pointer self-start"
          >
            <RefreshCw size={12} /> Sync Databases
          </button>
        </div>

        {/* TAB 1: ANALYTICS OVERVIEW */}
        {activeTab === "analytics" && (
          <div className="space-y-8">
            {/* Stat Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Active Members", count: activeMembersCount, icon: Users, color: "text-emerald-400 bg-emerald-500/10" },
                { label: "Pending Approvals", count: pendingAppsCount, icon: CreditCard, color: "text-amber-400 bg-amber-500/10" },
                { label: "Total Registered Users", count: totalProfilesCount, icon: Users, color: "text-blue-400 bg-blue-500/10" },
                { label: "Annual Member Revenue", count: `PHP ${totalRevenueEstimates.toLocaleString()}`, icon: TrendingUp, color: "text-gold bg-amber-500/10" },
              ].map(({ label, count, icon: Icon, color }) => (
                <div key={label} className="bg-[#0A1410] border border-white/5 rounded-2xl p-6 flex flex-col justify-between h-32">
                  <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-[#8A9690] leading-tight max-w-[15ch]">{label}</span>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
                      <Icon size={15} />
                    </div>
                  </div>
                  <div className="text-xl font-heading font-black text-white">{count}</div>
                </div>
              ))}
            </div>

            {/* Member Tiers distribution grid */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
                <h3 className="text-sm font-heading font-bold text-white mb-6">Membership Tier Distribution</h3>
                <div className="space-y-4">
                  {pricing.map((plan) => {
                    const count = profiles.filter(p => p.membership_status === "active" && p.membership_type === plan.type).length;
                    const pct = activeMembersCount > 0 ? (count / activeMembersCount) * 100 : 0;
                    return (
                      <div key={plan.id} className="space-y-2">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="capitalize">{plan.name} Member</span>
                          <span>{count} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-green-600 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-heading font-bold text-white mb-3">Database Integrity Checklist</h3>
                  <p className="text-xs text-[#8A9690] leading-relaxed mb-6">
                    All tables are encrypted under strict Postgres Row Level Security (RLS). Public users can access directories, plans, and events, while member data is isolated.
                  </p>
                </div>
                <div className="space-y-3.5 text-xs font-semibold">
                  <div className="flex items-center gap-2"><Check className="text-green-500" size={15} /> Row Level Security Active</div>
                  <div className="flex items-center gap-2"><Check className="text-green-500" size={15} /> Sign-up Profile Auto-Trigger Active</div>
                  <div className="flex items-center gap-2"><Check className="text-green-500" size={15} /> Admin Security Definer Function Validated</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MEMBERSHIP APPLICATIONS */}
        {activeTab === "applications" && (
          <div className="bg-[#0A1410] border border-white/5 rounded-3xl overflow-hidden p-6">
            <h3 className="text-base font-heading font-black text-white mb-6">Pending Payment Approvals</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
                    <th className="pb-4.5 pl-2">Applicant</th>
                    <th className="pb-4.5">Plan Details</th>
                    <th className="pb-4.5">Company Info</th>
                    <th className="pb-4.5">Reference Account</th>
                    <th className="pb-4.5">Status</th>
                    <th className="pb-4.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold">
                  {applications.map((app) => (
                    <tr key={app.id} className="hover:bg-white/[0.01]">
                      <td className="py-4.5 pl-2">
                        <div className="text-white font-bold">{app.profiles?.full_name || "N/A"}</div>
                        <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{app.profiles?.email}</div>
                      </td>
                      <td className="py-4.5">{getPlanDisplayName(app.membership_type)}</td>
                      <td className="py-4.5">
                        <div className="text-white">{app.company_name}</div>
                        <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{app.business_category}</div>
                      </td>
                      <td className="py-4.5">
                        <div className="text-white capitalize">{app.payment_method.replace("_", " ")}</div>
                        <div className="text-[11px] text-[#8A9690] font-mono mt-0.5">{app.payment_reference}</div>
                      </td>
                      <td className="py-4.5">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          app.status === "pending"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                            : app.status === "approved"
                            ? "bg-green-500/10 text-green-400 border border-green-500/25"
                            : "bg-red-500/10 text-red-400 border border-red-500/25"
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="py-4.5 text-right pr-2">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedApp(app);
                              setAppInvoiceNumInput(app.invoice_number || "");
                              setAppModalStatus(app.status);
                              setShowAppInvoiceModal(true);
                            }}
                            className="px-2.5 py-1 rounded border border-white/5 text-[10px] font-bold text-green-400 bg-[#11241C] hover:bg-[#152F24] transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Receipt size={12} />
                            {app.invoice_number ? app.invoice_number : "Invoice"}
                          </button>
                          {app.status === "pending" && (
                            <>
                              <button
                                onClick={() => handleApproveApplication(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded bg-green-700 hover:bg-green-600 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <CheckCircle size={12} /> Approve
                              </button>
                              <button
                                onClick={() => handleRejectApplication(app)}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <XCircle size={12} /> Reject
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {applications.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-gray-500">
                        No membership applications submitted yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: USER MANAGEMENT */}
        {activeTab === "users" && (
          <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <h3 className="text-base font-heading font-black text-white self-start sm:self-auto">All Registered Profiles</h3>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={15} />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white placeholder-gray-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
                    <th className="pb-4.5 pl-2">User details</th>
                    <th className="pb-4.5">System Role</th>
                    <th className="pb-4.5">Member Status</th>
                    <th className="pb-4.5">Company Affiliation</th>
                    <th className="pb-4.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-semibold">
                  {profiles
                    .filter(p => 
                      [p.full_name, p.email, p.company_name].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01]">
                        <td className="py-4.5 pl-2">
                          <div className="text-white font-bold">{item.full_name || "N/A"}</div>
                          <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{item.email}</div>
                        </td>
                        <td className="py-4.5 capitalize">{item.role}</td>
                        <td className="py-4.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            item.membership_status === "active"
                              ? "bg-green-500/10 text-green-400 border border-green-500/25"
                              : item.membership_status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                              : "bg-white/5 text-gray-400 border border-white/10"
                          }`}>
                            {item.membership_status} {item.membership_type && `(${getPlanDisplayName(item.membership_type)})`}
                          </span>
                        </td>
                        <td className="py-4.5 text-[#ECEFEF]">{item.company_name || "-"}</td>
                        <td className="py-4.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={async () => {
                                const nextRole = item.role === "admin" ? "member" : "admin";
                                setActionLoading(true);
                                const { error } = await supabase
                                  .from("profiles")
                                  .update({ role: nextRole })
                                  .eq("id", item.id);
                                if (error) toast.error("Error modifying role: " + error.message);
                                await loadDatabase();
                                setActionLoading(false);
                              }}
                              disabled={actionLoading}
                              className="px-2 py-1 rounded bg-[#1A382A] hover:bg-[#204936] text-[#ECEFEF] text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              Set {item.role === "admin" ? "Member" : "Admin"}
                            </button>
                            {item.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(item)}
                                disabled={actionLoading}
                                title="Delete user"
                                className="p-1.5 rounded bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3.5: MEMBER MANAGEMENT */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-heading font-black text-white">Chamber Members</h3>
                  {/* Status Filters */}
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
                      // Generate a temp password
                      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
                      let pass = "TC-";
                      for (let i = 0; i < 8; i++) {
                        pass += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setNewMemberPassword(pass);
                      setCreatedCreds(null);
                      setShowMemberModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer animate-fade-in"
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
                    {paginatedProfiles.map((item) => (
                      <tr key={item.id} className="hover:bg-white/[0.01]">
                        <td className="py-4.5 pl-2">
                          <div className="text-white font-bold">{item.full_name || "N/A"}</div>
                          <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{item.email}</div>
                        </td>
                        <td className="py-4.5">{getPlanDisplayName(item.membership_type)}</td>
                        <td className="py-4.5">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                            item.membership_status === "active"
                              ? "bg-green-500/10 text-green-400 border border-green-500/25"
                              : item.membership_status === "pending"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                              : "bg-white/5 text-gray-400 border border-white/10"
                          }`}>
                            {item.membership_status}
                          </span>
                        </td>
                        <td className="py-4.5">
                          <div className="text-[#ECEFEF]">{item.company_name || "-"}</div>
                          <div className="text-[10px] text-[#8A9690] font-normal mt-0.5">{item.phone || "-"}</div>
                        </td>
                        <td className="py-4.5 text-[#8A9690]">
                          {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="py-4.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleEditMemberClick(item)}
                              className="px-2.5 py-1 rounded bg-[#1A382A] hover:bg-[#204936] text-[#ECEFEF] text-[10px] font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                            >
                              <Edit2 size={11} /> Edit
                            </button>
                            {item.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(item)}
                                disabled={actionLoading}
                                title="Delete member"
                                className="p-1.5 rounded bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {totalFilteredCount === 0 && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-[#8A9690]">
                          No members found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalFilteredCount > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-white/5 text-xs text-gray-400 font-semibold">
                  <div className="flex flex-wrap items-center gap-2">
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
                      Showing {Math.min(totalFilteredCount, (memberCurrentPage - 1) * memberRowsPerPage + 1)} - {Math.min(totalFilteredCount, memberCurrentPage * memberRowsPerPage)} of {totalFilteredCount} members
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
          </div>
        )}

        {/* TAB 4: EVENT & PASSES */}
        {activeTab === "events" && (
          <div className="space-y-6">
            <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="text-base font-heading font-black text-white">Chamber Events Calendar</h3>
                  
                  {/* Active vs Archived Subtabs */}
                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => setEventView("active")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                        eventView === "active"
                          ? "bg-green-700/10 text-green-400 border-green-500/25"
                          : "bg-white/[0.02] text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Active ({events.filter(e => !e.is_archived).length})
                    </button>
                    <button
                      onClick={() => setEventView("archived")}
                      className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                        eventView === "archived"
                          ? "bg-green-700/10 text-green-400 border-green-500/25"
                          : "bg-white/[0.02] text-gray-400 border-white/5 hover:text-white"
                      }`}
                    >
                      Archived ({events.filter(e => e.is_archived).length})
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => {
                    resetEventForm();
                    setEditingEvent(null);
                    setShowEventModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-stretch sm:self-auto justify-center"
                >
                  <Plus size={14} /> Add Event
                </button>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {events
                  .filter(evt => eventView === "active" ? !evt.is_archived : evt.is_archived)
                  .map((evt) => (
                  <div key={evt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[270px] h-auto">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          evt.tag.toLowerCase() === "summit"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                            : evt.tag.toLowerCase() === "expo"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/25"
                            : "bg-green-500/10 text-green-400 border border-green-500/25"
                        }`}>
                          {evt.tag}
                        </span>
                        <div className="text-[10px] font-bold text-green-400 text-right leading-tight">
                          <div>Member: {evt.price === 0 ? "Free" : `PHP ${evt.price}`}</div>
                          <div className="text-gray-400 text-[9px] mt-0.5">Guest: {evt.non_member_price === 0 ? "Free" : `PHP ${evt.non_member_price}`}</div>
                        </div>
                      </div>
                      <h4 className="font-heading font-bold text-white text-sm mt-3 leading-snug line-clamp-2">{evt.title}</h4>
                      <div className="text-[11px] text-[#8A9690] mt-2 space-y-1">
                        <div>Date: {evt.date}</div>
                        <div>Venue: {evt.venue}</div>
                      </div>
                    </div>

                    <div className="flex gap-2 border-t border-white/5 pt-3 mt-4">
                      <button
                        onClick={() => navigate(`/admin/events/${evt.id}/registrants`)}
                        className="flex-1 px-2 py-1.5 rounded-lg bg-[#11241C] hover:bg-[#152F24] text-[11px] font-semibold text-green-400 text-center transition-colors cursor-pointer"
                      >
                        Registrants
                      </button>
                      {!evt.is_archived && (
                        <button
                          onClick={() => handleShareEventClick(evt)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#152F24] hover:bg-green-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                          title="Share / Invite QR"
                        >
                          Invite
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleArchiveEvent(evt)}
                        className={`p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 cursor-pointer transition-colors ${
                          evt.is_archived ? "text-amber-500 hover:text-amber-400" : "text-gray-400 hover:text-white"
                        }`}
                        title={evt.is_archived ? "Restore / Unarchive Event" : "Archive Event"}
                      >
                        <Archive size={13} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingEvent(evt);
                          setEventTitle(evt.title);
                          setEventDesc(evt.description);
                          setEventDate(evt.date);
                          setEventTime(evt.time);
                          setEventVenue(evt.venue);
                          setEventSpeaker(evt.speaker);
                          setEventPrice(evt.price);
                          setEventNonMemberPrice(evt.non_member_price || 0);
                          setEventTag(evt.tag);
                          setEventImg(evt.image_url || "");
                          setEventImgFile(null);
                          setEventFeatured(evt.is_featured);
                          setShowEventModal(true);
                        }}
                        className="p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 text-gray-300 cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(evt.id)}
                        className="p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-red-950/20 hover:text-red-400 text-gray-500 cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: MEMBERSHIP FEES CMS */}
        {activeTab === "pricing" && (
          <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
              <h3 className="text-base font-heading font-black text-white mb-6 font-heading">Active Membership Plans</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                {pricing.map((plan) => (
                  <div key={plan.id} className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between h-64">
                    <div>
                      <span className="text-[10px] font-heading font-bold text-green-400 uppercase tracking-wider">{plan.name}</span>
                      <div className="text-xl font-heading font-black text-white mt-2">PHP {plan.price.toLocaleString()}</div>
                      <p className="text-[11px] text-[#8A9690] mt-3 line-clamp-3 leading-relaxed">{plan.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        setEditingPrice(plan);
                        setPriceAmt(plan.price);
                        setPriceDesc(plan.description || "");
                        setPriceBenefits(plan.benefits.join("\n"));
                      }}
                      className="w-full px-3 py-2 rounded-xl border border-white/5 bg-[#11241C] hover:bg-[#152F24] text-xs font-semibold text-green-400 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 mt-6"
                    >
                      <Edit2 size={12} /> Edit Plan Fee
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {editingPrice ? (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0A1410] border border-white/5 rounded-3xl p-6"
              >
                <h4 className="font-heading font-bold text-white text-sm mb-4">CMS Plan Editor: {editingPrice.name}</h4>
                <form onSubmit={handleSavePrice} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      value={priceAmt}
                      onChange={(e) => setPriceAmt(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Description *</label>
                    <textarea
                      required
                      rows={3}
                      value={priceDesc}
                      onChange={(e) => setPriceDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white focus:border-green-500 outline-none resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Benefits (One per line) *</label>
                    <textarea
                      required
                      rows={5}
                      value={priceBenefits}
                      onChange={(e) => setPriceBenefits(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs font-mono text-white focus:border-green-500 outline-none resize-none"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      {actionLoading ? "Saving..." : "Save Changes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingPrice(null)}
                      className="px-3 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 text-center py-10 text-gray-500 text-xs">
                Select a plan to edit its parameters in the CMS database.
              </div>
            )}
          </div>
        )}

        {/* TAB 6: QR PAYMENT SETTINGS CMS */}
        {activeTab === "qrs" && (
          <div className="grid md:grid-cols-[1fr_320px] gap-6 items-start">
            <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
              <h3 className="text-base font-heading font-black text-white mb-6">Payment Methods / QR Channels</h3>
              <div className="space-y-4">
                {qrs.map((qr) => (
                  <div key={qr.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div className="flex gap-4 items-center">
                      <img src={qr.qr_code_url} alt={qr.name} className="w-16 h-16 object-contain bg-white p-1 rounded-lg" />
                      <div>
                        <h4 className="font-heading font-bold text-white text-sm">{qr.name}</h4>
                        <p className="text-[11px] text-[#8A9690] mt-1 leading-relaxed max-w-sm">{qr.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => {
                          setEditingQr(qr);
                          setQrName(qr.name);
                          setQrDesc(qr.description || "");
                          setQrInstructions(qr.payment_instructions || "");
                          setQrUrl(qr.qr_code_url || "");
                        }}
                        className="px-3.5 py-2 rounded-xl bg-[#11241C] hover:bg-[#152F24] text-xs font-semibold text-green-400 flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Edit2 size={12} /> Edit Details
                      </button>
                      <button
                        onClick={() => handleDeleteQr(qr)}
                        disabled={actionLoading}
                        title="Delete payment option"
                        className="p-2 rounded-xl bg-red-900/30 hover:bg-red-800/50 text-red-400 hover:text-red-300 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {editingQr ? (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-[#0A1410] border border-white/5 rounded-3xl p-6"
              >
                <h4 className="font-heading font-bold text-white text-sm mb-4">CMS QR Editor: {editingQr.name}</h4>
                <form onSubmit={handleSaveQr} className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Method Name *</label>
                    <input
                      type="text"
                      required
                      value={qrName}
                      onChange={(e) => setQrName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Short Description *</label>
                    <input
                      type="text"
                      required
                      value={qrDesc}
                      onChange={(e) => setQrDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white focus:border-green-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">Instructions *</label>
                    <textarea
                      required
                      rows={4}
                      value={qrInstructions}
                      onChange={(e) => setQrInstructions(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white focus:border-green-500 outline-none resize-none"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[10px] text-[#8A9690] font-bold uppercase mb-1">QR Code Image</label>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* File Upload zone */}
                      <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-3 bg-[#101D17]/50 hover:bg-[#101D17] transition-all relative min-h-[96px]">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setQrFile(file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="text-center pointer-events-none">
                          <Plus className="mx-auto text-gray-400 mb-1" size={16} />
                          <span className="text-[10px] text-gray-300 font-bold block">
                            {qrFile ? qrFile.name : "Upload QR Image"}
                          </span>
                          <span className="text-[9px] text-gray-500 block mt-0.5">PNG, JPG up to 5MB</span>
                        </div>
                        {qrFile && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setQrFile(null);
                            }}
                            className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-20 cursor-pointer"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </div>

                      {/* Fallback URL Input + Preview */}
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={qrUrl}
                          onChange={(e) => setQrUrl(e.target.value)}
                          placeholder="Or paste QR Image URL..."
                          required={!qrFile}
                          className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none"
                        />
                        <div className="flex-1 min-h-[64px] border border-white/10 rounded-xl overflow-hidden bg-[#101D17]/50 flex items-center justify-center text-[10px] text-gray-500 relative">
                          {qrFile ? (
                            <img
                              src={URL.createObjectURL(qrFile)}
                              alt="Upload Preview"
                              className="w-full h-full object-contain p-1 bg-white"
                            />
                          ) : qrUrl ? (
                            <img
                              src={qrUrl}
                              alt="URL Preview"
                              className="w-full h-full object-contain p-1 bg-white"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>Preview QR</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="flex-1 py-2 bg-green-700 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-colors cursor-pointer"
                    >
                      {actionLoading ? "Saving..." : "Save QR Settings"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingQr(null); setQrFile(null); }}
                      className="px-3 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            ) : (
              <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 text-center py-10 text-gray-500 text-xs">
                Select a payment QR channel to edit its database.
              </div>
            )}
          </div>
        )}

        {/* TAB 7: NEWS & ANNOUNCEMENTS CMS */}
        {activeTab === "news" && (
          <div className="space-y-6">
            <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-base font-heading font-black text-white">Chamber News CMS</h3>
                <button
                  onClick={() => {
                    setEditingNewsItem(null);
                    setNewsTitle("");
                    setNewsSummary("");
                    setNewsContent("");
                    setNewsCategory("General");
                    setNewsImg("");
                    setNewsImgFile(null);
                    setShowNewsModal(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <Plus size={14} /> Post Article
                </button>
              </div>

              <div className="space-y-4">
                {news.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col sm:flex-row gap-4 items-center justify-between">
                    <div className="flex gap-4 items-center flex-1 min-w-0">
                      {item.image_url && (
                        <img src={item.image_url} alt={item.title} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">{item.category}</span>
                          {item.status && (
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                              item.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                              item.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {item.status === 'approved' ? 'Approved' :
                               item.status === 'pending' ? 'Pending Approval' :
                               'Rejected'}
                            </span>
                          )}
                          <span className="text-[9px] text-[#8A9690]">
                            by {item.author || "Chamber Admin"}
                          </span>
                        </div>
                        <h4 className="font-heading font-bold text-white text-sm mt-1 leading-snug line-clamp-1">{item.title}</h4>
                        <p className="text-[11px] text-[#8A9690] mt-1 line-clamp-1">{item.summary}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {item.status === "pending" && (
                        <button
                          onClick={() => setReviewingNewsItem(item)}
                          className="px-3 py-1.5 rounded-lg border border-amber-500/30 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                          Review
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingNewsItem(item);
                          setNewsTitle(item.title);
                          setNewsSummary(item.summary);
                          setNewsContent(item.content);
                          setNewsCategory(item.category);
                          setNewsImg(item.image_url || "");
                          setNewsImgFile(null);
                          setShowNewsModal(true);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-white/5 text-xs text-green-400 bg-[#11241C] hover:bg-[#152F24] transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteNews(item.id)}
                        className="p-1.5 rounded-lg border border-white/5 text-gray-500 hover:bg-red-950/20 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 8: BUSINESS DIRECTORY CMS */}
        {activeTab === "directory" && (
          <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-heading font-black text-white">Business Directory Submissions</h3>
                  {/* Status Filters */}
                  <div className="flex gap-1.5 mt-2">
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
          </div>
        )}

        {/* TAB 10: BOARD OF DIRECTORS CMS */}
        {activeTab === "board" && (
          <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-heading font-black text-white">Board of Directors CMS</h3>
                  <p className="text-xs text-gray-500 mt-1">Manage core executive officers and board directors displayed on the public Board of Directors page.</p>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                    <input
                      type="text"
                      placeholder="Search board members..."
                      value={boardSearchQuery}
                      onChange={(e) => setBoardSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white placeholder-gray-500 font-semibold"
                    />
                  </div>
                  <button
                    onClick={() => {
                      resetBoardForm();
                      setShowBoardModal(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus size={14} /> Add Member
                  </button>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-[#8A9690] font-bold uppercase tracking-wider">
                    <th className="pb-4.5 pl-2">Photo</th>
                    <th className="pb-4.5">Name</th>
                    <th className="pb-4.5">Position</th>
                    <th className="pb-4.5">Rank</th>
                    <th className="pb-4.5 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.02] font-semibold text-gray-300">
                  {(() => {
                    const searchLower = boardSearchQuery.toLowerCase();
                    const filtered = boardMembers.filter(m => 
                      m.name.toLowerCase().includes(searchLower) ||
                      m.position.toLowerCase().includes(searchLower)
                    );

                    const totalPages = Math.ceil(filtered.length / boardRowsPerPage);
                    const startIndex = (boardCurrentPage - 1) * boardRowsPerPage;
                    const paginated = filtered.slice(startIndex, startIndex + boardRowsPerPage);

                    if (paginated.length === 0) {
                      return (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-500">
                            No board members found.
                          </td>
                        </tr>
                      );
                    }

                    return paginated.map((member) => (
                      <tr key={member.id} className="hover:bg-white/[0.01]">
                        <td className="py-4 pl-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 flex items-center justify-center border border-white/10">
                            {member.image_url ? (
                              <img src={member.image_url} alt={member.name} className="w-full h-full object-cover" />
                            ) : (
                              <User size={16} className="text-gray-500" />
                            )}
                          </div>
                        </td>
                        <td className="py-4 font-bold text-white">{member.name}</td>
                        <td className="py-4 text-[#8A9690]">{member.position}</td>
                        <td className="py-4">
                          <span className="px-2 py-0.5 rounded bg-white/[0.04] text-[10px] text-green-400 font-mono">
                            {member.rank}
                          </span>
                        </td>
                        <td className="py-4 text-right pr-2">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEditBoardMemberClick(member)}
                              className="p-1 text-[#8A9690] hover:text-green-500 cursor-pointer"
                              title="Edit Member Details"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteBoardMember(member.id)}
                              className="p-1 text-[#8A9690] hover:text-red-500 cursor-pointer"
                              title="Remove Board Member"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {(() => {
              const filtered = boardMembers.filter(m => 
                m.name.toLowerCase().includes(boardSearchQuery.toLowerCase()) ||
                m.position.toLowerCase().includes(boardSearchQuery.toLowerCase())
              );
              const totalPages = Math.ceil(filtered.length / boardRowsPerPage);
              if (totalPages <= 1) return null;

              return (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-4 border-t border-white/5 text-[11px] text-gray-500 font-bold select-none">
                  <div className="flex items-center gap-2">
                    <span>Show</span>
                    <select
                      value={boardRowsPerPage}
                      onChange={(e) => {
                        setBoardRowsPerPage(Number(e.target.value));
                        setBoardCurrentPage(1);
                      }}
                      className="px-2 py-1 bg-[#101D17] border border-white/10 rounded-lg text-white font-bold outline-none cursor-pointer"
                    >
                      {[10, 20, 50, 100].map(size => (
                        <option key={size} value={size}>{size} rows</option>
                      ))}
                    </select>
                    <span>per page</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setBoardCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={boardCurrentPage === 1}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setBoardCurrentPage(p)}
                        className={`w-7 h-7 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                          boardCurrentPage === p
                            ? "bg-green-700 text-white"
                            : "bg-white/[0.02] border border-white/5 text-gray-400 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {p}
                      </button>
                    ))}

                    <button
                      onClick={() => setBoardCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={boardCurrentPage === totalPages}
                      className="p-1.5 rounded-lg border border-white/5 bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-400 cursor-pointer transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </main>

      {/* BOARD MEMBER EDIT/CREATE MODAL */}
      <AnimatePresence>
        {showBoardModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6">
                {editingBoardMember ? "Edit Board Member Details" : "Add Board Member"}
              </h3>

              <form onSubmit={handleSaveBoardMember} className="space-y-4 text-xs font-semibold text-gray-400 text-left">
                <div>
                  <label className="block text-[10px] font-heading font-black text-[#8A9690] uppercase tracking-wider mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Carl Cabusas"
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#101D17] border border-white/10 focus:border-green-500 rounded-xl outline-none text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-heading font-black text-[#8A9690] uppercase tracking-wider mb-1.5">Position / Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. President, Treasurer, Board of Directors"
                    value={boardPosition}
                    onChange={(e) => setBoardPosition(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#101D17] border border-white/10 focus:border-green-500 rounded-xl outline-none text-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-heading font-black text-[#8A9690] uppercase tracking-wider mb-1.5">Sort Rank *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={boardRank}
                    onChange={(e) => setBoardRank(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#101D17] border border-white/10 focus:border-green-500 rounded-xl outline-none text-white font-semibold font-mono"
                  />
                  <span className="text-[10px] text-gray-500 mt-1 block">Low rank numbers sort first. E.g. President = 1, VPs = 2, Directors = 10+.</span>
                </div>

                {/* Photo Upload */}
                <div>
                  <label className="block text-[10px] font-heading font-black text-[#8A9690] uppercase tracking-wider mb-1.5">Member Avatar / Photo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 relative">
                      {boardImgPreview ? (
                        <img src={boardImgPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                      ) : (
                        <User size={24} className="text-gray-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="board-photo-upload"
                        className="cursor-pointer inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white/[0.02] border border-white/10 hover:border-green-500 rounded-xl text-[11px] font-bold text-gray-300 hover:text-white transition-all w-full sm:w-auto"
                      >
                        <Upload size={13} />
                        {boardImgFile ? boardImgFile.name : "Select Image File"}
                      </label>
                      <input
                        id="board-photo-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBoardImgFile(file);
                            setBoardImgPreview(URL.createObjectURL(file));
                          }
                        }}
                      />
                      {boardImgUrl && !boardImgFile && (
                        <button
                          type="button"
                          onClick={() => {
                            setBoardImgUrl("");
                            setBoardImgPreview("");
                          }}
                          className="text-[10px] text-red-400 hover:text-red-300 font-bold block mt-1 px-1.5"
                        >
                          Remove Current Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-6 border-t border-white/5 mt-6">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-diffuse text-xs"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Saving...
                      </>
                    ) : (
                      "Save Member Details"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowBoardModal(false);
                      resetBoardForm();
                    }}
                    className="px-4.5 py-3 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 hover:text-white cursor-pointer transition-colors text-xs"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT EDIT MODAL (POPUP) */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6">
                {editingEvent ? "Edit Event Parameters" : "Create New Event"}
              </h3>
              
              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Business Networking 2026"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Event Tag (Type) *</label>
                    <select
                      value={eventTag}
                      onChange={(e) => setEventTag(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    >
                      <option value="Event">Event</option>
                      <option value="Summit">Summit</option>
                      <option value="Forum">Forum</option>
                      <option value="Expo">Expo</option>
                      <option value="Workshop">Workshop</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Event Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Provide full description details of the seminar or event..."
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Time *</label>
                    <input
                      type="text"
                      required
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="e.g. 8:00 AM - 5:00 PM"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Member Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      value={eventPrice}
                      onChange={(e) => setEventPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Non-Member Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      value={eventNonMemberPrice}
                      onChange={(e) => setEventNonMemberPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Venue *</label>
                    <input
                      type="text"
                      required
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder="e.g. Talisay Sports Complex"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Key Speaker *</label>
                    <input
                      type="text"
                      required
                      value={eventSpeaker}
                      onChange={(e) => setEventSpeaker(e.target.value)}
                      placeholder="e.g. Mayor Gullas"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[#8A9690] text-xs font-bold uppercase mb-1">Event Banner Image</label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* File Upload zone */}
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-3 bg-[#101D17]/50 hover:bg-[#101D17] transition-all relative min-h-[96px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEventImgFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="text-center pointer-events-none">
                        <Plus className="mx-auto text-gray-400 mb-1" size={20} />
                        <span className="text-xs text-gray-300 font-bold block">
                          {eventImgFile ? eventImgFile.name : "Upload Image File"}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">PNG, JPG up to 5MB</span>
                      </div>
                      {eventImgFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEventImgFile(null);
                          }}
                          className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-20 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Fallback URL Input + Preview */}
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={eventImg}
                        onChange={(e) => setEventImg(e.target.value)}
                        placeholder="Or paste image URL instead..."
                        className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none"
                      />
                      <div className="flex-1 min-h-[64px] border border-white/10 rounded-xl overflow-hidden bg-[#101D17]/50 flex items-center justify-center text-[10px] text-gray-500 relative">
                        {eventImgFile ? (
                          <img
                            src={URL.createObjectURL(eventImgFile)}
                            alt="Upload Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : eventImg ? (
                          <img
                            src={eventImg}
                            alt="URL Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>Preview Image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="featured_evt"
                    checked={eventFeatured}
                    onChange={(e) => setEventFeatured(e.target.checked)}
                    className="rounded border-white/10 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer bg-[#101D17]"
                  />
                  <label htmlFor="featured_evt" className="cursor-pointer text-[#ECEFEF]">Feature this event on public pages</label>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors"
                  >
                    {actionLoading ? "Saving..." : "Save Event Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EVENT SHARE / INVITE MODAL */}
      <AnimatePresence>
        {showShareModal && shareEvent && (() => {
          const registrationUrl = `${window.location.origin}/events?register=${shareEvent.id}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(registrationUrl)}`;
          return (
            <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-[#0A1410] border border-white/10 rounded-3xl p-6 text-center shadow-2xl relative"
              >
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEvent(null);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-lg shadow-green-950/20">
                  <QrCode size={22} />
                </div>

                <h3 className="font-heading font-black text-white text-base mb-1">
                  Share Event Invitation
                </h3>
                <p className="text-xs font-semibold text-green-400 mb-6 line-clamp-1">
                  {shareEvent.title}
                </p>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl inline-block mb-6 border border-gray-100 shadow-md">
                  <img
                    src={qrCodeUrl}
                    alt="Event Registration QR"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4 leading-normal px-2">
                  Share the link or let guests scan this QR code to register directly for the event
                </p>

                {/* Action buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(registrationUrl);
                      toast.success("Registration link copied to clipboard!");
                    }}
                    className="w-full py-2 bg-[#10241A] hover:bg-[#163526] text-green-400 border border-green-500/10 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Copy Registration Link
                  </button>
                  <button
                    onClick={() => handleDownloadShareQR(shareEvent, registrationUrl)}
                    className="w-full py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Download QR Code PNG
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* NEWS EDIT MODAL (POPUP) */}
      <AnimatePresence>
        {showNewsModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6">
                {editingNewsItem ? "Edit News Post" : "Publish News Article"}
              </h3>
              
              <form onSubmit={handleSaveNews} className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Article Title *</label>
                    <input
                      type="text"
                      required
                      value={newsTitle}
                      onChange={(e) => setNewsTitle(e.target.value)}
                      placeholder="e.g. DTI and Chamber sign new deal"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Category *</label>
                    <select
                      value={newsCategory}
                      onChange={(e) => setNewsCategory(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    >
                      <option value="General">General</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Economic News">Economic News</option>
                      <option value="Membership">Membership</option>
                      <option value="Event Notice">Event Notice</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Short Summary (1-2 sentences) *</label>
                  <input
                    type="text"
                    required
                    value={newsSummary}
                    onChange={(e) => setNewsSummary(e.target.value)}
                    placeholder="Write a brief snippet that displays on list cards..."
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Full Article Body *</label>
                  <textarea
                    required
                    rows={6}
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    placeholder="Write the full body contents of the announcement..."
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none resize-none font-sans"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-[#8A9690] text-xs font-bold uppercase mb-1">Cover Image</label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* File Upload zone */}
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-3 bg-[#101D17]/50 hover:bg-[#101D17] transition-all relative min-h-[96px]">
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
                        <span className="text-xs text-gray-300 font-bold block">
                          {newsImgFile ? newsImgFile.name : "Upload Cover Photo"}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">PNG, JPG up to 5MB</span>
                      </div>
                      {newsImgFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setNewsImgFile(null);
                          }}
                          className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-20 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    {/* Fallback URL Input + Preview */}
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={newsImg}
                        onChange={(e) => setNewsImg(e.target.value)}
                        placeholder="Or paste image URL instead..."
                        className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none"
                      />
                      <div className="flex-1 min-h-[64px] border border-white/10 rounded-xl overflow-hidden bg-[#101D17]/50 flex items-center justify-center text-[10px] text-gray-500 relative">
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
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>Preview Image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors"
                  >
                    {actionLoading ? "Publishing..." : "Publish Article"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNewsModal(false);
                      setEditingNewsItem(null);
                      setNewsImgFile(null);
                    }}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REVIEW NEWS SUBMISSION MODAL */}
      <AnimatePresence>
        {reviewingNewsItem && (
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh] shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                    Review Pending Submission
                  </span>
                  <h3 className="font-heading font-black text-white text-xl mt-2">
                    {reviewingNewsItem.title}
                  </h3>
                </div>
                <button
                  onClick={() => setReviewingNewsItem(null)}
                  className="p-1.5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-6 text-xs text-gray-300">
                {/* Meta details */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div>
                    <span className="text-[#8A9690] block mb-0.5">Category</span>
                    <span className="font-bold text-green-400">{reviewingNewsItem.category}</span>
                  </div>
                  <div>
                    <span className="text-[#8A9690] block mb-0.5">Author</span>
                    <span className="font-bold text-white">{reviewingNewsItem.author}</span>
                  </div>
                  <div>
                    <span className="text-[#8A9690] block mb-0.5">Est. Read Time</span>
                    <span className="font-bold text-white">{reviewingNewsItem.read_time || '3 min read'}</span>
                  </div>
                  <div>
                    <span className="text-[#8A9690] block mb-0.5">Status</span>
                    <span className="font-bold text-amber-400 capitalize">{reviewingNewsItem.status}</span>
                  </div>
                </div>

                {/* Banner Image */}
                {reviewingNewsItem.image_url && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden border border-white/5">
                    <img
                      src={reviewingNewsItem.image_url}
                      alt="Banner Preview"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {/* Short Summary */}
                <div>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider block mb-1">
                    Summary / Snippet
                  </span>
                  <p className="p-3.5 rounded-xl bg-[#101D17] border border-white/5 text-white font-medium italic">
                    "{reviewingNewsItem.summary}"
                  </p>
                </div>

                {/* Content Body */}
                <div>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-wider block mb-2">
                    Full Content
                  </span>
                  <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 font-sans leading-relaxed text-sm text-gray-200 whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {reviewingNewsItem.content}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-white/5">
                <button
                  onClick={() => handleApproveNewsSubmission(reviewingNewsItem)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  {actionLoading ? "Processing..." : "Approve & Publish"}
                </button>
                <button
                  onClick={() => handleRejectNewsSubmission(reviewingNewsItem)}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-800 hover:bg-red-700 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  {actionLoading ? "Processing..." : "Reject Submission"}
                </button>
                <button
                  type="button"
                  onClick={() => setReviewingNewsItem(null)}
                  className="py-2.5 px-5 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MEMBERSHIP APPLICATION INVOICE & STATUS MODAL */}
      <AnimatePresence>
        {showAppInvoiceModal && selectedApp && (
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-hidden shadow-2xl relative text-left"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
                <div>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                    Membership Invoice Manager
                  </span>
                  <h3 className="font-heading font-black text-white text-base mt-2">
                    {selectedApp.profiles?.full_name || "Applicant"}
                  </h3>
                  <p className="text-[11px] text-gray-400">{selectedApp.profiles?.email || ""}</p>
                </div>
                <button
                  onClick={() => setShowAppInvoiceModal(false)}
                  className="p-1.5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Membership Tier:</span>
                    <span className="text-white">{getPlanDisplayName(selectedApp.membership_type)} Plan</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Reference:</span>
                    <span className="font-mono text-white">{selectedApp.payment_reference || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="capitalize text-white">{selectedApp.payment_method.replace("_", " ")}</span>
                  </div>
                  {selectedApp.company_name && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Company:</span>
                      <span className="text-white">{selectedApp.company_name}</span>
                    </div>
                  )}
                  {selectedApp.payment_proof_url && (
                    <div className="pt-2 border-t border-white/5 mt-2">
                      <span className="text-gray-400 block mb-1.5">Proof of Payment:</span>
                      <a
                        href={selectedApp.payment_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative group"
                        title="Click to view full image"
                      >
                        <img
                          src={selectedApp.payment_proof_url}
                          alt="Payment Proof"
                          className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                          Click to View Full Receipt
                        </div>
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Verify Application & Payment Status</label>
                  <select
                    value={appModalStatus}
                    onChange={(e) => setAppModalStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none cursor-pointer"
                  >
                    <option value="pending">Pending Review</option>
                    <option value="approved">Approved (Active Member)</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Invoice / Receipt Number</label>
                  <input
                    type="text"
                    value={appInvoiceNumInput}
                    onChange={(e) => setAppInvoiceNumInput(e.target.value)}
                    placeholder="e.g. INV-20050"
                    className="w-full px-3 py-2.5 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none placeholder-gray-600 font-mono text-sm"
                  />
                  <p className="text-[10px] text-gray-500 mt-1 font-normal">
                    Enter the invoice number from the physical official receipt copy. (Format starts automatically with 'INV-')
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-6 mt-6 border-t border-white/5">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveAppInvoiceAndStatus(selectedApp, appInvoiceNumInput, appModalStatus)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    Save Details
                  </button>
                  <button
                    onClick={() => handlePrintAppInvoice({ ...selectedApp, invoice_number: appInvoiceNumInput, status: appModalStatus })}
                    className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-white cursor-pointer font-bold transition-colors flex items-center gap-1.5"
                  >
                    <FileDown size={14} /> Print PDF
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAppInvoiceModal(false)}
                  className="w-full py-2 border border-white/5 hover:bg-white/5 rounded-xl text-gray-500 cursor-pointer text-xs"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ADD MEMBER MODAL (POPUP) */}
      <AnimatePresence>
        {showMemberModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6 flex items-center gap-2">
                <UserPlus className="text-green-400" size={20} />
                Create Member Account
              </h3>

              <form onSubmit={handleCreateMember} className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="grid sm:grid-cols-2 gap-4">
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
                    <label className="block text-[#8A9690] mb-1">Membership Plan *</label>
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
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
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
                  <div>
                    <label className="block text-[#8A9690] mb-1">Business Category</label>
                    <input
                      type="text"
                      value={newMemberCategory}
                      onChange={(e) => setNewMemberCategory(e.target.value)}
                      placeholder="e.g. Retail / Tech"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Business Location</label>
                    <input
                      type="text"
                      value={newMemberAddress}
                      onChange={(e) => setNewMemberAddress(e.target.value)}
                      placeholder="e.g. Talisay City"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Temporary Password *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newMemberPassword}
                      onChange={(e) => setNewMemberPassword(e.target.value)}
                      placeholder="Create temporary password"
                      className="flex-1 px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none focus:border-green-500 transition-colors font-mono"
                    />
                    <button
                      type="button"
                      onClick={handleAutoGeneratePassword}
                      className="px-3.5 py-2 bg-[#152F24] hover:bg-green-700 text-green-400 hover:text-white rounded-xl font-bold cursor-pointer transition-colors border border-green-500/10 text-center"
                    >
                      Auto-Generate
                    </button>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 font-normal">
                    This account will be created under Auth. The user can sign in using this temporary password and change it.
                  </p>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Creating...
                      </>
                    ) : (
                      "Create Member & Account"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMemberModal(false);
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

      {/* MEMBER CREDENTIALS SUCCESS DISPLAY MODAL */}
      <AnimatePresence>
        {showCredsModal && createdCreds && (
          <div className="fixed inset-0 z-[130] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0D1E16] border-2 border-green-500/35 rounded-3xl p-6 shadow-2xl relative"
            >
              <div className="text-center mb-6">
                <div className="w-12 h-12 bg-green-500/10 border border-green-500/25 text-green-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={22} />
                </div>
                <h4 className="font-heading font-black text-white text-base">Account Generated Successfully!</h4>
                <p className="text-[11px] text-gray-400 mt-1">Copy the credentials below to send to the newly added member.</p>
              </div>

              <div className="bg-[#070D0B] border border-white/5 rounded-2xl p-4.5 space-y-3.5 text-xs font-semibold">
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold tracking-wider">Member Name</span>
                  <span className="text-white mt-0.5 block">{createdCreds.name}</span>
                </div>
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold tracking-wider">Sign In Email</span>
                  <span className="text-white mt-0.5 block font-mono">{createdCreds.email}</span>
                </div>
                <div>
                  <span className="text-[#8A9690] block text-[10px] uppercase font-bold tracking-wider">Temporary Password</span>
                  <span className="text-green-400 mt-0.5 block font-mono text-sm tracking-wider">{createdCreds.pass}</span>
                </div>
              </div>

              <div className="flex gap-2.5 mt-6 pt-4 border-t border-white/5">
                <button
                  onClick={() => {
                    const text = `Chamber Account Details:\nEmail: ${createdCreds.email}\nTemporary Password: ${createdCreds.pass}\nLogin here: ${window.location.origin}/login`;
                    navigator.clipboard.writeText(text);
                    toast.success("Credentials copied to clipboard!");
                  }}
                  className="flex-1 py-2 bg-[#1A382A] hover:bg-[#204936] text-green-400 border border-green-500/10 rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Copy size={13} /> Copy Details
                </button>
                <button
                  onClick={() => setShowCredsModal(false)}
                  className="px-5 py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT MEMBER DETAILS MODAL */}
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
                      value={newMemberCategory} // newMemberCategory acts as plan variable here
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
                      value={newMemberPlan} // newMemberPlan acts as status variable here
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

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Saving...
                      </>
                    ) : (
                      "Save Details"
                    )}
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

      {/* BUSINESS DIRECTORY EDIT/CREATE MODAL */}
      <AnimatePresence>
        {showDirModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6 flex items-center gap-2">
                <Building2 className="text-green-400" size={18} />
                {editingDir ? "Edit Directory Listing" : "Create Directory Listing"}
              </h3>

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

                {/* Business Logo Upload */}
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
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

                {/* Social Media Links */}
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
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="url(#ig-gradient)">
                        <defs>
                          <linearGradient id="ig-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
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
                    {actionLoading ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Saving...
                      </>
                    ) : (
                      "Save Listing"
                    )}
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

      {/* REVIEW PROPOSED EDITS MODAL */}
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
                {renderComparisonField("Business Name", reviewingDir.business_name, reviewingDir.pending_changes.business_name)}
                {renderComparisonField("Category", reviewingDir.category, reviewingDir.pending_changes.category)}
                {renderComparisonField("Business Description", reviewingDir.description, reviewingDir.pending_changes.description)}
                {renderComparisonField("Physical Address", reviewingDir.address, reviewingDir.pending_changes.address)}
                {renderComparisonField("Contact Email", reviewingDir.contact_email, reviewingDir.pending_changes.contact_email)}
                {renderComparisonField("Contact Phone", reviewingDir.contact_phone, reviewingDir.pending_changes.contact_phone)}
                {renderComparisonField("Website URL", reviewingDir.website_url, reviewingDir.pending_changes.website_url)}
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
                  Reject & Discard Edits
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowReviewEditsModal(false);
                    setReviewingDir(null);
                  }}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-gray-405 cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
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
                {/* Configuration: password */}
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

                {/* File Upload Selector */}
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

                {/* Progress bar and logs */}
                {importProgress && (
                  <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                    <div className="flex justify-between items-center text-[11px] font-bold">
                      <span className="text-[#8A9690]">Import Status:</span>
                      <span className="text-white">
                        {importProgress.current} / {importProgress.total} processed ({importProgress.successCount} successful)
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 transition-all duration-300"
                        style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                      />
                    </div>
                    {/* Error log list */}
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

                {/* Data Preview */}
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

                {/* Form Buttons */}
                <div className="flex gap-2.5 pt-4 border-t border-white/5 mt-6">
                  <button
                    type="button"
                    onClick={handleStartImport}
                    disabled={importing || importPreviewData.length === 0}
                    className="flex-1 py-3 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-diffuse text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Importing members...
                      </>
                    ) : (
                      "Start Member Import"
                    )}
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

export default Admin;
