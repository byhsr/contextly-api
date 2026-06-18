import { Hono } from "hono";
import { get, createEntry, getEntries } from "../services/sessions";

const sess = new Hono();

sess.get("/",           get);           // GET  /sessions?n=7  → sessions + entries
sess.get("/entries",    getEntries);    // GET  /sessions/entries?limit=20
sess.post("/entries",   createEntry);   // POST /sessions/entries

export default sess;