import bcrypt from "bcrypt";
import { salt } from "../core/config/config.js";  


export const genSalt = async () => {
  const saltGenerated = await bcrypt.genSalt(parseInt(salt));
  return saltGenerated;
};


export const hashPassword = async (password) => {
  const saltGenerated = await genSalt();   
  const hashedPassword = await bcrypt.hash(password, saltGenerated); 
  return hashedPassword;
};

