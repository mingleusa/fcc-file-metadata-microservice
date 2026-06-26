var express = require("express");
var cors = require("cors");
var multer = require("multer");
var upload = multer({ dest: "uploads/" });
var fs = require("fs");
var path = require("path");
var app = express();
var port = process.env.PORT || 8080;

app.use(cors());
app.set("views", "./client");
app.set("view engine", "pug");

app.get("/", function (req, res) {
  res.render("home");
});

app.post("/api/fileanalyse", upload.single("upfile"), function (req, res) {
  fs.unlink(req.file.path, function (err) {
    if (err) {
      return console.log(err);
    }
    console.log(req.file.filename + " is deleted");
  });
  res.json({
    name: req.file.originalname,
    type: req.file.mimetype,
    size: req.file.size,
  });
});

app.use("/css", express.static(path.join(__dirname, "client/style")));
app.use("/js", express.static(path.join(__dirname, "client/js")));

app.listen(port, function () {
  console.log("Your app is listening on port " + port);
});
