import StatusBadge from './StatusBadge';

export default function DocumentStatusBadge({ document }) {
  const { source, issuerRecord, verificationStatus } = document;
  if (source === 'DigiLocker Demo' && !issuerRecord && verificationStatus === 'Pending Verification') {
    return (
      <span className="inline-flex text-[11px] text-amber-900" title="Import this document through DigiLocker to verify it.">
        Re-import to verify
      </span>
    );
  }
  return <StatusBadge status={verificationStatus} />;
}
