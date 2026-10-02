import { requireAdminPage } from "@/lib/auth/admin";
import { buildAnalyticsReport } from "@/lib/analytics/report";
import { AnalyticsDashboard } from "@/components/admin/analytics/analytics-dashboard";

const ALLOWED_PERIODS = [7, 14, 30];

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ dias?: string }>;
}) {
  await requireAdminPage({ adminOnly: true });

  const { dias } = await searchParams;
  const requested = Number(dias);
  const periodDays = ALLOWED_PERIODS.includes(requested) ? requested : 14;

  const report = await buildAnalyticsReport(periodDays);

  return <AnalyticsDashboard report={report} />;
}
