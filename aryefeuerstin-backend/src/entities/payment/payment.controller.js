import { generateResponse } from "../../lib/responseFormate.js";
import { createReturnOrderCheckoutService } from "./payment.service.js";


export const createReturnOrderCheckout = async (req, res) => {
  try {
    const userId = req.user._id;
    const { returnOrderId } = req.body;

    const checkoutUrl = await createReturnOrderCheckoutService(
      userId,
      returnOrderId
    );

    return generateResponse(
      res,
      200,
      true,
      "Checkout session created",
      { checkoutUrl }
    );
  } catch (error) {
    return generateResponse(
      res,
      500,
      false,
      error.message,
      null
    );
  }
};




