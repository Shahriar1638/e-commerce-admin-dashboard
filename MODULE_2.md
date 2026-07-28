# Module 2: Permission, formatted as a prompt-ready development guide

---

## 🛠 Phase 1: Access Control Infrastructure Setup

Before building the permission endpoints, create the custom RBAC (Role-Based Access Control) system infrastructure that will be used across Module 2 and all remaining modules.

### 1. Permission Decorator (`@RequirePermissions(...)`)

* **Task:** Create a metadata decorator `RequirePermissions` (e.g., `@RequirePermissions('permission:read')`) inside `src/auth/decorators/permissions.decorator.ts`.
* **Purpose:** Annotate controller endpoints with the required permission string(s) needed to access them.

### 2. Global / Route Permissions Guard (`PermissionsGuard`)

* **Task:** Create `src/auth/guards/permissions.guard.ts`.
* **Logic:**

1. Read required permissions set via `@RequirePermissions()` using NestJS `Reflector`.
2. If no permissions are specified on the route, allow access by default.
3. Retrieve `request.user` (populated by `JwtAuthGuard`).
4. Compare required permissions against `request.user.role.permissions`.

5. **Status Codes:**

* If user is authenticated but lacks the permission: Return `403 Forbidden` (`"You do not have permission to access this resource"`).

* If token is invalid/missing: Return `401 Unauthorized`.

---

## 🧼 Phase 2: DTOs & Normalization Utilities

### 1. Name Normalization Utility

* **Requirement:** Permission names must be unique, lowercase, trimmed, with spaces removed or converted to standard `module:action` syntax.

* **Logic:** Create a helper method:
* Input: Group `" Product "`, Action `" Create "` $\rightarrow$ Output: `"product:create"`.

* Custom Action Input: `" special action "` $\rightarrow$ Output: `"special_action"` or `"special-action"`.

* Rejection: Throw `400 Bad Request` if invalid characters or empty strings are passed.

### 2. Standard Action Set Enum/Const

* Define allowed standard actions: `create`, `read`, `update`, `delete`, `watch`, `upload`, `write`, `approve`, `status`.

---

## 🔐 Phase 3: Module 2 Endpoint Implementations

### 1. `POST /permission-groups`

* **Guard:** `@RequirePermissions('permission:create')`

* **DTO Payload:**

```json
{
  "name": "Product",
  "description": "Product management module",
  "actions": ["create", "read", "update", "delete"],
  "customActions": ["discount_apply"]
}

```

* **Behavior:**

1. Normalize group name to lower case for permission generation.

2. Check if a `PermissionGroup` with the same name already exists. If yes, return `409 Conflict`.

3. Combine `actions` and `customActions` into full permission names (e.g., `product:create`, `product:discount_apply`).

4. Perform atomic database write (Prisma `$transaction`): Create `PermissionGroup` and bulk-insert `Permission` records.

* **Response:** `201 Created` with created group and array of permissions.

---

### 2. `GET /permission-groups`

* **Guard:** `@RequirePermissions('permission:read')` or `@RequirePermissions('permission:watch')`

* **Query Parameters:** `?page=1&limit=10&search=prod`

* **Behavior:**

1. Return paginated permission groups, including their nested array of `permissions`.

2. Filter by group name or permission name if `search` query parameter is provided.

* **Response Shape:**

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Product",
      "description": "Product management module",
      "permissions": [
        { "id": "uuid", "name": "product:create", "description": null },
        { "id": "uuid", "name": "product:read", "description": null }
      ]
    }
  ],
  "meta": { "total": 1, "page": 1, "limit": 10, "totalPages": 1 }
}

```

---

### 3. `GET /permission-groups/:id`

* **Guard:** `@RequirePermissions('permission:read')`

* **Behavior:** Retrieve single group by ID with its permissions. Return `404 Not Found` if missing.

---

### 4. `PATCH /permission-groups/:id`

* **Guard:** `@RequirePermissions('permission:update')`

* **DTO Payload:**

```json
{
  "name": "Product",
  "description": "Updated description",
  "actions": ["create", "read", "update", "delete", "watch"] // Added 'watch'
}

