import { o as require_jsx_runtime } from "../_libs/@radix-ui/react-collection+[...].mjs";
import { t as Badge } from "./badge-BzBIJWVH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/status-badge-C-PpAnPH.js
var import_jsx_runtime = require_jsx_runtime();
var MAP = {
	active: {
		label: "Active",
		variant: "ok"
	},
	on_leave: {
		label: "On leave",
		variant: "warn"
	},
	alumni: {
		label: "Alumni",
		variant: "muted"
	},
	inactive: {
		label: "Inactive",
		variant: "danger"
	},
	teacher: {
		label: "Teaching",
		variant: "default"
	},
	non_teaching: {
		label: "Non-teaching",
		variant: "muted"
	},
	tsc_no: {
		label: "TSC no.",
		variant: "default"
	},
	id_no: {
		label: "ID no.",
		variant: "muted"
	},
	draft: {
		label: "Draft",
		variant: "muted"
	},
	issued: {
		label: "Issued",
		variant: "warn"
	},
	paid: {
		label: "Paid",
		variant: "ok"
	},
	void: {
		label: "Void",
		variant: "danger"
	},
	receive: {
		label: "Receive",
		variant: "ok"
	},
	issue: {
		label: "Issue",
		variant: "default"
	},
	adjust: {
		label: "Adjust",
		variant: "warn"
	},
	return: {
		label: "Return",
		variant: "muted"
	},
	purchase: {
		label: "Purchase",
		variant: "muted"
	},
	issue_charge: {
		label: "Charge",
		variant: "default"
	},
	boys: {
		label: "Boys",
		variant: "default"
	},
	girls: {
		label: "Girls",
		variant: "ok"
	},
	mixed: {
		label: "Mixed",
		variant: "muted"
	}
};
function StatusBadge({ value }) {
	const m = MAP[value] ?? {
		label: value,
		variant: "muted"
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
		variant: m.variant,
		children: m.label
	});
}
//#endregion
export { StatusBadge as t };
