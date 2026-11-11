import { generateResponse } from '../../../lib/responseFormate.js';
import RoleType from '../../../lib/types.js';
import User from '../../auth/auth.model.js';   // adjust path

import {
  createConnectedAccountOnboardingLink,
  stripeAccount
} from './sellerStripeService.js';

export const createConnectedAccountOnboardingLinkController = async (req, res) => {
  try {
    const { email, country } = req.body;

    console.log({ email, country });

    if (!email || !country) {
      return generateResponse(
        res,
        400,
        false,
        'Email and country code are required'
      );
    }

    // Optional: very basic validation
    if (typeof country !== 'string' || country.trim().length !== 2) {
      return generateResponse(
        res,
        400,
        false,
        'Country must be a 2-letter ISO code (e.g. BD, US)'
      );
    }

    const seller = await User.findOne({ email, role: RoleType.SELLER });
    if (!seller) {
      return generateResponse(
        res,
        404,
        false,
        'Seller not found or not authorized'
      );
    }

    const result = await createConnectedAccountOnboardingLink(
      email,
      country.toUpperCase().trim()
    );

    return generateResponse(res, 200, true, result.message, {
      url: result.url
    });
  } catch (error) {
    console.error('Stripe onboarding controller error:', error);
    return generateResponse(
      res,
      500,
      false,
      'Stripe onboarding failed',
      error.message || 'Internal server error'
    );
  }
};

export const stripeAccountController = async (req, res) => {
  try {
    const { email } = req.body;   

    if (!email) {
      return generateResponse(res, 400, false, 'Email is required');
    }

    const result = await stripeAccount(email);

    return generateResponse(res, 200, true, 'Stripe account information', result);
  } catch (error) {
    console.error('Stripe account controller error:', error);
    return generateResponse(
      res,
      500,
      false,
      'Failed to retrieve Stripe account',
      error.message || 'Internal server error'
    );
  }
};