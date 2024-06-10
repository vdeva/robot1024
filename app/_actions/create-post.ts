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
  if (!process.env.HCAPTCHA_SECRET_KEY)
    throw new Error("Missing HCAPTCHA_SECRET_KEY.");

  const params = new URLSearchParams();
  params.append("response", captchaToken);
  params.append("secret", process.env.HCAPTCHA_SECRET_KEY);

  const verifyResponse = await fetch("https://hcaptcha.com/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!verifyResponse.ok) {
    return { status: "error", message: "Captcha failed." };
  }

  if (
    Number(process.env.POST_LIMIT) != -1 &&
    content.length > Number(process.env.POST_LIMIT)
  ) {
    return { status: "error", message: "Post exceeds 2000 characters." };
  }

  if (content.length < 1) {
    return {
      status: "error",
      message: "Posts must be at least 1 character long.",
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

  if (totalPostsAndReplies > 10000) throw new Error("Post limit reached.");

  const apiKey = process.env.MISTRAL_API_KEY;

  const client = new MistralClient(apiKey);

  const embeddingsResponse = await client.embeddings({
    model: "mistral-embed",
    input: [content],
  });

  console.log(embeddingsResponse);

  const embeddingParsed = embeddingsResponse.data[0].embedding;

  const similarityOps = sql<number>`1 - (${cosineDistance(openingPosts.embedding, embeddingParsed)})`;
  const similarityReplies = sql<number>`1 - (${cosineDistance(replies.embedding, embeddingParsed)})`;

  const similarPosts = await db.transaction(async (tx) => {
    const similarOps = await tx
      .select({ similarityOps })
      .from(openingPosts)
      .where(gt(similarityOps, 0.94))
      .limit(1);

    const similarReplies = await tx
      .select({ similarityReplies })
      .from(replies)
      .where(gt(similarityReplies, 0.94))
      .limit(1);

    return { similarOps, similarReplies };
  });

  if (similarPosts.similarOps[0] || similarPosts.similarReplies[0]) {
    return { status: "error", message: "Too Unoriginal." };
  }

  if (!parentPost) {
    const newPost = await db
      .insert(openingPosts)
      .values({
        id: nanoid(16),
        content: content,
        embedding: embeddingParsed,
      })
      .returning({ insertedId: openingPosts.id });

    if (!newPost || !newPost[0].insertedId)
      return { status: "error", message: "Failed to create post." };

    revalidatePath("/");

    return {
      status: "success",
      message: "Post created.",
      postId: newPost[0].insertedId,
    };
  }

  const newPost = await db.transaction(async (trx) => {
    const newReply = await trx
      .insert(replies)
      .values({
        id: nanoid(16),
        content: content,
        embedding: embeddingParsed,
        openingPostId: parentPost,
      })
      .returning({ insertedId: replies.id });

    if (newReply.length > 0) {
      await trx
        .update(openingPosts)
        .set({ lastReplyCreatedAt: sql`CURRENT_TIMESTAMP` })
        .where(eq(openingPosts.id, parentPost));
    }

    return newReply;
  });

  if (!newPost || !newPost[0].insertedId)
    return { status: "error", message: "Failed to create reply." };

  revalidatePath("/");

  return { status: "success", message: "Reply created." };
}
