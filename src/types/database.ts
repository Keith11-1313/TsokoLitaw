import type { Database as GeneratedDatabase } from "./database.generated";

type Functions = GeneratedDatabase["public"]["Functions"];

// PostgreSQL does not expose function-argument nullability to the generator.
// These specific arguments accept null in our migrations: null IDs create new
// records, null reward means no redemption, and null search means no filter.
type NullableArguments = {
  upsert_catalog_coating: "target_coating_id";
  upsert_catalog_addon: "target_addon_id";
  upsert_journal_post: "target_post_id";
  upsert_pickup_schedule: "target_pickup_date_id";
  upsert_pickup_location: "target_location_id";
  create_checkout_order: "loyalty_reward_id";
  get_admin_customer_summaries: "search_value";
};

export type Database = Omit<GeneratedDatabase, "public"> & {
  public: Omit<GeneratedDatabase["public"], "Functions"> & {
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
