# ProTrace SOP — Microsoft Azure & Microsoft 365 Re-Creation Guide

This document provides a **complete, step-by-step, copy-paste execution guide** to recreate and deploy the entire **ProTrace SOP Motorsport & Aerospace Overhaul Tracker** natively inside **Microsoft Azure**, **Azure SQL Database**, **.NET 8 C#**, **Microsoft Entra ID**, and **Microsoft Teams**.

---

## 🚀 5-Minute Turnkey Azure Deployment

All necessary infrastructure templates (`main.bicep`), C# backend code (`/dotnet-backend`), routing configs (`staticwebapp.config.json`), and PowerShell deployment scripts (`deploy-azure.ps1`) are **already created in this workspace**.

### Step 1: Install & Login to Azure CLI
Open PowerShell or Terminal on your Windows workstation and run:
```powershell
# Install Azure CLI (if not already installed)
$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri https://aka.ms/installazureclipswh -OutFile .\AzureCLI.msi; Start-Process msiexec.exe -ArgumentList '/I AzureCLI.msi /quiet' -Wait; Remove-Item .\AzureCLI.msi

# Authenticate with your Microsoft Azure Subscription
az login
```

### Step 2: Execute Automated Azure Deployment Script
Run the automated deployment script built in the root directory:
```powershell
# Set PowerShell Execution Policy
Set-ExecutionPolicy -ExecutionPolicy Unrestricted -Scope Process -Force

# Execute Automated Deployment
.\deploy-azure.ps1 -ResourceGroupName "rg-protrace-sop" -Location "northeurope" -SqlAdminPassword "ProTraceP@ssword2026!"
```

What `deploy-azure.ps1` does automatically:
1. Provisions **Azure Resource Group** (`rg-protrace-sop`).
2. Provisions **Azure SQL Server** & **Azure SQL Database** (`S0 Standard Tier`).
3. Provisions **Azure Storage Account** & Blob Container (`certificates`) for Conformance PDFs.
4. Provisions **Azure Static Web App** (`Free Tier`) for the React PWA.
5. Builds and deploys the frontend & .NET backend.

---

## 🗄️ Step 3: Apply Azure SQL Database DDL Schema

Connect to your newly provisioned Azure SQL Server using **Azure Data Studio** or **SQL Server Management Studio (SSMS)**, or run the following SQL script directly in Azure Portal Query Editor:

