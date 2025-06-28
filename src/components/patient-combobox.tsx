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
import { searchPatients } from "@/app/actions/patient-actions";
import { useEffect, useId, useState } from "react";

interface PatientComboboxProps {
  defaultValue: Patient | null;
  onSelectChange: (value: Patient | null) => void;
}

// A custom hook to debounce the search, which is a crucial performance pattern
const useDebouncedSearch = (query: string) => {
  const [result, setResult] = useState<{
    patients?: Patient[];
    error?: string;
    isLoading: boolean;
  }>({
    patients: [],
    error: undefined,
    isLoading: false,
  });

  useEffect(() => {
    if (!query) {
      setResult({ patients: [], error: undefined, isLoading: false });
      return;
    }

    setResult((prev) => ({ ...prev, isLoading: true }));

    const handler = setTimeout(() => {
      searchPatients(query).then((response) => {
        setResult({ ...response, isLoading: false });
      });
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  return result;
};

export function PatientCombobox({
  defaultValue,
  onSelectChange,
}: PatientComboboxProps) {
  const [open, setOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(defaultValue);
  const [searchQuery, setSearchQuery] = useState("");

  const { patients, error, isLoading } = useDebouncedSearch(searchQuery);
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
              {isLoading && (
                <div className="p-2 flex justify-center items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}

              {!isLoading && !error && patients?.length === 0 && (
                <CommandEmpty>No patient found.</CommandEmpty>
              )}

              {error && <p className="p-2 text-sm text-red-500">{error}</p>}

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
