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
    <main className="flex min-h-screen flex-col items-center bg-neutral-50">
      <div className="flex w-full flex-col items-center justify-center py-8">
        <Link
          href={"/"}
          className="select-none text-3xl font-bold transition-all hover:text-neutral-600"
        >
          ROBOT1024
        </Link>
        <p className="text-xs">Where anything can only be said once.</p>
      </div>
      <div className="pb-10">
        <NewThread />
      </div>
      <div className="grid max-w-[1300px] grid-cols-1 items-center gap-4 px-4 pb-32 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {openingPostsRes.map((openingPost) => {
          return (
            <Link
              key={openingPost.id}
              href={`/thread/${openingPost.id}`}
              className="no-scrollbar flex h-[260px] w-[190px] flex-col gap-1 overflow-hidden overflow-y-scroll rounded-xl border border-neutral-200 bg-white text-neutral-800 shadow-md transition-all duration-300 ease-in-out hover:z-50 hover:border-neutral-300 hover:shadow-2xl"
            >
              {openingPost.replyCount > 0 && (
                <div className="pointer-events-none absolute flex h-[260px] flex-col items-start justify-end pb-[7px] pl-[7px]">
                  <p className="rounded-lg bg-emerald-500 px-2 text-xs text-white">
                    <span className="font-bold">{openingPost.replyCount}</span>
                  </p>
                </div>
              )}
              <p className="max-w-full self-center break-words px-4 pb-8 pt-2 text-sm">
                {openingPost.content}
              </p>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
