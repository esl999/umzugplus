import ServiceOverviewPage from "../components/ServiceOverviewPage";
import { serviceContent } from "../lib/serviceContent";

export const metadata = { title: "Umzug — UmzugPlus" };

export default function UmzugPage() {
  return <ServiceOverviewPage data={serviceContent.umzug} slug="umzug" />;
}
