import { Context } from "hono";

export async function signup(c: Context) {
  return c.json({
    ok: true,
    message: "signup",
  });
}

export async function login(c: Context) {
  return c.json({
    ok: true,
    message: "login",
  });
}

export async function refresh(c: Context) {
  return c.json({
    ok: true,
    message: "refresh",
  });
}

export async function logout(c: Context) {
  return c.json({
    ok: true,
    message: "logout",
  });
}

export async function me(c: Context) {
  return c.json({
    ok: true,
    message: "me",
  });
}