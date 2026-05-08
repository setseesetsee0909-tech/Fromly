import { AnalyticsPage } from "@/routes/_app.surveys.$id.analytics";

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <AnalyticsPage surveyId={id} />;
}
