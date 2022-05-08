import { MDXProvider } from "@mdx-js/react";
import { PropsWithChildren, VFC } from "react";
import { Metadata } from "../types/post";
import { Layout } from "./Layout";
import type { MDXComponents } from "mdx/types";
import Head from "next/head";

const palt = { fontFeatureSettings: `"palt"` };

const components: MDXComponents = {
  h1: (props) => (
    <h1
      {...props}
      className="text-3xl font-bold pb-2 mb-2 mt-4 border-b border-zinc-600"
      style={palt}
    ></h1>
  ),
  h2: (props) => <h2 {...props} className="text-2xl font-bold mb-4 mt-4"></h2>,
  a: (props) => (
    <a
      {...props}
      className="text-pink-400 hover:underline transition-colors"
      style={palt}
    ></a>
  ),
  p: (props) => <p {...props} className="my-4 text-justify"></p>,
  pre: (props) => (
    <pre
      {...props}
      className="p-4 shadow bg-zinc-800 rounded overflow-x-auto"
    ></pre>
  ),
  ul: (props) => <ul {...props} className="pl-4 list-disc"></ul>,
  blockquote: (props) => (
    <blockquote
      {...props}
      className="pl-4 py-1 border-l-2 bg-zinc-800 border-zinc-600"
    ></blockquote>
  ),
};

export const BlogLayout: VFC<PropsWithChildren<{ metadata: Metadata }>> = ({
  children,
  metadata,
}) => (
  <Layout>
    <Head>
      <title>{metadata.title} - GyakubaricEffects</title>
      <meta name="description" content={metadata.description} />
      <link rel="icon" href="/favicon.ico" />
    </Head>
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold" style={palt}>
        {metadata.title}
      </h1>
      <article className="blog-contents">
        <MDXProvider components={components}>{children}</MDXProvider>
      </article>
    </div>
  </Layout>
);
