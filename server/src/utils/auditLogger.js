export const logAudit = async ({ user, action, entityType, entityId }) => {
  // Lightweight admission decision logger; persistent status history is stored in Application.statusHistory
  console.log(`[Audit] [${action}] by ${user?.name || 'System'} (${user?.role || 'system'}) on ${entityType}:${entityId}`);
};
