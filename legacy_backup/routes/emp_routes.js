let express = require("express");
let router = express.Router();
router.post("/register", async(req, res) => {
  let data = req.body;
  res.send(data.name);
});
router.post("/login", async(req, res) => {
  res.send("login page called");
});
router.get("/viewtasks", (req, res) => {
  res.send("view task page called");
});router.post("/login", async (req, res) => {
    let user = await empModel.findOne({ email: req.body.email }); // (Folded lines 13-14)
    if (user) {
        let passmatch = await bcrypt.compare(req.body.password, user.password);
        if (passmatch) {
            res.send({
                "msg": "Login Success",
                "user": {
                    _id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        } else {
            res.send({ "msg": "password invalid" });
        }
    } else {
        res.send({ "msg": "Email invalid" });
    }
});
module.exports = router;
