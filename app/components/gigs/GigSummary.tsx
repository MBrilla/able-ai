import React from "react";
import { GigDetails } from "./Feedback";

type GigSummaryProps = {
  gigDetails: GigDetails;
};

const GigSummary: React.FC<GigSummaryProps> = ({ gigDetails }) => (
  <div className="bg-white rounded-lg shadow p-4 mb-6">
    <h2 className="text-lg font-semibold mb-2">Gig Summary</h2>
    <div className="mb-2">
      <p>
        <strong>{gigDetails?.role}</strong>
      </p>
      {gigDetails?.duration && <p className="text-sm text-gray-500">Duration: {gigDetails.duration}</p>}
      {gigDetails?.details && <p className="text-sm">{gigDetails.details}</p>}
    </div>
    {gigDetails?.earnings !== undefined && (
      <div className="flex justify-between items-center bg-gray-100 rounded px-3 py-2 mt-2">
        <span className="font-medium">Earnings:</span>
        <span className="font-bold">£{gigDetails.earnings.toFixed(2)}</span>
      </div>
    )}
  </div>
);

export default GigSummary; 