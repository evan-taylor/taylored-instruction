import Image from "next/image";
import Link from "next/link";
import { type RevnuPostResponse, rewriteRevnuBodyLinks } from "@/lib/revnu";
import { generateJSONLD } from "@/lib/structuredData";

const heroImageWidth = 1200;
const heroImageHeight = 675;

const formatPublishedDate = (date: Date) =>
  date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const RevnuPostArticle = ({ data }: { data: RevnuPostResponse }) => {
  const { post } = data;
  const publishedAt = new Date(post.publishedAt);

  return (
    <article className="bg-white">
      {data.jsonLd.map((schema) => (
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD is escaped by generateJSONLD
          dangerouslySetInnerHTML={generateJSONLD(schema)}
          key={JSON.stringify(schema)}
          type="application/ld+json"
        />
      ))}

      <section className="border-slate-100 border-b bg-slate-50">
        <div className="container mx-auto max-w-4xl px-4 py-14">
          <Link
            className="font-medium text-primary text-sm hover:underline"
            href="/blog"
          >
            Back to blog
          </Link>
          <h1 className="mt-4 font-bold text-4xl text-slate-900 leading-tight md:text-5xl">
            {post.title}
          </h1>
          <p className="mt-5 text-lg text-slate-700 leading-relaxed">
            {post.metaDescription}
          </p>
          <p className="mt-4 text-slate-500 text-sm">
            Published{" "}
            <time dateTime={publishedAt.toISOString()}>
              {formatPublishedDate(publishedAt)}
            </time>
          </p>
        </div>
      </section>

      {post.heroImageUrl ? (
        <section className="container mx-auto max-w-5xl px-4 pt-10">
          <Image
            alt={post.title}
            className="aspect-video w-full rounded-xl object-cover"
            height={heroImageHeight}
            priority
            src={post.heroImageUrl}
            unoptimized
            width={heroImageWidth}
          />
        </section>
      ) : null}

      <section className="container mx-auto max-w-4xl px-4 py-12">
        <div
          className="revnu-post-body text-lg"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Revnu escapes raw HTML and rejects javascript: URLs
          dangerouslySetInnerHTML={{
            __html: rewriteRevnuBodyLinks(post.body.html),
          }}
        />
      </section>
    </article>
  );
};
