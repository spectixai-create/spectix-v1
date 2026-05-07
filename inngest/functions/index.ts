/**
 * Inngest function registry.
 *
 * Each spike that adds a background function exports it from its own file
 * and adds it to the `functions` array below.
 *
 * The /api/inngest route auto-registers everything in this array.
 */

import { processDocument } from './process-document';
import { claimRecycleFunction } from './claim-recycle';
import { claimantNotifyFunction } from './claimant-notify';
import { runValidationPassFunction } from './run-validation-pass';
import { watchdogStuckDocuments } from './watchdog-stuck-documents';
import { runSynthesisPassFunction } from '../synthesis/run-synthesis-pass';

export const functions = [
  processDocument,
  claimRecycleFunction,
  claimantNotifyFunction,
  watchdogStuckDocuments,
  runValidationPassFunction,
  runSynthesisPassFunction,
] as const;
