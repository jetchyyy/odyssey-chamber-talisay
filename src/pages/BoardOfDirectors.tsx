import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { Shield, User, Award, X, BookOpen } from "lucide-react";
import { supabase } from "../lib/supabase";

interface BoardMember {
  id: string;
  name: string;
  position: string;
  rank: number;
  image_url: string | null;
  autobiography?: string | null;
}

const BoardOfDirectors: React.FC = () => {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<BoardMember | null>(null);

  useEffect(() => {
    const fetchBoard = async () => {
      try {
        const { data, error } = await supabase
          .from("board_members")
          .select("*")
          .order("rank", { ascending: true });
        if (error) throw error;
        if (data) {
          setMembers(data);
        }
      } catch (err) {
        console.error("Error fetching board members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchBoard();
  }, []);

  const officers = members.filter(m => m.rank <= 6);
  const directors = members.filter(m => m.rank > 6);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  const pageVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.05
      }
    }
  };

  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 30, scale: 0.98 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: "spring" as const,
        stiffness: 70,
        damping: 15
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-[#0D1A14] overflow-hidden pt-28 pb-24 relative select-none">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-green-50/50 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-12 -left-20 w-[400px] h-[400px] bg-emerald-50/40 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="container mx-auto px-4 md:px-10 max-w-7xl relative z-10">

        {/* Header section */}
        <div className="text-center max-w-3xl mx-auto mb-20">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="label-pill mb-5 inline-flex items-center gap-1.5 bg-green-50 text-green-800 border-green-100"
          >
            <Shield size={12} /> Governing Body
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.32, 0.72, 0, 1] }}
            className="text-[clamp(2.25rem,5vw,3.75rem)] font-heading font-black text-[#0D1A14] leading-none tracking-tight mb-6"
          >
            Board of Trustees
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-gray-500 text-base md:text-lg leading-relaxed font-medium"
          >
            Meet the visionaries, industry leaders, and executives steering the City of Talisay Chamber of Commerce towards economic growth and collaborative success.
          </motion.p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-green-100" />
              <div className="absolute inset-0 rounded-full border-4 border-t-green-700 animate-spin" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest animate-pulse">Loading Directors...</span>
          </div>
        ) : (
          <motion.div
            variants={pageVariants}
            initial="hidden"
            animate="visible"
            className="space-y-24"
          >
            {/* Officers Grid Section */}
            {officers.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-10 max-w-md mx-auto justify-center">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
                  <span className="text-[10px] font-heading font-extrabold text-green-700 tracking-[0.25em] uppercase">Officers</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 items-stretch">
                  {officers.map((member) => (
                    <motion.div
                      key={member.id}
                      variants={cardVariants}
                      whileHover={member.autobiography ? { y: -6 } : {}}
                      onClick={() => {
                        if (member.autobiography) {
                          setSelectedMember(member);
                        }
                      }}
                      className={`group relative rounded-[2rem] bg-white border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-between p-6 transition-all duration-300 ${member.autobiography
                        ? "cursor-pointer hover:shadow-[0_20px_50px_rgba(22,101,52,0.08)] hover:border-green-600/10"
                        : ""
                        }`}
                    >
                      {/* Decorative elements inside card */}
                      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/5 rounded-full blur-xl pointer-events-none group-hover:bg-green-500/10 transition-colors" />

                      <div className="flex flex-col items-center text-center">
                        {/* Member Photo Frame */}
                        <div className="relative w-36 h-36 rounded-full p-1.5 bg-gradient-to-br from-green-700/15 via-gold/15 to-green-700/15 mb-6 group-hover:from-green-700/30 group-hover:to-gold/30 transition-all duration-500">
                          <div className="w-full h-full rounded-full overflow-hidden bg-gray-50 border border-white flex items-center justify-center relative shadow-inner">
                            {member.image_url ? (
                              <img
                                src={member.image_url}
                                alt={member.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-green-800 to-emerald-950 flex items-center justify-center text-white font-heading font-black text-3xl">
                                {getInitials(member.name)}
                              </div>
                            )}
                          </div>

                          {/* Accent badge for President */}
                          {member.rank === 1 && (
                            <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 bg-gold text-white p-1 rounded-full border border-white shadow-sm flex items-center justify-center">
                              <Award size={14} className="text-white" />
                            </div>
                          )}
                        </div>

                        {/* Title and Position */}
                        <h3 className="text-lg font-heading font-black text-gray-900 leading-tight mb-1 group-hover:text-green-800 transition-colors">
                          {member.name}
                        </h3>
                        <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-heading">
                          {member.position}
                        </p>

                        {member.autobiography && (
                          <p className="text-xs text-gray-400 mt-4 leading-relaxed line-clamp-3 font-medium max-w-[240px]">
                            {member.autobiography}
                          </p>
                        )}
                      </div>

                      {/* Small border separator and details */}
                      <div className="border-t border-gray-50 mt-6 pt-4.5 flex flex-col items-center gap-1.5 w-full text-[11px] font-medium text-gray-400 group-hover:text-gray-500 transition-colors">
                        {member.autobiography && (
                          <span className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-0.5 animate-pulse">
                            Click to read biography
                          </span>
                        )}
                        <span>Talisay Chamber Officer</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Directors Grid Section */}
            {directors.length > 0 && (
              <div>
                <div className="flex items-center gap-4 mb-10 max-w-md mx-auto justify-center">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent to-gray-200" />
                  <span className="text-[10px] font-heading font-extrabold text-green-700 tracking-[0.25em] uppercase">Board Members</span>
                  <div className="h-px flex-1 bg-gradient-to-l from-transparent to-gray-200" />
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {directors.map((member) => (
                    <motion.div
                      key={member.id}
                      variants={cardVariants}
                      whileHover={member.autobiography ? { y: -4 } : {}}
                      onClick={() => {
                        if (member.autobiography) {
                          setSelectedMember(member);
                        }
                      }}
                      className={`group bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 transition-all ${member.autobiography
                        ? "cursor-pointer hover:shadow-[0_12px_35px_rgba(22,101,52,0.04)] hover:border-green-600/5"
                        : "shadow-[0_4px_25px_rgba(0,0,0,0.01)]"
                        }`}
                    >
                      {/* Smaller Photo Frame */}
                      <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0 bg-gray-50 border border-gray-100 flex items-center justify-center relative shadow-sm">
                        {member.image_url ? (
                          <img
                            src={member.image_url}
                            alt={member.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-700/10 to-emerald-900/10 text-green-700 flex items-center justify-center font-heading font-bold text-sm border border-green-700/10">
                            {getInitials(member.name)}
                          </div>
                        )}
                      </div>

                      <div className="text-left min-w-0 flex-1">
                        <h4 className="text-xs font-heading font-bold text-gray-900 leading-snug truncate group-hover:text-green-800 transition-colors" title={member.name}>
                          {member.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 font-semibold tracking-wide uppercase mt-0.5">
                          {member.position || "Director"}
                        </p>
                        {member.autobiography && (
                          <p className="text-[10px] text-gray-400 mt-1.5 leading-normal line-clamp-2 font-medium">
                            {member.autobiography}
                          </p>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Autobiography Modal */}
      <AnimatePresence>
        {selectedMember && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-white rounded-3xl border border-gray-150 p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] text-left relative"
            >
              <button
                onClick={() => setSelectedMember(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100">
                <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-50 border border-gray-150 flex items-center justify-center relative shadow-sm mb-4">
                  {selectedMember.image_url ? (
                    <img
                      src={selectedMember.image_url}
                      alt={selectedMember.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-800 to-emerald-950 flex items-center justify-center text-white font-heading font-black text-2xl">
                      {getInitials(selectedMember.name)}
                    </div>
                  )}
                </div>

                <h3 className="text-xl font-heading font-black text-gray-900 leading-tight mb-1">
                  {selectedMember.name}
                </h3>
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest font-heading">
                  {selectedMember.position}
                </p>
              </div>

              <div className="pt-6">
                <div className="flex items-center gap-2 mb-3 text-xs font-heading font-black text-green-700 uppercase tracking-wider">
                  <BookOpen size={14} />
                  <span>Biography / Profile</span>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line font-medium">
                  {selectedMember.autobiography}
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default BoardOfDirectors;
