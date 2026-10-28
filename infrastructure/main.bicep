// ===============================================================================
// ProTrace SOP - Infrastructure as Code (Azure Bicep Template)
// Provisions Azure SQL Server, Database, Azure Static Web App, Function App, and Blob Storage
// ===============================================================================

@description('Location for all Azure resources')
param location string = resourceGroup().location

@description('App name prefix')
param appName string = 'protrace-sop'

@description('Azure SQL Admin Username')
param sqlAdminUsername string = 'protraceadmin'

@description('Azure SQL Admin Password')
@secure()
param sqlAdminPassword string

var sqlServerName = '${appName}-sqlserver-${uniqueString(resourceGroup().id)}'
var sqlDatabaseName = '${appName}-db'
var staticWebAppName = '${appName}-swa'
var storageAccountName = 'st${uniqueString(resourceGroup().id)}'
var functionAppName = '${appName}-func'

// 1. Storage Account for Blob Certificates & Function Storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    supportsHttpsTrafficOnly: true
    accessTier: 'Hot'
  }
}

// 2. Blob Container for Conformance Certificate PDFs
resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = {
  name: '${storageAccount.name}/default/certificates'
}

// 3. Azure SQL Server
resource sqlServer 'Microsoft.Sql/servers@2022-05-01-preview' = {
  name: sqlServerName
  location: location
  properties: {
    administratorLogin: sqlAdminUsername
    administratorLoginPassword: sqlAdminPassword
    version: '12.0'
  }
}

// 4. Azure SQL Database (Free/Standard Tier)
resource sqlDatabase 'Microsoft.Sql/servers/databases@2022-05-01-preview' = {
  parent: sqlServer
  name: sqlDatabaseName
  location: location
  sku: {
    name: 'S0'
    tier: 'Standard'
  }
  properties: {
    collation: 'SQL_Latin1_General_CP1_CI_AS'
    maxSizeBytes: 10737418240 // 10 GB
  }
}

// Allow Azure Services Firewall Access to SQL Server
resource sqlFirewallAzure 'Microsoft.Sql/servers/firewallRules@2022-05-01-preview' = {
  parent: sqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

// 5. Azure Static Web App (React Frontend & PWA)
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: staticWebAppName
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    provider: 'Custom'
  }
}

output sqlConnectionString string = 'Server=tcp:${sqlServer.properties.fullyQualifiedDomainName},1433;Initial Catalog=${sqlDatabaseName};Persist Security Info=False;User ID=${sqlAdminUsername};Password=${sqlAdminPassword};MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;'
output staticWebAppUrl string = 'https://${staticWebApp.properties.defaultHostname}'