```sql
-- 1. Master Units Table
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
    [ChassisNumber] NVARCHAR(128) NULL,
    [LifeNumber] INT DEFAULT 1,
    [CurrentStepId] NVARCHAR(64) NOT NULL DEFAULT 'intake',
    [OverallStatus] NVARCHAR(64) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, quarantined, archived
    [Priority] NVARCHAR(32) DEFAULT 'medium',
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
    [JobOrderNumber] NVARCHAR(128) NULL,
    [DateOfEntry] NVARCHAR(32) NULL,
    [InspectorInitial] NVARCHAR(64) NULL,
    [DamageCheckStatus] NVARCHAR(32) DEFAULT 'PASS',
    [HeatExchangerMedium] NVARCHAR(64) DEFAULT 'water_to_oil',
    [Comments] NVARCHAR(MAX) NULL,
    [CompletedAt] DATETIME2 NULL
);

-- 3. Pressure Testing Records
CREATE TABLE [dbo].[PressureTestRecords] (
    [TestId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [GaugeId] NVARCHAR(128) NULL,
    [TestPressureBar] FLOAT NOT NULL,
    [StartPressureBar] FLOAT NULL,
    [EndPressureBar] FLOAT NULL,
    [HeldDurationSeconds] INT DEFAULT 60,
    [TestResult] NVARCHAR(32) NOT NULL DEFAULT 'PENDING',
    [LeakDetected] BIT DEFAULT 0,
    [Notes] NVARCHAR(MAX) NULL,
    [CompletedAt] DATETIME2 NULL
);

-- 4. 5-Point Dynamic Flow Test Curve
CREATE TABLE [dbo].[FlowTestPoints] (
    [PointId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [PointIndex] INT NOT NULL,
    [FrequencyHz] INT NOT NULL,
    [TargetFlowLpm] FLOAT NOT NULL,
    [MeasuredFlowLpm] FLOAT NOT NULL,
    [DeltaPressureBar] FLOAT NULL,
    [Passed] BIT NOT NULL DEFAULT 1
);

-- 5. Ultra Fine RIG Cleanliness Analysis (ISO 16232 / AS9100D)
CREATE TABLE [dbo].[CleanlinessAnalysisRecords] (
    [AnalysisId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [DetergentAgent] NVARCHAR(256) NULL,
    [GravimetricSolidsMg] FLOAT NULL,
    [ParticleCountIso] NVARCHAR(256) NULL,
    [Verdict] NVARCHAR(64) NOT NULL DEFAULT 'CONFORMING',
    [LabTechnician] NVARCHAR(256) NULL,
    [AnalysisNotes] NVARCHAR(MAX) NULL,
    [UploadedAt] DATETIME2 NULL
);

-- 6. QA Final Release Sign-Off
CREATE TABLE [dbo].[SignOffRecords] (
    [SignOffId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [InspectorName] NVARCHAR(256) NOT NULL,
    [QaDisposition] NVARCHAR(64) NOT NULL DEFAULT 'APPROVED',
    [FinalComments] NVARCHAR(MAX) NULL,
    [InertGasPurgeCompleted] BIT DEFAULT 1,
    [CompletedAt] DATETIME2 NULL
);

-- 7. Audit Stream Logs
CREATE TABLE [dbo].[ActivityLogs] (
    [LogId] INT IDENTITY(1,1) PRIMARY KEY,
    [UnitId] NVARCHAR(64) NOT NULL FOREIGN KEY REFERENCES [dbo].[Units]([Id]) ON DELETE CASCADE,
    [Action] NVARCHAR(256) NOT NULL,
    [StageId] NVARCHAR(64) NOT NULL,
    [Technician] NVARCHAR(256) NOT NULL,
    [Timestamp] DATETIME2 NOT NULL DEFAULT GETUTCDATE(),
    [Details] NVARCHAR(MAX) NULL
);

-- Indexes for Speed
CREATE INDEX IX_Units_SerialNumber ON [dbo].[Units]([SerialNumber]);
CREATE INDEX IX_Units_CustomerEmail ON [dbo].[Units]([CustomerEmail]);
```

---

## 💻 Step 4: Run the .NET 8 C# Backend API

The complete C# REST Web API source code is pre-built in `/dotnet-backend/ProTraceSop.Api/`.

To build and run locally or publish to Azure App Service:
```powershell
cd dotnet-backend/ProTraceSop.Api

# Restore dependencies
dotnet restore

# Run API locally on https://localhost:7001
dotnet run

# Publish to Azure App Service / Azure Functions
dotnet publish -c Release -o ./publish
az webapp deploy --resource-group rg-protrace-sop --name protrace-sop-api --src-path ./publish/publish.zip
```

---

## 🔐 Step 5: Configure Microsoft Entra ID (Azure AD) SSO

1. Go to **Azure Portal** -> **Microsoft Entra ID** -> **App Registrations**.
2. Click **New Registration**:
   - Name: `ProTrace SOP Motorsport Overhaul`
   - Supported Account Types: *Accounts in any organizational directory (Any Microsoft Entra ID tenant - Multitenant)*.
   - Redirect URI: `https://<your-static-web-app>.azurestaticapps.net/.auth/login/aad/callback`.
3. Under **Authentication**, enable *ID tokens (used for implicit and hybrid flows)*.
4. Update `infrastructure/staticwebapp.config.json` with your Tenant ID and Client ID.

---

## 💬 Step 6: Embed in Microsoft Teams

To embed ProTrace SOP directly as a native tab inside Microsoft Teams for trackside engineers:
1. Open **Microsoft Teams** -> Go to your team channel (e.g. *Scuderia Ferrari Cooling Operations*).
2. Click the **+** (Add a Tab) icon in the top header.
3. Select **Website**.
4. Paste your Azure Static Web App URL: `https://<your-app>.azurestaticapps.net/customer-portal`.
5. Click **Save**. The interactive overhaul tracker and 11-stage process map are now embedded live in Teams!

---

## 📦 Step 7: Download Complete Migration Bundle in UI

You can also generate and download the entire migration bundle (`.SQL` scripts, `Dataverse JSON`, `BicepIaC`, and `.NET C# source code`) at any time inside the web application:
1. Click **Microsoft 365 Suite** in the top navigation or Customer Portal header.
2. Click **Download Microsoft Migration Package (.SQL + Power Apps JSON + Blueprint)**.
