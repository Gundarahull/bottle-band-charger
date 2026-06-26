const APIVersionCheck = (version) => (req, res, next) => {
  if (
    req.originalUrl.startsWith(`/${version}`)  ) {
    next();
  } else {
    return res
      .status(404)
      .json({ success: false, message: `API version not found` });
  }
};

module.exports = APIVersionCheck;
