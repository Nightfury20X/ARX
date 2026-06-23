import { DashboardShell } from "@/components/dashboard-shell";
import { csvDashboardRepository } from "@/lib/data/csv-dashboard-repository";

export default async function Home() {
  const dashboardData = await csvDashboardRepository.getDashboardData();

  return <DashboardShell data={dashboardData} />;
}
