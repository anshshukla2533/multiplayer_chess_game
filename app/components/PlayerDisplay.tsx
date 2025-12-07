"use client";

import React, { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { useSession, signOut, signIn } from "next-auth/react";

interface Player {
  id: string;
  name: string;
  image?: string;
  color: "w" | "b";
}

export function PlayerDisplay({ players }: { players: (Player | null)[] }) {
  const { data: session } = useSession();

  return (
    <div className="absolute top-4 right-4 flex flex-col gap-2">
      {session ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-cyan-500/20"
        >
          <div className="text-right">
            <p className="text-sm text-gray-400">Signed in as</p>
            <p className="font-bold text-white">{session.user?.name}</p>
          </div>
          {session.user?.image && (
            <img
              src={session.user.image}
              alt={session.user.name || "User"}
              className="w-10 h-10 rounded-full"
            />
          )}
          <button
            onClick={() => signOut()}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-500 rounded font-bold transition-all"
          >
            Sign Out
          </button>
        </motion.div>
      ) : (
        <motion.button
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => signIn("google")}
          className="px-6 py-3 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-lg font-bold text-white transition-all"
        >
          Sign In
        </motion.button>
      )}
    </div>
  );
}
