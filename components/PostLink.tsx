import Link from "next/link";
import { VFC } from "react";
import { Post } from "../types/post";

export const PostLink: VFC<{
  post: Pick<Post, "title" | "description" | "slug">;
}> = ({ post }) => {
  return (
    <div>
      <h3 className="text-xl font-bold hover:underline">
        <Link href={post.slug}>
          <a>{post.title}</a>
        </Link>
      </h3>
      <div className="ml-4">&mdash;{post.description}</div>
    </div>
  );
};
