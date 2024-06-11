import { NewReply } from "@/components/new-reply";
import { db } from "@/drizzle/db";
import { openingPosts, replies } from "@/drizzle/schema";
import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Thread({ params }: { params: { tid: string } }) {
  const openingPostWithReplies = await db.query.openingPosts.findFirst({
    columns: {
      id: true,
      content: true,
      createdAt: true,
    },
    where: eq(openingPosts.id, params.tid),
    with: {
      replies: {
        orderBy: [asc(replies.createdAt)],
      },
    },
  });

  if (!openingPostWithReplies) notFound();

  return (
    <main className="flex min-h-screen flex-col items-center bg-neutral-50">
      <div className="flex w-full flex-row items-center justify-center py-8">
        <Link
          href={"/"}
          className="select-none text-3xl font-bold transition-all hover:text-neutral-600"
        >
          ROBOT1024
        </Link>
      </div>
      <div className="flex w-full max-w-[800px] flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-neutral-500">
            {openingPostWithReplies.createdAt.toLocaleDateString() +
              ", " +
              openingPostWithReplies.createdAt.toLocaleTimeString()}
          </p>
          <p className="w-full max-w-[800px] text-neutral-800">
            {openingPostWithReplies.content}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          {openingPostWithReplies.replies.map((reply, index) => {
            return (
              <div
                key={reply.id}
                className="flex max-w-fit flex-col gap-2 rounded-lg border border-neutral-200 bg-white px-5 py-3"
              >
                <p className="text-xs text-neutral-500">
                  {reply.createdAt.toLocaleDateString() +
                    ", " +
                    reply.createdAt.toLocaleTimeString()}
                </p>
                <p className="text-neutral-800">{reply.content}</p>
              </div>
            );
          })}
        </div>
      </div>
      <div className="pb-36 pt-16">
        <NewReply parentPost={openingPostWithReplies.id} />
      </div>
    </main>
  );
}
