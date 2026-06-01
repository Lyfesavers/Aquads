import React from 'react';
import {
  LISTING_BLOCKCHAIN_OPTIONS,
  normalizeBlockchainSlug,
  isKnownListingBlockchain,
  getBlockchainLabel,
} from '../constants/blockchains';

/**
 * Shared blockchain dropdown for listing create/edit modals.
 */
const BlockchainSelect = ({
  name = 'blockchain',
  value,
  onChange,
  className = '',
  id,
  required = false,
}) => {
  const raw = value || 'ethereum';
  const normalized = normalizeBlockchainSlug(raw);
  const isLegacy = raw && !isKnownListingBlockchain(raw);
  const selectValue = isLegacy ? raw : normalized;

  const popular = LISTING_BLOCKCHAIN_OPTIONS.filter((o) => o.popular);
  const other = LISTING_BLOCKCHAIN_OPTIONS.filter((o) => !o.popular);

  return (
    <select
      id={id}
      name={name}
      value={selectValue}
      onChange={onChange}
      required={required}
      className={className}
    >
      {isLegacy && (
        <option value={raw}>
          {getBlockchainLabel(raw)} (saved)
        </option>
      )}
      <optgroup label="Popular">
        {popular.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </optgroup>
      <optgroup label="All chains">
        {other.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </optgroup>
    </select>
  );
};

export default BlockchainSelect;
