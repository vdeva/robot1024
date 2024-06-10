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
        <NewReply parentPost={openingPostWithReplies.id} />
      </div>
      <div className="flex w-full max-w-[1000px] flex-col gap-4 px-4">
        <div className="flex flex-col gap-2">
          <p className="text-[#800000]">
            <span className="pr-2 font-bold text-[#117743]">Anonymous</span>
            {openingPostWithReplies.createdAt.toLocaleDateString() +
              ", " +
              openingPostWithReplies.createdAt.toLocaleTimeString()}
          </p>
          <p className="w-full max-w-[900px] text-[#800000]">
            {openingPostWithReplies.content}
          </p>
        </div>
        <div className="flex w-full flex-col gap-1">
          {openingPostWithReplies.replies.map((reply, index) => {
            return (
              <div
                key={reply.id}
                className="flex max-w-min flex-col gap-2 text-nowrap border-b border-r border-[#DEC7BF] bg-[#F0E0D6] px-5 py-3"
              >
                <p className="text-[#800000]">
                  <span className="break-keep pr-2 font-bold text-[#117743]">
                    Anonymous
                  </span>
                  {reply.createdAt.toLocaleDateString() +
                    ", " +
                    reply.createdAt.toLocaleTimeString()}
                </p>
                <p className="max-w-[900px] text-[#800000]">{reply.content}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
