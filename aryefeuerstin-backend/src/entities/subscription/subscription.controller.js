import { generateResponse } from "../../lib/responseFormate.js";
import { createSubscriptionCheckoutService } from "./subscription.service.js";


export const createSubscriptionCheckout = async (req, res) => {
  try {
    const userId = req.user._id;
    const planId = req.params.planId;

    const url = await createSubscriptionCheckoutService(userId, planId);

    return generateResponse(res, 200, true, "Checkout session created", { url });
  } catch (error) {
    return generateResponse(res, 500, false, error.message, null);
  }
};

