require("dotenv").config(); // adds to process.env
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");
//const md5 = require("md5");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { authenticate } = require("passport");

const port = process.env.PORT || 3000;

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//using a session

app.use(
  session({
    secret: "Our Little Secret.",
    resave: false,
    saveUninitialized: false,
  })
);

// using passport
app.use(passport.initialize());
// use passport to manage the session
app.use(passport.session());

// connect to mongodb
mongoose.connect("mongodb://localhost:27017/userDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.set("useCreateIndex", true);

// Create schema
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
});

// adding passport-local-mongoose as a plugin to the userSchema
// to has and salt the passwords and to save it in our mongodb db
userSchema.plugin(passportLocalMongoose);

// encryption secret

// using the above secret to encrypt the whole database - all fields
// userSchema.plugin(encrypt, { secret: secret });

// using the secret to encrypt specific fields of the  database - password field
//userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

// Create Model
const User = mongoose.model("User", userSchema);

// setting up passport-local-mongoose
// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  res.render("home");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  // if the user is already logged in - session exists
  // isAuthenticated() comes from passport
  if (req.isAuthenticated()) {
    res.render("secrets");
  } else {
    // if session doesn't exist
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// create user
app.post("/register", (req, res) => {
  const userEmail = req.body.username;
  const userPassword = req.body.password;
  User.register(
    { username: req.body.username },
    req.body.password,
    (err, user) => {
      if (err) {
        console.log(err);
        res.redirect("/register");
      } else {
        // using local strategy to authenticate
        passport.authenticate("local")(req, res, () => {
          // control enters this callback only if the authentication was successful
          // and we managed to setup a cookie that saved the user's current logged in session
          res.redirect("/secrets");
        });
      }
    }
  );
});

// Login user
app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password,
  });
  // login method comes from passport
  req.login(user, (err) => {
    if (!err) {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets");
      });
    } else {
      console.log(err);
    }
  });
});

app.listen(port, () => console.log(`Server running on port ${port} 🔥`));
