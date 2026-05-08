import { ImageResponse } from "next/og";
import { getPublicSurveyPreview } from "@/lib/public-surveys.server";

export const alt = "Survey preview";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

const FALLBACK_TITLE = "Public survey";
const FALLBACK_DESCRIPTION = "Open the survey link and send your response online.";

function trimText(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim();
  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}...`;
}

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const survey = await getPublicSurveyPreview(surveyId);

  const title = trimText(survey?.title, 90) || FALLBACK_TITLE;
  const description = trimText(survey?.description, 180) || FALLBACK_DESCRIPTION;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "48px",
        background:
          "linear-gradient(135deg, rgb(15, 23, 42) 0%, rgb(30, 41, 59) 45%, rgb(14, 116, 144) 100%)",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: "32px",
          padding: "44px",
          background: "rgba(255, 255, 255, 0.1)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.25)",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
            }}
          >
            <div
              style={{
                display: "flex",
                width: "58px",
                height: "58px",
                borderRadius: "18px",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255, 255, 255, 0.16)",
                fontSize: "20px",
                fontWeight: 700,
                letterSpacing: "0.08em",
              }}
            >
              U
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  opacity: 0.78,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                UUNII Creation Hub
              </div>
              <div
                style={{
                  fontSize: "34px",
                  fontWeight: 700,
                }}
              >
                Survey Link
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              borderRadius: "999px",
              padding: "12px 22px",
              background: "rgba(255, 255, 255, 0.12)",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            Open to respond
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "24px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              lineHeight: 1.08,
              fontWeight: 800,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: "900px",
              fontSize: "28px",
              lineHeight: 1.45,
              color: "rgba(255, 255, 255, 0.8)",
            }}
          >
            {description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: "22px",
            color: "rgba(255, 255, 255, 0.76)",
          }}
        >
          <div style={{ display: "flex" }}>Share the link to collect responses faster</div>
          <div style={{ display: "flex", fontWeight: 700 }}>UUNII preview</div>
        </div>
      </div>
    </div>,
    size,
  );
}
