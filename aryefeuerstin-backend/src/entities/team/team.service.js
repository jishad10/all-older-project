import { generateRandomPassword } from "../../lib/generatePassword.js";
import { createPaginationInfo } from "../../lib/pagination.js";
import sendEmail from "../../lib/sendEmail.js";
import Team from "./team.model.js";


export const createAdminService = async ({ name, email, permissions, createdBy }) => {

  // CHECK DUPLICATE EMAIL IN TEAM TABLE
  const exists = await Team.findOne({ email });
  if (exists) {
    throw new Error("Admin already exists");
  }

  // GENERATE TEMP PASSWORD
  const password = generateRandomPassword();

  // CREATE ADMIN (PASSWORD HASHED BY PRE-SAVE)
  const admin = new Team({
    name,
    email,
    permissions,
    createdBy,
    role: "ADMIN",
    password,
  });

  await admin.save();

  // SEND EMAIL
  await sendEmail({
    to: email,
    subject: "Your Admin Account Credentials",
    html: `
      <h2>Welcome, ${name}</h2>
      <p>You have been added as an admin to Easy Returns.</p>

      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Password:</strong> ${password}</p>

      <p>Please login with these credentials.</p>

      <br/>
      <p>Regards,<br/>The Support Team</p>
    `,
  });

  // RETURN CLEAN RESPONSE
  return {
    _id: admin._id,
    name: admin.name,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
    createdBy: admin.createdBy,
    status: admin.status,
  };
};


export const getAllAdminsService = async ({ page, limit, search, status }) => {
  const filter = {};

  // ----- SEARCH (name OR email) -----
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  // ----- FILTER BY STATUS -----
  if (status) {
    filter.status = status; 
  }

  // ----- COUNT BEFORE PAGINATION -----
  const totalData = await Team.countDocuments(filter);

  const admins = await Team.find(filter)
    .select("-password")             
    .populate("createdBy", "name email")
    .skip((page - 1) * limit)
    .limit(limit)
    .sort({ createdAt: -1 }); 

  return {
    admins,
    pagination: createPaginationInfo(page, limit, totalData),
  };
};


export const getAdminByIdService = async (id) => {
  const admin = await Team.findById(id)
    .select("-password") 
    .populate("createdBy", "name email");

  if (!admin) {
    throw new Error("Admin not found");
  }

  return admin;
};


export const updateAdminPermissionsService = async (id, updates) => {
  const updatePayload = {};

  if (updates.permissions) updatePayload.permissions = updates.permissions;
  if (updates.status) updatePayload.status = updates.status;

  const admin = await Team.findByIdAndUpdate(id, updatePayload, { new: true });
  if (!admin) {
    throw new Error("Admin not found");
  }
  return admin;
};







