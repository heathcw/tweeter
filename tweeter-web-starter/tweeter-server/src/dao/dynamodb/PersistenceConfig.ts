// AI-assisted: see AI-ATTRIBUTION.md

export const awsRegion =
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-2";

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable ${name}`);
  }
  return value;
}

/**
 * Getters defer validation until a DAO is used. This allows unit tests to
 * import service modules before configuring their in-memory dependencies.
 */
export const tableNames = {
  get users(): string {
    return requireEnvironmentVariable("USERS_TABLE_NAME");
  },
  get authTokens(): string {
    return requireEnvironmentVariable("AUTH_TOKENS_TABLE_NAME");
  },
  get follows(): string {
    return requireEnvironmentVariable("FOLLOWS_TABLE_NAME");
  },
  get stories(): string {
    return requireEnvironmentVariable("STORIES_TABLE_NAME");
  },
  get feeds(): string {
    return requireEnvironmentVariable("FEEDS_TABLE_NAME");
  },
};

export const followeeIndexName =
  process.env.FOLLOWEE_INDEX_NAME ?? "followee-index";
