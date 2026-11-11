import Joi from "joi";

export const createPlanSchema = Joi.object({
  title: Joi.string().allow(""),

  name: Joi.string().trim().min(2).required(),

  price: Joi.number().min(0).required(),

  billingCycle: Joi.string()
    .valid("basic", "monthly", "yearly")
    .required(),

  displayFeatures: Joi.array()
    .items(Joi.string().trim())
    .default([]),

  numberOfPackages: Joi.number()
    .integer()
    .min(0)
    .default(0),

  limits: Joi.object({
    maxReturnOrders: Joi.number()
      .integer()
      .min(1)
      .allow(null)
      .default(null)
  }).default({}),

  entitlements: Joi.object({
    rushService: Joi.boolean().default(false),
    freePhysicalReturnLabel: Joi.boolean().default(false),
    freePhysicalReceipt: Joi.boolean().default(false)
  }).default({}),

  status: Joi.string()
    .valid("active", "inactive")
    .default("active")
});


export const updatePlanSchema = Joi.object({
  title: Joi.string().allow(""),

  name: Joi.string().trim().min(2),

  price: Joi.number().min(0),

  billingCycle: Joi.string().valid("basic", "monthly", "yearly"),

  displayFeatures: Joi.array().items(Joi.string().trim()),

  numberOfPackages: Joi.number().integer().min(0),

  limits: Joi.object({
    maxReturnOrders: Joi.number()
      .integer()
      .min(1)
      .allow(null)
  }),

  entitlements: Joi.object({
    rushService: Joi.boolean(),
    freePhysicalReturnLabel: Joi.boolean(),
    freePhysicalReceipt: Joi.boolean()
  }),

  status: Joi.string().valid("active", "inactive")
});


