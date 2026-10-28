using Microsoft.EntityFrameworkCore;
using ProTraceSop.Api.Models;

namespace ProTraceSop.Api.DbContext
{
    public class ProTraceDbContext : Microsoft.EntityFrameworkCore.DbContext
    {
        public ProTraceDbContext(DbContextOptions<ProTraceDbContext> options) : base(options) { }

        public DbSet<UnitEntity> Units { get; set; }
        public DbSet<IntakeEntity> IntakeRecords { get; set; }
        public DbSet<PressureTestEntity> PressureTestRecords { get; set; }
        public DbSet<FlowTestPointEntity> FlowTestPoints { get; set; }
        public DbSet<CleanlinessAnalysisEntity> CleanlinessAnalysisRecords { get; set; }
        public DbSet<SignOffEntity> SignOffRecords { get; set; }
        public DbSet<ActivityLogEntity> ActivityLogs { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<UnitEntity>()
                .HasIndex(u => u.SerialNumber)
                .IsUnique();

            modelBuilder.Entity<UnitEntity>()
                .HasIndex(u => u.CustomerEmail);

            modelBuilder.Entity<UnitEntity>()
                .HasIndex(u => u.WorkOrderNumber);
        }
    }
}
