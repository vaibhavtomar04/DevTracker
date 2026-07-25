import { APP_CONFIG } from "@/config/appConfig";

/**
 * Premium CR Audit Report export.
 *
 * The heavy lifting (Excel styling, summary sheet, chart, clickable links) is
 * done by the backend POI generator at POST /api/reports/cr-audit-export.
 * This service turns the data the CR page already has in memory (tasks + bugs +
 * audit logs) into the enriched JSON payload the backend expects, so the
 * timeline / bug / cycle-time values match exactly what the user sees in the UI
 * (audit-log derived, not the sometimes-empty raw date columns).
 *
 * Only fields that have real backing in the data model are included — blank /
 * unavailable enterprise fields (Release version, Epic, CAB approval, test-case
 * counts, etc.) are intentionally omitted rather than fabricated.
 *
 * NOTE: audit-log parsing mirrors crManagement.tsx exactly:
 *   entityType ("TASK" | "BUG"), entityId, fieldName === "status", newValue, changedDate.
 */

type AnyRec = Record<string, any>;

export interface CrAuditExportArgs {
	tasks: AnyRec[]; // already-filtered CRs to export
	bugs: AnyRec[]; // full bug list from the store
	auditLogs: AnyRec[]; // full audit-log list from the store
	generatedBy: string;
	baseUrl: string; // e.g. window.location.origin + APP_CONFIG.contextPath
}

export interface CrAuditExportResult {
	base64Data: string; // data URL, ready for setDownloadTarget / DownloadPromptModal
	defaultFileName: string;
}

const FIXED_BUG_STATUSES = ["RESOLVED", "CLOSED", "VERIFIED"];
const INVALID_BUG_STATUSES = ["INVALID_BUG", "REJECTED", "INVALID"];
const COMPLETED_STATUSES = ["PROD_DEPLOYED", "PROD_COMPLETED", "CLOSED"];

function fullName(u: any): string {
	if (!u) return "";
	if (typeof u === "string") return u;
	return u.fullName || u.name || u.username || "";
}

/** Earliest audit-log day where the given task moved into `status`. Mirrors crManagement.getAuditDate. */
function getAuditDate(auditLogs: AnyRec[], taskId: any, status: string): string {
	const log = auditLogs
		.filter(
			(l) =>
				l.entityType === "TASK" &&
				String(l.entityId) === String(taskId) &&
				l.fieldName === "status" &&
				String(l.newValue).toUpperCase() === status.toUpperCase()
		)
		.sort((a, b) => new Date(a.changedDate || 0).getTime() - new Date(b.changedDate || 0).getTime())[0];
	return log?.changedDate ? new Date(log.changedDate).toISOString().split("T")[0] : "";
}

/** Latest resolve/close/verify day for a bug from the audit log. */
function getBugResolveDate(auditLogs: AnyRec[], bugId: any): string {
	const log = auditLogs
		.filter(
			(l) =>
				l.entityType === "BUG" &&
				String(l.entityId) === String(bugId) &&
				l.fieldName === "status" &&
				FIXED_BUG_STATUSES.includes(String(l.newValue).toUpperCase())
		)
		.sort((a, b) => new Date(b.changedDate || 0).getTime() - new Date(a.changedDate || 0).getTime())[0];
	return log?.changedDate ? new Date(log.changedDate).toISOString().split("T")[0] : "";
}

function daysBetween(a?: string, b?: string): number | null {
	if (!a || !b) return null;
	const da = new Date(a).getTime();
	const db = new Date(b).getTime();
	if (isNaN(da) || isNaN(db)) return null;
	const diff = Math.round((db - da) / (1000 * 60 * 60 * 24));
	return diff < 0 ? null : diff;
}

function isFixed(status: any): boolean {
	return FIXED_BUG_STATUSES.includes(String(status ?? "").toUpperCase());
}
function isInvalid(status: any): boolean {
	return INVALID_BUG_STATUSES.includes(String(status ?? "").toUpperCase());
}

function prodReadiness(status: string, openBugs: number): string {
	const s = String(status ?? "").toUpperCase();
	if (COMPLETED_STATUSES.includes(s)) return "Deployed";
	if (s === "CANCELLED") return "Cancelled";
	if (openBugs > 0 || s === "BUG_FOUND") return "Blocked - Bugs";
	if (s === "UAT_COMPLETED") return "Ready for Prod";
	return "In Progress";
}

