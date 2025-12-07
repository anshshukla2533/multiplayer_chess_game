"use client";

import { useSession, signOut } from "next-auth/react";
import { redirect } from "next/navigation";
import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// Types
type PieceType = "p" | "n" | "b" | "r" | "q" | "k";
type PieceColor = "w" | "b";
type Piece = { type: PieceType; color: PieceColor } | null;
type Board = Piece[][];
type Position = { row: number; col: number };

export default function ChessGameWrapper() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <p className="text-white text-xl">Loading...</p>
      </div>
    );
  }

  if (!session) {
    redirect("/auth/signin");
  }

  return <ChessGame session={session} />;
}

function ChessGame({ session }: any) {
  // Rest of your chess game code here
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-950 via-purple-950 to-slate-950 text-white p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-bold bg-clip-text text-transparent bg-linear-to-r from-cyan-400 to-pink-400"
          >
            Stack-Based Chess
          </motion.h1>
          {session?.user && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-400">Signed in as</p>
                <p className="font-bold text-white">{session.user.name}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg font-bold transition-all"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>

        <div className="text-center text-gray-400 mt-20">
          <p>Chess board component coming soon...</p>
        </div>
      </div>
    </div>
  );
}
