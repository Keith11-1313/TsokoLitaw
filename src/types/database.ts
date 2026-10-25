import type { Database as GeneratedDatabase } from "./database.generated";

type EntityIdKey = "id" | `${string}_id` | `${string}_ids`;
type DecimalId<T> = T extends number ? string : T;
// The PostgREST fetch boundary serializes integer entity keys as decimal strings.
// Generated physical schema types remain untouched; counts/money remain numeric.
type IdFields<T> = { [Key in keyof T]: Key extends EntityIdKey ? DecimalId<T[Key]> : T[Key] };
type GeneratedPublic = GeneratedDatabase["public"];
type PublicSchema = Omit<GeneratedPublic, "Tables"> & {
  Tables: {
    [Name in keyof GeneratedPublic["Tables"]]: Omit<
      GeneratedPublic["Tables"][Name],
      "Row" | "Insert" | "Update"
    > & {
      Row: IdFields<GeneratedPublic["Tables"][Name]["Row"]>;
      Insert: IdFields<GeneratedPublic["Tables"][Name]["Insert"]>;
      Update: IdFields<GeneratedPublic["Tables"][Name]["Update"]>;
    };
  };
};
type ScalarIdFunction =
  | "upsert_catalog_addon"
  | "upsert_catalog_coating"
  | "upsert_daily_inventory"
  | "upsert_journal_post"
  | "upsert_pickup_location"
  | "upsert_pickup_schedule"
  | "submit_order_review";
type Functions = {
  [Name in keyof GeneratedPublic["Functions"]]: Omit<
    GeneratedPublic["Functions"][Name],
    "Args" | "Returns"
  > & {
    Args: IdFields<GeneratedPublic["Functions"][Name]["Args"]>;
    Returns: Name extends ScalarIdFunction
      ? string
      : GeneratedPublic["Functions"][Name]["Returns"] extends (infer Row)[]
        ? IdFields<Row>[]
        : GeneratedPublic["Functions"][Name]["Returns"];
  };
};

// PostgreSQL does not expose function-argument nullability to the generator.
// These specific arguments accept null in our migrations: null IDs create new
// records, null reward means no redemption, null search means no filter,
// and null public-review limit enables PostgREST paging without a total ceiling.
type NullableArguments = {
  upsert_catalog_coating: "target_coating_id";
  upsert_catalog_addon: "target_addon_id";
  upsert_journal_post: "target_post_id";
  upsert_pickup_schedule: "target_pickup_date_id";
  upsert_pickup_location: "target_location_id";
  create_checkout_order: "loyalty_reward_id";
  get_admin_customer_summaries: "search_value";
  cancel_admin_unpaid_order: "expired_checkout_id";
  get_public_featured_reviews: "result_limit";
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<PublicSchema, "Functions"> & {
    Functions: {
      [Name in keyof Functions]: Name extends keyof NullableArguments
        ? Omit<Functions[Name], "Args"> & {
            Args: {
              [Arg in keyof Functions[Name]["Args"]]: Arg extends NullableArguments[Name]
                ? Functions[Name]["Args"][Arg] | null
                : Functions[Name]["Args"][Arg];
            };
          }
        : Functions[Name];
    };
  };
};
