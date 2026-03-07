"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Image from "next/image";
import { ChatBubbleIcon } from "@radix-ui/react-icons";

const MAX_CHARS = 2000;

export default function FeedbackForm({ catImages }: { catImages: string[] }) {
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [catUrl, setCatUrl] = useState("");

  const randomCat = () =>
    catImages[Math.floor(Math.random() * catImages.length)] ?? "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to submit feedback");
      }

      setCatUrl(randomCat());
      setSubmitted(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 flex flex-col items-center text-center gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">Thanks for the feedback! 🐱</h1>
          <p className="text-muted-foreground">
            I read every submission, it really helps make this better for everyone!
          </p>
          <p className="text-sm text-muted-foreground">
            Here's a random cat as a token of my appreciation:
          </p>
          
        </div>
        {catUrl && (
          <div className="rounded-2xl overflow-hidden border shadow-md w-72 h-72 relative bg-muted">
            <Image
              src={catUrl}
              alt="A random thank-you cat"
              fill
              className="object-cover"
            />
          </div>
        )}
        <Button
          variant="outline"
          onClick={() => {
            setMessage("");
            setSubmitted(false);
          }}
        >
          Submit more feedback
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ChatBubbleIcon className="w-5 h-5 text-muted-foreground" />
            <CardTitle>Feedback</CardTitle>
          </div>
          <CardDescription>
            Bug reports, feature requests, general thoughts — anything goes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                placeholder="What's on your mind?"
                rows={6}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={MAX_CHARS}
                required
              />
              <p className="text-xs text-muted-foreground text-right">
                {message.length} / {MAX_CHARS}
              </p>
            </div>
            <Button type="submit" disabled={isLoading || !message.trim()}>
              {isLoading ? "Sending..." : "Send feedback"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
