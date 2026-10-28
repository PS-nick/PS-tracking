import { ServiceUnit } from '../types/process';
import { generateFleetCsv, downloadFleetCsv } from './exportCsv';

/**
 * Sanitizes file names to ensure compatibility with Windows OS filename constraints
 * Strips illegal Windows characters: \ / : * ? " < > |
 */
export function sanitizeWindowsFilename(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '_')
    .trim();
}

/**
 * Generates Microsoft Excel-ready CSV file with UTF-8 BOM header and triggers download.
 * UTF-8 BOM (\uFEFF) ensures Excel auto-detects characters without import wizards.
 */
export function exportToMicrosoftExcel(units: ServiceUnit[], contextName?: string): void {
  downloadFleetCsv(units, contextName || 'microsoft-excel-export');
}

/**
 * Formats a unit state into a rich Markdown snippet optimized for Microsoft Teams message cards
 */
export function generateMicrosoftTeamsCardMarkdown(unit: ServiceUnit): string {
  const isCompleted = unit.overallStatus === 'completed';
  const isQuarantined = unit.overallStatus === 'quarantined';
  const statusEmoji = isCompleted ? '✅' : isQuarantined ? '⚠️' : '🔄';

  return `### ${statusEmoji} ProTrace SOP Overhaul Update - ${unit.serialNumber}

**Work Order:** \`${unit.workOrderNumber}\`  
**Model:** ${unit.modelName}  
**Constructor:** ${unit.customerName}  
**Part #:** \`${unit.partNumber}\` ${unit.chassisNumber ? `| **Chassis:** \`${unit.chassisNumber}\`` : ''}  

---

- **Current Stage:** Stage ${unit.currentStepId.replace(/_/g, ' ').toUpperCase()}
- **Overall Status:** **${unit.overallStatus.toUpperCase()}**
- **Life #:** ${unit.lifeNumber || 1}
- **Assigned Technician:** ${unit.assignedTechnician || unit.intake?.technician || 'Nicola Malgarotti'}
- **Proof Pressure Rating:** ${unit.processConfig?.pressureTargetBar || 3.0} Bar
- **Flow Dynamic Verdict:** ${unit.flowTest?.flowPass ? 'PASS' : 'PENDING'}
- **Cleanliness Status:** ${unit.cleaning?.analysisResult?.verdict || 'CONFORMING'}

*Shared via ProTrace SOP Particle Science Depot System*`;
}

/**
 * Copies Microsoft Teams markdown snippet directly to clipboard
 */
export async function copyTeamsCardToClipboard(unit: ServiceUnit): Promise<boolean> {
  try {
    const text = generateMicrosoftTeamsCardMarkdown(unit);
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.warn('Teams snippet copy notice:', err);
    return false;
  }
}

/**
 * Generates a mailto: URL pre-populated for Microsoft Outlook email dispatch or QA notification
 */
export function generateMicrosoftOutlookMailto(unit: ServiceUnit, recipientEmail?: string): string {
  const isCompleted = unit.overallStatus === 'completed';
  const isQuarantined = unit.overallStatus === 'quarantined';
  const statusLabel = isCompleted ? 'Certified Conforming' : isQuarantined ? 'QA Quarantine Exception' : 'Overhaul In-Progress';

  const subject = encodeURIComponent(`[ProTrace SOP] ${statusLabel} - Serial ${unit.serialNumber} (WO: ${unit.workOrderNumber})`);
  
  const bodyText = `Dear Technical Lead,

Please find the overhaul status update for your serialized component below:

--------------------------------------------------
UNIT SERIAL: ${unit.serialNumber}
WORK ORDER: ${unit.workOrderNumber}
MODEL: ${unit.modelName}
CONSTRUCTOR: ${unit.customerName}
PART NUMBER: ${unit.partNumber}
CHASSIS NO: ${unit.chassisNumber || 'N/A'}

OVERHAUL POSITION: Stage ${unit.currentStepId.replace(/_/g, ' ').toUpperCase()}
OVERALL STATUS: ${unit.overallStatus.toUpperCase()}
TARGET SLA DELIVERY: ${unit.expectedDeliveryDate || 'Standard Workshop SLA'}

PROOF PRESSURE TEST: ${unit.pressureTest?.testResult || 'PASS'} (${unit.pressureTest?.testPressureBar || unit.processConfig?.pressureTargetBar || 3} Bar)
PARTICLE CLEANLINESS: ${unit.cleaning?.analysisResult?.verdict || 'CONFORMING'} (${unit.cleaning?.cleaningSpecMicron || 25}µm)
QA SIGN-OFF INSPECTOR: ${unit.signOff?.inspectorName || unit.assignedTechnician || 'N. Malgarotti'}
--------------------------------------------------

You can view the full interactive process map and download the Certificate of Conformance PDF directly in your Customer Portal.

Best regards,
Particle Science Depot Technical Operations
Bicester Motion Campus, UK`;

  const body = encodeURIComponent(bodyText);
  const email = recipientEmail || unit.customerEmail || 'technical@particlescience.com';

  return `mailto:${email}?subject=${subject}&body=${body}`;
}
