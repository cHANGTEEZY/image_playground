import { Hono } from "hono";
import { healthRoutes } from "./health/health.routes";
import { imagesRoutes } from "./images/images.routes";
import { usersRoutes } from "./users/users.routes";

export const apiV1Router = new Hono();

apiV1Router.route("/health", healthRoutes);
apiV1Router.route("/users", usersRoutes);
apiV1Router.route("/images", imagesRoutes);
