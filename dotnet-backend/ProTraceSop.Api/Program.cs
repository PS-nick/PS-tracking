using Microsoft.EntityFrameworkCore;
using ProTraceSop.Api.DbContext;

var builder = WebApplication.CreateBuilder(args);

// Add Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure Azure SQL Database Connection String
var connectionString = builder.Configuration.GetConnectionString("AzureSql") 
    ?? "Server=tcp:protrace-sql.database.windows.net,1433;Initial Catalog=protrace-db;User ID=protraceadmin;Password=YourPassword123!;Encrypt=True;";

builder.Services.AddDbContext<ProTraceDbContext>(options =>
    options.UseSqlServer(connectionString));

// CORS Policy for Azure Static Web Apps & Local Host
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://*.azurestaticapps.net", "http://localhost:3000", "http://localhost:5173")
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowFrontend");
app.UseAuthorization();
app.MapControllers();

app.Run();
