import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { 
  Users, CreditCard, CalendarDays, Newspaper, Building2, 
  TrendingUp, QrCode, Shield, ArrowLeft, RefreshCw, Loader2, UserCheck, Key, Tag, Package, MessageSquareQuote
} from "lucide-react";

// Tab Subcomponents
import { AnalyticsTab } from "../components/admin/AnalyticsTab";
import { ApplicationsTab } from "../components/admin/ApplicationsTab";
import { UsersTab } from "../components/admin/UsersTab";
import { MembersTab } from "../components/admin/MembersTab";
import { EventsTab } from "../components/admin/EventsTab";
import { PricingTab } from "../components/admin/PricingTab";
import { QRsTab } from "../components/admin/QRsTab";
import { NewsTab } from "../components/admin/NewsTab";
import { DirectoryTab } from "../components/admin/DirectoryTab";
import { BoardTab } from "../components/admin/BoardTab";
import { PasswordTab } from "../components/admin/PasswordTab";
import { PromosTab } from "../components/admin/PromosTab";
import { PackagesTab } from "../components/admin/PackagesTab";
import StoriesAdminTab from "../components/admin/StoriesAdminTab";
import { PrivacyTab } from "../components/admin/PrivacyTab";

export const Admin: React.FC = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();

  // Active Tab routing state
  const [activeTab, setActiveTab] = useState<
    "analytics" | "applications" | "users" | "members" | "events" | "pricing" | "packages" | "qrs" | "news" | "directory" | "board" | "password" | "promos" | "stories" | "privacy"
  >(()  => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    const validTabs = ["analytics", "applications", "users", "members", "events", "pricing", "packages", "qrs", "news", "directory", "board", "password", "promos", "stories", "privacy"];
    return (tab && validTabs.includes(tab) ? tab : "analytics") as any;
  });

  const [pendingAppsCount, setPendingAppsCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchPendingAppsCount = async () => {
    try {
      const { count, error } = await supabase
        .from("membership_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      if (!error && count !== null) {
        setPendingAppsCount(count);
      }
    } catch (err) {
      console.error("Failed to fetch pending applications count:", err);
    }
  };

  // Redirect if unauthorized
  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (!isAdmin) {
        navigate("/dashboard");
      }
    }
  }, [user, loading, isAdmin, navigate]);

  // Fetch count on mount and tab changes
  useEffect(() => {
    if (user && isAdmin) {
      fetchPendingAppsCount();
    }
  }, [user, isAdmin, activeTab, refreshKey]);

  const handleSync = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen bg-[#0E1B15] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0E1B15] text-[#ECEFEF] pt-6 md:pt-8 pb-16 flex">
      {/* Admin Left Sidebar */}
      <aside className="w-64 border-r border-white/5 bg-[#0A1410] p-6 hidden md:flex flex-col gap-6 select-none flex-shrink-0">
        <div>
          <span className="text-[10px] font-heading font-bold text-green-400 tracking-[0.2em] uppercase">Control Panel</span>
          <h2 className="text-sm font-heading font-black text-white mt-1 font-sans">Chamber Admin</h2>
        </div>
        
        <nav className="flex-1 flex flex-col gap-1.5 font-sans">
          {[
            { id: "analytics", label: "Analytics Overview", icon: TrendingUp },
            { id: "applications", label: "Applications", icon: CreditCard, count: pendingAppsCount },
            { id: "users", label: "User Management", icon: Users },
            { id: "members", label: "Member Management", icon: UserCheck },
            { id: "events", label: "Events & Passes", icon: CalendarDays },
            { id: "pricing", label: "Membership Fees CMS", icon: CreditCard },
            { id: "packages", label: "Package Deals CMS", icon: Package },
            { id: "qrs", label: "QR Payment CMS", icon: QrCode },
            { id: "news", label: "News & Announcements", icon: Newspaper },
            { id: "directory", label: "Business Directory", icon: Building2 },
            { id: "board", label: "Board of Directors", icon: Shield },
            { id: "promos", label: "Promo Codes CMS", icon: Tag },
            { id: "stories", label: "Member Stories CMS", icon: MessageSquareQuote },
            { id: "privacy", label: "Privacy Policy CMS", icon: Shield },
            { id: "password", label: "Change Password", icon: Key },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as any);
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
            className="w-full flex items-center gap-3 px-4.5 py-3 rounded-xl text-[12px] font-semibold text-[#8A9690] hover:bg-white/5 hover:text-white transition-all cursor-pointer font-sans"
          >
            <ArrowLeft size={15} /> Exit Admin Console
          </button>
        </div>
      </aside>

      {/* Main Admin Content Container */}
      <main className="flex-1 p-6 md:p-8 max-w-6xl mx-auto overflow-y-auto w-full">
        {/* Mobile Tab Navigation */}
        <div className="md:hidden mb-6 overflow-x-auto pb-3 flex gap-2 border-b border-white/5 scrollbar-none -mx-6 px-6">
          {[
            { id: "analytics", label: "Analytics", icon: TrendingUp },
            { id: "applications", label: "Applications", icon: CreditCard, count: pendingAppsCount },
            { id: "users", label: "Users", icon: Users },
            { id: "members", label: "Members", icon: UserCheck },
            { id: "events", label: "Events", icon: CalendarDays },
            { id: "pricing", label: "Plans CMS", icon: CreditCard },
            { id: "packages", label: "Packages CMS", icon: Package },
            { id: "qrs", label: "QR CMS", icon: QrCode },
            { id: "news", label: "News CMS", icon: Newspaper },
            { id: "directory", label: "Directory", icon: Building2 },
            { id: "board", label: "Board", icon: Shield },
            { id: "promos", label: "Promo Codes", icon: Tag },
            { id: "stories", label: "Stories CMS", icon: MessageSquareQuote },
            { id: "privacy", label: "Privacy Policy", icon: Shield },
            { id: "password", label: "Change Password", icon: Key },
          ].map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id as any);
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

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-6 mb-8">
          <div>
            <h1 className="text-2xl font-heading font-black text-white leading-tight capitalize">
              {activeTab.replace("-", " ")}
            </h1>
            <p className="text-xs text-[#8A9690] mt-1 font-sans">
              Admin console to manage Chamber of Commerce databases.
            </p>
          </div>
          
          <button
            onClick={handleSync}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 text-xs text-[#ECEFEF] bg-[#11241C] hover:bg-[#152F24] transition-colors cursor-pointer self-start"
          >
            <RefreshCw size={12} /> Sync Databases
          </button>
        </div>

        {/* Tab Component Rendering with refresh key */}
        <div className="w-full">
          {activeTab === "analytics" && <AnalyticsTab key={refreshKey} />}
          {activeTab === "applications" && <ApplicationsTab key={refreshKey} />}
          {activeTab === "users" && <UsersTab key={refreshKey} />}
          {activeTab === "members" && <MembersTab key={refreshKey} />}
          {activeTab === "events" && <EventsTab key={refreshKey} />}
          {activeTab === "pricing" && <PricingTab key={refreshKey} />}
          {activeTab === "packages" && <PackagesTab key={refreshKey} />}
          {activeTab === "qrs" && <QRsTab key={refreshKey} />}
          {activeTab === "news" && <NewsTab key={refreshKey} />}
          {activeTab === "directory" && <DirectoryTab key={refreshKey} />}
          {activeTab === "board" && <BoardTab key={refreshKey} />}
          {activeTab === "promos" && <PromosTab key={refreshKey} />}
          {activeTab === "stories" && <StoriesAdminTab key={refreshKey} />}
          {activeTab === "privacy" && <PrivacyTab key={refreshKey} />}
          {activeTab === "password" && <PasswordTab key={refreshKey} />}
        </div>
      </main>
    </div>
  );
};

export default Admin;
