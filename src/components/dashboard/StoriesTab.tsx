import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { MessageSquareQuote, Plus, Edit2, Trash2, Loader2, X, Clock, CheckCircle2, XCircle, Star } from "lucide-react";

interface StoryRow {
  id: string;
  full_name: string;
  business_name: string;
  role_title: string;
  story_text: string;
  status: "pending" | "approved" | "rejected";
  is_featured: boolean;
  created_at: string;
}

const STATUS_CONFIG = {
  pending:  { label: "Pending Review",  icon: Clock,         cls: "text-amber-600  bg-amber-50  border-amber-200"  },
  approved: { label: "Approved",         icon: CheckCircle2,  cls: "text-green-700  bg-green-50  border-green-200"  },
  rejected: { label: "Not Published",   icon: XCircle,       cls: "text-red-600    bg-red-50    border-red-200"    },
};

const inputCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:border-green-500 outline-none transition-all";
const labelCls = "block text-[11px] font-heading font-bold text-gray-500 uppercase tracking-wide mb-1.5";

const MemberStoriesTab: React.FC = () => {
  const { user, profile } = useAuth();
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingStory, setEditingStory] = useState<StoryRow | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form fields
  const [fName, setFName] = useState("");
  const [fBusiness, setFBusiness] = useState("");
  const [fRole, setFRole] = useState("");
  const [fText, setFText] = useState("");

  const loadStories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("member_stories")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (data) setStories(data);
    } catch (err: any) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStories();
  }, [user]);

  const resetForm = () => {
    setFName(profile?.full_name || "");
    setFBusiness("");
    setFRole("");
    setFText("");
    setEditingStory(null);
    setFormError(null);
  };

  const openCreate = () => {
    resetForm();
    setFName(profile?.full_name || "");
    setShowModal(true);
  };

  const openEdit = (s: StoryRow) => {
    setEditingStory(s);
    setFName(s.full_name);
    setFBusiness(s.business_name);
    setFRole(s.role_title);
    setFText(s.story_text);
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fText.trim() || fText.trim().length < 20) {
      setFormError("Your story must be at least 20 characters.");
      return;
    }
    setActionLoading(true);
    setFormError(null);
    try {
      const payload = {
        user_id: user.id,
        full_name: fName.trim() || profile?.full_name || "Chamber Member",
        business_name: fBusiness.trim(),
        role_title: fRole.trim(),
        story_text: fText.trim(),
        updated_at: new Date().toISOString(),
      };

      if (editingStory) {
        const { error } = await supabase
          .from("member_stories")
          .update(payload)
          .eq("id", editingStory.id)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_stories")
          .insert({ ...payload, status: "pending" });
        if (error) throw error;
      }

      setShowModal(false);
      resetForm();
      await loadStories();
    } catch (err: any) {
      setFormError(err.message || "Failed to save your story.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this story submission?")) return;
    try {
      const { error } = await supabase
        .from("member_stories")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
      await loadStories();
    } catch (err: any) {
      console.error(err.message);
    }
  };

  return (
    <motion.div
      key="stories"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      {/* Header card */}
      <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-1">My Member Stories</h2>
            <p className="text-sm text-gray-500">
              Share your experience with the Talisay Chamber. Approved stories appear on our homepage for the public to read.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-700 hover:bg-green-600 rounded-xl text-xs font-bold text-white transition-all cursor-pointer flex-shrink-0"
          >
            <Plus size={14} /> Write a Story
          </button>
        </div>
      </div>

      {/* Story list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-green-600" size={28} />
        </div>
      ) : stories.length === 0 ? (
        <div className="bg-white rounded-[2rem] p-12 border border-gray-100 text-center">
          <MessageSquareQuote className="mx-auto h-12 w-12 text-gray-200 mb-4" />
          <h4 className="font-heading font-semibold text-gray-900">No stories yet</h4>
          <p className="text-sm text-gray-400 mt-1 mb-5">Share your Chamber experience and it may be featured on our homepage.</p>
          <button
            onClick={openCreate}
            className="btn-premium bg-[#0D1A14] text-white text-xs !py-2 shadow-navy-diffuse"
          >
            Write Your Story
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {stories.map((s) => {
            const cfg = STATUS_CONFIG[s.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={s.id} className="bg-white rounded-[2rem] p-6 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
                <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
                  <div className="flex items-center gap-3">
                    {s.is_featured && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star size={9} /> Featured
                      </span>
                    )}
                    <span className={`flex items-center gap-1.5 text-[10px] font-bold border px-2.5 py-0.5 rounded-full ${cfg.cls}`}>
                      <StatusIcon size={10} /> {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {s.status === "pending" && (
                      <button
                        onClick={() => openEdit(s)}
                        className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-green-700 transition-all cursor-pointer"
                      >
                        <Edit2 size={13} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="p-2 rounded-xl border border-gray-200 hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-700 leading-relaxed mb-4 line-clamp-4">"{s.story_text}"</p>

                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <span className="font-semibold text-gray-600">{s.full_name}</span>
                  {s.role_title && <span>·</span>}
                  {s.role_title && <span>{s.role_title}</span>}
                  {s.business_name && <span>·</span>}
                  {s.business_name && <span>{s.business_name}</span>}
                  <span className="ml-auto">{new Date(s.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                </div>

                {s.status === "rejected" && (
                  <p className="text-[11px] text-red-500 font-semibold mt-3 p-2.5 bg-red-50 rounded-xl border border-red-100">
                    This story was not approved for public display. You may delete it and submit a new one.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit / Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={(e) => e.target === e.currentTarget && setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-[2rem] p-7 w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-heading font-black text-[#0D1A14] text-lg">
                    {editingStory ? "Edit Story" : "Share Your Story"}
                  </h3>
                  <p className="text-xs text-gray-400 mt-0.5">Your submission will be reviewed before appearing on the homepage.</p>
                </div>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-400 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Your Name *</label>
                    <input
                      type="text"
                      required
                      value={fName}
                      onChange={(e) => setFName(e.target.value)}
                      placeholder="Full name"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Job Title / Role</label>
                    <input
                      type="text"
                      value={fRole}
                      onChange={(e) => setFRole(e.target.value)}
                      placeholder="e.g. CEO, Owner"
                      className={inputCls}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Business / Company Name</label>
                  <input
                    type="text"
                    value={fBusiness}
                    onChange={(e) => setFBusiness(e.target.value)}
                    placeholder="Your business name"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>Your Story *</label>
                  <textarea
                    required
                    rows={6}
                    value={fText}
                    onChange={(e) => setFText(e.target.value)}
                    placeholder="Share your experience as a Talisay Chamber member. How has it helped your business?"
                    className={`${inputCls} resize-none`}
                  />
                  <p className="text-[10px] text-gray-400 mt-1">{fText.length} characters (minimum 20)</p>
                </div>

                {formError && (
                  <p className="text-xs text-red-500 font-semibold bg-red-50 p-3 rounded-xl border border-red-100">{formError}</p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-60 rounded-xl text-sm font-bold text-white transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    {actionLoading ? <Loader2 size={14} className="animate-spin" /> : null}
                    {actionLoading ? "Submitting..." : editingStory ? "Save Changes" : "Submit Story"}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowModal(false); resetForm(); }}
                    className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 rounded-xl text-sm font-bold text-gray-500 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MemberStoriesTab;
