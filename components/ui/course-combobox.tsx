"use client";
import { Check, ChevronDown, X } from "lucide-react";
import type * as React from "react";
import { useEffect, useId, useRef, useState } from "react";
import { controlClass } from "@/components/ui/field";
import { cn } from "@/lib/utils";

export type CourseOption = {
  id: string;
  title: string;
  publication?: "draft" | "published" | "archived";
};

/** Maps a course template document to a combobox option. */
export function courseOption(course: {
  _id: string;
  title: string;
  publication: CourseOption["publication"];
}): CourseOption {
  return {
    id: course._id,
    title: course.title,
    publication: course.publication,
  };
}

const NON_ALPHANUMERIC = /[^a-z0-9]/g;
const WHITESPACE = /\s+/;
const MOVES: Record<string, (active: number, last: number) => number> = {
  ArrowDown: (active, last) => (active >= last ? 0 : active + 1),
  ArrowUp: (active, last) => (active <= 0 ? last : active - 1),
  Home: () => 0,
  End: (_active, last) => last,
};

function normalize(text: string) {
  return text.normalize("NFKD").toLowerCase().replace(NON_ALPHANUMERIC, "");
}

function matches(title: string, query: string) {
  const haystack = normalize(title);
  return query
    .split(WHITESPACE)
    .map(normalize)
    .every((word) => haystack.includes(word));
}

/**
 * Searchable single-course picker following the WAI-ARIA combobox pattern.
 * Archived courses stay hidden unless one is already selected.
 */
export function CourseCombobox({
  courses,
  value,
  onChange,
  placeholder = "Search courses",
  clearable = false,
  showArchived = false,
  disabled,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  courses: CourseOption[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  clearable?: boolean;
  showArchived?: boolean;
} & Pick<
  React.ComponentProps<"input">,
  "disabled" | "id" | "aria-describedby" | "aria-invalid"
>) {
  const generated = useId();
  const inputId = id ?? generated;
  const listId = `${inputId}-listbox`;
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState<string | null>(null);
  const [active, setActive] = useState(-1);

  const selected = courses.find((course) => course.id === value);
  const visible = courses
    .filter(
      (course) =>
        showArchived || course.publication !== "archived" || course.id === value
    )
    .filter((course) => !query?.trim() || matches(course.title, query));
  const activeCourse = open ? visible[active] : undefined;
  const optionId = (course: CourseOption) => `${listId}-${course.id}`;

  const activeId = activeCourse ? optionId(activeCourse) : undefined;

  useEffect(() => {
    if (activeId) {
      document.getElementById(activeId)?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeId]);

  const show = (index: number) => {
    setOpen(true);
    setActive(index);
  };
  const close = () => {
    setOpen(false);
    setQuery(null);
    setActive(-1);
  };
  const choose = (course: CourseOption) => {
    onChange(course.id);
    close();
  };
  const selectedIndex = () =>
    Math.max(
      0,
      visible.findIndex((course) => course.id === value)
    );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const move = MOVES[event.key];
    if (move) {
      if (!(open || event.key.startsWith("Arrow"))) {
        return;
      }
      event.preventDefault();
      show(
        open && !event.altKey
          ? move(active, visible.length - 1)
          : selectedIndex()
      );
      return;
    }
    if (event.key === "Enter" && open) {
      event.preventDefault();
      if (activeCourse) {
        choose(activeCourse);
      }
    }
    if (event.key === "Escape" && (open || query !== null)) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <div className="relative">
      <input
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-describedby={describedBy}
        aria-expanded={open}
        aria-invalid={invalid}
        autoComplete="off"
        className={cn(
          controlClass,
          "truncate",
          clearable && value ? "pr-16" : "pr-9"
        )}
        disabled={disabled}
        id={inputId}
        onBlur={close}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
          setActive(0);
          listRef.current?.scrollTo?.({ top: 0 });
        }}
        onClick={() => {
          if (!open) {
            show(selectedIndex());
          }
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        spellCheck={false}
        type="text"
        value={query ?? selected?.title ?? ""}
      />
      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-0.5 pr-2">
        {clearable && value && !disabled ? (
          <button
            aria-label="Clear course"
            className="pointer-events-auto inline-flex h-7 pointer-coarse:h-9 pointer-coarse:w-9 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary/30"
            onClick={() => {
              onChange("");
              close();
              inputRef.current?.focus();
            }}
            type="button"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        ) : null}
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "h-4 w-4 text-slate-400 transition-transform duration-150 ease-out",
            open && "rotate-180"
          )}
        />
      </span>
      <div
        className={cn(
          "absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg",
          !open && "hidden"
        )}
      >
        <div
          aria-label="Courses"
          className="max-h-64 overflow-y-auto p-1 empty:hidden"
          id={listId}
          onMouseDown={(event) => event.preventDefault()}
          ref={listRef}
          role="listbox"
        >
          {visible.map((course, index) => {
            const isSelected = course.id === value;
            return (
              // biome-ignore lint/a11y/useKeyWithClickEvents: the combobox input handles keyboard selection through aria-activedescendant
              <div
                aria-selected={isSelected}
                className={cn(
                  "flex min-h-9 pointer-coarse:min-h-11 cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-slate-900 text-sm",
                  index === active && "bg-slate-100"
                )}
                id={optionId(course)}
                key={course.id}
                onClick={() => choose(course)}
                onMouseMove={() => setActive(index)}
                role="option"
                tabIndex={-1}
              >
                <Check
                  aria-hidden="true"
                  className={cn(
                    "h-4 w-4 shrink-0 text-primary",
                    !isSelected && "invisible"
                  )}
                />
                <span className="min-w-0 flex-1 truncate">{course.title}</span>
                {course.publication && course.publication !== "published" ? (
                  <span className="shrink-0 rounded-sm bg-slate-100 px-1.5 py-0.5 text-slate-600 text-xs capitalize">
                    {course.publication}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
        {visible.length ? null : (
          <p className="px-3 py-2 text-slate-500 text-sm">
            {query?.trim()
              ? `No courses match “${query.trim()}”.`
              : "No courses available."}
          </p>
        )}
      </div>
      <span aria-live="polite" className="sr-only">
        {open && query?.trim()
          ? `${visible.length} ${visible.length === 1 ? "course" : "courses"} found`
          : ""}
      </span>
    </div>
  );
}
