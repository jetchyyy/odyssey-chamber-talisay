import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Building, Globe, Mail, Phone, ExternalLink, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { CtaSection } from "../components/sections/MoreSections";
import { supabase } from "../lib/supabase";

interface BusinessListing {
  id: string;
  business_name: string;
  category: string;
  address: string;
  contact_phone: string | null;
  contact_email: string | null;
  website_url: string | null;
  is_verified: boolean;
  logo_url?: string | null;
  facebook_url?: string | null;
  instagram_url?: string | null;
  description?: string | null;
}

const fallbackDirectory = [
  { id: "f1", business_name: "Santos Trading Co.", category: "Retail", address: "Poblacion, Talisay City", contact_phone: "(032) 234-5678", contact_email: "info@santostrading.com", website_url: "santostrading.com", description: "Santos Trading Co. is a leading retail supplier of premium household goods, local agricultural products, and consumer merchandise. Serving the Talisay community for over 15 years with dedication." },
  { id: "f2", business_name: "CR Construction & Dev", category: "Construction", address: "Lawaan I, Talisay City", contact_phone: "(032) 456-7890", contact_email: "projects@crconstruct.com", website_url: "crconstruct.com", description: "CR Construction & Dev specializes in civil engineering, commercial building development, structural renovations, and public infrastructure projects. We build the future with quality and integrity." },
  { id: "f3", business_name: "Graceland Restaurant Group", category: "Food & Beverage", address: "Tabunok, Talisay City", contact_phone: "(032) 345-6789", contact_email: "hello@graceland.ph", website_url: "graceland.ph", description: "Graceland Restaurant Group offers a delightful culinary experience featuring local Filipino delicacies, fresh seafood, and modern fusion cuisine. Perfect for family gatherings and corporate celebrations." },
  { id: "f4", business_name: "Cruz & Reyes Law", category: "Professional Services", address: "Bulacao, Talisay City", contact_phone: "(032) 567-8901", contact_email: "legal@cruzreyes.com", website_url: "cruzreyes.com", description: "Cruz & Reyes Law provides comprehensive legal representation in corporate law, family disputes, real estate transactions, and intellectual property. Trustworthy counsel for all your legal needs." },
  { id: "f5", business_name: "Talisay Medical Center", category: "Healthcare", address: "San Isidro, Talisay City", contact_phone: "(032) 678-9012", contact_email: "admin@talisaymed.com", website_url: "talisaymed.com", description: "Talisay Medical Center is a state-of-the-art healthcare facility providing 24/7 emergency services, specialized outpatient clinics, and comprehensive diagnostic laboratory services." },
  { id: "f6", business_name: "Visayas Tech Solutions", category: "IT & Tech", address: "Dumlog, Talisay City", contact_phone: "(032) 789-0123", contact_email: "contact@visayastech.com", website_url: "visayastech.com", description: "Visayas Tech Solutions delivers customized software development, cloud infrastructure management, network security audits, and IT consulting services for small and medium enterprises." },
  { id: "f7", business_name: "Cebu South Logistics", category: "Logistics", address: "Tank, Talisay City", contact_phone: "(032) 890-1234", contact_email: "operations@cebusouth.ph", website_url: "cebusouth.ph", description: "Cebu South Logistics offers nationwide freight forwarding, secure warehousing, cold chain storage, and last-mile delivery services with tracking." },
  { id: "f8", business_name: "Green Earth Agri-Farm", category: "Agriculture", address: "Camp 4, Talisay City", contact_phone: "(032) 901-2345", contact_email: "farm@greenearth.ph", website_url: "greenearth.ph", description: "Green Earth Agri-Farm is a pioneer in sustainable organic farming, cultivating fresh highland vegetables, herbs, and organic honey while promoting environment-friendly agricultural practices." },
];



/* Inline Facebook SVG icon */
const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="#4267B2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

/* Inline Instagram SVG icon */
const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
    <defs>
      <linearGradient id="ig-card-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#f09433"/>
        <stop offset="25%" stopColor="#e6683c"/>
        <stop offset="50%" stopColor="#dc2743"/>
        <stop offset="75%" stopColor="#cc2366"/>
        <stop offset="100%" stopColor="#bc1888"/>
      </linearGradient>
    </defs>
    <path fill="url(#ig-card-gradient)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
  </svg>
);

