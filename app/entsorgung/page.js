import ServiceOverviewPage from "../components/ServiceOverviewPage";
import { serviceContent } from "../lib/serviceContent";

export const metadata = { title: "Entsorgung — UmzugPlus" };

export default function EntsorgungPage() {
  return <ServiceOverviewPage data={serviceContent.entsorgung} slug="entsorgung" />;
}
