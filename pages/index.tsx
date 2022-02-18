import { readdir } from "fs/promises";
import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import path from "path";
import { Layout } from "../components/Layout";
import { PostList } from "../components/PostList";
import { Post, validateMetadata } from "../types/post";

type StaticProps = {
  posts: Pick<Post, "title" | "description" | "slug">[];
};

export const getStaticProps: GetStaticProps<StaticProps> = async () => {
  const posts: StaticProps["posts"] = [];

  for (const year of await readdir("./pages/posts")) {
    const py = path.join(`./pages/posts`, year);

    for (const month of await readdir(py)) {
      const pm = path.join(py, month);

      for (const file of await readdir(pm)) {
        const { metadata } = await import(`./posts/${year}/${month}/${file}`);
        if (!validateMetadata(metadata)) {
          throw new Error(`${JSON.stringify(metadata)} is not valid metadata`);
        }
        const day = file.replace(/\.mdx$/, "");
        posts.push({ ...metadata, slug: `/posts/${year}/${month}/${day}` });
      }
    }
  }

  posts.reverse();

  return { props: { posts } };
};

const Home: NextPage<StaticProps> = ({ posts }) => {
  return (
    <Layout>
      <Head>
        <title>blog.fuku.day</title>
        <meta name="description" content="Aumyのブログ" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="max-w-screen-lg w-full flex flex-col gap-4">
        <h2 className="text-3xl">Index</h2>
        <div>
          <PostList posts={posts} />
        </div>
      </div>
    </Layout>
  );
};

export default Home;
