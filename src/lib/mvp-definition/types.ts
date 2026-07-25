import type { mvpDefinitionSchema } from "./schema";

type SchemaProperties = Record<string, unknown>;

type RequiredKeys<
  Schema,
  Properties extends SchemaProperties,
> = Schema extends { required: readonly (infer Key)[] }
  ? Extract<Key, keyof Properties>
  : never;

type ObjectFromSchema<
  Schema,
  Properties extends SchemaProperties,
> = {
  [Key in RequiredKeys<Schema, Properties>]: JsonSchemaToType<
    Properties[Key]
  >;
} & {
  [Key in Exclude<
    keyof Properties,
    RequiredKeys<Schema, Properties>
  >]?: JsonSchemaToType<Properties[Key]>;
};

export type JsonSchemaToType<Schema> =
  Schema extends { enum: readonly (infer Value)[] }
    ? Value
    : Schema extends { type: "string" }
      ? string
      : Schema extends { type: "integer" | "number" }
        ? number
        : Schema extends { type: "boolean" }
          ? boolean
          : Schema extends { type: "array"; items: infer Item }
            ? JsonSchemaToType<Item>[]
            : Schema extends {
                  type: "object";
                  properties: infer Properties extends SchemaProperties;
                }
              ? ObjectFromSchema<Schema, Properties>
              : never;

export type MvpDefinition = JsonSchemaToType<typeof mvpDefinitionSchema>;
