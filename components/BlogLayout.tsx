import { MDXProvider } from "@mdx-js/react";
import { PropsWithChildren, VFC } from "react";
import { Metadata } from "../types/post";
import { Layout } from "./Layout";
import type { MDXComponents } from "mdx/types";

const components: MDXComponents = {
  h1: (props) => (
    <h1
      {...props}
      className="text-3xl font-bold pb-2 mb-2 mt-4 border-b border-zinc-600"
    ></h1>
  ),
  a: (props) => (
    <a
      {...props}
      className="text-pink-400 hover:underline transition-colors"
    ></a>
  ),
  p: (props) => <p {...props} className="my-4"></p>,
  pre: (props) => (
    <pre {...props} className="p-4 shadow bg-zinc-800 rounded"></pre>
  ),
  ul: (props) => <ul {...props} className="pl-4 list-disc"></ul>,
};

export const BlogLayout: VFC<PropsWithChildren<{ metadata: Metadata }>> = ({
  children,
  metadata,
}) => (
  <Layout>
    <div className="flex flex-col gap-4">
      <h1 className="text-4xl font-bold">{metadata.title}</h1>
      <article>
        <MDXProvider components={components}>{children}</MDXProvider>
      </article>
    </div>
  </Layout>
);
