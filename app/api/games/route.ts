import { auth } from "@/app/api/auth/[...nextauth]/route";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { result, moves } = await req.json();

    const { db } = await connectToDatabase();
    const gamesCollection = db.collection("games");

    const game = await gamesCollection.insertOne({
      userId: new ObjectId(session.user.id),
      result,
      moves,
      playedAt: new Date(),
    });

    // Update user stats
    const usersCollection = db.collection("users");
    if (result === "win") {
      await usersCollection.updateOne(
        { _id: new ObjectId(session.user.id) },
        {
          $inc: { gamesPlayed: 1, wins: 1 },
        }
      );
    } else {
      await usersCollection.updateOne(
        { _id: new ObjectId(session.user.id) },
        {
          $inc: { gamesPlayed: 1 },
        }
      );
    }

    return Response.json({ success: true, gameId: game.insertedId });
  } catch (error) {
    console.error("Save game error:", error);
    return Response.json({ error: "Failed to save game" }, { status: 500 });
  }
}
