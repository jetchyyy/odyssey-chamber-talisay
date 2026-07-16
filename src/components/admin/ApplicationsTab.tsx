import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import {
  Check, X, Loader2, Receipt, CheckCircle2, FileDown, Tag
} from "lucide-react";

interface ApplicationRow {
  id: string;
  user_id: string;
  membership_type: string;
  package_availed?: string | null;
  membership_package_id?: string | null;
  company_name: string;
  business_category: string;
  phone: string;
  business_address: string;
  payment_method: string;
  payment_reference: string;
  payment_proof_url?: string | null;
  status: string;
  invoice_number?: string | null;
  created_at: string;
  promo_code_id?: string | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  profiles?: {
    full_name: string;
    email: string;
  } | null;
  promo_codes?: {
    code: string;
  } | null;
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

export const ApplicationsTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Modal states
  const [showAppInvoiceModal, setShowAppInvoiceModal] = useState(false);
  const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
  const [appInvoiceNumInput, setAppInvoiceNumInput] = useState("");
  const [appModalStatus, setAppModalStatus] = useState("pending");
  const [dbPlans, setDbPlans] = useState<any[]>([]);
  const [dbPackages, setDbPackages] = useState<any[]>([]);
  const [appMembershipType, setAppMembershipType] = useState("");
  const [appPackageAvailed, setAppPackageAvailed] = useState<string | null>(null);
  const [appMembershipPackageId, setAppMembershipPackageId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: appsData, error } = await supabase
        .from("membership_applications")
        .select(`
          id, user_id, membership_type, package_availed, membership_package_id, company_name, business_category, phone, business_address, 
          payment_method, payment_reference, payment_proof_url, status, invoice_number, created_at,
          promo_code_id, discount_amount, final_amount,
          profiles ( full_name, email ),
          promo_codes ( code )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (appsData) setApplications(appsData as any);

      // Load pricing & packages for dropdown selection
      const { data: plansData } = await supabase
        .from("membership_pricing")
        .select("type, name")
        .eq("is_active", true);
      const { data: packagesData } = await supabase
        .from("membership_packages")
        .select("id, name")
        .eq("is_active", true);
      if (plansData) setDbPlans(plansData);
      if (packagesData) setDbPackages(packagesData);
    } catch (err: any) {
      toast.error("Failed to load applications: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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
              is_verified: false,
              is_featured: false,
              approval_status: "approved",
              pending_changes: null
            });
          if (dirError) console.error("Error creating auto-directory listing:", dirError.message);
        }
      }

      await loadData();
      toast.success("Application approved and member activated!");
    } catch (err: any) {
      toast.error("Error approving application: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

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

      await loadData();
      toast.success("Application rejected.");
    } catch (err: any) {
      toast.error("Error rejecting application: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveAppInvoiceAndStatus = async (
    app: ApplicationRow,
    invoiceNumber: string,
    newStatus: string,
    newMembershipType: string,
    newPackageAvailed: string | null,
    newMembershipPackageId: string | null
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
          invoice_number: formattedInvoice || null,
          membership_type: newMembershipType,
          package_availed: newPackageAvailed || null,
          membership_package_id: newMembershipPackageId || null
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
            membership_type: newMembershipType,
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
                is_verified: false,
                is_featured: false,
                approval_status: "approved",
                pending_changes: null
              });
            if (dirError) console.error("Error creating auto-directory listing:", dirError.message);
          }
        }
      } else if (newStatus === "rejected") {
        await supabase
          .from("profiles")
          .update({ membership_status: "rejected" })
          .eq("id", app.user_id);
      } else {
        await supabase
          .from("profiles")
          .update({ membership_status: "pending" })
          .eq("id", app.user_id);
      }

      toast.success("Membership application invoice and status updated successfully!");
      setShowAppInvoiceModal(false);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update application details: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrintAppInvoice = (app: ApplicationRow) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Popup blocker prevented printing. Please allow popups for this site.");
      return;
    }

    const todayStr = new Date(app.created_at).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric"
    });

    const tierName = getPlanDisplayName(app.membership_type);
    let planPrice = 0;
    if (app.membership_type === "individual") planPrice = 1500;
    if (app.membership_type === "sme") planPrice = 5000;
    if (app.membership_type === "corporate") planPrice = 15000;

    const discountAmount = app.discount_amount || 0;
    const finalAmount = app.final_amount !== undefined && app.final_amount !== null ? app.final_amount : (planPrice - discountAmount);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${app.invoice_number || "Draft"}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; margin: 40px; line-height: 1.5; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #15803d; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-section h1 { color: #15803d; margin: 0; font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
          .logo-section p { margin: 5px 0 0 0; font-size: 11px; color: #666; }
          .invoice-details { text-align: right; }
          .invoice-details h2 { margin: 0 0 5px 0; color: #15803d; font-size: 20px; }
          .invoice-details p { margin: 3px 0; font-size: 12px; }
          .info-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-block h3 { border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-size: 13px; text-transform: uppercase; color: #666; }
          .info-block p { margin: 4px 0; font-size: 12px; }
          table { w-full; border-collapse: collapse; margin-bottom: 40px; width: 100%; }
          th { background: #f4f4f4; border-bottom: 2px solid #ddd; padding: 10px; font-size: 12px; text-transform: uppercase; text-align: left; }
          td { border-bottom: 1px solid #eee; padding: 12px 10px; font-size: 12px; }
          .text-right { text-align: right; }
          .total-box { display: flex; justify-content: flex-end; margin-bottom: 40px; }
          .total-table { width: 300px; }
          .total-table td { padding: 6px 10px; border: none; }
          .total-table tr.grand-total td { font-size: 16px; font-weight: bold; color: #15803d; border-top: 2px solid #15803d; padding-top: 10px; }
          .footer { text-align: center; border-top: 1px solid #ddd; padding-top: 20px; font-size: 10px; color: #999; margin-top: 60px; }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-section">
            <h1>City of Talisay Chamber of Commerce</h1>
            <h1>Trade and Industry Inc<h1>
            <p>Paseo Ricardo Commercial Center, Nonoc, Rafael Rabaya Rd City of Talisay, Cebu, Philippines</p>
            <p>+639623184926 | talisaychamber@gmail.com </p>
          </div>
          <div class="invoice-details">
            <h2>Temporary Invoice</h2>
            <p><strong>Receipt #:</strong> ${app.invoice_number || "Draft"}</p>
            <p><strong>Date:</strong> ${todayStr}</p>
            <p><strong>Status:</strong> ${app.status.toUpperCase()}</p>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <h3>Billed To:</h3>
            <p><strong>Member Name:</strong> ${app.profiles?.full_name || "N/A"}</p>
            <p><strong>Email:</strong> ${app.profiles?.email || "N/A"}</p>
            <p><strong>Phone:</strong> ${app.phone || "N/A"}</p>
          </div>
          <div class="info-block">
            <h3>Business Details:</h3>
            <p><strong>Company Name:</strong> ${app.company_name || "N/A"}</p>
            <p><strong>Industry Sector:</strong> ${app.business_category || "N/A"}</p>
            <p><strong>Address:</strong> ${app.business_address || "N/A"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Period</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>Annual Chamber Membership Fee - ${tierName} Tier</strong><br>
                <span style="font-size: 10px; color: #666;">Chamber directory listing, business networking access, events, and resources.</span>
              </td>
              <td>1 Year (Active from Approval)</td>
              <td class="text-right">PHP ${planPrice.toLocaleString()}.00</td>
            </tr>
          </tbody>
        </table>

        <div class="total-box">
          <table class="total-table">
            <tr>
              <td>Subtotal:</td>
              <td class="text-right">PHP ${planPrice.toLocaleString()}.00</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr>
              <td>Discount Applied (${app.promo_codes?.code || 'Promo Code'}):</td>
              <td class="text-right" style="color: #b91c1c;">- PHP ${discountAmount.toLocaleString()}.00</td>
            </tr>
            ` : ''}
            <tr>
              <td>Tax (Vat Exempt):</td>
              <td class="text-right">PHP 0.00</td>
            </tr>
            <tr class="grand-total">
              <td>Total Paid:</td>
              <td class="text-right">PHP ${finalAmount.toLocaleString()}.00</td>
            </tr>
          </table>
        </div>

