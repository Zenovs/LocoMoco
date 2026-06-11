import { NextResponse } from "next/server";
import { userCount } from "@/lib/users";

// Erstinbetriebnahme: gibt es noch keinen User, kann der erste Admin angelegt werden.
export async function GET() {
  return NextResponse.json({ needsSetup: userCount() === 0 });
}
