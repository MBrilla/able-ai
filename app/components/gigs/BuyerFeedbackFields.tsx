import React from "react";
import { Send } from "lucide-react";
import { BuyerFeedbackFormData, GigDetails } from "./Feedback";

type BuyerFeedbackFieldsProps = {
  gigDetails: GigDetails;
  formData: BuyerFeedbackFormData;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  submitting?: boolean;
};

const BuyerFeedbackFields: React.FC<BuyerFeedbackFieldsProps> = ({
  gigDetails,
  formData,
  onChange,
  submitting,
}) => (
  <>
    <div className="mb-4">
      <label htmlFor="publicComment" className="block font-medium mb-1">
        Public Comment (visible on {gigDetails.workerName.split(" ")[0]}&apos;s profile):
      </label>
      <textarea
        id="publicComment"
        name="publicComment"
        className="w-full border rounded p-2 min-h-[80px]"
        placeholder="e.g., Punctual, professional, great skills..."
        value={formData.publicComment}
        onChange={onChange}
        aria-label="Public comment"
      />
    </div>
    <div className="mb-4">
      <label htmlFor="privateNotes" className="block font-medium mb-1">
        Private Notes for Able AI (optional):
      </label>
      <textarea
        id="privateNotes"
        name="privateNotes"
        className="w-full border rounded p-2 min-h-[60px]"
        placeholder="Any internal notes about this worker or gig?"
        value={formData.privateNotes}
        onChange={onChange}
        aria-label="Private notes"
      />
    </div>
    <div className="mb-4">
      <label className="block font-medium mb-1">
        Would you hire {gigDetails.workerName.split(" ")[0]} again? <span className="text-primary">*</span>
      </label>
      <div className="flex gap-4">
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="wouldHireAgain"
            value="yes"
            checked={formData.wouldHireAgain === "yes"}
            onChange={onChange}
            aria-label="Would hire again: Yes"
          />
          Yes
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="wouldHireAgain"
            value="maybe"
            checked={formData.wouldHireAgain === "maybe"}
            onChange={onChange}
            aria-label="Would hire again: Maybe"
          />
          Maybe
        </label>
        <label className="flex items-center gap-1 cursor-pointer">
          <input
            type="radio"
            name="wouldHireAgain"
            value="no"
            checked={formData.wouldHireAgain === "no"}
            onChange={onChange}
            aria-label="Would hire again: No"
          />
          No
        </label>
      </div>
    </div>
    <div className="flex justify-end gap-2 mt-6">
      <button
        type="submit"
        className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        disabled={submitting}
        aria-label="Submit feedback"
      >
        <Send size={16} /> Submit Feedback
      </button>
    </div>
  </>
);

export default BuyerFeedbackFields; 