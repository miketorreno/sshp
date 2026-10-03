/**
 * The app's runtime configuration, read at the moment something needs it.
 *
 * `next build` imports every server module to collect page data, so a value read
 * at module scope is a value the builder demands. That is what made the build
 * reach for a database and an auth secret it was never given, and it is why these
 * values are behind a function rather than read at the top of a module: the build
 * never calls it, and the first request to need a value is the first time the
 * environment is asked for one.
 *
 * Requiring a value here is not a new rule. Prisma and Better Auth both refuse to
 * work without their own; this only names the variable before they do, so the
 * failure says what to set instead of a library diagnostic.
 */

/**
 * The variables the app insists on before it will serve a request. Exported as
 * the list rather than only the type so the set has one home: a variable added
 * here is a variable the tests have to isolate.
 */
export const RUNTIME_VARIABLES = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "AUTH_SECRET",
] as const;

export type RuntimeVariable = (typeof RUNTIME_VARIABLES)[number];

export class MissingRuntimeConfigError extends Error {
  readonly variables: RuntimeVariable[];

  constructor(variables: RuntimeVariable[]) {
    super(
      `${names(variables)} must be set to serve a request. It is a runtime ` +
        `value, so the build does not need it: set it wherever the app runs ` +
        `(see README, Environment Variables).`
    );
    this.name = "MissingRuntimeConfigError";
    this.variables = variables;
  }
}

/**
 * The first of the given variables that carries a value, or the failure that
 * names all of them. Later names are fallbacks the libraries already accept, so
 * an app configured the older way keeps working.
 */
export function requireRuntimeEnv(
  ...variables: [RuntimeVariable, ...RuntimeVariable[]]
): string {
  for (const variable of variables) {
    const value = process.env[variable]?.trim();

    if (value) return value;
  }

  throw new MissingRuntimeConfigError(variables);
}

function names(variables: RuntimeVariable[]): string {
  return variables.length > 1
    ? `${variables.slice(0, -1).join(", ")} or ${variables.at(-1)}`
    : variables[0];
}
