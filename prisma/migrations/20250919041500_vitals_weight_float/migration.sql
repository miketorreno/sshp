-- A weight is routinely fractional (70.5 kg). An integer column would round it on
-- write, so the stored reading would not be the reading the clinician recorded.
ALTER TABLE "Vitals" ALTER COLUMN "weight" TYPE DOUBLE PRECISION;