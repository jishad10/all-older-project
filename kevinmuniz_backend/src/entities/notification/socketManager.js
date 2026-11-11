// Socket Manager
// Centralizes the Socket.IO instance so it can be imported anywhere
// without circular dependency issues.

let _io = null;


// Store the io instance (called once during server setup)

export const initSocketIO = (io) => {
  _io = io;
};


// Get the io instance

export const getIO = () => {
  if (!_io) throw new Error("Socket.IO has not been initialized yet.");
  return _io;
};