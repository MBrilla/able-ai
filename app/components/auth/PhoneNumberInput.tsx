"use client";

import React, { useState, useEffect } from 'react';

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', flag: '🇮🇪' },
];

interface PhoneNumberInputProps {
  value: string;
  onChange: (phoneNumber: string) => void;
  onError: (error: string | null) => void;
  disabled?: boolean;
}

const PhoneNumberInput: React.FC<PhoneNumberInputProps> = ({
  value,
  onChange,
  onError,
  disabled = false
}) => {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Default to UK
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Parse existing value on mount
  useEffect(() => {
    if (value) {
      const country = COUNTRIES.find(c => value.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(value.replace(country.dialCode, ''));
      } else {
        setPhoneNumber(value);
      }
    }
  }, [value]);

  // Update parent when phone number changes
  useEffect(() => {
    const fullNumber = selectedCountry.dialCode + phoneNumber;
    onChange(fullNumber);
    
    // Validate phone number
    validatePhoneNumber(fullNumber);
  }, [selectedCountry, phoneNumber, onChange]);

  const validatePhoneNumber = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    
    // Basic validation - at least 10 digits, max 15
    if (digits.length < 10) {
      onError('Phone number must be at least 10 digits');
      return false;
    }
    
    if (digits.length > 15) {
      onError('Phone number too long');
      return false;
    }
    
    // Country-specific validation
    if (selectedCountry.code === 'GB') {
      // UK mobile numbers start with 7
      if (digits.startsWith('44') && digits.length === 12 && !digits.startsWith('447')) {
        onError('Invalid UK mobile number');
        return false;
      }
    }
    
    onError(null);
    return true;
  };

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    // Remove all non-digits
    const digits = input.replace(/\D/g, '');
    setPhoneNumber(digits);
  };

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setShowCountryDropdown(false);
    setSearchTerm('');
  };

  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm)
  );

  const formatDisplayNumber = (number: string) => {
    if (!number) return '';
    
    // Format UK numbers: +44 7XXX XXX XXX
    if (selectedCountry.code === 'GB' && number.startsWith('7') && number.length >= 10) {
      return `+44 ${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}`;
    }
    
    // Format US/CA numbers: +1 XXX XXX XXXX
    if (selectedCountry.code === 'US' || selectedCountry.code === 'CA') {
      if (number.length >= 10) {
        return `+1 ${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6)}`;
      }
    }
    
    // Default formatting
    return selectedCountry.dialCode + ' ' + number;
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Phone Number
      </label>
      
      <div className="relative">
        {/* Country Selector */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowCountryDropdown(!showCountryDropdown)}
            disabled={disabled}
            className="absolute left-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-2 text-gray-700 hover:text-gray-900 disabled:opacity-50"
          >
            <span className="text-lg">{selectedCountry.flag}</span>
            <span className="text-sm font-medium">{selectedCountry.dialCode}</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* Country Dropdown */}
          {showCountryDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-60 overflow-y-auto">
              <div className="p-2 border-b">
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {filteredCountries.map((country) => (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => handleCountrySelect(country)}
                  className="w-full px-3 py-2 text-left hover:bg-gray-100 flex items-center space-x-3"
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="text-sm font-medium">{country.dialCode}</span>
                  <span className="text-sm text-gray-600">{country.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Phone Number Input */}
        <input
          type="tel"
          value={phoneNumber}
          onChange={handlePhoneNumberChange}
          placeholder={selectedCountry.code === 'GB' ? '7XXX XXX XXX' : 'Phone number'}
          disabled={disabled}
          className="w-full pl-20 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>
      
      {/* Display formatted number */}
      {phoneNumber && (
        <p className="text-sm text-gray-600">
          {formatDisplayNumber(phoneNumber)}
        </p>
      )}
    </div>
  );
};

export default PhoneNumberInput;
