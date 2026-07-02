import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, Search, Loader2, CalendarDays, MapPin, 
  User, Check, ChevronLeft, ChevronRight, RefreshCw, AlertTriangle, Camera, X, FileDown,
  Receipt, Tag
} from "lucide-react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  date: string;
  time: string;
  venue: string;
  speaker: string;
  price: number;
  non_member_price?: number;
}

interface RegistrationData {
  id: string;
  event_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  payment_method: string;
  payment_reference: string;
  payment_proof_url?: string | null;
  payment_status: string;
  attendance_status: string;
  qr_code: string;
  invoice_number?: string | null;
  created_at: string;
  promo_code_id?: string | null;
  discount_amount?: number | null;
  final_amount?: number | null;
  profiles?: {
    membership_status: string;
    role: string;
  } | null;
  promo_codes?: {
    code: string;
  } | null;
}

const EventRegistrants: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, profile, loading: authLoading, isAdmin } = useAuth();
  const { toast } = useNotification();
  const navigate = useNavigate();

  // Page states
  const [event, setEvent] = useState<EventData | null>(null);
  const [registrants, setRegistrants] = useState<RegistrationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Invoice/Receipt modal states
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedReg, setSelectedReg] = useState<RegistrationData | null>(null);
  const [invoiceNumInput, setInvoiceNumInput] = useState("");
  const [modalPaymentStatus, setModalPaymentStatus] = useState("pending");

  // Pagination & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [checkedInCount, setCheckedInCount] = useState(0);

  // Scanner States & References
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<{
    success: boolean;
    name?: string;
    message: string;
  } | null>(null);
  const [scannerInstance, setScannerInstance] = useState<Html5Qrcode | null>(null);
  const processingScanRef = useRef(false);

  // Web Audio API beep synthesizer
  const playBeep = (type: "success" | "error") => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      if (type === "success") {
        // High, pleasant double chirp
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(600, ctx.currentTime);
        gain1.gain.setValueAtTime(0.08, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.08);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(900, ctx.currentTime + 0.07);
        gain2.gain.setValueAtTime(0.08, ctx.currentTime + 0.07);
        gain2.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.2);
        osc2.start(ctx.currentTime + 0.07);
        osc2.stop(ctx.currentTime + 0.2);
      } else {
        // Low, raspy buzz sound for failure
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(130, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.005, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch (err) {
      console.warn("Failed to play synthesized sound:", err);
    }
  };

  // Scanner success callback
  const handleScanSuccess = async (decodedText: string, scanner: Html5Qrcode) => {
    if (processingScanRef.current) return;
    processingScanRef.current = true;

    // Try to pause the scanning loop so no duplicate scans occur while processing
    try {
      if (scanner.isScanning) {
        await scanner.pause(true);
      }
    } catch (e) {
      console.warn("Could not pause scanner:", e);
    }

    try {
      if (!eventId) throw new Error("Event ID not specified");

      // Query database for matching registration
      const { data: reg, error } = await supabase
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .eq("qr_code", decodedText)
        .maybeSingle();

      if (error) throw error;

      if (!reg) {
        playBeep("error");
        setScanResult({
          success: false,
          message: `Invalid Pass: No registration matching code "${decodedText}" exists for this event.`
        });
      } else {
        const isPaid = reg.payment_status === "paid" || reg.payment_status === "free";

        if (!isPaid) {
          playBeep("error");
          setScanResult({
            success: false,
            name: reg.full_name,
            message: `Check-in denied: Payment status is currently "${reg.payment_status}".`
          });
        } else if (reg.attendance_status === "attended") {
          // Already checked in is a warning/error beep
          playBeep("error");
          setScanResult({
            success: false,
            name: reg.full_name,
            message: "Already checked in previously!"
          });
        } else {
          // Valid attendee check-in!
          const { error: updateError } = await supabase
            .from("event_registrations")
            .update({ attendance_status: "attended" })
            .eq("id", reg.id);

          if (updateError) throw updateError;

          playBeep("success");
          setScanResult({
            success: true,
            name: reg.full_name,
            message: "Check-in successful! Welcome to the event."
          });

          // Refresh the registration list in the background
          fetchRegistrants();
        }
      }
    } catch (err: any) {
      playBeep("error");
      setScanResult({
        success: false,
        message: "Scanning error: " + err.message
      });
    }

    // Wait 2.5 seconds to display the result banner before clearing it and resuming scanning
    setTimeout(async () => {
      setScanResult(null);
      processingScanRef.current = false;
      try {
        if (scanner.isScanning) {
          await scanner.resume();
        }
      } catch (e) {
        console.warn("Could not resume scanner:", e);
      }
    }, 2500);
  };

  // Scanner camera lifecycle management
  useEffect(() => {
    let activeScanner: Html5Qrcode | null = null;
    let isMounted = true;

    if (showScanner) {
      setScanResult(null);
      processingScanRef.current = false;

      // Small delay to ensure the DOM element (#qr-reader) has mounted
      const mountTimer = setTimeout(() => {
        if (!isMounted) return;

        const scanner = new Html5Qrcode("qr-reader");
        activeScanner = scanner;
        setScannerInstance(scanner);

        const config = {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.7;
            return { width: size, height: size };
          }
        };

        scanner.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            handleScanSuccess(decodedText, scanner);
          },
          () => {
            // Scanner warnings (e.g. no code found in frame) are ignored to avoid console spam
          }
        ).catch(err => {
          console.error("Scanner startup failed:", err);
          toast.error("Unable to access camera: " + err.message);
          setShowScanner(false);
        });
      }, 300);

      return () => {
        isMounted = false;
        clearTimeout(mountTimer);
        if (activeScanner) {
          const stopScanner = async () => {
            try {
              if (activeScanner && activeScanner.isScanning) {
                await activeScanner.stop();
              }
              // Clear element after stopping
              document.getElementById("qr-reader")?.replaceChildren();
            } catch (err) {
              console.warn("Error cleaning up scanner:", err);
            }
          };
          stopScanner();
        }
      };
    } else {
      setScannerInstance(null);
    }
  }, [showScanner]);

  // Authorization Check
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [user, authLoading, isAdmin, navigate]);

  // Fetch Event Details
  const fetchEventDetails = useCallback(async () => {
    if (!eventId) return;
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", eventId)
        .single();

      if (error) throw error;
      setEvent(data);
    } catch (err: any) {
      toast.error("Failed to load event details: " + err.message);
    }
  }, [eventId, toast]);

  // Fetch Registrants (Searched & Paginated)
  const fetchRegistrants = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      // 1. Fetch total checked-in count for stats
      const { count: checkedIn } = await supabase
        .from("event_registrations")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("attendance_status", "attended");

      setCheckedInCount(checkedIn || 0);

      // 2. Fetch list with current filter and pagination
      let query = supabase
        .from("event_registrations")
        .select("*, profiles(membership_status, role), promo_codes(code)", { count: "exact" })
        .eq("event_id", eventId);

      if (searchQuery.trim()) {
        query = query.or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,qr_code.ilike.%${searchQuery}%`);
      }

      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, count, error } = await query
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRegistrants(data || []);
      setTotalCount(count || 0);
    } catch (err: any) {
      toast.error("Failed to load registrants list: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId, searchQuery, page, pageSize, toast]);

  // Initial and reactive load
  useEffect(() => {
    if (user && isAdmin) {
      fetchEventDetails();
    }
  }, [user, isAdmin, fetchEventDetails]);

  useEffect(() => {
    if (user && isAdmin) {
      fetchRegistrants();
    }
  }, [user, isAdmin, fetchRegistrants, page, pageSize]);

  // Reset page when search query changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  // Toggle Attendance
  const handleToggleAttendance = async (regId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "registered" ? "attended" : "registered";
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ attendance_status: nextStatus })
        .eq("id", regId);

      if (error) throw error;
      
      // Update local state directly to be fast and reactive
      setRegistrants(prev => prev.map(r => r.id === regId ? { ...r, attendance_status: nextStatus } : r));
      setCheckedInCount(prev => nextStatus === "attended" ? prev + 1 : Math.max(0, prev - 1));
      toast.success(nextStatus === "attended" ? "Attendee checked in successfully!" : "Attendee checked out.");
    } catch (err: any) {
      toast.error("Failed to update status: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Update Payment Status
  const handleUpdatePaymentStatus = async (regId: string, newStatus: string) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ payment_status: newStatus })
        .eq("id", regId);

      if (error) throw error;
      
      // Update local state directly
      setRegistrants(prev => prev.map(r => r.id === regId ? { ...r, payment_status: newStatus } : r));
      
      // Update selected registration status if modal is open
      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg(prev => prev ? { ...prev, payment_status: newStatus } : null);
        setModalPaymentStatus(newStatus);
      }
      
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error("Failed to update payment status: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Save invoice number and payment status
  const handleSaveInvoiceAndStatus = async (regId: string, invoiceNumber: string, payStatus: string) => {
    let formattedInvoice = invoiceNumber.trim();
    if (formattedInvoice && !formattedInvoice.toUpperCase().startsWith("INV-")) {
      formattedInvoice = `INV-${formattedInvoice}`;
    }

    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("event_registrations")
        .update({ 
          invoice_number: formattedInvoice || null,
          payment_status: payStatus
        })
        .eq("id", regId);

      if (error) throw error;
      
      // Update local state directly
      setRegistrants(prev => prev.map(r => 
        r.id === regId 
          ? { ...r, invoice_number: formattedInvoice || null, payment_status: payStatus } 
          : r
      ));
      
      // If selected registration is open, update its state too
      if (selectedReg && selectedReg.id === regId) {
        setSelectedReg(prev => prev ? { ...prev, invoice_number: formattedInvoice || null, payment_status: payStatus } : null);
      }
      
      toast.success("Invoice and payment details updated successfully!");
      setShowInvoiceModal(false);
    } catch (err: any) {
      toast.error("Failed to update invoice details: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Print single registration invoice/receipt
  const handlePrintSingleInvoice = (reg: RegistrationData) => {
    if (!event) return;
    
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Pop-up blocker is preventing invoice generation. Please allow pop-ups.");
      return;
    }
    
    // Determine user type (member vs non-member)
    const isMember = reg.profiles?.membership_status === "active" || reg.profiles?.role === "admin";
    const originalPrice = isMember ? event.price : (event.non_member_price || 0);
    const discountAmount = reg.discount_amount || 0;
    const finalAmount = reg.final_amount !== undefined && reg.final_amount !== null ? reg.final_amount : (originalPrice - discountAmount);
    
    const ticketPrice = reg.payment_status === "free" ? 0 : originalPrice;
    
    // Format payment status text
    const displayStatus = reg.payment_status.toUpperCase();
    const invoiceDisplayNumber = reg.invoice_number ? reg.invoice_number : "PENDING MATCH";
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${reg.full_name}</title>
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
            reg.payment_status === "paid" || reg.payment_status === "free"
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
              <p>Date: ${new Date(reg.created_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
          </div>

          <div class="grid-2">
            <div class="info-block">
              <div class="section-title">Billed To</div>
              <p><strong>${reg.full_name}</strong></p>
              <p>${reg.email}</p>
              <p>Status: ${isMember ? "Active Chamber Member" : "Non-Member Registrant"}</p>
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
                  <strong>Event Entry Pass: ${event.title}</strong><br/>
                  <span style="font-size: 11px; color: #6b7280;">Venue: ${event.venue} | Date: ${event.date}</span>
                </td>
                <td style="text-align: right;">PHP ${ticketPrice.toLocaleString()}</td>
                <td style="text-align: right;">PHP ${ticketPrice.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div class="amount-summary">
            <div class="amount-row">
              <span style="color: #6b7280;">Subtotal:</span>
              <span>PHP ${ticketPrice.toLocaleString()}</span>
            </div>
            ${discountAmount > 0 ? `
            <div class="amount-row">
              <span style="color: #6b7280;">Discount Applied (${reg.promo_codes?.code || 'Promo Code'}):</span>
              <span style="color: #ef4444;">- PHP ${discountAmount.toLocaleString()}</span>
            </div>
            ` : ''}
            <div class="amount-row">
              <span style="color: #6b7280;">Payment Method:</span>
              <span style="text-transform: capitalize;">${reg.payment_method.replace("_", " ")}</span>
            </div>
            ${
              reg.payment_reference
                ? `<div class="amount-row">
                    <span style="color: #6b7280;">Reference:</span>
                    <span style="font-family: monospace; font-size: 11px;">${reg.payment_reference}</span>
                  </div>`
                : ""
            }
            <div class="amount-row total">
              <span>Total Paid:</span>
              <span>PHP ${reg.payment_status === 'free' ? '0' : finalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div style="margin-top: 60px; font-size: 12px; color: #4b5563;">
            <p><strong>Terms & Conditions:</strong></p>
            <p style="font-size: 11px; color: #6b7280; margin-top: 4px;">
              This serves as an official proof of registration for the event. Please present your digital check-in QR code pass at the registration desk for verification. Tickets are non-refundable.
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

  // Export All Registrants to Printable PDF
  const handleExportPDF = async () => {
    if (!eventId || !event) return;
    setActionLoading(true);
    try {
      // Fetch ALL registrants for this event (alphabetical order is best for attendance sheets)
      const { data, error } = await supabase
        .from("event_registrations")
        .select("*, promo_codes(code)")
        .eq("event_id", eventId)
        .order("full_name", { ascending: true });

      if (error) throw error;
      if (!data || data.length === 0) {
        toast.error("No registrants found to export.");
        return;
      }

      // Open new window for print document
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocker is preventing export. Please allow pop-ups for this site.");
        return;
      }

      const rowsHtml = data.map((reg: any, index: number) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          <td style="font-weight: bold;">${reg.full_name}</td>
          <td>${reg.email}</td>
          <td style="text-transform: capitalize;">
            <div>${reg.payment_method.replace("_", " ")}</div>
            ${reg.payment_reference ? `<div style="font-size: 9px; color: #718096; font-family: monospace; margin-top: 2px;">Ref: ${reg.payment_reference}</div>` : ""}
          </td>
          <td style="text-transform: capitalize; font-weight: bold; color: ${
            reg.payment_status === "paid" || reg.payment_status === "free" ? "#166534" : "#b45309"
          }">${reg.payment_status}</td>
          <td style="text-transform: capitalize;">${reg.attendance_status}</td>
          <td style="width: 150px;" class="signature-col"></td>
        </tr>
      `).join("");

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>${event.title} - Registrants List</title>
          <style>
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              color: #1a202c;
              margin: 30px;
              line-height: 1.5;
            }
            .header-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 3px solid #166534;
              padding-bottom: 12px;
              margin-bottom: 25px;
            }
            .org-title {
              font-size: 20px;
              font-weight: 800;
              color: #166534;
              letter-spacing: -0.02em;
              margin: 0;
            }
            .org-subtitle {
              font-size: 10px;
              font-weight: 700;
              color: #718096;
              text-transform: uppercase;
              letter-spacing: 0.1em;
              margin: 2px 0 0 0;
            }
            .document-label {
              text-align: right;
            }
            .doc-title {
              font-size: 14px;
              font-weight: 700;
              color: #2d3748;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              margin: 0;
            }
            .doc-date {
              font-size: 11px;
              color: #718096;
              margin-top: 2px;
            }
            .event-meta {
              background: #f7fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 25px;
            }
            .event-title {
              font-size: 16px;
              font-weight: 800;
              color: #2d3748;
              margin: 0 0 8px 0;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px 20px;
              font-size: 12px;
              color: #4a5568;
            }
            .meta-item strong {
              color: #2d3748;
            }
            .stats-bar {
              display: flex;
              gap: 15px;
              margin-bottom: 20px;
            }
            .stat-badge {
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 6px 12px;
              font-size: 11px;
              font-weight: 600;
              background: #fff;
            }
            .stat-badge span {
              font-weight: 800;
              color: #166534;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #edf2f7;
              color: #2d3748;
              font-weight: 700;
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border: 1px solid #cbd5e0;
              padding: 8px 10px;
              text-align: left;
            }
            td {
              border: 1px solid #e2e8f0;
              padding: 8px 10px;
              font-size: 11px;
              color: #2d3748;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .signature-col {
              border-left: 2px solid #cbd5e0;
            }
            @media print {
              body {
                margin: 15px;
              }
              .event-meta {
                background: #fff !important;
                border: 1px solid #cbd5e0;
              }
              tr:nth-child(even) {
                background-color: #f8fafc !important;
              }
              @page {
                size: portrait;
                margin: 10mm;
              }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div>
              <h1 class="org-title">Talisay Chamber of Commerce & Industry</h1>
              <p class="org-subtitle">Official Event Attendance List</p>
            </div>
            <div class="document-label">
              <h2 class="doc-title">Attendance Registry</h2>
              <div class="doc-date">Generated: ${new Date().toLocaleDateString()}</div>
            </div>
          </div>

          <div class="event-meta">
            <h3 class="event-title">${event.title}</h3>
            <div class="meta-grid">
              <div class="meta-item"><strong>Date/Time:</strong> ${event.date} @ ${event.time}</div>
              <div class="meta-item"><strong>Venue:</strong> ${event.venue}</div>
              <div class="meta-item"><strong>Speaker:</strong> ${event.speaker}</div>
              <div class="meta-item"><strong>Ticket Price:</strong> ${event.price === 0 ? "Free Event" : "PHP " + event.price.toLocaleString()}</div>
            </div>
          </div>

          <div class="stats-bar">
            <div class="stat-badge">Total Registrants: <span>${data.length}</span></div>
            <div class="stat-badge">Pre-Checked In: <span>${data.filter((r: any) => r.attendance_status === "attended").length}</span></div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;">No.</th>
                <th>Full Name</th>
                <th>Email Address</th>
                <th>Payment Method</th>
                <th>Payment Status</th>
                <th>Online Status</th>
                <th class="signature-col">On-site Check / Signature</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

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
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (authLoading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0E1B15]">
        <Loader2 size={36} className="animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1B15] text-[#ECEFEF] font-sans pb-16">
      {/* Top Navbar Dashboard Header */}
      <div className="border-b border-white/5 bg-[#0A1410] py-4 px-6 md:px-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin?tab=events")}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg font-heading font-black text-white">Event Registrants Console</h1>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">Talisay Chamber CMS</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-[#10241A] hover:bg-[#163526] text-green-400 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-green-500/10 cursor-pointer shadow-lg shadow-green-950/20"
          >
            <Camera size={14} />
            <span>Scan Pass</span>
          </button>
          <button
            onClick={handleExportPDF}
            disabled={actionLoading}
            className="flex items-center gap-2 bg-white/[0.02] hover:bg-white/5 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer shadow-lg hover:border-white/20"
          >
            {actionLoading ? (
              <Loader2 size={14} className="animate-spin text-green-500" />
            ) : (
              <FileDown size={14} />
            )}
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => { setPage(1); fetchRegistrants(); }}
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white cursor-pointer transition-colors"
            title="Refresh List"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 mt-8 space-y-6">
        {/* EVENT DETAIL CARD */}
        {event && (
          <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 z-10">
              <span className="label-pill !bg-green-950/40 !text-green-300 !border-green-800/40">Event Details</span>
              <h2 className="text-xl md:text-2xl font-heading font-black text-white">{event.title}</h2>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-gray-400 font-semibold">
                <span className="flex items-center gap-2"><CalendarDays size={14} className="text-green-500" /> {event.date} @ {event.time}</span>
                <span className="flex items-center gap-2"><MapPin size={14} className="text-green-500" /> {event.venue}</span>
                <span className="flex items-center gap-2"><User size={14} className="text-green-500" /> Speaker: {event.speaker}</span>
              </div>
            </div>
            
            {/* Quick Stats Grid */}
            <div className="flex gap-4 z-10">
              <div className="px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/5 text-center min-w-[100px]">
                <div className="text-2xl font-heading font-black text-white">{totalCount}</div>
                <div className="text-[9px] text-gray-400 font-bold uppercase mt-1 tracking-wider">Total Registered</div>
              </div>
              <div className="px-5 py-4 rounded-2xl bg-green-950/20 border border-green-500/10 text-center min-w-[100px]">
                <div className="text-2xl font-heading font-black text-green-400">{checkedInCount}</div>
                <div className="text-[9px] text-green-500/80 font-bold uppercase mt-1 tracking-wider">Checked In</div>
              </div>
            </div>

            {/* Glowing background circles for visual polish */}
            <div className="absolute top-1/2 right-0 -translate-y-1/2 w-80 h-80 bg-green-900/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        )}

        {/* REGISTRANTS CONTAINER */}
        <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search registrants by name, email, or passcode..."
                className="w-full pl-10 pr-4 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-green-500/40 transition-colors"
              />
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-400">
              <span>Show</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="bg-[#101D17] border border-white/10 rounded-lg px-2 py-1 text-white outline-none cursor-pointer"
              >
                <option value={10}>10 rows</option>
                <option value={25}>25 rows</option>
                <option value={50}>50 rows</option>
              </select>
            </div>
          </div>

          {/* TABLE CONTAINER */}
          <div className="overflow-x-auto border border-white/5 rounded-2xl bg-white/[0.01]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-gray-400 font-bold uppercase tracking-wider bg-white/[0.01]">
                  <th className="py-4 px-4">Name</th>
                  <th className="py-4 px-4">Email</th>
                  <th className="py-4 px-4">Reference Code</th>
                  <th className="py-4 px-4">Payment Method</th>
                  <th className="py-4 px-4">Payment Status</th>
                  <th className="py-4 px-4">Attendance</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-semibold text-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="animate-spin text-green-500" size={24} />
                        <span className="text-xs text-gray-500">Loading registrants data...</span>
                      </div>
                    </td>
                  </tr>
                ) : registrants.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-gray-500">
                        <AlertTriangle size={24} />
                        <span className="text-xs">No event registrations found.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  registrants.map((reg) => (
                    <tr key={reg.id} className="hover:bg-white/[0.01] transition-colors">
                      <td className="py-4 px-4 text-white font-bold">{reg.full_name}</td>
                      <td className="py-4 px-4 text-gray-400 font-normal">{reg.email}</td>
                      <td className="py-4 px-4 font-mono text-gray-400">{reg.qr_code}</td>
                      <td className="py-4 px-4 capitalize font-normal text-gray-400">
                        <div className="text-white">{reg.payment_method.replace("_", " ")}</div>
                        {reg.payment_reference && (
                          <div className="text-[10px] text-gray-500 font-mono mt-0.5">Ref: {reg.payment_reference}</div>
                        )}
                        {reg.discount_amount && reg.discount_amount > 0 ? (
                          <div className="text-[10px] text-green-400 font-bold mt-1 flex items-center gap-1">
                            <Tag size={10} /> {reg.promo_codes?.code || "Promo Discount"}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-4 px-4">
                        <select
                          value={reg.payment_status}
                          disabled={actionLoading}
                          onChange={(e) => handleUpdatePaymentStatus(reg.id, e.target.value)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold border outline-none cursor-pointer bg-[#101D17] ${
                            reg.payment_status === "paid" || reg.payment_status === "free"
                              ? "border-green-500/30 text-green-400"
                              : reg.payment_status === "rejected"
                              ? "border-red-500/30 text-red-400"
                              : "border-amber-500/30 text-amber-400"
                          }`}
                        >
                          <option value="pending" className="bg-[#0E1B15] text-white">Pending</option>
                          <option value="paid" className="bg-[#0E1B15] text-white">Paid</option>
                          <option value="free" className="bg-[#0E1B15] text-white">Free</option>
                          <option value="rejected" className="bg-[#0E1B15] text-white">Rejected</option>
                        </select>
                      </td>
                      <td className="py-4 px-4 capitalize">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          reg.attendance_status === "attended"
                            ? "bg-green-500/10 text-green-400 border border-green-500/25"
                            : "bg-white/5 text-gray-400 border border-white/10"
                        }`}>
                          {reg.attendance_status}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedReg(reg);
                              setInvoiceNumInput(reg.invoice_number || "");
                              setModalPaymentStatus(reg.payment_status);
                              setShowInvoiceModal(true);
                            }}
                            className="px-2.5 py-1.5 rounded-lg border border-white/5 text-[10px] font-bold text-green-400 bg-[#11241C] hover:bg-[#152F24] transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <Receipt size={12} />
                            {reg.invoice_number ? reg.invoice_number : "Invoice"}
                          </button>
                          <button
                            onClick={() => handleToggleAttendance(reg.id, reg.attendance_status)}
                            disabled={actionLoading}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                              reg.attendance_status === "attended"
                                ? "bg-green-800 hover:bg-green-700 text-white"
                                : "bg-[#10241A] hover:bg-[#163526] text-green-400"
                            }`}
                          >
                            {reg.attendance_status === "attended" ? "Attended" : "Mark Attended"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION CONTROLS */}
          {!loading && totalCount > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-gray-400">
              <div>
                Showing <span className="text-white font-bold">{(page - 1) * pageSize + 1}</span> to{" "}
                <span className="text-white font-bold">{Math.min(page * pageSize, totalCount)}</span> of{" "}
                <span className="text-white font-bold">{totalCount}</span> entries
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage(prev => Math.max(1, prev - 1))}
                    disabled={page === 1}
                    className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  
                  {Array.from({ length: totalPages }).map((_, index) => {
                    const pageNumber = index + 1;
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => setPage(pageNumber)}
                        className={`w-8 h-8 rounded-lg border transition-colors cursor-pointer font-bold ${
                          page === pageNumber
                            ? "bg-green-700 border-green-600 text-white"
                            : "border-white/10 hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={page === totalPages}
                    className="p-2 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#0A1410] border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#070E0B]">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="font-heading font-black text-white text-base">Check-In Scanner</h3>
                </div>
                <button
                  onClick={() => setShowScanner(false)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Scanner View Area */}
              <div className="p-6 flex flex-col items-center justify-center bg-[#08110D]">
                <div className="relative w-72 h-72 rounded-2xl overflow-hidden border border-white/10 bg-black/40 flex items-center justify-center">
                  
                  {/* html5-qrcode targets this ID */}
                  <div id="qr-reader" className="w-full h-full [&_video]:object-cover" />

                  {/* Neon laser line animation */}
                  {!scanResult && (
                    <div className="absolute top-4 left-4 right-4 h-0.5 bg-green-500 shadow-[0_0_10px_#22c55e] animate-[scan_2s_ease-in-out_infinite]" />
                  )}

                  {/* Target box corners */}
                  <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-green-500 rounded-tl-md" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-green-500 rounded-tr-md" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-green-500 rounded-bl-md" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-green-500 rounded-br-md" />
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-4 text-center">
                  Align Member's QR Pass inside the frame to scan
                </p>
              </div>

              {/* Status Banner Area */}
              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`border-t ${
                      scanResult.success 
                        ? "bg-green-950/90 border-green-500/30 text-green-200" 
                        : "bg-red-950/90 border-red-500/30 text-red-200"
                    } p-5 overflow-hidden`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${scanResult.success ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                        {scanResult.success ? <Check size={16} /> : <AlertTriangle size={16} />}
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        {scanResult.name && (
                          <h4 className="text-xs font-black uppercase tracking-wider text-white truncate">
                            {scanResult.name}
                          </h4>
                        )}
                        <p className="text-xs font-semibold leading-relaxed">
                          {scanResult.message}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* INVOICE & RECEIPT MODAL */}
      <AnimatePresence>
        {showInvoiceModal && selectedReg && (
          <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-hidden shadow-2xl relative"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-white/5">
                <div>
                  <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest bg-green-500/10 border border-green-500/20 px-2.5 py-0.5 rounded-full">
                    Invoice & Payment Manager
                  </span>
                  <h3 className="font-heading font-black text-white text-base mt-2">
                    {selectedReg.full_name}
                  </h3>
                  <p className="text-[11px] text-gray-400">{selectedReg.email}</p>
                </div>
                <button
                  onClick={() => setShowInvoiceModal(false)}
                  className="p-1.5 rounded-xl border border-white/5 text-gray-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Reference:</span>
                    <span className="font-mono text-white">{selectedReg.payment_reference || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Payment Method:</span>
                    <span className="capitalize text-white">{selectedReg.payment_method.replace("_", " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pass Code:</span>
                    <span className="font-mono text-white">{selectedReg.qr_code}</span>
                  </div>
                  {selectedReg.discount_amount && selectedReg.discount_amount > 0 ? (
                    <>
                      <div className="flex justify-between border-t border-white/5 pt-2 mt-2">
                        <span className="text-gray-400">Promo Code Used:</span>
                        <span className="text-green-400 font-mono font-bold bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">{selectedReg.promo_codes?.code || "YES"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Discount Amount:</span>
                        <span className="text-red-400">- PHP {selectedReg.discount_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-white">
                        <span className="text-gray-400">Final Paid Price:</span>
                        <span>PHP {selectedReg.final_amount?.toLocaleString()}</span>
                      </div>
                    </>
                  ) : null}
                  {selectedReg.payment_proof_url && (
                    <div className="pt-2 border-t border-white/5 mt-2">
                      <span className="text-gray-400 block mb-1.5">Proof of Payment:</span>
                      <a
                        href={selectedReg.payment_proof_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full h-32 rounded-xl bg-black/40 border border-white/10 overflow-hidden relative group"
                        title="Click to view full image"
                      >
                        <img
                          src={selectedReg.payment_proof_url}
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
                  <label className="block text-[#8A9690] mb-1">Verify Payment Status</label>
                  <select
                    value={modalPaymentStatus}
                    onChange={(e) => setModalPaymentStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                  >
                    <option value="pending">Pending Verification</option>
                    <option value="paid">Paid (Verified)</option>
                    <option value="free">Free Access</option>
                    <option value="rejected">Rejected / Invalid Payment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Invoice / Receipt Number</label>
                  <input
                    type="text"
                    value={invoiceNumInput}
                    onChange={(e) => setInvoiceNumInput(e.target.value)}
                    placeholder="e.g. INV-10045"
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
                    onClick={() => handleSaveInvoiceAndStatus(selectedReg.id, invoiceNumInput, modalPaymentStatus)}
                    disabled={actionLoading}
                    className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    Save Details
                  </button>
                  <button
                    onClick={() => handlePrintSingleInvoice({ ...selectedReg, invoice_number: invoiceNumInput, payment_status: modalPaymentStatus })}
                    className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-white cursor-pointer font-bold transition-colors flex items-center gap-1.5"
                  >
                    <FileDown size={14} /> Print PDF
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
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

export default EventRegistrants;
