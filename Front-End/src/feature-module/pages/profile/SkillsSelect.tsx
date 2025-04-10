import React from "react";

interface SkillsSelectProps {
  selectedSkills: string[];
  onChange: (selected: string[]) => void;
}

const SkillsSelect: React.FC<SkillsSelectProps> = ({ selectedSkills, onChange }) => {
  const availableSkills = [
    "Frontend Development",
    "Backend Development",
    "Machine Learning",
    "Data Analysis",
  ];

  const handleSkillChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValues = Array.from(e.target.selectedOptions, (option) => option.value);
    onChange(selectedValues);
  };

  return (
    <select
      multiple={true}
      value={selectedSkills}
      onChange={handleSkillChange}
      className="form-control"
      style={{ height: "auto" }}
    >
      {availableSkills.map((skill) => (
        <option key={skill} value={skill}>
          {skill}
        </option>
      ))}
    </select>
  );
};

export default SkillsSelect;