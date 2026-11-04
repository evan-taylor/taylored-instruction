const REQUIRED_MARK = /\s*(\*|\(required\))\s*$/;

/** Names every control that blocks submit, prefixed by its `data-field-group`. */
export function invalidFieldLabels(form: HTMLFormElement) {
  const labels: string[] = [];
  for (const element of Array.from(form.elements)) {
    if (
      (element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement) &&
      element.willValidate &&
      !element.validity.valid
    ) {
      const label =
        element.labels?.[0]?.textContent?.replace(REQUIRED_MARK, "").trim() ||
        "Required field";
      const group =
        element.closest<HTMLElement>("[data-field-group]")?.dataset.fieldGroup;
      labels.push(group ? `${group}: ${label}` : label);
    }
  }
  return labels;
}
