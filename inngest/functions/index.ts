/**
 * Inngest function registry.
 *
 * Each spike that adds a background function exports it from its own file
 * and adds it to the `functions` array below.
 *
 * The /api/inngest route auto-registers everything in this array.
 */

import { processDocument } from './process-document';
import { watchdogStuckDocuments } from './watchdog-stuck-documents';

export const functions = [processDocument, watchdogStuckDocuments] as const;
