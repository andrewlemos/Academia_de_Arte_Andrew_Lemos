import { Router } from "express";
import { AuthController } from "./controllers/AuthController";
import { authenticate } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/authorization.middleware";
import { validateRequest } from "../../middlewares/validation.middleware";
import {
  createRoleSchema,
  createPermissionSchema,
  grantRolePermissionSchema,
  grantUserPermissionSchema,
  updateUserRoleSchema,
} from "./dto";

const router = Router();
const controller = new AuthController();

// Public / Authenticated endpoints
router.get("/me", authenticate, (req, res, next) => controller.getMe(req, res, next));
router.post("/sync", authenticate, (req, res, next) => controller.syncUser(req, res, next));

// Roles Management
router.post(
  "/roles",
  authenticate,
  requirePermission("roles.create"),
  validateRequest({ body: createRoleSchema }),
  (req, res, next) => controller.createRole(req, res, next)
);

router.get(
  "/roles",
  authenticate,
  requirePermission("roles.read"),
  (req, res, next) => controller.listRoles(req, res, next)
);

router.post(
  "/roles/grant",
  authenticate,
  requirePermission("roles.update"),
  validateRequest({ body: grantRolePermissionSchema }),
  (req, res, next) => controller.grantRolePermission(req, res, next)
);

router.post(
  "/roles/revoke",
  authenticate,
  requirePermission("roles.update"),
  validateRequest({ body: grantRolePermissionSchema }),
  (req, res, next) => controller.revokeRolePermission(req, res, next)
);

// Permissions Management
router.post(
  "/permissions",
  authenticate,
  requirePermission("permissions.create"),
  validateRequest({ body: createPermissionSchema }),
  (req, res, next) => controller.createPermission(req, res, next)
);

router.get(
  "/permissions",
  authenticate,
  requirePermission("permissions.read"),
  (req, res, next) => controller.listPermissions(req, res, next)
);

// Users Management
router.get(
  "/users",
  authenticate,
  requirePermission("users.read"),
  (req, res, next) => controller.listUsers(req, res, next)
);

router.patch(
  "/users/:id/role",
  authenticate,
  requirePermission("users.update"),
  validateRequest({ body: updateUserRoleSchema }),
  (req, res, next) => controller.updateUserRole(req, res, next)
);

router.patch(
  "/users/:id/status",
  authenticate,
  requirePermission("users.update"),
  (req, res, next) => controller.updateUserStatus(req, res, next)
);

router.post(
  "/users/:userId/permissions",
  authenticate,
  requirePermission("users.update"),
  validateRequest({ body: grantUserPermissionSchema }),
  (req, res, next) => controller.grantUserPermissionOverride(req, res, next)
);

router.delete(
  "/users/:userId/permissions/:permissionId",
  authenticate,
  requirePermission("users.update"),
  (req, res, next) => controller.revokeUserPermissionOverride(req, res, next)
);

export default router;
