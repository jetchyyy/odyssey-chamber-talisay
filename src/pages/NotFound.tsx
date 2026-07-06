import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Compass, Home } from "lucide-react";

const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfaf6] pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gold/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-green-50 rounded-full blur-3xl translate-y-1/3 translate-x-1/3 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
        className="w-full max-w-md bg-white rounded-[2rem] shadow-[0_8px_40px_rgba(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 text-center relative z-10"
      >
        <div className="w-20 h-20 bg-green-50 border border-green-200 text-green-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm group hover:scale-105 transition-transform duration-300">
          <Compass size={36} className="animate-spin-slow" />
        </div>

        <h1 className="text-6xl font-heading font-black text-[#0D1A14] mb-3">404</h1>
        <h2 className="text-xl font-heading font-bold text-[#0D1A14] mb-4">Page Not Found</h2>
        
        <p className="text-sm text-gray-500 leading-relaxed mb-8 max-w-xs mx-auto">
          Oops! The page you are looking for does not exist, has been removed, or has had its name changed.
        </p>

        <Link
          to="/"
          className="btn-premium bg-green-700 hover:bg-green-600 text-white justify-center w-full shadow-diffuse"
        >
          <Home size={14} className="mr-1" />
          Back to Homepage
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
