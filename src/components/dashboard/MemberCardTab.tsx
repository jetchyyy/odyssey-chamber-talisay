import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { Profile } from "../../context/AuthContext";
import { getPlanDisplayName } from "./types";

interface MemberCardTabProps {
  profile: Profile;
  credits?: any[];
}

const MemberCardTab: React.FC<MemberCardTabProps> = ({ profile, credits }) => (
  <motion.div
    key="card"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className="space-y-6"
  >
    <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)] flex flex-col md:flex-row gap-8 items-center">
      {/* Physical card design */}
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
              {new Date(
                new Date(profile.created_at).setFullYear(
                  new Date(profile.created_at).getFullYear() + 1
                )
              ).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>

      {/* QR Scan Info panel */}
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
              <CheckCircle2 size={12} /> Active &amp; Approved
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Package passes / session credits */}
    {credits && credits.length > 0 && (
      <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
        <h4 className="text-sm font-heading font-black text-gray-900 mb-4 flex items-center gap-1.5">
          <span className="w-1.5 h-3.5 bg-green-700 rounded-full" />
          My Package Passes &amp; Credits
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          {credits.map((credit) => (
            <div
              key={credit.id}
              className={`p-4 rounded-2xl border transition-all ${
                credit.is_active !== false
                  ? "bg-gray-50/50 border-gray-100 hover:bg-gray-50"
                  : "bg-red-50/20 border-red-100/50 opacity-70"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h5 className="font-bold text-xs text-gray-900 leading-tight">{credit.package_name}</h5>
                  <p className="text-[10px] text-gray-400 mt-0.5 capitalize">Benefit: {credit.benefit_type.replace(/_/g, " ")}</p>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                  credit.is_active !== false
                    ? "text-green-700 bg-green-50 border-green-100"
                    : "text-red-705 bg-red-50 border-red-100"
                }`}>
                  {credit.is_active !== false ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-dashed border-gray-200">
                <span className="text-[10px] text-gray-500 font-medium">Remaining balance:</span>
                <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${
                  credit.is_active !== false ? "text-amber-705 bg-amber-500/10 border border-amber-500/20" : "text-gray-500 bg-gray-100 border border-gray-200"
                }`}>
                  {credit.remaining_credits} / {credit.total_credits} Remaining
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )}
  </motion.div>
);

export default MemberCardTab;
