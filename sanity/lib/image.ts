import type { SanityImageSource } from "@sanity/image-url";
import { createImageUrlBuilder } from "@sanity/image-url";
import { dataset, projectId } from "@/sanity/env";

const builder = createImageUrlBuilder({ dataset, projectId });

export const urlFor = (source: SanityImageSource) => builder.image(source);
