import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error as ZodError;
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Request validation failed",
          details: err.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
      });
      return;
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const err = result.error as ZodError;
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Query validation failed",
          details: err.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        },
      });
      return;
    }
    req.query = result.data;
    next();
  };
}
