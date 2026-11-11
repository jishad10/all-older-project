import express from "express";
import createGuest from "./auth.guest.controller.js";  // note the '.js'

const router = express.Router();

router.post("/create", createGuest);

const guestRouter = router;
export default guestRouter;
