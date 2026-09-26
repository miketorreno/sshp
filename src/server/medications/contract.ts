/**
 * The internal browser contract for the medication catalogue: where its read
 * route lives.
 *
 * The catalogue exists so a medication request can name a medication the pharmacy
 * holds, rather than free text nobody can look up later. It is read-only from the
 * browser: a medication order is a visit's record, and the visit's reads are what
 * it changes.
 */

export const medicationApiPaths = {
  list: () => "/api/medications",
};
