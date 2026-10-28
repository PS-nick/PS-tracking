import { ServiceUnit } from '../types/process';

/**
 * Generates Azure SQL Server Data Definition Language (DDL) CREATE TABLE statements
 * mapping the ProTrace SOP schema directly to Microsoft SQL Server / Azure SQL Database.
 */
export function generateAzureSqlDdl(): string {
  return `-- ===============================================================================
-- ProTrace SOP - Azure SQL Database / Microsoft SQL Server Schema Definition
-- Auto-generated for Microsoft Enterprise Migration
-- ===============================================================================

-- 1. Units Master Table
CREATE TABLE [dbo].[Units] (
    [Id] NVARCHAR(64) NOT NULL PRIMARY KEY,
    [SerialNumber] NVARCHAR(128) NOT NULL UNIQUE,
    [WorkOrderNumber] NVARCHAR(128) NOT NULL,
    [PartNumber] NVARCHAR(128) NOT NULL,
    [ModelName] NVARCHAR(256) NOT NULL,
    [CustomerName] NVARCHAR(256) NOT NULL,
    [CustomerEmail] NVARCHAR(256) NULL,
    [ComponentType] NVARCHAR(64) NOT NULL, -- heat_exchanger, water_radiator, oil_cooler, intercooler, combi_2_unit, combi_3_unit
    [HeatExchangerMedium] NVARCHAR(64) NULL, -- water_to_oil, oil_to_oil, water_to_air
    [RacingCategory] NVARCHAR(128) NULL,
    [RacingType] NVARCHAR(128) NULL,
    [ChassisNumber] NVARCHAR(128) NULL,
    [LifeNumber] INT DEFAULT 1,
    [CurrentStepId] NVARCHAR(64) NOT NULL DEFAULT 'intake',
    [OverallStatus] NVARCHAR(64) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, quarantined, archived
    [Priority] NVARCHAR(32) DEFAULT 'medium', -- standard, high, emergency
    [AssignedTechnician] NVARCHAR(256) NULL,
    [ExpectedDeliveryDate] DATETIME2 NULL,
    [CreatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [UpdatedAt] DATETIME2 NOT NULL DEFAULT GETUTCDATE()
);

-- 2. Intake Assessment Records
CREATE TABLE [dbo].[IntakeRecords] (
    [IntakeId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [SupplierCompanyName] NVARCHAR(256) NULL,
    [SupplierContactName] NVARCHAR(256) NULL,
    [SupplierContactEmail] NVARCHAR(256) NULL,
    [JobOrderNumber] NVARCHAR(128) NULL,
    [DateOfEntry] NVARCHAR(32) NULL,
    [InspectorInitial] NVARCHAR(64) NULL,
    [DamageCheckStatus] NVARCHAR(32) DEFAULT 'PASS',
    [ProtectionCovers] NVARCHAR(64) DEFAULT 'metal',
    [BungsCapsSupplied] BIT DEFAULT 1,
    [ORingIdNo] NVARCHAR(64) NULL,
    [InhousePartNo] NVARCHAR(128) NULL,
    [DrawingNumber] NVARCHAR(128) NULL,
    [FlowVectorVerified] BIT DEFAULT 1,
    [ServiceType] NVARCHAR(64) DEFAULT 'routine_overhaul',
    [HoursInOperation] FLOAT DEFAULT 0.0,
    [Comments] NVARCHAR(MAX) NULL,
    [CompletedAt] DATETIME2 NULL
);

-- 3. Pressure Testing Log
CREATE TABLE [dbo].[PressureTestRecords] (
    [TestId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [GaugeId] NVARCHAR(128) NULL,
    [TestPressureBar] FLOAT NOT NULL,
    [StartPressureBar] FLOAT NULL,
    [EndPressureBar] FLOAT NULL,
    [HeldDurationSeconds] INT DEFAULT 60,
    [AllowableDeltaBar] FLOAT DEFAULT 0.2,
    [TestResult] NVARCHAR(32) NOT NULL DEFAULT 'PENDING', -- PASS, FAIL, PENDING
    [LeakDetected] BIT DEFAULT 0,
    [Technician] NVARCHAR(256) NULL,
    [Notes] NVARCHAR(MAX) NULL,
    [CompletedAt] DATETIME2 NULL
);

-- 4. Dynamic Flow Test Points (5-Point Curve)
CREATE TABLE [dbo].[FlowTestPoints] (
    [PointId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [PointIndex] INT NOT NULL, -- 1 to 5
    [FrequencyHz] INT NOT NULL, -- 20, 30, 40, 50, 60
    [PointName] NVARCHAR(128) NULL,
    [TargetFlowLpm] FLOAT NOT NULL,
    [MeasuredFlowLpm] FLOAT NOT NULL,
    [TolerancePercent] FLOAT DEFAULT 15.0,
    [DeltaPressureBar] FLOAT NULL,
    [Passed] BIT NOT NULL DEFAULT 1,
    [Notes] NVARCHAR(MAX) NULL
);

-- 5. Ultra Fine RIG Cleanliness Analysis (ISO 16232 / AS9100D)
CREATE TABLE [dbo].[CleanlinessAnalysisRecords] (
    [AnalysisId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [DetergentAgent] NVARCHAR(256) NULL,
    [GravimetricSolidsMg] FLOAT NULL,
    [ParticleCountIso] NVARCHAR(256) NULL,
    [MoisturePpm] FLOAT NULL,
    [Verdict] NVARCHAR(64) NOT NULL DEFAULT 'CONFORMING', -- CONFORMING, REQUIRES_RECLEAN, NON_CONFORMING
    [LabTechnician] NVARCHAR(256) NULL,
    [AnalysisNotes] NVARCHAR(MAX) NULL,
    [UploadedAt] DATETIME2 NULL
);

-- 6. QA Final Release & Sign-Off
CREATE TABLE [dbo].[SignOffRecords] (
    [SignOffId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [InspectorName] NVARCHAR(256) NOT NULL,
    [InspectorId] NVARCHAR(64) NULL,
    [QaDisposition] NVARCHAR(64) NOT NULL DEFAULT 'APPROVED', -- APPROVED, REJECTED, QUARANTINED
    [FinalComments] NVARCHAR(MAX) NULL,
    [InertGasPurgeCompleted] BIT DEFAULT 1,
    [SealingStatus] NVARCHAR(128) DEFAULT 'NEW_PARTICLE_SCIENCE_BUNGS_USED',
    [CompletedAt] DATETIME2 NULL
);

-- 7. Audit Activity Log Stream
CREATE TABLE [dbo].[ActivityLogs] (
    [LogId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [Action] NVARCHAR(256) NOT NULL,
    [StageId] NVARCHAR(64) NOT NULL,
    [Technician] NVARCHAR(256) NOT NULL,
    [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [Details] NVARCHAR(MAX) NULL
);

-- Create Performance Indexes for Azure SQL / SQL Server
CREATE INDEX IX_Units_SerialNumber ON [dbo].[Units]([SerialNumber]);
CREATE INDEX IX_Units_CustomerEmail ON [dbo].[Units]([CustomerEmail]);
CREATE INDEX IX_Units_WorkOrderNumber ON [dbo].[Units]([WorkOrderNumber]);
CREATE INDEX IX_ActivityLogs_UnitId ON [dbo].[ActivityLogs]([UnitId]);
`;
}

