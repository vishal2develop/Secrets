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
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

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
  googleId: String,
  secret: String,
});

// adding passport-local-mongoose as a plugin to the userSchema
// to has and salt the passwords and to save it in our mongodb db
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

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
// works for local authentication
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, done) {
  done(null, user.id);
});

passport.deserializeUser(function (id, done) {
  User.findById(id, function (err, user) {
    done(err, user);
  });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    // callback gets triggered after /auth/google/secrets has been completed
    function (accessToken, refreshToken, profile, cb) {
      //console.log(profile);
      // saving to db
      User.findOrCreate({ googleId: profile.id }, function (err, user) {
        return cb(err, user);
      });
    }
  )
);

app.get("/", (req, res) => {
  res.render("home");
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

// authenticating locally and saving the session after successfully authenticated from google
app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function (req, res) {
    // Successful authentication, redirect to  secrets page.
    res.redirect("/secrets");
  }
);

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/secrets", (req, res) => {
  User.find({ secret: { $ne: null } }, (err, foundUsers) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUsers) {
        res.render("secrets", { usersWithSecrets: foundUsers });
      }
    }
  });
});

// to render submit a secret page
app.get("/submit", (req, res) => {
  // if the user is already logged in - session exists
  // isAuthenticated() comes from passport
  if (req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// to submit a secret
app.post("/submit", (req, res) => {
  const submittedSecret = req.body.secret;
  // passport saves user details in session and can be accessed via req.user
  //console.log(req.user);
  // finding user by id and adding the secret he added to db
  User.findById(req.user.id, (err, foundUser) => {
    if (err) {
      console.log(err);
    } else {
      if (foundUser) {
        //console.log("User found.");
        foundUser.secret = submittedSecret;
        foundUser.save(() => {
          res.redirect("/secrets");
        });
      }
    }
  });
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
