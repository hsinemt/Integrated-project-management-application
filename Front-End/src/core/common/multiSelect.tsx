import React, { useEffect, useState } from "react";
import Select from "react-select";

export type Option = {
  value: string;
  label: string;
};

export interface MultiSelectProps {
  options: Option[];
  defaultValue?: Option[];
  className?: string;
  styles?: any;
  onChange?: (selectedOptions: Option[]) => void;
  value?: Option[];
  placeholder?: string;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ 
  options, 
  defaultValue, 
  className, 
  onChange,
  value,
  placeholder = "Select options" 
}) => {
  const [selectedOptions, setSelectedOptions] = useState<Option[]>(defaultValue || []);

  useEffect(() => {
    if (value) {
      setSelectedOptions(value);
    } else if (defaultValue) {
      setSelectedOptions(defaultValue);
    }
  }, [defaultValue, value]);

  const handleChange = (options: readonly Option[] | null) => {
    const newSelectedOptions = options ? [...options] : [];
    setSelectedOptions(newSelectedOptions);
    if (onChange) {
      onChange(newSelectedOptions);
    }
  };

  return (
    <Select
      isMulti
      classNamePrefix="react-select"
      className={className}
      options={options}
      value={selectedOptions}
      onChange={handleChange}
      placeholder={placeholder}
    />
  );
};

export default MultiSelect;