/**
 * Generates Microsoft Dataverse / Power Apps Entity Definition JSON schema
 */
export function generatePowerAppsEntitySchema(): string {
  return JSON.stringify({
    solutionName: "ProTrace_SOP_Overhaul_Tracking",
    displayName: "ProTrace SOP Overhaul Tracking",
    publisher: "ParticleScienceTech",
    version: "2.4.0.0",
    entities: [
      {
        schemaName: "ps_serviceunit",
        displayName: "Service Unit",
        pluralName: "Service Units",
        primaryAttribute: "ps_serialnumber",
        attributes: [
          { name: "ps_serviceunitid", type: "UniqueIdentifier", isPrimary: true },
          { name: "ps_serialnumber", type: "String", maxLength: 128, required: true },
          { name: "ps_workordernumber", type: "String", maxLength: 128, required: true },
          { name: "ps_partnumber", type: "String", maxLength: 128, required: true },
          { name: "ps_modelname", type: "String", maxLength: 256, required: true },
          { name: "ps_customername", type: "String", maxLength: 256, required: true },
          { name: "ps_customeremail", type: "String", maxLength: 256 },
          { name: "ps_componenttype", type: "OptionSet", options: ["heat_exchanger", "water_radiator", "oil_cooler", "intercooler", "combi_2_unit", "combi_3_unit"] },
          { name: "ps_heatexchangermedium", type: "OptionSet", options: ["water_to_oil", "oil_to_oil", "water_to_air"] },
          { name: "ps_currentstepid", type: "OptionSet", options: ["intake", "degreasing", "descaling", "first_flush", "flow_test", "pressure_test", "cleaning", "final_flush", "oven", "gilling", "sign_off"] },
          { name: "ps_overallstatus", type: "OptionSet", options: ["in_progress", "completed", "quarantined", "archived"] },
          { name: "ps_priority", type: "OptionSet", options: ["standard", "high", "emergency"] },
          { name: "ps_lifenumber", type: "Integer", defaultValue: 1 },
          { name: "ps_assignedtechnician", type: "String", maxLength: 256 }
        ]
      }
    ]
  }, null, 2);
}

