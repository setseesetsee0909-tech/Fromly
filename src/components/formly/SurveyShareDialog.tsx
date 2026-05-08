"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Loader2, Send, Unlock } from "lucide-react";
import { useI18n } from "@/components/formly/I18nProvider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SurveyShareDialogProps {
  surveyId: string;
  surveyTitle: string;
  published: boolean;
  trigger: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPublishedChange?: (published: boolean) => void;
}

export function SurveyShareDialog({
  surveyId,
  surveyTitle,
  published,
  trigger,
  open,
  onOpenChange,
  onPublishedChange,
}: SurveyShareDialogProps) {
  const { lang } = useI18n();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isPublished, setIsPublished] = useState(published);
  const [busy, setBusy] = useState(false);

  const copy =
    lang === "mn"
      ? {
          title: "Судалгаа хуваалцах",
          description: `“${surveyTitle}” судалгааны public link-ийг удирдана. Хэрэв survey одоогоор ноорог байвал link copy эсвэл open хийх үед автоматаар нийтлэгдэнэ.`,
          accessTitle: "Нээлттэй хандалт",
          accessHint: "Энэ link-тэй хүн бүр судалгааг нээж бөглөх боломжтой.",
          live: "Нийтлэгдсэн",
          draft: "Ноорог",
          autoPublish: "Link-ээ хуваалцах үед survey автоматаар нийтлэгдэнэ.",
          linkLabel: "Survey link",
          loadingLink: "Link ачаалж байна...",
          localWarning:
            "Энэ нь local development link тул бусад хэрэглэгч нээж чадахгүй. App-аа deploy хийх эсвэл `NEXT_PUBLIC_APP_URL`-д public domain тохируулна уу.",
          publish: "Нийтлэх",
          openForm: "Форм нээх",
          copyLink: "Link хуулах",
          copied: "Survey link хуулагдлаа",
          publishedToast: "Survey нийтлэгдэж, хуваалцахад бэлэн боллоо",
          publishError: "Хуваалцах тохиргоог шинэчилж чадсангүй",
          localToast: "Энэ link зөвхөн таны өөрийн компьютер дээр ажиллана",
          copyLabel: "Survey link хуулах",
        }
      : {
          title: "Share survey",
          description: `Manage the public link for "${surveyTitle}". If the survey is still a draft, copying or opening the link will publish it automatically, similar to Google Forms.`,
          accessTitle: "Public access",
          accessHint: "Anyone with this link can open and submit the survey.",
          live: "Live",
          draft: "Draft",
          autoPublish: "The survey will go live automatically when you share this link.",
          linkLabel: "Survey link",
          loadingLink: "Loading link...",
          localWarning:
            "This is a local development link, so other users cannot open it. Deploy the app or set `NEXT_PUBLIC_APP_URL` to a public domain.",
          publish: "Publish",
          openForm: "Open form",
          copyLink: "Copy link",
          copied: "Survey link copied",
          publishedToast: "Survey is now live and ready to share",
          publishError: "Unable to update sharing settings",
          localToast: "This link uses localhost and only works on your own machine",
          copyLabel: "Copy survey link",
        };

  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  useEffect(() => {
    setIsPublished(published);
  }, [published]);

  const publicBaseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  const surveyUrl = useMemo(() => {
    if (publicBaseUrl) {
      return `${publicBaseUrl.replace(/\/$/, "")}/s/${surveyId}`;
    }

    if (typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}/s/${surveyId}`;
  }, [publicBaseUrl, surveyId]);

  const isLocalOnlyLink =
    surveyUrl.includes("localhost") ||
    surveyUrl.includes("127.0.0.1") ||
    surveyUrl.includes("0.0.0.0");

  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  const ensurePublished = async () => {
    if (isPublished) {
      return true;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from("surveys")
        .update({ is_published: true })
        .eq("id", surveyId);

      if (error) {
        throw error;
      }

      setIsPublished(true);
      onPublishedChange?.(true);
      toast.success(copy.publishedToast);
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.publishError);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCopyLink = async () => {
    const ready = await ensurePublished();
    if (!ready || !surveyUrl) {
      return;
    }

    await navigator.clipboard.writeText(surveyUrl);
    toast.success(copy.copied);
    if (isLocalOnlyLink) {
      toast.warning(copy.localToast);
    }
  };

  const handleOpenForm = async () => {
    const ready = await ensurePublished();
    if (!ready || !surveyUrl) {
      return;
    }

    window.open(surveyUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border bg-muted/30 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">{copy.accessTitle}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.accessHint}</p>
              </div>
              <div
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  isPublished ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}
              >
                {isPublished ? copy.live : copy.draft}
              </div>
            </div>

            {!isPublished && (
              <div className="mt-3 rounded-lg border border-dashed bg-background px-3 py-2 text-xs text-muted-foreground">
                {copy.autoPublish}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{copy.linkLabel}</label>
            <div className="flex gap-2">
              <Input value={surveyUrl || copy.loadingLink} readOnly />
              <Button onClick={handleCopyLink} disabled={busy || !surveyUrl}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
                <span className="sr-only">{copy.copyLabel}</span>
              </Button>
            </div>
            {isLocalOnlyLink && <p className="text-xs text-amber-600">{copy.localWarning}</p>}
          </div>
        </div>

        <DialogFooter>
          {!isPublished && (
            <Button variant="outline" onClick={ensurePublished} disabled={busy}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Unlock className="mr-2 h-4 w-4" />
              )}
              {copy.publish}
            </Button>
          )}
          <Button variant="outline" onClick={handleOpenForm} disabled={busy || !surveyUrl}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {copy.openForm}
          </Button>
          <Button onClick={handleCopyLink} disabled={busy || !surveyUrl}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {copy.copyLink}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
