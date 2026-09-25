"use client";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useId, useState } from "react";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePatientSearch } from "@/client/patients/queries";
import type { PatientSummaryDto } from "@/server/patients/dto";

interface PatientComboboxProps {
  defaultValue: PatientSummaryDto | null;
  onSelectChange: (value: PatientSummaryDto | null) => void;
}

export function PatientCombobox({
  defaultValue,
  onSelectChange,
}: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(defaultValue);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedQuery = useDebouncedValue(searchQuery.trim());

  const { isFetching, isError, error, data: patients } =
    usePatientSearch(debouncedQuery);
  const isSearching = debouncedQuery.length > 0;
  const triggerId = useId();

  return (
    <div className="grid w-full gap-3">
      <Label htmlFor={triggerId}>
        Patient<span className="text-red-500">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={triggerId}
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[250px] justify-between"
            onClick={() => selectedPatient && onSelectChange(selectedPatient)}
          >
            {selectedPatient ? selectedPatient.email : "Select a patient..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-[250px] p-0">
          <Command shouldFilter={false}>
            {" "}
            <CommandInput
              placeholder="Search patient..."
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {isFetching && (
                <div className="p-2 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {isError && (
                <p className="p-2 text-sm text-red-500">
                  {error instanceof Error
                    ? error.message
                    : "Failed to search patients"}
                </p>
              )}

              {!isFetching && isSearching && !patients?.length && (
                <CommandEmpty>No patient found.</CommandEmpty>
              )}

              <CommandGroup>
                {patients?.map((patient) => (
                  <CommandItem
                    key={patient.id}
                    value={patient.id}
                    onSelect={() => {
                      setSelectedPatient(patient);
                      onSelectChange(patient);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedPatient?.id === patient.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {patient.firstName} {patient.middleName}{" "}
                        {patient.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {patient.email}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
