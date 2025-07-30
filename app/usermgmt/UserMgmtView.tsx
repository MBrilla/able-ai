import React from "react";

export type UserMgmtViewProps = {
  isLoading: boolean;
  uiState: "initial" | "inputPassword" | "success" | "error";
  message: string;
  error: string | null;
  newPassword: string;
  onPasswordChange: (value: string) => void;
  onSubmitNewPassword: () => void;
  onGoHome: () => void;
  isSubmitDisabled: boolean;
};

const UserMgmtView: React.FC<UserMgmtViewProps> = ({
  isLoading,
  uiState,
  message,
  error,
  newPassword,
  onPasswordChange,
  onSubmitNewPassword,
  onGoHome,
  isSubmitDisabled,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white shadow-lg rounded-lg p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Account Management</h1>
        {isLoading && (
          <p className="text-gray-500 mb-4">Loading... {message}</p>
        )}
        {!isLoading && uiState === "initial" && message && (
          <p className="text-gray-700 mb-4">{message}</p>
        )}
        {uiState === "inputPassword" && (
          <div>
            <p className="text-gray-700 mb-4">{message}</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => onPasswordChange(e.target.value)}
              placeholder="Enter new password"
              className="w-full px-4 py-2 border rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Enter new password"
              tabIndex={0}
            />
            <button
              onClick={onSubmitNewPassword}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              disabled={isSubmitDisabled}
              aria-label="Save New Password"
              tabIndex={0}
            >
              {isLoading ? "Saving..." : "Save New Password"}
            </button>
          </div>
        )}
        {uiState === "success" && (
          <p
            className="text-green-600 mb-4"
            dangerouslySetInnerHTML={{ __html: message }}
          ></p>
        )}
        {uiState === "error" && error && (
          <p className="text-red-600 mb-4">Error: {error}</p>
        )}
        {!isLoading && (uiState === "success" || uiState === "error") && (
          <button
            onClick={onGoHome}
            className="w-full bg-gray-200 text-gray-800 py-2 rounded hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 mt-2"
            aria-label="Go to Homepage"
            tabIndex={0}
          >
            Go to Homepage
          </button>
        )}
      </div>
    </div>
  );
};

export default UserMgmtView; 