import Link from "next/link";
import { VFC } from "react";
import { Post } from "../types/post";

export const PostLink: VFC<{
  post: Pick<Post, "title" | "description" | "slug">;
}> = ({ post }) => {
  return (
    <div>
      <h3 className="text-xl font-bold ">
        <Link href={post.slug}>
          <a className="hover:underline text-pink-400">{post.title}</a>
        </Link>
      </h3>
      <div className="ml-4">&mdash;{post.description}</div>
    </div>
  );
};
