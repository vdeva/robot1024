import { NewThread } from "@/components/new-thread";
import { db } from "@/drizzle/db";
import { openingPosts, replies } from "@/drizzle/schema";
import { sql } from "drizzle-orm";
import Link from "next/link";

export default async function Home() {
  const openingPostsRes = await db
    .select({
      id: openingPosts.id,
      content: openingPosts.content,
      replyCount: sql<number>`count(${replies.id})`,
    })
    .from(openingPosts)
    .leftJoin(replies, sql`${openingPosts.id} = ${replies.openingPostId}`)
    .groupBy(openingPosts.id)
    .orderBy(sql`${openingPosts.lastReplyCreatedAt} desc`);

  return (
    <main className="flex min-h-screen flex-col items-center bg-[#FFFFEE]">
      <div className="flex w-full flex-row items-center justify-center bg-gradient-to-b from-[#fed6af] to-[#FFFFEE] py-8">
        <Link
          href={"/"}
          className="text-3xl font-bold text-[#800000] hover:text-red-600"
        >
          ROBOT1024
        </Link>
      </div>
      <div className="pb-10">
        <NewThread />
      </div>
      <div className="grid max-w-[1300px] grid-cols-1 items-center gap-4 px-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {openingPostsRes.map((openingPost) => {
          return (
            <Link
              key={openingPost.id}
              href={`/thread/${openingPost.id}`}
              className="flex h-[260px] w-[190px] flex-col items-center gap-1 overflow-hidden px-4 py-2 text-[#800000] shadow-md transition-all hover:shadow-lg"
            >
              <p className="text-xs">
                R: <span className="font-bold">{openingPost.replyCount}</span>
              </p>
              <p className="text-sm">{openingPost.content}</p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