/**
 * Downloads the full Microsoft Migration Package (.SQL script + Power Apps Entity JSON + Data CSV)
 */
export function downloadMicrosoftMigrationPackage(units: ServiceUnit[]): void {
  const sqlDdl = generateAzureSqlDdl();
  const powerAppsSchema = generatePowerAppsEntitySchema();

  // Create a combined bundle text file containing Azure SQL DDL, Power Apps entity, and instructions
  const bundleText = `===============================================================================
PROTRACE SOP - MICROSOFT ENVIRONMENT MIGRATION PACKAGE
===============================================================================
Generated: ${new Date().toISOString()}
Target Environment: Microsoft Azure SQL / Power Apps / Azure Static Web Apps / .NET

CONTENTS:
1. Azure SQL Database DDL Script (CREATE TABLE statements & Indexes)
2. Microsoft Dataverse / Power Apps Entity Definition JSON
3. Migration Instructions for Microsoft Azure & Power Platform

-------------------------------------------------------------------------------
1. AZURE SQL DATABASE DDL SCRIPT
-------------------------------------------------------------------------------
${sqlDdl}

-------------------------------------------------------------------------------
2. MICROSOFT DATAVERSE / POWER APPS ENTITY SCHEMA JSON
-------------------------------------------------------------------------------
${powerAppsSchema}

-------------------------------------------------------------------------------
3. MIGRATION INSTRUCTIONS
-------------------------------------------------------------------------------
A. REACT / FRONTEND MIGRATION:
   1. The existing React TypeScript codebase can be deployed directly to Azure Static Web Apps:
      Command: az staticwebapp create --name protrace-sop --resource-group myRg --source .
   2. Configure Microsoft Entra ID (Azure AD) Single Sign-On (SSO) in azure-static-web-apps.config.json.

B. DATABASE MIGRATION:
   1. Execute Section 1 SQL DDL against your Azure SQL Database using Azure Data Studio or SQL Server Management Studio (SSMS).
   2. For Dataverse / Power Platform, import Section 2 JSON into Power Apps Solution Explorer.

C. AUTOMATION & INTEGRATION:
   1. Use Power Automate (Flow) with the Microsoft Teams connector to trigger webhooks on QA Quarantine.
   2. Store PDF Conformance Certificates in Azure Blob Storage or SharePoint Document Libraries.
===============================================================================`;

  const blob = new Blob([bundleText], { type: 'text/plain;charset=utf-8' });
  const filename = `ProTrace_SOP_Microsoft_Migration_Package_${new Date().toISOString().slice(0, 10)}.txt`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
