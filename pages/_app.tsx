import "../styles/globals.css";
import "../styles/markdown.css";
import type { AppProps } from "next/app";

const App: React.VFC<AppProps> = ({ Component, pageProps }) => (
  <Component {...pageProps} />
);

export default App;
