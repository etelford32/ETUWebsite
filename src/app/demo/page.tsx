import type { Metadata } from "next";
import { SITE_URL } from "@/lib/siteUrl";
import { DEMO_DATE_LABEL } from "@/lib/campaign";
import DemoDayClient from "./DemoDayClient";

const TITLE = "Free Demo on Thanksgiving Day | Explore the Universe 2175";
const DESCRIPTION = `The free demo of Explore the Universe 2175 lands on Steam on ${DEMO_DATE_LABEL}. Create your commander account, wishlist on Steam and be ready at launch.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "./" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: `${SITE_URL}/demo`,
    siteName: "Explore the Universe 2175",
    images: [{ url: `${SITE_URL}/og/site.jpg`, width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og/site.jpg`],
  },
};

export default function DemoPage() {
  return <DemoDayClient />;
}