/** Normalise a URL entered by admin (may or may not include protocol) */
const normaliseUrl = (url: string) =>
  url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;

const Directory: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [listings, setListings] = useState<BusinessListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const cardsPerPage = 9;

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Dynamically extract all unique categories from active listings
  const categories = React.useMemo(() => {
    const list = listings.map(biz => biz.category).filter(Boolean);
    const unique = Array.from(new Set(list));
    return ["All", ...unique.sort((a, b) => a.localeCompare(b))];
  }, [listings]);

  useEffect(() => {
    const fetchDirectory = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("business_directory")
          .select("*")
          .eq("is_verified", true)
          .order("is_featured", { ascending: false })
          .order("business_name", { ascending: true });
        if (data && data.length > 0) {
          setListings(data as any);
        } else {
          setListings(fallbackDirectory as any);
        }
      } catch (err) {
        console.error(err);
        setListings(fallbackDirectory as any);
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  // Reset page when category or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchQuery]);

  const filtered = listings
    .filter(biz => 
      (activeCategory === "All" || biz.category === activeCategory) &&
      [biz.business_name, biz.category, biz.address].join(" ").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aFeat = (a as any).is_featured ? 1 : 0;
      const bFeat = (b as any).is_featured ? 1 : 0;
      if (aFeat !== bFeat) return bFeat - aFeat;
      return a.business_name.localeCompare(b.business_name);
    });

  const totalCards = filtered.length;
  const totalPages = Math.ceil(totalCards / cardsPerPage) || 1;
  const paginated = filtered.slice(
    (currentPage - 1) * cardsPerPage,
    currentPage * cardsPerPage
  );

  return (
    <div className="flex flex-col w-full pt-32 bg-[#fbfaf6]">
      <section className="container mx-auto px-4 md:px-10 max-w-7xl pb-24">
        <div className="max-w-2xl mb-12">
          <motion.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="label-pill mb-5 inline-flex">Member Directory</motion.span>
          <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="text-[clamp(2rem,4vw,3rem)] font-heading font-black text-[#0D1A14] leading-tight mb-4">
            Find local businesses
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="text-gray-500 text-lg">
            Connect with over 500 trusted members of the Talisay Chamber network.
          </motion.p>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col md:flex-row gap-4 mb-10">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by company name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all shadow-sm"
            />
          </div>
          <div className="w-full md:w-64">
            <select
              value={activeCategory}
              onChange={(e) => setActiveCategory(e.target.value)}
              className="w-full px-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-sm focus:border-green-500 focus:ring-4 focus:ring-green-500/10 outline-none transition-all shadow-sm font-semibold text-gray-700 cursor-pointer"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat === "All" ? "All Categories / Sectors" : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Directory Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={36} className="animate-spin text-green-700" />
          </div>
        ) : (
          <div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((biz, i) => {
                const isExpanded = !!expandedIds[biz.id];
                const hasLongDescription = !!(biz.description && biz.description.length > 120);
                return (
                  <motion.div 
                    key={biz.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest("a") || target.closest("button")) {
                        return;
                      }
                      if (hasLongDescription) {
                        toggleExpand(biz.id);
                      }
                    }}
                    className={`spotlight-card rounded-[1.5rem] p-6 group flex flex-col relative overflow-hidden transition-all duration-300 ${
                      hasLongDescription ? "cursor-pointer hover:shadow-md" : ""
                    }`}
                  >
                    {/* Business logo — upper right */}
                    {biz.logo_url && (
                      <div className="absolute top-4 right-4 w-14 h-14 rounded-2xl bg-white/90 backdrop-blur-sm shadow-[0_8px_30px_rgb(0,0,0,0.08)] border border-white/40 flex items-center justify-center overflow-hidden transition-all duration-300 group-hover:scale-105 group-hover:shadow-[0_12px_40px_rgb(0,0,0,0.12)]">
                        <img
                          src={biz.logo_url}
                          alt={`${biz.business_name} logo`}
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                    )}

                    <div className={`mb-4 ${biz.logo_url ? "pr-[72px]" : ""}`}>
                      <span className="text-[10px] font-heading font-semibold px-2.5 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 mb-3 inline-block">
                        {biz.category}
                      </span>
                      <h3 className="font-heading font-bold text-lg text-[#0D1A14] leading-tight group-hover:text-green-700 transition-colors">
                        {biz.business_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-2">
                        <MapPin size={12} className="text-gray-400" /> {biz.address}
                      </div>
                    </div>

                    {/* Business Description */}
                    {biz.description && (
                      <p className="text-xs text-gray-650 mb-4 leading-relaxed select-none">
                        {isExpanded
                          ? biz.description
                          : hasLongDescription
                          ? `${biz.description.substring(0, 120)}...`
                          : biz.description}
                        {hasLongDescription && (
                          <span className="text-green-700 font-bold hover:underline ml-1 inline-block">
                            {isExpanded ? "Show Less" : "Read More"}
                          </span>
                        )}
                      </p>
                    )}

                    <div className="space-y-2.5 mt-auto pt-4 border-t border-gray-50">
                      {biz.contact_phone && (
                        <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
                          <Phone size={14} className="text-gray-400" /> {biz.contact_phone}
                        </div>
                      )}
                      {biz.contact_email && (
                        <div className="flex items-center gap-2.5 text-[13px] text-gray-600">
                          <Mail size={14} className="text-gray-400" /> {biz.contact_email}
                        </div>
                      )}
                      {biz.website_url && (
                        <div className="flex items-center gap-2.5 text-[13px] text-green-700 font-medium mt-1">
                          <Globe size={14} className="text-green-600" /> 
                          <a href={normaliseUrl(biz.website_url)} target="_blank" rel="noreferrer" className="hover:underline flex items-center gap-1">
                            {biz.website_url} <ExternalLink size={10} />
                          </a>
                        </div>
                      )}

                      {/* Social links */}
                      {(biz.facebook_url || biz.instagram_url) && (
                        <div className="flex items-center gap-3 pt-1">
                          {biz.facebook_url && (
                            <a
                              href={normaliseUrl(biz.facebook_url)}
                              target="_blank"
                              rel="noreferrer"
                              title="Facebook page"
                              className="flex items-center gap-1.5 text-[12px] text-[#4267B2] hover:underline font-medium transition-opacity hover:opacity-80"
                            >
                              <FacebookIcon /> Facebook
                            </a>
                          )}
                          {biz.instagram_url && (
                            <a
                              href={normaliseUrl(biz.instagram_url)}
                              target="_blank"
                              rel="noreferrer"
                              title="Instagram profile"
                              className="flex items-center gap-1.5 text-[12px] font-medium transition-opacity hover:opacity-80"
                              style={{ color: "#dc2743" }}
                            >
                              <InstagramIcon /> Instagram
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {!loading && totalCards > cardsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-12 pt-8 border-t border-gray-200">
                <span className="text-[13px] text-gray-500 font-medium font-semibold">
                  Showing {Math.min(totalCards, (currentPage - 1) * cardsPerPage + 1)} - {Math.min(totalCards, currentPage * cardsPerPage)} of {totalCards} businesses
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-green-700 hover:border-green-300 hover:bg-green-50/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200 cursor-pointer transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && <span className="px-2 text-gray-400 font-medium select-none">...</span>}
                          <button
                            onClick={() => setCurrentPage(p)}
                            className={`w-9 h-9 rounded-xl text-[13px] font-semibold transition-all cursor-pointer ${
                              currentPage === p
                                ? "bg-green-700 text-white shadow-diffuse"
                                : "bg-white border border-gray-200 text-gray-600 hover:text-green-700 hover:border-green-300 hover:bg-green-50/50"
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-green-700 hover:border-green-300 hover:bg-green-50/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-500 disabled:hover:border-gray-200 cursor-pointer transition-all"
                    title="Next Page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        
        {!loading && filtered.length === 0 && (
          <div className="bezel-outer max-w-xl mx-auto my-12 shadow-diffuse">
            <div className="bezel-inner px-8 py-14 text-center">
              <Building className="mx-auto h-12 w-12 text-green-700/35 mb-4" />
              <h3 className="text-lg font-heading font-semibold text-gray-900">No businesses found</h3>
              <p className="text-gray-500 mt-1">Try adjusting your search or category filter.</p>
            </div>
          </div>
        )}
      </section>
      <CtaSection />
    </div>
  );
};

export default Directory;
