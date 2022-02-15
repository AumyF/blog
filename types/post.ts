import Ajv, { JTDDataType } from "ajv/dist/jtd";

const ajv = new Ajv();

const metadataSchema = {
  properties: {
    title: { type: "string" },
    description: { type: "string" },
  },
} as const;

export type Metadata = JTDDataType<typeof metadataSchema>;

export const validateMetadata = ajv.compile(metadataSchema);

export type Post = Metadata & {
  slug: string;
};
