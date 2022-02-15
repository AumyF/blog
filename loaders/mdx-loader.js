module.exports = /**
  @type {import("webpack").LoaderDefinitionFunction}
  @param {import('webpack').LoaderContext} this
*/ function (src) {
  const code = `import { BlogLayout } from "../../../../components/BlogLayout";


${src}

export default ({ children }) => <BlogLayout metadata={metadata}>{children}</BlogLayout>;
`;

  return code;
};