/** Build the JSON payload the backend POI generator consumes. */
export function buildCrAuditPayload(args: CrAuditExportArgs): AnyRec {
	const { tasks, bugs, auditLogs, generatedBy, baseUrl } = args;

	const bugsForTask = (taskId: any) => bugs.filter((b) => String(b.crTaskId) === String(taskId));

	let completed = 0;
	let cancelled = 0;
	let blocked = 0;
	const cycleTimes: number[] = [];
	const projects = new Set<string>();
	const sprints = new Set<string>();

	const crRows = tasks.map((t: any) => {
		const taskBugs = bugsForTask(t.id);
		const openBugs = taskBugs.filter((b) => !isFixed(b.status) && !isInvalid(b.status)).length;
		const totalBugs = taskBugs.length;
		const statusUpper = String(t.status ?? "").toUpperCase();

		if (COMPLETED_STATUSES.includes(statusUpper)) completed++;
		else if (statusUpper === "CANCELLED") cancelled++;
		else if (openBugs > 0 || statusUpper === "BUG_FOUND") blocked++;

		const project = t.project || "";
		if (project) projects.add(project);
		const sprintLabel = t.sprintName || (t.sprintId ? `Sprint #${t.sprintId}` : "");
		if (sprintLabel) sprints.add(sprintLabel);

		// timeline (audit-log derived, falling back to raw columns)
		const created = t.createdDate || "";
		const devStart = t.devStartDate || getAuditDate(auditLogs, t.id, "IN_PROGRESS") || "";
		const sitDeploy = getAuditDate(auditLogs, t.id, "SIT_DEPLOYED") || t.sitDate || "";
		const sitCompleted = getAuditDate(auditLogs, t.id, "SIT_COMPLETED") || "";
		const codeReview = getAuditDate(auditLogs, t.id, "CODE_REVIEW") || "";
		const testingCompleted =
			(t.testingCompletedDate ? new Date(t.testingCompletedDate).toISOString().split("T")[0] : "") ||
			getAuditDate(auditLogs, t.id, "TESTING_COMPLETED") ||
			"";
		const uatDeploy = getAuditDate(auditLogs, t.id, "UAT_DEPLOYED") || getAuditDate(auditLogs, t.id, "MOVE_TO_UAT") || t.uatDate || "";
		const uatCompleted = getAuditDate(auditLogs, t.id, "UAT_COMPLETED") || "";
		const prodDeploy = getAuditDate(auditLogs, t.id, "PROD_DEPLOYED") || t.productionDate || "";

		const developmentTimeDays = daysBetween(devStart || created, sitDeploy || testingCompleted);
		const testingTimeDays = daysBetween(sitDeploy || sitCompleted, testingCompleted || uatCompleted);
		const totalCycleTimeDays = daysBetween(created, prodDeploy || uatCompleted);
		if (totalCycleTimeDays != null) cycleTimes.push(totalCycleTimeDays);

		// people
		const primaryDeveloper = fullName(t.assignedDeveloper);
		const secondaryDevelopers = Array.isArray(t.developers)
			? t.developers
					.map((d: any) => fullName(d.developer))
					.filter((n: string) => n && n !== primaryDeveloper)
					.filter((n: string, i: number, arr: string[]) => arr.indexOf(n) === i)
					.join(", ")
			: "";

		// git
		const prLink = Array.isArray(t.developers)
			? t.developers.map((d: any) => d.prLink).filter(Boolean).join("  ")
			: "";

		return {
			id: t.id,
			crNumber: t.jtrackId || String(t.id),
			title: t.title || "",
			project,
			module: t.module || "",
			sprint: sprintLabel,
			crType: t.type ? t.type.name || t.type : "",
			priority: t.priority || "",
			status: t.status || "",
			prodReadiness: prodReadiness(t.status, openBugs),
			openBugs,
			totalBugs,
			linkedBugIds: taskBugs.map((b) => b.jtrackId || b.id).join(", "),
			primaryDeveloper,
			secondaryDevelopers,
			tester: fullName(t.tester),
			approver: fullName(t.approver),
			deploymentOwner: fullName(t.deploymentOwner),
			createdBy: fullName(t.createdBy),
			createdDate: created ? new Date(created).toISOString().split("T")[0] : "",
			devStartDate: devStart,
			sitDeployDate: sitDeploy,
			sitCompletedDate: sitCompleted,
			codeReviewDate: codeReview,
			testingCompletedDate: testingCompleted,
			uatDeployDate: uatDeploy,
			uatCompletedDate: uatCompleted,
			prodDeployDate: prodDeploy,
			developmentTimeDays,
			testingTimeDays,
			totalCycleTimeDays,
			gitBranch: t.branchName || "",
			prLink,
			mergeDate: t.branchMergeDate ? new Date(t.branchMergeDate).toISOString().split("T")[0] : "",
			gitLinks: t.gitLinks || "",
			qualityRisk: !!t.isQualityRisk,
			rollbackCount: t.rollbackCount ?? 0,
			totalRetests: t.totalRetests ?? 0,
			codeReviewed: !!(t.codeReviewComments && String(t.codeReviewComments).trim()),
			testEvidenceAttached: !!t.unitTestDocUrl,
			efforts: t.efforts ?? null,
		};
	});

	// bug rows across the exported CRs (clickable IDs)
	const bugRows: AnyRec[] = [];
	for (const t of tasks as any[]) {
		for (const b of bugsForTask(t.id)) {
			bugRows.push({
				id: b.id,
				bugId: b.jtrackId || String(b.id),
				crNumber: t.jtrackId || String(t.id),
				crId: t.id,
				title: b.title || "",
				severity: b.severity || "",
				priority: b.priority || "",
				status: b.status || "",
				raisedBy: fullName(b.raisedBy),
				assignedDeveloper: fullName(b.assignedDeveloper),
				raisedDate: b.createdDate ? new Date(b.createdDate).toISOString().split("T")[0] : "",
				resolvedDate: isFixed(b.status) ? getBugResolveDate(auditLogs, b.id) : "",
				url: baseUrl ? `${baseUrl}/dashboard/crs?bug=${b.id}` : "",
			});
		}
	}

	const totalBugsRaised = bugRows.length;
	const totalBugsFixed = bugRows.filter((b) => isFixed(b.status)).length;
	const averageCycleTimeDays = cycleTimes.length
		? Math.round((cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length) * 10) / 10
		: null;

	const pick = (set: Set<string>) => (set.size === 1 ? [...set][0] : set.size === 0 ? "" : "Multiple");

	return {
		meta: {
			generatedBy,
			generatedOn: new Date().toLocaleString("en-GB", {
				day: "2-digit",
				month: "short",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
				hour12: true,
			}),
			project: pick(projects) || "DevTrack 2.0",
			sprint: pick(sprints),
			baseUrl,
			reportVersion: "v2.4",
		},
		summary: {
			totalCRs: tasks.length,
			completed,
			inProgress: Math.max(0, tasks.length - completed - cancelled - blocked),
			blocked,
			cancelled,
			totalBugsRaised,
			totalBugsFixed,
			averageCycleTimeDays,
		},
		crs: crRows,
		bugs: bugRows,
	};
}

/** POST the payload, receive the .xlsx blob, return a data URL for download. */
export async function exportCrAuditReport(args: CrAuditExportArgs): Promise<CrAuditExportResult> {
	const payload = buildCrAuditPayload(args);
	const token = localStorage.getItem("token");

	const res = await fetch(`${APP_CONFIG.apiUrl}/api/reports/cr-audit-export`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			...(token ? { Authorization: `Bearer ${token}` } : {}),
		},
		body: JSON.stringify(payload),
	});

	if (!res.ok) {
		let detail = "";
		try {
			detail = await res.text();
		} catch {
			/* ignore */
		}
		throw new Error(`HTTP ${res.status}${detail ? ": " + detail.slice(0, 200) : ""}`);
	}

	const blob = await res.blob();
	const base64Data: string = await new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(blob);
	});

	const today = new Date().toISOString().split("T")[0];
	return { base64Data, defaultFileName: `DevTrack_CR_Audit_Report_${today}.xlsx` };
}