        <div style="font-size: 11px; color: #666; margin-top: 20px; border-left: 3px solid #15803d; padding-left: 10px;">
          <strong>Payment Audit Details:</strong><br>
          Gateway Method: ${app.payment_method.toUpperCase().replace("_", " ")}<br>
          Transaction Reference / Trace ID: ${app.payment_reference || "N/A"}<br>
          Generated programmatically via Odyssey Portal.
        </div>

        <div class="footer">
          <p>Thank you for your active participation and membership in the Odyssey Chamber.</p>
          <p>This is a computer generated temporary invoice document copy. No signature required.</p>
          <button onclick="window.print()" style="margin-top: 15px; padding: 6px 15px; background: #15803d; color: #fff; border: none; border-radius: 4px; font-weight: bold; cursor: pointer;">Print Receipt</button>
        </div>
        <script>
          window.onload = function() {
            // Auto trigger print when popup opens
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
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
                <td className="py-4.5">
                  <div>{getPlanDisplayName(app.membership_type)}</div>
                  {app.discount_amount && app.discount_amount > 0 ? (
                    <div className="text-[10px] text-green-400 font-bold mt-0.5 flex items-center gap-1">
                      <Tag size={10} /> {app.promo_codes?.code || "Discounted"}
                    </div>
                  ) : null}
                </td>
                <td className="py-4.5">
                  <div className="text-white">{app.company_name}</div>
                  <div className="text-[11px] text-[#8A9690] font-normal mt-0.5">{app.business_category}</div>
                </td>
                <td className="py-4.5">
                  <div className="text-white capitalize">{app.payment_method.replace("_", " ")}</div>
                  <div className="text-[11px] text-[#8A9690] font-mono mt-0.5">{app.payment_reference}</div>
                </td>
                <td className="py-4.5">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${app.status === "pending"
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
                        setAppMembershipType(app.membership_type);
                        setAppPackageAvailed(app.package_availed || null);
                        setAppMembershipPackageId(app.membership_package_id || null);
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
                          <CheckCircle2 size={12} /> Approve
                        </button>
                        <button
                          onClick={() => handleRejectApplication(app)}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded bg-red-800 hover:bg-red-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <X size={12} /> Reject
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
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Membership Tier (Editable)</label>
                    <select
                      value={appMembershipType}
                      onChange={(e) => setAppMembershipType(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none cursor-pointer text-xs font-sans"
                    >
                      {(dbPlans.length > 0 ? dbPlans : [
                        { type: "individual", name: "Small" },
                        { type: "sme", name: "Medium" },
                        { type: "corporate", name: "Large" }
                      ]).map(plan => (
                        <option key={plan.type} value={plan.type}>{plan.name} ({plan.type})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1 font-bold uppercase tracking-wider">Package Availed (Editable)</label>
                    <select
                      value={appMembershipPackageId || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAppMembershipPackageId(val || null);
                        
                        // Map to legacy package_availed value ('package_a', 'package_b', 'package_c')
                        const resolvedPackages = dbPackages.length > 0 ? dbPackages : [
                          { id: "package_a", name: "Package A: Small Enterprise" },
                          { id: "package_b", name: "Package B: Medium Enterprise" },
                          { id: "package_c", name: "Package C: Large Enterprise" }
                        ];
                        const pkg = resolvedPackages.find(p => p.id === val);
                        if (pkg) {
                          const pkgNameLower = pkg.name.toLowerCase();
                          if (pkgNameLower.includes("small") || pkg.id === "package_a") {
                            setAppPackageAvailed("package_a");
                          } else if (pkgNameLower.includes("medium") || pkg.id === "package_b") {
                            setAppPackageAvailed("package_b");
                          } else if (pkgNameLower.includes("large") || pkg.id === "package_c") {
                            setAppPackageAvailed("package_c");
                          } else {
                            setAppPackageAvailed("package_a"); // default fallback
                          }
                        } else {
                          setAppPackageAvailed(null);
                        }
                      }}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none cursor-pointer text-xs font-sans"
                    >
                      <option value="">None (Standard Plan)</option>
                      {(dbPackages.length > 0 ? dbPackages : [
                        { id: "package_a", name: "Package A: Small Enterprise" },
                        { id: "package_b", name: "Package B: Medium Enterprise" },
                        { id: "package_c", name: "Package C: Large Enterprise" }
                      ]).map(pkg => (
                        <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
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
                  {selectedApp.discount_amount && selectedApp.discount_amount > 0 ? (
                    <>
                      <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-gray-400">Promo Code Used:</span>
                        <span className="text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">{selectedApp.promo_codes?.code || "YES"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Discount Amount:</span>
                        <span className="text-red-400">- PHP {selectedApp.discount_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white">
                        <span className="text-gray-400">Final Paid Price:</span>
                        <span>PHP {selectedApp.final_amount?.toLocaleString()}</span>
                      </div>
                    </>
                  ) : null}
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
                    onClick={() => handleSaveAppInvoiceAndStatus(selectedApp, appInvoiceNumInput, appModalStatus, appMembershipType, appPackageAvailed, appMembershipPackageId)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    Save Details
                  </button>
                  <button
                    onClick={() => handlePrintAppInvoice({
                      ...selectedApp,
                      invoice_number: appInvoiceNumInput,
                      status: appModalStatus,
                      membership_type: appMembershipType,
                      package_availed: appPackageAvailed
                    })}
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
    </div>
  );
};
