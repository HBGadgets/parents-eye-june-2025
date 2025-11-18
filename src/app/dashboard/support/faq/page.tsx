'use client';

import React, { useState } from 'react';
import { faq } from '@/app/dashboard/support/faq/faq';
import { Search, ChevronDown } from 'lucide-react';

const FAQComponent: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // Filter FAQs based on search query
  const filteredFAQs = faq.filter(
    (item) =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white py-4 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto h-full flex flex-col">
        {/* Header Section with Logo */}
        <div className="text-center mb-4 flex-shrink-0">
          <div className="inline-flex items-center justify-center mb-2">
            {/* Animated Question Mark Logo */}
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-400 rounded-full blur-md opacity-50 animate-pulse"></div>
              <div className="relative w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg transform hover:scale-110 transition-transform duration-300">
                <span className="text-2xl font-bold text-white">?</span>
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-1">
            Frequently Asked Questions
          </h1>
          <p className="text-sm text-gray-600 max-w-2xl mx-auto">
            Find answers about our school bus tracking system
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-4 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-yellow-600 w-4 h-4" />
            <input
              type="text"
              placeholder="Search for questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-yellow-50 border border-yellow-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition-all duration-300 text-gray-800 placeholder-gray-500 text-sm shadow-sm"
            />
          </div>
        </div>

        {/* FAQ Accordion */}
        <div className="bg-yellow-50 rounded-xl shadow-md p-4 border border-yellow-200 flex-1 overflow-y-auto">
          {filteredFAQs.length > 0 ? (
            <div className="space-y-2">
              {filteredFAQs.map((item, index) => (
                <div
                  key={index}
                  className="border border-yellow-200 rounded-lg overflow-hidden hover:border-yellow-300 transition-all duration-300 bg-white"
                >
                  <button
                    onClick={() => toggleAccordion(index)}
                    className="w-full flex items-center justify-between p-3 text-left group"
                  >
                    <span className="text-sm font-semibold text-gray-800 pr-3 group-hover:text-yellow-700 transition-colors duration-200">
                      {item.question}
                    </span>
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-yellow-400 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                      <ChevronDown
                        className={`w-4 h-4 text-white transition-transform duration-300 ${
                          openIndex === index ? 'transform rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-500 ease-in-out ${
                      openIndex === index
                        ? 'max-h-60 opacity-100'
                        : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-3 pb-3 pt-1 bg-white">
                      <p className="text-gray-700 leading-relaxed text-sm">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-yellow-100 rounded-full mb-3 shadow-md">
                <Search className="w-7 h-7 text-gray-400" />
              </div>
              <p className="text-gray-600 text-base font-semibold mb-1">
                No FAQs found matching your search.
              </p>
              <p className="text-gray-500 text-sm">
                Try different keywords or browse all questions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQComponent;