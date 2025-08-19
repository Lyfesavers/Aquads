import React from 'react';

const CountryFlag = ({ countryCode }) => {
  if (!countryCode) return null;

  const getFlagEmoji = (countryCode) => {
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
  };

  return (
    <span 
      className="text-lg" 
      title={countryCode}
      role="img" 
      aria-label={`flag of ${countryCode}`}
    >
      {getFlagEmoji(countryCode)}
    </span>
  );
};

export default CountryFlag;
