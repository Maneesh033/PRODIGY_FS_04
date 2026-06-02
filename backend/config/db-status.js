let dbConnected = false;

const setDbConnected = (status) => {
  dbConnected = status;
};

const isDbConnected = () => {
  return dbConnected;
};

module.exports = {
  setDbConnected,
  isDbConnected
};
