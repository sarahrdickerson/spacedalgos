import { DashboardProvider } from "../_components/dashboard-provider";

export default function DashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardProvider>{children}</DashboardProvider>;
}
