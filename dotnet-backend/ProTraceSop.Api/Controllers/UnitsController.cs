using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ProTraceSop.Api.DbContext;
using ProTraceSop.Api.Models;

namespace ProTraceSop.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UnitsController : ControllerBase
    {
        private readonly ProTraceDbContext _db;

        public UnitsController(ProTraceDbContext db)
        {
            _db = db;
        }

        // GET: api/units
        [HttpGet]
        public async Task<ActionResult<IEnumerable<UnitEntity>>> GetUnits([FromQuery] string? customerEmail)
        {
            var query = _db.Units
                .Include(u => u.Intake)
                .Include(u => u.PressureTest)
                .Include(u => u.FlowTestPoints)
                .Include(u => u.CleanlinessAnalysis)
                .Include(u => u.SignOff)
                .AsQueryable();

            // Strict Customer Isolation Filter
            if (!string.IsNullOrWhiteSpace(customerEmail))
            {
                var clean = customerEmail.Trim().ToLower();
                query = query.Where(u => u.CustomerEmail != null && u.CustomerEmail.ToLower() == clean);
            }

            return await query.OrderByDescending(u => u.UpdatedAt).ToListAsync();
        }

        // GET: api/units/5
        [HttpGet("{id}")]
        public async Task<ActionResult<UnitEntity>> GetUnit(string id)
        {
            var unit = await _db.Units
                .Include(u => u.Intake)
                .Include(u => u.PressureTest)
                .Include(u => u.FlowTestPoints)
                .Include(u => u.CleanlinessAnalysis)
                .Include(u => u.SignOff)
                .Include(u => u.ActivityLogs)
                .FirstOrDefaultAsync(u => u.Id == id);

            if (unit == null) return NotFound();
            return unit;
        }

        // POST: api/units
        [HttpPost]
        public async Task<ActionResult<UnitEntity>> CreateUnit(UnitEntity unit)
        {
            unit.CreatedAt = DateTime.UtcNow;
            unit.UpdatedAt = DateTime.UtcNow;

            _db.Units.Add(unit);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetUnit), new { id = unit.Id }, unit);
        }

        // PUT: api/units/5/stage
        [HttpPut("{id}/stage")]
        public async Task<IActionResult> AdvanceStage(string id, [FromBody] StageAdvanceRequest request)
        {
            var unit = await _db.Units.FindAsync(id);
            if (unit == null) return NotFound();

            unit.CurrentStepId = request.NextStepId;
            unit.UpdatedAt = DateTime.UtcNow;

            if (request.NextStepId == "sign_off" && request.IsCompleted)
            {
                unit.OverallStatus = "completed";
            }

            _db.ActivityLogs.Add(new ActivityLogEntity
            {
                UnitId = id,
                Action = $"Advanced to Stage {request.NextStepId.ToUpper()}",
                StageId = request.NextStepId,
                Technician = request.Technician ?? "Nicola Malgarotti",
                Timestamp = DateTime.UtcNow,
                Details = request.Notes
            });

            await _db.SaveChangesAsync();
            return NoContent();
        }
    }

    public class StageAdvanceRequest
    {
        public string NextStepId { get; set; } = "intake";
        public bool IsCompleted { get; set; } = false;
        public string? Technician { get; set; }
        public string? Notes { get; set; }
    }
}
