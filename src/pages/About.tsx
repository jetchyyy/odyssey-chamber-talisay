import React from "react";
import { Routes, Route } from "react-router-dom";
import { AboutSection } from "../components/sections/Sections";
import { CtaSection } from "../components/sections/MoreSections";
import BoardOfDirectors from "./BoardOfDirectors";

const About: React.FC = () => {
  return (
    <Routes>
      <Route path="board" element={<BoardOfDirectors />} />
      <Route path="*" element={
        <div className="flex flex-col w-full pt-20">
          <AboutSection />
          <CtaSection />
        </div>
      } />
    </Routes>
  );
};

export default About;
