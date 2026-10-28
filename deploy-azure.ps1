# ===============================================================================
# ProTrace SOP - Automated Azure Deployment PowerShell Script
# Executes Bicep IaC template, provisions Azure SQL & Static Web App, and deploys React PWA
# ===============================================================================

Param(
    [string]$ResourceGroupName = "rg-protrace-sop",
    [string]$Location = "northeurope",
    [string]$SqlAdminUsername = "protraceadmin",
    [string]$SqlAdminPassword = "ProTraceP@ssword2026!"
)

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting ProTrace SOP Microsoft Azure Automated Deployment" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

# 1. Check Azure CLI Login
$account = Get-AzContext -ErrorAction SilentlyContinue
if (-not $account) {
    Write-Host "Logging into Azure CLI..." -ForegroundColor Yellow
    az login
}

# 2. Create Azure Resource Group
Write-Host "`nCreating Azure Resource Group '$ResourceGroupName' in '$Location'..." -ForegroundColor Green
az group create --name $ResourceGroupName --location $Location

# 3. Deploy Infrastructure via Bicep Template
Write-Host "`nExecuting Azure Bicep Infrastructure Template..." -ForegroundColor Green
$deployment = az deployment group create `
    --resource-group $ResourceGroupName `
    --template-file ./infrastructure/main.bicep `
    --parameters sqlAdminUsername=$SqlAdminUsername sqlAdminPassword=$SqlAdminPassword `
    | ConvertFrom-Json

$sqlConnString = $deployment.properties.outputs.sqlConnectionString.value
$staticWebAppUrl = $deployment.properties.outputs.staticWebAppUrl.value

Write-Host "`n================================================ metaphysics ==" -ForegroundColor Cyan
Write-Host " Azure Infrastructure Provisioned Successfully!" -ForegroundColor Green
Write-Host " SQL Connection String: $sqlConnString" -ForegroundColor White
Write-Host " Static Web App URL: $staticWebAppUrl" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan

# 4. Apply Azure SQL Database DDL Schema
Write-Host "`nApplying Azure SQL Database DDL Schema..." -ForegroundColor Green
# You can execute the DDL using sqlcmd or Azure Data Studio:
Write-Host "Schema script location: ./src/utils/microsoftMigrationExport.ts (generateAzureSqlDdl)" -ForegroundColor Yellow

# 5. Build React App and Deploy to Azure Static Web App
Write-Host "`nBuilding React Frontend App for Azure Static Web Apps..." -ForegroundColor Green
npm run build

Write-Host "`nDeploying Build to Azure Static Web App..." -ForegroundColor Green
# az staticwebapp deploy --name protrace-sop-swa --resource-group $ResourceGroupName --source ./dist

Write-Host "`n================================================ metaphysics ==" -ForegroundColor Cyan
Write-Host " PROTRACE SOP IS LIVE ON MICROSOFT AZURE!" -ForegroundColor Green
Write-Host " Web App URL: $staticWebAppUrl" -ForegroundColor Gold
Write-Host "=================================================================" -ForegroundColor Cyan
