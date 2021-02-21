require("dotenv").config(); // adds to process.env
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

// connect to mongodb
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Create schema
const userSchema = new mongoose.Schema({
  email: { type: String, required: true },
  password: { type: String, required: true },
});

// encryption secret


// using the above secret to encrypt the whole database - all fields
// userSchema.plugin(encrypt, { secret: secret });

// using the secret to encrypt specific fields of the  database - password field
userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

// Create Model
const User = mongoose.model("User", userSchema);

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

// create user
app.post("/register", (req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;

  const newUser = new User({
    email: userEmail,
    password: userPassword,
  });
  newUser.save((err) => {
    if (!err) {
      res.render("secrets");
    } else {
      console.log(err);
    }
  });
});

// Login user
app.post("/login", (req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;
  User.findOne({ email: userEmail }, (err, foundUser) => {
    if (!err) {
      if (foundUser) {
        if (foundUser.password === userPassword) {
          res.render("secrets");
        } else {
          console.log("Password mismatch");
        }
      } else {
        console.log("User not found");
      }
    } else {
      console.log(err);
    }
  });
});

app.listen(port, () => console.log(`Server running on port ${port} 🔥`));
