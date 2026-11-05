import "./globals.css";
import React from "react";

export const metadata = {
  title: "Gojo / Academic Syllabus & Research Tool",
  description: "Academic syllabus synthesis, active recall drills, flashcards, and document assistant.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

