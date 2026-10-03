/**
 * Runs something in a named clinic time zone.
 *
 * The clinic's zone is deployment configuration, so a test that pins a window, a
 * formatted moment, or a parsed wall clock has to pin the zone too — otherwise
 * it would pass on a machine set to UTC and fail on one set to anything else.
 */

export async function withClinicTimeZone<T>(
  zone: string,
  run: () => T | Promise<T>,
): Promise<T> {
  const before = process.env.CLINIC_TIME_ZONE;

  process.env.CLINIC_TIME_ZONE = zone;

  try {
    return await run();
  } finally {
    if (before === undefined) delete process.env.CLINIC_TIME_ZONE;
    else process.env.CLINIC_TIME_ZONE = before;
  }
}