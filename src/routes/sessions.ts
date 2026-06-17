import { Hono } from "hono";
import { Bindings, Variables } from "hono/types";
import {get, create , update} from "../services/sessions"


const sess = new Hono<{ Bindings: Bindings; Variables: Variables }>();

sess.get("/read", get);
sess.post("/create", create);
sess.patch("/update", update);


export default sess