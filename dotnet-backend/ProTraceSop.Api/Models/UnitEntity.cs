using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ProTraceSop.Api.Models
{
    [Table("Units")]
    public class UnitEntity
    {
        [Key]
        [MaxLength(64)]
        public string Id { get; set; } = Guid.NewGuid().ToString();

        [Required]
        [MaxLength(128)]
        public string SerialNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(128)]
        public string WorkOrderNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(128)]
        public string PartNumber { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string ModelName { get; set; } = string.Empty;

        [Required]
        [MaxLength(256)]
        public string CustomerName { get; set; } = string.Empty;

        [MaxLength(256)]
        public string? CustomerEmail { get; set; }

        [Required]
        [MaxLength(64)]
        public string ComponentType { get; set; } = "heat_exchanger";

        [MaxLength(64)]
        public string? HeatExchangerMedium { get; set; } // water_to_oil, oil_to_oil, water_to_air

        [MaxLength(128)]
        public string? RacingCategory { get; set; }

        [MaxLength(128)]
        public string? ChassisNumber { get; set; }

        public int LifeNumber { get; set; } = 1;

        [Required]
        [MaxLength(64)]
        public string CurrentStepId { get; set; } = "intake";

        [Required]
        [MaxLength(64)]
        public string OverallStatus { get; set; } = "in_progress"; // in_progress, completed, quarantined, archived

        [MaxLength(32)]
        public string Priority { get; set; } = "medium";

        [MaxLength(256)]
        public string? AssignedTechnician { get; set; }

        public DateTime? ExpectedDeliveryDate { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

        // Navigation Properties
        public IntakeEntity? Intake { get; set; }
        public PressureTestEntity? PressureTest { get; set; }
        public List<FlowTestPointEntity> FlowTestPoints { get; set; } = new();
        public CleanlinessAnalysisEntity? CleanlinessAnalysis { get; set; }
        public SignOffEntity? SignOff { get; set; }
        public List<ActivityLogEntity> ActivityLogs { get; set; } = new();
    }

    [Table("IntakeRecords")]
    public class IntakeEntity
    {
        [Key]
        public int IntakeId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public string? SupplierCompanyName { get; set; }
        public string? JobOrderNumber { get; set; }
        public string? DateOfEntry { get; set; }
        public string? InspectorInitial { get; set; }
        public string DamageCheckStatus { get; set; } = "PASS";
        public string HeatExchangerMedium { get; set; } = "water_to_oil";
        public string? Comments { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    [Table("PressureTestRecords")]
    public class PressureTestEntity
    {
        [Key]
        public int TestId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public string? GaugeId { get; set; }
        public double TestPressureBar { get; set; } = 3.0;
        public double StartPressureBar { get; set; } = 3.0;
        public double EndPressureBar { get; set; } = 3.0;
        public int HeldDurationSeconds { get; set; } = 60;
        public string TestResult { get; set; } = "PENDING"; // PASS, FAIL, PENDING
        public bool LeakDetected { get; set; } = false;
        public string? Notes { get; set; }
        public DateTime? CompletedAt { get; set; }
    }

    [Table("FlowTestPoints")]
    public class FlowTestPointEntity
    {
        [Key]
        public int PointId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public int PointIndex { get; set; }
        public int FrequencyHz { get; set; }
        public double TargetFlowLpm { get; set; }
        public double MeasuredFlowLpm { get; set; }
        public double DeltaPressureBar { get; set; }
        public bool Passed { get; set; } = true;
    }

    [Table("CleanlinessAnalysisRecords")]
    public class CleanlinessAnalysisEntity
    {
        [Key]
        public int AnalysisId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public string? DetergentAgent { get; set; }
        public double GravimetricSolidsMg { get; set; }
        public string? ParticleCountIso { get; set; }
        public string Verdict { get; set; } = "CONFORMING"; // CONFORMING, REQUIRES_RECLEAN, NON_CONFORMING
        public string? LabTechnician { get; set; }
        public string? AnalysisNotes { get; set; }
        public DateTime? UploadedAt { get; set; }
    }

    [Table("SignOffRecords")]
    public class SignOffEntity
    {
        [Key]
        public int SignOffId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public string InspectorName { get; set; } = "QA Lead";
        public string QaDisposition { get; set; } = "APPROVED";
        public string? FinalComments { get; set; }
        public bool InertGasPurgeCompleted { get; set; } = true;
        public DateTime? CompletedAt { get; set; }
    }

    [Table("ActivityLogs")]
    public class ActivityLogEntity
    {
        [Key]
        public int LogId { get; set; }

        [Required]
        [MaxLength(64)]
        public string UnitId { get; set; } = string.Empty;

        public string Action { get; set; } = string.Empty;
        public string StageId { get; set; } = "intake";
        public string Technician { get; set; } = "N. Malgarotti";
        public DateTime Timestamp { get; set; } = DateTime.UtcNow;
        public string? Details { get; set; }
    }
}
