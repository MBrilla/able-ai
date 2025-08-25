"use client";

import React, { useState, useEffect } from 'react';
import { Copy, Share2, Check } from 'lucide-react';
import { getOrCreateRecommendationCode } from '@/actions/user/recommendations';

interface RecommendationLinkGeneratorProps {
  workerUserId: string;
  workerName: string;
}

export default function RecommendationLinkGenerator({ workerUserId, workerName }: RecommendationLinkGeneratorProps) {
  const [recommendationCode, setRecommendationCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRecommendationCode = async () => {
      try {
        setIsLoading(true);
        const result = await getOrCreateRecommendationCode(workerUserId);
        
        if (result.success && result.data) {
          setRecommendationCode(result.data);
        } else {
          setError(result.error || "Failed to load recommendation code");
        }
      } catch (err) {
        setError("Error loading recommendation code");
      } finally {
        setIsLoading(false);
      }
    };

    loadRecommendationCode();
  }, [workerUserId]);

  const getRecommendationUrl = (code: string) => {
    // Use the public recommendation route
    return `${window.location.origin}/worker/recommendation/${code}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const shareRecommendation = async () => {
    if (!recommendationCode) return;

    const url = getRecommendationUrl(recommendationCode);
    const text = `I'd love for you to write me a recommendation on Able! Here's my recommendation link: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Recommendation for ${workerName}`,
          text,
          url,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback to copying the link
      copyToClipboard(url);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-200 rounded-lg bg-red-50">
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!recommendationCode) {
    return null;
  }

  const recommendationUrl = getRecommendationUrl(recommendationCode);

  return (
    <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
      <h3 className="font-medium text-blue-900 mb-3">
        Get Recommendations
      </h3>
      
      <p className="text-sm text-blue-700 mb-3">
        Share this link with people who can recommend your work. They'll be able to write a recommendation that will be added to your profile.
      </p>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={recommendationUrl}
            readOnly
            className="flex-1 px-3 py-2 text-sm border rounded-md bg-white"
          />
          <button
            onClick={() => copyToClipboard(recommendationUrl)}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center space-x-1"
          >
            {isCopied ? (
              <>
                <Check size={16} />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        <div className="flex space-x-2">
          <button
            onClick={shareRecommendation}
            className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Share2 size={16} />
            <span>Share Recommendation Link</span>
          </button>
        </div>
      </div>

      <div className="mt-3 text-xs text-blue-600">
        <p>• Your recommendation code: <strong>{recommendationCode}</strong></p>
        <p>• Recommendations will be reviewed before appearing on your profile</p>
      </div>
    </div>
  );
}
