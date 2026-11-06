let express = require("express");
//let hrroutes = require("./routes/hr_routes");
let emproutes = require("./routes/emp_routes");
let app = express();
//localhost:3000/
app.get("/", (req, res) => {
  res.send("home page called");
});
//localhost:3000/abouts
app.get("/aboutus", (req, res) => {
  res.send("about page called");
});
app.post("/addStudent", (req, res) => {
  res.send("add student page called");
});
//run the server in port 3000
//app.use("/api/hr", hrroutes);
app.use("/api/emp", emproutes);
app.listen(3000, () => {
  console.log("server running on port 3000");
});
