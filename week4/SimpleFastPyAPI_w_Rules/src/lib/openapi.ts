const userResponse = { $ref: "#/components/schemas/UserResponse" };
const userCreate = { $ref: "#/components/schemas/UserCreate" };
const userUpdate = { $ref: "#/components/schemas/UserUpdate" };
const passwordReset = { $ref: "#/components/schemas/PasswordReset" };
const success = { description: "Successful Response" };
const htmlSuccess = {
  description: "Successful Response",
  content: { "text/html": { schema: { type: "string" } } },
};

function jsonSuccess(schema: unknown = {}): object {
  return { description: "Successful Response", content: { "application/json": { schema } } };
}

function jsonBody(schema: unknown): object {
  return { required: true, content: { "application/json": { schema } } };
}

function formBody(properties: Record<string, unknown>, required: string[]): object {
  return {
    required: true,
    content: { "application/x-www-form-urlencoded": { schema: { type: "object", required, properties } } },
  };
}

function userIdParameter(): object[] {
  return [{ name: "user_id", in: "path", required: true, schema: { type: "integer", title: "User Id" } }];
}

export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "FastAPI", version: "0.1.0" },
  paths: {
    "/users/": {
      get: { summary: "Get All Users", operationId: "get_all_users_users__get", responses: { "200": jsonSuccess({ type: "array", items: userResponse }) } },
      post: { summary: "Create User", operationId: "create_user_users__post", requestBody: jsonBody(userCreate), responses: { "200": jsonSuccess(userResponse) } },
    },
    "/users/{user_id}": {
      get: { summary: "Get User By Id", operationId: "get_user_by_id_users__user_id__get", parameters: userIdParameter(), responses: { "200": jsonSuccess(userResponse) } },
      put: { summary: "Update User", operationId: "update_user_users__user_id__put", parameters: userIdParameter(), requestBody: jsonBody(userUpdate), responses: { "200": jsonSuccess() } },
      delete: { summary: "Delete User", operationId: "delete_user_users__user_id__delete", parameters: userIdParameter(), responses: { "200": jsonSuccess() } },
    },
    "/admin/api/users": {
      get: {
        summary: "Admin List Users",
        operationId: "admin_list_users_admin_api_users_get",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string", default: "" } },
          { name: "skip", in: "query", required: false, schema: { type: "integer", default: 0 } },
          { name: "limit", in: "query", required: false, schema: { type: "integer", default: 100 } },
        ],
        responses: { "200": jsonSuccess({ type: "array", items: userResponse }) },
      },
      post: { summary: "Admin Create User", operationId: "admin_create_user_admin_api_users_post", requestBody: jsonBody(userCreate), responses: { "201": jsonSuccess(userResponse) } },
    },
    "/admin/api/users/{user_id}": {
      get: { summary: "Admin Get User", operationId: "admin_get_user_admin_api_users__user_id__get", parameters: userIdParameter(), responses: { "200": jsonSuccess(userResponse) } },
      put: { summary: "Admin Update User", operationId: "admin_update_user_admin_api_users__user_id__put", parameters: userIdParameter(), requestBody: jsonBody(userUpdate), responses: { "200": jsonSuccess(userResponse) } },
      delete: { summary: "Admin Delete User", operationId: "admin_delete_user_admin_api_users__user_id__delete", parameters: userIdParameter(), responses: { "200": jsonSuccess() } },
    },
    "/admin/api/users/{user_id}/password": {
      post: { summary: "Admin Set Password", operationId: "admin_set_password_admin_api_users__user_id__password_post", parameters: userIdParameter(), requestBody: jsonBody(passwordReset), responses: { "200": jsonSuccess(userResponse) } },
    },
    "/admin/login": {
      get: {
        summary: "Admin Login Page",
        operationId: "admin_login_page_admin_login_get",
        parameters: [{ name: "next_url", in: "query", required: false, schema: { type: "string", default: "/admin/" } }],
        responses: { "200": htmlSuccess },
      },
      post: {
        summary: "Admin Login",
        operationId: "admin_login_admin_login_post",
        requestBody: formBody({ token: { type: "string" }, next_url: { type: "string", default: "/admin/" } }, ["token"]),
        responses: { "200": success, "422": { description: "Validation Error" } },
      },
    },
    "/admin/logout": { post: { summary: "Admin Logout", operationId: "admin_logout_admin_logout_post", responses: { "200": success } } },
    "/admin/": {
      get: {
        summary: "Admin Dashboard",
        operationId: "admin_dashboard_admin__get",
        parameters: [
          { name: "q", in: "query", required: false, schema: { type: "string", default: "" } },
          { name: "notice", in: "query", required: false, schema: { type: "string", default: "" } },
          { name: "error", in: "query", required: false, schema: { type: "string", default: "" } },
        ],
        responses: { "200": htmlSuccess },
      },
    },
    "/admin/users": {
      post: {
        summary: "Admin Create User Form",
        operationId: "admin_create_user_form_admin_users_post",
        requestBody: formBody({ name: { type: "string" }, email: { type: "string" }, password: { type: "string" } }, ["name", "email", "password"]),
        responses: { "200": success },
      },
    },
    "/admin/users/{user_id}": {
      get: { summary: "Admin Edit User Page", operationId: "admin_edit_user_page_admin_users__user_id__get", parameters: userIdParameter(), responses: { "200": htmlSuccess } },
      post: {
        summary: "Admin Update User Form",
        operationId: "admin_update_user_form_admin_users__user_id__post",
        parameters: userIdParameter(),
        requestBody: formBody({ name: { type: "string" }, email: { type: "string" }, password: { type: "string", default: "" } }, ["name", "email"]),
        responses: { "200": success },
      },
    },
    "/admin/users/{user_id}/delete": { post: { summary: "Admin Delete User Form", operationId: "admin_delete_user_form_admin_users__user_id__delete_post", parameters: userIdParameter(), responses: { "200": success } } },
  },
  components: {
    schemas: {
      UserCreate: {
        type: "object", title: "UserCreate", required: ["name", "email", "password"],
        properties: { name: { type: "string" }, email: { type: "string" }, password: { type: "string" } },
      },
      UserUpdate: {
        type: "object", title: "UserUpdate", required: ["name", "email"],
        properties: { name: { type: "string" }, email: { type: "string" } },
      },
      UserResponse: {
        type: "object", title: "UserResponse", required: ["id", "name", "email"],
        properties: { id: { type: "integer" }, name: { type: "string" }, email: { type: "string" } },
      },
      PasswordReset: {
        type: "object", title: "PasswordReset", required: ["password"],
        properties: { password: { type: "string" } },
      },
    },
  },
};

export const swaggerHtml = `<!DOCTYPE html>
<html>
<head>
<link type="text/css" rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
<title>FastAPI - Swagger UI</title>
</head>
<body>
<div id="swagger-ui"></div>
<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
<script>
const ui = SwaggerUIBundle({
  url: '/openapi.json',
  dom_id: '#swagger-ui',
  deepLinking: true,
  showExtensions: true,
  showCommonExtensions: true,
  presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
  oauth2RedirectUrl: window.location.origin + '/docs/oauth2-redirect'
});
</script>
</body>
</html>`;

export const redocHtml = `<!DOCTYPE html>
<html>
<head>
<title>FastAPI - ReDoc</title>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body>
<redoc spec-url="/openapi.json"></redoc>
<script src="https://cdn.jsdelivr.net/npm/redoc@next/bundles/redoc.standalone.js"></script>
</body>
</html>`;
