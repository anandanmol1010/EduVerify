import React from 'react';

export default function StatusBadge({ status }) {
  let bg = 'bg-gray-100 text-gray-800 border-gray-200';

  switch (status) {
    case 'Draft':
      bg = 'bg-[#ECEBE4] text-[#6B716C] border-[#DDDCD5]';
      break;
    case 'Submitted':
      bg = 'bg-blue-50 text-blue-800 border-blue-200';
      break;
    case 'Pending Verification':
      bg = 'bg-amber-50 text-amber-900 border-amber-200';
      break;
    case 'Correction Required':
      bg = 'bg-orange-50 text-orange-900 border-orange-200';
      break;
    case 'Resubmitted':
      bg = 'bg-indigo-50 text-indigo-900 border-indigo-200';
      break;
    case 'Accepted':
      bg = 'bg-[#254D3C] text-white border-[#1c3b2e] font-semibold';
      break;
    case 'Rejected':
      bg = 'bg-rose-50 text-rose-800 border-rose-200';
      break;
    case 'Verified':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      break;
    case 'Not Uploaded':
      bg = 'bg-gray-100 text-gray-500 border-gray-200';
      break;
    case 'Eligible':
      bg = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      break;
    case 'Not Eligible':
      bg = 'bg-rose-50 text-rose-800 border-rose-200 font-semibold';
      break;
    case 'Incomplete':
      bg = 'bg-amber-50 text-amber-900 border-amber-200 font-semibold';
      break;
    case 'Not Checked':
      bg = 'bg-gray-100 text-gray-600 border-gray-200';
      break;
    default:
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border ${bg}`}>
      {status}
    </span>
  );
}
