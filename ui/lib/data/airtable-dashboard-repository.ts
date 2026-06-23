import type { DashboardRepository } from "@/lib/data/dashboard-repository";

export interface AirtableDashboardRepositoryOptions {
  apiKey: string;
  baseId: string;
  scoresTable: string;
}

export function createAirtableDashboardRepository(
  _options: AirtableDashboardRepositoryOptions
): DashboardRepository {
  throw new Error(
    "Airtable dashboard repository is intentionally not implemented in this PR. The UI uses the CSV repository and keeps this interface as the future integration boundary."
  );
}
