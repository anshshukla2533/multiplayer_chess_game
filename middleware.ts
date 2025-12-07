import { auth } from "@/app/api/auth/[...nextauth]/route";
import type { NextRequest } from "next/server";

export const middleware = auth((req: NextRequest) => {
  return undefined;
});

export const config = {
  matcher: [],
};
