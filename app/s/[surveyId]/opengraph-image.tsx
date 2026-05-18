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

  const title = trimText(survey?.title, 86) || FALLBACK_TITLE;
  const description = trimText(survey?.description, 140) || FALLBACK_DESCRIPTION;

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        padding: "40px",
        background:
          "linear-gradient(160deg, rgb(255, 248, 220) 0%, rgb(255, 240, 184) 48%, rgb(255, 226, 138) 100%)",
        color: "rgb(17, 24, 39)",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          borderRadius: "34px",
          background: "rgba(255, 255, 255, 0.72)",
          border: "1px solid rgba(255, 255, 255, 0.78)",
          boxShadow: "0 28px 90px rgba(120, 72, 0, 0.18)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "42%",
            height: "100%",
            padding: "36px",
            position: "relative",
            background:
              "radial-gradient(circle at top left, rgb(255, 245, 157) 0%, rgb(255, 224, 102) 36%, rgb(255, 197, 61) 100%)",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "160px",
              height: "160px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.4)",
              position: "absolute",
              top: "54px",
              left: "48px",
            }}
          />
          <div
            style={{
              display: "flex",
              width: "280px",
              height: "280px",
              borderRadius: "999px",
              background: "rgba(255, 255, 255, 0.16)",
              position: "absolute",
              bottom: "-54px",
              left: "-26px",
            }}
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              position: "relative",
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
                  width: "54px",
                  height: "54px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.88)",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "26px",
                  fontWeight: 800,
                  color: "rgb(217, 119, 6)",
                }}
              >
                F
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "16px",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "rgba(120, 53, 15, 0.8)",
                  }}
                >
                  Formly
                </div>
                <div
                  style={{
                    display: "flex",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: "rgb(120, 53, 15)",
                  }}
                >
                  Survey invite
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "220px",
                  height: "220px",
                  borderRadius: "999px",
                  background: "rgba(255, 255, 255, 0.68)",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 18px 44px rgba(120, 53, 15, 0.16)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "18px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      fontSize: "72px",
                    }}
                  >
                    🙂
                  </div>
                  <div
                    style={{
                      display: "flex",
                      fontSize: "24px",
                      fontWeight: 700,
                      color: "rgb(146, 64, 14)",
                    }}
                  >
                    Open and respond
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                fontSize: "18px",
                fontWeight: 600,
                color: "rgba(120, 53, 15, 0.76)",
              }}
            >
              Share the link to collect responses
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            width: "58%",
            height: "100%",
            padding: "42px 42px 38px",
            background: "rgb(255, 252, 245)",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "100%",
              height: "100%",
              borderRadius: "28px",
              background: "white",
              padding: "34px",
              boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "18px",
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
                    padding: "10px 18px",
                    borderRadius: "999px",
                    background: "rgb(255, 247, 237)",
                    color: "rgb(194, 65, 12)",
                    fontSize: "17px",
                    fontWeight: 700,
                  }}
                >
                  Public survey
                </div>
                <div
                  style={{
                    display: "flex",
                    width: "92px",
                    height: "10px",
                    borderRadius: "999px",
                    background: "rgb(253, 230, 138)",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: "54px",
                  lineHeight: 1.08,
                  fontWeight: 800,
                  color: "rgb(17, 24, 39)",
                }}
              >
                {title}
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: "24px",
                  lineHeight: 1.45,
                  color: "rgb(75, 85, 99)",
                }}
              >
                {description}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "14px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: "100%",
                  borderRadius: "20px",
                  padding: "18px 22px",
                  background: "rgb(248, 250, 252)",
                  border: "1px solid rgb(226, 232, 240)",
                  fontSize: "22px",
                  color: "rgb(51, 65, 85)",
                }}
              >
                Anyone with this link can open and submit the survey.
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "18px",
                  color: "rgb(100, 116, 139)",
                }}
              >
                <div style={{ display: "flex" }}>Shared from Formly</div>
                <div style={{ display: "flex", fontWeight: 700 }}>Preview card</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
