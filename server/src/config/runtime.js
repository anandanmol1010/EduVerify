import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const uploadsDirectory = () => path.resolve(process.env.UPLOADS_DIR || 'uploads');

export const mockDocumentsDirectory = fileURLToPath(new URL('../../uploads/mock_documents/', import.meta.url));

export const clientUrl = () => new URL(
  process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:5173'
).origin;
