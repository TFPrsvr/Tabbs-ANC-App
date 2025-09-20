'use client';

import React, { useState, useCallback } from 'react';
import {
  AISuggestion,
  SuggestionType,
  SuggestionCategory,
  SuggestionFeedback
} from '@/lib/audio/ai-system';

export interface SmartSuggestionsPanelProps {
  suggestions: AISuggestion[];
  appliedSuggestions: string[];
  onApplySuggestion: (suggestionId: string) => Promise<void>;
  onDismissSuggestion: (suggestionId: string) => void;
  onProvideFeedback: (suggestionId: string, feedback: SuggestionFeedback) => void;
  isApplying: boolean;
}

const SUGGESTION_TYPE_ICONS: Record<SuggestionType, string> = {
  'eq-suggestion': '🎛️',
  'compression-suggestion': '🗜️',
  'reverb-suggestion': '🌊',
  'stereo-suggestion': '🔊',
  'level-suggestion': '📊',
  'automation-suggestion': '🤖',
  'arrangement-suggestion': '🎵',
  'mastering-suggestion': '✨',
  'creative-suggestion': '💡'
};

const CATEGORY_COLORS: Record<SuggestionCategory, string> = {
  'technical-improvement': 'bg-blue-100 text-blue-800',
  'creative-enhancement': 'bg-purple-100 text-purple-800',
  'mix-balance': 'bg-green-100 text-green-800',
  'mastering-prep': 'bg-yellow-100 text-yellow-800',
  'genre-specific': 'bg-pink-100 text-pink-800',
  'mood-enhancement': 'bg-indigo-100 text-indigo-800',
  'performance-optimization': 'bg-gray-100 text-gray-800'
};

const IMPACT_COLORS = {
  low: 'text-gray-600',
  medium: 'text-yellow-600',
  high: 'text-red-600'
};

