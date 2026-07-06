import React, { useState, KeyboardEvent, ClipboardEvent } from "react";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export default function TagInput({ tags, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  const addTags = (newTagsStr: string) => {
    // Tách bằng dấu phẩy, chấm phẩy hoặc khoảng trắng
    const splitTags = newTagsStr
      .split(/[\s,;]+/)
      .map((t) => t.trim())
      .filter((t) => t.length > 0 && !tags.includes(t));

    if (splitTags.length > 0) {
      onChange([...tags, ...splitTags]);
    }
    setInputValue("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTags(inputValue);
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text");
    addTags(pastedText);
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 p-1.5 w-full border border-border rounded-lg bg-background min-h-[38px] focus-within:border-primary transition-colors">
      {tags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md text-xs bg-muted text-card-foreground border border-border"
        >
          {tag}
          <button
            type="button"
            onClick={() => removeTag(index)}
            className="hover:bg-muted-foreground/10 rounded-full p-0.5 transition-colors cursor-pointer"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={tags.length === 0 ? placeholder : ""}
        className="flex-1 bg-transparent px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground outline-none border-none min-w-[120px]"
      />
    </div>
  );
}
