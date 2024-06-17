"use server";

import { db } from "@/drizzle/db";
import { openingPosts, replies } from "@/drizzle/schema";
import MistralClient from "@mistralai/mistralai";
import { cosineDistance, eq, gt, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { revalidatePath } from "next/cache";

export async function createPost(
  content: string,
  parentPost: string | null,
  captchaToken: string,
) {
  if (!process.env.MISTRAL_API_KEY) throw new Error("Missing MISTRAL_API_KEY.");
  if (!process.env.POST_LIMIT) throw new Error("Missing POST_LIMIT.");
  if (!process.env.SIMILARITY_THRESHOLD)
    throw new Error("Missing SIMILARITY_THRESHOLD.");
  if (!process.env.HCAPTCHA_SECRET_KEY)
    throw new Error("Missing HCAPTCHA_SECRET_KEY.");

  const params = new URLSearchParams();
  params.append("response", captchaToken);
  params.append("secret", process.env.HCAPTCHA_SECRET_KEY);

  const verifyResponse = await fetch("https://api.hcaptcha.com/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!verifyResponse.ok) {
    return { status: "error", message: "Captcha failed." };
  }

  const response_json = await verifyResponse.json();

  if (!response_json["success"]) {
    return { status: "error", message: "Captcha failed." };
  }

  if (content.length < 1) {
    return {
      status: "error",
      message: "Posts must be at least 1 character long.",
    };
  }

  if (content.length > 2000) {
    return {
      status: "error",
      message: "Posts must be under 2000 characters long.",
    };
  }

  if (parentPost && (parentPost.length > 128 || parentPost.length < 1)) {
    return { status: "error", message: "Pad parent post id." };
  }

  const totalQuery = sql`
    SELECT (
      (SELECT COUNT(*) FROM ${openingPosts}) +
      (SELECT COUNT(*) FROM ${replies})
    ) AS total;
  `;

  const resultTotal = await db.execute(totalQuery);

  if (!resultTotal.rows[0].total) throw new Error("Failed to fetch total.");

  const totalPostsAndReplies = resultTotal.rows[0].total as number;

  console.log(totalPostsAndReplies);

  if (
    Number(process.env.POST_LIMIT) != -1 &&
    totalPostsAndReplies > Number(process.env.POST_LIMIT)
  ) {
    return { status: "error", message: "Post limit reached." };
  }

  const apiKey = process.env.MISTRAL_API_KEY;

  const client = new MistralClient(apiKey);

  const moderationResponse = await client.chat({
    model: "mistral-large-latest",
    temperature: 0,
    messages: [
      {
        role: "system",
        content: `
      Here is a post submitted by a user:
      ###POST BEGIN###${content}###POST END###
      If the post is insulting, sexist, racist, contains a link to another website or is an advertisement reply with "bad post".
      Otherwise reply with "ok post".
      Let people be silly. It's ok if a post is confusing or makes no sense.
      A post that is negative or is making fun of something is still considered an "ok post".
      Do not reply anything other than "bad post" or "ok post". Do not give any additional comments.
      `,
      },
    ],
  });

  if (
    moderationResponse.choices[0].message.content
      .toLowerCase()
      .includes("bad post") ||
    !moderationResponse.choices[0].message.content
      .toLowerCase()
      .includes("ok post")
  ) {
    return {
      status: "error",
      message: "Post deemed inappropriate.",
    };
  }

  const embeddingsResponse = await client.embeddings({
    model: "mistral-embed",
    input: [content],
  });

  console.log(embeddingsResponse);

  const embeddingParsed = embeddingsResponse.data[0].embedding;

  async function performTransaction() {
    try {
      const result = await db.transaction(
        async (tx) => {
          const similarityThreshold = process.env.SIMILARITY_THRESHOLD;
          const similarityOps = sql`1 - (${cosineDistance(openingPosts.embedding, embeddingParsed)})`;
          const similarityReplies = sql`1 - (${cosineDistance(replies.embedding, embeddingParsed)})`;

          const [similarOp] = await tx
            .select({ similarity: similarityOps })
            .from(openingPosts)
            .where(gt(similarityOps, similarityThreshold))
            .limit(1);

          const [similarReply] = await tx
            .select({ similarity: similarityReplies })
            .from(replies)
            .where(gt(similarityReplies, similarityThreshold))
            .limit(1);

          if (similarOp || similarReply) {
            await tx.rollback();
            return { status: "error", message: "Too Unoriginal." };
          }

          let newRecord;
          if (!parentPost) {
            newRecord = await tx
              .insert(openingPosts)
              .values({
                id: nanoid(16),
                content: content,
                embedding: embeddingParsed,
              })
              .returning({ insertedId: openingPosts.id });
          } else {
            newRecord = await tx
              .insert(replies)
              .values({
                id: nanoid(16),
                content: content,
                embedding: embeddingParsed,
                openingPostId: parentPost,
              })
              .returning({ insertedId: replies.id });

            await tx
              .update(openingPosts)
              .set({ lastReplyCreatedAt: sql`CURRENT_TIMESTAMP` })
              .where(eq(openingPosts.id, parentPost));
          }

          if (!newRecord || !newRecord[0].insertedId) {
            await tx.rollback();
            return { status: "error", message: "Failed to create post." };
          }

          return {
            status: "success",
            message: "Post created successfully.",
            postId: newRecord[0].insertedId,
          };
        },
        {
          isolationLevel: "serializable",
        },
      );
      return result;
    } catch (error) {
      console.error("Transaction error:", error);
      return { status: "error", message: "Too Unoriginal." };
    }
  }

  const result = await performTransaction();

  if (result.status === "error") {
    console.error(result.message);
  } else {
    console.log(result.message);
    revalidatePath("/");
  }

  return result;
}
