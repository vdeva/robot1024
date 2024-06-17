"use client";

import { createPost } from "@/app/_actions/create-post";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { useRouter } from "next/navigation";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

export function NewThread() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [captchaOpen, setCaptchaOpen] = useState(false);
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
    if (postRes?.postId) {
      setIsLoading(true);
      setInputText("");
      setCaptchaToken("");
      router.push(`/thread/${postRes.postId}`);
      setIsLoading(false);
    }
  }, [postRes, router]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    setIsLoading(true);
    event.preventDefault();
    setPostRes({ message: "", status: "" });
    setCaptchaToken("");
    setCaptchaOpen(false);
    if (inputText.length < 1) return;

    setPostRes(await createPost(inputText, null, captchaToken));

    setIsLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col">
          <textarea
            disabled={isLoading}
            className="h-full min-h-[80px] w-full min-w-[300px] rounded-xl border px-3 py-2 text-sm shadow-md outline-none transition-shadow duration-200 ease-in-out focus-visible:shadow-xl focus-visible:outline-none md:min-w-[400px]"
            value={inputText}
            onChange={handleChange}
            placeholder="Post something..."
          />
          <div className="mt-4 flex w-full flex-row items-center justify-between">
            {postRes?.status == "error" && !captchaOpen ? (
              <p className="rounded-full bg-red-500 px-3 pb-1 pt-[5px] text-sm text-white">
                Error: {postRes.message}
              </p>
            ) : (
              <div></div>
            )}
            {captchaOpen || captchaToken.length > 1 ? (
              <HCaptcha
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY as string}
                onVerify={onCaptchaVerify}
              />
            ) : (
              <button
                disabled={isLoading || inputText.length < 1}
                onClick={() => setCaptchaOpen(true)}
                className={`rounded-full px-3 pb-1 pt-[5px] text-sm text-white shadow-lg transition-all ${
                  isLoading || inputText.length < 1
                    ? "cursor-not-allowed bg-neutral-800/50"
                    : "bg-black hover:bg-neutral-500 hover:shadow-xl"
                }`}
              >
                Post
              </button>
            )}
          </div>
        </div>

        {captchaToken.length > 1 && (
          <div className="mt-4 flex w-full flex-row items-center justify-end gap-2">
            <button
              disabled={isLoading || inputText.length < 1}
              className={`rounded-full px-3 pb-1 pt-[5px] text-sm text-white shadow-lg transition-all ${
                isLoading || inputText.length < 1
                  ? "cursor-not-allowed bg-neutral-800/50"
                  : "bg-black hover:bg-neutral-500 hover:shadow-xl"
              }`}
              type="submit"
            >
              Post
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
