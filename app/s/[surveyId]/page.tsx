import type { Metadata } from "next";
import { headers } from "next/headers";
import { TakeSurveyPage } from "@/routes/s.$surveyId";
import { getPublicSurveyPreview } from "@/lib/public-surveys.server";

const FALLBACK_TITLE = "Formly survey";
const FALLBACK_DESCRIPTION = "Open this survey link and send your response online.";

function trimDescription(description: string | null | undefined) {
  const normalized = description?.trim();
  if (!normalized) {
    return FALLBACK_DESCRIPTION;
  }

  if (normalized.length <= 160) {
    return normalized;
  }

  return `${normalized.slice(0, 157).trimEnd()}...`;
}

async function resolveAppOrigin() {
  const configuredOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim()?.replace(/\/+$/, "");
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";

  if (!host) {
    return "";
  }

  return `${protocol}://${host}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}): Promise<Metadata> {
  const { surveyId } = await params;
  const survey = await getPublicSurveyPreview(surveyId);
  const appOrigin = await resolveAppOrigin();
  const pagePath = `/s/${surveyId}`;
  const imagePath = `${pagePath}/opengraph-image`;
  const canonicalUrl = appOrigin ? `${appOrigin}${pagePath}` : undefined;
  const imageUrl = appOrigin ? `${appOrigin}${imagePath}` : imagePath;

  const title = survey?.title?.trim() || FALLBACK_TITLE;
  const description = trimDescription(survey?.description);

  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
    },
    alternates: canonicalUrl
      ? {
          canonical: canonicalUrl,
        }
      : undefined,
    openGraph: {
      title,
      description,
      type: "website",
      siteName: "Formly",
      url: canonicalUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: survey?.title || FALLBACK_TITLE,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  return <TakeSurveyPage surveyId={surveyId} />;
}