export function SmartSuggestionsPanel({
  suggestions,
  appliedSuggestions,
  onApplySuggestion,
  onDismissSuggestion,
  onProvideFeedback,
  isApplying
}: SmartSuggestionsPanelProps) {
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<SuggestionCategory | 'all'>('all');
  const [sortBy, setSortBy] = useState<'confidence' | 'impact' | 'newest'>('confidence');
  const [showFeedbackModal, setShowFeedbackModal] = useState<string | null>(null);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  const filteredSuggestions = suggestions.filter(suggestion => {
    if (filterCategory === 'all') return true;
    return suggestion.category === filterCategory;
  });

  const sortedSuggestions = [...filteredSuggestions].sort((a, b) => {
    switch (sortBy) {
      case 'confidence':
        return b.confidence - a.confidence;
      case 'impact':
        const impactOrder = { high: 3, medium: 2, low: 1 };
        return impactOrder[b.impact] - impactOrder[a.impact];
      case 'newest':
        return b.id.localeCompare(a.id);
      default:
        return 0;
    }
  });

  const handleApplySuggestion = useCallback(async (suggestionId: string) => {
    await onApplySuggestion(suggestionId);
  }, [onApplySuggestion]);

  const handleProvideFeedback = useCallback((suggestionId: string, accepted: boolean) => {
    const feedback: SuggestionFeedback = {
      suggestionId,
      accepted,
      rating: feedbackRating,
      feedback: feedbackText,
      timestamp: new Date()
    };
    onProvideFeedback(suggestionId, feedback);
    setShowFeedbackModal(null);
    setFeedbackRating(5);
    setFeedbackText('');
  }, [feedbackRating, feedbackText, onProvideFeedback]);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600';
    if (confidence >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    return 'Low';
  };

  const categories = Array.from(new Set(suggestions.map(s => s.category))) as SuggestionCategory[];

  return (
    <div className="bg-white rounded-lg shadow-lg">
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Smart Suggestions</h2>
          <p className="text-gray-600">AI-powered recommendations for your audio</p>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            {suggestions.length} suggestion{suggestions.length !== 1 ? 's' : ''}
          </span>
          {appliedSuggestions.length > 0 && (
            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
              {appliedSuggestions.length} applied
            </span>
          )}
        </div>
      </div>

      {/* Filters and Sorting */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="confidence">Confidence</option>
              <option value="impact">Impact</option>
              <option value="newest">Newest</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {sortedSuggestions.length > 0 ? (
          <div className="space-y-4">
            {sortedSuggestions.map((suggestion) => {
              const isApplied = appliedSuggestions.includes(suggestion.id);
              const isExpanded = expandedSuggestion === suggestion.id;

              return (
                <div
                  key={suggestion.id}
                  className={`border rounded-lg transition-all ${
                    isApplied ? 'border-green-300 bg-green-50' : 'border-gray-200'
                  }`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedSuggestion(isExpanded ? null : suggestion.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <div className="text-2xl">
                          {SUGGESTION_TYPE_ICONS[suggestion.type]}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <h3 className="font-medium text-gray-900">{suggestion.title}</h3>
                            {isApplied && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Applied
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-2">{suggestion.description}</p>

                          <div className="flex items-center space-x-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${CATEGORY_COLORS[suggestion.category]}`}>
                              {suggestion.category.replace(/-/g, ' ')}
                            </span>

                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500">Confidence:</span>
                              <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                                {getConfidenceLabel(suggestion.confidence)}
                              </span>
                            </div>

                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-gray-500">Impact:</span>
                              <span className={`text-xs font-medium capitalize ${IMPACT_COLORS[suggestion.impact]}`}>
                                {suggestion.impact}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {!isApplied && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApplySuggestion(suggestion.id);
                            }}
                            disabled={isApplying}
                            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                          >
                            {isApplying ? 'Applying...' : 'Apply'}
                          </button>
                        )}

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissSuggestion(suggestion.id);
                          }}
                          className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                          Dismiss
                        </button>

                        <button className="p-1 text-gray-400 hover:text-gray-600">
                          <svg
                            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-4">
                        {/* Reasoning */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Reasoning</h4>
                          <p className="text-sm text-gray-600">{suggestion.reasoning}</p>
                        </div>

                        {/* Actions */}
                        <div>
                          <h4 className="text-sm font-medium text-gray-900 mb-2">Actions</h4>
                          <div className="space-y-2">
                            {suggestion.actions.map((action, index) => (
                              <div key={index} className="bg-white p-3 rounded border">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm font-medium capitalize">{action.type}</span>
                                  <span className="text-xs text-gray-500">Target: {action.target}</span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{action.description}</p>
                                <div className="text-xs text-gray-500">
                                  Parameters: {JSON.stringify(action.parameters)}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Alternative Options */}
                        {suggestion.alternativeOptions && suggestion.alternativeOptions.length > 0 && (
                          <div>
                            <h4 className="text-sm font-medium text-gray-900 mb-2">Alternative Options</h4>
                            <div className="space-y-2">
                              {suggestion.alternativeOptions.map((option, index) => (
                                <div key={index} className="bg-white p-3 rounded border">
                                  <h5 className="text-sm font-medium text-gray-800">{option.title}</h5>
                                  <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Feedback Section */}
                        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                          <span className="text-sm text-gray-600">Was this suggestion helpful?</span>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setShowFeedbackModal(suggestion.id)}
                              className="px-3 py-1 text-xs font-medium text-green-600 hover:text-green-700 transition-colors"
                            >
                              👍 Yes
                            </button>
                            <button
                              onClick={() => setShowFeedbackModal(suggestion.id)}
                              className="px-3 py-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                            >
                              👎 No
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">💡</div>
            <p>No suggestions available.</p>
            <p className="text-sm">
              {filterCategory !== 'all'
                ? 'Try changing the category filter or analyzing your audio first.'
                : 'Run an AI analysis to get smart suggestions for your audio.'}
            </p>
          </div>
        )}
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Provide Feedback</h3>
              <button
                onClick={() => setShowFeedbackModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rating (1-5 stars)
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      className={`text-2xl ${
                        star <= feedbackRating ? 'text-yellow-400' : 'text-gray-300'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Comments (optional)
                </label>
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Tell us more about your experience with this suggestion..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowFeedbackModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleProvideFeedback(showFeedbackModal, true)}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Submit Feedback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}