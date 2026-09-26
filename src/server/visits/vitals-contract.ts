import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";

/**
 * The failures the vitals surface reports, alongside the visit failures a vitals
 * write inherits: a vitals record is only ever written inside a visit, so an
 * unusable visit is a vitals failure too.
 */

export const VITALS_VISIT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Vitals are recorded against a visit that is still active.",
};

export const VITALS_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Vitals record not found for this visit.",
};
