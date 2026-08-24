const ratingOptions = [
  { value: "1", emoji: "😢", label: "Very dissatisfied" },
  { value: "2", emoji: "☹️", label: "Dissatisfied" },
  { value: "3", emoji: "😐", label: "Neutral" },
  { value: "4", emoji: "🙂", label: "Satisfied" },
  { value: "5", emoji: "😀", label: "Very satisfied" },
] as const;

export function RatingScale() {
  return (
    <fieldset>
      <legend className="text-sm font-bold text-foreground">
        How would you rate our service overall?
      </legend>
      <div className="mt-3 flex flex-wrap gap-2 sm:gap-3">
        {ratingOptions.map((option) => (
          <label key={option.value} className="relative cursor-pointer">
            <input
              className="peer sr-only"
              type="radio"
              name="service-rating"
              value={option.value}
            />
            <span className="flex size-12 items-center justify-center rounded-control bg-surface-control text-xl transition-colors peer-checked:bg-surface-muted peer-checked:ring-2 peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-focus peer-focus-visible:ring-offset-2 sm:size-16 sm:text-2xl">
              <span aria-hidden="true">{option.emoji}</span>
              <span className="sr-only">{option.label}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
