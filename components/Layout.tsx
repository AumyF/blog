import { PropsWithChildren, VFC } from "react";
import { Header } from "./Header";

export const Layout: VFC<PropsWithChildren<{}>> = ({ children }) => (
  <div className="min-h-screen bg-zinc-900 text-zinc-300 flex flex-col gap-4 px-4">
    <Header />
    <div className="flex justify-center">
      <main className="max-w-screen-lg w-full">{children}</main>
    </div>
    <footer className="flex  justify-center">
      <div className="max-w-screen-lg w-full border-t border-zinc-600 py-4 text-right">
        <div>&copy; 2022 Aumy</div>
        <div>Posts are licensed under CC BY-SA 4.0</div>
      </div>
    </footer>
  </div>
);
