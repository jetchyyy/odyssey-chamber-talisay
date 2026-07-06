import React from "react";
import { motion } from "framer-motion";
import { Building2, Shield, Loader2, Mail, Phone, Globe, MapPin, Upload } from "lucide-react";
import { BUSINESS_CATEGORIES } from "./types";

// Inline social icons (kept local to avoid extra deps)
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#4267B2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="ig-dir-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433"/>
        <stop offset="25%" stopColor="#e6683c"/>
        <stop offset="50%" stopColor="#dc2743"/>
        <stop offset="75%" stopColor="#cc2366"/>
        <stop offset="100%" stopColor="#bc1888"/>
      </linearGradient>
    </defs>
    <path fill="url(#ig-dir-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

interface DirectoryTabProps {
  hasListing: boolean;
  approvalStatus: "approved" | "pending_approval";
  isVerified: boolean;
  formError: string | null;
  actionLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  // Field states
  dirName: string; setDirName: (v: string) => void;
  dirDesc: string; setDirDesc: (v: string) => void;
  dirEmail: string; setDirEmail: (v: string) => void;
  dirPhone: string; setDirPhone: (v: string) => void;
  dirWeb: string; setDirWeb: (v: string) => void;
  dirFacebook: string; setDirFacebook: (v: string) => void;
  dirInstagram: string; setDirInstagram: (v: string) => void;
  dirCat: string; setDirCat: (v: string) => void;
  dirOtherCatText: string; setDirOtherCatText: (v: string) => void;
  dirAddress: string; setDirAddress: (v: string) => void;
  dirLogoFile: File | null; setDirLogoFile: (f: File | null) => void;
  dirLogoPreview: string; setDirLogoPreview: (v: string) => void;
}

const DirectoryTab: React.FC<DirectoryTabProps> = (props) => {
  const {
    hasListing, approvalStatus, isVerified, formError, actionLoading, onSubmit,
    dirName, setDirName, dirDesc, setDirDesc,
    dirEmail, setDirEmail, dirPhone, setDirPhone,
    dirWeb, setDirWeb, dirFacebook, setDirFacebook,
    dirInstagram, setDirInstagram, dirCat, setDirCat,
    dirOtherCatText, setDirOtherCatText, dirAddress, setDirAddress,
    dirLogoFile, setDirLogoFile, dirLogoPreview, setDirLogoPreview,
  } = props;

  const inputCls = "w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all";
  const inputNoPadCls = "w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all";

  return (
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
          <h2 className="text-xl font-heading font-black text-[#0D1A14] mb-2">Manage Directory Profile</h2>
          <p className="text-sm text-gray-500 mb-6">
            Update your business information on the public Talisay Chamber Business Directory.
          </p>

          {!isVerified && approvalStatus === "approved" && (
            <div className="mb-6 p-4 bg-green-50/50 border border-green-200 text-green-900 rounded-2xl flex items-start gap-3 text-left">
              <div className="p-1.5 bg-green-100 rounded-xl text-green-700 mt-0.5">
                <Shield size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold font-heading text-green-800">Directory Profile Pending Submission</h4>
                <p className="text-[11px] text-green-700/80 leading-relaxed mt-0.5">
                  Your business listing is currently hidden from the public directory. Please review your details below, fill in your description, website, or logo, and submit for admin approval to publish it.
                </p>
              </div>
            </div>
          )}

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

          <form onSubmit={onSubmit} className="space-y-4">
            {/* Business Logo Upload */}
            <div className="p-5 bg-gray-50/50 border border-gray-150 rounded-[1.5rem] flex flex-col sm:flex-row items-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-white border border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm">
                {dirLogoPreview ? (
                  <img src={dirLogoPreview} alt="Logo preview" className="w-full h-full object-contain p-1.5" />
                ) : (
                  <Building2 size={24} className="text-gray-400" />
                )}
              </div>
              <div className="flex-1 text-center sm:text-left">
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1.5">Business Logo</label>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <label
                    htmlFor="dir-logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-green-500 rounded-xl text-gray-700 text-xs font-semibold shadow-sm hover:shadow transition-all"
                  >
                    <Upload size={14} className="text-gray-550" />
                    {dirLogoFile ? dirLogoFile.name : (dirLogoPreview ? "Replace Logo" : "Upload Logo")}
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
                  <p className="text-[10px] text-gray-400 font-normal">PNG, JPG or SVG. Max 2MB recommended.</p>
                </div>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Business Name */}
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Name *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="text" required placeholder="e.g. Santos Trading Co." value={dirName} onChange={(e) => setDirName(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Category *</label>
                <select
                  required
                  value={dirCat}
                  onChange={(e) => { setDirCat(e.target.value); if (e.target.value !== "Other") setDirOtherCatText(""); }}
                  className={inputNoPadCls}
                >
                  <option value="">Select Category</option>
                  {BUSINESS_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value="Other">Other</option>
                </select>
              </div>

              {dirCat === "Other" && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Specify Sector / Category</label>
                  <input type="text" required placeholder="e.g. Handicrafts, Aquaculture, etc." value={dirOtherCatText} onChange={(e) => setDirOtherCatText(e.target.value)} className={inputNoPadCls} />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Business Description *</label>
              <textarea
                required rows={4}
                placeholder="Tell us what your business does..."
                value={dirDesc}
                onChange={(e) => setDirDesc(e.target.value)}
                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:border-green-500 outline-none transition-all resize-none"
              />
            </div>

            {/* Contact trio */}
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="email" placeholder="sales@company.com" value={dirEmail} onChange={(e) => setDirEmail(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Contact Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="text" placeholder="(032) 234-5678" value={dirPhone} onChange={(e) => setDirPhone(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Website URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                  <input type="text" placeholder="www.company.com" value={dirWeb} onChange={(e) => setDirWeb(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Social links */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Facebook Page URL</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center"><FacebookIcon /></span>
                  <input type="text" placeholder="facebook.com/yourbusiness" value={dirFacebook} onChange={(e) => setDirFacebook(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Instagram Profile URL</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center justify-center"><InstagramIcon /></span>
                  <input type="text" placeholder="instagram.com/yourbusiness" value={dirInstagram} onChange={(e) => setDirInstagram(e.target.value)} className={inputCls} />
                </div>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-heading font-bold text-gray-500 uppercase mb-1">Physical Address *</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input type="text" required placeholder="Barangay, City/Province" value={dirAddress} onChange={(e) => setDirAddress(e.target.value)} className={inputCls} />
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
                isVerified ? "Save Proposed Edits" : "Submit Profile for Approval"
              )}
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
};

export default DirectoryTab;
