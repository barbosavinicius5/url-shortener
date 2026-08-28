import type { Request, Response, NextFunction } from "express";

type HttpError = Error & { status?: number; type?: string };

export function errorHandler(
  err: HttpError,
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    next(err);
    return;
  }

  if (err.status === 400) {
    res.status(400).json({ error: "Invalid JSON payload" });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
}