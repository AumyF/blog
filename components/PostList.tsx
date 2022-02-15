import { ComponentProps, VFC } from "react";
import { PostLink } from "./PostLink";

export const PostList: VFC<{
  readonly posts: readonly ComponentProps<typeof PostLink>["post"][];
}> = ({ posts }) => {
  return (
    <div>
      {posts.map((post) => (
        <PostLink key={post.title} post={post} />
      ))}
    </div>
  );
};
