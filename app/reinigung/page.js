import ServiceOverviewPage from "../components/ServiceOverviewPage";
import { serviceContent } from "../lib/serviceContent";

export const metadata = { title: "Reinigung — UmzugPlus" };

export default function ReinigungPage() {
  return <ServiceOverviewPage data={serviceContent.reinigung} slug="reinigung" />;
}
