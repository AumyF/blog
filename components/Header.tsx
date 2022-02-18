import Link from "next/link";
import { VFC } from "react";

export const Header: VFC = () => (
  <header className="border-b border-zinc-600 flex justify-center">
    <div className="max-w-screen-lg w-full pt-1 pb-2">
      <h1 className="text-3xl font-bold">
        <Link href="/">blog.fuku.day</Link>
      </h1>
    </div>
  </header>
);
