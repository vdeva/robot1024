"use client";

import { createPost } from "@/app/_actions/create-post";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

export function NewReply(props: { parentPost: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [postRes, setPostRes] = useState<{
    status: string;
    message: string;
    postId?: undefined | string;
  }>();

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(event.target.value);
  };

  const onCaptchaVerify = (token: string) => {
    setCaptchaToken(token);
  };

  useEffect(() => {
    setIsLoading(true);
    if (postRes?.status == "success") {
      setInputText("");
      router.refresh();
    }
    setIsLoading(false);
  }, [postRes, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    event.preventDefault();
    if (inputText.length < 1) return;

    setPostRes(await createPost(inputText, props.parentPost, captchaToken));

    setIsLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-row gap-[1px]">
          <div className="flex flex-row items-center border border-[#880000] bg-[#EEAA88]">
            <p className="py-4 pl-2 pr-5 text-sm font-bold text-[#880000]">
              Reply
            </p>
          </div>
          <textarea
            disabled={isLoading}
            className="h-full min-h-[60px] border border-[#AAAAAA] px-1 text-sm focus-visible:border-[#EEAA88] focus-visible:outline-none"
            value={inputText}
            onChange={handleChange}
            placeholder=""
          />
        </div>
        <div className="pt-[4px]">
          <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY as string}
            onVerify={onCaptchaVerify}
          />
        </div>
        {postRes?.status == "error" && (
          <p className="mt-[1px] bg-red-500 px-2 text-sm text-white">
            Error: {postRes.message}
          </p>
        )}
        <div className="flex w-full flex-row items-center justify-end">
          <button
            disabled={
              isLoading || inputText.length < 1 || captchaToken.length < 1
            }
            className="mt-2 rounded-sm border border-neutral-400 bg-[#E9E9ED] px-1 py-[1px] text-sm hover:bg-[#D0D0D7] active:bg-[#b3b3b9]"
            type="submit"
          >
            Post
          </button>
        </div>
      </form>
    </div>
  );
}
