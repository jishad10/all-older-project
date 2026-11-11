import Service from './createServices.model.js';


export const createService = async (serviceData) => {
  const service = new Service(serviceData);
  return await service.save();
};


export const getAllServices = async () => {
  return await Service.find();
};


export const getServiceById = async (id) => {
  return await Service.findById(id);
};


export const getServiceByCategoryId =async(categoryId)=>{
  return await Service.find({category:categoryId});
}