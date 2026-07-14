import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import { Loader2, Save, FileText, Share2 } from "lucide-react";

interface PrivacySetting {
  id: string;
  title: string;
  content: string;
  is_active: boolean;
  partner_name?: string;
  data_sharing_scope?: "none" | "events_only" | "membership_only" | "both";
}

export const PrivacyTab: React.FC = () => {
  const { toast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [privacyPolicy, setPrivacyPolicy] = useState<PrivacySetting | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [partnerName, setPartnerName] = useState("");
  const [dataSharingScope, setDataSharingScope] = useState<"none" | "events_only" | "membership_only" | "both">("none");

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("privacy_settings")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const activePolicy = data[0]; // Get the latest one
        setPrivacyPolicy(activePolicy);
        setTitle(activePolicy.title);
        setContent(activePolicy.content);
        setIsActive(activePolicy.is_active);
        setPartnerName(activePolicy.partner_name || "");
        setDataSharingScope(activePolicy.data_sharing_scope || "none");
      } else {
        // Fallback default
        setTitle("Data Privacy Agreement for Talisay Business Summit Registration");
        setContent("");
        setIsActive(true);
        setPartnerName("");
        setDataSharingScope("none");
      }
    } catch (err: any) {
      toast.error("Failed to load privacy settings: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      toast.error("Please fill in both title and content fields.");
      return;
    }
    setSaveLoading(true);
    try {
      if (privacyPolicy) {
        // Update existing
        const { error } = await supabase
          .from("privacy_settings")
          .update({
            title: title.trim(),
            content: content.trim(),
            is_active: isActive,
            partner_name: partnerName.trim(),
            data_sharing_scope: dataSharingScope,
            updated_at: new Date().toISOString()
          })
          .eq("id", privacyPolicy.id);
        if (error) throw error;
        toast.success("Data privacy agreement updated successfully!");
      } else {
        // Insert new
        const { data, error } = await supabase
          .from("privacy_settings")
          .insert({
            title: title.trim(),
            content: content.trim(),
            is_active: isActive,
            partner_name: partnerName.trim(),
            data_sharing_scope: dataSharingScope
          })
          .select();
        if (error) throw error;
        if (data && data.length > 0) {
          setPrivacyPolicy(data[0]);
        }
        toast.success("Data privacy agreement saved successfully!");
      }
      await loadData();
    } catch (err: any) {
      toast.error("Failed to save privacy settings: " + err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl bg-[#0A1410] border border-white/5 rounded-3xl p-6 md:p-8">
      <div className="flex items-center gap-3 border-b border-white/5 pb-4 mb-6">
        <div className="p-2.5 rounded-xl bg-green-500/10 text-green-400">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="text-base font-heading font-black text-white">Data Privacy Settings</h3>
          <p className="text-xs text-[#8A9690] mt-0.5">Configure the data privacy terms and agreement options presented to users.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label className="block text-xs font-heading font-bold text-[#8A9690] uppercase mb-2">Agreement Title</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Data Privacy Agreement for Talisay Business Summit Registration"
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 focus:border-green-500 focus:bg-white/[0.04] rounded-xl text-xs text-white outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-heading font-bold text-[#8A9690] uppercase mb-2">
            Agreement Content / Terms
          </label>
          <p className="text-[11px] text-[#6A7670] mb-2">
            Write the text of the privacy statement clearly. You can use standard formatting with lists or sections.
          </p>
          <textarea
            required
            rows={12}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Insert privacy policy details here..."
            className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 focus:border-green-500 focus:bg-white/[0.04] rounded-xl text-xs text-white outline-none font-sans leading-relaxed transition-all resize-y"
          />
        </div>

        <div className="border-t border-white/5 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-500/10 text-green-400">
              <Share2 size={16} />
            </div>
            <div>
              <h4 className="text-sm font-heading font-bold text-white">Partner Data Sharing Consent</h4>
              <p className="text-[11px] text-[#8A9690]">Configure a secondary checkbox requiring consent to share information with a sponsor/partner.</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-heading font-bold text-[#8A9690] uppercase mb-2">Partner Name</label>
              <input
                type="text"
                value={partnerName}
                onChange={(e) => setPartnerName(e.target.value)}
                placeholder="e.g. DITO, Smart, GCash"
                className="w-full px-4 py-3 bg-white/[0.02] border border-white/5 focus:border-green-500 focus:bg-white/[0.04] rounded-xl text-xs text-white outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-heading font-bold text-[#8A9690] uppercase mb-2">Data Sharing Scope</label>
              <select
                value={dataSharingScope}
                onChange={(e) => setDataSharingScope(e.target.value as any)}
                className="w-full px-4 py-3 bg-[#0A1410] border border-white/5 focus:border-green-500 rounded-xl text-xs text-[#ECEFEF] outline-none transition-all cursor-pointer"
              >
                <option value="none">None (Disabled)</option>
                <option value="events_only">Events Only</option>
                <option value="membership_only">Membership Only</option>
                <option value="both">Both Events & Membership</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-white/[0.01] border border-white/5 p-4 rounded-xl">
          <input
            type="checkbox"
            id="is_active_policy"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-white/10 bg-white/5 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer"
          />
          <label htmlFor="is_active_policy" className="text-xs text-[#ECEFEF] cursor-pointer font-semibold select-none">
            Enable Agreement Requirement
          </label>
          <span className="text-[10px] text-[#8A9690] ml-auto">
            If checked, registrants must agree to this policy to submit their registration.
          </span>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saveLoading}
            className="flex items-center gap-1.5 btn-premium bg-green-700 hover:bg-green-600 text-white font-bold text-xs px-5 py-3 cursor-pointer disabled:opacity-60"
          >
            {saveLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save size={13} /> Save Agreement Settings
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
