import mongoose from 'mongoose';

export const validDocumentScope = ({ applicationId, workspaceId }) =>
  !(applicationId && workspaceId) &&
  (!applicationId || (typeof applicationId === 'string' && mongoose.isObjectIdOrHexString(applicationId))) &&
  (!workspaceId || (typeof workspaceId === 'string' && /^[a-f\d]{8}-[a-f\d]{4}-4[a-f\d]{3}-[89ab][a-f\d]{3}-[a-f\d]{12}$/i.test(workspaceId)));

export const documentScope = ({ applicationId, workspaceId }) => ({
  application: applicationId || null,
  workspaceId: workspaceId || null,
});
