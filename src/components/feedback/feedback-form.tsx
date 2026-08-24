import { RatingScale } from "@/components/feedback/rating-scale";
import { PrimaryButton } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";

export function FeedbackForm() {
  return (
    <form
      aria-label="Customer feedback"
      className="rounded-card border border-border bg-surface p-6 sm:p-8 lg:p-[2.375rem]"
    >
      <div>
        <FormField
          id="feedback-email"
          label="Your Email"
          inputProps={{
            type: "email",
            autoComplete: "email",
            placeholder: "Enter your email",
          }}
        />

        <div className="mt-[1.5625rem]">
          <RatingScale />
        </div>

        <FormField
          id="feedback-reason"
          label="Please share the reason for your rating."
          as="textarea"
          className="mt-[1.375rem]"
          controlClassName="min-h-[7.5rem]"
          textareaProps={{ placeholder: "Tell us what you think..." }}
        />

        <PrimaryButton
          className="mt-[1.1875rem] min-h-[3.4375rem] w-full rounded-control! text-base"
          type="button"
        >
          Submit Feedback
        </PrimaryButton>
      </div>
      <p className="sr-only">
        This preview form uses mock data and does not submit feedback yet.
      </p>
    </form>
  );
}
