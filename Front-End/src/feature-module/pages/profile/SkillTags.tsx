import React, { useState } from "react";
import { Chip, TextField, Box } from "@mui/material";

interface SkillTagsProps {
  selectedSkills: string[];
  onChange: (skills: string[]) => void;
}

const SkillTags: React.FC<SkillTagsProps> = ({ selectedSkills, onChange }) => {
  const [inputValue, setInputValue] = useState("");

  // Add a new skill
  const handleAddSkill = (skill: string) => {
    if (skill.trim() && !selectedSkills.includes(skill)) {
      onChange([...selectedSkills, skill.trim()]);
      setInputValue("");
    }
  };

  // Remove a skill
  const handleRemoveSkill = (skillToRemove: string) => {
    onChange(selectedSkills.filter((skill) => skill !== skillToRemove));
  };

  // Handle input key press
  const handleInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      handleAddSkill(inputValue);
    }
  };

  return (
    <Box>
      <TextField
        fullWidth
        variant="outlined"
        label="Add Skills"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyPress={handleInputKeyPress}
        placeholder="Type a skill and press Enter"
      />
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 2 }}>
        {selectedSkills.map((skill) => (
          <Chip
            key={skill}
            label={skill}
            onDelete={() => handleRemoveSkill(skill)}
            sx={{ margin: "4px" }}
          />
        ))}
      </Box>
    </Box>
  );
};

export default SkillTags;