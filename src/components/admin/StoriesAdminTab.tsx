import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import {
  MessageSquareQuote, CheckCircle2, XCircle, Clock, Star,
  StarOff, Loader2, Eye, Search, Filter
} from "lucide-react";

interface StoryRow {
  id: string;
  user_id: string;
  full_name: string;
  business_name: string;
  role_title: string;
  story_text: string;
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  created_at: string;
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending",   cls: "text-amber-600 bg-amber-500/10 border-amber-500/20" },
  approved: { label: "Approved",  cls: "text-green-400 bg-green-500/10 border-green-500/20" },
  rejected: { label: "Rejected",  cls: "text-red-400   bg-red-500/10   border-red-500/20"   },
};

export const StoriesAdminTab: React.FC = () => {
  const { toast, confirm } = useNotification();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selected, setSelected] = useState<StoryRow | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("member_stories")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setStories(data);
    } catch (err: any) {
      toast.error("Failed to load stories: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setActionLoading(id + status);
    try {
      const { error } = await supabase
        .from("member_stories")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success(status === "approved" ? "Story approved & will appear on homepage!" : "Story rejected.");
      setSelected(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const toggleFeatured = async (story: StoryRow) => {
    setActionLoading(story.id + "feat");
    try {
      const { error } = await supabase
        .from("member_stories")
        .update({ is_featured: !story.is_featured, updated_at: new Date().toISOString() })
        .eq("id", story.id);
      if (error) throw error;
      toast.success(story.is_featured ? "Removed from featured." : "Marked as featured!");
      if (selected?.id === story.id) setSelected({ ...story, is_featured: !story.is_featured });
      await loadData();
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (story: StoryRow) => {
    const confirmed = await confirm({
      message: `Delete story by "${story.full_name}"? This cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("member_stories").delete().eq("id", story.id);
      if (error) throw error;
      toast.success("Story deleted.");
      setSelected(null);
      await loadData();
    } catch (err: any) {
      toast.error("Failed to delete: " + err.message);
    }
  };

  const filtered = stories.filter((s) => {
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      s.full_name.toLowerCase().includes(q) ||
      s.business_name.toLowerCase().includes(q) ||
      s.story_text.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const pendingCount = stories.filter((s) => s.status === "pending").length;

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Stories",    value: stories.length,                                    cls: "text-white" },
          { label: "Pending Review",   value: pendingCount,                                      cls: pendingCount > 0 ? "text-amber-400" : "text-white" },
          { label: "Approved / Live",  value: stories.filter((s) => s.status === "approved").length, cls: "text-green-400" },
        ].map(({ label, value, cls }) => (
          <div key={label} className="bg-[#0A1410] border border-white/5 rounded-2xl p-5">
            <div className={`text-2xl font-heading font-black ${cls}`}>{value}</div>
            <div className="text-[10px] text-[#8A9690] uppercase tracking-wider mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            placeholder="Search by name, business, or story text…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-2 bg-[#0A1410] border border-white/10 rounded-xl text-xs text-white outline-none focus:border-green-500 placeholder:text-[#8A9690]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-[#8A9690]" />
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-bold capitalize transition-all cursor-pointer ${
                statusFilter === f
                  ? "bg-green-700 text-white"
                  : "bg-white/[0.03] border border-white/10 text-[#8A9690] hover:text-white"
              }`}
            >
              {f === "all" ? "All" : f}
            </button>
          ))}
        </div>
      </div>

      {/* Stories list */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-[#8A9690]">
          <MessageSquareQuote size={40} className="mx-auto mb-4 opacity-30" />
          <p className="text-sm font-semibold">No stories match your filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const badge = STATUS_BADGE[s.status];
            const isActing = actionLoading?.startsWith(s.id);
            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#0A1410] border border-white/5 rounded-2xl p-5 flex flex-col md:flex-row gap-4"
              >
                {/* Left: content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {s.is_featured && (
                      <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border text-amber-400 bg-amber-500/10 border-amber-500/20 flex items-center gap-1">
                        <Star size={8} /> Featured
                      </span>
                    )}
                    <span className="text-[10px] text-[#8A9690] ml-auto">
                      {new Date(s.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>

                  <p className="text-sm text-[#ECEFEF] leading-relaxed line-clamp-2 mb-3">"{s.story_text}"</p>

                  <div className="flex items-center gap-1.5 text-xs text-[#8A9690]">
                    <span className="font-semibold text-[#ECEFEF]">{s.full_name}</span>
                    {s.role_title && <><span>·</span><span>{s.role_title}</span></>}
                    {s.business_name && <><span>·</span><span>{s.business_name}</span></>}
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex md:flex-col gap-2 justify-end flex-shrink-0">
                  <button
                    onClick={() => setSelected(s)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/5 text-xs font-semibold text-[#ECEFEF] transition-all cursor-pointer"
                  >
                    <Eye size={12} /> Preview
                  </button>
                  {s.status !== "approved" && (
                    <button
                      disabled={!!isActing}
                      onClick={() => updateStatus(s.id, "approved")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-700/20 hover:bg-green-700/30 border border-green-500/20 text-xs font-bold text-green-400 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === s.id + "approved" ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Approve
                    </button>
                  )}
                  {s.status !== "rejected" && (
                    <button
                      disabled={!!isActing}
                      onClick={() => updateStatus(s.id, "rejected")}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-bold text-red-400 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {actionLoading === s.id + "rejected" ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={12} />}
                      Reject
                    </button>
                  )}
                  <button
                    disabled={!!isActing}
                    onClick={() => toggleFeatured(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-50 ${
                      s.is_featured
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20"
                        : "border-white/10 bg-white/[0.02] hover:bg-white/5 text-[#8A9690] hover:text-amber-400"
                    }`}
                  >
                    {actionLoading === s.id + "feat" ? <Loader2 size={11} className="animate-spin" /> : s.is_featured ? <StarOff size={12} /> : <Star size={12} />}
                    {s.is_featured ? "Unfeature" : "Feature"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-[#0A1410] border border-white/10 rounded-3xl p-7 w-full max-w-lg"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-heading font-black text-white">Story Preview</h3>
                <button
                  onClick={() => setSelected(null)}
                  className="p-2 rounded-xl border border-white/10 hover:bg-white/5 text-[#8A9690] cursor-pointer"
                >
                  <XCircle size={16} />
                </button>
              </div>

              {/* Card preview matching homepage style */}
              <div className="rounded-[1.5rem] p-7 border border-white/10 bg-white/[0.035]">
                <div className="text-4xl font-serif text-green-900/60 leading-none mb-4 select-none">"</div>
                <p className="text-slate-300 leading-[1.8] mb-6 text-[15px]">{selected.story_text}</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-700 to-emerald-600 flex items-center justify-center text-white text-xs font-heading font-bold flex-shrink-0">
                    {selected.full_name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div>
                    <div className="font-heading font-semibold text-white text-sm">{selected.full_name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {[selected.role_title, selected.business_name].filter(Boolean).join(", ")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-5">
                {selected.status !== "approved" && (
                  <button
                    onClick={() => updateStatus(selected.id, "approved")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-all cursor-pointer"
                  >
                    <CheckCircle2 size={13} /> Approve & Publish
                  </button>
                )}
                {selected.status !== "rejected" && (
                  <button
                    onClick={() => updateStatus(selected.id, "rejected")}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition-all cursor-pointer"
                  >
                    <XCircle size={13} /> Reject
                  </button>
                )}
                <button
                  onClick={() => handleDelete(selected)}
                  className="px-4 py-2.5 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold text-[#8A9690] cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default StoriesAdminTab;
