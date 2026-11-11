import { generateResponse } from "../../lib/responseFormate.js";
import Guest from "./auth.guest.model.js";

const createGuest = async (req, res) => {
  try {
    const guestInfo = req.body;
    const guest = await Guest.create(guestInfo);

    generateResponse(res, 200, true, "Welcome as an guest", { guest });
  } catch (error) {
    console.error(error);
    generateResponse(res, 500, false, "Failed to create guest", error.message);
  }
};

export default createGuest;
