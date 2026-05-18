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

  const copy = useMemo(
    () =>
      lang === "mn"
        ? {
            title: "Судалгаа хуваалцах",
            description: `“${surveyTitle}” судалгааны public link-ийг удирдана. Ноорог төлөвтэй байвал share хийх үед автоматаар нийтлэгдэнэ.`,
            accessTitle: "Нээлттэй хандалт",
            accessHint: "Энэ link-тэй хүн бүр судалгааг нээж бөглөх боломжтой.",
            respondentHint: "Энэ бол хариулагчдад явуулах public form link. Excel export биш.",
            live: "Нийтлэгдсэн",
            draft: "Ноорог",
            autoPublish: "Link-ээ хуваалцах үед survey автоматаар нийтлэгдэнэ.",
            linkLabel: "Survey link",
            loadingLink: "Link ачаалж байна...",
            localWarning:
              "Энэ нь local development link тул бусад хэрэглэгч нээж чадахгүй. App-аа deploy хийх эсвэл `NEXT_PUBLIC_APP_URL`-д public domain тохируулна уу.",
            publish: "Нийтлэх",
            shareNow: "Шууд share хийх",
            openForm: "Форм нээх",
            copyLink: "Link хуулах",
            copyMessage: "Мессеж хуулах",
            copied: "Survey link хуулагдлаа",
            copiedMessage: "Илгээх мессеж хуулагдлаа",
            copyFailed: "Clipboard руу хуулах үед алдаа гарлаа",
            publishedToast: "Survey нийтлэгдэж, хуваалцахад бэлэн боллоо",
            publishError: "Хуваалцах тохиргоог шинэчилж чадсангүй",
            copyLabel: "Survey link хуулах",
            previewHint: "Public domain-тай үед чат аппууд preview card-ийг автоматаар харуулна.",
            shareText: (title: string) => `Сайн уу? "${title}" судалгаанд оролцоод бөглөөд өгөөч.`,
          }
        : {
            title: "Share survey",
            description: `Manage the public link for "${surveyTitle}". If the survey is still a draft, sharing it will publish it automatically.`,
            accessTitle: "Public access",
            accessHint: "Anyone with this link can open and submit the survey.",
            respondentHint:
              "This is the public form link respondents should use. It is not the Excel export file.",
            live: "Live",
            draft: "Draft",
            autoPublish: "The survey will go live automatically when you share this link.",
            linkLabel: "Survey link",
            loadingLink: "Loading link...",
            localWarning:
              "This is a local development link, so other users cannot open it. Deploy the app or set `NEXT_PUBLIC_APP_URL` to a public domain.",
            publish: "Publish",
            shareNow: "Share now",
            openForm: "Open form",
            copyLink: "Copy link",
            copyMessage: "Copy message",
            copied: "Survey link copied",
            copiedMessage: "Share message copied",
            copyFailed: "Unable to copy to clipboard",
            publishedToast: "Survey is now live and ready to share",
            publishError: "Unable to update sharing settings",
            copyLabel: "Copy survey link",
            previewHint:
              "When this uses a public domain, chat apps can show the survey preview automatically.",
            shareText: (title: string) => `Hi, please open and fill out this survey: "${title}".`,
          },
    [lang, surveyTitle],
  );

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
  const shareSupported = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const shareMessage = useMemo(() => {
    if (!surveyUrl) {
      return "";
    }

    return `${copy.shareText(surveyTitle)}\n\n${surveyUrl}`;
  }, [copy, surveyTitle, surveyUrl]);

  const setDialogOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  const copyText = async (value: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch {
        // Fall back to a manual copy approach below.
      }
    }

    if (typeof document === "undefined") {
      return false;
    }

    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    textarea.style.pointerEvents = "none";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    try {
      return document.execCommand("copy");
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
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

    const copied = await copyText(surveyUrl);
    if (!copied) {
      toast.error(copy.copyFailed);
      return;
    }

    toast.success(copy.copied);
  };

  const handleCopyMessage = async () => {
    const ready = await ensurePublished();
    if (!ready || !shareMessage) {
      return;
    }

    const copied = await copyText(shareMessage);
    if (!copied) {
      toast.error(copy.copyFailed);
      return;
    }

    toast.success(copy.copiedMessage);
  };

  const handleNativeShare = async () => {
    const ready = await ensurePublished();
    if (!ready || !surveyUrl) {
      return;
    }

    if (!shareSupported) {
      await handleCopyMessage();
      return;
    }

    try {
      await navigator.share({
        title: surveyTitle,
        text: copy.shareText(surveyTitle),
        url: surveyUrl,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      await handleCopyMessage();
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
                <p className="mt-2 text-xs font-medium text-primary">{copy.respondentHint}</p>
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
            <p className="text-xs text-muted-foreground">{copy.previewHint}</p>
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
          <Button
            variant="outline"
            onClick={handleCopyMessage}
            disabled={busy || !surveyUrl || isLocalOnlyLink}
          >
            <Copy className="mr-2 h-4 w-4" />
            {copy.copyMessage}
          </Button>
          <Button variant="outline" onClick={handleOpenForm} disabled={busy || !surveyUrl}>
            <ExternalLink className="mr-2 h-4 w-4" />
            {copy.openForm}
          </Button>
          <Button onClick={handleNativeShare} disabled={busy || !surveyUrl || isLocalOnlyLink}>
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {copy.shareNow}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
