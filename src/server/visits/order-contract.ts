import { FAILURE_CODES, type ActionFailure } from "@/lib/action-result";

/**
 * The failures the order surface reports, alongside the visit failures an order
 * inherits: an order is only ever written inside a visit, so a visit that cannot
 * be written to is an order failure too.
 */

export const ORDER_VISIT_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Orders are requested against a visit that is still active.",
};

export const LAB_ORDER_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Lab order not found for this visit.",
};

export const IMAGING_ORDER_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Imaging order not found for this visit.",
};

export const MEDICATION_ORDER_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Medication order not found for this visit.",
};

/** A medication request names a medication the pharmacy's catalogue holds. */
export const ORDER_MEDICATION_NOT_FOUND: ActionFailure = {
  code: FAILURE_CODES.NOT_FOUND,
  message: "Choose a medication from the pharmacy's catalogue.",
};
