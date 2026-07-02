import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useNotification } from "../../context/NotificationContext";
import { uploadImage } from "../../lib/storage";
import { 
  Plus, Edit2, Trash2, Archive, Loader2, QrCode, Search, X 
} from "lucide-react";

interface EventRow {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  venue: string;
  speaker: string;
  price: number;
  non_member_price?: number;
  tag: string;
  image_url?: string | null;
  is_featured: boolean;
  is_archived: boolean;
  allow_package_redemption?: boolean;
  created_at?: string;
}

export const EventsTab: React.FC = () => {
  const navigate = useNavigate();
  const { toast, confirm } = useNotification();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter
  const [eventSearchQuery, setEventSearchQuery] = useState("");
  const [eventView, setEventView] = useState<"active" | "archived">("active");

  // Modal forms
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRow | null>(null);
  
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventVenue, setEventVenue] = useState("");
  const [eventSpeaker, setEventSpeaker] = useState("");
  const [eventPrice, setEventPrice] = useState(0);
  const [eventNonMemberPrice, setEventNonMemberPrice] = useState(0);
  const [eventTag, setEventTag] = useState("Event");
  const [eventImg, setEventImg] = useState("");
  const [eventImgFile, setEventImgFile] = useState<File | null>(null);
  const [eventFeatured, setEventFeatured] = useState(false);
  const [eventAllowPackageRedemption, setEventAllowPackageRedemption] = useState(false);

  // QR Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEvent, setShareEvent] = useState<EventRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .order("date", { ascending: true });
      if (error) throw error;
      if (data) setEvents(data);
    } catch (err: any) {
      toast.error("Failed to load events: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetEventForm = () => {
    setEventTitle("");
    setEventDesc("");
    setEventDate("");
    setEventTime("");
    setEventVenue("");
    setEventSpeaker("");
    setEventPrice(0);
    setEventNonMemberPrice(0);
    setEventTag("Event");
    setEventImg("");
    setEventImgFile(null);
    setEventFeatured(false);
    setEventAllowPackageRedemption(false);
  };

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle || !eventDate || !eventVenue || !eventSpeaker) return;

    setActionLoading(true);
    try {
      let finalImgUrl = eventImg;
      if (eventImgFile) {
        finalImgUrl = await uploadImage(eventImgFile, "events");
      }

      let computedColor = "bg-green-100 text-green-700";
      if (eventTag.toLowerCase() === "summit") computedColor = "bg-gold/15 text-amber-800 border border-gold/25";
      if (eventTag.toLowerCase() === "expo") computedColor = "bg-amber-100 text-amber-700";

      const eventData = {
        title: eventTitle.trim(),
        description: eventDesc.trim(),
        date: eventDate,
        time: eventTime.trim(),
        venue: eventVenue.trim(),
        speaker: eventSpeaker.trim(),
        price: Number(eventPrice),
        non_member_price: Number(eventNonMemberPrice),
        tag: eventTag,
        tag_color: computedColor,
        is_featured: eventFeatured,
        allow_package_redemption: eventAllowPackageRedemption,
        image_url: finalImgUrl || "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=900&auto=format&fit=crop",
      };

      if (editingEvent) {
        const { error } = await supabase
          .from("events")
          .update(eventData)
          .eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("events")
          .insert(eventData);
        if (error) throw error;
      }

      setShowEventModal(false);
      setEditingEvent(null);
      resetEventForm();
      await loadData();
      toast.success("Event saved successfully!");
    } catch (err: any) {
      toast.error("Error saving event: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Event",
      message: "Are you sure you want to delete this event and all its registrations?",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
      await loadData();
      toast.success("Event deleted.");
    } catch (err: any) {
      toast.error("Failed to delete event: " + err.message);
    }
  };

  const handleToggleArchiveEvent = async (evt: EventRow) => {
    const nextStatus = !evt.is_archived;
    const confirmed = await confirm({
      title: nextStatus ? "Archive Event" : "Unarchive Event",
      message: `Are you sure you want to ${nextStatus ? "archive" : "unarchive"} "${evt.title}"? ${
        nextStatus ? "It will be hidden from public registration list." : "It will become active on public lists again."
      }`,
      confirmText: nextStatus ? "Archive" : "Unarchive",
      variant: nextStatus ? "danger" : "primary"
    });
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("events")
        .update({ is_archived: nextStatus })
        .eq("id", evt.id);

      if (error) throw error;
      await loadData();
      toast.success(nextStatus ? "Event archived successfully!" : "Event unarchived!");
    } catch (err: any) {
      toast.error("Failed to update archive status: " + err.message);
    }
  };

  const handleShareEventClick = (evt: EventRow) => {
    setShareEvent(evt);
    setShowShareModal(true);
  };

  const handleDownloadShareQR = async (evt: EventRow, url: string) => {
    try {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`;
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const fileUrl = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = `register_qr_${evt.title.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(fileUrl);
      toast.success("Registration QR Code downloaded!");
    } catch (e: any) {
      toast.error("Failed to download QR code: " + e.message);
    }
  };

  const filteredEvents = events.filter((evt) => {
    const matchesSearch = 
      evt.title.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      evt.venue.toLowerCase().includes(eventSearchQuery.toLowerCase()) ||
      evt.speaker.toLowerCase().includes(eventSearchQuery.toLowerCase());

    const matchesStatus = eventView === "active" ? !evt.is_archived : evt.is_archived;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[300px] flex items-center justify-center">
        <Loader2 className="animate-spin text-green-700" size={32} />
      </div>
    );
  }

  return (
    <div className="bg-[#0A1410] border border-white/5 rounded-3xl p-6">
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-base font-heading font-black text-white">Chamber Events CMS</h3>
            <p className="text-xs text-gray-500 mt-1">Manage networking summits, forums, and conferences, track ticket prices, and view registrants.</p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearchQuery}
                onChange={(e) => setEventSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs focus:border-green-500 outline-none text-white placeholder-gray-500 font-semibold"
              />
            </div>
            
            <div className="flex gap-1.5 self-start sm:self-auto">
              <button
                onClick={() => setEventView("active")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                  eventView === "active"
                    ? "bg-green-700/10 text-green-400 border-green-500/25"
                    : "bg-white/[0.02] text-gray-400 border-white/5 hover:text-white"
                }`}
              >
                Active ({events.filter(e => !e.is_archived).length})
              </button>
              <button
                onClick={() => setEventView("archived")}
                className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer border ${
                  eventView === "archived"
                    ? "bg-green-700/10 text-green-400 border-green-500/25"
                    : "bg-white/[0.02] text-gray-400 border-white/5 hover:text-white"
                }`}
              >
                Archived ({events.filter(e => e.is_archived).length})
              </button>
            </div>

            <button
              onClick={() => {
                resetEventForm();
                setEditingEvent(null);
                setShowEventModal(true);
              }}
              className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer justify-center"
            >
              <Plus size={14} /> Add Event
            </button>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEvents.map((evt) => (
          <div key={evt.id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col justify-between min-h-[270px] h-auto">
            <div>
              <div className="flex justify-between items-start gap-2">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                  evt.tag.toLowerCase() === "summit"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                    : evt.tag.toLowerCase() === "expo"
                    ? "bg-purple-500/10 text-purple-400 border border-purple-500/25"
                    : "bg-green-500/10 text-green-400 border border-green-500/25"
                }`}>
                  {evt.tag}
                </span>
                <div className="text-[10px] font-bold text-green-400 text-right leading-tight">
                  <div>Member: {evt.price === 0 ? "Free" : `PHP ${evt.price}`}</div>
                  <div className="text-gray-400 text-[9px] mt-0.5">Guest: {evt.non_member_price === 0 ? "Free" : `PHP ${evt.non_member_price}`}</div>
                </div>
              </div>
              <h4 className="font-heading font-bold text-white text-sm mt-3 leading-snug line-clamp-2">{evt.title}</h4>
              <div className="text-[11px] text-[#8A9690] mt-2 space-y-1">
                <div>Date: {evt.date}</div>
                <div>Venue: {evt.venue}</div>
              </div>
            </div>

            <div className="flex gap-2 border-t border-white/5 pt-3 mt-4">
              <button
                onClick={() => navigate(`/admin/events/${evt.id}/registrants`)}
                className="flex-1 px-2 py-1.5 rounded-lg bg-[#11241C] hover:bg-[#152F24] text-[11px] font-semibold text-green-400 text-center transition-colors cursor-pointer"
              >
                Registrants
              </button>
              {!evt.is_archived && (
                <button
                  onClick={() => handleShareEventClick(evt)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#152F24] hover:bg-green-700 text-white text-[11px] font-bold transition-colors cursor-pointer"
                  title="Share / Invite QR"
                >
                  Invite
                </button>
              )}
              <button
                onClick={() => handleToggleArchiveEvent(evt)}
                className={`p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 cursor-pointer transition-colors ${
                  evt.is_archived ? "text-amber-500 hover:text-amber-400" : "text-gray-400 hover:text-white"
                }`}
                title={evt.is_archived ? "Restore / Unarchive Event" : "Archive Event"}
              >
                <Archive size={13} />
              </button>
              <button
                onClick={() => {
                  setEditingEvent(evt);
                  setEventTitle(evt.title);
                  setEventDesc(evt.description);
                  setEventDate(evt.date);
                  setEventTime(evt.time);
                  setEventVenue(evt.venue);
                  setEventSpeaker(evt.speaker);
                  setEventPrice(evt.price);
                  setEventNonMemberPrice(evt.non_member_price || 0);
                  setEventTag(evt.tag);
                  setEventImg(evt.image_url || "");
                  setEventImgFile(null);
                  setEventFeatured(evt.is_featured);
                  setEventAllowPackageRedemption(evt.allow_package_redemption || false);
                  setShowEventModal(true);
                }}
                className="p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-white/5 text-gray-300 cursor-pointer"
              >
                <Edit2 size={13} />
              </button>
              <button
                onClick={() => handleDeleteEvent(evt.id)}
                className="p-2 rounded-lg border border-white/5 bg-white/[0.01] hover:bg-red-950/20 hover:text-red-400 text-gray-500 cursor-pointer"
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* EVENT EDIT MODAL */}
      <AnimatePresence>
        {showEventModal && (
          <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-[#0A1410] border border-white/10 rounded-3xl p-6 overflow-y-auto max-h-[90vh]"
            >
              <h3 className="font-heading font-black text-white text-lg mb-6">
                {editingEvent ? "Edit Event Parameters" : "Create New Event"}
              </h3>
              
              <form onSubmit={handleSaveEvent} className="space-y-4 text-xs font-semibold text-gray-300">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Event Title *</label>
                    <input
                      type="text"
                      required
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder="e.g. Business Networking 2026"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Event Tag (Type) *</label>
                    <select
                      value={eventTag}
                      onChange={(e) => setEventTag(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    >
                      <option value="Event">Event</option>
                      <option value="Summit">Summit</option>
                      <option value="Forum">Forum</option>
                      <option value="Expo">Expo</option>
                      <option value="Workshop">Workshop</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[#8A9690] mb-1">Event Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={eventDesc}
                    onChange={(e) => setEventDesc(e.target.value)}
                    placeholder="Provide full description details of the seminar or event..."
                    className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={eventDate}
                      onChange={(e) => setEventDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Time *</label>
                    <input
                      type="text"
                      required
                      value={eventTime}
                      onChange={(e) => setEventTime(e.target.value)}
                      placeholder="e.g. 8:00 AM - 5:00 PM"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Member Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      value={eventPrice}
                      onChange={(e) => setEventPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Non-Member Price (PHP) *</label>
                    <input
                      type="number"
                      required
                      value={eventNonMemberPrice}
                      onChange={(e) => setEventNonMemberPrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[#8A9690] mb-1">Venue *</label>
                    <input
                      type="text"
                      required
                      value={eventVenue}
                      onChange={(e) => setEventVenue(e.target.value)}
                      placeholder="e.g. Talisay Sports Complex"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9690] mb-1">Key Speaker *</label>
                    <input
                      type="text"
                      required
                      value={eventSpeaker}
                      onChange={(e) => setEventSpeaker(e.target.value)}
                      placeholder="e.g. Mayor Gullas"
                      className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-white outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[#8A9690] text-xs font-bold uppercase mb-1">Event Banner Image</label>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-white/10 rounded-xl p-3 bg-[#101D17]/50 hover:bg-[#101D17] transition-all relative min-h-[96px]">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null;
                          setEventImgFile(file);
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="text-center pointer-events-none">
                        <Plus className="mx-auto text-gray-400 mb-1" size={20} />
                        <span className="text-xs text-gray-300 font-bold block">
                          {eventImgFile ? eventImgFile.name : "Upload Image File"}
                        </span>
                        <span className="text-[10px] text-gray-500 block mt-0.5">PNG, JPG up to 5MB</span>
                      </div>
                      {eventImgFile && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setEventImgFile(null);
                          }}
                          className="absolute top-1 right-1 bg-black/40 hover:bg-black/60 text-white rounded-full p-1 z-20 cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        value={eventImg}
                        onChange={(e) => setEventImg(e.target.value)}
                        placeholder="Or paste image URL instead..."
                        className="w-full px-3 py-2 bg-[#101D17] border border-white/10 rounded-xl text-xs text-white outline-none"
                      />
                      <div className="flex-1 min-h-[64px] border border-white/10 rounded-xl overflow-hidden bg-[#101D17]/50 flex items-center justify-center text-[10px] text-gray-500 relative">
                        {eventImgFile ? (
                          <img
                            src={URL.createObjectURL(eventImgFile)}
                            alt="Upload Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : eventImg ? (
                          <img
                            src={eventImg}
                            alt="URL Preview"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span>Preview Image</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="featured_evt"
                    checked={eventFeatured}
                    onChange={(e) => setEventFeatured(e.target.checked)}
                    className="rounded border-white/10 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer bg-[#101D17]"
                  />
                  <label htmlFor="featured_evt" className="cursor-pointer text-[#ECEFEF]">Feature this event on public pages</label>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="allow_package_red_evt"
                    checked={eventAllowPackageRedemption}
                    onChange={(e) => setEventAllowPackageRedemption(e.target.checked)}
                    className="rounded border-white/10 text-green-600 focus:ring-green-500 w-4 h-4 cursor-pointer bg-[#101D17]"
                  />
                  <label htmlFor="allow_package_red_evt" className="cursor-pointer text-[#ECEFEF]">Allow Membership Package Passes (e.g. Coffee Connections passes)</label>
                </div>

                <div className="flex gap-2.5 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold cursor-pointer transition-colors"
                  >
                    {actionLoading ? "Saving..." : "Save Event Details"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEventModal(false);
                      setEditingEvent(null);
                    }}
                    className="px-4 py-2 border border-white/10 hover:bg-white/5 rounded-xl text-gray-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* SHARE MODAL */}
      <AnimatePresence>
        {showShareModal && shareEvent && (() => {
          const registrationUrl = `${window.location.origin}/events?register=${shareEvent.id}`;
          const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(registrationUrl)}`;
          return (
            <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-sm bg-[#0A1410] border border-white/10 rounded-3xl p-6 text-center shadow-2xl relative"
              >
                <button
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEvent(null);
                  }}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
                >
                  <X size={18} />
                </button>

                <div className="w-12 h-12 rounded-full bg-green-500/10 text-green-400 flex items-center justify-center mx-auto mb-4 border border-green-500/20 shadow-lg">
                  <QrCode size={22} />
                </div>

                <h3 className="font-heading font-black text-white text-base mb-1">
                  Share Event Invitation
                </h3>
                <p className="text-xs font-semibold text-green-400 mb-6 line-clamp-1">
                  {shareEvent.title}
                </p>

                <div className="p-4 bg-white rounded-2xl inline-block mb-6 border border-gray-100 shadow-md">
                  <img
                    src={qrCodeUrl}
                    alt="Event Registration QR"
                    className="w-48 h-48 object-contain"
                  />
                </div>

                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-4 leading-normal px-2">
                  Share the link or let guests scan this QR code to register directly for the event
                </p>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(registrationUrl);
                      toast.success("Registration link copied to clipboard!");
                    }}
                    className="w-full py-2 bg-[#10241A] hover:bg-[#163526] text-green-400 border border-green-500/10 rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Copy Registration Link
                  </button>
                  <button
                    onClick={() => handleDownloadShareQR(shareEvent, registrationUrl)}
                    className="w-full py-2 bg-green-700 hover:bg-green-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-md"
                  >
                    Download QR Code PNG
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
};
