let express = require("express");
let router = express.Router();
let { users } = require("../model/users");
router.delete("/deletemp:id", async (req, res) => {
  let result = await users.findByIdAndDelete(req.params.id);
  if (result) {
    res.send("emp record deleted success");
  }
});
