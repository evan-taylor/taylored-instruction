import {
  NextStudio,
  metadata as studioMetadata,
  viewport as studioViewport,
} from "next-sanity/studio";
import config from "@/sanity.config";

export const metadata = studioMetadata;
export const viewport = studioViewport;

export default function StudioPage() {
  return <NextStudio config={config} />;
}