```

* **Behavior:**

1. Check if group exists (`404` if not).

2. Compute differences: Add new action permissions, remove actions no longer present in the payload.

3. Ensure removed permissions are cleanly detached from assigned roles via Prisma cascade.

4. Execute update in a database transaction.

---

### 5. `DELETE /permission-groups/:id` or `DELETE /permissions/:id`

* **Guard:** `@RequirePermissions('permission:delete')`

* **Behavior:**

1. Deleting a group automatically cascades and deletes all associated permissions.

2. Deleting a single permission automatically detaches it from any assigned roles (via implicit pivot table cleanup) without throwing foreign key constraint errors.

3. Return `200 OK` or `204 No Content`.

---

## 🧪 Phase 4: Test Suite Requirements

### 1. Integration & Unit Tests (`permissions.e2e-spec.ts`)

#### A. Creation & Normalization Tests

* [ ] **Single-step creation:** Submitting group `"Product"` with actions `["create", "read"]` successfully creates `product:create` and `product:read`.

* [ ] **Normalization check:** Submitting `" Product "` with action `" Read "` generates `"product:read"`.

* [ ] **Duplicate Prevention:** Creating duplicate permissions or duplicate group names returns `409 Conflict`.

#### B. Access Control (RBAC Guard) Tests

* [ ] **User without permission:** Calling `POST /permission-groups` with a valid JWT token of a user lacking `permission:create` returns `403 Forbidden`.

* [ ] **Unauthenticated call:** Calling endpoints without a JWT token returns `401 Unauthorized`.

#### C. Cascade Deletion Tests

* [ ] **Role Detachment:** Assign a permission to a role, delete the permission via API, verify that the role no longer references the deleted permission ID.

#### D. Pagination & Search Tests

* [ ] Search query correctly filters groups by module name.

---

## Module 2 : Front end plan

## 🎨 Layout Overview: The Grid & Modal Approach

Instead of building complex multi-page flows, you only need **two core components** for Module 2:

1. **Permission Matrix Table:** A simple data table where each row is a Module Group (e.g., `Product`), and action columns show active/inactive badges or checkboxes.

2. **Create / Edit Group Modal (`Dialog`):** A form with a Module Name input and a standard grid of checkboxes for standard actions (`create`, `read`, `update`, `delete`, `watch`, `upload`, `write`, `approve`, `status`) + a custom action tag input.

---

## 🚀 Frontend Implementation Plan for Module 2

### Component 1: `PermissionListTable.tsx`

Render the table using shadcn/ui `<Table/>`, `<Input/>` (for search), and `<Button/>`.

#### Layout Structure

* **Top Bar:**
* **Search Input:** Filter groups by name (triggers API query `?search=...`).

* **"+ Create Permission Group" Button:** Opens the Create Modal (only visible if user has `permission:create`).

* **Table Headers:** `Module Name` | `Description` | `Actions / Capabilities` | `Actions (Edit/Delete)`

* **Table Rows:**
* **Module Name:** e.g., `Product`

* **Description:** e.g., `Product catalog management`

* **Actions Column:** Render action tags using shadcn `<Badge/>` or toggle switches (e.g., `product:create`, `product:read`).

* **Edit / Delete Column:** Icon buttons for Edit (`Pencil`) and Delete (`Trash2`).

* **Bottom Pagination:** Next/Previous buttons calling `?page=1&limit=10`.

---

### Component 2: `PermissionGroupDialog.tsx` (Create & Edit Form)

Use shadcn/ui `<Dialog/>` with `react-hook-form` and `zod` validation.

#### Form Fields

1. **Module Name (`Input`):** e.g., `"Product"` or `"Brand"`.

2. **Description (`Input` or `Textarea`):** Brief summary.

3. **Standard Actions Checklist (`Checkbox` grid):**

* Provide a grid of checkboxes for standard actions:
* `[x] Create` `[x] Read` `[x] Update` `[x] Delete`
* `[ ] Watch` `[ ] Upload` `[ ] Write` `[ ] Approve` `[ ] Status`

1. **Custom Action Input (`Input` + `Button`):**

* Allows adding custom capability strings (e.g., `"discount_apply"`) outside standard sets.

1. **Submit & Cancel Buttons:** Triggers `POST /permission-groups` or `PATCH /permission-groups/:id`.

---

## ⚡ Key Frontend Behaviors to Handle (Evaluated Rules)

To make sure your frontend satisfies Section 6.2 ("Behaviour") without extra fluff:

1. **Permission Guarded UI Elements:**

* Read the permissions flat array from your `/auth/session` endpoint.

* If the logged-in user lacks `permission:create`, **hide or disable** the "+ Create Permission Group" button.

* If they lack `permission:delete`, **hide or disable** the trash icon.

1. **Field-Level Validation & Error Display:**

* If the backend returns a `409 Conflict` (e.g., duplicate group name) or `400 Bad Request` (invalid format), display the exact error message inside the dialog/toast using shadcn `<Alert/>` or `toast()`.

1. **403 Forbidden State:**

* If a low-privilege user somehow triggers a request without permission, show a clear `Alert` banner: *"403 Forbidden: You do not have permission to modify permissions."*

1. **Loading & Empty States:**

* Show a basic spinner or skeleton row while fetching, and an "Empty — No permission groups found" row if the database is clean.

---

## 📌 Summary Checklist for Module 2 UI

* [ ] Fetch groups on load via `GET /permission-groups` with pagination & search params.

* [ ] Render groups in a table using standard badges/checkboxes for actions.

* [ ] Modal dialog to create group + select actions in one step.

* [ ] Modal dialog to edit existing group (pre-check active actions).

* [ ] Delete button with confirmation prompt (triggers cascade on backend).

* [ ] Drive action button visibility using session permission checks.
